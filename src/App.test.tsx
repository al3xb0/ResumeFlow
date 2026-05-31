import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { useEditorStore } from "./store/useEditorStore";
import { useResumeStore } from "./store/useResumeStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock("./components/Header", () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock("./components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./components/ResumeImport", () => ({
  ResumeImport: () => <div data-testid="resume-import" />,
}));

vi.mock("./components/JobDescription", () => ({
  JobDescription: () => <div data-testid="job-description" />,
}));

vi.mock("./components/AnalysisPanel", () => ({
  AnalysisPanel: () => <div data-testid="analysis-panel" />,
}));

vi.mock("./components/ResumeBuilder", () => ({
  ResumeBuilder: () => <div data-testid="resume-builder" />,
}));

vi.mock("./components/ResumePreview", () => ({
  ResumePreview: () => <div data-testid="resume-preview" />,
}));

vi.mock("./components/PdfPreview", () => ({
  PdfPreview: () => <div data-testid="pdf-preview" />,
}));

vi.mock("./components/ImportEditWorkspace", () => ({
  ImportEditWorkspace: () => <div data-testid="import-edit-workspace" />,
}));

vi.mock("./components/Toast", () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
}));

const initialEditorState = useEditorStore.getState();
const initialResumeState = useResumeStore.getState();

describe("App import workflow", () => {
  beforeEach(() => {
    useEditorStore.setState({ ...initialEditorState });
    useResumeStore.setState({ ...initialResumeState });
  });

  it("keeps PDF preview inside the Import tab while showing job tools in the right split pane", async () => {
    useEditorStore.setState({ activeTab: "import", editorMode: "preview" });
    useResumeStore.setState({ importedFileType: "pdf" });

    render(<App />);

    expect(await screen.findByTestId("pdf-preview")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("resume-builder")).not.toBeInTheDocument();
    expect(screen.queryByTestId("resume-preview")).not.toBeInTheDocument();
  });

  it("keeps parsed editing inside Import instead of switching to Builder", async () => {
    useEditorStore.setState({ activeTab: "import", editorMode: "editing" });
    useResumeStore.setState({ importedFileType: "pdf" });

    render(<App />);

    expect(await screen.findByTestId("import-edit-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("resume-builder")).not.toBeInTheDocument();
    expect(screen.queryByTestId("resume-preview")).not.toBeInTheDocument();
  });
});
