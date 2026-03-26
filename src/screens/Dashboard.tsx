import { motion } from 'motion/react';
import { Gift, Star, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Birthday, UserProfile } from '../types';
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export function Dashboard({ birthdays, user }: { birthdays: Birthday[], user: UserProfile | null }) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const upcoming = birthdays
    .map(b => {
      const bDate = parseISO(b.birthDate);
      const nextBday = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
      if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1);
      return { ...b, daysUntil: differenceInDays(nextBday, today) };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3);

  const getBirthdaysForDay = (day: Date) => {
    return birthdays.filter(b => {
      const bDate = parseISO(b.birthDate);
      return bDate.getDate() === day.getDate() && bDate.getMonth() === day.getMonth();
    });
  };

  return (
    <div className="p-6 space-y-8">
      {/* Mini Calendar - Game Style */}
      <section className="space-y-4 relative">
        <div className="flex flex-col items-center justify-center text-center">
          <h3 className="font-display text-lg font-black text-slate-900 flex items-center gap-2">
            <CalendarIcon size={20} className="text-rose-500" />
            Calendrier
          </h3>
        </div>

        <div className="relative pt-4">
          {/* Spiral Rings */}
          <div className="absolute top-0 left-0 right-0 flex justify-around px-8 z-20">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-3 h-6 bg-slate-700 rounded-full border-2 border-slate-800 shadow-sm" />
            ))}
          </div>

          {/* Calendar Body */}
          <div className=" bg-[#FEFFEE] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-black/60 ring-1 ring-slate-900/5 overflow-hidden relative group">
            {/* Red Header */}
            <div className="bg-rose-500 p-4 pt-6 text-center border-b-4 border-rose-600/20">
              <h4 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-sm">
                {format(today, 'MMMM yyyy', { locale: fr })}
              </h4>
            </div>

            {/* Days Grid */}
            <div className="p-4  bg-[#FEFFEE] border-b border-black/60 rounded-b-3xl">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                  <div key={`${day}-${i}`} className={`text-center text-[11px] font-black py-1 ${i >= 5 ? 'text-rose-600' : 'text-slate-600'}`}>
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {days.map(day => {
                  const dayBirthdays = getBirthdaysForDay(day);
                  const hasBirthdays = dayBirthdays.length > 0;
                  const isToday = isSameDay(day, today);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <motion.div 
                      key={day.toString()} 
                      whileHover={{ scale: 1.15, zIndex: 10, rotate: [0, -5, 5, 0] }}
                      className={`aspect-square rounded-full flex flex-col items-center justify-center text-[11px] font-black relative transition-all duration-300 border hover:ring-4 hover:ring-sky-400/30 active:ring-8 active:ring-sky-500/40 ${
                        isToday ? 'bg-rose-500 text-white border-rose-600 shadow-[0_4px_12px_rgba(225,29,72,0.3)] -translate-y-1' : 
                        hasBirthdays ? 'bg-sky-400 text-white border-sky-500 shadow-[0_4px_12px_rgba(14,165,233,0.3)]' : 
                        'bg-white text-slate-400 border-black/60 shadow-sm hover:shadow-md hover:border-black/80'
                      }`}
                    >
                      <div className="relative z-10">{format(day, 'd')}</div>
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

            {/* Page Curl Effect */}
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-slate-200 to-transparent pointer-events-none opacity-50" />
          </div>
        </div>
      </section>

      {/* Upcoming Birthdays */}
      <section className="space-y-4">
        <div className="flex flex-col items-center justify-center text-center">
          <h3 className="font-display text-lg font-black text-slate-900">Prochains Anniversaires</h3>
          <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Calendrier</span>
        </div>
        
        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((b, i) => (
              <motion.div 
                key={b.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ x: 4 }}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 group cursor-pointer hover:border-rose-200 transition-colors"
              >
                <div className="w-14 h-14 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                  <img src={b.photoUrl || `https://picsum.photos/seed/${b.id}/100/100`} alt={b.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900">{b.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {format(parseISO(b.birthDate), 'd MMMM', { locale: fr })} • {b.zodiac}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    b.daysUntil === 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 
                    b.daysUntil < 7 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {b.daysUntil === 0 ? "C'est aujourd'hui !" : `J-${b.daysUntil}`}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-black/60 rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Star className="text-slate-300" size={32} />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-400">Aucun anniversaire</p>
              <p className="text-xs text-slate-400">Scanne un QR code pour commencer ta collection !</p>
            </div>
          </div>
        )}
      </section>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-rose-400 p-6 rounded-3xl text-white space-y-1 shadow-lg shadow-rose-100"
        >
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Amis</p>
          <p className="text-3xl font-black">{birthdays.length}</p>
        </motion.div>
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-emerald-400 p-6 rounded-3xl text-white space-y-1 shadow-lg shadow-emerald-100"
        >
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Cartes</p>
          <p className="text-3xl font-black">{user?.collectedCards.length ?? 0}</p>
        </motion.div>
      </div>
    </div>
  );
}
