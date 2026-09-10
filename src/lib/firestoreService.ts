import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, auth, googleProvider, signInWithPopup, signOut } from './firebase';
import { TopicPollItem, ChatMessage, UserProfile } from '../types';

// Default starter topics customized for Namma Bengaluru & VR Hyper pulse
const SEED_TOPICS: Omit<TopicPollItem, 'id'>[] = [
  {
    title: 'Silk Board Junction vs Outer Ring Road: Can AI solve Bengaluru traffic before flying cars?',
    category: 'Namma Bengaluru',
    votes: 48,
    submittedBy: 'KoramangalaTechie',
    status: 'approved',
    moderationFlags: 0,
    createdAt: Date.now() - 3600000,
    upvoters: [],
    downvoters: [],
  },
  {
    title: 'Filter Coffee Showdown: Malleshwaram CTR vs Vidyarthi Bhavan vs Brahmin’s Coffee Bar',
    category: 'Food & Culture',
    votes: 44,
    submittedBy: 'DosaLover99',
    status: 'approved',
    moderationFlags: 0,
    createdAt: Date.now() - 3000000,
    upvoters: [],
    downvoters: [],
  },
  {
    title: 'Peak Bengaluru: Techie pitches seed round to auto driver after meter negotiation',
    category: 'Tech & Quirky',
    votes: 39,
    submittedBy: 'IndiranagarFounder',
    status: 'approved',
    moderationFlags: 0,
    createdAt: Date.now() - 2400000,
    upvoters: [],
    downvoters: [],
  },
  {
    title: 'Is the 4:00 AM Nandi Hills sunrise bike ride worth freezing on the highway?',
    category: 'Weekend Banter',
    votes: 33,
    submittedBy: 'BikerBoyBengaluru',
    status: 'approved',
    moderationFlags: 0,
    createdAt: Date.now() - 1800000,
    upvoters: [],
    downvoters: [],
  },
  {
    title: 'Namma Metro Purple Line: The daily victory lap of East Bangalore commuters',
    category: 'City Life',
    votes: 29,
    submittedBy: 'WhitefieldCommuter',
    status: 'approved',
    moderationFlags: 0,
    createdAt: Date.now() - 1200000,
    upvoters: [],
    downvoters: [],
  },
  {
    title: 'Local Slang 101: How "Kannada Gottilla" turns into "Macha, full scene illa!"',
    category: 'Slang & Puns',
    votes: 26,
    submittedBy: 'LocalGuru',
    status: 'approved',
    moderationFlags: 0,
    createdAt: Date.now() - 600000,
    upvoters: [],
    downvoters: [],
  },
];

// Subscribe to Topics in real-time
export function subscribeToTopics(callback: (topics: TopicPollItem[]) => void) {
  const topicsCol = collection(db, 'topics');
  const q = query(topicsCol);

  return onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed default topics into Firestore once
        for (const seed of SEED_TOPICS) {
          try {
            await addDoc(topicsCol, seed);
          } catch (err) {
            console.warn('Could not seed topic:', err);
          }
        }
        return;
      }

      const items: TopicPollItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Exclude heavily flagged items (community moderation threshold)
        if (data.status !== 'flagged') {
          items.push({
            id: docSnap.id,
            title: data.title,
            category: data.category || 'General',
            votes: typeof data.votes === 'number' ? data.votes : 0,
            submittedBy: data.submittedBy || 'Anonymous',
            submittedByUid: data.submittedByUid,
            upvoters: Array.isArray(data.upvoters) ? data.upvoters : [],
            downvoters: Array.isArray(data.downvoters) ? data.downvoters : [],
            status: data.status || 'approved',
            moderationFlags: data.moderationFlags || 0,
            createdAt: data.createdAt || Date.now(),
          });
        }
      });

      // Sort by votes descending (Community Prioritization for live broadcast!)
      items.sort((a, b) => b.votes - a.votes);
      callback(items);
    },
    (err) => {
      console.warn('Error subscribing to topics in Firestore:', err);
    }
  );
}

