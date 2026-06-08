import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Circle,
  Square,
  RotateCcw,
  Sparkles,
  X,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Globe,
  Building2,
  Activity,
  Headphones,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dashRepApiUrl } from '../../../utils/repApiUrl';

// ─── Types ────────────────────────────────────────────────────────────────────

type RefLabel = string | { _id?: string; name?: string };

// AI text fields are stored bilingually; older data may still be a plain string.
type LocalizedText = string | { en?: string; fr?: string } | null;

interface SkillScore {
  name?: string;
  skill?: RefLabel;
  score: number;
  evidence?: LocalizedText;
}

interface LanguageScore {
  language: RefLabel;
  name?: string;
  level: string;
  score: number;
  evidence?: LocalizedText;
}

interface NamedScore {
  name?: string;
  industry?: RefLabel;
  activity?: RefLabel;
  score: number;
}

interface ContactCenterSkill {
  score: number;
  notes: LocalizedText;
}

interface SubScore {
  score: number;
  feedback?: LocalizedText;
  confidence?: 'low' | 'medium' | 'high';
}

interface LanguageAssessmentEntry {
  language?: RefLabel;
  languageName?: string;
  cefr?: string | null;
  overallScore: number;
  fluency?: SubScore;
  grammar?: SubScore;
  vocabulary?: SubScore;
  coherence?: SubScore;
  pronunciationEstimate?: SubScore;
  strengths?: LocalizedText;
  areasForImprovement?: LocalizedText;
}

interface LanguageAssessment {
  assessable: boolean;
  languages: LanguageAssessmentEntry[];
}

interface FraudCheck {
  faceDetected: boolean | null;
  faceCount: number | null;
  samePersonAcrossFrames: boolean | null;
  looksLive: boolean | null;
  livenessConfidence: number;
  identityMatch?: boolean | null;
  identityConfidence?: number;
  identityChecked?: boolean;
  fraudRisk: 'low' | 'medium' | 'high' | 'unknown';
  reasons: LocalizedText[];
  checkedFrames?: number;
}

interface Relevance {
  onTopic: boolean;
  score: number;
  reason?: LocalizedText;
}

interface AnalysisResult {
  videoUrl?: string | null;
  duration?: number | null;
  transcription: string;
  languageAssessment?: LanguageAssessment;
  fraudCheck?: FraudCheck;
  relevance?: Relevance;
  analysis: {
    technicalSkills: SkillScore[];
    professionalSkills?: SkillScore[];
    softSkills?: SkillScore[];
    spokenLanguages: LanguageScore[];
    industries: NamedScore[];
    activities: NamedScore[];
    contactCenterSkills: {
      customerService: ContactCenterSkill;
      communication: ContactCenterSkill;
      problemSolving: ContactCenterSkill;
      empathy: ContactCenterSkill;
      multitasking: ContactCenterSkill;
      salesOrientation: ContactCenterSkill;
      conflictResolution: ContactCenterSkill;
      productKnowledge: ContactCenterSkill;
    };
    overallConfidence: number;
    detectedLanguageOfSpeech: string;
    summary: LocalizedText;
  };
}

interface SavedVideoData {
  videoUrl?: string;
  videoDuration?: number;
  videoTranscription?: string;
  videoAnalysis?: AnalysisResult['analysis'];
  videoLanguageAssessment?: LanguageAssessment;
  videoFraudCheck?: FraudCheck;
  videoRelevance?: Relevance;
  videoAnalyzedAt?: string;
}

interface ExperienceVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  experience: { title: string; company: string };
  profileId: string;
  experienceIndex?: number;
  savedData?: SavedVideoData | null;
  onAnalysisComplete?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_DURATION = 120; // 2 minutes in seconds
const MIN_DURATION = 30; // minimum required recording length in seconds

// Picks the right language from a bilingual { en, fr } field, with graceful
// fallback for legacy string data or a missing locale.
const localize = (value: LocalizedText | undefined, lang: string): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const code = (lang || 'en').slice(0, 2);
  return value[code as 'en' | 'fr'] || value.en || value.fr || '';
};

const refLabel = (value?: RefLabel | null, fallback = 'Unknown'): string => {
  if (!value) return fallback;
  if (typeof value === 'string') {
    if (/^[a-f0-9]{24}$/i.test(value)) return fallback;
    return value;
  }
  return value.name || fallback;
};

const skillLabel = (skill: SkillScore): string => skill.name || refLabel(skill.skill);
const industryLabel = (item: NamedScore): string => item.name || refLabel(item.industry);
const activityLabel = (item: NamedScore): string => item.name || refLabel(item.activity);
const languageLabel = (lang: LanguageScore): string => lang.name || refLabel(lang.language);

const buildResultFromSaved = (saved: SavedVideoData): AnalysisResult | null => {
  if (!saved?.videoAnalysis) return null;
  return {
    videoUrl: saved.videoUrl,
    duration: saved.videoDuration,
    transcription: saved.videoTranscription || '',
    languageAssessment: saved.videoLanguageAssessment,
    fraudCheck: saved.videoFraudCheck,
    relevance: saved.videoRelevance,
    analysis: saved.videoAnalysis,
  };
};

