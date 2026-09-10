import React, { useState } from 'react';
import { TopicPollItem, BroadcastTone, UserProfile } from '../types';
import {
  ThumbsUp,
  ThumbsDown,
  Plus,
  Sparkles,
  TrendingUp,
  Radio,
  Sliders,
  Flag,
  CheckCircle2,
  Filter,
  ShieldCheck,
} from 'lucide-react';

interface TopicVotingProps {
  topics: TopicPollItem[];
  onVoteTopic: (topicId: string, direction: 'up' | 'down') => void;
  onSuggestTopic: (title: string, category: string) => void;
  onFlagTopic?: (topicId: string) => void;
  onPlayTopicNext?: (topic: TopicPollItem) => void;
  currentTone: BroadcastTone;
  toneVotes: Record<string, number>;
  onVoteTone: (tone: BroadcastTone) => void;
  userProfile?: UserProfile | null;
}

const TONES: { name: BroadcastTone; emoji: string; desc: string }[] = [
  { name: 'Sarcastic & Witty', emoji: '😏', desc: 'Roasts, sharp banter, spicy sarcasm' },
  { name: 'Wholesome & Cozy', emoji: '☕', desc: 'Warm vibes, uplifting curiosities' },
  { name: 'Late-Night Mystery', emoji: '🌌', desc: 'Conspiracies, space oddities, 3 AM thoughts' },
  { name: 'High-Energy Hype', emoji: '⚡', desc: 'Fast-paced, loud laughs, hyped delivery' },
  { name: 'Absurdist Puns', emoji: '🤡', desc: 'Dad jokes, wordplay, surreal logic' },
];

