import { useCallback, useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';

// face-api model weights are loaded from a CDN (no need to self-host).
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model';

// Euclidean distance between 128-d descriptors. Lower = more similar.
// < 0.55 is a confident match for the same person across lighting/angle changes.
const MATCH_THRESHOLD = 0.55;

// How often we sample the live video while recording.
const CHECK_INTERVAL_MS = 2000;

export type FaceMatchStatus =
  | 'idle' // nothing to do yet
  | 'loading' // models / reference descriptor loading
  | 'unavailable' // models or reference could not be loaded (feature disabled silently)
  | 'no-reference' // no profile photo to compare against
  | 'checking' // running but no conclusion yet
  | 'match' // live face matches the profile photo
  | 'mismatch' // live face does NOT match the profile photo
  | 'no-face'; // no face currently visible in the video

let modelsPromise: Promise<boolean> | null = null;

// Load the detector + landmark + recognition models exactly once per session.
const ensureModels = (): Promise<boolean> => {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
      .then(() => true)
      .catch((err) => {
        console.warn('Live face-match models failed to load:', err?.message || err);
        modelsPromise = null; // allow a later retry
        return false;
      });
  }
  return modelsPromise;
};

interface UseLiveFaceMatchArgs {
  videoRef: React.RefObject<HTMLVideoElement>;
  referencePhotoUrl?: string | null;
  active: boolean;
}

/**
 * Continuously compares the face in a live <video> against a reference profile
 * photo and reports a match / mismatch status. Purely client-side (TensorFlow.js
 * via face-api) so it can warn the user live WITHOUT interrupting the recording.
 */
export function useLiveFaceMatch({ videoRef, referencePhotoUrl, active }: UseLiveFaceMatchArgs) {
  const [status, setStatus] = useState<FaceMatchStatus>('idle');
  // Number of consecutive samples with NO detectable face (person left the frame).
  const [noFaceStreak, setNoFaceStreak] = useState(0);
  const referenceDescriptorRef = useRef<Float32Array | null>(null);
  const detectorOptionsRef = useRef<faceapi.TinyFaceDetectorOptions | null>(null);
  const runningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks the photo URL we have already prepared a descriptor for, so the heavy
  // tfjs work runs only ONCE and only when matching actually starts.
  const preparedUrlRef = useRef<string | null>(null);

  // Lazily load models + build the reference descriptor. All heavy tfjs work is
  // deferred until matching is first activated (i.e. when recording starts), so
  // opening the modal / preview never blocks the main thread.
  const prepare = useCallback(async (): Promise<boolean> => {
    if (!referencePhotoUrl) {
      setStatus('no-reference');
      return false;
    }
    if (preparedUrlRef.current === referencePhotoUrl && referenceDescriptorRef.current) {
      return true; // already prepared for this photo
    }

    setStatus('loading');
    const ok = await ensureModels();
    if (!ok) {
      setStatus('unavailable');
      return false;
    }
    detectorOptionsRef.current = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.5,
    });
    try {
      const img = await faceapi.fetchImage(referencePhotoUrl);
      const detection = await faceapi
        .detectSingleFace(img, detectorOptionsRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) {
        setStatus('unavailable');
        return false;
      }
      referenceDescriptorRef.current = detection.descriptor;
      preparedUrlRef.current = referencePhotoUrl;
      return true;
    } catch (err: any) {
      console.warn('Could not build reference face descriptor:', err?.message || err);
      setStatus('unavailable');
      return false;
    }
  }, [referencePhotoUrl]);

  // Reset cached descriptor when the reference photo changes.
  useEffect(() => {
    referenceDescriptorRef.current = null;
    preparedUrlRef.current = null;
  }, [referencePhotoUrl]);

  const runCheck = useCallback(async () => {
    const video = videoRef.current;
    const reference = referenceDescriptorRef.current;
    const options = detectorOptionsRef.current;
    if (!video || !reference || !options) return;
    if (video.readyState < 2 || video.videoWidth === 0) return; // not enough data yet
    if (runningRef.current) return; // avoid overlapping inferences
    runningRef.current = true;
    try {
      const detection = await faceapi
        .detectSingleFace(video, options)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) {
        setStatus('no-face');
        setNoFaceStreak((n) => n + 1);
        return;
      }
      setNoFaceStreak(0);
      const distance = faceapi.euclideanDistance(reference, detection.descriptor);
      setStatus(distance <= MATCH_THRESHOLD ? 'match' : 'mismatch');
    } catch {
      // transient inference error — keep previous status
    } finally {
      runningRef.current = false;
    }
  }, [videoRef]);

  // Start the loop only while active; do all preparation lazily here.
  useEffect(() => {
    let cancelled = false;
    const clear = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (!active) {
      clear();
      setNoFaceStreak(0);
      return clear;
    }

    (async () => {
      const ready = await prepare();
      if (cancelled || !active) return;
      if (!ready) return;
      setStatus('checking');
      setNoFaceStreak(0);
      runCheck();
      intervalRef.current = setInterval(runCheck, CHECK_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      clear();
    };
  }, [active, prepare, runCheck]);

  // Approximate continuous absence duration, derived from the sampling interval.
  const noFaceMs = noFaceStreak * CHECK_INTERVAL_MS;

  return { status, noFaceStreak, noFaceMs };
}
