/**
 * FriendPanel — Panel plein écran slide depuis la droite
 * Remplace FriendProfileModal + FriendEditModal empilées.
 * MODE VIEW : affiche le profil complet de l'ami
 * MODE EDIT : formulaire d'édition inline (même écran, pas de modale supplémentaire)
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Edit2, Check, Trash2,
  Camera, Phone, ExternalLink, ChevronDown, Plus, ImageIcon, X,
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';
import { Birthday } from '../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Social logos ────────────────────────────────────────────────────────────

function SocialIcon({ network }: { network: string }) {
  const base = 'w-10 h-10 rounded-xl flex items-center justify-center shrink-0';
  switch (network) {
    case 'instagram': return (
      <div className={base} style={{ background: 'radial-gradient(circle at 30% 107%, #ffd879, #fda54c 25%, #e65c3b 50%, #c13584 75%, #833ab4)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="white" strokeWidth="1.8"/>
          <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="1.8"/>
          <circle cx="17.5" cy="6.5" r="1.1" fill="white"/>
        </svg>
      </div>
    );
    case 'tiktok': return (
      <div className={base} style={{ background: '#010101' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
        </svg>
      </div>
    );
    case 'twitter': return (
      <div className={base} style={{ background: '#000' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </div>
    );
    case 'snapchat': return (
      <div className={base} style={{ background: '#FFFC00' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
          <path d="M12 2C8.69 2 6 4.69 6 8v3.17l-1.76 2.64a.5.5 0 0 0 .42.77H6c.18 1.1 1.05 1.96 2.15 2.18.18.5.65.84 1.35 1.01.28.41.9.73 2.5.73s2.22-.32 2.5-.73c.7-.17 1.17-.51 1.35-1.01A2.5 2.5 0 0 0 18 13.58h1.34a.5.5 0 0 0 .42-.77L18 10.17V8c0-3.31-2.69-6-6-6z"/>
        </svg>
      </div>
    );
    case 'facebook': return (
      <div className={base} style={{ background: '#1877F2' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M13 2.05V5h2a1 1 0 0 1 1 1v2.5h-3V11h3v10h-3.5V11H10V8.5h2.5V5.6A3.6 3.6 0 0 1 16.1 2H13z"/>
        </svg>
      </div>
    );
    default: return null;
  }
}

const SOCIAL_LABEL: Record<string, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', twitter: 'Twitter / X',
  snapchat: 'Snapchat', facebook: 'Facebook',
};
const SOCIAL_URL: Record<string, (u: string) => string> = {
  instagram: u => `https://instagram.com/${u.replace(/^@/, '')}`,
  twitter:   u => `https://x.com/${u.replace(/^@/, '')}`,
  facebook:  u => `https://facebook.com/${u.replace(/^@/, '')}`,
  snapchat:  u => `https://snapchat.com/add/${u.replace(/^@/, '')}`,
  tiktok:    u => `https://tiktok.com/@${u.replace(/^@/, '')}`,
};
const SOCIAL_KEYS = ['instagram', 'tiktok', 'twitter', 'snapchat', 'facebook'] as const;

// ── Props ───────────────────────────────────────────────────────────────────

interface Props {
  friend: Birthday | null;
  hasAccount: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Birthday>) => Promise<void>;
  onDelete: (friend: Birthday) => void;
}

// ── Composant principal ─────────────────────────────────────────────────────

export function FriendPanel({ friend, hasAccount, onClose, onSave, onDelete }: Props) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Champs d'édition
  const [editPhone, setEditPhone]       = useState('');
  const [editSocials, setEditSocials]   = useState({ instagram: '', snapchat: '', tiktok: '', twitter: '', facebook: '' });
  const [editWishlist, setEditWishlist] = useState<string[]>([]);
  const [editWishInput, setEditWishInput] = useState('');
  const [showSocials, setShowSocials]   = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUrl, setPhotoUrl]         = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu]   = useState(false);
  const [saving, setSaving]             = useState(false);

  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Réinitialise les champs à chaque changement d'ami
  useEffect(() => {
    if (!friend) return;
    setMode('view');
    setConfirmDelete(false);
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
    setPhotoUrl(friend.photoUrl ?? '');
    setPhotoPreview(friend.photoUrl ?? '');
    setShowSocials(false);
    setShowWishlist(false);
    setShowPhotoMenu(false);
    setSaving(false);
  }, [friend?.id]);

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setShowPhotoMenu(false);
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX = 600;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async blob => {
          if (!blob) { setPhotoUploading(false); return; }
          setPhotoPreview(URL.createObjectURL(blob));
          try {
            const uid = auth.currentUser?.uid;
            if (!uid) throw new Error('Non connecté');
            const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`;
            const storageRef = ref(storage, `users/${uid}/friends/${filename}`);
            await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
            setPhotoUrl(await getDownloadURL(storageRef));
          } catch (err) {
            console.error('[FriendPanel] Photo upload failed:', err);
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

  const handleSave = async () => {
    if (!friend) return;
    setSaving(true);
    try {
      const cleanSocials = Object.fromEntries(
        Object.entries(editSocials).filter(([, v]) => v.trim() !== '')
      ) as Birthday['socials'];
      await onSave(friend.id, {
        ...(photoUrl && { photoUrl }),
        ...(editPhone.trim() && { phone: editPhone.trim() }),
        ...(Object.keys(cleanSocials ?? {}).length > 0 && { socials: cleanSocials }),
        wishlist: editWishlist,
      });
      setMode('view');
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setSaving(false);
    }
  };

  const filledSocials = friend?.socials
    ? Object.entries(friend.socials).filter(([, v]) => v)
    : [];

  return (
    <AnimatePresence>
      {friend && (
        <>
          {/* Backdrop (uniquement visible sur mobile pour cliquer à côté) */}
          <motion.div
            key="panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] bg-slate-900/20"
            onClick={onClose}
          />

          {/* Panel — slide depuis la droite */}
          <motion.div
            key="panel-body"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed inset-0 z-[190] max-w-md mx-auto bg-white flex flex-col overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-12 pb-4 border-b border-slate-100 bg-white shrink-0">
              <button
                onClick={mode === 'edit' ? () => setMode('view') : onClose}
                className="flex items-center gap-1.5 text-slate-600 font-black text-sm"
                aria-label={mode === 'edit' ? 'Annuler la modification' : 'Retour à la liste'}
              >
                <ArrowLeft size={20} />
                {mode === 'edit' ? 'Annuler' : 'Mes amis'}
              </button>

              <h2 className="font-black text-slate-900 text-base truncate max-w-[140px]">
                {friend.name}
              </h2>

              {mode === 'view' ? (
                <button
                  onClick={() => setMode('edit')}
                  aria-label="Modifier le profil"
                  className="flex items-center gap-1.5 text-sm font-black px-3 py-1.5 rounded-xl"
                  style={{ background: '#FF4B4B', color: '#fff' }}
                >
                  <Edit2 size={14} />
                  Modifier
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || photoUploading}
                  aria-label="Enregistrer les modifications"
                  className="flex items-center gap-1.5 text-sm font-black px-3 py-1.5 rounded-xl disabled:opacity-50"
                  style={{ background: '#58CC02', color: '#fff' }}
                >
                  <Check size={14} />
                  {saving ? '...' : 'Sauver'}
                </button>
              )}
            </div>

            {/* ── Contenu scrollable ── */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">

                {/* ══ MODE VIEW ══ */}
                {mode === 'view' && (
                  <motion.div
                    key="view"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="p-5 space-y-4 pb-32"
                  >
                    {/* Photo + identité */}
                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-200">
                          <img
                            src={friend.photoUrl || `https://picsum.photos/seed/${friend.id}/200/200`}
                            alt={friend.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {hasAccount && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-[9px] text-white font-black">✓</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-lg truncate">{friend.name}</p>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {format(parseISO(friend.birthDate), 'd MMMM yyyy', { locale: fr })}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-500 border border-rose-100">
                            {friend.zodiac}
                          </span>
                          {hasAccount && (
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                              🎮 Sur l'appli
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Téléphone */}
                    {friend.phone && (
                      <a
                        href={`tel:${friend.phone}`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 group hover:border-sky-300 transition-colors"
                      >
                        <div className="w-10 h-10 bg-sky-50 border border-slate-200 rounded-xl flex items-center justify-center shrink-0">
                          <Phone size={16} className="text-sky-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Téléphone</p>
                          <p className="font-bold text-slate-900 truncate">{friend.phone}</p>
                        </div>
                        <ExternalLink size={14} className="text-slate-300 group-hover:text-sky-400 transition-colors shrink-0" />
                      </a>
                    )}

                    {/* Réseaux sociaux */}
                    {filledSocials.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">
                          Réseaux sociaux
                        </p>
                        {SOCIAL_KEYS
                          .filter(k => friend.socials?.[k])
                          .map(key => {
                            const val = friend.socials![key] as string;
                            const url = SOCIAL_URL[key]?.(val);
                            const label = ['instagram', 'tiktok', 'twitter'].includes(key)
                              ? `@${val.replace(/^@/, '')}` : val;
                            return (
                              <a
                                key={key}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3 group hover:border-slate-300 transition-colors"
                              >
                                <SocialIcon network={key} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-0.5">
                                    {SOCIAL_LABEL[key]}
                                  </p>
                                  <p className="font-bold text-slate-900 truncate">{label}</p>
                                </div>
                                <ExternalLink size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                              </a>
                            );
                          })}
                      </div>
                    )}

                    {/* Wishlist */}
                    {(friend.wishlist ?? []).length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                        <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">🎁 Wishlist</p>
                        <div className="flex flex-wrap gap-2">
                          {(friend.wishlist ?? []).map((item, i) => (
                            <span key={i} className="bg-white border border-amber-200 px-3 py-1.5 rounded-xl text-sm font-bold text-amber-800">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Zone vide — pas de socials ni wishlist */}
                    {filledSocials.length === 0 && (friend.wishlist ?? []).length === 0 && !friend.phone && (
                      <div className="text-center py-8 text-slate-400">
                        <p className="text-3xl mb-2">👤</p>
                        <p className="text-sm font-bold">Aucune info supplémentaire</p>
                        <p className="text-xs mt-1">Clique sur Modifier pour compléter le profil</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ══ MODE EDIT ══ */}
                {mode === 'edit' && (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="p-5 space-y-4 pb-32"
                  >
                    {/* Photo */}
                    <div className="flex flex-col items-center gap-3">
                      <div
                        onClick={() => setShowPhotoMenu(v => !v)}
                        className="relative w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden hover:border-rose-300 transition-colors"
                      >
                        {photoPreview
                          ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                          : photoUploading
                            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-rose-500" />
                            : <Camera size={24} className="text-slate-400" />
                        }
                      </div>
                      <AnimatePresence>
                        {showPhotoMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                            className="flex gap-2"
                          >
                            <button type="button" onClick={() => { cameraRef.current?.click(); setShowPhotoMenu(false); }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                              <Camera size={13} /> Appareil photo
                            </button>
                            <button type="button" onClick={() => { fileRef.current?.click(); setShowPhotoMenu(false); }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                              <ImageIcon size={13} /> Galerie
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoFile} className="hidden" />
                      <input ref={fileRef}   type="file" accept="image/*" onChange={handlePhotoFile} className="hidden" />
                    </div>

                    {/* Identité (lecture seule) */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                      <p className="font-black text-slate-900">{friend.name}</p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {format(parseISO(friend.birthDate), 'd MMMM yyyy', { locale: fr })} · {friend.zodiac}
                      </p>
                    </div>

                    {/* Téléphone */}
                    <div>
                      <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                        <Phone size={11} /> Téléphone
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        placeholder="+33 6 12 34 56 78"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 transition-colors"
                      />
                    </div>

                    {/* Réseaux sociaux (accordéon) */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => setShowSocials(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Réseaux sociaux</span>
                        <motion.div animate={{ rotate: showSocials ? 180 : 0 }} transition={{ duration: 0.25 }}>
                          <ChevronDown size={16} className="text-slate-400" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {showSocials && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 space-y-2 bg-white">
                              {SOCIAL_KEYS.map(key => (
                                <div key={key} className="flex items-center gap-2.5">
                                  <SocialIcon network={key} />
                                  <input
                                    type="text"
                                    value={editSocials[key]}
                                    onChange={e => setEditSocials(s => ({ ...s, [key]: e.target.value }))}
                                    placeholder="@pseudo"
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 transition-colors"
                                  />
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Wishlist (accordéon) */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => setShowWishlist(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          🎁 Wishlist
                          {editWishlist.length > 0 && (
                            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                              {editWishlist.length}
                            </span>
                          )}
                        </span>
                        <motion.div animate={{ rotate: showWishlist ? 180 : 0 }} transition={{ duration: 0.25 }}>
                          <ChevronDown size={16} className="text-slate-400" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {showWishlist && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 space-y-3 bg-white">
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
                                  placeholder="Lego, Chocolat, Voyage..."
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
                                />
                                <button type="button"
                                  disabled={!editWishInput.trim()}
                                  onClick={() => { if (!editWishInput.trim()) return; setEditWishlist(w => [...w, editWishInput.trim()]); setEditWishInput(''); }}
                                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40"
                                  style={{ background: '#FF4B4B' }}>
                                  <Plus size={18} className="text-white" strokeWidth={3} />
                                </button>
                              </div>
                              {editWishlist.length > 0 && (
                                <ul className="space-y-1.5">
                                  {editWishlist.map((wish, i) => (
                                    <li key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                      <span className="text-sm text-slate-800 flex-1">🎁 {wish}</span>
                                      <button type="button" onClick={() => setEditWishlist(w => w.filter((_, j) => j !== i))}
                                        className="text-slate-400 hover:text-rose-500 transition-colors">
                                        <X size={14} />
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

                    {/* Supprimer */}
                    {!confirmDelete ? (
                      <button type="button" onClick={() => setConfirmDelete(true)}
                        className="w-full border-2 border-rose-200 text-rose-500 font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors">
                        <Trash2 size={16} />
                        SUPPRIMER CE PROFIL
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="border-2 border-rose-300 rounded-2xl p-4 space-y-3 bg-rose-50"
                      >
                        <p className="text-center font-black text-slate-900 text-sm">
                          Supprimer <span style={{ color: '#FF4B4B' }}>{friend.name}</span> ?
                        </p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setConfirmDelete(false)}
                            className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-black text-sm">
                            Annuler
                          </button>
                          <button type="button"
                            onClick={() => { onDelete(friend); onClose(); }}
                            className="flex-1 py-3 rounded-xl font-black text-sm text-white"
                            style={{ background: '#FF4B4B', boxShadow: '0 4px 0 #CC2E2E' }}>
                            Supprimer
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
