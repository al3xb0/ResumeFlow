mod analysis;
mod config;
mod error;
mod parser;
mod render;
mod scraper;

use std::path::{Component, Path, PathBuf};

use analysis::{AnalysisResult, ReadabilityResult, VerbLintResult};
use base64::{engine::general_purpose::STANDARD, Engine};
use config::AnalysisConfigStore;
use error::{AppError, AppErrorPayload};
use parser::PdfLink;
use render::{
    ResumePdfRenderRequest, ResumePdfRenderResponse, ResumePreviewRenderRequest,
    ResumePreviewRenderResponse,
};
use tauri::{Manager, State};
use tracing::{debug, warn};
use tracing_subscriber::EnvFilter;

struct AppState {
    analysis_config: AnalysisConfigStore,
}

impl AppState {
    fn new<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<Self, AppError> {
        let override_path = resolve_analysis_override_path(app);
        let analysis_config = AnalysisConfigStore::new(override_path)?;
        Ok(Self { analysis_config })
    }
}

fn resolve_analysis_override_path<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Option<PathBuf> {
    let mut path = match app.path().app_data_dir() {
        Ok(path) => path,
        Err(error) => {
            warn!(error = %error, "App data directory is unavailable; analysis config override disabled");
            return None;
        }
    };

    if let Err(error) = std::fs::create_dir_all(&path) {
        warn!(error = %error, "Failed to create app data directory; analysis config override disabled");
        return None;
    }

    path.push("analysis_config.json");
    Some(path)
}

fn map_command_error(command: &'static str, error: AppError) -> AppErrorPayload {
    warn!(command, code = error.code(), error = %error, "Tauri command failed");
    error.into()
}

// Reject paths that are empty, relative, or traverse parent directories.
// File paths legitimately originate from the dialog plugin (always absolute);
// this guard limits the blast radius if a compromised frontend forges them.
fn ensure_safe_path(command: &'static str, file_path: &str) -> Result<(), AppErrorPayload> {
    let path = Path::new(file_path);
    let is_safe = !file_path.is_empty()
        && path.is_absolute()
        && !path
            .components()
            .any(|component| matches!(component, Component::ParentDir));

    if is_safe {
        Ok(())
    } else {
        Err(map_command_error(
            command,
            AppError::InvalidPath {
                path: file_path.to_string(),
            },
        ))
    }
}

fn init_tracing() {
    let default_filter = if cfg!(debug_assertions) {
        "resumeflow=debug,tauri=warn"
    } else {
        "resumeflow=info,tauri=warn"
    };

    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(default_filter));

    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .try_init();
}

#[tauri::command]
fn extract_pdf_text(file_path: String) -> Result<String, AppErrorPayload> {
    debug!(command = "extract_pdf_text", "Handling PDF text extraction");
    ensure_safe_path("extract_pdf_text", &file_path)?;
    parser::extract_text_from_pdf(&file_path)
        .map_err(|error| map_command_error("extract_pdf_text", error))
}

#[tauri::command]
fn extract_pdf_links(file_path: String) -> Result<Vec<PdfLink>, AppErrorPayload> {
    debug!(
        command = "extract_pdf_links",
        "Handling PDF link extraction"
    );
    ensure_safe_path("extract_pdf_links", &file_path)?;
    parser::extract_links_from_pdf(&file_path)
        .map_err(|error| map_command_error("extract_pdf_links", error))
}

#[tauri::command]
fn read_file_base64(file_path: String) -> Result<String, AppErrorPayload> {
    ensure_safe_path("read_file_base64", &file_path)?;
    let bytes = std::fs::read(&file_path).map_err(|error| {
        map_command_error("read_file_base64", AppError::file_read(&file_path, error))
    })?;
    Ok(STANDARD.encode(bytes))
}

#[tauri::command]
fn save_file_bytes(file_path: String, base64_content: String) -> Result<(), AppErrorPayload> {
    ensure_safe_path("save_file_bytes", &file_path)?;
    let bytes = STANDARD.decode(base64_content).map_err(|source| {
        map_command_error("save_file_bytes", AppError::InvalidBase64 { source })
    })?;
    std::fs::write(&file_path, bytes).map_err(|error| {
        map_command_error("save_file_bytes", AppError::file_write(&file_path, error))
    })
}

