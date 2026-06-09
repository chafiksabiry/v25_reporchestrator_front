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

      </div>

    </div>
  );
};
