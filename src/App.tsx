import { Header } from "./components/Header";
import { ResumeImport } from "./components/ResumeImport";
import { JobDescription } from "./components/JobDescription";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { ToastContainer } from "./components/Toast";

function App() {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />

      <main className="flex flex-1 overflow-hidden">
        <section className="w-1/2 border-r border-border overflow-y-auto p-6 flex flex-col gap-8">
          <ResumeImport />
          <JobDescription />
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
