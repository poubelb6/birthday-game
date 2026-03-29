import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { Star, Calendar as CalendarIcon } from 'lucide-react';
import { Birthday, UserProfile } from '../types';
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export function Dashboard({ birthdays, user }: { birthdays: Birthday[], user: UserProfile | null }) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const [showCake, setShowCake] = useState(true);

    useEffect(() => {
      const cycle = () => {
        setShowCake(true);
        setTimeout(() => setShowCake(false), 6000);
      };
      cycle();
      const interval = setInterval(cycle, 8000);
      return () => clearInterval(interval);
    }, []);

  const todayStart = startOfDay(today);
  const upcoming = birthdays
    .map(b => {
      const bDate = parseISO(b.birthDate);
      const nextBday = startOfDay(new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate()));
      if (nextBday < todayStart) nextBday.setFullYear(today.getFullYear() + 1);
      return { ...b, daysUntil: differenceInDays(nextBday, todayStart) };
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
      <section className="space-y-4 relative">
        <div className="flex flex-col items-center justify-center text-center">
          <h3 className="font-display text-lg font-black text-slate-900 flex items-center gap-2">
            <CalendarIcon size={20} className="text-rose-500" />
            Calendrier
          </h3>
        </div>

        <div className="relative pt-4">
          <div className="absolute top-0 left-0 right-0 flex justify-around px-8 z-20">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-3 h-6 bg-slate-700 rounded-full border-2 border-slate-800 shadow-sm" />
            ))}
          </div>

          <div className="bg-[#FEFFEE] rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.18),0_8px_20px_rgba(0,0,0,0.08)] border border-black/40 overflow-hidden relative">
            <div className="bg-rose-500 px-3 py-2.5 text-center border-b-[0.5px] border-rose-600/30">
              <h4 className="text-white font-black uppercase tracking-widest text-[13px]">
                {format(today, 'MMMM yyyy', { locale: fr })}
              </h4>
            </div>

            <div className="p-3 bg-[#FEFFEE]">
              <div className="grid grid-cols-7 gap-1 mb-1.5">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                  <div key={`${day}-${i}`} className={`text-center text-[13px] font-bold tracking-wide font-display py-0.5 ${i >= 5 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {days.map(day => {
                  const dayBirthdays = getBirthdaysForDay(day);
                  const hasBirthdays = dayBirthdays.length > 0;
                  const isToday = isSameDay(day, today);

                  return (
                    <motion.div
                      key={day.toString()}
                      whileHover={{ scale: 1.15, zIndex: 10 }}
                      animate={hasBirthdays && !isToday && showCake ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                      transition={hasBirthdays && !isToday && showCake ? { duration: 0.5, ease: 'easeInOut' } : {}}
                      className={`aspect-square rounded-full flex flex-col items-center justify-center font-black relative ${
                        isToday
                          ? 'border-[0.5px] border-rose-500 text-rose-500'
                          : hasBirthdays
                          ? 'border-[0.5px] border-green-400 text-green-600'
                          : 'bg-white text-slate-800 shadow-[0_2px_6px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.05)] [outline:0.5px_solid_rgba(0,0,0,0.12)]'
                      }`}
                    >
                      {!hasBirthdays && !isToday && (
                        <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-b from-white/60 to-transparent" />
                      )}
                      {hasBirthdays && !isToday ? (
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={showCake ? 'cake' : 'date'}
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -3 }}
                            transition={{ duration: 0.4 }}
                            className="flex items-center justify-center"
                          >
                            {showCake ? (
                              <motion.span
                                animate={{ y: [0, -2, 0] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="text-[16px]"
                              >
                                🎉
                              </motion.span>
                            ) : (
                              <span className="text-[13px] font-black font-display text-green-700">
                                {format(day, 'd')}
                              </span>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      ) : (
                        <span className="text-[13px] font-black font-display text-slate-800">{format(day, 'd')}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

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
                  <motion.div
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      b.daysUntil === 0 ? 'bg-green-100' :
                      b.daysUntil <= 7 ? 'bg-red-100' : 'bg-slate-100 text-slate-500'
                    }`}
                    style={b.daysUntil === 0 ? { color: '#58CC02', border: '1px solid #FF4B4B' } : b.daysUntil <= 7 ? { color: '#FF4B4B' } : {}}
                    animate={b.daysUntil === 0 ? { scale: [1, 1.08, 1], boxShadow: ['0 0 0px #FF4B4B', '0 0 4px #FF4B4B', '0 0 0px #FF4B4B'] } : {}}
                    transition={b.daysUntil === 0 ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : {}}
                  >
                    {b.daysUntil === 0
                      ? "C'est aujourd'hui ! 🎉"
                      : b.daysUntil <= 7
                      ? `Dans ${b.daysUntil} jour${b.daysUntil > 1 ? 's' : ''} 🎂`
                      : `J-${b.daysUntil}`}
                  </motion.div>
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

      <section className="space-y-4">
        <div className="flex flex-col items-center justify-center text-center">
          <h3 className="font-display text-lg font-black text-slate-900">Anniversaires par mois</h3>
          <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Année {today.getFullYear()}</span>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-4 pt-4 pb-3">
          {(() => {
            const monthLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
            const monthZodiacs = ['♑','♒','♓','♈','♉','♊','♋','♌','♍','♎','♏','♐'];
            const uniqueBirthdays = birthdays.filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i);
            const counts = Array.from({ length: 12 }, (_, m) =>
              uniqueBirthdays.filter(b => parseISO(b.birthDate).getMonth() === m).length
            );
            const max = Math.max(...counts, 1);
            const totalYear = counts.reduce((s, c) => s + c, 0);
            return (
              <>
                <div className="flex items-end justify-between gap-1.5" style={{ height: 96 }}>
                  {counts.map((count, m) => {
                    const isCurrentMonth = m === today.getMonth();
                    const barHeightPx = count === 0
                      ? 6
                      : Math.max(18, Math.round((count / max) * 80));
                    return (
                      <div key={m} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
                        {count > 0 && (
                          <span className={`text-[10px] font-black font-display leading-none ${isCurrentMonth ? 'text-rose-500' : 'text-slate-500'}`}>
                            {count}
                          </span>
                        )}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: barHeightPx }}
                          transition={{ duration: 0.7, delay: m * 0.05, ease: [0.34, 1.56, 0.64, 1] }}
                          className="w-full rounded-[6px]"
                          style={{
                            background: isCurrentMonth
                              ? 'linear-gradient(180deg, #FF6B6B 0%, #FF4B4B 100%)'
                              : count > 0
                              ? 'linear-gradient(180deg, #78D44B 0%, #58CC02 100%)'
                              : '#EEF2FF',
                            boxShadow: isCurrentMonth
                              ? '0 3px 0 #CC2E2E'
                              : count > 0
                              ? '0 3px 0 #3EA800'
                              : 'none',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between gap-1.5 mt-1.5">
                  {monthLabels.map((label, m) => {
                    const isCurrentMonth = m === today.getMonth();
                    return (
                      <div key={m} className="flex flex-col items-center flex-1">
                        <span className={`text-[8px] font-black font-display uppercase leading-none ${isCurrentMonth ? 'text-rose-500' : 'text-slate-400'}`}>
                          {label}
                        </span>
                        {isCurrentMonth && (
                          <span className="text-[10px] leading-none mt-0.5">{monthZodiacs[m]}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-center gap-2">
                  <span className="text-[11px] font-black font-display text-slate-500 uppercase tracking-widest">
                    Total {today.getFullYear()}
                  </span>
                  <span className="text-base">🎂</span>
                  <span className="text-[11px] font-black font-display text-slate-900">
                    {birthdays.length} anniversaire{birthdays.length > 1 ? 's' : ''}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-rose-300 p-4 rounded-3xl text-white space-y-0.5 shadow-lg shadow-rose-100"
          style={{ boxShadow: '0 4px 0 #e57373' }}
        >
          <p className="text-[11px] font-black uppercase tracking-widest text-rose-900/80 text-center">Total Amis</p>
          <p className="text-2xl font-black text-center">{birthdays.length}</p>
        </motion.div>
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-emerald-300 p-4 rounded-3xl text-white space-y-0.5 shadow-lg shadow-emerald-100"
          style={{ boxShadow: '0 4px 0 #6abf69' }}
        >
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-900/80 text-center">Cartes</p>
          <p className="text-2xl font-black text-center">{user?.collectedCards.length ?? 0}</p>
        </motion.div>
      </div>
    </div>
  );
}