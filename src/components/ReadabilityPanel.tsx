import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { useResumeStore, type ReadabilityResult } from "../store/useResumeStore";
import { cn } from "../lib/utils";
import { useEffect } from "react";

export function ReadabilityPanel() {
  const { t } = useTranslation();
  const { resumeText, readabilityResult, setReadabilityResult } =
    useResumeStore();

  useEffect(() => {
    if (!resumeText.trim()) {
      setReadabilityResult(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const result = await invoke<ReadabilityResult>("check_readability", {
          resumeText,
        });
        setReadabilityResult(result);
      } catch (err) {
        console.error("Readability check error:", err);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [resumeText, setReadabilityResult]);

  if (!readabilityResult) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Eye size={32} className="text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">
          {t("readability.noResult")}
        </p>
      </div>
    );
  }

  const { score, wordCount, sectionsFound, sectionsMissing, warnings, positives } =
    readabilityResult;

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-success";
    if (s >= 50) return "text-warning";
    return "text-destructive";
  };

  const getScoreVariant = (s: number): "success" | "warning" | "destructive" => {
    if (s >= 80) return "success";
    if (s >= 50) return "warning";
    return "destructive";
  };

  const variant = getScoreVariant(score);

  const scoreBg: Record<string, string> = {
    success: "bg-success/10 border-success/20",
    warning: "bg-warning/10 border-warning/20",
    destructive: "bg-destructive/10 border-destructive/20",
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border p-4",
          scoreBg[variant]
        )}
      >
        <div className="flex items-center gap-2">
          <FileText size={16} className={getScoreColor(score)} />
          <span className="text-sm font-medium text-foreground">
            {t("readability.score")}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            {t("readability.wordCount")}:{" "}
            <strong className="text-foreground">{wordCount}</strong>
          </span>
          <span className={cn("text-lg font-bold", getScoreColor(score))}>
            {score}%
          </span>
        </div>
      </div>

      {sectionsFound.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 size={12} className="text-success" />
            <span className="text-xs font-medium text-muted-foreground">
              {t("readability.sectionsFound")}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {sectionsFound.map((s, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20 capitalize">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {sectionsMissing.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <XCircle size={12} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {t("readability.sectionsMissing")}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {sectionsMissing.map((s, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md text-xs font-medium bg-muted/50 text-muted-foreground border border-border capitalize">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle size={12} className="text-warning" />
            <span className="text-xs font-medium text-muted-foreground">
              {t("readability.warnings")}
            </span>
          </div>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-warning flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {positives.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 size={12} className="text-success" />
            <span className="text-xs font-medium text-muted-foreground">
              {t("readability.positives")}
            </span>
          </div>
          <ul className="space-y-1">
            {positives.map((p, i) => (
              <li key={i} className="text-xs text-success flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
