import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildPdfDefinition } from "./pdfExport";
import type { ResumeData } from "../types/resume";
import { defaultResumeData } from "../types/resume";

beforeEach(() => {
  vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
});

function makeData(overrides: Partial<ResumeData> = {}): ResumeData {
  return { ...defaultResumeData(), ...overrides };
}

function allVisibleIds(data: ResumeData): Set<string> {
  return new Set(data.sections.map((s) => s.id));
}

describe("buildPdfDefinition", () => {
  it("returns valid pdfmake document definition", () => {
    const data = makeData();
    const def = buildPdfDefinition(data, allVisibleIds(data));
    expect(def).toHaveProperty("pageSize", "A4");
    expect(def).toHaveProperty("pageMargins");
    expect(def).toHaveProperty("content");
    expect(def).toHaveProperty("defaultStyle");
    expect(def).toHaveProperty("styles");
  });

  it("uses Helvetica font for classic template", () => {
    const data = makeData();
    const def = buildPdfDefinition(data, allVisibleIds(data));
    expect(def.defaultStyle).toEqual(expect.objectContaining({ font: "Helvetica" }));
  });

  it("uses Times font for minimal template", () => {
    const data = makeData();
    const def = buildPdfDefinition(data, allVisibleIds(data), undefined, "minimal");
    expect(def.defaultStyle).toEqual(expect.objectContaining({ font: "Times" }));
  });

  it("includes name in content when provided", () => {
    const data = makeData({
      personal: {
        fullName: "John Doe",
        title: "",
        email: "",
        phone: "",
        location: "",
        links: [],
      },
    });
    const def = buildPdfDefinition(data, allVisibleIds(data));
    const content = def.content as unknown as Array<Record<string, unknown>>;
    const nameEntry = content.find((c) => c.text === "John Doe");
    expect(nameEntry).toBeDefined();
    expect(nameEntry?.style).toBe("name");
  });

  it("includes email as clickable mailto link", () => {
    const data = makeData({
      personal: {
        fullName: "John",
        title: "",
        email: "john@example.com",
        phone: "",
        location: "",
        links: [],
      },
    });
    const def = buildPdfDefinition(data, allVisibleIds(data));
    const content = def.content as unknown as Array<Record<string, unknown>>;
    const contactBlock = content.find((c) => c.style === "contact") as
      | Record<string, unknown>
      | undefined;
    expect(contactBlock).toBeDefined();
    const text = contactBlock?.text as Array<Record<string, unknown>>;
    const emailItem = text?.find((t) => t.text === "john@example.com");
    expect(emailItem?.link).toBe("mailto:john@example.com");
  });

  it("includes personal links with ensureHttp", () => {
    const data = makeData({
      personal: {
        fullName: "John",
        title: "",
        email: "",
        phone: "",
        location: "",
        links: [{ id: "1", type: "linkedin", url: "linkedin.com/in/john", label: "LinkedIn" }],
      },
    });
    const def = buildPdfDefinition(data, allVisibleIds(data));
    const content = def.content as unknown as Array<Record<string, unknown>>;
    const contactBlock = content.find((c) => c.style === "contact") as
      | Record<string, unknown>
      | undefined;
    const text = contactBlock?.text as Array<Record<string, unknown>>;
    const linkItem = text?.find((t) => t.text === "LinkedIn");
    expect(linkItem?.link).toBe("https://linkedin.com/in/john");
  });

  it("skips sections not in visibleIds", () => {
    const data = makeData({ summary: "Some summary text" });
    const visibleIds = new Set(["personal"]);
    const def = buildPdfDefinition(data, visibleIds);
    const content = def.content as unknown as Array<Record<string, unknown>>;
    const summaryText = content.find((c) => c.text === "Some summary text");
    expect(summaryText).toBeUndefined();
  });

  it("renders summary when visible", () => {
    const data = makeData({ summary: "Experienced dev" });
    const def = buildPdfDefinition(data, allVisibleIds(data));
    const content = def.content as unknown as Array<Record<string, unknown>>;
    const summaryBlock = content.find((c) => c.text === "Experienced dev");
    expect(summaryBlock).toBeDefined();
  });

  it("renders experience entries with date range", () => {
    const data = makeData({
      experience: [
        {
          id: "exp1",
          position: "Developer",
          company: "Acme",
          location: "NY",
          startDate: "Jan 2020",
          endDate: "",
          current: true,
          bullets: ["Built apps"],
        },
      ],
    });
    const def = buildPdfDefinition(data, allVisibleIds(data));
    const content = JSON.stringify(def.content);
    expect(content).toContain("Developer");
    expect(content).toContain("Acme");
    expect(content).toContain("Built apps");
    expect(content).toContain("Present");
  });

  it("renders education entries", () => {
    const data = makeData({
      education: [
        {
          id: "edu1",
          institution: "MIT",
          degree: "BSc",
          field: "CS",
          startDate: "2015",
          endDate: "2019",
          gpa: "3.9",
        },
      ],
    });
    const def = buildPdfDefinition(data, allVisibleIds(data));
    const content = JSON.stringify(def.content);
    expect(content).toContain("BSc in CS");
    expect(content).toContain("MIT");
    expect(content).toContain("3.9");
  });

  it("renders skills with group names", () => {
    const data = makeData({
      skills: [{ id: "s1", name: "Frontend", items: ["React", "Vue"] }],
    });
    const def = buildPdfDefinition(data, allVisibleIds(data));
    const content = JSON.stringify(def.content);
    expect(content).toContain("Frontend:");
    expect(content).toContain("React, Vue");
  });

  it("renders languages", () => {
    const data = makeData({
      languages: [{ id: "l1", language: "English", proficiency: "Native" }],
    });
    const def = buildPdfDefinition(data, allVisibleIds(data));
    const content = JSON.stringify(def.content);
    expect(content).toContain("English — Native");
  });

  it("renders certifications with clickable URL", () => {
    const data = makeData({
      certifications: [
        { id: "c1", name: "AWS", issuer: "Amazon", date: "2023", url: "https://verify.aws/123" },
      ],
    });
    const def = buildPdfDefinition(data, allVisibleIds(data));
    const content = JSON.stringify(def.content);
    expect(content).toContain("AWS");
    expect(content).toContain("https://verify.aws/123");
    expect(content).toContain("Amazon");
  });

  it("renders project name as clickable link when URL present", () => {
    const data = makeData({
      projects: [
        {
          id: "p1",
          name: "MyProject",
          description: "A cool app",
          technologies: "React",
          url: "example.com/proj",
        },
      ],
    });
    const def = buildPdfDefinition(data, allVisibleIds(data));
    const content = JSON.stringify(def.content);
    expect(content).toContain("MyProject");
    expect(content).toContain("https://example.com/proj");
  });

  it("renders volunteer entries", () => {
    const data = makeData({
      volunteer: [
        {
          id: "v1",
          role: "Mentor",
          organization: "Code.org",
          startDate: "2021",
          endDate: "2022",
          description: "Taught kids",
        },
      ],
    });
    const def = buildPdfDefinition(data, allVisibleIds(data));
    const content = JSON.stringify(def.content);
    expect(content).toContain("Mentor");
    expect(content).toContain("Code.org");
    expect(content).toContain("Taught kids");
  });

  it("renders custom sections", () => {
    const data = makeData();
    const sectionId = "custom-1";
    data.sections.push({ id: sectionId, type: "custom", title: "Awards", visible: true });
    data.customSections[sectionId] = [
      { id: "e1", title: "Best Developer", description: "Won award" },
    ];
    const visibleIds = allVisibleIds(data);
    visibleIds.add(sectionId);
    const def = buildPdfDefinition(data, visibleIds);
    const content = JSON.stringify(def.content);
    expect(content).toContain("AWARDS");
    expect(content).toContain("Best Developer");
  });

  it("sets correct page margins", () => {
    const data = makeData();
    const def = buildPdfDefinition(data, allVisibleIds(data));
    expect(def.pageMargins).toEqual([48, 40, 48, 40]);
  });

  it("has all required styles", () => {
    const data = makeData();
    const def = buildPdfDefinition(data, allVisibleIds(data));
    const styleNames = Object.keys(def.styles as Record<string, unknown>);
    expect(styleNames).toEqual(
      expect.arrayContaining([
        "name",
        "subtitle",
        "contact",
        "sectionHeader",
        "entryTitle",
        "entrySub",
        "date",
        "body",
      ]),
    );
  });
});
