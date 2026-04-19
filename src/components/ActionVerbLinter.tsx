import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import { useResumeStore, type VerbLintResult } from "../store/useResumeStore";
import { useToast } from "./Toast";

export function ActionVerbLinter() {
  const { t } = useTranslation();
  const toast = useToast();
  const { resumeText, verbLintResult, setVerbLintResult } = useResumeStore();

  useEffect(() => {
    if (!resumeText.trim()) {
      setVerbLintResult(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const result = await invoke<VerbLintResult>("lint_verbs", {
          resumeText,
        });
        setVerbLintResult(result);
      } catch (err) {
        console.error("Verb lint error:", err);
        toast.error(t("verbLinter.error"));
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [resumeText, setVerbLintResult, toast, t]);

  const handleCopySuggestion = useCallback(
    (text: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          toast.success(t("verbLinter.copied", { word: text }));
        })
        .catch(() => {
          toast.error(t("common.clipboardError"));
        });
    },
    [toast, t],
  );

  if (!verbLintResult || verbLintResult.totalIssues === 0) {
    if (resumeText.trim()) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-success/5 border border-success/20">
          <Sparkles size={14} className="text-success" />
          <span className="text-xs text-success">{t("verbLinter.allGood")}</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-warning" />
        <span className="text-sm font-medium text-foreground">{t("verbLinter.title")}</span>
        <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-5 text-center bg-warning/15 text-warning">
          {verbLintResult.totalIssues}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-75 overflow-y-auto">
        {verbLintResult.issues.map((issue, idx) => (
          <div
            key={`${issue.weakVerb}-${issue.line}-${idx}`}
            className="flex flex-col gap-1.5 p-3 rounded-xl bg-warning/5 border border-warning/20"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t("verbLinter.line")} {issue.line}
              </span>
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-warning/10 text-warning border border-warning/20">
                &ldquo;{issue.weakVerb}&rdquo;
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Lightbulb size={10} className="text-muted-foreground" />
              {issue.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleCopySuggestion(suggestion)}
                  className="px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                  title={t("verbLinter.clickToCopy")}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
