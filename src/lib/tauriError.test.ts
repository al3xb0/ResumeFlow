import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import { extractTauriErrorPayload, getTauriErrorMessage } from "./tauriError";

const translations: Record<string, string> = {
  "errors.file_not_found": "Localized file not found",
  "errors.invalid_url": "Localized invalid URL",
  "errors.unknown": "Localized unknown error",
  "import.extractionError": "Localized extraction fallback",
};

const t = ((key: string, options?: { defaultValue?: string }) => {
  return translations[key] ?? options?.defaultValue ?? key;
}) as unknown as TFunction;

describe("tauriError", () => {
  it("parses object payloads", () => {
    expect(extractTauriErrorPayload({ code: "file_not_found", message: "ignored" })).toEqual({
      code: "file_not_found",
      message: "ignored",
    });
  });

  it("parses JSON strings returned by Tauri", () => {
    const error = '{"code":"invalid_url","message":"Enter a valid URL"}';
    expect(getTauriErrorMessage(error, t, "import.extractionError")).toBe("Localized invalid URL");
  });

  it("falls back when payload is not structured", () => {
    expect(getTauriErrorMessage("plain failure", t, "import.extractionError")).toBe(
      "plain failure",
    );
    expect(getTauriErrorMessage(null, t, "import.extractionError")).toBe(
      "Localized extraction fallback",
    );
  });
});
