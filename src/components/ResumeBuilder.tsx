import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FileDown, RotateCcw, LayoutTemplate } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useBuilderStore } from "../store/useBuilderStore";
import { useResumeStore } from "../store/useResumeStore";
import { useToast } from "./Toast";
import { SectionEditor } from "./SectionEditor";
import { PageLayoutPanel } from "./layout/PageLayoutPanel";
import { generateDocxBlob } from "../lib/docxExport";
import { buildResumeRenderRequest } from "../lib/resumeRenderRequest";
import { getTauriErrorMessage } from "../lib/tauriError";
import { exportResumePdf } from "../lib/typstRender";
import { uint8ToBase64 } from "../lib/utils";
import {
  TEMPLATE_DISPLAY_NAMES,
  TYPST_ENABLED_TEMPLATE_IDS,
  normalizeTypstTemplate,
  type ExportLabels,
  type TemplateId,
} from "../types/resume";

export function ResumeBuilder() {
  const { t } = useTranslation();
  const toast = useToast();
  const { resume, template, setTemplate, resetResume, getPlainText, layoutSettings } =
    useBuilderStore();
  const { setResumeText } = useResumeStore();
  const activeTemplate = normalizeTypstTemplate(template);

  useEffect(() => {
    if (template !== activeTemplate) {
      setTemplate(activeTemplate);
    }
  }, [activeTemplate, setTemplate, template]);

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

  const suggestedPdfPath = useMemo(() => {
    const normalizedName = resume.personal.fullName
      .trim()
      .toLowerCase()
      .replace(/[<>:"/\\|?*]+/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return normalizedName ? `${normalizedName}.pdf` : "resume.pdf";
  }, [resume.personal.fullName]);

  const handleExportDocx = useCallback(async () => {
    syncToAnalysis();
    try {
      const filePath = await save({
        filters: [{ name: "Word Document", extensions: ["docx"] }],
        defaultPath: "resume.docx",
      });
      if (!filePath) return;

      const renderRequest = buildResumeRenderRequest({
        resume,
        labels,
        template: activeTemplate,
        layoutSettings,
      });
      const visibleIds = new Set(renderRequest.visibleIds);
      const blob = await generateDocxBlob(
        renderRequest.resume,
        visibleIds,
        renderRequest.labels,
        renderRequest.template,
        renderRequest.layoutSettings,
      );
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const base64 = uint8ToBase64(bytes);
      await invoke("save_file_bytes", { filePath, base64Content: base64 });
      toast.success(t("builder.exportedDocx"));
    } catch (err) {
      console.error("DOCX export error:", err);
      toast.error(getTauriErrorMessage(err, t, "errors.unknown"));
    }
  }, [activeTemplate, layoutSettings, resume, syncToAnalysis, t, toast, labels]);

  const handleExportPdf = useCallback(async () => {
    syncToAnalysis();
    try {
      const renderRequest = buildResumeRenderRequest({
        resume,
        labels,
        template: activeTemplate,
        layoutSettings,
      });

      const filePath = await save({
        filters: [{ name: "PDF Document", extensions: ["pdf"] }],
        defaultPath: suggestedPdfPath,
      });

      if (!filePath) {
        return;
      }

      const pdfResult = await exportResumePdf(renderRequest);

      await invoke("save_file_bytes", {
        filePath,
        base64Content: pdfResult.base64Pdf,
      });

      toast.success(t("builder.exportedPdf", "Saved as PDF"));
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error(getTauriErrorMessage(err, t, "errors.unknown"));
    }
  }, [activeTemplate, labels, layoutSettings, resume, suggestedPdfPath, syncToAnalysis, t, toast]);

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
            value={activeTemplate}
            onChange={(e) => setTemplate(normalizeTypstTemplate(e.target.value as TemplateId))}
            className="h-7 px-2 text-xs rounded-md bg-secondary/60 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {TYPST_ENABLED_TEMPLATE_IDS.map((id) => (
              <option key={id} value={id}>
                {TEMPLATE_DISPLAY_NAMES[id]}
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
          title={t("builder.exportPdf", "Export PDF")}
        >
          <FileDown size={13} />
          {t("builder.exportPdf", "Export PDF")}
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
        <div className="flex flex-col gap-4">
          <PageLayoutPanel />
          <SectionEditor />
        </div>
      </div>
    </div>
  );
}
