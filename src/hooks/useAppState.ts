import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  FirestoreError
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Birthday, Challenge } from '../types';

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

    // Birthdays Listener
    const unsubBirthdays = onSnapshot(query(birthdaysRef, orderBy('addedAt', 'desc')), (snapshot) => {
      setBirthdays(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Birthday)));
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

    return () => {
      unsubUser();
      unsubBirthdays();
      unsubChallenges();
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
    try {
      await addDoc(collection(db, path), birthday);
      
      // Base XP for adding a birthday
      let newXp = user.xp + 20;

      // Update ch1 (Premier Ami) and grant reward if it just completed
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

      // Check for card unlocks
      const newCards = [...user.collectedCards];
      if (birthdays.length + 1 === 1 && !newCards.includes('c1')) newCards.push('c1');
      if (birthdays.length + 1 === 10 && !newCards.includes('c3')) newCards.push('c3');

      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        xp: newXp,
        level: newLevel,
        collectedCards: newCards,
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
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

  const updateBirthday = async (birthdayId: string, updates: Partial<import('../types').Birthday>) => {
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

  return { user, birthdays, challenges, loading, firebaseUser, setUser, addBirthday, updateBirthday, deleteBirthday, incrementScansCount, unlockCard };
}
