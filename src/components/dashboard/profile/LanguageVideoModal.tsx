import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Video,
  VideoOff,
  Circle,
  Square,
  RotateCcw,
  Sparkles,
  X,
  CheckCircle,
  AlertCircle,
  Globe,
  Loader2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dashRepApiUrl } from '../../../utils/repApiUrl';
import { useLiveFaceMatch } from './useLiveFaceMatch';

type LocalizedText = string | { en?: string; fr?: string } | null;

interface LanguageAssessmentResult {
  assessable?: boolean;
  languageMatch?: {
    matches: boolean;
    detectedLanguage?: string;
    reason?: LocalizedText;
  };
  cefr?: string | null;
  overallScore?: number;
  fluency?: { score: number; feedback?: LocalizedText };
  grammar?: { score: number; feedback?: LocalizedText };
  vocabulary?: { score: number; feedback?: LocalizedText };
  coherence?: { score: number; feedback?: LocalizedText };
  meetsClaimedLevel?: boolean;
  summary?: LocalizedText;
}

interface AnalysisPayload {
  videoUrl?: string;
  duration?: number;
  transcription?: string;
  assessment?: LanguageAssessmentResult;
  fraudCheck?: {
    fraudRisk?: 'low' | 'medium' | 'high' | 'unknown';
    identityMatch?: boolean | null;
  };
  saved?: boolean;
}

export interface LanguageVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  languageName: string;
  languageCode?: string;
  languageId?: string;
  expectedProficiency: string;
  referencePhotoUrl?: string | null;
  onAnalysisComplete?: () => void;
}

const MAX_DURATION = 180; // 3 min max
const MIN_DURATION = 90; // 1 min 30 minimum
const ABSENCE_THREAT_TICKS = 2;
const ABSENCE_CUT_TICKS = 4;

const localize = (value: LocalizedText | undefined, lang: string): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const code = (lang || 'en').slice(0, 2);
  return value[code as 'en' | 'fr'] || value.en || value.fr || '';
};

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const scoreColor = (score: number) => {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-rose-400';
};

