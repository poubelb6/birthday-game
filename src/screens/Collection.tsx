import { motion } from 'motion/react';
import { Lock, Sparkles, Trophy } from 'lucide-react';
import { UserProfile } from '../types';
import { CARDS } from '../utils/gameLogic';

export function Collection({ user }: { user: UserProfile }) {
  return (
    <div className="p-6 space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-rose-400 via-sky-400 to-amber-400 p-8 rounded-3xl text-white relative overflow-hidden shadow-xl shadow-rose-100"
      >
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-white" />
            <span className="text-xs font-black uppercase tracking-widest opacity-80">Ta Collection</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tight">{user.collectedCards.length}/{CARDS.length}</h2>
            <p className="text-sm font-medium opacity-80">Cartes débloquées</p>
          </div>
          <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(user.collectedCards.length / CARDS.length) * 100}%` }}
              className="bg-white h-full"
            />
          </div>
        </div>
        <Sparkles className="absolute top-4 right-4 text-white/20" size={80} />
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        {CARDS.map((card, i) => {
          const isUnlocked = user.collectedCards.includes(card.id);
          
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              whileHover={isUnlocked ? { scale: 1.05, rotate: 2 } : {}}
              className={`relative aspect-[3/4] rounded-3xl overflow-hidden border transition-all ${
                isUnlocked ? 'border-rose-200 shadow-xl shadow-rose-100' : 'border-black/60 grayscale opacity-60'
              }`}
            >
              <img src={card.image} alt={card.title} className="w-full h-full object-cover" />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent p-4 flex flex-col justify-end">
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-fit mb-1 ${
                  card.rarity === 'Commun' ? 'bg-slate-200 text-slate-800' :
                  card.rarity === 'Rare' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {card.rarity}
                </span>
                <h4 className="text-white font-black text-sm leading-tight">{card.title}</h4>
              </div>

              {!isUnlocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-[2px]">
                  <Lock className="text-white mb-2" size={24} />
                  <p className="text-[10px] text-white font-black uppercase tracking-wider text-center px-4 leading-relaxed">
                    {card.unlockCondition}
                  </p>
                </div>
              )}

              {isUnlocked && (
                <motion.div 
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none"
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
