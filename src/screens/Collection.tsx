import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy } from 'lucide-react';
import { UserProfile, Birthday, CardRarity } from '../types';
import { CARDS, checkUnlockedCards } from '../utils/gameLogic';

const RARITY_STYLES: Record<CardRarity, { border: string; footer: string; cornerColor: string }> = {
  Commun:     { border: 'var(--rarity-commun-border)', footer: 'var(--rarity-commun-footer)', cornerColor: 'var(--rarity-commun-border)' },
  Rare:       { border: 'var(--rarity-rare-border)',   footer: 'var(--rarity-rare-footer)',   cornerColor: 'var(--rarity-rare-border)'   },
  Épique:     { border: 'var(--rarity-epique-border)', footer: 'var(--rarity-epique-footer)', cornerColor: 'var(--rarity-epique-border)' },
  Légendaire: { border: 'var(--rarity-legend-border)', footer: 'var(--rarity-legend-footer)', cornerColor: 'var(--rarity-legend-border)' },
};

const RARITY_LABEL_COLOR: Record<CardRarity, string> = {
  Commun:     'var(--rarity-commun-text)',
  Rare:       'var(--rarity-rare-text)',
  Épique:     'var(--rarity-epique-text)',
  Légendaire: 'var(--rarity-legend-text)',
};

const RARITIES: CardRarity[] = ['Commun', 'Rare', 'Épique', 'Légendaire'];
const FILTER_OPTIONS: (CardRarity | 'Tous')[] = ['Tous', 'Commun', 'Rare', 'Épique', 'Légendaire'];

const RARITY_EMOJI: Record<CardRarity, string> = {
  Commun:     '⚪',
  Rare:       '🔵',
  Épique:     '🟣',
  Légendaire: '🌟',
};

interface CollectionProps {
  user: UserProfile;
  birthdays: Birthday[];
}

