/** Helpers partagés — module script obligatoire (formation / certification / cockpit). */

export const SCRIPT_REQUIREMENT_MARKER = '__harx_script_requirement__';

export type JourneyModuleRow = {
  _id?: string;
  id?: string;
  title?: string;
  sections?: unknown[];
  quizzes?: unknown[];
};

export type JourneyRowLite = Record<string, unknown> & {
  __gigId?: string;
  modules?: unknown[];
};

export type StructuredModuleProgressLite = {
  moduleId: string;
  status: string;
  progressPercentage?: number;
};

export type StructuredProgressLite = {
  status?: string;
  modules?: StructuredModuleProgressLite[];
};

export type RepProgressModuleLite = Record<string, unknown>;

export type RepProgressRowLite = {
  progressPercentage?: number;
  modules?: Record<string, RepProgressModuleLite>;
};

export function trainingApiBase(): string {
  const raw =
    import.meta.env.VITE_TRAINING_API_URL ||
    import.meta.env.VITE_TRAINING_BACKEND_URL ||
    '';
  return String(raw).replace(/\/$/, '');
}

export function normalizeMongoId(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && raw !== null) {
    const oid = (raw as { $oid?: unknown }).$oid;
    if (oid != null) return String(oid).trim();
    const id = (raw as { _id?: unknown })._id;
    if (id != null) return normalizeMongoId(id);
  }
  return String(raw).trim();
}

export function journeyKey(j: Record<string, unknown>): string {
  return String(j._id || j.id || '').trim();
}

export function journeyTitle(j: Record<string, unknown>): string {
  return String(j.title || j.name || 'Formation').trim();
}

export function extractModules(j: JourneyRowLite): JourneyModuleRow[] {
  const raw = (j.modules || []) as unknown[];
  return Array.isArray(raw) ? (raw as JourneyModuleRow[]) : [];
}

export function isScriptRequirementModule(mod: JourneyModuleRow): boolean {
  const row = mod as Record<string, unknown>;
  if (row.harxRequirementType === SCRIPT_REQUIREMENT_MARKER) return true;
  const title = String(mod.title || '').toLowerCase();
  return title.includes("script d'appel") || title.includes('script d appel');
}

export function scriptModuleStillPending(
  j: JourneyRowLite,
  structured: StructuredProgressLite | undefined,
  progress: RepProgressRowLite | undefined
): boolean {
  const modules = extractModules(j);
  const scriptIdx = modules.findIndex(isScriptRequirementModule);
  if (scriptIdx < 0) return false;

  const scriptMod = modules[scriptIdx];
  const moduleId =
    normalizeMongoId(scriptMod._id) ||
    normalizeMongoId(scriptMod.id) ||
    String(scriptIdx);

  const fromStructured = structured?.modules?.find(
    (m) => m.moduleId === moduleId || m.moduleId === String(scriptIdx)
  );
  if (fromStructured?.status === 'completed') return false;

  const mp = progress?.modules?.[moduleId] ?? progress?.modules?.[String(scriptIdx)];
  if (
    mp &&
    (String((mp as { status?: unknown }).status) === 'completed' ||
      Number((mp as { progress?: unknown }).progress) >= 100)
  ) {
    return false;
  }

  return true;
}

export function scriptNotificationId(journeyId: string): string {
  return `script-required-${journeyId}`;
}

export function journeyHasScriptModule(j: JourneyRowLite): boolean {
  return extractModules(j).some(isScriptRequirementModule);
}

/** Clé slide viewer formation (`m{mi}-s{si}`) pour la section script. */
export function scriptModuleSlideKey(j: JourneyRowLite): string | null {
  const modules = extractModules(j);
  const mi = modules.findIndex(isScriptRequirementModule);
  if (mi < 0) return null;
  const sections = Array.isArray(modules[mi]?.sections) ? modules[mi].sections! : [];
  const si = sections.findIndex(
    (s) => String((s as Record<string, unknown>)?.type || '').toLowerCase() === 'script'
  );
  return `m${mi}-s${si >= 0 ? si : 0}`;
}

export function gigIdFromJourney(j: JourneyRowLite): string {
  if (j.__gigId) return String(j.__gigId);
  return normalizeMongoId(j.gigId);
}

export async function fetchEnrolledGigsForAgent(
  agentId: string,
  token: string
): Promise<{ gigId: string; title: string }[]> {
  const base = String(import.meta.env.VITE_MATCHING_API_URL || '').replace(/\/$/, '');
  if (!base) return [];

  const res = await fetch(
    `${base}/gig-agents/agents/${encodeURIComponent(agentId)}/gigs?status=enrolled`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];

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
  return out;
}
