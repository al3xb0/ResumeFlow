import { describe, it, expect, vi, beforeEach } from "vitest";
import { createId, defaultResumeData, normalizeResumeData } from "./resume";

beforeEach(() => {
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "mocked-uuid") });
});

describe("createId", () => {
  it("returns a string", () => {
    expect(typeof createId()).toBe("string");
  });

  it("calls crypto.randomUUID", () => {
    createId();
    expect(crypto.randomUUID).toHaveBeenCalled();
  });
});

describe("defaultResumeData", () => {
  it("returns a valid ResumeData object", () => {
    const data = defaultResumeData();
    expect(data).toHaveProperty("personal");
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("experience");
    expect(data).toHaveProperty("education");
    expect(data).toHaveProperty("skills");
    expect(data).toHaveProperty("languages");
    expect(data).toHaveProperty("certifications");
    expect(data).toHaveProperty("projects");
    expect(data).toHaveProperty("volunteer");
    expect(data).toHaveProperty("sections");
    expect(data).toHaveProperty("customSections");
  });

  it("has empty personal info", () => {
    const data = defaultResumeData();
    expect(data.personal.fullName).toBe("");
    expect(data.personal.title).toBe("");
    expect(data.personal.email).toBe("");
    expect(data.personal.phone).toBe("");
    expect(data.personal.location).toBe("");
    expect(data.personal.links).toEqual([]);
  });

  it("has empty summary", () => {
    expect(defaultResumeData().summary).toBe("");
  });

  it("has empty arrays for list sections", () => {
    const data = defaultResumeData();
    expect(data.experience).toEqual([]);
    expect(data.education).toEqual([]);
    expect(data.languages).toEqual([]);
    expect(data.certifications).toEqual([]);
    expect(data.projects).toEqual([]);
    expect(data.volunteer).toEqual([]);
  });

  it("has one default empty skill group", () => {
    const data = defaultResumeData();
    expect(data.skills.length).toBe(1);
    expect(data.skills[0].name).toBe("");
    expect(data.skills[0].items).toEqual([]);
  });

  it("has all default sections", () => {
    const data = defaultResumeData();
    const types = data.sections.map((s) => s.type);
    expect(types).toContain("personal");
    expect(types).toContain("summary");
    expect(types).toContain("experience");
    expect(types).toContain("education");
    expect(types).toContain("skills");
    expect(types).toContain("languages");
    expect(types).toContain("certifications");
    expect(types).toContain("projects");
    expect(types).toContain("volunteer");
  });

  it("all sections are visible by default", () => {
    const data = defaultResumeData();
    for (const sec of data.sections) {
      expect(sec.visible).toBe(true);
    }
  });

  it("has empty customSections", () => {
    expect(defaultResumeData().customSections).toEqual({});
  });

  it("returns a new object each call", () => {
    const a = defaultResumeData();
    const b = defaultResumeData();
    expect(a).not.toBe(b);
    a.personal.fullName = "Changed";
    expect(b.personal.fullName).toBe("");
  });
});

describe("normalizeResumeData", () => {
  it("restores canonical builder defaults when optional slices are missing", () => {
    const normalized = normalizeResumeData({
      personal: { fullName: " Imported User " },
      skills: [],
    } as unknown as ReturnType<typeof defaultResumeData>);

    expect(normalized.personal.fullName).toBe("Imported User");
    expect(normalized.personal.links).toEqual([]);
    expect(normalized.skills).toHaveLength(1);
    expect(normalized.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining([
        "personal",
        "summary",
        "experience",
        "education",
        "skills",
        "languages",
        "certifications",
        "projects",
        "volunteer",
      ]),
    );
  });

  it("normalizes malformed imported entries and preserves custom sections", () => {
    const normalized = normalizeResumeData({
      personal: {
        fullName: "Jane",
        links: [{ url: "example.com", type: "portfolio" }],
      },
      experience: [{ position: "Engineer", bullets: [] }],
      sections: [{ id: "custom-awards", type: "custom", title: "Awards", visible: true }],
      customSections: {
        "custom-awards": [{ title: "Winner" }],
      },
    } as unknown as ReturnType<typeof defaultResumeData>);

    expect(normalized.personal.links[0].id).toBe("mocked-uuid");
    expect(normalized.experience[0].bullets).toEqual([""]);
    expect(normalized.sections.find((section) => section.id === "custom-awards")?.title).toBe(
      "Awards",
    );
    expect(normalized.customSections["custom-awards"][0].title).toBe("Winner");
  });
});
