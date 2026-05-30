import { create } from "zustand";

export type EditorMode = "compose" | "preview" | "editing";

interface EditorState {
  activeTab: "import" | "editor";
  editorMode: EditorMode;
  documentHtml: string;

  setActiveTab: (tab: "import" | "editor") => void;
  setEditorMode: (mode: EditorMode) => void;
  setDocumentHtml: (html: string) => void;
  clearEditor: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTab: "import",
  editorMode: "compose",
  documentHtml: "",

  setActiveTab: (tab) => set({ activeTab: tab }),
  setEditorMode: (mode) => set({ editorMode: mode }),
  setDocumentHtml: (html) => set({ documentHtml: html }),
  clearEditor: () => set({ documentHtml: "", editorMode: "compose" }),
}));
