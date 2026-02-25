import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { BarChart3, CheckCircle, XCircle, Loader2, Search } from "lucide-react";
import { useResumeStore, type AnalysisResult } from "../store/useResumeStore";
import { useToast } from "./Toast";
import { cn } from "../lib/utils";
import { ReadabilityPanel } from "./ReadabilityPanel";

export function AnalysisPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const {
    resumeText,
    jobDescription,
    analysisResult,
    isAnalyzing,
    setAnalysisResult,
    setIsAnalyzing,
  } = useResumeStore();

  const canAnalyze =
    resumeText.trim().length > 0 && jobDescription.trim().length > 0;

  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze) return;
    setIsAnalyzing(true);

    try {
      const result = await invoke<AnalysisResult>("analyze_resume", {
        resumeText,
        jobDescription,
      });
      setAnalysisResult(result);
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error(String(err));
    } finally {
      setIsAnalyzing(false);
    }
  }, [canAnalyze, resumeText, jobDescription, toast, setAnalysisResult, setIsAnalyzing]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">
          {t("readability.title")}
        </h2>
        <ReadabilityPanel />
      </div>

      <div className="border-t border-border" />

      <div className="flex flex-col gap-4 flex-1">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {t("analysis.title")}
          </h2>
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              canAnalyze && !isAnalyzing
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("analysis.analyzing")}
              </>
            ) : (
              <>
                <Search size={14} />
                {t("analysis.analyze")}
              </>
            )}
          </button>
        </div>

      {!analysisResult ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <BarChart3 size={48} className="text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">
            {t("analysis.noResults")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 overflow-y-auto">
          <div className="flex items-center gap-6 bg-secondary/50 rounded-xl p-5">
            <ScoreRing score={analysisResult.matchScore} />
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold text-foreground">
                {analysisResult.matchScore}%
              </span>
              <span className="text-sm text-muted-foreground">
                {t("analysis.matchScore")}
              </span>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>
                  {t("analysis.totalKeywords")}:{" "}
                  <strong className="text-foreground">
                    {analysisResult.totalKeywords}
                  </strong>
                </span>
                <span>
                  {t("analysis.matched")}:{" "}
                  <strong className="text-success">
                    {analysisResult.foundKeywords.length}
                  </strong>
                </span>
                <span>
                  {t("analysis.missing")}:{" "}
                  <strong className="text-destructive">
                    {analysisResult.missingKeywords.length}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <KeywordSection
            title={t("analysis.foundKeywords")}
            keywords={analysisResult.foundKeywords}
            icon={<CheckCircle size={14} className="text-success" />}
            tagClassName="bg-success/10 text-success border-success/20"
          />

          <KeywordSection
            title={t("analysis.missingKeywords")}
            keywords={analysisResult.missingKeywords}
            icon={<XCircle size={14} className="text-destructive" />}
            tagClassName="bg-destructive/10 text-destructive border-destructive/20"
          />
        </div>
      )}
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 70) return "var(--color-success)";
    if (s >= 40) return "var(--color-warning)";
    return "var(--color-destructive)";
  };

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={stroke}
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={getColor(score)}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

function KeywordSection({
  title,
  keywords,
  icon,
  tagClassName,
}: {
  title: string;
  keywords: string[];
  icon: React.ReactNode;
  tagClassName: string;
}) {
  if (keywords.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-foreground">
          {title} ({keywords.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((keyword, i) => (
          <span
            key={i}
            className={cn(
              "px-2 py-0.5 rounded-md text-xs border",
              tagClassName
            )}
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}
