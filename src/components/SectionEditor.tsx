import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Eye,
  EyeOff,
  Pencil,
  Check,
  Link as LinkIcon,
} from "lucide-react";
import { useBuilderStore } from "../store/useBuilderStore";
import type { ResumeSection } from "../types/resume";
import { LINK_PRESETS } from "../types/resume";
import type { LinkType } from "../types/resume";
import { cn } from "../lib/utils";
import { BuilderField } from "./layout/BuilderField";
import { FieldLayoutPopover } from "./layout/FieldLayoutPopover";

export function SectionEditor() {
  const { t } = useTranslation();
  const {
    resume,
    reorderSections,
    toggleSectionVisibility,
    removeSection,
    renameSection,
    addCustomSection,
  } = useBuilderStore();

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIdx((prev) => (prev === idx ? prev : idx));
  };

  const handleDrop = (e: React.DragEvent, _idx: number) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    if (dragIdx !== null && dropIdx !== null && dragIdx !== dropIdx) {
      const updated = [...resume.sections];
      const [moved] = updated.splice(dragIdx, 1);
      updated.splice(dropIdx, 0, moved);
      reorderSections(updated);
    }
    setDragIdx(null);
    setDropIdx(null);
    setIsDragging(false);
  };

  const handleAddSection = () => {
    const name = newSectionName.trim();
    if (!name) return;
    addCustomSection(name);
    setNewSectionName("");
    setShowAddSection(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {resume.sections.map((sec, idx) => (
        <SectionBlock
          key={sec.id}
          section={sec}
          idx={idx}
          totalSections={resume.sections.length}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onKeyboardMove={(from, to) => {
            const updated = [...resume.sections];
            const [moved] = updated.splice(from, 1);
            updated.splice(to, 0, moved);
            reorderSections(updated);
          }}
          onToggleVisibility={() => toggleSectionVisibility(sec.id)}
          onRemove={sec.type === "custom" ? () => removeSection(sec.id) : undefined}
          onRename={(title) => renameSection(sec.id, title)}
          isDragging={isDragging && dragIdx === idx}
          isDropTarget={dropIdx === idx}
        />
      ))}

      {showAddSection ? (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-secondary/30">
          <input
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
            placeholder={t("builder.newSectionPlaceholder")}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            autoFocus
          />
          <button
            onClick={handleAddSection}
            disabled={!newSectionName.trim()}
            className="p-1.5 rounded-md text-primary hover:bg-primary/10 disabled:opacity-30 transition-colors"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => {
              setShowAddSection(false);
              setNewSectionName("");
            }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddSection(true)}
          className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          <Plus size={14} />
          {t("builder.addSection")}
        </button>
      )}
    </div>
  );
}

