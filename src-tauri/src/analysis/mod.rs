mod keywords;
mod readability;
mod verbs;

use std::sync::LazyLock;

use crate::config::AnalysisConfig;
use regex::Regex;
use unicode_normalization::UnicodeNormalization;

pub use keywords::{analyze_match_with_config, AnalysisResult};
pub use readability::{analyze_readability_with_config, ReadabilityResult};
pub use verbs::{lint_action_verbs_with_config, VerbLintResult};

static RE_WHITESPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());

fn normalize(text: &str) -> String {
    let n: String = text.nfkd().collect();
    let lower = n.to_lowercase();
    RE_WHITESPACE.replace_all(&lower, " ").trim().to_string()
}

#[cfg_attr(not(test), allow(dead_code))]
fn bundled_config() -> &'static AnalysisConfig {
    AnalysisConfig::bundled()
}
