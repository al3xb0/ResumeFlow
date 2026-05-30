import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildDocxDocument, generateDocxBlob } from "./docxExport";
import type { ResumeData } from "../types/resume";
import { defaultResumeData, DEFAULT_LAYOUT_SETTINGS } from "../types/resume";
import { Document } from "docx";

beforeEach(() => {
  vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
});

function makeData(overrides: Partial<ResumeData> = {}): ResumeData {
  return { ...defaultResumeData(), ...overrides };
}

function allVisibleIds(data: ResumeData): Set<string> {
  return new Set(data.sections.map((s) => s.id));
}

describe("buildDocxDocument", () => {
  it("returns a Document instance", () => {
    const data = makeData();
    const doc = buildDocxDocument(data, allVisibleIds(data));
    expect(doc).toBeInstanceOf(Document);
  });

  it("uses template-specific DOCX font families", () => {
    const classic = JSON.stringify(buildDocxDocument(makeData(), allVisibleIds(makeData())));
    const minimal = JSON.stringify(
      buildDocxDocument(makeData(), allVisibleIds(makeData()), undefined, "minimal"),
    );

    expect(classic).toContain("Segoe UI");
    expect(minimal).toContain("Georgia");
  });

  it("maps asymmetric margins and role typography overrides into DOCX", () => {
    const data = makeData({
      personal: {
        fullName: "Jane Layout",
        title: "Designer",
        email: "",
        phone: "",
        location: "",
        links: [],
      },
    });

    const doc = buildDocxDocument(data, allVisibleIds(data), undefined, "classic", {
      ...DEFAULT_LAYOUT_SETTINGS,
      pageMarginTopPx: 48,
      pageMarginRightPx: 54,
      pageMarginBottomPx: 60,
      pageMarginLeftPx: 66,
      typography: {
        ...DEFAULT_LAYOUT_SETTINGS.typography,
        name: { fontFamily: "Arial", fontSizePx: 28, fontWeight: 700, fontStyle: "normal" },
        body: { fontFamily: "Calibri", fontSizePx: 14, fontWeight: 400, fontStyle: "normal" },
      },
    });
    const json = JSON.stringify(doc);

    expect(json).toContain('"top":{"key":"w:top","value":720}');
    expect(json).toContain('"right":{"key":"w:right","value":810}');
    expect(json).toContain('"bottom":{"key":"w:bottom","value":900}');
    expect(json).toContain('"left":{"key":"w:left","value":990}');
    expect(json).toContain("Arial");
    expect(json).toContain("Calibri");
  });

  it("applies modern template accents in DOCX", () => {
    const data = makeData({
      personal: {
        fullName: "Jane Modern",
        title: "Engineer",
        email: "jane@example.com",
        phone: "555-1234",
        location: "Warsaw",
        links: [],
      },
      skills: [{ id: "s1", name: "Frontend", items: ["React", "TypeScript"] }],
    });
    const doc = buildDocxDocument(data, allVisibleIds(data), undefined, "modern");
    const json = JSON.stringify(doc);

    expect(json).toContain("1E293B");
    expect(json).toContain("3B82F6");
    expect(json).toContain("EFF6FF");
  });

  it("includes name paragraph when provided", () => {
    const data = makeData({
      personal: {
        fullName: "Jane Smith",
        title: "",
        email: "",
        phone: "",
        location: "",
        links: [],
      },
    });
    const doc = buildDocxDocument(data, allVisibleIds(data));
    const json = JSON.stringify(doc);
    expect(json).toContain("Jane Smith");
  });

  it("includes title paragraph", () => {
    const data = makeData({
      personal: {
        fullName: "Jane",
        title: "Engineer",
        email: "",
        phone: "",
        location: "",
        links: [],
      },
    });
    const doc = buildDocxDocument(data, allVisibleIds(data));
    const json = JSON.stringify(doc);
    expect(json).toContain("Engineer");
  });

  it("includes email as ExternalHyperlink with mailto", () => {
    const data = makeData({
      personal: {
        fullName: "Jane",
        title: "",
        email: "jane@example.com",
        phone: "",
        location: "",
        links: [],
      },
    });
    const doc = buildDocxDocument(data, allVisibleIds(data));
    const json = JSON.stringify(doc);
    expect(json).toContain("jane@example.com");
    expect(json).toContain("mailto:jane@example.com");
  });

  it("includes personal links as ExternalHyperlinks", () => {
    const data = makeData({
      personal: {
        fullName: "Jane",
        title: "",
        email: "",
        phone: "",
        location: "",
        links: [{ id: "1", type: "linkedin", url: "linkedin.com/in/jane", label: "LinkedIn" }],
      },
    });
    const doc = buildDocxDocument(data, allVisibleIds(data));
    const json = JSON.stringify(doc);
    expect(json).toContain("LinkedIn");
    expect(json).toContain("https://linkedin.com/in/jane");
  });

  it("skips sections not in visibleIds", () => {
    const data = makeData({ summary: "Important summary" });
    const visibleIds = new Set(["personal"]);
    const doc = buildDocxDocument(data, visibleIds);
    const json = JSON.stringify(doc);
    expect(json).not.toContain("Important summary");
  });

  it("renders summary section", () => {
    const data = makeData({ summary: "My great summary" });
    const doc = buildDocxDocument(data, allVisibleIds(data));
    const json = JSON.stringify(doc);
    expect(json).toContain("My great summary");
  });

  it("renders experience with position and bullets", () => {
    const data = makeData({
      experience: [
        {
          id: "exp1",
          position: "Lead Developer",
          company: "BigCo",
          location: "SF",
          startDate: "Jan 2020",
          endDate: "",
          current: true,
          bullets: ["Shipped features", "Mentored team"],
        },
      ],
    });
    const doc = buildDocxDocument(data, allVisibleIds(data));
    const json = JSON.stringify(doc);
    expect(json).toContain("Lead Developer");
    expect(json).toContain("BigCo");
    expect(json).toContain("Shipped features");
    expect(json).toContain("Present");
  });

  it("renders education entries", () => {
    const data = makeData({
      education: [
        {
          id: "edu1",
          institution: "Stanford",
          degree: "MSc",
          field: "AI",
          startDate: "2018",
          endDate: "2020",
          gpa: "4.0",
        },
      ],
    });
    const doc = buildDocxDocument(data, allVisibleIds(data));
    const json = JSON.stringify(doc);
    expect(json).toContain("MSc in AI");
    expect(json).toContain("Stanford");
    expect(json).toContain("4.0");
  });

  it("renders skills", () => {
    const data = makeData({
      skills: [{ id: "s1", name: "Languages", items: ["TypeScript", "Python"] }],
    });
    const doc = buildDocxDocument(data, allVisibleIds(data));
    const json = JSON.stringify(doc);
    expect(json).toContain("Languages:");
    expect(json).toContain("TypeScript, Python");
  });

  it("renders languages", () => {
    const data = makeData({
      languages: [{ id: "l1", language: "French", proficiency: "Fluent" }],
    });
    const doc = buildDocxDocument(data, allVisibleIds(data));
    const json = JSON.stringify(doc);
    expect(json).toContain("French");
    expect(json).toContain("Fluent");
  });

  it("renders certifications with clickable URL", () => {
    const data = makeData({
      certifications: [
        {
          id: "c1",
          name: "GCP",
          issuer: "Google",
          date: "2023",
          url: "https://cloud.google.com/cert",
        },
      ],
    });
    const doc = buildDocxDocument(data, allVisibleIds(data));
    const json = JSON.stringify(doc);
    expect(json).toContain("GCP");
    expect(json).toContain("https://cloud.google.com/cert");
  });

  it("renders project name as clickable link when URL present", () => {
    const data = makeData({
      projects: [
        {
          id: "p1",
          name: "My App",
          description: "Description",
          technologies: "React",
          url: "myapp.com",
        },
      ],
    });
    const doc = buildDocxDocument(data, allVisibleIds(data));
    const json = JSON.stringify(doc);
    expect(json).toContain("My App");
    expect(json).toContain("https://myapp.com");
  });

  it("renders volunteer section", () => {
    const data = makeData({
      volunteer: [
        {
          id: "v1",
          role: "Coach",
          organization: "Youth Center",
          startDate: "2021",
          endDate: "2022",
          description: "Coached teams",
        },
      ],
    });
    const doc = buildDocxDocument(data, allVisibleIds(data));
    const json = JSON.stringify(doc);
    expect(json).toContain("Coach");
    expect(json).toContain("Youth Center");
    expect(json).toContain("Coached teams");
  });

  it("renders custom sections", () => {
    const data = makeData();
    const sectionId = "custom-1";
    data.sections.push({ id: sectionId, type: "custom", title: "Awards", visible: true });
    data.customSections[sectionId] = [
      { id: "e1", title: "Innovator Award", description: "For innovative work" },
    ];
    const visibleIds = allVisibleIds(data);
    visibleIds.add(sectionId);
    const doc = buildDocxDocument(data, visibleIds);
    const json = JSON.stringify(doc);
    expect(json).toContain("Awards");
    expect(json).toContain("Innovator Award");
  });
});

describe("generateDocxBlob", () => {
  it("returns a Blob", async () => {
    const data = makeData({
      personal: {
        fullName: "Test User",
        title: "Dev",
        email: "test@test.com",
        phone: "",
        location: "",
        links: [],
      },
    });
    const blob = await generateDocxBlob(data, allVisibleIds(data));
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});
