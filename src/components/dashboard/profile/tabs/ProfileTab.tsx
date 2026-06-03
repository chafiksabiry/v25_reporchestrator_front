import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Clock, Info, Loader2, Pencil, RefreshCw, RotateCcw, Video } from 'lucide-react';

const MAX_RECORDING_MS = 10 * 60 * 1000;

const formatMmSs = (ms: number) => {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

interface ProfileTabProps {
  profile: any;
  onSaveAbout?: (value: string) => Promise<void> | void;
  onReplaceVideo?: (file: File) => Promise<void> | void;
  isUploadingVideo?: boolean;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, onSaveAbout, onReplaceVideo, isUploadingVideo = false }) => {
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');
  const [isRecorderReady, setIsRecorderReady] = useState(false);
  const [isRecordingNow, setIsRecordingNow] = useState(false);
  const [wantsToRerecord, setWantsToRerecord] = useState(false);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string>('');
  const [isLivePreviewReady, setIsLivePreviewReady] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTickRef = useRef<number | null>(null);
  const recordingMaxTimeoutRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number>(0);

  useEffect(() => {
    setAboutDraft(String(profile?.professionalSummary?.profileDescription || ''));
  }, [profile?.professionalSummary?.profileDescription]);

  const clearRecordingTimers = () => {
    if (recordingTickRef.current) {
      window.clearInterval(recordingTickRef.current);
      recordingTickRef.current = null;
    }
    if (recordingMaxTimeoutRef.current) {
      window.clearTimeout(recordingMaxTimeoutRef.current);
      recordingMaxTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearRecordingTimers();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [recordedVideoUrl]);

  const stopCameraStream = () => {
    clearRecordingTimers();
    setRecordingElapsedMs(0);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setIsLivePreviewReady(false);
  };

  const attachStreamToPreview = async (stream: MediaStream) => {
    const bind = async (videoEl: HTMLVideoElement) => {
      videoEl.muted = true;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.srcObject = stream;
      setIsLivePreviewReady(false);

      const markReady = () => setIsLivePreviewReady(true);
      videoEl.onloadedmetadata = markReady;
      videoEl.onloadeddata = markReady;
      videoEl.oncanplay = markReady;
      videoEl.onplaying = markReady;

      try {
        await videoEl.play();
      } catch (playError) {
        console.error('Live preview playback failed:', playError);
      }

      const readinessCheckInterval = window.setInterval(() => {
        if (videoEl.readyState >= 2 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
          setIsLivePreviewReady(true);
          window.clearInterval(readinessCheckInterval);
        }
      }, 150);

      window.setTimeout(() => {
        window.clearInterval(readinessCheckInterval);
      }, 4000);
    };

    // The preview video is rendered only when isRecorderReady is true.
    // Retry briefly until the ref becomes available.
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i += 1) {
      const videoEl = liveVideoRef.current;
      if (videoEl) {
        await bind(videoEl);
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
  };

  const startRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: true,
      });
      mediaStreamRef.current = stream;
      const [videoTrack] = stream.getVideoTracks();
      if (videoTrack) {
        videoTrack.onunmute = () => setIsLivePreviewReady(true);
      }

      setIsRecorderReady(true);
      await attachStreamToPreview(stream);
      setRecordedVideoBlob(null);
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
        setRecordedVideoUrl('');
      }
    } catch (error) {
      console.error('Camera/microphone access failed:', error);
      window.alert('Unable to access camera/microphone.');
    }
  };

  const beginRecording = () => {
    if (!mediaStreamRef.current) return;
    clearRecordingTimers();
    setRecordingElapsedMs(0);
    recordingStartedAtRef.current = Date.now();

    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType: 'video/webm' });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      clearRecordingTimers();
      const chunks = recordedChunksRef.current;
      if (!chunks.length) {
        setIsRecordingNow(false);
        setRecordingElapsedMs(0);
        return;
      }
      const blob = new Blob(chunks, { type: 'video/webm' });
      setRecordedVideoBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      stopCameraStream();
      setIsRecorderReady(false);
      setIsRecordingNow(false);
      setRecordingElapsedMs(0);
    };

    recorder.start(1000);
    setIsRecordingNow(true);

    recordingTickRef.current = window.setInterval(() => {
      setRecordingElapsedMs(Date.now() - recordingStartedAtRef.current);
    }, 250);

    recordingMaxTimeoutRef.current = window.setTimeout(() => {
      stopRecording();
    }, MAX_RECORDING_MS);
  };

  const stopRecording = () => {
    clearRecordingTimers();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const resetRecordedDraft = () => {
    setRecordedVideoBlob(null);
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl('');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* About Section */}
      <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-harx-900 tracking-tight">About</h2>
          <button
            type="button"
            onClick={() => setIsEditingAbout(true)}
            className="inline-flex items-center justify-center p-2 rounded-lg bg-gradient-harx text-white hover:opacity-90 transition-all"
            title="Edit About"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {/* Profile Description */}
        <div className="mb-6">
          {isEditingAbout ? (
            <div className="space-y-3">
              <textarea
                value={aboutDraft}
                onChange={(e) => setAboutDraft(e.target.value)}
                rows={5}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-harx-100 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-harx-200"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAboutDraft(String(profile?.professionalSummary?.profileDescription || ''));
                    setIsEditingAbout(false);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onSaveAbout?.(aboutDraft);
                    setIsEditingAbout(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gradient-harx text-white text-xs font-bold uppercase tracking-wider hover:opacity-90"
                >
                  Save
                </button>
              </div>
            </div>
          ) : profile.professionalSummary?.profileDescription ? (
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{profile.professionalSummary.profileDescription}</p>
          ) : (
            <p className="text-slate-500 italic">No professional summary provided</p>
          )}
        </div>

        {/* Introduction Video Section */}
        <div className="border-t border-slate-200/50 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-harx-900">Introduction Video</h3>
            <button
              type="button"
              onClick={() => {
                setIsEditingVideo(true);
                setWantsToRerecord(!profile.personalInfo?.presentationVideo?.url);
              }}
              className="inline-flex items-center justify-center p-2 rounded-lg bg-gradient-harx text-white hover:opacity-90 transition-all"
              title="Edit Video"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>

          {isEditingVideo && (
            <div className="mb-4 overflow-hidden rounded-2xl border border-harx-100/80 bg-gradient-to-br from-white via-white to-harx-50/35 shadow-md ring-1 ring-slate-900/5">
              <div className="flex items-center gap-3 border-b border-harx-100/60 bg-white/90 px-4 py-3.5 backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-harx text-white shadow-md shadow-harx-900/10">
                  <Video className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black tracking-tight text-harx-900">Video capture</p>
                  <p className="truncate text-[11px] font-medium text-slate-500">Preview, record, then save to your profile</p>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                {wantsToRerecord && !recordedVideoUrl && (
                  <div className="flex gap-3 rounded-xl border border-amber-200/70 bg-gradient-to-r from-amber-50/90 to-white px-3.5 py-3 text-xs leading-relaxed text-slate-700 shadow-sm">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" strokeWidth={2.5} />
                    <p>
                      <span className="font-bold text-harx-900">Durée maximum : 10 minutes.</span>{' '}
                      L&apos;enregistrement s&apos;arrête automatiquement à cette limite ; un compteur s&apos;affiche pendant la capture.
                    </p>
                  </div>
                )}

                {!!profile.personalInfo?.presentationVideo?.url && !wantsToRerecord && !isRecorderReady && !recordedVideoBlob && !recordedVideoUrl && (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-lg ring-1 ring-slate-900/15">
                      <video controls className="aspect-video w-full object-cover">
                        <source src={profile.personalInfo.presentationVideo.url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setWantsToRerecord(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-harx-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-harx-800 shadow-sm transition-all hover:border-harx-300 hover:bg-harx-50/80"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-harx-500" />
                        Re-record
                      </button>
                    </div>
                  </div>
                )}

                {wantsToRerecord && !isRecorderReady && !recordedVideoBlob && (
                  <button
                    type="button"
                    onClick={startRecorder}
                    disabled={isUploadingVideo}
                    className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-harx px-4 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-harx-900/15 transition-all hover:shadow-xl hover:shadow-harx-900/20 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.22),_transparent_55%)] opacity-90" aria-hidden />
                    <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 transition-colors group-hover:bg-white/25">
                      <Video className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                    <span className="relative">Start recording</span>
                  </button>
                )}

                {isRecorderReady && (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-xl ring-1 ring-slate-900/20">
                      <video
                        ref={liveVideoRef}
                        muted
                        autoPlay
                        playsInline
                        className="aspect-video w-full object-cover"
                      />
                      {isRecordingNow && (
                        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-rose-600/95 px-2.5 py-1.5 text-white shadow-lg backdrop-blur-sm">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Rec</span>
                        </div>
                      )}
                      {isRecordingNow && (
                        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1.5 font-mono text-[11px] font-bold tabular-nums tracking-wide text-white shadow-lg ring-1 ring-white/10 backdrop-blur-md">
                          {formatMmSs(recordingElapsedMs)} <span className="text-white/50">/</span> {formatMmSs(MAX_RECORDING_MS)}
                        </div>
                      )}
                      {!isLivePreviewReady && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-950/55 backdrop-blur-[2px]">
                          <Loader2 className="h-7 w-7 animate-spin text-white" strokeWidth={2.25} />
                          <span className="text-xs font-bold uppercase tracking-wider text-white/95">Loading camera preview…</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] leading-snug text-slate-500 sm:max-w-[55%]">
                        Check framing and audio, then start. Use <span className="font-semibold text-slate-600">Stop</span> when you are done.
                      </p>
                      <div className="flex flex-wrap justify-end gap-2 sm:shrink-0">
                        {!isRecordingNow ? (
                          <button
                            type="button"
                            onClick={beginRecording}
                            className="inline-flex min-h-[2.75rem] min-w-[8.5rem] items-center justify-center rounded-xl bg-gradient-harx px-5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all hover:opacity-92 active:scale-[0.98]"
                          >
                            Record
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="inline-flex min-h-[2.75rem] min-w-[8.5rem] items-center justify-center rounded-xl bg-rose-600 px-5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-rose-900/10 ring-1 ring-rose-400/30 transition-all hover:bg-rose-500 active:scale-[0.98]"
                          >
                            Stop
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {recordedVideoUrl && (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-lg ring-1 ring-emerald-300/40">
                      <div className="absolute left-3 top-3 z-10 rounded-full border border-emerald-400/40 bg-emerald-950/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-100 backdrop-blur-sm">
                        Preview
                      </div>
                      <video controls src={recordedVideoUrl} className="aspect-video w-full object-cover" />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          resetRecordedDraft();
                          await startRecorder();
                        }}
                        disabled={isUploadingVideo}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-60"
                      >
                        Re-record
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!recordedVideoBlob) return;
                          const file = new File([recordedVideoBlob], 'presentation-video.webm', { type: 'video/webm' });
                          await onReplaceVideo?.(file);
                          setWantsToRerecord(false);
                          setIsEditingVideo(false);
                        }}
                        disabled={isUploadingVideo}
                        className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-xl bg-gradient-harx px-5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all hover:opacity-92 disabled:opacity-60"
                      >
                        {isUploadingVideo ? (
                          <span className="inline-flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Saving…
                          </span>
                        ) : (
                          'Use this video'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end border-t border-harx-100/70 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (isRecordingNow && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                        recordedChunksRef.current = [];
                        mediaRecorderRef.current.stop();
                      }
                      clearRecordingTimers();
                      stopCameraStream();
                      setIsEditingVideo(false);
                      setWantsToRerecord(false);
                      setIsRecorderReady(false);
                      setIsRecordingNow(false);
                      resetRecordedDraft();
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {!isEditingVideo && profile.personalInfo?.presentationVideo?.url ? (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-lg ring-1 ring-slate-900/15">
                <video controls className="aspect-video w-full object-cover">
                  <source src={profile.personalInfo.presentationVideo.url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="flex flex-wrap gap-6 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 backdrop-blur-sm">
                {profile.personalInfo.presentationVideo.duration && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-harx-400" />
                    <span>{Math.floor(profile.personalInfo.presentationVideo.duration)}s</span>
                  </div>
                )}
                {profile.personalInfo.presentationVideo.recordedAt && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-harx-400" />
                    <span>Recorded {new Date(profile.personalInfo.presentationVideo.recordedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          ) : !isEditingVideo ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-white p-4 text-sm text-amber-900 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg" aria-hidden>
                🎥
              </span>
              <p className="pt-1 leading-relaxed">
                A video introduction helps you stand out. Please add one to your profile.
              </p>
            </div>
          ) : null}
        </div>
      </div>

    </div>
  );
};