export const TopicVoting: React.FC<TopicVotingProps> = ({
  topics,
  onVoteTopic,
  onSuggestTopic,
  onFlagTopic,
  onPlayTopicNext,
  currentTone,
  toneVotes,
  onVoteTone,
  userProfile,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Tech & Quirky');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'All' | 'Top Ranked' | 'Jokes' | 'News'>('All');
  const [flaggedIds, setFlaggedIds] = useState<Record<string, boolean>>({});

  const handleSubmitTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onSuggestTopic(newTitle.trim(), newCategory);
    setNewTitle('');
    setIsSuggesting(false);
  };

  const handleFlag = (topicId: string) => {
    setFlaggedIds((prev) => ({ ...prev, [topicId]: true }));
    if (onFlagTopic) onFlagTopic(topicId);
  };

  // Calculate total tone votes
  const totalToneVotes: number =
    (Object.values(toneVotes) as number[]).reduce((a: number, b: number) => a + b, 0) || 1;

  // Filter topics
  const filteredTopics = topics.filter((t) => {
    if (activeTab === 'Top Ranked') return t.votes >= 30;
    if (activeTab === 'Jokes') return t.category.includes('Puns') || t.category.includes('Joke');
    if (activeTab === 'News') return t.category.includes('Headlines') || t.category.includes('Tech');
    return true;
  });

  return (
    <div className="w-full bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 lg:p-6 shadow-xl backdrop-blur-sm flex flex-col gap-6">
      
      {/* Tone Influence Section */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
              Broadcast Tone Steerer (Real-Time Voice Mood)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            Active: <strong className="text-amber-300">{currentTone}</strong>
          </span>
        </div>

        <p className="text-xs text-neutral-400 mb-3">
          Cast your vote to guide Jax & Nova's vocal inflection, comedy style, and reaction tempo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {TONES.map((t) => {
            const votes = toneVotes[t.name] || 0;
            const percentage = Math.round((votes / totalToneVotes) * 100);
            const isSelected = currentTone === t.name;

            return (
              <button
                key={t.name}
                onClick={() => onVoteTone(t.name)}
                className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/40'
                    : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Background vote progress bar */}
                <div
                  className={`absolute inset-0 transition-all ${
                    isSelected ? 'bg-amber-500/15' : 'bg-neutral-800/20 group-hover:bg-neutral-800/30'
                  }`}
                  style={{ width: `${percentage}%` }}
                />

                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{t.emoji}</span>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-white truncate">{t.name}</div>
                      <div className="text-[10px] text-neutral-400 truncate">{t.desc}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-amber-300">{percentage}%</span>
                    <div className="text-[9px] font-mono text-neutral-400">{votes} votes</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Community Content Filtering & Topic Priority Queue */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-neutral-800 gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
              Community Content Filtering & Voting
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Category Filter Tabs */}
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 text-[10px] font-mono text-neutral-400">
              {(['All', 'Top Ranked', 'News', 'Jokes'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    activeTab === tab ? 'bg-neutral-800 text-white font-semibold' : 'hover:text-neutral-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsSuggesting(!isSuggesting)}
              className="flex items-center gap-1 text-xs font-mono text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSuggesting ? 'Close' : 'Suggest'}</span>
            </button>
          </div>
        </div>

        {/* Suggest Topic Form */}
        {isSuggesting && (
          <form onSubmit={handleSubmitTopic} className="mb-4 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-200">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Submit News Story, Wild Mystery, or Joke Topic
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                {userProfile ? `as @${userProfile.displayName}` : 'as Anonymous Listener'}
              </span>
            </div>

            <input
              type="text"
              placeholder="e.g. Astronomers detect repeating radio signals from a distant comet..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-500"
              maxLength={120}
              required
            />

            <div className="flex items-center justify-between gap-3">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 outline-none"
              >
                <option value="Tech & Quirky">Tech & Quirky</option>
                <option value="Late Night Mystery">Late Night Mystery</option>
                <option value="Food & Science">Food & Science</option>
                <option value="Wild Headlines">Wild Headlines</option>
                <option value="Absurd Puns">Absurd Puns</option>
                <option value="Space & Music">Space & Music</option>
              </select>

              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors"
              >
                Submit to Community Queue
              </button>
            </div>
          </form>
        )}

        {/* Topics List with Community Prioritization & Moderation */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
          {filteredTopics.map((t, index) => {
            const isTopRanked = index === 0;
            const hasUpvoted = userProfile?.uid && t.upvoters?.includes(userProfile.uid);
            const hasDownvoted = userProfile?.uid && t.downvoters?.includes(userProfile.uid);
            const isFlagged = flaggedIds[t.id] || (t.moderationFlags && t.moderationFlags > 0);

            return (
              <div
                key={t.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  isTopRanked
                    ? 'bg-gradient-to-r from-emerald-950/30 to-neutral-950 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                    : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {isTopRanked && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5 animate-pulse" /> PRIORITY #1 ON-AIR
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-1.5 py-0.2 rounded border border-neutral-800">
                      {t.category}
                    </span>
                    <span className="text-[10px] text-neutral-400 truncate">
                      by @{t.submittedBy}
                    </span>
                    {t.status === 'approved' && (
                      <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5" title="Community Moderated & Approved">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Approved
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-white line-clamp-2">
                    {t.title}
                  </p>
                  {onPlayTopicNext && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        onClick={() => onPlayTopicNext(t)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 flex items-center gap-1 transition-colors"
                        title="Broadcast this topic next"
                      >
                        <Radio className="w-2.5 h-2.5" /> Broadcast Next
                      </button>
                    </div>
                  )}
                </div>

                {/* Rating & Voting Controls */}
                <div className="flex items-center gap-1.5 shrink-0 bg-neutral-900/90 border border-neutral-800 rounded-xl p-1">
                  {/* Upvote */}
                  <button
                    onClick={() => onVoteTopic(t.id, 'up')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      hasUpvoted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'hover:bg-neutral-800 text-neutral-400 hover:text-emerald-400'
                    }`}
                    title="Upvote (Boost broadcast priority)"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Net Rating Score */}
                  <span
                    className={`text-xs font-mono font-bold min-w-[24px] text-center ${
                      t.votes >= 30 ? 'text-emerald-300' : t.votes >= 10 ? 'text-amber-300' : 'text-neutral-300'
                    }`}
                  >
                    {t.votes}
                  </span>

                  {/* Downvote */}
                  <button
                    onClick={() => onVoteTopic(t.id, 'down')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      hasDownvoted
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : 'hover:bg-neutral-800 text-neutral-400 hover:text-red-400'
                    }`}
                    title="Downvote (Lower broadcast priority)"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Community Moderation Flag */}
                  <button
                    onClick={() => handleFlag(t.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isFlagged
                        ? 'text-red-400 bg-red-950/40'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
                    }`}
                    title="Community moderation: Flag inappropriate or irrelevant suggestion"
                  >
                    <Flag className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Priority note */}
        <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-neutral-400 border-t border-neutral-800/80 pt-2.5">
          <span>👑 Community Rating Rule: Topics with the highest score are automatically drafted for Jax & Nova's next segment.</span>
          <span className="text-emerald-400 shrink-0 ml-2">Real-Time Sync</span>
        </div>
      </div>

    </div>
  );
};
