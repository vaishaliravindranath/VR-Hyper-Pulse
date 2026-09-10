export interface DialogueLine {
  id: string;
  speaker: 'Jax' | 'Nova';
  text: string;
  emotion?: string;
  soundEffect?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface RadioSegment {
  id: string;
  title: string;
  category: 'news' | 'joke' | 'listener_chat' | 'song_intro' | 'trending';
  topic: string;
  tone: string;
  accent: string;
  dialogue: DialogueLine[];
  groundingSources?: GroundingSource[];
  audioBase64?: string; // Gemini PCM audio if generated
  audioMimeType?: string;
  createdAt: number;
  durationEstimateSeconds: number;
  fallback?: boolean;
  quotaExhausted?: boolean;
  songPlayingAfter?: {
    title: string;
    artist: string;
    genre: string;
    durationSeconds: number;
    youtubeVideoId?: string;
    youtubeUrl?: string;
    isVerifiedAvailable?: boolean;
    availabilityNotice?: string;
    thumbnailUrl?: string;
  };
}

export interface ChatMessage {
  id: string;
  user: string;
  avatar: string;
  text: string;
  timestamp: number;
  isCaller?: boolean;
  upvotes?: number;
  reaction?: string;
}

export interface TopicPollItem {
  id: string;
  title: string;
  category: string;
  votes: number;
  submittedBy: string;
  submittedByUid?: string;
  upvoters?: string[];
  downvoters?: string[];
  votedByMe?: 'up' | 'down' | null;
  status?: 'approved' | 'pending' | 'flagged';
  moderationFlags?: number;
  createdAt?: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  votedTopics?: Record<string, 'up' | 'down'>;
  submittedTopicsCount?: number;
}

export type BroadcastTone = 
  | 'Sarcastic & Witty'
  | 'Wholesome & Cozy'
  | 'Late-Night Mystery'
  | 'High-Energy Hype'
  | 'Absurdist Puns';

export type RegionalAccent =
  | 'South Indian (Namma Bengaluru)'
  | 'Standard Broadcast'
  | 'New York / Brooklyn'
  | 'London Pirate Radio'
  | 'Southern Charm'
  | 'Midwestern Chill'
  | 'Aussie Mate';

export interface StationState {
  isBroadcasting: boolean;
  currentSegment: RadioSegment | null;
  upcomingSegmentsQueue: RadioSegment[];
  currentSpeaker: 'Jax' | 'Nova' | 'Music' | 'Static' | 'None';
  activeListenersCount: number;
  currentTone: BroadcastTone;
  toneVotes: Record<BroadcastTone, number>;
  topics: TopicPollItem[];
  recentChat: ChatMessage[];
  stationFrequency: string;
  stationTagline: string;
}
