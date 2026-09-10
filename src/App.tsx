import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StudioHeader } from './components/StudioHeader';
import { JockeysConsole } from './components/JockeysConsole';
import { BroadcastPlayer } from './components/BroadcastPlayer';
import { TopicVoting } from './components/TopicVoting';
import { CommunityChat } from './components/CommunityChat';
import { Soundboard } from './components/Soundboard';
import { audioEngine } from './lib/audioEngine';
import { auth, onAuthStateChanged } from './lib/firebase';
import {
  subscribeToTopics,
  subscribeToChat,
  voteTopicInFirestore,
  submitTopicToFirestore,
  moderateTopicInFirestore,
  sendChatMessageToFirestore,
  signInWithGoogle,
  logOut,
  syncUserProfileInFirestore,
} from './lib/firestoreService';
import {
  RadioSegment,
  TopicPollItem,
  ChatMessage,
  BroadcastTone,
  RegionalAccent,
  DialogueLine,
  UserProfile,
} from './types';
import { Radio, Headphones, Sparkles, Volume2, ShieldCheck } from 'lucide-react';

export default function App() {
  // User Authentication & Profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Radio playback state
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isBgMusicEnabled, setIsBgMusicEnabled] = useState(true);
  const [accent, setAccent] = useState<RegionalAccent>('South Indian (Namma Bengaluru)');
  const [currentSpeaker, setCurrentSpeaker] = useState<'Jax' | 'Nova' | 'Music' | 'Static' | 'None'>('None');

  // Segments & Queue
  const [currentSegment, setCurrentSegment] = useState<RadioSegment | null>(null);
  const [nextSegmentQueue, setNextSegmentQueue] = useState<RadioSegment[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);
  const [isGeneratingSegment, setIsGeneratingSegment] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicSecondsLeft, setMusicSecondsLeft] = useState(0);

  // Community State (synchronized via Firestore)
  const [topics, setTopics] = useState<TopicPollItem[]>([]);
  const [currentTone, setCurrentTone] = useState<BroadcastTone>('Sarcastic & Witty');
  const [toneVotes, setToneVotes] = useState<Record<string, number>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeListeners, setActiveListeners] = useState(2840);
  const [stationFrequency, setStationFrequency] = useState('94.3 FM');

  // Real-time visualizer data
  const [visualizerData, setVisualizerData] = useState<{ frequencyData: number[]; vuLeft: number; vuRight: number }>({
    frequencyData: new Array(32).fill(2),
    vuLeft: 0,
    vuRight: 0,
  });

  // Quota & Rate-limit continuity tracking
  const [quotaCooldownSeconds, setQuotaCooldownSeconds] = useState<number>(0);

  // Topic cycling index to ensure topic is constantly changing
  const topicCycleIndexRef = useRef<number>(0);

  // Refs for tracking active playing state across async tasks
  const isBroadcastingRef = useRef(isBroadcasting);
  isBroadcastingRef.current = isBroadcasting;
  const skipBreakTriggerRef = useRef<(() => void) | null>(null);

  const currentSegmentRef = useRef(currentSegment);
  currentSegmentRef.current = currentSegment;

  const accentRef = useRef(accent);
  accentRef.current = accent;

  const currentToneRef = useRef(currentTone);
  currentToneRef.current = currentTone;

  const chatMessagesRef = useRef(chatMessages);
  chatMessagesRef.current = chatMessages;

  const nextSegmentQueueRef = useRef(nextSegmentQueue);
  nextSegmentQueueRef.current = nextSegmentQueue;

  const topicsRef = useRef(topics);
  topicsRef.current = topics;

  const isGeneratingRef = useRef(false);
  const lastSegmentRequestTimeRef = useRef<number>(0);

  // Tick down quota cooldown if active
  useEffect(() => {
    if (quotaCooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setQuotaCooldownSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [quotaCooldownSeconds]);

  // 1. Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await syncUserProfileInFirestore({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time Firestore Subscriptions for Topics & Chat
  useEffect(() => {
    const unsubTopics = subscribeToTopics((freshTopics) => {
      if (freshTopics && freshTopics.length > 0) {
        setTopics(freshTopics);
      }
    });

    const unsubChat = subscribeToChat((freshChat) => {
      if (freshChat && freshChat.length > 0) {
        setChatMessages(freshChat);
      }
    });

    return () => {
      unsubTopics();
      unsubChat();
    };
  }, []);

  // 3. Fallback polling for station tone and listeners
  const fetchStationState = useCallback(async () => {
    try {
      const res = await fetch('/api/radio/state');
      if (res.ok) {
        const data = await res.json();
        setCurrentTone(data.currentTone || 'Sarcastic & Witty');
        setToneVotes(data.toneVotes || {});
        setActiveListeners(data.activeListenersCount || 1420);
        if (data.stationFrequency) setStationFrequency(data.stationFrequency);
      }
    } catch (err) {
      console.warn('Failed to fetch station state:', err);
    }
  }, []);

  useEffect(() => {
    fetchStationState();
    const interval = setInterval(fetchStationState, 7000);
    return () => clearInterval(interval);
  }, [fetchStationState]);

  // Visualizer Animation Loop (60fps)
  useEffect(() => {
    let animId: number;
    const updateVisualizer = () => {
      if (isBroadcasting) {
        const data = audioEngine.getVisualizerData();
        setVisualizerData(data);
      } else {
        setVisualizerData({ frequencyData: new Array(32).fill(2), vuLeft: 0, vuRight: 0 });
      }
      animId = requestAnimationFrame(updateVisualizer);
    };
    animId = requestAnimationFrame(updateVisualizer);
    return () => cancelAnimationFrame(animId);
  }, [isBroadcasting]);

  // Helper to request a new segment from the backend with Google Search & Jokes
  const requestNewSegment = async (topicTitle?: string, category = 'news'): Promise<RadioSegment | null> => {
    if (isGeneratingRef.current) return null;
    
    // Throttle repeated fast calls (minimum 12s between network requests)
    const timeSinceLastReq = Date.now() - lastSegmentRequestTimeRef.current;
    if (timeSinceLastReq < 12000) {
      return null;
    }

    isGeneratingRef.current = true;
    lastSegmentRequestTimeRef.current = Date.now();
    setIsGeneratingSegment(true);

    try {
      // Dynamic topic selection: cycle through community topics & trending Bengaluru news
      let candidateTopic = topicTitle;
      if (!candidateTopic) {
        if (topicsRef.current && topicsRef.current.length > 0) {
          const idx = topicCycleIndexRef.current % topicsRef.current.length;
          candidateTopic = topicsRef.current[idx].title;
          topicCycleIndexRef.current = (topicCycleIndexRef.current + 1) % topicsRef.current.length;
        } else {
          const bangaloreTopics = [
            'Silk Board Junction vs Outer Ring Road: Can AI solve Bengaluru traffic before flying cars?',
            'Filter Coffee Showdown: Malleshwaram CTR vs Vidyarthi Bhavan vs Brahmin’s Coffee Bar',
            'Peak Bengaluru: Techie pitches seed round to auto driver after meter negotiation',
            'Is the 4:00 AM Nandi Hills sunrise bike ride worth freezing on the highway?',
            'Namma Metro Purple Line: The daily victory lap of East Bangalore commuters',
            'Local Slang 101: How "Kannada Gottilla" turns into "Macha, full scene illa!"',
            'Indiranagar 12th Main cafe culture: Where every second table is founding a unicorn',
            'Bangalore monsoon weather: Why 22°C rain makes everyone crave hot bajjis and filter kaapi',
          ];
          const idx = topicCycleIndexRef.current % bangaloreTopics.length;
          candidateTopic = bangaloreTopics[idx];
          topicCycleIndexRef.current = (topicCycleIndexRef.current + 1) % bangaloreTopics.length;
        }
      }

      const payload = {
        topic: candidateTopic,
        category,
        tone: currentToneRef.current,
        accent: accentRef.current,
        recentChat: chatMessagesRef.current.slice(-5),
        previousContext: currentSegmentRef.current ? `Discussed ${currentSegmentRef.current.topic}` : '',
        searchInternet: true,
      };

      const res = await fetch('/api/radio/generate-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to generate segment');
      const data = await res.json();
      
      if (data.quotaExhausted && data.cooldownRemaining) {
        setQuotaCooldownSeconds(data.cooldownRemaining);
      }

      return data.segment;
    } catch (err) {
      console.warn('Network issue in requestNewSegment, returning fallback:', err);
      return null;
    } finally {
      isGeneratingRef.current = false;
      setIsGeneratingSegment(false);
    }
  };

  // Play a radio segment dialogue sequentially with audio ducking and speaker animations
  const playSegmentDialogue = async (segment: RadioSegment) => {
    if (!isBroadcastingRef.current) return;

    setCurrentSegment(segment);
    setIsMusicPlaying(false);
    audioEngine.duckMusic(true);

    // Play optional intro sound effect
    audioEngine.playSoundEffect('tuning');
    await new Promise((r) => setTimeout(r, 400));

    // Step through each spoken line
    for (let i = 0; i < segment.dialogue.length; i++) {
      if (!isBroadcastingRef.current) break;

      // Pre-fetch next segment near the end of banter dialogue (penultimate line)
      if (i === Math.max(0, segment.dialogue.length - 2) && nextSegmentQueueRef.current.length === 0) {
        requestNewSegment().then((nextSeg) => {
          if (nextSeg) {
            setNextSegmentQueue([nextSeg]);
          }
        });
      }

      const line = segment.dialogue[i];
      setActiveLineIndex(i);
      setCurrentSpeaker(line.speaker);

      // Play embedded sound effect if present
      if (line.soundEffect && line.soundEffect !== 'none') {
        audioEngine.playSoundEffect(line.soundEffect);
        await new Promise((r) => setTimeout(r, 200));
      }

      // Voice output via Web Speech API or Gemini multi-speaker
      const cleanText = line.text.replace(/\[sfx:[a-z]+\]/gi, '').trim();
      await audioEngine.speakText(line.speaker, cleanText, segment.accent || accentRef.current);

      // Natural radio conversational pause between speakers
      await new Promise((r) => setTimeout(r, 450));
    }

    if (!isBroadcastingRef.current) return;

    // Banter finished! Enter Interstitial Song Break (Featured Song from YouTube)
    setCurrentSpeaker('Music');
    setIsMusicPlaying(true);
    audioEngine.duckMusic(false); // Music swells up or YouTube song plays

    const breakDuration = 60; // 60 seconds featured YouTube song break
    setMusicSecondsLeft(breakDuration);

    await new Promise<void>((resolve) => {
      let remaining = breakDuration;
      const countdownTimer = setInterval(() => {
        remaining -= 1;
        setMusicSecondsLeft(Math.max(0, remaining));
        if (remaining <= 0) {
          clearInterval(countdownTimer);
          skipBreakTriggerRef.current = null;
          resolve();
        }
      }, 1000);

      skipBreakTriggerRef.current = () => {
        clearInterval(countdownTimer);
        skipBreakTriggerRef.current = null;
        resolve();
      };
    });

    // Proceed to next segment
    if (!isBroadcastingRef.current) return;

    let nextSeg = nextSegmentQueueRef.current[0];
    if (!nextSeg) {
      nextSeg = (await requestNewSegment()) || segment;
    } else {
      setNextSegmentQueue([]);
    }

    playSegmentDialogue(nextSeg);
  };

  // Toggle On-Air Broadcast
  const handleToggleBroadcast = async () => {
    if (isBroadcasting) {
      // Stop broadcast
      setIsBroadcasting(false);
      setCurrentSpeaker('None');
      setIsMusicPlaying(false);
      if (skipBreakTriggerRef.current) {
        skipBreakTriggerRef.current();
        skipBreakTriggerRef.current = null;
      }
      audioEngine.stopMusicBed();
      audioEngine.stopSpeaking();
      return;
    }

    // Start broadcast
    try {
      await audioEngine.init();
      audioEngine.setVolume(volume);
      audioEngine.setMute(isMuted);
      audioEngine.setBackgroundMusicEnabled(isBgMusicEnabled);
      audioEngine.startMusicBed();

      setIsBroadcasting(true);
      setCurrentSpeaker('Static');

      // Play initial station tuning sound
      audioEngine.playSoundEffect('tuning');

      // Fetch or use existing segment
      let seg = currentSegment;
      if (!seg) {
        seg = await requestNewSegment();
      }

      if (seg) {
        playSegmentDialogue(seg);
      }
    } catch (err) {
      console.error('Failed to initialize broadcast:', err);
    }
  };

  // Skip to next segment immediately
  const handleSkipNext = async () => {
    if (!isBroadcasting) return;

    if (skipBreakTriggerRef.current) {
      audioEngine.playSoundEffect('scratch');
      skipBreakTriggerRef.current();
      return;
    }

    audioEngine.stopSpeaking();
    audioEngine.playSoundEffect('scratch');

    let nextSeg = nextSegmentQueue[0];
    if (!nextSeg) {
      nextSeg = await requestNewSegment();
    } else {
      setNextSegmentQueue([]);
    }

    if (nextSeg) {
      playSegmentDialogue(nextSeg);
    }
  };

  // Upvote/downvote a community topic with Firestore persistence
  const handleVoteTopic = async (topicId: string, direction: 'up' | 'down') => {
    // Optimistic UI update
    setTopics((prev) => {
      const updated = prev.map((t) => {
        if (t.id === topicId) {
          const delta = direction === 'up' ? 1 : -1;
          const newVotes = Math.max(0, t.votes + delta);
          return { ...t, votes: newVotes };
        }
        return t;
      });
      return updated.sort((a, b) => b.votes - a.votes);
    });

    // Persistent Firestore update
    await voteTopicInFirestore(topicId, direction, userProfile?.uid);
  };

  // Suggest a new topic with Firestore persistence
  const handleSuggestTopic = async (title: string, category: string) => {
    const authorName = userProfile?.displayName || 'Listener_' + Math.floor(100 + Math.random() * 900);

    const optimisticTopic: TopicPollItem = {
      id: 't_' + Date.now(),
      title,
      category,
      votes: 1,
      submittedBy: authorName,
      submittedByUid: userProfile?.uid,
      status: 'pending',
      moderationFlags: 0,
      createdAt: Date.now(),
      upvoters: userProfile?.uid ? [userProfile.uid] : [],
      downvoters: [],
    };

    setTopics((prev) => [optimisticTopic, ...prev]);

    // Save to Firestore
    await submitTopicToFirestore(title, category, {
      displayName: authorName,
      uid: userProfile?.uid,
    });
  };

  // Community moderation: flag topic
  const handleFlagTopic = async (topicId: string) => {
    await moderateTopicInFirestore(topicId, 'flag');
  };

  // Vote on broadcast tone
  const handleVoteTone = async (tone: BroadcastTone) => {
    setCurrentTone(tone);
    setToneVotes((prev) => ({
      ...prev,
      [tone]: (prev[tone] || 0) + 1,
    }));

    try {
      await fetch('/api/radio/vote-tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone }),
      });
    } catch (err) {
      console.warn('Failed to vote on tone:', err);
    }
  };

  // Send a chat message with Firestore persistence
  const handleSendMessage = async (text: string, isCaller: boolean) => {
    const authorName = userProfile?.displayName || 'Listener_' + Math.floor(100 + Math.random() * 900);
    const avatar = userProfile?.photoURL || (isCaller ? '🎙️' : '📻');

    const newMsg: ChatMessage = {
      id: 'c_' + Date.now(),
      user: authorName,
      avatar,
      text,
      timestamp: Date.now(),
      isCaller,
    };

    setChatMessages((prev) => [...prev, newMsg]);

    // Save to Firestore
    await sendChatMessageToFirestore({
      user: authorName,
      avatar,
      text,
      isCaller,
      uid: userProfile?.uid,
    });
  };

  // Send emoji reaction
  const handleSendReaction = (emoji: string) => {
    const authorName = userProfile?.displayName || 'Listener_' + Math.floor(10 + Math.random() * 90);
    handleSendMessage(`reacted with ${emoji}`, false);
  };

  // Toggle Background Music Bed
  const handleToggleBgMusic = () => {
    const next = !isBgMusicEnabled;
    setIsBgMusicEnabled(next);
    audioEngine.setBackgroundMusicEnabled(next);
  };

  // Explicitly trigger a community topic to play on air
  const handlePlayTopicNext = async (topicItem: TopicPollItem) => {
    if (!isBroadcasting) {
      handleToggleBroadcast();
    }
    const newSeg = await requestNewSegment(topicItem.title, topicItem.category);
    if (newSeg) {
      if (isMusicPlaying) {
        playSegmentDialogue(newSeg);
      } else {
        setNextSegmentQueue([newSeg]);
      }
    }
  };

  // Google Sign In
  const handleSignInGoogle = async () => {
    const profile = await signInWithGoogle();
    if (profile) {
      setUserProfile(profile);
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    await logOut();
    setUserProfile(null);
  };

  // Active line for speaker quote
  const activeLine: DialogueLine | undefined =
    currentSegment && activeLineIndex >= 0 ? currentSegment.dialogue[activeLineIndex] : undefined;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      
      {/* Studio Header with Google Auth */}
      <StudioHeader
        isBroadcasting={isBroadcasting}
        onToggleBroadcast={handleToggleBroadcast}
        volume={volume}
        onVolumeChange={(v) => {
          setVolume(v);
          audioEngine.setVolume(v);
        }}
        isMuted={isMuted}
        onToggleMute={() => {
          const next = !isMuted;
          setIsMuted(next);
          audioEngine.setMute(next);
        }}
        isBgMusicEnabled={isBgMusicEnabled}
        onToggleBgMusic={handleToggleBgMusic}
        accent={accent}
        onAccentChange={(acc) => setAccent(acc)}
        activeListeners={activeListeners}
        stationFrequency={stationFrequency}
        isGenerating={isGeneratingSegment}
        userProfile={userProfile}
        onSignInGoogle={handleSignInGoogle}
        onSignOut={handleSignOut}
      />

      {/* Main Studio Console Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Banner if not tuned in */}
        {!isBroadcasting && (
          <div className="bg-gradient-to-r from-amber-500/10 via-neutral-900 to-neutral-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>VR Hyper pulse 94.3 FM is Ready to Stream</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    NAMMA BENGALURU
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Click <strong>Tune In Live</strong> to hear DJ Jax & Nova discuss real-world Bengaluru news, Silk Board traffic jokes, and filter coffee debates with local South Indian charm and live Lo-Fi beats.
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleBroadcast}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Radio className="w-4 h-4 text-black" />
              <span>Tune In Now</span>
            </button>
          </div>
        )}

        {/* Dual Radio Jockeys Console Desk */}
        <JockeysConsole
          currentSpeaker={currentSpeaker}
          activeLineText={activeLine?.text}
          activeEmotion={activeLine?.emotion}
          vuLeft={visualizerData.vuLeft}
          vuRight={visualizerData.vuRight}
          accent={accent}
        />

        {/* Broadcast Teleprompter, Audio Spectrum & News Grounding Sources */}
        <BroadcastPlayer
          segment={currentSegment}
          activeLineIndex={activeLineIndex}
          isBroadcasting={isBroadcasting}
          isMusicPlaying={isMusicPlaying}
          currentTrack={currentSegment?.songPlayingAfter}
          musicSecondsLeft={musicSecondsLeft}
          frequencyData={visualizerData.frequencyData}
          onSkipNext={handleSkipNext}
          isGeneratingNext={isGeneratingSegment}
          quotaCooldownSeconds={quotaCooldownSeconds}
        />

        {/* Interactive Studio Tools: Soundboard */}
        <Soundboard
          onTriggerEffect={(label) => {
            handleSendMessage(`[Triggered ${label} SFX]`, false);
          }}
        />

        {/* 2-Column Grid: Community Content Filtering & Interactive Live Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Community Content Filtering, Topic Voting & Moderation */}
          <TopicVoting
            topics={topics}
            onVoteTopic={handleVoteTopic}
            onSuggestTopic={handleSuggestTopic}
            onFlagTopic={handleFlagTopic}
            onPlayTopicNext={handlePlayTopicNext}
            currentTone={currentTone}
            toneVotes={toneVotes}
            onVoteTone={handleVoteTone}
            userProfile={userProfile}
          />

          {/* Right Column: Live Chat & Call-In Teleprompter Stream */}
          <CommunityChat
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onSendReaction={handleSendReaction}
            userProfile={userProfile}
          />

        </div>

      </main>

      {/* Studio Footer */}
      <footer className="w-full border-t border-neutral-800/80 bg-neutral-950/80 backdrop-blur-sm py-4 px-4 text-center text-xs text-neutral-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px]">
          <div>
            VR Hyper pulse 94.3 FM • Namma Bengaluru AI Community Radio with Live Internet Grounding & Lo-Fi Beats
          </div>
          <div className="text-neutral-300 flex items-center gap-2 justify-center sm:justify-end">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Firebase Firestore & Auth Active
            </span>
            <span>•</span>
            <span>Gemini Low-Latency Audio Stream</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