#[tauri::command]
fn analyze_resume(
    state: State<'_, AppState>,
    resume_text: String,
    job_description: String,
) -> Result<AnalysisResult, AppErrorPayload> {
    debug!(
        command = "analyze_resume",
        resume_len = resume_text.len(),
        job_len = job_description.len(),
        "Running resume analysis"
    );
    let (config, config_snapshot) = state
        .analysis_config
        .snapshot_with_metadata()
        .map_err(AppError::from)
        .map_err(|error| map_command_error("analyze_resume", error))?;

    debug!(command = "analyze_resume", config_source = %config_snapshot.source, tech_keywords = config_snapshot.tech_keyword_count, "Using analysis config snapshot");

    Ok(analysis::analyze_match_with_config(
        &resume_text,
        &job_description,
        &config,
    ))
}

#[tauri::command]
fn check_readability(
    state: State<'_, AppState>,
    resume_text: String,
) -> Result<ReadabilityResult, AppErrorPayload> {
    debug!(
        command = "check_readability",
        resume_len = resume_text.len(),
        "Running readability analysis"
    );
    let config = state
        .analysis_config
        .snapshot()
        .map_err(AppError::from)
        .map_err(|error| map_command_error("check_readability", error))?;

    Ok(analysis::analyze_readability_with_config(
        &resume_text,
        &config,
    ))
}

#[tauri::command]
async fn fetch_job_url(url: String) -> Result<String, AppErrorPayload> {
    debug!(
        command = "fetch_job_url",
        uses_https = url.starts_with("https://"),
        "Fetching job description"
    );
    scraper::fetch_page_text(&url)
        .await
        .map_err(|error| map_command_error("fetch_job_url", error))
}

#[tauri::command]
fn lint_verbs(
    state: State<'_, AppState>,
    resume_text: String,
) -> Result<VerbLintResult, AppErrorPayload> {
    debug!(
        command = "lint_verbs",
        resume_len = resume_text.len(),
        "Running verb linting"
    );
    let config = state
        .analysis_config
        .snapshot()
        .map_err(AppError::from)
        .map_err(|error| map_command_error("lint_verbs", error))?;

    Ok(analysis::lint_action_verbs_with_config(
        &resume_text,
        &config,
    ))
}

#[tauri::command]
fn get_file_size(file_path: String) -> Result<u64, AppErrorPayload> {
    ensure_safe_path("get_file_size", &file_path)?;
    std::fs::metadata(&file_path)
        .map(|m| m.len())
        .map_err(|error| map_command_error("get_file_size", AppError::file_read(&file_path, error)))
}

#[tauri::command]
fn render_resume_preview(
    request: ResumePreviewRenderRequest,
) -> Result<ResumePreviewRenderResponse, AppErrorPayload> {
    debug!(
        command = "render_resume_preview",
        template = request.render_request.template,
        visible_sections = request.render_request.visible_ids.len(),
        requested_pages = request.page_indices.as_ref().map_or(0, Vec::len),
        "Typst preview rendering requested"
    );

    render::render_resume_preview(request)
        .map_err(|error| map_command_error("render_resume_preview", error))
}

#[tauri::command]
fn export_resume_pdf(
    request: ResumePdfRenderRequest,
) -> Result<ResumePdfRenderResponse, AppErrorPayload> {
    debug!(
        command = "export_resume_pdf",
        template = request.render_request.template,
        visible_sections = request.render_request.visible_ids.len(),
        "Typst PDF export requested"
    );

    render::export_resume_pdf(request).map_err(|error| map_command_error("export_resume_pdf", error))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_tracing();

    tauri::Builder::default()
        .setup(|app| {
            let state = AppState::new(app.handle())?;
            app.manage(state);
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            extract_pdf_text,
            extract_pdf_links,
            read_file_base64,
            save_file_bytes,
            analyze_resume,
            check_readability,
            fetch_job_url,
            lint_verbs,
            get_file_size,
            render_resume_preview,
            export_resume_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
