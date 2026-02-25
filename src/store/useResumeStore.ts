import { create } from "zustand";

export interface AnalysisResult {
  matchScore: number;
  foundKeywords: string[];
  missingKeywords: string[];
  totalKeywords: number;
}

export interface ReadabilityResult {
  score: number;
  wordCount: number;
  sectionsFound: string[];
  sectionsMissing: string[];
  warnings: string[];
  positives: string[];
}

export interface VerbIssue {
  weakVerb: string;
  line: number;
  suggestions: string[];
}

export interface VerbLintResult {
  issues: VerbIssue[];
  totalIssues: number;
}

export type JobInputMode = "text" | "url";

interface ResumeState {
  // Resume data
  resumeText: string;
  resumeFileName: string | null;

  // Job description
  jobDescription: string;
  jobInputMode: JobInputMode;
  jobUrl: string;
  isFetchingUrl: boolean;
  urlError: string | null;

  // Readability
  readabilityResult: ReadabilityResult | null;

  // Analysis
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  isExtracting: boolean;

  // Verb linter
  verbLintResult: VerbLintResult | null;

  // Actions
  setResumeText: (text: string) => void;
  setResumeFileName: (name: string | null) => void;
  setJobDescription: (text: string) => void;
  setJobInputMode: (mode: JobInputMode) => void;
  setJobUrl: (url: string) => void;
  setIsFetchingUrl: (value: boolean) => void;
  setUrlError: (error: string | null) => void;
  setReadabilityResult: (result: ReadabilityResult | null) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setIsAnalyzing: (value: boolean) => void;
  setIsExtracting: (value: boolean) => void;
  setVerbLintResult: (result: VerbLintResult | null) => void;
  clearResume: () => void;
  clearAll: () => void;
}

export const useResumeStore = create<ResumeState>((set) => ({
  resumeText: "",
  resumeFileName: null,
  jobDescription: "",
  jobInputMode: "text",
  jobUrl: "",
  isFetchingUrl: false,
  urlError: null,
  readabilityResult: null,
  analysisResult: null,
  isAnalyzing: false,
  isExtracting: false,
  verbLintResult: null,

  setResumeText: (text) => set({ resumeText: text }),
  setResumeFileName: (name) => set({ resumeFileName: name }),
  setJobDescription: (text) => set({ jobDescription: text }),
  setJobInputMode: (mode) => set({ jobInputMode: mode }),
  setJobUrl: (url) => set({ jobUrl: url }),
  setIsFetchingUrl: (value) => set({ isFetchingUrl: value }),
  setUrlError: (error) => set({ urlError: error }),
  setReadabilityResult: (result) => set({ readabilityResult: result }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setIsAnalyzing: (value) => set({ isAnalyzing: value }),
  setIsExtracting: (value) => set({ isExtracting: value }),
  setVerbLintResult: (result) => set({ verbLintResult: result }),
  clearResume: () =>
    set({
      resumeText: "",
      resumeFileName: null,
      analysisResult: null,
      readabilityResult: null,
      verbLintResult: null,
    }),
  clearAll: () =>
    set({
      resumeText: "",
      resumeFileName: null,
      jobDescription: "",
      jobUrl: "",
      analysisResult: null,
      readabilityResult: null,
      verbLintResult: null,
    }),
}));
