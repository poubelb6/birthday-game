import React, { useState, useEffect } from 'react';
import { formatZodiac, getAvatarColor } from './utils/zodiac';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Plus,
  X,
  MessageCircle,
  Heart,
  Home,
  LayoutGrid,
  User,
  Flame,
} from 'lucide-react';
import { signInWithPopup, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth } from './firebase';
import { useAppState } from './hooks/useAppState';
import { useStreak } from './hooks/useStreak';
import { useStreakNotification } from './hooks/useStreakNotification';
import { useNotifications } from './hooks/useNotifications';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { Onboarding } from './screens/Onboarding';
import { Dashboard } from './screens/Dashboard';
import { Scanner } from './screens/Scanner';
import { Calendar } from './screens/Calendar';
import { Collection } from './screens/Collection';
import { Profile } from './screens/Profile';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Logo } from './components/Logo';
import { MessagesModal } from './components/MessagesModal';
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

const SCREEN_ORDER: Screen[] = ['dashboard', 'calendar', 'collection', 'profile'];

function AppContent() {
  const { user, birthdays, challenges, inbox, sentMessages, loading, firebaseUser, setUser, addBirthday, updateBirthday, deleteBirthday, incrementScansCount, unlockCard, sendMessage, markConversationRead } = useAppState();
  const streak = useStreak();
  const { showBanner, dismissBanner } = useStreakNotification(streak);
  const isOnline = useNetworkStatus();
  const { enabled: notifEnabled, requestAndEnable: notifEnable, disable: notifDisable } = useNotifications(
    birthdays,
    user,
    inbox,
    (type) => {
      if (type === 'message') setShowMessages(true);
      else navigateTo('calendar');
    },
  );
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  const [slideDirection, setSlideDirection] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);
  const [triggerAddFriend, setTriggerAddFriend] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  const [celebrationFriend, setCelebrationFriend] = useState<Birthday | null>(null);
  const [gigiBg, setGigiBg] = useState(() => localStorage.getItem('gigiBg') === 'true');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  // Apply / remove dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Listen for easter egg toggle from Profile
  useEffect(() => {
    const handler = (e: Event) => setGigiBg((e as CustomEvent<boolean>).detail);
    window.addEventListener('gigiBgChange', handler);
    return () => window.removeEventListener('gigiBgChange', handler);
  }, []);

  // Listen for dark mode toggle from Profile
  useEffect(() => {
    const handler = (e: Event) => setDarkMode((e as CustomEvent<boolean>).detail);
    window.addEventListener('darkModeChange', handler);
    return () => window.removeEventListener('darkModeChange', handler);
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
    const processDeepLink = async () => {
      try {
        const profile = JSON.parse(decodeURIComponent(escape(atob(pendingDeepLink))));
        if (!profile.id || !profile.name || !profile.birthDate) return;
        const alreadyExists = birthdays.some(b => b.userId === profile.id || b.id === profile.id || b.name.toLowerCase() === profile.name.toLowerCase());
        if (!alreadyExists) {
          const birthday: Birthday = {
            id:        profile.id,
            userId:    profile.id,
            name:      profile.name,
            birthDate: profile.birthDate,
            zodiac:    profile.zodiac,
            addedAt:   new Date().toISOString(),
            ...(profile.photoUrl && { photoUrl: profile.photoUrl }),
            ...(profile.socials && { socials: profile.socials }),
          };
          await addBirthday(birthday);
          setCelebrationFriend(birthday);
          const colors = ['#FF4B4B', '#FFD700', '#ffffff', '#FEF08A'];
          confetti({ particleCount: 80, angle: 90, spread: 160, colors, scalar: 1.4, startVelocity: 38, ticks: 280, origin: { x: 0.5, y: 0 } });
          setTimeout(() => confetti({ particleCount: 50, angle: 90, spread: 160, colors, scalar: 1.2, startVelocity: 28, ticks: 250, origin: { x: 0.5, y: 0 } }), 400);
        }
      } catch (e) {
        console.error('Deep link decode error:', e);
      } finally {
        setPendingDeepLink(null);
      }
    };

    void processDeepLink();
  }, [pendingDeepLink, user, firebaseUser, loading]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const navigateTo = (screen: Screen) => {
    const currentIndex = SCREEN_ORDER.indexOf(activeScreen);
    const nextIndex = SCREEN_ORDER.indexOf(screen);
    setSlideDirection(currentIndex === -1 || nextIndex === -1 ? 0 : nextIndex > currentIndex ? 1 : -1);
    setActiveScreen(screen);
  };

  const handleLogin = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        await signInWithCredential(auth, credential);
      } else {
        await signInWithPopup(auth, new GoogleAuthProvider());
      }
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
        style={{ background: 'var(--gradient-splash)' }}
      >
        <Logo size={96} />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-3"
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
      <div className="min-h-screen flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden" style={{ background: 'var(--surface-bg)' }}>
        {/* Header skeleton */}
        <div className="px-6 pt-4 pb-2 flex justify-between items-center" style={{ background: 'var(--surface-card)', borderBottom: '2px solid var(--border-accent)' }}>
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
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-6 py-4 flex justify-between items-center rounded-t-[var(--radius-pill)]" style={{ background: 'var(--surface-card)', borderTop: '2px solid var(--border-accent)' }}>
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
        style={{ background: 'var(--gradient-login)' }}
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
      case 'dashboard': return <Dashboard birthdays={birthdays} user={user} onRequestAddFriend={() => { navigateTo('calendar'); setTriggerAddFriend(true); }} onUpdateBirthday={updateBirthday} onDeleteBirthday={deleteBirthday} />;
      case 'scanner': return <Scanner onScan={addBirthday} onScanSuccess={() => { incrementScansCount(); navigateTo('calendar'); }} existingBirthdays={birthdays} />;
      case 'calendar': return <Calendar birthdays={birthdays} user={user} onAddBirthday={addBirthday} onUpdateBirthday={updateBirthday} onDeleteBirthday={deleteBirthday} onFirstVisit={() => unlockCard('c2')} openAddModal={triggerAddFriend} onAddModalOpened={() => setTriggerAddFriend(false)} />;
      case 'collection': return <Collection user={user} birthdays={birthdays} />;
      case 'profile': return <Profile user={user} onUpdate={setUser} birthdays={birthdays} challenges={challenges} notifEnabled={notifEnabled} onNotifEnable={notifEnable} onNotifDisable={notifDisable} isOnline={isOnline} />;
      default: return <Dashboard birthdays={birthdays} user={user} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative" style={{ background: 'var(--surface-bg)' }}>

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
      <header className="px-6 pb-2 flex justify-between items-center shadow-sm" style={{ background: 'var(--surface-card)', borderBottom: '2px solid var(--border-accent)', paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}>
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                {activeScreen === 'dashboard' ? 'Birthday Game' :
                 activeScreen === 'calendar' ? 'Mes amis' :
                 activeScreen.charAt(0).toUpperCase() + activeScreen.slice(1)}
              </h1>
              <span
                className="text-[11px] font-black px-1.5 py-0.5 rounded-full"
                style={{ color: '#FF4B4B', background: 'rgba(255,75,75,0.08)', fontFamily: "'Press Start 2P', monospace" }}
              >
                Niv.{user.level}
              </span>
            </div>
            <p className="text-[11px] font-black tracking-widest flex items-center gap-1.5" style={{ color: '#FF4B4B', fontFamily: "'Press Start 2P', monospace" }}>
              {user.xp} XP
              {streak > 0 && (
                <>
                  <span className="opacity-40">/</span>
                  <Flame size={11} className="text-orange-500 fill-orange-300" />
                  <span className="text-orange-500">{streak}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Message button */}
          <motion.button
            onClick={() => setShowMessages(true)}
            aria-label="Messages"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center border-2"
            style={{ background: '#FEFCE8', borderColor: 'var(--border-accent)' }}
          >
            <MessageCircle size={18} style={{ color: '#A16207' }} />
            {inbox.filter(m => !m.read).length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-black flex items-center justify-center px-1"
                style={{ background: '#FF4B4B' }}
              >
                {inbox.filter(m => !m.read).length}
              </motion.span>
            )}
          </motion.button>

          {/* QR scan button */}
          <motion.button
            onClick={() => navigateTo('scanner')}
            aria-label="Scanner un QR code"
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
            style={{ background: '#FF4B4B' }}
          >
            <QrCode size={20} strokeWidth={2.5} />
          </motion.button>
        </div>
      </header>

      {/* Streak reminder banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-orange-50 border-b border-orange-100">
              <div className="flex items-center gap-2 min-w-0">
                <Flame size={16} className="text-orange-500 fill-orange-300 shrink-0" />
                <p className="text-xs font-bold text-orange-700 leading-tight">
                  N'oublie pas d'ajouter un ami cette semaine pour garder ton streak !
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { dismissBanner(); navigateTo('calendar'); setTriggerAddFriend(true); }}
                  className="text-[11px] font-black text-orange-600 bg-orange-100 px-2.5 py-1 rounded-full whitespace-nowrap"
                >
                  + Ajouter
                </motion.button>
                <button onClick={dismissBanner} className="text-orange-400 hover:text-orange-600">
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              Mode hors ligne — les données seront synchronisées à la reconnexion
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main
        className={activeScreen === 'scanner' ? 'flex-1 overflow-hidden flex flex-col pb-24' : 'flex-1 overflow-y-auto pb-24'}
        style={{
          backgroundImage: activeScreen === 'scanner' ? 'none' : {
            dashboard:  'linear-gradient(180deg, rgba(255,75,75,0.05) 0%, transparent 100px)',
            calendar:   'linear-gradient(180deg, rgba(244,63,94,0.04) 0%, transparent 80px)',
            collection: 'linear-gradient(180deg, rgba(167,139,250,0.05) 0%, transparent 80px)',
            profile:    'linear-gradient(180deg, rgba(100,116,139,0.04) 0%, transparent 80px)',
          }[activeScreen] ?? 'none',
        }}
      >
        <AnimatePresence mode="wait" custom={slideDirection}>
          <motion.div
            key={activeScreen}
            custom={slideDirection}
            variants={{
              enter: (dir: number) => ({ x: dir * 48, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (dir: number) => ({ x: -dir * 32, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.26, ease: [0.32, 0, 0.68, 1] }}
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setCelebrationFriend(null)}
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden flex flex-col items-center text-center"
              style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}
            >
              {/* Accent strip */}
              <div className="w-full h-1" style={{ background: '#FF4B4B' }} />

              <div className="px-7 pt-7 pb-8 flex flex-col items-center gap-5 w-full">
                <button
                  onClick={() => setCelebrationFriend(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
                >
                  <X size={14} className="text-slate-400" />
                </button>

                {/* Photo ou initiale */}
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                  {celebrationFriend.photoUrl ? (
                    <img src={celebrationFriend.photoUrl} alt={celebrationFriend.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white" style={{ background: getAvatarColor(celebrationFriend.name) }}>
                      {celebrationFriend.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Ami ajouté</p>
                  <p className="text-2xl font-black text-slate-900">{celebrationFriend.name}</p>
                  <p className="text-sm text-slate-400 font-medium">{formatZodiac(celebrationFriend.zodiac)}</p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-sm font-black text-slate-500">+20 XP</span>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCelebrationFriend(null)}
                  className="w-full py-3.5 rounded-2xl font-black text-white text-sm"
                  style={{ background: '#FF4B4B' }}
                >
                  Continuer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MessagesModal
        open={showMessages}
        onClose={() => setShowMessages(false)}
        inbox={inbox}
        sentMessages={sentMessages}
        friends={birthdays}
        currentUser={user}
        onSend={sendMessage}
        onMarkConversationRead={markConversationRead}
      />

      <nav
        aria-label="Navigation principale"
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto backdrop-blur-2xl px-2 pt-4 flex items-center z-50 rounded-t-[var(--radius-pill)] shadow-token-nav"
        style={{ background: 'var(--surface-card-translucent)', borderTop: '2px solid var(--border-accent)', paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
      >
        <div className="flex-1 flex justify-center">
          <NavButton active={activeScreen === 'dashboard'} onClick={() => navigateTo('dashboard')} icon={<Home size={22} strokeWidth={2.5} />} label="Accueil" ariaLabel="Accueil" activeBg="bg-orange-50" activeColor="text-orange-500" activeFill="fill-orange-300" inactiveFill="fill-orange-300 dark:fill-transparent" />
        </div>
        <div className="flex-1 flex justify-center">
          <NavButton active={activeScreen === 'calendar'} onClick={() => navigateTo('calendar')} icon={<Heart size={22} strokeWidth={2.5} />} label="Amis" ariaLabel="Mes amis" activeBg="bg-rose-50" activeColor="text-rose-500" activeFill="fill-rose-300" inactiveFill="fill-rose-300 dark:fill-transparent" />
        </div>
        <div className="flex-1 flex justify-center">
          <motion.button
            aria-label="Ajouter un ami"
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { navigateTo('calendar'); setTriggerAddFriend(true); }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
            style={{ background: '#FF4B4B' }}
          >
            <Plus size={28} strokeWidth={2.5} />
          </motion.button>
        </div>
        <div className="flex-1 flex justify-center">
          <NavButton active={activeScreen === 'collection'} onClick={() => navigateTo('collection')} icon={<LayoutGrid size={22} strokeWidth={2.5} />} label="Cartes" ariaLabel="Ma collection de cartes" activeBg="bg-violet-50" activeColor="text-violet-500" activeFill="fill-violet-300" inactiveFill="fill-violet-300 dark:fill-transparent" />
        </div>
        <div className="flex-1 flex justify-center">
          <NavButton active={activeScreen === 'profile'} onClick={() => navigateTo('profile')} icon={<User size={22} strokeWidth={2.5} />} label="Profil" ariaLabel="Mon profil" activeBg="bg-blue-50" activeColor="text-blue-500" activeFill="fill-blue-300" inactiveFill="fill-blue-300 dark:fill-transparent" />
        </div>
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

function NavButton({ active, onClick, icon, label, ariaLabel, activeBg = 'bg-red-50', activeColor = 'text-red-500', activeFill = '', inactiveFill = '' }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, ariaLabel: string, activeBg?: string, activeColor?: string, activeFill?: string, inactiveFill?: string }) {
  const fillClass = active ? activeFill : inactiveFill;
  const iconWithFill = React.isValidElement(icon) && fillClass
    ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className: [
          (icon as React.ReactElement<{ className?: string }>).props.className || '',
          fillClass,
        ].filter(Boolean).join(' '),
      })
    : icon;

  return (
    <motion.button
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      whileTap={{ scale: 0.86 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'scale-110' : 'opacity-70 hover:opacity-90'}`}
    >
      <motion.div
        animate={active ? { y: -4 } : { y: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
          active ? activeBg : 'bg-transparent'
        }`}
      >
        <div className={`transition-all duration-300 ${active ? `scale-110 ${activeColor}` : 'scale-90'}`}>
          {iconWithFill}
        </div>
      </motion.div>
      <span className={`text-[12px] font-black uppercase tracking-[0.15em] ${active ? activeColor : ''}`} style={active ? undefined : { color: 'var(--nav-label-inactive)' }}>
        {label}
      </span>
    </motion.button>
  );
}
