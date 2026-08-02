import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react';

interface PremiumAudioPlayerProps {
  url: string;
}

export function PremiumAudioPlayer({ url }: PremiumAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);

  // Generate deterministic waveform
  useEffect(() => {
    const segments = 40; // Fewer segments for thicker bars
    const data = [];
    const seed = url.length;
    for (let i = 0; i < segments; i++) {
      const val = Math.abs(Math.sin(seed + i * 0.3) * 0.6 + Math.random() * 0.4);
      data.push(Math.max(0.15, val));
    }
    setWaveform(data);
  }, [url]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (audioRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      audioRef.current.currentTime = percentage * duration;
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-2xl rounded-[32px] p-5 border border-white/10 shadow-2xl flex items-center gap-5 w-full max-w-lg mx-auto group">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <button
        onClick={togglePlay}
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-harx-500 to-harx-alt-500 text-white flex items-center justify-center shadow-xl shadow-harx-500/30 hover:scale-105 active:scale-95 transition-all shrink-0"
      >
        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
      </button>

      <div className="flex-1 flex flex-col gap-3">
        <div 
          className="h-10 flex items-end gap-[3px] cursor-pointer relative"
          onClick={handleSeek}
        >
          {waveform.map((val, i) => {
            const progress = (currentTime / duration) || 0;
            const isPlayed = (i / waveform.length) < progress;
            // Add a slight animation if playing
            const animDelay = `${i * 0.05}s`;
            
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-300 ${
                  isPlayed ? 'bg-gradient-to-t from-harx-500 to-harx-alt-400' : 'bg-slate-700/50'
                } ${isPlaying && isPlayed ? 'animate-pulse' : ''}`}
                style={{ 
                  height: `${val * 100}%`,
                  animationDelay: animDelay,
                  minWidth: '3px'
                }}
              ></div>
            );
          })}
        </div>
        
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
          <span className="text-harx-400">{formatTime(currentTime)}</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 opacity-60">
              <Volume2 className="w-3 h-3" />
              <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-2/3 h-full bg-slate-600 rounded-full"></div>
              </div>
            </div>
            <span className="opacity-80">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); if(audioRef.current) audioRef.current.currentTime = 0 }}
        className="p-2 text-slate-600 hover:text-white transition-colors"
        title="Restart"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}
