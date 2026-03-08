use std::collections::HashMap;
use std::path::Path;
use std::sync::LazyLock;

use pdf_extract::{Document, MediaBox, Object, OutputDev, OutputError, Transform};
use regex::Regex;
use serde::Serialize;

// ---------------------------------------------------------------------------
// Custom PDF text extractor with adaptive word-spacing detection
// ---------------------------------------------------------------------------

type ArtBox = (f64, f64, f64, f64);

struct CharInfo {
    x: f64,
    y: f64,
    end_x: f64,
    font_size: f64,
    text: String,
    word_id: u32,
}

struct SmartTextOutput {
    chars: Vec<CharInfo>,
    result: String,
    page_height: f64,
    current_word_id: u32,
}

impl SmartTextOutput {
    fn new() -> Self {
        Self {
            chars: Vec::new(),
            result: String::new(),
            page_height: 0.0,
            current_word_id: 0,
        }
    }

    fn into_string(self) -> String {
        self.result
    }

    /// After a page is finished, convert collected character data into text
    /// with properly detected word boundaries.
    fn flush_page(&mut self) {
        if self.chars.is_empty() {
            return;
        }

        if !self.result.is_empty() {
            self.result.push('\n');
        }

        self.chars.sort_by(|a, b| {
            a.y.partial_cmp(&b.y)
                .unwrap()
                .then(a.x.partial_cmp(&b.x).unwrap())
        });

        let mut line_start = 0;
        for i in 1..self.chars.len() {
            let prev = &self.chars[i - 1];
            if (self.chars[i].y - prev.y).abs() >= prev.font_size * 0.4 {
                if line_start > 0 {
                    self.result.push('\n');
                }
                Self::render_line_into(&self.chars[line_start..i], &mut self.result);
                line_start = i;
            }
        }
        // Last line
        if line_start < self.chars.len() {
            if line_start > 0 {
                self.result.push('\n');
            }
            Self::render_line_into(&self.chars[line_start..], &mut self.result);
        }

        self.chars.clear();
    }

    fn compute_space_threshold(line: &[CharInfo]) -> f64 {
        if line.len() < 2 {
            return f64::MAX;
        }

        let avg_fs: f64 = line.iter().map(|c| c.font_size).sum::<f64>() / line.len() as f64;

        // Collect positive gaps that occur at word-id boundaries
        let mut gaps: Vec<f64> = Vec::new();
        for pair in line.windows(2) {
            if pair[0].word_id == pair[1].word_id {
                continue; // intra-word — skip
            }
            let gap = pair[1].x - pair[0].end_x;
            if gap > 0.0 {
                gaps.push(gap);
            }
        }

        if gaps.is_empty() {
            return avg_fs * 0.25;
        }

        gaps.sort_by(|a, b| a.partial_cmp(b).unwrap());

        // Find the largest jump in the sorted gaps — the natural boundary
        // between kerning-level adjustments and real word spaces.
        let mut best_threshold = avg_fs * 0.25; // fallback
        let mut best_jump = 0.0_f64;

        for pair in gaps.windows(2) {
            let jump = pair[1] - pair[0];
            if jump > best_jump && jump > avg_fs * 0.03 {
                best_jump = jump;
                best_threshold = (pair[0] + pair[1]) / 2.0;
            }
        }

        // Clamp: never below 0.20 × fs, never above 0.45 × fs
        best_threshold.clamp(avg_fs * 0.20, avg_fs * 0.45)
    }