const langAssessmentLabel = (entry: LanguageAssessmentEntry): string =>
  entry.languageName || refLabel(entry.language);

const fraudRiskStyles: Record<string, { badge: string }> = {
  low: { badge: 'bg-emerald-100 text-emerald-700' },
  medium: { badge: 'bg-amber-100 text-amber-700' },
  high: { badge: 'bg-red-100 text-red-700' },
  unknown: { badge: 'bg-slate-100 text-slate-500' },
};

// ─── Static UI strings (EN / FR) ───────────────────────────────────────────────
// AI-generated text is already bilingual; these are the fixed interface labels.
const STRINGS: Record<string, { en: string; fr: string }> = {
  headerTitle: { en: 'AI Experience Analysis', fr: 'Analyse IA de l’expérience' },
  retry: { en: 'Retry', fr: 'Réessayer' },
  saved: { en: 'Saved', fr: 'Enregistré' },
  recorded: { en: 'Recorded', fr: 'Enregistré' },
  left: { en: 'left', fr: 'restant' },
  recordNewVideo: { en: 'Record New Video', fr: 'Enregistrer une nouvelle vidéo' },
  recordHint: {
    en: 'Record between 30 seconds and 2 minutes describing your experience, skills, and achievements.',
    fr: 'Enregistrez entre 30 secondes et 2 minutes pour décrire votre expérience, vos compétences et vos réalisations.',
  },
  startRecording: { en: 'Start Recording', fr: 'Démarrer l’enregistrement' },
  stopRecording: { en: 'Stop Recording', fr: 'Arrêter l’enregistrement' },
  minDurationWarn: {
    en: 'Recording is too short — at least 30s is required. Please retake.',
    fr: 'L’enregistrement est trop court — au moins 30 s sont requises. Veuillez recommencer.',
  },
  analysisComplete: { en: 'Analysis Complete', fr: 'Analyse terminée' },
  analyzeWithAI: { en: 'Analyze with AI', fr: 'Analyser avec l’IA' },
  retake: { en: 'Retake', fr: 'Recommencer' },
  analyzingShort: { en: 'AI is analyzing...', fr: 'L’IA analyse...' },
  analyzingStepsShort: {
    en: 'Uploading → Processing video → Extracting skills',
    fr: 'Téléversement → Traitement vidéo → Extraction des compétences',
  },
  emptyTitle: { en: 'Record your experience', fr: 'Enregistrez votre expérience' },
  emptyDesc: {
    en: 'Talk about what you did, tools you used, and achievements. The AI will detect your skills and score them automatically.',
    fr: 'Parlez de ce que vous avez fait, des outils utilisés et de vos réalisations. L’IA détectera vos compétences et les évaluera automatiquement.',
  },
  tagSkills: { en: 'Skills', fr: 'Compétences' },
  tagLanguages: { en: 'Languages', fr: 'Langues' },
  tagIndustries: { en: 'Industries', fr: 'Secteurs' },
  tagContactCenter: { en: 'Contact Center', fr: 'Centre de contact' },
  analyzingTitle: { en: 'AI is analyzing your video', fr: 'L’IA analyse votre vidéo' },
  analyzingSteps: {
    en: 'Uploading → Processing video → Detecting skills → Scoring...',
    fr: 'Téléversement → Traitement vidéo → Détection des compétences → Évaluation...',
  },
  stepTechnical: { en: 'Technical Skills', fr: 'Compétences techniques' },
  stepLanguages: { en: 'Languages', fr: 'Langues' },
  stepIndustries: { en: 'Industries', fr: 'Secteurs' },
  stepActivities: { en: 'Activities', fr: 'Activités' },
  stepContactCenter: { en: 'Contact Center Skills', fr: 'Compétences centre de contact' },
  analysisFailed: { en: 'Analysis failed', fr: 'L’analyse a échoué' },
  savedToProfile: { en: 'Analysis saved to your profile', fr: 'Analyse enregistrée dans votre profil' },
  aiSummary: { en: 'AI Summary', fr: 'Résumé IA' },
  relevance: { en: 'Relevance', fr: 'Pertinence' },
  offTopicReasonFallback: {
    en: 'This video does not seem to describe the stated experience.',
    fr: 'Cette vidéo ne semble pas décrire l’expérience indiquée.',
  },
  offTopicHelp: {
    en: 'Detected skills were still added — record a video about this specific experience for better results.',
    fr: 'Les compétences détectées ont quand même été ajoutées — enregistrez une vidéo sur cette expérience précise pour de meilleurs résultats.',
  },
  identityFraud: { en: 'Identity & anti-fraud', fr: 'Identité & anti-fraude' },
  riskLow: { en: 'Low risk', fr: 'Risque faible' },
  riskMedium: { en: 'Medium risk', fr: 'Risque moyen' },
  riskHigh: { en: 'High risk', fr: 'Risque élevé' },
  riskUnknown: { en: 'Not verified', fr: 'Non vérifié' },
  fraudFace: { en: 'Face', fr: 'Visage' },
  fraudLive: { en: 'Live', fr: 'En direct' },
  fraudLiveness: { en: 'Liveness', fr: 'Authenticité' },
  identityMatch: { en: 'Photo match', fr: 'Correspondance photo' },
  identityMatchYes: { en: 'Matches your profile photo', fr: 'Correspond à votre photo de profil' },
  identityMatchNo: { en: 'Does not match your profile photo', fr: 'Ne correspond pas à votre photo de profil' },
  identityMatchUnknown: { en: 'Could not be verified', fr: 'Non vérifiable' },
  yes: { en: 'Yes', fr: 'Oui' },
  no: { en: 'No', fr: 'Non' },
  langAssessment: { en: 'Language Assessment (CEFR)', fr: 'Évaluation linguistique (CECR)' },
  metricFluency: { en: 'Fluency', fr: 'Fluidité' },
  metricGrammar: { en: 'Grammar', fr: 'Grammaire' },
  metricVocabulary: { en: 'Vocabulary', fr: 'Vocabulaire' },
  metricCoherence: { en: 'Coherence', fr: 'Cohérence' },
  metricPronunciation: { en: 'Pronunciation', fr: 'Prononciation' },
  confLow: { en: 'low confidence', fr: 'confiance faible' },
  confMedium: { en: 'medium confidence', fr: 'confiance moyenne' },
  confHigh: { en: 'high confidence', fr: 'confiance élevée' },
  strengths: { en: 'Strengths', fr: 'Points forts' },
  toImprove: { en: 'To improve', fr: 'À améliorer' },
  technicalSkills: { en: 'Technical Skills', fr: 'Compétences techniques' },
  professionalSkills: { en: 'Professional Skills', fr: 'Compétences professionnelles' },
  softSkills: { en: 'Soft Skills', fr: 'Compétences comportementales' },
  languages: { en: 'Languages', fr: 'Langues' },
  industries: { en: 'Industries', fr: 'Secteurs' },
  activities: { en: 'Activities', fr: 'Activités' },
  contactCenterSkills: { en: 'Contact Center Skills', fr: 'Compétences centre de contact' },
  ccCustomerService: { en: 'Customer Service', fr: 'Service client' },
  ccCommunication: { en: 'Communication', fr: 'Communication' },
  ccProblemSolving: { en: 'Problem Solving', fr: 'Résolution de problèmes' },
  ccEmpathy: { en: 'Empathy', fr: 'Empathie' },
  ccMultitasking: { en: 'Multitasking', fr: 'Multitâche' },
  ccSalesOrientation: { en: 'Sales Orientation', fr: 'Sens commercial' },
  ccConflictResolution: { en: 'Conflict Resolution', fr: 'Gestion des conflits' },
  ccProductKnowledge: { en: 'Product Knowledge', fr: 'Connaissance produit' },
  transcript: { en: 'Transcript', fr: 'Transcription' },
  recordAgain: { en: 'Record Again', fr: 'Enregistrer à nouveau' },
  cameraError: {
    en: 'Camera / microphone access denied. Please allow camera access and retry.',
    fr: 'Accès caméra / micro refusé. Autorisez l’accès à la caméra puis réessayez.',
  },
  analysisFailedRetry: { en: 'Analysis failed. Please try again.', fr: 'L’analyse a échoué. Veuillez réessayer.' },
};

