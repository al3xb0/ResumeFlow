import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useBuilderStore } from "../store/useBuilderStore";
import { buildResumeRenderRequest } from "../lib/resumeRenderRequest";
import { PagedResumePreview } from "./PagedResumePreview";
import type { ExportLabels } from "../types/resume";
import { RESUME_PAGE_HEIGHT_PX, RESUME_PAGE_WIDTH_PX } from "../types/resume";

export const ResumePreview = memo(function ResumePreview() {
  const { t } = useTranslation();
  const { resume, template, layoutSettings } = useBuilderStore();
  const ZOOM_KEY = "resumeflow-zoom";
  const DEFAULT_ZOOM = 0.7;
  const [scale, setScale] = useState(() => {
    const saved = localStorage.getItem(ZOOM_KEY);
    if (saved) {
      const n = Number(saved);
      if (Number.isFinite(n) && n >= 0.3 && n <= 2) return n;
    }
    return DEFAULT_ZOOM;
  });
  const persistScale = useCallback((fn: (prev: number) => number) => {
    setScale((prev) => {
      const next = fn(prev);
      localStorage.setItem(ZOOM_KEY, String(next));
      return next;
    });
  }, []);

  const labels: ExportLabels = useMemo(
    () => ({
      present: t("builder.present"),
      gpa: t("builder.gpa", "GPA"),
    }),
    [t],
  );

  const renderRequest = useMemo(
    () =>
      buildResumeRenderRequest({
        resume,
        labels,
        template,
        layoutSettings,
      }),
    [layoutSettings, labels, resume, template],
  );
  const deferredRenderRequest = useDeferredValue(renderRequest);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-b border-border bg-card shrink-0">
        <button
          onClick={() => persistScale((s) => Math.max(0.3, +(s - 0.1).toFixed(1)))}
          disabled={scale <= 0.3}
          aria-label={t("common.zoomOut", "Zoom out")}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-30 transition-colors"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs text-muted-foreground tabular-nums min-w-10 text-center select-none">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => persistScale((s) => Math.min(2, +(s + 0.1).toFixed(1)))}
          disabled={scale >= 2}
          aria-label={t("common.zoomIn", "Zoom in")}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-30 transition-colors"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => persistScale(() => DEFAULT_ZOOM)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          aria-label={t("common.resetZoom", "Reset zoom")}
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-[#eef1f5] dark:bg-[#eef1f5] p-6">
        <PagedResumePreview
          renderRequest={deferredRenderRequest}
          scale={scale}
          pageWidthPx={RESUME_PAGE_WIDTH_PX}
          pageHeightPx={RESUME_PAGE_HEIGHT_PX}
        />
      </div>
    </div>
  );
});
