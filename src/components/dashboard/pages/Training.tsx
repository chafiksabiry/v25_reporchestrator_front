import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  Briefcase,
  Clock3,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Award,
  X
} from 'lucide-react';
import { getAgentId, getAuthToken } from '../../../utils/authUtils';
import { useRepTrainingNav } from '../../../contexts/RepTrainingNavContext';
import {
  getModuleColorStyles,
  getViewerThemeTokens,
  resolveRepViewerTheme,
} from '../../../utils/trainingViewerTheme';

type JourneyRow = Record<string, unknown> & { __gigTitle?: string; __gigId?: string };
type ModuleRow = { _id?: string; id?: string; title?: string; sections?: unknown[]; quizzes?: unknown[] };
type SlideRow = { title?: string; subtitle?: string; content?: string; bullets?: string[] };
type RepProgressRow = {
  journeyId?: string;
  moduleTotal?: number;
  moduleFinished?: number;
  moduleInProgress?: number;
  /** Moyenne des % modules côté suivi structuré (rep_training_tracking.progressPercentage). */
  progressPercentage?: number;
  engagementScore?: number;
  /** Index 0-based du viewer formation (persisté `slideIndex` côté API trainings-progress). */
  currentSlideIndex?: number;
  lastAccessed?: string;
  currentModuleId?: string;
  currentQuizPageBySlide?: Record<string, number>;
  /** Objet moduleId → état (sectionProgress, quizProgress, …) depuis rep_progress */
  modules?: Record<string, Record<string, unknown>>;
};

type StructuredModuleProgress = {
  moduleId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'locked';
  progressPercentage: number;
};

type StructuredProgressRow = {
  repId: string;
  courseId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'locked';
  progressPercentage: number;
  modules: StructuredModuleProgress[];
};

/** Aligné sur GET /training_journeys/rep/:repId/progress-summary */
type RepSlideProgressSummary = {
  trainingCount: number;
  journeys: {
    journeyId: string;
    journeyTitle: string;
    completedUnits?: number;
    totalUnits?: number;
    followedDurationMs?: number;
    completedModules?: number;
    totalModules?: number;
    completedSections?: number;
    totalSections?: number;
    completedQuizzes?: number;
    totalQuizzes?: number;
    slidesSeen: number;
    slidesTotal: number;
    ratio: number;
    /** Index 0-based pour reprendre au « Continue » (aligné backend) */
    currentSlideIndex: number;
  }[];
  sumOfRatios: number;
  averageRatio: number;
  overallPercent: number;
  formulaHuman: string;
};

type ViewerSlide =
  | {
      key: string;
      kind: 'overview';
      modules: Array<{ title: string; moduleIndex: number; sections: Array<{ title: string; sectionIndex: number }> }>;
    }
  | { key: string; kind: 'module_intro'; moduleIndex: number; totalModules: number; mod: any }
  | {
      key: string;
      kind: 'section';
      moduleIndex: number;
      sectionIndex: number;
      totalModules: number;
      section: any;
      modTitle: string;
    }
  | {
      key: string;
      kind: 'quiz_group';
      moduleIndex: number;
      totalModules: number;
      questions: Array<{
        quizTitle: string;
        quizKey: string;
        quizId?: string;
        /** Plafond de soumissions complètes (journey `maxAttempts`, défaut 3). */
        maxAttempts?: number;
        question: any;
        correctAnswer: number;
      }>;
    };

type ModulePlanItem = { durationMinutes?: unknown };

function trainingApiBase(): string {
  const raw =
    import.meta.env.VITE_TRAINING_API_URL ||
    import.meta.env.VITE_TRAINING_BACKEND_URL ||
    '';
  return String(raw).replace(/\/$/, '');
}

function normalizeStructuredProgress(raw: any): StructuredProgressRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const modules = Array.isArray(raw.modules)
    ? raw.modules.map((m: any) => ({
        moduleId: normalizeMongoId(m?.moduleId),
        status: String(m?.status || 'pending') as StructuredModuleProgress['status'],
        progressPercentage: Number(m?.progressPercentage || 0),
      }))
    : [];
  return {
    repId: normalizeMongoId(raw.repId),
    courseId: normalizeMongoId(raw.courseId),
    status: String(raw.status || 'pending') as StructuredProgressRow['status'],
    progressPercentage: Number(raw.progressPercentage || 0),
    modules,
  };
}

function journeyTitle(j: Record<string, unknown>): string {
  return String(j.title || j.name || 'Training').trim();
}

function gigLabel(j: JourneyRow): string | null {
  if (j.__gigTitle) return String(j.__gigTitle);
  const g = j.gigId;
  if (g == null) return null;
  if (typeof g === 'object' && g !== null && 'title' in g) {
    return String((g as { title?: string }).title || '').trim() || null;
  }
  const s = String(g);
  return s.length > 10 ? `${s.slice(0, 10)}…` : s;
}

function journeyKey(j: Record<string, unknown>): string {
  return String(j._id || j.id || '').trim();
}

function extractModules(j: JourneyRow): ModuleRow[] {
  const raw = (j.modules || []) as unknown[];
  return Array.isArray(raw) ? (raw as ModuleRow[]) : [];
}

function extractSlides(j: JourneyRow): SlideRow[] {
  const p = (j.presentation || {}) as Record<string, unknown>;
  const slides = p.slides;
  if (!Array.isArray(slides)) return [];
  return slides as SlideRow[];
}

function extractModuleDurationsMinutes(j: JourneyRow): number[] {
  const planRaw = Array.isArray(j.modulePlan) ? (j.modulePlan as ModulePlanItem[]) : [];
  const fromPlan = planRaw
    .map((m) => Number(m?.durationMinutes))
    .map((n) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0));
  if (fromPlan.some((n) => n > 0)) return fromPlan;

  const modules = extractModules(j);
  return modules.map((m: any) => {
    const n = Number(m?.duration);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  });
}

function formatDurationHMS(ms: number): string {
  const safe = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function mergeJourney(
  map: Map<string, JourneyRow>,
  j: Record<string, unknown>,
  gigTitle?: string,
  gigId?: string
) {
  const id = journeyKey(j);
  if (!id) return;
  const prev = map.get(id);
  if (prev) {
    if (gigTitle && !prev.__gigTitle) prev.__gigTitle = gigTitle;
    if (gigId && !prev.__gigId) prev.__gigId = gigId;
    return;
  }
  const row: JourneyRow = { ...j };
  if (gigTitle) row.__gigTitle = gigTitle;
  if (gigId) row.__gigId = gigId;
  map.set(id, row);
}

function dedupeAndSort(rows: JourneyRow[]): JourneyRow[] {
  const m = new Map<string, JourneyRow>();
  for (const j of rows) {
    const k = journeyKey(j);
    if (k && !m.has(k)) m.set(k, j);
  }
  return Array.from(m.values()).sort((a, b) => journeyTitle(a).localeCompare(journeyTitle(b), 'en'));
}

/** Matching API may return Mongo extended JSON `{ $oid }` instead of a plain string. */
function normalizeMongoId(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && raw !== null && '$oid' in raw) {
    return String((raw as { $oid: string }).$oid || '').trim();
  }
  if (typeof raw === 'object' && raw !== null && '_id' in raw) {
    return normalizeMongoId((raw as { _id: unknown })._id);
  }
  return String(raw).trim();
}

function deriveCompletedSectionsMapFromProgressRow(
  row: RepProgressRow | undefined
): Record<string, string[]> {
  if (!row?.modules || typeof row.modules !== 'object') return {};
  const out: Record<string, string[]> = {};
  for (const [moduleId, mpRaw] of Object.entries(row.modules)) {
    const keys = new Set<string>();
    const mp = mpRaw as Record<string, unknown>;
    const completed = mp.completedSections;
    if (Array.isArray(completed)) {
      for (const x of completed) {
        const oid = normalizeMongoId(x);
        if (oid && /^[a-f\d]{24}$/i.test(oid)) keys.add(oid);
        else if (x != null && String(x).trim()) keys.add(String(x).trim());
      }
    }
    const sp = mp.sectionProgress;
    if (Array.isArray(sp)) {
      for (const item of sp) {
        if (item && typeof item === 'object' && String((item as { status?: unknown }).status) === 'completed') {
          const sid = normalizeMongoId((item as { sectionId?: unknown }).sectionId);
          if (sid && /^[a-f\d]{24}$/i.test(sid)) keys.add(sid);
          const legacy = String((item as { sectionKey?: unknown }).sectionKey || '').trim();
          if (legacy && /^[a-f\d]{24}$/i.test(legacy)) keys.add(legacy);
          else if (legacy) keys.add(legacy);
        }
      }
    }
    out[moduleId] = [...keys];
  }
  return out;
}

/** Id Mongo d’une slide (tracking) ; vide si absent (l’API utilisera slideIndex). */
function slideStableId(slide: unknown): string {
  if (!slide || typeof slide !== 'object') return '';
  const r = slide as Record<string, unknown>;
  const a = normalizeMongoId(r._id);
  if (a) return a;
  const b = normalizeMongoId(r.slideId);
  if (b) return b;
  const id = r.id;
  if (typeof id === 'string' && /^[a-f\d]{24}$/i.test(id.trim())) return id.trim();
  return '';
}

function clampTrainingSlideIndex(index: number, slideCount: number): number {
  if (slideCount <= 0) return 0;
  const i = Math.round(Number(index));
  if (!Number.isFinite(i)) return 0;
  return Math.min(slideCount - 1, Math.max(0, i));
}

/** Reprend la slide du viewer : `currentSlideIndex` (rep-progress / summary), jamais `completedUnits` (autre échelle). */
function initialSlideForContinue(
  slideCount: number,
  slideRow:
    | {
        currentSlideIndex?: number;
        slidesSeen?: number;
        slidesTotal?: number;
        completedUnits?: number;
        totalUnits?: number;
      }
    | undefined,
  engagementPercent: number
): number {
  if (slideCount <= 0) return 0;
  if (
    slideRow != null &&
    typeof slideRow.currentSlideIndex === 'number' &&
    Number.isFinite(slideRow.currentSlideIndex)
  ) {
    return clampTrainingSlideIndex(slideRow.currentSlideIndex, slideCount);
  }
  const eng = Math.min(100, Math.max(0, engagementPercent));
  const approx = Math.round((eng / 100) * slideCount);
  return clampTrainingSlideIndex(approx, slideCount);
}

function viewerSlideCountFromJourney(journey: JourneyRow): number {
  const modules = extractModules(journey);
  if (modules.length <= 0) return 0;
  let count = 1; // overview
  modules.forEach((mod) => {
    count += 1; // module intro
    const sections = Array.isArray(mod?.sections) ? mod.sections.length : 0;
    count += sections;
    const quizzes = Array.isArray(mod?.quizzes) ? mod.quizzes : [];
    const hasQuestions = quizzes.some(
      (qz: any) => Array.isArray(qz?.questions) && qz.questions.length > 0
    );
    if (hasQuestions) count += 1; // quiz_group
  });
  return count;
}

function readQuizMaxAttemptsFromJourneyDoc(qz: unknown): number {
  const q = qz as Record<string, unknown> | null;
  if (!q) return 3;
  const raw = Number(q.maxAttempts ?? q.max_attempts ?? q.attemptLimit ?? q.attemptsAllowed);
  if (Number.isFinite(raw) && raw >= 1) return Math.min(100, Math.floor(raw));
  return 3;
}

function maxQuizAttemptsForFormationSlide(slide: { questions: Array<{ maxAttempts?: number }> }): number {
  return Math.max(1, ...slide.questions.map((q) => Number(q.maxAttempts) || 3));
}

function journeyModuleHasFormationQuizSlot(mod: ModuleRow): boolean {
  const quizzes = Array.isArray(mod?.quizzes) ? mod.quizzes : [];
  return quizzes.some((qz: any) => Array.isArray(qz?.questions) && qz.questions.length > 0);
}

function formationViewerLinearIndexForSection(modules: ModuleRow[], mi: number, si: number): number {
  let idx = 1;
  for (let m = 0; m < mi; m++) {
    const mod = modules[m];
    const secLen = Array.isArray(mod?.sections) ? mod.sections.length : 0;
    idx += 1 + secLen + (journeyModuleHasFormationQuizSlot(mod) ? 1 : 0);
  }
  return idx + 1 + si;
}

function formationViewerLinearIndexForQuiz(modules: ModuleRow[], mi: number): number {
  let idx = 1;
  for (let m = 0; m < mi; m++) {
    const mod = modules[m];
    const secLen = Array.isArray(mod?.sections) ? mod.sections.length : 0;
    idx += 1 + secLen + (journeyModuleHasFormationQuizSlot(mod) ? 1 : 0);
  }
  const mod = modules[mi];
  const secLen = Array.isArray(mod?.sections) ? mod.sections.length : 0;
  return idx + 1 + secLen;
}

function sectionIsCompletedFromProgress(
  sec: unknown,
  si: number,
  mp: Record<string, unknown> | undefined
): boolean {
  if (!mp) return false;
  const s = sec as { _id?: unknown; id?: unknown } | null;
  const sid = normalizeMongoId(s?._id) || normalizeMongoId(s?.id);
  const sp = mp.sectionProgress as Array<{ sectionId?: unknown; status?: unknown }> | undefined;
  if (Array.isArray(sp)) {
    const row = sp.find((x) => normalizeMongoId(x?.sectionId) === sid) ?? sp[si];
    if (row && String((row as { status?: unknown }).status) === 'completed') return true;
  }
  const cs = mp.completedSections;
  if (Array.isArray(cs) && sid) {
    if (cs.some((x) => normalizeMongoId(x) === sid)) return true;
  }
  return false;
}

type RepModuleProgressStatus = 'locked' | 'completed' | 'in_progress' | 'pending';

function getStructuredModuleStatusForRep(
  moduleId: string,
  moduleIndex: number,
  structured: StructuredProgressRow | undefined,
  row: RepProgressRow | undefined
): RepModuleProgressStatus {
  const fromList = structured?.modules?.find((m) => m.moduleId === moduleId);
  if (fromList?.status) return fromList.status as RepModuleProgressStatus;
  const mp = row?.modules?.[moduleId] as Record<string, unknown> | undefined;
  const st = mp && typeof mp.status === 'string' ? String(mp.status) : '';
  if (st === 'locked' || st === 'completed' || st === 'in_progress' || st === 'pending') {
    return st as RepModuleProgressStatus;
  }
  if (moduleIndex === 0) return 'in_progress';
  return 'locked';
}

