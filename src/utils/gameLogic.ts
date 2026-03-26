import { ZodiacSign } from '../types';

export const getZodiacSign = (date: Date): ZodiacSign => {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Bélier';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taureau';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gémeaux';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Lion';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Vierge';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Balance';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpion';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittaire';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorne';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Verseau';
  return 'Poissons';
};

export const CARDS = [
  {
    id: 'c1',
    title: 'Le Nouveau Venu',
    description: 'Ajoute ton premier anniversaire.',
    rarity: 'Commun',
    image: 'https://picsum.photos/seed/card1/200/300',
    unlockCondition: '1 anniversaire ajouté',
  },
  {
    id: 'c2',
    title: 'Social Butterfly',
    description: 'Scanne 5 profils différents.',
    rarity: 'Rare',
    image: 'https://picsum.photos/seed/card2/200/300',
    unlockCondition: '5 scans effectués',
  },
  {
    id: 'c3',
    title: 'Maître du Temps',
    description: 'Complète ton premier calendrier.',
    rarity: 'Épique',
    image: 'https://picsum.photos/seed/card3/200/300',
    unlockCondition: '10 anniversaires enregistrés',
  },
] as const;

export const calculateLevel = (xp: number) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const getXpForNextLevel = (level: number) => {
  return Math.pow(level, 2) * 100;
};
