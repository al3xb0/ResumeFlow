import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FileUp, X, Loader2, Link as LinkIcon } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { useResumeStore } from "../store/useResumeStore";
import type { PdfLink } from "../store/useResumeStore";
import { useToast } from "./Toast";
import { cn } from "../lib/utils";

export function ResumeImport() {
  const { t } = useTranslation();
  const toast = useToast();
  const {
    resumeText,
    resumeFileName,
    isExtracting,
    pdfLinks,
    setResumeText,
    setResumeFileName,
    setIsExtracting,
    setPdfLinks,
    clearResume,
  } = useResumeStore();

  const handleFileSelect = useCallback(async () => {
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
        const filePath = selected;
        const fileName = filePath.split(/[\\/]/).pop() ?? "document.pdf";
        setResumeFileName(fileName);

        try {
          const text = await invoke<string>("extract_pdf_text", {
            filePath: filePath,
          });
          setResumeText(text);

          // Extract hyperlinks in parallel (non-blocking)
          invoke<PdfLink[]>("extract_pdf_links", { filePath })
            .then((links) => setPdfLinks(links))
            .catch(() => setPdfLinks([]));

          toast.success(t("import.extracted"));
        } catch (err) {
          console.error("PDF extraction error:", err);
          setResumeText("");
          setResumeFileName(null);
          toast.error(t("import.extractionError"));
        } finally {
          setIsExtracting(false);
        }
      }
    } catch (err) {
      console.error("File dialog error:", err);
    }
  }, [t, toast, setIsExtracting, setResumeFileName, setResumeText, setPdfLinks]);

  const handleClearText = useCallback(() => {
    setResumeText("");
    setResumeFileName(null);
  }, [setResumeText, setResumeFileName]);

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
          "rounded-xl bg-secondary/50 border border-border",
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
        <div className="flex items-center justify-between bg-secondary/50 rounded-xl border border-border px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileUp size={14} className="text-primary shrink-0" />
            <span className="text-sm text-foreground truncate">
              {resumeFileName}
            </span>
            <span className="text-xs text-success">
              ✓ {t("import.extracted")}
            </span>
          </div>
          <button
            onClick={clearResume}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title={t("import.clear")}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {pdfLinks.length > 0 && (
        <div className="bg-secondary/50 rounded-xl border border-border px-3 py-2">
          <div className="flex items-center gap-2 mb-1.5">
            <LinkIcon size={14} className="text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {t("import.linksFound", { count: pdfLinks.length })}
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {pdfLinks.map((link, i) => (
              <li key={i} className="truncate" title={link.url}>
                <button
                  onClick={() => openUrl(link.url)}
                  className="text-xs text-primary hover:underline truncate text-left max-w-full"
                >
                  {link.url}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          {t("import.orPasteText")}
        </label>

        <div className="relative">
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder={t("import.resumeTextPlaceholder")}
            className={cn(
              "w-full h-48 p-3 pr-9 rounded-xl bg-secondary/50 border border-border",
              "text-sm text-foreground placeholder:text-muted-foreground/50",
              "resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
              "transition-colors"
            )}
          />

          {resumeText && (
            <button
              onClick={handleClearText}
              className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title={t("import.clear")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {resumeText && (
          <p className="text-[11px] text-muted-foreground mt-1.5 text-right tabular-nums">
            {resumeText.trim().split(/\s+/).filter(Boolean).length} words
          </p>
        )}
      </div>
    </div>
  );
}
