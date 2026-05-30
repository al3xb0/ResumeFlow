import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, StretchHorizontal } from "lucide-react";
import { useBuilderStore } from "../../store/useBuilderStore";
import { DEFAULT_LAYOUT_SETTINGS, type LayoutSettings } from "../../types/resume";

const MARGIN_FIELDS = [
  { key: "pageMarginTopPx", translationKey: "builder.layoutMarginTop", fallback: "Top" },
  { key: "pageMarginRightPx", translationKey: "builder.layoutMarginRight", fallback: "Right" },
  { key: "pageMarginBottomPx", translationKey: "builder.layoutMarginBottom", fallback: "Bottom" },
  { key: "pageMarginLeftPx", translationKey: "builder.layoutMarginLeft", fallback: "Left" },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<
    LayoutSettings,
    "pageMarginTopPx" | "pageMarginRightPx" | "pageMarginBottomPx" | "pageMarginLeftPx"
  >;
  translationKey: string;
  fallback: string;
}>;

function clampMargin(value: number): number {
  return Math.min(144, Math.max(0, Math.round(value || 0)));
}

export const PageLayoutPanel = memo(function PageLayoutPanel() {
  const { t } = useTranslation();
  const { layoutSettings, setLayoutSettings } = useBuilderStore();

  const updateMargin = useCallback(
    (
      key: keyof Pick<
        LayoutSettings,
        "pageMarginTopPx" | "pageMarginRightPx" | "pageMarginBottomPx" | "pageMarginLeftPx"
      >,
      nextValue: number,
    ) => {
      setLayoutSettings({
        ...layoutSettings,
        [key]: clampMargin(nextValue),
      });
    },
    [layoutSettings, setLayoutSettings],
  );

  const isDefaultLayout =
    layoutSettings.pageMarginTopPx === DEFAULT_LAYOUT_SETTINGS.pageMarginTopPx &&
    layoutSettings.pageMarginRightPx === DEFAULT_LAYOUT_SETTINGS.pageMarginRightPx &&
    layoutSettings.pageMarginBottomPx === DEFAULT_LAYOUT_SETTINGS.pageMarginBottomPx &&
    layoutSettings.pageMarginLeftPx === DEFAULT_LAYOUT_SETTINGS.pageMarginLeftPx;

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-foreground">
            <StretchHorizontal size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-medium">{t("builder.layoutMargins", "Margins")}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              "builder.layoutMarginsHelp",
              "Page margins now live here, while field styling sits next to the relevant editor inputs.",
            )}
          </p>
        </div>

        {!isDefaultLayout ? (
          <button
            onClick={() =>
              setLayoutSettings({
                ...layoutSettings,
                pageMarginTopPx: DEFAULT_LAYOUT_SETTINGS.pageMarginTopPx,
                pageMarginRightPx: DEFAULT_LAYOUT_SETTINGS.pageMarginRightPx,
                pageMarginBottomPx: DEFAULT_LAYOUT_SETTINGS.pageMarginBottomPx,
                pageMarginLeftPx: DEFAULT_LAYOUT_SETTINGS.pageMarginLeftPx,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <RotateCcw size={12} />
            {t("builder.layoutReset", "Reset")}
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {MARGIN_FIELDS.map(({ key, translationKey, fallback }) => (
          <label
            key={key}
            className="flex flex-col gap-1.5 rounded-xl border border-border/70 bg-secondary/20 p-3"
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t(translationKey, fallback)}
            </span>
            <input
              type="number"
              min={0}
              max={144}
              value={layoutSettings[key]}
              onChange={(event) => updateMargin(key, Number(event.target.value))}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
        ))}
      </div>
    </section>
  );
});
