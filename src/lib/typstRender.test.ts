import { describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
}));

import { exportResumePdf, renderResumePreview } from "./typstRender";
import { DEFAULT_LAYOUT_SETTINGS, defaultExportLabels, defaultResumeData } from "../types/resume";
import { resolveLayoutSettings } from "./layoutSettings";

describe("typstRender", () => {
  it("calls the preview command with the wrapped request payload", async () => {
    invoke.mockResolvedValueOnce({ pages: [], totalPages: 0, cacheKey: null });

    const request = {
      resume: defaultResumeData(),
      visibleIds: ["personal"],
      labels: defaultExportLabels,
      template: "classic" as const,
      layoutSettings: DEFAULT_LAYOUT_SETTINGS,
      resolvedLayoutSettings: resolveLayoutSettings(DEFAULT_LAYOUT_SETTINGS, "classic"),
      dpi: 144,
      pageIndices: [0],
    };

    await renderResumePreview(request);

    expect(invoke).toHaveBeenCalledWith("render_resume_preview", { request });
  });

  it("calls the pdf export command with the wrapped request payload", async () => {
    invoke.mockResolvedValueOnce({ base64Pdf: "", fileName: "resume.pdf", cacheKey: null });

    const request = {
      resume: defaultResumeData(),
      visibleIds: ["personal"],
      labels: defaultExportLabels,
      template: "classic" as const,
      layoutSettings: DEFAULT_LAYOUT_SETTINGS,
      resolvedLayoutSettings: resolveLayoutSettings(DEFAULT_LAYOUT_SETTINGS, "classic"),
    };

    await exportResumePdf(request);

    expect(invoke).toHaveBeenCalledWith("export_resume_pdf", { request });
  });
});
