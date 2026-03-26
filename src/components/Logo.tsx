import React from 'react';
import { Cake, Flame, Star } from 'lucide-react';
import { motion } from 'motion/react';

export function Logo({ size = 40, className = "" }: { size?: number, className?: string }) {
  return (
    <motion.div 
      className={`relative flex items-center justify-center ${className}`}
      initial={{ y: 0, rotate: 0 }}
      animate={{ 
        y: [0, -6, 0],
        rotate: [0, 5, -5, 0]
      }}
      transition={{ 
        duration: 3, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
    >
      <div className="relative">
        {/* Vibrant Aura */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-rose-400 via-amber-300 to-sky-400 rounded-full blur-2xl opacity-40"
          animate={{ 
            scale: [1, 1.4, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Main Cake Icon with Emoji-like styling */}
        <div className="relative z-10">
          <Cake 
            size={size} 
            className="text-rose-500 fill-rose-100/50 drop-shadow-md" 
            strokeWidth={2.5} 
          />
          
          {/* Blue Sparkles */}
          <motion.div
            className="absolute -right-1 top-1/2 text-sky-400"
            animate={{ 
              scale: [0, 1, 0],
              rotate: [0, 90, 180],
              opacity: [0, 1, 0]
            }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            <Star size={size * 0.3} fill="currentColor" />
          </motion.div>

          <motion.div
            className="absolute -left-2 top-1/4 text-sky-300"
            animate={{ 
              scale: [0, 1, 0],
              rotate: [0, -90, -180],
              opacity: [0, 1, 0]
            }}
            transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
          >
            <Star size={size * 0.25} fill="currentColor" />
          </motion.div>
          
          {/* Flame with vibrant colors */}
          <motion.div 
            className="absolute -top-1 left-1/2 -translate-x-1/2"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.8, 1, 0.8],
              y: [0, -2, 0]
            }}
            transition={{ 
              duration: 0.8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            <Flame size={size * 0.45} className="text-amber-500 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          </motion.div>
        </div>

        {/* Shadow underneath */}
        <motion.div 
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-black/10 rounded-full blur-md"
          animate={{ scaleX: [1, 0.8, 1], opacity: [0.2, 0.1, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}
