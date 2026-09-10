import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserProfile } from '../types';
import { Send, PhoneCall, MessageSquare, Radio, CheckCircle } from 'lucide-react';

interface CommunityChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, isCaller: boolean) => void;
  onSendReaction: (emoji: string) => void;
  userProfile?: UserProfile | null;
}

const QUICK_REACTIONS = ['🔥', '😂', '📻', '🤯', '👏', '💯', '🚀'];

export const CommunityChat: React.FC<CommunityChatProps> = ({
  messages,
  onSendMessage,
  onSendReaction,
  userProfile,
}) => {
  const [text, setText] = useState('');
  const [isCaller, setIsCaller] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim(), isCaller);
    setText('');
    setIsCaller(false);
  };

  const triggerReaction = (emoji: string) => {
    onSendReaction(emoji);
    const newId = Date.now() + Math.random();
    const xPos = 20 + Math.random() * 60;
    setFloatingEmojis((prev) => [...prev, { id: newId, emoji, x: xPos }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== newId));
    }, 1800);
  };

  return (
    <div className="w-full bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 lg:p-6 shadow-xl backdrop-blur-sm flex flex-col h-[520px] relative overflow-hidden">
      
      {/* Floating Reaction Emojis Animation */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {floatingEmojis.map((f) => (
          <div
            key={f.id}
            className="absolute text-2xl animate-float-fade"
            style={{
              left: `${f.x}%`,
              bottom: '80px',
            }}
          >
            {f.emoji}
          </div>
        ))}
      </div>

      {/* Chat Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
            Live Listener Chat & Call-In Line
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ON-AIR FEED SYNCED
        </div>
      </div>

      {/* Messages Stream */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar text-xs"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-2.5 rounded-xl border transition-all ${
              m.isCaller
                ? 'bg-amber-950/40 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                : 'bg-neutral-950/60 border-neutral-800/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                {m.avatar?.startsWith('http') ? (
                  <img src={m.avatar} alt={m.user} className="w-4 h-4 rounded-full object-cover border border-amber-500/40" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-sm">{m.avatar || '📻'}</span>
                )}
                <span className="font-mono font-bold text-white truncate max-w-[120px]">{m.user}</span>
                {m.isCaller && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                    <PhoneCall className="w-2 h-2" /> CALLER
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <p className="text-neutral-200 leading-relaxed font-sans">{m.text}</p>
          </div>
        ))}
      </div>

      {/* Quick Reaction Emojis Row */}
      <div className="py-2.5 flex items-center justify-between border-t border-neutral-800/80 gap-1 mt-2">
        <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline">React:</span>
        <div className="flex items-center justify-around flex-1 gap-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => triggerReaction(emoji)}
              className="p-1 sm:px-2 rounded-lg hover:bg-neutral-800 active:scale-125 transition-transform text-sm"
              title={`Send ${emoji} reaction`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input & Call-In Mode Form */}
      <form onSubmit={handleSend} className="space-y-2 pt-1 border-t border-neutral-800">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <label className="flex items-center gap-1.5 cursor-pointer text-amber-300 hover:text-amber-200">
            <input
              type="checkbox"
              checked={isCaller}
              onChange={(e) => setIsCaller(e.target.checked)}
              className="rounded bg-neutral-900 border-neutral-700 text-amber-500 focus:ring-0 cursor-pointer"
            />
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <Radio className="w-3 h-3 text-amber-400" />
              Send to Jockeys' Teleprompter (Call-In)
            </span>
          </label>
          <span className="text-[10px] text-neutral-400">RJs will react on-air</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={isCaller ? "Ask Jax & Nova a question or drop a joke..." : "Type your message to the chat..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-500"
            maxLength={240}
          />
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5"
          >
            <Send className="w-3 h-3" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </form>
    </div>
  );
};
