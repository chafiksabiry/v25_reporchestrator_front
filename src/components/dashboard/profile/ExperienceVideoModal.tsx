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
} from 'lucide-react';
import { dashRepApiUrl } from '../../../utils/repApiUrl';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkillScore {
  name: string;
  score: number;
  evidence?: string;
}

interface LanguageScore {
  language: string;
  level: string;
  score: number;
  evidence?: string;
}

interface ContactCenterSkill {
  score: number;
  notes: string;
}

interface AnalysisResult {
  videoUrl?: string | null;
  transcription: string;
  analysis: {
    technicalSkills: SkillScore[];
    professionalSkills?: SkillScore[];
    softSkills?: SkillScore[];
    spokenLanguages: LanguageScore[];
    industries: { name: string; score: number }[];
    activities: { name: string; score: number }[];
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
    summary: string;
  };
}

interface SavedVideoData {
  videoUrl?: string;
  videoTranscription?: string;
  videoAnalysis?: AnalysisResult['analysis'];
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

const buildResultFromSaved = (saved: SavedVideoData): AnalysisResult | null => {
  if (!saved?.videoAnalysis) return null;
  return {
    videoUrl: saved.videoUrl,
    transcription: saved.videoTranscription || '',
    analysis: saved.videoAnalysis,
  };
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

const ScoreBar: React.FC<{ score: number; label: string; sublabel?: string }> = ({ score, label, sublabel }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-black text-slate-700 truncate">{label}</span>
        {sublabel && <span className="text-[10px] font-bold text-slate-400 ml-1 flex-shrink-0">{sublabel}</span>}
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${scoreColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
    <span className={`text-sm font-black flex-shrink-0 w-10 text-right ${scoreTextColor(score)}`}>{score}</span>
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
      setCameraError('Camera / microphone access denied. Please allow camera access and retry.');
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
      setAnalyzeError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  const timeRemaining = MAX_DURATION - elapsed;
  const progressPct = (elapsed / MAX_DURATION) * 100;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-harx-500/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-harx-300" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">AI Experience Analysis</h2>
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
                    Retry
                  </button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay={viewMode === 'record'}
                  controls={viewMode === 'saved' || !!result?.videoUrl}
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
                  {formatTime(timeRemaining)} left
                </div>
              )}

              {/* Saved / recorded badge */}
              {viewMode === 'saved' && result && !isRecording && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-indigo-500/80 px-3 py-1.5 rounded-full">
                  <CheckCircle className="w-3 h-3 text-white" />
                  <span className="text-xs font-black text-white">Saved</span>
                </div>
              )}
              {recordedBlob && !isRecording && viewMode === 'record' && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-500/80 px-3 py-1.5 rounded-full">
                  <CheckCircle className="w-3 h-3 text-white" />
                  <span className="text-xs font-black text-white">Recorded</span>
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
                  Record New Video
                </button>
              )}

              {viewMode === 'record' && !recordedBlob && !isRecording && (
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-3">
                    Record up to <span className="text-white font-black">2 minutes</span> describing your experience, skills, and achievements.
                  </p>
                  <button
                    onClick={startRecording}
                    disabled={!!cameraError || !stream}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-black transition-all active:scale-95"
                  >
                    <Circle className="w-4 h-4 fill-white" />
                    Start Recording
                  </button>
                </div>
              )}

              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl text-sm font-black transition-all active:scale-95"
                >
                  <Square className="w-4 h-4 fill-white" />
                  Stop Recording
                </button>
              )}

              {recordedBlob && !analyzing && (
                <div className="space-y-2">
                  <button
                    onClick={analyzeVideo}
                    disabled={!!result}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-harx-600 to-indigo-600 hover:from-harx-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-default text-white rounded-2xl text-sm font-black transition-all active:scale-95 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    {result ? 'Analysis Complete' : 'Analyze with AI'}
                  </button>
                  {!result && (
                    <button
                      onClick={retake}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-black transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retake
                    </button>
                  )}
                </div>
              )}

              {analyzing && (
                <div className="flex flex-col items-center gap-3 py-2">
                  <Loader2 className="w-8 h-8 text-harx-400 animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-black text-white">AI is analyzing...</p>
                    <p className="text-xs text-slate-400 mt-1">Uploading → Processing video → Extracting skills</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right — Results */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
            {!result && !analyzing && (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-harx-100 to-indigo-100 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-harx-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">Record your experience</h3>
                  <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                    Talk about what you did, tools you used, and achievements. The AI will detect your skills and score them automatically.
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  {['Skills', 'Languages', 'Industries', 'Contact Center'].map((tag) => (
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
                  <p className="text-base font-black text-slate-800">AI is analyzing your video</p>
                  <p className="text-sm text-slate-500">Uploading → Processing video → Detecting skills → Scoring...</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center max-w-xs">
                  {['Technical Skills', 'Languages', 'Industries', 'Activities', 'Contact Center Skills'].map((step, i) => (
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
                  <p className="text-sm font-black text-red-700">Analysis failed</p>
                  <p className="text-xs text-red-500 mt-1">{analyzeError}</p>
                  <button onClick={analyzeVideo} className="mt-2 text-xs font-black text-red-600 underline">Retry</button>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {savedFlag && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    Analysis saved to your profile
                  </div>
                )}
                {/* Summary banner */}
                <div className="p-4 bg-gradient-to-r from-harx-50 to-indigo-50 border border-harx-100 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-harx-600 uppercase tracking-widest">AI Summary</span>
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-harx-100 rounded-full text-xs font-black text-harx-700">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      Confidence {result.analysis.overallConfidence}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{result.analysis.summary}</p>
                  {result.analysis.detectedLanguageOfSpeech && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Mic className="w-3 h-3" />
                      Spoken in: <span className="font-black">{result.analysis.detectedLanguageOfSpeech}</span>
                    </div>
                  )}
                </div>

                {/* Technical Skills */}
                {result.analysis.technicalSkills?.length > 0 && (
                  <Section
                    icon={<Briefcase className="w-4 h-4" />}
                    title="Technical Skills"
                    count={result.analysis.technicalSkills.length}
                  >
                    {result.analysis.technicalSkills.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((skill) => (
                      <ScoreBar key={skill.name} score={skill.score} label={skill.name} sublabel={skill.evidence} />
                    ))}
                  </Section>
                )}

                {/* Professional Skills */}
                {(result.analysis.professionalSkills?.length ?? 0) > 0 && (
                  <Section
                    icon={<Briefcase className="w-4 h-4" />}
                    title="Professional Skills"
                    count={result.analysis.professionalSkills!.length}
                  >
                    {result.analysis.professionalSkills!.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((skill) => (
                      <ScoreBar key={skill.name} score={skill.score} label={skill.name} sublabel={skill.evidence} />
                    ))}
                  </Section>
                )}

                {/* Soft Skills */}
                {(result.analysis.softSkills?.length ?? 0) > 0 && (
                  <Section
                    icon={<Sparkles className="w-4 h-4" />}
                    title="Soft Skills"
                    count={result.analysis.softSkills!.length}
                  >
                    {result.analysis.softSkills!.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((skill) => (
                      <ScoreBar key={skill.name} score={skill.score} label={skill.name} sublabel={skill.evidence} />
                    ))}
                  </Section>
                )}

                {/* Spoken Languages */}
                {result.analysis.spokenLanguages?.length > 0 && (
                  <Section
                    icon={<Globe className="w-4 h-4" />}
                    title="Languages"
                    count={result.analysis.spokenLanguages.length}
                  >
                    {result.analysis.spokenLanguages.filter((l) => l.score > 0).sort((a, b) => b.score - a.score).map((lang) => (
                      <div key={lang.language} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-700">{lang.language}</span>
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
                  <Section icon={<Building2 className="w-4 h-4" />} title="Industries" count={result.analysis.industries.filter((i) => i.score > 0).length}>
                    {result.analysis.industries.filter((i) => i.score > 0).sort((a, b) => b.score - a.score).map((ind) => (
                      <ScoreBar key={ind.name} score={ind.score} label={ind.name} />
                    ))}
                  </Section>
                )}

                {/* Activities */}
                {result.analysis.activities?.length > 0 && (
                  <Section icon={<Activity className="w-4 h-4" />} title="Activities" count={result.analysis.activities.filter((a) => a.score > 0).length} defaultOpen={false}>
                    <div className="flex flex-wrap gap-2">
                      {result.analysis.activities.filter((a) => a.score > 0).sort((a, b) => b.score - a.score).map((act) => (
                        <span
                          key={act.name}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                        >
                          {act.name}
                          <span className={`text-[10px] font-black ${scoreTextColor(act.score)}`}>{act.score}</span>
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Contact Center Skills */}
                {result.analysis.contactCenterSkills && (
                  <Section icon={<Headphones className="w-4 h-4" />} title="Contact Center Skills" defaultOpen={false}>
                    {Object.entries(result.analysis.contactCenterSkills).map(([key, val]: [string, any]) => {
                      const labels: Record<string, string> = {
                        customerService: 'Customer Service',
                        communication: 'Communication',
                        problemSolving: 'Problem Solving',
                        empathy: 'Empathy',
                        multitasking: 'Multitasking',
                        salesOrientation: 'Sales Orientation',
                        conflictResolution: 'Conflict Resolution',
                        productKnowledge: 'Product Knowledge',
                      };
                      return (
                        <ScoreBar key={key} score={val.score} label={labels[key] || key} sublabel={val.notes} />
                      );
                    })}
                  </Section>
                )}

                {/* Transcript toggle */}
                {result.transcription && (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setShowTranscript((p) => !p)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Mic className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-black text-slate-700">Transcript</span>
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
                  Record Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
