import type {
  ResumeData,
  ExperienceEntry,
  EducationEntry,
  SkillGroup,
  LanguageEntry,
} from "../types/resume";
import { createId, defaultResumeData } from "../types/resume";

const SECTION_PATTERNS: Record<string, RegExp> = {
  summary:
    /^(summary|about\s*me|objective|profile|professional\s*summary|career\s*summary)\s*:?\s*$/i,
  experience:
    /^(experience|work\s*experience|employment|professional\s*experience|work\s*history)\s*:?\s*$/i,
  education: /^(education|academic|qualifications|academic\s*background)\s*:?\s*$/i,
  skills:
    /^(skills|technical\s*skills|core\s*competencies|competencies|technologies|tech\s*stack|areas\s*of\s*expertise)\s*:?\s*$/i,
  languages: /^(languages|language\s*skills)\s*:?\s*$/i,
  certifications:
    /^(certifications|certificates|licenses|credentials|courses|training|professional\s*development)\.?\s*:?\s*$/i,
  projects: /^(projects|personal\s*projects|portfolio)\s*:?\s*$/i,
  volunteer: /^(volunteer|volunteering|community|volunteer\s*experience)\s*:?\s*$/i,
};

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const LINKEDIN_RE = /linkedin\.com\/in\/[\w-]+/i;
const GITHUB_RE = /github\.com\/[\w-]+/i;
const URL_RE = /https?:\/\/[^\s]+/gi;
const DATE_RANGE_RE =
  /(\w+\.?\s*\d{4})\s*[-–—]\s*(\w+\.?\s*\d{4}|present|current|now|настоящее|текущее)/i;
const SINGLE_DATE_RE = /\b(\w+\.?\s*\d{4})\b/;
const BULLET_RE = /^[\s]*[•●\-–—*▪▸►]\s*/;

interface TextSection {
  type: string;
  lines: string[];
}

function splitIntoSections(text: string): TextSection[] {
  const lines = text.split("\n");
  const sections: TextSection[] = [];
  let current: TextSection = { type: "header", lines: [] };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    let matched = false;
    for (const [type, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (line && pattern.test(line)) {
        if (current.lines.length > 0) sections.push(current);
        current = { type, lines: [] };
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Preserve empty lines for experience block separation
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) sections.push(current);
  return sections;
}

function parsePersonalFromHeader(lines: string[]): {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  otherUrls: string[];
  consumed: number;
} {
  let fullName = "";
  let title = "";
  let email = "";
  let phone = "";
  let location = "";
  let linkedinUrl = "";
  let githubUrl = "";
  const otherUrls: string[] = [];
  let consumed = 0;

  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i];

    const emailMatch = line.match(EMAIL_RE);
    if (emailMatch) email = emailMatch[0];

    const phoneMatch = line.match(PHONE_RE);
    if (phoneMatch) phone = phoneMatch[1].trim();

    const linkedinMatch = line.match(LINKEDIN_RE);
    if (linkedinMatch) linkedinUrl = linkedinMatch[0];

    const githubMatch = line.match(GITHUB_RE);
    if (githubMatch) githubUrl = githubMatch[0];

    const urls = line.match(URL_RE) || [];
    for (const url of urls) {
      if (!LINKEDIN_RE.test(url) && !GITHUB_RE.test(url)) {
        otherUrls.push(url);
      }
    }

    if (i === 0 && !emailMatch && !phoneMatch && !URL_RE.test(line)) {
      fullName = line;
    } else if (i === 1 && !emailMatch && !phoneMatch && !URL_RE.test(line) && fullName) {
      title = line;
    }

    const hasContactInfo =
      emailMatch || phoneMatch || linkedinMatch || githubMatch || urls.length > 0;
    if (i > 1 && !hasContactInfo && !isLocationLike(line)) break;

    if (!hasContactInfo && i > 0 && isLocationLike(line) && !email) {
      location = line;
    }

    consumed = i + 1;
  }

  // Try to extract location from contact lines
  if (!location) {
    for (let i = 0; i < consumed; i++) {
      const cleaned = lines[i]
        .replace(EMAIL_RE, "")
        .replace(PHONE_RE, "")
        .replace(URL_RE, "")
        .replace(/[|,•·]/g, "")
        .trim();
      if (
        cleaned &&
        cleaned !== fullName &&
        cleaned !== title &&
        cleaned.length > 2 &&
        cleaned.length < 60
      ) {
        location = cleaned;
        break;
      }
    }
  }

  return { fullName, title, email, phone, location, linkedinUrl, githubUrl, otherUrls, consumed };
}

