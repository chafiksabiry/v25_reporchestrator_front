import React,{ useState, useEffect } from 'react';
import { AudioLoopbackTest } from '../services/AudioLoopbackTest';

let loopbackTest: AudioLoopbackTest | null = null;

export function AudioLoopbackTestUI() {
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (loopbackTest) {
        loopbackTest.stop();
      }
    };
  }, []);

  useEffect(() => {
    // Update stats every 500ms when running
    if (!isRunning) return;

    const interval = setInterval(() => {
      if (loopbackTest) {
        setStats(loopbackTest.getStats());
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStart = async () => {
    try {
      setError(null);
      if (!loopbackTest) {
        loopbackTest = new AudioLoopbackTest();
      }
      await loopbackTest.start();
      setIsRunning(true);
    } catch (err) {
      console.error('Error starting loopback test:', err);
      setError(err instanceof Error ? err.message : 'Failed to start test');
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    try {
      if (loopbackTest) {
        await loopbackTest.stop();
      }
      setIsRunning(false);
      setStats(null);
    } catch (err) {
      console.error('Error stopping loopback test:', err);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 w-96 z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          🔄 Audio Loopback Test
        </h3>
        <button
          onClick={() => {
            const el = document.getElementById('loopback-test');
            if (el) el.style.display = 'none';
          }}
          className="text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="mb-3">
        <p className="text-slate-300 text-sm mb-2">
          Ce test capture votre voix, l'encode en PCMU (comme pour Telnyx), puis la décode et la rejoue.
        </p>
        <p className="text-slate-400 text-xs">
          Pipeline: Micro → 8kHz → PCMU → Decode → Speakers
        </p>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-500/20 border border-red-500 rounded text-red-200 text-sm">
          ❌ {error}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <button
          onClick={handleStart}
          disabled={isRunning}
          className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
            isRunning
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          ▶️ Start Test
        </button>
        <button
          onClick={handleStop}
          disabled={!isRunning}
          className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
            !isRunning
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          ⏹️ Stop Test
        </button>
      </div>

      {isRunning && stats && (
        <div className="bg-slate-900 rounded p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-semibold">Test Running</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-slate-400">Capture Rate</div>
              <div className="text-white font-mono">{stats.captureSampleRate} Hz</div>
            </div>
            <div>
              <div className="text-slate-400">Playback Rate</div>
              <div className="text-white font-mono">{stats.playbackSampleRate} Hz</div>
            </div>
            <div>
              <div className="text-slate-400">Queue Length</div>
              <div className="text-white font-mono">{stats.queueLength} chunks</div>
            </div>
            <div>
              <div className="text-slate-400">Latency</div>
              <div className="text-white font-mono">~{stats.latency} ms</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700">
            <div className="text-slate-400 text-xs mb-1">Instructions:</div>
            <ul className="text-slate-300 text-xs space-y-1 list-disc list-inside">
              <li>Parlez dans votre micro</li>
              <li>Vous devriez vous entendre avec un léger délai</li>
              <li>Vérifiez la qualité audio (bruit, distorsion)</li>
              <li>Regardez les logs dans la console (F12)</li>
            </ul>
          </div>
        </div>
      )}

      {!isRunning && (
        <div className="text-slate-400 text-xs">
          💡 Astuce: Ouvrez la console (F12) pour voir les logs détaillés
        </div>
      )}
    </div>
  );
}


