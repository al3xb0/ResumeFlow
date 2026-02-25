import { create } from "zustand";

export type SectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "custom";

export interface ResumeSection {
  id: string;
  type: SectionType;
  title: string;
  content: string;
  collapsed: boolean;
}

interface EditorState {
  sections: ResumeSection[];
  activeTab: "import" | "editor";

  setActiveTab: (tab: "import" | "editor") => void;
  addSection: (type: SectionType, title: string) => void;
  removeSection: (id: string) => void;
  updateSection: (id: string, updates: Partial<Pick<ResumeSection, "title" | "content">>) => void;
  toggleCollapse: (id: string) => void;
  focusSection: (id: string) => void;
  moveSection: (id: string, direction: "up" | "down") => void;
  loadFromText: (text: string) => void;
  toPlainText: () => string;
  clearEditor: () => void;
}

let nextId = 1;
function genId(): string {
  return `sec_${nextId++}_${Date.now()}`;
}

const DEFAULT_SECTIONS: ResumeSection[] = [
  { id: genId(), type: "summary", title: "Summary", content: "", collapsed: true },
  { id: genId(), type: "experience", title: "Experience", content: "", collapsed: true },
  { id: genId(), type: "education", title: "Education", content: "", collapsed: true },
  { id: genId(), type: "skills", title: "Skills", content: "", collapsed: true },
];

export const useEditorStore = create<EditorState>((set, get) => ({
  sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
  activeTab: "import",

  setActiveTab: (tab) => set({ activeTab: tab }),

  addSection: (type, title) =>
    set((state) => ({
      sections: [
        ...state.sections,
        { id: genId(), type, title, content: "", collapsed: false },
      ],
    })),

  removeSection: (id) =>
    set((state) => ({
      sections: state.sections.filter((s) => s.id !== id),
    })),

  updateSection: (id, updates) =>
    set((state) => ({
      sections: state.sections.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  toggleCollapse: (id) =>
    set((state) => ({
      sections: state.sections.map((s) =>
        s.id === id ? { ...s, collapsed: !s.collapsed } : s
      ),
    })),

  focusSection: (id) =>
    set((state) => ({
      sections: state.sections.map((s) =>
        s.id === id ? { ...s, collapsed: false } : { ...s, collapsed: true }
      ),
    })),

  moveSection: (id, direction) =>
    set((state) => {
      const idx = state.sections.findIndex((s) => s.id === id);
      if (idx < 0) return state;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= state.sections.length) return state;
      const next = [...state.sections];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { sections: next };
    }),

  loadFromText: (text) => {
    const sectionPatterns: Array<{ type: SectionType; regex: RegExp; title: string }> = [
      { type: "summary", regex: /^(?:summary|about|objective|profile|о себе|profil|podsumowanie)/im, title: "Summary" },
      { type: "experience", regex: /^(?:experience|work|employment|professional|опыт|doświadczenie)/im, title: "Experience" },
      { type: "education", regex: /^(?:education|university|образование|wykształcenie)/im, title: "Education" },
      { type: "skills", regex: /^(?:skills|technologies|tech stack|навыки|umiejętności)/im, title: "Skills" },
    ];

    const lines = text.split("\n");
    const detected: Array<{ type: SectionType; title: string; startLine: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toLowerCase();
      for (const p of sectionPatterns) {
        if (p.regex.test(line)) {
          detected.push({ type: p.type, title: lines[i].trim(), startLine: i });
          break;
        }
      }
    }

    if (detected.length === 0) {
      set({
        sections: [
          { id: genId(), type: "custom", title: "Resume", content: text, collapsed: true },
        ],
      });
      return;
    }

    const sections: ResumeSection[] = [];

    if (detected[0].startLine > 0) {
      const headerContent = lines.slice(0, detected[0].startLine).join("\n").trim();
      if (headerContent) {
        sections.push({
          id: genId(),
          type: "summary",
          title: "Contact / Header",
          content: headerContent,
          collapsed: true,
        });
      }
    }

    for (let i = 0; i < detected.length; i++) {
      const start = detected[i].startLine + 1;
      const end = i + 1 < detected.length ? detected[i + 1].startLine : lines.length;
      const content = lines.slice(start, end).join("\n").trim();
      sections.push({
        id: genId(),
        type: detected[i].type,
        title: detected[i].title,
        content,
        collapsed: true,
      });
    }

    set({ sections });
  },

  toPlainText: () => {
    const { sections } = get();
    return sections
      .filter((s) => s.content.trim())
      .map((s) => `${s.title}\n${s.content}`)
      .join("\n\n");
  },

  clearEditor: () =>
    set({
      sections: DEFAULT_SECTIONS.map((s) => ({ ...s, id: genId(), content: "", collapsed: true })),
    }),
}));
