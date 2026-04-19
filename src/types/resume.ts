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

export interface ExportLabels {
  present: string;
  gpa: string;
}

export const defaultExportLabels: ExportLabels = { present: "Present", gpa: "GPA" };

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
