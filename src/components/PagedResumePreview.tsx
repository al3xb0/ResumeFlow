import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { getTauriErrorMessage } from "../lib/tauriError";
import { renderResumePreview, type ResumePreviewPage } from "../lib/typstRender";
import type { ResumeRenderRequest } from "../types/resume";

export type PagedResumeRenderMode = "preview";

const PREVIEW_DEBOUNCE_MS = 300;
const PREVIEW_DPI_BASE = 120;
const PREVIEW_DPI_MIN = 96;
const PREVIEW_DPI_MAX = 144;

function getViewerWidth(pageWidthPx: number, scale: number): number {
  return Math.max(360, Math.round(pageWidthPx * Math.max(scale, 0.6) + 112));
}

function getPreviewDpi(scale: number): number {
  return Math.max(PREVIEW_DPI_MIN, Math.min(PREVIEW_DPI_MAX, Math.round(PREVIEW_DPI_BASE * scale)));
}

interface PagedResumePreviewProps {
  renderRequest: ResumeRenderRequest;
  scale: number;
  pageWidthPx: number;
  pageHeightPx: number;
  onReady?: (mode: PagedResumeRenderMode) => void;
}

export const PagedResumePreview = memo(function PagedResumePreview({
  renderRequest,
  scale,
  pageWidthPx,
  pageHeightPx,
  onReady,
}: PagedResumePreviewProps) {
  const { t } = useTranslation();
  const onReadyRef = useRef(onReady);
  const generationRef = useRef(0);
  const [pages, setPages] = useState<ResumePreviewPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const currentGeneration = generationRef.current + 1;
    generationRef.current = currentGeneration;

    setIsLoading(true);
    setErrorMessage(null);

    const timeoutId = window.setTimeout(() => {
      void renderResumePreview({
        ...renderRequest,
        dpi: getPreviewDpi(scale),
      })
        .then((response) => {
          if (generationRef.current !== currentGeneration) {
            return;
          }

          setPages(response.pages);
          setIsLoading(false);
          onReadyRef.current?.("preview");
        })
        .catch((error: unknown) => {
          if (generationRef.current !== currentGeneration) {
            return;
          }

          console.error("Failed to render resume preview with Typst:", error);
          setPages([]);
          setIsLoading(false);
          setErrorMessage(getTauriErrorMessage(error, t, "errors.unknown"));
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [renderRequest, scale, t]);

  const wrapperStyle = useMemo(
    () =>
      ({
        "--resume-preview-width": `${getViewerWidth(pageWidthPx, scale)}px`,
        "--resume-preview-page-width": `${Math.round(pageWidthPx * scale)}px`,
        "--resume-preview-page-min-height": `${Math.round(pageHeightPx * scale)}px`,
      }) as CSSProperties,
    [pageHeightPx, pageWidthPx, scale],
  );

  return (
    <div className="resume-preview-shell" style={wrapperStyle}>
      <style>{`
        .resume-preview-shell {
          width: var(--resume-preview-width);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 24px 0 32px;
        }

        .resume-preview-viewer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .resume-preview-page {
          width: var(--resume-preview-page-width);
          min-height: var(--resume-preview-page-min-height);
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 44px rgba(15, 23, 42, 0.08), 0 6px 18px rgba(15, 23, 42, 0.06);
        }

        .resume-preview-page img {
          width: 100%;
          height: auto;
          display: block;
          background: #ffffff;
        }

        .resume-preview-status {
          min-height: var(--resume-preview-page-min-height);
          width: var(--resume-preview-page-width);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.96);
          color: #475569;
          box-shadow: 0 20px 44px rgba(15, 23, 42, 0.08), 0 6px 18px rgba(15, 23, 42, 0.06);
        }

        .resume-preview-status[data-state="error"] {
          color: #b91c1c;
        }
      `}</style>
      <div className="resume-preview-viewer" data-testid="typst-preview-host">
        {isLoading ? (
          <div className="resume-preview-status" data-state="loading">
            {t("builder.previewLoading", "Loading preview...")}
          </div>
        ) : errorMessage ? (
          <div className="resume-preview-status" data-state="error">
            {errorMessage}
          </div>
        ) : (
          pages.map((page) => (
            <div key={page.pageIndex} className="resume-preview-page">
              <img
                src={`data:image/png;base64,${page.base64Png}`}
                alt={t("builder.pageCounter", "Page {{page}} of {{pageCount}}", {
                  page: page.pageIndex + 1,
                  pageCount: pages.length,
                })}
                data-testid={`typst-preview-page-${page.pageIndex}`}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
});
