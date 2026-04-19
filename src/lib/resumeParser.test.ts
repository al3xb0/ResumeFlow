import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseResumeText, mergeExtractedLinks } from "./resumeParser";

beforeEach(() => {
  vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
});

describe("parseResumeText", () => {
  describe("personal info", () => {
    it("extracts full name from first line", () => {
      const result = parseResumeText("John Doe\nSoftware Engineer");
      expect(result.personal.fullName).toBe("John Doe");
    });

    it("extracts title from second line", () => {
      const result = parseResumeText("John Doe\nSoftware Engineer");
      expect(result.personal.title).toBe("Software Engineer");
    });

    it("extracts email", () => {
      const result = parseResumeText("John Doe\njohn@example.com");
      expect(result.personal.email).toBe("john@example.com");
    });

    it("extracts phone number", () => {
      const result = parseResumeText("John Doe\n+1 (555) 123-4567");
      expect(result.personal.phone).toBe("+1 (555) 123-4567");
    });

    it("extracts linkedin url", () => {
      const result = parseResumeText("John Doe\nhttps://linkedin.com/in/johndoe");
      expect(result.personal.links).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "linkedin", url: "linkedin.com/in/johndoe" }),
        ]),
      );
    });

    it("extracts github url", () => {
      const result = parseResumeText("John Doe\nhttps://github.com/johndoe");
      expect(result.personal.links).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "github", url: "github.com/johndoe" }),
        ]),
      );
    });

    it("extracts other urls as links", () => {
      const result = parseResumeText("John Doe\nhttps://johndoe.dev");
      expect(result.personal.links).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "other", url: "https://johndoe.dev" }),
        ]),
      );
    });

    it("extracts location-like text", () => {
      const result = parseResumeText("John Doe\nSoftware Engineer\njohn@email.com | New York, NY");
      expect(result.personal.location).toBeTruthy();
    });

    it("handles multi-line header with all info", () => {
      const text = `John Doe
Senior Developer
john@example.com | +1 555-0100
https://linkedin.com/in/johndoe | https://github.com/johndoe`;
      const result = parseResumeText(text);
      expect(result.personal.fullName).toBe("John Doe");
      expect(result.personal.title).toBe("Senior Developer");
      expect(result.personal.email).toBe("john@example.com");
      expect(result.personal.phone).toBe("+1 555-0100");
    });
  });

  describe("summary section", () => {
    it("parses summary section", () => {
      const text = `John Doe

Summary
Experienced developer with 10 years in web development.`;
      const result = parseResumeText(text);
      expect(result.summary).toBe("Experienced developer with 10 years in web development.");
    });

    it("recognizes 'About Me' as summary header", () => {
      const text = `John Doe

About Me
Passionate engineer.`;
      const result = parseResumeText(text);
      expect(result.summary).toBe("Passionate engineer.");
    });

    it("recognizes 'Professional Summary' header", () => {
      const text = `John Doe

Professional Summary
results‑driven engineer`;
      const result = parseResumeText(text);
      expect(result.summary).toContain("results");
    });
  });

  describe("experience section", () => {
    it("parses experience with date range", () => {
      const text = `John Doe

Experience
Software Engineer | Acme Corp   Jan 2020 - Present
• Built scalable microservices
• Led team of 5 engineers`;
      const result = parseResumeText(text);
      expect(result.experience.length).toBeGreaterThanOrEqual(1);
      const exp = result.experience[0];
      expect(exp.startDate).toBe("Jan 2020");
      expect(exp.current).toBe(true);
      expect(exp.bullets.length).toBeGreaterThanOrEqual(2);
    });

    it("parses multiple experience entries separated by empty lines", () => {
      const text = `John Doe

Experience
Frontend Developer   Jan 2022 - Present
• Built React apps

Backend Developer   Jun 2019 - Dec 2021
• Developed APIs`;
      const result = parseResumeText(text);
      expect(result.experience.length).toBe(2);
    });

    it("handles 'at' separator for company", () => {
      const text = `John Doe

Work Experience
Software Engineer at Google   Jan 2020 - Dec 2022
• Worked on search`;
      const result = parseResumeText(text);
      expect(result.experience.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("education section", () => {
    it("parses education with degree", () => {
      const text = `John Doe

Education
Bachelor of Science in Computer Science
MIT
Sep 2015 - Jun 2019`;
      const result = parseResumeText(text);
      expect(result.education.length).toBeGreaterThanOrEqual(1);
      const edu = result.education[0];
      expect(edu.degree).toContain("Bachelor");
    });

    it("handles degree with 'in' field separator", () => {
      const text = `John Doe

Education
Master in Data Science   2020 - 2022`;
      const result = parseResumeText(text);
      expect(result.education.length).toBeGreaterThanOrEqual(1);
    });

    it("parses GPA", () => {
      const text = `John Doe

Education
Bachelor of Science in CS
University of Example
GPA: 3.8`;
      const result = parseResumeText(text);
      expect(result.education[0].gpa).toBe("3.8");
    });

    it("parses multiple education entries", () => {
      const text = `John Doe

Education
Bachelor of Science   2015 - 2019
University A

Master of Science   2019 - 2021
University B`;
      const result = parseResumeText(text);
      expect(result.education.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("skills section", () => {
    it("parses skill groups with colon separator", () => {
      const text = `John Doe

Skills
Frontend: React, Vue, Angular
Backend: Node.js, Python, Go`;
      const result = parseResumeText(text);
      expect(result.skills.length).toBe(2);
      expect(result.skills[0].name).toBe("Frontend");
      expect(result.skills[0].items).toContain("React");
      expect(result.skills[1].name).toBe("Backend");
    });

    it("parses flat skill list", () => {
      const text = `John Doe

Skills
JavaScript, TypeScript, React, Node.js`;
      const result = parseResumeText(text);
      expect(result.skills.length).toBe(1);
      expect(result.skills[0].name).toBe("");
      expect(result.skills[0].items).toContain("JavaScript");
    });

    it("handles bullet-prefixed skills", () => {
      const text = `John Doe

Skills
• JavaScript, TypeScript
• React, Vue`;
      const result = parseResumeText(text);
      const allItems = result.skills.flatMap((g) => g.items);
      expect(allItems).toContain("JavaScript");
      expect(allItems).toContain("React");
    });

    it("returns default empty skill group for empty section", () => {
      const text = `John Doe

Skills
`;
      const result = parseResumeText(text);
      expect(result.skills.length).toBe(1);
      expect(result.skills[0].items).toEqual([]);
    });
  });

  describe("languages section", () => {
    it("parses languages with proficiency", () => {
      const text = `John Doe

Languages
English - Native, Polish - Fluent, German - Intermediate`;
      const result = parseResumeText(text);
      expect(result.languages.length).toBe(3);
      expect(result.languages[0].language).toBe("English");
      expect(result.languages[0].proficiency).toBe("Native");
    });

    it("parses languages with parenthetical proficiency", () => {
      const text = `John Doe

Languages
English (Native), Polish (B2)`;
      const result = parseResumeText(text);
      expect(result.languages.length).toBe(2);
      expect(result.languages[0].language).toBe("English");
      expect(result.languages[0].proficiency).toBe("Native");
      expect(result.languages[1].proficiency).toBe("B2");
    });

    it("parses languages with colon separator", () => {
      const text = `John Doe

Languages
English: Fluent`;
      const result = parseResumeText(text);
      expect(result.languages.length).toBe(1);
      expect(result.languages[0].language).toBe("English");
      expect(result.languages[0].proficiency).toBe("Fluent");
    });

    it("handles plain language names without proficiency", () => {
      const text = `John Doe

Languages
English, Spanish, French`;
      const result = parseResumeText(text);
      expect(result.languages.length).toBe(3);
    });

    it("filters out GDPR consent text", () => {
      const text = `John Doe

Languages
English - Native, Wyrażam zgodę na przetwarzanie danych osobowych`;
      const result = parseResumeText(text);
      const langNames = result.languages.map((l) => l.language.toLowerCase());
      expect(langNames).toContain("english");
      expect(langNames).not.toContain("wyrażam");
    });
  });

  describe("certifications section", () => {
    it("parses certification names", () => {
      const text = `John Doe

Certifications
AWS Solutions Architect
Google Cloud Professional`;
      const result = parseResumeText(text);
      expect(result.certifications.length).toBe(2);
      expect(result.certifications[0].name).toContain("AWS");
    });

    it("extracts URL from certification", () => {
      const text = `John Doe

Certifications
AWS Certification https://verify.aws/12345`;
      const result = parseResumeText(text);
      expect(result.certifications[0].url).toBe("https://verify.aws/12345");
    });

    it("recognizes 'Courses' as certifications header", () => {
      const text = `John Doe

Courses
Machine Learning by Stanford`;
      const result = parseResumeText(text);
      expect(result.certifications.length).toBe(1);
    });

    it("recognizes 'Training' as certifications header", () => {
      const text = `John Doe

Training
Docker Fundamentals`;
      const result = parseResumeText(text);
      expect(result.certifications.length).toBe(1);
    });
  });

  describe("projects section", () => {
    it("parses project names and descriptions", () => {
      const text = `John Doe

Projects
Resume Builder
• A web app for building resumes
• Built with React and TypeScript`;
      const result = parseResumeText(text);
      expect(result.projects.length).toBe(1);
      expect(result.projects[0].name).toBe("Resume Builder");
      expect(result.projects[0].description).toContain("web app");
    });

    it("handles multiple projects", () => {
      const text = `John Doe

Projects
Project Alpha
• Description of Alpha
Project Beta
• Description of Beta`;
      const result = parseResumeText(text);
      expect(result.projects.length).toBe(2);
    });
  });

  describe("volunteer section", () => {
    it("parses volunteer roles", () => {
      const text = `John Doe

Volunteer
Mentor at Code.org
• Taught programming basics`;
      const result = parseResumeText(text);
      expect(result.volunteer.length).toBe(1);
      expect(result.volunteer[0].role).toContain("Mentor");
    });
  });

  describe("section detection", () => {
    it("handles case-insensitive section headers", () => {
      const text = `John Doe

EXPERIENCE
Developer   Jan 2020 - Present
• Built things

EDUCATION
BSc Computer Science   2016 - 2020`;
      const result = parseResumeText(text);
      expect(result.experience.length).toBeGreaterThanOrEqual(1);
      expect(result.education.length).toBeGreaterThanOrEqual(1);
    });

    it("returns default structure for empty text", () => {
      const result = parseResumeText("");
      expect(result.personal.fullName).toBe("");
      expect(result.experience).toEqual([]);
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it("preserves section order", () => {
      const result = parseResumeText("John Doe");
      const sectionTypes = result.sections.map((s) => s.type);
      expect(sectionTypes).toContain("personal");
      expect(sectionTypes).toContain("experience");
      expect(sectionTypes).toContain("education");
    });
  });

  describe("full resume parsing", () => {
    it("parses a complete resume", () => {
      const text = `Jane Smith
Full Stack Developer
jane@example.com | +1 555-0199 | https://linkedin.com/in/janesmith

Summary
Experienced full-stack developer with expertise in React and Node.js.

Experience
Senior Developer   Jan 2021 - Present
• Led development of microservices architecture
• Mentored junior developers

Junior Developer   Jun 2018 - Dec 2020
• Built RESTful APIs with Node.js

Education
Bachelor of Science in Computer Science
MIT   2014 - 2018
GPA: 3.9

Skills
Frontend: React, TypeScript, HTML, CSS
Backend: Node.js, Python, PostgreSQL

Languages
English - Native, Spanish - Intermediate

Certifications
AWS Solutions Architect — 2022

Projects
Portfolio Site
• Personal website built with Next.js`;
      const result = parseResumeText(text);
      expect(result.personal.fullName).toBe("Jane Smith");
      expect(result.personal.title).toBe("Full Stack Developer");
      expect(result.personal.email).toBe("jane@example.com");
      expect(result.summary).toContain("full-stack");
      expect(result.experience.length).toBe(2);
      expect(result.education.length).toBeGreaterThanOrEqual(1);
      expect(result.skills.length).toBe(2);
      expect(result.languages.length).toBe(2);
      expect(result.certifications.length).toBe(1);
      expect(result.projects.length).toBe(1);
    });
  });
});

describe("mergeExtractedLinks", () => {
  it("adds new links that are not already present", () => {
    const data = parseResumeText("John Doe");
    const result = mergeExtractedLinks(data, ["https://linkedin.com/in/johndoe"]);
    expect(result.personal.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "linkedin", url: "https://linkedin.com/in/johndoe" }),
      ]),
    );
  });

  it("does not duplicate existing links", () => {
    const data = parseResumeText("John Doe\nhttps://linkedin.com/in/johndoe");
    const before = data.personal.links.length;
    const result = mergeExtractedLinks(data, ["https://linkedin.com/in/johndoe"]);
    expect(result.personal.links.length).toBe(before);
  });

  it("classifies github links correctly", () => {
    const data = parseResumeText("John Doe");
    const result = mergeExtractedLinks(data, ["https://github.com/johndoe"]);
    expect(result.personal.links).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "github" })]),
    );
  });

  it("classifies unknown URLs as other", () => {
    const data = parseResumeText("John Doe");
    const result = mergeExtractedLinks(data, ["https://example.com"]);
    expect(result.personal.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "other", url: "https://example.com" }),
      ]),
    );
  });

  it("skips mailto: and javascript: urls", () => {
    const data = parseResumeText("John Doe");
    const result = mergeExtractedLinks(data, ["mailto:john@example.com", "javascript:void(0)"]);
    expect(result.personal.links.length).toBe(0);
  });

  it("skips empty and whitespace-only URLs", () => {
    const data = parseResumeText("John Doe");
    const result = mergeExtractedLinks(data, ["", "  ", "https://real.com"]);
    expect(result.personal.links.length).toBe(1);
  });
});
