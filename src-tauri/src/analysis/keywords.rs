use std::collections::HashSet;

use regex::Regex;

use crate::config::AnalysisConfig;

use super::{bundled_config, normalize};

#[derive(Clone, Debug)]
struct Keyword {
    label: String,
    needle: String,
    weight: u32,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisResult {
    pub match_score: u32,
    pub found_keywords: Vec<String>,
    pub missing_keywords: Vec<String>,
    pub total_keywords: u32,
}

#[cfg_attr(not(test), allow(dead_code))]
pub fn analyze_match(resume_text: &str, job_description: &str) -> AnalysisResult {
    analyze_match_with_config(resume_text, job_description, bundled_config())
}

pub fn analyze_match_with_config(
    resume_text: &str,
    job_description: &str,
    config: &AnalysisConfig,
) -> AnalysisResult {
    let keywords = extract_keywords(job_description, config);
    let norm_resume = normalize(resume_text);

    let mut found: Vec<String> = Vec::new();
    let mut missing: Vec<String> = Vec::new();
    let mut found_weight: u32 = 0;
    let mut total_weight: u32 = 0;

    for kw in &keywords {
        total_weight += kw.weight;
        if keyword_in_text(&kw.needle, &norm_resume) {
            found_weight += kw.weight;
            found.push(kw.label.clone());
        } else {
            missing.push(kw.label.clone());
        }
    }

    let match_score = if total_weight > 0 {
        ((found_weight as f64 / total_weight as f64) * 100.0).round() as u32
    } else {
        0
    };

    AnalysisResult {
        match_score,
        found_keywords: found,
        missing_keywords: missing,
        total_keywords: keywords.len() as u32,
    }
}

/// Canonical form for deduplication: strips dots so "node.js" and "nodejs"
/// are treated as the same keyword.
fn canonical(s: &str) -> String {
    s.replace('.', "")
}

/// Build a regex pattern that matches `needle` only at word boundaries
/// (where boundaries include whitespace, punctuation, and line edges).
fn word_boundary_pattern(needle: &str) -> String {
    format!(
        r"(?:^|[\s,;|/\(\)\[\]\-•]){}(?:$|[\s,;|/\(\)\[\]\-•.!?:])",
        regex::escape(needle)
    )
}

fn extract_keywords(job_text: &str, config: &AnalysisConfig) -> Vec<Keyword> {
    let norm_job = normalize(job_text);
    let mut seen: HashSet<String> = HashSet::new();
    let mut keywords: Vec<Keyword> = Vec::new();

    for tech in &config.tech_keywords {
        let needle = tech.to_lowercase();
        if !norm_job.contains(&needle) {
            continue;
        }
        let canon = canonical(&needle);
        if seen.contains(&canon) {
            continue;
        }

        if config
            .ambiguous_keywords
            .iter()
            .any(|keyword| keyword == &needle)
            && !is_tech_mention(&needle, &norm_job)
        {
            continue;
        }

        let pattern = word_boundary_pattern(&needle);
        if let Ok(re) = Regex::new(&pattern) {
            if re.is_match(&norm_job) {
                seen.insert(canon);
                keywords.push(Keyword {
                    label: nice_case(tech, config),
                    needle,
                    weight: 3,
                });
            }
        }
    }

    keywords.sort_by(|a, b| a.label.cmp(&b.label));
    keywords
}

fn is_tech_mention(word: &str, text: &str) -> bool {
    let pattern = format!(
        r"(?:^|[,;|/•:\n])[\s]*{}(?:$|[\s,;|/•:\n.!?])",
        regex::escape(word)
    );
    if let Ok(re) = Regex::new(&pattern) {
        return re.is_match(text);
    }
    false
}

fn nice_case(s: &str, config: &AnalysisConfig) -> String {
    if let Some(display) = config.nice_case.get(&s.to_lowercase()) {
        return display.clone();
    }

    s.split_whitespace()
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                None => String::new(),
                Some(c) => format!("{}{}", c.to_uppercase(), chars.as_str()),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn keyword_in_text(needle: &str, haystack: &str) -> bool {
    let variants: Vec<String> = {
        let mut v = vec![needle.to_string()];
        let stripped = needle.replace('.', "");
        if stripped != needle {
            v.push(stripped);
        }
        if !needle.contains('.') && needle.ends_with("js") && needle.len() > 2 {
            let with_dot = format!("{}.js", &needle[..needle.len() - 2]);
            v.push(with_dot);
        }
        v
    };

    for variant in &variants {
        if !haystack.contains(variant.as_str()) {
            continue;
        }
        if variant.len() <= 3 {
            let pattern = word_boundary_pattern(variant);
            if let Ok(re) = Regex::new(&pattern) {
                if re.is_match(haystack) {
                    return true;
                }
            }
        } else {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use crate::config::{AnalysisConfig, SectionMarkers, WeakVerbEntry};

    use super::*;

    fn custom_config(tech_keywords: &[&str]) -> AnalysisConfig {
        AnalysisConfig {
            tech_keywords: tech_keywords
                .iter()
                .map(|keyword| keyword.to_string())
                .collect(),
            ambiguous_keywords: vec!["go".into()],
            expected_sections: vec![SectionMarkers {
                name: "skills".into(),
                markers: vec!["skills".into()],
            }],
            nice_case: BTreeMap::from([
                ("go".into(), "Go".into()),
                ("machine vision".into(), "Machine Vision".into()),
                ("rust".into(), "Rust".into()),
            ]),
            weak_verbs_en: vec![WeakVerbEntry {
                weak_verb: "worked".into(),
                suggestions: vec!["engineered".into()],
            }],
        }
    }

    #[test]
    fn test_real_world_no_false_positives() {
        let job = "What we're looking for\n\
                   You're based in Europe and can collaborate reasonably within CET/CEST\n\
                   Fluent English (spoken + written)\n\
                   Strong willingness to learn, ask questions, and take ownership\n\
                   You're not afraid of:\n\
                   unfamiliar codebases\n\
                   debugging real production issues\n\
                   making changes carefully in a system that keeps evolving\n\n\
                   Tech expectations\n\
                   Comfortable working with TypeScript (or very motivated to become great at it)\n\
                   Some experience with React and modern web development\n\
                   Familiarity with backend basics in Node.js and willingness to go deeper\n\
                   Pragmatism: sometimes the best solution is not adding another dependency\n\
                   Blockchain knowledge is NOT required.\n\n\
                   Our tech stack\n\
                   TypeScript\n\
                   Node.js\n\
                   PostgreSQL\n\
                   React\n\
                   Lots of in-house tooling around gathering and analysing blockchain data";

        let resume = "Full-Stack Developer with experience in React, TypeScript, Redux, \
                       Node.js, FastAPI, PostgreSQL, MongoDB, Docker, Git, Linux. \
                       English B2, Polish C1.";
        let result = analyze_match(resume, job);

        let all: Vec<String> = result
            .found_keywords
            .iter()
            .chain(result.missing_keywords.iter())
            .map(|s| s.to_lowercase())
            .collect();

        for bad in &[
            "cet",
            "cest",
            "europe",
            "modern web",
            "ownership",
            "take ownership",
            "willingness to learn",
            "fluent english",
            "in-house tooling",
            "production issues",
            "go",
        ] {
            assert!(
                !all.contains(&bad.to_string()),
                "False positive keyword: '{}'",
                bad
            );
        }

        for good in &["typescript", "react", "node.js", "postgresql"] {
            assert!(
                all.contains(&good.to_string()),
                "Missing expected keyword: '{}'",
                good
            );
        }
    }

    #[test]
    fn test_go_as_real_tech() {
        let job = "Our stack: Go, TypeScript, PostgreSQL, React";
        let result = analyze_match("I work with Go and TypeScript", job);
        let all: Vec<String> = result
            .found_keywords
            .iter()
            .chain(result.missing_keywords.iter())
            .map(|s| s.to_lowercase())
            .collect();
        assert!(
            all.contains(&"go".to_string()),
            "Go should be detected in tech list"
        );
    }

    #[test]
    fn test_golang_keyword() {
        let job = "Experience with Golang, React";
        let result = analyze_match("I know Golang and React well", job);
        assert!(result.found_keywords.iter().any(|k| k == "Go"));
    }

    #[test]
    fn test_basic_matching() {
        let resume = "Experienced software engineer with Python, React, and TypeScript skills.";
        let job = "Looking for a software engineer with Python and React experience.";
        let result = analyze_match(resume, job);
        assert!(result.match_score > 0);
        assert!(!result.found_keywords.is_empty());
    }

    #[test]
    fn test_empty_inputs() {
        let result = analyze_match("", "");
        assert_eq!(result.match_score, 0);
        assert!(result.found_keywords.is_empty());
        assert!(result.missing_keywords.is_empty());
    }

    #[test]
    fn test_dotted_variant_matching() {
        // Job says "NodeJS", resume says "Node.js" — should still match
        let result = analyze_match(
            "Experience with Node.js and React",
            "Looking for NodeJS developer",
        );
        assert!(
            result.found_keywords.iter().any(|k| k == "Node.js"),
            "Node.js should be found when resume has 'Node.js' and job has 'NodeJS'. Found: {:?}, Missing: {:?}",
            result.found_keywords, result.missing_keywords
        );

        // Vice versa: job says "Node.js", resume says "NodeJS"
        let result2 = analyze_match(
            "Experience with NodeJS and React",
            "Looking for Node.js developer",
        );
        assert!(
            result2.found_keywords.iter().any(|k| k == "Node.js"),
            "Node.js should be found when resume has 'NodeJS' and job has 'Node.js'. Found: {:?}, Missing: {:?}",
            result2.found_keywords, result2.missing_keywords
        );
    }

    #[test]
    fn test_custom_config_keyword_is_used() {
        let config = custom_config(&["machine vision", "rust"]);
        let result = analyze_match_with_config(
            "Built machine vision pipelines in Rust",
            "Looking for experience with machine vision and Rust",
            &config,
        );

        assert!(
            result
                .found_keywords
                .iter()
                .any(|keyword| keyword == "Machine Vision"),
            "custom config keyword should be matched"
        );
    }

    #[test]
    fn test_custom_config_still_filters_ambiguous_go() {
        let config = custom_config(&["go", "rust"]);
        let result = analyze_match_with_config(
            "Rust engineer",
            "We need a go-to-market specialist with Rust experience",
            &config,
        );

        let all: Vec<String> = result
            .found_keywords
            .iter()
            .chain(result.missing_keywords.iter())
            .map(|keyword| keyword.to_lowercase())
            .collect();

        assert!(!all.contains(&"go".to_string()));
    }
}
