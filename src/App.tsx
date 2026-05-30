import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "./components/Header";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ResumeImport } from "./components/ResumeImport";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { ResumeBuilder } from "./components/ResumeBuilder";
import { ResumePreview } from "./components/ResumePreview";
import { ImportEditWorkspace } from "./components/ImportEditWorkspace";
import { ToastContainer } from "./components/Toast";
import { useEditorStore } from "./store/useEditorStore";
import { useResumeStore } from "./store/useResumeStore";
import { cn } from "./lib/utils";
import { FileUp, Hammer } from "lucide-react";

const PdfPreview = lazy(async () => {
  const module = await import("./components/PdfPreview");
  return { default: module.PdfPreview };
});

function App() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, editorMode } = useEditorStore();
  const { importedFileType } = useResumeStore();

  const showPdfPreview =
    activeTab === "import" && importedFileType === "pdf" && editorMode === "preview";
  const showImportEditor =
    activeTab === "import" && importedFileType !== null && editorMode === "editing";

  const importPrimaryPane = showPdfPreview ? (
    <Suspense
      fallback={
        <div
          data-testid="pdf-preview-loading"
          className="h-full rounded-2xl border border-border bg-background"
        />
      }
    >
      <PdfPreview />
    </Suspense>
  ) : showImportEditor ? (
    <ImportEditWorkspace />
  ) : (
    <ResumeImport />
  );

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-background text-foreground">
        <Header />

        <main className="flex flex-1 overflow-hidden">
          <section className="w-1/2 border-r border-border flex flex-col min-w-0">
            <nav
              className="flex border-b border-border sticky top-0 bg-background z-10"
              role="tablist"
            >
              <button
                onClick={() => setActiveTab("import")}
                role="tab"
                aria-selected={activeTab === "import"}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px select-none",
                  activeTab === "import"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <FileUp size={14} />
                {t("nav.import")}
              </button>
              <button
                onClick={() => setActiveTab("editor")}
                role="tab"
                aria-selected={activeTab === "editor"}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px select-none",
                  activeTab === "editor"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Hammer size={14} />
                {t("nav.builder")}
              </button>
            </nav>

            <div className="flex-1 min-h-0 overflow-y-auto" role="tabpanel">
              {activeTab === "import" ? (
                <div className="h-full p-6">{importPrimaryPane}</div>
              ) : (
                <ResumeBuilder />
              )}
            </div>
          </section>

          <section className="w-1/2 overflow-y-auto">
            {activeTab === "editor" ? (
              <ResumePreview />
            ) : (
              <div className="p-6">
                <div className="rounded-2xl border border-border bg-background p-5">
                  <AnalysisPanel />
                </div>
              </div>
            )}
          </section>
        </main>

        <ToastContainer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
