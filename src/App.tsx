import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Bell,
  X,
} from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './firebase';
import { useAppState } from './hooks/useAppState';
import { Onboarding } from './screens/Onboarding';
import { Dashboard } from './screens/Dashboard';
import { Scanner } from './screens/Scanner';
import { Calendar } from './screens/Calendar';
import { Collection } from './screens/Collection';
import { Profile } from './screens/Profile';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Logo } from './components/Logo';
import confetti from 'canvas-confetti';
import { Birthday } from './types';

// Distributed evenly across the full scrollable height in 4 rows × 3 columns
const GIGI_PARTICLES = [
  // Row 1 — top (0–20%)
  { x: '2%',  y: '2%',  size: 72, dur: 7.0, delay: 0.0 },
  { x: '38%', y: '4%',  size: 80, dur: 8.5, delay: 1.4 },
  { x: '76%', y: '1%',  size: 68, dur: 7.5, delay: 0.7 },
  // Row 2 — upper-mid (25–45%)
  { x: '14%', y: '28%', size: 76, dur: 8.0, delay: 2.1 },
  { x: '56%', y: '30%', size: 84, dur: 7.2, delay: 0.4 },
  { x: '86%', y: '26%', size: 70, dur: 9.0, delay: 1.8 },
  // Row 3 — lower-mid (50–70%)
  { x: '4%',  y: '54%', size: 78, dur: 7.8, delay: 1.1 },
  { x: '44%', y: '56%', size: 86, dur: 8.3, delay: 0.2 },
  { x: '80%', y: '52%', size: 72, dur: 7.0, delay: 2.5 },
  // Row 4 — bottom (75–95%)
  { x: '20%', y: '78%', size: 80, dur: 8.8, delay: 0.9 },
  { x: '60%', y: '80%', size: 74, dur: 7.4, delay: 1.6 },
  { x: '88%', y: '76%', size: 82, dur: 8.0, delay: 0.5 },
];

type Screen = 'dashboard' | 'scanner' | 'calendar' | 'collection' | 'profile';

