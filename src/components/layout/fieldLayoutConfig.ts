import type {
  FieldSpacingKey,
  FieldSpacingSettings,
  TypographyField,
  TypographyRoleSettings,
} from "../../types/resume";

export const FONT_WEIGHT_OPTIONS = [300, 400, 500, 600, 700] as const;

export const TYPOGRAPHY_FIELD_LABELS: Record<TypographyField, string> = {
  personalName: "Full name",
  personalTitle: "Professional title",
  personalContacts: "Contact line",
  sectionHeading: "Section heading",
  summary: "Summary text",
  experienceTitle: "Experience title",
  experienceSubtitle: "Experience subtitle",
  experienceMeta: "Experience dates",
  experienceBullet: "Experience bullet",
  educationTitle: "Education title",
  educationSubtitle: "Education subtitle",
  educationMeta: "Education dates",
  educationDetail: "Education detail",
  skillsGroupName: "Skill group name",
  skillsItems: "Skill items",
  languagesItems: "Language items",
  certificationTitle: "Certification title",
  certificationSubtitle: "Certification issuer",
  certificationMeta: "Certification date",
  projectTitle: "Project title",
  projectSubtitle: "Project technologies",
  projectDescription: "Project description",
  volunteerTitle: "Volunteer title",
  volunteerSubtitle: "Volunteer subtitle",
  volunteerMeta: "Volunteer dates",
  volunteerDescription: "Volunteer description",
  customTitle: "Custom entry title",
  customDescription: "Custom entry description",
};

export function hasTypographyOverride(settings: TypographyRoleSettings): boolean {
  return Boolean(
    settings.fontFamily ||
    settings.fontSizePx !== undefined ||
    settings.fontWeight !== undefined ||
    settings.fontStyle !== undefined,
  );
}

export function hasSpacingOverride(settings: FieldSpacingSettings): boolean {
  return Object.values(settings).some((value) => value !== undefined);
}

export function clampFieldSpacingValue(value: number): number {
  return Math.min(48, Math.max(0, Math.round(value || 0)));
}

export const FIELD_SPACING_INPUT_GROUPS: ReadonlyArray<{
  title: string;
  keys: readonly FieldSpacingKey[];
}> = [
  {
    title: "Outer margin",
    keys: ["marginTopPx", "marginRightPx", "marginBottomPx", "marginLeftPx"],
  },
  {
    title: "Inner padding",
    keys: ["paddingTopPx", "paddingRightPx", "paddingBottomPx", "paddingLeftPx"],
  },
];

export const FIELD_SPACING_LABELS: Record<FieldSpacingKey, string> = {
  marginTopPx: "Top",
  marginRightPx: "Right",
  marginBottomPx: "Bottom",
  marginLeftPx: "Left",
  paddingTopPx: "Top",
  paddingRightPx: "Right",
  paddingBottomPx: "Bottom",
  paddingLeftPx: "Left",
};
