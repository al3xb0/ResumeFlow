import {
  DEFAULT_LAYOUT_SETTINGS,
  normalizeTypstTemplate,
  type ExportLabels,
  type LayoutSettings,
  type ResumeData,
  type ResumeRenderRequest,
  type TemplateId,
} from "../types/resume";
import { resolveLayoutSettings } from "./layoutSettings";

interface BuildResumeRenderRequestOptions {
  resume: ResumeData;
  labels: ExportLabels;
  template: TemplateId;
  layoutSettings?: LayoutSettings;
}

export function getVisibleSectionIds(resume: ResumeData): string[] {
  return resume.sections.filter((section) => section.visible).map((section) => section.id);
}

export function buildResumeRenderRequest({
  resume,
  labels,
  template,
  layoutSettings = DEFAULT_LAYOUT_SETTINGS,
}: BuildResumeRenderRequestOptions): ResumeRenderRequest {
  const normalizedTemplate = normalizeTypstTemplate(template);

  return {
    resume,
    visibleIds: getVisibleSectionIds(resume),
    labels,
    template: normalizedTemplate,
    layoutSettings,
    resolvedLayoutSettings: resolveLayoutSettings(layoutSettings, normalizedTemplate),
  };
}
