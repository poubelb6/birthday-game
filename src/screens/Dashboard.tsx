import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { Star, Calendar as CalendarIcon, X, Trophy, Users, Search } from 'lucide-react';
import { Birthday, UserProfile } from '../types';
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { collection, getDocs, query, orderBy, where, documentId } from 'firebase/firestore';
import { db } from '../firebase';
import { FriendEditModal } from '../components/FriendEditModal';
import { FriendProfileModal } from '../components/FriendProfileModal';
import { checkUnlockedCards } from '../utils/gameLogic';

export function Dashboard({ birthdays, user, onUpdateBirthday, onDeleteBirthday }: {
  birthdays: Birthday[],
  user: UserProfile | null,
  onUpdateBirthday?: (id: string, updates: Partial<Birthday>) => Promise<void>,
  onDeleteBirthday?: (id: string) => void,
}) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const [showCake, setShowCake] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Birthday | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Birthday | null>(null);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [viewingFriend, setViewingFriend] = useState<Birthday | null>(null);
  const [friendSearch, setFriendSearch] = useState('');
  const [friendsWithAccount, setFriendsWithAccount] = useState<Set<string>>(new Set());

    useEffect(() => {
      const cycle = () => {
        setShowCake(true);
        setTimeout(() => setShowCake(false), 6000);
      };
      cycle();
      const interval = setInterval(cycle, 8000);
      return () => clearInterval(interval);
    }, []);

  useEffect(() => {
    if (birthdays.length === 0) { setFriendsWithAccount(new Set()); return; }
    const ids = birthdays.map(b => b.id).filter(Boolean);
    // Firestore `in` is limited to 30 per query — batch if needed
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) batches.push(ids.slice(i, i + 30));
    Promise.all(
      batches.map(batch =>
        getDocs(query(collection(db, 'users'), where(documentId(), 'in', batch)))
      )
    ).then(snapshots => {
      setFriendsWithAccount(new Set(snapshots.flatMap(s => s.docs.map(d => d.id))));
    }).catch(() => {});
  }, [birthdays.length]);

  const openLeaderboard = async () => {
    setShowLeaderboard(true);
    if (leaderboard.length > 0) return;
    setLeaderboardLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, 'users'), orderBy('xp', 'desc')));
      setLeaderboard(snapshot.docs.map(d => d.data() as UserProfile));
    } catch (e) {
      console.error('Leaderboard error:', e);
    } finally {
      setLeaderboardLoading(false);
    }
  };

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

      <section>
        {upcoming.length > 0 ? (
          <div className="flex justify-center gap-6">
            {upcoming.slice(0, 3).map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedFriend(b)}
                className="flex flex-col items-center gap-2 cursor-pointer"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                    <img
                      src={b.photoUrl || `https://picsum.photos/seed/${b.id}/100/100`}
                      alt={b.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <motion.div
                    animate={b.daysUntil === 0 ? { scale: [1, 1.1, 1] } : {}}
                    transition={b.daysUntil === 0 ? { duration: 1.2, repeat: Infinity } : {}}
                    className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black text-white shadow-sm"
                    style={{
                      background: b.daysUntil === 0 ? '#58CC02' : b.daysUntil <= 7 ? '#FF4B4B' : '#0f172a',
                    }}
                  >
                    {b.daysUntil === 0 ? '🎂' : `J-${b.daysUntil}`}
                  </motion.div>
                </div>
                <span className="text-xs font-bold text-slate-700 truncate max-w-[76px] text-center">
                  {b.name.split(' ')[0]}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-black/60 rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Star className="text-slate-300" size={32} />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-600">Aucun anniversaire</p>
              <p className="text-xs text-slate-500">Scanne un QR code pour commencer ta collection !</p>
            </div>
          </div>
        )}
      </section>

      {/* ── Voir mes amis — compact pill ─────────────────────── */}
      <div className="flex justify-center">
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => { setShowFriendsModal(true); setFriendSearch(''); }}
          className="flex items-center gap-2.5 px-5 py-2.5 bg-white rounded-full border border-slate-200 shadow-sm"
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#FF4B4B' }}>
            <Users size={12} className="text-white" />
          </div>
          <span className="text-sm font-black text-slate-800">Voir mes amis</span>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {birthdays.length}
          </span>
        </motion.button>
      </div>

      {/* ── Friends list modal ───────────────────────────────── */}
      <AnimatePresence>
        {showFriendsModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFriendsModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-center relative px-8 pt-8 pb-4 shrink-0">
                <div className="text-center">
                  <h3 className="font-display text-xl font-black text-slate-900">Mes amis</h3>
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mt-0.5">
                    {birthdays.length} contact{birthdays.length !== 1 ? 's' : ''}
                    {friendsWithAccount.size > 0 && ` · ${friendsWithAccount.size} sur l'appli`}
                  </p>
                </div>
                <button onClick={() => setShowFriendsModal(false)} className="absolute right-8 text-slate-500 hover:text-slate-700">
                  <X size={24} />
                </button>
              </div>

              {/* Search */}
              <div className="px-8 pb-3 shrink-0">
                <div className="flex items-center gap-2 bg-slate-50 border border-black/60 rounded-2xl px-4 py-2.5">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={friendSearch}
                    onChange={e => setFriendSearch(e.target.value)}
                    placeholder="Rechercher un ami..."
                    className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto px-8 pb-8 space-y-2">
                {birthdays.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <span className="text-4xl">👥</span>
                    <p className="font-bold text-slate-400 text-sm">Aucun ami pour l'instant</p>
                    <p className="text-xs text-slate-400">Scanne un QR code pour commencer !</p>
                  </div>
                ) : (() => {
                  const filtered = [...birthdays]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .filter(b => b.name.toLowerCase().includes(friendSearch.toLowerCase()));
                  if (filtered.length === 0) return (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                      <span className="text-3xl">🔍</span>
                      <p className="font-bold text-slate-400 text-sm">Aucun résultat</p>
                    </div>
                  );
                  return filtered.map((b, i) => {
                    const hasAccount = friendsWithAccount.has(b.id);
                    const socialIcons: Record<string, string> = { instagram: '📸', snapchat: '👻', tiktok: '🎵', twitter: '🐦', facebook: '👤' };
                    const filledSocials = b.socials ? Object.entries(b.socials).filter(([, v]) => v) : [];
                    return (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => { setViewingFriend(b); setShowFriendsModal(false); }}
                        className="flex items-center gap-3 p-3 bg-slate-50 border border-black/60 rounded-2xl cursor-pointer hover:border-sky-400 transition-colors active:scale-[0.98]"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={b.photoUrl || `https://picsum.photos/seed/${b.id}/80/80`}
                            alt={b.name}
                            className="w-11 h-11 rounded-xl object-cover border border-black/10"
                          />
                          {hasAccount && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                              <span className="text-[7px]">✓</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-black text-slate-900 text-sm truncate">{b.name}</p>
                            {hasAccount && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">🎮</span>}
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium">
                            {format(parseISO(b.birthDate), 'd MMM', { locale: fr })} · {b.zodiac}
                          </p>
                          {filledSocials.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {filledSocials.map(([key]) => (
                                <span key={key} className="text-[11px]">{socialIcons[key]}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-slate-400 text-lg shrink-0">›</span>
                      </motion.div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Friend profile modal ─────────────────────────────── */}
      <FriendProfileModal
        friend={viewingFriend}
        hasAccount={viewingFriend ? friendsWithAccount.has(viewingFriend.id) : false}
        onClose={() => setViewingFriend(null)}
        onEdit={() => { setSelectedFriend(viewingFriend); setViewingFriend(null); }}
      />

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
          whileTap={{ scale: 0.97 }}
          onClick={openLeaderboard}
          className="bg-rose-300 p-4 rounded-3xl text-white space-y-0.5 shadow-lg shadow-rose-100 cursor-pointer"
          style={{ boxShadow: '0 4px 0 #e57373' }}
        >
          <p className="text-[11px] font-black uppercase tracking-widest text-rose-900/80 text-center">Total Amis</p>
          <p className="text-2xl font-black text-center">{birthdays.length}</p>
          <p className="text-[11px] font-bold text-rose-900/60 uppercase tracking-widest text-center">Voir classement</p>
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

      {/* Leaderboard panel */}
      <AnimatePresence>
        {showLeaderboard && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLeaderboard(false)}
              className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[101] max-w-md mx-auto bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden"
              style={{ maxHeight: '75vh' }}
            >
              {/* Header — même style que les titres de section */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Trophy size={18} style={{ color: '#FF4B4B' }} />
                    <h2 className="font-display text-lg font-black text-slate-900">Classement Amis</h2>
                  </div>
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider ml-7">Classement global</span>
                </div>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
                >
                  <X size={16} className="text-slate-500" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: 'calc(75vh - 90px)' }}>
                {leaderboardLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-rose-500"
                    />
                    <p className="text-sm font-bold text-slate-400">Chargement...</p>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <span className="text-4xl">🎂</span>
                    <p className="font-bold text-slate-500 text-sm">Aucun joueur trouvé.</p>
                    <p className="text-xs text-slate-400">Invite tes amis à rejoindre Birthday Game !</p>
                  </div>
                ) : (
                  leaderboard.map((friend, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                    return (
                      <motion.div
                        key={friend.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-center gap-3 p-3 rounded-2xl border"
                        style={{
                          borderColor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#f1f5f9',
                          background: i < 3 ? 'rgba(255,75,75,0.04)' : 'white',
                        }}
                      >
                        {/* Rank */}
                        <div className="w-7 text-center shrink-0">
                          {medal
                            ? <span className="text-xl">{medal}</span>
                            : <span className="text-xs font-black text-slate-400">#{i + 1}</span>
                          }
                        </div>

                        {/* Avatar */}
                        {friend.photoUrl
                          ? <img src={friend.photoUrl} alt={friend.name} className="w-11 h-11 rounded-xl object-cover shrink-0 border border-black/10" />
                          : <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0" style={{ background: '#FF4B4B' }}>
                              {friend.name.charAt(0).toUpperCase()}
                            </div>
                        }

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-sm truncate">{friend.name}</p>
                          <p className="text-[11px] font-bold text-slate-600">Niveau {friend.level}</p>
                        </div>

                        {/* XP */}
                        <div className="text-right shrink-0">
                          <p className="font-black text-xs" style={{ color: '#FF4B4B', fontFamily: "'Press Start 2P', monospace" }}>
                            {friend.xp}
                          </p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">XP</p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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