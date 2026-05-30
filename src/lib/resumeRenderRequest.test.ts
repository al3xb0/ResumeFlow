import { describe, expect, it } from "vitest";
import { buildResumeRenderRequest, getVisibleSectionIds } from "./resumeRenderRequest";
import { DEFAULT_LAYOUT_SETTINGS, defaultExportLabels, defaultResumeData } from "../types/resume";

describe("resumeRenderRequest", () => {
  it("collects only visible section ids in section order", () => {
    const resume = defaultResumeData();

    resume.sections = [
      { id: "personal", type: "personal", title: "Personal Info", visible: true },
      { id: "summary", type: "summary", title: "Summary", visible: false },
      { id: "experience", type: "experience", title: "Experience", visible: true },
    ];

    expect(getVisibleSectionIds(resume)).toEqual(["personal", "experience"]);
  });

  it("keeps supported Typst templates and resolves field typography from the selected theme", () => {
    const resume = defaultResumeData();

    const request = buildResumeRenderRequest({
      resume,
      labels: defaultExportLabels,
      template: "modern",
      layoutSettings: DEFAULT_LAYOUT_SETTINGS,
    });

    expect(request.template).toBe("modern");
    expect(request.visibleIds).toContain("personal");
    expect(request.layoutSettings).toEqual(DEFAULT_LAYOUT_SETTINGS);
    expect(request.resolvedLayoutSettings.fieldTypography.personalTitle.fontWeight).toBe(300);
    expect(request.resolvedLayoutSettings.fieldSpacing.personalContacts.marginBottomPx).toBe(10);
    expect(request.resolvedLayoutSettings.fieldSpacing.personalContacts.paddingBottomPx).toBe(0);
  });
});
