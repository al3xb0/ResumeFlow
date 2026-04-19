import type {
  TDocumentDefinitions,
  Content,
  ContentColumns,
  ContentText,
} from "pdfmake/interfaces";
import type { ResumeData, ExportLabels } from "../types/resume";
import { defaultExportLabels } from "../types/resume";
import { ensureHttp } from "./utils";

const LINK_COLOR = "#2563eb";
const SEPARATOR = "  |  ";
const CONTENT_WIDTH = 499;

function linkText(text: string, url: string): ContentText {
  return { text, link: url, color: LINK_COLOR };
}

export function buildPdfDefinition(
  data: ResumeData,
  visibleIds: Set<string>,
  labels: ExportLabels = defaultExportLabels,
): TDocumentDefinitions {
  const content: Content[] = [];
  const p = data.personal;

  if (visibleIds.has("personal")) {
    if (p.fullName) {
      content.push({
        text: p.fullName,
        style: "name",
        alignment: "center",
      });
    }
    if (p.title) {
      content.push({
        text: p.title,
        style: "subtitle",
        alignment: "center",
        margin: [0, 1, 0, 4],
      });
    }

    const contactSegments: ContentText[] = [];
    if (p.email) contactSegments.push(linkText(p.email, `mailto:${p.email}`));
    if (p.phone) contactSegments.push({ text: p.phone });
    if (p.location) contactSegments.push({ text: p.location });
    for (const link of p.links) {
      if (link.url) contactSegments.push(linkText(link.label || link.url, ensureHttp(link.url)));
    }
    if (contactSegments.length) {
      const inline: ContentText[] = [];
      for (let i = 0; i < contactSegments.length; i++) {
        if (i > 0) inline.push({ text: SEPARATOR });
        inline.push(contactSegments[i]);
      }
      content.push({ text: inline, style: "contact", alignment: "center" } as Content);
    }

    content.push({
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 4,
          x2: CONTENT_WIDTH,
          y2: 4,
          lineWidth: 1.2,
          lineColor: "#222222",
        },
      ],
      margin: [0, 4, 0, 6],
    });
  }

  for (const sec of data.sections) {
    if (!visibleIds.has(sec.id)) continue;
    if (sec.type === "personal") continue;

    switch (sec.type) {
      case "summary":
        if (data.summary) {
          content.push(sectionHeader(sec.title));
          content.push({ text: data.summary, style: "body", margin: [0, 0, 0, 6] });
        }
        break;

      case "experience":
        if (data.experience.length) {
          content.push(sectionHeader(sec.title));
          for (const exp of data.experience) {
            const line1: ContentColumns = {
              columns: [
                { text: exp.position, style: "entryTitle", width: "*" },
                {
                  text: dateRange(exp.startDate, exp.current ? labels.present : exp.endDate),
                  style: "date",
                  width: "auto",
                  alignment: "right",
                },
              ],
              margin: [0, 0, 0, 1],
            };
            content.push(line1);

            const subParts: string[] = [];
            if (exp.company) subParts.push(exp.company);
            if (exp.location) subParts.push(exp.location);
            if (subParts.length) {
              content.push({ text: subParts.join(" — "), style: "entrySub", margin: [0, 0, 0, 3] });
            }

            const bullets = exp.bullets.filter((b) => b.trim());
            if (bullets.length) {
              content.push({
                ul: bullets.map((b) => ({ text: b, style: "body" })),
                margin: [10, 0, 0, 4],
              } as Content);
            }
          }
        }
        break;

      case "education":
        if (data.education.length) {
          content.push(sectionHeader(sec.title));
          for (const edu of data.education) {
            const degreeField = [edu.degree, edu.field].filter(Boolean).join(" in ");
            const line1: ContentColumns = {
              columns: [
                { text: degreeField || edu.institution, style: "entryTitle", width: "*" },
                {
                  text: dateRange(edu.startDate, edu.endDate),
                  style: "date",
                  width: "auto",
                  alignment: "right",
                },
              ],
              margin: [0, 0, 0, 1],
            };
            content.push(line1);
            if (degreeField && edu.institution) {
              content.push({ text: edu.institution, style: "entrySub", margin: [0, 0, 0, 2] });
            }
            if (edu.gpa) {
              content.push({
                text: `${labels.gpa}: ${edu.gpa}`,
                style: "body",
                margin: [0, 0, 0, 3],
              });
            }
          }
        }
        break;

      case "skills":
        if (data.skills.some((g) => g.items.some(Boolean))) {
          content.push(sectionHeader(sec.title));
          for (const group of data.skills) {
            const items = group.items.filter(Boolean);
            if (items.length) {
              if (group.name) {
                content.push({
                  text: [{ text: `${group.name}: `, bold: true }, { text: items.join(", ") }],
                  style: "body",
                  margin: [0, 0, 0, 4],
                } as Content);
              } else {
                content.push({ text: items.join(", "), style: "body", margin: [0, 0, 0, 4] });
              }
            }
          }
        }
        break;

      case "languages":
        if (data.languages.length) {
          content.push(sectionHeader(sec.title));
          for (const lang of data.languages) {
            const txt = lang.proficiency ? `${lang.language} — ${lang.proficiency}` : lang.language;
            content.push({ text: txt, style: "body", margin: [0, 0, 0, 2] });
          }
        }
        break;

      case "certifications":
        if (data.certifications.length) {
          content.push(sectionHeader(sec.title));
          for (const cert of data.certifications) {
            const parts: ContentText[] = [];
            if (cert.url) {
              parts.push(linkText(cert.name, ensureHttp(cert.url)));
            } else {
              parts.push({ text: cert.name });
            }
            if (cert.issuer) parts.push({ text: ` — ${cert.issuer}` });
            if (cert.date) parts.push({ text: ` — ${cert.date}` });
            content.push({ text: parts, style: "body", margin: [0, 0, 0, 2] } as Content);
          }
        }
        break;

      case "projects":
        if (data.projects.length) {
          content.push(sectionHeader(sec.title));
          for (const proj of data.projects) {
            const nameContent: ContentText[] = proj.url
              ? [linkText(proj.name, ensureHttp(proj.url))]
              : [{ text: proj.name }];
            content.push({
              text: nameContent,
              style: "entryTitle",
              margin: [0, 0, 0, 1],
            } as Content);
            if (proj.description) {
              content.push({ text: proj.description, style: "body", margin: [0, 0, 0, 2] });
            }
            if (proj.technologies) {
              content.push({
                text: `Technologies: ${proj.technologies}`,
                style: "body",
                italics: true,
                margin: [0, 0, 0, 2],
              });
            }
          }
        }
        break;

      case "volunteer":
        if (data.volunteer.length) {
          content.push(sectionHeader(sec.title));
          for (const vol of data.volunteer) {
            const line1: ContentColumns = {
              columns: [
                { text: vol.role, style: "entryTitle", width: "*" },
                {
                  text: dateRange(vol.startDate, vol.endDate),
                  style: "date",
                  width: "auto",
                  alignment: "right",
                },
              ],
              margin: [0, 0, 0, 1],
            };
            content.push(line1);
            if (vol.organization) {
              content.push({ text: vol.organization, style: "entrySub", margin: [0, 0, 0, 2] });
            }
            if (vol.description) {
              content.push({ text: vol.description, style: "body", margin: [0, 0, 0, 3] });
            }
          }
        }
        break;

      case "custom": {
        const entries = data.customSections[sec.id] ?? [];
        if (entries.length) {
          content.push(sectionHeader(sec.title));
          for (const entry of entries) {
            if (entry.title) {
              content.push({ text: entry.title, style: "entryTitle", margin: [0, 0, 0, 1] });
            }
            if (entry.description) {
              content.push({ text: entry.description, style: "body", margin: [0, 0, 0, 4] });
            }
          }
        }
        break;
      }
    }
  }

  return {
    pageSize: "A4",
    pageMargins: [48, 40, 48, 40],
    content,
    defaultStyle: {
      font: "Roboto",
      fontSize: 9.5,
      lineHeight: 1.2,
      color: "#222222",
    },
    styles: {
      name: { fontSize: 20, bold: true, color: "#111111" },
      subtitle: { fontSize: 11, color: "#555555" },
      contact: { fontSize: 8, color: "#666666" },
      sectionHeader: { fontSize: 11, bold: true, color: "#111111", margin: [0, 6, 0, 3] },
      entryTitle: { fontSize: 10, bold: true, color: "#222222" },
      entrySub: { fontSize: 9, color: "#555555", italics: true },
      date: { fontSize: 8.5, color: "#666666" },
      body: { fontSize: 9.5, color: "#333333" },
    },
  };
}

function sectionHeader(title: string): Content {
  return {
    stack: [
      { text: title.toUpperCase(), style: "sectionHeader" },
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: CONTENT_WIDTH,
            y2: 0,
            lineWidth: 0.7,
            lineColor: "#cccccc",
          },
        ],
        margin: [0, 0, 0, 4],
      },
    ],
  };
}

function dateRange(start: string, end: string): string {
  if (!start && !end) return "";
  if (start && end) return `${start} – ${end}`;
  return start || end;
}
