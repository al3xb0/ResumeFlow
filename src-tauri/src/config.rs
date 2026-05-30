use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, LazyLock, RwLock};
use std::time::SystemTime;

use serde::{Deserialize, Serialize};
use tracing::warn;

pub const DEV_ANALYSIS_CONFIG_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/resources/analysis_config.json"
);

const BUNDLED_ANALYSIS_CONFIG: &str = include_str!("../resources/analysis_config.json");

static DEFAULT_ANALYSIS_CONFIG: LazyLock<AnalysisConfig> = LazyLock::new(|| {
    parse_analysis_config(BUNDLED_ANALYSIS_CONFIG, "bundled analysis config")
        .expect("bundled analysis config must stay valid")
});

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisConfig {
    #[serde(default)]
    pub tech_keywords: Vec<String>,
    #[serde(default)]
    pub ambiguous_keywords: Vec<String>,
    #[serde(default)]
    pub expected_sections: Vec<SectionMarkers>,
    #[serde(default)]
    pub nice_case: BTreeMap<String, String>,
    #[serde(default)]
    pub weak_verbs_en: Vec<WeakVerbEntry>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct SectionMarkers {
    pub name: String,
    #[serde(default)]
    pub markers: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WeakVerbEntry {
    pub weak_verb: String,
    #[serde(default)]
    pub suggestions: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisConfigSnapshot {
    pub source: String,
    pub source_path: Option<String>,
    pub tech_keyword_count: usize,
    pub weak_verb_count: usize,
}

#[derive(Clone, Debug)]
pub struct AnalysisConfigStore {
    inner: Arc<RwLock<AnalysisConfigState>>,
}

#[derive(Debug)]
struct AnalysisConfigState {
    current: AnalysisConfig,
    source: ConfigSource,
    override_path: Option<PathBuf>,
    override_signature: Option<FileSignature>,
    development_path: Option<PathBuf>,
    development_signature: Option<FileSignature>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
enum ConfigSource {
    Bundled,
    DevelopmentFile(PathBuf),
    OverrideFile(PathBuf),
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct FileSignature {
    len: u64,
    modified: SystemTime,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("failed to read analysis config from {path}: {source}")]
    ReadFile {
        path: String,
        #[source]
        source: std::io::Error,
    },
    #[error("failed to inspect analysis config at {path}: {source}")]
    InspectFile {
        path: String,
        #[source]
        source: std::io::Error,
    },
    #[error("failed to parse {source_name}: {source}")]
    Parse {
        source_name: &'static str,
        #[source]
        source: serde_json::Error,
    },
    #[error("invalid analysis config: {reason}")]
    Invalid { reason: String },
}

impl AnalysisConfig {
    pub fn bundled() -> &'static Self {
        &DEFAULT_ANALYSIS_CONFIG
    }
}

impl AnalysisConfigStore {
    pub fn new(override_path: Option<PathBuf>) -> Result<Self, ConfigError> {
        let state = AnalysisConfigState::load(override_path)?;
        Ok(Self {
            inner: Arc::new(RwLock::new(state)),
        })
    }

    pub fn snapshot(&self) -> Result<AnalysisConfig, ConfigError> {
        Ok(self.snapshot_with_metadata()?.0)
    }

    pub fn snapshot_with_metadata(
        &self,
    ) -> Result<(AnalysisConfig, AnalysisConfigSnapshot), ConfigError> {
        let mut state = self.inner.write().map_err(|_| ConfigError::Invalid {
            reason: "analysis config state lock was poisoned".into(),
        })?;
        state.reload_if_changed()?;
        Ok((state.current.clone(), state.snapshot()))
    }

    #[cfg_attr(not(test), allow(dead_code))]
    pub fn current_snapshot(&self) -> Result<AnalysisConfigSnapshot, ConfigError> {
        Ok(self.snapshot_with_metadata()?.1)
    }
}

impl AnalysisConfigState {
    fn load(override_path: Option<PathBuf>) -> Result<Self, ConfigError> {
        let development_path = resolve_development_path();
        let override_signature = file_signature(override_path.as_deref())?;
        let development_signature = file_signature(development_path.as_deref())?;
        let (current, source) =
            load_best_available(override_path.as_deref(), development_path.as_deref())?;

        Ok(Self {
            current,
            source,
            override_path,
            override_signature,
            development_path,
            development_signature,
        })
    }

    fn reload_if_changed(&mut self) -> Result<(), ConfigError> {
        let next_override_signature = file_signature(self.override_path.as_deref())?;
        let next_development_signature = file_signature(self.development_path.as_deref())?;

        if next_override_signature == self.override_signature
            && next_development_signature == self.development_signature
        {
            return Ok(());
        }

        let (current, source) = load_best_available(
            self.override_path.as_deref(),
            self.development_path.as_deref(),
        )?;

        self.current = current;
        self.source = source;
        self.override_signature = next_override_signature;
        self.development_signature = next_development_signature;

        Ok(())
    }

    fn snapshot(&self) -> AnalysisConfigSnapshot {
        AnalysisConfigSnapshot {
            source: self.source.label().to_string(),
            source_path: self.source.path().map(|path| path.display().to_string()),
            tech_keyword_count: self.current.tech_keywords.len(),
            weak_verb_count: self.current.weak_verbs_en.len(),
        }
    }
}

impl ConfigSource {
    fn label(&self) -> &'static str {
        match self {
            Self::Bundled => "bundled",
            Self::DevelopmentFile(_) => "development-file",
            Self::OverrideFile(_) => "override-file",
        }
    }

    fn path(&self) -> Option<&Path> {
        match self {
            Self::Bundled => None,
            Self::DevelopmentFile(path) | Self::OverrideFile(path) => Some(path.as_path()),
        }
    }
}

pub fn load_analysis_config(path: &Path) -> Result<AnalysisConfig, ConfigError> {
    let source = fs::read_to_string(path).map_err(|source| ConfigError::ReadFile {
        path: path.display().to_string(),
        source,
    })?;

    parse_analysis_config(&source, "analysis config file")
}

pub fn parse_analysis_config(
    source: &str,
    source_name: &'static str,
) -> Result<AnalysisConfig, ConfigError> {
    let config =
        serde_json::from_str::<AnalysisConfig>(source).map_err(|source| ConfigError::Parse {
            source_name,
            source,
        })?;
    validate_analysis_config(&config)?;
    Ok(config)
}

fn validate_analysis_config(config: &AnalysisConfig) -> Result<(), ConfigError> {
    validate_non_empty_entries("techKeywords", &config.tech_keywords)?;
    validate_non_empty_entries("ambiguousKeywords", &config.ambiguous_keywords)?;

    if config.expected_sections.is_empty() {
        return Err(ConfigError::Invalid {
            reason: "expectedSections must contain at least one section".into(),
        });
    }

    for section in &config.expected_sections {
        if section.name.trim().is_empty() {
            return Err(ConfigError::Invalid {
                reason: "expectedSections entries must have a non-empty name".into(),
            });
        }
        validate_non_empty_entries(
            &format!("expectedSections.{}.markers", section.name),
            &section.markers,
        )?;
    }

    if config.nice_case.is_empty() {
        return Err(ConfigError::Invalid {
            reason: "niceCase must contain at least one mapping".into(),
        });
    }

    for (key, value) in &config.nice_case {
        if key.trim().is_empty() || value.trim().is_empty() {
            return Err(ConfigError::Invalid {
                reason: "niceCase keys and values must be non-empty".into(),
            });
        }
    }

    if config.weak_verbs_en.is_empty() {
        return Err(ConfigError::Invalid {
            reason: "weakVerbsEn must contain at least one verb entry".into(),
        });
    }

    for entry in &config.weak_verbs_en {
        if entry.weak_verb.trim().is_empty() {
            return Err(ConfigError::Invalid {
                reason: "weakVerbsEn entries must have a non-empty weakVerb".into(),
            });
        }
        validate_non_empty_entries(
            &format!("weakVerbsEn.{}.suggestions", entry.weak_verb),
            &entry.suggestions,
        )?;
    }

    Ok(())
}

fn resolve_development_path() -> Option<PathBuf> {
    let path = PathBuf::from(DEV_ANALYSIS_CONFIG_PATH);
    path.exists().then_some(path)
}

fn load_best_available(
    override_path: Option<&Path>,
    development_path: Option<&Path>,
) -> Result<(AnalysisConfig, ConfigSource), ConfigError> {
    if let Some(path) = override_path.filter(|path| path.exists()) {
        match load_analysis_config(path) {
            Ok(config) => return Ok((config, ConfigSource::OverrideFile(path.to_path_buf()))),
            Err(error) => {
                warn!(path = %path.display(), error = %error, "Invalid override analysis config; falling back");
            }
        }
    }

    if let Some(path) = development_path.filter(|path| path.exists()) {
        match load_analysis_config(path) {
            Ok(config) => return Ok((config, ConfigSource::DevelopmentFile(path.to_path_buf()))),
            Err(error) => {
                warn!(path = %path.display(), error = %error, "Invalid development analysis config; falling back to bundled defaults");
            }
        }
    }

    Ok((AnalysisConfig::bundled().clone(), ConfigSource::Bundled))
}

fn file_signature(path: Option<&Path>) -> Result<Option<FileSignature>, ConfigError> {
    let Some(path) = path else {
        return Ok(None);
    };

    if !path.exists() {
        return Ok(None);
    }

    let metadata = fs::metadata(path).map_err(|source| ConfigError::InspectFile {
        path: path.display().to_string(),
        source,
    })?;

    let modified = metadata
        .modified()
        .map_err(|source| ConfigError::InspectFile {
            path: path.display().to_string(),
            source,
        })?;

    Ok(Some(FileSignature {
        len: metadata.len(),
        modified,
    }))
}

fn validate_non_empty_entries(field: &str, values: &[String]) -> Result<(), ConfigError> {
    if values.is_empty() {
        return Err(ConfigError::Invalid {
            reason: format!("{field} must contain at least one entry"),
        });
    }

    if values.iter().any(|value| value.trim().is_empty()) {
        return Err(ConfigError::Invalid {
            reason: format!("{field} cannot contain empty entries"),
        });
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::time::{SystemTime, UNIX_EPOCH};

    use serde_json::json;

    use super::*;

    fn temp_override_path() -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after unix epoch")
            .as_nanos();

        std::env::temp_dir().join(format!("resumeflow-analysis-config-{suffix}.json"))
    }

    fn sample_config_json(tech_keywords: &[&str]) -> String {
        json!({
            "techKeywords": tech_keywords,
            "ambiguousKeywords": ["go"],
            "expectedSections": [{ "name": "skills", "markers": ["skills"] }],
            "niceCase": {
                "rust": "Rust",
                "go": "Go",
                "node.js": "Node.js"
            },
            "weakVerbsEn": [{ "weakVerb": "worked", "suggestions": ["engineered"] }]
        })
        .to_string()
    }

    #[test]
    fn test_bundled_analysis_config_is_valid() {
        let config = AnalysisConfig::bundled();
        assert!(config.tech_keywords.len() > 100);
        assert!(config.nice_case.contains_key("node.js"));
        assert!(config
            .expected_sections
            .iter()
            .any(|section| section.name == "skills"));
    }

    #[test]
    fn test_validation_rejects_empty_keyword() {
        let result = parse_analysis_config(
            r#"{
                "techKeywords": ["rust", ""],
                "ambiguousKeywords": ["go"],
                "expectedSections": [{"name": "skills", "markers": ["skills"]}],
                "niceCase": {"rust": "Rust"},
                "weakVerbsEn": [{"weakVerb": "worked", "suggestions": ["engineered"]}]
            }"#,
            "test config",
        );

        assert!(matches!(
            result,
            Err(ConfigError::Invalid { reason })
                if reason == "techKeywords cannot contain empty entries"
        ));
    }

    #[test]
    fn test_validation_rejects_empty_section_markers() {
        let result = parse_analysis_config(
            r#"{
                "techKeywords": ["rust"],
                "ambiguousKeywords": ["go"],
                "expectedSections": [{"name": "skills", "markers": []}],
                "niceCase": {"rust": "Rust"},
                "weakVerbsEn": [{"weakVerb": "worked", "suggestions": ["engineered"]}]
            }"#,
            "test config",
        );

        assert!(matches!(
            result,
            Err(ConfigError::Invalid { reason })
                if reason == "expectedSections.skills.markers must contain at least one entry"
        ));
    }

    #[test]
    fn test_validation_rejects_empty_weak_verb_suggestions() {
        let result = parse_analysis_config(
            r#"{
                "techKeywords": ["rust"],
                "ambiguousKeywords": ["go"],
                "expectedSections": [{"name": "skills", "markers": ["skills"]}],
                "niceCase": {"rust": "Rust"},
                "weakVerbsEn": [{"weakVerb": "worked", "suggestions": []}]
            }"#,
            "test config",
        );

        assert!(matches!(
            result,
            Err(ConfigError::Invalid { reason })
                if reason == "weakVerbsEn.worked.suggestions must contain at least one entry"
        ));
    }

    #[test]
    fn test_analysis_config_store_reloads_override_changes() {
        let override_path = temp_override_path();
        fs::write(&override_path, sample_config_json(&["rust", "typescript"]))
            .expect("override config should be written");

        let store = AnalysisConfigStore::new(Some(override_path.clone()))
            .expect("store should load override config");

        let initial = store.snapshot().expect("initial snapshot should load");
        assert!(initial
            .tech_keywords
            .iter()
            .any(|keyword| keyword == "typescript"));

        let initial_metadata = store
            .current_snapshot()
            .expect("initial snapshot metadata should load");
        assert_eq!(initial_metadata.source, "override-file");
        assert_eq!(
            initial_metadata.source_path,
            Some(override_path.display().to_string())
        );

        fs::write(
            &override_path,
            sample_config_json(&["rust", "machine vision", "node.js"]),
        )
        .expect("updated override config should be written");

        let reloaded = store
            .snapshot()
            .expect("store should reload override config");
        assert!(reloaded
            .tech_keywords
            .iter()
            .any(|keyword| keyword == "machine vision"));
        assert!(!reloaded
            .tech_keywords
            .iter()
            .any(|keyword| keyword == "typescript"));

        let reloaded_metadata = store
            .current_snapshot()
            .expect("reloaded snapshot metadata should load");
        assert_eq!(reloaded_metadata.tech_keyword_count, reloaded.tech_keywords.len());

        let _ = fs::remove_file(override_path);
    }
}