    /// Convert a line of characters into text, inserting spaces at detected
    /// word boundaries. Also filters likely icon-font characters.
    fn render_line_into(line: &[CharInfo], out: &mut String) {
        if line.is_empty() {
            return;
        }

        let threshold = Self::compute_space_threshold(line);

        // Count how many chars share each word_id
        let mut wid_counts: HashMap<u32, usize> = HashMap::new();
        for c in line {
            *wid_counts.entry(c.word_id).or_insert(0) += 1;
        }

        // Mark likely icon-font chars: singleton single-alpha chars at line
        // end that merge into the preceding text without a space gap.
        let mut skip = vec![false; line.len()];
        let mut i = line.len();
        while i > 0 {
            i -= 1;
            let ch = &line[i];
            if wid_counts[&ch.word_id] != 1 {
                break;
            }
            let is_single_alpha =
                ch.text.len() == 1 && ch.text.chars().next().map_or(false, |c| c.is_alphabetic());
            if !is_single_alpha {
                break;
            }
            // Must merge into previous char (gap < threshold)
            if i > 0 {
                let prev = &line[i - 1];
                let gap = ch.x - prev.end_x;
                if prev.word_id != ch.word_id && gap <= threshold {
                    skip[i] = true;
                    continue;
                }
            }
            break;
        }

        // Render, skipping marked chars
        let mut last_rendered: Option<usize> = None;
        for i in 0..line.len() {
            if skip[i] {
                continue;
            }
            match last_rendered {
                None => out.push_str(&line[i].text),
                Some(pi) => {
                    if line[pi].word_id == line[i].word_id {
                        out.push_str(&line[i].text);
                    } else {
                        let gap = line[i].x - line[pi].end_x;
                        if gap > threshold {
                            out.push(' ');
                        }
                        out.push_str(&line[i].text);
                    }
                }
            }
            last_rendered = Some(i);
        }
    }
}

impl OutputDev for SmartTextOutput {
    fn begin_page(
        &mut self,
        _page_num: u32,
        media_box: &MediaBox,
        _art_box: Option<ArtBox>,
    ) -> Result<(), OutputError> {
        self.page_height = media_box.ury - media_box.lly;
        Ok(())
    }

    fn end_page(&mut self) -> Result<(), OutputError> {
        self.flush_page();
        Ok(())
    }

    fn output_character(
        &mut self,
        trm: &Transform,
        width: f64,
        _spacing: f64,
        font_size: f64,
        char: &str,
    ) -> Result<(), OutputError> {
        let x = trm.m31;
        let y = self.page_height - trm.m32;

        let vx = font_size * (trm.m11 + trm.m21);
        let vy = font_size * (trm.m12 + trm.m22);
        let transformed_font_size = (vx.abs() * vy.abs()).sqrt();

        let end_x = x + width * transformed_font_size;

        self.chars.push(CharInfo {
            x,
            y,
            end_x,
            font_size: transformed_font_size,
            text: char.to_string(),
            word_id: self.current_word_id,
        });

        Ok(())
    }

    fn begin_word(&mut self) -> Result<(), OutputError> {
        self.current_word_id += 1;
        Ok(())
    }
    fn end_word(&mut self) -> Result<(), OutputError> {
        Ok(())
    }
    fn end_line(&mut self) -> Result<(), OutputError> {
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
    let mut output = SmartTextOutput::new();

    let doc =
        pdf_extract::Document::load(file_path).map_err(|e| format!("Failed to load PDF: {}", e))?;

    pdf_extract::output_doc(&doc, &mut output)
        .map_err(|e| format!("Failed to extract PDF text: {}", e))?;

    let raw = output.into_string();
    let cleaned = clean_extracted_text(&raw);

    if cleaned.is_empty() {
        return Err(
            "The PDF appears to contain no extractable text. It may be a scanned document."
                .to_string(),
        );
    }

    Ok(cleaned)
}

// ---------------------------------------------------------------------------
// Hyperlink extraction from PDF annotations
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Clone)]
pub struct PdfLink {
    pub url: String,
    pub page: u32,
}

