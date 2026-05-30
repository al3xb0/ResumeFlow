export type LinkType = "linkedin" | "github" | "portfolio" | "twitter" | "other";

export interface PersonalLink {
  id: string;
  type: LinkType;
  url: string;
  label: string;
}

export const LINK_PRESETS: { type: LinkType; label: string; placeholder: string }[] = [
  { type: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/johndoe" },
  { type: "github", label: "GitHub", placeholder: "github.com/johndoe" },
  { type: "portfolio", label: "Portfolio", placeholder: "johndoe.dev" },
  { type: "twitter", label: "X / Twitter", placeholder: "x.com/johndoe" },
  { type: "other", label: "Other", placeholder: "example.com" },
];

export interface ResumePersonalInfo {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  links: PersonalLink[];
}

export interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa: string;
}

export interface LanguageEntry {
  id: string;
  language: string;
  proficiency: string;
}

export interface SkillGroup {
  id: string;
  name: string;
  items: string[];
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  technologies: string;
  url: string;
}

export interface VolunteerEntry {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface CustomSectionEntry {
  id: string;
  title: string;
  description: string;
}

export type SectionType =
  | "personal"
  | "experience"
  | "education"
  | "skills"
  | "summary"
  | "languages"
  | "certifications"
  | "projects"
  | "volunteer"
  | "custom";

export interface ResumeSection {
  id: string;
  type: SectionType;
  title: string;
  visible: boolean;
}

export interface ResumeData {
  personal: ResumePersonalInfo;
  summary: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillGroup[];
  languages: LanguageEntry[];
  certifications: CertificationEntry[];
  projects: ProjectEntry[];
  volunteer: VolunteerEntry[];
  sections: ResumeSection[];
  customSections: Record<string, CustomSectionEntry[]>;
}

export type TemplateId = "classic" | "modern" | "minimal";

export const ALL_TEMPLATE_IDS = [
  "classic",
  "modern",
  "minimal",
] as const satisfies readonly TemplateId[];
export const TYPST_ENABLED_TEMPLATE_IDS = ALL_TEMPLATE_IDS;
export const TEMPLATE_DISPLAY_NAMES: Record<TemplateId, string> = {
  classic: "Classic",
  modern: "Modern",
  minimal: "Minimal",
};
export const RESUME_PAGE_WIDTH_PX = 816;
export const RESUME_PAGE_HEIGHT_PX = 1056;

export function isTypstEnabledTemplate(template: TemplateId): boolean {
  return (TYPST_ENABLED_TEMPLATE_IDS as readonly TemplateId[]).includes(template);
}

export function normalizeTypstTemplate(template: TemplateId): TemplateId {
  return isTypstEnabledTemplate(template) ? template : ALL_TEMPLATE_IDS[0];
}

export type TypographyRole =
  | "name"
  | "title"
  | "contacts"
  | "sectionHeading"
  | "entryTitle"
  | "body"
  | "meta";

export type TypographyField =
  | "personalName"
  | "personalTitle"
  | "personalContacts"
  | "sectionHeading"
  | "summary"
  | "experienceTitle"
  | "experienceSubtitle"
  | "experienceMeta"
  | "experienceBullet"
  | "educationTitle"
  | "educationSubtitle"
  | "educationMeta"
  | "educationDetail"
  | "skillsGroupName"
  | "skillsItems"
  | "languagesItems"
  | "certificationTitle"
  | "certificationSubtitle"
  | "certificationMeta"
  | "projectTitle"
  | "projectSubtitle"
  | "projectDescription"
  | "volunteerTitle"
  | "volunteerSubtitle"
  | "volunteerMeta"
  | "volunteerDescription"
  | "customTitle"
  | "customDescription";

export type TypographyFontStyle = "normal" | "italic";

export interface TypographyRoleSettings {
  fontFamily?: string;
  fontSizePx?: number;
  fontWeight?: number;
  fontStyle?: TypographyFontStyle;
}

export interface ResolvedTypographyRoleSettings {
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
  fontStyle: TypographyFontStyle;
}

export interface FieldSpacingSettings {
  marginTopPx?: number;
  marginRightPx?: number;
  marginBottomPx?: number;
  marginLeftPx?: number;
  paddingTopPx?: number;
  paddingRightPx?: number;
  paddingBottomPx?: number;
  paddingLeftPx?: number;
}

export interface ResolvedFieldSpacingSettings {
  marginTopPx: number;
  marginRightPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  paddingTopPx: number;
  paddingRightPx: number;
  paddingBottomPx: number;
  paddingLeftPx: number;
}

export const FIELD_SPACING_KEYS = [
  "marginTopPx",
  "marginRightPx",
  "marginBottomPx",
  "marginLeftPx",
  "paddingTopPx",
  "paddingRightPx",
  "paddingBottomPx",
  "paddingLeftPx",
] as const satisfies readonly (keyof ResolvedFieldSpacingSettings)[];

export type FieldSpacingKey = (typeof FIELD_SPACING_KEYS)[number];

export type LayoutTypographySettings = Record<TypographyRole, TypographyRoleSettings>;
export type ResolvedLayoutTypographySettings = Record<
  TypographyRole,
  ResolvedTypographyRoleSettings
>;
export type LayoutTypographyFieldSettings = Record<TypographyField, TypographyRoleSettings>;
export type ResolvedLayoutTypographyFieldSettings = Record<
  TypographyField,
  ResolvedTypographyRoleSettings
>;
export type LayoutFieldSpacingSettings = Record<TypographyField, FieldSpacingSettings>;
export type ResolvedLayoutFieldSpacingSettings = Record<
  TypographyField,
  ResolvedFieldSpacingSettings
>;

export interface PageMarginsPx {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ExportLabels {
  present: string;
  gpa: string;
}

export const defaultExportLabels: ExportLabels = { present: "Present", gpa: "GPA" };

export interface LayoutSettings {
  pageMarginTopPx: number;
  pageMarginRightPx: number;
  pageMarginBottomPx: number;
  pageMarginLeftPx: number;
  typography: LayoutTypographySettings;
  fieldTypography?: LayoutTypographyFieldSettings;
  fieldSpacing?: LayoutFieldSpacingSettings;
}

export interface ResumeRenderRequest {
  resume: ResumeData;
  visibleIds: string[];
  labels: ExportLabels;
  template: TemplateId;
  layoutSettings: LayoutSettings;
  resolvedLayoutSettings: ResolvedLayoutSettings;
}

export interface ResolvedLayoutSettings extends PageMarginsPx {
  typography: ResolvedLayoutTypographySettings;
  fieldTypography: ResolvedLayoutTypographyFieldSettings;
  fieldSpacing: ResolvedLayoutFieldSpacingSettings;
}

export const TYPOGRAPHY_ROLES = [
  "name",
  "title",
  "contacts",
  "sectionHeading",
  "entryTitle",
  "body",
  "meta",
] as const satisfies readonly TypographyRole[];

export const TYPOGRAPHY_FIELDS = [
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
] as const satisfies readonly TypographyField[];

export const TYPOGRAPHY_FIELD_TO_ROLE = {
  personalName: "name",
  personalTitle: "title",
  personalContacts: "contacts",
  sectionHeading: "sectionHeading",
  summary: "body",
  experienceTitle: "entryTitle",
  experienceSubtitle: "body",
  experienceMeta: "meta",
  experienceBullet: "body",
  educationTitle: "entryTitle",
  educationSubtitle: "body",
  educationMeta: "meta",
  educationDetail: "body",
  skillsGroupName: "entryTitle",
  skillsItems: "body",
  languagesItems: "body",
  certificationTitle: "entryTitle",
  certificationSubtitle: "body",
  certificationMeta: "meta",
  projectTitle: "entryTitle",
  projectSubtitle: "body",
  projectDescription: "body",
  volunteerTitle: "entryTitle",
  volunteerSubtitle: "body",
  volunteerMeta: "meta",
  volunteerDescription: "body",
  customTitle: "entryTitle",
  customDescription: "body",
} as const satisfies Record<TypographyField, TypographyRole>;

export const DEFAULT_LAYOUT_TYPOGRAPHY: LayoutTypographySettings = {
  name: {},
  title: {},
  contacts: {},
  sectionHeading: {},
  entryTitle: {},
  body: {},
  meta: {},
};

export const DEFAULT_LAYOUT_FIELD_TYPOGRAPHY = Object.fromEntries(
  TYPOGRAPHY_FIELDS.map((field) => [field, {}]),
) as LayoutTypographyFieldSettings;

export const DEFAULT_LAYOUT_FIELD_SPACING = Object.fromEntries(
  TYPOGRAPHY_FIELDS.map((field) => [field, {}]),
) as LayoutFieldSpacingSettings;

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  pageMarginTopPx: 72,
  pageMarginRightPx: 72,
  pageMarginBottomPx: 72,
  pageMarginLeftPx: 72,
  typography: DEFAULT_LAYOUT_TYPOGRAPHY,
  fieldTypography: DEFAULT_LAYOUT_FIELD_TYPOGRAPHY,
  fieldSpacing: DEFAULT_LAYOUT_FIELD_SPACING,
};

export function createId(): string {
  return crypto.randomUUID();
}

export function defaultResumeData(): ResumeData {
  return {
    personal: {
      fullName: "",
      title: "",
      email: "",
      phone: "",
      location: "",
      links: [],
    },
    summary: "",
    experience: [],
    education: [],
    skills: [{ id: createId(), name: "", items: [] }],
    languages: [],
    certifications: [],
    projects: [],
    volunteer: [],
    sections: [
      { id: "personal", type: "personal", title: "Personal Info", visible: true },
      { id: "summary", type: "summary", title: "Summary", visible: true },
      { id: "experience", type: "experience", title: "Experience", visible: true },
      { id: "education", type: "education", title: "Education", visible: true },
      { id: "skills", type: "skills", title: "Skills", visible: true },
      { id: "languages", type: "languages", title: "Languages", visible: true },
      { id: "certifications", type: "certifications", title: "Certifications", visible: true },
      { id: "projects", type: "projects", title: "Projects", visible: true },
      { id: "volunteer", type: "volunteer", title: "Volunteer", visible: true },
    ],
    customSections: {},
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return isObject(value) ? value : {};
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeId(value: unknown): string {
  const normalized = normalizeString(value);
  return normalized || createId();
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeString(item)).filter((item) => item.length > 0);
}

function normalizeBullets(value: unknown): string[] {
  const bullets = Array.isArray(value)
    ? value.map((item) => normalizeString(item)).filter((item) => item.length > 0)
    : [];
  return bullets.length ? bullets : [""];
}

export function normalizeResumeData(input: Partial<ResumeData> | ResumeData): ResumeData {
  const base = defaultResumeData();
  const source = asRecord(input);
  const personal = asRecord(source.personal);

  const experience = Array.isArray(source.experience)
    ? source.experience.map((entry) => {
        const record = asRecord(entry);
        return {
          id: normalizeId(record.id),
          company: normalizeString(record.company),
          position: normalizeString(record.position),
          location: normalizeString(record.location),
          startDate: normalizeString(record.startDate),
          endDate: normalizeString(record.endDate),
          current: Boolean(record.current),
          bullets: normalizeBullets(record.bullets),
        };
      })
    : [];

  const education = Array.isArray(source.education)
    ? source.education.map((entry) => {
        const record = asRecord(entry);
        return {
          id: normalizeId(record.id),
          institution: normalizeString(record.institution),
          degree: normalizeString(record.degree),
          field: normalizeString(record.field),
          startDate: normalizeString(record.startDate),
          endDate: normalizeString(record.endDate),
          gpa: normalizeString(record.gpa),
        };
      })
    : [];

  const skills = Array.isArray(source.skills)
    ? source.skills
        .map((group) => {
          const record = asRecord(group);
          return {
            id: normalizeId(record.id),
            name: normalizeString(record.name),
            items: normalizeStringList(record.items),
          };
        })
        .filter((group) => group.name || group.items.length > 0)
    : [];

  const languages = Array.isArray(source.languages)
    ? source.languages.map((entry) => {
        const record = asRecord(entry);
        return {
          id: normalizeId(record.id),
          language: normalizeString(record.language),
          proficiency: normalizeString(record.proficiency),
        };
      })
    : [];

  const certifications = Array.isArray(source.certifications)
    ? source.certifications.map((entry) => {
        const record = asRecord(entry);
        return {
          id: normalizeId(record.id),
          name: normalizeString(record.name),
          issuer: normalizeString(record.issuer),
          date: normalizeString(record.date),
          url: normalizeString(record.url),
        };
      })
    : [];

  const projects = Array.isArray(source.projects)
    ? source.projects.map((entry) => {
        const record = asRecord(entry);
        return {
          id: normalizeId(record.id),
          name: normalizeString(record.name),
          description: normalizeString(record.description),
          technologies: normalizeString(record.technologies),
          url: normalizeString(record.url),
        };
      })
    : [];

  const volunteer = Array.isArray(source.volunteer)
    ? source.volunteer.map((entry) => {
        const record = asRecord(entry);
        return {
          id: normalizeId(record.id),
          organization: normalizeString(record.organization),
          role: normalizeString(record.role),
          startDate: normalizeString(record.startDate),
          endDate: normalizeString(record.endDate),
          description: normalizeString(record.description),
        };
      })
    : [];

  const customSectionsSource = asRecord(source.customSections);
  const incomingSections = Array.isArray(source.sections)
    ? source.sections.map((section) => asRecord(section))
    : [];

  const sections = base.sections.map((section) => {
    const match = incomingSections.find(
      (candidate) =>
        normalizeString(candidate.id) === section.id ||
        normalizeString(candidate.type) === section.type,
    );

    return {
      ...section,
      title: normalizeString(match?.title) || section.title,
      visible: typeof match?.visible === "boolean" ? match.visible : section.visible,
    };
  });

  const customSections: Record<string, CustomSectionEntry[]> = {};
  const customSectionOrder: ResumeSection[] = [];

  for (const section of incomingSections) {
    if (normalizeString(section.type) !== "custom") continue;

    const id = normalizeId(section.id);
    const rawId = normalizeString(section.id);
    customSectionOrder.push({
      id,
      type: "custom",
      title: normalizeString(section.title) || "Custom Section",
      visible: typeof section.visible === "boolean" ? section.visible : true,
    });

    const entries = customSectionsSource[rawId];
    customSections[id] = Array.isArray(entries)
      ? entries.map((entry) => {
          const record = asRecord(entry);
          return {
            id: normalizeId(record.id),
            title: normalizeString(record.title),
            description: normalizeString(record.description),
          };
        })
      : [];
  }

  for (const [rawId, entries] of Object.entries(customSectionsSource)) {
    if (customSectionOrder.some((section) => section.id === rawId)) continue;
    const id = normalizeId(rawId);
    customSectionOrder.push({ id, type: "custom", title: "Custom Section", visible: true });
    customSections[id] = Array.isArray(entries)
      ? entries.map((entry) => {
          const record = asRecord(entry);
          return {
            id: normalizeId(record.id),
            title: normalizeString(record.title),
            description: normalizeString(record.description),
          };
        })
      : [];
  }

  return {
    personal: {
      fullName: normalizeString(personal.fullName),
      title: normalizeString(personal.title),
      email: normalizeString(personal.email),
      phone: normalizeString(personal.phone),
      location: normalizeString(personal.location),
      links: Array.isArray(personal.links)
        ? personal.links.map((link) => {
            const record = asRecord(link);
            const linkType = normalizeString(record.type);

            return {
              id: normalizeId(record.id),
              type:
                linkType === "linkedin" ||
                linkType === "github" ||
                linkType === "portfolio" ||
                linkType === "twitter"
                  ? (linkType as LinkType)
                  : "other",
              url: normalizeString(record.url),
              label: normalizeString(record.label),
            };
          })
        : base.personal.links,
    },
    summary: normalizeString(source.summary),
    experience,
    education,
    skills: skills.length ? skills : base.skills,
    languages,
    certifications,
    projects,
    volunteer,
    sections: [...sections, ...customSectionOrder],
    customSections,
  };
}
