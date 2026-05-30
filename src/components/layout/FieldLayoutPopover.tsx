import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { resolveLayoutSettings, FONT_FAMILY_OPTIONS } from "../../lib/layoutSettings";
import { useBuilderStore } from "../../store/useBuilderStore";
import {
  DEFAULT_LAYOUT_FIELD_SPACING,
  DEFAULT_LAYOUT_FIELD_TYPOGRAPHY,
  normalizeTypstTemplate,
  type FieldSpacingKey,
  type TypographyField,
  type TypographyRoleSettings,
} from "../../types/resume";
import {
  clampFieldSpacingValue,
  FIELD_SPACING_INPUT_GROUPS,
  FIELD_SPACING_LABELS,
  FONT_WEIGHT_OPTIONS,
  hasSpacingOverride,
  hasTypographyOverride,
  TYPOGRAPHY_FIELD_LABELS,
} from "./fieldLayoutConfig";

interface FieldLayoutPopoverProps {
  field: TypographyField;
  compact?: boolean;
}

export const FieldLayoutPopover = memo(function FieldLayoutPopover({
  field,
  compact = false,
}: FieldLayoutPopoverProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { template, layoutSettings, setLayoutSettings } = useBuilderStore();
  const activeTemplate = normalizeTypstTemplate(template);

  const resolvedLayoutSettings = useMemo(
    () => resolveLayoutSettings(layoutSettings, activeTemplate),
    [activeTemplate, layoutSettings],
  );

  const fieldTypography = layoutSettings.fieldTypography ?? DEFAULT_LAYOUT_FIELD_TYPOGRAPHY;
  const fieldSpacing = layoutSettings.fieldSpacing ?? DEFAULT_LAYOUT_FIELD_SPACING;
  const resolvedTypography = resolvedLayoutSettings.fieldTypography[field];
  const resolvedSpacing = resolvedLayoutSettings.fieldSpacing[field];
  const hasOverride =
    hasTypographyOverride(fieldTypography[field]) || hasSpacingOverride(fieldSpacing[field]);
  const fieldLabel = t(`builder.layoutField.${field}`, TYPOGRAPHY_FIELD_LABELS[field]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const updateTypographyField = useCallback(
    <K extends keyof TypographyRoleSettings>(key: K, value: TypographyRoleSettings[K]) => {
      setLayoutSettings({
        ...layoutSettings,
        fieldTypography: {
          ...fieldTypography,
          [field]: {
            ...fieldTypography[field],
            [key]: value,
          },
        },
      });
    },
    [field, fieldTypography, layoutSettings, setLayoutSettings],
  );

  const updateFieldSpacing = useCallback(
    (key: FieldSpacingKey, nextValue: number) => {
      setLayoutSettings({
        ...layoutSettings,
        fieldSpacing: {
          ...fieldSpacing,
          [field]: {
            ...fieldSpacing[field],
            [key]: clampFieldSpacingValue(nextValue),
          },
        },
      });
    },
    [field, fieldSpacing, layoutSettings, setLayoutSettings],
  );

  const resetFieldOverrides = useCallback(
    (event?: ReactMouseEvent<HTMLButtonElement>) => {
      event?.stopPropagation();
      setLayoutSettings({
        ...layoutSettings,
        fieldTypography: {
          ...fieldTypography,
          [field]: DEFAULT_LAYOUT_FIELD_TYPOGRAPHY[field],
        },
        fieldSpacing: {
          ...fieldSpacing,
          [field]: DEFAULT_LAYOUT_FIELD_SPACING[field],
        },
      });
    },
    [field, fieldSpacing, fieldTypography, layoutSettings, setLayoutSettings],
  );

  return (
    <div ref={panelRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={t("builder.layoutFieldButtonAria", "Edit layout for {{field}}", {
          field: fieldLabel,
        })}
        className={[
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
          hasOverride
            ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
            : "border-border bg-background text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
          compact ? "h-7" : "h-8",
        ].join(" ")}
      >
        <SlidersHorizontal size={12} />
        <span>{t("builder.layoutFieldButton", "Style")}</span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-[24rem] rounded-2xl border border-border bg-card p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-medium text-foreground">{fieldLabel}</h4>
              <p className="text-[11px] text-muted-foreground">{field}</p>
            </div>
            {hasOverride ? (
              <button
                type="button"
                onClick={resetFieldOverrides}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                <RotateCcw size={11} />
                {t("builder.layoutResetField", "Reset")}
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            <section className="space-y-2">
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("builder.layoutTypography", "Typography")}
              </h5>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground sm:col-span-2">
                  <span>{t("builder.layoutFontFamily", "Font family")}</span>
                  <select
                    value={resolvedTypography.fontFamily}
                    onChange={(event) => updateTypographyField("fontFamily", event.target.value)}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {FONT_FAMILY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                  <span>{t("builder.layoutFontSize", "Size")}</span>
                  <input
                    type="number"
                    min={8}
                    max={40}
                    value={resolvedTypography.fontSizePx}
                    onChange={(event) =>
                      updateTypographyField("fontSizePx", Number(event.target.value))
                    }
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </label>

                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                  <span>{t("builder.layoutFontWeight", "Font weight")}</span>
                  <select
                    value={String(resolvedTypography.fontWeight)}
                    onChange={(event) =>
                      updateTypographyField("fontWeight", Number(event.target.value))
                    }
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {FONT_WEIGHT_OPTIONS.map((weight) => (
                      <option key={weight} value={weight}>
                        {weight}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground sm:col-span-2">
                  <span>{t("builder.layoutFontStyle", "Font style")}</span>
                  <select
                    value={resolvedTypography.fontStyle}
                    onChange={(event) =>
                      updateTypographyField(
                        "fontStyle",
                        event.target.value as TypographyRoleSettings["fontStyle"],
                      )
                    }
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="normal">{t("builder.layoutFontStyleNormal", "Normal")}</option>
                    <option value="italic">{t("builder.layoutFontStyleItalic", "Italic")}</option>
                  </select>
                </label>
              </div>
            </section>

            {FIELD_SPACING_INPUT_GROUPS.map((group) => (
              <section key={group.title} className="space-y-2">
                <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t(
                    group.title === "Outer margin"
                      ? "builder.layoutOuterMargin"
                      : "builder.layoutInnerPadding",
                    group.title,
                  )}
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  {group.keys.map((key) => (
                    <label
                      key={key}
                      className="flex flex-col gap-1 text-[11px] text-muted-foreground"
                    >
                      <span>{t(`builder.${key}`, FIELD_SPACING_LABELS[key])}</span>
                      <input
                        type="number"
                        min={0}
                        max={48}
                        value={resolvedSpacing[key]}
                        onChange={(event) => updateFieldSpacing(key, Number(event.target.value))}
                        className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
});
