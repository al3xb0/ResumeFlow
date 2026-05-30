import {
  FIELD_SPACING_KEYS,
  TYPOGRAPHY_FIELDS,
  type FieldSpacingSettings,
  type ResolvedLayoutFieldSpacingSettings,
  type ResolvedLayoutTypographySettings,
  type TemplateId,
  type TypographyField,
} from "../types/resume";

function createFieldSpacing(
  overrides: Partial<Record<TypographyField, FieldSpacingSettings>> = {},
): ResolvedLayoutFieldSpacingSettings {
  return Object.fromEntries(
    TYPOGRAPHY_FIELDS.map((field) => [
      field,
      {
        ...Object.fromEntries(FIELD_SPACING_KEYS.map((key) => [key, 0])),
        ...overrides[field],
      },
    ]),
  ) as ResolvedLayoutFieldSpacingSettings;
}

export interface TemplateTheme {
  previewFontFamily: string;
  docxFontFamily: string;
  pdfFontFamily: "ResumeFlowSans" | "ResumeFlowSerif";
  typography: ResolvedLayoutTypographySettings;
  fieldSpacing: ResolvedLayoutFieldSpacingSettings;
  bodyColor: string;
  bodyLineHeight: number;
  linkColor: string;
  header: {
    backgroundColor?: string;
    nameColor: string;
    titleColor: string;
    contactColor: string;
    separator: string;
    dividerColor?: string;
    dividerWidth?: number;
    paddingX?: number;
    paddingY?: number;
    nameLetterSpacing?: number;
    titleItalic?: boolean;
    nameBold: boolean;
  };
  section: {
    headingColor: string;
    ruleColor: string;
    ruleWidth: number;
    uppercase: boolean;
    letterSpacing: number;
    bold: boolean;
  };
  entry: {
    titleColor: string;
    detailColor: string;
    metaColor: string;
    dateColor: string;
    metaItalic: boolean;
    dateItalic: boolean;
  };
  skills: {
    delimiter: string;
    badgeBackgroundColor?: string;
    badgeTextColor?: string;
  };
  languages: {
    delimiter: string;
    badgeBackgroundColor?: string;
    badgeTextColor?: string;
  };
}

