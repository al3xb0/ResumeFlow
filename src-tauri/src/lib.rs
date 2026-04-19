mod analysis;
mod parser;
mod scraper;

use analysis::{AnalysisResult, ReadabilityResult, VerbLintResult};
use base64::{engine::general_purpose::STANDARD, Engine};
use parser::PdfLink;

#[tauri::command]
fn extract_pdf_text(file_path: String) -> Result<String, String> {
    parser::extract_text_from_pdf(&file_path)
}

#[tauri::command]
fn extract_pdf_links(file_path: String) -> Result<Vec<PdfLink>, String> {
    parser::extract_links_from_pdf(&file_path)
}

#[tauri::command]
fn read_file_base64(file_path: String) -> Result<String, String> {
    let bytes = std::fs::read(&file_path).map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(bytes))
}

#[tauri::command]
fn save_file_bytes(file_path: String, base64_content: String) -> Result<(), String> {
    let bytes = STANDARD
        .decode(base64_content)
        .map_err(|e| e.to_string())?;
    std::fs::write(&file_path, bytes).map_err(|e| e.to_string())
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

#[tauri::command]
fn get_file_size(file_path: String) -> Result<u64, String> {
    std::fs::metadata(&file_path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