const makeTr =
  (lang: string) =>
  (key: keyof typeof STRINGS): string => {
    const code = (lang || 'en').slice(0, 2);
    const entry = STRINGS[key];
    if (!entry) return String(key);
    return entry[code as 'en' | 'fr'] || entry.en;
  };

const hasSavedAnalysis = (saved?: SavedVideoData | null) =>
  Boolean(saved?.videoUrl || saved?.videoAnalysis);

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const scoreColor = (score: number) => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-harx-500';
  if (score >= 40) return 'bg-amber-400';
  return 'bg-slate-300';
};

const scoreTextColor = (score: number) => {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-harx-600';
  if (score >= 40) return 'text-amber-500';
  return 'text-slate-400';
};

const levelBadge: Record<string, string> = {
  Native: 'bg-emerald-100 text-emerald-700',
  C2: 'bg-emerald-100 text-emerald-700',
  C1: 'bg-harx-100 text-harx-700',
  B2: 'bg-indigo-100 text-indigo-700',
  B1: 'bg-blue-100 text-blue-700',
  A2: 'bg-amber-100 text-amber-700',
  A1: 'bg-slate-100 text-slate-500',
};

// ─── Score Bar ────────────────────────────────────────────────────────────────

const ScoreBar: React.FC<{ score: number; label: string; feedback?: string }> = ({ score, label, feedback }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <span className="text-xs font-black text-slate-700">{label}</span>
        <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${scoreColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      <span className={`text-sm font-black flex-shrink-0 w-8 text-right tabular-nums ${scoreTextColor(score)}`}>
        {score}
      </span>
    </div>
    {feedback && (
      <p className="text-[11px] text-slate-500 leading-relaxed pr-10">{feedback}</p>
    )}
  </div>
);

// Compact metric tile used inside the CEFR language card (2-column grid).
const MetricTile: React.FC<{
  score: number;
  label: string;
  feedback?: string;
  extra?: string;
}> = ({ score, label, feedback, extra }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-black text-slate-600 uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-black tabular-nums ${scoreTextColor(score)}`}>{score}</span>
    </div>
    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${scoreColor(score)}`}
        style={{ width: `${score}%` }}
      />
    </div>
    {extra && <p className="text-[10px] font-bold text-slate-400 uppercase">{extra}</p>}
    {feedback && <p className="text-[11px] text-slate-500 leading-relaxed">{feedback}</p>}
  </div>
);

