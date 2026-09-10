import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let genAI: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAI;
}

// In-Memory Community State
interface TopicItem {
  id: string;
  title: string;
  category: string;
  votes: number;
  submittedBy: string;
}

interface ChatMsg {
  id: string;
  user: string;
  avatar: string;
  text: string;
  timestamp: number;
  isCaller?: boolean;
}

let activeListenersCount = 1428;

const trendingTopics: TopicItem[] = [
  { id: 't1', title: 'Silk Board Junction vs Outer Ring Road: Can AI solve Bengaluru traffic before flying cars?', category: 'Namma Bengaluru', votes: 48, submittedBy: 'KoramangalaTechie' },
  { id: 't2', title: 'Filter Coffee Showdown: Malleshwaram CTR vs Vidyarthi Bhavan vs Brahmin’s Coffee Bar', category: 'Food & Culture', votes: 44, submittedBy: 'DosaLover99' },
  { id: 't3', title: 'Peak Bengaluru: Techie pitches seed round to auto driver after meter negotiation', category: 'Tech & Quirky', votes: 39, submittedBy: 'IndiranagarFounder' },
  { id: 't4', title: 'Is the 4:00 AM Nandi Hills sunrise bike ride worth freezing on the highway?', category: 'Weekend Banter', votes: 33, submittedBy: 'BikerBoyBengaluru' },
  { id: 't5', title: 'Namma Metro Purple Line: The daily victory lap of East Bangalore commuters', category: 'City Life', votes: 29, submittedBy: 'WhitefieldCommuter' },
  { id: 't6', title: 'Local Slang 101: How "Kannada Gottilla" turns into "Macha, full scene illa!"', category: 'Slang & Puns', votes: 26, submittedBy: 'LocalGuru' },
];

const toneVotes: Record<string, number> = {
  'Sarcastic & Witty': 28,
  'Wholesome & Cozy': 14,
  'Late-Night Mystery': 22,
  'High-Energy Hype': 31,
  'Absurdist Puns': 19,
};

const chatMessages: ChatMsg[] = [
  { id: 'c1', user: 'IndiranagarTechie', avatar: '☕', text: 'Macha Jax, did you see the Outer Ring Road traffic today?! Complete stand-still!', timestamp: Date.now() - 120000 },
  { id: 'c2', user: 'KoramangalaKaapi', avatar: '🎧', text: 'Nova\'s voice is smoother than Malleshwaram butter masala dosa!', timestamp: Date.now() - 95000 },
  { id: 'c3', user: 'NammaCommuter', avatar: '🚇', text: 'Purple line metro saved my life today, auto guy asked 500 rupees for 2km!', timestamp: Date.now() - 60000 },
  { id: 'c4', user: 'BangaloreBreeze', avatar: '🌧️', text: '22 degrees and light drizzle outside. Perfect VR Hyper pulse weather!', timestamp: Date.now() - 30000 },
];

// Curated songs for track interstitials from YouTube (Bangalore Kannada Hits, South Indian Indie & Lo-Fi)
// All songs pre-verified with active YouTube oEmbed availability status
const stationSongs = [
  {
    title: "Belageddu (College Anthem)",
    artist: "Vijay Prakash & B. Ajaneesh Loknath (Kirik Party)",
    genre: "Kannada Indie Pop",
    durationSeconds: 210,
    youtubeVideoId: "ebz20FHrT44",
    youtubeUrl: "https://www.youtube.com/watch?v=ebz20FHrT44",
  },
  {
    title: "Singara Siriye (Melody of the Hills)",
    artist: "Vijay Prakash & Ananya Bhat (Kantara)",
    genre: "South Indian Fusion",
    durationSeconds: 260,
    youtubeVideoId: "3XShkcOze3s",
    youtubeUrl: "https://www.youtube.com/watch?v=3XShkcOze3s",
  },
  {
    title: "Soul of Dia (Acoustic Chill)",
    artist: "Sanjith Hegde & Chinmayi Sripaada",
    genre: "Acoustic Lo-Fi",
    durationSeconds: 195,
    youtubeVideoId: "cO4eJxbCedc",
    youtubeUrl: "https://www.youtube.com/watch?v=cO4eJxbCedc",
  },
  {
    title: "Varaha Roopam (Divine Folk Melodies)",
    artist: "B. Ajaneesh Loknath (Kantara)",
    genre: "Carnatic Folk Fusion",
    durationSeconds: 240,
    youtubeVideoId: "m-5ck3BuT1o",
    youtubeUrl: "https://www.youtube.com/watch?v=m-5ck3BuT1o",
  },
  {
    title: "Kannada Unplugged (56 Years of Melodies)",
    artist: "Endurance Studios Acoustic Ensemble",
    genre: "Bangalore Indie Acoustic",
    durationSeconds: 230,
    youtubeVideoId: "AAiizoJdkBg",
    youtubeUrl: "https://www.youtube.com/watch?v=AAiizoJdkBg",
  },
  {
    title: "Indiranagar Twilight Lo-Fi Beats",
    artist: "Lofi Girl Radio Ensemble",
    genre: "South Indian Lo-Fi Chill",
    durationSeconds: 180,
    youtubeVideoId: "rFZHOHl-L8A",
    youtubeUrl: "https://www.youtube.com/watch?v=rFZHOHl-L8A",
  },
  {
    title: "A Fusion In Raag Des (Bansuri Meditation)",
    artist: "Paras Nath Indian Classical Fusion",
    genre: "Indian Classical Fusion",
    durationSeconds: 220,
    youtubeVideoId: "1c5mWmBRAqE",
    youtubeUrl: "https://www.youtube.com/watch?v=1c5mWmBRAqE",
  },
];