function isLocationLike(line: string): boolean {
  return (
    /\b(city|state|country|st\.|ave\.|rd\.|blvd|street|avenue)\b/i.test(line) ||
    /\b[A-Z]{2}\b/.test(line) ||
    /,\s*[A-Z]/.test(line)
  );
}

function parseExperience(lines: string[]): ExperienceEntry[] {
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  // Re-join and re-split preserving empty lines as separators
  for (const line of lines) {
    if (line.trim() === "") {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);

  if (blocks.length <= 1) {
    return parseExperienceBlock(lines.filter((l) => l.trim()));
  }

  const entries: ExperienceEntry[] = [];
  for (const block of blocks) {
    entries.push(...parseExperienceBlock(block));
  }
  return entries;
}

function parseExperienceBlock(lines: string[]): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  let current: Partial<ExperienceEntry> | null = null;

  for (const line of lines) {
    const dateMatch = line.match(DATE_RANGE_RE);
    const isBullet = BULLET_RE.test(line);

    if (dateMatch && !isBullet) {
      // A line with a date range starts a new experience entry
      if (current?.position) {
        entries.push(finalizeExperience(current));
      }
      current = {
        id: createId(),
        startDate: dateMatch[1],
        endDate: /present|current|now|настоящее|текущее/i.test(dateMatch[2]) ? "" : dateMatch[2],
        current: /present|current|now|настоящее|текущее/i.test(dateMatch[2]),
        bullets: [],
        company: "",
        position: "",
        location: "",
      };
      const remaining = line.replace(DATE_RANGE_RE, "").replace(/[|•·]/g, " ").trim();
      if (remaining) {
        const parts = remaining.split(/\s{2,}|\s*[–—|]\s*/);
        if (parts.length >= 2) {
          current.position = parts[0].trim();
          current.company = parts[1].trim();
        } else {
          current.position = remaining;
        }
      }
    } else if (isBullet) {
      // Bullet point belongs to current entry
      if (!current) {
        current = {
          id: createId(),
          position: "",
          company: "",
          location: "",
          startDate: "",
          endDate: "",
          current: false,
          bullets: [],
        };
      }
      current.bullets!.push(line.replace(BULLET_RE, "").trim());
    } else if (current && !current.position) {
      // First non-date, non-bullet line after a date → position/company
      const parts = line.split(/\s{2,}|\s*[–—|]\s*|\s+at\s+/i);
      if (parts.length >= 2) {
        current.position = parts[0].trim();
        current.company = parts[1].trim();
      } else {
        current.position = line;
      }
    } else if (current && current.position && !current.company) {
      // Second non-date, non-bullet line → company/location
      current.company = line;
    } else if (current) {
      // Continuation text — treat as a bullet point (non-bullet text within same block)
      current.bullets!.push(line.trim());
    } else {
      // No current entry yet and no date — start one with position
      current = {
        id: createId(),
        position: line,
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        current: false,
        bullets: [],
      };
    }
  }

  if (current?.position || (current?.bullets && current.bullets.length > 0)) {
    entries.push(finalizeExperience(current));
  }

  return entries;
}

