export type ZodiacSign = 
  | 'Bélier' | 'Taureau' | 'Gémeaux' | 'Cancer' 
  | 'Lion' | 'Vierge' | 'Balance' | 'Scorpion' 
  | 'Sagittaire' | 'Capricorne' | 'Verseau' | 'Poissons';

export type CardRarity = 'Commun' | 'Rare' | 'Épique';

export interface UserProfile {
  id: string;
  name: string;
  birthDate: string;
  photoUrl?: string;
  socials: {
    instagram?: string;
    snapchat?: string;
    tiktok?: string;
    twitter?: string;
    facebook?: string;
  };
  wishlist: string[];
  zodiac: ZodiacSign;
  xp: number;
  level: number;
  collectedCards: string[]; // IDs of cards
}

export interface Birthday {
  id: string;
  name: string;
  birthDate: string;
  photoUrl?: string;
  zodiac: ZodiacSign;
  addedAt: string;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  rarity: CardRarity;
  image: string;
  unlockCondition: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardXp: number;
  rewardCardId?: string;
}
