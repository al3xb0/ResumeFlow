mod constants;
mod keywords;
mod readability;
mod verbs;

use std::sync::LazyLock;

use regex::Regex;
use unicode_normalization::UnicodeNormalization;

pub use keywords::{analyze_match, AnalysisResult};
pub use readability::{analyze_readability, ReadabilityResult};
pub use verbs::{lint_action_verbs, VerbLintResult};

static RE_WHITESPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());

fn normalize(text: &str) -> String {
    let n: String = text.nfkd().collect();
    let lower = n.to_lowercase();
    RE_WHITESPACE.replace_all(&lower, " ").trim().to_string()
}
