import type { ResumeData, ExportLabels } from "../types/resume";
import { defaultExportLabels } from "../types/resume";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linkify(url: string, label?: string): string {
  if (!url) return "";
  const href = /^https?:\/\/|^mailto:/i.test(url) ? url : `https://${url}`;
  return `<a href="${esc(href)}" style="color:#2563eb;text-decoration:none">${esc(label ?? url)}</a>`;
}

/* ── Classic Template ── */
export function renderClassic(
  data: ResumeData,
  visibleIds: Set<string>,
  labels: ExportLabels = defaultExportLabels,
): string {
  const p = data.personal;
  const parts: string[] = [];

  parts.push(
    `<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#222;line-height:1.5;max-width:800px;margin:0 auto">`,
  );

  if (visibleIds.has("personal")) {
    parts.push(`<div style="text-align:center;margin-bottom:16px">`);
    if (p.fullName)
      parts.push(
        `<h1 style="font-size:22pt;font-weight:700;margin:0;color:#111">${esc(p.fullName)}</h1>`,
      );
    if (p.title)
      parts.push(`<p style="font-size:12pt;color:#555;margin:4px 0 8px">${esc(p.title)}</p>`);
    const contact: string[] = [];
    if (p.email) contact.push(linkify(`mailto:${p.email}`, p.email));
    if (p.phone) contact.push(esc(p.phone));
    if (p.location) contact.push(esc(p.location));
    for (const link of p.links) {
      if (link.url) contact.push(linkify(link.url, link.label || link.url));
    }
    if (contact.length)
      parts.push(
        `<p style="font-size:9pt;color:#666;margin:0">${contact.join(" &nbsp;|&nbsp; ")}</p>`,
      );
    parts.push(`</div>`);
    parts.push(`<hr style="border:none;border-top:1.5px solid #222;margin:0 0 12px"/>`);
  }

  for (const sec of data.sections) {
    if (!sec.visible || !visibleIds.has(sec.id)) continue;
    if (sec.type === "personal") continue;

    if (sec.type === "summary" && data.summary) {
      parts.push(sectionHeading(sec.title));
      parts.push(`<p style="font-size:10pt;margin:0 0 12px;color:#333">${esc(data.summary)}</p>`);
    }

    if (sec.type === "experience" && data.experience.length) {
      parts.push(sectionHeading(sec.title));
      for (const exp of data.experience) {
        parts.push(`<div style="margin-bottom:10px">`);
        parts.push(`<div style="display:flex;justify-content:space-between;align-items:baseline">`);
        parts.push(`<strong style="font-size:10.5pt">${esc(exp.position)}</strong>`);
        const dateStr =
          exp.startDate || exp.endDate
            ? `${esc(exp.startDate)} – ${exp.current ? esc(labels.present) : esc(exp.endDate)}`
            : "";
        if (dateStr) parts.push(`<span style="font-size:9pt;color:#666">${dateStr}</span>`);
        parts.push(`</div>`);
        const sub: string[] = [];
        if (exp.company) sub.push(esc(exp.company));
        if (exp.location) sub.push(esc(exp.location));
        if (sub.length)
          parts.push(
            `<p style="font-size:9.5pt;color:#555;margin:1px 0 4px">${sub.join(" — ")}</p>`,
          );
        const bullets = exp.bullets.filter((b) => b.trim());
        if (bullets.length) {
          parts.push(`<ul style="margin:2px 0 0;padding-left:18px;font-size:9.5pt;color:#333">`);
          for (const b of bullets) parts.push(`<li style="margin-bottom:2px">${esc(b)}</li>`);
          parts.push(`</ul>`);
        }
        parts.push(`</div>`);
      }
    }

    if (sec.type === "education" && data.education.length) {
      parts.push(sectionHeading(sec.title));
      for (const edu of data.education) {
        parts.push(`<div style="margin-bottom:8px">`);
        parts.push(`<div style="display:flex;justify-content:space-between;align-items:baseline">`);
        const degreeField = [edu.degree, edu.field].filter(Boolean).join(" in ");
        parts.push(`<strong style="font-size:10.5pt">${esc(degreeField)}</strong>`);
        const dateStr =
          edu.startDate || edu.endDate ? `${esc(edu.startDate)} – ${esc(edu.endDate)}` : "";
        if (dateStr) parts.push(`<span style="font-size:9pt;color:#666">${dateStr}</span>`);
        parts.push(`</div>`);
        if (edu.institution)
          parts.push(
            `<p style="font-size:9.5pt;color:#555;margin:1px 0">${esc(edu.institution)}${edu.gpa ? ` — ${esc(labels.gpa)}: ${esc(edu.gpa)}` : ""}</p>`,
          );
        parts.push(`</div>`);
      }
    }

    if (sec.type === "skills" && data.skills.some((g) => g.items.some(Boolean))) {
      parts.push(sectionHeading(sec.title));
      for (const group of data.skills) {
        const items = group.items.filter(Boolean);
        if (items.length) {
          if (group.name) {
            parts.push(
              `<p style="font-size:9.5pt;color:#333;margin:0 0 4px"><strong>${esc(group.name)}:</strong> ${items.map(esc).join(", ")}</p>`,
            );
          } else {
            parts.push(
              `<p style="font-size:9.5pt;color:#333;margin:0 0 4px">${items.map(esc).join(", ")}</p>`,
            );
          }
        }
      }
      parts.push(`<div style="margin-bottom:8px"></div>`);
    }

    if (sec.type === "languages" && data.languages.length) {
      parts.push(sectionHeading(sec.title));
      parts.push(
        `<p style="font-size:9.5pt;color:#333;margin:0 0 12px">${data.languages.map((l) => `${esc(l.language)}${l.proficiency ? ` (${esc(l.proficiency)})` : ""}`).join(", ")}</p>`,
      );
    }

    if (sec.type === "certifications" && data.certifications.length) {
      parts.push(sectionHeading(sec.title));
      for (const cert of data.certifications) {
        parts.push(`<div style="margin-bottom:6px">`);
        const nameStr = cert.url
          ? linkify(cert.url, cert.name)
          : `<strong style="font-size:10pt">${esc(cert.name)}</strong>`;
        parts.push(nameStr);
        const meta: string[] = [];
        if (cert.issuer) meta.push(esc(cert.issuer));
        if (cert.date) meta.push(esc(cert.date));
        if (meta.length)
          parts.push(`<p style="font-size:9pt;color:#666;margin:1px 0">${meta.join(" — ")}</p>`);
        parts.push(`</div>`);
      }
    }

    if (sec.type === "projects" && data.projects.length) {
      parts.push(sectionHeading(sec.title));
      for (const proj of data.projects) {
        parts.push(`<div style="margin-bottom:8px">`);
        const nameStr = proj.url
          ? linkify(proj.url, proj.name)
          : `<strong style="font-size:10.5pt">${esc(proj.name)}</strong>`;
        parts.push(nameStr);
        if (proj.technologies)
          parts.push(
            `<p style="font-size:9pt;color:#555;margin:1px 0">${esc(proj.technologies)}</p>`,
          );
        if (proj.description)
          parts.push(
            `<p style="font-size:9.5pt;color:#333;margin:2px 0">${esc(proj.description)}</p>`,
          );
        parts.push(`</div>`);
      }
    }

    if (sec.type === "volunteer" && data.volunteer.length) {
      parts.push(sectionHeading(sec.title));
      for (const vol of data.volunteer) {
        parts.push(`<div style="margin-bottom:8px">`);
        parts.push(`<div style="display:flex;justify-content:space-between;align-items:baseline">`);
        parts.push(`<strong style="font-size:10.5pt">${esc(vol.role)}</strong>`);
        const dateStr =
          vol.startDate || vol.endDate ? `${esc(vol.startDate)} – ${esc(vol.endDate)}` : "";
        if (dateStr) parts.push(`<span style="font-size:9pt;color:#666">${dateStr}</span>`);
        parts.push(`</div>`);
        if (vol.organization)
          parts.push(
            `<p style="font-size:9.5pt;color:#555;margin:1px 0 4px">${esc(vol.organization)}</p>`,
          );
        if (vol.description)
          parts.push(
            `<p style="font-size:9.5pt;color:#333;margin:2px 0">${esc(vol.description)}</p>`,
          );
        parts.push(`</div>`);
      }
    }

    if (sec.type === "custom") {
      const entries = data.customSections[sec.id] ?? [];
      if (entries.length) {
        parts.push(sectionHeading(sec.title));
        for (const entry of entries) {
          parts.push(`<div style="margin-bottom:6px">`);
          if (entry.title)
            parts.push(`<strong style="font-size:10pt">${esc(entry.title)}</strong>`);
          if (entry.description)
            parts.push(
              `<p style="font-size:9.5pt;color:#333;margin:2px 0">${esc(entry.description)}</p>`,
            );
          parts.push(`</div>`);
        }
      }
    }
  }

  parts.push(`</div>`);
  return parts.join("");
}

