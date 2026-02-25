import { useTranslation } from "react-i18next";
import { Header } from "./components/Header";
import { ResumeImport } from "./components/ResumeImport";
import { JobDescription } from "./components/JobDescription";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { ResumeEditor } from "./components/ResumeEditor";
import { ToastContainer } from "./components/Toast";
import { useEditorStore } from "./store/useEditorStore";
import { cn } from "./lib/utils";
import { FileUp, PenLine } from "lucide-react";

function App() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useEditorStore();

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />

      <main className="flex flex-1 overflow-hidden">
        <section className="w-1/2 border-r border-border overflow-y-auto flex flex-col">
          <div className="flex border-b border-border sticky top-0 bg-background z-10">
            <button
              onClick={() => setActiveTab("import")}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === "import"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <FileUp size={14} />
              {t("nav.import")}
            </button>
            <button
              onClick={() => setActiveTab("editor")}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === "editor"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <PenLine size={14} />
              {t("nav.editor")}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "import" ? (
              <div className="flex flex-col gap-8">
                <ResumeImport />
                <JobDescription />
              </div>
            ) : (
              <ResumeEditor />
            )}
          </div>
        </section>

        <section className="w-1/2 overflow-y-auto p-6">
          <AnalysisPanel />
        </section>
      </main>

      <ToastContainer />
    </div>
  );
}

export default App;