pub fn extract_links_from_pdf(file_path: &str) -> Result<Vec<PdfLink>, String> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err("File not found".to_string());
    }

    let doc = Document::load(file_path).map_err(|e| format!("Failed to load PDF: {}", e))?;

    let mut links = Vec::new();

    for (page_num, page_id) in doc.get_pages() {
        let page_dict = match doc.get_object(page_id) {
            Ok(obj) => match obj.as_dict() {
                Ok(d) => d,
                Err(_) => continue,
            },
            Err(_) => continue,
        };

        let annots = match page_dict.get(b"Annots") {
            Ok(obj) => match doc.dereference(obj) {
                Ok((_, Object::Array(ref arr))) => arr.clone(),
                _ => continue,
            },
            Err(_) => continue,
        };

        for annot_ref in &annots {
            let annot_dict = match doc.dereference(annot_ref) {
                Ok((_, Object::Dictionary(d))) => d,
                _ => continue,
            };

            // Check Subtype == Link
            match annot_dict.get(b"Subtype") {
                Ok(st) => match doc.dereference(st) {
                    Ok((_, Object::Name(n))) if n == b"Link" => {}
                    _ => continue,
                },
                Err(_) => continue,
            }

            // Get the action dictionary /A
            let action = match annot_dict.get(b"A") {
                Ok(a) => match doc.dereference(a) {
                    Ok((_, Object::Dictionary(d))) => d,
                    _ => continue,
                },
                Err(_) => continue,
            };

            // Get /URI from the action
            if let Ok(uri_obj) = action.get(b"URI") {
                let uri_str = match doc.dereference(uri_obj) {
                    Ok((_, Object::String(bytes, _))) => {
                        String::from_utf8_lossy(&bytes).to_string()
                    }
                    _ => continue,
                };

                if !uri_str.is_empty() {
                    links.push(PdfLink {
                        url: uri_str,
                        page: page_num,
                    });
                }
            }
        }
    }

    // Deduplicate by URL
    links.sort_by(|a, b| a.url.cmp(&b.url).then(a.page.cmp(&b.page)));
    links.dedup_by(|a, b| a.url == b.url);

    Ok(links)
}

// ---------------------------------------------------------------------------
// Post-processing (handles invisible chars, trims, removes blank lines)
// ---------------------------------------------------------------------------

fn clean_extracted_text(text: &str) -> String {
    let text = sanitize_invisible_chars(&text);
    let text = merge_broken_words(&text);
    text.lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty() && line.chars().count() > 1)
        .collect::<Vec<_>>()
        .join("\n")
}

fn merge_broken_words(text: &str) -> String {
    // Single uppercase (except "I") + space + 2+ lowercase chars
    // "D eveloper" → "Developer", "A dditional" → "Additional"
    static RE_UPPER_LOWER: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"(?m)(^|[^a-zA-Z])([A-HJ-Z]) ([a-z]{2,})").unwrap());
    // Single uppercase (except "A","I") + space + 2+ uppercase chars
    // "C SS" → "CSS", "C MS" → "CMS"
    static RE_UPPER_UPPER: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"(?m)(^|[^a-zA-Z])([B-HJ-Z]) ([A-Z]{2,})").unwrap());
    // camelCase word ending in uppercase + space + 2+ uppercase continuation
    // "TailwindC SS" → "TailwindCSS"
    static RE_CAMEL_UPPER: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"([a-z])([A-Z]) ([A-Z]{2,})").unwrap());
    // Single uppercase (except "A","I") + space + digit
    // "C 1" → "C1"
    static RE_UPPER_DIGIT: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"(?m)(^|[^a-zA-Z])([B-HJ-Z]) (\d)").unwrap());

    let text = RE_UPPER_LOWER.replace_all(text, "${1}${2}${3}");
    let text = RE_UPPER_UPPER.replace_all(&text, "${1}${2}${3}");
    let text = RE_CAMEL_UPPER.replace_all(&text, "${1}${2}${3}");
    let text = RE_UPPER_DIGIT.replace_all(&text, "${1}${2}${3}");
    text.into_owned()
}