function sectionHeading(title: string): string {
  return `<h2 style="font-size:12pt;font-weight:600;color:#111;margin:14px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px">${esc(title)}</h2>`;
}

/* ── Modern Template ── */
export function renderModern(
  data: ResumeData,
  visibleIds: Set<string>,
  labels: ExportLabels = defaultExportLabels,
): string {
  const p = data.personal;
  const parts: string[] = [];

  parts.push(
    `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;line-height:1.55;max-width:800px;margin:0 auto">`,
  );

  if (visibleIds.has("personal")) {
    parts.push(`<div style="background:#1e293b;color:#fff;padding:24px 28px;margin:-1px -1px 0">`);
    if (p.fullName)
      parts.push(
        `<h1 style="font-size:24pt;font-weight:700;margin:0;letter-spacing:0.5px">${esc(p.fullName)}</h1>`,
      );
    if (p.title)
      parts.push(
        `<p style="font-size:11pt;color:#94a3b8;margin:4px 0 10px;font-weight:300">${esc(p.title)}</p>`,
      );
    const contact: string[] = [];
    if (p.email)
      contact.push(
        `<a href="mailto:${esc(p.email)}" style="color:#93c5fd;text-decoration:none">${esc(p.email)}</a>`,
      );
    if (p.phone) contact.push(esc(p.phone));
    if (p.location) contact.push(esc(p.location));
    for (const link of p.links) {
      if (link.url) {
        const href = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`;
        contact.push(
          `<a href="${esc(href)}" style="color:#93c5fd;text-decoration:none">${esc(link.label || link.url)}</a>`,
        );
      }
    }
    if (contact.length)
      parts.push(
        `<p style="font-size:9pt;color:#cbd5e1;margin:0">${contact.join(" &nbsp;&bull;&nbsp; ")}</p>`,
      );
    parts.push(`</div>`);
  }

  parts.push(`<div style="padding:16px 28px 24px">`);

  for (const sec of data.sections) {
    if (!sec.visible || !visibleIds.has(sec.id)) continue;
    if (sec.type === "personal") continue;

    if (sec.type === "summary" && data.summary) {
      parts.push(modernHeading(sec.title));
      parts.push(
        `<p style="font-size:10pt;color:#374151;margin:0 0 14px">${esc(data.summary)}</p>`,
      );
    }

    if (sec.type === "experience" && data.experience.length) {
      parts.push(modernHeading(sec.title));
      for (const exp of data.experience) {
        parts.push(
          `<div style="margin-bottom:12px;padding-left:12px;border-left:3px solid #3b82f6">`,
        );
        parts.push(`<div style="display:flex;justify-content:space-between;align-items:baseline">`);
        parts.push(`<strong style="font-size:10.5pt;color:#111">${esc(exp.position)}</strong>`);
        const dateStr =
          exp.startDate || exp.endDate
            ? `${esc(exp.startDate)} – ${exp.current ? esc(labels.present) : esc(exp.endDate)}`
            : "";
        if (dateStr) parts.push(`<span style="font-size:9pt;color:#6b7280">${dateStr}</span>`);
        parts.push(`</div>`);
        const sub: string[] = [];
        if (exp.company) sub.push(esc(exp.company));
        if (exp.location) sub.push(esc(exp.location));
        if (sub.length)
          parts.push(
            `<p style="font-size:9.5pt;color:#3b82f6;margin:1px 0 4px;font-weight:500">${sub.join(" — ")}</p>`,
          );
        const bullets = exp.bullets.filter((b) => b.trim());
        if (bullets.length) {
          parts.push(`<ul style="margin:3px 0 0;padding-left:16px;font-size:9.5pt;color:#374151">`);
          for (const b of bullets) parts.push(`<li style="margin-bottom:2px">${esc(b)}</li>`);
          parts.push(`</ul>`);
        }
        parts.push(`</div>`);
      }
    }

    if (sec.type === "education" && data.education.length) {
      parts.push(modernHeading(sec.title));
      for (const edu of data.education) {
        parts.push(
          `<div style="margin-bottom:8px;padding-left:12px;border-left:3px solid #3b82f6">`,
        );
        const degreeField = [edu.degree, edu.field].filter(Boolean).join(" in ");
        parts.push(`<strong style="font-size:10.5pt">${esc(degreeField)}</strong>`);
        if (edu.institution)
          parts.push(
            `<p style="font-size:9.5pt;color:#3b82f6;margin:1px 0;font-weight:500">${esc(edu.institution)}${edu.gpa ? ` — ${esc(labels.gpa)}: ${esc(edu.gpa)}` : ""}</p>`,
          );
        const dateStr =
          edu.startDate || edu.endDate ? `${esc(edu.startDate)} – ${esc(edu.endDate)}` : "";
        if (dateStr) parts.push(`<p style="font-size:9pt;color:#6b7280;margin:0">${dateStr}</p>`);
        parts.push(`</div>`);
      }
    }

    if (sec.type === "skills" && data.skills.some((g) => g.items.some(Boolean))) {
      parts.push(modernHeading(sec.title));
      for (const group of data.skills) {
        const items = group.items.filter(Boolean);
        if (items.length) {
          if (group.name) {
            parts.push(
              `<p style="font-size:9pt;color:#374151;margin:0 0 4px;font-weight:600">${esc(group.name)}</p>`,
            );
          }
          parts.push(`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">`);
          for (const skill of items) {
            parts.push(
              `<span style="font-size:9pt;background:#eff6ff;color:#1e40af;padding:3px 10px;border-radius:4px">${esc(skill)}</span>`,
            );
          }
          parts.push(`</div>`);
        }
      }
      parts.push(`<div style="margin-bottom:6px"></div>`);
    }

    if (sec.type === "languages" && data.languages.length) {
      parts.push(modernHeading(sec.title));
      parts.push(`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">`);
      for (const lang of data.languages) {
        parts.push(
          `<span style="font-size:9pt;background:#f0fdf4;color:#166534;padding:3px 10px;border-radius:4px">${esc(lang.language)}${lang.proficiency ? ` · ${esc(lang.proficiency)}` : ""}</span>`,
        );
      }
      parts.push(`</div>`);
    }

    if (sec.type === "certifications" && data.certifications.length) {
      parts.push(modernHeading(sec.title));
      for (const cert of data.certifications) {
        parts.push(
          `<div style="margin-bottom:6px;padding-left:12px;border-left:3px solid #3b82f6">`,
        );
        const nameStr = cert.url
          ? `<a href="${esc(/^https?:\/\//i.test(cert.url) ? cert.url : `https://${cert.url}`)}" style="color:#3b82f6;text-decoration:none;font-size:10pt;font-weight:600">${esc(cert.name)}</a>`
          : `<strong style="font-size:10pt">${esc(cert.name)}</strong>`;
        parts.push(nameStr);
        const meta: string[] = [];
        if (cert.issuer) meta.push(esc(cert.issuer));
        if (cert.date) meta.push(esc(cert.date));
        if (meta.length)
          parts.push(`<p style="font-size:9pt;color:#6b7280;margin:1px 0">${meta.join(" — ")}</p>`);
        parts.push(`</div>`);
      }
    }

    if (sec.type === "projects" && data.projects.length) {
      parts.push(modernHeading(sec.title));
      for (const proj of data.projects) {
        parts.push(
          `<div style="margin-bottom:8px;padding-left:12px;border-left:3px solid #3b82f6">`,
        );
        const nameStr = proj.url
          ? `<a href="${esc(/^https?:\/\//i.test(proj.url) ? proj.url : `https://${proj.url}`)}" style="color:#3b82f6;text-decoration:none;font-size:10.5pt;font-weight:600">${esc(proj.name)}</a>`
          : `<strong style="font-size:10.5pt">${esc(proj.name)}</strong>`;
        parts.push(nameStr);
        if (proj.technologies)
          parts.push(
            `<p style="font-size:9pt;color:#3b82f6;margin:1px 0;font-weight:500">${esc(proj.technologies)}</p>`,
          );
        if (proj.description)
          parts.push(
            `<p style="font-size:9.5pt;color:#374151;margin:2px 0">${esc(proj.description)}</p>`,
          );
        parts.push(`</div>`);
      }
    }

    if (sec.type === "volunteer" && data.volunteer.length) {
      parts.push(modernHeading(sec.title));
      for (const vol of data.volunteer) {
        parts.push(
          `<div style="margin-bottom:8px;padding-left:12px;border-left:3px solid #3b82f6">`,
        );
        parts.push(`<div style="display:flex;justify-content:space-between;align-items:baseline">`);
        parts.push(`<strong style="font-size:10.5pt;color:#111">${esc(vol.role)}</strong>`);
        const dateStr =
          vol.startDate || vol.endDate ? `${esc(vol.startDate)} – ${esc(vol.endDate)}` : "";
        if (dateStr) parts.push(`<span style="font-size:9pt;color:#6b7280">${dateStr}</span>`);
        parts.push(`</div>`);
        if (vol.organization)
          parts.push(
            `<p style="font-size:9.5pt;color:#3b82f6;margin:1px 0 4px;font-weight:500">${esc(vol.organization)}</p>`,
          );
        if (vol.description)
          parts.push(
            `<p style="font-size:9.5pt;color:#374151;margin:2px 0">${esc(vol.description)}</p>`,
          );
        parts.push(`</div>`);
      }
    }

    if (sec.type === "custom") {
      const entries = data.customSections[sec.id] ?? [];
      if (entries.length) {
        parts.push(modernHeading(sec.title));
        for (const entry of entries) {
          parts.push(`<div style="margin-bottom:6px">`);
          if (entry.title)
            parts.push(`<strong style="font-size:10pt">${esc(entry.title)}</strong>`);
          if (entry.description)
            parts.push(
              `<p style="font-size:9.5pt;color:#374151;margin:2px 0">${esc(entry.description)}</p>`,
            );
          parts.push(`</div>`);
        }
      }
    }
  }

  parts.push(`</div></div>`);
  return parts.join("");
}

