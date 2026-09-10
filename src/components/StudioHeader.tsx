import React from 'react';
import { Radio, Volume2, VolumeX, Globe2, Wifi, Disc3, Mic2, Sparkles, LogIn, LogOut, User, Music } from 'lucide-react';
import { RegionalAccent, UserProfile } from '../types';

interface StudioHeaderProps {
  isBroadcasting: boolean;
  onToggleBroadcast: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isBgMusicEnabled?: boolean;
  onToggleBgMusic?: () => void;
  accent: RegionalAccent;
  onAccentChange: (accent: RegionalAccent) => void;
  activeListeners: number;
  stationFrequency: string;
  isGenerating: boolean;
  userProfile: UserProfile | null;
  onSignInGoogle: () => void;
  onSignOut: () => void;
}

const ACCENTS: RegionalAccent[] = [
  'South Indian (Namma Bengaluru)',
  'Standard Broadcast',
  'New York / Brooklyn',
  'London Pirate Radio',
  'Southern Charm',
  'Midwestern Chill',
  'Aussie Mate',
];

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  isBroadcasting,
  onToggleBroadcast,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  isBgMusicEnabled = true,
  onToggleBgMusic,
  accent,
  onAccentChange,
  activeListeners,
  stationFrequency,
  isGenerating,
  userProfile,
  onSignInGoogle,
  onSignOut,
}) => {
  return (
    <header className="w-full bg-neutral-950/90 border-b border-neutral-800/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: Station Identity & FM Dial */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                isBroadcasting 
                  ? 'bg-amber-500/20 border border-amber-500/60 shadow-[0_0_16px_rgba(245,158,11,0.35)]' 
                  : 'bg-neutral-900 border border-neutral-800'
              }`}>
                <Radio className={`w-6 h-6 ${isBroadcasting ? 'text-amber-400 animate-pulse' : 'text-neutral-500'}`} />
              </div>
              {isBroadcasting && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-mono">VR Hyper pulse</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
                  {stationFrequency}
                </span>
                <span className="text-xs text-amber-400/80 font-mono font-medium hidden sm:inline">NAMMA BENGALURU</span>
              </div>
              <p className="text-xs text-neutral-400 font-sans truncate max-w-[240px] sm:max-w-none">
                Bangalore Internet News & Jokes • South Indian Banter • Live Lo-Fi Beats
              </p>
            </div>
          </div>

          {/* On-Air badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all ${
            isBroadcasting
              ? 'bg-red-950/80 border border-red-500/70 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
              : 'bg-neutral-900 border border-neutral-800 text-neutral-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isBroadcasting ? 'bg-red-500 animate-ping' : 'bg-neutral-600'}`} />
            {isBroadcasting ? 'LIVE ON AIR' : 'OFF AIR'}
          </div>
        </div>

        {/* Center: Live Listeners & Real-Time Status */}
        <div className="flex items-center gap-4 text-xs text-neutral-300">
          <div className="flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 px-3 py-1.5 rounded-lg">
            <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-mono text-white font-semibold">{activeListeners.toLocaleString()}</span>
            <span className="text-neutral-400">tuning in</span>
          </div>

          {isGenerating && (
            <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded-lg text-xs animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Scouring internet news...</span>
            </div>
          )}
        </div>

        {/* Right: User Auth, Regional Accent & Broadcast Trigger */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap sm:flex-nowrap">
          
          {/* Google Sign-In & Auth Status */}
          {userProfile ? (
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1 text-xs">
              {userProfile.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-6 h-6 rounded-full border border-amber-500/40 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  {userProfile.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-medium text-white max-w-[90px] truncate hidden sm:inline">
                {userProfile.displayName.split(' ')[0]}
              </span>
              <button
                onClick={onSignOut}
                className="text-neutral-400 hover:text-red-400 p-1 transition-colors"
                title="Sign out of Firebase"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSignInGoogle}
              className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 hover:border-amber-500/50 rounded-xl px-2.5 py-1.5 text-xs text-neutral-200 transition-colors"
              title="Sign in with Google to vote and suggest topics"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="font-medium hidden sm:inline">Google Sign-In</span>
            </button>
          )}

          {/* Accent & Dialect Selector */}
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300">
            <Globe2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={accent}
              onChange={(e) => onAccentChange(e.target.value as RegionalAccent)}
              className="bg-transparent text-neutral-200 outline-none cursor-pointer text-xs font-medium pr-1"
              title="Select broadcast accent & vernacular"
            >
              {ACCENTS.map((acc) => (
                <option key={acc} value={acc} className="bg-neutral-900 text-neutral-100">
                  {acc}
                </option>
              ))}
            </select>
          </div>

          {/* Background Music Toggle */}
          {onToggleBgMusic && (
            <button
              onClick={onToggleBgMusic}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                isBgMusicEnabled
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300'
              }`}
              title={isBgMusicEnabled ? "Background Music Enabled (Click to Mute BG Music)" : "Background Music Muted (Click to Enable)"}
            >
              <Music className={`w-3.5 h-3.5 ${isBgMusicEnabled ? 'text-amber-400' : 'text-neutral-500'}`} />
              <span>BG Music: {isBgMusicEnabled ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {/* Volume Control */}
          <div className="hidden lg:flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5">
            <button
              onClick={onToggleMute}
              className="text-neutral-400 hover:text-white transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Master Tune In / Broadcast Button */}
          <button
            onClick={onToggleBroadcast}
            className={`px-5 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 shadow-sm ${
              isBroadcasting
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold shadow-[0_0_20px_rgba(245,158,11,0.4)]'
            }`}
          >
            {isBroadcasting ? (
              <>
                <Disc3 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Pause Radio</span>
              </>
            ) : (
              <>
                <Mic2 className="w-4 h-4 text-black" />
                <span>Tune In Live</span>
              </>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
