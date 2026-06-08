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
  const [refReady, setRefReady] = useState(false);
  const referenceDescriptorRef = useRef<Float32Array | null>(null);
  const detectorOptionsRef = useRef<faceapi.TinyFaceDetectorOptions | null>(null);
  const runningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build the reference descriptor from the profile photo whenever it changes.
  useEffect(() => {
    let cancelled = false;
    referenceDescriptorRef.current = null;
    setRefReady(false);

    if (!referencePhotoUrl) {
      setStatus('no-reference');
      return;
    }

    setStatus('loading');
    (async () => {
      const ok = await ensureModels();
      if (cancelled) return;
      if (!ok) {
        setStatus('unavailable');
        return;
      }
      detectorOptionsRef.current = new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.5,
      });
      try {
        const img = await faceapi.fetchImage(referencePhotoUrl);
        if (cancelled) return;
        const detection = await faceapi
          .detectSingleFace(img, detectorOptionsRef.current)
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (cancelled) return;
        if (!detection) {
          // Can't read a face from the profile photo → silently disable.
          setStatus('unavailable');
          return;
        }
        referenceDescriptorRef.current = detection.descriptor;
        setRefReady(true);
        setStatus('checking');
      } catch (err: any) {
        console.warn('Could not build reference face descriptor:', err?.message || err);
        setStatus('unavailable');
      }
    })();

    return () => {
      cancelled = true;
    };
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
        return;
      }
      const distance = faceapi.euclideanDistance(reference, detection.descriptor);
      setStatus(distance <= MATCH_THRESHOLD ? 'match' : 'mismatch');
    } catch {
      // transient inference error — keep previous status
    } finally {
      runningRef.current = false;
    }
  }, [videoRef]);

  // Start/stop the sampling loop based on `active` and reference availability.
  useEffect(() => {
    const clear = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (!active || !refReady) {
      clear();
      return clear;
    }

    setStatus('checking');
    runCheck();
    intervalRef.current = setInterval(runCheck, CHECK_INTERVAL_MS);
    return clear;
  }, [active, refReady, runCheck]);

  return { status };
}
