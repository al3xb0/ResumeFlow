use std::path::Path;

use serde::Serialize;

use crate::config::ConfigError;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("the selected file could not be found")]
    FileNotFound { path: String },
    #[error("the selected file could not be read")]
    FileRead {
        path: String,
        #[source]
        source: std::io::Error,
    },
    #[error("the selected file could not be written")]
    FileWrite {
        path: String,
        #[source]
        source: std::io::Error,
    },
    #[error("the provided content is not valid base64")]
    InvalidBase64 {
        #[source]
        source: base64::DecodeError,
    },
    #[error("the selected file format is not supported")]
    UnsupportedFileFormat { expected: &'static str },
    #[error("the file path is not allowed")]
    InvalidPath { path: String },
    #[error("the PDF could not be opened")]
    PdfOpen { details: String },
    #[error("the PDF text could not be extracted")]
    PdfTextExtract { details: String },
    #[error("the PDF does not contain extractable text")]
    PdfNoText,
    #[error("the URL is invalid")]
    InvalidUrl,
    #[error("the URL points to a blocked address")]
    BlockedAddress,
    #[error("the HTTP client could not be created")]
    HttpClient { details: String },
    #[error("the request timed out")]
    RequestTimeout,
    #[error("the page could not be fetched")]
    HttpRequestFailed { details: String },
    #[error("the website returned an error response")]
    HttpStatus { status: u16 },
    #[error("the page response could not be read")]
    ResponseReadFailed { details: String },
    #[error("the page content could not be extracted")]
    PageTextUnavailable,
    #[error("the selected resume template '{template}' is not supported")]
    UnsupportedResumeTemplate { template: String },
    #[error("the resume could not be rendered: {details}")]
    ResumeRender { details: String },
    #[error(transparent)]
    Config(#[from] ConfigError),
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppErrorPayload {
    pub code: &'static str,
    pub message: String,
}

impl AppError {
    pub fn file_not_found(path: impl AsRef<Path>) -> Self {
        Self::FileNotFound {
            path: path.as_ref().display().to_string(),
        }
    }

    pub fn file_read(path: impl AsRef<Path>, source: std::io::Error) -> Self {
        Self::FileRead {
            path: path.as_ref().display().to_string(),
            source,
        }
    }

    pub fn file_write(path: impl AsRef<Path>, source: std::io::Error) -> Self {
        Self::FileWrite {
            path: path.as_ref().display().to_string(),
            source,
        }
    }

    pub fn code(&self) -> &'static str {
        match self {
            Self::FileNotFound { .. } => "file_not_found",
            Self::FileRead { .. } => "file_read_failed",
            Self::FileWrite { .. } => "file_write_failed",
            Self::InvalidBase64 { .. } => "invalid_base64",
            Self::UnsupportedFileFormat { .. } => "unsupported_file_format",
            Self::InvalidPath { .. } => "invalid_path",
            Self::PdfOpen { .. } => "pdf_open_failed",
            Self::PdfTextExtract { .. } => "pdf_text_extract_failed",
            Self::PdfNoText => "pdf_no_text",
            Self::InvalidUrl => "invalid_url",
            Self::BlockedAddress => "blocked_address",
            Self::HttpClient { .. } => "http_client_error",
            Self::RequestTimeout => "network_timeout",
            Self::HttpRequestFailed { .. } => "http_request_failed",
            Self::HttpStatus { .. } => "http_status_error",
            Self::ResponseReadFailed { .. } => "response_read_failed",
            Self::PageTextUnavailable => "page_text_unavailable",
            Self::UnsupportedResumeTemplate { .. } => "unsupported_resume_template",
            Self::ResumeRender { .. } => "resume_render_failed",
            Self::Config(_) => "analysis_config_invalid",
        }
    }

    pub fn fallback_message(&self) -> &'static str {
        match self {
            Self::FileNotFound { .. } => "The selected file could not be found.",
            Self::FileRead { .. } => "The selected file could not be read.",
            Self::FileWrite { .. } => "The selected file could not be saved.",
            Self::InvalidBase64 { .. } => "The file data is not valid.",
            Self::InvalidPath { .. } => "The selected file path is not allowed.",
            Self::UnsupportedFileFormat { expected } => match *expected {
                "pdf" => "Only PDF files are supported here.",
                _ => "The selected file format is not supported.",
            },
            Self::PdfOpen { .. } => "The PDF could not be opened.",
            Self::PdfTextExtract { .. } => "The PDF text could not be extracted.",
            Self::PdfNoText => {
                "The PDF appears to have no extractable text. It may be a scanned document."
            }
            Self::InvalidUrl => "Enter a valid http:// or https:// URL.",
            Self::BlockedAddress => {
                "This URL points to a private or local address and was blocked."
            }
            Self::HttpClient { .. } => "The network request could not be started.",
            Self::RequestTimeout => "The request timed out. Please try again.",
            Self::HttpRequestFailed { .. } => "The page could not be fetched.",
            Self::HttpStatus { .. } => "The website returned an error response.",
            Self::ResponseReadFailed { .. } => "The page response could not be read.",
            Self::PageTextUnavailable => {
                "Readable text could not be extracted from the page. It may require JavaScript."
            }
            Self::UnsupportedResumeTemplate { .. } => {
                "This resume template is not supported by the Typst renderer yet."
            }
            Self::ResumeRender { .. } => "The resume could not be rendered.",
            Self::Config(_) => {
                "Analysis settings are invalid. Check the override file or restore the default config."
            }
        }
    }
}

impl From<AppError> for AppErrorPayload {
    fn from(error: AppError) -> Self {
        Self {
            code: error.code(),
            message: error.fallback_message().to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_payload_uses_stable_error_code() {
        let payload = AppErrorPayload::from(AppError::InvalidUrl);
        assert_eq!(payload.code, "invalid_url");
        assert_eq!(payload.message, "Enter a valid http:// or https:// URL.");
    }
}