function AppContent() {
  const { user, birthdays, challenges, loading, firebaseUser, setUser, addBirthday, updateBirthday, deleteBirthday, incrementScansCount, unlockCard } = useAppState();
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  const [showSplash, setShowSplash] = useState(true);
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);
  const [celebrationFriend, setCelebrationFriend] = useState<Birthday | null>(null);
  const [gigiBg, setGigiBg] = useState(() => localStorage.getItem('gigiBg') === 'true');

  // Listen for easter egg toggle from Profile
  useEffect(() => {
    const handler = (e: Event) => setGigiBg((e as CustomEvent<boolean>).detail);
    window.addEventListener('gigiBgChange', handler);
    return () => window.removeEventListener('gigiBgChange', handler);
  }, []);

  // Read deep link from URL on first load
  useEffect(() => {
    if (window.location.pathname === '/add-friend') {
      const params = new URLSearchParams(window.location.search);
      const data = params.get('data');
      if (data) setPendingDeepLink(data);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Process deep link once user is authenticated and loaded
  useEffect(() => {
    if (!pendingDeepLink || !user || !firebaseUser || loading) return;
    try {
      const profile = JSON.parse(decodeURIComponent(escape(atob(pendingDeepLink))));
      if (!profile.id || !profile.name || !profile.birthDate) return;
      const alreadyExists = birthdays.some(b => b.id === profile.id || b.name.toLowerCase() === profile.name.toLowerCase());
      if (!alreadyExists) {
        const birthday: Birthday = {
          id:        profile.id,
          name:      profile.name,
          birthDate: profile.birthDate,
          zodiac:    profile.zodiac,
          addedAt:   new Date().toISOString(),
          ...(profile.photoUrl && { photoUrl: profile.photoUrl }),
          ...(profile.socials && { socials: profile.socials }),
        };
        addBirthday(birthday);
        setCelebrationFriend(birthday);
        const colors = ['#FF4B4B', '#FFD700', '#ffffff', '#FEF08A'];
        confetti({ particleCount: 80, angle: 90, spread: 160, colors, scalar: 1.4, startVelocity: 38, ticks: 280, origin: { x: 0.5, y: 0 } });
        setTimeout(() => confetti({ particleCount: 50, angle: 90, spread: 160, colors, scalar: 1.2, startVelocity: 28, ticks: 250, origin: { x: 0.5, y: 0 } }), 400);
      }
    } catch (e) {
      console.error('Deep link decode error:', e);
    }
    setPendingDeepLink(null);
  }, [pendingDeepLink, user, firebaseUser, loading]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // Splash screen (2.5s) — logo animé
  if (showSplash) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{ background: 'linear-gradient(160deg, #fff5f5 0%, #ffffff 100%)' }}
      >
        <Logo size={96} />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-2"
        >
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">
            Birthday Game
          </h1>
          <motion.div
            className="h-1.5 bg-red-500 rounded-full mt-1"
            animate={{ width: [0, 48, 0] }}
            initial={{ width: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    );
  }

  // Skeleton screen — Firebase charge les données après le splash
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden">
        {/* Header skeleton */}
        <div className="bg-white px-6 pt-12 pb-4 flex justify-between items-center border-b-2 border-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200 animate-pulse" />
            <div className="space-y-1.5">
              <div className="w-32 h-4 rounded-md bg-slate-200 animate-pulse" />
              <div className="w-20 h-2.5 rounded-md bg-slate-100 animate-pulse" />
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
        </div>

        {/* Contenu skeleton */}
        <div className="flex-1 p-4 space-y-4">
          {/* Calendrier skeleton */}
          <div className="w-full h-64 rounded-2xl bg-white animate-pulse border border-slate-100 shadow-sm" />
          {/* Carte anniversaire skeleton */}
          <div className="w-full h-20 rounded-2xl bg-white animate-pulse border border-slate-100 shadow-sm" />
          <div className="w-full h-20 rounded-2xl bg-white animate-pulse border border-slate-100 shadow-sm" />
          {/* Bar chart skeleton */}
          <div className="w-full h-36 rounded-2xl bg-white animate-pulse border border-slate-100 shadow-sm" />
        </div>

        {/* Nav skeleton */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t-2 border-slate-900 px-6 py-4 flex justify-between items-center rounded-t-[2.5rem]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse" />
              <div className="w-10 h-2 rounded bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
        style={{ background: 'linear-gradient(160deg, #fff5f5 0%, #ffffff 60%, #f0fdf4 100%)' }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 w-full max-w-xs"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Logo size={96} />
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none uppercase">
              Birthday<br/>Game
            </h1>
            <p className="text-slate-500 text-base font-semibold leading-relaxed">
              Collectionne les anniversaires<br/>et débloque des cartes rares !
            </p>
          </div>
          <div className="w-full mt-2">
            <motion.button
              onClick={handleLogin}
              whileHover={{ backgroundColor: '#f8f8f8' }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3"
              style={{
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '9999px',
                padding: '12px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                fontWeight: 500,
                fontSize: '15px',
                color: '#3c4043',
                cursor: 'pointer',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Se connecter avec Google
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Onboarding onComplete={setUser} />;
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard': return <Dashboard birthdays={birthdays} user={user} onUpdateBirthday={updateBirthday} onDeleteBirthday={deleteBirthday} />;
      case 'scanner': return <Scanner onScan={addBirthday} onScanSuccess={incrementScansCount} existingBirthdays={birthdays} />;
      case 'calendar': return <Calendar birthdays={birthdays} onAddBirthday={addBirthday} onUpdateBirthday={updateBirthday} onDeleteBirthday={deleteBirthday} onFirstVisit={() => unlockCard('c2')} />;
      case 'collection': return <Collection user={user} birthdays={birthdays} />;
      case 'profile': return <Profile user={user} onUpdate={setUser} birthdays={birthdays} challenges={challenges} />;
      default: return <Dashboard birthdays={birthdays} user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">

      {/* Easter egg — gigi background */}
      <AnimatePresence>
        {gigiBg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute left-0 right-0 bottom-0 pointer-events-none overflow-hidden"
            style={{ zIndex: 0, top: 80 }}
          >
            {GIGI_PARTICLES.map((p, i) => (
              <motion.img
                key={i}
                src="/gigi.png"
                alt=""
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: p.size,
                  height: p.size,
                  objectFit: 'contain',
                  opacity: 0.18,
                  borderRadius: 16,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <header className="bg-white px-6 pt-12 pb-4 flex justify-between items-center border-b-2 border-slate-900 shadow-sm">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {activeScreen === 'dashboard' ? 'Birthday Game' : 
               activeScreen.charAt(0).toUpperCase() + activeScreen.slice(1)}
            </h1>
            <p className="text-[12px] font-black uppercase tracking-widest" style={{ color: '#FF4B4B', fontFamily: "'Press Start 2P', monospace" }}>
              Niv.{user.level} • {user.xp} XP
            </p>
          </div>
        </div>
        <button className="p-2 rounded-full relative group border-2 border-slate-900" style={{ background: '#FEFCE8' }}>
          <Bell size={20} style={{ color: '#A16207' }} className="group-hover:rotate-12 transition-transform" />
          <motion.span 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-1 right-1 w-2 h-2 rounded-full border-2 border-white shadow-sm"
            style={{ background: '#FF4B4B' }}
          />
        </button>
      </header>

      <main className={activeScreen === 'scanner' ? 'flex-1 overflow-hidden flex flex-col pb-24' : 'flex-1 overflow-y-auto pb-24'}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={activeScreen === 'scanner' ? 'flex-1 flex flex-col' : 'h-full'}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Deep-link celebration modal */}
      <AnimatePresence>
        {celebrationFriend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          >
            <motion.div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setCelebrationFriend(null)}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="relative w-full max-w-sm bg-white rounded-3xl px-6 py-8 shadow-2xl flex flex-col items-center gap-4 text-center"
              style={{ border: '2px solid #FF4B4B', boxShadow: '0 6px 0 #CC2E2E, 0 16px 50px rgba(255,75,75,0.2)' }}
            >
              <button
                onClick={() => setCelebrationFriend(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
              >
                <X size={15} className="text-slate-500" />
              </button>

              <motion.span
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="text-5xl"
              >
                🎉
              </motion.span>

              {celebrationFriend.photoUrl && (
                <img
                  src={celebrationFriend.photoUrl}
                  alt={celebrationFriend.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-rose-200 shadow-md"
                />
              )}

              <div className="space-y-1">
                <p className="text-xl font-black text-slate-900">
                  <span style={{ color: '#FF4B4B' }}>{celebrationFriend.name}</span>
                  <br />a été ajouté à tes amis !
                </p>
                <p className="text-sm text-slate-500 font-medium">{celebrationFriend.zodiac}</p>
              </div>

              <div
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl"
                style={{ background: 'rgba(255,75,75,0.08)', border: '1px solid rgba(255,75,75,0.2)' }}
              >
                <span className="text-lg">⭐</span>
                <span className="font-black text-base" style={{ color: '#FF4B4B', fontFamily: "'Press Start 2P', monospace", fontSize: 13 }}>
                  +20 XP
                </span>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setCelebrationFriend(null)}
                className="w-full py-4 rounded-2xl font-black text-white text-sm mt-1"
                style={{ background: '#FF4B4B', boxShadow: '0 4px 0 #CC2E2E' }}
              >
                SUPER ! 🎂
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        aria-label="Navigation principale"
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-2xl border-t-2 border-slate-900 px-6 py-4 flex justify-between items-center z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]"
      >
        <NavButton active={activeScreen === 'dashboard'} onClick={() => setActiveScreen('dashboard')} icon="🏠" label="Accueil" ariaLabel="Accueil" />
        <NavButton active={activeScreen === 'calendar'} onClick={() => setActiveScreen('calendar')} icon="📅" label="Calendrier" ariaLabel="Calendrier des anniversaires" />
        <div className="relative -top-10">
          <motion.button
            aria-label="Scanner un QR code"
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveScreen('scanner')}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white relative overflow-hidden"
            style={{ background: '#FF4B4B' }}
          >
            <QrCode size={32} strokeWidth={2.5} className="relative z-10" />
          </motion.button>
        </div>
        <NavButton active={activeScreen === 'collection'} onClick={() => setActiveScreen('collection')} icon="🃏" label="Cartes" ariaLabel="Ma collection de cartes" />
        <NavButton active={activeScreen === 'profile'} onClick={() => setActiveScreen('profile')} icon="👤" label="Profil" ariaLabel="Mon profil" />
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function NavButton({ active, onClick, icon, label, ariaLabel }: { active: boolean, onClick: () => void, icon: string, label: string, ariaLabel: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'scale-110' : 'opacity-40 hover:opacity-70'}`}
    >
      <motion.div
        animate={active ? { y: -4 } : { y: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
          active ? 'bg-red-50' : 'bg-transparent'
        }`}
      >
        <div className={`text-2xl transition-all duration-300 ${active ? 'scale-110' : 'scale-90'}`}>
          {icon}
        </div>
      </motion.div>
      <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${active ? 'text-red-500' : ''}`}>
        {label}
      </span>
    </button>
  );
}