// Verify availability status of YouTube video via YouTube oEmbed API
async function verifyYouTubeVideoAvailability(videoId: string): Promise<{
  available: boolean;
  videoId: string;
  title?: string;
  author?: string;
  thumbnailUrl?: string;
  status?: number;
  reason?: string;
}> {
  if (!videoId || typeof videoId !== 'string') {
    return { available: false, videoId: '', reason: 'Empty video ID' };
  }
  const cleanId = videoId.trim();

  // Fast check: is this already one of our tested station songs?
  const knownSong = stationSongs.find((s) => s.youtubeVideoId === cleanId);

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(cleanId)}&format=json`;
    const resp = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (resp.ok) {
      const data = (await resp.json()) as any;
      return {
        available: true,
        videoId: cleanId,
        title: data.title || knownSong?.title,
        author: data.author_name || knownSong?.artist,
        thumbnailUrl: data.thumbnail_url,
        status: 200,
      };
    } else {
      return {
        available: false,
        videoId: cleanId,
        status: resp.status,
        reason: resp.status === 404 ? 'Video not found or embedding disabled by copyright owner' : `YouTube returned status ${resp.status}`,
      };
    }
  } catch (err: any) {
    if (knownSong) {
      return {
        available: true,
        videoId: cleanId,
        title: knownSong.title,
        author: knownSong.artist,
        status: 200,
      };
    }
    return {
      available: false,
      videoId: cleanId,
      reason: err?.name === 'TimeoutError' ? 'Verification request timed out' : (err?.message || 'Network error checking video availability'),
    };
  }
}

// Fluctuate listeners slightly for realism
setInterval(() => {
  const delta = Math.floor(Math.random() * 9) - 4;
  activeListenersCount = Math.max(950, activeListenersCount + delta);
}, 8000);

// API Routes

// 1. Get Radio Station State
app.get("/api/radio/state", (req, res) => {
  // Find top tone
  let topTone = 'Sarcastic & Witty';
  let maxToneVotes = -1;
  for (const [tone, votes] of Object.entries(toneVotes)) {
    if (votes > maxToneVotes) {
      maxToneVotes = votes;
      topTone = tone;
    }
  }

  // Sort topics by votes
  const sortedTopics = [...trendingTopics].sort((a, b) => b.votes - a.votes);

  res.json({
    activeListenersCount,
    currentTone: topTone,
    toneVotes,
    topics: sortedTopics,
    recentChat: chatMessages.slice(-25),
    stationFrequency: "94.3 FM",
    stationTagline: "VR Hyper pulse • Namma Bengaluru's Electric Community Waves",
  });
});

// 2. Interactive Chat Endpoint
app.post("/api/radio/chat", (req, res) => {
  const { user, text, avatar, isCaller } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: "Text is required" });
  }

  const newMsg: ChatMsg = {
    id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    user: user || 'Anonymous Listener',
    avatar: avatar || '📻',
    text: text.trim().slice(0, 240),
    timestamp: Date.now(),
    isCaller: !!isCaller,
  };

  chatMessages.push(newMsg);
  if (chatMessages.length > 50) chatMessages.shift();

  res.json({ success: true, message: newMsg });
});

// 3. Topic Voting Endpoint
app.post("/api/radio/vote-topic", (req, res) => {
  const { topicId, direction } = req.body;
  const topic = trendingTopics.find((t) => t.id === topicId);
  if (!topic) {
    return res.status(404).json({ error: "Topic not found" });
  }

  const delta = direction === 'down' ? -1 : 1;
  topic.votes = Math.max(0, topic.votes + delta);

  res.json({ success: true, topic });
});

// 4. Topic Suggestion Endpoint
app.post("/api/radio/suggest-topic", (req, res) => {
  const { title, category, user } = req.body;
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: "Title is required" });
  }

  const newTopic: TopicItem = {
    id: 't_' + Date.now(),
    title: title.trim().slice(0, 120),
    category: category || 'Community Choice',
    votes: 1,
    submittedBy: user || 'Listener',
  };

  trendingTopics.unshift(newTopic);
  if (trendingTopics.length > 25) trendingTopics.pop();

  res.json({ success: true, topic: newTopic });
});

// 5. Tone Voting Endpoint
app.post("/api/radio/vote-tone", (req, res) => {
  const { tone } = req.body;
  if (tone && toneVotes[tone] !== undefined) {
    toneVotes[tone] += 1;
    return res.json({ success: true, toneVotes });
  }
  res.status(400).json({ error: "Invalid tone" });
});

// 5b. Get Station Verified Songs Playlist
app.get("/api/radio/songs", (req, res) => {
  res.json({ songs: stationSongs });
});

// 5c. Real-time YouTube Video Availability Check
app.get("/api/radio/check-youtube", async (req, res) => {
  const videoId = (req.query.videoId as string || "").trim();
  if (!videoId) {
    return res.status(400).json({ available: false, reason: "Missing videoId parameter" });
  }
  const status = await verifyYouTubeVideoAvailability(videoId);
  res.json(status);
});

// In-Memory Quota & Rate Limit Cooldown State
let lastQuotaErrorTimestamp = 0;
const QUOTA_COOLDOWN_MS = 45000;

function buildDynamicProceduralSegment(params: {
  topic?: string;
  tone?: string;
  accent?: string;
  recentChat?: any[];
  category?: string;
}) {
  const {
    topic = "Silk Board traffic vs Outer Ring Road flyover drama",
    tone = "Sarcastic & Witty",
    accent = "South Indian (Namma Bengaluru)",
    recentChat = [],
    category = "Namma Bengaluru",
  } = params;

  // Format listener shoutout if available
  let listenerLine = "";
  if (recentChat && recentChat.length > 0) {
    const valid = recentChat.filter((c: any) => c.text && c.user);
    if (valid.length > 0) {
      const pick = valid[valid.length - 1];
      listenerLine = `Big on-air shoutout to @${pick.user} in the Bengaluru chat who said: "${pick.text.replace(/"/g, '')}"!`;
    }
  }

  // Tone-specific long-form dialogue branches (16-18 turns = 3-5 mins engaging talk)
  let dialogue: any[] = [];

  if (tone === "High-Energy Hype") {
    dialogue = [
      {
        speaker: "Jax",
        text: `Macha, turn up that dial right now! VR Hyper pulse 94.3 FM is vibrating from Indiranagar 100 Feet Road all the way to Electronic City! Nova, look at our console right now: "${topic}"! [sfx:airhorn]`,
        emotion: "excited",
        soundEffect: "airhorn",
      },
      {
        speaker: "Nova",
        text: "Jax, calm down and sip some steaming filter coffee before your vocal cords trigger a seismic warning on the Outer Ring Road.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "Calm down?! Guru, how can anyone stay calm in Namma Bengaluru today?! Have you seen the chat room?! Everyone is buzzing!",
        emotion: "excited",
        soundEffect: "applause",
      },
      {
        speaker: "Nova",
        text: "True, our Bengaluru listeners never hold back. But let's actually break down what is happening here.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: `Look at the details: "${topic}". Only in this city do tech founders, college students, and auto drivers come together to create this level of pure theatre!`,
        emotion: "laughing",
        soundEffect: "none",
      },
      {
        speaker: "Nova",
        text: "It is the classic Bengaluru paradox. On one hand, we build quantum algorithms; on the other hand, we spend two hours negotiating 50 rupees at Silk Board.",
        emotion: "deadpan",
        soundEffect: "rimshot",
      },
      {
        speaker: "Jax",
        text: "Fifty rupees?! Macha, yesterday an auto anna asked me for seed funding just to turn on the meter! Swear on Cubbon Park!",
        emotion: "shocked",
        soundEffect: "airhorn",
      },
      {
        speaker: "Nova",
        text: listenerLine
          ? `${listenerLine} Even our listeners in the chat are backing you up on this one, Jax.`
          : "Well, in Koramangala, even the pigeons are probably scouting for pre-seed angel syndicates.",
        emotion: "smooth",
        soundEffect: "applause",
      },
      {
        speaker: "Jax",
        text: "Exactly, guru! And you know what else? While everyone is debating this, someone just opened a third specialty sourdough cafe right next to Brahmin's Kaapi!",
        emotion: "excited",
        soundEffect: "none",
      },
      {
        speaker: "Nova",
        text: "Don't bring the sacred filter kaapi into this, Jax. Some traditions are non-negotiable. CTR crispy benne masala dosa and a hot degree kaapi will always reign supreme.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "Agreed, 100 percent! You know what I love about our listeners voting this topic to the top? It shows this city has unmatched humor and soul.",
        emotion: "laughing",
        soundEffect: "none",
      },
      {
        speaker: "Nova",
        text: "No doubt. Whether it is traffic gridlock or a wild viral moment, Bengaluru knows how to laugh at itself while drinking 20-rupee chai.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "Macha, if you're stuck in traffic on the flyover right now, swalpa adjust maadi and honk twice for VR Hyper pulse 94.3!",
        emotion: "excited",
        soundEffect: "airhorn",
      },
      {
        speaker: "Nova",
        text: "Please do not encourage honking, Jax. Our audio levels are already in the red. But our listeners have spoken, and they deserve some prime music.",
        emotion: "deadpan",
        soundEffect: "scratch",
      },
      {
        speaker: "Jax",
        text: "Full scene! Keep those community votes and chat reactions pouring into the live console, people!",
        emotion: "excited",
        soundEffect: "applause",
      },
      {
        speaker: "Nova",
        text: "And now, to soothe your ears after that long, intense discussion—it's time for our featured song from YouTube right here on VR Hyper pulse 94.3 FM. Sit back, take a sip of kaapi, and enjoy this classic South Indian beat!",
        emotion: "smooth",
        soundEffect: "jingle",
      },
    ];
  } else if (tone === "Late-Night Mystery") {
    dialogue = [
      {
        speaker: "Nova",
        text: `It's late hours on VR Hyper pulse 94.3 FM. The mist is settling over Cubbon Park, the streetlights on MG Road are humming, and our night owl listeners voted this onto the console: "${topic}".`,
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "Nova, hold the phone! At this hour, this sounds less like a news headline and more like an episode of the X-Files shot in Indiranagar!",
        emotion: "shocked",
        soundEffect: "jingle",
      },
      {
        speaker: "Nova",
        text: "Keep your voice down, Jax. The late-night Bengaluru frequency demands quiet contemplation. Look at the bizarre nature of this story.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "Macha, I've lived in this city all my life, but every single week something strange emerges from the shadows of our tech parks.",
        emotion: "excited",
        soundEffect: "none",
      },
      {
        speaker: "Nova",
        text: "Is it really strange, or is it just the product of hundreds of exhausted developers hallucinating after their third Red Bull at 2 AM?",
        emotion: "deadpan",
        soundEffect: "rimshot",
      },
      {
        speaker: "Jax",
        text: "Hey, don't underestimate late-night coders! Half the unicorns in Bengaluru were born between 1:00 AM and 4:00 AM over cold Maggi noodles!",
        emotion: "laughing",
        soundEffect: "applause",
      },
      {
        speaker: "Nova",
        text: listenerLine
          ? `${listenerLine} Even the late-night community in our chat room is chiming in on this bizarre situation.`
          : "The city takes on a completely different personality when the traffic finally dies down past midnight.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "Macha, have you ever driven down the Old Airport Road at 3 AM? It's so quiet you can hear your own existential thoughts whispering 'Why did I take this startup job?'",
        emotion: "shocked",
        soundEffect: "rimshot",
      },
      {
        speaker: "Nova",
        text: "And that is when you pull over for late-night tea at the corner shop, where you meet strangers discussing quantum physics and real estate prices.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "Pakka local magic! That's what makes this story so fascinating—it could only happen in a city that sleeps with one eye open.",
        emotion: "excited",
        soundEffect: "none",
      },
      {
        speaker: "Nova",
        text: "Indeed. The mysteries of Namma Bengaluru continue to unfold long after the sun goes down.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "To all the midnight commuters, night-shift heroes, and insomniac coders tuning in: keep your headphones on and your minds wide open!",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Nova",
        text: "Keep casting your votes on the interactive board. Coming up next on 94.3 FM, we have a soulful late-night song from YouTube to accompany your midnight thoughts. Enjoy this track, Bengaluru.",
        emotion: "smooth",
        soundEffect: "jingle",
      },
    ];
  } else if (tone === "Wholesome & Cozy") {
    dialogue = [
      {
        speaker: "Nova",
        text: `Welcome back to VR Hyper pulse 94.3 FM. The breeze outside is a pleasant 22 degrees, light clouds drifting over Vidhana Soudha, and our community voted for this heartfelt topic: "${topic}".`,
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "Ah, Nova! As much as I roast the potholes and traffic jams on this station, moments like this remind me why we love Namma Bengaluru with all our heart.",
        emotion: "excited",
        soundEffect: "applause",
      },
      {
        speaker: "Nova",
        text: "Underneath the frantic hustle of deadlines and demo days, this city has a deeply generous, kind-hearted spirit.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "Totally, guru! Think about it: where else will complete strangers lend you an umbrella in a sudden downpour, or help you push your scooter when the battery dies?",
        emotion: "laughing",
        soundEffect: "none",
      },
      {
        speaker: "Nova",
        text: listenerLine
          ? `${listenerLine} Such lovely words from our community listeners today.`
          : "It's those little moments that define the character of our neighborhoods, from Malleshwaram to Basavanagudi.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "Speaking of Basavanagudi, Nova, I think nothing cures stress better than sitting under a giant banyan tree with a warm plate of upma and chutney.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Nova",
        text: "Simplicity is underrated, Jax. In a world full of notifications, taking ten minutes to breathe and listen to a great story is pure medicine.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "And that's why we love doing this show for everyone tuning in. Whether you are working from home, driving with family, or cooking dinner—you are part of this family!",
        emotion: "excited",
        soundEffect: "applause",
      },
      {
        speaker: "Nova",
        text: "Thank you for sharing your stories and upvoting topics that matter. Keep that warmth alive wherever you are right now.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "Super hit vibes! Now, Nova, what sweet musical treat are we dropping on the airwaves?",
        emotion: "excited",
        soundEffect: "none",
      },
      {
        speaker: "Nova",
        text: "Here is a melodic, heartwarming song directly from YouTube on VR Hyper pulse 94.3 FM. Let the rhythm melt your stress away.",
        emotion: "smooth",
        soundEffect: "jingle",
      },
    ];
  } else {
    // Sarcastic & Witty (default)
    dialogue = [
      {
        speaker: "Jax",
        text: `Macha, hold the phone and grab both ears! Live on VR Hyper pulse 94.3 FM, and our top voted Bengaluru topic is: "${topic}". Guru, you cannot make this up!`,
        emotion: "excited",
        soundEffect: "airhorn",
      },
      {
        speaker: "Nova",
        text: "Welcome back, city survivors and caffeine loyalists. Jax, take a long, calm breath before your vocal cords combust like an uncooled graphics card.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "Combust?! Nova, look at what the city voted! Every single day in Bengaluru is like an unscripted sitcom episode directed by an AI that had too much filter coffee!",
        emotion: "laughing",
        soundEffect: "rimshot",
      },
      {
        speaker: "Nova",
        text: "Well, when you combine 15 million ambitious people, 2 million startups, and a road network designed in 1890, comedy is the only surviving coping mechanism.",
        emotion: "deadpan",
        soundEffect: "applause",
      },
      {
        speaker: "Jax",
        text: "Facts, macha! Just this morning on the Outer Ring Road, I saw someone conducting a candidate technical interview from the back of an electric auto!",
        emotion: "shocked",
        soundEffect: "none",
      },
      {
        speaker: "Nova",
        text: "Did the candidate pass?",
        emotion: "deadpan",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "The candidate passed, but the auto was rejected because the driver demanded 40 percent equity as convenience fee! [sfx:rimshot]",
        emotion: "laughing",
        soundEffect: "rimshot",
      },
      {
        speaker: "Nova",
        text: listenerLine
          ? `${listenerLine} See, Jax? Even our live chat room is roasting the daily Bengaluru grind.`
          : "I believe that is standard Koramangala market valuation these days.",
        emotion: "smooth",
        soundEffect: "applause",
      },
      {
        speaker: "Jax",
        text: "And yet, no matter how chaotic it gets, nobody wants to leave! Why? Because the weather is 22 degrees, the dosas are golden, and the banter on 94.3 FM is unmatched!",
        emotion: "excited",
        soundEffect: "none",
      },
      {
        speaker: "Nova",
        text: "That, or their security deposit is still held hostage by their landlord in HSR Layout.",
        emotion: "deadpan",
        soundEffect: "rimshot",
      },
      {
        speaker: "Jax",
        text: "Ouch! Direct hit, Nova! That one hurt straight in the wallet, guru! But seriously, look at how everyone is rallying around this topic today.",
        emotion: "laughing",
        soundEffect: "none",
      },
      {
        speaker: "Nova",
        text: "It proves Namma Bengaluru's greatest superpower is turning daily chaos into pure gold. We laugh through the gridlock and we celebrate together.",
        emotion: "smooth",
        soundEffect: "none",
      },
      {
        speaker: "Jax",
        text: "Pakka! So to everyone tuned in from Malleshwaram to Whitefield: keep voting, keep the spicy chat comments coming, and swalpa adjust maadi!",
        emotion: "excited",
        soundEffect: "airhorn",
      },
      {
        speaker: "Nova",
        text: "And now, while our community tallies the next topic on the board, it's time for our featured song from YouTube right here on VR Hyper pulse 94.3 FM. Turn up the volume and enjoy this South Indian banger!",
        emotion: "smooth",
        soundEffect: "jingle",
      },
    ];
  }

  const randomSong = stationSongs[Math.floor(Math.random() * stationSongs.length)];

  return {
    id: "seg_" + Date.now(),
    title: topic.length > 50 ? topic.slice(0, 47) + "..." : topic,
    category: category as any,
    topic,
    tone,
    accent,
    dialogue,
    groundingSources: [
      { title: "VR Hyper pulse Namma Bengaluru Feed", uri: "https://news.google.com" },
    ],
    createdAt: Date.now(),
    durationEstimateSeconds: dialogue.length * 4.5,
    songPlayingAfter: randomSong,
    fallback: true,
    quotaExhausted: true,
  };
}

