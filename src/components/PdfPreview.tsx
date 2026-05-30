import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Document, Page, pdfjs } from "react-pdf";
import { invoke } from "@tauri-apps/api/core";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FileEdit,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { useEditorStore } from "../store/useEditorStore";
import { useToast } from "./Toast";
import { cn } from "../lib/utils";
import { getTauriErrorMessage } from "../lib/tauriError";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export function PdfPreview() {
  const DEFAULT_SCALE = 0.9;
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 3;
  const { t } = useTranslation();
  const toast = useToast();
  const { importedFilePath, resumeText } = useResumeStore();
  const { setEditorMode, setDocumentHtml } = useEditorStore();

  const [pdfData, setPdfData] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);

  const isLoading = !!importedFilePath && loadedPath !== importedFilePath;

  useEffect(() => {
    if (!importedFilePath) return;
    let cancelled = false;
    invoke<string>("read_file_base64", { filePath: importedFilePath })
      .then((base64) => {
        if (!cancelled) {
          setPdfData(`data:application/pdf;base64,${base64}`);
          setLoadedPath(importedFilePath);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load PDF:", err);
          toast.error(getTauriErrorMessage(err, t, "import.extractionError"));
          setLoadedPath(importedFilePath);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [importedFilePath, t, toast]);

  const handleConvertToEditable = useCallback(() => {
    if (!resumeText.trim()) {
      toast.error(t("editor.noTextToConvert"));
      return;
    }
    const html = textToBasicHtml(resumeText);
    setDocumentHtml(html);
    setEditorMode("editing");
    toast.success(t("editor.convertedToEditable"));
  }, [resumeText, setDocumentHtml, setEditorMode, toast, t]);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setCurrentPage(1);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 size={32} className="text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!pdfData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-muted-foreground">{t("editor.noPdfLoaded")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card rounded-t-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            aria-label={t("common.previousPage", "Previous page")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums min-w-15 text-center">
            {currentPage} / {numPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            aria-label={t("common.nextPage", "Next page")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>

          <div className="w-px h-5 bg-border mx-2" />

          <button
            onClick={() => setScale((s) => Math.max(MIN_SCALE, +(s - 0.15).toFixed(2)))}
            disabled={scale <= MIN_SCALE}
            aria-label={t("common.zoomOut", "Zoom out")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-30 transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums min-w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(MAX_SCALE, +(s + 0.15).toFixed(2)))}
            disabled={scale >= MAX_SCALE}
            aria-label={t("common.zoomIn", "Zoom in")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-30 transition-colors"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setScale(DEFAULT_SCALE)}
            aria-label={t("common.resetZoom", "Reset zoom")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <button
          onClick={handleConvertToEditable}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm",
            "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          <FileEdit size={14} />
          {t("editor.convertToEditable")}
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-white flex justify-center p-6">
        <Document
          file={pdfData}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">{t("common.loading")}</span>
            </div>
          }
          error={<p className="text-sm text-destructive">{t("import.extractionError")}</p>}
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            className="shadow-lg rounded-lg overflow-hidden"
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
    </div>
  );
}

function textToBasicHtml(text: string): string {
  const sectionPattern =
    /^(summary|about|objective|profile|experience|work|employment|professional|education|university|skills|technologies|tech stack|contact|header|projects|certifications|awards|publications|languages|interests|references)$/i;

  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (sectionPattern.test(trimmed)) {
        return `<h2>${escapeHtml(trimmed)}</h2>`;
      }
      if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
        return `<li>${escapeHtml(trimmed.slice(2))}</li>`;
      }
      return `<p>${escapeHtml(trimmed)}</p>`;
    })
    .join("");
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
