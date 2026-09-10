import React from 'react';
import { Mic, Flame, Moon, Sparkles, MessageSquareQuote } from 'lucide-react';

interface JockeysConsoleProps {
  currentSpeaker: 'Jax' | 'Nova' | 'Music' | 'Static' | 'None';
  activeLineText?: string;
  activeEmotion?: string;
  vuLeft: number;
  vuRight: number;
  accent: string;
}

export const JockeysConsole: React.FC<JockeysConsoleProps> = ({
  currentSpeaker,
  activeLineText,
  activeEmotion,
  vuLeft,
  vuRight,
  accent,
}) => {
  const isJaxActive = currentSpeaker === 'Jax';
  const isNovaActive = currentSpeaker === 'Nova';
  const isMusicActive = currentSpeaker === 'Music';

  return (
    <div className="w-full bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 lg:p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
      {/* Subtle Studio Ambient lighting glow based on speaker */}
      <div 
        className={`absolute -top-24 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
          isJaxActive ? 'bg-amber-500/15 opacity-100' : 'opacity-0'
        }`} 
      />
      <div 
        className={`absolute -top-24 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
          isNovaActive ? 'bg-cyan-500/15 opacity-100' : 'opacity-0'
        }`} 
      />

      {/* Header bar of the Jockey Desk */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-semibold">
            VR Hyper pulse 94.3 FM • On-Air Studio Booth (Indiranagar, Bengaluru)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-neutral-400">Current Feed:</span>
          <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
            isJaxActive 
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : isNovaActive
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : isMusicActive
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'bg-neutral-800 text-neutral-400'
          }`}>
            {isJaxActive ? 'DJ JAX (MIC 1)' : isNovaActive ? 'NOVA (MIC 2)' : isMusicActive ? 'STATION MUSIC BED' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Dual Jockeys Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        
        {/* DJ JAX Card */}
        <div className={`rounded-xl p-4 transition-all duration-300 border relative ${
          isJaxActive
            ? 'bg-gradient-to-b from-amber-950/40 to-neutral-950 border-amber-500/60 shadow-[0_0_24px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40'
            : 'bg-neutral-950/60 border-neutral-800/80 opacity-80'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                  isJaxActive 
                    ? 'bg-amber-500/25 border-2 border-amber-400 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
                    : 'bg-neutral-800 border border-neutral-700'
                }`}>
                  🧢
                </div>
                {isJaxActive && (
                  <span className="absolute -bottom-1 -right-1 bg-amber-500 text-black p-0.5 rounded-full">
                    <Mic className="w-3 h-3" />
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white font-mono">DJ JAX</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5 text-amber-400" /> Sarcastic & Fast
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Bengaluru Techie & Street Banter RJ</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-neutral-400">Voice: Puck (Neural / en-IN)</span>
                  <span className="text-[10px] font-mono text-neutral-400">• Pan: R 25%</span>
                </div>
              </div>
            </div>

            {/* Jax Mic VU Meter */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-mono text-neutral-400">MIC 1</span>
              <div className="w-12 h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 p-0.5 flex items-center">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 rounded-full transition-all duration-75"
                  style={{ width: `${isJaxActive ? Math.max(15, vuRight) : 4}%` }}
                />
              </div>
            </div>
          </div>

          {/* Jax Persona Quote / Status */}
          <div className="mt-3.5 pt-3 border-t border-neutral-800/60 text-xs text-neutral-300">
            {isJaxActive ? (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                <MessageSquareQuote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                      {activeEmotion || 'speaking'}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono animate-pulse">● LIVE VOICE</span>
                  </div>
                  <p className="text-xs text-neutral-100 italic leading-relaxed">
                    "{activeLineText || 'Hold the phone! You will not believe this news...'}"
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-neutral-400 text-xs italic">
                "Wait till you hear the chat roasts today... I got my soundboard ready."
              </p>
            )}
          </div>
        </div>

        {/* NOVA Card */}
        <div className={`rounded-xl p-4 transition-all duration-300 border relative ${
          isNovaActive
            ? 'bg-gradient-to-b from-cyan-950/40 to-neutral-950 border-cyan-500/60 shadow-[0_0_24px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40'
            : 'bg-neutral-950/60 border-neutral-800/80 opacity-80'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                  isNovaActive 
                    ? 'bg-cyan-500/25 border-2 border-cyan-400 scale-105 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                    : 'bg-neutral-800 border border-neutral-700'
                }`}>
                  🎧
                </div>
                {isNovaActive && (
                  <span className="absolute -bottom-1 -right-1 bg-cyan-500 text-black p-0.5 rounded-full">
                    <Mic className="w-3 h-3" />
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white font-mono">NOVA</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <Moon className="w-2.5 h-2.5 text-cyan-400" /> Smooth & Deadpan
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Namma Bengaluru's Velvet Voice & Filter Coffee Guru</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-neutral-400">Voice: Kore (Neural / en-IN)</span>
                  <span className="text-[10px] font-mono text-neutral-400">• Pan: L 25%</span>
                </div>
              </div>
            </div>

            {/* Nova Mic VU Meter */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-mono text-neutral-400">MIC 2</span>
              <div className="w-12 h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 p-0.5 flex items-center">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 rounded-full transition-all duration-75"
                  style={{ width: `${isNovaActive ? Math.max(15, vuLeft) : 4}%` }}
                />
              </div>
            </div>
          </div>

          {/* Nova Persona Quote / Status */}
          <div className="mt-3.5 pt-3 border-t border-neutral-800/60 text-xs text-neutral-300">
            {isNovaActive ? (
              <div className="flex items-start gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2.5">
                <MessageSquareQuote className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                      {activeEmotion || 'speaking'}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono animate-pulse">● LIVE VOICE</span>
                  </div>
                  <p className="text-xs text-neutral-100 italic leading-relaxed">
                    "{activeLineText || 'Breathe, Jax. The universe is chaotic enough as it is...'}"
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-neutral-400 text-xs italic">
                "Keep the frequencies warm out there. Let's see what the community has in store."
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Broadcast Accent Note */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400 px-1 font-mono">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Active Dialect: <strong className="text-neutral-200">{accent}</strong>
        </span>
        <span className="text-neutral-400">
          Stereo Proximity & Broadcast DSP Active
        </span>
      </div>
    </div>
  );
};
