import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { ZODIAC_EMOJI, formatZodiac } from '../utils/zodiac';
import { Star, X, ChevronLeft, ChevronRight, Camera, ImageIcon, Phone, Instagram, Twitter, Facebook, Plus, Trash2, ChevronDown, Sparkles, Globe2 } from 'lucide-react';
import { Birthday, UserProfile } from '../types';
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { auth, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import confetti from 'canvas-confetti';
import { FriendEditModal } from '../components/FriendEditModal';
import { FriendProfileModal } from '../components/FriendProfileModal';
import { checkUnlockedCards, getZodiacSign } from '../utils/gameLogic';
import { CELEB_BIRTHDAYS } from '../data/celebBirthdays';


export function Dashboard({ birthdays, user, onAddBirthday, onUpdateBirthday, onDeleteBirthday }: {
  birthdays: Birthday[],
  user: UserProfile | null,
  onAddBirthday?: (b: Birthday) => void,
  onUpdateBirthday?: (id: string, updates: Partial<Birthday>) => Promise<void>,
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

  // Add friend modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoPreview, setNewPhotoPreview] = useState('');
  const [newSocials, setNewSocials] = useState({ instagram: '', snapchat: '', tiktok: '', twitter: '', facebook: '' });
  const [showSocials, setShowSocials] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [newWishlist, setNewWishlist] = useState<string[]>([]);
  const [newWishInput, setNewWishInput] = useState('');
  const [toastName, setToastName] = useState<string | null>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [celebExpanded, setCelebExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Swipe touch tracking
  const touchStartX = useRef<number | null>(null);
  const [slideDirection, setSlideDirection] = useState(1); // 1 = next (→left), -1 = prev (→right)

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

  const handleDayClick = (day: Date) => {
    setNewDate(format(day, 'yyyy-MM-dd'));
    setShowAddModal(true);
  };

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 600;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (!blob) { setPhotoUploading(false); return; }
          const preview = URL.createObjectURL(blob);
          setNewPhotoPreview(preview);
          try {
            const uid = auth.currentUser?.uid;
            if (!uid) throw new Error('Non connecté');
            const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`;
            const storageRef = ref(storage, `users/${uid}/friends/${filename}`);
            await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
            const downloadUrl = await getDownloadURL(storageRef);
            setNewPhotoUrl(downloadUrl);
          } catch (err) {
            console.error('[Photo] Upload failed:', err instanceof Error ? err.message : err);
            setNewPhotoPreview('');
            setNewPhotoUrl('');
          } finally {
            setPhotoUploading(false);
          }
        }, 'image/jpeg', 0.8);
      };
      img.onerror = () => setPhotoUploading(false);
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => setPhotoUploading(false);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddFriend = () => {
    if (!newName || !newDate || !onAddBirthday) return;
    const birthDate = parseISO(newDate);
    const socials = Object.fromEntries(
      Object.entries(newSocials).filter(([, v]) => v.trim() !== '')
    ) as Birthday['socials'];
    const birthday: Birthday = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      birthDate: newDate,
      zodiac: getZodiacSign(birthDate),
      addedAt: new Date().toISOString(),
      ...(newPhotoUrl && { photoUrl: newPhotoUrl }),
      ...(newPhone && { phone: newPhone }),
      ...(Object.keys(socials ?? {}).length > 0 && { socials }),
      ...(newWishlist.length > 0 && { wishlist: newWishlist }),
    };
    onAddBirthday(birthday);
    const addedName = newName;
    setNewName(''); setNewDate(''); setNewPhone(''); setNewPhotoUrl('');
    setNewPhotoPreview(''); setNewSocials({ instagram: '', snapchat: '', tiktok: '', twitter: '', facebook: '' });
    setNewWishlist([]); setNewWishInput(''); setShowWishlist(false);
    setShowPhotoMenu(false); setShowAddModal(false);
    setToastName(addedName);
    setTimeout(() => setToastName(null), 5000);
    const colors = ['#FF4B4B', '#58CC02', '#ffffff', '#FEF08A'];
    const base = { particleCount: 60, angle: 90, spread: 160, colors, scalar: 1.4, startVelocity: 35, ticks: 250, origin: { x: 0.5, y: 0 } };
    confetti(base);
    setTimeout(() => confetti({ ...base, particleCount: 40, startVelocity: 28 }), 350);
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

  return (
    <div className="p-6 space-y-8">

      <section className="space-y-4 relative">

        <div className="relative pt-4">
          <div className="absolute top-0 left-0 right-0 flex justify-around px-8 z-20">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-3 h-6 bg-slate-700 rounded-full border-2 border-slate-800 shadow-sm" />
            ))}
          </div>

          <div
            className="bg-[#FEFFEE] rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.18),0_8px_20px_rgba(0,0,0,0.08)] border border-black/40 overflow-hidden relative"
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

            <div className="p-3 bg-[#FEFFEE]">
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
                      onClick={() => handleDayClick(day)}
                      whileHover={{ scale: 1.15, zIndex: 10 }}
                      whileTap={{ scale: 0.95 }}
                      animate={hasBirthdays && !isToday && showCake ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                      transition={hasBirthdays && !isToday && showCake ? { duration: 0.5, ease: 'easeInOut' } : {}}
                      className={`aspect-square rounded-full flex flex-col items-center justify-center font-black relative cursor-pointer ${
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
              </motion.div>
              </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {/* ── Le saviez-vous ? ─── remplace le titre "Prochains anniversaires" */}
        {upcoming.length > 0 ? (
          <div className="flex justify-between gap-3 px-2">
            {upcoming.slice(0, 3).map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, type: 'spring', stiffness: 280, damping: 22 }}
                onClick={() => setViewingFriend(b)}
                className="flex flex-col items-center gap-1.5 cursor-pointer flex-1"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                    <img
                      src={b.photoUrl || `https://picsum.photos/seed/${b.id}/100/100`}
                      alt={b.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <motion.div
                    animate={b.daysUntil === 0 ? { scale: [1, 1.1, 1] } : {}}
                    transition={b.daysUntil === 0 ? { duration: 1.2, repeat: Infinity } : {}}
                    className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black shadow-sm ${
                      b.daysUntil === 0 ? 'bg-green-100 text-green-600' :
                      b.daysUntil <= 7 ? 'bg-red-100 text-red-500' :
                      'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {b.daysUntil === 0 ? '🎂' : `J-${b.daysUntil}`}
                  </motion.div>
                </div>
                <span className="text-[11px] font-black text-slate-700 text-center leading-tight">
                  {format(parseISO(b.birthDate), 'd MMM', { locale: fr })} {ZODIAC_EMOJI[b.zodiac] ?? ''}
                </span>
                <span className="text-xs font-bold text-slate-800 truncate max-w-[72px] text-center">
                  {b.name.split(' ')[0]}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
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
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-black text-sm"
              style={{ background: '#FF4B4B', boxShadow: '0 4px 0 #CC2E2E' }}
            >
              <Plus size={16} strokeWidth={3} />
              Ajouter un ami
            </motion.button>
          </div>
        )}

        {/* ── Le saviez-vous ? ─── sous les profils */}
        {celebOfDay && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 overflow-hidden shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl shrink-0">{celebOfDay.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles size={9} className="text-amber-400 shrink-0" />
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Né(e) aujourd'hui</span>
                </div>
                <h4 className="font-display font-black text-slate-800 text-[13px] leading-tight truncate">
                  {celebOfDay.name}
                </h4>
                <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5 truncate">
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
            const totalYear = counts.reduce((s, c) => s + c, 0);
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

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="relative w-full bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh]"
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>
              <div className="flex items-center justify-between px-6 py-3 shrink-0">
                <h3 className="text-xl font-black text-slate-900">Ajouter un ami</h3>
                <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto px-8 pb-2 pr-7">
                {/* Photo */}
                <div className="space-y-2">
                  <label className="block text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Photo <span className="text-slate-400 normal-case font-medium">(optionnel)</span></label>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      onClick={() => setShowPhotoMenu(v => !v)}
                      className="w-16 h-16 rounded-full bg-slate-50 border border-black/60 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors overflow-hidden"
                    >
                      {newPhotoPreview
                        ? <img src={newPhotoPreview} alt="preview" className="w-full h-full object-cover" />
                        : <Camera size={20} className="text-slate-400" />
                      }
                    </div>
                    <AnimatePresence>
                      {showPhotoMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.95 }}
                          transition={{ duration: 0.18 }}
                          className="flex gap-2"
                        >
                          <button type="button" onClick={() => { cameraInputRef.current?.click(); setShowPhotoMenu(false); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-black/60 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors">
                            <Camera size={13} /> Appareil photo
                          </button>
                          <button type="button" onClick={() => { fileInputRef.current?.click(); setShowPhotoMenu(false); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-black/60 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors">
                            <ImageIcon size={13} /> Galerie
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoFile} className="hidden" />
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoFile} className="hidden" />
                  </div>
                </div>

                {/* Nom */}
                <div className="space-y-1">
                  <label className="block text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Nom</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Marie" className="w-full bg-slate-50 border border-black/60 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors" />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="block text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Date de naissance</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-slate-50 border border-black/60 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-sky-500 transition-colors" />
                </div>

                {/* Téléphone */}
                <div className="space-y-1">
                  <label className="flex justify-center items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <Phone size={11} /> Téléphone <span className="text-slate-400 normal-case font-medium">(optionnel)</span>
                  </label>
                  <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Ex: +33 6 12 34 56 78" className="w-full bg-slate-50 border border-black/60 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors" />
                </div>

                {/* Réseaux sociaux */}
                <div className="border border-black/60 rounded-2xl overflow-hidden">
                  <button type="button" onClick={() => setShowSocials(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Réseaux sociaux <span className="text-slate-400 normal-case font-medium">(optionnel)</span></span>
                    <motion.span animate={{ rotate: showSocials ? 180 : 0 }} transition={{ duration: 0.25 }}>
                      <ChevronDown size={16} className="text-slate-400" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {showSocials && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: 'easeInOut' }} className="overflow-hidden">
                        <div className="space-y-2 p-3 bg-white">
                          {([
                            { key: 'instagram', icon: <Instagram size={15} className="text-pink-500" />, placeholder: '@pseudo' },
                            { key: 'snapchat',  icon: <span className="text-[14px]">👻</span>,            placeholder: '@pseudo' },
                            { key: 'tiktok',    icon: <span className="text-[14px]">🎵</span>,            placeholder: '@pseudo' },
                            { key: 'twitter',   icon: <Twitter size={15} className="text-sky-500" />,     placeholder: '@pseudo' },
                            { key: 'facebook',  icon: <Facebook size={15} className="text-blue-600" />,   placeholder: 'Nom complet' },
                          ] as const).map(({ key, icon, placeholder }) => (
                            <div key={key} className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-slate-50 border border-black/60 rounded-xl flex items-center justify-center shrink-0">{icon}</div>
                              <input type="text" value={newSocials[key]} onChange={e => setNewSocials(s => ({ ...s, [key]: e.target.value }))} placeholder={placeholder} className="flex-1 bg-slate-50 border border-black/60 rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors" />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Wishlist */}
                <div className="border border-black/60 rounded-2xl overflow-hidden">
                  <button type="button" onClick={() => setShowWishlist(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      🎁 Wishlist <span className="text-slate-400 normal-case font-medium">(optionnel)</span>
                      {newWishlist.length > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[9px] font-black">{newWishlist.length}</span>}
                    </span>
                    <motion.span animate={{ rotate: showWishlist ? 180 : 0 }} transition={{ duration: 0.25 }}>
                      <ChevronDown size={16} className="text-slate-400" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {showWishlist && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: 'easeInOut' }} className="overflow-hidden">
                        <div className="space-y-3 p-3 bg-white">
                          <div className="flex gap-2">
                            <input type="text" value={newWishInput} onChange={e => setNewWishInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newWishInput.trim()) { setNewWishlist(w => [...w, newWishInput.trim()]); setNewWishInput(''); } }} placeholder="Ex: Roman, parfum..." className="flex-1 bg-slate-50 border border-black/60 rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 transition-colors" />
                            <button type="button" disabled={!newWishInput.trim()} onClick={() => { if (!newWishInput.trim()) return; setNewWishlist(w => [...w, newWishInput.trim()]); setNewWishInput(''); }} className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity" style={{ background: '#FF4B4B' }}>
                              <Plus size={18} className="text-white" strokeWidth={3} />
                            </button>
                          </div>
                          {newWishlist.length > 0 && (
                            <ul className="space-y-1.5">
                              {newWishlist.map((wish, i) => (
                                <li key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                  <span className="text-sm text-slate-800 flex-1">🎁 {wish}</span>
                                  <button type="button" onClick={() => setNewWishlist(w => w.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500 transition-colors">
                                    <Trash2 size={14} />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="px-8 py-6 shrink-0">
                <button type="button" onClick={handleAddFriend} disabled={!newName || !newDate || photoUploading} className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-sky-100 hover:bg-sky-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  AJOUTER L'AMI
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast célébration */}
      <AnimatePresence>
        {toastName && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed bottom-28 inset-x-4 z-[200] mx-auto max-w-sm bg-white rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{ border: '1.5px solid #FF4B4B', boxShadow: '0 4px 0 #CC2E2E, 0 12px 40px rgba(255,75,75,0.15)' }}
          >
            <span className="text-2xl shrink-0">🎉</span>
            <p className="text-sm font-black text-slate-900 leading-snug">
              Bravo ! <span style={{ color: '#FF4B4B' }}>{toastName}</span> ajouté à ta collection !
            </p>
          </motion.div>
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