export const templateThemes: Record<TemplateId, TemplateTheme> = {
  classic: {
    previewFontFamily: "'Segoe UI',Arial,Helvetica,sans-serif",
    docxFontFamily: "Segoe UI",
    pdfFontFamily: "ResumeFlowSans",
    typography: {
      name: { fontFamily: "Segoe UI", fontSizePx: 29, fontWeight: 700, fontStyle: "normal" },
      title: { fontFamily: "Segoe UI", fontSizePx: 16, fontWeight: 400, fontStyle: "normal" },
      contacts: { fontFamily: "Segoe UI", fontSizePx: 12, fontWeight: 400, fontStyle: "normal" },
      sectionHeading: {
        fontFamily: "Segoe UI",
        fontSizePx: 16,
        fontWeight: 600,
        fontStyle: "normal",
      },
      entryTitle: {
        fontFamily: "Segoe UI",
        fontSizePx: 14,
        fontWeight: 600,
        fontStyle: "normal",
      },
      body: { fontFamily: "Segoe UI", fontSizePx: 13, fontWeight: 400, fontStyle: "normal" },
      meta: { fontFamily: "Segoe UI", fontSizePx: 12, fontWeight: 400, fontStyle: "normal" },
    },
    fieldSpacing: createFieldSpacing({
      personalName: { marginBottomPx: 2.7 },
      personalTitle: { marginBottomPx: 4 },
      personalContacts: { marginBottomPx: 8 },
      sectionHeading: { marginBottomPx: 5 },
      summary: { marginBottomPx: 8 },
      experienceSubtitle: { marginBottomPx: 2 },
      experienceBullet: { marginBottomPx: 2 },
      skillsGroupName: { marginBottomPx: 1 },
      skillsItems: { marginBottomPx: 7 },
      languagesItems: { marginBottomPx: 8 },
      projectSubtitle: { marginBottomPx: 1 },
      projectDescription: { marginBottomPx: 8 },
      volunteerSubtitle: { marginBottomPx: 1 },
      volunteerDescription: { marginBottomPx: 8 },
      customTitle: { marginBottomPx: 1 },
      customDescription: { marginBottomPx: 8 },
    }),
    bodyColor: "#333333",
    bodyLineHeight: 1.24,
    linkColor: "#2563eb",
    header: {
      nameColor: "#111111",
      titleColor: "#555555",
      contactColor: "#666666",
      separator: "  |  ",
      dividerColor: "#222222",
      dividerWidth: 1.2,
      nameBold: true,
    },
    section: {
      headingColor: "#111111",
      ruleColor: "#cccccc",
      ruleWidth: 0.7,
      uppercase: false,
      letterSpacing: 0,
      bold: true,
    },
    entry: {
      titleColor: "#222222",
      detailColor: "#555555",
      metaColor: "#666666",
      dateColor: "#666666",
      metaItalic: true,
      dateItalic: false,
    },
    skills: { delimiter: ", " },
    languages: { delimiter: ", " },
  },
  modern: {
    previewFontFamily: "'Segoe UI',Arial,sans-serif",
    docxFontFamily: "Segoe UI",
    pdfFontFamily: "ResumeFlowSans",
    typography: {
      name: { fontFamily: "Segoe UI", fontSizePx: 32, fontWeight: 700, fontStyle: "normal" },
      title: { fontFamily: "Segoe UI", fontSizePx: 15, fontWeight: 300, fontStyle: "normal" },
      contacts: { fontFamily: "Segoe UI", fontSizePx: 12, fontWeight: 400, fontStyle: "normal" },
      sectionHeading: {
        fontFamily: "Segoe UI",
        fontSizePx: 15,
        fontWeight: 700,
        fontStyle: "normal",
      },
      entryTitle: {
        fontFamily: "Segoe UI",
        fontSizePx: 14,
        fontWeight: 600,
        fontStyle: "normal",
      },
      body: { fontFamily: "Segoe UI", fontSizePx: 13, fontWeight: 400, fontStyle: "normal" },
      meta: { fontFamily: "Segoe UI", fontSizePx: 12, fontWeight: 400, fontStyle: "normal" },
    },
    fieldSpacing: createFieldSpacing({
      personalName: { marginBottomPx: 4 },
      personalTitle: { marginBottomPx: 10 },
      personalContacts: { marginBottomPx: 10 },
      sectionHeading: { marginBottomPx: 6 },
      summary: { marginBottomPx: 8 },
      experienceSubtitle: { marginBottomPx: 2 },
      experienceBullet: { marginBottomPx: 2 },
      skillsGroupName: { marginBottomPx: 2 },
      skillsItems: { marginBottomPx: 7 },
      languagesItems: { marginBottomPx: 8 },
      projectSubtitle: { marginBottomPx: 2 },
      projectDescription: { marginBottomPx: 8 },
      volunteerSubtitle: { marginBottomPx: 2 },
      volunteerDescription: { marginBottomPx: 8 },
      customTitle: { marginBottomPx: 2 },
      customDescription: { marginBottomPx: 8 },
    }),
    bodyColor: "#374151",
    bodyLineHeight: 1.22,
    linkColor: "#93c5fd",
    header: {
      backgroundColor: "#1e293b",
      nameColor: "#ffffff",
      titleColor: "#94a3b8",
      contactColor: "#cbd5e1",
      separator: "  •  ",
      paddingX: 24,
      paddingY: 18,
      nameLetterSpacing: 0.5,
      nameBold: true,
    },
    section: {
      headingColor: "#1e293b",
      ruleColor: "#3b82f6",
      ruleWidth: 1.5,
      uppercase: true,
      letterSpacing: 1,
      bold: true,
    },
    entry: {
      titleColor: "#111111",
      detailColor: "#3b82f6",
      metaColor: "#6b7280",
      dateColor: "#6b7280",
      metaItalic: false,
      dateItalic: false,
    },
    skills: {
      delimiter: ", ",
      badgeBackgroundColor: "#eff6ff",
      badgeTextColor: "#1e40af",
    },
    languages: {
      delimiter: " · ",
      badgeBackgroundColor: "#f0fdf4",
      badgeTextColor: "#166534",
    },
  },
  minimal: {
    previewFontFamily: "Georgia,'Times New Roman',serif",
    docxFontFamily: "Georgia",
    pdfFontFamily: "ResumeFlowSerif",
    typography: {
      name: { fontFamily: "Georgia", fontSizePx: 27, fontWeight: 400, fontStyle: "normal" },
      title: { fontFamily: "Georgia", fontSizePx: 14, fontWeight: 400, fontStyle: "italic" },
      contacts: { fontFamily: "Georgia", fontSizePx: 12, fontWeight: 400, fontStyle: "normal" },
      sectionHeading: {
        fontFamily: "Georgia",
        fontSizePx: 15,
        fontWeight: 400,
        fontStyle: "normal",
      },
      entryTitle: {
        fontFamily: "Georgia",
        fontSizePx: 14,
        fontWeight: 600,
        fontStyle: "normal",
      },
      body: { fontFamily: "Georgia", fontSizePx: 13, fontWeight: 400, fontStyle: "normal" },
      meta: { fontFamily: "Georgia", fontSizePx: 12, fontWeight: 400, fontStyle: "italic" },
    },
    fieldSpacing: createFieldSpacing({
      personalName: { marginBottomPx: 3 },
      personalTitle: { marginBottomPx: 4 },
      personalContacts: { marginBottomPx: 8 },
      sectionHeading: { marginBottomPx: 5 },
      summary: { marginBottomPx: 8 },
      experienceSubtitle: { marginBottomPx: 2 },
      experienceBullet: { marginBottomPx: 2 },
      skillsGroupName: { marginBottomPx: 1 },
      skillsItems: { marginBottomPx: 7 },
      languagesItems: { marginBottomPx: 8 },
      projectSubtitle: { marginBottomPx: 1 },
      projectDescription: { marginBottomPx: 8 },
      volunteerSubtitle: { marginBottomPx: 1 },
      volunteerDescription: { marginBottomPx: 8 },
      customTitle: { marginBottomPx: 1 },
      customDescription: { marginBottomPx: 8 },
    }),
    bodyColor: "#444444",
    bodyLineHeight: 1.3,
    linkColor: "#2563eb",
    header: {
      nameColor: "#000000",
      titleColor: "#666666",
      contactColor: "#888888",
      separator: "  ·  ",
      nameLetterSpacing: 1,
      titleItalic: true,
      nameBold: false,
    },
    section: {
      headingColor: "#000000",
      ruleColor: "#dddddd",
      ruleWidth: 0.8,
      uppercase: true,
      letterSpacing: 2,
      bold: false,
    },
    entry: {
      titleColor: "#111111",
      detailColor: "#666666",
      metaColor: "#888888",
      dateColor: "#888888",
      metaItalic: false,
      dateItalic: true,
    },
    skills: { delimiter: " · " },
    languages: { delimiter: " · " },
  },
};

export function getTemplateTheme(template: TemplateId): TemplateTheme {
  return templateThemes[template];
}
