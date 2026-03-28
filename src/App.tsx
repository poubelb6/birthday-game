import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode,
  Bell,
  LogIn
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
  const { user, birthdays, challenges, loading, firebaseUser, setUser, addBirthday } = useAppState();
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
          <div className="w-full space-y-3 mt-2">
            <button
              onClick={handleLogin}
              className="btn-white btn-full"
            >
              <LogIn size={22} />
              Se connecter avec Google
            </button>
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
      case 'calendar': return <Calendar birthdays={birthdays} onAddBirthday={addBirthday} />;
      case 'collection': return <Collection user={user} />;
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
        <button className="p-2 rounded-full relative group border-2 border-slate-900" style={{ background: '#f0fdf4' }}>
          <Bell size={20} style={{ color: '#58CC02' }} className="group-hover:rotate-12 transition-transform" />
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
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white border-2 border-slate-900 relative overflow-hidden"
            style={{ background: '#FF4B4B', boxShadow: '0 5px 0 #CC2E2E' }}
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
          active ? 'bg-red-50 border-2 border-slate-900 shadow-[0_3px_0_#0f172a]' : 'bg-transparent border-2 border-transparent'
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