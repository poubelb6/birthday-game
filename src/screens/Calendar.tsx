import { useState, useEffect, useRef } from 'react';
import { formatZodiac, getAvatarColor } from '../utils/zodiac';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, X, Camera, ImageIcon, Phone, Instagram, Twitter, Facebook, Plus, Trash2, Search, Trophy, Heart, Users, UserCircle, Pencil, QrCode, BookUser } from 'lucide-react';
import { FriendEditModal } from '../components/FriendEditModal';
import { FriendProfileModal } from '../components/FriendProfileModal';
import confetti from 'canvas-confetti';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage, db } from '../firebase';
import { collection, getDocs, query, orderBy, where, documentId } from 'firebase/firestore';
import { Birthday, UserProfile } from '../types';
import { getZodiacSign } from '../utils/gameLogic';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ZODIAC_EMOJI } from '../utils/zodiac';

type TabId = 'tous' | 'famille' | 'ami' | 'autre';

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function getDaysUntil(birthDate: string): number {
  const today = startOfDay(new Date());
  const bDate = parseISO(birthDate);
  const next = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return differenceInDays(next, today);
}

function getCategoryStyle(category?: string) {
  switch (category) {
    case 'famille':
      return {
        borderColor: '#f43f5e',
        bgTint: 'rgba(244,63,94,0.04)',
        icon: <Heart size={11} className="text-rose-500" strokeWidth={2.5} />,
      };
    case 'ami':
      return {
        borderColor: '#0ea5e9',
        bgTint: 'rgba(14,165,233,0.04)',
        icon: <Users size={11} className="text-sky-500" strokeWidth={2.5} />,
      };
    case 'autre':
      return {
        borderColor: '#94a3b8',
        bgTint: 'rgba(148,163,184,0.04)',
        icon: <UserCircle size={11} className="text-slate-400" strokeWidth={2.5} />,
      };
    default:
      return { borderColor: '#e2e8f0', bgTint: 'var(--surface-card)', icon: null };
  }
}

function DaysUntilBadge({ days }: { days: number }) {
  if (days === 0) {
    return (
      <span className="text-[10px] font-black px-2 py-1 rounded-xl bg-rose-50 text-rose-500 whitespace-nowrap">
        🎂 Aujourd'hui
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="text-[10px] font-black px-2 py-1 rounded-xl bg-amber-50 text-amber-600 whitespace-nowrap">
        J-{days}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-black px-2 py-1 rounded-xl bg-slate-100 text-slate-500 whitespace-nowrap">
      J-{days}
    </span>
  );
}

function FriendRow({
  friend,
  hasAccount,
  onPress,
  onEdit,
  onLongPressStart,
  onLongPressEnd,
  index = 0,
}: {
  friend: Birthday;
  hasAccount: boolean;
  onPress: () => void;
  onEdit: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
  index?: number;
}) {
  const days = getDaysUntil(friend.birthDate);
  const { borderColor, bgTint, icon: categoryIcon } = getCategoryStyle(friend.category);
  const zodiacEmoji = ZODIAC_EMOJI[friend.zodiac] ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.045, type: 'spring', stiffness: 300, damping: 26 }}
      whileTap={{ scale: 0.975 }}
      onPointerDown={onLongPressStart}
      onPointerUp={onLongPressEnd}
      onPointerLeave={onLongPressEnd}
      onClick={onPress}
      className="flex items-center gap-3 rounded-2xl px-3 py-2 cursor-pointer transition-colors overflow-hidden"
      style={{ background: bgTint, border: `2px solid ${borderColor}` }}
    >
      {/* Photo */}
      <div className="relative shrink-0">
        {friend.photoUrl ? (
          <img
            src={friend.photoUrl}
            alt={friend.name}
            className="w-11 h-11 rounded-xl object-cover"
            style={{ border: `3px solid ${borderColor}` }}
          />
        ) : (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg text-white"
            style={{ background: getAvatarColor(friend.name), border: `3px solid ${borderColor}` }}
          >
            {friend.name.charAt(0).toUpperCase()}
          </div>
        )}
        {categoryIcon && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-slate-100 flex items-center justify-center shadow-sm" style={{ background: 'var(--surface-card)' }}>
            {categoryIcon}
          </div>
        )}
        {hasAccount && (
          <div className="absolute -top-1 -left-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[7px] text-white font-black">✓</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-display font-black text-slate-900 text-base truncate leading-tight">{friend.name}</p>
        <p className="font-display text-[12px] text-slate-500 font-semibold mt-0.5 truncate">
          {format(parseISO(friend.birthDate), 'd MMM', { locale: fr })}
          {' · '}
          {zodiacEmoji} {formatZodiac(friend.zodiac)}
        </p>
      </div>

      {/* Badge + Edit */}
      <div className="flex items-center gap-2 shrink-0">
        <DaysUntilBadge days={days} />
        <motion.button
          whileTap={{ scale: 0.82 }}
          whileHover={{ scale: 1.1 }}
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center"
        >
          <Pencil size={12} className="text-slate-400" strokeWidth={2.5} />
        </motion.button>
      </div>
    </motion.div>
  );
}

