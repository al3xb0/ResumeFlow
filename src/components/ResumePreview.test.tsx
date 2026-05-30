import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResumePreview } from "./ResumePreview";
import { useBuilderStore } from "../store/useBuilderStore";
import {
  DEFAULT_LAYOUT_FIELD_TYPOGRAPHY,
  DEFAULT_LAYOUT_SETTINGS,
  defaultResumeData,
} from "../types/resume";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock("lucide-react", () => ({
  ZoomIn: () => <span data-testid="zoom-in-icon" />,
  ZoomOut: () => <span data-testid="zoom-out-icon" />,
  RotateCcw: () => <span data-testid="reset-zoom-icon" />,
}));

vi.mock("./PagedResumePreview", () => ({
  PagedResumePreview: ({
    renderRequest,
  }: {
    renderRequest: {
      resolvedLayoutSettings: { fieldTypography: { summary: { fontSizePx: number } } };
    };
  }) => (
    <div
      data-testid="paged-resume-preview"
      data-summary-font-size={
        renderRequest.resolvedLayoutSettings.fieldTypography.summary.fontSizePx
      }
    />
  ),
}));

describe("ResumePreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    useBuilderStore.setState({
      resume: defaultResumeData(),
      template: "classic",
      layoutSettings: DEFAULT_LAYOUT_SETTINGS,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("pushes layout changes to the preview without debounce lag", () => {
    render(<ResumePreview />);

    expect(screen.getByTestId("paged-resume-preview")).toHaveAttribute(
      "data-summary-font-size",
      "13",
    );

    act(() => {
      const currentLayoutSettings = useBuilderStore.getState().layoutSettings;
      useBuilderStore.getState().setLayoutSettings({
        ...currentLayoutSettings,
        fieldTypography: {
          ...DEFAULT_LAYOUT_FIELD_TYPOGRAPHY,
          ...(currentLayoutSettings.fieldTypography ?? {}),
          summary: {
            ...currentLayoutSettings.fieldTypography?.summary,
            fontSizePx: 18,
          },
        },
      });
    });

    expect(screen.getByTestId("paged-resume-preview")).toHaveAttribute(
      "data-summary-font-size",
      "18",
    );
  });
});