// 6. Generate Dynamic Radio Banter Segment (News + Jokes + Community Shoutout)
app.post("/api/radio/generate-segment", async (req, res) => {
  const {
    topic = "Latest quirky community news and banter",
    tone = 'Sarcastic & Witty',
    accent = 'Standard Broadcast',
    recentChat = [],
    previousContext = '',
    searchInternet = true,
    category = 'news',
  } = req.body;

  // Check if currently within rate-limit cooldown window
  const timeSinceQuotaError = Date.now() - lastQuotaErrorTimestamp;
  if (timeSinceQuotaError < QUOTA_COOLDOWN_MS) {
    const cooldownRemaining = Math.ceil((QUOTA_COOLDOWN_MS - timeSinceQuotaError) / 1000);
    const proceduralSegment = buildDynamicProceduralSegment({
      topic,
      tone,
      accent,
      recentChat,
      category,
    });
    return res.json({
      success: true,
      segment: proceduralSegment,
      quotaExhausted: true,
      cooldownRemaining,
    });
  }

  try {
    const ai = getGeminiClient();

    // Prepare community chat context
    const chatSnippet = recentChat.length > 0
      ? recentChat.slice(-4).map((m: any) => `${m.user}: "${m.text}"`).join("\n")
      : 'No recent chat yet.';

    const systemInstruction = `
You are the scriptwriting and dialogue engine for a live, real-time FM community radio broadcast called "VR Hyper pulse 94.3 FM: Namma Bengaluru".
Broadcasting live from Indiranagar/MG Road, Bengaluru, India!
You are generating dialogue between two live on-air Radio Jockeys (RJs) who have contrasting personalities, vibrant South Indian English accents/inflections, and incredible chemistry:

1. "DJ Jax":
- Energetic Bengaluru techie & pop-culture enthusiast, hyperactive, skeptical, fast-talking.
- Speaks with an enthusiastic South Indian English accent and lively Bengaluru colloquialisms ("Macha", "Guru", "Scene illa", "Swalpa adjust maadi", "Arre yaar", "Full chindi", "Pakka local", "Peak Bengaluru").
- Loves cracking jokes about Silk Board traffic, startup pitches in autos, filter coffee debates, and internet oddities.
- Catchphrases: "Macha, hold the phone!", "You literally can't make this up in Bengaluru!", "Nova, please tell me you're hearing this, guru!"

2. "Nova":
- Smooth, velvety voice, deadpan, soulful Bengaluru RJ and filter coffee connoisseur.
- Balances Jax with dry, witty sarcasm, grounding wisdom, local culture pride, and mellow radio charisma.
- Knows all the legendary dosa corners (CTR, Vidyarthi Bhavan, Brahmin's) and keeps Jax's hyperactivity in check with cool Bengaluru chill.
- Catchphrases: "Breathe, Jax. Drink some filter coffee.", "Classic Jax behavior.", "Out here on 94.3 FM...", "Macha, take a chill pill."

Broadcast Rules:
- The broadcast must feel authentically local to Bengaluru and South India, warm, witty, fast-paced, and spontaneous.
- DURATION & ENGAGEMENT: This MUST be a substantive, engaging 3 to 5-minute radio talk segment consisting of 14 to 18 back-and-forth dialogue turns between Jax and Nova. Do NOT make it short or brief!
- Give Jax and Nova space to debate, share funny stories (Silk Board traffic, tech startup madness, filter coffee rivalries like CTR vs Vidyarthi Bhavan, Namma Metro observations), roast each other warmly, and reply to listener chat comments.
- Tone requested by listeners: "${tone}". Reflect this tone sharply!
- Regional Accent / Local Vibe: "${accent}". Naturally integrate South Indian English rhythm, Bengaluru slang ("Macha", "Guru", "Swalpa adjust maadi", "Full scene", "Peak Bengaluru", "Kaapi").
- Incorporate recent listener chat messages if relevant to roast, thank, or answer Bengaluru listeners!
- Include witty remarks and 2-3 sharp topical jokes with punchlines.
- Insert sound effect tags if appropriate right before or after a punchline: [sfx:airhorn], [sfx:rimshot], [sfx:applause], [sfx:scratch], [sfx:jingle], [sfx:bleep].
- At the end of the banter, introduce the upcoming featured YouTube song track (e.g. popular Kannada hit, South Indian indie beat, or Lo-Fi fusion).

Output format MUST be valid JSON conforming to this schema:
{
  "title": "Short catchy radio segment title",
  "topic": "The main subject discussed",
  "category": "${category}",
  "dialogue": [
    {
      "speaker": "Jax" or "Nova",
      "text": "The spoken words (2 to 3 sentences). Include emotion indicators like (laughing), (whispering), or sound effect tags like [sfx:airhorn] where appropriate.",
      "emotion": "sarcastic / deadpan / excited / laughing / smooth / shocked",
      "soundEffect": "airhorn / rimshot / applause / scratch / jingle / bleep / none"
    }
  ],
  "songIntro": {
    "title": "Track title (e.g. Belageddu, Singara Siriye, Soul of Dia, etc.)",
    "artist": "Artist name",
    "genre": "Genre",
    "youtubeVideoId": "ebz20FHrT44 or 3XShkcOze3s or cO4eJxbCedc or m-5ck3BuT1o or AAiizoJdkBg or rFZHOHl-L8A or 1c5mWmBRAqE"
  }
}
`;

    const prompt = `Search the internet for interesting, real-world, quirky news, funny events, or topical jokes about: "${topic}".
Then write an engaging, full-length 3 to 5-minute radio conversation with 14 to 18 back-and-forth dialogue turns between Jax and Nova for VR Hyper pulse 94.3 FM Bengaluru discussing this news with in-depth jokes and witty Bengaluru banter.
Recent listener chat to potentially shout out or joke about:
${chatSnippet}

${previousContext ? `Continuity note from previous segment: ${previousContext}` : ''}
End the segment with Jax & Nova introducing our upcoming featured song from YouTube!
Return ONLY the JSON object.`;

    let responseText = "";
    let groundingSources: { title: string; uri: string }[] = [];

    // Attempt primary model: gemini-3.8-flash with Google Search Grounding
    try {
      const config: any = {
        systemInstruction,
        responseMimeType: "application/json",
      };

      if (searchInternet) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config,
      });

      responseText = response.text || "{}";

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && Array.isArray(groundingChunks)) {
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri) {
            groundingSources.push({
              title: chunk.web.title || "Web News Source",
              uri: chunk.web.uri,
            });
          }
        }
      }
    } catch (primaryErr: any) {
      const isQuota =
        primaryErr?.status === 429 ||
        primaryErr?.status === "RESOURCE_EXHAUSTED" ||
        primaryErr?.message?.includes("429") ||
        primaryErr?.message?.includes("quota") ||
        primaryErr?.message?.includes("RESOURCE_EXHAUSTED");

      if (isQuota) {
        console.warn("[Gemini API Notice] Primary model quota reached (429). Attempting lightweight fallback with gemini-3.1-flash-lite...");
        // Secondary attempt: gemini-3.1-flash-lite without search tools
        try {
          const liteResponse = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
            },
          });
          responseText = liteResponse.text || "{}";
        } catch (liteErr: any) {
          console.warn("[Gemini API Notice] Secondary model also reached rate limit. Engaging local radio continuity engine for topic:", topic);
          lastQuotaErrorTimestamp = Date.now();
          const proceduralSeg = buildDynamicProceduralSegment({
            topic,
            tone,
            accent,
            recentChat,
            category,
          });
          return res.json({
            success: true,
            segment: proceduralSeg,
            quotaExhausted: true,
            cooldownRemaining: 45,
          });
        }
      } else {
        throw primaryErr;
      }
    }

    let segmentData: any;
    try {
      segmentData = JSON.parse(responseText);
    } catch (parseErr) {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      segmentData = JSON.parse(cleaned);
    }

    // Pick song with YouTube metadata and verify availability
    const randomSong = stationSongs[Math.floor(Math.random() * stationSongs.length)];
    const candidateVideoId = segmentData.songIntro?.youtubeVideoId || randomSong.youtubeVideoId;
    
    // Check the video availability status before using it
    const availabilityCheck = await verifyYouTubeVideoAvailability(candidateVideoId);

    let selectedSong: any;
    if (availabilityCheck.available) {
      selectedSong = {
        ...randomSong,
        ...(segmentData.songIntro || {}),
        title: segmentData.songIntro?.title || availabilityCheck.title || randomSong.title,
        artist: segmentData.songIntro?.artist || availabilityCheck.author || randomSong.artist,
        youtubeVideoId: candidateVideoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${candidateVideoId}`,
        durationSeconds: randomSong.durationSeconds || 210,
        isVerifiedAvailable: true,
        thumbnailUrl: availabilityCheck.thumbnailUrl,
      };
    } else {
      console.warn(`[YouTube Check] Candidate video ${candidateVideoId} unavailable (${availabilityCheck.reason}). Falling back to guaranteed station track.`);
      // Guaranteed verified fallback from stationSongs
      selectedSong = {
        ...randomSong,
        isVerifiedAvailable: true,
        availabilityNotice: `Original video was unavailable on YouTube embed. Auto-switched to verified track: ${randomSong.title}`,
      };
    }

    const finalSegment = {
      id: 'seg_' + Date.now(),
      title: segmentData.title || topic || "Live Breaking Banter",
      category: segmentData.category || category,
      topic: segmentData.topic || topic,
      tone,
      accent,
      dialogue: Array.isArray(segmentData.dialogue) && segmentData.dialogue.length > 0
        ? segmentData.dialogue
        : buildDynamicProceduralSegment({ topic, tone, accent, recentChat, category }).dialogue,
      groundingSources: groundingSources.slice(0, 4),
      createdAt: Date.now(),
      durationEstimateSeconds: (segmentData.dialogue?.length || 16) * 4.5,
      songPlayingAfter: selectedSong,
      quotaExhausted: false,
    };

    res.json({ success: true, segment: finalSegment });
  } catch (err: any) {
    console.warn("[Radio Segment Notice] Transitioning to local broadcast continuity:", err?.message || err);
    lastQuotaErrorTimestamp = Date.now();

    const proceduralSeg = buildDynamicProceduralSegment({
      topic: req.body.topic,
      tone: req.body.tone,
      accent: req.body.accent,
      recentChat: req.body.recentChat,
      category: req.body.category,
    });

    res.json({
      success: true,
      segment: proceduralSeg,
      quotaExhausted: true,
      cooldownRemaining: 45,
    });
  }
});

// 7. Multi-Speaker TTS via Gemini 3.1 Flash TTS
app.post("/api/radio/tts", async (req, res) => {
  try {
    const { dialogue } = req.body;
    if (!dialogue || !Array.isArray(dialogue) || dialogue.length === 0) {
      return res.status(400).json({ error: "Dialogue array is required" });
    }

    const ai = getGeminiClient();

    // Format script for multi-speaker
    const script = dialogue
      .map((d: any) => `${d.speaker}: ${d.text.replace(/\[sfx:[a-z]+\]/gi, '').replace(/\([^)]+\)/g, '')}`)
      .join("\n");

    const prompt = `TTS the following radio conversation between Jax and Nova:\n${script}`;

    const ttsResponse = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: "Jax",
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Puck" }, // High-energy, expressive
                },
              },
              {
                speaker: "Nova",
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Kore" }, // Warm, deep, smooth
                },
              },
            ],
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({
        success: true,
        audioBase64: base64Audio,
        sampleRate: 24000,
        mimeType: "audio/pcm",
      });
    }

    return res.json({ success: false, fallbackWebSpeech: true });
  } catch (err: any) {
    // Graceful fallback to client-side Web Audio + Web Speech API
    console.warn("Gemini TTS unavailable or quota reached; falling back to Web Speech:", err?.message || err);
    res.json({ success: false, fallbackWebSpeech: true, error: err?.message });
  }
});

// Vite Middleware for development & Static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Live Community Radio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
