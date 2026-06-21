use std::cell::RefCell;
use std::collections::{hash_map::DefaultHasher, BTreeMap, HashMap, HashSet, VecDeque};
use std::hash::{Hash, Hasher};
use std::rc::Rc;
use std::sync::OnceLock;
use std::thread;

use tokio::sync::{mpsc, oneshot};

use base64::{engine::general_purpose::STANDARD, Engine};
use image::{codecs::png::PngEncoder, ColorType, ImageEncoder};
use serde::{Deserialize, Serialize};
use typst::foundations::{Dict, IntoValue, Value};
use typst::layout::PagedDocument;
use typst_as_lib::{
    typst_kit_options::TypstKitFontOptions, TypstEngine, TypstTemplateMainFile,
};

use crate::error::AppError;

const CLASSIC_TEMPLATE_ID: &str = "classic";
const MODERN_TEMPLATE_ID: &str = "modern";
const MINIMAL_TEMPLATE_ID: &str = "minimal";
const PREVIEW_DPI_DEFAULT: u16 = 144;
const PREVIEW_DPI_MIN: u16 = 72;
const PREVIEW_DPI_MAX: u16 = 216;
const DOCUMENT_CACHE_LIMIT: usize = 12;
const PREVIEW_CACHE_LIMIT: usize = 24;
const PDF_CACHE_LIMIT: usize = 12;

struct ResumeTemplateTheme {
    body_color: &'static str,
    link_color: &'static str,
    name_color: &'static str,
    title_color: &'static str,
    contact_color: &'static str,
    divider_color: &'static str,
    section_heading_color: &'static str,
    section_rule_color: &'static str,
    entry_title_color: &'static str,
    detail_color: &'static str,
    meta_color: &'static str,
    header_separator: &'static str,
    skills_delimiter: &'static str,
    languages_delimiter: &'static str,
    body_line_height: f64,
    divider_width_px: f64,
    section_rule_width_px: f64,
}

const CLASSIC_THEME: ResumeTemplateTheme = ResumeTemplateTheme {
    body_color: "#333333",
    link_color: "#2563eb",
    name_color: "#111111",
    title_color: "#555555",
    contact_color: "#666666",
    divider_color: "#222222",
    section_heading_color: "#111111",
    section_rule_color: "#cccccc",
    entry_title_color: "#222222",
    detail_color: "#555555",
    meta_color: "#666666",
    header_separator: " | ",
    skills_delimiter: ", ",
    languages_delimiter: ", ",
    body_line_height: 1.24,
    divider_width_px: 1.2,
    section_rule_width_px: 0.7,
};

const MODERN_THEME: ResumeTemplateTheme = ResumeTemplateTheme {
    body_color: "#374151",
    link_color: "#3b82f6",
    name_color: "#111111",
    title_color: "#3b82f6",
    contact_color: "#6b7280",
    divider_color: "#1e293b",
    section_heading_color: "#1e293b",
    section_rule_color: "#3b82f6",
    entry_title_color: "#111111",
    detail_color: "#3b82f6",
    meta_color: "#6b7280",
    header_separator: " • ",
    skills_delimiter: ", ",
    languages_delimiter: " · ",
    body_line_height: 1.22,
    divider_width_px: 1.5,
    section_rule_width_px: 1.5,
};

const MINIMAL_THEME: ResumeTemplateTheme = ResumeTemplateTheme {
    body_color: "#444444",
    link_color: "#2563eb",
    name_color: "#000000",
    title_color: "#666666",
    contact_color: "#888888",
    divider_color: "#dddddd",
    section_heading_color: "#000000",
    section_rule_color: "#dddddd",
    entry_title_color: "#111111",
    detail_color: "#666666",
    meta_color: "#888888",
    header_separator: " · ",
    skills_delimiter: " · ",
    languages_delimiter: " · ",
    body_line_height: 1.3,
    divider_width_px: 0.8,
    section_rule_width_px: 0.8,
};

const TYPOGRAPHY_FIELD_KEYS: &[&str] = &[
    "personalName",
    "personalTitle",
    "personalContacts",
    "sectionHeading",
    "summary",
    "experienceTitle",
    "experienceSubtitle",
    "experienceMeta",
    "experienceBullet",
    "educationTitle",
    "educationSubtitle",
    "educationMeta",
    "educationDetail",
    "skillsGroupName",
    "skillsItems",
    "languagesItems",
    "certificationTitle",
    "certificationSubtitle",
    "certificationMeta",
    "projectTitle",
    "projectSubtitle",
    "projectDescription",
    "volunteerTitle",
    "volunteerSubtitle",
    "volunteerMeta",
    "volunteerDescription",
    "customTitle",
    "customDescription",
];

thread_local! {
    static THREAD_RENDER_CACHE: RefCell<ThreadRenderCache> = RefCell::new(ThreadRenderCache::new());
}

struct ThreadRenderCache {
    engine: Option<TypstEngine<TypstTemplateMainFile>>,
    documents: HashMap<String, Rc<PagedDocument>>,
    document_order: VecDeque<String>,
    previews: HashMap<String, ResumePreviewRenderResponse>,
    preview_order: VecDeque<String>,
    pdfs: HashMap<String, ResumePdfRenderResponse>,
    pdf_order: VecDeque<String>,
}

impl ThreadRenderCache {
    fn new() -> Self {
        Self {
            engine: None,
            documents: HashMap::new(),
            document_order: VecDeque::new(),
            previews: HashMap::new(),
            preview_order: VecDeque::new(),
            pdfs: HashMap::new(),
            pdf_order: VecDeque::new(),
        }
    }

    fn engine(&mut self) -> &TypstEngine<TypstTemplateMainFile> {
        self.engine.get_or_insert_with(build_typst_engine)
    }

    fn document(&self, key: &str) -> Option<Rc<PagedDocument>> {
        self.documents.get(key).cloned()
    }

    fn preview(&self, key: &str) -> Option<ResumePreviewRenderResponse> {
        self.previews.get(key).cloned()
    }

    fn pdf(&self, key: &str) -> Option<ResumePdfRenderResponse> {
        self.pdfs.get(key).cloned()
    }

    fn remember_document(&mut self, key: String, document: Rc<PagedDocument>) {
        remember_cache_entry(
            &mut self.documents,
            &mut self.document_order,
            key,
            document,
            DOCUMENT_CACHE_LIMIT,
        );
    }

    fn remember_preview(&mut self, key: String, response: ResumePreviewRenderResponse) {
        remember_cache_entry(
            &mut self.previews,
            &mut self.preview_order,
            key,
            response,
            PREVIEW_CACHE_LIMIT,
        );
    }

    fn remember_pdf(&mut self, key: String, response: ResumePdfRenderResponse) {
        remember_cache_entry(
            &mut self.pdfs,
            &mut self.pdf_order,
            key,
            response,
            PDF_CACHE_LIMIT,
        );
    }
}

fn with_thread_render_cache<T>(callback: impl FnOnce(&mut ThreadRenderCache) -> T) -> T {
    THREAD_RENDER_CACHE.with(|cache| callback(&mut cache.borrow_mut()))
}

fn remember_cache_entry<T>(
    cache: &mut HashMap<String, T>,
    order: &mut VecDeque<String>,
    key: String,
    value: T,
    max_entries: usize,
) {
    if !cache.contains_key(&key) {
        order.push_back(key.clone());
    }
    cache.insert(key.clone(), value);

    while order.len() > max_entries {
        if let Some(oldest_key) = order.pop_front() {
            cache.remove(&oldest_key);
        }
    }
}

const CLASSIC_TEMPLATE: &str = r#"
#import sys: inputs

#let data = inputs.data
#let layout = inputs.layout
#let roles = layout.roles
#let fields = layout.fields
#let spacing = layout.fieldSpacing