// Upvote or Downvote Topic with Persistent Firestore Sync
export async function voteTopicInFirestore(
  topicId: string,
  direction: 'up' | 'down',
  userUid?: string
): Promise<void> {
  const topicRef = doc(db, 'topics', topicId);

  try {
    const snap = await getDoc(topicRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const upvoters: string[] = Array.isArray(data.upvoters) ? data.upvoters : [];
    const downvoters: string[] = Array.isArray(data.downvoters) ? data.downvoters : [];

    let currentVotes = typeof data.votes === 'number' ? data.votes : 0;
    const uid = userUid || 'anon_' + Math.random().toString(36).substring(2, 8);

    if (direction === 'up') {
      if (upvoters.includes(uid)) {
        // Toggle off upvote
        await updateDoc(topicRef, {
          votes: currentVotes - 1,
          upvoters: arrayRemove(uid),
        });
      } else {
        const wasDownvoted = downvoters.includes(uid);
        await updateDoc(topicRef, {
          votes: currentVotes + (wasDownvoted ? 2 : 1),
          upvoters: arrayUnion(uid),
          downvoters: arrayRemove(uid),
        });
      }
    } else {
      // Downvote
      if (downvoters.includes(uid)) {
        // Toggle off downvote
        await updateDoc(topicRef, {
          votes: currentVotes + 1,
          downvoters: arrayRemove(uid),
        });
      } else {
        const wasUpvoted = upvoters.includes(uid);
        await updateDoc(topicRef, {
          votes: Math.max(0, currentVotes - (wasUpvoted ? 2 : 1)),
          downvoters: arrayUnion(uid),
          upvoters: arrayRemove(uid),
        });
      }
    }
  } catch (err) {
    console.error('Error voting on topic in Firestore:', err);
    // Fallback: simple increment
    try {
      await updateDoc(topicRef, {
        votes: increment(direction === 'up' ? 1 : -1),
      });
    } catch (e) {
      console.warn('Fallback vote failed:', e);
    }
  }
}

// Submit a new topic suggestion to Firestore
export async function submitTopicToFirestore(
  title: string,
  category: string,
  user: { displayName: string; uid?: string }
): Promise<string> {
  const topicsCol = collection(db, 'topics');
  const docRef = await addDoc(topicsCol, {
    title,
    category,
    votes: 1,
    submittedBy: user.displayName,
    submittedByUid: user.uid || null,
    upvoters: user.uid ? [user.uid] : [],
    downvoters: [],
    status: 'pending', // Starts as pending community moderation
    moderationFlags: 0,
    createdAt: Date.now(),
  });
  return docRef.id;
}

// Community Moderation: Flag or Approve a suggestion
export async function moderateTopicInFirestore(
  topicId: string,
  action: 'flag' | 'approve'
): Promise<void> {
  const topicRef = doc(db, 'topics', topicId);
  try {
    const snap = await getDoc(topicRef);
    if (!snap.exists()) return;

    const data = snap.data();
    if (action === 'flag') {
      const flags = (data.moderationFlags || 0) + 1;
      await updateDoc(topicRef, {
        moderationFlags: flags,
        status: flags >= 3 ? 'flagged' : data.status,
      });
    } else if (action === 'approve') {
      await updateDoc(topicRef, {
        status: 'approved',
      });
    }
  } catch (err) {
    console.error('Error moderating topic:', err);
  }
}

// Subscribe to real-time chat messages
export function subscribeToChat(callback: (messages: ChatMessage[]) => void) {
  const chatCol = collection(db, 'chat');
  const q = query(chatCol, orderBy('timestamp', 'asc'), limit(40));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        msgs.push({
          id: docSnap.id,
          user: d.user || 'Listener',
          avatar: d.avatar || '📻',
          text: d.text || '',
          timestamp: d.timestamp || Date.now(),
          isCaller: !!d.isCaller,
        });
      });
      callback(msgs);
    },
    (err) => {
      console.warn('Error subscribing to chat:', err);
    }
  );
}

// Send chat message to Firestore
export async function sendChatMessageToFirestore(msg: {
  user: string;
  avatar: string;
  text: string;
  isCaller?: boolean;
  uid?: string;
}): Promise<void> {
  const chatCol = collection(db, 'chat');
  await addDoc(chatCol, {
    ...msg,
    timestamp: Date.now(),
  });
}

// Save or sync authenticated user in Firestore
export async function syncUserProfileInFirestore(user: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  const profile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName || 'Community Listener',
    email: user.email,
    photoURL: user.photoURL,
  };

  if (!snap.exists()) {
    await setDoc(userRef, {
      ...profile,
      createdAt: Date.now(),
      votedTopics: {},
      submittedTopicsCount: 0,
    });
  } else {
    await updateDoc(userRef, {
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      lastActive: Date.now(),
    });
  }

  return profile;
}

// Google Sign-In Helper
export async function signInWithGoogle(): Promise<UserProfile | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      return await syncUserProfileInFirestore(result.user);
    }
  } catch (err) {
    console.error('Error signing in with Google:', err);
  }
  return null;
}

// Sign Out Helper
export async function logOut(): Promise<void> {
  await signOut(auth);
}
