import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, UserPlus, X, Check } from 'lucide-react';
import { Birthday, ZodiacSign } from '../types';
import { getZodiacSign } from '../utils/gameLogic';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ScannedProfile {
  id: string;
  name: string;
  birthDate: string;
  zodiac?: string;
  photoUrl?: string;
  socials?: {
    instagram?: string;
    snapchat?: string;
    tiktok?: string;
    twitter?: string;
    facebook?: string;
  };
}

const VALID_ZODIACS: ZodiacSign[] = [
  'Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge',
  'Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons',
];

const ZODIAC_EMOJI: Record<ZodiacSign, string> = {
  'Bélier':'♈','Taureau':'♉','Gémeaux':'♊','Cancer':'♋',
  'Lion':'♌','Vierge':'♍','Balance':'♎','Scorpion':'♏',
  'Sagittaire':'♐','Capricorne':'♑','Verseau':'♒','Poissons':'♓',
};

const SOCIAL_LABELS: Record<string, string> = {
  instagram: '📸 Instagram',
  snapchat:  '👻 Snapchat',
  tiktok:    '🎵 TikTok',
  twitter:   '🐦 Twitter',
  facebook:  '👤 Facebook',
};

const SOCIAL_URL: Record<string, (u: string) => string> = {
  instagram: u => `https://instagram.com/${u.replace(/^@/, '')}`,
  twitter:   u => `https://x.com/${u.replace(/^@/, '')}`,
  facebook:  u => `https://facebook.com/${u.replace(/^@/, '')}`,
  snapchat:  u => `https://snapchat.com/add/${u.replace(/^@/, '')}`,
  tiktok:    u => `https://tiktok.com/@${u.replace(/^@/, '')}`,
  linkedin:  u => `https://linkedin.com/in/${u.replace(/^@/, '')}`,
};

// Particles spread across the dark overlay area, outside the scan square
const PARTICLES: { x: string; y: string; size: number; duration: number; delay: number; rise: number; color: string; glow: string }[] = [
  // Red — top area
  { x: '8%',  y: '6%',  size: 6, duration: 2.2, delay: 0.0, rise: 16, color: '#FF4B4B', glow: 'rgba(255,75,75,0.9)'  },
  { x: '25%', y: '10%', size: 5, duration: 1.9, delay: 0.7, rise: 12, color: '#FF4B4B', glow: 'rgba(255,75,75,0.9)'  },
  { x: '45%', y: '4%',  size: 7, duration: 2.5, delay: 0.3, rise: 18, color: '#FF4B4B', glow: 'rgba(255,75,75,0.9)'  },
  { x: '82%', y: '14%', size: 6, duration: 1.8, delay: 0.5, rise: 15, color: '#FF4B4B', glow: 'rgba(255,75,75,0.9)'  },
  { x: '15%', y: '22%', size: 5, duration: 2.1, delay: 0.9, rise: 14, color: '#FF4B4B', glow: 'rgba(255,75,75,0.9)'  },
  // Red — bottom area
  { x: '12%', y: '78%', size: 6, duration: 2.2, delay: 0.6, rise: 16, color: '#FF4B4B', glow: 'rgba(255,75,75,0.9)'  },
  { x: '50%', y: '75%', size: 7, duration: 2.6, delay: 0.4, rise: 18, color: '#FF4B4B', glow: 'rgba(255,75,75,0.9)'  },
  { x: '88%', y: '73%', size: 6, duration: 1.8, delay: 0.8, rise: 14, color: '#FF4B4B', glow: 'rgba(255,75,75,0.9)'  },
  { x: '75%', y: '86%', size: 5, duration: 2.1, delay: 1.5, rise: 15, color: '#FF4B4B', glow: 'rgba(255,75,75,0.9)'  },
  // Red — sides
  { x: '4%',  y: '42%', size: 6, duration: 2.0, delay: 0.3, rise: 14, color: '#FF4B4B', glow: 'rgba(255,75,75,0.9)'  },
  { x: '93%', y: '38%', size: 6, duration: 2.2, delay: 0.6, rise: 15, color: '#FF4B4B', glow: 'rgba(255,75,75,0.9)'  },
  // Gold — top area
  { x: '35%', y: '12%', size: 5, duration: 2.3, delay: 0.4, rise: 13, color: '#FFD700', glow: 'rgba(255,215,0,0.9)'  },
  { x: '60%', y: '7%',  size: 6, duration: 2.0, delay: 1.1, rise: 17, color: '#FFD700', glow: 'rgba(255,215,0,0.9)'  },
  { x: '90%', y: '18%', size: 5, duration: 1.7, delay: 1.8, rise: 11, color: '#FFAA00', glow: 'rgba(255,170,0,0.9)'  },
  { x: '20%', y: '5%',  size: 4, duration: 2.4, delay: 0.9, rise: 14, color: '#FFD700', glow: 'rgba(255,215,0,0.9)'  },
  // Gold — bottom area
  { x: '30%', y: '83%', size: 5, duration: 1.9, delay: 1.2, rise: 13, color: '#FFD700', glow: 'rgba(255,215,0,0.9)'  },
  { x: '68%', y: '79%', size: 6, duration: 2.0, delay: 0.3, rise: 16, color: '#FFAA00', glow: 'rgba(255,170,0,0.9)'  },
  { x: '20%', y: '89%', size: 4, duration: 2.3, delay: 0.1, rise: 12, color: '#FFD700', glow: 'rgba(255,215,0,0.9)'  },
  { x: '82%', y: '85%', size: 5, duration: 2.1, delay: 1.6, rise: 14, color: '#FFD700', glow: 'rgba(255,215,0,0.9)'  },
  // Gold — sides
  { x: '7%',  y: '58%', size: 5, duration: 2.4, delay: 1.0, rise: 13, color: '#FFD700', glow: 'rgba(255,215,0,0.9)'  },
  { x: '94%', y: '54%', size: 5, duration: 1.9, delay: 1.3, rise: 12, color: '#FFAA00', glow: 'rgba(255,170,0,0.9)'  },
];