function EmptyState({ tab, onAdd }: { tab: TabId; onAdd: () => void }) {
  const config: Record<TabId, { emoji: string; title: string; sub: string }> = {
    tous: { emoji: '👥', title: "Aucun ami pour l'instant", sub: "Commence par ajouter quelqu'un !" },
    famille: { emoji: '❤️', title: 'Aucun membre de la famille', sub: 'Classe un ami via le crayon ou appui long.' },
    ami: { emoji: '🤝', title: 'Aucun ami classé', sub: 'Classe un ami via le crayon ou appui long.' },
    autre: { emoji: '👋', title: 'Aucun contact dans "Autre"', sub: 'Classe un ami via le crayon ou appui long.' },
  };
  const { emoji, title, sub } = config[tab];
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <span className="text-5xl">{emoji}</span>
      <p className="font-display font-black text-slate-700 text-lg">{title}</p>
      <p className="font-display text-sm text-slate-400 font-semibold max-w-[200px]">{sub}</p>
      {tab === 'tous' && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAdd}
          className="mt-2 inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-black text-sm"
          style={{ background: '#FF4B4B', boxShadow: '0 4px 0 #CC2E2E' }}
        >
          <Plus size={16} strokeWidth={3} />
          Ajouter un ami
        </motion.button>
      )}
    </div>
  );
}

