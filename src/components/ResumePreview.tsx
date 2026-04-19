import { memo, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useBuilderStore } from "../store/useBuilderStore";
import { templates } from "../templates/resumeTemplates";
import type { ExportLabels } from "../types/resume";

export const ResumePreview = memo(function ResumePreview() {
  const { t } = useTranslation();
  const { resume, template } = useBuilderStore();
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

  const html = useMemo(() => {
    const visibleIds = new Set(resume.sections.filter((s) => s.visible).map((s) => s.id));
    return templates[template].render(resume, visibleIds, labels);
  }, [resume, template, labels]);

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

      <div className="flex-1 overflow-auto bg-[#e8eaed] dark:bg-[#2b2b2b] p-6">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            width: 816,
            margin: "0 auto",
          }}
        >
          <div
            className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]"
            style={{ width: 816, minHeight: 1056, padding: "72px" }}
          >
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
          </div>
        </div>
      </div>
    </div>
  );
});
