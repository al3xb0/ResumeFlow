import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  FileText,
} from "lucide-react";
import { useEditorStore, type SectionType } from "../store/useEditorStore";
import { useResumeStore } from "../store/useResumeStore";
import { useToast } from "./Toast";
import { cn } from "../lib/utils";

export function ResumeEditor() {
  const { t } = useTranslation();
  const {
    sections,
    addSection,
    removeSection,
    updateSection,
    toggleCollapse,
    focusSection,
    moveSection,
    loadFromText,
    toPlainText,
    clearEditor,
  } = useEditorStore();
  const { resumeText, setResumeText } = useResumeStore();
  const toast = useToast();

  useEffect(() => {
    if (resumeText.trim() && sections.every((s) => !s.content.trim())) {
      loadFromText(resumeText);
    }
  }, []);

  const handleSyncToResume = useCallback((showToast = false) => {
    const text = toPlainText();
    setResumeText(text);
    if (showToast) {
      toast.success(t("editor.synced"));
    }
  }, [toPlainText, setResumeText, toast, t]);

  useEffect(() => {
    const hasContent = sections.some((s) => s.content.trim());
    if (hasContent) {
      const timeout = setTimeout(() => {
        handleSyncToResume();
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [sections, handleSyncToResume]);

  const handleAddSection = useCallback(
    (type: SectionType) => {
      const titles: Record<SectionType, string> = {
        summary: t("editor.sectionSummary"),
        experience: t("editor.sectionExperience"),
        education: t("editor.sectionEducation"),
        skills: t("editor.sectionSkills"),
        custom: t("editor.sectionCustom"),
      };
      addSection(type, titles[type]);
    },
    [addSection, t]
  );

  const sectionTypeOptions: Array<{ type: SectionType; label: string }> = [
    { type: "summary", label: t("editor.sectionSummary") },
    { type: "experience", label: t("editor.sectionExperience") },
    { type: "education", label: t("editor.sectionEducation") },
    { type: "skills", label: t("editor.sectionSkills") },
    { type: "custom", label: t("editor.sectionCustom") },
  ];

  const getSectionIcon = (type: SectionType) => {
    const colors: Record<SectionType, string> = {
      summary: "bg-blue-500/20 text-blue-400",
      experience: "bg-emerald-500/20 text-emerald-400",
      education: "bg-purple-500/20 text-purple-400",
      skills: "bg-amber-500/20 text-amber-400",
      custom: "bg-gray-500/20 text-gray-400",
    };
    return colors[type];
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          {t("editor.title")}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSyncToResume(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download size={12} />
            {t("editor.syncToResume")}
          </button>
          <button
            onClick={clearEditor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors"
          >
            {t("import.clear")}
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <FileText size={48} className="text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">
            {t("editor.empty")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto flex-1 pb-4">
          {sections.map((section, idx) => (
            <div
              key={section.id}
              className="rounded-xl border border-border bg-card overflow-hidden animate-in"
            >
              <div
                className="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none hover:bg-secondary/30 transition-colors"
                onClick={() =>
                  section.collapsed
                    ? focusSection(section.id)
                    : toggleCollapse(section.id)
                }
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold",
                    getSectionIcon(section.type)
                  )}
                >
                  {section.type[0].toUpperCase()}
                </div>

                {section.collapsed ? (
                  <ChevronRight size={14} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={14} className="text-muted-foreground" />
                )}

                <input
                  type="text"
                  value={section.title}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    updateSection(section.id, { title: e.target.value })
                  }
                  className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none border-none placeholder:text-muted-foreground"
                  placeholder={t("editor.sectionTitlePlaceholder")}
                />

                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSection(section.id, "up");
                    }}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-secondary/60 text-muted-foreground disabled:opacity-30 transition-colors"
                    title={t("editor.moveUp")}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSection(section.id, "down");
                    }}
                    disabled={idx === sections.length - 1}
                    className="p-1 rounded hover:bg-secondary/60 text-muted-foreground disabled:opacity-30 transition-colors"
                    title={t("editor.moveDown")}
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSection(section.id);
                    }}
                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    title={t("editor.removeSection")}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {!section.collapsed && (
                <div className="px-4 pb-3">
                  <AutoGrowTextarea
                    value={section.content}
                    onChange={(e) =>
                      updateSection(section.id, { content: e.target.value })
                    }
                    onFocus={() => focusSection(section.id)}
                    placeholder={t("editor.contentPlaceholder")}
                    className="w-full min-h-[80px] bg-secondary/30 rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border border-border/50 focus:border-primary/50 transition-colors resize-none overflow-hidden"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground mr-1">
          {t("editor.addSection")}:
        </span>
        {sectionTypeOptions.map((opt) => (
          <button
            key={opt.type}
            onClick={() => handleAddSection(opt.type)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus size={10} />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AutoGrowTextarea({
  value,
  onChange,
  onFocus,
  placeholder,
  className,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 80)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      placeholder={placeholder}
      className={className}
    />
  );
}