function SectionBlock({
  section,
  idx,
  totalSections,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onKeyboardMove,
  onToggleVisibility,
  onRemove,
  onRename,
  isDragging,
  isDropTarget,
}: {
  section: ResumeSection;
  idx: number;
  totalSections: number;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  onKeyboardMove: (from: number, to: number) => void;
  onToggleVisibility: () => void;
  onRemove?: () => void;
  onRename: (title: string) => void;
  isDragging: boolean;
  isDropTarget: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(section.title);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleRename = () => {
    if (renameValue.trim()) {
      onRename(renameValue.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div
      ref={cardRef}
      onDragOver={(e) => onDragOver(e, idx)}
      onDrop={(e) => onDrop(e, idx)}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-xl border border-border bg-card transition-all",
        isDragging && "opacity-50 ring-2 ring-primary",
        isDropTarget && !isDragging && "border-primary ring-1 ring-primary/50",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div
          draggable
          tabIndex={0}
          role="button"
          aria-roledescription="sortable"
          aria-label={t("builder.reorderSection", { title: section.title })}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            if (cardRef.current) {
              const rect = cardRef.current.getBoundingClientRect();
              e.dataTransfer.setDragImage(
                cardRef.current,
                e.clientX - rect.left,
                e.clientY - rect.top,
              );
            }
            onDragStart(idx);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && idx > 0) {
              e.preventDefault();
              onKeyboardMove(idx, idx - 1);
            } else if (e.key === "ArrowDown" && idx < totalSections - 1) {
              e.preventDefault();
              onKeyboardMove(idx, idx + 1);
            }
          }}
          className="text-muted-foreground cursor-grab shrink-0 p-1 -m-1 rounded hover:bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
        >
          <GripVertical size={14} />
        </div>

        {isRenaming ? (
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none border-b border-primary"
            autoFocus
          />
        ) : (
          <span
            onClick={() => setExpanded(!expanded)}
            className="flex-1 text-left text-sm font-medium text-foreground cursor-pointer select-none"
          >
            {section.title}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {section.type !== "personal" ? (
            <FieldLayoutPopover field="sectionHeading" compact />
          ) : null}
          {!isRenaming && (
            <button
              onClick={() => {
                setRenameValue(section.title);
                setIsRenaming(true);
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title={t("builder.rename")}
            >
              <Pencil size={12} />
            </button>
          )}
          <button
            onClick={onToggleVisibility}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title={section.visible ? t("builder.hide") : t("builder.show")}
          >
            {section.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title={t("builder.removeSection")}
            >
              <Trash2 size={12} />
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border">
          <SectionContent section={section} />
        </div>
      )}
    </div>
  );
}

function SectionContent({ section }: { section: ResumeSection }) {
  switch (section.type) {
    case "personal":
      return <PersonalSection />;
    case "summary":
      return <SummarySection />;
    case "experience":
      return <ExperienceSection />;
    case "education":
      return <EducationSection />;
    case "skills":
      return <SkillsSection />;
    case "languages":
      return <LanguagesSection />;
    case "certifications":
      return <CertificationsSection />;
    case "projects":
      return <ProjectsSection />;
    case "volunteer":
      return <VolunteerSection />;
    case "custom":
      return <CustomSection sectionId={section.id} />;
  }
}

function PersonalSection() {
  const { t } = useTranslation();
  const { resume, updatePersonal, addLink, updateLink, removeLink } = useBuilderStore();
  const p = resume.personal;
  const [showLinkMenu, setShowLinkMenu] = useState(false);

  const handleAddLink = (type: LinkType) => {
    addLink(type);
    setShowLinkMenu(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 xl:grid-cols-2">
        <BuilderField label={t("builder.fullName")} field="personalName" className="xl:col-span-2">
          <input
            value={p.fullName}
            onChange={(e) => updatePersonal("fullName", e.target.value)}
            placeholder="John Doe"
            className="w-full rounded-lg border border-transparent bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </BuilderField>

        <BuilderField label={t("builder.jobTitle")} field="personalTitle">
          <input
            value={p.title}
            onChange={(e) => updatePersonal("title", e.target.value)}
            placeholder="Senior Software Engineer"
            className="w-full rounded-lg border border-transparent bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </BuilderField>

        <BuilderField
          label={t("builder.layoutField.personalContacts", "Contact line")}
          field="personalContacts"
          className="xl:col-span-2"
        >
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <input
                value={p.email}
                onChange={(e) => updatePersonal("email", e.target.value)}
                placeholder="john@example.com"
                type="email"
                className="w-full rounded-lg border border-transparent bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <input
                value={p.phone}
                onChange={(e) => updatePersonal("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                type="tel"
                className="w-full rounded-lg border border-transparent bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <input
                value={p.location}
                onChange={(e) => updatePersonal("location", e.target.value)}
                placeholder="San Francisco, CA"
                className="w-full rounded-lg border border-transparent bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {p.links.length > 0 ? (
              <div className="flex flex-col gap-2">
                {p.links.map((link) => {
                  const preset = LINK_PRESETS.find((lp) => lp.type === link.type);
                  return (
                    <div key={link.id} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-xs text-muted-foreground">
                        {preset?.label ?? link.type}
                      </span>
                      <input
                        value={link.url}
                        onChange={(e) => updateLink(link.id, "url", e.target.value)}
                        placeholder={preset?.placeholder ?? "https://..."}
                        className="flex-1 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                      />
                      <input
                        value={link.label}
                        onChange={(e) => updateLink(link.id, "label", e.target.value)}
                        placeholder={t("builder.linkLabel")}
                        className="w-28 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={() => removeLink(link.id)}
                        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="relative">
              <button
                onClick={() => setShowLinkMenu(!showLinkMenu)}
                className="flex items-center gap-1.5 text-xs text-primary transition-colors hover:text-primary/80"
              >
                <LinkIcon size={12} />
                {t("builder.addLink")}
              </button>
              {showLinkMenu ? (
                <div className="absolute left-0 top-full z-20 mt-1 min-w-40 rounded-lg border border-border bg-card py-1 shadow-lg">
                  {LINK_PRESETS.map((preset) => (
                    <button
                      key={preset.type}
                      onClick={() => handleAddLink(preset.type)}
                      className="w-full px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-secondary/60"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </BuilderField>
      </div>
    </div>
  );
}

function SummarySection() {
  const { t } = useTranslation();
  const { resume, setSummary } = useBuilderStore();

  return (
    <BuilderField label={t("builder.summary", "Summary")} field="summary">
      <textarea
        value={resume.summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder={t("builder.summaryPlaceholder")}
        rows={4}
        className="w-full resize-none rounded-lg border border-transparent bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </BuilderField>
  );
}

function ExperienceSection() {
  const { t } = useTranslation();
  const {
    resume,
    addExperience,
    updateExperience,
    removeExperience,
    addBullet,
    updateBullet,
    removeBullet,
  } = useBuilderStore();

  return (
    <div className="flex flex-col gap-4">
      {resume.experience.map((exp) => (
        <div key={exp.id} className="p-3 rounded-lg bg-secondary/20 border border-border">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex flex-1 flex-col gap-3 min-w-0">
              <BuilderField label={t("builder.position")} field="experienceTitle">
                <input
                  value={exp.position}
                  onChange={(e) => updateExperience(exp.id, "position", e.target.value)}
                  placeholder={t("builder.position")}
                  className="min-w-0 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>

              <BuilderField
                label={t("builder.layoutField.experienceSubtitle", "Subtitle line")}
                field="experienceSubtitle"
              >
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={exp.company}
                    onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                    placeholder={t("builder.company")}
                    className="min-w-0 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                  />
                  <input
                    value={exp.location}
                    onChange={(e) => updateExperience(exp.id, "location", e.target.value)}
                    placeholder={t("builder.location")}
                    className="min-w-0 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                  />
                </div>
              </BuilderField>

              <BuilderField
                label={t("builder.layoutField.experienceMeta", "Date line")}
                field="experienceMeta"
              >
                <div className="space-y-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      value={exp.startDate}
                      onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)}
                      placeholder={t("builder.startDate")}
                      className="min-w-0 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                    />
                    <input
                      value={exp.current ? "" : exp.endDate}
                      onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
                      placeholder={exp.current ? t("builder.present") : t("builder.endDate")}
                      disabled={exp.current}
                      className="min-w-0 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary disabled:opacity-50"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exp.current}
                      onChange={(e) => updateExperience(exp.id, "current", e.target.checked)}
                      className="rounded"
                    />
                    {t("builder.currentPosition")}
                  </label>
                </div>
              </BuilderField>
            </div>
            <button
              onClick={() => removeExperience(exp.id)}
              className="p-1.5 ml-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <BuilderField label={t("builder.addBullet")} field="experienceBullet">
            <div className="flex flex-col gap-1.5">
              {exp.bullets.map((bullet, bi) => (
                <div key={bi} className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">•</span>
                  <input
                    value={bullet}
                    onChange={(e) => updateBullet(exp.id, bi, e.target.value)}
                    placeholder={t("builder.bulletPlaceholder")}
                    className="flex-1 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => removeBullet(exp.id, bi)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addBullet(exp.id)}
                className="self-start flex items-center gap-1.5 text-xs text-primary transition-colors hover:text-primary/80"
              >
                <Plus size={12} />
                {t("builder.addBullet")}
              </button>
            </div>
          </BuilderField>
        </div>
      ))}

      <button
        onClick={addExperience}
        className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <Plus size={14} />
        {t("builder.addExperience")}
      </button>
    </div>
  );
}

function EducationSection() {
  const { t } = useTranslation();
  const { resume, addEducation, updateEducation, removeEducation } = useBuilderStore();

  return (
    <div className="flex flex-col gap-4">
      {resume.education.map((edu) => (
        <div key={edu.id} className="p-3 rounded-lg bg-secondary/20 border border-border">
          <div className="flex items-start justify-between">
            <div className="flex flex-1 min-w-0 flex-col gap-3">
              <BuilderField
                label={t("builder.layoutField.educationSubtitle", "Institution line")}
                field="educationSubtitle"
              >
                <input
                  value={edu.institution}
                  onChange={(e) => updateEducation(edu.id, "institution", e.target.value)}
                  placeholder={t("builder.institution")}
                  className="min-w-0 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>

              <BuilderField
                label={t("builder.layoutField.educationTitle", "Education title")}
                field="educationTitle"
              >
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={edu.degree}
                    onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                    placeholder={t("builder.degree")}
                    className="min-w-0 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                  />
                  <input
                    value={edu.field}
                    onChange={(e) => updateEducation(edu.id, "field", e.target.value)}
                    placeholder={t("builder.fieldOfStudy")}
                    className="min-w-0 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                  />
                </div>
              </BuilderField>

              <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
                <BuilderField
                  label={t("builder.layoutField.educationMeta", "Date line")}
                  field="educationMeta"
                >
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      value={edu.startDate}
                      onChange={(e) => updateEducation(edu.id, "startDate", e.target.value)}
                      placeholder={t("builder.startDate")}
                      className="min-w-0 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                    />
                    <input
                      value={edu.endDate}
                      onChange={(e) => updateEducation(edu.id, "endDate", e.target.value)}
                      placeholder={t("builder.endDate")}
                      className="min-w-0 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </BuilderField>

                <BuilderField label={t("builder.gpa", "GPA")} field="educationDetail">
                  <input
                    value={edu.gpa}
                    onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)}
                    placeholder="GPA"
                    className="min-w-0 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                  />
                </BuilderField>
              </div>
            </div>
            <button
              onClick={() => removeEducation(edu.id)}
              className="p-1.5 ml-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addEducation}
        className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <Plus size={14} />
        {t("builder.addEducation")}
      </button>
    </div>
  );
}

function SkillsSection() {
  const { t } = useTranslation();
  const { resume, addSkillGroup, removeSkillGroup, renameSkillGroup, addSkill, removeSkill } =
    useBuilderStore();
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const handleAdd = (groupId: string) => {
    const skill = (inputs[groupId] ?? "").trim();
    if (!skill) return;
    addSkill(groupId, skill);
    setInputs((prev) => ({ ...prev, [groupId]: "" }));
  };

  return (
    <div className="flex flex-col gap-3">
      {resume.skills.map((group) => (
        <div key={group.id} className="p-3 rounded-lg bg-secondary/20 border border-border">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <BuilderField
                label={t("builder.skillGroupName")}
                field="skillsGroupName"
                className="flex-1"
              >
                <input
                  value={group.name}
                  onChange={(e) => renameSkillGroup(group.id, e.target.value)}
                  placeholder={t("builder.skillGroupName")}
                  className="min-w-0 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>
              {resume.skills.length > 1 && (
                <button
                  onClick={() => removeSkillGroup(group.id)}
                  className="mt-6 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            <BuilderField
              label={t("builder.layoutField.skillsItems", "Skill line")}
              field="skillsItems"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((skill, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs text-primary"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(group.id, i)}
                        className="transition-colors hover:text-destructive"
                      >
                        <Trash2 size={10} />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={inputs[group.id] ?? ""}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [group.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd(group.id)}
                    placeholder={t("builder.skillPlaceholder")}
                    className="min-w-0 flex-1 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => handleAdd(group.id)}
                    disabled={!(inputs[group.id] ?? "").trim()}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </BuilderField>
          </div>
        </div>
      ))}

      <button
        onClick={addSkillGroup}
        className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <Plus size={14} />
        {t("builder.addSkillGroup")}
      </button>
    </div>
  );
}

function LanguagesSection() {
  const { t } = useTranslation();
  const { resume, addLanguage, updateLanguage, removeLanguage } = useBuilderStore();

  return (
    <div className="flex flex-col gap-3">
      <BuilderField
        label={t("builder.layoutField.languagesItems", "Language line")}
        field="languagesItems"
      >
        <div className="flex flex-col gap-3">
          {resume.languages.map((lang) => (
            <div key={lang.id} className="flex items-center gap-2">
              <input
                value={lang.language}
                onChange={(e) => updateLanguage(lang.id, "language", e.target.value)}
                placeholder={t("builder.language")}
                className="flex-1 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
              />
              <input
                value={lang.proficiency}
                onChange={(e) => updateLanguage(lang.id, "proficiency", e.target.value)}
                placeholder={t("builder.proficiency")}
                className="flex-1 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => removeLanguage(lang.id)}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </BuilderField>
      <button
        onClick={addLanguage}
        className="flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <Plus size={14} />
        {t("builder.addLanguage")}
      </button>
    </div>
  );
}

function CertificationsSection() {
  const { t } = useTranslation();
  const { resume, addCertification, updateCertification, removeCertification } = useBuilderStore();

  return (
    <div className="flex flex-col gap-4">
      {resume.certifications.map((cert) => (
        <div key={cert.id} className="p-3 rounded-lg bg-secondary/20 border border-border">
          <div className="flex items-start justify-between">
            <div className="grid flex-1 gap-3 md:grid-cols-2">
              <BuilderField
                label={t("builder.certName")}
                field="certificationTitle"
                className="md:col-span-2"
              >
                <input
                  value={cert.name}
                  onChange={(e) => updateCertification(cert.id, "name", e.target.value)}
                  placeholder={t("builder.certName")}
                  className="w-full rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>
              <BuilderField label={t("builder.certIssuer")} field="certificationSubtitle">
                <input
                  value={cert.issuer}
                  onChange={(e) => updateCertification(cert.id, "issuer", e.target.value)}
                  placeholder={t("builder.certIssuer")}
                  className="w-full rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>
              <BuilderField label={t("builder.certDate")} field="certificationMeta">
                <input
                  value={cert.date}
                  onChange={(e) => updateCertification(cert.id, "date", e.target.value)}
                  placeholder={t("builder.certDate")}
                  className="w-full rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>
              <BuilderField label={t("builder.certUrl")} className="md:col-span-2">
                <input
                  value={cert.url}
                  onChange={(e) => updateCertification(cert.id, "url", e.target.value)}
                  placeholder={t("builder.certUrl")}
                  className="w-full rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>
            </div>
            <button
              onClick={() => removeCertification(cert.id)}
              className="p-1.5 ml-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addCertification}
        className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <Plus size={14} />
        {t("builder.addCertification")}
      </button>
    </div>
  );
}

function ProjectsSection() {
  const { t } = useTranslation();
  const { resume, addProject, updateProject, removeProject } = useBuilderStore();

  return (
    <div className="flex flex-col gap-4">
      {resume.projects.map((proj) => (
        <div key={proj.id} className="p-3 rounded-lg bg-secondary/20 border border-border">
          <div className="flex items-start justify-between">
            <div className="grid flex-1 gap-3 md:grid-cols-2">
              <BuilderField
                label={t("builder.projectName")}
                field="projectTitle"
                className="md:col-span-2"
              >
                <input
                  value={proj.name}
                  onChange={(e) => updateProject(proj.id, "name", e.target.value)}
                  placeholder={t("builder.projectName")}
                  className="w-full rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>
              <BuilderField
                label={t("builder.projectDescription")}
                field="projectDescription"
                className="md:col-span-2"
              >
                <textarea
                  value={proj.description}
                  onChange={(e) => updateProject(proj.id, "description", e.target.value)}
                  placeholder={t("builder.projectDescription")}
                  rows={2}
                  className="w-full resize-none rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>
              <BuilderField label={t("builder.projectTech")} field="projectSubtitle">
                <input
                  value={proj.technologies}
                  onChange={(e) => updateProject(proj.id, "technologies", e.target.value)}
                  placeholder={t("builder.projectTech")}
                  className="w-full rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>
              <BuilderField label={t("builder.projectUrl")}>
                <input
                  value={proj.url}
                  onChange={(e) => updateProject(proj.id, "url", e.target.value)}
                  placeholder={t("builder.projectUrl")}
                  className="w-full rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>
            </div>
            <button
              onClick={() => removeProject(proj.id)}
              className="p-1.5 ml-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addProject}
        className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <Plus size={14} />
        {t("builder.addProject")}
      </button>
    </div>
  );
}

function VolunteerSection() {
  const { t } = useTranslation();
  const { resume, addVolunteer, updateVolunteer, removeVolunteer } = useBuilderStore();

  return (
    <div className="flex flex-col gap-4">
      {resume.volunteer.map((vol) => (
        <div key={vol.id} className="p-3 rounded-lg bg-secondary/20 border border-border">
          <div className="flex items-start justify-between">
            <div className="grid flex-1 gap-3 md:grid-cols-2">
              <BuilderField label={t("builder.volunteerRole")} field="volunteerTitle">
                <input
                  value={vol.role}
                  onChange={(e) => updateVolunteer(vol.id, "role", e.target.value)}
                  placeholder={t("builder.volunteerRole")}
                  className="w-full rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>
              <BuilderField label={t("builder.volunteerOrg")} field="volunteerSubtitle">
                <input
                  value={vol.organization}
                  onChange={(e) => updateVolunteer(vol.id, "organization", e.target.value)}
                  placeholder={t("builder.volunteerOrg")}
                  className="w-full rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>
              <BuilderField
                label={t("builder.layoutField.volunteerMeta", "Date line")}
                field="volunteerMeta"
                className="md:col-span-2"
              >
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={vol.startDate}
                    onChange={(e) => updateVolunteer(vol.id, "startDate", e.target.value)}
                    placeholder={t("builder.startDate")}
                    className="w-full rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                  />
                  <input
                    value={vol.endDate}
                    onChange={(e) => updateVolunteer(vol.id, "endDate", e.target.value)}
                    placeholder={t("builder.endDate")}
                    className="w-full rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                  />
                </div>
              </BuilderField>
              <BuilderField
                label={t("builder.volunteerDescription")}
                field="volunteerDescription"
                className="md:col-span-2"
              >
                <textarea
                  value={vol.description}
                  onChange={(e) => updateVolunteer(vol.id, "description", e.target.value)}
                  placeholder={t("builder.volunteerDescription")}
                  rows={2}
                  className="w-full resize-none rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </BuilderField>
            </div>
            <button
              onClick={() => removeVolunteer(vol.id)}
              className="p-1.5 ml-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addVolunteer}
        className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <Plus size={14} />
        {t("builder.addVolunteer")}
      </button>
    </div>
  );
}

function CustomSection({ sectionId }: { sectionId: string }) {
  const { t } = useTranslation();
  const { resume, addCustomEntry, updateCustomEntry, removeCustomEntry } = useBuilderStore();
  const entries = resume.customSections[sectionId] ?? [];

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-2">
          <div className="flex-1 flex flex-col gap-1.5">
            <BuilderField label={t("builder.entryTitle")} field="customTitle">
              <input
                value={entry.title}
                onChange={(e) => updateCustomEntry(sectionId, entry.id, "title", e.target.value)}
                placeholder={t("builder.entryTitle")}
                className="w-full rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
              />
            </BuilderField>
            <BuilderField label={t("builder.entryDescription")} field="customDescription">
              <textarea
                value={entry.description}
                onChange={(e) =>
                  updateCustomEntry(sectionId, entry.id, "description", e.target.value)
                }
                placeholder={t("builder.entryDescription")}
                rows={2}
                className="w-full resize-none rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
              />
            </BuilderField>
          </div>
          <button
            onClick={() => removeCustomEntry(sectionId, entry.id)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 mt-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button
        onClick={() => addCustomEntry(sectionId)}
        className="flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <Plus size={14} />
        {t("builder.addEntry")}
      </button>
    </div>
  );
}