function finalizeExperience(partial: Partial<ExperienceEntry>): ExperienceEntry {
  return {
    id: partial.id || createId(),
    company: partial.company || "",
    position: partial.position || "",
    location: partial.location || "",
    startDate: partial.startDate || "",
    endDate: partial.endDate || "",
    current: partial.current || false,
    bullets: partial.bullets?.length ? partial.bullets : [""],
  };
}

function parseEducation(lines: string[]): EducationEntry[] {
  const DEGREE_RE =
    /\b(bachelor|master|phd|doctor|associate|diploma|mba|bsc|msc|ba|ma|bs|ms|b\.s\.|m\.s\.|inżynier|magister|licencjat|engineer|degree)\b/i;

  // Split lines into blocks by empty lines
  const blocks: string[][] = [];
  let currentBlock: string[] = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);

  // If no empty-line separation, treat every date-bearing or degree-bearing line as a block start
  if (blocks.length <= 1) {
    return parseEducationFlat(
      lines.filter((l) => l.trim()),
      DEGREE_RE,
    );
  }

  const entries: EducationEntry[] = [];
  for (const block of blocks) {
    entries.push(...parseEducationFlat(block, DEGREE_RE));
  }
  return entries;
}

function parseEducationFlat(lines: string[], DEGREE_RE: RegExp): EducationEntry[] {
  const entries: EducationEntry[] = [];
  let current: Partial<EducationEntry> | null = null;

  for (const line of lines) {
    const dateMatch = line.match(DATE_RANGE_RE) || line.match(SINGLE_DATE_RE);
    const hasDegreeKeyword = DEGREE_RE.test(line);
    const isBullet = BULLET_RE.test(line);
    if (isBullet) continue; // skip bullet points in education

    if (hasDegreeKeyword) {
      // If we don't have an entry yet, create one
      if (!current) {
        current = {
          id: createId(),
          institution: "",
          degree: "",
          field: "",
          startDate: "",
          endDate: "",
          gpa: "",
        };
      }
      const cleanLine = line.replace(DATE_RANGE_RE, "").replace(SINGLE_DATE_RE, "").trim();
      const inMatch = cleanLine.match(/(.+?)\s+in\s+(.+)/i);
      if (inMatch) {
        current.degree = inMatch[1].trim();
        current.field = inMatch[2].trim();
      } else {
        current.degree = cleanLine;
      }
      if (dateMatch) {
        extractDateInto(current, line);
      }
    } else if (dateMatch && !current) {
      // Date line without degree — start entry (institution may be next or already above)
      current = {
        id: createId(),
        institution: "",
        degree: "",
        field: "",
        startDate: "",
        endDate: "",
        gpa: "",
      };
      const remaining = line.replace(DATE_RANGE_RE, "").replace(SINGLE_DATE_RE, "").trim();
      if (remaining) current.institution = remaining;
      extractDateInto(current, line);
    } else if (current) {
      // Additional line in current entry
      const gpaMatch = line.match(/gpa:?\s*([\d.]+)/i);
      if (gpaMatch) {
        current.gpa = gpaMatch[1];
      } else if (!current.institution) {
        current.institution = line.replace(DATE_RANGE_RE, "").replace(SINGLE_DATE_RE, "").trim();
        if (dateMatch) extractDateInto(current, line);
      } else if (dateMatch && !current.startDate && !current.endDate) {
        extractDateInto(current, line);
      }
    } else {
      // First line, no degree keyword, no date — likely institution name
      current = {
        id: createId(),
        institution: line.trim(),
        degree: "",
        field: "",
        startDate: "",
        endDate: "",
        gpa: "",
      };
    }
  }

  if (current && (current.institution || current.degree)) {
    entries.push(finalizeEducation(current));
  }
  return entries;
}

function extractDateInto(entry: Partial<EducationEntry>, line: string): void {
  if (DATE_RANGE_RE.test(line)) {
    const m = line.match(DATE_RANGE_RE)!;
    entry.startDate = m[1];
    entry.endDate = /present|current|now|настоящее|текущее/i.test(m[2]) ? "" : m[2];
  } else {
    const m = line.match(SINGLE_DATE_RE);
    if (m) {
      if (!entry.endDate) entry.endDate = m[1] || m[0];
      else if (!entry.startDate) entry.startDate = m[1] || m[0];
    }
  }
}

