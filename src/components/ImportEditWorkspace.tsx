import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Eye, FileUp, RotateCcw } from "lucide-react";
import { SectionEditor } from "./SectionEditor";
import { useResumeImport } from "../hooks/useResumeImport";
import { useBuilderStore } from "../store/useBuilderStore";
import { useEditorStore } from "../store/useEditorStore";
import { useResumeStore } from "../store/useResumeStore";

export function ImportEditWorkspace() {
  const { t } = useTranslation();
  const { importedFileType, resumeFileName, setResumeText, clearResume } = useResumeStore();
  const { getPlainText, resume } = useBuilderStore();
  const { setEditorMode, clearEditor } = useEditorStore();
  const { handleFileSelect } = useResumeImport();

  useEffect(() => {
    setResumeText(getPlainText());
  }, [getPlainText, resume, setResumeText]);

  return (
    <div className="flex flex-col gap-4 min-h-full">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">
          {t("import.editTitle", "Edit parsed resume")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(
            "import.editDescription",
            "Update the parsed fields here without leaving Import, so job matching and vacancy fetching stay available.",
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {resumeFileName || t("import.fileReady", "Imported file ready")}
          </p>
          <p className="text-xs text-muted-foreground">
            {importedFileType === "pdf"
              ? t("import.editPdfHint", "PDF preview remains available inside Import.")
              : t("import.editDocxHint", "Parsed DOCX content is ready to refine.")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {importedFileType === "pdf" && (
            <button
              onClick={() => setEditorMode("preview")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Eye size={13} />
              {t("import.backToPreview", "View PDF")}
            </button>
          )}

          <button
            onClick={() => void handleFileSelect()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <FileUp size={13} />
            {t("import.replaceFile", "Replace file")}
          </button>

          <button
            onClick={() => {
              clearResume();
              clearEditor();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <RotateCcw size={13} />
            {t("import.startOver", "Start over")}
          </button>
        </div>
      </div>

      <SectionEditor />
    </div>
  );
}
