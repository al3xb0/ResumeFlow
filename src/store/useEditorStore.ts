import { create } from "zustand";

export type EditorMode = "compose" | "preview" | "editing";

interface EditorState {
  activeTab: "import" | "editor";
  editorMode: EditorMode;

  setActiveTab: (tab: "import" | "editor") => void;
  setEditorMode: (mode: EditorMode) => void;
  clearEditor: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTab: "import",
  editorMode: "compose",

  setActiveTab: (tab) => set({ activeTab: tab }),
  setEditorMode: (mode) => set({ editorMode: mode }),
  clearEditor: () => set({ editorMode: "compose" }),
}));
