import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Settings, Instagram, Gift, ChevronRight, Sparkles, Users, Trophy, ExternalLink, Copy, Twitter, Facebook, Save, X, Smartphone } from 'lucide-react';
import { UserProfile } from '../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function Profile({ user, onUpdate, birthdays = [], challenges = [] }: { user: UserProfile, onUpdate: (user: UserProfile) => Promise<void>, birthdays?: any[], challenges?: any[] }) {
  const [isEditingSocials, setIsEditingSocials] = useState(false);
  const [socials, setSocials] = useState(user.socials);
  const [saving, setSaving] = useState(false);
  const [isEditingWishlist, setIsEditingWishlist] = useState(false);
  const [wishlistText, setWishlistText] = useState(user.wishlist.join(', '));
  const [copied, setCopied] = useState(false);

  const toggleEdit = () => {
    if (!isEditingSocials) {
      setSocials(user.socials);
    }
    setIsEditingSocials(!isEditingSocials);
  };

  const profileData = JSON.stringify({
    id: user.id,
    name: user.name,
    birthDate: user.birthDate,
    zodiac: user.zodiac,
  });

  const completedChallenges = challenges.filter((c: any) => c.progress >= c.target).length;
  const stats = [
    { label: 'Amis', value: String(birthdays.length), icon: Users, color: 'text-sky-500', bg: 'bg-sky-50' },
    { label: 'Défis', value: String(completedChallenges), icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Cartes', value: String(user.collectedCards.length), icon: Sparkles, color: 'text-rose-500', bg: 'bg-rose-50' },
  ];

  const handleCopyQr = () => {
    navigator.clipboard.writeText(profileData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveWishlist = async () => {
    const newWishlist = wishlistText.split(',').map((s: string) => s.trim()).filter(Boolean);
    await onUpdate({ ...user, wishlist: newWishlist });
    setIsEditingWishlist(false);
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
const getZodiacEmoji = (zodiac: string) => {
  const emojis: Record<string, string> = {
    'Bélier': '♈', 'Taureau': '♉', 'Gémeaux': '♊',
    'Cancer': '♋', 'Lion': '♌', 'Vierge': '♍',
    'Balance': '♎', 'Scorpion': '♏', 'Sagittaire': '♐',
    'Capricorne': '♑', 'Verseau': '♒', 'Poissons': '♓'
  };
  return emojis[zodiac] || '⭐';
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
              <div className="w-28 h-28 bg-white p-2 rounded-[2rem] shadow-xl">
                <div className="w-full h-full bg-rose-400 rounded-[1.5rem] flex items-center justify-center text-white text-4xl font-black shadow-inner">
                  {user.name.charAt(0)}
                </div>
              </div>
              <motion.div 
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute bottom-1 right-1 bg-sky-400 p-2 rounded-xl text-white shadow-lg border-4 border-white"
              >
                <Sparkles size={16} />
              </motion.div>
            </div>
            
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
            <div className="absolute -inset-4 bg-sky-50 rounded-[3rem] scale-95 group-hover:scale-100 transition-transform duration-500" />
            <div className="relative p-4 bg-white rounded-[2rem] shadow-sm border border-slate-100">
              <QRCodeSVG 
                value={profileData} 
                size={160} 
                level="M" 
                includeMargin={true} 
                fgColor="#f43f5e" // rose-500
              />
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <button onClick={handleCopyQr} className="flex-1 bg-slate-50 text-slate-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
              <Copy size={18} />
              {copied ? 'COPIÉ ✓' : 'COPIER'}
            </button>
            <button onClick={() => navigator.share?.({ title: 'Birthday Game', text: profileData })} className="flex-1 bg-rose-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-100 hover:bg-rose-600 transition-colors">
              <Share2 size={18} />
              PARTAGER
            </button>
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
            <button onClick={() => { setWishlistText(user.wishlist.join(', ')); setIsEditingWishlist(!isEditingWishlist); }} className="text-xs font-black text-sky-500 uppercase tracking-widest">
              {isEditingWishlist ? 'Annuler' : 'Modifier'}
            </button>
          </div>
          {isEditingWishlist ? (
            <div className="space-y-3">
              <textarea
                value={wishlistText}
                onChange={e => setWishlistText(e.target.value)}
                placeholder="Lego, Chocolat, Voyage..."
                className="w-full bg-slate-50 border border-black/60 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-rose-400 transition-colors h-24 resize-none"
              />
              <button onClick={handleSaveWishlist} className="w-full bg-rose-500 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-100 hover:bg-rose-600 transition-colors">
                <Save size={18} />
                ENREGISTRER
              </button>
            </div>
          ) : (
          <div className="flex flex-wrap gap-2">
            {user.wishlist.map((item, i) => (
              <motion.span 
                key={i} 
                whileHover={{ scale: 1.05 }}
                className="bg-white border border-slate-100 px-5 py-3 rounded-2xl text-sm font-bold text-slate-600 shadow-sm flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
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
                  <button className="w-full bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-colors">
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
                  </button>
                )}

                {user.socials.twitter && (
                  <button className="w-full bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-sky-200 transition-colors">
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
                  </button>
                )}

                {user.socials.facebook && (
                  <button className="w-full bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
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
                  </button>
                )}

                {user.socials.snapchat && (
                  <button className="w-full bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-amber-200 transition-colors">
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
                  </button>
                )}

                {user.socials.tiktok && (
                  <button className="w-full bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-slate-400 transition-colors">
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
                  </button>
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
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
    </div>
  );
}