/// Replace invisible Unicode separators with spaces (so they contribute to
/// word boundaries) and strip non-separator invisible characters.
fn sanitize_invisible_chars(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            // Separators → space
            '\u{200B}' | '\u{200C}' => out.push(' '),
            // Non-separators → strip
            '\u{200D}' | '\u{FEFF}' | '\u{00AD}' | '\u{200E}' | '\u{200F}' => {}
            // Ligatures → decompose
            '\u{FB00}' => out.push_str("ff"),
            '\u{FB01}' => out.push_str("fi"),
            '\u{FB02}' => out.push_str("fl"),
            '\u{FB03}' => out.push_str("ffi"),
            '\u{FB04}' => out.push_str("ffl"),
            // Private Use Area — icon font glyphs (FontAwesome, etc.)
            c if ('\u{E000}'..='\u{F8FF}').contains(&c) => {}
            c if ('\u{F0000}'..='\u{FFFFD}').contains(&c) => {}
            c if ('\u{100000}'..='\u{10FFFD}').contains(&c) => {}
            other => out.push(other),
        }
    }
    out
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
    fn test_invisible_separator_replaced_with_space() {
        // Zero-width space between words should become a real space
        let input = "map\u{200B}features are nice";
        let cleaned = clean_extracted_text(input);
        assert_eq!(cleaned, "map features are nice");
    }

    #[test]
    fn test_invisible_non_separator_removed() {
        let input = "Hello\u{FEFF}World\u{200D}Test";
        let cleaned = clean_extracted_text(input);
        assert_eq!(cleaned, "HelloWorldTest");
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

    #[test]
    fn test_adaptive_threshold_basic() {
        // Simulate a line: "Hello World" with a clear gap between words
        // All chars in "Hello" share word_id 1, all chars in "World" share word_id 2
        let chars: Vec<CharInfo> = vec![
            CharInfo {
                x: 0.0,
                y: 10.0,
                end_x: 5.0,
                font_size: 12.0,
                text: "H".into(),
                word_id: 1,
            },
            CharInfo {
                x: 5.0,
                y: 10.0,
                end_x: 10.0,
                font_size: 12.0,
                text: "e".into(),
                word_id: 1,
            },
            CharInfo {
                x: 10.0,
                y: 10.0,
                end_x: 15.0,
                font_size: 12.0,
                text: "l".into(),
                word_id: 1,
            },
            CharInfo {
                x: 15.0,
                y: 10.0,
                end_x: 20.0,
                font_size: 12.0,
                text: "l".into(),
                word_id: 1,
            },
            CharInfo {
                x: 20.0,
                y: 10.0,
                end_x: 25.0,
                font_size: 12.0,
                text: "o".into(),
                word_id: 1,
            },
            // Word gap
            CharInfo {
                x: 29.0,
                y: 10.0,
                end_x: 36.0,
                font_size: 12.0,
                text: "W".into(),
                word_id: 2,
            },
            CharInfo {
                x: 36.0,
                y: 10.0,
                end_x: 41.0,
                font_size: 12.0,
                text: "o".into(),
                word_id: 2,
            },
            CharInfo {
                x: 41.0,
                y: 10.0,
                end_x: 46.0,
                font_size: 12.0,
                text: "r".into(),
                word_id: 2,
            },
            CharInfo {
                x: 46.0,
                y: 10.0,
                end_x: 51.0,
                font_size: 12.0,
                text: "l".into(),
                word_id: 2,
            },
            CharInfo {
                x: 51.0,
                y: 10.0,
                end_x: 56.0,
                font_size: 12.0,
                text: "d".into(),
                word_id: 2,
            },
        ];
        let mut result = String::new();
        SmartTextOutput::render_line_into(&chars, &mut result);
        assert_eq!(result, "Hello World");
    }

    #[test]
    fn test_adaptive_threshold_no_false_split() {
        // Simulate "GitHub" from TJ array: [(G) 20 (itH) 30 (ub)]
        // Each chunk gets a different word_id, but they should NOT be split
        let chars: Vec<CharInfo> = vec![
            CharInfo {
                x: 0.0,
                y: 10.0,
                end_x: 7.0,
                font_size: 12.0,
                text: "G".into(),
                word_id: 1,
            },
            // Different word_id from next TJ chunk, but tiny gap → no space
            CharInfo {
                x: 7.2,
                y: 10.0,
                end_x: 10.5,
                font_size: 12.0,
                text: "i".into(),
                word_id: 2,
            },
            CharInfo {
                x: 10.5,
                y: 10.0,
                end_x: 14.5,
                font_size: 12.0,
                text: "t".into(),
                word_id: 2,
            },
            CharInfo {
                x: 14.5,
                y: 10.0,
                end_x: 21.0,
                font_size: 12.0,
                text: "H".into(),
                word_id: 2,
            },
            // Another TJ chunk
            CharInfo {
                x: 21.3,
                y: 10.0,
                end_x: 27.0,
                font_size: 12.0,
                text: "u".into(),
                word_id: 3,
            },
            CharInfo {
                x: 27.0,
                y: 10.0,
                end_x: 33.0,
                font_size: 12.0,
                text: "b".into(),
                word_id: 3,
            },
        ];
        let mut result = String::new();
        SmartTextOutput::render_line_into(&chars, &mut result);
        assert_eq!(result, "GitHub");
    }

    #[test]
    fn test_adaptive_threshold_with_context() {
        // "GitHub | LinkedIn" — TJ kerning inside GitHub, real spaces around |
        let chars: Vec<CharInfo> = vec![
            CharInfo {
                x: 0.0,
                y: 10.0,
                end_x: 7.0,
                font_size: 12.0,
                text: "G".into(),
                word_id: 1,
            },
            CharInfo {
                x: 7.2,
                y: 10.0,
                end_x: 10.5,
                font_size: 12.0,
                text: "i".into(),
                word_id: 2,
            },
            CharInfo {
                x: 10.5,
                y: 10.0,
                end_x: 14.5,
                font_size: 12.0,
                text: "t".into(),
                word_id: 2,
            },
            CharInfo {
                x: 14.5,
                y: 10.0,
                end_x: 21.0,
                font_size: 12.0,
                text: "H".into(),
                word_id: 2,
            },
            CharInfo {
                x: 21.3,
                y: 10.0,
                end_x: 27.0,
                font_size: 12.0,
                text: "u".into(),
                word_id: 3,
            },
            CharInfo {
                x: 27.0,
                y: 10.0,
                end_x: 33.0,
                font_size: 12.0,
                text: "b".into(),
                word_id: 3,
            },
            // Real word space to |
            CharInfo {
                x: 37.0,
                y: 10.0,
                end_x: 39.0,
                font_size: 12.0,
                text: "|".into(),
                word_id: 4,
            },
            // Real word space to LinkedIn
            CharInfo {
                x: 43.0,
                y: 10.0,
                end_x: 50.0,
                font_size: 12.0,
                text: "L".into(),
                word_id: 5,
            },
            CharInfo {
                x: 50.0,
                y: 10.0,
                end_x: 53.0,
                font_size: 12.0,
                text: "i".into(),
                word_id: 5,
            },
            CharInfo {
                x: 53.0,
                y: 10.0,
                end_x: 58.0,
                font_size: 12.0,
                text: "n".into(),
                word_id: 5,
            },
        ];
        let mut result = String::new();
        SmartTextOutput::render_line_into(&chars, &mut result);
        assert_eq!(result, "GitHub | Lin");
    }

    #[test]
    fn test_same_word_id_never_splits() {
        // Even with a large gap, same word_id should never split
        let chars: Vec<CharInfo> = vec![
            CharInfo {
                x: 0.0,
                y: 10.0,
                end_x: 5.0,
                font_size: 12.0,
                text: "A".into(),
                word_id: 1,
            },
            CharInfo {
                x: 15.0,
                y: 10.0,
                end_x: 20.0,
                font_size: 12.0,
                text: "B".into(),
                word_id: 1,
            },
        ];
        let mut result = String::new();
        SmartTextOutput::render_line_into(&chars, &mut result);
        assert_eq!(result, "AB");
    }

    #[test]
    fn test_merge_broken_upper_lower() {
        assert_eq!(merge_broken_words("D eveloper"), "Developer");
        assert_eq!(merge_broken_words("C ypress"), "Cypress");
        assert_eq!(merge_broken_words("A dditional"), "Additional");
        assert_eq!(merge_broken_words("A liaksandr"), "Aliaksandr");
        assert_eq!(
            merge_broken_words("Junior Frontend D eveloper"),
            "Junior Frontend Developer"
        );
    }

    #[test]
    fn test_merge_broken_upper_upper() {
        assert_eq!(merge_broken_words("C SS"), "CSS");
        assert_eq!(merge_broken_words("C MS"), "CMS");
        assert_eq!(merge_broken_words("S SR"), "SSR");
        assert_eq!(merge_broken_words("TailwindC SS"), "TailwindCSS");
    }

    #[test]
    fn test_merge_broken_upper_digit() {
        assert_eq!(merge_broken_words("C 1"), "C1");
        assert_eq!(merge_broken_words("Polish - C 1"), "Polish - C1");
    }

    #[test]
    fn test_merge_preserves_real_words() {
        // "I" should never be merged (pronoun)
        assert_eq!(merge_broken_words("I developed apps"), "I developed apps");
        // Real word spaces should be preserved
        assert_eq!(merge_broken_words("Hello World"), "Hello World");
    }

    #[test]
    fn test_single_char_lines_filtered() {
        let input = "Hello World\nE\nq\n•\n.\nReal content here";
        let cleaned = clean_extracted_text(input);
        assert_eq!(cleaned, "Hello World\nReal content here");
    }

    #[test]
    fn test_ligature_decomposition() {
        let input = "Tra\u{FB01}mczyk";
        let cleaned = sanitize_invisible_chars(input);
        assert_eq!(cleaned, "Trafimczyk");
    }

    #[test]
    fn test_pua_chars_stripped() {
        // FontAwesome-style icon characters in Private Use Area
        let input = "Hello\u{F095}World\u{E001}Test";
        let cleaned = sanitize_invisible_chars(input);
        assert_eq!(cleaned, "HelloWorldTest");
    }

    #[test]
    fn test_icon_char_stripped_at_line_end() {
        // Simulates "gmail.com" followed by an icon font char "E" (envelope)
        // Icon char has its own word_id, positioned right after text
        let chars: Vec<CharInfo> = vec![
            // "gmail.com" — all same word_id
            CharInfo {
                x: 0.0,
                y: 10.0,
                end_x: 5.0,
                font_size: 10.0,
                text: "g".into(),
                word_id: 5,
            },
            CharInfo {
                x: 5.0,
                y: 10.0,
                end_x: 10.0,
                font_size: 10.0,
                text: "m".into(),
                word_id: 5,
            },
            CharInfo {
                x: 10.0,
                y: 10.0,
                end_x: 15.0,
                font_size: 10.0,
                text: "a".into(),
                word_id: 5,
            },
            CharInfo {
                x: 15.0,
                y: 10.0,
                end_x: 20.0,
                font_size: 10.0,
                text: "i".into(),
                word_id: 5,
            },
            CharInfo {
                x: 20.0,
                y: 10.0,
                end_x: 25.0,
                font_size: 10.0,
                text: "l".into(),
                word_id: 5,
            },
            // Icon char "E" — different word_id, positioned right after text
            CharInfo {
                x: 25.5,
                y: 10.0,
                end_x: 30.0,
                font_size: 10.0,
                text: "E".into(),
                word_id: 42,
            },
        ];
        let mut result = String::new();
        SmartTextOutput::render_line_into(&chars, &mut result);
        assert_eq!(result, "gmail");
    }

    #[test]
    fn test_icon_char_does_not_strip_real_text() {
        // TJ kerning: [(G) 20 (itHub)] — "G" is a singleton but at START, not end
        let chars: Vec<CharInfo> = vec![
            CharInfo {
                x: 0.0,
                y: 10.0,
                end_x: 7.0,
                font_size: 12.0,
                text: "G".into(),
                word_id: 1,
            },
            CharInfo {
                x: 7.2,
                y: 10.0,
                end_x: 10.5,
                font_size: 12.0,
                text: "i".into(),
                word_id: 2,
            },
            CharInfo {
                x: 10.5,
                y: 10.0,
                end_x: 14.5,
                font_size: 12.0,
                text: "t".into(),
                word_id: 2,
            },
            CharInfo {
                x: 14.5,
                y: 10.0,
                end_x: 21.0,
                font_size: 12.0,
                text: "H".into(),
                word_id: 2,
            },
            CharInfo {
                x: 21.3,
                y: 10.0,
                end_x: 27.0,
                font_size: 12.0,
                text: "u".into(),
                word_id: 3,
            },
            CharInfo {
                x: 27.0,
                y: 10.0,
                end_x: 33.0,
                font_size: 12.0,
                text: "b".into(),
                word_id: 3,
            },
        ];
        let mut result = String::new();
        SmartTextOutput::render_line_into(&chars, &mut result);
        assert_eq!(result, "GitHub");
    }
}
