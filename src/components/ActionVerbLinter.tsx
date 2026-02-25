import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import {
  useResumeStore,
  type VerbLintResult,
} from "../store/useResumeStore";
import { useToast } from "./Toast";
import { cn } from "../lib/utils";

export function ActionVerbLinter() {
  const { t } = useTranslation();
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
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [resumeText, setVerbLintResult]);

  const toast = useToast();

  const handleCopySuggestion = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(t("verbLinter.copied", { word: text }));
    }).catch(() => {});
  }, [toast, t]);

  if (!verbLintResult || verbLintResult.totalIssues === 0) {
    if (resumeText.trim()) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-success/5 border border-success/20">
          <Sparkles size={14} className="text-success" />
          <span className="text-xs text-success">
            {t("verbLinter.allGood")}
          </span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-warning" />
        <span className="text-sm font-medium text-foreground">
          {t("verbLinter.title")}
        </span>
        <span className="text-xs text-muted-foreground">
          ({verbLintResult.totalIssues})
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
        {verbLintResult.issues.map((issue, idx) => (
          <div
            key={`${issue.weakVerb}-${issue.line}-${idx}`}
            className="flex flex-col gap-1.5 p-3 rounded-lg bg-warning/5 border border-warning/20"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t("verbLinter.line")} {issue.line}
              </span>
              <span className="text-xs font-medium text-warning">
                &ldquo;{issue.weakVerb}&rdquo;
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Lightbulb size={10} className="text-muted-foreground" />
              {issue.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleCopySuggestion(suggestion)}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                    "bg-primary/10 text-primary border border-primary/20",
                    "hover:bg-primary/20 cursor-pointer"
                  )}
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