export const LanguageVideoModal: React.FC<LanguageVideoModalProps> = ({
  isOpen,
  onClose,
  profileId,
  languageName,
  languageCode,
  languageId,
  expectedProficiency,
  referencePhotoUrl,
  onAnalysisComplete,
}) => {
  const { i18n } = useTranslation();
  const isFr = (i18n.language || 'en').slice(0, 2) === 'fr';
  const uiLang = i18n.language || 'en';

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const initializedRef = useRef(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisPayload | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);
  const [faceAbsenceInvalid, setFaceAbsenceInvalid] = useState(false);

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
    } catch {
      setCameraError(isFr ? 'Impossible d’accéder à la caméra.' : 'Could not access camera.');
    }
  }, [isFr]);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stream]);

  const enterRecordMode = useCallback(() => {
    setRecordedBlob(null);
    setResult(null);
    setAnalyzeError(null);
    setSavedFlag(false);
    setFaceAbsenceInvalid(false);
    setElapsed(0);
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.controls = false;
      videoRef.current.srcObject = null;
    }
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (isOpen) {
      if (!initializedRef.current) {
        initializedRef.current = true;
        enterRecordMode();
      }
    } else {
      initializedRef.current = false;
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      setRecordedBlob(null);
      setResult(null);
      setAnalyzeError(null);
      setElapsed(0);
    }
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
        videoRef.current.muted = false;
        videoRef.current.controls = true;
        videoRef.current.play().catch(() => {});
      }
    };
    recorder.start(1000);
    startTimeRef.current = Date.now();
    setIsRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(secs);
      if (secs >= MAX_DURATION) stopRecording();
    }, 500);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (startTimeRef.current) {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }
    setIsRecording(false);
  };

  const analyzeVideo = async () => {
    if (!recordedBlob || !profileId) return;
    if (elapsed < MIN_DURATION && !faceAbsenceInvalid) {
      setAnalyzeError(
        isFr
          ? `Enregistrement trop court (${formatTime(elapsed)}). Minimum 1 min 30 requis.`
          : `Recording too short (${formatTime(elapsed)}). Minimum 1:30 required.`
      );
      return;
    }
    if (faceAbsenceInvalid) return;

    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('video', new File([recordedBlob], 'language-video.webm', { type: 'video/webm' }));
      formData.append('languageName', languageName);
      formData.append('expectedProficiency', expectedProficiency);
      if (languageCode) formData.append('languageCode', languageCode);
      if (languageId) formData.append('languageId', languageId);

      const response = await fetch(dashRepApiUrl(`/profiles/${profileId}/language/analyze-video`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Server error ${response.status}`);
      }

      const json = await response.json();
      const data: AnalysisPayload = json.data;
      setResult(data);
      if (data?.saved) {
        setSavedFlag(true);
        onAnalysisComplete?.();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setAnalyzeError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const faceMatchActive = isOpen && isRecording && !!stream && !cameraError;
  const { status: faceMatchStatus, noFaceStreak } = useLiveFaceMatch({
    videoRef,
    referencePhotoUrl,
    active: faceMatchActive,
  });

  useEffect(() => {
    if (!isRecording || faceAbsenceInvalid) return;
    if (noFaceStreak >= ABSENCE_CUT_TICKS) {
      setFaceAbsenceInvalid(true);
      stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noFaceStreak, isRecording, faceAbsenceInvalid]);

  if (!isOpen) return null;

  const timeRemaining = MAX_DURATION - elapsed;
  const progressPct = (elapsed / MAX_DURATION) * 100;
  const showVideoControls = !!recordedBlob && !isRecording;
  const assessment = result?.assessment;
  const languageMatched = assessment?.languageMatch?.matches === true;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center px-4 pt-20 pb-4 bg-black/70 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[calc(100vh-6rem)] bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-harx-500/20 rounded-xl">
              <Globe className="w-5 h-5 text-harx-300" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                {isFr ? 'Vérification linguistique' : 'Language verification'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {languageName} · {expectedProficiency}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          <div className="md:w-80 flex-shrink-0 bg-slate-900 flex flex-col">
            <div className="relative flex-1 bg-black min-h-[220px]">
              {cameraError && !recordedBlob ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <VideoOff className="w-10 h-10 text-slate-500" />
                  <p className="text-sm text-slate-400">{cameraError}</p>
                  <button onClick={startCamera} className="px-4 py-2 bg-harx-600 text-white rounded-xl text-xs font-black">
                    {isFr ? 'Réessayer' : 'Retry'}
                  </button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  className={`w-full h-full ${showVideoControls ? 'object-contain' : 'object-cover'}`}
                  playsInline
                  autoPlay={!showVideoControls}
                  controls={showVideoControls}
                />
              )}

              {isRecording && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full">
                  <Circle className="w-2.5 h-2.5 text-red-500 fill-red-500 animate-pulse" />
                  <span className="text-xs font-black text-white">{formatTime(elapsed)}</span>
                </div>
              )}

              {faceMatchActive && faceMatchStatus === 'no-face' && noFaceStreak >= ABSENCE_THREAT_TICKS && (
                <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-none">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600/90 text-white text-xs font-black">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    {isFr ? 'Revenez dans le cadre ou l’enregistrement sera annulé.' : 'Return to the frame or recording will be cancelled.'}
                  </div>
                </div>
              )}
            </div>

            {isRecording && (
              <div className="h-1 bg-slate-700">
                <div
                  className={`h-full transition-all ${timeRemaining <= 15 ? 'bg-red-500' : 'bg-harx-500'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            <div className="px-4 py-4 space-y-3">
              {!recordedBlob && !isRecording && (
                <>
                  <p className="text-xs text-slate-400 text-center leading-relaxed">
                    {isFr
                      ? `Parlez en ${languageName} pendant 1 min 30 à 3 min. Présentez-vous — l’IA vérifie la langue et le niveau ${expectedProficiency}.`
                      : `Speak in ${languageName} for 1:30 to 3 minutes. Introduce yourself — AI will verify the language and ${expectedProficiency} level.`}
                  </p>
                  <button
                    onClick={startRecording}
                    disabled={!!cameraError || !stream}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 text-white rounded-2xl text-sm font-black transition-all active:scale-95"
                  >
                    <Circle className="w-4 h-4 fill-white" />
                    {isFr ? 'Démarrer' : 'Start recording'}
                  </button>
                </>
              )}

              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl text-sm font-black"
                >
                  <Square className="w-4 h-4 fill-white" />
                  {isFr ? 'Arrêter' : 'Stop'}
                </button>
              )}

              {recordedBlob && !analyzing && (
                <div className="space-y-2">
                  {faceAbsenceInvalid ? (
                    <button onClick={enterRecordMode} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-harx-600 text-white rounded-2xl text-sm font-black">
                      <RotateCcw className="w-4 h-4" />
                      {isFr ? 'Réenregistrer' : 'Record again'}
                    </button>
                  ) : (
                    <>
                      <button onClick={enterRecordMode} className="w-full py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-black">
                        <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                        {isFr ? 'Refaire' : 'Retake'}
                      </button>
                      <button
                        onClick={analyzeVideo}
                        disabled={!!result && savedFlag}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-harx-600 to-indigo-600 text-white rounded-2xl text-sm font-black shadow-lg disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        {result ? (isFr ? 'Analyse terminée' : 'Analysis done') : isFr ? 'Analyser avec l’IA' : 'Analyze with AI'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {analyzing && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-10 h-10 text-harx-500 animate-spin" />
                <p className="text-sm font-black text-slate-700">
                  {isFr ? 'Analyse en cours…' : 'Analyzing…'}
                </p>
                <p className="text-xs text-slate-500 text-center max-w-xs">
                  {isFr
                    ? `Vérification que vous parlez bien en ${languageName} au niveau ${expectedProficiency}.`
                    : `Checking that you speak ${languageName} at ${expectedProficiency} level.`}
                </p>
              </div>
            )}

            {analyzeError && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-black text-red-700">{isFr ? 'Échec' : 'Failed'}</p>
                  <p className="text-xs text-red-500 mt-1">{analyzeError}</p>
                </div>
              </div>
            )}

            {result && assessment && (
              <div className="space-y-4 animate-in fade-in duration-500">
                {savedFlag && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
                    <CheckCircle className="w-4 h-4" />
                    {isFr ? 'Langue vérifiée et enregistrée sur votre profil.' : 'Language verified and saved to your profile.'}
                  </div>
                )}

                {!languageMatched && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-amber-800">
                        {isFr ? 'Langue non correspondante' : 'Language mismatch'}
                      </p>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        {localize(assessment.languageMatch?.reason, uiLang) ||
                          (isFr
                            ? `Vous deviez parler en ${languageName}. Réenregistrez en ${languageName}.`
                            : `You were expected to speak ${languageName}. Please record again in ${languageName}.`)}
                      </p>
                      {assessment.languageMatch?.detectedLanguage && (
                        <p className="text-[11px] text-amber-600 mt-2 font-bold">
                          {isFr ? 'Détecté :' : 'Detected:'} {assessment.languageMatch.detectedLanguage}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {languageMatched && (
                  <>
                    <div className="rounded-2xl border border-harx-100 overflow-hidden bg-white">
                      <div className="px-4 py-3 bg-gradient-to-r from-harx-50 to-indigo-50 border-b border-harx-100 flex items-center justify-between">
                        <span className="text-xs font-black text-harx-700 uppercase tracking-widest">
                          {isFr ? 'Résultat' : 'Result'}
                        </span>
                        <span className="px-2.5 py-1 bg-white border border-harx-100 rounded-full text-xs font-black text-harx-700">
                          {assessment.cefr} · {assessment.overallScore}%
                        </span>
                      </div>
                      <p className="p-4 text-sm text-slate-700 leading-relaxed">
                        {localize(assessment.summary, uiLang)}
                      </p>
                      {!assessment.meetsClaimedLevel && (
                        <p className="px-4 pb-4 text-xs text-amber-700 font-semibold">
                          {isFr
                            ? `Le niveau mesuré (${assessment.cefr}) est inférieur au niveau déclaré (${expectedProficiency}). Le profil a été mis à jour avec le niveau mesuré.`
                            : `Measured level (${assessment.cefr}) is below your claimed level (${expectedProficiency}). Profile updated with measured level.`}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: isFr ? 'Aisance' : 'Fluency', score: assessment.fluency?.score ?? 0 },
                        { label: isFr ? 'Grammaire' : 'Grammar', score: assessment.grammar?.score ?? 0 },
                        { label: isFr ? 'Vocabulaire' : 'Vocabulary', score: assessment.vocabulary?.score ?? 0 },
                        { label: isFr ? 'Cohérence' : 'Coherence', score: assessment.coherence?.score ?? 0 },
                      ].map((m) => (
                        <div key={m.label} className="rounded-xl bg-white border border-slate-100 p-3">
                          <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase">
                            <span>{m.label}</span>
                            <span>{m.score}%</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${scoreColor(m.score)}`} style={{ width: `${m.score}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {result.fraudCheck?.fraudRisk && result.fraudCheck.fraudRisk !== 'low' && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 text-xs text-slate-600">
                    <ShieldCheck className="w-4 h-4" />
                    {isFr ? 'Contrôle d’identité :' : 'Identity check:'}{' '}
                    {result.fraudCheck.fraudRisk}
                  </div>
                )}
              </div>
            )}

            {!analyzing && !result && !analyzeError && (
              <div className="text-center py-10 text-slate-400">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-semibold">
                  {isFr
                    ? `Enregistrez une vidéo en ${languageName} pour valider votre niveau ${expectedProficiency}.`
                    : `Record a video in ${languageName} to validate your ${expectedProficiency} level.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