function getOverviewCurrentModuleIndex(
  journey: JourneyRow,
  structured: StructuredProgressRow | undefined,
  row: RepProgressRow | undefined
): { currentMi: number; allModulesCompleted: boolean } {
  const modules = extractModules(journey);
  if (modules.length === 0) return { currentMi: 0, allModulesCompleted: true };
  let allDone = true;
  for (let mi = 0; mi < modules.length; mi++) {
    const mid =
      normalizeMongoId((modules[mi] as any)?._id) || normalizeMongoId((modules[mi] as any)?.id) || '';
    const st = getStructuredModuleStatusForRep(mid, mi, structured, row);
    if (st !== 'completed') allDone = false;
  }
  if (allDone) {
    return { currentMi: Math.max(0, modules.length - 1), allModulesCompleted: true };
  }
  for (let mi = 0; mi < modules.length; mi++) {
    const mid =
      normalizeMongoId((modules[mi] as any)?._id) || normalizeMongoId((modules[mi] as any)?.id) || '';
    const st = getStructuredModuleStatusForRep(mid, mi, structured, row);
    if (st === 'locked') continue;
    if (st !== 'completed') return { currentMi: mi, allModulesCompleted: false };
  }
  return { currentMi: Math.max(0, modules.length - 1), allModulesCompleted: false };
}

/** Carte module vue d’ensemble : verrouillée côté API ou module « après » le parcours courant. */
function isOverviewModuleCardLocked(
  moduleIndex: number,
  journey: JourneyRow,
  structured: StructuredProgressRow | undefined,
  row: RepProgressRow | undefined
): boolean {
  const modules = extractModules(journey);
  const mod = modules[moduleIndex];
  if (!mod) return true;
  const mid =
    normalizeMongoId((mod as any)?._id) || normalizeMongoId((mod as any)?.id) || '';
  const st = getStructuredModuleStatusForRep(mid, moduleIndex, structured, row);
  if (st === 'locked') return true;
  const { currentMi, allModulesCompleted } = getOverviewCurrentModuleIndex(journey, structured, row);
  if (allModulesCompleted) return false;
  return moduleIndex > currentMi;
}

/** Index de la première section non terminée ; `sections.length` si tout est fait. */
function firstIncompleteSectionIndexForModule(
  moduleIndex: number,
  journey: JourneyRow,
  row: RepProgressRow | undefined
): number {
  const modules = extractModules(journey);
  const mod = modules[moduleIndex];
  if (!mod) return 0;
  const mid =
    normalizeMongoId((mod as any)?._id) || normalizeMongoId((mod as any)?.id) || '';
  const mp =
    row?.modules && typeof row.modules === 'object'
      ? ((row.modules as Record<string, unknown>)[mid] as Record<string, unknown> | undefined)
      : undefined;
  const sections = Array.isArray(mod.sections) ? mod.sections : [];
  for (let si = 0; si < sections.length; si++) {
    if (!sectionIsCompletedFromProgress(sections[si], si, mp)) return si;
  }
  return sections.length;
}

/** Intro module : sections strictement après la prochaine à faire (ou tout terminé → quiz via Suivant). */
function isModuleIntroSectionNavigationLocked(
  moduleIndex: number,
  sectionIndex: number,
  journey: JourneyRow,
  structured: StructuredProgressRow | undefined,
  row: RepProgressRow | undefined
): boolean {
  const modules = extractModules(journey);
  const mod = modules[moduleIndex];
  if (!mod) return true;
  const mid =
    normalizeMongoId((mod as any)?._id) || normalizeMongoId((mod as any)?.id) || '';
  const modSt = getStructuredModuleStatusForRep(mid, moduleIndex, structured, row);
  if (modSt === 'locked') return true;
  if (!row?.modules || typeof row.modules !== 'object') return false;
  const firstInc = firstIncompleteSectionIndexForModule(moduleIndex, journey, row);
  const sections = Array.isArray(mod.sections) ? mod.sections : [];
  if (firstInc >= sections.length) return true;
  return sectionIndex > firstInc;
}

function quizIsPassedFromProgress(qz: unknown, _qi: number, mp: Record<string, unknown> | undefined): boolean {
  if (!mp) return false;
  const q = qz as { _id?: unknown; id?: unknown; title?: unknown };
  const qid = normalizeMongoId(q?._id) || normalizeMongoId(q?.id);
  const title = String(q?.title || '').trim();
  const qp = mp.quizProgress as Array<{ quizKey?: unknown; status?: unknown; passed?: boolean }> | undefined;
  if (Array.isArray(qp)) {
    for (const row of qp) {
      const key = normalizeMongoId(row?.quizKey);
      if (qid && key === qid && (row.passed || String(row?.status) === 'passed' || String(row?.status) === 'completed'))
        return true;
      if (!qid && title && String(row?.quizKey || '').includes(title)) return !!(row.passed || String(row?.status) === 'passed');
    }
  }
  const qs = mp.quizScores as Array<{ quizId?: unknown; passed?: boolean }> | undefined;
  if (Array.isArray(qs) && qs.some((x) => normalizeMongoId(x?.quizId) === qid && x?.passed)) return true;
  return false;
}

function hasStructuredResumeMergeEvidence(row: RepProgressRow | undefined): boolean {
  if (!row?.modules || typeof row.modules !== 'object') return false;
  for (const mp of Object.values(row.modules)) {
    const p = mp as Record<string, unknown>;
    if (String(p.status || '') === 'in_progress' || String(p.status || '') === 'completed') return true;
    const cs = p.completedSections;
    if (Array.isArray(cs) && cs.length > 0) return true;
    const sp = p.sectionProgress;
    if (Array.isArray(sp)) {
      for (const it of sp) {
        const st = String((it as { status?: unknown }).status || '');
        if (st === 'completed' || st === 'in_progress') return true;
      }
    }
    const qp = p.quizProgress;
    if (Array.isArray(qp)) {
      for (const it of qp) {
        const st = String((it as { status?: unknown }).status || '');
        if (st && st !== 'pending') return true;
      }
    }
  }
  return false;
}

/** Première slide du viewer formation non terminée d’après `trainings-progress` (sections/quiz), aligné backend. */
function formationResumeSlideIndexFromRepRow(
  journey: JourneyRow,
  row: RepProgressRow | undefined
): number | null {
  const modules = extractModules(journey);
  if (modules.length === 0 || !row?.modules || typeof row.modules !== 'object') return null;
  const modsObj = row.modules as Record<string, Record<string, unknown>>;
  for (let mi = 0; mi < modules.length; mi++) {
    const mod = modules[mi] as ModuleRow;
    const mid = normalizeMongoId((mod as any)?._id) || normalizeMongoId((mod as any)?.id);
    const mp = mid ? modsObj[mid] : undefined;
    const modStatus = String(mp?.status || 'pending');
    if (modStatus === 'locked') continue;
    const sections = Array.isArray(mod.sections) ? mod.sections : [];
    for (let si = 0; si < sections.length; si++) {
      if (!sectionIsCompletedFromProgress(sections[si], si, mp)) {
        return formationViewerLinearIndexForSection(modules, mi, si);
      }
    }
    if (journeyModuleHasFormationQuizSlot(mod)) {
      const quizzes = Array.isArray(mod.quizzes) ? mod.quizzes : [];
      let qxi = 0;
      for (const qz of quizzes) {
        const questions = Array.isArray((qz as any)?.questions) ? (qz as any).questions : [];
        if (questions.length === 0) continue;
        if (!quizIsPassedFromProgress(qz, qxi, mp)) {
          return formationViewerLinearIndexForQuiz(modules, mi);
        }
        qxi += 1;
      }
    }
    if (modStatus === 'completed') continue;
  }
  return null;
}

function mergeFormationResumeWithPersisted(
  journey: JourneyRow,
  row: RepProgressRow | undefined,
  slideCount: number,
  persisted: number | undefined,
  engagementPercent: number
): number {
  if (slideCount <= 0) return 0;
  const p = Number(persisted);
  const baseFromPersist =
    Number.isFinite(p) && p >= 0 ? clampTrainingSlideIndex(Math.floor(p), slideCount) : null;
  const structured = formationResumeSlideIndexFromRepRow(journey, row);
  let base = baseFromPersist ?? 0;
  if (
    structured != null &&
    hasStructuredResumeMergeEvidence(row) &&
    structured > base
  ) {
    base = structured;
  }
  if (baseFromPersist == null && !(structured != null && hasStructuredResumeMergeEvidence(row))) {
    return initialSlideForContinue(slideCount, undefined, engagementPercent);
  }
  return clampTrainingSlideIndex(base, slideCount);
}

async function fetchEnrolledGigsForAgent(
  agentId: string,
  token: string
): Promise<{ gigId: string; title: string }[]> {
  const base = String(import.meta.env.VITE_MATCHING_API_URL || '').replace(/\/$/, '');
  if (!base) return [];

  console.log('[Training] fetchEnrolledGigsForAgent:start', { agentId, base });
  const res = await fetch(
    `${base}/gig-agents/agents/${encodeURIComponent(agentId)}/gigs?status=enrolled`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    console.warn('[Training] fetchEnrolledGigsForAgent:non-ok', {
      status: res.status,
      statusText: res.statusText
    });
    return [];
  }
  const data = (await res.json()) as { gigs?: unknown[] };
  const gigs = Array.isArray(data.gigs) ? data.gigs : [];
  const out: { gigId: string; title: string }[] = [];
  for (const item of gigs) {
    const g = item as { gig?: { _id?: unknown; title?: string } };
    const gigId = normalizeMongoId(g.gig?._id);
    if (gigId) {
      out.push({
        gigId,
        title: String(g.gig?.title || 'Gig').trim() || 'Gig',
      });
    }
  }
  console.log('[Training] fetchEnrolledGigsForAgent:done', {
    count: out.length,
    gigs: out.map((g) => ({ gigId: g.gigId, title: g.title }))
  });
  return out;
}

