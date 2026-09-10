import React, { useRef, useEffect, useState } from 'react';
import { RadioSegment, DialogueLine } from '../types';
import { Disc, ExternalLink, SkipForward, Music2, Sparkles, Volume2, Youtube, Play, Eye, EyeOff } from 'lucide-react';

interface BroadcastPlayerProps {
  segment: RadioSegment | null;
  activeLineIndex: number;
  isBroadcasting: boolean;
  isMusicPlaying: boolean;
  currentTrack?: {
    title: string;
    artist: string;
    genre: string;
    durationSeconds: number;
    youtubeVideoId?: string;
    youtubeUrl?: string;
  };
  musicSecondsLeft?: number;
  frequencyData: number[];
  onSkipNext: () => void;
  isGeneratingNext: boolean;
  quotaCooldownSeconds?: number;
}

export const BroadcastPlayer: React.FC<BroadcastPlayerProps> = ({
  segment,
  activeLineIndex,
  isBroadcasting,
  isMusicPlaying,
  currentTrack,
  musicSecondsLeft = 0,
  frequencyData,
  onSkipNext,
  isGeneratingNext,
  quotaCooldownSeconds = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const [showVideo, setShowVideo] = useState(true);
  const [manualPlayYouTube, setManualPlayYouTube] = useState(false);

  // Auto-scroll transcript to active speaking line
  useEffect(() => {
    if (activeLineRef.current && transcriptRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeLineIndex]);

  // Render Real-Time Spectrum Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const bars = 32;
    const barWidth = (width / bars) - 2;

    for (let i = 0; i < bars; i++) {
      const dataVal = frequencyData[i % frequencyData.length] || 4;
      const normalized = Math.min(1, dataVal / 220);
      const barHeight = Math.max(3, normalized * (height - 8));
      const x = i * (barWidth + 2);
      const y = height - barHeight;

      // Gradient color (amber to emerald to cyan)
      const grad = ctx.createLinearGradient(0, height, 0, 0);
      grad.addColorStop(0, '#f59e0b');
      grad.addColorStop(0.6, '#10b981');
      grad.addColorStop(1, '#06b6d4');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
      ctx.fill();
    }
  }, [frequencyData]);

  const youtubeId = currentTrack?.youtubeVideoId || 'k9Hh58Uv088';
  const youtubeUrl = currentTrack?.youtubeUrl || `https://www.youtube.com/watch?v=${youtubeId}`;
  const isYouTubeActive = isMusicPlaying || manualPlayYouTube;

  return (
    <div className="w-full bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 lg:p-6 shadow-xl backdrop-blur-sm flex flex-col gap-5">
      
      {/* Top Bar: Live Segment Details & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {segment?.category || 'News & Banter'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-neutral-300 bg-neutral-800 border border-neutral-700">
              Tone: {segment?.tone || 'Sarcastic & Witty'}
            </span>
            {isGeneratingNext && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-700/50 flex items-center gap-1 animate-pulse">
                <Sparkles className="w-2.5 h-2.5" /> Pre-fetching next segment...
              </span>
            )}
            {quotaCooldownSeconds > 0 ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 bg-amber-900/30 border border-amber-500/30 flex items-center gap-1" title="Local Broadcast Continuity Engine Active while rate limits reset">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Continuity Mode ({quotaCooldownSeconds}s)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 hidden sm:flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Gemini Grounded
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {segment?.title || 'VR Hyper pulse 94.3 FM Bengaluru • Live Banter Tuning In...'}
          </h2>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={onSkipNext}
            disabled={!isBroadcasting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:pointer-events-none text-xs text-neutral-200 border border-neutral-700 transition-colors"
            title="Skip to next banter or music segment"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Next Segment</span>
          </button>
        </div>
      </div>

      {/* Spectrum Visualizer & Audio Status */}
      <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-auto flex-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1.5">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-emerald-400" />
              SPECTRUM ANALYZER (24kHz FM BROADCAST)
            </span>
            <span className="text-neutral-400 font-mono">
              {isMusicPlaying ? 'TRACK INTERSTITIAL' : isBroadcasting ? 'TALK FEED' : 'OFFLINE'}
            </span>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={44}
            className="w-full h-11 bg-black/40 rounded-lg border border-neutral-800/60"
          />
        </div>
      </div>

      {/* Featured Song from YouTube Module */}
      {currentTrack && (
        <div className={`rounded-xl transition-all duration-300 border ${
          isMusicPlaying
            ? 'bg-gradient-to-br from-neutral-950 via-red-950/20 to-neutral-900 border-red-500/40 shadow-[0_0_25px_rgba(239,68,68,0.15)] ring-1 ring-red-500/30'
            : 'bg-neutral-950/70 border-neutral-800/80 hover:border-neutral-700'
        } p-4 flex flex-col gap-3`}>
          
          {/* Header & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isMusicPlaying
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 animate-pulse'
                  : 'bg-neutral-800 text-red-400'
              }`}>
                <Youtube className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                    {isMusicPlaying ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        ON AIR: YOUTUBE MUSIC BREAK
                      </>
                    ) : (
                      'FEATURED YOUTUBE TRACK'
                    )}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
                    {currentTrack.genre || 'South Indian Beats'}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 mt-0.5">
                  <span>{currentTrack.title}</span>
                  <span className="text-xs font-normal text-neutral-400">by {currentTrack.artist}</span>
                </h3>
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              {isYouTubeActive && (
                <button
                  onClick={() => setShowVideo(!showVideo)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono border border-neutral-700 transition-colors"
                  title={showVideo ? "Switch to Audio / Compact Mode" : "Show Video Player"}
                >
                  {showVideo ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showVideo ? 'Hide Video' : 'Show Video'}</span>
                </button>
              )}

              {!isMusicPlaying && (
                <button
                  onClick={() => setManualPlayYouTube(!manualPlayYouTube)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                    manualPlayYouTube
                      ? 'bg-red-600 hover:bg-red-700 text-white border-red-500'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{manualPlayYouTube ? 'Playing Song' : 'Play Song Now'}</span>
                </button>
              )}

              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 text-xs font-mono border border-red-800/50 transition-colors"
                title="Watch on official YouTube channel"
              >
                <span>YouTube</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>

              {isMusicPlaying && (
                <div className="text-right pl-2 border-l border-neutral-800">
                  <div className="text-[10px] font-mono text-neutral-400">Next talk in:</div>
                  <div className="text-sm font-bold font-mono text-red-400">{musicSecondsLeft}s</div>
                </div>
              )}
            </div>
          </div>

          {/* YouTube IFrame Video Player */}
          {isYouTubeActive && showVideo && (
            <div className="relative w-full rounded-xl overflow-hidden border border-neutral-800 bg-black aspect-video sm:max-h-72">
              <iframe
                id="youtube-player-frame"
                className="w-full h-full"
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&rel=0`}
                title={`${currentTrack.title} - ${currentTrack.artist}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )}

          {/* Audio Only Mode Pill */}
          {isYouTubeActive && !showVideo && (
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                  <Disc className="w-4 h-4 animate-spin" />
                </div>
                <div className="text-xs">
                  <span className="text-neutral-200 font-semibold">{currentTrack.title}</span>
                  <span className="text-neutral-400"> is playing in the background from YouTube.</span>
                </div>
              </div>
              <button
                onClick={() => setShowVideo(true)}
                className="text-xs font-mono text-red-400 hover:text-red-300 underline underline-offset-2 shrink-0"
              >
                Restore Video View
              </button>
            </div>
          )}
        </div>
      )}

      {/* Live Teleprompter / Transcript */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400 px-1">
          <span>LIVE TRANSCRIPT & BANTER STREAM</span>
          <span className="text-[11px] text-neutral-400">
            {segment?.dialogue?.length || 0} spoken turns
          </span>
        </div>

        <div
          ref={transcriptRef}
          className="h-64 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3.5 text-sm"
        >
          {segment?.dialogue && segment.dialogue.length > 0 ? (
            segment.dialogue.map((line: DialogueLine, idx: number) => {
              const isActive = idx === activeLineIndex;
              const isPast = idx < activeLineIndex;
              const isJax = line.speaker === 'Jax';

              return (
                <div
                  key={line.id || idx}
                  ref={isActive ? activeLineRef : null}
                  className={`p-3 rounded-xl transition-all duration-200 border ${
                    isActive
                      ? isJax
                        ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                        : 'bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30'
                      : isPast
                      ? 'bg-neutral-900/30 border-neutral-800/40 opacity-60'
                      : 'bg-neutral-900/50 border-neutral-800/60 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          isJax
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {line.speaker}
                      </span>

                      {line.emotion && (
                        <span className="text-[10px] font-mono text-neutral-400 italic">
                          ({line.emotion})
                        </span>
                      )}

                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ON MIC
                        </span>
                      )}
                    </div>

                    {line.soundEffect && line.soundEffect !== 'none' && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-amber-300 flex items-center gap-1">
                        🔊 [SFX: {line.soundEffect}]
                      </span>
                    )}
                  </div>

                  <p className={`leading-relaxed text-sm ${isActive ? 'text-white font-medium' : 'text-neutral-300'}`}>
                    {line.text}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
              <Music2 className="w-8 h-8 mb-2 text-neutral-600 animate-pulse" />
              <p className="text-sm font-medium text-neutral-400">
                {isBroadcasting ? 'Generating next live radio segment...' : 'Radio is currently paused.'}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Click "Tune In Live" to begin streaming real-time community radio.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Grounding / Internet News Sources */}
      {segment?.groundingSources && segment.groundingSources.length > 0 && (
        <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>INTERNET NEWS CITATIONS (GOOGLE SEARCH GROUNDING):</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {segment.groundingSources.map((src, i) => (
              <a
                key={i}
                href={src.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 hover:border-amber-500/50 text-neutral-300 hover:text-amber-300 text-xs px-2.5 py-1.5 rounded-lg transition-colors group"
              >
                <span className="truncate max-w-[200px]">{src.title}</span>
                <ExternalLink className="w-3 h-3 text-neutral-500 group-hover:text-amber-400 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
