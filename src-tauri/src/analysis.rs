use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;

use regex::Regex;
use unicode_normalization::UnicodeNormalization;

static RE_WHITESPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());
static RE_EMAIL: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[\w.+-]+@[\w-]+\.[\w.]+").unwrap());
static RE_PHONE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"[\+]?[\d\s\-\(\)]{7,}").unwrap());
static RE_LINKEDIN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)linkedin\.com/in/[\w\-]+").unwrap());
static RE_GITHUB: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)github\.com/[\w\-]+").unwrap());
static RE_BULLET: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^[\s]*[•\-\*▪◦‣⁃]\s*").unwrap());

fn normalize(text: &str) -> String {
    let n: String = text.nfkd().collect();
    let lower = n.to_lowercase();
    RE_WHITESPACE.replace_all(&lower, " ").trim().to_string()
}

const TECH_KEYWORDS: &[&str] = &[
    "javascript",
    "typescript",
    "python",
    "rust",
    "go",
    "golang",
    "java",
    "c#",
    "c++",
    "ruby",
    "php",
    "swift",
    "kotlin",
    "scala",
    "elixir",
    "dart",
    "lua",
    "r",
    "solidity",
    "sql",
    "graphql",
    "html",
    "html5",
    "css",
    "css3",
    "sass",
    "less",
    "react",
    "next.js",
    "nextjs",
    "vue",
    "vue.js",
    "nuxt",
    "angular",
    "svelte",
    "remix",
    "gatsby",
    "tailwind",
    "tailwindcss",
    "bootstrap",
    "material ui",
    "chakra ui",
    "shadcn",
    "redux",
    "zustand",
    "mobx",
    "react query",
    "tanstack",
    "webpack",
    "vite",
    "esbuild",
    "rollup",
    "storybook",
    "node.js",
    "nodejs",
    "express",
    "fastapi",
    "flask",
    "django",
    "nestjs",
    "spring",
    "spring boot",
    "rails",
    "laravel",
    "actix",
    "axum",
    "gin",
    "fiber",
    "hono",
    "trpc",
    "rest",
    "restful",
    "grpc",
    "postgresql",
    "postgres",
    "mysql",
    "mariadb",
    "sqlite",
    "mongodb",
    "redis",
    "dynamodb",
    "cassandra",
    "elasticsearch",
    "clickhouse",
    "supabase",
    "firebase",
    "prisma",
    "drizzle",
    "typeorm",
    "sequelize",
    "sqlx",
    "knex",
    "docker",
    "kubernetes",
    "k8s",
    "terraform",
    "ansible",
    "aws",
    "gcp",
    "azure",
    "vercel",
    "netlify",
    "heroku",
    "digitalocean",
    "cloudflare",
    "nginx",
    "caddy",
    "ci/cd",
    "github actions",
    "gitlab ci",
    "jenkins",
    "circleci",
    "git",
    "github",
    "gitlab",
    "bitbucket",
    "jira",
    "confluence",
    "figma",
    "postman",
    "linux",
    "unix",
    "jest",
    "vitest",
    "cypress",
    "playwright",
    "selenium",
    "mocha",
    "pytest",
    "testing library",
    "react testing library",
    "pandas",
    "numpy",
    "pytorch",
    "tensorflow",
    "scikit-learn",
    "kafka",
    "rabbitmq",
    "bullmq",
    "sqs",
    "nats",
    "blockchain",
    "ethereum",
    "solana",
    "web3",
    "smart contracts",
    "ethers.js",
    "hardhat",
    "foundry",
    "react native",
    "flutter",
    "ios",
    "android",
    "swiftui",
    "jetpack compose",
    "microservices",
    "monorepo",
    "websocket",
    "websockets",
    "ssr",
    "ssg",
    "api",
    "oauth",
    "jwt",
    "agile",
    "scrum",
    "kanban",
];

const AMBIGUOUS_LANG: &[&str] = &["go", "r"];

#[derive(Clone, Debug)]
struct Keyword {
    label: String,
    needle: String,
    weight: u32,
}

