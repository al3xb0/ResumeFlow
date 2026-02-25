import { useTranslation } from "react-i18next";
import { FileUp, X, Loader2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useResumeStore } from "../store/useResumeStore";
import { cn } from "../lib/utils";

export function ResumeImport() {
  const { t } = useTranslation();
  const {
    resumeText,
    resumeFileName,
    isExtracting,
    setResumeText,
    setResumeFileName,
    setIsExtracting,
    clearResume,
  } = useResumeStore();

  const handleFileSelect = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "PDF",
            extensions: ["pdf"],
          },
        ],
      });

      if (selected) {
        setIsExtracting(true);
        const filePath = typeof selected === "string" ? selected : selected;
        const fileName = filePath.split(/[\\/]/).pop() ?? "document.pdf";
        setResumeFileName(fileName);

        try {
          const text = await invoke<string>("extract_pdf_text", {
            filePath: filePath,
          });
          setResumeText(text);
        } catch (err) {
          console.error("PDF extraction error:", err);
          setResumeText("");
          setResumeFileName(null);
          alert(t("import.extractionError") + "\n" + String(err));
        } finally {
          setIsExtracting(false);
        }
      }
    } catch (err) {
      console.error("File dialog error:", err);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">
          {t("import.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("import.description")}
        </p>
      </div>

      <button
        onClick={handleFileSelect}
        disabled={isExtracting}
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-8",
          "border-2 border-dashed border-border rounded-xl",
          "hover:border-primary/50 hover:bg-primary/5 transition-colors",
          "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        {isExtracting ? (
          <>
            <Loader2 size={32} className="text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">
              {t("import.extracting")}
            </span>
          </>
        ) : (
          <>
            <FileUp size={32} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t("import.dropzone")}
            </span>
            <span className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md font-medium">
              {t("import.browse")}
            </span>
          </>
        )}
      </button>

      {resumeFileName && (
        <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <FileUp size={14} className="text-primary" />
            <span className="text-sm text-foreground">{resumeFileName}</span>
            <span className="text-xs text-success">
              ✓ {t("import.extracted")}
            </span>
          </div>
          <button
            onClick={clearResume}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="relative">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          {t("import.orPasteText")}
        </label>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder={t("import.resumeTextPlaceholder")}
          className={cn(
            "w-full h-48 p-3 rounded-xl bg-secondary/50 border border-border",
            "text-sm text-foreground placeholder:text-muted-foreground/50",
            "resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
            "transition-colors"
          )}
        />
        {resumeText && (
          <button
            onClick={() => {
              setResumeText("");
              setResumeFileName(null);
            }}
            className="absolute top-8 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