function finalizeEducation(partial: Partial<EducationEntry>): EducationEntry {
  return {
    id: partial.id || createId(),
    institution: partial.institution || "",
    degree: partial.degree || "",
    field: partial.field || "",
    startDate: partial.startDate || "",
    endDate: partial.endDate || "",
    gpa: partial.gpa || "",
  };
}

function parseSkills(lines: string[]): SkillGroup[] {
  const groups: SkillGroup[] = [];

  for (const line of lines) {
    const cleaned = line.replace(BULLET_RE, "");
    // Check for "Group Name: skill1, skill2" pattern
    const colonMatch = cleaned.match(/^([^:,]{2,30}):\s*(.+)/);
    if (colonMatch) {
      const name = colonMatch[1].trim();
      const items = colonMatch[2]
        .split(/[,;|•·]/)
        .map((s) => s.trim())
        .filter((s) => s && s.length < 60);
      if (items.length) {
        groups.push({ id: createId(), name, items });
        continue;
      }
    }
    // Flat skills — add to a default unnamed group
    const parts = cleaned.split(/[,;|•·]/);
    const items = parts.map((s) => s.trim()).filter((s) => s && s.length < 60);
    if (items.length) {
      // Merge into the last unnamed group or create one
      const lastGroup =
        groups.length > 0 && !groups[groups.length - 1].name ? groups[groups.length - 1] : null;
      if (lastGroup) {
        lastGroup.items.push(...items);
      } else {
        groups.push({ id: createId(), name: "", items });
      }
    }
  }

  return groups.length ? groups : [{ id: createId(), name: "", items: [] }];
}

// Known language names for validation
const KNOWN_LANGUAGES =
  /^(english|polish|russian|german|french|spanish|italian|portuguese|chinese|japanese|korean|arabic|turkish|dutch|swedish|norwegian|danish|finnish|czech|slovak|hungarian|romanian|bulgarian|croatian|serbian|slovenian|ukrainian|hindi|bengali|thai|vietnamese|indonesian|malay|hebrew|greek|latin|persian|farsi|afrikaans|swahili|tagalog|catalan|basque|galician|welsh|irish|scottish|icelandic|estonian|latvian|lithuanian|georgian|armenian|kazakh|uzbek|belarusian|macedonian|bosnian|albanian|angielski|polski|rosyjski|niemiecki|francuski|hiszpański|włoski|chiński|japoński|英語|ポーランド語|русский|польский|немецкий|французский|испанский|итальянский|украинский|английский)\b/i;

// GDPR / consent clause detection
const CONSENT_RE =
  /\b(wyrażam\s+zgodę|zgoda|rodo|gdpr|przetwarzanie.*danych|data\s*protection|consent|personal\s*data\s*processing|rozporządzeni|parlamentu\s*europejskiego)\b/i;

// Proficiency levels
const PROFICIENCY_RE =
  /\b(native|fluent|proficient|intermediate|beginner|basic|advanced|elementary|conversational|upper.?intermediate|pre.?intermediate|a1|a2|b1|b2|c1|c2|mother\s*tongue|ojczysty|biegły|zaawansowany|średniozaawansowany|podstawowy|родной|свободный|продвинутый|средний|начальный)\b/i;

