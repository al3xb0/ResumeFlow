use std::net::{IpAddr, ToSocketAddrs};
use std::sync::LazyLock;

use scraper::{Html, Selector};
use tracing::debug;

use crate::error::AppError;

static RE_SPACES: LazyLock<regex::Regex> = LazyLock::new(|| regex::Regex::new(r"[ \t]+").unwrap());
static RE_NEWLINES: LazyLock<regex::Regex> =
    LazyLock::new(|| regex::Regex::new(r"\n{3,}").unwrap());

const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
                           (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT_SECS: u64 = 15;
const MAX_REDIRECTS: usize = 3;
const MIN_MAIN_CONTENT_WORDS: usize = 30;

const REMOVE_SELECTORS: &[&str] = &[
    "script", "style", "nav", "header", "footer", "noscript", "svg", "img", "video", "audio",
    "iframe", "form", "button", "input",
];

const MAIN_SELECTORS: &[&str] = &[
    "main",
    "article",
    "[role=\"main\"]",
    ".job-description",
    ".job-details",
    ".posting-body",
    ".description",
    "#job-description",
    "#job-details",
    ".job-content",
    ".vacancy-description",
];

pub async fn fetch_page_text(url: &str) -> Result<String, AppError> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(AppError::InvalidUrl);
    }

    let parsed = reqwest::Url::parse(url).map_err(|_| AppError::InvalidUrl)?;
    ensure_public_host(&parsed)?;

    debug!(
        operation = "fetch_job_url",
        uses_https = url.starts_with("https://"),
        "Fetching job description from URL"
    );

    let redirect_policy = reqwest::redirect::Policy::custom(|attempt| {
        if attempt.previous().len() >= MAX_REDIRECTS {
            return attempt.stop();
        }
        if ensure_public_host(attempt.url()).is_err() {
            return attempt.stop();
        }
        attempt.follow()
    });

    let client = reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(std::time::Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .redirect(redirect_policy)
        .build()
        .map_err(|error| AppError::HttpClient {
            details: error.to_string(),
        })?;

    let response = client.get(url).send().await.map_err(|error| {
        if error.is_timeout() {
            AppError::RequestTimeout
        } else {
            AppError::HttpRequestFailed {
                details: error.to_string(),
            }
        }
    })?;

    if !response.status().is_success() {
        return Err(AppError::HttpStatus {
            status: response.status().as_u16(),
        });
    }

    let html_text = response
        .text()
        .await
        .map_err(|error| AppError::ResponseReadFailed {
            details: error.to_string(),
        })?;

    let text = extract_text_from_html(&html_text);

    if text.trim().is_empty() {
        return Err(AppError::PageTextUnavailable);
    }

    Ok(text)
}

fn ensure_public_host(url: &reqwest::Url) -> Result<(), AppError> {
    let host = url.host_str().ok_or(AppError::BlockedAddress)?;
    let lowered = host.to_ascii_lowercase();
    if lowered == "localhost" || lowered.ends_with(".localhost") || lowered.ends_with(".local") {
        return Err(AppError::BlockedAddress);
    }

    let port = url.port_or_known_default().unwrap_or(80);
    let resolved = (host, port)
        .to_socket_addrs()
        .map_err(|_| AppError::BlockedAddress)?;

    let mut found = false;
    for addr in resolved {
        found = true;
        if is_blocked_ip(&addr.ip()) {
            return Err(AppError::BlockedAddress);
        }
    }

    if found {
        Ok(())
    } else {
        Err(AppError::BlockedAddress)
    }
}

fn is_blocked_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            let octets = v4.octets();
            v4.is_loopback()
                || v4.is_private()
                || v4.is_link_local()
                || v4.is_broadcast()
                || v4.is_unspecified()
                || octets[0] == 0
                // CGNAT shared address space 100.64.0.0/10
                || (octets[0] == 100 && (64..=127).contains(&octets[1]))
        }
        IpAddr::V6(v6) => {
            if let Some(mapped) = v6.to_ipv4_mapped() {
                return is_blocked_ip(&IpAddr::V4(mapped));
            }
            let first = v6.segments()[0];
            v6.is_loopback()
                || v6.is_unspecified()
                // unique local fc00::/7
                || (first & 0xfe00) == 0xfc00
                // link-local fe80::/10
                || (first & 0xffc0) == 0xfe80
        }
    }
}

