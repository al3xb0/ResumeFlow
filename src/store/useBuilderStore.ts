import { create } from "zustand";
import type { ResumeData, ResumeSection, TemplateId, LinkType, SkillGroup } from "../types/resume";
import { defaultResumeData, createId } from "../types/resume";

interface BuilderState {
  resume: ResumeData;
  template: TemplateId;

  setTemplate: (id: TemplateId) => void;

  // Personal
  updatePersonal: (field: string, value: string) => void;
  addLink: (type: LinkType) => void;
  updateLink: (id: string, field: string, value: string) => void;
  removeLink: (id: string) => void;

  // Summary
  setSummary: (text: string) => void;

  // Experience
  addExperience: () => void;
  updateExperience: (id: string, field: string, value: string | boolean) => void;
  removeExperience: (id: string) => void;
  addBullet: (expId: string) => void;
  updateBullet: (expId: string, index: number, value: string) => void;
  removeBullet: (expId: string, index: number) => void;

  // Education
  addEducation: () => void;
  updateEducation: (id: string, field: string, value: string) => void;
  removeEducation: (id: string) => void;

  // Skills
  setSkills: (skills: SkillGroup[]) => void;
  addSkillGroup: () => void;
  removeSkillGroup: (id: string) => void;
  renameSkillGroup: (id: string, name: string) => void;
  addSkill: (groupId: string, skill: string) => void;
  removeSkill: (groupId: string, index: number) => void;

  // Languages
  addLanguage: () => void;
  updateLanguage: (id: string, field: string, value: string) => void;
  removeLanguage: (id: string) => void;

  // Certifications
  addCertification: () => void;
  updateCertification: (id: string, field: string, value: string) => void;
  removeCertification: (id: string) => void;

  // Projects
  addProject: () => void;
  updateProject: (id: string, field: string, value: string) => void;
  removeProject: (id: string) => void;

  // Volunteer
  addVolunteer: () => void;
  updateVolunteer: (id: string, field: string, value: string) => void;
  removeVolunteer: (id: string) => void;

  // Custom sections
  addCustomSection: (title: string) => void;
  addCustomEntry: (sectionId: string) => void;
  updateCustomEntry: (sectionId: string, entryId: string, field: string, value: string) => void;
  removeCustomEntry: (sectionId: string, entryId: string) => void;

  // Section management
  reorderSections: (sections: ResumeSection[]) => void;
  toggleSectionVisibility: (id: string) => void;
  removeSection: (id: string) => void;
  renameSection: (id: string, title: string) => void;

  // Bulk
  resetResume: () => void;
  setResumeData: (data: ResumeData) => void;

  // Plain text for analysis
  getPlainText: () => string;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  resume: defaultResumeData(),
  template: "classic",

  setTemplate: (id) => set({ template: id }),

  updatePersonal: (field, value) =>
    set((s) => ({
      resume: {
        ...s.resume,
        personal: { ...s.resume.personal, [field]: value },
      },
    })),

  addLink: (type) =>
    set((s) => ({
      resume: {
        ...s.resume,
        personal: {
          ...s.resume.personal,
          links: [...s.resume.personal.links, { id: createId(), type, url: "", label: "" }],
        },
      },
    })),

  updateLink: (id, field, value) =>
    set((s) => ({
      resume: {
        ...s.resume,
        personal: {
          ...s.resume.personal,
          links: s.resume.personal.links.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
        },
      },
    })),

  removeLink: (id) =>
    set((s) => ({
      resume: {
        ...s.resume,
        personal: {
          ...s.resume.personal,
          links: s.resume.personal.links.filter((l) => l.id !== id),
        },
      },
    })),

  setSummary: (text) => set((s) => ({ resume: { ...s.resume, summary: text } })),

  addExperience: () =>
    set((s) => ({
      resume: {
        ...s.resume,
        experience: [
          ...s.resume.experience,
          {
            id: createId(),
            company: "",
            position: "",
            location: "",
            startDate: "",
            endDate: "",
            current: false,
            bullets: [""],
          },
        ],
      },
    })),

  updateExperience: (id, field, value) =>
    set((s) => ({
      resume: {
        ...s.resume,
        experience: s.resume.experience.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
      },
    })),

  removeExperience: (id) =>
    set((s) => ({
      resume: {
        ...s.resume,
        experience: s.resume.experience.filter((e) => e.id !== id),
      },
    })),

  addBullet: (expId) =>
    set((s) => ({
      resume: {
        ...s.resume,
        experience: s.resume.experience.map((e) =>
          e.id === expId ? { ...e, bullets: [...e.bullets, ""] } : e,
        ),
      },
    })),

  updateBullet: (expId, index, value) =>
    set((s) => ({
      resume: {
        ...s.resume,
        experience: s.resume.experience.map((e) =>
          e.id === expId
            ? { ...e, bullets: e.bullets.map((b, i) => (i === index ? value : b)) }
            : e,
        ),
      },
    })),

