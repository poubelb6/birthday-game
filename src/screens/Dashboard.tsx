import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { ZODIAC_EMOJI, formatZodiac, getAvatarColor } from '../utils/zodiac';
import { Star, ChevronLeft, ChevronRight, Plus, ChevronDown, Sparkles, Globe2, Flame, Heart, Users, UserCircle } from 'lucide-react';
import { Birthday, UserProfile } from '../types';
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FriendEditModal } from '../components/FriendEditModal';
import { FriendProfileModal } from '../components/FriendProfileModal';
import { CELEB_BIRTHDAYS } from '../data/celebBirthdays';
import { useStreak } from '../hooks/useStreak';


export function Dashboard({ birthdays, user, onRequestAddFriend, onUpdateBirthday, onDeleteBirthday }: {
  birthdays: Birthday[],
  user: UserProfile | null,
  onRequestAddFriend?: () => void,
  onUpdateBirthday?: (id: string, updates: Record<string, unknown>) => Promise<void>,
  onDeleteBirthday?: (id: string) => void,
}) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const [showCake, setShowCake] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<Birthday | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Birthday | null>(null);
  const [viewingFriend, setViewingFriend] = useState<Birthday | null>(null);
  const [birthdayPicker, setBirthdayPicker] = useState<{ dayLabel: string; birthdays: Birthday[] } | null>(null);
  const [celebExpanded, setCelebExpanded] = useState(false);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  // Swipe touch tracking
  const touchStartX = useRef<number | null>(null);
  const [slideDirection, setSlideDirection] = useState(1);

  const goNext = () => { setSlideDirection(1);  setCurrentMonth(m => addMonths(m, 1)); };
  const goPrev = () => { setSlideDirection(-1); setCurrentMonth(m => subMonths(m, 1)); };

  useEffect(() => {
    const cycle = () => {
      setShowCake(true);
      setTimeout(() => setShowCake(false), 6000);
    };
    cycle();
    const interval = setInterval(cycle, 8000);
    return () => clearInterval(interval);
  }, []);

  const streak = useStreak();
  const [showStreakToast, setShowStreakToast] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem('weekly_toast_shown')) {
      sessionStorage.setItem('weekly_toast_shown', '1');
      setShowStreakToast(true);
      const t = setTimeout(() => setShowStreakToast(false), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  const todayStart = startOfDay(today);

  const todayMMDD = format(today, 'MM-dd');
  const celebOfDay = CELEB_BIRTHDAYS.find(c => c.date === todayMMDD) ?? null;

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

  const handleDayClick = (day: Date, dayBirthdays: Birthday[]) => {
    if (dayBirthdays.length === 1) {
      setViewingFriend(dayBirthdays[0]);
      return;
    }
    if (dayBirthdays.length > 1) {
      setBirthdayPicker({
        dayLabel: format(day, 'd MMMM', { locale: fr }),
        birthdays: dayBirthdays,
      });
      return;
    }
    onRequestAddFriend?.();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      delta < 0 ? goNext() : goPrev();
    }
    touchStartX.current = null;
  };

  // suppress unused warning — formatZodiac kept for potential future use in card tooltips
  void formatZodiac;

  return (
    <div className="p-6 space-y-8">

      {/* ── Streak toast éphémère ── */}
      <AnimatePresence>
        {showStreakToast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="flex items-center justify-between px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(251,146,60,0.1)', border: '1.5px solid rgba(251,146,60,0.25)' }}
          >
            <div className="flex items-center gap-2.5">
              <Flame size={18} className="text-orange-500 fill-orange-300" />
              <span className="text-[13px] font-black" style={{ color: 'var(--text-1)' }}>
                Tu as ajouté {streak} ami{streak > 1 ? 's' : ''} cette semaine !
              </span>
            </div>
            <span className="text-[11px] font-bold text-orange-400">
              {streak >= 7 ? 'En feu !' : streak >= 3 ? 'Super social !' : "C'est parti !"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="space-y-3">
        {upcoming.length > 0 ? (() => {
          const [hero, ...rest] = upcoming;

          const catBorder = (cat?: string) =>
            cat === 'famille' ? '#f43f5e' :
            cat === 'ami'     ? '#0ea5e9' :
            cat === 'autre'   ? '#94a3b8' : '#0f172a';

          const isToday   = hero.daysUntil === 0;
          const isUrgent  = hero.daysUntil >= 1 && hero.daysUntil <= 3;
          const isWeek    = hero.daysUntil >= 4 && hero.daysUntil <= 7;

          const heroBg = isToday  ? 'linear-gradient(135deg, #FF4B4B 0%, #ff8566 100%)'
                       : isUrgent ? 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)'
                       : isWeek   ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                       : 'var(--surface-card)';

          const heroTextColor  = (isToday || isUrgent || isWeek) ? '#ffffff' : 'var(--text-1)';
          const heroSubColor   = (isToday || isUrgent || isWeek) ? 'rgba(255,255,255,0.75)' : 'var(--text-2)';
          const heroBorder     = isToday  ? '2px solid rgba(255,255,255,0.3)'
                               : isUrgent ? '2px solid rgba(255,255,255,0.25)'
                               : isWeek   ? '2px solid rgba(255,255,255,0.2)'
                               : '2px solid #0f172a';

          const urgencyLabel = isToday  ? "C'EST AUJOURD'HUI !"
                             : isUrgent ? 'Très bientôt'
                             : isWeek   ? 'Cette semaine'
                             : 'Prochain anniversaire';

          return (
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                onClick={() => setViewingFriend(hero)}
                className="cursor-pointer rounded-3xl overflow-hidden shadow-md"
                style={{ background: heroBg, border: heroBorder }}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="relative shrink-0">
                    {isToday && (
                      <motion.div
                        animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.2, 0.6] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.4)', margin: -4, borderRadius: 20 }}
                      />
                    )}
                    <div className="w-20 h-20 rounded-2xl overflow-hidden" style={{ border: (isToday || isUrgent || isWeek) ? '3px solid rgba(255,255,255,0.6)' : `3px solid ${catBorder(hero.category)}` }}>
                      {hero.photoUrl ? (
                        <img src={hero.photoUrl} alt={hero.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-3xl text-white" style={{ background: getAvatarColor(hero.name) }}>
                          {hero.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <motion.p
                      animate={isToday ? { scale: [1, 1.04, 1] } : {}}
                      transition={isToday ? { duration: 1.2, repeat: Infinity } : {}}
                      className="text-[10px] font-black uppercase tracking-widest mb-0.5"
                      style={{ color: (isToday || isUrgent || isWeek) ? 'rgba(255,255,255,0.85)' : 'var(--text-3)' }}
                    >
                      {urgencyLabel}
                    </motion.p>
                    <h3 className="font-black text-lg leading-tight truncate" style={{ color: heroTextColor }}>
                      {hero.name.split(' ')[0]}
                    </h3>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: heroSubColor }}>
                      {format(parseISO(hero.birthDate), 'd MMMM', { locale: fr })} {ZODIAC_EMOJI[hero.zodiac] ?? ''}
                    </p>
                  </div>

                  <div
                    className="shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-2xl font-black"
                    style={{
                      background: (isToday || isUrgent || isWeek) ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                      color: (isToday || isUrgent || isWeek) ? '#ffffff' : '#475569',
                    }}
                  >
                    {isToday ? (
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-2xl"
                      >🎂</motion.span>
                    ) : (
                      <>
                        <motion.span
                          animate={isUrgent ? { scale: [1, 1.08, 1] } : {}}
                          transition={isUrgent ? { duration: 0.8, repeat: Infinity } : {}}
                          className="text-xl leading-none"
                        >{hero.daysUntil}</motion.span>
                        <span className="text-[9px] font-bold leading-none mt-0.5">jours</span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>

              {rest.length > 0 && (
                <div className="flex gap-3 px-1">
                  {rest.slice(0, 2).map((b, i) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 280, damping: 22 }}
                      onClick={() => setViewingFriend(b)}
                      className="flex-1 cursor-pointer rounded-2xl border border-slate-200 p-3 flex items-center gap-3"
                      style={{ background: 'var(--surface-card)' }}
                    >
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-xl overflow-hidden" style={{ border: `2px solid ${catBorder(b.category)}` }}>
                          {b.photoUrl ? (
                            <img src={b.photoUrl} alt={b.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-lg text-white" style={{ background: getAvatarColor(b.name) }}>
                              {b.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className={`absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded-full text-[8px] font-black shadow-sm ${
                          b.daysUntil === 0 ? 'bg-green-100 text-green-600' :
                          b.daysUntil <= 7 ? 'bg-red-100 text-red-500' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {b.daysUntil === 0 ? '🎂' : `J-${b.daysUntil}`}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate" style={{ color: 'var(--text-1)' }}>{b.name.split(' ')[0]}</p>
                        <p className="text-[10px] font-semibold" style={{ color: 'var(--text-2)' }}>
                          {format(parseISO(b.birthDate), 'd MMM', { locale: fr })} {ZODIAC_EMOJI[b.zodiac] ?? ''}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          );
        })() : (
          <div className="bg-slate-50 border border-dashed border-black/60 rounded-3xl p-10 text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Star className="text-slate-300" size={32} />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-600">Aucun anniversaire</p>
              <p className="text-xs text-slate-500">Commence par ajouter un ami à ta collection</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onRequestAddFriend?.()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-black text-sm"
              style={{ background: '#FF4B4B', boxShadow: '0 4px 0 #CC2E2E' }}
            >
              <Plus size={16} strokeWidth={3} />
              Ajouter un ami
            </motion.button>
          </div>
        )}
      </section>

      <section className="space-y-4 relative">

        <div className="relative pt-4">
          <div className="absolute top-0 left-0 right-0 flex justify-around px-8 z-20">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-3 h-6 bg-slate-700 rounded-full border-2 border-slate-800 shadow-sm" />
            ))}
          </div>

          <div
            className="rounded-[var(--radius-card-sm)] shadow-token-lg overflow-hidden relative"
            style={{ background: 'var(--calendar-warm-bg)', border: '1px solid var(--border-mid)' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="bg-rose-500 px-3 py-2.5 flex items-center justify-between border-b-[0.5px] border-rose-600/30">
              <motion.button
                onClick={goPrev}
                whileTap={{ scale: 0.88 }}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={18} className="text-white" strokeWidth={3} />
              </motion.button>
              <div className="overflow-hidden flex-1 flex justify-center">
                <AnimatePresence mode="wait" custom={slideDirection}>
                  <motion.h4
                    key={format(currentMonth, 'yyyy-MM')}
                    custom={slideDirection}
                    variants={{
                      enter: (dir: number) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
                      center: { x: 0, opacity: 1 },
                      exit:  (dir: number) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.28, ease: [0.32, 0, 0.68, 1] }}
                    className="text-white font-black uppercase tracking-widest text-[13px] capitalize whitespace-nowrap"
                  >
                    {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                  </motion.h4>
                </AnimatePresence>
              </div>
              <motion.button
                onClick={goNext}
                whileTap={{ scale: 0.88 }}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors"
              >
                <ChevronRight size={18} className="text-white" strokeWidth={3} />
              </motion.button>
            </div>

            <div className="px-3 pt-3" style={{ background: 'var(--calendar-warm-bg)' }}>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsCalendarExpanded(v => !v)}
                className="w-full flex items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-black"
                style={{ background: '#fff1f2', color: '#e11d48' }}
              >
                <motion.div animate={{ rotate: isCalendarExpanded ? 180 : 0 }} transition={{ duration: 0.22 }}>
                  <ChevronDown size={16} strokeWidth={3} />
                </motion.div>
                <span>{isCalendarExpanded ? 'Masquer le calendrier' : 'Afficher le calendrier'}</span>
                <motion.div animate={{ rotate: isCalendarExpanded ? 180 : 0 }} transition={{ duration: 0.22 }}>
                  <ChevronDown size={16} strokeWidth={3} />
                </motion.div>
              </motion.button>
            </div>

            <AnimatePresence initial={false}>
              {isCalendarExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
            <div className="p-3" style={{ background: 'var(--calendar-warm-bg)' }}>
              <div className="grid grid-cols-7 gap-1 mb-1.5">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                  <div key={`${day}-${i}`} className={`text-center text-[13px] font-bold tracking-wide font-display py-0.5 ${i >= 5 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {day}
                  </div>
                ))}
              </div>

              <div className="overflow-hidden">
              <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={format(currentMonth, 'yyyy-MM')}
                custom={slideDirection}
                variants={{
                  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit:  (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.32, 0, 0.68, 1] }}
              >
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
                      onClick={() => handleDayClick(day, dayBirthdays)}
                      whileHover={{ scale: 1.15, zIndex: 10 }}
                      whileTap={{ scale: 0.95 }}
                      animate={hasBirthdays && !isToday && showCake ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                      transition={hasBirthdays && !isToday && showCake ? { duration: 0.5, ease: 'easeInOut' } : {}}
                      className={`aspect-square rounded-full flex flex-col items-center justify-center font-black relative cursor-pointer ${
                        isToday
                          ? 'border-[0.5px] border-rose-500 text-rose-500'
                          : hasBirthdays
                          ? 'border-[0.5px] border-green-400 text-green-600'
                          : 'bg-white text-slate-800 shadow-token-sm [outline:0.5px_solid_rgba(0,0,0,0.12)]'
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
              </motion.div>
              </AnimatePresence>
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsCalendarExpanded(false)}
                className="w-full mt-3 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black"
                style={{ background: '#fff1f2', color: '#e11d48' }}
              >
                <ChevronDown size={16} strokeWidth={3} />
                Réduire le calendrier
              </motion.button>
            </div>
            </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {celebOfDay && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 overflow-hidden shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl shrink-0">{celebOfDay.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles size={9} className="text-amber-400 shrink-0" />
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Né(e) aujourd'hui</span>
                </div>
                <h4 className="font-display font-black text-[13px] leading-tight truncate" style={{ color: 'var(--text-1)' }}>
                  {celebOfDay.name}
                </h4>
                <p className="text-[11px] font-medium leading-tight mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>
                  {celebOfDay.title}
                </p>
              </div>
              <motion.button
                onClick={() => setCelebExpanded(v => !v)}
                whileTap={{ scale: 0.88 }}
                className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0"
              >
                <motion.div animate={{ rotate: celebExpanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronDown size={14} className="text-amber-500" strokeWidth={2.5} />
                </motion.div>
              </motion.button>
            </div>
            <AnimatePresence initial={false}>
              {celebExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 mt-3 border-t border-amber-100 space-y-2.5">
                    <p className="text-[12px] text-slate-600 leading-relaxed">{celebOfDay.description}</p>
                    <a
                      href={celebOfDay.wikipedia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-amber-100 border border-amber-200 rounded-xl px-3 py-1.5 active:scale-95 transition-transform"
                    >
                      <Globe2 size={11} className="text-amber-600" />
                      <span className="text-[11px] font-black text-amber-600">Wikipedia</span>
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>

      <section className="hidden space-y-3">
        {upcoming.length > 0 ? (() => {
          const [hero, ...rest] = upcoming;

          const catBorder = (cat?: string) =>
            cat === 'famille' ? '#f43f5e' :
            cat === 'ami'     ? '#0ea5e9' :
            cat === 'autre'   ? '#94a3b8' : '#0f172a';

          const isToday   = hero.daysUntil === 0;
          const isUrgent  = hero.daysUntil >= 1 && hero.daysUntil <= 3;
          const isWeek    = hero.daysUntil >= 4 && hero.daysUntil <= 7;

          const heroBg = isToday  ? 'linear-gradient(135deg, #FF4B4B 0%, #ff8566 100%)'
                       : isUrgent ? 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)'
                       : isWeek   ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                       : 'var(--surface-card)';

          const heroTextColor  = (isToday || isUrgent || isWeek) ? '#ffffff' : 'var(--text-1)';
          const heroSubColor   = (isToday || isUrgent || isWeek) ? 'rgba(255,255,255,0.75)' : 'var(--text-2)';
          const heroBorder     = isToday  ? '2px solid rgba(255,255,255,0.3)'
                               : isUrgent ? '2px solid rgba(255,255,255,0.25)'
                               : isWeek   ? '2px solid rgba(255,255,255,0.2)'
                               : '2px solid #0f172a';

          const urgencyLabel = isToday  ? "C'EST AUJOURD'HUI !"
                             : isUrgent ? 'Très bientôt'
                             : isWeek   ? 'Cette semaine'
                             : 'Prochain anniversaire';

          return (
            <div className="space-y-3">
              {/* ── Hero card ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                onClick={() => setViewingFriend(hero)}
                className="cursor-pointer rounded-3xl overflow-hidden shadow-md"
                style={{ background: heroBg, border: heroBorder }}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="relative shrink-0">
                    {isToday && (
                      <motion.div
                        animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.2, 0.6] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.4)', margin: -4, borderRadius: 20 }}
                      />
                    )}
                    <div className="w-20 h-20 rounded-2xl overflow-hidden" style={{ border: (isToday || isUrgent || isWeek) ? '3px solid rgba(255,255,255,0.6)' : `3px solid ${catBorder(hero.category)}` }}>
                      {hero.photoUrl ? (
                        <img src={hero.photoUrl} alt={hero.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-3xl text-white" style={{ background: getAvatarColor(hero.name) }}>
                          {hero.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <motion.p
                      animate={isToday ? { scale: [1, 1.04, 1] } : {}}
                      transition={isToday ? { duration: 1.2, repeat: Infinity } : {}}
                      className="text-[10px] font-black uppercase tracking-widest mb-0.5"
                      style={{ color: (isToday || isUrgent || isWeek) ? 'rgba(255,255,255,0.85)' : 'var(--text-3)' }}
                    >
                      {urgencyLabel}
                    </motion.p>
                    <h3 className="font-black text-lg leading-tight truncate" style={{ color: heroTextColor }}>
                      {hero.name.split(' ')[0]}
                    </h3>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: heroSubColor }}>
                      {format(parseISO(hero.birthDate), 'd MMMM', { locale: fr })} {ZODIAC_EMOJI[hero.zodiac] ?? ''}
                    </p>
                  </div>

                  <div className="shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-2xl font-black"
                    style={{ background: (isToday || isUrgent || isWeek) ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                             color: (isToday || isUrgent || isWeek) ? '#ffffff' : '#475569' }}
                  >
                    {isToday ? (
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-2xl"
                      >🎂</motion.span>
                    ) : (
                      <>
                        <motion.span
                          animate={isUrgent ? { scale: [1, 1.08, 1] } : {}}
                          transition={isUrgent ? { duration: 0.8, repeat: Infinity } : {}}
                          className="text-xl leading-none"
                        >{hero.daysUntil}</motion.span>
                        <span className="text-[9px] font-bold leading-none mt-0.5">jours</span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* ── 2 cartes secondaires ── */}
              {rest.length > 0 && (
                <div className="flex gap-3 px-1">
                  {rest.slice(0, 2).map((b, i) => {
                    return (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 280, damping: 22 }}
                        onClick={() => setViewingFriend(b)}
                        className="flex-1 cursor-pointer rounded-2xl border border-slate-200 p-3 flex items-center gap-3"
                        style={{ background: 'var(--surface-card)' }}
                      >
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-xl overflow-hidden" style={{ border: `2px solid ${catBorder(b.category)}` }}>
                            {b.photoUrl ? (
                              <img src={b.photoUrl} alt={b.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-black text-lg text-white" style={{ background: getAvatarColor(b.name) }}>
                                {b.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className={`absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded-full text-[8px] font-black shadow-sm ${
                            b.daysUntil === 0 ? 'bg-green-100 text-green-600' :
                            b.daysUntil <= 7 ? 'bg-red-100 text-red-500' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {b.daysUntil === 0 ? '🎂' : `J-${b.daysUntil}`}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black truncate" style={{ color: 'var(--text-1)' }}>{b.name.split(' ')[0]}</p>
                          <p className="text-[10px] font-semibold" style={{ color: 'var(--text-2)' }}>
                            {format(parseISO(b.birthDate), 'd MMM', { locale: fr })} {ZODIAC_EMOJI[b.zodiac] ?? ''}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })() : (
          <div className="bg-slate-50 border border-dashed border-black/60 rounded-3xl p-10 text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Star className="text-slate-300" size={32} />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-600">Aucun anniversaire</p>
              <p className="text-xs text-slate-500">Commence par ajouter un ami à ta collection</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onRequestAddFriend?.()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-black text-sm"
              style={{ background: '#FF4B4B', boxShadow: '0 4px 0 #CC2E2E' }}
            >
              <Plus size={16} strokeWidth={3} />
              Ajouter un ami
            </motion.button>
          </div>
        )}

      {/* ── Célébrité du jour ── */}
      {celebOfDay && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl shrink-0">{celebOfDay.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles size={9} className="text-amber-400 shrink-0" />
                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Né(e) aujourd'hui</span>
              </div>
              <h4 className="font-display font-black text-[13px] leading-tight truncate" style={{ color: 'var(--text-1)' }}>
                {celebOfDay.name}
              </h4>
              <p className="text-[11px] font-medium leading-tight mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>
                {celebOfDay.title}
              </p>
            </div>
            <motion.button
              onClick={() => setCelebExpanded(v => !v)}
              whileTap={{ scale: 0.88 }}
              className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0"
            >
              <motion.div animate={{ rotate: celebExpanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
                <ChevronDown size={14} className="text-amber-500" strokeWidth={2.5} />
              </motion.div>
            </motion.button>
          </div>
          <AnimatePresence initial={false}>
            {celebExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pt-3 mt-3 border-t border-amber-100 space-y-2.5">
                  <p className="text-[12px] text-slate-600 leading-relaxed">{celebOfDay.description}</p>
                  <a
                    href={celebOfDay.wikipedia}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-amber-100 border border-amber-200 rounded-xl px-3 py-1.5 active:scale-95 transition-transform"
                  >
                    <Globe2 size={11} className="text-amber-600" />
                    <span className="text-[11px] font-black text-amber-600">Wikipedia</span>
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      </section>

      {/* ── Friend profile modal (anniversaires à venir) ────── */}
      <FriendProfileModal
        friend={viewingFriend}
        hasAccount={false}
        onClose={() => setViewingFriend(null)}
        onEdit={() => { setSelectedFriend(viewingFriend); setViewingFriend(null); }}
      />

      <AnimatePresence>
        {birthdayPicker && (
          <div className="fixed inset-0 z-[190] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBirthdayPicker(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 36 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative w-full max-w-md rounded-t-[32px] px-5 pt-4 pb-6 space-y-4"
              style={{ background: 'var(--surface-card)', boxShadow: '0 -18px 60px rgba(15,23,42,0.18)' }}
            >
              <div className="w-12 h-1.5 rounded-full bg-slate-200 mx-auto" />

              <div className="text-center space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500">Anniversaires</p>
                <h3 className="font-black text-lg text-slate-900">{birthdayPicker.dayLabel}</h3>
                <p className="text-sm font-semibold text-slate-500">
                  {birthdayPicker.birthdays.length} profil{birthdayPicker.birthdays.length > 1 ? 's' : ''} à consulter
                </p>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {birthdayPicker.birthdays.map(friend => {
                  const categoryIcon = friend.category === 'famille'
                    ? <Heart size={13} className="text-rose-500" strokeWidth={2.6} />
                    : friend.category === 'ami'
                    ? <Users size={13} className="text-sky-500" strokeWidth={2.6} />
                    : <UserCircle size={13} className="text-slate-400" strokeWidth={2.6} />;

                  return (
                    <motion.button
                      key={friend.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setBirthdayPicker(null);
                        setViewingFriend(friend);
                      }}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-3 bg-white flex items-center gap-3 text-left shadow-sm"
                    >
                      <div className="relative shrink-0">
                        {friend.photoUrl ? (
                          <img src={friend.photoUrl} alt={friend.name} className="w-12 h-12 rounded-2xl object-cover border border-black/10" />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white"
                            style={{ background: getAvatarColor(friend.name) }}
                          >
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                          {categoryIcon}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-black text-sm text-slate-900 truncate">{friend.name}</p>
                        <p className="text-xs font-semibold text-slate-500 truncate">{formatZodiac(friend.zodiac)}</p>
                      </div>

                      <div className="shrink-0 px-3 py-2 rounded-xl bg-rose-50 text-rose-500 text-[11px] font-black">
                        Voir
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <section className="space-y-4">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-4 pt-4 pb-3">
          {(() => {
            const monthLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
            const monthZodiacs = ['♑','♒','♓','♈','♉','♊','♋','♌','♍','♎','♏','♐'];
            const uniqueBirthdays = birthdays.filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i);
            const counts = Array.from({ length: 12 }, (_, m) =>
              uniqueBirthdays.filter(b => parseISO(b.birthDate).getMonth() === m).length
            );
            const max = Math.max(...counts, 1);
            return (
              <>
                <div className="mb-3 pb-3 border-b border-slate-100 flex items-center justify-center gap-2">
                  <span className="text-[11px] font-black font-display text-slate-500 uppercase tracking-widest">
                    Total {today.getFullYear()}
                  </span>
                  <span className="text-base">🎂</span>
                  <span className="text-[11px] font-black font-display text-slate-900">
                    {birthdays.length} anniversaire{birthdays.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-end justify-between gap-1.5" style={{ height: 64 }}>
                  {counts.map((count, m) => {
                    const isCurrentMonth = m === today.getMonth();
                    const barHeightPx = count === 0
                      ? 4
                      : Math.max(12, Math.round((count / max) * 52));
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

              </>
            );
          })()}
        </div>
      </section>

      {/* Edit friend modal */}
      <FriendEditModal
        friend={selectedFriend}
        onClose={() => setSelectedFriend(null)}
        onSave={onUpdateBirthday ?? (async () => {})}
        onDelete={(b) => { setConfirmDelete(b); setSelectedFriend(null); }}
      />

      {/* Confirm delete */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <p className="text-center font-black text-slate-900 text-base leading-snug">
                Es-tu sûr de vouloir supprimer<br />
                <span className="text-rose-500">{confirmDelete.name}</span> ?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => { onDeleteBirthday?.(confirmDelete.id); setConfirmDelete(null); }}
                  className="flex-1 py-3 rounded-2xl font-black text-sm text-white"
                  style={{ background: '#FF4B4B', boxShadow: '0 4px 0 #c0392b' }}
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
