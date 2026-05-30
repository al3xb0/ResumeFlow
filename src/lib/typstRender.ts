import { invoke } from "@tauri-apps/api/core";
import type { ResumeRenderRequest } from "../types/resume";

export interface ResumePreviewRenderRequest extends ResumeRenderRequest {
  dpi?: number;
  pageIndices?: number[];
}

export interface ResumePreviewPage {
  pageIndex: number;
  base64Png: string;
  widthPx: number;
  heightPx: number;
}

export interface ResumePreviewRenderResponse {
  pages: ResumePreviewPage[];
  totalPages: number;
  cacheKey?: string | null;
}

export interface ResumePdfRenderResponse {
  base64Pdf: string;
  fileName: string;
  cacheKey?: string | null;
}

export function renderResumePreview(request: ResumePreviewRenderRequest) {
  return invoke<ResumePreviewRenderResponse>("render_resume_preview", { request });
}

export function exportResumePdf(request: ResumeRenderRequest) {
  return invoke<ResumePdfRenderResponse>("export_resume_pdf", { request });
}