  removeBullet: (expId, index) =>
    set((s) => ({
      resume: {
        ...s.resume,
        experience: s.resume.experience.map((e) =>
          e.id === expId ? { ...e, bullets: e.bullets.filter((_, i) => i !== index) } : e,
        ),
      },
    })),

  addEducation: () =>
    set((s) => ({
      resume: {
        ...s.resume,
        education: [
          ...s.resume.education,
          {
            id: createId(),
            institution: "",
            degree: "",
            field: "",
            startDate: "",
            endDate: "",
            gpa: "",
          },
        ],
      },
    })),

  updateEducation: (id, field, value) =>
    set((s) => ({
      resume: {
        ...s.resume,
        education: s.resume.education.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
      },
    })),

  removeEducation: (id) =>
    set((s) => ({
      resume: {
        ...s.resume,
        education: s.resume.education.filter((e) => e.id !== id),
      },
    })),

  setSkills: (skills) => set((s) => ({ resume: { ...s.resume, skills } })),

  addSkillGroup: () =>
    set((s) => ({
      resume: {
        ...s.resume,
        skills: [...s.resume.skills, { id: createId(), name: "", items: [] }],
      },
    })),

  removeSkillGroup: (id) =>
    set((s) => ({
      resume: {
        ...s.resume,
        skills: s.resume.skills.filter((g) => g.id !== id),
      },
    })),

  renameSkillGroup: (id, name) =>
    set((s) => ({
      resume: {
        ...s.resume,
        skills: s.resume.skills.map((g) => (g.id === id ? { ...g, name } : g)),
      },
    })),

  addSkill: (groupId, skill) =>
    set((s) => ({
      resume: {
        ...s.resume,
        skills: s.resume.skills.map((g) =>
          g.id === groupId ? { ...g, items: [...g.items, skill] } : g,
        ),
      },
    })),

  removeSkill: (groupId, index) =>
    set((s) => ({
      resume: {
        ...s.resume,
        skills: s.resume.skills.map((g) =>
          g.id === groupId ? { ...g, items: g.items.filter((_, i) => i !== index) } : g,
        ),
      },
    })),

  addLanguage: () =>
    set((s) => ({
      resume: {
        ...s.resume,
        languages: [...s.resume.languages, { id: createId(), language: "", proficiency: "" }],
      },
    })),

  updateLanguage: (id, field, value) =>
    set((s) => ({
      resume: {
        ...s.resume,
        languages: s.resume.languages.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
      },
    })),

  removeLanguage: (id) =>
    set((s) => ({
      resume: {
        ...s.resume,
        languages: s.resume.languages.filter((l) => l.id !== id),
      },
    })),

  addCertification: () =>
    set((s) => ({
      resume: {
        ...s.resume,
        certifications: [
          ...s.resume.certifications,
          { id: createId(), name: "", issuer: "", date: "", url: "" },
        ],
      },
    })),

  updateCertification: (id, field, value) =>
    set((s) => ({
      resume: {
        ...s.resume,
        certifications: s.resume.certifications.map((c) =>
          c.id === id ? { ...c, [field]: value } : c,
        ),
      },
    })),

  removeCertification: (id) =>
    set((s) => ({
      resume: {
        ...s.resume,
        certifications: s.resume.certifications.filter((c) => c.id !== id),
      },
    })),

  addProject: () =>
    set((s) => ({
      resume: {
        ...s.resume,
        projects: [
          ...s.resume.projects,
          { id: createId(), name: "", description: "", technologies: "", url: "" },
        ],
      },
    })),

  updateProject: (id, field, value) =>
    set((s) => ({
      resume: {
        ...s.resume,
        projects: s.resume.projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
      },
    })),

  removeProject: (id) =>
    set((s) => ({
      resume: {
        ...s.resume,
        projects: s.resume.projects.filter((p) => p.id !== id),
      },
    })),

  addVolunteer: () =>
    set((s) => ({
      resume: {
        ...s.resume,
        volunteer: [
          ...s.resume.volunteer,
          {
            id: createId(),
            organization: "",
            role: "",
            startDate: "",
            endDate: "",
            description: "",
          },
        ],
      },
    })),

  updateVolunteer: (id, field, value) =>
    set((s) => ({
      resume: {
        ...s.resume,
        volunteer: s.resume.volunteer.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
      },
    })),

  removeVolunteer: (id) =>
    set((s) => ({
      resume: {
        ...s.resume,
        volunteer: s.resume.volunteer.filter((v) => v.id !== id),
      },
    })),

  addCustomSection: (title) => {
    const id = createId();
    set((s) => ({
      resume: {
        ...s.resume,
        sections: [...s.resume.sections, { id, type: "custom", title, visible: true }],
        customSections: { ...s.resume.customSections, [id]: [] },
      },
    }));
  },

