import { useTranslation } from "react-i18next";
import { Globe, Shield } from "lucide-react";
import { cn } from "../lib/utils";

const languages = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "pl", label: "PL" },
] as const;

export function Header() {
  const { t, i18n } = useTranslation();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">RF</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {t("app.name")}
          </h1>
          <p className="text-xs text-muted-foreground">{t("app.tagline")}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-2.5 py-1 rounded-full">
          <Shield size={12} />
          <span>{t("app.privacyBadge")}</span>
        </div>

        <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
          <Globe size={14} className="text-muted-foreground ml-2" />
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                i18n.language === lang.code
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
