import { useState, useEffect, useRef } from 'react';
import { ZODIAC_EMOJI, formatZodiac } from '../utils/zodiac';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ChevronDown, X, Camera, ImageIcon, Phone, Instagram, Twitter, Facebook, Plus, Trash2, Gift, Save, Lightbulb, Users, Trophy, Search } from 'lucide-react';
import { FriendEditModal } from '../components/FriendEditModal';
import { FriendProfileModal } from '../components/FriendProfileModal';
import confetti from 'canvas-confetti';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage, db } from '../firebase';
import { collection, getDocs, query, orderBy, where, documentId } from 'firebase/firestore';
import { Birthday, UserProfile } from '../types';
import { getZodiacSign } from '../utils/gameLogic';
import { CELEB_BIRTHDAYS } from '../data/celebBirthdays';
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

export function Calendar({ birthdays, user, onAddBirthday, onUpdateBirthday, onDeleteBirthday, onFirstVisit, openAddModal, onAddModalOpened }: {
  birthdays: Birthday[],
  user?: UserProfile | null,
  onAddBirthday?: (b: Birthday) => void,
  onUpdateBirthday?: (id: string, updates: Partial<Birthday>) => Promise<void>,
  onDeleteBirthday?: (id: string) => void,
  onFirstVisit?: () => void,
  openAddModal?: boolean,
  onAddModalOpened?: () => void,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (openAddModal) {
      setShowAddModal(true);
      onAddModalOpened?.();
    }
  }, [openAddModal]);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoPreview, setNewPhotoPreview] = useState('');
  const [newSocials, setNewSocials] = useState({ instagram: '', snapchat: '', tiktok: '', twitter: '', facebook: '' });
  const [showCake, setShowCake] = useState(true);
  const [showSocials, setShowSocials] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [newWishlist, setNewWishlist] = useState<string[]>([]);
  const [newWishInput, setNewWishInput] = useState('');
  const [toastName, setToastName] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Birthday | null>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Edit friend modal state
  const [editingFriend, setEditingFriend] = useState<Birthday | null>(null);

  // Amis / leaderboard state
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [friendsWithAccount, setFriendsWithAccount] = useState<Set<string>>(new Set());
  const [viewingFriend, setViewingFriend] = useState<Birthday | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    onFirstVisit?.();
  }, []);

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
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) batches.push(ids.slice(i, i + 30));
    Promise.all(
      batches.map(batch => getDocs(query(collection(db, 'users'), where(documentId(), 'in', batch))))
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

  const today = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getBirthdaysForDay = (day: Date) => {
    return birthdays.filter(b => {
      const bDate = parseISO(b.birthDate);
      return bDate.getDate() === day.getDate() && bDate.getMonth() === day.getMonth();
    });
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
        // Show preview immediately using blob URL
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
    console.log('[AddFriend] Déclenchement — newName:', newName, '| newDate:', newDate, '| onAddBirthday:', !!onAddBirthday, '| newPhotoUrl length:', newPhotoUrl.length);
    if (!newName || !newDate || !onAddBirthday) {
      console.warn('[AddFriend] Bloqué par la garde —', { newName: !!newName, newDate: !!newDate, onAddBirthday: !!onAddBirthday });
      return;
    }

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

    console.log('[AddFriend] Objet Birthday complet:', {
      ...birthday,
      photoUrl: birthday.photoUrl ? `[base64 ${(birthday.photoUrl.length * 0.75 / 1024).toFixed(1)} Ko]` : undefined,
    });

    try {
      onAddBirthday(birthday);
      console.log('[AddFriend] onAddBirthday appelé avec succès');
    } catch (err) {
      console.error('[AddFriend] Erreur lors de onAddBirthday:', err);
    }

    const addedName = newName;
    setNewName('');
    setNewDate('');
    setNewPhone('');
    setNewPhotoUrl('');
    setNewPhotoPreview('');
    setNewSocials({ instagram: '', snapchat: '', tiktok: '', twitter: '', facebook: '' });
    setNewWishlist([]);
    setNewWishInput('');
    setShowWishlist(false);
    setShowPhotoMenu(false);
    setShowAddModal(false);

    // Célébration
    setToastName(addedName);
    setTimeout(() => setToastName(null), 5000);

    const colors = ['#FF4B4B', '#58CC02', '#ffffff', '#FEF08A'];
    const base = { particleCount: 60, angle: 90, spread: 160, colors, scalar: 1.4, startVelocity: 35, ticks: 250, origin: { x: 0.5, y: 0 } };
    confetti(base);
    setTimeout(() => confetti({ ...base, particleCount: 40, startVelocity: 28 }), 350);
  };

  const openEditFriend = (b: Birthday) => {
    setEditingFriend(b);
  };

  const handleDayClick = (day: Date) => {
    setNewDate(format(day, 'yyyy-MM-dd'));
    setShowAddModal(true);
  };

  const todayCeleb = CELEB_BIRTHDAYS.find(c => c.date === format(new Date(), 'MM-dd'));

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

      <div className="bg-[#FEFFEE] rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.18),0_8px_20px_rgba(0,0,0,0.08)] border border-black/40 overflow-hidden relative">
        <div className="bg-rose-500 px-3 py-2.5 text-center border-b-[0.5px] border-rose-600/30">
          <h4 className="text-white font-black uppercase tracking-widest text-[13px]">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
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
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Événements du mois</h3>
        <div className="space-y-3">
          {birthdays
            .filter(b => parseISO(b.birthDate).getMonth() === currentMonth.getMonth())
            .sort((a, b) => parseISO(a.birthDate).getDate() - parseISO(b.birthDate).getDate())
            .map(b => (
              <div key={b.id} onClick={() => openEditFriend(b)} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-black/60 shadow-sm cursor-pointer hover:border-rose-300 transition-colors">
                {b.photoUrl
                  ? <img src={b.photoUrl} alt={b.name} className="w-10 h-10 rounded-full object-cover border border-black/20 shrink-0" />
                  : <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 font-black text-sm border border-rose-200 shrink-0">
                      {b.name.charAt(0)}
                    </div>
                }
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-sm">{b.name}</p>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">{formatZodiac(b.zodiac)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(b); }}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-rose-100 flex items-center justify-center transition-colors shrink-0"
                >
                  <X size={14} className="text-slate-400 hover:text-rose-500" />
                </button>
              </div>
            ))}
        </div>
      </div>

      {todayCeleb && (
        <div className="bg-white border border-black/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Lightbulb size={16} className="text-yellow-400 fill-yellow-300" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Savais-tu ?</p>
            </div>
            <span className="text-[9px] font-black text-rose-400 uppercase tracking-wide bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full shrink-0">
              Aujourd'hui c'est son anniversaire
            </span>
          </div>
          <p className="font-black text-slate-900 text-sm leading-tight">{todayCeleb.name}</p>
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wide mt-0.5 mb-2">{todayCeleb.title}</p>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">{todayCeleb.description}</p>
          <a
            href={todayCeleb.wikipedia}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-slate-50 border border-black/60 rounded-xl px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <span>📖</span> Voir sa page Wikipédia
          </a>
        </div>
      )}

      {/* ── Voir mes amis ───────────────────────────────────────── */}
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
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{birthdays.length}</span>
        </motion.button>
      </div>

      {/* ── Stats Total Amis / Cartes ────────────────────────────── */}
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

      {/* ── Friends list modal ───────────────────────────────────── */}
      <AnimatePresence>
        {showFriendsModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFriendsModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-center relative px-8 pt-8 pb-4 shrink-0">
                <div className="text-center">
                  <h3 className="font-display text-xl font-black text-slate-900">Mes amis</h3>
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mt-0.5">
                    {birthdays.length} contact{birthdays.length !== 1 ? 's' : ''}
                    {friendsWithAccount.size > 0 && ` · ${friendsWithAccount.size} sur l'appli`}
                  </p>
                </div>
                <button onClick={() => setShowFriendsModal(false)} className="absolute right-8 text-slate-500 hover:text-slate-700"><X size={24} /></button>
              </div>
              <div className="px-8 pb-3 shrink-0">
                <div className="flex items-center gap-2 bg-slate-50 border border-black/60 rounded-2xl px-4 py-2.5">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input type="text" value={friendSearch} onChange={e => setFriendSearch(e.target.value)} placeholder="Rechercher un ami..." className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none" />
                </div>
              </div>
              <div className="overflow-y-auto px-8 pb-8 space-y-2">
                {birthdays.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <span className="text-4xl">👥</span>
                    <p className="font-bold text-slate-400 text-sm">Aucun ami pour l'instant</p>
                  </div>
                ) : (() => {
                  const filtered = [...birthdays].sort((a, b) => a.name.localeCompare(b.name)).filter(b => b.name.toLowerCase().includes(friendSearch.toLowerCase()));
                  if (filtered.length === 0) return <div className="flex flex-col items-center justify-center py-10 gap-2 text-center"><span className="text-3xl">🔍</span><p className="font-bold text-slate-400 text-sm">Aucun résultat</p></div>;
                  return filtered.map((b, i) => {
                    const hasAccount = friendsWithAccount.has(b.id);
                    const socialIcons: Record<string, string> = { instagram: '📸', snapchat: '👻', tiktok: '🎵', twitter: '🐦', facebook: '👤' };
                    const filledSocials = b.socials ? Object.entries(b.socials).filter(([, v]) => v) : [];
                    return (
                      <motion.div key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => { setViewingFriend(b); setShowFriendsModal(false); }} className="flex items-center gap-3 p-3 bg-slate-50 border border-black/60 rounded-2xl cursor-pointer hover:border-sky-400 transition-colors active:scale-[0.98]">
                        <div className="relative shrink-0">
                          <img src={b.photoUrl || `https://picsum.photos/seed/${b.id}/80/80`} alt={b.name} className="w-11 h-11 rounded-xl object-cover border border-black/10" />
                          {hasAccount && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center"><span className="text-[7px]">✓</span></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-black text-slate-900 text-sm truncate">{b.name}</p>
                            {hasAccount && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">🎮</span>}
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium">{format(parseISO(b.birthDate), 'd MMM', { locale: fr })} · {formatZodiac(b.zodiac)}</p>
                          {filledSocials.length > 0 && <div className="flex gap-1 mt-0.5">{filledSocials.map(([key]) => <span key={key} className="text-[11px]">{socialIcons[key]}</span>)}</div>}
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

      {/* Friend profile modal */}
      <FriendProfileModal
        friend={viewingFriend}
        hasAccount={viewingFriend ? friendsWithAccount.has(viewingFriend.id) : false}
        onClose={() => setViewingFriend(null)}
        onEdit={() => { setEditingFriend(viewingFriend); setViewingFriend(null); }}
      />

      {/* Leaderboard */}
      <AnimatePresence>
        {showLeaderboard && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLeaderboard(false)} className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ type: 'spring', damping: 28, stiffness: 340 }} className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[101] max-w-md mx-auto bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden" style={{ maxHeight: '75vh' }}>
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2"><Trophy size={18} style={{ color: '#FF4B4B' }} /><h2 className="font-display text-lg font-black text-slate-900">Classement Amis</h2></div>
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider ml-7">Classement global</span>
                </div>
                <button onClick={() => setShowLeaderboard(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X size={16} className="text-slate-500" /></button>
              </div>
              <div className="overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: 'calc(75vh - 90px)' }}>
                {leaderboardLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-rose-500" /><p className="text-sm font-bold text-slate-400">Chargement...</p></div>
                ) : leaderboard.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center"><span className="text-4xl">🎂</span><p className="font-bold text-slate-500 text-sm">Aucun joueur trouvé.</p></div>
                ) : leaderboard.map((friend, i) => {
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                  return (
                    <motion.div key={friend.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3 p-3 rounded-2xl border" style={{ borderColor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#f1f5f9', background: i < 3 ? 'rgba(255,75,75,0.04)' : 'white' }}>
                      <div className="w-7 text-center shrink-0">{medal ? <span className="text-xl">{medal}</span> : <span className="text-xs font-black text-slate-400">#{i + 1}</span>}</div>
                      {friend.photoUrl ? <img src={friend.photoUrl} alt={friend.name} className="w-11 h-11 rounded-xl object-cover shrink-0 border border-black/10" /> : <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0" style={{ background: '#FF4B4B' }}>{friend.name.charAt(0).toUpperCase()}</div>}
                      <div className="flex-1 min-w-0"><p className="font-black text-slate-900 text-sm truncate">{friend.name}</p><p className="text-[11px] font-bold text-slate-600">Niveau {friend.level}</p></div>
                      <div className="text-right shrink-0"><p className="font-black text-xs" style={{ color: '#FF4B4B', fontFamily: "'Press Start 2P', monospace" }}>{friend.xp}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">XP</p></div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-center relative px-8 pt-8 pb-4 shrink-0">
                <h3 className="font-display text-xl font-black text-slate-900">Ajouter un ami</h3>
                <button onClick={() => setShowAddModal(false)} className="absolute right-8 text-slate-500 hover:text-slate-700">
                  <X size={24} />
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
                          <button
                            type="button"
                            onClick={() => { cameraInputRef.current?.click(); setShowPhotoMenu(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-black/60 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <Camera size={13} /> Appareil photo
                          </button>
                          <button
                            type="button"
                            onClick={() => { fileInputRef.current?.click(); setShowPhotoMenu(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-black/60 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                          >
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
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ex: Marie"
                    className="w-full bg-slate-50 border border-black/60 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="block text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Date de naissance</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full bg-slate-50 border border-black/60 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                {/* Téléphone */}
                <div className="space-y-1">
                  <label className="flex justify-center items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <Phone size={11} />Téléphone <span className="text-slate-400 normal-case font-medium">(optionnel)</span>
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="Ex: +33 6 12 34 56 78"
                    className="w-full bg-slate-50 border border-black/60 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                {/* Réseaux sociaux — accordéon */}
                <div className="border border-black/60 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowSocials(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Réseaux sociaux <span className="text-slate-400 normal-case font-medium">(optionnel)</span></span>
                    <motion.span animate={{ rotate: showSocials ? 180 : 0 }} transition={{ duration: 0.25 }}>
                      <ChevronDown size={16} className="text-slate-400" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {showSocials && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 p-3 bg-white">
                          {([
                            { key: 'instagram', icon: <Instagram size={15} className="text-pink-500" />, placeholder: '@pseudo' },
                            { key: 'snapchat',  icon: <span className="text-[14px]">👻</span>,            placeholder: '@pseudo' },
                            { key: 'tiktok',    icon: <span className="text-[14px]">🎵</span>,            placeholder: '@pseudo' },
                            { key: 'twitter',   icon: <Twitter size={15} className="text-sky-500" />,     placeholder: '@pseudo' },
                            { key: 'facebook',  icon: <Facebook size={15} className="text-blue-600" />,   placeholder: 'Nom complet' },
                          ] as const).map(({ key, icon, placeholder }) => (
                            <div key={key} className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-slate-50 border border-black/60 rounded-xl flex items-center justify-center shrink-0">
                                {icon}
                              </div>
                              <input
                                type="text"
                                value={newSocials[key]}
                                onChange={e => setNewSocials(s => ({ ...s, [key]: e.target.value }))}
                                placeholder={placeholder}
                                className="flex-1 bg-slate-50 border border-black/60 rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                              />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Wishlist — accordéon */}
                <div className="border border-black/60 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowWishlist(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      🎁 Wishlist <span className="text-slate-400 normal-case font-medium">(optionnel)</span>
                      {newWishlist.length > 0 && (
                        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[9px] font-black">
                          {newWishlist.length}
                        </span>
                      )}
                    </span>
                    <motion.span animate={{ rotate: showWishlist ? 180 : 0 }} transition={{ duration: 0.25 }}>
                      <ChevronDown size={16} className="text-slate-400" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {showWishlist && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 p-3 bg-white">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newWishInput}
                              onChange={e => setNewWishInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && newWishInput.trim()) {
                                  setNewWishlist(w => [...w, newWishInput.trim()]);
                                  setNewWishInput('');
                                }
                              }}
                              placeholder="Ex: Roman, parfum, jeu vidéo..."
                              className="flex-1 bg-slate-50 border border-black/60 rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
                            />
                            <button
                              type="button"
                              disabled={!newWishInput.trim()}
                              onClick={() => {
                                if (!newWishInput.trim()) return;
                                setNewWishlist(w => [...w, newWishInput.trim()]);
                                setNewWishInput('');
                              }}
                              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                              style={{ background: '#FF4B4B' }}
                            >
                              <Plus size={18} className="text-white" strokeWidth={3} />
                            </button>
                          </div>
                          {newWishlist.length > 0 && (
                            <ul className="space-y-1.5">
                              {newWishlist.map((wish, i) => (
                                <li key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                  <span className="text-sm text-slate-800 flex-1">🎁 {wish}</span>
                                  <button
                                    type="button"
                                    onClick={() => setNewWishlist(w => w.filter((_, j) => j !== i))}
                                    className="text-slate-400 hover:text-rose-500 transition-colors"
                                  >
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
                <button
                  type="button"
                  onClick={handleAddFriend}
                  disabled={!newName || !newDate || photoUploading}
                  className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-sky-100 hover:bg-sky-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  AJOUTER L'AMI
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FriendEditModal
        friend={editingFriend}
        onClose={() => setEditingFriend(null)}
        onSave={onUpdateBirthday ?? (async () => {})}
        onDelete={(b) => setConfirmDelete(b)}
      />

      {/* Modale confirmation suppression */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteBirthday?.(confirmDelete.id);
                    setConfirmDelete(null);
                  }}
                  className="flex-1 py-3 rounded-2xl font-black text-sm text-white transition-all active:translate-y-[2px]"
                  style={{ background: '#FF4B4B', boxShadow: '0 4px 0 #c0392b' }}
                >
                  Supprimer
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
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-[200] mx-auto max-w-sm bg-white rounded-3xl px-6 py-6"
            style={{ border: '2px solid #FF4B4B', boxShadow: '0 6px 0 #CC2E2E, 0 12px 40px rgba(255,75,75,0.18)' }}
          >
            <p className="text-2xl text-center mb-1">🎉</p>
            <p className="text-base font-black font-display text-slate-900 text-center leading-snug">
              Bravo ! Tu as ajouté<br />
              <span style={{ color: '#FF4B4B' }}>{toastName}</span> à ta collection !
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
