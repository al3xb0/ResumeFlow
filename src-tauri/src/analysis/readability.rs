use std::collections::HashMap;
use std::sync::LazyLock;

use regex::Regex;

use super::normalize;
use super::constants::EXPECTED_SECTIONS;

// ── Thresholds ──────────────────────────────────────────────────────────────
const GOOD_WORD_COUNT: u32 = 150;
const SHORT_WORD_COUNT: u32 = 80;
const MAX_WORD_COUNT: u32 = 1000;
const MIN_GOOD_LINES: usize = 10;
const MIN_OK_LINES: usize = 5;
const MIN_BULLET_LINES: usize = 5;
const MAX_WEIRD_RATIO: f64 = 0.1;
const CLEAN_WEIRD_RATIO: f64 = 0.01;
const MAX_SINGLE_LETTER_WORDS: usize = 3;
const MIN_DUPLICATE_WORDS: usize = 4;

static RE_EMAIL: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[\w.+-]+@[\w-]+\.[\w.]+").unwrap());
static RE_PHONE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[\+]?[\d\s\-\(\)]{7,}").unwrap());
static RE_LINKEDIN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)linkedin\.com/in/[\w\-]+").unwrap());
static RE_GITHUB: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)github\.com/[\w\-]+").unwrap());
static RE_BULLET: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[\s]*[•\-\*▪◦‣⁃]\s*").unwrap());

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadabilityResult {
    pub score: u32,
    pub word_count: u32,
    pub sections_found: Vec<String>,
    pub sections_missing: Vec<String>,
    pub warnings: Vec<String>,
    pub positives: Vec<String>,
}

pub fn analyze_readability(resume_text: &str) -> ReadabilityResult {
    let text = resume_text.trim();
    let norm = normalize(text);
    let word_count = text.split_whitespace().count() as u32;
    let line_count = text.lines().count();

    let mut score: i32 = 0;
    let mut warnings: Vec<String> = Vec::new();
    let mut positives: Vec<String> = Vec::new();

    if word_count == 0 {
        return ReadabilityResult {
            score: 0,
            word_count: 0,
            sections_found: vec![],
            sections_missing: vec![],
            warnings: vec!["No text detected".into()],
            positives: vec![],
        };
    }

    score_word_count(word_count, &mut score, &mut warnings, &mut positives);

    let (sections_found, sections_missing) = check_sections(&norm, &mut score);

    score_line_structure(line_count, &mut score, &mut warnings, &mut positives);
    score_contact_info(text, &mut score, &mut warnings, &mut positives);
    score_text_quality(text, &mut score, &mut warnings, &mut positives);
    score_bullet_points(text, word_count, &mut score, &mut warnings, &mut positives);
    check_duplicates(text, &mut score, &mut warnings);

    ReadabilityResult {
        score: score.clamp(0, 100) as u32,
        word_count,
        sections_found,
        sections_missing,
        warnings,
        positives,
    }
}

fn score_word_count(
    word_count: u32,
    score: &mut i32,
    warnings: &mut Vec<String>,
    positives: &mut Vec<String>,
) {
    if word_count >= GOOD_WORD_COUNT {
        *score += 15;
        positives.push(format!("{} words — good length", word_count));
    } else if word_count >= SHORT_WORD_COUNT {
        *score += 8;
        warnings.push(format!("{} words — resume seems short", word_count));
    } else {
        warnings.push(format!(
            "{} words — resume is very short, consider adding more detail",
            word_count
        ));
    }

    if word_count > MAX_WORD_COUNT {
        warnings.push(format!(
            "{} words — resume may be too long, consider trimming to 1–2 pages",
            word_count
        ));
        *score -= 5;
    }
}

fn check_sections(norm: &str, score: &mut i32) -> (Vec<String>, Vec<String>) {
    let mut found = Vec::new();
    let mut missing = Vec::new();

    for &(section_name, markers) in EXPECTED_SECTIONS {
        if markers.iter().any(|m| norm.contains(m)) {
            found.push(section_name.to_string());
            *score += 15;
        } else {
            missing.push(section_name.to_string());
        }
    }

    (found, missing)
}

fn score_line_structure(
    line_count: usize,
    score: &mut i32,
    _warnings: &mut Vec<String>,
    positives: &mut Vec<String>,
) {
    if line_count >= MIN_GOOD_LINES {
        *score += 10;
        positives.push("Good line structure".into());
    } else if line_count >= MIN_OK_LINES {
        *score += 5;
    } else {
        _warnings.push("Very few line breaks — text may be poorly parsed".into());
    }
}

fn score_contact_info(
    text: &str,
    score: &mut i32,
    warnings: &mut Vec<String>,
    positives: &mut Vec<String>,
) {
    if RE_EMAIL.is_match(text) {
        *score += 5;
        positives.push("Email detected".into());
    } else {
        warnings.push("No email address found".into());
    }

    if RE_PHONE.is_match(text) {
        *score += 5;
        positives.push("Phone number detected".into());
    }

    if RE_LINKEDIN.is_match(text) {
        *score += 3;
        positives.push("LinkedIn profile detected".into());
    }
    if RE_GITHUB.is_match(text) {
        *score += 3;
        positives.push("GitHub profile detected".into());
    }
}