export function Collection({ user, birthdays }: CollectionProps) {
  const [filter, setFilter] = useState<CardRarity | 'Tous'>('Tous');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [celebrationQueue, setCelebrationQueue] = useState<string[]>([]);
  const sectionRefs = useRef<Partial<Record<CardRarity, HTMLDivElement>>>({});
  const topRef      = useRef<HTMLDivElement>(null);

  const unlockedIds = checkUnlockedCards(birthdays, user);
  const selected    = CARDS.find(c => c.id === selectedCard);
  const isSelectedUnlocked = selectedCard ? unlockedIds.includes(selectedCard) : false;
  const isNew = (id: string) => (user.newCards ?? []).includes(id);
  const celebrationCardId = celebrationQueue[0] ?? null;
  const celebrationCard = celebrationCardId ? CARDS.find(card => card.id === celebrationCardId) ?? null : null;

  useEffect(() => {
    const storageKey = `seen-unlocked-cards:${user.id}`;
    const seen = new Set<string>(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    const fresh = unlockedIds.filter(id => !seen.has(id));

    if (fresh.length === 0) return;

    setCelebrationQueue(current => {
      const queued = new Set(current);
      const additions = fresh.filter(id => !queued.has(id));
      return additions.length > 0 ? [...current, ...additions] : current;
    });
  }, [unlockedIds, user.id]);

  const dismissCelebration = (cardId: string) => {
    const storageKey = `seen-unlocked-cards:${user.id}`;
    const seen = new Set<string>(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    seen.add(cardId);
    localStorage.setItem(storageKey, JSON.stringify([...seen]));
    setCelebrationQueue(current => current.filter(id => id !== cardId));
  };

  const revealCelebrationCard = (cardId: string) => {
    dismissCelebration(cardId);
    setSelectedCard(cardId);
  };

  const handleFilter = (f: CardRarity | 'Tous') => {
    setFilter(f);
    if (f === 'Tous') {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      sectionRefs.current[f]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div ref={topRef} className="p-4 space-y-5 pb-32" style={{ background: 'var(--surface-bg)', minHeight: '100vh' }}>

      {/* Header stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 flex items-center gap-4"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border-mid)' }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: '#FF4B4B22' }}>
          <Trophy size={24} color="#FF4B4B" />
        </div>
        <div className="flex-1">
          <p style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '11px', color: 'var(--text-2)',
            letterSpacing: 1, marginBottom: 4,
          }}>
            TA COLLECTION
          </p>
          <p className="font-black text-2xl" style={{ color: 'var(--text-1)' }}>
            {unlockedIds.length}
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>/{CARDS.length}</span>
          </p>
          <div className="w-full h-1.5 rounded-full mt-2 overflow-hidden"
            style={{ background: 'var(--progress-bg)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(unlockedIds.length / CARDS.length) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: '#FF4B4B' }}
            />
          </div>
        </div>
      </motion.div>

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {FILTER_OPTIONS.map(f => (
          <button
            key={f}
            onClick={() => handleFilter(f)}
            className="shrink-0 transition-all"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '11px',
              padding: '6px 12px',
              borderRadius: 20,
              color: filter === f ? '#fff' : 'var(--filter-btn-color)',
              background: filter === f ? '#FF4B4B' : 'var(--filter-btn-bg)',
              border: `1px solid ${filter === f ? '#FF4B4B' : 'var(--filter-btn-border)'}`,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sections par rareté */}
      {RARITIES.map(rarity => {
        const rarityCards   = CARDS.filter(c => c.rarity === rarity);
        const rarityUnlocked = rarityCards.filter(c => unlockedIds.includes(c.id)).length;
        const color          = RARITY_LABEL_COLOR[rarity];

        return (
          <div key={rarity} ref={el => { if (el) sectionRefs.current[rarity] = el; }} className="space-y-3">

            {/* Section header */}
            <div className="space-y-1">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ height: 2, flex: 1, background: color, opacity: 0.3, borderRadius: 2 }} />
                <span style={{ fontSize: 18, fontWeight: 'bold', color }}>
                  {RARITY_EMOJI[rarity]} {rarity}
                </span>
                <div style={{ height: 2, flex: 1, background: color, opacity: 0.3, borderRadius: 2 }} />
              </div>
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-2)' }}>
                {rarityCards.length} cartes • {rarityUnlocked} débloquée{rarityUnlocked !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-3 gap-3">
              {rarityCards.map((card, i) => {
                const unlocked = unlockedIds.includes(card.id);
                const styles   = RARITY_STYLES[card.rarity];
                const isEpic   = card.rarity === 'Épique';
                const isLegend = card.rarity === 'Légendaire';

                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedCard(card.id)}
                    className="relative cursor-pointer"
                    style={{ aspectRatio: '0.69' }}
                  >
              {/* Badge NEW */}
              {unlocked && isNew(card.id) && (
                <div
                  className="absolute z-30 text-white"
                  style={{
                    top: -12, right: -10,
                    background: '#FF4B4B',
                    border: '2px solid #fff',
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '11px',
                    padding: '5px 8px',
                    borderRadius: 20,
                    transform: 'rotate(-12deg)',
                    animation: 'badgePulse 1.6s ease-in-out infinite',
                  }}>
                  NEW!
                </div>
              )}

              {/* Card */}
              <div
                className="w-full h-full flex flex-col overflow-hidden"
                style={{
                  borderRadius: 16,
                  border: `3px solid ${styles.border}`,
                  background: isLegend
                    ? 'var(--rarity-legend-card-bg)'
                    : 'var(--surface-card)',
                  animation: isEpic   ? 'epicPulse 2.2s ease-in-out infinite'
                           : isLegend ? 'legendPulse 3s ease-in-out infinite' : 'none',
                }}
              >
                {/* Inner border */}
                <div style={{
                  position: 'absolute', inset: 7, borderRadius: 7,
                  border: `1px solid ${styles.border}`,
                  opacity: 0.15, pointerEvents: 'none', zIndex: 1,
                }} />

                {/* Shimmer — Légendaire */}
                {isLegend && unlocked && (
                  <div style={{
                    position: 'absolute', inset: 0, overflow: 'hidden',
                    borderRadius: 14, zIndex: 10, pointerEvents: 'none',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-80%', left: '-70%',
                      width: '40%', height: '260%',
                      background: 'linear-gradient(105deg, transparent 30%, rgba(255,215,0,0.45) 48%, rgba(255,255,255,0.6) 50%, rgba(255,215,0,0.45) 52%, transparent 70%)',
                      animation: 'shimmer 2.8s ease-in-out infinite',
                    }} />
                  </div>
                )}

                {/* Twinkling stars — Légendaire */}
                {isLegend && unlocked && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
                    {[
                      { top: '12%', left: '10%',  d: '1.8s', delay: '0s'   },
                      { top: '8%',  right: '12%', d: '2.2s', delay: '0.4s' },
                      { top: '18%', left: '50%',  d: '1.5s', delay: '0.8s' },
                      { bottom: '20%', left: '8%',   d: '2s',   delay: '0.2s' },
                      { bottom: '18%', right: '10%', d: '1.7s', delay: '0.6s' },
                    ].map((s, j) => (
                      <div key={j} style={{
                        position: 'absolute', width: 3, height: 3,
                        borderRadius: '50%', background: '#D4A017',
                        animation: `twinkle ${s.d} ease-in-out ${s.delay} infinite`,
                        ...s,
                      }} />
                    ))}
                  </div>
                )}

                {/* Corner brackets — Épique */}
                {isEpic && unlocked && ['tl','tr','bl','br'].map(pos => (
                  <div key={pos} style={{
                    position: 'absolute', width: 18, height: 18, zIndex: 20,
                    top:    pos.includes('t') ? 4 : 'auto',
                    bottom: pos.includes('b') ? 4 : 'auto',
                    left:   pos.includes('l') ? 4 : 'auto',
                    right:  pos.includes('r') ? 4 : 'auto',
                  }}>
                    <div style={{ position: 'absolute', width: '100%', height: 2, background: '#7B2FBE', borderRadius: 1, opacity: 0.6, top: 0, left: 0 }} />
                    <div style={{ position: 'absolute', width: 2, height: '100%', background: '#7B2FBE', borderRadius: 1, opacity: 0.6, top: 0, left: pos.includes('r') ? 'auto' : 0, right: pos.includes('r') ? 0 : 'auto' }} />
                  </div>
                ))}

                {/* Corner brackets — Légendaire */}
                {isLegend && unlocked && ['tl','tr','bl','br'].map(pos => (
                  <div key={pos} style={{
                    position: 'absolute', width: 20, height: 20, zIndex: 20,
                    top:    pos.includes('t') ? 5 : 'auto',
                    bottom: pos.includes('b') ? 5 : 'auto',
                    left:   pos.includes('l') ? 5 : 'auto',
                    right:  pos.includes('r') ? 5 : 'auto',
                  }}>
                    <div style={{ position: 'absolute', width: '100%', height: 2.5, background: '#D4A017', top: 0, left: 0 }} />
                    <div style={{ position: 'absolute', width: 2.5, height: '100%', background: '#D4A017', top: 0, left: pos.includes('r') ? 'auto' : 0, right: pos.includes('r') ? 0 : 'auto' }} />
                  </div>
                ))}

                {/* Emoji zone */}
                <div style={{
                  flex: 1, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'var(--card-emoji-bg)', position: 'relative',
                }}>
                  <span style={{
                    fontSize: 36, display: 'inline-block',
                    animation: `floatEmoji 4.5s ease-in-out ${i * 0.3}s infinite`,
                    filter: !unlocked ? 'grayscale(1) opacity(0.5)' : 'none',
                  }}>
                    {card.emoji}
                  </span>
                  {!unlocked && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'var(--lock-overlay, rgba(200,200,200,0.52))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 18 }}>🔒</span>
                    </div>
                  )}
                </div>

                {/* Separator */}
                <div style={{ height: 1, background: styles.border, opacity: 0.2, flexShrink: 0 }} />

                {/* Footer */}
                <div style={{
                  background: styles.footer,
                  padding: '6px 4px 8px',
                  textAlign: 'center', flexShrink: 0,
                }}>
                  <p style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '11px', color: 'var(--text-1)', lineHeight: 1.8,
                  }}>
                    {card.title}
                  </p>
                  <p style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '11px', color: '#58CC02',
                  }}>
                    +{card.xpReward} XP
                  </p>
                </div>
              </div>
            </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Modal detail */}
      <AnimatePresence>
        {celebrationCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 60,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(10px)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 12 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[320px] rounded-[28px] overflow-hidden"
              style={{
                background: 'var(--surface-card)',
                border: `3px solid ${RARITY_STYLES[celebrationCard.rarity].border}`,
                boxShadow: '0 24px 80px rgba(15,23,42,0.28)',
              }}
            >
              <div
                className="px-5 pt-5 pb-4 text-center"
                style={{
                  background: celebrationCard.rarity === 'Légendaire'
                    ? 'linear-gradient(145deg, rgba(200,134,26,0.16) 0%, rgba(255,248,232,0.96) 100%)'
                    : celebrationCard.rarity === 'Épique'
                    ? 'linear-gradient(145deg, rgba(123,47,190,0.14) 0%, rgba(245,238,255,0.96) 100%)'
                    : celebrationCard.rarity === 'Rare'
                    ? 'linear-gradient(145deg, rgba(26,111,196,0.12) 0%, rgba(238,245,255,0.96) 100%)'
                    : 'linear-gradient(145deg, rgba(255,75,75,0.10) 0%, rgba(255,255,255,0.96) 100%)',
                }}
              >
                <p
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '10px',
                    color: '#FF4B4B',
                    marginBottom: 14,
                  }}
                >
                  NOUVELLE CARTE
                </p>

                <div
                  className="mx-auto mb-4 w-24 h-24 rounded-[26px] flex items-center justify-center"
                  style={{
                    background: 'var(--card-emoji-bg)',
                    border: `2px solid ${RARITY_STYLES[celebrationCard.rarity].border}`,
                  }}
                >
                  <span style={{ fontSize: 46 }}>{celebrationCard.emoji}</span>
                </div>

                <p className="font-black text-[26px] leading-tight mb-2" style={{ color: 'var(--text-1)' }}>
                  Tu as débloqué
                </p>
                <p className="font-black text-lg leading-tight mb-2" style={{ color: RARITY_LABEL_COLOR[celebrationCard.rarity] }}>
                  {celebrationCard.title}
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  {RARITY_EMOJI[celebrationCard.rarity]} {celebrationCard.rarity} • +{celebrationCard.xpReward} XP
                </p>
              </div>

              <div className="px-5 pb-5 pt-4 space-y-3">
                <p className="text-center text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                  {celebrationCard.description}
                </p>

                <button
                  onClick={() => revealCelebrationCard(celebrationCard.id)}
                  className="w-full rounded-2xl py-3 text-white font-black text-sm"
                  style={{ background: '#FF4B4B', boxShadow: '0 6px 0 #CC2E2E' }}
                >
                  VOIR LA CARTE
                </button>

                <button
                  onClick={() => dismissCelebration(celebrationCard.id)}
                  className="w-full rounded-2xl py-3 font-black text-sm border"
                  style={{
                    color: 'var(--text-2)',
                    borderColor: 'var(--border-mid)',
                    background: 'var(--surface-card)',
                  }}
                >
                  PLUS TARD
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedCard && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCard(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 16, background: 'rgba(0,0,0,0.6)',
            }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 200, borderRadius: 24,
                border: `3px solid ${RARITY_STYLES[selected.rarity].border}`,
                background: selected.rarity === 'Légendaire'
                  ? 'var(--rarity-legend-card-bg)'
                  : 'var(--surface-card)',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Emoji zone */}
              <div style={{
                height: 160, background: 'var(--card-emoji-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <span style={{
                  fontSize: 72, display: 'inline-block',
                  animation: 'floatEmoji 4.5s ease-in-out infinite',
                  filter: !isSelectedUnlocked ? 'grayscale(1) opacity(0.5)' : 'none',
                }}>
                  {selected.emoji}
                </span>
                {!isSelectedUnlocked && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(200,200,200,0.52)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <span style={{ fontSize: 32 }}>🔒</span>
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: RARITY_STYLES[selected.rarity].border, opacity: 0.2 }} />

              {/* Footer modal */}
              <div style={{
                background: RARITY_STYLES[selected.rarity].footer,
                padding: '14px 12px 18px', textAlign: 'center',
              }}>
                <p style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '11px', color: RARITY_LABEL_COLOR[selected.rarity],
                  marginBottom: 6,
                }}>
                  {selected.rarity}
                </p>
                <p style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '11px', color: 'var(--text-1)', lineHeight: 1.8, marginBottom: 4,
                }}>
                  {selected.title}
                </p>
                <p style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '12px', color: '#58CC02', marginBottom: 10,
                }}>
                  +{selected.xpReward} XP
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {isSelectedUnlocked
                    ? `✅ ${selected.description}`
                    : `🎯 ${selected.unlockCondition}`}
                </p>
              </div>
            </motion.div>

            <button
              onClick={() => setSelectedCard(null)}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '11px', color: 'rgba(255,255,255,0.75)',
                background: 'none', border: 'none', cursor: 'pointer',
              }}>
              ✕ FERMER
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS Animations */}
      <style>{`
        @keyframes floatEmoji {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes epicPulse {
          0%,100% { box-shadow: 0 0 0 2px #7B2FBE33, 0 2px 16px rgba(123,47,190,0.2); }
          50%     { box-shadow: 0 0 0 5px #7B2FBE18, 0 4px 24px rgba(123,47,190,0.35); }
        }
        @keyframes legendPulse {
          0%,100% { box-shadow: 0 0 0 1px #ffd70055, 0 4px 20px rgba(200,134,26,0.25); }
          50%     { box-shadow: 0 0 0 3px #ffd70033, 0 6px 28px rgba(200,134,26,0.4), 0 0 50px rgba(255,215,0,0.18); }
        }
        @keyframes badgePulse {
          0%,100% { transform: rotate(-12deg) scale(1); }
          50%     { transform: rotate(-12deg) scale(1.15); }
        }
        @keyframes shimmer {
          0%   { left: -70%; }
          100% { left: 130%; }
        }
        @keyframes twinkle {
          0%,100% { opacity: 0.2; transform: scale(0.8); }
          50%     { opacity: 1;   transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