export function Training() {
  const location = useLocation();
  const navigate = useNavigate();
  const repId = getAgentId();
  const { setTrainingNav, clearTrainingNav } = useRepTrainingNav();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [enrolledGigs, setEnrolledGigs] = useState<{ gigId: string; title: string }[]>([]);
  const [gigFilter, setGigFilter] = useState<string>('__all__');
  const [routeGigApplied, setRouteGigApplied] = useState(false);
  /** Trainings returned by GET /training_journeys/gig/:id when a single gig is selected */
  const [gigFetchedJourneys, setGigFetchedJourneys] = useState<JourneyRow[]>([]);
  const [gigFetchLoading, setGigFetchLoading] = useState(false);
  /** Last completed per-gig fetch so empty-state copy matches reality (200 + [] vs 404 vs network). */
  const [gigFetchOutcome, setGigFetchOutcome] = useState<{
    gigId: string;
    kind: 'ok' | 'not_found' | 'error';
  } | null>(null);

  const routeGigId = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return String(p.get('gigId') || '').trim();
  }, [location.search]);

  useEffect(() => {
    setRouteGigApplied(false);
  }, [routeGigId]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [formationViewerSlideIndex, setFormationViewerSlideIndex] = useState(0);
  /** Onglet actif de la page : formations en cours / certifications obtenues. */
  const [trainingTab, setTrainingTab] = useState<'trainings' | 'certifications'>('trainings');
  type QuizQuestionState = {
    selected: number | null;
    revealed: boolean;
    locked: boolean;
    /** Temps écoulé sans réponse (compte comme une erreur). */
    timedOut?: boolean;
  };
  const [formationViewerQuizState, setFormationViewerQuizState] = useState<Record<string, QuizQuestionState>>({});
  const [formationViewerQuizPage, setFormationViewerQuizPage] = useState<Record<string, number>>({});
  /** Fautes cumulées sur tout le bloc quiz du slide (pas par question). Max 3 affichées. */
  const [quizSlideWrongStrikes, setQuizSlideWrongStrikes] = useState<Record<string, number>>({});
  const [quizQuestionCountdownSec, setQuizQuestionCountdownSec] = useState<Record<string, number>>({});
  const quizTimerSlideRef = useRef<{ qk: string } | null>(null);
  const [progressByJourney, setProgressByJourney] = useState<Record<string, RepProgressRow>>({});
  const [slideProgressSummary, setSlideProgressSummary] = useState<RepSlideProgressSummary | null>(null);
  const [structuredProgressByJourney, setStructuredProgressByJourney] = useState<Record<string, StructuredProgressRow>>({});
  const [completedSectionsByJourney, setCompletedSectionsByJourney] = useState<
    Record<string, Record<string, string[]>>
  >({});
  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);
  const [sessionManualDurationMs, setSessionManualDurationMs] = useState(0);
  const [moduleElapsedMs, setModuleElapsedMs] = useState(0);
  const [moduleManualDurationMs, setModuleManualDurationMs] = useState(0);
  const progressSyncInFlightRef = useRef<Set<string>>(new Set());
  /** POST /section/start déjà envoyé pour cette clé (même parcours). */
  const sectionStartSentRef = useRef<Set<string>>(new Set());
  /** Promesses /section/start en cours — le complete attend leur résolution. */
  const sectionStartPromiseRef = useRef<Map<string, Promise<void>>>(new Map());
  /** POST /section/complete déjà envoyé (évite doublons au « Suivant »). */
  const sectionCompleteSentRef = useRef<Set<string>>(new Set());
  /** Index précédent du viewer formation — pour détecter navigation avant → suivant. */
  const prevFormationSlideIndexRef = useRef<number | null>(null);
  const quizOutcomeSentRef = useRef<Set<string>>(new Set());
  /** POST /quiz/start déjà réussi pour cette clé (réinitialisé en quittant le slide quiz). */
  const quizStartSentRef = useRef<Set<string>>(new Set());

  const displayJourneys = useMemo(() => {
    if (gigFilter === '__all__') return journeys;
    const fromGlobal = journeys.filter((j) => String(j.__gigId || '') === gigFilter);
    return dedupeAndSort([...gigFetchedJourneys, ...fromGlobal]);
  }, [journeys, gigFilter, gigFetchedJourneys]);

  const listLoading = loading || (gigFilter !== '__all__' && gigFetchLoading);

  useEffect(() => {
    const base = trainingApiBase();
    const token = getAuthToken() || '';

    if (!repId) {
      setError('Rep profile not found. Please sign in again.');
      setLoading(false);
      return;
    }
    if (!base) {
      setError(
        'Missing VITE_TRAINING_API_URL or VITE_TRAINING_BACKEND_URL (training API base URL, no trailing slash).'
      );
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const byId = new Map<string, JourneyRow>();

        let enrolled: { gigId: string; title: string }[] = [];
        if (token) {
          enrolled = await fetchEnrolledGigsForAgent(repId, token);
          if (!cancelled) setEnrolledGigs(enrolled);
        } else if (!cancelled) {
          setEnrolledGigs([]);
        }

        try {
          const repRes = await axios.get<unknown[]>(
            `${base}/training_journeys/rep/${encodeURIComponent(repId)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
          );
          const repList = Array.isArray(repRes.data) ? repRes.data : [];
          repList.forEach((j) => mergeJourney(byId, j as Record<string, unknown>));
        } catch {
          /* optional */
        }

        if (token && enrolled.length > 0) {
          await Promise.all(
            enrolled.map(async ({ gigId, title }) => {
              try {
                console.log('[Training] fetchByGig:start', { gigId, title });
                const r = await axios.get<{ success?: boolean; data?: unknown[] }>(
                  `${base}/training_journeys/gig/${encodeURIComponent(gigId)}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                    validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
                  }
                );
                console.log('[Training] fetchByGig:response', {
                  gigId,
                  status: r.status,
                  count: Array.isArray(r.data?.data) ? r.data.data.length : 0
                });
                if (r.status === 404) return;
                const arr = Array.isArray(r.data?.data) ? r.data.data : [];
                arr.forEach((j) =>
                  mergeJourney(byId, j as Record<string, unknown>, title, gigId)
                );
              } catch {
                console.warn('[Training] fetchByGig:error', { gigId });
              }
            })
          );
        }

        const merged = Array.from(byId.values()).sort((a, b) =>
          journeyTitle(a).localeCompare(journeyTitle(b), 'en')
        );
        if (!cancelled) setJourneys(merged);
      } catch (e: unknown) {
        const msg =
          axios.isAxiosError(e) && e.response?.data && typeof e.response.data === 'object'
            ? String(
                (e.response.data as { error?: string; message?: string }).error ||
                  (e.response.data as { message?: string }).message ||
                  ''
              )
            : e instanceof Error
              ? e.message
              : '';
        if (!cancelled) {
          setError(msg || 'Could not load trainings.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Ouvrir l'onglet Certifications si ?tab=certifications dans l'URL
  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab === 'certifications') setTrainingTab('certifications');
  }, [location.search]);

  // Redirection vers la page certificat quand la formation est terminée
  useEffect(() => {
    if (selectedJourneyId && structuredProgressByJourney[selectedJourneyId]?.status === 'completed') {
      const timer = setTimeout(() => {
        navigate(`/certification/journey/${encodeURIComponent(selectedJourneyId)}`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedJourneyId, structuredProgressByJourney, navigate]);

  /** Formations terminées (= certifiées) pour la section Certifications. */
  const completedJourneys = useMemo(() => {
    return displayJourneys.filter((j) => {
      const id = journeyKey(j);
      if (!id) return false;
      if (structuredProgressByJourney[id]?.status === 'completed') return true;
      const pct = Number(progressByJourney[id]?.progressPercentage);
      return Number.isFinite(pct) && pct >= 100;
    });
  }, [displayJourneys, structuredProgressByJourney, progressByJourney]);

  const openCertificate = useCallback((j: JourneyRow) => {
    const id = journeyKey(j);
    if (id) navigate(`/certification/journey/${encodeURIComponent(id)}`);
  }, [navigate]);

  // When user picks a gig, refetch trainings for that gig so the list updates even if the initial bulk load failed
  useEffect(() => {
    if (gigFilter === '__all__') {
      setGigFetchedJourneys([]);
      setGigFetchLoading(false);
      setGigFetchOutcome(null);
      return;
    }

    const base = trainingApiBase();
    const token = getAuthToken() || '';
    if (!base || !token) {
      setGigFetchedJourneys([]);
      setGigFetchOutcome({ gigId: gigFilter, kind: 'error' });
      return;
    }

    const gigTitle =
      enrolledGigs.find((g) => g.gigId === gigFilter)?.title || 'Gig';
    let cancelled = false;
    setGigFetchLoading(true);
    setGigFetchOutcome(null);

    (async () => {
      try {
        console.log('[Training] refetchSelectedGig:start', { gigFilter });
        const r = await axios.get<{ success?: boolean; data?: unknown[] }>(
          `${base}/training_journeys/gig/${encodeURIComponent(gigFilter)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
          }
        );
        console.log('[Training] refetchSelectedGig:response', {
          gigFilter,
          status: r.status,
          count: Array.isArray(r.data?.data) ? r.data.data.length : 0
        });
        if (cancelled) return;
        if (r.status === 404) {
          setGigFetchedJourneys([]);
          setGigFetchOutcome({ gigId: gigFilter, kind: 'not_found' });
          return;
        }
        const arr = Array.isArray(r.data?.data) ? r.data.data : [];
        const rows: JourneyRow[] = arr.map((raw) => {
          const j = raw as Record<string, unknown>;
          return {
            ...j,
            __gigId: gigFilter,
            __gigTitle: gigTitle,
          };
        });
        setGigFetchedJourneys(rows);
        setGigFetchOutcome({ gigId: gigFilter, kind: 'ok' });
      } catch {
        if (!cancelled) {
          console.warn('[Training] refetchSelectedGig:error', { gigFilter });
          setGigFetchedJourneys([]);
          setGigFetchOutcome({ gigId: gigFilter, kind: 'error' });
        }
      } finally {
        if (!cancelled) setGigFetchLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gigFilter, enrolledGigs]);

  const selectedGigTitle =
    gigFilter === '__all__'
      ? null
      : enrolledGigs.find((g) => g.gigId === gigFilter)?.title || null;

  useEffect(() => {
    sessionStorage.setItem('training_gig_filter', gigFilter);
  }, [gigFilter]);

  useEffect(() => {
    if (routeGigApplied) return;
    if (!routeGigId) {
      setRouteGigApplied(true);
      return;
    }
    if (enrolledGigs.length <= 0) return;
    if (enrolledGigs.some((g) => g.gigId === routeGigId)) {
      setGigFilter(routeGigId);
    }
    setRouteGigApplied(true);
  }, [routeGigId, enrolledGigs, routeGigApplied]);

  const selectedJourney = useMemo(
    () => displayJourneys.find((j) => journeyKey(j) === selectedJourneyId) || null,
    [displayJourneys, selectedJourneyId]
  );
  const formationViewerSlides = useMemo((): ViewerSlide[] => {
    if (!selectedJourney) return [];
    const modules = extractModules(selectedJourney);
    if (!Array.isArray(modules) || modules.length === 0) return [];
    const totalModules = modules.length;
    const slides: ViewerSlide[] = [
      {
        key: 'overview',
        kind: 'overview',
        modules: modules.map((mod, mi) => {
          const sections = Array.isArray(mod?.sections) ? mod.sections : [];
          return {
            title: String(mod?.title || `Module ${mi + 1}`),
            moduleIndex: mi,
            sections: sections.map((sec: any, si: number) => ({
              title: String(sec?.title || `Section ${si + 1}`),
              sectionIndex: si,
            })),
          };
        }),
      },
    ];
    modules.forEach((mod, mi) => {
      slides.push({ key: `m${mi}-intro`, kind: 'module_intro', moduleIndex: mi, totalModules, mod });
      const sections = Array.isArray(mod?.sections) ? mod.sections : [];
      sections.forEach((sec: any, si: number) => {
        slides.push({
          key: `m${mi}-s${si}`,
          kind: 'section',
          moduleIndex: mi,
          sectionIndex: si,
          totalModules,
          section: sec,
          modTitle: String(mod?.title || `Module ${mi + 1}`),
        });
      });
      const quizzes = Array.isArray(mod?.quizzes) ? mod.quizzes : [];
      const moduleQuestions: Array<{
        quizTitle: string;
        quizKey: string;
        quizId?: string;
        maxAttempts?: number;
        question: any;
        correctAnswer: number;
      }> = [];
      quizzes.forEach((qz: any, qi: number) => {
        const quizTitle = String(qz?.title || `Quiz ${qi + 1}`);
        const quizId =
          normalizeMongoId((qz as any)?._id) || normalizeMongoId((qz as any)?.id) || undefined;
        const quizKey = quizId || quizTitle.trim() || `m${mi}-q${qi}`;
        const questions = Array.isArray(qz?.questions) ? qz.questions : [];
        const cap = readQuizMaxAttemptsFromJourneyDoc(qz);
        questions.forEach((q: any) => {
          const correct = typeof q?.correctAnswer === 'number' ? q.correctAnswer : 0;
          moduleQuestions.push({
            quizTitle,
            quizKey,
            quizId,
            maxAttempts: cap,
            question: q,
            correctAnswer: correct,
          });
        });
      });
      if (moduleQuestions.length > 0) {
        slides.push({
          key: `m${mi}-quiz`,
          kind: 'quiz_group',
          moduleIndex: mi,
          totalModules,
          questions: moduleQuestions,
        });
      }
    });
    return slides;
  }, [selectedJourney]);
  const formationViewerSlideIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    formationViewerSlides.forEach((slide, idx) => map.set(slide.key, idx));
    return map;
  }, [formationViewerSlides]);
  const jumpToFormationSlide = useCallback(
    (key: string) => {
      const idx = formationViewerSlideIndexByKey.get(key);
      if (typeof idx === 'number') setFormationViewerSlideIndex(idx);
    },
    [formationViewerSlideIndexByKey]
  );
  const currentFormationViewerSlide = formationViewerSlides[formationViewerSlideIndex];
  const isNextModuleLocked = useMemo(() => {
    if (!selectedJourneyId || !currentFormationViewerSlide) return false;
    const nextSlide = formationViewerSlides[formationViewerSlideIndex + 1];
    if (!nextSlide || nextSlide.kind === 'overview') return false;
    const nextModuleIndex = nextSlide.moduleIndex;
    const selected = selectedJourney ? extractModules(selectedJourney) : [];
    const nextModule = selected[nextModuleIndex];
    if (!nextModule) return false;
    const nextModuleId = normalizeMongoId((nextModule as any)?._id) || normalizeMongoId((nextModule as any)?.id);
    const structured = structuredProgressByJourney[selectedJourneyId];
    if (!structured || !Array.isArray(structured.modules)) return false;
    const moduleState = structured.modules.find((m) => m.moduleId === nextModuleId);
    return moduleState?.status === 'locked';
  }, [
    selectedJourneyId,
    currentFormationViewerSlide,
    formationViewerSlides,
    formationViewerSlideIndex,
    selectedJourney,
    structuredProgressByJourney,
  ]);

  /** Dernière slide du viewer = une section : pas d’index suivant, il faut « Terminer » pour envoyer complete. */
  const atLastFormationSlideSection = useMemo(() => {
    if (formationViewerSlides.length === 0) return false;
    if (formationViewerSlideIndex < formationViewerSlides.length - 1) return false;
    return currentFormationViewerSlide?.kind === 'section';
  }, [formationViewerSlides, formationViewerSlideIndex, currentFormationViewerSlide]);

  const blockFormationNextByEndPosition = useMemo(() => {
    if (formationViewerSlides.length === 0) return false;
    if (formationViewerSlideIndex < formationViewerSlides.length - 1) return false;
    return currentFormationViewerSlide?.kind !== 'section';
  }, [formationViewerSlides, formationViewerSlideIndex, currentFormationViewerSlide]);

  /** Toutes les questions du bloc ont une réponse verrouillée (peu importe la note). Sert à envoyer quiz/submit même en échec sous 70 %. */
  const isCurrentQuizFullyAnswered = useMemo(() => {
    if (!currentFormationViewerSlide || currentFormationViewerSlide.kind !== 'quiz_group') return false;
    const questions = Array.isArray(currentFormationViewerSlide.questions)
      ? currentFormationViewerSlide.questions
      : [];
    if (questions.length === 0) return false;
    const byQuiz = new Map<string, { answered: number; total: number }>();
    questions.forEach((q, idx) => {
      const bucket = String(q.quizKey || q.quizTitle || 'quiz').trim() || 'quiz';
      if (!byQuiz.has(bucket)) byQuiz.set(bucket, { answered: 0, total: 0 });
      const row = byQuiz.get(bucket)!;
      row.total += 1;
      const qKey = `${currentFormationViewerSlide.key}-q${idx}`;
      const state = formationViewerQuizState[qKey];
      if (state?.locked) row.answered += 1;
    });
    for (const row of byQuiz.values()) {
      if (row.answered < row.total) return false;
    }
    return true;
  }, [currentFormationViewerSlide, formationViewerQuizState]);

  const isCurrentQuizPassed = useMemo(() => {
    if (!currentFormationViewerSlide || currentFormationViewerSlide.kind !== 'quiz_group') return true;
    const questions = Array.isArray(currentFormationViewerSlide.questions)
      ? currentFormationViewerSlide.questions
      : [];
    if (questions.length === 0) return true;
    const byQuiz = new Map<
      string,
      { answered: number; total: number; correct: number }
    >();
    questions.forEach((q, idx) => {
      const bucket = String(q.quizKey || q.quizTitle || 'quiz').trim() || 'quiz';
      if (!byQuiz.has(bucket)) byQuiz.set(bucket, { answered: 0, total: 0, correct: 0 });
      const row = byQuiz.get(bucket)!;
      row.total += 1;
      const qKey = `${currentFormationViewerSlide.key}-q${idx}`;
      const state = formationViewerQuizState[qKey];
      if (!state || !state.locked) return;
      row.answered += 1;
      if (state.timedOut) return;
      if (state.selected !== null && state.selected === q.correctAnswer) row.correct += 1;
    });
    for (const row of byQuiz.values()) {
      if (row.answered < row.total) return false;
      const percent = row.total > 0 ? (row.correct / row.total) * 100 : 0;
      if (percent < 70) return false;
    }
    return true;
  }, [currentFormationViewerSlide, formationViewerQuizState]);

  const repViewerTheme = useMemo(
    () => resolveRepViewerTheme(selectedJourney, selectedJourneyId || ''),
    [selectedJourney, selectedJourneyId]
  );
  const viewerThemeTokens = useMemo(() => getViewerThemeTokens(repViewerTheme), [repViewerTheme]);
  const moduleColorStyles = useMemo(() => getModuleColorStyles(repViewerTheme), [repViewerTheme]);

  useEffect(() => {
    return () => {
      clearTrainingNav();
    };
  }, [clearTrainingNav]);

  useEffect(() => {
    if (!selectedJourneyId) {
      setFormationViewerSlideIndex(0);
      setFormationViewerQuizState({});
      setFormationViewerQuizPage({});
      setQuizSlideWrongStrikes({});
      setQuizQuestionCountdownSec({});
      setSessionElapsedMs(0);
      setSessionManualDurationMs(0);
    }
    sectionStartSentRef.current.clear();
    sectionStartPromiseRef.current.clear();
    sectionCompleteSentRef.current.clear();
    prevFormationSlideIndexRef.current = null;
    quizOutcomeSentRef.current.clear();
    quizStartSentRef.current.clear();
  }, [selectedJourneyId]);

  useEffect(() => {
    if (!selectedJourneyId) return;
    const row = progressByJourney[selectedJourneyId];
    const derived = deriveCompletedSectionsMapFromProgressRow(row);
    if (Object.keys(derived).length === 0) return;
    setCompletedSectionsByJourney((prev) => {
      const prevJ = prev[selectedJourneyId] || {};
      const nextJ: Record<string, string[]> = { ...prevJ };
      for (const [modId, keys] of Object.entries(derived)) {
        nextJ[modId] = [...new Set([...(prevJ[modId] || []), ...keys])];
      }
      return { ...prev, [selectedJourneyId]: nextJ };
    });
  }, [selectedJourneyId, progressByJourney]);

  useEffect(() => {
    if (!selectedJourneyId) return;
    const startedAt = Date.now();
    const t = window.setInterval(() => {
      setSessionElapsedMs(Date.now() - startedAt);
    }, 1000);
    return () => window.clearInterval(t);
  }, [selectedJourneyId]);

  const currentModuleIndex = useMemo(() => {
    if (!currentFormationViewerSlide) return null;
    if (currentFormationViewerSlide.kind === 'overview') return 0;
    return currentFormationViewerSlide.moduleIndex;
  }, [currentFormationViewerSlide]);

  /** Après max tentatives échouées ou pendant lockedUntil : on fige le chrono « module » (API). */
  const quizModuleTimeFrozen = useMemo(() => {
    const slide = currentFormationViewerSlide;
    if (!slide || slide.kind !== 'quiz_group' || !selectedJourneyId || !selectedJourney) return false;
    const modules = extractModules(selectedJourney);
    const mod = modules[slide.moduleIndex];
    const moduleId =
      normalizeMongoId((mod as any)?._id) || normalizeMongoId((mod as any)?.id) || '';
    if (!moduleId || !/^[a-f\d]{24}$/i.test(moduleId)) return false;
    const mp = progressByJourney[selectedJourneyId]?.modules?.[moduleId] as Record<string, unknown> | undefined;
    const quizProg = mp?.quizProgress as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(quizProg)) return false;
    const activeKeys = new Set(
      slide.questions.map((q) => String(q.quizKey || '').trim()).filter(Boolean)
    );
    let maxCap = 3;
    let att = 0;
    let lockUntil = 0;
    let anyPassed = false;
    for (const row of quizProg) {
      const k = String(row?.quizKey || '').trim();
      if (!activeKeys.has(k)) continue;
      maxCap = Math.max(maxCap, Number(row?.maxAttempts || 0) || 3);
      att = Math.max(att, Number(row?.attempts || 0));
      const lu = Date.parse(String(row?.lockedUntil || ''));
      if (Number.isFinite(lu)) lockUntil = Math.max(lockUntil, lu);
      if (row?.passed === true || String(row?.status) === 'passed') anyPassed = true;
    }
    const fromJourney = Math.max(
      3,
      ...slide.questions.map((q) => Number((q as { maxAttempts?: unknown }).maxAttempts) || 3)
    );
    maxCap = Math.max(maxCap, fromJourney);
    if (Date.now() < lockUntil) return true;
    if (!anyPassed && att >= maxCap) return true;
    return false;
  }, [currentFormationViewerSlide, selectedJourneyId, selectedJourney, progressByJourney]);

  useEffect(() => {
    setModuleElapsedMs(0);
    setModuleManualDurationMs(0);
    if (!selectedJourneyId || currentModuleIndex == null) return;
    if (quizModuleTimeFrozen) return;
    const startedAt = Date.now();
    const t = window.setInterval(() => {
      setModuleElapsedMs(Date.now() - startedAt);
    }, 1000);
    return () => window.clearInterval(t);
  }, [selectedJourneyId, currentModuleIndex, quizModuleTimeFrozen]);

  /** Persiste slide courante + pages quiz dans rep_training_tracking (debounce). */
  useEffect(() => {
    if (!repId || !selectedJourneyId || !selectedJourney) return;
    const slide = formationViewerSlides[formationViewerSlideIndex];
    if (!slide) return;
    const modules = extractModules(selectedJourney);
    const moduleIndex = slide.kind === 'overview' ? 0 : slide.moduleIndex;
    const mod = modules[moduleIndex];
    const moduleId =
      normalizeMongoId((mod as any)?._id) || normalizeMongoId((mod as any)?.id) || '';
    if (!/^[a-f\d]{24}$/i.test(moduleId)) return;
    const base = trainingApiBase();
    if (!base) return;
    const tid = window.setTimeout(() => {
      void axios
        .post(`${base}/training_journeys/rep-progress`, {
          repId,
          journeyId: selectedJourneyId,
          moduleId,
          status: 'in_progress',
          currentSlideIndex: formationViewerSlideIndex,
          currentModuleId: moduleId,
          currentQuizPageBySlide: formationViewerQuizPage,
        })
        .catch(() => undefined);
    }, 2000);
    return () => window.clearTimeout(tid);
  }, [
    repId,
    selectedJourneyId,
    selectedJourney,
    formationViewerSlides,
    formationViewerSlideIndex,
    formationViewerQuizPage,
  ]);

  useEffect(() => {
    if (!selectedJourney) {
      clearTrainingNav();
      return;
    }
    const slides = extractSlides(selectedJourney);
    const modules = extractModules(selectedJourney).map((m, i) => {
      const sections = Array.isArray(m.sections)
        ? m.sections
            .map((s, si) => {
              if (typeof s === 'string') return s;
              if (typeof s === 'object' && s !== null && 'title' in (s as Record<string, unknown>)) {
                return String((s as { title?: unknown }).title || `Section ${si + 1}`);
              }
              return `Section ${si + 1}`;
            })
            .filter(Boolean)
        : [];
      return {
        title: String(m.title || `Module ${i + 1}`),
        sections,
        slides: [] as { title: string; globalIndex: number; slideId: string }[]
      };
    });
    if (modules.length > 0 && slides.length > 0) {
      const slideTitles = slides.map((s, idx) => String(s.title || `Slide ${idx + 1}`));
      const totalSlides = slideTitles.length;
      const totalModules = modules.length;
      const base = totalModules > 0 ? Math.floor(totalSlides / totalModules) : 0;
      let remainder = totalModules > 0 ? totalSlides % totalModules : 0;
      let cursor = 0;
      for (let i = 0; i < modules.length; i++) {
        const take = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        const chunk = slideTitles.slice(cursor, cursor + take);
        modules[i].slides = chunk.map((title, j) => {
          const gi = cursor + j;
          return {
            title,
            globalIndex: gi,
            slideId: slideStableId(slides[gi])
          };
        });
        cursor += take;
      }
    } else if (modules.length > 0) {
      // Fallback for journeys built only from modules/sections:
      // keep sidebar populated so it doesn't show "No slides".
      let cursor = 0;
      modules.forEach((m) => {
        const sectionTitles =
          Array.isArray(m.sections) && m.sections.length > 0 ? m.sections : ['Overview'];
        m.slides = sectionTitles.map((title) => {
          const globalIndex = cursor;
          cursor += 1;
          return {
            title: String(title || 'Section'),
            globalIndex,
            slideId: '',
          };
        });
      });
    }
    const activeModuleIndex =
      modules.length > 0 && slides.length > 0
        ? Math.min(
            modules.length - 1,
            Math.max(0, Math.floor((activeSlide / Math.max(slides.length - 1, 1)) * modules.length))
          )
        : 0;
    setTrainingNav({
      // Hide training module dropdowns from the sidebar:
      // keep only the top-level "Training" section visible.
      trainingModules: [],
      activeTrainingModuleIndex: activeModuleIndex,
      activeTrainingSlideIndex: Math.max(0, activeSlide)
    });
  }, [selectedJourney, activeSlide, setTrainingNav]);

  useEffect(() => {
    const onGotoSlide = (ev: Event) => {
      const e = ev as CustomEvent<{ index?: number; slideId?: string }>;
      if (!selectedJourney) return;
      const slides = extractSlides(selectedJourney);
      const n = slides.length;
      if (n === 0) return;
      let idx = e.detail?.index;
      const sid = e.detail?.slideId;
      if (typeof sid === 'string' && sid.trim()) {
        const found = slides.findIndex((s) => slideStableId(s) === sid.trim());
        if (found >= 0) idx = found;
      }
      if (typeof idx !== 'number' || idx < 0) return;
      setActiveSlide(Math.min(Math.max(0, idx), n - 1));
    };
    window.addEventListener('rep-training-goto-slide', onGotoSlide as EventListener);
    return () => window.removeEventListener('rep-training-goto-slide', onGotoSlide as EventListener);
  }, [selectedJourney]);

  const fetchTrainingProgressRows = useCallback(async () => {
    if (!repId) return;
    const base = trainingApiBase();
    if (!base) return;
    try {
      const r = await axios.get<{ success?: boolean; data?: RepProgressRow[] }>(
        `${base}/training_journeys/rep/${encodeURIComponent(repId)}/trainings-progress`
      );
      const rows = Array.isArray(r.data?.data) ? r.data.data : [];
      const map: Record<string, RepProgressRow> = {};
      rows.forEach((row) => {
        const key = String(row.journeyId || '').trim();
        if (key) map[key] = row;
      });
      setProgressByJourney(map);
    } catch {
      /* ignore */
    }
  }, [repId]);

  useEffect(() => {
    void fetchTrainingProgressRows();
  }, [fetchTrainingProgressRows]);

  const fetchSlideProgressSummary = useCallback(async () => {
    if (!repId) return;
    const base = trainingApiBase();
    if (!base) return;
    try {
      const r = await axios.get<{ success?: boolean; data?: RepSlideProgressSummary }>(
        `${base}/training_journeys/rep/${encodeURIComponent(repId)}/progress-summary`,
        gigFilter === '__all__' ? {} : { params: { gigId: gigFilter } }
      );
      setSlideProgressSummary(r.data?.data ?? null);
    } catch {
      setSlideProgressSummary(null);
    }
  }, [repId, gigFilter]);

  const fetchStructuredProgress = useCallback(
    async (courseId: string) => {
      if (!repId || !courseId) return null;
      const base = trainingApiBase();
      if (!base) return null;
      try {
        const r = await axios.get<{ success?: boolean; data?: unknown }>(
          `${base}/training_journeys/progress/${encodeURIComponent(repId)}/${encodeURIComponent(courseId)}`
        );
        const parsed = normalizeStructuredProgress(r.data?.data);
        if (parsed) {
          setStructuredProgressByJourney((prev) => ({ ...prev, [courseId]: parsed }));
          return parsed;
        }
      } catch {
        /* ignore */
      }
      return null;
    },
    [repId]
  );

  const ensureSectionStarted = useCallback(
    async (args: { courseId: string; moduleId: string; sectionId: string }) => {
      if (!repId) return;
      const { courseId, moduleId, sectionId } = args;
      if (!/^[a-f\d]{24}$/i.test(moduleId) || !/^[a-f\d]{24}$/i.test(sectionId)) return;

      const sentKey = `${courseId}:${moduleId}:${sectionId}`;
      if (sectionStartSentRef.current.has(sentKey)) return;

      const existing = sectionStartPromiseRef.current.get(sentKey);
      if (existing) {
        await existing;
        return;
      }

      const base = trainingApiBase();
      if (!base) return;

      const syncKey = `start:${sentKey}`;
      progressSyncInFlightRef.current.add(syncKey);
      const promise = axios
        .post(`${base}/training_journeys/section/start`, {
          repId,
          courseId,
          moduleId,
          sectionId,
        })
        .then(async () => {
          sectionStartSentRef.current.add(sentKey);
          await Promise.all([
            fetchTrainingProgressRows(),
            fetchSlideProgressSummary(),
            fetchStructuredProgress(courseId),
          ]);
        })
        .catch(() => undefined)
        .finally(() => {
          progressSyncInFlightRef.current.delete(syncKey);
          sectionStartPromiseRef.current.delete(sentKey);
        });

      sectionStartPromiseRef.current.set(sentKey, promise);
      await promise;
    },
    [repId, fetchTrainingProgressRows, fetchSlideProgressSummary, fetchStructuredProgress]
  );

  /** POST /section/complete — appelé au « Suivant » (sortie section) ou sur dernière slide section. */
  const completeSectionProgressAtLeave = useCallback(
    async (args: { moduleIndex: number; section: unknown }) => {
      if (!repId || !selectedJourneyId || !selectedJourney) return;
      const modules = extractModules(selectedJourney);
      const moduleRow = modules[args.moduleIndex];
      if (!moduleRow) return;
      const moduleId =
        normalizeMongoId((moduleRow as any)?._id) ||
        normalizeMongoId((moduleRow as any)?.id) ||
        String(args.moduleIndex);
      const sec = args.section as { _id?: unknown; id?: unknown } | null;
      const sectionMongoId = normalizeMongoId(sec?._id) || normalizeMongoId(sec?.id) || '';
      if (!/^[a-f\d]{24}$/i.test(moduleId) || !/^[a-f\d]{24}$/i.test(sectionMongoId)) return;

      const sentKey = `${selectedJourneyId}:${moduleId}:${sectionMongoId}`;
      if (sectionCompleteSentRef.current.has(sentKey)) return;

      const sections = Array.isArray((moduleRow as any)?.sections) ? (moduleRow as any).sections : [];
      const quizzes = Array.isArray((moduleRow as any)?.quizzes) ? (moduleRow as any).quizzes : [];
      const totalSections = sections.length;
      const hasQuizzes = quizzes.length > 0;
      const sectionDurationMs = Math.max(
        10000,
        Math.floor(Number((sec as any)?.duration || 0) * 60 * 1000) || 45000
      );
      const syncKey = `complete:${sentKey}`;
      if (progressSyncInFlightRef.current.has(syncKey)) return;
      progressSyncInFlightRef.current.add(syncKey);
      const base = trainingApiBase();
      if (!base) {
        progressSyncInFlightRef.current.delete(syncKey);
        return;
      }

      const currentDone = completedSectionsByJourney[selectedJourneyId]?.[moduleId] || [];
      const nextDone = [...new Set([...currentDone, sectionMongoId])];
      setCompletedSectionsByJourney((prevMap) => ({
        ...prevMap,
        [selectedJourneyId]: {
          ...(prevMap[selectedJourneyId] || {}),
          [moduleId]: nextDone,
        },
      }));
      const progress =
        totalSections > 0 ? Math.min(100, Math.round((nextDone.length / totalSections) * 100)) : 0;
      const status: 'not_started' | 'in_progress' | 'completed' =
        progress >= 100 && !hasQuizzes ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';

      const postSectionComplete = () =>
        axios.post(`${base}/training_journeys/section/complete`, {
          repId,
          courseId: selectedJourneyId,
          moduleId,
          sectionId: sectionMongoId,
          progress,
          status,
          completedSections: nextDone.filter((id) => /^[a-f\d]{24}$/i.test(id)),
          durationMs: sectionDurationMs,
        });

      const finalizeComplete = async () => {
        await postSectionComplete();
        sectionCompleteSentRef.current.add(sentKey);
        await Promise.all([
          fetchTrainingProgressRows(),
          fetchSlideProgressSummary(),
          fetchStructuredProgress(selectedJourneyId),
        ]);
      };

      try {
        await ensureSectionStarted({
          courseId: selectedJourneyId,
          moduleId,
          sectionId: sectionMongoId,
        });
        await finalizeComplete();
      } catch (err) {
        const is409 = axios.isAxiosError(err) && err.response?.status === 409;
        if (!is409) return;
        try {
          await ensureSectionStarted({
            courseId: selectedJourneyId,
            moduleId,
            sectionId: sectionMongoId,
          });
          await finalizeComplete();
        } catch {
          /* ignore */
        }
      } finally {
        progressSyncInFlightRef.current.delete(syncKey);
      }
    },
    [
      repId,
      selectedJourneyId,
      selectedJourney,
      completedSectionsByJourney,
      ensureSectionStarted,
      fetchTrainingProgressRows,
      fetchSlideProgressSummary,
      fetchStructuredProgress,
    ]
  );

  useEffect(() => {
    void fetchSlideProgressSummary();
  }, [fetchSlideProgressSummary]);

  useEffect(() => {
    if (!selectedJourneyId) return;
    void fetchStructuredProgress(selectedJourneyId);
  }, [selectedJourneyId, fetchStructuredProgress]);

  useEffect(() => {
    if (!repId || !selectedJourneyId || !selectedJourney) return;
    const slide = currentFormationViewerSlide;
    if (!slide || slide.kind !== 'section') return;

    const modules = extractModules(selectedJourney);
    const moduleRow = modules[slide.moduleIndex];
    if (!moduleRow) return;

    const moduleId =
      normalizeMongoId((moduleRow as any)?._id) ||
      normalizeMongoId((moduleRow as any)?.id) ||
      String(slide.moduleIndex);
    const sectionKey =
      normalizeMongoId((slide.section as any)?._id) ||
      normalizeMongoId((slide.section as any)?.id) ||
      String((slide.section as any)?.title || '').trim() ||
      slide.key;
    const sectionMongoId =
      normalizeMongoId((slide.section as any)?._id) ||
      normalizeMongoId((slide.section as any)?.id) ||
      '';
    const sectionIdForApi =
      sectionMongoId && /^[a-f\d]{24}$/i.test(sectionMongoId)
        ? sectionMongoId
        : sectionKey && /^[a-f\d]{24}$/i.test(sectionKey)
          ? sectionKey
          : '';
    if (!moduleId || !sectionKey) return;
    if (!/^[a-f\d]{24}$/i.test(moduleId)) return;
    if (!sectionIdForApi || !/^[a-f\d]{24}$/i.test(sectionIdForApi)) return;

    void ensureSectionStarted({
      courseId: selectedJourneyId,
      moduleId,
      sectionId: sectionIdForApi,
    });
  }, [
    repId,
    selectedJourneyId,
    selectedJourney,
    currentFormationViewerSlide,
    ensureSectionStarted,
  ]);

  /** Marque la section comme terminée seulement après « Suivant » (index qui augmente), pas à l’ouverture. */
  useEffect(() => {
    if (!repId || !selectedJourneyId || !selectedJourney) return;
    const slides = formationViewerSlides;
    if (slides.length === 0) return;

    const prev = prevFormationSlideIndexRef.current;
    const cur = formationViewerSlideIndex;

    if (prev !== null && cur > prev && prev >= 0 && prev < slides.length) {
      const left = slides[prev];
      if (left?.kind === 'section') {
        void completeSectionProgressAtLeave({ moduleIndex: left.moduleIndex, section: left.section });
      }
    }

    prevFormationSlideIndexRef.current = cur;
  }, [
    selectedJourneyId,
    selectedJourney,
    formationViewerSlides,
    formationViewerSlideIndex,
    completeSectionProgressAtLeave,
  ]);

  const selectedJourneySummary = useMemo(
    () =>
      selectedJourneyId && slideProgressSummary?.journeys
        ? slideProgressSummary.journeys.find((x) => x.journeyId === selectedJourneyId) || null
        : null,
    [slideProgressSummary, selectedJourneyId]
  );
  const moduleDurationsMinutes = useMemo(
    () => (selectedJourney ? extractModuleDurationsMinutes(selectedJourney) : []),
    [selectedJourney]
  );
  const plannedTotalMs = useMemo(
    () => moduleDurationsMinutes.reduce((acc, n) => acc + Math.max(0, n), 0) * 60 * 1000,
    [moduleDurationsMinutes]
  );
  const plannedCurrentModuleMs = useMemo(() => {
    if (currentModuleIndex == null) return 0;
    return Math.max(0, Number(moduleDurationsMinutes[currentModuleIndex] || 0)) * 60 * 1000;
  }, [moduleDurationsMinutes, currentModuleIndex]);

  const trackedFormationMs =
    Math.max(0, Number(selectedJourneySummary?.followedDurationMs || 0)) +
    sessionElapsedMs +
    sessionManualDurationMs;
  const trackedModuleMs = moduleElapsedMs + moduleManualDurationMs;

  const formationRemainingMs =
    plannedTotalMs > 0 ? Math.max(0, plannedTotalMs - trackedFormationMs) : 0;
  const moduleRemainingMs =
    plannedCurrentModuleMs > 0 ? Math.max(0, plannedCurrentModuleMs - trackedModuleMs) : 0;

  const formationTimerLabel = useMemo(
    () => formatDurationHMS(formationRemainingMs),
    [formationRemainingMs]
  );
  const moduleTimerLabel = useMemo(() => formatDurationHMS(moduleRemainingMs), [moduleRemainingMs]);

  const syncQuizDuration = useCallback(
    async (
      moduleIndex: number,
      quizMeta?: { quizKey: string; quizId?: string }
    ) => {
      if (!repId || !selectedJourneyId || !selectedJourney) return;
      const modules = extractModules(selectedJourney);
      const mod = modules[moduleIndex];
      if (!mod) return;
      const moduleId =
        normalizeMongoId((mod as any)?._id) ||
        normalizeMongoId((mod as any)?.id) ||
        String(moduleIndex);
      if (!moduleId || !/^[a-f\d]{24}$/i.test(moduleId)) return;
      const base = trainingApiBase();
      if (!base) return;
      setSessionManualDurationMs((ms) => ms + 40000);
      setModuleManualDurationMs((ms) => ms + 40000);
      try {
        await axios.post(`${base}/training_journeys/rep-progress`, {
          repId,
          journeyId: selectedJourneyId,
          moduleId,
          status: 'in_progress',
          durationMs: quizMeta ? 0 : 40000,
          quizUpdate: quizMeta
            ? {
                quizKey: quizMeta.quizKey,
                quizMongoId:
                  quizMeta.quizId && /^[a-f\d]{24}$/i.test(quizMeta.quizId) ? quizMeta.quizId : undefined,
                status: 'in_progress',
                durationMs: 40000,
              }
            : undefined,
        });
        await Promise.all([fetchTrainingProgressRows(), fetchSlideProgressSummary()]);
      } catch {
        /* ignore */
      }
    },
    [
      repId,
      selectedJourneyId,
      selectedJourney,
      fetchTrainingProgressRows,
      fetchSlideProgressSummary,
    ]
  );

  const requestQuizStartForSlide = useCallback(
    async (
      slide: Extract<ViewerSlide, { kind: 'quiz_group' }>,
      options?: { ignoreSentRef?: boolean }
    ) => {
      if (!repId || !selectedJourneyId || !selectedJourney) return;
      const modules = extractModules(selectedJourney);
      const moduleRow = modules[slide.moduleIndex];
      if (!moduleRow) return;
      const moduleId =
        normalizeMongoId((moduleRow as any)?._id) ||
        normalizeMongoId((moduleRow as any)?.id) ||
        String(slide.moduleIndex);
      if (!moduleId || !/^[a-f\d]{24}$/i.test(moduleId)) return;

      const questions = Array.isArray(slide.questions) ? slide.questions : [];
      const quizIds = new Set<string>();
      for (const q of questions) {
        const id =
          (q.quizId && /^[a-f\d]{24}$/i.test(String(q.quizId)) ? String(q.quizId) : '') ||
          (/^[a-f\d]{24}$/i.test(String(q.quizKey || '')) ? String(q.quizKey) : '');
        if (id) quizIds.add(id);
      }
      if (quizIds.size === 0) return;

      const base = trainingApiBase();
      if (!base) return;

      for (const quizId of quizIds) {
        const sentKey = `${selectedJourneyId}:${moduleId}:${quizId}`;
        if (!options?.ignoreSentRef && quizStartSentRef.current.has(sentKey)) continue;
        const syncKey = `quizstart:${sentKey}`;
        if (progressSyncInFlightRef.current.has(syncKey)) continue;
        progressSyncInFlightRef.current.add(syncKey);
        try {
          await axios.post(`${base}/training_journeys/quiz/start`, {
            repId,
            courseId: selectedJourneyId,
            moduleId,
            quizId,
          });
          quizStartSentRef.current.add(sentKey);
          await Promise.all([
            fetchTrainingProgressRows(),
            fetchSlideProgressSummary(),
            fetchStructuredProgress(selectedJourneyId),
          ]);
        } catch {
          /* ignore */
        } finally {
          progressSyncInFlightRef.current.delete(syncKey);
        }
      }
    },
    [
      repId,
      selectedJourneyId,
      selectedJourney,
      fetchTrainingProgressRows,
      fetchSlideProgressSummary,
      fetchStructuredProgress,
    ]
  );

  useEffect(() => {
    if (!repId || !selectedJourneyId || !selectedJourney) return;
    const slide = currentFormationViewerSlide;
    if (!slide || slide.kind !== 'quiz_group') return;
    void requestQuizStartForSlide(slide);
  }, [repId, selectedJourneyId, selectedJourney, currentFormationViewerSlide, requestQuizStartForSlide]);

  useEffect(() => {
    if (!repId || !selectedJourneyId || !selectedJourney) return;
    const slide = currentFormationViewerSlide;
    if (!slide || slide.kind !== 'quiz_group' || !isCurrentQuizFullyAnswered) return;

    const modules = extractModules(selectedJourney);
    const mod = modules[slide.moduleIndex];
    if (!mod) return;
    const moduleId =
      normalizeMongoId((mod as any)?._id) ||
      normalizeMongoId((mod as any)?.id) ||
      String(slide.moduleIndex);
    if (!moduleId || !/^[a-f\d]{24}$/i.test(moduleId)) return;

    const base = trainingApiBase();
    if (!base) return;

    const questions = Array.isArray(slide.questions) ? slide.questions : [];
    const buckets = new Map<
      string,
      {
        quizId?: string;
        title: string;
        total: number;
        correct: number;
        answered: number;
        attempts: number;
      }
    >();
    questions.forEach((q, idx) => {
      const bucket = String(q.quizKey || q.quizTitle || 'quiz').trim() || 'quiz';
      if (!buckets.has(bucket)) {
        buckets.set(bucket, {
          quizId: q.quizId && /^[a-f\d]{24}$/i.test(q.quizId) ? q.quizId : undefined,
          title: q.quizTitle,
          total: 0,
          correct: 0,
          answered: 0,
          attempts: 0,
        });
      }
      const row = buckets.get(bucket)!;
      row.total += 1;
      const qKey = `${slide.key}-q${idx}`;
      const st = formationViewerQuizState[qKey];
      if (st?.locked) {
        row.answered += 1;
        if (!st.timedOut && st.selected !== null && st.selected === q.correctAnswer) row.correct += 1;
      }
    });

    for (const stats of buckets.values()) {
      if (stats.answered < stats.total) return;
    }

    for (const [quizKey, stats] of buckets.entries()) {
      const ouKey = `${selectedJourneyId}:${moduleId}:${quizKey}`;
      if (quizOutcomeSentRef.current.has(ouKey)) continue;
      const syncKey = `quiz:${ouKey}`;
      if (progressSyncInFlightRef.current.has(syncKey)) continue;
      progressSyncInFlightRef.current.add(syncKey);
      const answers = questions
        .map((q, idx) => ({ q, idx }))
        .filter(
          ({ q }) =>
            (String(q.quizKey || q.quizTitle || 'quiz').trim() || 'quiz') === quizKey
        )
        .map(({ idx }) => {
          const qState = formationViewerQuizState[`${slide.key}-q${idx}`];
          return qState?.selected ?? -1;
        });
      void axios
        .post(`${base}/training_journeys/quiz/submit`, {
          repId,
          courseId: selectedJourneyId,
          moduleId,
          quizId: stats.quizId,
          answers,
        })
        .then(async () => {
          quizOutcomeSentRef.current.add(ouKey);
          await Promise.all([
            fetchTrainingProgressRows(),
            fetchSlideProgressSummary(),
            fetchStructuredProgress(selectedJourneyId),
          ]);
        })
        .catch((err: unknown) => {
          const st = (err as { response?: { status?: number } })?.response?.status;
          if (st === 403 || st === 409) {
            quizOutcomeSentRef.current.add(ouKey);
          }
        })
        .finally(() => {
          progressSyncInFlightRef.current.delete(syncKey);
        });
    }
  }, [
    repId,
    selectedJourneyId,
    selectedJourney,
    currentFormationViewerSlide,
    formationViewerQuizState,
    isCurrentQuizFullyAnswered,
    fetchTrainingProgressRows,
    fetchSlideProgressSummary,
    fetchStructuredProgress,
  ]);

  const activeQuizTimerCtx = useMemo(() => {
    const slide = currentFormationViewerSlide;
    if (!slide || slide.kind !== 'quiz_group') return null;
    const total = slide.questions.length;
    const page = Math.min(Math.max(0, formationViewerQuizPage[slide.key] ?? 0), Math.max(0, total - 1));
    const qk = `${slide.key}-q${page}`;
    return { slide, page, qk, total };
  }, [currentFormationViewerSlide, formationViewerQuizPage]);

  const activeQuizQuestionLocked = activeQuizTimerCtx
    ? !!formationViewerQuizState[activeQuizTimerCtx.qk]?.locked
    : false;

  const restartQuizSlide = useCallback((slide: any) => {
    const slideKey = String(slide?.key || '');
    if (!slideKey) return;
    quizTimerSlideRef.current = null;
    setFormationViewerQuizPage((prev) => ({ ...prev, [slideKey]: 0 }));
    setQuizSlideWrongStrikes((prev) => ({
      ...prev,
      [slideKey]: Math.min(maxQuizAttemptsForFormationSlide(slide), (prev[slideKey] ?? 0) + 1),
    }));
    setFormationViewerQuizState((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${slideKey}-q`)) delete next[k];
      });
      return next;
    });
    setQuizQuestionCountdownSec((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${slideKey}-q`)) delete next[k];
      });
      return next;
    });
    if (selectedJourneyId && selectedJourney) {
      const modules = extractModules(selectedJourney);
      const mod = modules[slide.moduleIndex];
      const moduleId =
        normalizeMongoId((mod as any)?._id) ||
        normalizeMongoId((mod as any)?.id) ||
        String(slide.moduleIndex);
      if (moduleId && /^[a-f\d]{24}$/i.test(moduleId)) {
        const quizKeys = Array.from(
          new Set(
            (Array.isArray(slide.questions) ? slide.questions : [])
              .map((q: any) => String(q?.quizKey || q?.quizTitle || '').trim())
              .filter(Boolean)
          )
        );
        quizKeys.forEach((quizKey) => {
          quizOutcomeSentRef.current.delete(`${selectedJourneyId}:${moduleId}:${quizKey}`);
        });
        const quizIds = new Set(
          (Array.isArray(slide.questions) ? slide.questions : [])
            .map((q: any) => {
              const id =
                (q?.quizId && /^[a-f\d]{24}$/i.test(String(q.quizId)) ? String(q.quizId) : '') ||
                (/^[a-f\d]{24}$/i.test(String(q?.quizKey || '')) ? String(q.quizKey) : '');
              return id;
            })
            .filter(Boolean)
        );
        quizIds.forEach((qid) => {
          quizStartSentRef.current.delete(`${selectedJourneyId}:${moduleId}:${qid}`);
        });
      }
    }
    if (slide?.kind === 'quiz_group') {
      void requestQuizStartForSlide(slide, { ignoreSentRef: true });
    }
  }, [selectedJourney, selectedJourneyId, requestQuizStartForSlide]);

  useEffect(() => {
    if (!activeQuizTimerCtx || activeQuizQuestionLocked) return;
    const { slide, page, qk, total } = activeQuizTimerCtx;
    quizTimerSlideRef.current = { qk };
    const endAt = Date.now() + 40000;
    const id = window.setInterval(() => {
      if (quizTimerSlideRef.current?.qk !== qk) return;
      const rem = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setQuizQuestionCountdownSec((m) => ({ ...m, [qk]: rem }));
      if (rem > 0) return;
      window.clearInterval(id);
      if (quizTimerSlideRef.current?.qk !== qk) return;
      const cq = slide.questions[page];
      setQuizSlideWrongStrikes((prev) => ({
        ...prev,
        [slide.key]: Math.min(3, (prev[slide.key] ?? 0) + 1),
      }));
      setFormationViewerQuizState((prev) => ({
        ...prev,
        [qk]: { selected: null, revealed: true, locked: true, timedOut: true },
      }));
      void syncQuizDuration(slide.moduleIndex, cq ? { quizKey: cq.quizKey, quizId: cq.quizId } : undefined);
      window.setTimeout(() => {
        setFormationViewerQuizPage((prev) => {
          const cur = Math.min(Math.max(0, prev[slide.key] ?? 0), Math.max(0, total - 1));
          if (cur < total - 1) return { ...prev, [slide.key]: cur + 1 };
          return prev;
        });
      }, 650);
    }, 400);
    return () => {
      window.clearInterval(id);
    };
  }, [activeQuizTimerCtx, activeQuizQuestionLocked, syncQuizDuration]);

  return (
    <div className={selectedJourney ? 'w-full h-[calc(100vh-120px)]' : 'space-y-6 w-full'}>
      {!selectedJourney && (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Training</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Trainings linked to gigs you are enrolled in, plus journeys your company assigned to you
            directly.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[280px] sm:items-end">
          <div className="flex items-center gap-2 rounded-xl bg-harx-500/10 border border-harx-500/20 px-4 py-2 text-harx-700 self-start sm:self-end">
            <BookOpen className="w-5 h-5 shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest">My gigs & paths</span>
          </div>
          <div className="w-full sm:w-auto">
            <label
              htmlFor="training-gig-filter"
              className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              Enrolled gig (Marketplace)
            </label>
            <div className="relative">
              <select
                id="training-gig-filter"
                value={gigFilter}
                onChange={(e) => setGigFilter(e.target.value)}
                disabled={loading}
                className="w-full min-w-[260px] appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-gray-800 shadow-sm transition-colors focus:border-harx-500 focus:outline-none focus:ring-2 focus:ring-harx-500/20 disabled:cursor-wait disabled:opacity-70"
              >
                <option value="__all__">
                  {enrolledGigs.length === 0 && !loading
                    ? 'No enrolled gigs'
                    : 'All enrolled gigs'}
                </option>
                {enrolledGigs.map((g) => (
                  <option key={g.gigId} value={g.gigId}>
                    {g.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
            {gigFilter !== '__all__' && selectedGigTitle && !listLoading && (
              <p className="mt-2 text-xs font-semibold text-harx-700">
                Showing trainings for: <span className="text-gray-900">{selectedGigTitle}</span>
              </p>
            )}
            {enrolledGigs.length === 0 && !loading && !error && (
              <p className="mt-2 text-xs text-amber-700 font-medium">
                No enrolled gigs from the matching API — check the Marketplace or your connection.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Barre d'onglets : Formations / Certifications */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTrainingTab('trainings')}
          className={`relative flex items-center gap-2 px-4 py-3 text-sm font-black tracking-tight transition-colors ${
            trainingTab === 'trainings' ? 'text-harx-700' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Formations
          {displayJourneys.length > 0 && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              trainingTab === 'trainings' ? 'bg-harx-500/15 text-harx-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {displayJourneys.length}
            </span>
          )}
          {trainingTab === 'trainings' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-harx-500 rounded-full" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTrainingTab('certifications')}
          className={`relative flex items-center gap-2 px-4 py-3 text-sm font-black tracking-tight transition-colors ${
            trainingTab === 'certifications' ? 'text-harx-700' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Award className="w-4 h-4" />
          Certifications
          {completedJourneys.length > 0 && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              trainingTab === 'certifications' ? 'bg-harx-500/15 text-harx-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {completedJourneys.length}
            </span>
          )}
          {trainingTab === 'certifications' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-harx-500 rounded-full" />
          )}
        </button>
      </div>

      {trainingTab === 'trainings' && (
      <>
      {!selectedJourney &&
        gigFilter !== '__all__' &&
        slideProgressSummary &&
        slideProgressSummary.trainingCount > 0 && (
          <div className="rounded-2xl border border-harx-200 bg-gradient-to-br from-harx-50/90 to-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-harx-600">
              Progression (formations du gig)
            </p>
            {selectedGigTitle ? (
              <p className="mt-1 text-xs font-semibold text-gray-600 truncate">{selectedGigTitle}</p>
            ) : null}
            <p className="mt-2 text-2xl font-black text-gray-900 tabular-nums">
              {slideProgressSummary.overallPercent} %
            </p>
          </div>
        )}

      {listLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin text-harx-500" />
          <span className="font-medium">
            {gigFilter !== '__all__' && gigFetchLoading
              ? 'Loading trainings for this gig…'
              : 'Loading trainings…'}
          </span>
        </div>
      )}

      {!listLoading && error && (
        <div className="flex gap-3 rounded-2xl border border-red-100 bg-red-50/80 p-4 text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {!listLoading && !error && gigFilter === '__all__' && journeys.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center text-gray-500">
          <p className="font-medium">No trainings found for your enrolled gigs.</p>
          <p className="text-sm mt-2">
            Enrolling in a gig does not create a training by itself: the company must publish a
            training for that gig (status active, rehearsal, or completed). The list can stay empty
            even if the Marketplace shows “Enrolled”.
          </p>
        </div>
      )}

      {!listLoading && !error && gigFilter !== '__all__' && displayJourneys.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center text-gray-500">
          <p className="font-medium">No trainings for this gig yet.</p>
          {gigFetchOutcome?.gigId === gigFilter && gigFetchOutcome.kind === 'ok' ? (
            <p className="text-sm mt-2">
              The training service responded successfully but has no published journeys for this
              gig. Your org may still be preparing content, the journey may still be in draft, or
              the journey may be linked to a different gig id than the one in the Marketplace.
              All journeys linked to this gig are shown, including draft/not published.
            </p>
          ) : gigFetchOutcome?.gigId === gigFilter && gigFetchOutcome.kind === 'not_found' ? (
            <p className="text-sm mt-2">
              The training API returned 404 for{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                GET /training_journeys/gig/:gigId
              </code>
              . Deploy the latest training backend or verify API routing and the base URL in{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">VITE_TRAINING_*</code>.
            </p>
          ) : gigFetchOutcome?.gigId === gigFilter && gigFetchOutcome.kind === 'error' ? (
            <p className="text-sm mt-2">
              Could not reach the training API for this gig (network error, CORS, or missing auth).
              Check your connection, sign in again, and confirm{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">VITE_TRAINING_*</code>{' '}
              points at the training service.
            </p>
          ) : (
            <p className="text-sm mt-2">
              Select the gig again or refresh the page. If this persists, verify the training API URL
              and that you are signed in.
            </p>
          )}
        </div>
      )}

      {!listLoading && !error && displayJourneys.length > 0 && (
        <ul className="space-y-4">
          {displayJourneys.map((j) => {
            const id = journeyKey(j);
            const gig = gigLabel(j);
            const status = String(j.status || '—');
            const slides = extractSlides(j);
            const progress = id ? progressByJourney[id] : undefined;
            const engagement = Number(progress?.engagementScore);
            const storedCoursePct = Number(progress?.progressPercentage);
            const engagementPercent =
              Number.isFinite(storedCoursePct) && storedCoursePct > 0
                ? Math.min(100, Math.round(storedCoursePct))
                : Number.isFinite(engagement)
                  ? Math.min(100, Math.round(engagement))
                  : 0;
            const slideRow =
              id && slideProgressSummary?.journeys
                ? slideProgressSummary.journeys.find((x) => x.journeyId === id)
                : undefined;
            const progressTotal =
              slideRow && Number(slideRow.totalUnits) > 0
                ? Number(slideRow.totalUnits)
                : slideRow && slideRow.slidesTotal > 0
                  ? slideRow.slidesTotal
                  : Number(progress?.moduleTotal) > 0
                    ? Number(progress?.moduleTotal)
                    : slides.length;
            let useCoursePercentForBar = false;
            let progressDone =
              slideRow && Number(slideRow.completedUnits) >= 0
                ? Number(slideRow.completedUnits)
                : slideRow?.slidesSeen ?? 0;
            if (!slideRow && progressTotal > 0) {
              const modulesDone = Number(progress?.moduleFinished ?? 0);
              if (modulesDone > 0) {
                progressDone = Math.min(progressTotal, modulesDone);
              } else if (engagementPercent > 0) {
                /** `progressTotal` est souvent le nombre de modules (ex. 7) : (7/100)*7 arrondit à 0 — le % formation est déjà 0–100. */
                useCoursePercentForBar = true;
              } else {
                progressDone = 0;
              }
            }
            let slidePercent = useCoursePercentForBar
              ? engagementPercent
              : progressTotal > 0
                ? Math.min(100, Math.round((progressDone / progressTotal) * 100))
                : engagementPercent > 0
                  ? engagementPercent
                  : 0;
            if (!useCoursePercentForBar && slidePercent === 0 && engagementPercent > 0) {
              slidePercent = engagementPercent;
            }
            const showProgressFigure = progressTotal > 0 || slidePercent > 0 || engagementPercent > 0;
            const isCompleted =
              slidePercent >= 100 ||
              (id ? structuredProgressByJourney[id]?.status === 'completed' : false) ||
              Number(progress?.progressPercentage) >= 100;
            return (
              <li
                key={id || journeyTitle(j)}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="font-black text-gray-900 truncate">{journeyTitle(j)}</h2>
                  {j.description ? (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{String(j.description)}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
                      {status}
                    </span>
                    {gig ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-harx-500/10 text-harx-700 flex items-center gap-1 max-w-full">
                        <Briefcase className="w-3 h-3 shrink-0" />
                        <span className="truncate">{gig}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-gray-500">
                      <span>Progress</span>
                      <span className="tabular-nums">
                        {showProgressFigure ? `${slidePercent}%` : '—'}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-harx-500 transition-[width]"
                        style={{ width: `${showProgressFigure ? slidePercent : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex gap-2">
                  <button
                    type="button"
                    disabled={!id}
                    onClick={() => {
                      if (!id) return;
                      const slideCount = viewerSlideCountFromJourney(j);
                      const fromSummary =
                        slideRow != null &&
                        typeof slideRow.currentSlideIndex === 'number' &&
                        Number.isFinite(slideRow.currentSlideIndex)
                          ? slideRow.currentSlideIndex
                          : undefined;
                      const fromProgress =
                        progress != null &&
                        typeof progress.currentSlideIndex === 'number' &&
                        Number.isFinite(progress.currentSlideIndex)
                          ? progress.currentSlideIndex
                          : undefined;
                      const persisted =
                        typeof fromSummary === 'number'
                          ? fromSummary
                          : typeof fromProgress === 'number'
                            ? fromProgress
                            : undefined;
                      const resumeAt = mergeFormationResumeWithPersisted(
                        j,
                        progress,
                        slideCount,
                        persisted,
                        engagementPercent
                      );
                      setFormationViewerSlideIndex(resumeAt);
                      setSelectedJourneyId(id);
                      setActiveSlide(resumeAt);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-harx-600 text-white px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-harx-700 transition-colors disabled:opacity-40"
                  >
                    Continue
                  </button>
                  {isCompleted && (
                    <button
                      type="button"
                      onClick={() => openCertificate(j)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-harx-200 bg-harx-50 text-harx-700 px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-harx-100 transition-colors"
                    >
                      <Award className="w-4 h-4" />
                      Certificat
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      </>
      )}

      {trainingTab === 'certifications' && (
      <>
      {!listLoading && !error && completedJourneys.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 shadow-sm text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-harx-500/10 flex items-center justify-center">
            <Award className="w-7 h-7 text-harx-500" />
          </div>
          <h3 className="text-lg font-black text-gray-900">Aucune certification pour le moment</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            Terminez une formation à 100&nbsp;% pour débloquer votre certificat. Vos certifications
            apparaîtront ici.
          </p>
          <button
            type="button"
            onClick={() => setTrainingTab('trainings')}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-harx-600 text-white px-5 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-harx-700 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Voir mes formations
          </button>
        </div>
      )}

      {!listLoading && !error && completedJourneys.length > 0 && (
        <section>
          <p className="text-sm text-gray-500 mb-4">
            Formations complétées à 100&nbsp;%. Consultez ou téléchargez vos certificats.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {completedJourneys.map((j) => {
              const id = journeyKey(j);
              const gig = gigLabel(j);
              return (
                <li
                  key={`cert-${id || journeyTitle(j)}`}
                  className="group relative overflow-hidden rounded-2xl border border-harx-100 bg-gradient-to-br from-harx-50/80 to-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-harx-500/10 blur-2xl" />
                  <div className="relative flex items-start gap-3">
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-tr from-harx-500 to-harx-alt-500 flex items-center justify-center shadow-sm">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-gray-900 leading-tight line-clamp-2">{journeyTitle(j)}</h3>
                      {gig ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-harx-700 max-w-full">
                          <Briefcase className="w-3 h-3 shrink-0" />
                          <span className="truncate">{gig}</span>
                        </span>
                      ) : null}
                      <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Validé · 100%
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCertificate(j)}
                    className="relative mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-harx-500 via-harx-alt-500 to-harx-alt-600 text-white px-4 py-2.5 text-xs font-black uppercase tracking-widest hover:-translate-y-0.5 transition-transform shadow-sm"
                  >
                    <Award className="w-4 h-4" />
                    Voir le certificat
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      </>
      )}
        </>
      )}

      {!listLoading && !error && selectedJourney && (
        <div className="h-full overflow-hidden rounded-2xl border border-harx-100 bg-white shadow-sm">
          <div className="flex h-full min-h-0 flex-col" style={{ background: viewerThemeTokens.shellBg }}>
            <div
              className="flex flex-wrap items-center gap-2 border-b px-3 py-2 sm:flex-nowrap sm:gap-3 sm:px-4 sm:py-2.5"
              style={{
                borderColor: viewerThemeTokens.accentBorder,
                background:
                  'linear-gradient(180deg, rgba(7,10,30,0.96) 0%, rgba(10,15,45,0.88) 100%)',
              }}
            >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJourneyId(null);
                    void fetchSlideProgressSummary();
                  }}
                  className="rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-100 transition hover:-translate-y-0.5"
                  style={{
                    borderColor: viewerThemeTokens.accentBorder,
                    background: viewerThemeTokens.cardBg,
                    boxShadow: viewerThemeTokens.accentShadow,
                  }}
                >
                  Back to list
                </button>
                <h3 className="min-w-0 flex-1 truncate text-sm font-black text-white">
                  {journeyTitle(selectedJourney)}
                </h3>
                <div className="ml-auto grid w-full grid-cols-2 gap-2 sm:w-auto">
                  <div
                    className="rounded-xl border px-2.5 py-1.5 sm:px-3"
                    style={{
                      borderColor: viewerThemeTokens.accentBorder,
                      background: viewerThemeTokens.cardBg,
                      boxShadow: viewerThemeTokens.accentShadow,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5 text-slate-200" />
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-300">
                        Timer total
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs font-extrabold text-white">{formationTimerLabel}</p>
                  </div>
                  <div
                    className="rounded-xl border px-2.5 py-1.5 sm:px-3"
                    style={{
                      borderColor: viewerThemeTokens.accentBorder,
                      background: viewerThemeTokens.cardBg,
                      boxShadow: viewerThemeTokens.accentShadow,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-slate-200" />
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-300">
                        Timer module
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs font-extrabold text-white">{moduleTimerLabel}</p>
                  </div>
                </div>
              </div>
              <div
                className="relative flex-1 overflow-y-auto p-4 md:p-5"
                style={{ background: viewerThemeTokens.contentBg }}
              >
                {(() => {
                  if (!currentFormationViewerSlide) return <p className="text-sm text-slate-300">Aucun module.</p>;
                  return (
                    <div className="mx-auto w-full max-w-5xl">
                      {currentFormationViewerSlide.kind === 'overview' ? (
                        <div
                          className="rounded-3xl border p-4 sm:p-6"
                          style={{
                            borderColor: viewerThemeTokens.accentBorder,
                            background: viewerThemeTokens.panelBg,
                            boxShadow: viewerThemeTokens.accentShadow,
                          }}
                        >
                          <div
                            className="rounded-2xl border p-4 backdrop-blur-sm sm:p-5"
                            style={{
                              borderColor: viewerThemeTokens.accentBorder,
                              background: 'linear-gradient(90deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))',
                            }}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-harx-300">
                                  HARX Training
                                </p>
                                <h3 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                                  {journeyTitle(selectedJourney)}
                                </h3>
                              </div>
                              <span
                                className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold text-white"
                                style={{
                                  borderColor: moduleColorStyles[0].chipBorder,
                                  background: moduleColorStyles[0].chipBg,
                                }}
                              >
                                {currentFormationViewerSlide.modules.length} modules
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-300">
                              Choisissez un module pour afficher son contenu organise par sections.
                            </p>
                          </div>
                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {(() => {
                              const ovStructured = selectedJourneyId
                                ? structuredProgressByJourney[selectedJourneyId]
                                : undefined;
                              const ovRow = selectedJourneyId ? progressByJourney[selectedJourneyId] : undefined;
                              return currentFormationViewerSlide.modules.map((mod) => {
                              const moduleTheme =
                                moduleColorStyles[mod.moduleIndex % moduleColorStyles.length];
                              const modLocked =
                                selectedJourney &&
                                isOverviewModuleCardLocked(
                                  mod.moduleIndex,
                                  selectedJourney,
                                  ovStructured,
                                  ovRow
                                );
                              return (
                                <div
                                  key={`overview-mod-${mod.moduleIndex}`}
                                  className={`rounded-2xl border p-3 shadow-[0_10px_35px_-20px_rgba(236,72,153,0.35)] transition-all duration-300 ${
                                    modLocked ? 'opacity-45 saturate-0' : 'hover:-translate-y-0.5'
                                  }`}
                                  style={{
                                    borderColor: moduleTheme.border,
                                    background: viewerThemeTokens.cardBg,
                                    boxShadow: moduleTheme.glow,
                                  }}
                                >
                                  <button
                                    type="button"
                                    disabled={!!modLocked}
                                    onClick={() => jumpToFormationSlide(`m${mod.moduleIndex}-intro`)}
                                    className={`group flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-white shadow-sm transition ${
                                      modLocked ? 'cursor-not-allowed' : 'hover:brightness-105'
                                    }`}
                                    style={{ background: moduleTheme.accentBg }}
                                  >
                                    <span className="min-w-0">
                                      <span className="block text-[10px] font-bold uppercase tracking-wider text-white/90">
                                        Module {mod.moduleIndex + 1}
                                      </span>
                                      <span className="mt-0.5 block truncate text-sm font-semibold">{mod.title}</span>
                                    </span>
                                    <span className="inline-flex shrink-0 items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                                      {modLocked ? 'Verrouillé' : 'Ouvrir'}
                                    </span>
                                  </button>
                                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
                                    <span>{mod.sections.length} section(s)</span>
                                  </div>
                                  <p
                                    className="mt-2 rounded-lg border border-dashed px-2.5 py-2 text-xs text-slate-300"
                                    style={{ borderColor: moduleTheme.border, background: moduleTheme.softBg }}
                                  >
                                    Cliquez sur le module pour voir les sections.
                                  </p>
                                </div>
                              );
                            });
                            })()}
                          </div>
                        </div>
                      ) : currentFormationViewerSlide.kind === 'module_intro' ? (
                        (() => {
                          const mod = currentFormationViewerSlide.mod;
                          const moduleTheme =
                            moduleColorStyles[
                              currentFormationViewerSlide.moduleIndex % moduleColorStyles.length
                            ];
                          const sections = Array.isArray(mod?.sections) ? mod.sections : [];
                          const sectionCount = sections.length;
                          const desc = String(mod?.description || '').trim();
                          const showFullDescription = sectionCount === 0 && !!desc;
                          const introStructured = selectedJourneyId
                            ? structuredProgressByJourney[selectedJourneyId]
                            : undefined;
                          const introRow = selectedJourneyId ? progressByJourney[selectedJourneyId] : undefined;
                          return (
                            <div
                              className="rounded-3xl border bg-[#0b1025]/90 p-5 sm:p-7"
                              style={{ borderColor: moduleTheme.border, boxShadow: moduleTheme.glow }}
                            >
                              <p
                                className="mb-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold text-white"
                                style={{ borderColor: moduleTheme.chipBorder, background: moduleTheme.chipBg }}
                              >
                                Module {currentFormationViewerSlide.moduleIndex + 1} /{' '}
                                {currentFormationViewerSlide.totalModules}
                              </p>
                              <h3 className="mb-3 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                                {String(mod?.title || 'Module')}
                              </h3>
                              {showFullDescription ? (
                                <div className="prose prose-sm max-w-none text-slate-200">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{desc}</ReactMarkdown>
                                </div>
                              ) : sectionCount > 0 ? (
                                <>
                                  <p className="text-sm leading-relaxed text-slate-300">
                                    Contenu du module par sections.
                                  </p>
                                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {sections.map((sec: any, si: number) => {
                                      const sectionTitle = String(sec?.title || `Section ${si + 1}`).trim();
                                      const rawContent = String(sec?.content || '').trim();
                                      const preview = rawContent
                                        .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
                                        .replace(/[*_`#>-]/g, '')
                                        ? rawContent
                                            .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
                                            .replace(/[*_`#>-]/g, '')
                                            .replace(/\s+/g, ' ')
                                            .slice(0, 170)
                                            .trim()
                                        : '';
                                      const secLocked =
                                        !!selectedJourney &&
                                        isModuleIntroSectionNavigationLocked(
                                          currentFormationViewerSlide.moduleIndex,
                                          si,
                                          selectedJourney,
                                          introStructured,
                                          introRow
                                        );
                                      return (
                                        <button
                                          key={`module-intro-sec-${currentFormationViewerSlide.moduleIndex}-${si}`}
                                          type="button"
                                          disabled={secLocked}
                                          onClick={() =>
                                            jumpToFormationSlide(`m${currentFormationViewerSlide.moduleIndex}-s${si}`)
                                          }
                                          className={`w-full rounded-2xl border p-3 text-left transition-all duration-300 ${
                                            secLocked
                                              ? 'cursor-not-allowed opacity-45 saturate-0'
                                              : 'hover:-translate-y-0.5'
                                          }`}
                                          style={{
                                            borderColor: moduleTheme.border,
                                            background: viewerThemeTokens.cardBg,
                                            boxShadow: moduleTheme.glow,
                                          }}
                                        >
                                          <div className="flex items-start gap-2">
                                            <span
                                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white ring-1"
                                              style={{
                                                background: moduleTheme.chipBg,
                                                borderColor: moduleTheme.chipBorder,
                                              }}
                                            >
                                              {si + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                              <p className="truncate text-sm font-semibold text-white">{sectionTitle}</p>
                                              {preview ? (
                                                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                                                  {preview}
                                                  {rawContent.length > 170 ? '…' : ''}
                                                </p>
                                              ) : (
                                                <p className="mt-1 text-xs text-slate-400">
                                                  Aucun contenu texte pour cette section.
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-slate-300">Pas de description pour ce module.</p>
                              )}
                            </div>
                          );
                        })()
                      ) : currentFormationViewerSlide.kind === 'section' ? (
                        (() => {
                          const cfs = currentFormationViewerSlide;
                          const moduleTheme =
                            moduleColorStyles[cfs.moduleIndex % moduleColorStyles.length];
                          const sectionMdComponents: Components = {
                            p: ({ children }) => (
                              <p className="mb-3 text-[15px] leading-7 text-slate-200 last:mb-0">{children}</p>
                            ),
                            ul: ({ children }) => (
                              <ul
                                className="mb-3 space-y-2 rounded-xl border p-3 last:mb-0"
                                style={{ borderColor: moduleTheme.border, background: moduleTheme.softBg }}
                              >
                                {children}
                              </ul>
                            ),
                            li: ({ children }) => (
                              <li className="flex items-start gap-2 text-[14px] leading-6 text-slate-200">
                                <span
                                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ background: moduleTheme.chipBorder }}
                                />
                                <span className="flex-1">{children}</span>
                              </li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-white">{children}</strong>
                            ),
                            h1: ({ children }) => (
                              <h4 className="mb-2 mt-4 text-xl font-bold text-white first:mt-0">{children}</h4>
                            ),
                            h2: ({ children }) => (
                              <h5 className="mb-2 mt-4 text-lg font-bold text-white first:mt-0">{children}</h5>
                            ),
                            h3: ({ children }) => (
                              <h6 className="mb-2 mt-4 text-base font-bold text-white first:mt-0">{children}</h6>
                            ),
                            table: ({ children }) => (
                              <div
                                className="my-3 overflow-x-auto rounded-xl border"
                                style={{ borderColor: moduleTheme.border, background: viewerThemeTokens.cardBg }}
                              >
                                <table className="min-w-full border-collapse text-sm">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => (
                              <thead style={{ background: moduleTheme.softBg }}>{children}</thead>
                            ),
                            tbody: ({ children }) => <tbody>{children}</tbody>,
                            tr: ({ children }) => (
                              <tr className="align-top even:bg-white/5">{children}</tr>
                            ),
                            th: ({ children }) => (
                              <th
                                className="border-b px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-white"
                                style={{ borderColor: moduleTheme.border }}
                              >
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td
                                className="border-b px-3 py-2 text-[13px] leading-6 text-slate-200"
                                style={{ borderColor: moduleTheme.border }}
                              >
                                {children}
                              </td>
                            ),
                          };
                          return (
                            <div
                              className="rounded-3xl border bg-[#0b1025]/90 p-5 sm:p-7"
                              style={{
                                borderColor: moduleTheme.border,
                                boxShadow: moduleTheme.glow,
                              }}
                            >
                              <p
                                className="mb-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold text-white"
                                style={{
                                  borderColor: moduleTheme.chipBorder,
                                  background: moduleTheme.chipBg,
                                }}
                              >
                                {cfs.modTitle}
                              </p>
                              <h3 className="mb-3 text-lg font-bold text-white sm:text-xl">
                                {String(cfs.section?.title || 'Section')}
                              </h3>
                              {String(cfs.section?.content || '').trim() ? (
                                <div
                                  className="rounded-2xl border p-4"
                                  style={{
                                    borderColor: moduleTheme.border,
                                    background: viewerThemeTokens.cardBg,
                                    boxShadow: moduleTheme.glow,
                                  }}
                                >
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={sectionMdComponents}>
                                    {String(cfs.section.content)}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-300">Contenu vide.</p>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        (() => {
                          const slide = currentFormationViewerSlide;
                          const totalQuestions = slide.questions.length;
                          const page = Math.min(
                            Math.max(formationViewerQuizPage[slide.key] ?? 0, 0),
                            Math.max(0, totalQuestions - 1)
                          );
                          const currentQuestion = slide.questions[page];
                          const q = currentQuestion?.question;
                          const opts = Array.isArray(q?.options) ? q.options : [];
                          const qKey = `${slide.key}-q${page}`;
                          const qState = formationViewerQuizState[qKey] || {
                            selected: null as number | null,
                            revealed: false,
                            locked: false,
                          };
                          const modules = extractModules(selectedJourney || ({} as JourneyRow));
                          const mod = modules[slide.moduleIndex];
                          const moduleId =
                            normalizeMongoId((mod as any)?._id) ||
                            normalizeMongoId((mod as any)?.id) ||
                            String(slide.moduleIndex);
                          const journeyProgress = selectedJourneyId ? progressByJourney[selectedJourneyId] : undefined;
                          const moduleProgressAny =
                            moduleId && journeyProgress?.modules && typeof journeyProgress.modules === 'object'
                              ? (journeyProgress.modules as Record<string, any>)[moduleId]
                              : undefined;
                          const quizProgressRows = Array.isArray(moduleProgressAny?.quizProgress)
                            ? moduleProgressAny.quizProgress
                            : [];
                          const activeQuizKeys = new Set(
                            (Array.isArray(slide.questions) ? slide.questions : [])
                              .map((qq: any) => String(qq?.quizKey || '').trim())
                              .filter(Boolean)
                          );
                          const backendAttempts = quizProgressRows.reduce((acc: number, row: any) => {
                            if (!activeQuizKeys.has(String(row?.quizKey || '').trim())) return acc;
                            return Math.max(acc, Number(row?.attempts || 0));
                          }, 0);
                          const maxAttemptsFromApi = quizProgressRows.reduce((acc: number, row: any) => {
                            if (!activeQuizKeys.has(String(row?.quizKey || '').trim())) return acc;
                            return Math.max(acc, Number(row?.maxAttempts || 0));
                          }, 0);
                          const quizMaxCap = Math.max(
                            1,
                            maxAttemptsFromApi || maxQuizAttemptsForFormationSlide(slide)
                          );
                          const lockedUntilTs = quizProgressRows.reduce((acc: number, row: any) => {
                            if (!activeQuizKeys.has(String(row?.quizKey || '').trim())) return acc;
                            const ts = Date.parse(String(row?.lockedUntil || ''));
                            return Number.isFinite(ts) ? Math.max(acc, ts) : acc;
                          }, 0);
                          const moduleLockRemainingMs = Math.max(0, lockedUntilTs - Date.now());
                          const moduleLockedByCooldown = moduleLockRemainingMs > 0;
                          const quizAttemptsBlocked =
                            !isCurrentQuizPassed &&
                            (moduleLockedByCooldown || backendAttempts >= quizMaxCap);
                          const moduleStrikes = Math.min(
                            quizMaxCap,
                            Math.max(quizSlideWrongStrikes[slide.key] ?? 0, backendAttempts)
                          );
                          const countdown =
                            qState.locked || qState.revealed
                              ? 0
                              : Math.max(0, quizQuestionCountdownSec[qKey] ?? 40);
                          const correctIdx =
                            typeof currentQuestion?.correctAnswer === 'number'
                              ? currentQuestion.correctAnswer
                              : 0;
                          const isCorrect =
                            qState.revealed &&
                            !qState.timedOut &&
                            qState.selected !== null &&
                            qState.selected === correctIdx;
                          const isWrong =
                            qState.revealed &&
                            !qState.timedOut &&
                            qState.selected !== null &&
                            qState.selected !== correctIdx;
                          return (
                            <div className="rounded-3xl border border-harx-500/30 bg-[#0b1025]/90 p-5 shadow-[0_20px_70px_-25px_rgba(236,72,153,0.4)] sm:p-7">
                              <p className="mb-2 inline-flex rounded-full border border-harx-400/40 bg-harx-500/20 px-2.5 py-1 text-xs font-semibold text-harx-100">
                                {currentQuestion?.quizTitle || `Quiz module ${slide.moduleIndex + 1}`}
                              </p>
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="rounded-full border border-harx-400/35 bg-[#12172f] px-2.5 py-1 font-semibold text-harx-100">
                                  Question {page + 1} / {totalQuestions}
                                </span>
                                <span className="rounded-full border border-harx-400/35 bg-[#12172f] px-2.5 py-1 font-semibold text-harx-100">
                                  Essais (soumissions): {moduleStrikes} / {quizMaxCap}
                                </span>
                                <span className="rounded-full border border-amber-400/35 bg-[#12172f] px-2.5 py-1 font-semibold text-amber-100">
                                  {moduleLockedByCooldown
                                    ? `Cooldown ${Math.ceil(moduleLockRemainingMs / 60000)}m`
                                    : qState.locked
                                      ? '—'
                                      : `${countdown}s`}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => restartQuizSlide(slide)}
                                    disabled={quizAttemptsBlocked}
                                    className="rounded-lg border border-amber-400/40 bg-[#12172f] px-2.5 py-1 font-semibold text-amber-100 transition hover:border-amber-300/70"
                                  >
                                    Refaire quiz
                                  </button>
                                  <button
                                    type="button"
                                    disabled={page <= 0}
                                    onClick={() =>
                                      setFormationViewerQuizPage((prev) => ({
                                        ...prev,
                                        [slide.key]: Math.max(0, (prev[slide.key] ?? 0) - 1),
                                      }))
                                    }
                                    className="rounded-lg border border-harx-500/30 bg-[#12172f] px-2.5 py-1 font-semibold text-slate-200 transition hover:border-harx-400/60 disabled:opacity-40"
                                  >
                                    Précédente
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      page >= totalQuestions - 1 ||
                                      !formationViewerQuizState[`${slide.key}-q${page}`]?.locked
                                    }
                                    onClick={() =>
                                      setFormationViewerQuizPage((prev) => ({
                                        ...prev,
                                        [slide.key]: Math.min(
                                          totalQuestions - 1,
                                          (prev[slide.key] ?? 0) + 1
                                        ),
                                      }))
                                    }
                                    className="rounded-lg border border-harx-400/40 bg-gradient-to-r from-harx-600/85 to-harx-alt-500/85 px-2.5 py-1 font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                                  >
                                    Suivante
                                  </button>
                                </div>
                              </div>
                              <p className="mb-4 text-base font-semibold text-white sm:text-lg">
                                {String(q?.question || '')}
                              </p>
                              <div className="space-y-2" role="radiogroup" aria-label="Réponses">
                                {opts.map((op: string, oi: number) => {
                                  const selected = qState.selected === oi;
                                  const showAsCorrect = qState.revealed && oi === correctIdx;
                                  const wrongSelected =
                                    qState.revealed &&
                                    !qState.timedOut &&
                                    qState.selected === oi &&
                                    oi !== correctIdx;
                                  return (
                                    <button
                                      key={oi}
                                      type="button"
                                      disabled={
                                        qState.revealed || qState.locked || moduleLockedByCooldown || quizAttemptsBlocked
                                      }
                                      aria-disabled={moduleLockedByCooldown || quizAttemptsBlocked}
                                      onClick={() => {
                                        if (
                                          qState.revealed ||
                                          qState.locked ||
                                          moduleLockedByCooldown ||
                                          quizAttemptsBlocked
                                        )
                                          return;
                                        const wrong = oi !== correctIdx;
                                        if (wrong) {
                                          setQuizSlideWrongStrikes((prev) => ({
                                            ...prev,
                                            [slide.key]: Math.min(quizMaxCap, (prev[slide.key] ?? 0) + 1),
                                          }));
                                        }
                                        setFormationViewerQuizState((prev) => ({
                                          ...prev,
                                          [qKey]: {
                                            selected: oi,
                                            revealed: true,
                                            locked: true,
                                          },
                                        }));
                                        void syncQuizDuration(slide.moduleIndex, {
                                          quizKey: currentQuestion.quizKey,
                                          quizId: currentQuestion.quizId,
                                        });
                                        const delay = wrong ? 850 : 450;
                                        window.setTimeout(() => {
                                          setFormationViewerQuizPage((prev) => {
                                            const cur = Math.min(
                                              Math.max(0, prev[slide.key] ?? 0),
                                              Math.max(0, totalQuestions - 1)
                                            );
                                            if (cur < totalQuestions - 1) {
                                              return { ...prev, [slide.key]: cur + 1 };
                                            }
                                            return prev;
                                          });
                                        }, delay);
                                      }}
                                      className={`flex w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                                        showAsCorrect
                                          ? 'border-emerald-400 bg-emerald-500/20 font-semibold text-emerald-100'
                                          : wrongSelected
                                            ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                                            : selected && !qState.revealed
                                              ? 'border-harx-400 bg-harx-500/25 text-white'
                                              : 'border-harx-500/20 bg-[#12172f] text-slate-100 hover:border-harx-400/40'
                                      }`}
                                    >
                                      <span className="mr-2 font-mono text-xs text-slate-400">{oi + 1}.</span>
                                      <span className="flex-1">{String(op)}</span>
                                      {showAsCorrect ? (
                                        <CheckCircle className="ml-2 h-4 w-4 shrink-0 text-emerald-600" />
                                      ) : null}
                                      {wrongSelected ? <X className="ml-2 h-4 w-4 shrink-0 text-rose-600" /> : null}
                                    </button>
                                  );
                                })}
                              </div>
                              {qState.revealed ? (
                                <div className="mt-4 rounded-xl border border-harx-500/20 bg-[#12172f] px-3 py-3">
                                  <p
                                    className={`text-sm font-semibold ${
                                      qState.timedOut
                                        ? 'text-amber-200'
                                        : isCorrect
                                          ? 'text-emerald-300'
                                          : isWrong
                                            ? 'text-rose-300'
                                            : 'text-slate-200'
                                    }`}
                                  >
                                    {qState.timedOut
                                      ? 'Temps écoulé (40 s). Réponse enregistrée comme incorrecte.'
                                      : isCorrect
                                        ? 'Bonne réponse !'
                                        : isWrong
                                          ? 'Ce n’était pas la bonne réponse.'
                                          : ''}
                                  </p>
                                  {String(q?.explanation || '').trim() ? (
                                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                                      {String(q.explanation)}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  );
                })()}
              </div>
              {formationViewerSlides.length > 0 && (
                <div
                  className="shrink-0 border-t px-4 py-3 sm:px-6"
                  style={{ borderColor: viewerThemeTokens.accentBorder, background: viewerThemeTokens.panelBg }}
                >
                  <div
                    className="mb-3 h-2 w-full overflow-hidden rounded-full border"
                    style={{ borderColor: viewerThemeTokens.accentBorder, background: viewerThemeTokens.cardBg }}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-300 ease-out"
                      style={{
                        background: viewerThemeTokens.accentBg,
                        boxShadow: viewerThemeTokens.accentShadow,
                        width: `${((formationViewerSlideIndex + 1) / formationViewerSlides.length) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setFormationViewerSlideIndex((i) => Math.max(0, i - 1))}
                      disabled={formationViewerSlideIndex <= 0}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        borderColor: viewerThemeTokens.accentBorder,
                        background: viewerThemeTokens.cardBg,
                        boxShadow: viewerThemeTokens.accentShadow,
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" /> Précédent
                    </button>
                    <span
                      className="rounded-full border px-3 py-1 text-xs font-medium text-white"
                      style={{ borderColor: viewerThemeTokens.accentBorder, background: viewerThemeTokens.cardBg }}
                    >
                      {formationViewerSlideIndex + 1} / {formationViewerSlides.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          atLastFormationSlideSection &&
                          currentFormationViewerSlide?.kind === 'section'
                        ) {
                          void completeSectionProgressAtLeave({
                            moduleIndex: currentFormationViewerSlide.moduleIndex,
                            section: currentFormationViewerSlide.section,
                          });
                          return;
                        }
                        setFormationViewerSlideIndex((i) =>
                          Math.min(formationViewerSlides.length - 1, i + 1)
                        );
                      }}
                      disabled={
                        blockFormationNextByEndPosition ||
                        !isCurrentQuizPassed ||
                        isNextModuleLocked
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        borderColor: viewerThemeTokens.accentBorder,
                        background: viewerThemeTokens.accentBg,
                        boxShadow: viewerThemeTokens.accentShadow,
                      }}
                    >
                      {atLastFormationSlideSection ? 'Terminer la section' : 'Suivant'}{' '}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  {currentFormationViewerSlide?.kind === 'quiz_group' && !isCurrentQuizPassed ? (
                    <p className="mt-2 text-center text-[11px] font-semibold text-amber-300">
                      {quizModuleTimeFrozen
                        ? 'Nombre maximum de tentatives atteint. Le chrono « module » est en pause ; en cas de blocage temporaire, le délai restant s’affiche sur le bandeau du quiz.'
                        : 'Répondez à toutes les questions (40 s max par question). Le bouton Suivant s’active dès une note ≥ 70 %.'}
                    </p>
                  ) : null}
                  {isNextModuleLocked ? (
                    <p className="mt-2 text-center text-[11px] font-semibold text-amber-300">
                      Le module suivant est verrouille. Completez le module courant (sections + quiz &gt;= 70%).
                    </p>
                  ) : null}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