fn extract_keywords(job_text: &str) -> Vec<Keyword> {
    let norm_job = normalize(job_text);
    let mut seen: HashSet<String> = HashSet::new();
    let mut keywords: Vec<Keyword> = Vec::new();

    for &tech in TECH_KEYWORDS {
        let needle = tech.to_lowercase();
        if !norm_job.contains(&needle) {
            continue;
        }
        if seen.contains(&needle) {
            continue;
        }

        if AMBIGUOUS_LANG.contains(&needle.as_str()) && !is_tech_mention(&needle, &norm_job) {
            continue;
        }

        let pattern = format!(
            r"(?:^|[\s,;|/\(\)\[\]\-•]){}(?:$|[\s,;|/\(\)\[\]\-•.!?:])",
            regex::escape(&needle)
        );
        if let Ok(re) = Regex::new(&pattern) {
            if re.is_match(&norm_job) {
                seen.insert(needle.clone());
                keywords.push(Keyword {
                    label: nice_case(tech),
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

static NICE_CASE_MAP: LazyLock<HashMap<&str, &str>> = LazyLock::new(|| {
    HashMap::from([
        ("javascript", "JavaScript"),
        ("typescript", "TypeScript"),
        ("node.js", "Node.js"),
        ("nodejs", "Node.js"),
        ("next.js", "Next.js"),
        ("nextjs", "Next.js"),
        ("vue.js", "Vue.js"),
        ("react", "React"),
        ("redux", "Redux"),
        ("nestjs", "NestJS"),
        ("fastapi", "FastAPI"),
        ("postgresql", "PostgreSQL"),
        ("postgres", "PostgreSQL"),
        ("mongodb", "MongoDB"),
        ("graphql", "GraphQL"),
        ("rest", "REST"),
        ("restful", "RESTful"),
        ("grpc", "gRPC"),
        ("docker", "Docker"),
        ("kubernetes", "Kubernetes"),
        ("k8s", "Kubernetes"),
        ("aws", "AWS"),
        ("gcp", "GCP"),
        ("azure", "Azure"),
        ("git", "Git"),
        ("github", "GitHub"),
        ("gitlab", "GitLab"),
        ("jira", "Jira"),
        ("linux", "Linux"),
        ("redis", "Redis"),
        ("html5", "HTML5"),
        ("css3", "CSS3"),
        ("html", "HTML"),
        ("css", "CSS"),
        ("sql", "SQL"),
        ("nosql", "NoSQL"),
        ("ci/cd", "CI/CD"),
        ("jwt", "JWT"),
        ("oauth", "OAuth"),
        ("api", "API"),
        ("ssr", "SSR"),
        ("ssg", "SSG"),
        ("bullmq", "BullMQ"),
        ("blockchain", "Blockchain"),
        ("ethereum", "Ethereum"),
        ("web3", "Web3"),
        ("tailwindcss", "Tailwind CSS"),
        ("tailwind", "Tailwind CSS"),
        ("prisma", "Prisma"),
        ("webpack", "Webpack"),
        ("vite", "Vite"),
        ("jest", "Jest"),
        ("vitest", "Vitest"),
        ("cypress", "Cypress"),
        ("playwright", "Playwright"),
        ("figma", "Figma"),
        ("python", "Python"),
        ("rust", "Rust"),
        ("golang", "Go"),
        ("java", "Java"),
        ("ruby", "Ruby"),
        ("php", "PHP"),
        ("go", "Go"),
        ("r", "R"),
        ("c#", "C#"),
        ("c++", "C++"),
        ("swift", "Swift"),
        ("kotlin", "Kotlin"),
        ("flutter", "Flutter"),
        ("react native", "React Native"),
        ("material ui", "Material UI"),
    ])
});

fn nice_case(s: &str) -> String {
    if let Some(&nice) = NICE_CASE_MAP.get(s.to_lowercase().as_str()) {
        return nice.to_string();
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

pub fn analyze_match(resume_text: &str, job_description: &str) -> AnalysisResult {
    let keywords = extract_keywords(job_description);
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

fn keyword_in_text(needle: &str, haystack: &str) -> bool {
    if !haystack.contains(needle) {
        return false;
    }
    if needle.len() <= 3 {
        let pattern = format!(
            r"(?:^|[\s,;|/\(\)\[\]\-•]){}(?:$|[\s,;|/\(\)\[\]\-•.!?:])",
            regex::escape(needle)
        );
        if let Ok(re) = Regex::new(&pattern) {
            return re.is_match(haystack);
        }
    }
    true
}

const EXPECTED_SECTIONS: &[(&str, &[&str])] = &[
    ("contact", &["email", "phone", "linkedin", "github", "@"]),
    (
        "summary",
        &["summary", "about", "objective", "profile", "о себе"],
    ),
    (
        "experience",
        &["experience", "work", "employment", "professional", "опыт"],
    ),
    (
        "education",
        &[
            "education",
            "university",
            "bachelor",
            "master",
            "degree",
            "образование",
        ],
    ),
    (
        "skills",
        &["skills", "technologies", "tech stack", "навыки"],
    ),
];

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
    let mut sections_found: Vec<String> = Vec::new();
    let mut sections_missing: Vec<String> = Vec::new();

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
    if word_count >= 150 {
        score += 15;
        positives.push(format!("{} words — good length", word_count));
    } else if word_count >= 80 {
        score += 8;
        warnings.push(format!("{} words — resume seems short", word_count));
    } else {
        warnings.push(format!(
            "{} words — resume is very short, consider adding more detail",
            word_count
        ));
    }

    for &(section_name, markers) in EXPECTED_SECTIONS {
        let found = markers.iter().any(|m| norm.contains(m));
        if found {
            sections_found.push(section_name.to_string());
            score += 15;
        } else {
            sections_missing.push(section_name.to_string());
        }
    }

    if line_count >= 10 {
        score += 10;
        positives.push("Good line structure".into());
    } else if line_count >= 5 {
        score += 5;
    } else {
        warnings.push("Very few line breaks — text may be poorly parsed".into());
    }

    if RE_EMAIL.is_match(text) {
        score += 5;
        positives.push("Email detected".into());
    } else {
        warnings.push("No email address found".into());
    }

    if RE_PHONE.is_match(text) {
        score += 5;
        positives.push("Phone number detected".into());
    }

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
    if weird_ratio > 0.1 {
        warnings.push("Many unrecognized characters — PDF may be poorly extracted".into());
        score -= 15;
    } else if weird_ratio < 0.01 {
        score += 5;
        positives.push("Clean text extraction".into());
    }

    let single_letter_words = text
        .split_whitespace()
        .filter(|w| w.len() == 1 && w.chars().next().is_some_and(|c| c.is_alphabetic()))
        .count();
    if single_letter_words > 3 {
        warnings.push(format!(
            "{} single-letter fragments detected — text may have extraction artifacts",
            single_letter_words
        ));
        score -= 10;
    }

    // LinkedIn / GitHub profile detection
    if RE_LINKEDIN.is_match(text) {
        score += 3;
        positives.push("LinkedIn profile detected".into());
    }
    if RE_GITHUB.is_match(text) {
        score += 3;
        positives.push("GitHub profile detected".into());
    }

    // Too-long resume warning
    if word_count > 1000 {
        warnings.push(format!(
            "{} words — resume may be too long, consider trimming to 1–2 pages",
            word_count
        ));
        score -= 5;
    }

    // Bullet points usage
    let bullet_lines = text.lines().filter(|l| RE_BULLET.is_match(l)).count();
    if bullet_lines >= 5 {
        score += 5;
        positives.push(format!("{} bullet points — well-structured", bullet_lines));
    } else if word_count >= 150 && bullet_lines == 0 {
        warnings
            .push("No bullet points detected — consider using bullet lists for experience".into());
    }

    // Duplicate line detection
    let mut line_counts: HashMap<String, u32> = HashMap::new();
    for line in text.lines() {
        let trimmed = line.trim().to_lowercase();
        if trimmed.split_whitespace().count() >= 4 {
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
        score -= 5;
    }

    let final_score = score.clamp(0, 100) as u32;

    ReadabilityResult {
        score: final_score,
        word_count,
        sections_found,
        sections_missing,
        warnings,
        positives,
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisResult {
    pub match_score: u32,
    pub found_keywords: Vec<String>,
    pub missing_keywords: Vec<String>,
    pub total_keywords: u32,
}

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

const WEAK_VERBS_EN: &[(&str, &[&str])] = &[
    (
        "worked",
        &["engineered", "developed", "delivered", "executed"],
    ),
    (
        "helped",
        &["facilitated", "enabled", "accelerated", "mentored"],
    ),
    (
        "did",
        &["accomplished", "executed", "achieved", "performed"],
    ),
    ("made", &["built", "designed", "produced", "constructed"]),
    ("used", &["leveraged", "utilized", "employed", "applied"]),
    (
        "handled",
        &["managed", "orchestrated", "directed", "oversaw"],
    ),
    (
        "was responsible for",
        &["led", "owned", "drove", "spearheaded"],
    ),
    ("responsible for", &["led", "owned", "drove", "spearheaded"]),
    (
        "participated",
        &["contributed", "collaborated", "co‑led", "engaged"],
    ),
    (
        "assisted",
        &["supported", "enabled", "facilitated", "guided"],
    ),
    (
        "involved in",
        &["contributed to", "drove", "co‑led", "championed"],
    ),
    ("tried", &["attempted", "pursued", "piloted", "prototyped"]),
    ("got", &["acquired", "obtained", "secured", "attained"]),
    (
        "improved",
        &["optimized", "enhanced", "boosted", "elevated"],
    ),
    (
        "changed",
        &["transformed", "revamped", "restructured", "redesigned"],
    ),
    (
        "showed",
        &["demonstrated", "illustrated", "showcased", "proved"],
    ),
    (
        "gave",
        &["delivered", "presented", "provided", "contributed"],
    ),
    (
        "went",
        &["transitioned", "migrated", "advanced", "progressed"],
    ),
    ("ran", &["managed", "executed", "orchestrated", "operated"]),
    (
        "set up",
        &["established", "configured", "implemented", "architected"],
    ),
    (
        "put together",
        &["assembled", "compiled", "organized", "formulated"],
    ),
    (
        "looked into",
        &["investigated", "researched", "analyzed", "evaluated"],
    ),
    (
        "took care of",
        &["managed", "maintained", "administered", "oversaw"],
    ),
];

const WEAK_VERBS_RU: &[(&str, &[&str])] = &[
    ("делал", &["разработал", "реализовал", "выполнил", "создал"]),
    (
        "работал",
        &["разрабатывал", "внедрял", "проектировал", "реализовывал"],
    ),
    (
        "помогал",
        &["содействовал", "обеспечивал", "консультировал", "наставлял"],
    ),
    (
        "занимался",
        &["руководил", "отвечал за", "координировал", "управлял"],
    ),
    (
        "участвовал",
        &["инициировал", "вносил вклад", "содействовал", "сотрудничал"],
    ),
    (
        "использовал",
        &["применял", "задействовал", "интегрировал", "внедрил"],
    ),
    (
        "отвечал за",
        &["руководил", "управлял", "координировал", "обеспечивал"],
    ),
    (
        "был ответственным",
        &["руководил", "управлял", "контролировал", "координировал"],
    ),
    (
        "пробовал",
        &[
            "тестировал",
            "апробировал",
            "экспериментировал",
            "пилотировал",
        ],
    ),
    (
        "менял",
        &[
            "оптимизировал",
            "трансформировал",
            "модернизировал",
            "реструктурировал",
        ],
    ),
    (
        "показывал",
        &["демонстрировал", "представлял", "презентовал", "доказывал"],
    ),
    (
        "настраивал",
        &[
            "конфигурировал",
            "оптимизировал",
            "автоматизировал",
            "внедрял",
        ],
    ),
    (
        "делала",
        &["разработала", "реализовала", "выполнила", "создала"],
    ),
    (
        "работала",
        &[
            "разрабатывала",
            "внедряла",
            "проектировала",
            "реализовывала",
        ],
    ),
    (
        "помогала",
        &[
            "содействовала",
            "обеспечивала",
            "консультировала",
            "наставляла",
        ],
    ),
];

struct VerbPattern {
    regex: Regex,
    weak_verb: &'static str,
    suggestions: &'static [&'static str],
}

static VERB_PATTERNS: LazyLock<Vec<VerbPattern>> = LazyLock::new(|| {
    WEAK_VERBS_EN
        .iter()
        .chain(WEAK_VERBS_RU.iter())
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

        // These should NOT appear — they are not tech skills
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

        // These SHOULD appear — they are real tech
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
        // When "Go" appears in a tech list, it should be detected
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
    fn test_verb_linter_detects_weak_verbs_en() {
        let text = "I worked on the project.\nI helped the team.\nI implemented the API.";
        let result = lint_action_verbs(text);
        assert_eq!(result.total_issues, 2);
        assert!(result.issues.iter().any(|i| i.weak_verb == "worked"));
        assert!(result.issues.iter().any(|i| i.weak_verb == "helped"));
    }

    #[test]
    fn test_verb_linter_detects_weak_verbs_ru() {
        let text = "Я делал фичи для проекта.\nРазрабатывал API.";
        let result = lint_action_verbs(text);
        assert!(result.total_issues >= 1);
        assert!(result.issues.iter().any(|i| i.weak_verb == "делал"));
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