  addCustomEntry: (sectionId) =>
    set((s) => ({
      resume: {
        ...s.resume,
        customSections: {
          ...s.resume.customSections,
          [sectionId]: [
            ...(s.resume.customSections[sectionId] ?? []),
            { id: createId(), title: "", description: "" },
          ],
        },
      },
    })),

  updateCustomEntry: (sectionId, entryId, field, value) =>
    set((s) => ({
      resume: {
        ...s.resume,
        customSections: {
          ...s.resume.customSections,
          [sectionId]: (s.resume.customSections[sectionId] ?? []).map((e) =>
            e.id === entryId ? { ...e, [field]: value } : e,
          ),
        },
      },
    })),

  removeCustomEntry: (sectionId, entryId) =>
    set((s) => ({
      resume: {
        ...s.resume,
        customSections: {
          ...s.resume.customSections,
          [sectionId]: (s.resume.customSections[sectionId] ?? []).filter((e) => e.id !== entryId),
        },
      },
    })),

  reorderSections: (sections) => set((s) => ({ resume: { ...s.resume, sections } })),

  toggleSectionVisibility: (id) =>
    set((s) => ({
      resume: {
        ...s.resume,
        sections: s.resume.sections.map((sec) =>
          sec.id === id ? { ...sec, visible: !sec.visible } : sec,
        ),
      },
    })),

  removeSection: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.resume.customSections;
      return {
        resume: {
          ...s.resume,
          sections: s.resume.sections.filter((sec) => sec.id !== id),
          customSections: rest,
        },
      };
    }),

  renameSection: (id, title) =>
    set((s) => ({
      resume: {
        ...s.resume,
        sections: s.resume.sections.map((sec) => (sec.id === id ? { ...sec, title } : sec)),
      },
    })),

  resetResume: () => set({ resume: defaultResumeData() }),

  setResumeData: (data) => set({ resume: data }),

  getPlainText: () => {
    const r = get().resume;
    const lines: string[] = [];

    if (r.personal.fullName) lines.push(r.personal.fullName);
    if (r.personal.title) lines.push(r.personal.title);
    const contactParts = [r.personal.email, r.personal.phone, r.personal.location].filter(Boolean);
    if (contactParts.length) lines.push(contactParts.join(" | "));
    for (const link of r.personal.links) {
      if (link.url) lines.push(`${link.label || link.type}: ${link.url}`);
    }

    if (r.summary) {
      lines.push("", "Summary", r.summary);
    }

    if (r.experience.length) {
      lines.push("", "Experience");
      for (const exp of r.experience) {
        lines.push(`${exp.position}${exp.company ? ` at ${exp.company}` : ""}`);
        if (exp.startDate || exp.endDate) {
          lines.push(`${exp.startDate} - ${exp.current ? "Present" : exp.endDate}`);
        }
        for (const b of exp.bullets) {
          if (b.trim()) lines.push(`• ${b}`);
        }
      }
    }

    if (r.education.length) {
      lines.push("", "Education");
      for (const edu of r.education) {
        lines.push(`${edu.degree}${edu.field ? ` in ${edu.field}` : ""}`);
        if (edu.institution) lines.push(edu.institution);
        if (edu.startDate || edu.endDate) {
          lines.push(`${edu.startDate} - ${edu.endDate}`);
        }
      }
    }

    if (r.skills.length) {
      lines.push("", "Skills");
      for (const group of r.skills) {
        const items = group.items.filter(Boolean);
        if (items.length) {
          lines.push(group.name ? `${group.name}: ${items.join(", ")}` : items.join(", "));
        }
      }
    }

    if (r.languages.length) {
      lines.push("", "Languages");
      for (const l of r.languages) {
        lines.push(`${l.language}${l.proficiency ? ` — ${l.proficiency}` : ""}`);
      }
    }

    if (r.certifications.length) {
      lines.push("", "Certifications");
      for (const c of r.certifications) {
        lines.push(`${c.name}${c.issuer ? ` — ${c.issuer}` : ""}${c.date ? ` (${c.date})` : ""}`);
      }
    }

    if (r.projects.length) {
      lines.push("", "Projects");
      for (const p of r.projects) {
        lines.push(p.name);
        if (p.description) lines.push(p.description);
        if (p.technologies) lines.push(`Technologies: ${p.technologies}`);
      }
    }

    if (r.volunteer.length) {
      lines.push("", "Volunteer");
      for (const v of r.volunteer) {
        lines.push(`${v.role}${v.organization ? ` at ${v.organization}` : ""}`);
        if (v.description) lines.push(v.description);
      }
    }

    for (const sec of r.sections) {
      if (sec.type === "custom" && sec.visible) {
        const entries = r.customSections[sec.id] ?? [];
        if (entries.length) {
          lines.push("", sec.title);
          for (const entry of entries) {
            if (entry.title) lines.push(entry.title);
            if (entry.description) lines.push(entry.description);
          }
        }
      }
    }

    return lines.join("\n");
  },
}));