#set page(
  paper: "us-letter",
  margin: (
    top: layout.marginTopPt * 1pt,
    right: layout.marginRightPt * 1pt,
    bottom: layout.marginBottomPt * 1pt,
    left: layout.marginLeftPt * 1pt,
  ),
)

#set par(
  justify: false,
  leading: layout.bodyLeadingPt * 1pt,
)

#set text(
  font: roles.body.fonts,
  size: roles.body.sizePt * 1pt,
  weight: roles.body.weight,
  style: if roles.body.italic { "italic" } else { "normal" },
  fill: rgb(layout.bodyColor),
)

#show link: set text(fill: rgb(layout.linkColor))

#let styled_text(style, fill, body) = text(
    font: style.fonts,
    size: style.sizePt * 1pt,
    weight: style.weight,
    style: if style.italic { "italic" } else { "normal" },
    fill: rgb(fill),
    body,
)

#let field_block(spacing, body) = [
    #if spacing.marginTopPt > 0 [#v(spacing.marginTopPt * 1pt)]
    #pad(left: spacing.marginLeftPt * 1pt, right: spacing.marginRightPt * 1pt)[
        #box(inset: (
            top: spacing.paddingTopPt * 1pt,
            right: spacing.paddingRightPt * 1pt,
            bottom: spacing.paddingBottomPt * 1pt,
            left: spacing.paddingLeftPt * 1pt,
        ))[#body]
    ]
    #if spacing.marginBottomPt > 0 [#v(spacing.marginBottomPt * 1pt)]
]

#let name(body) = styled_text(fields.personalName, layout.nameColor, body)
#let title_text(body) = styled_text(fields.personalTitle, layout.titleColor, body)
#let contact_text(body) = styled_text(fields.personalContacts, layout.contactColor, body)
#let section_heading(body) = styled_text(fields.sectionHeading, layout.sectionHeadingColor, body)
#let summary_text(body) = styled_text(fields.summary, layout.bodyColor, body)
#let experience_title(body) = styled_text(fields.experienceTitle, layout.entryTitleColor, body)
#let experience_subtitle(body) = styled_text(fields.experienceSubtitle, layout.detailColor, body)
#let experience_meta(body) = styled_text(fields.experienceMeta, layout.metaColor, body)
#let experience_bullet(body) = styled_text(fields.experienceBullet, layout.bodyColor, body)
#let education_title(body) = styled_text(fields.educationTitle, layout.entryTitleColor, body)
#let education_subtitle(body) = styled_text(fields.educationSubtitle, layout.detailColor, body)
#let education_meta(body) = styled_text(fields.educationMeta, layout.metaColor, body)
#let education_detail(body) = styled_text(fields.educationDetail, layout.detailColor, body)
#let skills_group_name(body) = styled_text(fields.skillsGroupName, layout.entryTitleColor, body)
#let skills_items(body) = styled_text(fields.skillsItems, layout.bodyColor, body)
#let languages_items(body) = styled_text(fields.languagesItems, layout.bodyColor, body)
#let certification_title(body) = styled_text(fields.certificationTitle, layout.entryTitleColor, body)
#let certification_subtitle(body) = styled_text(fields.certificationSubtitle, layout.detailColor, body)
#let certification_meta(body) = styled_text(fields.certificationMeta, layout.metaColor, body)
#let project_title(body) = styled_text(fields.projectTitle, layout.entryTitleColor, body)
#let project_subtitle(body) = styled_text(fields.projectSubtitle, layout.detailColor, body)
#let project_description(body) = styled_text(fields.projectDescription, layout.bodyColor, body)
#let volunteer_title(body) = styled_text(fields.volunteerTitle, layout.entryTitleColor, body)
#let volunteer_subtitle(body) = styled_text(fields.volunteerSubtitle, layout.detailColor, body)
#let volunteer_meta(body) = styled_text(fields.volunteerMeta, layout.metaColor, body)
#let volunteer_description(body) = styled_text(fields.volunteerDescription, layout.bodyColor, body)
#let custom_title(body) = styled_text(fields.customTitle, layout.entryTitleColor, body)
#let custom_description(body) = styled_text(fields.customDescription, layout.bodyColor, body)

#let divider() = line(length: 100%, stroke: layout.dividerWidthPt * 1pt + rgb(layout.dividerColor))
#let section_rule() = line(length: 100%, stroke: layout.sectionRuleWidthPt * 1pt + rgb(layout.sectionRuleColor))

#let section_start(title) = [
    #field_block(spacing.sectionHeading, [#section_heading[#title]])
  #section_rule()
]

#if data.showHeader [
  #align(center)[
        #if data.personal.fullName != "" [
            #field_block(spacing.personalName, [#name[#data.personal.fullName]])
        ]
    #if data.personal.title != "" [
            #field_block(spacing.personalTitle, [#title_text[#data.personal.title]])
    ]
    #if data.personal.contacts.len() > 0 [
            #field_block(spacing.personalContacts, [
                #for (index, contact) in data.personal.contacts.enumerate() [
                    #if index > 0 [#contact_text[#layout.headerSeparator]]
                    #if contact.url == none or contact.url == "" [
                        #contact_text[#contact.value]
                    ] else [
                        #link(contact.url)[#contact_text[#contact.value]]
                    ]
                ]
            ])
    ]
  ]
  #divider()
  #v(10pt)
]