const InsightBox: React.FC<{ tone: 'positive' | 'warning'; title: string; children: React.ReactNode }> = ({
  tone,
  title,
  children,
}) => (
  <div
    className={`rounded-xl border p-3 ${
      tone === 'positive'
        ? 'bg-emerald-50/80 border-emerald-100'
        : 'bg-amber-50/80 border-amber-100'
    }`}
  >
    <p
      className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
        tone === 'positive' ? 'text-emerald-700' : 'text-amber-700'
      }`}
    >
      {title}
    </p>
    <p className={`text-xs leading-relaxed ${tone === 'positive' ? 'text-emerald-800' : 'text-amber-800'}`}>
      {children}
    </p>
  </div>
);

// ─── Collapsible Section ──────────────────────────────────────────────────────

const Section: React.FC<{ icon: React.ReactNode; title: string; count?: number; children: React.ReactNode; defaultOpen?: boolean }> = ({
  icon, title, count, children, defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="text-harx-500">{icon}</div>
          <span className="text-sm font-black text-slate-800">{title}</span>
          {count !== undefined && (
            <span className="px-2 py-0.5 bg-harx-100 text-harx-700 text-[10px] font-black rounded-full">{count}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="p-4 space-y-3 bg-white">{children}</div>}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ExperienceVideoModal: React.FC<ExperienceVideoModalProps> = ({
  isOpen, onClose, experience, profileId, experienceIndex, savedData, onAnalysisComplete,
}) => {
  const { i18n } = useTranslation();
  const uiLang = i18n.language || 'en';
  const t = makeTr(uiLang);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [viewMode, setViewMode] = useState<'saved' | 'record'>('record');
  const [savedFlag, setSavedFlag] = useState(false);

  // ── Camera init ─────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });
      setStream(s);
      setCameraError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraError(t('cameraError'));
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stream]);

  const showSavedVideo = (url: string) => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = null;
    videoRef.current.src = url;
    videoRef.current.muted = false;
    videoRef.current.loop = false;
    videoRef.current.controls = true;
    videoRef.current.play().catch(() => {});
  };

  const enterRecordMode = useCallback(() => {
    setViewMode('record');
    setRecordedBlob(null);
    setResult(null);
    setAnalyzeError(null);
    setSavedFlag(false);
    setElapsed(0);
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.controls = false;
      videoRef.current.srcObject = null;
    }
    startCamera();
  }, [startCamera]);

  // ── Open/close lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setAnalyzeError(null);
      setElapsed(0);
      setSavedFlag(false);

      if (hasSavedAnalysis(savedData)) {
        setViewMode('saved');
        setRecordedBlob(null);
        const savedResult = buildResultFromSaved(savedData!);
        setResult(savedResult);
        stopCamera();
        if (savedData?.videoUrl) {
          setTimeout(() => showSavedVideo(savedData.videoUrl!), 50);
        }
      } else {
        enterRecordMode();
      }
    } else {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
      setViewMode('record');
    }
    return () => {
      if (!isOpen) stopCamera();
    };
  }, [isOpen, savedData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recording ──────────────────────────────────────────────────────────────
  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      // Show playback in video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
        videoRef.current.muted = false;
        videoRef.current.loop = true;
        videoRef.current.controls = true;
        videoRef.current.play().catch(() => {});
      }
      stopCamera();
    };
    recorder.start(200);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= MAX_DURATION - 1) {
          stopRecording();
          return MAX_DURATION;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const retake = () => {
    enterRecordMode();
  };

  // ── Analysis ───────────────────────────────────────────────────────────────
  const analyzeVideo = async () => {
    if (!recordedBlob || !profileId) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('video', new File([recordedBlob], 'experience-video.webm', { type: 'video/webm' }));
      formData.append('title', experience.title);
      formData.append('company', experience.company);
      if (experienceIndex !== undefined && experienceIndex >= 0) {
        formData.append('experienceIndex', String(experienceIndex));
      }

      const response = await fetch(dashRepApiUrl(`/profiles/${profileId}/experience/analyze-video`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Server error ${response.status}`);
      }

      const json = await response.json();
      const data = json.data;
      setResult(data);
      if (data?.saved) {
        setSavedFlag(true);
        onAnalysisComplete?.();
      }
      if (data?.videoUrl) {
        showSavedVideo(data.videoUrl);
      }
    } catch (err: any) {
      setAnalyzeError(err.message || t('analysisFailedRetry'));
    } finally {
      setAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  const timeRemaining = MAX_DURATION - elapsed;
  const progressPct = (elapsed / MAX_DURATION) * 100;
  const showVideoControls =
    viewMode === 'saved' || !!result?.videoUrl || (!!recordedBlob && !isRecording);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-harx-500/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-harx-300" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">{t('headerTitle')}</h2>
              <p className="text-xs text-slate-400 font-medium truncate max-w-xs">
                {experience.title}{experience.company ? ` @ ${experience.company}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

          {/* Left — Video */}
          <div className="md:w-96 flex-shrink-0 bg-slate-900 flex flex-col">
            {/* Video preview */}
            <div className="relative flex-1 bg-black min-h-[240px]">
              {cameraError && viewMode === 'record' && !result?.videoUrl ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <VideoOff className="w-12 h-12 text-slate-500" />
                  <p className="text-sm text-slate-400">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-harx-600 text-white rounded-xl text-xs font-black"
                  >
                    {t('retry')}
                  </button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  className={`w-full h-full ${showVideoControls ? 'object-contain' : 'object-cover'}`}
                  playsInline
                  autoPlay={viewMode === 'record' && !showVideoControls}
                  controls={showVideoControls}
                />
              )}

              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full">
                  <Circle className="w-2.5 h-2.5 text-red-500 fill-red-500 animate-pulse" />
                  <span className="text-xs font-black text-white">{formatTime(elapsed)}</span>
                </div>
              )}

              {/* Time remaining warning */}
              {isRecording && timeRemaining <= 30 && (
                <div className="absolute top-3 right-3 bg-red-500/80 text-white px-3 py-1.5 rounded-full text-xs font-black">
                  {formatTime(timeRemaining)} {t('left')}
                </div>
              )}

              {/* Saved / recorded badge */}
              {viewMode === 'saved' && result && !isRecording && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-indigo-500/80 px-3 py-1.5 rounded-full">
                  <CheckCircle className="w-3 h-3 text-white" />
                  <span className="text-xs font-black text-white">{t('saved')}</span>
                </div>
              )}
              {recordedBlob && !isRecording && viewMode === 'record' && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-500/80 px-3 py-1.5 rounded-full">
                  <CheckCircle className="w-3 h-3 text-white" />
                  <span className="text-xs font-black text-white">{t('recorded')}</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {isRecording && (
              <div className="h-1 bg-slate-700">
                <div
                  className={`h-full transition-all duration-1000 ${timeRemaining <= 30 ? 'bg-red-500' : 'bg-harx-500'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            {/* Controls */}
            <div className="px-4 py-4 space-y-3">
              {viewMode === 'saved' && !isRecording && !recordedBlob && (
                <button
                  onClick={enterRecordMode}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-black transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('recordNewVideo')}
                </button>
              )}

              {viewMode === 'record' && !recordedBlob && !isRecording && (
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-3">{t('recordHint')}</p>
                  <button
                    onClick={startRecording}
                    disabled={!!cameraError || !stream}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-black transition-all active:scale-95"
                  >
                    <Circle className="w-4 h-4 fill-white" />
                    {t('startRecording')}
                  </button>
                </div>
              )}

              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl text-sm font-black transition-all active:scale-95"
                >
                  <Square className="w-4 h-4 fill-white" />
                  {t('stopRecording')}
                </button>
              )}

              {recordedBlob && !analyzing && (
                <div className="space-y-2">
                  {!result && elapsed < MIN_DURATION && (
                    <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {t('minDurationWarn')}
                    </p>
                  )}
                  <button
                    onClick={analyzeVideo}
                    disabled={!!result || elapsed < MIN_DURATION}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-harx-600 to-indigo-600 hover:from-harx-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-black transition-all active:scale-95 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    {result ? t('analysisComplete') : t('analyzeWithAI')}
                  </button>
                  {!result && (
                    <button
                      onClick={retake}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-black transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t('retake')}
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Right — Results */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-5 pr-4 space-y-4 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-track]:bg-transparent">
            {!result && !analyzing && (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-harx-100 to-indigo-100 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-harx-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">{t('emptyTitle')}</h3>
                  <p className="text-sm text-slate-500 max-w-xs leading-relaxed">{t('emptyDesc')}</p>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  {[t('tagSkills'), t('tagLanguages'), t('tagIndustries'), t('tagContactCenter')].map((tag) => (
                    <span key={tag} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-black rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analyzing && (
              <div className="h-full flex flex-col items-center justify-center gap-6 py-16">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-harx-100 animate-ping opacity-30" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-harx-500 animate-spin" />
                  <div className="absolute inset-3 rounded-full bg-gradient-to-br from-harx-100 to-indigo-100 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-harx-500" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-base font-black text-slate-800">{t('analyzingTitle')}</p>
                  <p className="text-sm text-slate-500">{t('analyzingSteps')}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center max-w-xs">
                  {[t('stepTechnical'), t('stepLanguages'), t('stepIndustries'), t('stepActivities'), t('stepContactCenter')].map((step, i) => (
                    <span key={step} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-bold rounded-full">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" style={{ animationDelay: `${i * 0.15}s` }} />
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analyzeError && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-red-700">{t('analysisFailed')}</p>
                  <p className="text-xs text-red-500 mt-1">{analyzeError}</p>
                  <button onClick={analyzeVideo} className="mt-2 text-xs font-black text-red-600 underline">{t('retry')}</button>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {savedFlag && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {t('savedToProfile')}
                  </div>
                )}

                {/* Summary banner */}
                <div className="rounded-2xl border border-harx-100 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-harx-50 to-indigo-50 border-b border-harx-100">
                    <span className="text-xs font-black text-harx-600 uppercase tracking-widest">{t('aiSummary')}</span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-harx-100 rounded-full text-[11px] font-black text-harx-700">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      {result.analysis.overallConfidence}%
                    </span>
                  </div>
                  <div className="p-4 bg-white space-y-3">
                    <p className="text-sm text-slate-700 leading-relaxed">{localize(result.analysis.summary, uiLang)}</p>
                    <div className="flex flex-wrap gap-2">
                      {result.analysis.detectedLanguageOfSpeech && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                          <Mic className="w-3 h-3" />
                          <span className="font-black">{result.analysis.detectedLanguageOfSpeech}</span>
                        </span>
                      )}
                      {typeof result.duration === 'number' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                          <Clock className="w-3 h-3" />
                          <span className="font-black">{Math.round(result.duration)}s</span>
                        </span>
                      )}
                      {result.relevance && result.relevance.onTopic === false && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-[11px] text-red-600 font-black">
                          <AlertCircle className="w-3 h-3" />
                          {t('relevance')} {result.relevance.score}%
                        </span>
                      )}
                    </div>
                    {result.relevance && result.relevance.onTopic === false && (
                      <div className="rounded-xl bg-red-50 border border-red-100 p-3 space-y-1">
                        <p className="text-xs text-red-700 leading-relaxed">
                          {localize(result.relevance.reason, uiLang) || t('offTopicReasonFallback')}
                        </p>
                        <p className="text-[11px] text-slate-500">{t('offTopicHelp')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Anti-fraud check */}
                {result.fraudCheck && (
                  <div
                    className={`rounded-2xl border overflow-hidden ${
                      result.fraudCheck.fraudRisk === 'high'
                        ? 'bg-red-50 border-red-200'
                        : result.fraudCheck.fraudRisk === 'medium'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-black/5">
                      {result.fraudCheck.fraudRisk === 'low' ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="text-sm font-black text-slate-800">{t('identityFraud')}</span>
                      <span
                        className={`ml-auto px-2.5 py-0.5 text-[10px] font-black rounded-full ${
                          fraudRiskStyles[result.fraudCheck.fraudRisk]?.badge || fraudRiskStyles.unknown.badge
                        }`}
                      >
                        {t(
                          result.fraudCheck.fraudRisk === 'low'
                            ? 'riskLow'
                            : result.fraudCheck.fraudRisk === 'medium'
                            ? 'riskMedium'
                            : result.fraudCheck.fraudRisk === 'high'
                            ? 'riskHigh'
                            : 'riskUnknown'
                        )}
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {
                            label: t('fraudFace'),
                            value:
                              result.fraudCheck.faceDetected === null
                                ? 'N/A'
                                : result.fraudCheck.faceDetected
                                ? t('yes')
                                : t('no'),
                          },
                          {
                            label: t('fraudLive'),
                            value:
                              result.fraudCheck.looksLive === null
                                ? 'N/A'
                                : result.fraudCheck.looksLive
                                ? t('yes')
                                : t('no'),
                          },
                          { label: t('fraudLiveness'), value: `${result.fraudCheck.livenessConfidence}%` },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-xl bg-white/70 border border-black/5 px-2 py-2.5 text-center"
                          >
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.label}</p>
                            <p className="text-xs font-black text-slate-800 mt-0.5">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Identity match vs. profile photo */}
                      {result.fraudCheck.identityChecked && (
                        <div
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 border ${
                            result.fraudCheck.identityMatch === true
                              ? 'bg-emerald-50 border-emerald-100'
                              : result.fraudCheck.identityMatch === false
                              ? 'bg-red-50 border-red-100'
                              : 'bg-slate-50 border-slate-100'
                          }`}
                        >
                          {result.fraudCheck.identityMatch === true ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : result.fraudCheck.identityMatch === false ? (
                            <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                              {t('identityMatch')}
                            </p>
                            <p
                              className={`text-xs font-black ${
                                result.fraudCheck.identityMatch === true
                                  ? 'text-emerald-700'
                                  : result.fraudCheck.identityMatch === false
                                  ? 'text-red-700'
                                  : 'text-slate-500'
                              }`}
                            >
                              {result.fraudCheck.identityMatch === true
                                ? t('identityMatchYes')
                                : result.fraudCheck.identityMatch === false
                                ? t('identityMatchNo')
                                : t('identityMatchUnknown')}
                            </p>
                          </div>
                          {result.fraudCheck.identityMatch !== null &&
                            typeof result.fraudCheck.identityConfidence === 'number' &&
                            result.fraudCheck.identityConfidence > 0 && (
                              <span
                                className={`text-sm font-black tabular-nums flex-shrink-0 ${
                                  result.fraudCheck.identityMatch ? 'text-emerald-600' : 'text-red-600'
                                }`}
                              >
                                {result.fraudCheck.identityConfidence}%
                              </span>
                            )}
                        </div>
                      )}

                      {result.fraudCheck.reasons?.length > 0 && (
                        <ul className="space-y-1.5">
                          {result.fraudCheck.reasons.slice(0, 3).map((reason, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-[11px] text-slate-600 leading-relaxed before:content-['•'] before:text-slate-400 before:flex-shrink-0"
                            >
                              {localize(reason, uiLang)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* Detailed language assessment */}
                {result.languageAssessment?.assessable && (result.languageAssessment.languages?.length ?? 0) > 0 && (
                  <Section
                    icon={<Globe className="w-4 h-4" />}
                    title={t('langAssessment')}
                    count={result.languageAssessment.languages.length}
                  >
                    <div className="space-y-4">
                      {result.languageAssessment.languages.map((lang) => {
                        const name = langAssessmentLabel(lang);
                        const strengths = localize(lang.strengths, uiLang);
                        const improvements = localize(lang.areasForImprovement, uiLang);
                        const confKey =
                          lang.pronunciationEstimate?.confidence === 'high'
                            ? 'confHigh'
                            : lang.pronunciationEstimate?.confidence === 'medium'
                            ? 'confMedium'
                            : 'confLow';
                        const metrics = [
                          lang.fluency && {
                            key: 'fluency',
                            label: t('metricFluency'),
                            score: lang.fluency.score,
                            feedback: localize(lang.fluency.feedback, uiLang),
                          },
                          lang.grammar && {
                            key: 'grammar',
                            label: t('metricGrammar'),
                            score: lang.grammar.score,
                            feedback: localize(lang.grammar.feedback, uiLang),
                          },
                          lang.vocabulary && {
                            key: 'vocabulary',
                            label: t('metricVocabulary'),
                            score: lang.vocabulary.score,
                            feedback: localize(lang.vocabulary.feedback, uiLang),
                          },
                          lang.coherence && {
                            key: 'coherence',
                            label: t('metricCoherence'),
                            score: lang.coherence.score,
                            feedback: localize(lang.coherence.feedback, uiLang),
                          },
                          lang.pronunciationEstimate && {
                            key: 'pronunciation',
                            label: t('metricPronunciation'),
                            score: lang.pronunciationEstimate.score,
                            feedback: localize(lang.pronunciationEstimate.feedback, uiLang),
                            extra: t(confKey),
                          },
                        ].filter(Boolean) as Array<{
                          key: string;
                          label: string;
                          score: number;
                          feedback: string;
                          extra?: string;
                        }>;

                        return (
                          <div key={name} className="rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-black text-slate-800 truncate">{name}</span>
                                {lang.cefr && (
                                  <span
                                    className={`px-2 py-0.5 text-[9px] font-black rounded-full flex-shrink-0 ${
                                      levelBadge[lang.cefr] || 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {lang.cefr}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-baseline gap-0.5 flex-shrink-0">
                                <span className={`text-xl font-black tabular-nums ${scoreTextColor(lang.overallScore)}`}>
                                  {lang.overallScore}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">/100</span>
                              </div>
                            </div>

                            <div className="p-4 space-y-3">
                              <div className="space-y-2.5">
                                {metrics.map((metric) => (
                                  <MetricTile
                                    key={metric.key}
                                    label={metric.label}
                                    score={metric.score}
                                    feedback={metric.feedback}
                                    extra={metric.extra}
                                  />
                                ))}
                              </div>

                              {(strengths || improvements) && (
                                <div className="grid grid-cols-1 gap-2 pt-1">
                                  {strengths && (
                                    <InsightBox tone="positive" title={t('strengths')}>
                                      {strengths}
                                    </InsightBox>
                                  )}
                                  {improvements && (
                                    <InsightBox tone="warning" title={t('toImprove')}>
                                      {improvements}
                                    </InsightBox>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {/* Technical Skills */}
                {result.analysis.technicalSkills?.length > 0 && (
                  <Section
                    icon={<Briefcase className="w-4 h-4" />}
                    title={t('technicalSkills')}
                    count={result.analysis.technicalSkills.length}
                  >
                    {result.analysis.technicalSkills.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((skill) => (
                      <ScoreBar key={skillLabel(skill)} score={skill.score} label={skillLabel(skill)} feedback={localize(skill.evidence, uiLang)} />
                    ))}
                  </Section>
                )}

                {/* Professional Skills */}
                {(result.analysis.professionalSkills?.length ?? 0) > 0 && (
                  <Section
                    icon={<Briefcase className="w-4 h-4" />}
                    title={t('professionalSkills')}
                    count={result.analysis.professionalSkills!.length}
                  >
                    {result.analysis.professionalSkills!.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((skill) => (
                      <ScoreBar key={skillLabel(skill)} score={skill.score} label={skillLabel(skill)} feedback={localize(skill.evidence, uiLang)} />
                    ))}
                  </Section>
                )}

                {/* Soft Skills */}
                {(result.analysis.softSkills?.length ?? 0) > 0 && (
                  <Section
                    icon={<Sparkles className="w-4 h-4" />}
                    title={t('softSkills')}
                    count={result.analysis.softSkills!.length}
                  >
                    {result.analysis.softSkills!.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((skill) => (
                      <ScoreBar key={skillLabel(skill)} score={skill.score} label={skillLabel(skill)} feedback={localize(skill.evidence, uiLang)} />
                    ))}
                  </Section>
                )}

                {/* Spoken Languages */}
                {result.analysis.spokenLanguages?.length > 0 && (
                  <Section
                    icon={<Globe className="w-4 h-4" />}
                    title={t('languages')}
                    count={result.analysis.spokenLanguages.length}
                  >
                    {result.analysis.spokenLanguages.filter((l) => l.score > 0).sort((a, b) => b.score - a.score).map((lang) => (
                      <div key={languageLabel(lang)} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-700">{languageLabel(lang)}</span>
                              <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${levelBadge[lang.level] || 'bg-slate-100 text-slate-500'}`}>
                                {lang.level}
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${scoreColor(lang.score)}`} style={{ width: `${lang.score}%` }} />
                          </div>
                        </div>
                        <span className={`text-sm font-black w-10 text-right ${scoreTextColor(lang.score)}`}>{lang.score}</span>
                      </div>
                    ))}
                  </Section>
                )}

                {/* Industries */}
                {result.analysis.industries?.length > 0 && (
                  <Section icon={<Building2 className="w-4 h-4" />} title={t('industries')} count={result.analysis.industries.filter((i) => i.score > 0).length}>
                    {result.analysis.industries.filter((i) => i.score > 0).sort((a, b) => b.score - a.score).map((ind) => (
                      <ScoreBar key={industryLabel(ind)} score={ind.score} label={industryLabel(ind)} />
                    ))}
                  </Section>
                )}

                {/* Activities */}
                {result.analysis.activities?.length > 0 && (
                  <Section icon={<Activity className="w-4 h-4" />} title={t('activities')} count={result.analysis.activities.filter((a) => a.score > 0).length} defaultOpen={false}>
                    <div className="flex flex-wrap gap-2">
                      {result.analysis.activities.filter((a) => a.score > 0).sort((a, b) => b.score - a.score).map((act) => (
                        <span
                          key={activityLabel(act)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                        >
                          {activityLabel(act)}
                          <span className={`text-[10px] font-black ${scoreTextColor(act.score)}`}>{act.score}</span>
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Contact Center Skills — only the ones actually detected */}
                {(() => {
                  const cc = result.analysis.contactCenterSkills;
                  if (!cc) return null;
                  const labelKeys: Record<string, keyof typeof STRINGS> = {
                    customerService: 'ccCustomerService',
                    communication: 'ccCommunication',
                    problemSolving: 'ccProblemSolving',
                    empathy: 'ccEmpathy',
                    multitasking: 'ccMultitasking',
                    salesOrientation: 'ccSalesOrientation',
                    conflictResolution: 'ccConflictResolution',
                    productKnowledge: 'ccProductKnowledge',
                  };
                  const detected = Object.entries(cc)
                    .filter(([, val]: [string, any]) => (val?.score ?? 0) > 0)
                    .sort(([, a]: [string, any], [, b]: [string, any]) => (b?.score ?? 0) - (a?.score ?? 0));
                  if (detected.length === 0) return null;
                  return (
                    <Section
                      icon={<Headphones className="w-4 h-4" />}
                      title={t('contactCenterSkills')}
                      count={detected.length}
                      defaultOpen={false}
                    >
                      {detected.map(([key, val]: [string, any]) => (
                        <ScoreBar
                          key={key}
                          score={val.score}
                          label={labelKeys[key] ? t(labelKeys[key]) : key}
                          feedback={localize(val.notes, uiLang)}
                        />
                      ))}
                    </Section>
                  );
                })()}

                {/* Transcript toggle */}
                {result.transcription && (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setShowTranscript((p) => !p)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Mic className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-black text-slate-700">{t('transcript')}</span>
                      </div>
                      {showTranscript ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {showTranscript && (
                      <div className="px-4 py-3 bg-white">
                        <p className="text-xs text-slate-600 leading-relaxed italic">"{result.transcription}"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Retake after results */}
                <button
                  onClick={retake}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 rounded-2xl text-xs font-black transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('recordAgain')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
