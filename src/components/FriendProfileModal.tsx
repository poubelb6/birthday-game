import React from 'react';
import { formatZodiac } from '../utils/zodiac';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, Edit2, ExternalLink } from 'lucide-react';
import { Birthday } from '../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Real social logo SVGs ──────────────────────────────────────────────────────

function InstagramLogo() {
  return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shadow-rose-100 shrink-0"
      style={{ background: 'radial-gradient(circle at 30% 107%, #ffd879, #fda54c 25%, #e65c3b 50%, #c13584 75%, #833ab4)' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="white" strokeWidth="1.8"/>
        <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="1.8"/>
        <circle cx="17.5" cy="6.5" r="1.1" fill="white"/>
      </svg>
    </div>
  );
}

function TikTokLogo() {
  return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shadow-slate-200 shrink-0"
      style={{ background: '#010101' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
      </svg>
    </div>
  );
}

function XLogo() {
  return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shadow-slate-200 shrink-0"
      style={{ background: '#000000' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    </div>
  );
}

function SnapchatLogo() {
  return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shadow-yellow-100 shrink-0"
      style={{ background: '#FFFC00' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#000">
        <path d="M12 2C8.69 2 6 4.69 6 8v3.17l-1.76 2.64a.5.5 0 0 0 .42.77H6c.18 1.1 1.05 1.96 2.15 2.18.18.5.65.84 1.35 1.01.28.41.9.73 2.5.73s2.22-.32 2.5-.73c.7-.17 1.17-.51 1.35-1.01A2.5 2.5 0 0 0 18 13.58h1.34a.5.5 0 0 0 .42-.77L18 10.17V8c0-3.31-2.69-6-6-6z"/>
      </svg>
    </div>
  );
}

function FacebookLogo() {
  return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shadow-blue-100 shrink-0"
      style={{ background: '#1877F2' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M13 2.05V5h2a1 1 0 0 1 1 1v2.5h-3V11h3v10h-3.5V11H10V8.5h2.5V5.6A3.6 3.6 0 0 1 16.1 2H13z"/>
      </svg>
    </div>
  );
}

function LinkedInLogo() {
  return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shadow-blue-100 shrink-0"
      style={{ background: '#0A66C2' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S.02 4.88.02 3.5 1.13 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5H4.5V22H.5V8.5zM8.5 8.5h3.8v1.85h.05c.53-1 1.83-2.05 3.76-2.05 4.02 0 4.76 2.65 4.76 6.1V22H17V15.2c0-1.6-.03-3.66-2.23-3.66-2.23 0-2.57 1.74-2.57 3.55V22H8.5V8.5z"/>
      </svg>
    </div>
  );
}

const SOCIAL_LOGO: Record<string, React.ReactElement> = {
  instagram: <InstagramLogo />,
  tiktok:    <TikTokLogo />,
  twitter:   <XLogo />,
  snapchat:  <SnapchatLogo />,
  facebook:  <FacebookLogo />,
  linkedin:  <LinkedInLogo />,
};

const SOCIAL_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  tiktok:    'TikTok',
  twitter:   'Twitter / X',
  snapchat:  'Snapchat',
  facebook:  'Facebook',
  linkedin:  'LinkedIn',
};

const SOCIAL_URL: Record<string, (u: string) => string> = {
  instagram: u => `https://instagram.com/${u.replace(/^@/, '')}`,
  twitter:   u => `https://x.com/${u.replace(/^@/, '')}`,
  facebook:  u => `https://facebook.com/${u.replace(/^@/, '')}`,
  snapchat:  u => `https://snapchat.com/add/${u.replace(/^@/, '')}`,
  tiktok:    u => `https://tiktok.com/@${u.replace(/^@/, '')}`,
  linkedin:  u => `https://linkedin.com/in/${u.replace(/^@/, '')}`,
};

// Deep links — ouvrent directement l'app si installée
const SOCIAL_DEEP_LINK: Record<string, (u: string) => string> = {
  instagram: u => `instagram://user?username=${u.replace(/^@/, '')}`,
  twitter:   u => `twitter://user?screen_name=${u.replace(/^@/, '')}`,
  snapchat:  u => `snapchat://add/${u.replace(/^@/, '')}`,
  tiktok:    u => `tiktok://user/@${u.replace(/^@/, '')}`,
  facebook:  u => `fb://facewebmodal/f?href=https://facebook.com/${u.replace(/^@/, '')}`,
  linkedin:  u => `linkedin://in/${u.replace(/^@/, '')}`,
};

// Tente le deep link, bascule sur navigateur si l'app n'est pas installée
function openSocialLink(network: string, username: string) {
  const deepLink    = SOCIAL_DEEP_LINK[network]?.(username);
  const browserUrl  = SOCIAL_URL[network]?.(username);
  if (!browserUrl) return;

  // Pas de deep link défini → navigateur direct
  if (!deepLink) { window.open(browserUrl, '_blank'); return; }

  let appOpened = false;

  const onVisibilityChange = () => {
    if (document.hidden) {
      appOpened = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);

  // Tente d'ouvrir l'app
  window.location.href = deepLink;

  // Fallback navigateur après 1.5s si l'app n'a pas pris la main
  const timer = setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (!appOpened) window.open(browserUrl, '_blank');
  }, 1500);
}

const SOCIAL_HOVER: Record<string, string> = {
  instagram: 'hover:border-rose-200',
  tiktok:    'hover:border-slate-300',
  twitter:   'hover:border-slate-300',
  snapchat:  'hover:border-yellow-200',
  facebook:  'hover:border-blue-200',
  linkedin:  'hover:border-blue-200',
};

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  friend: Birthday | null;
  hasAccount: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function FriendProfileModal({ friend, hasAccount, onClose, onEdit }: Props) {
  if (!friend) return null;

  const filledSocials = friend.socials
    ? Object.entries(friend.socials).filter(([, v]) => v)
    : [];

  const allSocialKeys = ['instagram', 'tiktok', 'twitter', 'snapchat', 'facebook'];
  const hasSomeSocial = filledSocials.length > 0;
  const hasWishlist = (friend.wishlist ?? []).length > 0;

  return (
    <AnimatePresence>
      {friend && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
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
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-center relative px-8 pt-8 pb-4 shrink-0">
              <h3 className="font-display text-xl font-black text-slate-900">{friend.name}</h3>
              <button onClick={onClose} className="absolute right-8 text-slate-500 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="space-y-4 overflow-y-auto px-8 pb-2 pr-7">

              {/* Photo + identity */}
              <div className="bg-slate-50 border border-black/60 rounded-2xl p-4 flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-black/10">
                    <img
                      src={friend.photoUrl || `https://picsum.photos/seed/${friend.id}/200/200`}
                      alt={friend.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {hasAccount && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-[8px]">✓</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-900 truncate">{friend.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {format(parseISO(friend.birthDate), 'd MMMM yyyy', { locale: fr })}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-500 border border-rose-100">{formatZodiac(friend.zodiac)}</span>
                    {hasAccount && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">🎮 Sur l'appli</span>}
                  </div>
                </div>
              </div>

              {/* Phone */}
              {friend.phone && (
                <a
                  href={`tel:${friend.phone}`}
                  className="w-full bg-slate-50 border border-black/60 rounded-2xl p-4 flex items-center gap-3 group hover:border-sky-400 transition-colors"
                >
                  <div className="w-9 h-9 bg-sky-50 border border-black/60 rounded-xl flex items-center justify-center shrink-0">
                    <Phone size={17} className="text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Téléphone</p>
                    <p className="font-bold text-slate-900 truncate">{friend.phone}</p>
                  </div>
                  <ExternalLink size={15} className="text-slate-300 group-hover:text-sky-400 transition-colors shrink-0" />
                </a>
              )}

              {/* Social networks */}
              {hasSomeSocial && (
                <div className="space-y-2">
                  {allSocialKeys
                    .filter(key => friend.socials?.[key as keyof typeof friend.socials])
                    .map(key => {
                      const val = friend.socials![key as keyof typeof friend.socials] as string;
                      const url = SOCIAL_URL[key]?.(val);
                      const label = ['instagram', 'tiktok', 'twitter'].includes(key)
                        ? `@${val.replace(/^@/, '')}`
                        : val;
                      const hoverClass = SOCIAL_HOVER[key] ?? 'hover:border-slate-400';
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => openSocialLink(key, val)}
                          className={`w-full bg-slate-50 border border-black/60 rounded-2xl p-4 flex items-center gap-3 group ${hoverClass} transition-colors`}
                        >
                          <div className="shrink-0 scale-75 origin-center">{SOCIAL_LOGO[key]}</div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">{SOCIAL_LABEL[key]}</p>
                            <p className="font-bold text-slate-900 truncate">{label}</p>
                          </div>
                          <ExternalLink size={15} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                        </button>
                      );
                    })}
                </div>
              )}

              {/* Wishlist */}
              {hasWishlist && (
                <div className="bg-slate-50 border border-black/60 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🎁 Wishlist</p>
                  <div className="flex flex-wrap gap-2">
                    {(friend.wishlist ?? []).map((item, i) => (
                      <span key={i} className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-2xl text-sm font-bold text-amber-800">
                        🎁 {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer buttons */}
            <div className="px-8 py-6 shrink-0">
              <button
                type="button"
                onClick={onEdit}
                className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-sky-100 hover:bg-sky-600 transition-all flex items-center justify-center gap-2"
              >
                <Edit2 size={16} />
                MODIFIER LE PROFIL
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
