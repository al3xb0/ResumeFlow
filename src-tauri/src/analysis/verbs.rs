use regex::Regex;

use crate::config::{AnalysisConfig, WeakVerbEntry};

use super::bundled_config;

#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VerbIssue {
    pub weak_verb: String,
    pub line: u32,
    pub suggestions: Vec<String>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VerbLintResult {
    pub issues: Vec<VerbIssue>,
    pub total_issues: u32,
}

struct VerbPattern {
    regex: Regex,
    weak_verb: String,
    suggestions: Vec<String>,
}

#[cfg_attr(not(test), allow(dead_code))]
pub fn lint_action_verbs(text: &str) -> VerbLintResult {
    lint_action_verbs_with_config(text, bundled_config())
}

pub fn lint_action_verbs_with_config(text: &str, config: &AnalysisConfig) -> VerbLintResult {
    let patterns = build_patterns(&config.weak_verbs_en);
    let mut issues: Vec<VerbIssue> = Vec::new();

    for (line_num, line) in text.lines().enumerate() {
        let lower_line = line.to_lowercase();

        for vp in &patterns {
            if !lower_line.contains(&vp.weak_verb.to_lowercase()) {
                continue;
            }

            if vp.regex.is_match(&lower_line) {
                let already_reported = issues
                    .iter()
                    .any(|i| i.weak_verb == vp.weak_verb && i.line == (line_num as u32 + 1));

                if !already_reported {
                    issues.push(VerbIssue {
                        weak_verb: vp.weak_verb.clone(),
                        line: line_num as u32 + 1,
                        suggestions: vp.suggestions.clone(),
                    });
                }
            }
        }
    }

    let total = issues.len() as u32;
    VerbLintResult {
        issues,
        total_issues: total,
    }
}

fn build_patterns(entries: &[WeakVerbEntry]) -> Vec<VerbPattern> {
    entries
        .iter()
        .filter_map(|entry| {
            let pattern = format!(
                r"(?i)\b{}\b",
                regex::escape(&entry.weak_verb.to_lowercase())
            );
            Regex::new(&pattern).ok().map(|re| VerbPattern {
                regex: re,
                weak_verb: entry.weak_verb.clone(),
                suggestions: entry.suggestions.clone(),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use crate::config::{AnalysisConfig, SectionMarkers, WeakVerbEntry};

    use super::*;

    fn custom_config() -> AnalysisConfig {
        AnalysisConfig {
            tech_keywords: vec![],
            ambiguous_keywords: vec![],
            expected_sections: vec![SectionMarkers {
                name: "skills".into(),
                markers: vec!["skills".into()],
            }],
            nice_case: BTreeMap::new(),
            weak_verbs_en: vec![WeakVerbEntry {
                weak_verb: "owned".into(),
                suggestions: vec!["led".into(), "drove".into()],
            }],
        }
    }

    #[test]
    fn test_verb_linter_detects_weak_verbs_en() {
        let text = "I worked on the project.\nI helped the team.\nI implemented the API.";
        let result = lint_action_verbs(text);
        assert_eq!(result.total_issues, 2);
        assert!(result.issues.iter().any(|i| i.weak_verb == "worked"));
        assert!(result.issues.iter().any(|i| i.weak_verb == "helped"));
    }

    #[test]
    fn test_verb_linter_no_false_positives() {
        let text = "Engineered a distributed system.\nOptimized database queries.";
        let result = lint_action_verbs(text);
        assert_eq!(result.total_issues, 0);
    }

    #[test]
    fn test_verb_linter_returns_suggestions() {
        let text = "I used React for the frontend.";
        let result = lint_action_verbs(text);
        assert_eq!(result.total_issues, 1);
        assert!(!result.issues[0].suggestions.is_empty());
        assert!(result.issues[0]
            .suggestions
            .iter()
            .any(|s| s == "leveraged"));
    }

    #[test]
    fn test_verb_linter_uses_custom_config_entries() {
        let result = lint_action_verbs_with_config("I owned the migration.", &custom_config());

        assert_eq!(result.total_issues, 1);
        assert_eq!(result.issues[0].weak_verb, "owned");
        assert!(result.issues[0]
            .suggestions
            .iter()
            .any(|suggestion| suggestion == "led"));
    }
}
