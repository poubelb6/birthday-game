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
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`));

    // Birthdays Listener
    const unsubBirthdays = onSnapshot(query(birthdaysRef, orderBy('addedAt', 'desc')), (snapshot) => {
      setBirthdays(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Birthday)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${firebaseUser.uid}/birthdays`));

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
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${firebaseUser.uid}/challenges`));

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
      
      // Update XP and Level
      const newXp = user.xp + 20;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
      
      // Update challenges
      const ch1Ref = doc(db, 'users', firebaseUser.uid, 'challenges', 'ch1');
      const ch1Snap = await getDoc(ch1Ref);
      if (ch1Snap.exists()) {
        const ch1 = ch1Snap.data() as Challenge;
        await updateDoc(ch1Ref, { progress: Math.min(ch1.target, ch1.progress + 1) });
      }

      // Check for card unlocks
      const newCards = [...user.collectedCards];
      if (birthdays.length + 1 === 1 && !newCards.includes('c1')) newCards.push('c1');
      if (birthdays.length + 1 === 10 && !newCards.includes('c3')) newCards.push('c3');

      await updateDoc(doc(db, 'users', firebaseUser.uid), { 
        xp: newXp, 
        level: newLevel, 
        collectedCards: newCards 
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
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

  return { user, birthdays, challenges, loading, firebaseUser, setUser, addBirthday, deleteBirthday };
}
