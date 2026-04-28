import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  documentId,
  addDoc,
  updateDoc,
  writeBatch,
  deleteDoc,
  FirestoreError
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Birthday, Challenge, Message } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useAppState() {
  const [user, setUserProfile] = useState<UserProfile | null>(null);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [inbox, setInbox] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (!u) {
        setUserProfile(null);
        setBirthdays([]);
        setChallenges([]);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const birthdaysRef = collection(db, 'users', firebaseUser.uid, 'birthdays');
    const challengesRef = collection(db, 'users', firebaseUser.uid, 'challenges');

    // User Profile Listener
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Normalize fields that may be missing in older accounts
        setUserProfile({
          ...data,
          wishlist: Array.isArray(data.wishlist) ? data.wishlist : [],
          socials:  data.socials  ?? {},
          collectedCards: Array.isArray(data.collectedCards) ? data.collectedCards : [],
        } as UserProfile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    }, (error) => {
      // Log only — never throw from onSnapshot callbacks (would escape React and trigger ErrorBoundary)
      console.error('[Firestore] user snapshot error:', error.code, error.message);
      setLoading(false);
    });

    // Birthdays Listener — enrichit avec la photoUrl live du compte Firestore de chaque ami
    const unsubBirthdays = onSnapshot(query(birthdaysRef, orderBy('addedAt', 'desc')), async (snapshot) => {
      // d.id = ID du document Firestore (auto-généré, utilisé pour CRUD)
      // d.data().id = UID Firebase de l'ami — préservé dans userId pour éviter les doublons
      const raw = snapshot.docs.map(d => {
        const data = d.data() as Birthday;
        return {
          ...data,
          id: d.id,
          // userId is only set after Firestore verification in the enrichment step below
          userId: undefined,
        };
      });

      // On récupère les vrais UIDs Firebase des amis (stockés dans le champ `id` du document)
      const friendUids = snapshot.docs
        .map(d => (d.data() as Birthday).id)
        .filter(Boolean);

      if (friendUids.length === 0) { setBirthdays(raw); return; }

      try {
        const batches: string[][] = [];
        for (let i = 0; i < friendUids.length; i += 30) batches.push(friendUids.slice(i, i + 30));
        const snaps = await Promise.all(
          batches.map(batch => getDocs(query(collection(db, 'users'), where(documentId(), 'in', batch))))
        );
        // profileMap: friendUID -> { photoUrl, wishlist, socials } — only populated for real accounts
        const profileMap: Record<string, Partial<Birthday>> = {};
        snaps.flatMap(s => s.docs).forEach(d => {
          const data = d.data() as UserProfile;
          const patch: Partial<Birthday> = {};
          if (data.photoUrl) patch.photoUrl = data.photoUrl;
          if (Array.isArray(data.wishlist) && data.wishlist.length > 0) patch.wishlist = data.wishlist;
          if (data.socials) patch.socials = data.socials;
          // Always register in profileMap so userId is set even if no extra fields exist
          profileMap[d.id] = patch;
        });

        // On enrichit chaque birthday avec les données live + on stocke le vrai UID de l'ami
        setBirthdays(raw.map((b, i) => {
          const friendUid = (snapshot.docs[i]?.data() as Birthday)?.id;
          const patch = friendUid && profileMap[friendUid] ? profileMap[friendUid] : {};
          return { ...b, ...patch, ...(friendUid && profileMap[friendUid] ? { userId: friendUid } : {}) };
        }));
      } catch {
        setBirthdays(raw);
      }
    }, (error) => {
      console.error('[Firestore] birthdays snapshot error:', error.code, error.message);
    });

    // Challenges Listener
    const unsubChallenges = onSnapshot(challengesRef, (snapshot) => {
      if (snapshot.empty) {
        // Initialize default challenges if none exist
        const defaultChallenges = [
          { id: 'ch1', title: 'Premier Ami', description: 'Ajoute un anniversaire', progress: 0, target: 1, rewardXp: 50 },
          { id: 'ch2', title: 'Collectionneur', description: 'Scanne 3 profils', progress: 0, target: 3, rewardXp: 150, rewardCardId: 'c2' },
        ];
        defaultChallenges.forEach(async (ch) => {
          try {
            await setDoc(doc(challengesRef, ch.id), ch);
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `users/${firebaseUser.uid}/challenges/${ch.id}`);
          }
        });
      } else {
        setChallenges(snapshot.docs.map(d => d.data() as Challenge));
      }
    }, (error) => {
      console.error('[Firestore] challenges snapshot error:', error.code, error.message);
    });

    // Inbox listener — messages reçus
    const messagesRef = collection(db, 'messages');
    const unsubInbox = onSnapshot(
      query(messagesRef, where('toId', '==', firebaseUser.uid)),
      (snapshot) => {
        const msgs = snapshot.docs
          .map(d => ({ ...d.data(), id: d.id } as Message))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setInbox(msgs);
      },
      (error) => {
        console.error('[Firestore] inbox snapshot error:', error.code, error.message);
      }
    );

    // Sent listener — messages envoyés
    const unsubSent = onSnapshot(
      query(messagesRef, where('fromId', '==', firebaseUser.uid)),
      (snapshot) => {
        const msgs = snapshot.docs
          .map(d => ({ ...d.data(), id: d.id } as Message))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setSentMessages(msgs);
      },
      (error) => {
        console.error('[Firestore] sent snapshot error:', error.code, error.message);
      }
    );

    return () => {
      unsubUser();
      unsubBirthdays();
      unsubChallenges();
      unsubInbox();
      unsubSent();
    };
  }, [firebaseUser]);

  const setUser = async (profile: UserProfile) => {
    if (!firebaseUser) return;
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), profile);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${firebaseUser.uid}`);
    }
  };

  const addBirthday = async (birthday: Birthday) => {
    if (!firebaseUser || !user) return;
    const path = `users/${firebaseUser.uid}/birthdays`;
    // Critical: save the birthday. Rethrow on failure so the UI can report the error.
    try {
      await addDoc(collection(db, path), birthday);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }

    // Non-critical: update XP/challenges. Log errors but never throw to caller.
    try {
      let newXp = user.xp + 20;

      const ch1Ref = doc(db, 'users', firebaseUser.uid, 'challenges', 'ch1');
      const ch1Snap = await getDoc(ch1Ref);
      if (ch1Snap.exists()) {
        const ch1 = ch1Snap.data() as Challenge;
        const wasComplete = ch1.progress >= ch1.target;
        const newProgress = Math.min(ch1.target, ch1.progress + 1);
        await updateDoc(ch1Ref, { progress: newProgress });
        if (!wasComplete && newProgress >= ch1.target) {
          newXp += ch1.rewardXp;
        }
      }

      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

      const newCards = [...user.collectedCards];
      if (birthdays.length + 1 === 1 && !newCards.includes('c1')) newCards.push('c1');
      if (birthdays.length + 1 === 10 && !newCards.includes('c3')) newCards.push('c3');

      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        xp: newXp,
        level: newLevel,
        collectedCards: newCards,
      });
    } catch (e) {
      console.error('[addBirthday] XP update failed (non-critical):', e);
    }
  };

  const incrementScansCount = async () => {
    if (!firebaseUser || !user) return;
    const newCount = (user.scansCount ?? 0) + 1;
    const newCards = [...user.collectedCards];
    if (newCount >= 1  && !newCards.includes('c6'))  newCards.push('c6');
    if (newCount >= 5  && !newCards.includes('r1'))  newCards.push('r1');
    if (newCount >= 10 && !newCards.includes('r30')) newCards.push('r30');
    if (newCount >= 25 && !newCards.includes('e4'))  newCards.push('e4');

    // Update ch2 (Scanne 3 profils) and grant reward if it just completed
    let bonusXp = 0;
    try {
      const ch2Ref = doc(db, 'users', firebaseUser.uid, 'challenges', 'ch2');
      const ch2Snap = await getDoc(ch2Ref);
      if (ch2Snap.exists()) {
        const ch2 = ch2Snap.data() as Challenge;
        const wasComplete = ch2.progress >= ch2.target;
        const newProgress = Math.min(ch2.target, ch2.progress + 1);
        await updateDoc(ch2Ref, { progress: newProgress });
        if (!wasComplete && newProgress >= ch2.target) {
          bonusXp = ch2.rewardXp;
          if (ch2.rewardCardId && !newCards.includes(ch2.rewardCardId)) {
            newCards.push(ch2.rewardCardId);
          }
        }
      }
    } catch (e) {
      console.error('[Challenge] ch2 update error:', e);
    }

    try {
      const userUpdate: Record<string, unknown> = { scansCount: newCount, collectedCards: newCards };
      if (bonusXp > 0) {
        const newXp = user.xp + bonusXp;
        userUpdate.xp = newXp;
        userUpdate.level = Math.floor(Math.sqrt(newXp / 100)) + 1;
      }
      await updateDoc(doc(db, 'users', firebaseUser.uid), userUpdate);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const unlockCard = async (cardId: string) => {
    if (!firebaseUser || !user) return;
    if (user.collectedCards.includes(cardId)) return;
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), { collectedCards: [...user.collectedCards, cardId] });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const updateBirthday = async (birthdayId: string, updates: Record<string, unknown>) => {
    if (!firebaseUser) return;
    const path = `users/${firebaseUser.uid}/birthdays/${birthdayId}`;
    try {
      await updateDoc(doc(db, path), updates as Record<string, unknown>);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const deleteBirthday = async (birthdayId: string) => {
    if (!firebaseUser) return;
    const path = `users/${firebaseUser.uid}/birthdays/${birthdayId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  const sendMessage = async (toId: string, text: string) => {
    if (!firebaseUser || !user || !text.trim() || !toId) return;
    await addDoc(collection(db, 'messages'), {
      fromId: firebaseUser.uid,
      fromName: user.name,
      fromPhotoUrl: user.photoUrl ?? '',
      toId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    });
  };

  const markConversationRead = async (fromId: string) => {
    if (!firebaseUser) return;
    const unread = inbox.filter(m => m.fromId === fromId && !m.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(m => {
      batch.update(doc(db, 'messages', m.id), { read: true });
    });
    await batch.commit();
  };

  return { user, birthdays, challenges, inbox, sentMessages, loading, firebaseUser, setUser, addBirthday, updateBirthday, deleteBirthday, incrementScansCount, unlockCard, sendMessage, markConversationRead };
}
