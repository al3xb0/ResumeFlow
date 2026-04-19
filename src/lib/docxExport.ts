import {
  Document,
  Paragraph,
  TextRun,
  ExternalHyperlink,
  AlignmentType,
  BorderStyle,
  Packer,
} from "docx";
import type { ResumeData, ExportLabels, TemplateId } from "../types/resume";
import { defaultExportLabels } from "../types/resume";
import { ensureHttp } from "./utils";

const TEMPLATE_DOCX_FONTS: Record<TemplateId, string> = {
  classic: "Segoe UI",
  modern: "Segoe UI",
  minimal: "Georgia",
};
const LINK_COLOR = "2563EB";

function linkedRun(text: string, url: string, size = 19): ExternalHyperlink {
  return new ExternalHyperlink({
    children: [new TextRun({ text, color: LINK_COLOR, size })],
    link: url,
  });
}

function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 22, color: "111111" })],
    spacing: { before: 200, after: 60 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
    },
  });
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
): Document {
  const children: Paragraph[] = [];
  const p = data.personal;

  if (visibleIds.has("personal")) {
    if (p.fullName) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: p.fullName, bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
        }),
      );
    }
    if (p.title) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: p.title, size: 22, color: "555555" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }),
      );
    }
    const contactChildren: (TextRun | ExternalHyperlink)[] = [];
    const addSep = () => {
      if (contactChildren.length) {
        contactChildren.push(new TextRun({ text: "  |  ", size: 18, color: "666666" }));
      }
    };
    if (p.email) {
      addSep();
      contactChildren.push(linkedRun(p.email, `mailto:${p.email}`, 18));
    }
    if (p.phone) {
      addSep();
      contactChildren.push(new TextRun({ text: p.phone, size: 18, color: "666666" }));
    }
    if (p.location) {
      addSep();
      contactChildren.push(new TextRun({ text: p.location, size: 18, color: "666666" }));
    }
    for (const link of p.links) {
      if (link.url) {
        addSep();
        contactChildren.push(linkedRun(link.label || link.url, ensureHttp(link.url), 18));
      }
    }
    if (contactChildren.length) {
      children.push(
        new Paragraph({
          children: contactChildren,
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
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
          children.push(sectionHeading(sec.title));
          children.push(
            new Paragraph({
              children: [new TextRun({ text: data.summary, size: 20 })],
              spacing: { after: 120 },
            }),
          );
        }
        break;

      case "experience":
        if (data.experience.length) {
          children.push(sectionHeading(sec.title));
          for (const exp of data.experience) {
            const titleRuns: TextRun[] = [
              new TextRun({ text: exp.position, bold: true, size: 21 }),
            ];
            const date = dateRange(exp.startDate, exp.current ? labels.present : exp.endDate);
            if (date) {
              titleRuns.push(new TextRun({ text: `\t${date}`, size: 18, color: "666666" }));
            }
            children.push(
              new Paragraph({ children: titleRuns, spacing: { before: 80, after: 20 } }),
            );

            const sub = [exp.company, exp.location].filter(Boolean).join(" — ");
            if (sub) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: sub, size: 19, color: "555555" })],
                  spacing: { after: 40 },
                }),
              );
            }

            for (const b of exp.bullets.filter((x) => x.trim())) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: b, size: 19 })],
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
          children.push(sectionHeading(sec.title));
          for (const edu of data.education) {
            const degreeField = [edu.degree, edu.field].filter(Boolean).join(" in ");
            const titleRuns: TextRun[] = [
              new TextRun({ text: degreeField || edu.institution, bold: true, size: 21 }),
            ];
            const date = dateRange(edu.startDate, edu.endDate);
            if (date) {
              titleRuns.push(new TextRun({ text: `\t${date}`, size: 18, color: "666666" }));
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
                  children: [new TextRun({ text: instText, size: 19, color: "555555" })],
                  spacing: { after: 40 },
                }),
              );
            }
          }
        }
        break;

      case "skills":
        if (data.skills.some((g) => g.items.some(Boolean))) {
          children.push(sectionHeading(sec.title));
          for (const group of data.skills) {
            const items = group.items.filter(Boolean);
            if (!items.length) continue;
            const runs: TextRun[] = [];
            if (group.name) {
              runs.push(new TextRun({ text: `${group.name}: `, bold: true, size: 19 }));
            }
            runs.push(new TextRun({ text: items.join(", "), size: 19 }));
            children.push(new Paragraph({ children: runs, spacing: { after: 40 } }));
          }
        }
        break;

      case "languages":
        if (data.languages.length) {
          children.push(sectionHeading(sec.title));
          for (const lang of data.languages) {
            const txt = lang.proficiency ? `${lang.language} — ${lang.proficiency}` : lang.language;
            children.push(
              new Paragraph({
                children: [new TextRun({ text: txt, size: 19 })],
                spacing: { after: 20 },
              }),
            );
          }
        }
        break;

      case "certifications":
        if (data.certifications.length) {
          children.push(sectionHeading(sec.title));
          for (const cert of data.certifications) {
            const certChildren: (TextRun | ExternalHyperlink)[] = [];
            if (cert.url) {
              certChildren.push(linkedRun(cert.name, ensureHttp(cert.url)));
            } else {
              certChildren.push(new TextRun({ text: cert.name, size: 19 }));
            }
            if (cert.issuer)
              certChildren.push(new TextRun({ text: ` — ${cert.issuer}`, size: 19 }));
            if (cert.date) certChildren.push(new TextRun({ text: ` — ${cert.date}`, size: 19 }));
            children.push(new Paragraph({ children: certChildren, spacing: { after: 40 } }));
          }
        }
        break;

      case "projects":
        if (data.projects.length) {
          children.push(sectionHeading(sec.title));
          for (const proj of data.projects) {
            const nameChildren: (TextRun | ExternalHyperlink)[] = proj.url
              ? [
                  new ExternalHyperlink({
                    children: [
                      new TextRun({ text: proj.name, bold: true, color: LINK_COLOR, size: 21 }),
                    ],
                    link: ensureHttp(proj.url),
                  }),
                ]
              : [new TextRun({ text: proj.name, bold: true, size: 21 })];
            children.push(
              new Paragraph({ children: nameChildren, spacing: { before: 80, after: 20 } }),
            );
            if (proj.description) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: proj.description, size: 19 })],
                  spacing: { after: 20 },
                }),
              );
            }
            if (proj.technologies) {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Technologies: ${proj.technologies}`,
                      size: 19,
                      italics: true,
                    }),
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
          children.push(sectionHeading(sec.title));
          for (const vol of data.volunteer) {
            const titleRuns: TextRun[] = [new TextRun({ text: vol.role, bold: true, size: 21 })];
            const date = dateRange(vol.startDate, vol.endDate);
            if (date) {
              titleRuns.push(new TextRun({ text: `\t${date}`, size: 18, color: "666666" }));
            }
            children.push(
              new Paragraph({ children: titleRuns, spacing: { before: 80, after: 20 } }),
            );
            if (vol.organization) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: vol.organization, size: 19, color: "555555" })],
                  spacing: { after: 20 },
                }),
              );
            }
            if (vol.description) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: vol.description, size: 19 })],
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
          children.push(sectionHeading(sec.title));
          for (const entry of entries) {
            if (entry.title) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: entry.title, bold: true, size: 20 })],
                  spacing: { after: 20 },
                }),
              );
            }
            if (entry.description) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: entry.description, size: 19 })],
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
          run: { font: TEMPLATE_DOCX_FONTS[template] },
        },
      },
    },
    sections: [{ children }],
  });
}

export async function generateDocxBlob(
  data: ResumeData,
  visibleIds: Set<string>,
  labels: ExportLabels = defaultExportLabels,
  template: TemplateId = "classic",
): Promise<Blob> {
  const doc = buildDocxDocument(data, visibleIds, labels, template);
  return Packer.toBlob(doc);
}
