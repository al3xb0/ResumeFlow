use scraper::{Html, Selector};

pub async fn fetch_page_text(url: &str) -> Result<String, String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("URL must start with http:// or https://".to_string());
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch URL: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let html_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let text = extract_text_from_html(&html_text);

    if text.trim().is_empty() {
        return Err(
            "Could not extract text from the page. The page may require JavaScript to load."
                .to_string(),
        );
    }

    Ok(text)
}

fn extract_text_from_html(html: &str) -> String {
    let document = Html::parse_document(html);

    let remove_selectors = [
        "script", "style", "nav", "header", "footer", "noscript", "svg", "img", "video", "audio",
        "iframe", "form", "button", "input",
    ];

    let main_selectors = [
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

    for sel_str in &main_selectors {
        if let Ok(sel) = Selector::parse(sel_str) {
            if let Some(element) = document.select(&sel).next() {
                let text = collect_text_from_element(&element, &remove_selectors);
                let cleaned = clean_text(&text);
                if cleaned.split_whitespace().count() > 30 {
                    return cleaned;
                }
            }
        }
    }

    if let Ok(body_sel) = Selector::parse("body") {
        if let Some(body) = document.select(&body_sel).next() {
            let text = collect_text_from_element(&body, &remove_selectors);
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
    let re_spaces = regex::Regex::new(r"[ \t]+").unwrap();
    let re_newlines = regex::Regex::new(r"\n{3,}").unwrap();

    let result: String = text
        .lines()
        .map(|line| re_spaces.replace_all(line.trim(), " ").to_string())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    re_newlines.replace_all(&result, "\n\n").trim().to_string()
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
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(fetch_page_text("not-a-url"));
        assert!(result.is_err());
    }
}