export function Calendar({
  birthdays,
  user,
  onAddBirthday,
  onUpdateBirthday,
  onDeleteBirthday,
  onFirstVisit,
  openAddModal,
  onAddModalOpened,
}: {
  birthdays: Birthday[];
  user?: UserProfile | null;
  onAddBirthday?: (b: Birthday) => Promise<void> | void;
  onUpdateBirthday?: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onDeleteBirthday?: (id: string) => void;
  onFirstVisit?: () => void;
  openAddModal?: boolean;
  onAddModalOpened?: () => void;
  onOpenScanner?: () => void;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [classifyingFriend, setClassifyingFriend] = useState<Birthday | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add friend form state
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newCategory, setNewCategory] = useState<Birthday['category']>(undefined);
  const [newPhone, setNewPhone] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoPreview, setNewPhotoPreview] = useState('');
  const [newSocials, setNewSocials] = useState({ instagram: '', snapchat: '', tiktok: '', twitter: '', facebook: '' });
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

  const [editingFriend, setEditingFriend] = useState<Birthday | null>(null);
  const [viewingFriend, setViewingFriend] = useState<Birthday | null>(null);
  const [friendsWithAccount, setFriendsWithAccount] = useState<Set<string>>(new Set());

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    if (openAddModal) {
      setShowAddModal(true);
      onAddModalOpened?.();
    }
  }, [openAddModal]);

  useEffect(() => { onFirstVisit?.(); }, []);

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

  const handleImportContact = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
      if (contacts.length > 0) {
        const c = contacts[0];
        if (c.name?.[0]) setNewName(c.name[0]);
        if (c.tel?.[0]) setNewPhone(c.tel[0]);
      }
    } catch { /* annulé par l'utilisateur */ }
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

  const handleAddFriend = async () => {
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
      ...(newCategory && { category: newCategory }),
    };
    await onAddBirthday(birthday);
    const addedName = newName;
    setNewName(''); setNewDate(''); setNewPhone(''); setNewCategory(undefined);
    setNewPhotoUrl(''); setNewPhotoPreview('');
    setNewSocials({ instagram: '', snapchat: '', tiktok: '', twitter: '', facebook: '' });
    setNewWishlist([]); setNewWishInput('');
    setShowWishlist(false); setShowPhotoMenu(false); setShowAddModal(false);
    setToastName(addedName);
    setTimeout(() => setToastName(null), 5000);
    const colors = ['#FF4B4B', '#58CC02', '#ffffff', '#FEF08A'];
    const base = { particleCount: 60, angle: 90, spread: 160, colors, scalar: 1.4, startVelocity: 35, ticks: 250, origin: { x: 0.5, y: 0 } };
    confetti(base);
    setTimeout(() => confetti({ ...base, particleCount: 40, startVelocity: 28 }), 350);
  };

  const handleClassify = async (category: 'famille' | 'ami' | 'autre') => {
    if (!classifyingFriend || !onUpdateBirthday) return;
    await onUpdateBirthday(classifyingFriend.id, { category });
    setClassifyingFriend(null);
  };

  const handleLongPressStart = (friend: Birthday) => {
    longPressTimer.current = setTimeout(() => setClassifyingFriend(friend), 550);
  };
  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // Filter birthdays for current tab + search
  const filtered = birthdays.filter(b => {
    const matchSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTab = activeTab === 'tous' || b.category === activeTab;
    return matchSearch && matchTab;
  });

  // Group by birth month starting from current month (for "Tous" tab)
  const currentMonthIndex = new Date().getMonth();
  const groupedByMonth = Array.from({ length: 12 }, (_, offset) => {
    const monthIndex = (currentMonthIndex + offset) % 12;
    return {
      month: MONTHS_FR[monthIndex],
      friends: filtered
        .filter(b => parseISO(b.birthDate).getMonth() === monthIndex)
        .sort((a, b) => parseISO(a.birthDate).getDate() - parseISO(b.birthDate).getDate()),
    };
  }).filter(g => g.friends.length > 0);

  // Sorted by days until birthday (for filtered tabs)
  const sortedFlat = [...filtered].sort(
    (a, b) => getDaysUntil(a.birthDate) - getDaysUntil(b.birthDate)
  );

  const tabCounts = {
    tous: birthdays.length,
    famille: birthdays.filter(b => b.category === 'famille').length,
    ami: birthdays.filter(b => b.category === 'ami').length,
    autre: birthdays.filter(b => b.category === 'autre').length,
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-3 space-y-3">
        {/* Search + actions row */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="flex items-center gap-2"
        >
          <div className="flex-1 flex items-center gap-2 bg-white border border-black/10 rounded-2xl px-4 py-3">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un ami..."
              className="flex-1 bg-transparent font-display text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSearchQuery('')}
                >
                  <X size={14} className="text-slate-400" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.08, rotate: -8 }}
            onClick={openLeaderboard}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: '#FFFBEB', border: '1.5px solid #D4A017' }}
          >
            <Trophy size={18} style={{ color: '#D4A017' }} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setShowAddModal(true)}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: '#FF4B4B', boxShadow: '0 3px 0 #CC2E2E' }}
          >
            <Plus size={20} strokeWidth={3} />
          </motion.button>
        </motion.div>

        {/* Tabs */}
        <div className="relative flex bg-slate-100 rounded-2xl p-1 gap-1">
          {([
            {
              id: 'tous' as TabId, label: 'Tous', icon: null,
              color: '#64748b', activeColor: '#0f172a',
              activeBg: 'white', badgeBg: '#e2e8f0', badgeColor: '#475569',
            },
            {
              id: 'famille' as TabId, label: 'Famille', icon: <Heart size={12} strokeWidth={2.5} />,
              color: '#f43f5e', activeColor: '#be123c',
              activeBg: '#ffe4e6', badgeBg: '#fecdd3', badgeColor: '#be123c',
            },
            {
              id: 'ami' as TabId, label: 'Amis', icon: <Users size={12} strokeWidth={2.5} />,
              color: '#0ea5e9', activeColor: '#0369a1',
              activeBg: '#e0f2fe', badgeBg: '#bae6fd', badgeColor: '#0369a1',
            },
            {
              id: 'autre' as TabId, label: 'Autre', icon: <UserCircle size={12} strokeWidth={2.5} />,
              color: '#94a3b8', activeColor: '#475569',
              activeBg: '#f1f5f9', badgeBg: '#e2e8f0', badgeColor: '#475569',
            },
          ] as const).map(tab => {
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id];
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.94 }}
                className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-display text-[13px] font-black z-10"
                style={{ color: isActive ? tab.activeColor : tab.color }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 rounded-xl shadow-sm"
                    style={{ background: tab.activeBg }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                {tab.icon && (
                  <span className="relative z-10">{tab.icon}</span>
                )}
                <span className="relative z-10">{tab.label}</span>
                {count > 0 && (
                  <span
                    className="relative z-10 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                    style={{
                      background: isActive ? tab.badgeBg : 'rgba(148,163,184,0.2)',
                      color: isActive ? tab.badgeColor : '#94a3b8',
                    }}
                  >
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── List ───────────────────────────────────────────────── */}
      <div className="flex-1 bg-slate-50 rounded-t-3xl px-5 pb-28 pt-4 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {filtered.length === 0 ? (
              <EmptyState tab={activeTab} onAdd={() => setShowAddModal(true)} />
            ) : activeTab === 'tous' ? (
              <div className="space-y-5">
                {groupedByMonth.map(({ month, friends }, groupIdx) => (
                  <motion.div
                    key={month}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIdx * 0.06, duration: 0.28 }}
                  >
                    {/* Month header — centered with decorative lines */}
                    <div className="flex items-center gap-3 mb-3 px-1">
                      <div className="h-px flex-1 rounded-full" style={{ background: 'linear-gradient(to right, transparent, #cbd5e1)' }} />
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-display text-[13px] font-black text-slate-700 uppercase tracking-widest">{month}</span>
                        <span className="font-display text-[10px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{friends.length}</span>
                      </div>
                      <div className="h-px flex-1 rounded-full" style={{ background: 'linear-gradient(to left, transparent, #cbd5e1)' }} />
                    </div>
                    <div className="space-y-2">
                      {friends.map((friend, i) => (
                        <FriendRow
                          key={friend.id}
                          friend={friend}
                          index={i}
                          hasAccount={friendsWithAccount.has(friend.id)}
                          onPress={() => setViewingFriend(friend)}
                          onEdit={() => setEditingFriend(friend)}
                          onLongPressStart={() => handleLongPressStart(friend)}
                          onLongPressEnd={handleLongPressEnd}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {sortedFlat.map((friend, i) => (
                  <FriendRow
                    key={friend.id}
                    friend={friend}
                    index={i}
                    hasAccount={friendsWithAccount.has(friend.id)}
                    onPress={() => setViewingFriend(friend)}
                    onEdit={() => setEditingFriend(friend)}
                    onLongPressStart={() => handleLongPressStart(friend)}
                    onLongPressEnd={handleLongPressEnd}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Classification bottom sheet ─────────────────────────── */}
      <AnimatePresence>
        {classifyingFriend && (
          <div className="fixed inset-0 z-[300]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setClassifyingFriend(null)}
            />
            <motion.div
              initial={{ y: 220 }}
              animate={{ y: 0 }}
              exit={{ y: 220 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl px-6 pt-5 pb-10"
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">
                Classer <span className="text-slate-800 normal-case text-sm">{classifyingFriend.name}</span>
              </p>
              <div className="grid grid-cols-3 gap-3">
                {([
                  {
                    cat: 'famille' as const,
                    label: 'Famille',
                    icon: <Heart size={24} className="text-rose-500" strokeWidth={2} />,
                    bg: 'bg-rose-50', border: 'border-rose-200',
                    ring: classifyingFriend.category === 'famille' ? 'ring-2 ring-rose-400 ring-offset-1' : '',
                  },
                  {
                    cat: 'ami' as const,
                    label: 'Amis',
                    icon: <Users size={24} className="text-sky-500" strokeWidth={2} />,
                    bg: 'bg-sky-50', border: 'border-sky-200',
                    ring: classifyingFriend.category === 'ami' ? 'ring-2 ring-sky-400 ring-offset-1' : '',
                  },
                  {
                    cat: 'autre' as const,
                    label: 'Autre',
                    icon: <UserCircle size={24} className="text-slate-400" strokeWidth={2} />,
                    bg: 'bg-slate-50', border: 'border-slate-200',
                    ring: classifyingFriend.category === 'autre' ? 'ring-2 ring-slate-300 ring-offset-1' : '',
                  },
                ]).map(({ cat, label, icon, bg, border, ring }) => (
                  <motion.button
                    key={cat}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleClassify(cat)}
                    className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border ${bg} ${border} ${ring} transition-all`}
                  >
                    {icon}
                    <span className="text-[11px] font-black text-slate-700">{label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Friend profile modal ────────────────────────────────── */}
      <FriendProfileModal
        friend={viewingFriend}
        hasAccount={viewingFriend ? friendsWithAccount.has(viewingFriend.id) : false}
        onClose={() => setViewingFriend(null)}
        onEdit={() => { setEditingFriend(viewingFriend); setViewingFriend(null); }}
      />

      {/* ── Leaderboard modal ───────────────────────────────────── */}
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
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Trophy size={18} style={{ color: '#FF4B4B' }} />
                    <h2 className="font-display text-lg font-black text-slate-900">Classement</h2>
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
                  </div>
                ) : leaderboard.map((friend, i) => {
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
                      <div className="w-7 text-center shrink-0">
                        {medal
                          ? <span className="text-xl">{medal}</span>
                          : <span className="text-xs font-black text-slate-400">#{i + 1}</span>
                        }
                      </div>
                      {friend.photoUrl
                        ? <img src={friend.photoUrl} alt={friend.name} className="w-11 h-11 rounded-xl object-cover shrink-0 border border-black/10" />
                        : <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0" style={{ background: '#FF4B4B' }}>{friend.name.charAt(0).toUpperCase()}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-sm truncate">{friend.name}</p>
                        <p className="text-[11px] font-bold text-slate-600">Niveau {friend.level}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-xs" style={{ color: '#FF4B4B', fontFamily: "'Press Start 2P', monospace" }}>{friend.xp}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">XP</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Add Friend modal ────────────────────────────────────── */}
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
              <div className="relative flex items-center justify-between px-5 py-3 shrink-0 rounded-t-3xl" style={{ background: 'linear-gradient(135deg, #FF4B4B 0%, #C2185B 100%)' }}>
                <h3 className="font-display text-sm font-black text-white tracking-wide">🎉 Ajouter un ami</h3>
                <button onClick={() => setShowAddModal(false)} className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
                  <X size={15} className="text-white" />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto px-8 pb-2">
                {/* Photo */}
                <div className="space-y-2">
                  <label className="block text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Photo <span className="text-slate-400 normal-case font-medium">(optionnel)</span>
                  </label>
                  <div className="flex items-center justify-center gap-4">
                    <div className="relative" onClick={() => setShowPhotoMenu(v => !v)}>
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center cursor-pointer overflow-hidden transition-transform active:scale-95"
                        style={newPhotoPreview ? {} : { background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}
                      >
                        {newPhotoPreview
                          ? <img src={newPhotoPreview} alt="preview" className="w-full h-full object-cover" />
                          : <Camera size={26} className="text-white" />
                        }
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm" style={{ background: '#FF4B4B' }}>
                        <span className="text-white text-[11px] font-black leading-none">+</span>
                      </div>
                    </div>
                    {'contacts' in navigator && (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.93 }}
                        onClick={handleImportContact}
                        className="flex flex-col items-center gap-1.5 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-[11px] font-black text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <BookUser size={20} className="text-slate-500" />
                        Contacts
                      </motion.button>
                    )}
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
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-black/60 rounded-xl text-[11px] font-bold text-slate-700"
                          >
                            <Camera size={13} /> Appareil photo
                          </button>
                          <button
                            type="button"
                            onClick={() => { fileInputRef.current?.click(); setShowPhotoMenu(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-black/60 rounded-xl text-[11px] font-bold text-slate-700"
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
                  <label className="block text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">✏️ Nom</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ex: Marie"
                    className="w-full bg-white border-2 border-slate-900 rounded-2xl py-2.5 px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 transition-all"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="block text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">🎂 Date de naissance</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-4 text-slate-900 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                  />
                  {newDate && (() => {
                    const zodiac = getZodiacSign(parseISO(newDate));
                    return (
                      <div className="flex justify-center pt-1">
                        <span className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-100 text-violet-600 text-xs font-black px-3 py-1 rounded-full">
                          {ZODIAC_EMOJI[zodiac]} {zodiac}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Catégorie */}
                <div className="space-y-2">
                  <label className="block text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Catégorie <span className="text-slate-400 normal-case font-medium">(optionnel)</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { cat: 'famille' as const, label: 'Famille', icon: <Heart size={20} strokeWidth={2.5} />, sel: { bg: '#f43f5e', border: '#f43f5e', icon: '#fff' }, unsel: { bg: '#fff8f8', border: '#f1f5f9', icon: '#fca5a5', text: '#94a3b8' } },
                      { cat: 'ami'     as const, label: 'Amis',    icon: <Users size={20} strokeWidth={2.5} />, sel: { bg: '#6366f1', border: '#6366f1', icon: '#fff' }, unsel: { bg: '#f8f8ff', border: '#f1f5f9', icon: '#c4b5fd', text: '#94a3b8' } },
                      { cat: 'autre'   as const, label: 'Autre',   icon: <UserCircle size={20} strokeWidth={2.5} />, sel: { bg: '#f59e0b', border: '#f59e0b', icon: '#fff' }, unsel: { bg: '#fffdf5', border: '#f1f5f9', icon: '#fde68a', text: '#94a3b8' } },
                    ]).map(({ cat, label, icon, sel, unsel }) => {
                      const isSelected = newCategory === cat;
                      const s = isSelected ? sel : unsel;
                      return (
                        <motion.button
                          key={cat}
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.88, rotate: isSelected ? 0 : -3 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                          onClick={() => setNewCategory(isSelected ? undefined : cat)}
                          className="flex flex-col items-center gap-1 py-2 rounded-2xl border-2 text-[11px] font-black"
                          style={{ background: s.bg, borderColor: s.border, color: isSelected ? '#fff' : (unsel as typeof sel & { text: string }).text, ...(isSelected && { boxShadow: `0 4px 12px ${sel.bg}55` }) }}
                        >
                          <span style={{ color: s.icon }}>{icon}</span>
                          {label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Téléphone */}
                <div className="space-y-1">
                  <label className="flex justify-center items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <Phone size={11} /> Téléphone <span className="text-slate-400 normal-case font-medium">(optionnel)</span>
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="Ex: +33 6 12 34 56 78"
                    className="w-full bg-white border-2 border-slate-900 rounded-2xl py-2.5 px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 transition-all"
                  />
                </div>

                {/* Réseaux sociaux */}
                <div className="border border-black/60 rounded-2xl overflow-hidden w-full">
                  <button
                    type="button"
                    onClick={() => setShowSocials(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      🌐 Réseaux sociaux <span className="text-slate-400 normal-case font-medium">(optionnel)</span>
                    </span>
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
                                className="flex-1 min-w-0 bg-slate-50 border border-black/60 rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                              />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Wishlist */}
                <div className="border border-black/60 rounded-2xl overflow-hidden w-full">
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
                              className="flex-1 min-w-0 bg-slate-50 border border-black/60 rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
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
                  className="w-full text-white font-black py-4 rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#FF4B4B', boxShadow: '0 4px 0 #CC2E2E' }}
                >
                  {photoUploading ? 'Upload en cours...' : "AJOUTER L'AMI"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit modal ──────────────────────────────────────────── */}
      <FriendEditModal
        friend={editingFriend}
        onClose={() => setEditingFriend(null)}
        onSave={onUpdateBirthday ?? (async () => {})}
        onDelete={(b) => setConfirmDelete(b)}
      />

      {/* ── Confirm delete modal ────────────────────────────────── */}
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

      {/* ── Toast ───────────────────────────────────────────────── */}
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
