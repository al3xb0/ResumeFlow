import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FileDown, RotateCcw, LayoutTemplate, FileText } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useBuilderStore } from "../store/useBuilderStore";
import { useResumeStore } from "../store/useResumeStore";
import { useToast } from "./Toast";
import { SectionEditor } from "./SectionEditor";
import { templates } from "../templates/resumeTemplates";
import { buildPdfDefinition } from "../lib/pdfExport";
import { generateDocxBlob } from "../lib/docxExport";
import { uint8ToBase64 } from "../lib/utils";
import type { TemplateId, ExportLabels } from "../types/resume";

export function ResumeBuilder() {
  const { t } = useTranslation();
  const toast = useToast();
  const { resume, template, setTemplate, resetResume, getPlainText } = useBuilderStore();
  const { setResumeText } = useResumeStore();

  const labels: ExportLabels = useMemo(
    () => ({
      present: t("builder.present"),
      gpa: t("builder.gpa", "GPA"),
    }),
    [t],
  );

  const syncToAnalysis = useCallback(() => {
    setResumeText(getPlainText());
  }, [getPlainText, setResumeText]);

  const handleExportDocx = useCallback(async () => {
    syncToAnalysis();
    try {
      const filePath = await save({
        filters: [{ name: "Word Document", extensions: ["docx"] }],
        defaultPath: "resume.docx",
      });
      if (!filePath) return;

      const visibleIds = new Set(resume.sections.filter((s) => s.visible).map((s) => s.id));
      const blob = await generateDocxBlob(resume, visibleIds, labels, template);
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const base64 = uint8ToBase64(bytes);
      await invoke("save_file_bytes", { filePath, base64Content: base64 });
      toast.success(t("builder.exportedDocx"));
    } catch (err) {
      console.error("DOCX export error:", err);
      toast.error(String(err));
    }
  }, [resume, syncToAnalysis, t, toast, labels, template]);

  const handleExportPdf = useCallback(async () => {
    syncToAnalysis();
    try {
      const filePath = await save({
        filters: [{ name: "PDF Document", extensions: ["pdf"] }],
        defaultPath: "resume.pdf",
      });
      if (!filePath) return;

      const pdfMakeModule = await import("pdfmake/build/pdfmake");
      const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
      const pdfMake = pdfMakeModule.default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fontsModule = pdfFontsModule as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pdfMake as any).vfs =
        fontsModule.pdfMake?.vfs ?? fontsModule.default?.pdfMake?.vfs ?? fontsModule.vfs;

      const visibleIds = new Set(resume.sections.filter((s) => s.visible).map((s) => s.id));
      const docDef = buildPdfDefinition(resume, visibleIds, labels);

      const pdfDoc = pdfMake.createPdf(docDef);
      const blob = await pdfDoc.getBlob();
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const base64 = uint8ToBase64(bytes);
      await invoke("save_file_bytes", { filePath, base64Content: base64 });
      toast.success(t("builder.exportedPdf"));
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error(String(err));
    }
  }, [resume, syncToAnalysis, t, toast, labels]);

  const handleReset = useCallback(() => {
    if (window.confirm(t("builder.confirmReset"))) {
      resetResume();
    }
  }, [resetResume, t]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <LayoutTemplate size={14} className="text-muted-foreground" />
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as TemplateId)}
            className="h-7 px-2 text-xs rounded-md bg-secondary/60 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {(Object.keys(templates) as TemplateId[]).map((id) => (
              <option key={id} value={id}>
                {templates[id].name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        <div className="flex-1" />

        <button
          onClick={handleExportDocx}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          title={t("builder.exportDocx")}
        >
          <FileDown size={13} />
          DOCX
        </button>
        <button
          onClick={handleExportPdf}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          title={t("builder.exportPdf")}
        >
          <FileText size={13} />
          PDF
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title={t("builder.reset")}
        >
          <RotateCcw size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <SectionEditor />
      </div>
    </div>
  );
}
