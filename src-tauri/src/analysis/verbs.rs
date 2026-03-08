use std::sync::LazyLock;

use regex::Regex;

use super::constants::WEAK_VERBS_EN;

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
    weak_verb: &'static str,
    suggestions: &'static [&'static str],
}

static VERB_PATTERNS: LazyLock<Vec<VerbPattern>> = LazyLock::new(|| {
    WEAK_VERBS_EN
        .iter()
        .filter_map(|&(weak, suggestions)| {
            let pattern = format!(r"(?i)\b{}\b", regex::escape(&weak.to_lowercase()));
            Regex::new(&pattern).ok().map(|re| VerbPattern {
                regex: re,
                weak_verb: weak,
                suggestions,
            })
        })
        .collect()
});

pub fn lint_action_verbs(text: &str) -> VerbLintResult {
    let mut issues: Vec<VerbIssue> = Vec::new();

    for (line_num, line) in text.lines().enumerate() {
        let lower_line = line.to_lowercase();

        for vp in VERB_PATTERNS.iter() {
            if !lower_line.contains(&vp.weak_verb.to_lowercase()) {
                continue;
            }

            if vp.regex.is_match(&lower_line) {
                let already_reported = issues
                    .iter()
                    .any(|i| i.weak_verb == vp.weak_verb && i.line == (line_num as u32 + 1));

                if !already_reported {
                    issues.push(VerbIssue {
                        weak_verb: vp.weak_verb.to_string(),
                        line: line_num as u32 + 1,
                        suggestions: vp.suggestions.iter().map(|s| s.to_string()).collect(),
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

#[cfg(test)]
mod tests {
    use super::*;

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
}
