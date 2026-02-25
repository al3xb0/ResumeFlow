use std::path::Path;

pub fn extract_text_from_pdf(file_path: &str) -> Result<String, String> {
    let path = Path::new(file_path);

    if !path.exists() {
        return Err("File not found".to_string());
    }

    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    match extension.as_deref() {
        Some("pdf") => extract_pdf(file_path),
        _ => Err("Unsupported file format. Please provide a PDF file.".to_string()),
    }
}

fn extract_pdf(file_path: &str) -> Result<String, String> {
    let text = pdf_extract::extract_text(file_path)
        .map_err(|e| format!("Failed to extract PDF text: {}", e))?;

    let cleaned = clean_extracted_text(&text);

    if cleaned.is_empty() {
        return Err("The PDF appears to contain no extractable text. It may be a scanned document.".to_string());
    }

    Ok(cleaned)
}

fn clean_extracted_text(text: &str) -> String {
    text.lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_text() {
        let input = "  Hello World  \n\n\n  Foo Bar  \n  ";
        let cleaned = clean_extracted_text(input);
        assert_eq!(cleaned, "Hello World\nFoo Bar");
    }

    #[test]
    fn test_nonexistent_file() {
        let result = extract_text_from_pdf("/nonexistent/file.pdf");
        assert!(result.is_err());
    }

    #[test]
    fn test_unsupported_format() {
        let result = extract_text_from_pdf("test.docx");
        assert!(result.is_err());
    }
}
