import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Calendar as CalendarIcon, 
  QrCode, 
  User, 
  Plus, 
  Search,
  Camera,
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

type Screen = 'dashboard' | 'scanner' | 'calendar' | 'collection' | 'profile';

import { Logo } from './components/Logo';

function AppContent() {
  const { user, birthdays, challenges, loading, firebaseUser, setUser, addBirthday } = useAppState();
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-sky-50 flex flex-col items-center justify-center gap-6"
      >
        <Logo size={96} />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex flex-col items-center"
        >
          <h1 className="font-display text-3xl font-black tracking-widest text-slate-900 uppercase">
            Birthday Game
          </h1>
          <motion.div 
            className="h-1 w-12 bg-rose-400 rounded-full mt-2"
            animate={{ width: [0, 48, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center p-8 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-sky-100"
        >
          <Logo size={64} />
        </motion.div>
        <h1 className="font-display text-4xl font-black mb-4 tracking-tight text-slate-900">BIRTHDAY GAME</h1>
        <p className="text-slate-500 mb-12 text-lg">Collectionne les anniversaires de tes amis et débloque des cartes rares !</p>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogin}
          className="w-full bg-white text-rose-400 font-bold py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-sky-100 hover:bg-rose-50 transition-colors border border-sky-100"
        >
          <LogIn size={24} />
          SE CONNECTER AVEC GOOGLE
        </motion.button>
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
      default: return <Dashboard birthdays={birthdays} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="bg-white px-6 pt-12 pb-4 flex justify-between items-center border-b-2 border-slate-900 shadow-sm">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {activeScreen === 'dashboard' ? 'Birthday Game' : 
               activeScreen.charAt(0).toUpperCase() + activeScreen.slice(1)}
            </h1>
            <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest">
              Niveau {user.level} • {user.xp} XP
            </p>
          </div>
        </div>
        <button className="p-2 bg-amber-50 rounded-full text-amber-500 hover:bg-amber-100 transition-colors relative group border-2 border-slate-900">
          <Bell size={20} className="group-hover:rotate-12 transition-transform" />
          <motion.span 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-sm" 
          />
        </button>
      </header>

      {/* Main Content */}
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

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-2xl border-t-2 border-slate-900 px-6 py-4 flex justify-between items-center z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
        <NavButton 
          active={activeScreen === 'dashboard'} 
          onClick={() => setActiveScreen('dashboard')} 
          icon="🏠" 
          label="Home" 
          activeColor="text-sky-500"
          activeBg="bg-sky-50"
          borderColor="border-slate-900"
          shape="rounded-xl"
        />
        <NavButton 
          active={activeScreen === 'calendar'} 
          onClick={() => setActiveScreen('calendar')} 
          icon="📅" 
          label="Calendar" 
          activeColor="text-emerald-500"
          activeBg="bg-emerald-50"
          borderColor="border-slate-900"
          shape="rounded-xl"
        />
        <div className="relative -top-10">
          <motion.button 
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveScreen('scanner')}
            className="w-18 h-18 bg-red-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200 border-2 border-slate-900 relative overflow-hidden group"
          >
            <motion.div 
              className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 45, 0]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <QrCode size={32} strokeWidth={2.5} className="relative z-10" />
          </motion.button>
          {/* Floating indicator for scanner */}
          <motion.div 
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-400 rounded-full blur-[1px]"
          />
        </div>
        <NavButton 
          active={activeScreen === 'collection'} 
          onClick={() => setActiveScreen('collection')} 
          icon="🃏" 
          label="Cards" 
          activeColor="text-amber-500"
          activeBg="bg-amber-50"
          borderColor="border-slate-900"
          shape="rounded-xl"
        />
        <NavButton 
          active={activeScreen === 'profile'} 
          onClick={() => setActiveScreen('profile')} 
          icon="👤" 
          label="Profile" 
          activeColor="text-rose-500"
          activeBg="bg-rose-50"
          borderColor="border-slate-900"
          shape="rounded-xl"
        />
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

function NavButton({ active, onClick, icon, label, activeColor, activeBg, borderColor, shape = "rounded-xl" }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, activeColor: string, activeBg: string, borderColor: string, shape?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${active ? 'scale-110' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <div className="relative">
        <motion.div
          animate={active ? { 
            y: -4, 
            scale: [1, 1.05, 1]
          } : { y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`w-12 h-12 ${shape} flex items-center justify-center transition-all duration-500 relative z-10 ${active ? `${activeBg} border-2 ${borderColor} shadow-sm` : 'bg-transparent border-2 border-transparent'}`}
        >
          <div className={`text-2xl transition-all duration-300 ${active ? 'scale-110' : 'scale-90'}`}>
            {icon}
          </div>
        </motion.div>
      </div>
      <span className={`text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 ${active ? activeColor : 'opacity-40'}`}>{label}</span>
    </button>
  );
}