fn extract_text_from_html(html: &str) -> String {
    let document = Html::parse_document(html);

    for sel_str in MAIN_SELECTORS {
        if let Ok(sel) = Selector::parse(sel_str) {
            if let Some(element) = document.select(&sel).next() {
                let text = collect_text_from_element(&element, REMOVE_SELECTORS);
                let cleaned = clean_text(&text);
                if cleaned.split_whitespace().count() > MIN_MAIN_CONTENT_WORDS {
                    return cleaned;
                }
            }
        }
    }

    if let Ok(body_sel) = Selector::parse("body") {
        if let Some(body) = document.select(&body_sel).next() {
            let text = collect_text_from_element(&body, REMOVE_SELECTORS);
            return clean_text(&text);
        }
    }

    String::new()
}

fn collect_text_from_element(element: &scraper::ElementRef, skip_tags: &[&str]) -> String {
    let mut parts: Vec<String> = Vec::new();

    for node in element.children() {
        match node.value() {
            scraper::node::Node::Text(t) => {
                let text = t.text.trim();
                if !text.is_empty() {
                    parts.push(text.to_string());
                }
            }
            scraper::node::Node::Element(el) => {
                let tag = el.name();
                if skip_tags.contains(&tag) {
                    continue;
                }
                if let Some(child_ref) = scraper::ElementRef::wrap(node) {
                    let child_text = collect_text_from_element(&child_ref, skip_tags);
                    if !child_text.trim().is_empty() {
                        let is_block = matches!(
                            tag,
                            "div"
                                | "p"
                                | "h1"
                                | "h2"
                                | "h3"
                                | "h4"
                                | "h5"
                                | "h6"
                                | "li"
                                | "ul"
                                | "ol"
                                | "br"
                                | "section"
                                | "tr"
                        );
                        if is_block {
                            parts.push(format!("\n{}", child_text));
                        } else {
                            parts.push(child_text);
                        }
                    }
                }
            }
            _ => {}
        }
    }

    parts.join(" ")
}

fn clean_text(text: &str) -> String {
    let result: String = text
        .lines()
        .map(|line| RE_SPACES.replace_all(line.trim(), " ").to_string())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    RE_NEWLINES.replace_all(&result, "\n\n").trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_html_basic() {
        let html = r#"
        <html>
        <head><style>body{color:red}</style><script>alert(1)</script></head>
        <body>
            <nav>Menu items</nav>
            <main>
                <h1>Job Title</h1>
                <p>We are looking for a TypeScript developer.</p>
                <ul>
                    <li>React</li>
                    <li>Node.js</li>
                </ul>
            </main>
            <footer>Copyright 2024</footer>
        </body>
        </html>
        "#;
        let text = extract_text_from_html(html);
        assert!(text.contains("TypeScript"), "Should contain TypeScript");
        assert!(text.contains("React"), "Should contain React");
        assert!(text.contains("Node.js"), "Should contain Node.js");
        assert!(
            !text.contains("Menu items"),
            "Should not contain nav content"
        );
    }

    #[test]
    fn test_invalid_url() {
        let rt = tokio::runtime::Builder::new_current_thread()
            .build()
            .unwrap();
        let result = rt.block_on(fetch_page_text("not-a-url"));
        assert!(result.is_err());
    }

    #[test]
    fn test_blocks_private_ipv4() {
        for ip in [
            "127.0.0.1",
            "10.0.0.5",
            "192.168.1.1",
            "172.16.0.1",
            "169.254.169.254",
            "0.0.0.0",
            "100.64.0.1",
        ] {
            assert!(
                is_blocked_ip(&ip.parse::<IpAddr>().unwrap()),
                "{ip} should be blocked"
            );
        }
    }

    #[test]
    fn test_allows_public_ipv4() {
        for ip in ["8.8.8.8", "1.1.1.1", "93.184.216.34"] {
            assert!(
                !is_blocked_ip(&ip.parse::<IpAddr>().unwrap()),
                "{ip} should be allowed"
            );
        }
    }

    #[test]
    fn test_blocks_private_ipv6() {
        for ip in ["::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1"] {
            assert!(
                is_blocked_ip(&ip.parse::<IpAddr>().unwrap()),
                "{ip} should be blocked"
            );
        }
    }

    #[test]
    fn test_ensure_public_host_blocks_local_targets() {
        for url in ["http://127.0.0.1/x", "http://localhost:8080/", "http://[::1]/"] {
            let parsed = reqwest::Url::parse(url).unwrap();
            assert!(
                matches!(ensure_public_host(&parsed), Err(AppError::BlockedAddress)),
                "{url} should be blocked"
            );
        }
    }
}
