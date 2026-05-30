import {
  Document,
  Paragraph,
  TextRun,
  ExternalHyperlink,
  AlignmentType,
  BorderStyle,
  Packer,
  ShadingType,
} from "docx";
import { resolveLayoutSettings, toDocxFontFamily } from "./layoutSettings";
import type {
  ResumeData,
  ExportLabels,
  LayoutSettings,
  ResolvedTypographyRoleSettings,
  TemplateId,
} from "../types/resume";
import { defaultExportLabels, DEFAULT_LAYOUT_SETTINGS } from "../types/resume";
import { getTemplateTheme, type TemplateTheme } from "../templates/templateThemes";
import { ensureHttp } from "./utils";

interface RoleRunStyle {
  font: string;
  size: number;
  bold: boolean;
  italics: boolean;
}

function hexToDocxColor(hex: string): string {
  return hex.replace(/^#/, "").toUpperCase();
}

function roleRunOptions(settings: ResolvedTypographyRoleSettings): RoleRunStyle {
  return {
    font: toDocxFontFamily(settings.fontFamily),
    size: Math.round(settings.fontSizePx * 1.5),
    bold: settings.fontWeight >= 600,
    italics: settings.fontStyle === "italic",
  };
}

function themedTextRun(
  text: string,
  color: string,
  settings: ResolvedTypographyRoleSettings,
  overrides: Partial<RoleRunStyle> = {},
): TextRun {
  return new TextRun({
    text,
    color: hexToDocxColor(color),
    ...roleRunOptions(settings),
    ...overrides,
  });
}

function linkedRun(
  text: string,
  url: string,
  color: string,
  settings: ResolvedTypographyRoleSettings,
  overrides: Partial<RoleRunStyle> = {},
): ExternalHyperlink {
  return new ExternalHyperlink({
    children: [
      new TextRun({
        text,
        color: hexToDocxColor(color),
        ...roleRunOptions(settings),
        ...overrides,
      }),
    ],
    link: url,
  });
}

function themedBadgeRun(
  text: string,
  fill: string,
  color: string,
  settings: ResolvedTypographyRoleSettings,
): TextRun {
  return new TextRun({
    text: ` ${text} `,
    color: hexToDocxColor(color),
    shading: { fill: hexToDocxColor(fill), type: ShadingType.CLEAR },
    ...roleRunOptions(settings),
  });
}

function sectionHeading(
  title: string,
  theme: TemplateTheme,
  settings: ResolvedTypographyRoleSettings,
): Paragraph {
  const headingText = theme.section.uppercase ? title.toUpperCase() : title;

  return new Paragraph({
    children: [themedTextRun(headingText, theme.section.headingColor, settings)],
    spacing: { before: 200, after: 60 },
    border: {
      bottom: {
        style: theme.section.ruleWidth > 1 ? BorderStyle.THICK : BorderStyle.SINGLE,
        size: theme.section.ruleWidth > 1 ? 6 : 1,
        color: hexToDocxColor(theme.section.ruleColor),
      },
    },
  });
}

function headerShading(theme: TemplateTheme) {
  if (!theme.header.backgroundColor) return undefined;

  return {
    fill: hexToDocxColor(theme.header.backgroundColor),
    type: ShadingType.CLEAR,
  };
}

function dateRange(start: string, end: string): string {
  if (!start && !end) return "";
  return `${start}${start && end ? " – " : ""}${end}`;
}

export function buildDocxDocument(
  data: ResumeData,
  visibleIds: Set<string>,
  labels: ExportLabels = defaultExportLabels,
  template: TemplateId = "classic",
  layoutSettings: LayoutSettings = DEFAULT_LAYOUT_SETTINGS,
): Document {
  const children: Paragraph[] = [];
  const p = data.personal;
  const theme = getTemplateTheme(template);
  const headerFill = headerShading(theme);
  const resolvedLayoutSettings = resolveLayoutSettings(layoutSettings, template);
  const {
    body,
    contacts,
    entryTitle,
    meta,
    name,
    sectionHeading: sectionHeadingTypography,
    title,
  } = resolvedLayoutSettings.typography;

  if (visibleIds.has("personal")) {
    if (p.fullName) {
      children.push(
        new Paragraph({
          children: [themedTextRun(p.fullName, theme.header.nameColor, name)],
          alignment: AlignmentType.CENTER,
          spacing: { after: p.title ? 20 : 40 },
          shading: headerFill,
        }),
      );
    }
    if (p.title) {
      children.push(
        new Paragraph({
          children: [themedTextRun(p.title, theme.header.titleColor, title)],
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          shading: headerFill,
        }),
      );
    }
    const contactChildren: (TextRun | ExternalHyperlink)[] = [];
    const addSep = () => {
      if (contactChildren.length) {
        contactChildren.push(
          themedTextRun(theme.header.separator, theme.header.contactColor, contacts),
        );
      }
    };
    if (p.email) {
      addSep();
      contactChildren.push(linkedRun(p.email, `mailto:${p.email}`, theme.linkColor, contacts));
    }
    if (p.phone) {
      addSep();
      contactChildren.push(themedTextRun(p.phone, theme.header.contactColor, contacts));
    }
    if (p.location) {
      addSep();
      contactChildren.push(themedTextRun(p.location, theme.header.contactColor, contacts));
    }
    for (const link of p.links) {
      if (link.url) {
        addSep();
        contactChildren.push(
          linkedRun(link.label || link.url, ensureHttp(link.url), theme.linkColor, contacts),
        );
      }
    }
    if (contactChildren.length) {
      children.push(
        new Paragraph({
          children: contactChildren,
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          shading: headerFill,
        }),
      );
    }
  }

  for (const sec of data.sections) {
    if (!visibleIds.has(sec.id)) continue;
    if (sec.type === "personal") continue;

    switch (sec.type) {
      case "summary":
        if (data.summary) {
          children.push(sectionHeading(sec.title, theme, sectionHeadingTypography));
          children.push(
            new Paragraph({
              children: [themedTextRun(data.summary, theme.bodyColor, body)],
              spacing: { after: 120 },
            }),
          );
        }
        break;

      case "experience":
        if (data.experience.length) {
          children.push(sectionHeading(sec.title, theme, sectionHeadingTypography));
          for (const exp of data.experience) {
            const titleRuns: TextRun[] = [
              themedTextRun(exp.position, theme.entry.titleColor, entryTitle),
            ];
            const date = dateRange(exp.startDate, exp.current ? labels.present : exp.endDate);
            if (date) {
              titleRuns.push(themedTextRun(`\t${date}`, theme.entry.dateColor, meta));
            }
            children.push(
              new Paragraph({ children: titleRuns, spacing: { before: 80, after: 20 } }),
            );

            const sub = [exp.company, exp.location].filter(Boolean).join(" — ");
            if (sub) {
              children.push(
                new Paragraph({
                  children: [themedTextRun(sub, theme.entry.detailColor, meta)],
                  spacing: { after: 40 },
                }),
              );
            }

            for (const b of exp.bullets.filter((x) => x.trim())) {
              children.push(
                new Paragraph({
                  children: [themedTextRun(b, theme.bodyColor, body)],
                  bullet: { level: 0 },
                  spacing: { after: 20 },
                }),
              );
            }
          }
        }
        break;

      case "education":
        if (data.education.length) {
          children.push(sectionHeading(sec.title, theme, sectionHeadingTypography));
          for (const edu of data.education) {
            const degreeField = [edu.degree, edu.field].filter(Boolean).join(" in ");
            const titleRuns: TextRun[] = [
              themedTextRun(degreeField || edu.institution, theme.entry.titleColor, entryTitle),
            ];
            const date = dateRange(edu.startDate, edu.endDate);
            if (date) {
              titleRuns.push(themedTextRun(`\t${date}`, theme.entry.dateColor, meta));
            }
            children.push(
              new Paragraph({ children: titleRuns, spacing: { before: 80, after: 20 } }),
            );

            if (degreeField && edu.institution) {
              const instText = edu.gpa
                ? `${edu.institution} — ${labels.gpa}: ${edu.gpa}`
                : edu.institution;
              children.push(
                new Paragraph({
                  children: [themedTextRun(instText, theme.entry.detailColor, meta)],
                  spacing: { after: 40 },
                }),
              );
            }
          }
        }
        break;

      case "skills":
        if (data.skills.some((g) => g.items.some(Boolean))) {
          children.push(sectionHeading(sec.title, theme, sectionHeadingTypography));
          for (const group of data.skills) {
            const items = group.items.filter(Boolean);
            if (!items.length) continue;
            if (
              template === "modern" &&
              theme.skills.badgeBackgroundColor &&
              theme.skills.badgeTextColor
            ) {
              if (group.name) {
                children.push(
                  new Paragraph({
                    children: [themedTextRun(group.name, theme.entry.titleColor, entryTitle)],
                    spacing: { after: 20 },
                  }),
                );
              }

              const runs: TextRun[] = [];
              for (let i = 0; i < items.length; i++) {
                if (i > 0) runs.push(new TextRun({ text: "  ", ...roleRunOptions(body) }));
                runs.push(
                  themedBadgeRun(
                    items[i],
                    theme.skills.badgeBackgroundColor,
                    theme.skills.badgeTextColor,
                    body,
                  ),
                );
              }
              children.push(new Paragraph({ children: runs, spacing: { after: 40 } }));
            } else {
              const runs: TextRun[] = [];
              if (group.name) {
                runs.push(themedTextRun(`${group.name}: `, theme.entry.titleColor, entryTitle));
              }
              runs.push(themedTextRun(items.join(theme.skills.delimiter), theme.bodyColor, body));
              children.push(new Paragraph({ children: runs, spacing: { after: 40 } }));
            }
          }
        }
        break;

      case "languages":
        if (data.languages.length) {
          children.push(sectionHeading(sec.title, theme, sectionHeadingTypography));
          if (
            template === "modern" &&
            theme.languages.badgeBackgroundColor &&
            theme.languages.badgeTextColor
          ) {
            const runs: TextRun[] = [];
            const items = data.languages.map((lang) =>
              lang.proficiency ? `${lang.language} · ${lang.proficiency}` : lang.language,
            );
            for (let i = 0; i < items.length; i++) {
              if (i > 0) runs.push(new TextRun({ text: "  ", ...roleRunOptions(body) }));
              runs.push(
                themedBadgeRun(
                  items[i],
                  theme.languages.badgeBackgroundColor,
                  theme.languages.badgeTextColor,
                  body,
                ),
              );
            }
            children.push(new Paragraph({ children: runs, spacing: { after: 40 } }));
          } else {
            const text = data.languages
              .map((lang) =>
                lang.proficiency ? `${lang.language} (${lang.proficiency})` : lang.language,
              )
              .join(theme.languages.delimiter);
            children.push(
              new Paragraph({
                children: [themedTextRun(text, theme.bodyColor, body)],
                spacing: { after: 20 },
              }),
            );
          }
        }
        break;

      case "certifications":
        if (data.certifications.length) {
          children.push(sectionHeading(sec.title, theme, sectionHeadingTypography));
          for (const cert of data.certifications) {
            const certChildren: (TextRun | ExternalHyperlink)[] = [];
            if (cert.url) {
              certChildren.push(
                linkedRun(cert.name, ensureHttp(cert.url), theme.linkColor, entryTitle),
              );
            } else {
              certChildren.push(themedTextRun(cert.name, theme.entry.titleColor, entryTitle));
            }
            if (cert.issuer)
              certChildren.push(themedTextRun(` — ${cert.issuer}`, theme.entry.detailColor, meta));
            if (cert.date)
              certChildren.push(themedTextRun(` — ${cert.date}`, theme.entry.dateColor, meta));
            children.push(new Paragraph({ children: certChildren, spacing: { after: 40 } }));
          }
        }
        break;

      case "projects":
        if (data.projects.length) {
          children.push(sectionHeading(sec.title, theme, sectionHeadingTypography));
          for (const proj of data.projects) {
            const nameChildren: (TextRun | ExternalHyperlink)[] = proj.url
              ? [
                  new ExternalHyperlink({
                    children: [
                      new TextRun({
                        text: proj.name,
                        color: hexToDocxColor(theme.linkColor),
                        ...roleRunOptions(entryTitle),
                      }),
                    ],
                    link: ensureHttp(proj.url),
                  }),
                ]
              : [themedTextRun(proj.name, theme.entry.titleColor, entryTitle)];
            children.push(
              new Paragraph({ children: nameChildren, spacing: { before: 80, after: 20 } }),
            );
            if (proj.description) {
              children.push(
                new Paragraph({
                  children: [themedTextRun(proj.description, theme.bodyColor, body)],
                  spacing: { after: 20 },
                }),
              );
            }
            if (proj.technologies) {
              children.push(
                new Paragraph({
                  children: [
                    themedTextRun(
                      `Technologies: ${proj.technologies}`,
                      theme.entry.detailColor,
                      meta,
                    ),
                  ],
                  spacing: { after: 20 },
                }),
              );
            }
          }
        }
        break;

      case "volunteer":
        if (data.volunteer.length) {
          children.push(sectionHeading(sec.title, theme, sectionHeadingTypography));
          for (const vol of data.volunteer) {
            const titleRuns: TextRun[] = [
              themedTextRun(vol.role, theme.entry.titleColor, entryTitle),
            ];
            const date = dateRange(vol.startDate, vol.endDate);
            if (date) {
              titleRuns.push(themedTextRun(`\t${date}`, theme.entry.dateColor, meta));
            }
            children.push(
              new Paragraph({ children: titleRuns, spacing: { before: 80, after: 20 } }),
            );
            if (vol.organization) {
              children.push(
                new Paragraph({
                  children: [themedTextRun(vol.organization, theme.entry.detailColor, meta)],
                  spacing: { after: 20 },
                }),
              );
            }
            if (vol.description) {
              children.push(
                new Paragraph({
                  children: [themedTextRun(vol.description, theme.bodyColor, body)],
                  spacing: { after: 40 },
                }),
              );
            }
          }
        }
        break;

      case "custom": {
        const entries = data.customSections[sec.id] ?? [];
        if (entries.length) {
          children.push(sectionHeading(sec.title, theme, sectionHeadingTypography));
          for (const entry of entries) {
            if (entry.title) {
              children.push(
                new Paragraph({
                  children: [themedTextRun(entry.title, theme.entry.titleColor, entryTitle)],
                  spacing: { after: 20 },
                }),
              );
            }
            if (entry.description) {
              children.push(
                new Paragraph({
                  children: [themedTextRun(entry.description, theme.bodyColor, body)],
                  spacing: { after: 40 },
                }),
              );
            }
          }
        }
        break;
      }
    }
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: toDocxFontFamily(body.fontFamily) },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: Math.round(resolvedLayoutSettings.top * 15),
              right: Math.round(resolvedLayoutSettings.right * 15),
              bottom: Math.round(resolvedLayoutSettings.bottom * 15),
              left: Math.round(resolvedLayoutSettings.left * 15),
            },
          },
        },
        children,
      },
    ],
  });
}

export async function generateDocxBlob(
  data: ResumeData,
  visibleIds: Set<string>,
  labels: ExportLabels = defaultExportLabels,
  template: TemplateId = "classic",
  layoutSettings: LayoutSettings = DEFAULT_LAYOUT_SETTINGS,
): Promise<Blob> {
  const doc = buildDocxDocument(data, visibleIds, labels, template, layoutSettings);
  return Packer.toBlob(doc);
}
