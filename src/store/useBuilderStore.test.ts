import { describe, it, expect, vi, beforeEach } from "vitest";
import { useBuilderStore } from "./useBuilderStore";
import { defaultResumeData } from "../types/resume";

beforeEach(() => {
  vi.stubGlobal("crypto", { randomUUID: () => `uuid-${Date.now()}-${Math.random()}` });
  useBuilderStore.setState({ resume: defaultResumeData(), template: "classic" });
});

describe("useBuilderStore", () => {
  describe("template", () => {
    it("has default template 'classic'", () => {
      expect(useBuilderStore.getState().template).toBe("classic");
    });

    it("setTemplate changes template", () => {
      useBuilderStore.getState().setTemplate("modern");
      expect(useBuilderStore.getState().template).toBe("modern");
    });
  });

  describe("personal info", () => {
    it("updatePersonal sets field", () => {
      useBuilderStore.getState().updatePersonal("fullName", "Jane Doe");
      expect(useBuilderStore.getState().resume.personal.fullName).toBe("Jane Doe");
    });

    it("addLink adds a link", () => {
      useBuilderStore.getState().addLink("linkedin");
      const links = useBuilderStore.getState().resume.personal.links;
      expect(links.length).toBe(1);
      expect(links[0].type).toBe("linkedin");
    });

    it("updateLink updates a link field", () => {
      useBuilderStore.getState().addLink("github");
      const id = useBuilderStore.getState().resume.personal.links[0].id;
      useBuilderStore.getState().updateLink(id, "url", "github.com/user");
      expect(useBuilderStore.getState().resume.personal.links[0].url).toBe("github.com/user");
    });

    it("removeLink removes a link", () => {
      useBuilderStore.getState().addLink("linkedin");
      const id = useBuilderStore.getState().resume.personal.links[0].id;
      useBuilderStore.getState().removeLink(id);
      expect(useBuilderStore.getState().resume.personal.links.length).toBe(0);
    });
  });

  describe("summary", () => {
    it("setSummary updates summary", () => {
      useBuilderStore.getState().setSummary("New summary");
      expect(useBuilderStore.getState().resume.summary).toBe("New summary");
    });
  });

  describe("experience", () => {
    it("addExperience adds an entry", () => {
      useBuilderStore.getState().addExperience();
      expect(useBuilderStore.getState().resume.experience.length).toBe(1);
    });

    it("updateExperience updates a field", () => {
      useBuilderStore.getState().addExperience();
      const id = useBuilderStore.getState().resume.experience[0].id;
      useBuilderStore.getState().updateExperience(id, "company", "Google");
      expect(useBuilderStore.getState().resume.experience[0].company).toBe("Google");
    });

    it("removeExperience removes an entry", () => {
      useBuilderStore.getState().addExperience();
      const id = useBuilderStore.getState().resume.experience[0].id;
      useBuilderStore.getState().removeExperience(id);
      expect(useBuilderStore.getState().resume.experience.length).toBe(0);
    });

    it("addBullet adds a bullet point", () => {
      useBuilderStore.getState().addExperience();
      const id = useBuilderStore.getState().resume.experience[0].id;
      useBuilderStore.getState().addBullet(id);
      expect(useBuilderStore.getState().resume.experience[0].bullets.length).toBe(2);
    });

    it("updateBullet changes a bullet", () => {
      useBuilderStore.getState().addExperience();
      const id = useBuilderStore.getState().resume.experience[0].id;
      useBuilderStore.getState().updateBullet(id, 0, "Did great work");
      expect(useBuilderStore.getState().resume.experience[0].bullets[0]).toBe("Did great work");
    });

    it("removeBullet removes a bullet", () => {
      useBuilderStore.getState().addExperience();
      const id = useBuilderStore.getState().resume.experience[0].id;
      useBuilderStore.getState().addBullet(id);
      useBuilderStore.getState().removeBullet(id, 0);
      expect(useBuilderStore.getState().resume.experience[0].bullets.length).toBe(1);
    });
  });

  describe("education", () => {
    it("addEducation adds an entry", () => {
      useBuilderStore.getState().addEducation();
      expect(useBuilderStore.getState().resume.education.length).toBe(1);
    });

    it("updateEducation updates a field", () => {
      useBuilderStore.getState().addEducation();
      const id = useBuilderStore.getState().resume.education[0].id;
      useBuilderStore.getState().updateEducation(id, "institution", "MIT");
      expect(useBuilderStore.getState().resume.education[0].institution).toBe("MIT");
    });

    it("removeEducation removes an entry", () => {
      useBuilderStore.getState().addEducation();
      const id = useBuilderStore.getState().resume.education[0].id;
      useBuilderStore.getState().removeEducation(id);
      expect(useBuilderStore.getState().resume.education.length).toBe(0);
    });
  });

  describe("skills", () => {
    it("addSkillGroup adds an empty group", () => {
      useBuilderStore.getState().addSkillGroup();
      expect(useBuilderStore.getState().resume.skills.length).toBe(2);
    });

    it("renameSkillGroup changes group name", () => {
      const id = useBuilderStore.getState().resume.skills[0].id;
      useBuilderStore.getState().renameSkillGroup(id, "Frontend");
      expect(useBuilderStore.getState().resume.skills[0].name).toBe("Frontend");
    });

    it("addSkill adds item to group", () => {
      const id = useBuilderStore.getState().resume.skills[0].id;
      useBuilderStore.getState().addSkill(id, "React");
      expect(useBuilderStore.getState().resume.skills[0].items).toContain("React");
    });

    it("removeSkill removes item from group", () => {
      const id = useBuilderStore.getState().resume.skills[0].id;
      useBuilderStore.getState().addSkill(id, "React");
      useBuilderStore.getState().addSkill(id, "Vue");
      useBuilderStore.getState().removeSkill(id, 0);
      expect(useBuilderStore.getState().resume.skills[0].items).toEqual(["Vue"]);
    });

    it("removeSkillGroup removes a group", () => {
      useBuilderStore.getState().addSkillGroup();
      const id = useBuilderStore.getState().resume.skills[1].id;
      useBuilderStore.getState().removeSkillGroup(id);
      expect(useBuilderStore.getState().resume.skills.length).toBe(1);
    });

    it("setSkills replaces all groups", () => {
      useBuilderStore.getState().setSkills([{ id: "new", name: "New", items: ["A"] }]);
      expect(useBuilderStore.getState().resume.skills).toEqual([
        { id: "new", name: "New", items: ["A"] },
      ]);
    });
  });

  describe("languages", () => {
    it("addLanguage adds entry", () => {
      useBuilderStore.getState().addLanguage();
      expect(useBuilderStore.getState().resume.languages.length).toBe(1);
    });

    it("updateLanguage changes a field", () => {
      useBuilderStore.getState().addLanguage();
      const id = useBuilderStore.getState().resume.languages[0].id;
      useBuilderStore.getState().updateLanguage(id, "language", "Polish");
      expect(useBuilderStore.getState().resume.languages[0].language).toBe("Polish");
    });

    it("removeLanguage removes entry", () => {
      useBuilderStore.getState().addLanguage();
      const id = useBuilderStore.getState().resume.languages[0].id;
      useBuilderStore.getState().removeLanguage(id);
      expect(useBuilderStore.getState().resume.languages.length).toBe(0);
    });
  });

  describe("certifications", () => {
    it("addCertification adds entry", () => {
      useBuilderStore.getState().addCertification();
      expect(useBuilderStore.getState().resume.certifications.length).toBe(1);
    });

    it("updateCertification changes a field", () => {
      useBuilderStore.getState().addCertification();
      const id = useBuilderStore.getState().resume.certifications[0].id;
      useBuilderStore.getState().updateCertification(id, "name", "AWS SA");
      expect(useBuilderStore.getState().resume.certifications[0].name).toBe("AWS SA");
    });

    it("removeCertification removes entry", () => {
      useBuilderStore.getState().addCertification();
      const id = useBuilderStore.getState().resume.certifications[0].id;
      useBuilderStore.getState().removeCertification(id);
      expect(useBuilderStore.getState().resume.certifications.length).toBe(0);
    });
  });

  describe("projects", () => {
    it("addProject adds entry", () => {
      useBuilderStore.getState().addProject();
      expect(useBuilderStore.getState().resume.projects.length).toBe(1);
    });

    it("updateProject changes a field", () => {
      useBuilderStore.getState().addProject();
      const id = useBuilderStore.getState().resume.projects[0].id;
      useBuilderStore.getState().updateProject(id, "name", "My App");
      expect(useBuilderStore.getState().resume.projects[0].name).toBe("My App");
    });

    it("removeProject removes entry", () => {
      useBuilderStore.getState().addProject();
      const id = useBuilderStore.getState().resume.projects[0].id;
      useBuilderStore.getState().removeProject(id);
      expect(useBuilderStore.getState().resume.projects.length).toBe(0);
    });
  });

  describe("volunteer", () => {
    it("addVolunteer adds entry", () => {
      useBuilderStore.getState().addVolunteer();
      expect(useBuilderStore.getState().resume.volunteer.length).toBe(1);
    });

    it("updateVolunteer changes a field", () => {
      useBuilderStore.getState().addVolunteer();
      const id = useBuilderStore.getState().resume.volunteer[0].id;
      useBuilderStore.getState().updateVolunteer(id, "role", "Tutor");
      expect(useBuilderStore.getState().resume.volunteer[0].role).toBe("Tutor");
    });

    it("removeVolunteer removes entry", () => {
      useBuilderStore.getState().addVolunteer();
      const id = useBuilderStore.getState().resume.volunteer[0].id;
      useBuilderStore.getState().removeVolunteer(id);
      expect(useBuilderStore.getState().resume.volunteer.length).toBe(0);
    });
  });

  describe("custom sections", () => {
    it("addCustomSection adds section and entries array", () => {
      useBuilderStore.getState().addCustomSection("Awards");
      const sections = useBuilderStore.getState().resume.sections;
      const customSec = sections.find((s) => s.title === "Awards");
      expect(customSec).toBeDefined();
      expect(customSec?.type).toBe("custom");
      expect(useBuilderStore.getState().resume.customSections[customSec!.id]).toEqual([]);
    });

    it("addCustomEntry adds entry to section", () => {
      useBuilderStore.getState().addCustomSection("Awards");
      const customSec = useBuilderStore
        .getState()
        .resume.sections.find((s) => s.title === "Awards")!;
      useBuilderStore.getState().addCustomEntry(customSec.id);
      expect(useBuilderStore.getState().resume.customSections[customSec.id].length).toBe(1);
    });

    it("updateCustomEntry updates entry fields", () => {
      useBuilderStore.getState().addCustomSection("Awards");
      const customSec = useBuilderStore
        .getState()
        .resume.sections.find((s) => s.title === "Awards")!;
      useBuilderStore.getState().addCustomEntry(customSec.id);
      const entryId = useBuilderStore.getState().resume.customSections[customSec.id][0].id;
      useBuilderStore.getState().updateCustomEntry(customSec.id, entryId, "title", "Best Dev");
      expect(useBuilderStore.getState().resume.customSections[customSec.id][0].title).toBe(
        "Best Dev",
      );
    });

    it("removeCustomEntry removes entry", () => {
      useBuilderStore.getState().addCustomSection("Awards");
      const customSec = useBuilderStore
        .getState()
        .resume.sections.find((s) => s.title === "Awards")!;
      useBuilderStore.getState().addCustomEntry(customSec.id);
      const entryId = useBuilderStore.getState().resume.customSections[customSec.id][0].id;
      useBuilderStore.getState().removeCustomEntry(customSec.id, entryId);
      expect(useBuilderStore.getState().resume.customSections[customSec.id].length).toBe(0);
    });
  });

  describe("section management", () => {
    it("toggleSectionVisibility flips visible", () => {
      const sections = useBuilderStore.getState().resume.sections;
      const summarySection = sections.find((s) => s.type === "summary")!;
      expect(summarySection.visible).toBe(true);
      useBuilderStore.getState().toggleSectionVisibility(summarySection.id);
      const updated = useBuilderStore.getState().resume.sections.find((s) => s.type === "summary")!;
      expect(updated.visible).toBe(false);
    });

    it("renameSection changes title", () => {
      const sec = useBuilderStore.getState().resume.sections.find((s) => s.type === "experience")!;
      useBuilderStore.getState().renameSection(sec.id, "Work History");
      const updated = useBuilderStore.getState().resume.sections.find((s) => s.id === sec.id)!;
      expect(updated.title).toBe("Work History");
    });

    it("removeSection removes a section", () => {
      useBuilderStore.getState().addCustomSection("Test");
      const customSec = useBuilderStore.getState().resume.sections.find((s) => s.title === "Test")!;
      useBuilderStore.getState().removeSection(customSec.id);
      expect(
        useBuilderStore.getState().resume.sections.find((s) => s.id === customSec.id),
      ).toBeUndefined();
    });

    it("reorderSections replaces sections", () => {
      const original = useBuilderStore.getState().resume.sections;
      const reversed = [...original].reverse();
      useBuilderStore.getState().reorderSections(reversed);
      expect(useBuilderStore.getState().resume.sections).toEqual(reversed);
    });
  });

  describe("bulk operations", () => {
    it("resetResume restores defaults", () => {
      useBuilderStore.getState().setSummary("Custom text");
      useBuilderStore.getState().resetResume();
      expect(useBuilderStore.getState().resume.summary).toBe("");
    });

    it("setResumeData replaces entire resume", () => {
      const newData = defaultResumeData();
      newData.personal.fullName = "New Person";
      useBuilderStore.getState().setResumeData(newData);
      expect(useBuilderStore.getState().resume.personal.fullName).toBe("New Person");
    });
  });

  describe("getPlainText", () => {
    it("returns text with personal info", () => {
      useBuilderStore.getState().updatePersonal("fullName", "Alice");
      useBuilderStore.getState().updatePersonal("title", "Dev");
      const text = useBuilderStore.getState().getPlainText();
      expect(text).toContain("Alice");
      expect(text).toContain("Dev");
    });

    it("includes summary", () => {
      useBuilderStore.getState().setSummary("I am a developer");
      const text = useBuilderStore.getState().getPlainText();
      expect(text).toContain("Summary");
      expect(text).toContain("I am a developer");
    });

    it("includes experience", () => {
      useBuilderStore.getState().addExperience();
      const id = useBuilderStore.getState().resume.experience[0].id;
      useBuilderStore.getState().updateExperience(id, "position", "SWE");
      useBuilderStore.getState().updateExperience(id, "company", "BigCo");
      const text = useBuilderStore.getState().getPlainText();
      expect(text).toContain("Experience");
      expect(text).toContain("SWE at BigCo");
    });

    it("includes education", () => {
      useBuilderStore.getState().addEducation();
      const id = useBuilderStore.getState().resume.education[0].id;
      useBuilderStore.getState().updateEducation(id, "degree", "BSc");
      const text = useBuilderStore.getState().getPlainText();
      expect(text).toContain("Education");
      expect(text).toContain("BSc");
    });

    it("includes skills", () => {
      const id = useBuilderStore.getState().resume.skills[0].id;
      useBuilderStore.getState().addSkill(id, "TypeScript");
      const text = useBuilderStore.getState().getPlainText();
      expect(text).toContain("Skills");
      expect(text).toContain("TypeScript");
    });

    it("includes languages", () => {
      useBuilderStore.getState().addLanguage();
      const id = useBuilderStore.getState().resume.languages[0].id;
      useBuilderStore.getState().updateLanguage(id, "language", "Spanish");
      const text = useBuilderStore.getState().getPlainText();
      expect(text).toContain("Languages");
      expect(text).toContain("Spanish");
    });

    it("returns minimal text for empty resume", () => {
      const text = useBuilderStore.getState().getPlainText();
      expect(text).not.toContain("Experience");
      expect(text).not.toContain("Education");
    });
  });
});
