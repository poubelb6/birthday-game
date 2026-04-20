import { useState, Fragment } from 'react';
import { motion } from 'motion/react';
import { Camera, Sparkles, ArrowRight, Check } from 'lucide-react';
import { UserProfile, ZodiacSign } from '../types';
import { getZodiacSign } from '../utils/gameLogic';
import { auth } from '../firebase';
import { Logo } from '../components/Logo';

const STEP_COLORS = [
  { bg: '#fb7185', btnText: 'text-rose-400',   subText: 'text-rose-100'   }, // Step 1 — rose
  { bg: '#8b5cf6', btnText: 'text-violet-500', subText: 'text-violet-100' }, // Step 2 — violet
  { bg: '#f59e0b', btnText: 'text-amber-500',  subText: 'text-amber-100'  }, // Step 3 — amber
];

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1929 }, (_, i) => CURRENT_YEAR - i);

const SELECT_CLASS = 'bg-white/10 border-2 border-white/20 rounded-2xl p-4 text-white appearance-none focus:outline-none focus:border-white transition-colors cursor-pointer';
const SELECT_ERROR_CLASS = 'bg-white/10 border-2 border-white rounded-2xl p-4 text-white appearance-none focus:outline-none focus:border-white transition-colors cursor-pointer';

export function Onboarding({ onComplete }: { onComplete: (user: UserProfile) => void }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [wishlistInput, setWishlistInput] = useState('');

  // Date selects state
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');

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

  const handleDateChange = (day: string, month: string, year: string) => {
    if (day && month && year) {
      const paddedDay = day.padStart(2, '0');
      const paddedMonth = month.padStart(2, '0');
      setFormData(prev => ({ ...prev, birthDate: `${year}-${paddedMonth}-${paddedDay}` }));
    } else {
      setFormData(prev => ({ ...prev, birthDate: '' }));
    }
    setShowErrors(false);
  };

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
  const color = STEP_COLORS[step - 1];
  const dateInvalid = showErrors && !formData.birthDate;

  return (
    <motion.div
      className="min-h-screen flex flex-col max-w-md mx-auto text-white p-8"
      animate={{ backgroundColor: color.bg }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      {/* Barre de progression immersive */}
      <div className="pb-6" style={{ paddingTop: 'max(env(safe-area-inset-top), 2.5rem)' }}>
        <div className="flex items-center">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < step;
            const isCurrent = stepNum === step;
            const isLast = i === stepLabels.length - 1;
            return (
              <Fragment key={i}>
                <motion.div
                  animate={{ scale: isCurrent ? 1.15 : 1 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border-2 shrink-0 transition-colors duration-500 ${
                    isCompleted ? 'bg-white border-white' :
                    isCurrent  ? 'bg-white/20 border-white' :
                                 'bg-transparent border-white/30'
                  }`}
                  style={{ color: isCompleted ? color.bg : 'white' }}
                >
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : stepNum}
                </motion.div>
                {!isLast && (
                  <div className="flex-1 mx-2 h-0.5 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white rounded-full"
                      animate={{ width: isCompleted ? '100%' : '0%' }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const isActive = stepNum <= step;
            const align = i === 0 ? 'text-left' : i === stepLabels.length - 1 ? 'text-right' : 'text-center';
            return (
              <span key={i} className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-500 ${isActive ? 'text-white' : 'text-white/35'} ${align}`}>
                {label}
              </span>
            );
          })}
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
                <p className={`${color.subText} text-lg`}>Crée ton profil pour commencer à collectionner les anniversaires.</p>
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

                {/* Sélecteur de date custom */}
                <div className="space-y-1">
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      className={dateInvalid ? SELECT_ERROR_CLASS : SELECT_CLASS}
                      value={birthDay}
                      onChange={e => { setBirthDay(e.target.value); handleDateChange(e.target.value, birthMonth, birthYear); }}
                    >
                      <option value="" className="text-slate-800">Jour</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={String(d)} className="text-slate-800">{d}</option>
                      ))}
                    </select>
                    <select
                      className={dateInvalid ? SELECT_ERROR_CLASS : SELECT_CLASS}
                      value={birthMonth}
                      onChange={e => { setBirthMonth(e.target.value); handleDateChange(birthDay, e.target.value, birthYear); }}
                    >
                      <option value="" className="text-slate-800">Mois</option>
                      {MONTHS.map((m, i) => (
                        <option key={i} value={String(i + 1)} className="text-slate-800">{m}</option>
                      ))}
                    </select>
                    <select
                      className={dateInvalid ? SELECT_ERROR_CLASS : SELECT_CLASS}
                      value={birthYear}
                      onChange={e => { setBirthYear(e.target.value); handleDateChange(birthDay, birthMonth, e.target.value); }}
                    >
                      <option value="" className="text-slate-800">Année</option>
                      {YEARS.map(y => (
                        <option key={y} value={String(y)} className="text-slate-800">{y}</option>
                      ))}
                    </select>
                  </div>
                  {dateInvalid && (
                    <p className="text-white/80 text-xs font-bold px-1">Date de naissance requise</p>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-tight leading-none">TES RÉSEAUX.</h2>
                <p className={`${color.subText} text-lg`}>Permets à tes amis de te retrouver facilement.</p>
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
                <p className={`${color.subText} text-lg`}>Qu'est-ce qui te ferait plaisir ?</p>
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

      <motion.button
        onClick={handleNext}
        disabled={submitting}
        whileTap={{ scale: 0.97 }}
        className={`w-full bg-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-black/10 ${color.btnText}`}
      >
        {submitting ? 'CHARGEMENT...' : step === 3 ? 'TERMINER' : 'CONTINUER'}
        {!submitting && <ArrowRight size={20} />}
      </motion.button>
    </motion.div>
  );
}