fn score_text_quality(
    text: &str,
    score: &mut i32,
    warnings: &mut Vec<String>,
    positives: &mut Vec<String>,
) {
    let total_chars = text.chars().count();
    let weird_chars = text
        .chars()
        .filter(|c| !c.is_ascii() && !c.is_alphabetic())
        .count();
    let weird_ratio = if total_chars > 0 {
        weird_chars as f64 / total_chars as f64
    } else {
        0.0
    };
    if weird_ratio > MAX_WEIRD_RATIO {
        warnings.push("Many unrecognized characters — PDF may be poorly extracted".into());
        *score -= 15;
    } else if weird_ratio < CLEAN_WEIRD_RATIO {
        *score += 5;
        positives.push("Clean text extraction".into());
    }

    let single_letter_words = text
        .split_whitespace()
        .filter(|w| w.len() == 1 && w.chars().next().is_some_and(|c| c.is_alphabetic()))
        .count();
    if single_letter_words > MAX_SINGLE_LETTER_WORDS {
        warnings.push(format!(
            "{} single-letter fragments detected — text may have extraction artifacts",
            single_letter_words
        ));
        *score -= 10;
    }
}

fn score_bullet_points(
    text: &str,
    word_count: u32,
    score: &mut i32,
    warnings: &mut Vec<String>,
    positives: &mut Vec<String>,
) {
    let bullet_lines = text.lines().filter(|l| RE_BULLET.is_match(l)).count();
    if bullet_lines >= MIN_BULLET_LINES {
        *score += 5;
        positives.push(format!("{} bullet points — well-structured", bullet_lines));
    } else if word_count >= GOOD_WORD_COUNT && bullet_lines == 0 {
        warnings
            .push("No bullet points detected — consider using bullet lists for experience".into());
    }
}

fn check_duplicates(text: &str, score: &mut i32, warnings: &mut Vec<String>) {
    let mut line_counts: HashMap<String, u32> = HashMap::new();
    for line in text.lines() {
        let trimmed = line.trim().to_lowercase();
        if trimmed.split_whitespace().count() >= MIN_DUPLICATE_WORDS {
            *line_counts.entry(trimmed).or_insert(0) += 1;
        }
    }
    let duplicates: u32 = line_counts
        .values()
        .filter(|&&c| c > 1)
        .map(|c| c - 1)
        .sum();
    if duplicates > 0 {
        warnings.push(format!(
            "{} duplicate line(s) detected — review for repeated content",
            duplicates
        ));
        *score -= 5;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_readability_good_resume() {
        let resume = "John Doe\njohn@example.com | +1 555-0123 | GitHub | LinkedIn\n\n\
                       SUMMARY\nSoftware engineer with 5 years of experience.\n\n\
                       EXPERIENCE\nCompany A — Developer | 2020-2024\n\
                       Built web applications using React and Node.js.\n\n\
                       EDUCATION\nBachelor of CS — MIT\n\n\
                       SKILLS\nJavaScript, TypeScript, React, Node.js, Docker";
        let r = analyze_readability(resume);
        assert!(
            r.score >= 50,
            "Good resume should score >= 50, got {}",
            r.score
        );
        assert!(r.sections_found.len() >= 3);
        assert!(!r.positives.is_empty());
    }

    #[test]
    fn test_readability_empty() {
        let r = analyze_readability("");
        assert_eq!(r.score, 0);
        assert_eq!(r.word_count, 0);
    }

    #[test]
    fn test_readability_detects_bullets() {
        let resume = "John Doe\njohn@example.com | +1 555-0123\n\n\
                       SUMMARY\nSoftware engineer with 5 years of experience.\n\n\
                       EXPERIENCE\nCompany A — Developer | 2020-2024\n\
                       • Built web applications using React\n\
                       • Optimized database queries\n\
                       • Deployed services to AWS\n\
                       • Mentored junior developers\n\
                       • Wrote unit tests with Jest\n\n\
                       EDUCATION\nBachelor of CS — MIT\n\n\
                       SKILLS\nJavaScript, TypeScript, React, Node.js, Docker";
        let r = analyze_readability(resume);
        assert!(
            r.positives.iter().any(|p| p.contains("bullet points")),
            "Should detect bullet points"
        );
    }

    #[test]
    fn test_readability_detects_linkedin() {
        let resume = "John Doe\njohn@example.com | linkedin.com/in/johndoe | +1 555\n\n\
                       SUMMARY\nSoftware engineer.\n\n\
                       EXPERIENCE\nCompany A.\n\n\
                       EDUCATION\nMIT\n\n\
                       SKILLS\nReact";
        let r = analyze_readability(resume);
        assert!(
            r.positives.iter().any(|p| p.contains("LinkedIn")),
            "Should detect LinkedIn profile"
        );
    }

    #[test]
    fn test_readability_detects_duplicates() {
        let resume = "John Doe\njohn@example.com | +1 555-0123\n\n\
                       SUMMARY\nSoftware engineer with experience.\n\n\
                       EXPERIENCE\n\
                       Built web applications using React and Node.js.\n\
                       Built web applications using React and Node.js.\n\n\
                       EDUCATION\nMIT\n\n\
                       SKILLS\nReact";
        let r = analyze_readability(resume);
        assert!(
            r.warnings.iter().any(|w| w.contains("duplicate")),
            "Should detect duplicate lines"
        );
    }
}
