mod analysis;
mod parser;
mod scraper;

use analysis::{AnalysisResult, ReadabilityResult, VerbLintResult};

#[tauri::command]
fn extract_pdf_text(file_path: String) -> Result<String, String> {
    parser::extract_text_from_pdf(&file_path)
}

#[tauri::command]
fn analyze_resume(resume_text: String, job_description: String) -> AnalysisResult {
    analysis::analyze_match(&resume_text, &job_description)
}

#[tauri::command]
fn check_readability(resume_text: String) -> ReadabilityResult {
    analysis::analyze_readability(&resume_text)
}

#[tauri::command]
async fn fetch_job_url(url: String) -> Result<String, String> {
    scraper::fetch_page_text(&url).await
}

#[tauri::command]
fn lint_verbs(resume_text: String) -> VerbLintResult {
    analysis::lint_action_verbs(&resume_text)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            extract_pdf_text,
            analyze_resume,
            check_readability,
            fetch_job_url,
            lint_verbs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
