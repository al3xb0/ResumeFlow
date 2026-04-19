import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useResumeStore } from "../store/useResumeStore";
import type { PdfLink } from "../store/useResumeStore";
import { useEditorStore } from "../store/useEditorStore";
import { useBuilderStore } from "../store/useBuilderStore";
import { useToast } from "../components/Toast";
import { base64ToUint8 } from "../lib/utils";
import { parseResumeText, mergeExtractedLinks } from "../lib/resumeParser";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function useResumeImport() {
  const { t } = useTranslation();
  const toast = useToast();
  const {
    setResumeText,
    setResumeFileName,
    setImportedFilePath,
    setImportedFileType,
    setIsExtracting,
    setPdfLinks,
  } = useResumeStore();
  const { setEditorMode, setDocumentHtml, setActiveTab } = useEditorStore();
  const { setResumeData } = useBuilderStore();

  const handleFileSelect = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: t("import.supportedFiles"),
            extensions: ["pdf", "docx"],
          },
        ],
      });

      if (!selected) return;

      setIsExtracting(true);
      const filePath = selected;
      const fileName = filePath.split(/[\\/]/).pop() ?? "document";
      const ext = fileName.split(".").pop()?.toLowerCase();

      const fileSize = await invoke<number>("get_file_size", { filePath }).catch(() => 0);
      if (fileSize > MAX_FILE_SIZE_BYTES) {
        toast.error(t("import.fileTooLarge", { max: MAX_FILE_SIZE_MB }));
        setIsExtracting(false);
        return;
      }

      setResumeFileName(fileName);
      setImportedFilePath(filePath);

      try {
        if (ext === "docx") {
          setImportedFileType("docx");
          const base64 = await invoke<string>("read_file_base64", { filePath });
          const bytes = base64ToUint8(base64);
          const mammoth = await import("mammoth");
          const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer as ArrayBuffer });
          setDocumentHtml(result.value);
          const textResult = await mammoth.extractRawText({
            arrayBuffer: bytes.buffer as ArrayBuffer,
          });
          setResumeText(textResult.value);
          const parsed = parseResumeText(textResult.value);
          const linkParser = document.createElement("div");
          linkParser.innerHTML = result.value;
          const anchors = linkParser.querySelectorAll("a[href]");
          const extractedLinks: PdfLink[] = Array.from(anchors)
            .map((a) => ({ url: a.getAttribute("href") || "", page: 1 }))
            .filter((l) => l.url && !/^javascript:/i.test(l.url));
          setPdfLinks(extractedLinks);
          setResumeData(
            mergeExtractedLinks(
              parsed,
              extractedLinks.map((l) => l.url),
            ),
          );
          setEditorMode("editing");
          setActiveTab("editor");
          toast.success(t("import.docxImported"));
        } else {
          setImportedFileType("pdf");
          const text = await invoke<string>("extract_pdf_text", { filePath });
          setResumeText(text);
          const parsed = parseResumeText(text);
          setResumeData(parsed);
          invoke<PdfLink[]>("extract_pdf_links", { filePath })
            .then((links) => {
              setPdfLinks(links);
              const enriched = mergeExtractedLinks(
                parsed,
                links.map((l) => l.url),
              );
              setResumeData(enriched);
            })
            .catch(() => setPdfLinks([]));
          setEditorMode("preview");
          toast.success(t("import.extracted"));
        }
      } catch (err) {
        console.error("File extraction error:", err);
        setResumeText("");
        setResumeFileName(null);
        setImportedFilePath(null);
        setImportedFileType(null);
        toast.error(t("import.extractionError"));
      } finally {
        setIsExtracting(false);
      }
    } catch (err) {
      console.error("File dialog error:", err);
    }
  }, [
    t,
    toast,
    setIsExtracting,
    setResumeFileName,
    setResumeText,
    setPdfLinks,
    setImportedFilePath,
    setImportedFileType,
    setEditorMode,
    setDocumentHtml,
    setActiveTab,
    setResumeData,
  ]);

  const handleClearText = useCallback(() => {
    setResumeText("");
    setResumeFileName(null);
    setImportedFilePath(null);
    setImportedFileType(null);
  }, [setResumeText, setResumeFileName, setImportedFilePath, setImportedFileType]);

  return { handleFileSelect, handleClearText };
}
