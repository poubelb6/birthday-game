import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Bell,
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

type Screen = 'dashboard' | 'scanner' | 'calendar' | 'collection' | 'profile';

function AppContent() {
  const { user, birthdays, challenges, loading, firebaseUser, setUser, addBirthday, deleteBirthday } = useAppState();
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  const [showSplash, setShowSplash] = useState(true);

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

  if (loading || showSplash) {
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
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ backgroundColor: '#ffe8e8' }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3"
              style={{
                background: '#ffe8e8',
                border: '1px solid #ffb3b3',
                outline: '1px solid #FF4B4B22',
                borderRadius: '9999px',
                padding: '12px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
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
      case 'dashboard': return <Dashboard birthdays={birthdays} user={user} />;
      case 'scanner': return <Scanner onScan={addBirthday} existingBirthdays={birthdays} />;
      case 'calendar': return <Calendar birthdays={birthdays} onAddBirthday={addBirthday} onDeleteBirthday={deleteBirthday} />;
      case 'collection': return <Collection user={user} birthdays={birthdays} />;
      case 'profile': return <Profile user={user} onUpdate={setUser} birthdays={birthdays} challenges={challenges} />;
      default: return <Dashboard birthdays={birthdays} user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      <header className="bg-white px-6 pt-12 pb-4 flex justify-between items-center border-b-2 border-slate-900 shadow-sm">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {activeScreen === 'dashboard' ? 'Birthday Game' : 
               activeScreen.charAt(0).toUpperCase() + activeScreen.slice(1)}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#FF4B4B' }}>
              Niveau {user.level} • {user.xp} XP
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

      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-2xl border-t-2 border-slate-900 px-6 py-4 flex justify-between items-center z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
        <NavButton active={activeScreen === 'dashboard'} onClick={() => setActiveScreen('dashboard')} icon="🏠" label="Home" />
        <NavButton active={activeScreen === 'calendar'} onClick={() => setActiveScreen('calendar')} icon="📅" label="Calendar" />
        <div className="relative -top-10">
          <motion.button 
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveScreen('scanner')}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white relative overflow-hidden"
            style={{ background: '#FF4B4B' }}
          >
            <QrCode size={32} strokeWidth={2.5} className="relative z-10" />
          </motion.button>
        </div>
        <NavButton active={activeScreen === 'collection'} onClick={() => setActiveScreen('collection')} icon="🃏" label="Cards" />
        <NavButton active={activeScreen === 'profile'} onClick={() => setActiveScreen('profile')} icon="👤" label="Profile" />
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

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: string, label: string }) {
  return (
    <button 
      onClick={onClick}
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