function modernHeading(title: string): string {
  return `<h2 style="font-size:11pt;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:1px;margin:16px 0 8px;padding-bottom:4px;border-bottom:2px solid #3b82f6">${esc(title)}</h2>`;
}

/* ── Minimal Template ── */
export function renderMinimal(
  data: ResumeData,
  visibleIds: Set<string>,
  labels: ExportLabels = defaultExportLabels,
): string {
  const p = data.personal;
  const parts: string[] = [];

  parts.push(
    `<div style="font-family:Georgia,'Times New Roman',serif;color:#222;line-height:1.6;max-width:760px;margin:0 auto">`,
  );

  if (visibleIds.has("personal")) {
    parts.push(`<div style="margin-bottom:14px">`);
    if (p.fullName)
      parts.push(
        `<h1 style="font-size:20pt;font-weight:400;margin:0;color:#000;letter-spacing:1px">${esc(p.fullName)}</h1>`,
      );
    if (p.title)
      parts.push(
        `<p style="font-size:10.5pt;color:#666;margin:2px 0 6px;font-style:italic">${esc(p.title)}</p>`,
      );
    const contact: string[] = [];
    if (p.email) contact.push(linkify(`mailto:${p.email}`, p.email));
    if (p.phone) contact.push(esc(p.phone));
    if (p.location) contact.push(esc(p.location));
    for (const link of p.links) {
      if (link.url) contact.push(linkify(link.url, link.label || link.url));
    }
    if (contact.length)
      parts.push(
        `<p style="font-size:9pt;color:#888;margin:0">${contact.join(" &nbsp;· &nbsp;")}</p>`,
      );
    parts.push(`</div>`);
  }

  for (const sec of data.sections) {
    if (!sec.visible || !visibleIds.has(sec.id)) continue;
    if (sec.type === "personal") continue;

    if (sec.type === "summary" && data.summary) {
      parts.push(minimalHeading(sec.title));
      parts.push(`<p style="font-size:10pt;color:#444;margin:0 0 14px">${esc(data.summary)}</p>`);
    }

    if (sec.type === "experience" && data.experience.length) {
      parts.push(minimalHeading(sec.title));
      for (const exp of data.experience) {
        parts.push(`<div style="margin-bottom:10px">`);
        parts.push(`<div style="display:flex;justify-content:space-between;align-items:baseline">`);
        parts.push(
          `<strong style="font-size:10.5pt;font-weight:600">${esc(exp.position)}</strong>`,
        );
        const dateStr =
          exp.startDate || exp.endDate
            ? `${esc(exp.startDate)} – ${exp.current ? esc(labels.present) : esc(exp.endDate)}`
            : "";
        if (dateStr)
          parts.push(`<span style="font-size:9pt;color:#888;font-style:italic">${dateStr}</span>`);
        parts.push(`</div>`);
        const sub: string[] = [];
        if (exp.company) sub.push(esc(exp.company));
        if (exp.location) sub.push(esc(exp.location));
        if (sub.length)
          parts.push(
            `<p style="font-size:9.5pt;color:#666;margin:1px 0 4px">${sub.join(", ")}</p>`,
          );
        const bullets = exp.bullets.filter((b) => b.trim());
        if (bullets.length) {
          parts.push(`<ul style="margin:2px 0 0;padding-left:18px;font-size:9.5pt;color:#444">`);
          for (const b of bullets) parts.push(`<li style="margin-bottom:2px">${esc(b)}</li>`);
          parts.push(`</ul>`);
        }
        parts.push(`</div>`);
      }
    }

    if (sec.type === "education" && data.education.length) {
      parts.push(minimalHeading(sec.title));
      for (const edu of data.education) {
        parts.push(`<div style="margin-bottom:8px">`);
        const degreeField = [edu.degree, edu.field].filter(Boolean).join(" in ");
        parts.push(`<div style="display:flex;justify-content:space-between;align-items:baseline">`);
        parts.push(`<strong style="font-size:10.5pt">${esc(degreeField)}</strong>`);
        const dateStr =
          edu.startDate || edu.endDate ? `${esc(edu.startDate)} – ${esc(edu.endDate)}` : "";
        if (dateStr)
          parts.push(`<span style="font-size:9pt;color:#888;font-style:italic">${dateStr}</span>`);
        parts.push(`</div>`);
        if (edu.institution)
          parts.push(
            `<p style="font-size:9.5pt;color:#666;margin:1px 0">${esc(edu.institution)}${edu.gpa ? ` · ${esc(labels.gpa)}: ${esc(edu.gpa)}` : ""}</p>`,
          );
        parts.push(`</div>`);
      }
    }

    if (sec.type === "skills" && data.skills.some((g) => g.items.some(Boolean))) {
      parts.push(minimalHeading(sec.title));
      for (const group of data.skills) {
        const items = group.items.filter(Boolean);
        if (items.length) {
          if (group.name) {
            parts.push(
              `<p style="font-size:9.5pt;color:#444;margin:0 0 4px"><strong>${esc(group.name)}:</strong> ${items.map(esc).join(" · ")}</p>`,
            );
          } else {
            parts.push(
              `<p style="font-size:9.5pt;color:#444;margin:0 0 4px">${items.map(esc).join(" · ")}</p>`,
            );
          }
        }
      }
      parts.push(`<div style="margin-bottom:10px"></div>`);
    }

    if (sec.type === "languages" && data.languages.length) {
      parts.push(minimalHeading(sec.title));
      parts.push(
        `<p style="font-size:9.5pt;color:#444;margin:0 0 14px">${data.languages.map((l) => `${esc(l.language)}${l.proficiency ? ` (${esc(l.proficiency)})` : ""}`).join(" · ")}</p>`,
      );
    }

    if (sec.type === "certifications" && data.certifications.length) {
      parts.push(minimalHeading(sec.title));
      for (const cert of data.certifications) {
        parts.push(`<div style="margin-bottom:6px">`);
        if (cert.url) {
          parts.push(linkify(cert.url, cert.name));
        } else if (cert.name) {
          parts.push(`<strong style="font-size:10pt">${esc(cert.name)}</strong>`);
        }
        const meta: string[] = [];
        if (cert.issuer) meta.push(esc(cert.issuer));
        if (cert.date) meta.push(esc(cert.date));
        if (meta.length)
          parts.push(
            `<p style="font-size:9pt;color:#888;margin:1px 0;font-style:italic">${meta.join(" — ")}</p>`,
          );
        parts.push(`</div>`);
      }
    }

    if (sec.type === "projects" && data.projects.length) {
      parts.push(minimalHeading(sec.title));
      for (const proj of data.projects) {
        parts.push(`<div style="margin-bottom:8px">`);
        if (proj.url) {
          parts.push(linkify(proj.url, proj.name));
        } else if (proj.name) {
          parts.push(`<strong style="font-size:10.5pt">${esc(proj.name)}</strong>`);
        }
        if (proj.technologies)
          parts.push(
            `<p style="font-size:9pt;color:#888;margin:1px 0;font-style:italic">${esc(proj.technologies)}</p>`,
          );
        if (proj.description)
          parts.push(
            `<p style="font-size:9.5pt;color:#444;margin:2px 0">${esc(proj.description)}</p>`,
          );
        parts.push(`</div>`);
      }
    }

    if (sec.type === "volunteer" && data.volunteer.length) {
      parts.push(minimalHeading(sec.title));
      for (const vol of data.volunteer) {
        parts.push(`<div style="margin-bottom:8px">`);
        parts.push(`<div style="display:flex;justify-content:space-between;align-items:baseline">`);
        parts.push(`<strong style="font-size:10.5pt">${esc(vol.role)}</strong>`);
        const dateStr =
          vol.startDate || vol.endDate ? `${esc(vol.startDate)} – ${esc(vol.endDate)}` : "";
        if (dateStr)
          parts.push(`<span style="font-size:9pt;color:#888;font-style:italic">${dateStr}</span>`);
        parts.push(`</div>`);
        if (vol.organization)
          parts.push(
            `<p style="font-size:9.5pt;color:#666;margin:1px 0 4px">${esc(vol.organization)}</p>`,
          );
        if (vol.description)
          parts.push(
            `<p style="font-size:9.5pt;color:#444;margin:2px 0">${esc(vol.description)}</p>`,
          );
        parts.push(`</div>`);
      }
    }

    if (sec.type === "custom") {
      const entries = data.customSections[sec.id] ?? [];
      if (entries.length) {
        parts.push(minimalHeading(sec.title));
        for (const entry of entries) {
          parts.push(`<div style="margin-bottom:6px">`);
          if (entry.title)
            parts.push(`<strong style="font-size:10pt">${esc(entry.title)}</strong>`);
          if (entry.description)
            parts.push(
              `<p style="font-size:9.5pt;color:#444;margin:2px 0">${esc(entry.description)}</p>`,
            );
          parts.push(`</div>`);
        }
      }
    }
  }

  parts.push(`</div>`);
  return parts.join("");
}

function minimalHeading(title: string): string {
  return `<h2 style="font-size:11pt;font-weight:400;color:#000;margin:16px 0 6px;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #ddd;padding-bottom:3px">${esc(title)}</h2>`;
}

/* ── Template registry ── */
export const templates = {
  classic: { name: "Classic", render: renderClassic },
  modern: { name: "Modern", render: renderModern },
  minimal: { name: "Minimal", render: renderMinimal },
} as const satisfies Record<
  string,
  {
    name: string;
    render: (data: ResumeData, visibleIds: Set<string>, labels?: ExportLabels) => string;
  }
>;
