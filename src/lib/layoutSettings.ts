import { getTemplateTheme } from "../templates/templateThemes";
import {
  DEFAULT_LAYOUT_FIELD_SPACING,
  DEFAULT_LAYOUT_FIELD_TYPOGRAPHY,
  TYPOGRAPHY_FIELDS,
  TYPOGRAPHY_FIELD_TO_ROLE,
  TYPOGRAPHY_ROLES,
  type LayoutSettings,
  type PageMarginsPx,
  type ResolvedLayoutSettings,
  type TemplateId,
} from "../types/resume";

export interface FontFamilyOption {
  value: string;
  label: string;
  previewFamily: string;
  docxFamily: string;
}

export const FONT_FAMILY_OPTIONS: readonly FontFamilyOption[] = [
  {
    value: "Segoe UI",
    label: "Segoe UI",
    previewFamily: "'Segoe UI',Arial,Helvetica,sans-serif",
    docxFamily: "Segoe UI",
  },
  {
    value: "Arial",
    label: "Arial",
    previewFamily: "Arial,Helvetica,sans-serif",
    docxFamily: "Arial",
  },
  {
    value: "Calibri",
    label: "Calibri",
    previewFamily: "Calibri,'Trebuchet MS',sans-serif",
    docxFamily: "Calibri",
  },
  {
    value: "Georgia",
    label: "Georgia",
    previewFamily: "Georgia,'Times New Roman',serif",
    docxFamily: "Georgia",
  },
  {
    value: "Times New Roman",
    label: "Times New Roman",
    previewFamily: "'Times New Roman',Times,serif",
    docxFamily: "Times New Roman",
  },
  {
    value: "Helvetica",
    label: "Helvetica",
    previewFamily: "Helvetica,Arial,sans-serif",
    docxFamily: "Helvetica",
  },
] as const;

const fontFamilyLookup = new Map(FONT_FAMILY_OPTIONS.map((option) => [option.value, option]));

export function toPreviewFontFamily(fontFamily: string): string {
  return fontFamilyLookup.get(fontFamily)?.previewFamily ?? fontFamily;
}

export function toDocxFontFamily(fontFamily: string): string {
  return fontFamilyLookup.get(fontFamily)?.docxFamily ?? fontFamily;
}

export function resolveLayoutSettings(
  layoutSettings: LayoutSettings,
  template: TemplateId,
): ResolvedLayoutSettings {
  const theme = getTemplateTheme(template);
  const fieldTypography = layoutSettings.fieldTypography ?? DEFAULT_LAYOUT_FIELD_TYPOGRAPHY;
  const fieldSpacing = layoutSettings.fieldSpacing ?? DEFAULT_LAYOUT_FIELD_SPACING;

  return {
    top: layoutSettings.pageMarginTopPx,
    right: layoutSettings.pageMarginRightPx,
    bottom: layoutSettings.pageMarginBottomPx,
    left: layoutSettings.pageMarginLeftPx,
    typography: Object.fromEntries(
      TYPOGRAPHY_ROLES.map((role) => [
        role,
        {
          ...theme.typography[role],
          ...layoutSettings.typography[role],
        },
      ]),
    ) as ResolvedLayoutSettings["typography"],
    fieldTypography: Object.fromEntries(
      TYPOGRAPHY_FIELDS.map((field) => {
        const role = TYPOGRAPHY_FIELD_TO_ROLE[field];
        return [
          field,
          {
            ...theme.typography[role],
            ...layoutSettings.typography[role],
            ...fieldTypography[field],
          },
        ];
      }),
    ) as ResolvedLayoutSettings["fieldTypography"],
    fieldSpacing: Object.fromEntries(
      TYPOGRAPHY_FIELDS.map((field) => [
        field,
        {
          ...theme.fieldSpacing[field],
          ...fieldSpacing[field],
        },
      ]),
    ) as ResolvedLayoutSettings["fieldSpacing"],
  };
}

export function getPageMarginsPx(layoutSettings: ResolvedLayoutSettings): PageMarginsPx {
  return {
    top: layoutSettings.top,
    right: layoutSettings.right,
    bottom: layoutSettings.bottom,
    left: layoutSettings.left,
  };
}
