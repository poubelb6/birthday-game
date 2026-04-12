import { useState, useRef, useEffect } from 'react';
import { formatZodiac } from '../utils/zodiac';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Phone, Instagram, Twitter, Facebook, ChevronDown, Plus, Trash2, ImageIcon } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';
import { Birthday } from '../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  friend: Birthday | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Birthday>) => Promise<void>;
  onDelete: (friend: Birthday) => void;
}

export function FriendEditModal({ friend, onClose, onSave, onDelete }: Props) {
  const [editPhone, setEditPhone] = useState('');
  const [editSocials, setEditSocials] = useState({ instagram: '', snapchat: '', tiktok: '', twitter: '', facebook: '' });
  const [editWishlist, setEditWishlist] = useState<string[]>([]);
  const [editWishInput, setEditWishInput] = useState('');
  const [editShowSocials, setEditShowSocials] = useState(false);
  const [editShowWishlist, setEditShowWishlist] = useState(false);
  const [editPhotoPreview, setEditPhotoPreview] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editPhotoUploading, setEditPhotoUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!friend) return;
    setEditPhone(friend.phone ?? '');
    setEditSocials({
      instagram: friend.socials?.instagram ?? '',
      snapchat:  friend.socials?.snapchat  ?? '',
      tiktok:    friend.socials?.tiktok    ?? '',
      twitter:   friend.socials?.twitter   ?? '',
      facebook:  friend.socials?.facebook  ?? '',
    });
    setEditWishlist(friend.wishlist ?? []);
    setEditWishInput('');
    setEditPhotoUrl(friend.photoUrl ?? '');
    setEditPhotoPreview(friend.photoUrl ?? '');
    setEditShowSocials(false);
    setEditShowWishlist(false);
    setShowPhotoMenu(false);
    setEditSaving(false);
  }, [friend?.id]);

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhotoUploading(true);
    setShowPhotoMenu(false);
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
          if (!blob) { setEditPhotoUploading(false); return; }
          setEditPhotoPreview(URL.createObjectURL(blob));
          try {
            const uid = auth.currentUser?.uid;
            if (!uid) throw new Error('Non connecté');
            const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`;
            const storageRef = ref(storage, `users/${uid}/friends/${filename}`);
            await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
            setEditPhotoUrl(await getDownloadURL(storageRef));
          } catch (err) {
            console.error('[FriendEditModal] Photo upload failed:', err);
          } finally {
            setEditPhotoUploading(false);
          }
        }, 'image/jpeg', 0.8);
      };
      img.onerror = () => setEditPhotoUploading(false);
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => setEditPhotoUploading(false);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!friend) return;
    setEditSaving(true);
    try {
      const cleanSocials = Object.fromEntries(
        Object.entries(editSocials).filter(([, v]) => v.trim() !== '')
      ) as Birthday['socials'];
      const updates: Partial<Birthday> = {
        ...(editPhotoUrl && { photoUrl: editPhotoUrl }),
        ...(editPhone.trim() && { phone: editPhone.trim() }),
        ...(Object.keys(cleanSocials ?? {}).length > 0 && { socials: cleanSocials }),
        wishlist: editWishlist,
      };
      await onSave(friend.id, updates);
      onClose();
    } catch (e) {
      console.error('Failed to update friend:', e);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {friend && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-center relative px-8 pt-8 pb-4 shrink-0">
              <h3 className="font-display text-xl font-black text-slate-900">Modifier le profil</h3>
              <button onClick={onClose} className="absolute right-8 text-slate-500 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-8 pb-2 pr-7">

              {/* Photo */}
              <div className="space-y-2">
                <label className="block text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Photo <span className="text-slate-400 normal-case font-medium">(optionnel)</span>
                </label>
                <div className="flex flex-col items-center gap-2">
                  <div
                    onClick={() => setShowPhotoMenu(v => !v)}
                    className="w-16 h-16 rounded-full bg-slate-50 border border-black/60 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors overflow-hidden"
                  >
                    {editPhotoPreview
                      ? <img src={editPhotoPreview} alt="preview" className="w-full h-full object-cover" />
                      : editPhotoUploading
                        ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-rose-500" />
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

              {/* Info lecture seule */}
              <div className="bg-slate-50 border border-black/60 rounded-2xl p-4 text-center">
                <p className="font-black text-slate-900">{friend.name}</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {format(parseISO(friend.birthDate), 'd MMMM yyyy', { locale: fr })} · {formatZodiac(friend.zodiac)}
                </p>
              </div>

              {/* Téléphone */}
              <div className="space-y-1">
                <label className="flex justify-center items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <Phone size={11} /> Téléphone <span className="text-slate-400 normal-case font-medium">(optionnel)</span>
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="Ex: +33 6 12 34 56 78"
                  className="w-full bg-slate-50 border border-black/60 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Réseaux sociaux */}
              <div className="border border-black/60 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEditShowSocials(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Réseaux sociaux <span className="text-slate-400 normal-case font-medium">(optionnel)</span>
                  </span>
                  <motion.span animate={{ rotate: editShowSocials ? 180 : 0 }} transition={{ duration: 0.25 }}>
                    <ChevronDown size={16} className="text-slate-400" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {editShowSocials && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 p-3 bg-white">
                        {([
                          { key: 'instagram', icon: <Instagram size={15} className="text-pink-500" />,  placeholder: '@pseudo' },
                          { key: 'snapchat',  icon: <span className="text-[14px]">👻</span>,             placeholder: '@pseudo' },
                          { key: 'tiktok',    icon: <span className="text-[14px]">🎵</span>,             placeholder: '@pseudo' },
                          { key: 'twitter',   icon: <Twitter size={15} className="text-sky-500" />,      placeholder: '@pseudo' },
                          { key: 'facebook',  icon: <Facebook size={15} className="text-blue-600" />,    placeholder: 'Nom complet' },
                        ] as const).map(({ key, icon, placeholder }) => (
                          <div key={key} className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-slate-50 border border-black/60 rounded-xl flex items-center justify-center shrink-0">
                              {icon}
                            </div>
                            <input
                              type="text"
                              value={editSocials[key]}
                              onChange={e => setEditSocials(s => ({ ...s, [key]: e.target.value }))}
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

              {/* Wishlist */}
              <div className="border border-black/60 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEditShowWishlist(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    🎁 Wishlist <span className="text-slate-400 normal-case font-medium">(optionnel)</span>
                    {editWishlist.length > 0 && (
                      <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[9px] font-black">
                        {editWishlist.length}
                      </span>
                    )}
                  </span>
                  <motion.span animate={{ rotate: editShowWishlist ? 180 : 0 }} transition={{ duration: 0.25 }}>
                    <ChevronDown size={16} className="text-slate-400" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {editShowWishlist && (
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
                            value={editWishInput}
                            onChange={e => setEditWishInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && editWishInput.trim()) {
                                setEditWishlist(w => [...w, editWishInput.trim()]);
                                setEditWishInput('');
                              }
                            }}
                            placeholder="Ex: Roman, parfum, jeu vidéo..."
                            className="flex-1 bg-slate-50 border border-black/60 rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
                          />
                          <button
                            type="button"
                            disabled={!editWishInput.trim()}
                            onClick={() => {
                              if (!editWishInput.trim()) return;
                              setEditWishlist(w => [...w, editWishInput.trim()]);
                              setEditWishInput('');
                            }}
                            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                            style={{ background: '#FF4B4B' }}
                          >
                            <Plus size={18} className="text-white" strokeWidth={3} />
                          </button>
                        </div>
                        {editWishlist.length > 0 && (
                          <ul className="space-y-1.5">
                            {editWishlist.map((wish, i) => (
                              <li key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                <span className="text-sm text-slate-800 flex-1">🎁 {wish}</span>
                                <button
                                  type="button"
                                  onClick={() => setEditWishlist(w => w.filter((_, j) => j !== i))}
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

            {/* Boutons */}
            <div className="px-8 py-6 shrink-0 space-y-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={editSaving || editPhotoUploading}
                className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-sky-100 hover:bg-sky-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editSaving ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
              </button>
              <button
                type="button"
                onClick={() => { onDelete(friend); onClose(); }}
                className="w-full border-2 border-rose-200 text-rose-500 font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors"
              >
                <Trash2 size={16} />
                SUPPRIMER CE PROFIL
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
