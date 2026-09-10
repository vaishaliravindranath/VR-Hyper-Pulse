import React from 'react';
import { Sparkles } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

interface SoundboardProps {
  onTriggerEffect?: (effectName: string) => void;
}

const SOUND_EFFECTS = [
  { id: 'airhorn', label: 'Airhorn', emoji: '📢', color: 'hover:border-amber-500 hover:text-amber-400' },
  { id: 'rimshot', label: 'Ba-Dum-Tss', emoji: '🥁', color: 'hover:border-rose-500 hover:text-rose-400' },
  { id: 'applause', label: 'Applause', emoji: '👏', color: 'hover:border-emerald-500 hover:text-emerald-400' },
  { id: 'scratch', label: 'DJ Scratch', emoji: '🎛️', color: 'hover:border-cyan-500 hover:text-cyan-400' },
  { id: 'jingle', label: 'Station ID', emoji: '📻', color: 'hover:border-purple-500 hover:text-purple-400' },
  { id: 'bleep', label: 'Censor Bleep', emoji: '🤬', color: 'hover:border-red-500 hover:text-red-400' },
];

export const Soundboard: React.FC<SoundboardProps> = ({ onTriggerEffect }) => {
  const handlePlaySound = (id: string, label: string) => {
    audioEngine.playSoundEffect(id);
    if (onTriggerEffect) {
      onTriggerEffect(label);
    }
  };

  return (
    <div className="w-full bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
            Live Community Soundboard
          </h3>
        </div>
        <span className="text-[10px] font-mono text-neutral-400">
          Instant Web Audio Synthesizer
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {SOUND_EFFECTS.map((sfx) => (
          <button
            key={sfx.id}
            onClick={() => handlePlaySound(sfx.id, sfx.label)}
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-neutral-300 transition-all active:scale-95 active:bg-neutral-800 ${sfx.color} group`}
            title={`Trigger ${sfx.label}`}
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">
              {sfx.emoji}
            </span>
            <span className="text-[11px] font-mono font-medium truncate max-w-full">
              {sfx.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
