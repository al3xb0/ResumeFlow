import type { TFunction } from "i18next";

type TauriErrorPayload = {
  code?: string;
  message?: string;
};

export function getTauriErrorMessage(
  error: unknown,
  t: TFunction,
  fallbackKey = "errors.unknown",
): string {
  const payload = extractTauriErrorPayload(error);
  const fallbackMessage = t(fallbackKey, { defaultValue: t("errors.unknown") });

  if (!payload) {
    return fallbackMessage;
  }

  if (payload.code) {
    return t(`errors.${payload.code}`, {
      defaultValue: payload.message || fallbackMessage,
    });
  }

  return payload.message || fallbackMessage;
}

export function extractTauriErrorPayload(error: unknown): TauriErrorPayload | null {
  if (isPayloadLike(error)) {
    return normalizePayload(error);
  }

  if (error instanceof Error) {
    return parseStringPayload(error.message);
  }

  if (typeof error === "string") {
    return parseStringPayload(error);
  }

  return null;
}

function parseStringPayload(raw: string): TauriErrorPayload | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (value.startsWith("{") && value.endsWith("}")) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (isPayloadLike(parsed)) {
        return normalizePayload(parsed);
      }
    } catch {
      return { message: value };
    }
  }

  return { message: value };
}

function normalizePayload(payload: Record<string, unknown>): TauriErrorPayload | null {
  const code = typeof payload.code === "string" ? payload.code : undefined;
  const message = typeof payload.message === "string" ? payload.message : undefined;

  if (!code && !message) {
    return null;
  }

  return { code, message };
}

function isPayloadLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
