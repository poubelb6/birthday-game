import { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Sparkles, ArrowRight } from 'lucide-react';
import { UserProfile, ZodiacSign } from '../types';
import { getZodiacSign } from '../utils/gameLogic';
import { auth } from '../firebase';
import { Logo } from '../components/Logo';

export function Onboarding({ onComplete }: { onComplete: (user: UserProfile) => void }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [wishlistInput, setWishlistInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    instagram: '',
    twitter: '',
    facebook: '',
    snapchat: '',
    tiktok: '',
    wishlist: [] as string[],
  });

  const handleNext = async () => {
    if (step === 1 && (!formData.name || !formData.birthDate)) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (step < 3) setStep(step + 1);
    else {
      setSubmitting(true);
      try {
        const birthDate = new Date(formData.birthDate);
        const user: UserProfile = {
          id: auth.currentUser?.uid || Math.random().toString(36).substr(2, 9),
          name: formData.name,
          birthDate: formData.birthDate,
          socials: { 
            instagram: formData.instagram,
            twitter: formData.twitter,
            facebook: formData.facebook,
            snapchat: formData.snapchat,
            tiktok: formData.tiktok,
          },
          wishlist: formData.wishlist,
          zodiac: getZodiacSign(birthDate),
          xp: 0,
          level: 1,
          collectedCards: [],
        };
        await onComplete(user);
      } catch (e) {
        setSubmitting(false);
      }
    }
  };

  const TOTAL_STEPS = 3;
  const stepLabels = ['Ton profil', 'Tes réseaux', 'Ta wishlist'];

  return (
    <div className="min-h-screen bg-rose-400 flex flex-col max-w-md mx-auto text-white p-8">

      {/* Barre de progression */}
      <div className="pt-10 pb-6 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-white/70 text-xs font-bold uppercase tracking-widest">
            {stepLabels[step - 1]}
          </span>
          <span className="text-white/70 text-xs font-bold uppercase tracking-widest">
            {step}/{TOTAL_STEPS}
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: `${((step - 1) / TOTAL_STEPS) * 100}%` }}
            animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Logo size={64} className="mb-4" />
                <h2 className="font-display text-4xl font-black tracking-tight leading-none">BIENVENUE DANS LE JEU.</h2>
                <p className="text-rose-100 text-lg">Crée ton profil pour commencer à collectionner les anniversaires.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Ton nom"
                    className={`w-full bg-white/10 border-2 rounded-2xl p-4 text-white placeholder:text-white/50 focus:outline-none focus:border-white transition-colors ${showErrors && !formData.name ? 'border-white' : 'border-white/20'}`}
                    value={formData.name}
                    onChange={e => { setFormData({ ...formData, name: e.target.value }); setShowErrors(false); }}
                  />
                  {showErrors && !formData.name && (
                    <p className="text-white/80 text-xs font-bold px-1">Champ requis</p>
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    type="date"
                    className={`w-full bg-white/10 border-2 rounded-2xl p-4 text-white focus:outline-none focus:border-white transition-colors ${showErrors && !formData.birthDate ? 'border-white' : 'border-white/20'}`}
                    value={formData.birthDate}
                    onChange={e => { setFormData({ ...formData, birthDate: e.target.value }); setShowErrors(false); }}
                  />
                  {showErrors && !formData.birthDate && (
                    <p className="text-white/80 text-xs font-bold px-1">Champ requis</p>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-tight leading-none">TES RÉSEAUX.</h2>
                <p className="text-rose-100 text-lg">Permets à tes amis de te retrouver facilement.</p>
                <p className="text-white/50 text-sm">Tous les champs sont optionnels — tu pourras les ajouter plus tard.</p>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Instagram (ex: @tonpseudo)"
                  className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-4 text-white placeholder:text-white/50 focus:outline-none focus:border-white transition-colors"
                  value={formData.instagram}
                  onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="TikTok (ex: @tonpseudo)"
                  className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-4 text-white placeholder:text-white/50 focus:outline-none focus:border-white transition-colors"
                  value={formData.tiktok}
                  onChange={e => setFormData({ ...formData, tiktok: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Snapchat (ex: pseudo)"
                  className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-4 text-white placeholder:text-white/50 focus:outline-none focus:border-white transition-colors"
                  value={formData.snapchat}
                  onChange={e => setFormData({ ...formData, snapchat: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Twitter / X (ex: @tonpseudo)"
                  className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-4 text-white placeholder:text-white/50 focus:outline-none focus:border-white transition-colors"
                  value={formData.twitter}
                  onChange={e => setFormData({ ...formData, twitter: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Facebook (ex: Ton Nom)"
                  className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-4 text-white placeholder:text-white/50 focus:outline-none focus:border-white transition-colors"
                  value={formData.facebook}
                  onChange={e => setFormData({ ...formData, facebook: e.target.value })}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-tight leading-none">TA WISHLIST.</h2>
                <p className="text-rose-100 text-lg">Qu'est-ce qui te ferait plaisir ?</p>
                <p className="text-white/50 text-sm">Optionnel — tu pourras la compléter plus tard.</p>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Lego, Voyage, Chocolat..."
                    className="flex-1 bg-white/10 border-2 border-white/20 rounded-2xl px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-white transition-colors"
                    value={wishlistInput}
                    onChange={e => setWishlistInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && wishlistInput.trim()) {
                        e.preventDefault();
                        setFormData(prev => ({ ...prev, wishlist: [...prev.wishlist, wishlistInput.trim()] }));
                        setWishlistInput('');
                      }
                    }}
                  />
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      if (!wishlistInput.trim()) return;
                      setFormData(prev => ({ ...prev, wishlist: [...prev.wishlist, wishlistInput.trim()] }));
                      setWishlistInput('');
                    }}
                    className="px-4 py-3 bg-white/20 rounded-2xl text-white font-black text-sm shrink-0"
                  >
                    + Ajouter
                  </motion.button>
                </div>
                {formData.wishlist.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.wishlist.map((item, i) => (
                      <span key={i} className="flex items-center gap-1.5 bg-white/20 text-white text-sm font-bold px-3 py-1.5 rounded-full">
                        {item}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, wishlist: prev.wishlist.filter((_, j) => j !== i) }))}
                          className="text-white/60 hover:text-white text-xs font-black leading-none"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>

      <button 
        onClick={handleNext}
        disabled={submitting}
        className="w-full bg-white text-rose-400 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-rose-500/20"
      >
        {submitting ? 'CHARGEMENT...' : step === 3 ? 'TERMINER' : 'CONTINUER'}
        {!submitting && <ArrowRight size={20} />}
      </button>
    </div>
  );
}
