import { useState, useRef } from 'react';
import { ZODIAC_EMOJI } from '../utils/zodiac';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Settings, Instagram, Gift, ChevronRight, Sparkles, Users, Trophy, ExternalLink, Copy, Twitter, Facebook, Save, X, Smartphone, LogOut, Ghost, Camera, Plus, Trash2, Moon, Sun } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';
import { UserProfile } from '../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const SOCIAL_URL: Record<string, (u: string) => string> = {
  instagram: u => `https://instagram.com/${u.replace(/^@/, '')}`,
  twitter:   u => `https://x.com/${u.replace(/^@/, '')}`,
  facebook:  u => `https://facebook.com/${u.replace(/^@/, '')}`,
  snapchat:  u => `https://snapchat.com/add/${u.replace(/^@/, '')}`,
  tiktok:    u => `https://tiktok.com/@${u.replace(/^@/, '')}`,
  linkedin:  u => `https://linkedin.com/in/${u.replace(/^@/, '')}`,
};

export function Profile({ user, onUpdate, birthdays = [], challenges = [] }: { user: UserProfile, onUpdate: (user: UserProfile) => Promise<void>, birthdays?: any[], challenges?: any[] }) {
  const [isEditingSocials, setIsEditingSocials] = useState(false);
  const [socials, setSocials] = useState(user.socials);
  const [saving, setSaving] = useState(false);
  const [isEditingWishlist, setIsEditingWishlist] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<string[]>(user.wishlist ?? []);
  const [wishInput, setWishInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showBgModal, setShowBgModal] = useState(false);
  const [bgPassword, setBgPassword] = useState('');
  const [bgStatus, setBgStatus] = useState<'success' | 'error' | null>(null);
  const [gigiBgActive, setGigiBgActive] = useState(() => localStorage.getItem('gigiBg') === 'true');
  const [darkModeActive, setDarkModeActive] = useState(() => localStorage.getItem('darkMode') === 'true');

  const toggleEdit = () => {
    if (!isEditingSocials) {
      setSocials(user.socials);
    }
    setIsEditingSocials(!isEditingSocials);
  };

  const profileData = JSON.stringify({
    id:       user.id,
    name:     user.name,
    birthDate: user.birthDate,
    zodiac:   user.zodiac,
    // Exclude base64 photos — QR codes have ~1500 char max; Storage URLs are short
    ...(user.photoUrl && !user.photoUrl.startsWith('data:') && { photoUrl: user.photoUrl }),
    socials:  user.socials,
  });

  // Shareable deep-link URL — exclude base64 photos (too long for a URL)
  const shareablePayload = {
    id:        user.id,
    name:      user.name,
    birthDate: user.birthDate,
    zodiac:    user.zodiac,
    socials:   user.socials,
    ...(user.photoUrl && !user.photoUrl.startsWith('data:') && { photoUrl: user.photoUrl }),
  };
  const shareUrl = `https://birthday-game-green.vercel.app/add-friend?data=${btoa(unescape(encodeURIComponent(JSON.stringify(shareablePayload))))}`;

  const completedChallenges = challenges.filter((c: any) => c.progress >= c.target).length;
  const stats = [
    { label: 'Amis', value: String(birthdays.length), icon: Users, color: 'text-sky-500', bg: 'bg-sky-50' },
    { label: 'Défis', value: String(completedChallenges), icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Cartes', value: String(user.collectedCards.length), icon: Sparkles, color: 'text-rose-500', bg: 'bg-rose-50' },
  ];

  const shareText = `🎂 Ajoute-moi sur Birthday Game !\n👤 ${user.name} · né(e) le ${format(parseISO(user.birthDate), 'd MMMM yyyy', { locale: fr })}\n\n🔗 ${shareUrl}`;

  const handleCopyQr = () => {
    navigator.clipboard.writeText(profileData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setShowShareOptions(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    setShowShareOptions(false);
  };

  const handleShareInstagram = async () => {
    setShowShareOptions(false);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Birthday Game', text: shareText, url: shareUrl });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      window.open('https://www.instagram.com/', '_blank');
    }
  };

  const handleSaveWishlist = async () => {
    try {
      await onUpdate({ ...user, wishlist: wishlistItems });
      setIsEditingWishlist(false);
    } catch (e) {
      console.error('Failed to save wishlist:', e);
    }
  };

  const handleSaveSocials = async () => {
    setSaving(true);
    try {
      await onUpdate({ ...user, socials });
      setIsEditingSocials(false);
    } catch (e) {
      console.error('Failed to update socials:', e);
    } finally {
      setSaving(false);
    }
  };
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoUploadError(null);

    const reader = new FileReader();

    reader.onerror = () => {
      setPhotoUploadError('Impossible de lire la photo, réessayez');
      setPhotoUploading(false);
    };

    reader.onload = (ev) => {
      const img = new Image();

      img.onerror = () => {
        setPhotoUploadError('Format de photo non supporté');
        setPhotoUploading(false);
      };

      img.onload = async () => {
        // Compress to max 600px, quality 0.8
        const maxPx = 600;
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setPhotoUploadError('Erreur de compression, réessayez');
          setPhotoUploading(false);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            setPhotoUploadError('Erreur de compression, réessayez');
            setPhotoUploading(false);
            return;
          }
          try {
            const uid = auth.currentUser?.uid;
            if (!uid) throw new Error('Non connecté');
            const storageRef = ref(storage, `users/${uid}/profile.jpg`);
            await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
            const downloadUrl = await getDownloadURL(storageRef);
            await onUpdate({ ...user, photoUrl: downloadUrl });
          } catch (err) {
            console.error('[Photo] Upload failed:', err instanceof Error ? err.message : err);
            setPhotoUploadError('Échec de l\'envoi, réessayez');
          } finally {
            setPhotoUploading(false);
          }
        }, 'image/jpeg', 0.8);
      };

      img.src = ev.target?.result as string;
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBgPassword = () => {
    if (bgPassword.toLowerCase() === 'gigi') {
      const next = !gigiBgActive;
      localStorage.setItem('gigiBg', String(next));
      setGigiBgActive(next);
      window.dispatchEvent(new CustomEvent('gigiBgChange', { detail: next }));
      setBgStatus('success');
      setBgPassword('');
      setTimeout(() => { setBgStatus(null); setShowBgModal(false); }, 1800);
    } else {
      setBgStatus('error');
      setBgPassword('');
      setTimeout(() => setBgStatus(null), 1500);
    }
  };

const getZodiacEmoji = (zodiac: string) => {
  return ZODIAC_EMOJI[zodiac] || '⭐';
};
  return (
    <div className="pb-24">
      {/* Header / Cover Area */}
      <div className="relative h-48 bg-gradient-to-br from-rose-400 to-rose-500 overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [0, -5, 5, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-12 -left-12 w-48 h-48 bg-sky-400/20 rounded-full blur-2xl"
        />
      </div>

      <div className="px-6 -mt-16 relative z-10 space-y-6">
        {/* Profile Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 border border-black/60"
        >
          <div className="flex flex-col items-center text-center -mt-16">
            <div className="relative">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-28 h-28 bg-white p-2 rounded-[2rem] shadow-xl overflow-hidden relative group"
              >
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.name}
                    className="w-full h-full object-cover rounded-[1.5rem]"
                  />
                ) : (
                  <div className="w-full h-full bg-rose-400 rounded-[1.5rem] flex items-center justify-center text-white text-4xl font-black shadow-inner">
                    {user.name.charAt(0)}
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-2 rounded-[1.5rem] bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {photoUploading
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-6 h-6 rounded-full border-2 border-white/40 border-t-white" />
                    : <Camera size={22} className="text-white" />
                  }
                </div>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute bottom-1 right-1 bg-sky-400 p-2 rounded-xl text-white shadow-lg border-4 border-white"
              >
                <Sparkles size={16} />
              </motion.div>
            </div>

            <AnimatePresence>
              {photoUploadError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-bold text-rose-500 text-center max-w-[220px] leading-snug"
                  onAnimationComplete={() => setTimeout(() => setPhotoUploadError(null), 3000)}
                >
                  {photoUploadError}
                </motion.p>
              )}
            </AnimatePresence>
            
            <div className="mt-4 space-y-1">
              <h2 className="text-2xl font-black text-slate-900">{user.name}</h2>
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm font-bold text-rose-400">
                  {format(parseISO(user.birthDate), 'd MMMM yyyy', { locale: fr })}
                </p>
                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-sm">{getZodiacEmoji(user.zodiac)}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">{user.zodiac}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-50">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
                  <stat.icon size={20} />
                </div>
                <span className="text-lg font-black text-slate-900 leading-none mt-1">{stat.value}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* QR Code Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] p-8 border border-slate-50 shadow-lg shadow-slate-100/50 flex flex-col items-center space-y-6"
        >
          <div className="text-center space-y-1">
            <h3 className="text-lg font-black text-slate-900">Mon QR Code</h3>
            <p className="text-xs text-slate-400 font-medium max-w-[200px] mx-auto">
              Fais-toi scanner pour rejoindre la collection de tes amis !
            </p>
          </div>

          <div className="relative group">
            <div className="relative p-4 bg-white rounded-[2rem] shadow-sm border border-slate-100">
              <QRCodeSVG
                value={profileData}
                size={160}
                level="M"
                includeMargin={true}
                fgColor="#f43f5e"
              />
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <button onClick={handleCopyQr} className="flex-1 bg-slate-50 text-slate-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
              <Copy size={18} />
              {copied ? 'COPIÉ ✓' : 'COPIER'}
            </button>
            <div className="flex-1 relative">
              <button
                onClick={() => setShowShareOptions(v => !v)}
                className="w-full bg-rose-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-100 hover:bg-rose-600 transition-colors"
              >
                <Share2 size={18} />
                PARTAGER
              </button>

              <AnimatePresence>
                {showShareOptions && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setShowShareOptions(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className="absolute bottom-full right-0 mb-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden w-52"
                    >
                      <button
                        onClick={handleShareWhatsApp}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-green-50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#25D366' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </div>
                        <span className="font-bold text-sm text-slate-800">WhatsApp</span>
                      </button>

                      <div className="h-px bg-slate-100 mx-3" />

                      <button
                        onClick={handleShareInstagram}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-rose-50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600">
                          <Instagram size={20} className="text-white" />
                        </div>
                        <span className="font-bold text-sm text-slate-800">Instagram</span>
                      </button>

                      <div className="h-px bg-slate-100 mx-3" />

                      <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <Copy size={16} className="text-slate-600" />
                        </div>
                        <span className="font-bold text-sm text-slate-800">Copier le lien</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        {/* Wishlist */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Gift size={18} className="text-rose-500" />
              <h3 className="text-lg font-black text-slate-900">Ma Wishlist</h3>
            </div>
            <button
              onClick={() => { setWishlistItems(user.wishlist ?? []); setWishInput(''); setIsEditingWishlist(!isEditingWishlist); }}
              className="text-xs font-black text-sky-500 uppercase tracking-widest"
            >
              {isEditingWishlist ? 'Annuler' : 'Modifier'}
            </button>
          </div>

          {isEditingWishlist ? (
            <div className="space-y-3">
              {/* Input + bouton ajout */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wishInput}
                  onChange={e => setWishInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && wishInput.trim()) {
                      setWishlistItems(w => [...w, wishInput.trim()]);
                      setWishInput('');
                    }
                  }}
                  placeholder="Ex: Lego, Chocolat, Voyage..."
                  className="flex-1 bg-slate-50 border border-black/60 rounded-2xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-400 transition-colors"
                />
                <button
                  type="button"
                  disabled={!wishInput.trim()}
                  onClick={() => {
                    if (!wishInput.trim()) return;
                    setWishlistItems(w => [...w, wishInput.trim()]);
                    setWishInput('');
                  }}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                  style={{ background: '#FF4B4B' }}
                >
                  <Plus size={18} className="text-white" strokeWidth={3} />
                </button>
              </div>

              {/* Tags éditables */}
              {wishlistItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {wishlistItems.map((item, i) => (
                    <span key={i} className="bg-white border border-slate-100 px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-600 shadow-sm flex items-center gap-2">
                      <span className="text-base leading-none">🎁</span>
                      {item}
                      <button
                        type="button"
                        onClick={() => setWishlistItems(w => w.filter((_, j) => j !== i))}
                        className="text-slate-300 hover:text-rose-500 transition-colors ml-1"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={handleSaveWishlist}
                className="w-full bg-rose-500 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-100 hover:bg-rose-600 transition-colors"
              >
                <Save size={18} />
                ENREGISTRER
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(user.wishlist ?? []).map((item, i) => (
                <motion.span
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  className="bg-white border border-slate-100 px-5 py-3 rounded-2xl text-sm font-bold text-slate-600 shadow-sm flex items-center gap-2"
                >
                  <span className="text-base leading-none">🎁</span>
                  {item}
                </motion.span>
              ))}
            </div>
          )}
        </motion.section>

        {/* Socials & Settings */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-slate-900">Connexions</h3>
            <button 
              onClick={toggleEdit}
              className="text-xs font-black text-sky-500 uppercase tracking-widest"
            >
              {isEditingSocials ? 'Annuler' : 'Modifier'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {isEditingSocials ? (
              <motion.div 
                key="edit-socials"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-[2rem] p-6 border border-black/60 space-y-4 overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Instagram</label>
                    <input 
                      type="text" 
                      placeholder="@pseudo"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-rose-300 transition-colors"
                      value={socials.instagram || ''}
                      onChange={e => setSocials({ ...socials, instagram: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Twitter / X</label>
                    <input 
                      type="text" 
                      placeholder="@pseudo"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-sky-300 transition-colors"
                      value={socials.twitter || ''}
                      onChange={e => setSocials({ ...socials, twitter: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Facebook</label>
                    <input 
                      type="text" 
                      placeholder="Nom complet"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-blue-300 transition-colors"
                      value={socials.facebook || ''}
                      onChange={e => setSocials({ ...socials, facebook: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Snapchat</label>
                    <input 
                      type="text" 
                      placeholder="pseudo"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-amber-300 transition-colors"
                      value={socials.snapchat || ''}
                      onChange={e => setSocials({ ...socials, snapchat: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">TikTok</label>
                    <input 
                      type="text" 
                      placeholder="@pseudo"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-black transition-colors"
                      value={socials.tiktok || ''}
                      onChange={e => setSocials({ ...socials, tiktok: e.target.value })}
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSaveSocials}
                  disabled={saving}
                  className="w-full bg-rose-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-100 hover:bg-rose-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'ENREGISTREMENT...' : (
                    <>
                      <Save size={18} />
                      ENREGISTRER
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="view-socials"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {user.socials.instagram && (
                  <a href={SOCIAL_URL.instagram(user.socials.instagram)} target="_blank" rel="noopener noreferrer" className="w-full bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-100">
                        <Instagram size={24} />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Instagram</p>
                        <p className="font-bold text-slate-900">@{user.socials.instagram}</p>
                      </div>
                    </div>
                    <ExternalLink size={18} className="text-slate-300 group-hover:text-rose-400 transition-colors" />
                  </a>
                )}

                {user.socials.twitter && (
                  <a href={SOCIAL_URL.twitter(user.socials.twitter)} target="_blank" rel="noopener noreferrer" className="w-full bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-sky-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-100">
                        <Twitter size={24} />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Twitter / X</p>
                        <p className="font-bold text-slate-900">@{user.socials.twitter}</p>
                      </div>
                    </div>
                    <ExternalLink size={18} className="text-slate-300 group-hover:text-sky-400 transition-colors" />
                  </a>
                )}

                {user.socials.facebook && (
                  <a href={SOCIAL_URL.facebook(user.socials.facebook)} target="_blank" rel="noopener noreferrer" className="w-full bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                        <Facebook size={24} />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Facebook</p>
                        <p className="font-bold text-slate-900">{user.socials.facebook}</p>
                      </div>
                    </div>
                    <ExternalLink size={18} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </a>
                )}

                {user.socials.snapchat && (
                  <a href={SOCIAL_URL.snapchat(user.socials.snapchat)} target="_blank" rel="noopener noreferrer" className="w-full bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-amber-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-100">
                        <Ghost size={24} />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Snapchat</p>
                        <p className="font-bold text-slate-900">{user.socials.snapchat}</p>
                      </div>
                    </div>
                    <ExternalLink size={18} className="text-slate-300 group-hover:text-amber-400 transition-colors" />
                  </a>
                )}

                {user.socials.tiktok && (
                  <a href={SOCIAL_URL.tiktok(user.socials.tiktok)} target="_blank" rel="noopener noreferrer" className="w-full bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-slate-400 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
                        <Smartphone size={24} />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">TikTok</p>
                        <p className="font-bold text-slate-900">@{user.socials.tiktok}</p>
                      </div>
                    </div>
                    <ExternalLink size={18} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                  </a>
                )}
                
                <button className="w-full bg-slate-900 p-5 rounded-[2rem] flex items-center justify-between group hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                      <Settings size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Préférences</p>
                      <p className="font-bold text-white">Paramètres du compte</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-white/20 group-hover:text-white transition-colors" />
                </button>

                <div className="w-full bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between gap-3">
                  <button
                    onClick={() => { setBgPassword(''); setBgStatus(null); setShowBgModal(true); }}
                    className="flex items-center gap-4 flex-1 text-left group"
                  >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-100 shrink-0">
                      🎨
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Personnalisation</p>
                      <p className="font-bold text-slate-900">
                        Fond d'écran {gigiBgActive && <span className="text-[10px] font-black text-emerald-500 ml-1">● ACTIF</span>}
                      </p>
                    </div>
                  </button>
                  {gigiBgActive && (
                    <button
                      onClick={() => {
                        localStorage.setItem('gigiBg', 'false');
                        setGigiBgActive(false);
                        window.dispatchEvent(new CustomEvent('gigiBgChange', { detail: false }));
                      }}
                      className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-black text-rose-500 border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                </div>

                {/* Dark mode toggle */}
                <div className="w-full bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 shadow-sm"
                      style={{ background: darkModeActive ? '#1e293b' : '#f8fafc' }}>
                      {darkModeActive
                        ? <Moon size={22} className="text-sky-300" />
                        : <Sun size={22} className="text-amber-400" />
                      }
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Apparence</p>
                      <p className="font-bold text-slate-900">{darkModeActive ? 'Mode sombre' : 'Mode clair'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !darkModeActive;
                      localStorage.setItem('darkMode', String(next));
                      setDarkModeActive(next);
                      window.dispatchEvent(new CustomEvent('darkModeChange', { detail: next }));
                    }}
                    className="relative w-12 h-6 rounded-full transition-colors duration-300 shrink-0"
                    style={{ background: darkModeActive ? '#6366f1' : '#e2e8f0' }}
                    aria-label="Basculer le mode sombre"
                  >
                    <motion.div
                      animate={{ x: darkModeActive ? 24 : 2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                    />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Sign out */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pb-4"
        >
          <motion.button
            onClick={() => signOut(auth)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold"
            style={{
              color: '#FF4B4B',
              border: '2px solid #FF4B4B',
              background: 'transparent',
            }}
          >
            <LogOut size={20} />
            Se déconnecter
          </motion.button>
        </motion.div>

      </div>

      {/* Easter egg — Fond d'écran modal */}
      <AnimatePresence>
        {showBgModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6"
          >
            <motion.div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowBgModal(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="relative w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl space-y-4"
              style={{ border: '2px solid #FF4B4B', boxShadow: '0 6px 0 #CC2E2E' }}
            >
              <button onClick={() => setShowBgModal(false)} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                <X size={14} className="text-slate-500" />
              </button>

              <div className="text-center space-y-1">
                <p className="text-3xl">🎨</p>
                <h3 className="font-black text-slate-900 text-base">
                  {gigiBgActive ? 'Désactiver le fond ?' : 'Activer le fond d\'écran'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">Entre le mot de passe secret</p>
              </div>

              <AnimatePresence mode="wait">
                {bgStatus === 'success' ? (
                  <motion.p key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm font-black text-emerald-500">
                    {gigiBgActive ? '🎉 Fond d\'écran activé !' : '✅ Fond d\'écran désactivé'}
                  </motion.p>
                ) : bgStatus === 'error' ? (
                  <motion.p key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm font-black text-rose-500">
                    ❌ Mot de passe incorrect
                  </motion.p>
                ) : (
                  <motion.div key="input" className="space-y-3">
                    <input
                      type="password"
                      value={bgPassword}
                      onChange={e => setBgPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleBgPassword()}
                      placeholder="Mot de passe..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-bold text-center focus:outline-none focus:border-rose-400 transition-colors"
                      autoFocus
                    />
                    <button
                      onClick={handleBgPassword}
                      disabled={!bgPassword}
                      className="w-full py-3 rounded-2xl font-black text-white text-sm disabled:opacity-40 transition-opacity"
                      style={{ background: '#FF4B4B', boxShadow: '0 3px 0 #CC2E2E' }}
                    >
                      VALIDER
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