export function Scanner({ onScan, onScanSuccess, existingBirthdays = [] }: {
  onScan: (birthday: Birthday) => void;
  onScanSuccess?: () => void;
  existingBirthdays?: Birthday[];
}) {
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<ScannedProfile | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const isPaused   = useRef(false);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3500);
  };

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      },
      false
    );

    scanner.render(
      (decodedText) => {
        if (isPaused.current) return;

        let profile: ScannedProfile;
        try {
          profile = JSON.parse(decodedText);
        } catch {
          showError('QR code invalide — format non reconnu.');
          return;
        }

        if (!profile.id || !profile.name || !profile.birthDate) {
          showError('QR code incomplet — données manquantes.');
          return;
        }

        const alreadyExists = existingBirthdays.some(
          b => b.id === profile.id || b.name === profile.name
        );
        if (alreadyExists) {
          showError(`${profile.name} est déjà dans ta collection !`);
          return;
        }

        isPaused.current = true;
        setPending(profile);
      },
      () => {}
    );

    scannerRef.current = scanner;
    return () => {
      scannerRef.current?.clear().catch(() => {});
    };
  }, []);

  const handleConfirm = () => {
    if (!pending) return;

    const zodiac: ZodiacSign = pending.zodiac && (VALID_ZODIACS as string[]).includes(pending.zodiac)
      ? pending.zodiac as ZodiacSign
      : getZodiacSign(new Date(pending.birthDate));

    const birthday: Birthday = {
      id:        pending.id,
      name:      pending.name,
      birthDate: pending.birthDate,
      zodiac,
      photoUrl:  pending.photoUrl,
      socials:   pending.socials,
      addedAt:   new Date().toISOString(),
    };

    onScan(birthday);
    onScanSuccess?.();
    setSuccess(`🎉 ${pending.name} a été ajouté à tes amis !`);
    setTimeout(() => setSuccess(null), 3000);
    setPending(null);
    isPaused.current = false;
  };

  const handleCancel = () => {
    setPending(null);
    isPaused.current = false;
  };

  const zodiac = pending?.zodiac && (VALID_ZODIACS as string[]).includes(pending.zodiac)
    ? pending.zodiac as ZodiacSign
    : pending ? getZodiacSign(new Date(pending.birthDate)) : null;

  const activeSocials = pending?.socials
    ? Object.entries(pending.socials).filter(([, v]) => v)
    : [];

  return (
    <div className="flex-1 bg-slate-900 relative flex flex-col overflow-hidden">

      {/* Force html5-qrcode video to fill its container, remove all library chrome */}
      <style>{`
        #reader {
          position: relative !important;
          background: #0f172a !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        #reader > * { margin: 0 !important; padding: 0 !important; }
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
        }
        #reader__scan_region {
          width: 100% !important;
          height: 100% !important;
          background: #0f172a !important;
          border: none !important;
          min-height: unset !important;
        }
        #reader__scan_region img { display: none !important; }
        #reader__dashboard { display: none !important; }
        #reader__header_message { display: none !important; }
        #reader__status_span { display: none !important; }
      `}</style>

      {/* Scanner */}
      <div id="reader" className="w-full" style={{ height: '60vh', minHeight: '60vh', background: '#0f172a' }} />

      {/* Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">

        {/* Particles in the dark area — rendered above the overlay, spread around the square */}
        {PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full z-20"
            style={{
              width: p.size,
              height: p.size,
              background: p.color,
              left: p.x,
              top: p.y,
              boxShadow: `0 0 10px 3px ${p.glow}, 0 0 22px 6px ${p.glow.replace('0.9', '0.35')}`,
            }}
            animate={{ opacity: [0, 1, 0], y: [0, -p.rise, 0], scale: [0.4, 1, 0.4] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          />
        ))}

        <div className="flex-1 bg-black/60" />
        <div className="flex">
          <div className="flex-1 bg-black/60 self-stretch" />

          {/* Scan frame */}
          <div
            className="w-64 h-64 relative"
            style={{ boxShadow: '0 0 40px rgba(255,75,75,0.4), 0 0 80px rgba(255,75,75,0.2)' }}
          >
            {/* Corner reticle — top-left */}
            <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-[#FF4B4B]" />
            {/* Corner reticle — top-right */}
            <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-[#FF4B4B]" />
            {/* Corner reticle — bottom-left */}
            <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-[#FF4B4B]" />
            {/* Corner reticle — bottom-right */}
            <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-[#FF4B4B]" />

            {/* Scanning line */}
            <motion.div
              animate={{ top: ['2%', '94%', '2%'] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-0 right-0 h-[2px]"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, #FF4B4B 25%, #ff6b6b 50%, #FF4B4B 75%, transparent 100%)',
                boxShadow: '0 0 10px 3px rgba(255,75,75,0.65)',
              }}
            />
          </div>

          <div className="flex-1 bg-black/60 self-stretch" />
        </div>
        <div className="flex-1 bg-black/60 flex flex-col items-center justify-start pt-6 px-8">
          <p className="text-white text-center" style={{ fontSize: 18, fontWeight: 600 }}>
            Place le QR Code dans le cadre rose
          </p>
        </div>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-36 left-6 right-6 bg-emerald-500/90 backdrop-blur-md p-4 rounded-2xl text-white text-sm font-bold flex items-center gap-3 z-30"
          >
            <Check size={20} />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-6 right-6 bg-rose-500/90 backdrop-blur-md p-4 rounded-2xl text-white text-sm font-bold flex items-center gap-3 z-30"
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview modal */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full bg-white rounded-t-3xl p-6 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Profil scanné
                </p>
                <button onClick={handleCancel} className="p-1 rounded-full bg-slate-100">
                  <X size={16} className="text-slate-500" />
                </button>
              </div>

              {/* Profile card */}
              <div className="flex items-center gap-4">
                {pending.photoUrl ? (
                  <img
                    src={pending.photoUrl}
                    alt={pending.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-rose-400 flex items-center justify-center text-white text-2xl font-black border-2 border-rose-200">
                    {pending.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-black text-slate-900">{pending.name}</h3>
                  <p className="text-sm font-medium text-rose-400">
                    {format(parseISO(pending.birthDate), 'd MMMM yyyy', { locale: fr })}
                  </p>
                  {zodiac && (
                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                      {ZODIAC_EMOJI[zodiac]} {zodiac}
                    </p>
                  )}
                </div>
              </div>

              {/* Socials */}
              {activeSocials.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeSocials.map(([key, val]) => {
                    const url = SOCIAL_URL[key]?.(val as string);
                    return url ? (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        {SOCIAL_LABELS[key] ?? key} {val}
                      </a>
                    ) : (
                      <span
                        key={key}
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600"
                      >
                        {SOCIAL_LABELS[key] ?? key} {val}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-slate-500 bg-slate-100 text-sm"
                >
                  Annuler
                </button>
                <motion.button
                  onClick={handleConfirm}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
                  style={{ background: '#FF4B4B', boxShadow: '0 4px 16px rgba(255,75,75,0.3)' }}
                >
                  <UserPlus size={18} />
                  Ajouter
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
