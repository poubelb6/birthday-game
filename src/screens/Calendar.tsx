import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, X, UserPlus } from 'lucide-react';
import { Birthday } from '../types';
import { getZodiacSign } from '../utils/gameLogic';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { fr } from 'date-fns/locale';

export function Calendar({ birthdays, onAddBirthday }: { birthdays: Birthday[], onAddBirthday?: (b: Birthday) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getBirthdaysForDay = (day: Date) => {
    return birthdays.filter(b => {
      const bDate = parseISO(b.birthDate);
      return bDate.getDate() === day.getDate() && bDate.getMonth() === day.getMonth();
    });
  };

  const handleAddFriend = () => {
    if (!newName || !newDate || !onAddBirthday) return;
    
    const birthDate = parseISO(newDate);
    const birthday: Birthday = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      birthDate: newDate,
      zodiac: getZodiacSign(birthDate),
      addedAt: new Date().toISOString(),
    };
    
    onAddBirthday(birthday);
    setNewName('');
    setNewDate('');
    setShowAddModal(false);
  };

  const handleDayClick = (day: Date) => {
    setNewDate(format(day, 'yyyy-MM-dd'));
    setShowAddModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-2xl font-black text-slate-900 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 bg-white border border-black/60 rounded-xl text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 bg-white border border-black/60 rounded-xl text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-[#FEFFEE] p-6 rounded-[32px] border border-black/60 shadow-sm">
        <div className="grid grid-cols-7 gap-2">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
            <div key={`${day}-${i}`} className={`text-center text-[11px] font-black py-2 ${i >= 5 ? 'text-rose-600' : 'text-slate-600'}`}>
              {day}
            </div>
          ))}
          {/* Cases vides pour aligner le premier jour du mois */}
          {Array.from({ length: (monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1) }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(day => {
            const dayBirthdays = getBirthdaysForDay(day);
            const isToday = isSameDay(day, new Date());
            const hasBirthdays = dayBirthdays.length > 0;
            
            return (
              <motion.div 
                key={day.toString()} 
                onClick={() => handleDayClick(day)}
                whileHover={{ scale: 1.15, zIndex: 10, rotate: [0, -5, 5, 0] }}
                whileTap={{ scale: 0.95 }}
                className={`aspect-square rounded-full flex flex-col items-center justify-center relative border transition-all cursor-pointer shadow-sm hover:ring-4 hover:ring-sky-400/30 active:ring-8 active:ring-sky-500/40 ${
                  isToday ? 'bg-rose-500 border-rose-600 text-white shadow-[0_4px_12px_rgba(225,29,72,0.3)] -translate-y-1' : 
                  hasBirthdays ? 'bg-sky-400 border-sky-500 text-white shadow-[0_4px_12px_rgba(14,165,233,0.3)]' : 
                  'bg-white border-black/60 text-slate-900 hover:border-black/80 hover:shadow-md'
                }`}
              >
                <div className="relative z-10 text-xs font-black">{format(day, 'd')}</div>
                {/* Bubble Highlight */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                {hasBirthdays && !isToday && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-white animate-bounce shadow-sm z-20" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Événements du mois</h3>
        <div className="space-y-3">
          {birthdays
            .filter(b => parseISO(b.birthDate).getMonth() === currentMonth.getMonth())
            .sort((a, b) => parseISO(a.birthDate).getDate() - parseISO(b.birthDate).getDate())
            .map(b => (
              <div key={b.id} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-black/60 shadow-sm">
                <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-black text-xs border border-sky-200">
                  {format(parseISO(b.birthDate), 'dd')}
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-sm">{b.name}</p>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">{b.zodiac}</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-display text-xl font-black text-slate-900">Ajouter un ami</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-700">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nom</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ex: Marie"
                    className="w-full bg-slate-50 border border-black/60 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date de naissance</label>
                  <input 
                    type="date" 
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full bg-slate-50 border border-black/60 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              <button 
                onClick={handleAddFriend}
                disabled={!newName || !newDate}
                className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-sky-100 hover:bg-sky-600 transition-all disabled:opacity-50"
              >
                AJOUTER L'AMI
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