function parseLanguages(lines: string[]): LanguageEntry[] {
  const results: LanguageEntry[] = [];

  // Join all lines into one text, then split into language segments
  const fullText = lines
    .map((l) => l.replace(BULLET_RE, "").trim())
    .filter(Boolean)
    .join(" ");
  if (!fullText) return results;

  // Remove GDPR/consent clause from the end
  const cleanText = fullText.replace(/,?\s*(?:Wyrażam|wyrażam)[\s\S]*$/i, "").trim();
  if (!cleanText) return results;

  // Split by common separators: / , ; | • or newlines
  // But be careful not to split "B2 / Upper-Intermediate" — only split when next part starts with a language name
  // Strategy: first try to extract "Language (Level)" or "Language - Level" patterns via regex globally
  const langEntries: { language: string; proficiency: string }[] = [];

  // Pattern: "Language (Level)" globally
  const parenGlobal = /([A-Za-zÀ-ž]+)\s*\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  const usedRanges: [number, number][] = [];

  // First pass: extract "Language (Level)" patterns
  const tempClean = cleanText;
  while ((m = parenGlobal.exec(tempClean)) !== null) {
    const lang = m[1].trim();
    const prof = m[2].trim();
    if (KNOWN_LANGUAGES.test(lang) || PROFICIENCY_RE.test(prof)) {
      langEntries.push({ language: lang, proficiency: prof });
      usedRanges.push([m.index, m.index + m[0].length]);
    }
  }

  // Remove already matched ranges and process remaining text
  let remaining = cleanText;
  // Process from end to start to keep indices valid
  for (let i = usedRanges.length - 1; i >= 0; i--) {
    remaining = remaining.substring(0, usedRanges[i][0]) + remaining.substring(usedRanges[i][1]);
  }

  // Split remaining by / , ; and process "Language - Level" or "Language : Level" patterns
  const segments = remaining
    .split(/\s*[/,;|•]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const seg of segments) {
    if (CONSENT_RE.test(seg)) continue;
    if (seg.length < 2) continue;

    const dashMatch = seg.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    const colonMatch = seg.match(/^(.+?)\s*:\s*(.+)$/);

    if (dashMatch) {
      const lang = dashMatch[1].trim();
      const prof = dashMatch[2].trim();
      if (KNOWN_LANGUAGES.test(lang) || PROFICIENCY_RE.test(prof)) {
        langEntries.push({ language: lang, proficiency: prof });
        continue;
      }
    }
    if (colonMatch) {
      const lang = colonMatch[1].trim();
      const prof = colonMatch[2].trim();
      if (KNOWN_LANGUAGES.test(lang) || PROFICIENCY_RE.test(prof)) {
        langEntries.push({ language: lang, proficiency: prof });
        continue;
      }
    }

    // Plain language name with possible proficiency
    const profMatch = seg.match(PROFICIENCY_RE);
    if (profMatch) {
      const lang = seg
        .replace(PROFICIENCY_RE, "")
        .replace(/[-–—:()]/g, "")
        .trim();
      if (lang) {
        langEntries.push({ language: lang, proficiency: profMatch[0].trim() });
        continue;
      }
    }

    // Just a language name
    if (KNOWN_LANGUAGES.test(seg) && !CONSENT_RE.test(seg)) {
      langEntries.push({ language: seg, proficiency: "" });
    }
  }

  for (const entry of langEntries) {
    results.push({ id: createId(), language: entry.language, proficiency: entry.proficiency });
  }

  return results;
}

