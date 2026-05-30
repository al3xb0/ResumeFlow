import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PagedResumePreview } from "./PagedResumePreview";
import { resolveLayoutSettings } from "../lib/layoutSettings";
import { DEFAULT_LAYOUT_SETTINGS, defaultExportLabels, defaultResumeData } from "../types/resume";

const { renderResumePreviewMock } = vi.hoisted(() => ({
  renderResumePreviewMock: vi.fn(),
}));

const { translationMock } = vi.hoisted(() => ({
  translationMock: (
    key: string,
    fallbackOrOptions?: string | { defaultValue?: string },
    values?: Record<string, number>,
  ) => {
    if (key === "builder.pageCounter") {
      return `Page ${values?.page} of ${values?.pageCount}`;
    }

    if (typeof fallbackOrOptions === "string") {
      return fallbackOrOptions;
    }

    return fallbackOrOptions?.defaultValue ?? key;
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: translationMock,
  }),
}));

vi.mock("../lib/typstRender", () => ({
  renderResumePreview: renderResumePreviewMock,
}));

function createRenderRequest() {
  return {
    resume: defaultResumeData(),
    visibleIds: ["personal", "summary"],
    labels: defaultExportLabels,
    template: "classic" as const,
    layoutSettings: DEFAULT_LAYOUT_SETTINGS,
    resolvedLayoutSettings: resolveLayoutSettings(DEFAULT_LAYOUT_SETTINGS, "classic"),
  };
}

describe("PagedResumePreview", () => {
  beforeEach(() => {
    renderResumePreviewMock.mockReset();
  });

  it("debounces the Typst preview request and renders returned page images", async () => {
    const onReady = vi.fn();
    renderResumePreviewMock.mockResolvedValue({
      pages: [
        { pageIndex: 0, base64Png: "page-one", widthPx: 1224, heightPx: 1584 },
        { pageIndex: 1, base64Png: "page-two", widthPx: 1224, heightPx: 1584 },
      ],
      totalPages: 2,
      cacheKey: null,
    });

    render(
      <PagedResumePreview
        renderRequest={createRenderRequest()}
        scale={1}
        pageWidthPx={816}
        pageHeightPx={1056}
        onReady={onReady}
      />,
    );

    expect(screen.getByText("Loading preview...")).toBeInTheDocument();
    expect(renderResumePreviewMock).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(renderResumePreviewMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByTestId("typst-preview-page-0")).toHaveAttribute(
        "src",
        "data:image/png;base64,page-one",
      );
    });

    expect(screen.getByTestId("typst-preview-page-1")).toHaveAttribute(
      "src",
      "data:image/png;base64,page-two",
    );
    expect(renderResumePreviewMock).toHaveBeenCalledWith(
      expect.objectContaining({ dpi: 120, template: "classic" }),
    );
    expect(onReady).toHaveBeenCalledWith("preview");
  });

  it("ignores stale preview responses from an earlier render generation", async () => {
    let resolveFirst: ((value: unknown) => void) | undefined;
    let resolveSecond: ((value: unknown) => void) | undefined;

    renderResumePreviewMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const { rerender } = render(
      <PagedResumePreview
        renderRequest={createRenderRequest()}
        scale={1}
        pageWidthPx={816}
        pageHeightPx={1056}
      />,
    );

    await waitFor(() => {
      expect(renderResumePreviewMock).toHaveBeenCalledTimes(1);
    });

    rerender(
      <PagedResumePreview
        renderRequest={{
          ...createRenderRequest(),
          labels: { ...defaultExportLabels, present: "Currently" },
        }}
        scale={1}
        pageWidthPx={816}
        pageHeightPx={1056}
      />,
    );

    await waitFor(() => {
      expect(renderResumePreviewMock).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      resolveFirst?.({
        pages: [{ pageIndex: 0, base64Png: "stale", widthPx: 1224, heightPx: 1584 }],
        totalPages: 1,
        cacheKey: null,
      });
      resolveSecond?.({
        pages: [{ pageIndex: 0, base64Png: "fresh", widthPx: 1224, heightPx: 1584 }],
        totalPages: 1,
        cacheKey: null,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("typst-preview-page-0")).toHaveAttribute(
        "src",
        "data:image/png;base64,fresh",
      );
    });
  });

  it("renders the Tauri error message when Typst preview generation fails", async () => {
    renderResumePreviewMock.mockRejectedValue({
      code: "feature_unavailable",
      message: "The new Typst preview pipeline has not been wired up yet.",
    });

    render(
      <PagedResumePreview
        renderRequest={createRenderRequest()}
        scale={0.7}
        pageWidthPx={816}
        pageHeightPx={1056}
      />,
    );

    await waitFor(() => {
      expect(renderResumePreviewMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(
        screen.getByText("The new Typst preview pipeline has not been wired up yet."),
      ).toBeInTheDocument();
    });
  });
});
