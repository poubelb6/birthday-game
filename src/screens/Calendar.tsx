import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ChevronDown, X, Camera, ImageIcon, Phone, Instagram, Twitter, Facebook } from 'lucide-react';
import confetti from 'canvas-confetti';
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

export function Calendar({ birthdays, onAddBirthday, onDeleteBirthday }: {
  birthdays: Birthday[],
  onAddBirthday?: (b: Birthday) => void,
  onDeleteBirthday?: (id: string) => void,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoPreview, setNewPhotoPreview] = useState('');
  const [newSocials, setNewSocials] = useState({ instagram: '', snapchat: '', tiktok: '', twitter: '', facebook: '' });
  const [showCake, setShowCake] = useState(true);
  const [showSocials, setShowSocials] = useState(false);
  const [toastName, setToastName] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Birthday | null>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cycle = () => {
      setShowCake(true);
      setTimeout(() => setShowCake(false), 6000);
    };
    cycle();
    const interval = setInterval(cycle, 8000);
    return () => clearInterval(interval);
  }, []);

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
    console.log('[Photo] Fichier sélectionné:', file.name, `${(file.size / 1024).toFixed(1)} Ko`, file.type);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 200;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.6);
        const sizeKo = (compressed.length * 0.75 / 1024).toFixed(1);
        console.log('[Photo] Après compression:', `${canvas.width}x${canvas.height}px`, `~${sizeKo} Ko`);
        setNewPhotoPreview(compressed);
        setNewPhotoUrl(compressed);
      };
      img.onerror = (err) => console.error('[Photo] Erreur chargement image:', err);
      img.src = ev.target?.result as string;
    };
    reader.onerror = (err) => console.error('[Photo] Erreur FileReader:', err);
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
              <div key={b.id} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-black/60 shadow-sm">
                {b.photoUrl
                  ? <img src={b.photoUrl} alt={b.name} className="w-10 h-10 rounded-full object-cover border border-black/20 shrink-0" />
                  : <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-black text-xs border border-sky-200 shrink-0">
                      {format(parseISO(b.birthDate), 'dd')}
                    </div>
                }
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-sm">{b.name}</p>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">{b.zodiac}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(b)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-rose-100 flex items-center justify-center transition-colors shrink-0"
                >
                  <X size={14} className="text-slate-400 hover:text-rose-500" />
                </button>
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
              </div>

              <div className="px-8 py-6 shrink-0">
                <button
                  type="button"
                  onClick={handleAddFriend}
                  disabled={!newName || !newDate}
                  className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-sky-100 hover:bg-sky-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  AJOUTER L'AMI
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