export function parseResumeText(text: string): ResumeData {
  const data = defaultResumeData();
  const sections = splitIntoSections(text);

  for (const section of sections) {
    switch (section.type) {
      case "header": {
        const info = parsePersonalFromHeader(section.lines);
        data.personal.fullName = info.fullName;
        data.personal.title = info.title;
        data.personal.email = info.email;
        data.personal.phone = info.phone;
        data.personal.location = info.location;

        if (info.linkedinUrl) {
          data.personal.links.push({
            id: createId(),
            type: "linkedin",
            url: info.linkedinUrl,
            label: "LinkedIn",
          });
        }
        if (info.githubUrl) {
          data.personal.links.push({
            id: createId(),
            type: "github",
            url: info.githubUrl,
            label: "GitHub",
          });
        }
        for (const url of info.otherUrls) {
          data.personal.links.push({ id: createId(), type: "other", url, label: "" });
        }

        const remaining = section.lines.slice(info.consumed);
        if (remaining.length > 0 && !data.summary) {
          data.summary = remaining.join(" ").trim();
        }
        break;
      }
      case "summary":
        data.summary = section.lines.join(" ").trim();
        break;
      case "experience":
        data.experience = parseExperience(section.lines);
        break;
      case "education":
        data.education = parseEducation(section.lines);
        break;
      case "skills":
        data.skills = parseSkills(section.lines);
        break;
      case "languages":
        data.languages = parseLanguages(section.lines);
        break;
      case "certifications":
        for (const rawLine of section.lines) {
          const line = rawLine.replace(BULLET_RE, "").trim();
          if (!line) continue;
          // Extract URL if present
          const urlMatch = line.match(URL_RE);
          const url = urlMatch ? urlMatch[0] : "";
          const name = line
            .replace(URL_RE, "")
            .replace(/[()[\]]/g, "")
            .trim();
          if (!name) continue;
          // Try to extract date
          const dateMatch = name.match(DATE_RANGE_RE) || name.match(SINGLE_DATE_RE);
          const date = dateMatch ? dateMatch[0] : "";
          const cleanName = name
            .replace(DATE_RANGE_RE, "")
            .replace(SINGLE_DATE_RE, "")
            .replace(/\s*[-–—|]\s*$/, "")
            .trim();
          data.certifications.push({
            id: createId(),
            name: cleanName || name,
            issuer: "",
            date,
            url,
          });
        }
        break;
      case "projects":
        for (const line of section.lines) {
          if (!BULLET_RE.test(line)) {
            data.projects.push({
              id: createId(),
              name: line.trim(),
              description: "",
              technologies: "",
              url: "",
            });
          } else if (data.projects.length > 0) {
            const last = data.projects[data.projects.length - 1];
            const bullet = line.replace(BULLET_RE, "").trim();
            last.description = last.description ? `${last.description}\n${bullet}` : bullet;
          }
        }
        break;
      case "volunteer":
        for (const line of section.lines) {
          if (!BULLET_RE.test(line)) {
            data.volunteer.push({
              id: createId(),
              organization: "",
              role: line.trim(),
              startDate: "",
              endDate: "",
              description: "",
            });
          } else if (data.volunteer.length > 0) {
            const last = data.volunteer[data.volunteer.length - 1];
            const bullet = line.replace(BULLET_RE, "").trim();
            last.description = last.description ? `${last.description}\n${bullet}` : bullet;
          }
        }
        break;
    }
  }

  return data;
}

/**
 * Merge extracted hyperlinks (from PDF/DOCX) into resume data,
 * adding any links not already present from text parsing.
 */
export function mergeExtractedLinks(data: ResumeData, extractedUrls: string[]): ResumeData {
  const existingUrls = new Set(
    data.personal.links.map((l) => l.url.toLowerCase().replace(/^https?:\/\//, "")),
  );
  // Also consider email/phone as already matched
  if (data.personal.email) existingUrls.add(data.personal.email.toLowerCase());

  const newLinks = [...data.personal.links];

  for (const raw of extractedUrls) {
    const url = raw.trim();
    if (!url || /^mailto:/i.test(url) || /^javascript:/i.test(url)) continue;

    const normalised = url.toLowerCase().replace(/^https?:\/\//, "");
    if (existingUrls.has(normalised)) continue;
    existingUrls.add(normalised);

    if (LINKEDIN_RE.test(url)) {
      newLinks.push({ id: createId(), type: "linkedin", url, label: "LinkedIn" });
    } else if (GITHUB_RE.test(url)) {
      newLinks.push({ id: createId(), type: "github", url, label: "GitHub" });
    } else {
      newLinks.push({ id: createId(), type: "other", url, label: "" });
    }
  }

  return {
    ...data,
    personal: { ...data.personal, links: newLinks },
  };
}
