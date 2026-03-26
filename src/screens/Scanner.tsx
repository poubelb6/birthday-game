import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion } from 'motion/react';
import { X, Camera, Zap, AlertCircle } from 'lucide-react';
import { Birthday } from '../types';

export function Scanner({ onScan, existingBirthdays = [] }: { onScan: (birthday: Birthday) => void, existingBirthdays?: Birthday[] }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        try {
          const profile = JSON.parse(decodedText);
          if (profile.id && profile.name && profile.birthDate) {
            const alreadyExists = existingBirthdays.some(b => b.id === profile.id || b.name === profile.name);
            if (alreadyExists) {
              setError(`${profile.name} est déjà dans ta collection !`);
              setTimeout(() => setError(null), 3000);
              return;
            }
            const birthday: Birthday = {
              id: profile.id,
              name: profile.name,
              birthDate: profile.birthDate,
              zodiac: profile.zodiac || "Inconnu",
              addedAt: new Date().toISOString(),
            };
            onScan(birthday);
            setSuccess(`${profile.name} ajouté à ta collection ! 🎉`);
            setTimeout(() => setSuccess(null), 3000);
            scanner.clear();
          }
        } catch (e) {
          console.error('Invalid QR code format', e);
        }
      },
      (errorMessage) => {
        // Just log, don't show to user as it's very frequent
        // console.warn(errorMessage);
      }
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [onScan]);

  return (
    <div className="h-full bg-slate-900 relative flex flex-col overflow-hidden">
      {/* Scanner Container */}
      <div id="reader" className="w-full h-full"></div>

      {/* Custom Overlay for better UX */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
        <div className="flex-1 bg-black/60" />
        <div className="flex">
          <div className="flex-1 bg-black/60" />
          <div className="w-64 h-64 border-4 border-rose-400 rounded-3xl relative">
            <motion.div 
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-rose-400 shadow-[0_0_15px_rgba(244,114,182,0.8)]"
            />
          </div>
          <div className="flex-1 bg-black/60" />
        </div>
        <div className="flex-1 bg-black/60 flex flex-col items-center justify-center p-8">
          <p className="text-white font-bold text-center text-sm">
            Place le QR Code dans le cadre rose
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="absolute bottom-36 left-6 right-6 bg-emerald-500/90 backdrop-blur-md p-4 rounded-2xl text-white text-sm font-bold flex items-center gap-3 z-30">
          <span>✓ {success}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute bottom-24 left-6 right-6 bg-rose-500/90 backdrop-blur-md p-4 rounded-2xl text-white text-sm font-bold flex items-center gap-3 z-30">
          <AlertCircle size={20} />
          <span>Erreur : {error}</span>
        </div>
      )}
    </div>
  );
}
