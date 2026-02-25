import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { Globe, Type, Loader2 } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { cn } from "../lib/utils";

export function JobDescription() {
  const { t } = useTranslation();
  const {
    jobDescription,
    setJobDescription,
    jobInputMode,
    setJobInputMode,
    jobUrl,
    setJobUrl,
    isFetchingUrl,
    setIsFetchingUrl,
    urlError,
    setUrlError,
  } = useResumeStore();

  const handleFetchUrl = async () => {
    if (!jobUrl.trim()) return;
    setIsFetchingUrl(true);
    setUrlError(null);

    try {
      const text = await invoke<string>("fetch_job_url", { url: jobUrl });
      setJobDescription(text);
      setJobInputMode("text");
    } catch (err) {
      setUrlError(String(err));
    } finally {
      setIsFetchingUrl(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">
          {t("job.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("job.description")}</p>
      </div>

      <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
        <button
          onClick={() => setJobInputMode("text")}
          className={cn(
            "flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            jobInputMode === "text"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Type size={12} />
          {t("job.tabText")}
        </button>
        <button
          onClick={() => setJobInputMode("url")}
          className={cn(
            "flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            jobInputMode === "url"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Globe size={12} />
          {t("job.tabUrl")}
        </button>
      </div>

      {jobInputMode === "text" ? (
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder={t("job.placeholder")}
          className={cn(
            "w-full h-64 p-3 rounded-xl bg-secondary/50 border border-border",
            "text-sm text-foreground placeholder:text-muted-foreground/50",
            "resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
            "transition-colors"
          )}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => {
                setJobUrl(e.target.value);
                setUrlError(null);
              }}
              placeholder={t("job.urlPlaceholder")}
              className={cn(
                "flex-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border",
                "text-sm text-foreground placeholder:text-muted-foreground/50",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                "transition-colors"
              )}
              onKeyDown={(e) => e.key === "Enter" && handleFetchUrl()}
            />
            <button
              onClick={handleFetchUrl}
              disabled={!jobUrl.trim() || isFetchingUrl}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                jobUrl.trim() && !isFetchingUrl
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              {isFetchingUrl ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t("job.fetchingUrl")}
                </>
              ) : (
                t("job.fetchUrl")
              )}
            </button>
          </div>

          {urlError && (
            <p className="text-xs text-destructive">{urlError}</p>
          )}

          {jobDescription && (
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className={cn(
                "w-full h-48 p-3 rounded-xl bg-secondary/50 border border-border",
                "text-sm text-foreground",
                "resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                "transition-colors"
              )}
              readOnly={false}
            />
          )}
        </div>
      )}
    </div>
  );
}