#for section in data.orderedSections [
  #if section.id == "summary" and data.summary != "" [
    #section_start(section.title)
        #field_block(spacing.summary, [#summary_text[#data.summary]])
  ] else if section.id == "experience" and data.experience.len() > 0 [
    #section_start(section.title)
    #for (index, entry) in data.experience.enumerate() [
      #grid(
        columns: (1fr, auto),
        column-gutter: 12pt,
                [#field_block(spacing.experienceTitle, [#experience_title[#entry.title]])],
                [#field_block(spacing.experienceMeta, [#experience_meta[#entry.meta]])],
      )
            #if entry.subtitle != "" [
                #field_block(spacing.experienceSubtitle, [#experience_subtitle[#entry.subtitle]])
            ]
      #if entry.bullets.len() > 0 [
        #for bullet in entry.bullets [
                    - #field_block(spacing.experienceBullet, [#experience_bullet[#bullet]])
        ]
      ]
      #if index < data.experience.len() - 1 [#v(8pt)]
    ]
    #v(6pt)
  ] else if section.id == "education" and data.education.len() > 0 [
    #section_start(section.title)
    #for (index, entry) in data.education.enumerate() [
      #grid(
        columns: (1fr, auto),
        column-gutter: 12pt,
                [#field_block(spacing.educationTitle, [#education_title[#entry.title]])],
                [#field_block(spacing.educationMeta, [#education_meta[#entry.meta]])],
      )
            #if entry.subtitle != "" [
                #field_block(spacing.educationSubtitle, [#education_subtitle[#entry.subtitle]])
            ]
            #if entry.detail != "" [
                #field_block(spacing.educationDetail, [#education_detail[#entry.detail]])
            ]
      #if index < data.education.len() - 1 [#v(8pt)]
    ]
    #v(6pt)
  ] else if section.id == "skills" and data.skills.len() > 0 [
    #section_start(section.title)
    #for (index, group) in data.skills.enumerate() [
            #if group.name != "" [
                #field_block(spacing.skillsGroupName, [#skills_group_name[#group.name]])
            ]
      #if group.items.len() > 0 [
                #field_block(spacing.skillsItems, [#skills_items[#group.items.join(layout.skillsDelimiter)]])
      ]
      #if index < data.skills.len() - 1 [#v(7pt)]
    ]
    #v(6pt)
  ] else if section.id == "languages" and data.languages.len() > 0 [
    #section_start(section.title)
        #field_block(spacing.languagesItems, [#languages_items[#data.languages.join(layout.languagesDelimiter)]])
  ] else if section.id == "certifications" and data.certifications.len() > 0 [
    #section_start(section.title)
    #for (index, entry) in data.certifications.enumerate() [
      #grid(
        columns: (1fr, auto),
        column-gutter: 12pt,
        [
          #if entry.url == none or entry.url == "" [
                        #field_block(spacing.certificationTitle, [#certification_title[#entry.title]])
          ] else [
                        #field_block(spacing.certificationTitle, [#link(entry.url)[#certification_title[#entry.title]]])
          ]
        ],
                [#field_block(spacing.certificationMeta, [#certification_meta[#entry.meta]])],
      )
            #if entry.subtitle != "" [
                #field_block(spacing.certificationSubtitle, [#certification_subtitle[#entry.subtitle]])
            ]
      #if index < data.certifications.len() - 1 [#v(8pt)]
    ]
    #v(6pt)
  ] else if section.id == "projects" and data.projects.len() > 0 [
    #section_start(section.title)
    #for (index, entry) in data.projects.enumerate() [
      #if entry.url == none or entry.url == "" [
                #field_block(spacing.projectTitle, [#project_title[#entry.title]])
      ] else [
                #field_block(spacing.projectTitle, [#link(entry.url)[#project_title[#entry.title]]])
      ]
            #if entry.subtitle != "" [
                #field_block(spacing.projectSubtitle, [#project_subtitle[#entry.subtitle]])
            ]
      #if entry.description != "" [
                #field_block(spacing.projectDescription, [#project_description[#entry.description]])
      ]
      #if index < data.projects.len() - 1 [#v(8pt)]
    ]
    #v(6pt)
  ] else if section.id == "volunteer" and data.volunteer.len() > 0 [
    #section_start(section.title)
    #for (index, entry) in data.volunteer.enumerate() [
      #grid(
        columns: (1fr, auto),
        column-gutter: 12pt,
                [#field_block(spacing.volunteerTitle, [#volunteer_title[#entry.title]])],
                [#field_block(spacing.volunteerMeta, [#volunteer_meta[#entry.meta]])],
      )
            #if entry.subtitle != "" [
                #field_block(spacing.volunteerSubtitle, [#volunteer_subtitle[#entry.subtitle]])
            ]
      #if entry.description != "" [
                #field_block(spacing.volunteerDescription, [#volunteer_description[#entry.description]])
      ]
      #if index < data.volunteer.len() - 1 [#v(8pt)]
    ]
    #v(6pt)
  ] else [
    #let custom = data.customSections.at(section.id, default: none)
    #if custom != none and custom.entries.len() > 0 [
      #section_start(section.title)
      #for (index, entry) in custom.entries.enumerate() [
                #if entry.title != "" [
                    #field_block(spacing.customTitle, [#custom_title[#entry.title]])
                ]
        #if entry.description != "" [
                    #field_block(spacing.customDescription, [#custom_description[#entry.description]])
        ]
        #if index < custom.entries.len() - 1 [#v(8pt)]
      ]
      #v(6pt)
    ]
  ]
]
"#;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderLabels {
    pub present: String,
    pub gpa: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonalLink {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub url: String,
    pub label: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumePersonalInfo {
    pub full_name: String,
    pub title: String,
    pub email: String,
    pub phone: String,
    pub location: String,
    pub links: Vec<PersonalLink>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExperienceEntry {
    pub id: String,
    pub company: String,
    pub position: String,
    pub location: String,
    pub start_date: String,
    pub end_date: String,
    pub current: bool,
    pub bullets: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EducationEntry {
    pub id: String,
    pub institution: String,
    pub degree: String,
    pub field: String,
    pub start_date: String,
    pub end_date: String,
    pub gpa: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LanguageEntry {
    pub id: String,
    pub language: String,
    pub proficiency: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillGroup {
    pub id: String,
    pub name: String,
    pub items: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CertificationEntry {
    pub id: String,
    pub name: String,
    pub issuer: String,
    pub date: String,
    pub url: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectEntry {
    pub id: String,
    pub name: String,
    pub description: String,
    pub technologies: String,
    pub url: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VolunteerEntry {
    pub id: String,
    pub organization: String,
    pub role: String,
    pub start_date: String,
    pub end_date: String,
    pub description: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomSectionEntry {
    pub id: String,
    pub title: String,
    pub description: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumeSection {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub title: String,
    pub visible: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumeData {
    pub personal: ResumePersonalInfo,
    pub summary: String,
    pub experience: Vec<ExperienceEntry>,
    pub education: Vec<EducationEntry>,
    pub skills: Vec<SkillGroup>,
    pub languages: Vec<LanguageEntry>,
    pub certifications: Vec<CertificationEntry>,
    pub projects: Vec<ProjectEntry>,
    pub volunteer: Vec<VolunteerEntry>,
    pub sections: Vec<ResumeSection>,
    pub custom_sections: BTreeMap<String, Vec<CustomSectionEntry>>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedTypographyRoleSettings {
    pub font_family: String,
    pub font_size_px: f64,
    pub font_weight: i64,
    pub font_style: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedFieldSpacingSettings {
    pub margin_top_px: f64,
    pub margin_right_px: f64,
    pub margin_bottom_px: f64,
    pub margin_left_px: f64,
    pub padding_top_px: f64,
    pub padding_right_px: f64,
    pub padding_bottom_px: f64,
    pub padding_left_px: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedLayoutTypographySettings {
    pub name: ResolvedTypographyRoleSettings,
    pub title: ResolvedTypographyRoleSettings,
    pub contacts: ResolvedTypographyRoleSettings,
    pub section_heading: ResolvedTypographyRoleSettings,
    pub entry_title: ResolvedTypographyRoleSettings,
    pub body: ResolvedTypographyRoleSettings,
    pub meta: ResolvedTypographyRoleSettings,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedLayoutSettings {
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
    pub left: f64,
    pub typography: ResolvedLayoutTypographySettings,
    pub field_typography: BTreeMap<String, ResolvedTypographyRoleSettings>,
    pub field_spacing: BTreeMap<String, ResolvedFieldSpacingSettings>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumeRenderRequest {
    pub resume: ResumeData,
    pub visible_ids: Vec<String>,
    pub labels: RenderLabels,
    pub template: String,
    pub layout_settings: serde_json::Value,
    pub resolved_layout_settings: ResolvedLayoutSettings,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumePreviewRenderRequest {
    #[serde(flatten)]
    pub render_request: ResumeRenderRequest,
    pub dpi: Option<u16>,
    pub page_indices: Option<Vec<usize>>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumePreviewPage {
    pub page_index: usize,
    pub base64_png: String,
    pub width_px: u32,
    pub height_px: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumePreviewRenderResponse {
    pub pages: Vec<ResumePreviewPage>,
    pub total_pages: usize,
    pub cache_key: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumePdfRenderRequest {
    #[serde(flatten)]
    pub render_request: ResumeRenderRequest,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumePdfRenderResponse {
    pub base64_pdf: String,
    pub file_name: String,
    pub cache_key: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstContactItem {
    value: String,
    url: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstOrderedSection {
    id: String,
    title: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstExperienceItem {
    title: String,
    subtitle: String,
    meta: String,
    bullets: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstEducationItem {
    title: String,
    subtitle: String,
    meta: String,
    detail: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstSkillGroup {
    name: String,
    items: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstCertificationItem {
    title: String,
    subtitle: String,
    meta: String,
    url: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstProjectItem {
    title: String,
    subtitle: String,
    description: String,
    url: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstVolunteerItem {
    title: String,
    subtitle: String,
    meta: String,
    description: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstCustomEntry {
    title: String,
    description: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstCustomSection {
    entries: Vec<TypstCustomEntry>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstPersonalData {
    full_name: String,
    title: String,
    contacts: Vec<TypstContactItem>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstRenderData {
    show_header: bool,
    personal: TypstPersonalData,
    summary: String,
    experience: Vec<TypstExperienceItem>,
    education: Vec<TypstEducationItem>,
    skills: Vec<TypstSkillGroup>,
    languages: Vec<String>,
    certifications: Vec<TypstCertificationItem>,
    projects: Vec<TypstProjectItem>,
    volunteer: Vec<TypstVolunteerItem>,
    custom_sections: BTreeMap<String, TypstCustomSection>,
    ordered_sections: Vec<TypstOrderedSection>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstRoleLayout {
    fonts: Vec<String>,
    size_pt: f64,
    weight: i64,
    italic: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstFieldSpacing {
    margin_top_pt: f64,
    margin_right_pt: f64,
    margin_bottom_pt: f64,
    margin_left_pt: f64,
    padding_top_pt: f64,
    padding_right_pt: f64,
    padding_bottom_pt: f64,
    padding_left_pt: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstRoleLayouts {
    name: TypstRoleLayout,
    title: TypstRoleLayout,
    contacts: TypstRoleLayout,
    section_heading: TypstRoleLayout,
    entry_title: TypstRoleLayout,
    body: TypstRoleLayout,
    meta: TypstRoleLayout,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypstLayoutData {
    margin_top_pt: f64,
    margin_right_pt: f64,
    margin_bottom_pt: f64,
    margin_left_pt: f64,
    body_leading_pt: f64,
    body_color: &'static str,
    link_color: &'static str,
    name_color: &'static str,
    title_color: &'static str,
    contact_color: &'static str,
    divider_color: &'static str,
    divider_width_pt: f64,
    section_heading_color: &'static str,
    section_rule_color: &'static str,
    section_rule_width_pt: f64,
    entry_title_color: &'static str,
    detail_color: &'static str,
    meta_color: &'static str,
    header_separator: &'static str,
    skills_delimiter: &'static str,
    languages_delimiter: &'static str,
    roles: TypstRoleLayouts,
    fields: BTreeMap<String, TypstRoleLayout>,
    field_spacing: BTreeMap<String, TypstFieldSpacing>,
}

enum RenderJob {
    Preview {
        request: ResumePreviewRenderRequest,
        respond: oneshot::Sender<Result<ResumePreviewRenderResponse, AppError>>,
    },
    Pdf {
        request: ResumePdfRenderRequest,
        respond: oneshot::Sender<Result<ResumePdfRenderResponse, AppError>>,
    },
}

static RENDER_WORKER: OnceLock<mpsc::UnboundedSender<RenderJob>> = OnceLock::new();

// Typst rendering relies on a thread-local cache holding non-Send state (the
// engine and Rc<PagedDocument>). Pinning every job to one dedicated worker
// thread keeps that cache hot while freeing the Tauri main thread, so the UI
// never blocks on multi-page PDF export. Only Send request/response values
// cross the channel; the non-Send cache stays on the worker thread.
fn render_worker() -> &'static mpsc::UnboundedSender<RenderJob> {
    RENDER_WORKER.get_or_init(|| {
        let (sender, mut receiver) = mpsc::unbounded_channel::<RenderJob>();
        thread::Builder::new()
            .name("resume-render".to_string())
            .spawn(move || {
                while let Some(job) = receiver.blocking_recv() {
                    match job {
                        RenderJob::Preview { request, respond } => {
                            let _ = respond.send(render_resume_preview_blocking(request));
                        }
                        RenderJob::Pdf { request, respond } => {
                            let _ = respond.send(export_resume_pdf_blocking(request));
                        }
                    }
                }
            })
            .expect("failed to spawn resume render worker thread");
        sender
    })
}

fn worker_unavailable() -> AppError {
    AppError::ResumeRender {
        details: "Render worker thread is unavailable".to_string(),
    }
}

pub async fn render_resume_preview(
    request: ResumePreviewRenderRequest,
) -> Result<ResumePreviewRenderResponse, AppError> {
    let (respond, response) = oneshot::channel();
    render_worker()
        .send(RenderJob::Preview { request, respond })
        .map_err(|_| worker_unavailable())?;
    response.await.map_err(|_| worker_unavailable())?
}

pub async fn export_resume_pdf(
    request: ResumePdfRenderRequest,
) -> Result<ResumePdfRenderResponse, AppError> {
    let (respond, response) = oneshot::channel();
    render_worker()
        .send(RenderJob::Pdf { request, respond })
        .map_err(|_| worker_unavailable())?;
    response.await.map_err(|_| worker_unavailable())?
}

fn render_resume_preview_blocking(
    request: ResumePreviewRenderRequest,
) -> Result<ResumePreviewRenderResponse, AppError> {
    let preview_cache_key = build_preview_cache_key(&request)?;
    if let Some(response) = with_thread_render_cache(|cache| cache.preview(&preview_cache_key)) {
        return Ok(response);
    }

    let document_cache_key = build_render_request_cache_key(&request.render_request)?;
    let document = compile_document(&request.render_request, &document_cache_key)?;
    let total_pages = document.pages.len();
    let page_indices = resolve_page_indices(total_pages, request.page_indices);
    let pixel_per_pt = f32::from(clamp_dpi(request.dpi)) / 72.0;

    let mut pages = Vec::with_capacity(page_indices.len());
    for page_index in page_indices {
        let page = document.pages.get(page_index).ok_or_else(|| AppError::ResumeRender {
            details: format!("Preview page index {page_index} is out of bounds"),
        })?;
        let pixmap = typst_render::render(page, pixel_per_pt);
        let width_px = pixmap.width();
        let height_px = pixmap.height();
        let png_bytes = encode_rgba_png(pixmap.width(), pixmap.height(), pixmap.data())?;
        pages.push(ResumePreviewPage {
            page_index,
            base64_png: STANDARD.encode(png_bytes),
            width_px,
            height_px,
        });
    }

    let response = ResumePreviewRenderResponse {
        pages,
        total_pages,
        cache_key: Some(preview_cache_key.clone()),
    };

    with_thread_render_cache(|cache| cache.remember_preview(preview_cache_key, response.clone()));

    Ok(response)
}

fn export_resume_pdf_blocking(
    request: ResumePdfRenderRequest,
) -> Result<ResumePdfRenderResponse, AppError> {
    let document_cache_key = build_render_request_cache_key(&request.render_request)?;
    let pdf_cache_key = format!("pdf:{document_cache_key}");
    if let Some(response) = with_thread_render_cache(|cache| cache.pdf(&pdf_cache_key)) {
        return Ok(response);
    }

    let document = compile_document(&request.render_request, &document_cache_key)?;
    let pdf_bytes = typst_pdf::pdf(&document, &typst_pdf::PdfOptions::default()).map_err(
        |error| AppError::ResumeRender {
            details: format!("PDF export failed: {error:?}"),
        },
    )?;

    let response = ResumePdfRenderResponse {
        base64_pdf: STANDARD.encode(pdf_bytes),
        file_name: build_pdf_file_name(&request.render_request.resume.personal.full_name),
        cache_key: Some(pdf_cache_key.clone()),
    };

    with_thread_render_cache(|cache| cache.remember_pdf(pdf_cache_key, response.clone()));

    Ok(response)
}

fn compile_document(
    request: &ResumeRenderRequest,
    document_cache_key: &str,
) -> Result<Rc<PagedDocument>, AppError> {
    if let Some(document) = with_thread_render_cache(|cache| cache.document(document_cache_key)) {
        return Ok(document);
    }

    ensure_supported_template(&request.template)?;

    let inputs = build_typst_inputs(request)?;
    let compiled = with_thread_render_cache(|cache| cache.engine().compile_with_input(inputs));
    let document = compiled.output.map_err(|error| AppError::ResumeRender {
        details: format!("Typst compilation failed: {error:?}"),
    })?;

    let document = Rc::new(document);
    with_thread_render_cache(|cache| {
        cache.remember_document(document_cache_key.to_string(), Rc::clone(&document))
    });

    Ok(document)
}

fn ensure_supported_template(template: &str) -> Result<(), AppError> {
    get_template_theme(template)
        .map(|_| ())
        .ok_or_else(|| AppError::UnsupportedResumeTemplate {
            template: template.to_string(),
        })
}

fn build_typst_inputs(request: &ResumeRenderRequest) -> Result<Dict, AppError> {
    let data = build_render_data(request);
    let layout = build_layout_data(&request.resolved_layout_settings, &request.template)?;

    let payload = serde_json::json!({
        "data": data,
        "layout": layout,
    });

    match json_to_typst_value(payload) {
        Value::Dict(dict) => Ok(dict),
        _ => Err(AppError::ResumeRender {
            details: "Typst input payload did not serialize to a dictionary".to_string(),
        }),
    }
}

fn build_render_data(request: &ResumeRenderRequest) -> TypstRenderData {
    let resume = &request.resume;
    let section_titles = build_section_title_map(&resume.sections);
    let show_header = request.visible_ids.iter().any(|id| id == "personal") && has_personal_content(&resume.personal);
    let summary = trim_text(&resume.summary);
    let experience = build_experience_items(&resume.experience, &request.labels.present);
    let education = build_education_items(&resume.education, &request.labels.present, &request.labels.gpa);
    let skills = build_skill_groups(&resume.skills);
    let languages = build_language_items(&resume.languages);
    let certifications = build_certification_items(&resume.certifications);
    let projects = build_project_items(&resume.projects);
    let volunteer = build_volunteer_items(&resume.volunteer, &request.labels.present);
    let custom_sections = build_custom_sections(&resume.custom_sections);

    let mut ordered_sections = Vec::new();
    for section_id in &request.visible_ids {
        if section_id == "personal" {
            continue;
        }

        let should_render = match section_id.as_str() {
            "summary" => has_text(&summary),
            "experience" => !experience.is_empty(),
            "education" => !education.is_empty(),
            "skills" => !skills.is_empty(),
            "languages" => !languages.is_empty(),
            "certifications" => !certifications.is_empty(),
            "projects" => !projects.is_empty(),
            "volunteer" => !volunteer.is_empty(),
            custom_id => custom_sections
                .get(custom_id)
                .is_some_and(|section| !section.entries.is_empty()),
        };

        if should_render {
            ordered_sections.push(TypstOrderedSection {
                id: section_id.clone(),
                title: section_titles
                    .get(section_id)
                    .cloned()
                    .unwrap_or_else(|| default_section_title(section_id)),
            });
        }
    }

    TypstRenderData {
        show_header,
        personal: TypstPersonalData {
            full_name: trim_text(&resume.personal.full_name),
            title: trim_text(&resume.personal.title),
            contacts: build_contact_items(&resume.personal),
        },
        summary,
        experience,
        education,
        skills,
        languages,
        certifications,
        projects,
        volunteer,
        custom_sections,
        ordered_sections,
    }
}

fn build_layout_data(
    layout: &ResolvedLayoutSettings,
    template: &str,
) -> Result<TypstLayoutData, AppError> {
    let theme = get_template_theme(template).ok_or_else(|| AppError::UnsupportedResumeTemplate {
        template: template.to_string(),
    })?;
    let body = build_role_layout(&layout.typography.body);
    Ok(TypstLayoutData {
        margin_top_pt: px_to_pt(layout.top),
        margin_right_pt: px_to_pt(layout.right),
        margin_bottom_pt: px_to_pt(layout.bottom),
        margin_left_pt: px_to_pt(layout.left),
        body_leading_pt: body.size_pt * (theme.body_line_height - 1.0),
        body_color: theme.body_color,
        link_color: theme.link_color,
        name_color: theme.name_color,
        title_color: theme.title_color,
        contact_color: theme.contact_color,
        divider_color: theme.divider_color,
        divider_width_pt: px_to_pt(theme.divider_width_px),
        section_heading_color: theme.section_heading_color,
        section_rule_color: theme.section_rule_color,
        section_rule_width_pt: px_to_pt(theme.section_rule_width_px),
        entry_title_color: theme.entry_title_color,
        detail_color: theme.detail_color,
        meta_color: theme.meta_color,
        header_separator: theme.header_separator,
        skills_delimiter: theme.skills_delimiter,
        languages_delimiter: theme.languages_delimiter,
        roles: TypstRoleLayouts {
            name: build_role_layout(&layout.typography.name),
            title: build_role_layout(&layout.typography.title),
            contacts: build_role_layout(&layout.typography.contacts),
            section_heading: build_role_layout(&layout.typography.section_heading),
            entry_title: build_role_layout(&layout.typography.entry_title),
            body,
            meta: build_role_layout(&layout.typography.meta),
        },
        fields: build_field_layouts(&layout.field_typography)?,
        field_spacing: build_field_spacing(&layout.field_spacing)?,
    })
}

fn build_typst_engine() -> TypstEngine<TypstTemplateMainFile> {
    TypstEngine::builder()
        .main_file(CLASSIC_TEMPLATE)
        .search_fonts_with(TypstKitFontOptions::default())
        .build()
}

fn get_template_theme(template: &str) -> Option<&'static ResumeTemplateTheme> {
    match template {
        CLASSIC_TEMPLATE_ID => Some(&CLASSIC_THEME),
        MODERN_TEMPLATE_ID => Some(&MODERN_THEME),
        MINIMAL_TEMPLATE_ID => Some(&MINIMAL_THEME),
        _ => None,
    }
}

fn build_role_layout(role: &ResolvedTypographyRoleSettings) -> TypstRoleLayout {
    TypstRoleLayout {
        fonts: build_font_fallbacks(&role.font_family),
        size_pt: px_to_pt(role.font_size_px),
        weight: role.font_weight,
        italic: role.font_style == "italic",
    }
}

fn build_field_layouts(
    field_typography: &BTreeMap<String, ResolvedTypographyRoleSettings>,
) -> Result<BTreeMap<String, TypstRoleLayout>, AppError> {
    let mut fields = BTreeMap::new();

    for field in TYPOGRAPHY_FIELD_KEYS {
        let settings = field_typography
            .get(*field)
            .ok_or_else(|| AppError::ResumeRender {
                details: format!("Missing resolved field typography for '{field}'"),
            })?;
        fields.insert((*field).to_string(), build_role_layout(settings));
    }

    Ok(fields)
}

fn build_field_spacing(
    field_spacing: &BTreeMap<String, ResolvedFieldSpacingSettings>,
) -> Result<BTreeMap<String, TypstFieldSpacing>, AppError> {
    let mut spacing = BTreeMap::new();

    for field in TYPOGRAPHY_FIELD_KEYS {
        let settings = field_spacing.get(*field).ok_or_else(|| AppError::ResumeRender {
            details: format!("Missing resolved field spacing for '{field}'"),
        })?;
        spacing.insert(
            (*field).to_string(),
            TypstFieldSpacing {
                margin_top_pt: px_to_pt(settings.margin_top_px),
                margin_right_pt: px_to_pt(settings.margin_right_px),
                margin_bottom_pt: px_to_pt(settings.margin_bottom_px),
                margin_left_pt: px_to_pt(settings.margin_left_px),
                padding_top_pt: px_to_pt(settings.padding_top_px),
                padding_right_pt: px_to_pt(settings.padding_right_px),
                padding_bottom_pt: px_to_pt(settings.padding_bottom_px),
                padding_left_pt: px_to_pt(settings.padding_left_px),
            },
        );
    }

    Ok(spacing)
}

fn build_contact_items(personal: &ResumePersonalInfo) -> Vec<TypstContactItem> {
    let mut contacts = Vec::new();

    if let Some(email) = trim_to_option(&personal.email) {
        contacts.push(TypstContactItem {
            url: Some(format!("mailto:{email}")),
            value: email,
        });
    }

    if let Some(phone) = trim_to_option(&personal.phone) {
        let digits = phone.chars().filter(|ch| !ch.is_whitespace()).collect::<String>();
        contacts.push(TypstContactItem {
            url: Some(format!("tel:{digits}")),
            value: phone,
        });
    }

    if let Some(location) = trim_to_option(&personal.location) {
        contacts.push(TypstContactItem {
            url: None,
            value: location,
        });
    }

    for link in &personal.links {
        let value = trim_to_option(&link.label).or_else(|| trim_to_option(&link.url));
        if let Some(value) = value {
            contacts.push(TypstContactItem {
                url: normalize_url(&link.url),
                value,
            });
        }
    }

    contacts
}

fn build_experience_items(entries: &[ExperienceEntry], present_label: &str) -> Vec<TypstExperienceItem> {
    entries
        .iter()
        .filter_map(|entry| {
            let title = choose_primary_title(&entry.position, &entry.company)?;
            let subtitle = build_subtitle(match has_text(&entry.position) {
                true => vec![trim_to_option(&entry.company), trim_to_option(&entry.location)],
                false => vec![trim_to_option(&entry.location)],
            });
            let bullets = entry
                .bullets
                .iter()
                .map(|bullet| trim_text(bullet))
                .filter(|bullet| !bullet.is_empty())
                .collect::<Vec<_>>();

            Some(TypstExperienceItem {
                title,
                subtitle,
                meta: format_date_range(&entry.start_date, &entry.end_date, entry.current, present_label),
                bullets,
            })
        })
        .collect()
}

fn build_education_items(
    entries: &[EducationEntry],
    present_label: &str,
    gpa_label: &str,
) -> Vec<TypstEducationItem> {
    entries
        .iter()
        .filter_map(|entry| {
            let title = build_education_title(entry)?;
            let subtitle = trim_text(&entry.institution);
            let detail = trim_to_option(&entry.gpa)
                .map(|gpa| format!("{gpa_label}: {gpa}"))
                .unwrap_or_default();

            Some(TypstEducationItem {
                title,
                subtitle,
                meta: format_date_range(&entry.start_date, &entry.end_date, false, present_label),
                detail,
            })
        })
        .collect()
}

fn build_skill_groups(groups: &[SkillGroup]) -> Vec<TypstSkillGroup> {
    groups
        .iter()
        .filter_map(|group| {
            let items = group
                .items
                .iter()
                .map(|item| trim_text(item))
                .filter(|item| !item.is_empty())
                .collect::<Vec<_>>();
            let name = trim_text(&group.name);
            if name.is_empty() && items.is_empty() {
                None
            } else {
                Some(TypstSkillGroup { name, items })
            }
        })
        .collect()
}

fn build_language_items(entries: &[LanguageEntry]) -> Vec<String> {
    entries
        .iter()
        .filter_map(|entry| {
            let language = trim_to_option(&entry.language)?;
            let proficiency = trim_to_option(&entry.proficiency);
            Some(match proficiency {
                Some(proficiency) => format!("{language} ({proficiency})"),
                None => language,
            })
        })
        .collect()
}

fn build_certification_items(entries: &[CertificationEntry]) -> Vec<TypstCertificationItem> {
    entries
        .iter()
        .filter_map(|entry| {
            let title = trim_to_option(&entry.name)?;
            Some(TypstCertificationItem {
                title,
                subtitle: trim_text(&entry.issuer),
                meta: trim_text(&entry.date),
                url: normalize_url(&entry.url),
            })
        })
        .collect()
}

fn build_project_items(entries: &[ProjectEntry]) -> Vec<TypstProjectItem> {
    entries
        .iter()
        .filter_map(|entry| {
            let title = trim_to_option(&entry.name)?;
            let subtitle = trim_text(&entry.technologies);
            let description = trim_text(&entry.description);
            if title.is_empty() && subtitle.is_empty() && description.is_empty() {
                None
            } else {
                Some(TypstProjectItem {
                    title,
                    subtitle,
                    description,
                    url: normalize_url(&entry.url),
                })
            }
        })
        .collect()
}

fn build_volunteer_items(entries: &[VolunteerEntry], present_label: &str) -> Vec<TypstVolunteerItem> {
    entries
        .iter()
        .filter_map(|entry| {
            let title = choose_primary_title(&entry.role, &entry.organization)?;
            let subtitle = if has_text(&entry.role) {
                trim_text(&entry.organization)
            } else {
                String::new()
            };
            let description = trim_text(&entry.description);
            Some(TypstVolunteerItem {
                title,
                subtitle,
                meta: format_date_range(&entry.start_date, &entry.end_date, false, present_label),
                description,
            })
        })
        .collect()
}

fn build_custom_sections(
    custom_sections: &BTreeMap<String, Vec<CustomSectionEntry>>,
) -> BTreeMap<String, TypstCustomSection> {
    custom_sections
        .iter()
        .filter_map(|(section_id, entries)| {
            let entries = entries
                .iter()
                .filter_map(|entry| {
                    let title = trim_text(&entry.title);
                    let description = trim_text(&entry.description);
                    if title.is_empty() && description.is_empty() {
                        None
                    } else {
                        Some(TypstCustomEntry { title, description })
                    }
                })
                .collect::<Vec<_>>();

            if entries.is_empty() {
                None
            } else {
                Some((section_id.clone(), TypstCustomSection { entries }))
            }
        })
        .collect()
}

fn build_section_title_map(sections: &[ResumeSection]) -> HashMap<String, String> {
    sections
        .iter()
        .map(|section| {
            let title = trim_to_option(&section.title).unwrap_or_else(|| default_section_title(&section.id));
            (section.id.clone(), title)
        })
        .collect()
}

fn build_education_title(entry: &EducationEntry) -> Option<String> {
    let degree = trim_to_option(&entry.degree);
    let field = trim_to_option(&entry.field);
    let institution = trim_to_option(&entry.institution);

    let title = match (degree, field) {
        (Some(degree), Some(field)) => format!("{degree}, {field}"),
        (Some(degree), None) => degree,
        (None, Some(field)) => field,
        (None, None) => institution.clone()?,
    };

    Some(title)
}

fn has_personal_content(personal: &ResumePersonalInfo) -> bool {
    has_text(&personal.full_name)
        || has_text(&personal.title)
        || has_text(&personal.email)
        || has_text(&personal.phone)
        || has_text(&personal.location)
        || personal.links.iter().any(|link| has_text(&link.url) || has_text(&link.label))
}

fn choose_primary_title(primary: &str, secondary: &str) -> Option<String> {
    trim_to_option(primary).or_else(|| trim_to_option(secondary))
}

fn build_subtitle(parts: Vec<Option<String>>) -> String {
    parts
        .into_iter()
        .flatten()
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join(" • ")
}

fn format_date_range(start: &str, end: &str, current: bool, present_label: &str) -> String {
    let start = trim_to_option(start);
    let end = if current {
        Some(present_label.to_string())
    } else {
        trim_to_option(end)
    };

    match (start, end) {
        (Some(start), Some(end)) => format!("{start} - {end}"),
        (Some(start), None) => start,
        (None, Some(end)) => end,
        (None, None) => String::new(),
    }
}

fn normalize_url(value: &str) -> Option<String> {
    let trimmed = trim_to_option(value)?;
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") || trimmed.starts_with("mailto:") || trimmed.starts_with("tel:") {
        Some(trimmed)
    } else {
        Some(format!("https://{trimmed}"))
    }
}

fn build_font_fallbacks(primary: &str) -> Vec<String> {
    let mut families = Vec::new();
    let mut seen = HashSet::new();

    for family in [
        trim_text(primary),
        "Libertinus Serif".to_string(),
        "Libertinus Sans".to_string(),
        "DejaVu Sans".to_string(),
        "Arial".to_string(),
    ] {
        if !family.is_empty() && seen.insert(family.clone()) {
            families.push(family);
        }
    }

    families
}

fn resolve_page_indices(total_pages: usize, requested: Option<Vec<usize>>) -> Vec<usize> {
    match requested {
        Some(indices) => {
            let mut seen = HashSet::new();
            indices
                .into_iter()
                .filter(|index| *index < total_pages)
                .filter(|index| seen.insert(*index))
                .collect()
        }
        None => (0..total_pages).collect(),
    }
}

fn encode_rgba_png(width: u32, height: u32, rgba: &[u8]) -> Result<Vec<u8>, AppError> {
    let mut bytes = Vec::new();
    PngEncoder::new(&mut bytes)
        .write_image(
            rgba,
            width,
            height,
            ColorType::Rgba8.into(),
        )
        .map_err(|error| AppError::ResumeRender {
            details: format!("PNG encoding failed: {error}"),
        })?;
    Ok(bytes)
}

fn build_pdf_file_name(full_name: &str) -> String {
    let slug = slugify(trim_text(full_name));
    if slug.is_empty() {
        "resume.pdf".to_string()
    } else {
        format!("{slug}-resume.pdf")
    }
}

fn slugify(value: String) -> String {
    let mut slug = String::new();
    let mut previous_hyphen = false;

    for character in value.chars().flat_map(char::to_lowercase) {
        if character.is_ascii_alphanumeric() {
            slug.push(character);
            previous_hyphen = false;
        } else if !previous_hyphen {
            slug.push('-');
            previous_hyphen = true;
        }
    }

    slug.trim_matches('-').to_string()
}

fn clamp_dpi(dpi: Option<u16>) -> u16 {
    dpi.unwrap_or(PREVIEW_DPI_DEFAULT)
        .clamp(PREVIEW_DPI_MIN, PREVIEW_DPI_MAX)
}

fn build_render_request_cache_key(request: &ResumeRenderRequest) -> Result<String, AppError> {
    stable_hash(request)
}

fn build_preview_cache_key(request: &ResumePreviewRenderRequest) -> Result<String, AppError> {
    stable_hash(&serde_json::json!({
        "renderRequest": &request.render_request,
        "dpi": clamp_dpi(request.dpi),
        "pageIndices": &request.page_indices,
    }))
    .map(|hash| format!("preview:{hash}"))
}

fn stable_hash(value: &impl Serialize) -> Result<String, AppError> {
    let bytes = serde_json::to_vec(value).map_err(|error| AppError::ResumeRender {
        details: format!("Failed to serialize render cache key: {error}"),
    })?;
    let mut hasher = DefaultHasher::new();
    bytes.hash(&mut hasher);
    Ok(format!("{:016x}", hasher.finish()))
}

fn json_to_typst_value(value: serde_json::Value) -> Value {
    match value {
        serde_json::Value::Null => ().into_value(),
        serde_json::Value::Bool(boolean) => boolean.into_value(),
        serde_json::Value::Number(number) => {
            if let Some(integer) = number.as_i64() {
                integer.into_value()
            } else if let Some(float) = number.as_f64() {
                float.into_value()
            } else if let Some(unsigned) = number.as_u64() {
                (unsigned as i64).into_value()
            } else {
                ().into_value()
            }
        }
        serde_json::Value::String(string) => string.into_value(),
        serde_json::Value::Array(items) => items
            .into_iter()
            .map(json_to_typst_value)
            .collect::<Vec<_>>()
            .into_value(),
        serde_json::Value::Object(entries) => entries
            .into_iter()
            .map(|(key, value)| (key.into(), json_to_typst_value(value)))
            .collect::<Dict>()
            .into_value(),
    }
}

fn px_to_pt(value: f64) -> f64 {
    value * 0.75
}

fn trim_text(value: &str) -> String {
    value.trim().to_string()
}

fn trim_to_option(value: &str) -> Option<String> {
    let trimmed = trim_text(value);
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    }
}

fn has_text(value: &str) -> bool {
    !value.trim().is_empty()
}

fn default_section_title(section_id: &str) -> String {
    match section_id {
        "summary" => "Summary".to_string(),
        "experience" => "Experience".to_string(),
        "education" => "Education".to_string(),
        "skills" => "Skills".to_string(),
        "languages" => "Languages".to_string(),
        "certifications" => "Certifications".to_string(),
        "projects" => "Projects".to_string(),
        "volunteer" => "Volunteer".to_string(),
        other => other.replace(['_', '-'], " "),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn typography(
        font_family: &str,
        font_size_px: f64,
        font_weight: i64,
        font_style: &str,
    ) -> ResolvedTypographyRoleSettings {
        ResolvedTypographyRoleSettings {
            font_family: font_family.to_string(),
            font_size_px,
            font_weight,
            font_style: font_style.to_string(),
        }
    }

    fn sample_field_typography() -> BTreeMap<String, ResolvedTypographyRoleSettings> {
        let name = typography("Segoe UI", 29.0, 700, "normal");
        let title = typography("Segoe UI", 16.0, 400, "normal");
        let contacts = typography("Segoe UI", 12.0, 400, "normal");
        let section_heading = typography("Segoe UI", 16.0, 600, "normal");
        let entry_title = typography("Segoe UI", 14.0, 600, "normal");
        let body = typography("Segoe UI", 13.0, 400, "normal");
        let meta = typography("Segoe UI", 12.0, 400, "normal");

        BTreeMap::from([
            ("personalName".to_string(), name.clone()),
            ("personalTitle".to_string(), title.clone()),
            ("personalContacts".to_string(), contacts.clone()),
            ("sectionHeading".to_string(), section_heading.clone()),
            ("summary".to_string(), body.clone()),
            ("experienceTitle".to_string(), entry_title.clone()),
            ("experienceSubtitle".to_string(), body.clone()),
            ("experienceMeta".to_string(), meta.clone()),
            ("experienceBullet".to_string(), body.clone()),
            ("educationTitle".to_string(), entry_title.clone()),
            ("educationSubtitle".to_string(), body.clone()),
            ("educationMeta".to_string(), meta.clone()),
            ("educationDetail".to_string(), body.clone()),
            ("skillsGroupName".to_string(), entry_title.clone()),
            ("skillsItems".to_string(), body.clone()),
            ("languagesItems".to_string(), body.clone()),
            ("certificationTitle".to_string(), entry_title.clone()),
            ("certificationSubtitle".to_string(), body.clone()),
            ("certificationMeta".to_string(), meta.clone()),
            ("projectTitle".to_string(), entry_title.clone()),
            ("projectSubtitle".to_string(), body.clone()),
            ("projectDescription".to_string(), body.clone()),
            ("volunteerTitle".to_string(), entry_title.clone()),
            ("volunteerSubtitle".to_string(), body.clone()),
            ("volunteerMeta".to_string(), meta.clone()),
            ("volunteerDescription".to_string(), body.clone()),
            ("customTitle".to_string(), entry_title),
            ("customDescription".to_string(), body),
        ])
    }

    fn sample_field_spacing() -> BTreeMap<String, ResolvedFieldSpacingSettings> {
        BTreeMap::from([
            ("personalName".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 3.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("personalTitle".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 4.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("personalContacts".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 8.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("sectionHeading".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 5.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("summary".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 8.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("experienceTitle".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 0.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("experienceSubtitle".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 2.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("experienceMeta".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 0.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("experienceBullet".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 2.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("educationTitle".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 0.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("educationSubtitle".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 2.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("educationMeta".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 0.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("educationDetail".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 0.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("skillsGroupName".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 1.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("skillsItems".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 7.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("languagesItems".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 8.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("certificationTitle".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 0.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("certificationSubtitle".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 2.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("certificationMeta".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 0.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("projectTitle".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 0.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("projectSubtitle".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 1.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("projectDescription".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 8.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("volunteerTitle".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 0.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("volunteerSubtitle".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 1.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("volunteerMeta".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 0.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("volunteerDescription".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 8.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("customTitle".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 1.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
            ("customDescription".to_string(), ResolvedFieldSpacingSettings { margin_top_px: 0.0, margin_right_px: 0.0, margin_bottom_px: 8.0, margin_left_px: 0.0, padding_top_px: 0.0, padding_right_px: 0.0, padding_bottom_px: 0.0, padding_left_px: 0.0 }),
        ])
    }

    fn sample_request(template: &str) -> ResumeRenderRequest {
        ResumeRenderRequest {
            resume: ResumeData {
                personal: ResumePersonalInfo {
                    full_name: "Jane Doe".to_string(),
                    title: "Senior Product Designer".to_string(),
                    email: "jane@example.com".to_string(),
                    phone: "+1 555 0100".to_string(),
                    location: "Remote".to_string(),
                    links: vec![PersonalLink {
                        id: "github".to_string(),
                        kind: "portfolio".to_string(),
                        url: "janedoe.dev".to_string(),
                        label: "Portfolio".to_string(),
                    }],
                },
                summary: "Design leader with experience shipping cross-platform products.".to_string(),
                experience: vec![ExperienceEntry {
                    id: "exp-1".to_string(),
                    company: "Acme".to_string(),
                    position: "Lead Designer".to_string(),
                    location: "Remote".to_string(),
                    start_date: "2021".to_string(),
                    end_date: "".to_string(),
                    current: true,
                    bullets: vec![
                        "Led redesign of the flagship mobile app.".to_string(),
                        "Established a reusable design system.".to_string(),
                    ],
                }],
                education: vec![EducationEntry {
                    id: "edu-1".to_string(),
                    institution: "State University".to_string(),
                    degree: "B.Des.".to_string(),
                    field: "Interaction Design".to_string(),
                    start_date: "2014".to_string(),
                    end_date: "2018".to_string(),
                    gpa: "3.9".to_string(),
                }],
                skills: vec![SkillGroup {
                    id: "skills-1".to_string(),
                    name: "Tools".to_string(),
                    items: vec!["Figma".to_string(), "FigJam".to_string(), "Framer".to_string()],
                }],
                languages: vec![LanguageEntry {
                    id: "lang-1".to_string(),
                    language: "English".to_string(),
                    proficiency: "Native".to_string(),
                }],
                certifications: vec![CertificationEntry {
                    id: "cert-1".to_string(),
                    name: "NN/g UX Certification".to_string(),
                    issuer: "Nielsen Norman Group".to_string(),
                    date: "2023".to_string(),
                    url: "nngroup.com".to_string(),
                }],
                projects: vec![ProjectEntry {
                    id: "proj-1".to_string(),
                    name: "Design System Portal".to_string(),
                    description: "Internal reference site for tokens, components, and usage guidance.".to_string(),
                    technologies: "React, Storybook".to_string(),
                    url: "portal.example.com".to_string(),
                }],
                volunteer: vec![VolunteerEntry {
                    id: "vol-1".to_string(),
                    organization: "Women in Design".to_string(),
                    role: "Mentor".to_string(),
                    start_date: "2022".to_string(),
                    end_date: "2024".to_string(),
                    description: "Mentored early-career designers on portfolio reviews and interviews.".to_string(),
                }],
                sections: vec![
                    ResumeSection { id: "personal".to_string(), kind: "personal".to_string(), title: "Personal".to_string(), visible: true },
                    ResumeSection { id: "summary".to_string(), kind: "summary".to_string(), title: "Summary".to_string(), visible: true },
                    ResumeSection { id: "experience".to_string(), kind: "experience".to_string(), title: "Experience".to_string(), visible: true },
                    ResumeSection { id: "education".to_string(), kind: "education".to_string(), title: "Education".to_string(), visible: true },
                    ResumeSection { id: "skills".to_string(), kind: "skills".to_string(), title: "Skills".to_string(), visible: true },
                    ResumeSection { id: "languages".to_string(), kind: "languages".to_string(), title: "Languages".to_string(), visible: true },
                    ResumeSection { id: "certifications".to_string(), kind: "certifications".to_string(), title: "Certifications".to_string(), visible: true },
                    ResumeSection { id: "projects".to_string(), kind: "projects".to_string(), title: "Projects".to_string(), visible: true },
                    ResumeSection { id: "volunteer".to_string(), kind: "volunteer".to_string(), title: "Volunteer".to_string(), visible: true },
                ],
                custom_sections: BTreeMap::new(),
            },
            visible_ids: vec![
                "personal".to_string(),
                "summary".to_string(),
                "experience".to_string(),
                "education".to_string(),
                "skills".to_string(),
                "languages".to_string(),
                "certifications".to_string(),
                "projects".to_string(),
                "volunteer".to_string(),
            ],
            labels: RenderLabels {
                present: "Present".to_string(),
                gpa: "GPA".to_string(),
            },
            template: template.to_string(),
            layout_settings: serde_json::json!({}),
            resolved_layout_settings: ResolvedLayoutSettings {
                top: 72.0,
                right: 72.0,
                bottom: 72.0,
                left: 72.0,
                typography: ResolvedLayoutTypographySettings {
                    name: typography("Segoe UI", 29.0, 700, "normal"),
                    title: typography("Segoe UI", 16.0, 400, "normal"),
                    contacts: typography("Segoe UI", 12.0, 400, "normal"),
                    section_heading: typography("Segoe UI", 16.0, 600, "normal"),
                    entry_title: typography("Segoe UI", 14.0, 600, "normal"),
                    body: typography("Segoe UI", 13.0, 400, "normal"),
                    meta: typography("Segoe UI", 12.0, 400, "normal"),
                },
                field_typography: sample_field_typography(),
                field_spacing: sample_field_spacing(),
            },
        }
    }

    #[test]
    fn renders_preview_and_pdf_for_supported_templates() {
        for template in [CLASSIC_TEMPLATE_ID, MODERN_TEMPLATE_ID, MINIMAL_TEMPLATE_ID] {
            let preview = render_resume_preview_blocking(ResumePreviewRenderRequest {
                render_request: sample_request(template),
                dpi: Some(144),
                page_indices: None,
            })
            .unwrap_or_else(|error| panic!("preview should render for {template}: {error}"));

            assert!(preview.total_pages >= 1, "expected at least one page for {template}");
            assert!(!preview.pages.is_empty(), "expected preview pages for {template}");
            assert!(preview.pages[0].width_px > 0, "expected width for {template}");
            assert!(preview.pages[0].height_px > 0, "expected height for {template}");
            assert!(
                STANDARD.decode(&preview.pages[0].base64_png).is_ok(),
                "expected PNG bytes for {template}"
            );

            let pdf = export_resume_pdf_blocking(ResumePdfRenderRequest {
                render_request: sample_request(template),
            })
            .unwrap_or_else(|error| panic!("pdf should render for {template}: {error}"));

            assert!(pdf.file_name.ends_with(".pdf"), "expected PDF file name for {template}");
            let decoded_pdf = STANDARD.decode(&pdf.base64_pdf).expect("valid pdf bytes");
            assert!(decoded_pdf.starts_with(b"%PDF"), "expected PDF header for {template}");
        }
    }
}