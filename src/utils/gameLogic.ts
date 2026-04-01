import { ZodiacSign, UserProfile, Birthday, Card } from '../types';

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

export const calculateLevel = (xp: number) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const getXpForNextLevel = (level: number) => {
  return Math.pow(level, 2) * 100;
};

export const CARDS: Card[] = [
  // ── COMMUN ──────────────────────────────────────────────────────────────────
  { id: 'c1',  title: 'Le Nouveau Venu',    emoji: '👋', rarity: 'Commun', xpReward: 50,  description: 'Ajouter son 1er ami',                          unlockCondition: 'Ajouter son 1er ami' },
  { id: 'c2',  title: 'Premier Rendez-vous',emoji: '📅', rarity: 'Commun', xpReward: 50,  description: 'Ouvrir le calendrier pour la 1ère fois',        unlockCondition: 'Ouvrir le calendrier pour la 1ère fois' },
  { id: 'c3',  title: 'Sourire !',           emoji: '📸', rarity: 'Commun', xpReward: 50,  description: 'Ajouter une photo à un ami',                    unlockCondition: 'Ajouter une photo à un ami' },
  { id: 'c4',  title: 'Connecté',            emoji: '🔗', rarity: 'Commun', xpReward: 50,  description: 'Ajouter un réseau social à son profil',         unlockCondition: 'Ajouter un réseau social à son profil' },
  { id: 'c5',  title: 'La Wishlist',         emoji: '🎁', rarity: 'Commun', xpReward: 50,  description: 'Créer sa wishlist',                             unlockCondition: 'Créer sa wishlist' },
  { id: 'c6',  title: 'QR Pioneer',          emoji: '📱', rarity: 'Commun', xpReward: 75,  description: 'Scanner son 1er QR code',                       unlockCondition: 'Scanner son 1er QR code' },
  { id: 'c7',  title: 'Duo',                 emoji: '🤝', rarity: 'Commun', xpReward: 75,  description: 'Avoir 2 amis',                                  unlockCondition: 'Avoir 2 amis' },
  { id: 'c8',  title: 'Petit Groupe',        emoji: '👨‍👩‍👧', rarity: 'Commun', xpReward: 100, description: 'Avoir 5 amis',                                  unlockCondition: 'Avoir 5 amis' },

  // ── RARE ─────────────────────────────────────────────────────────────────────
  { id: 'r1',  title: 'Social Butterfly',    emoji: '🦋', rarity: 'Rare', xpReward: 150, description: 'Scanner 5 QR codes',                           unlockCondition: 'Scanner 5 QR codes' },
  { id: 'r2',  title: 'Janvier ♑',           emoji: '🗓️', rarity: 'Rare', xpReward: 150, description: '1 ami né en Janvier',                          unlockCondition: '1 ami né en Janvier' },
  { id: 'r3',  title: 'Février ♒',           emoji: '🗓️', rarity: 'Rare', xpReward: 150, description: '1 ami né en Février',                          unlockCondition: '1 ami né en Février' },
  { id: 'r4',  title: 'Mars ♈',              emoji: '🗓️', rarity: 'Rare', xpReward: 150, description: '1 ami né en Mars',                             unlockCondition: '1 ami né en Mars' },
  { id: 'r5',  title: 'Avril ♉',             emoji: '🗓️', rarity: 'Rare', xpReward: 150, description: '1 ami né en Avril',                            unlockCondition: '1 ami né en Avril' },
  { id: 'r6',  title: 'Mai ♊',               emoji: '🗓️', rarity: 'Rare', xpReward: 150, description: '1 ami né en Mai',                              unlockCondition: '1 ami né en Mai' },
  { id: 'r7',  title: 'Juin ♋',              emoji: '🗓️', rarity: 'Rare', xpReward: 150, description: '1 ami né en Juin',                             unlockCondition: '1 ami né en Juin' },
  { id: 'r8',  title: 'Juillet ♌',           emoji: '🗓️', rarity: 'Rare', xpReward: 150, description: '1 ami né en Juillet',                          unlockCondition: '1 ami né en Juillet' },
  { id: 'r9',  title: 'Août ♍',              emoji: '🗓️', rarity: 'Rare', xpReward: 150, description: '1 ami né en Août',                             unlockCondition: '1 ami né en Août' },
  { id: 'r10', title: 'Septembre ♎',         emoji: '🗓️', rarity: 'Rare', xpReward: 150, description: '1 ami né en Septembre',                        unlockCondition: '1 ami né en Septembre' },
  { id: 'r11', title: 'Octobre ♏',           emoji: '🗓️', rarity: 'Rare', xpReward: 150, description: '1 ami né en Octobre',                          unlockCondition: '1 ami né en Octobre' },
  { id: 'r12', title: 'Novembre ♐',          emoji: '🗓️', rarity: 'Rare', xpReward: 150, description: '1 ami né en Novembre',                         unlockCondition: '1 ami né en Novembre' },
  { id: 'r13', title: 'Décembre ♑',          emoji: '🗓️', rarity: 'Rare', xpReward: 150, description: '1 ami né en Décembre',                         unlockCondition: '1 ami né en Décembre' },
  { id: 'r14', title: 'Bélier',              emoji: '♈', rarity: 'Rare', xpReward: 200, description: '3 amis Bélier',                                unlockCondition: '3 amis Bélier' },
  { id: 'r15', title: 'Taureau',             emoji: '♉', rarity: 'Rare', xpReward: 200, description: '3 amis Taureau',                               unlockCondition: '3 amis Taureau' },
  { id: 'r16', title: 'Gémeaux',             emoji: '♊', rarity: 'Rare', xpReward: 200, description: '3 amis Gémeaux',                               unlockCondition: '3 amis Gémeaux' },
  { id: 'r17', title: 'Cancer',              emoji: '♋', rarity: 'Rare', xpReward: 200, description: '3 amis Cancer',                                unlockCondition: '3 amis Cancer' },
  { id: 'r18', title: 'Lion',                emoji: '♌', rarity: 'Rare', xpReward: 200, description: '3 amis Lion',                                  unlockCondition: '3 amis Lion' },
  { id: 'r19', title: 'Vierge',              emoji: '♍', rarity: 'Rare', xpReward: 200, description: '3 amis Vierge',                                unlockCondition: '3 amis Vierge' },
  { id: 'r20', title: 'Balance',             emoji: '♎', rarity: 'Rare', xpReward: 200, description: '3 amis Balance',                               unlockCondition: '3 amis Balance' },
  { id: 'r21', title: 'Scorpion',            emoji: '♏', rarity: 'Rare', xpReward: 200, description: '3 amis Scorpion',                              unlockCondition: '3 amis Scorpion' },
  { id: 'r22', title: 'Sagittaire',          emoji: '♐', rarity: 'Rare', xpReward: 200, description: '3 amis Sagittaire',                            unlockCondition: '3 amis Sagittaire' },
  { id: 'r23', title: 'Capricorne',          emoji: '♑', rarity: 'Rare', xpReward: 200, description: '3 amis Capricorne',                            unlockCondition: '3 amis Capricorne' },
  { id: 'r24', title: 'Verseau',             emoji: '♒', rarity: 'Rare', xpReward: 200, description: '3 amis Verseau',                               unlockCondition: '3 amis Verseau' },
  { id: 'r25', title: 'Poissons',            emoji: '♓', rarity: 'Rare', xpReward: 200, description: '3 amis Poissons',                              unlockCondition: '3 amis Poissons' },
  { id: 'r26', title: 'Semaine 1',           emoji: '🌸', rarity: 'Rare', xpReward: 250, description: '1 ami dans chaque semaine de Janvier',         unlockCondition: '1 ami dans chaque semaine de Janvier' },
  { id: 'r27', title: 'Semaine Estivale',    emoji: '☀️', rarity: 'Rare', xpReward: 250, description: '1 ami dans chaque semaine de Juillet',         unlockCondition: '1 ami dans chaque semaine de Juillet' },
  { id: 'r28', title: "Semaine d'Automne",   emoji: '🍂', rarity: 'Rare', xpReward: 250, description: "1 ami dans chaque semaine d'Octobre",          unlockCondition: "1 ami dans chaque semaine d'Octobre" },
  { id: 'r29', title: 'Semaine Hivernale',   emoji: '❄️', rarity: 'Rare', xpReward: 250, description: '1 ami dans chaque semaine de Décembre',        unlockCondition: '1 ami dans chaque semaine de Décembre' },
  { id: 'r30', title: 'Maître du Scan',      emoji: '🎯', rarity: 'Rare', xpReward: 250, description: 'Scanner 10 QR codes',                          unlockCondition: 'Scanner 10 QR codes' },
  { id: 'r31', title: 'La Bande',            emoji: '🏘️', rarity: 'Rare', xpReward: 250, description: 'Avoir 10 amis',                                unlockCondition: 'Avoir 10 amis' },

  // ── ÉPIQUE ───────────────────────────────────────────────────────────────────
  { id: 'e1',  title: 'Maître du Temps',     emoji: '🗓️', rarity: 'Épique', xpReward: 400, description: '1 ami/mois sur 6 mois consécutifs',           unlockCondition: '1 ami/mois sur 6 mois consécutifs' },
  { id: 'e2',  title: 'Toutes Saisons',      emoji: '🌍', rarity: 'Épique', xpReward: 400, description: '1 ami né en hiver, printemps, été, automne',  unlockCondition: '1 ami né dans chaque saison' },
  { id: 'e3',  title: 'Zodiaque Complet',    emoji: '🔮', rarity: 'Épique', xpReward: 500, description: '1 ami de chaque signe astrologique',          unlockCondition: '1 ami de chaque signe astrologique' },
  { id: 'e4',  title: 'Super Scanner',       emoji: '📡', rarity: 'Épique', xpReward: 400, description: 'Scanner 25 QR codes',                         unlockCondition: 'Scanner 25 QR codes' },
  { id: 'e5',  title: 'Chef de Tribu',       emoji: '👑', rarity: 'Épique', xpReward: 400, description: 'Avoir 25 amis',                               unlockCondition: 'Avoir 25 amis' },
  { id: 'e6',  title: "Nuit d'Été",          emoji: '🌙', rarity: 'Épique', xpReward: 450, description: '1 ami dans chaque semaine de Juin, Juillet et Août', unlockCondition: '1 ami chaque semaine de Juin, Juil, Août' },
  { id: 'e7',  title: 'Blizzard',            emoji: '❄️', rarity: 'Épique', xpReward: 450, description: '1 ami dans chaque semaine de Déc, Jan et Fév', unlockCondition: '1 ami chaque semaine de Déc, Jan, Fév' },
  { id: 'e8',  title: '12 Mois',             emoji: '🎭', rarity: 'Épique', xpReward: 500, description: '1 ami né dans chacun des 12 mois',            unlockCondition: '1 ami né dans chacun des 12 mois' },
  { id: 'e9',  title: 'Niveau 5',            emoji: '🏆', rarity: 'Épique', xpReward: 500, description: 'Atteindre le niveau 5',                       unlockCondition: 'Atteindre le niveau 5' },
  { id: 'e10', title: '50 Amis',             emoji: '💫', rarity: 'Épique', xpReward: 500, description: 'Avoir 50 amis',                               unlockCondition: 'Avoir 50 amis' },

  // ── LÉGENDAIRE ───────────────────────────────────────────────────────────────
  { id: 'l1',  title: 'Calendrier Parfait',  emoji: '📅', rarity: 'Légendaire', xpReward: 1000, description: '1 ami dans chaque semaine de l\'année',   unlockCondition: '1 ami dans chaque semaine de l\'année' },
  { id: 'l2',  title: '365 Jours',           emoji: '🎂', rarity: 'Légendaire', xpReward: 2000, description: '1 ami pour chaque jour de l\'année',      unlockCondition: '1 ami pour chaque jour de l\'année' },
  { id: 'l3',  title: 'Univers Complet',     emoji: '🌌', rarity: 'Légendaire', xpReward: 1500, description: 'Débloquer toutes les cartes Épiques',     unlockCondition: 'Débloquer toutes les cartes Épiques' },
  { id: 'l4',  title: "L'Omniscient",        emoji: '👁️', rarity: 'Légendaire', xpReward: 1000, description: 'Avoir 100 amis',                         unlockCondition: 'Avoir 100 amis' },
  { id: 'l5',  title: 'Niveau 10',           emoji: '⚡', rarity: 'Légendaire', xpReward: 1000, description: 'Atteindre le niveau 10',                  unlockCondition: 'Atteindre le niveau 10' },
  { id: 'l6',  title: 'Le Collectionneur',   emoji: '🔱', rarity: 'Légendaire', xpReward: 2000, description: 'Débloquer 50 cartes',                     unlockCondition: 'Débloquer 50 cartes' },
];

export const checkUnlockedCards = (birthdays: Birthday[], user: UserProfile): string[] => {
  const unlocked = new Set(user.collectedCards);

  const month = (b: Birthday) => new Date(b.birthDate).getMonth(); // 0-indexed
  const day   = (b: Birthday) => new Date(b.birthDate).getDate();

  const inMonth = (m: number) => birthdays.filter(b => month(b) === m);
  const byZodiac = (sign: ZodiacSign) => birthdays.filter(b => b.zodiac === sign).length;

  const allWeeksOfMonth = (m: number): boolean => {
    const days = inMonth(m).map(b => day(b));
    return (
      days.some(d => d >= 1  && d <= 7)  &&
      days.some(d => d >= 8  && d <= 14) &&
      days.some(d => d >= 15 && d <= 21) &&
      days.some(d => d >= 22)
    );
  };

  const scans = user.scansCount ?? 0;

  // ── COMMUN ──────────────────────────────────────────────────────────────────
  if (birthdays.length >= 1)                                   unlocked.add('c1');
  if (birthdays.some(b => b.photoUrl))                         unlocked.add('c3');
  if (Object.values(user.socials).some(Boolean))               unlocked.add('c4');
  if (user.wishlist.length > 0)                                unlocked.add('c5');
  if (scans >= 1)                                              unlocked.add('c6');
  if (birthdays.length >= 2)                                   unlocked.add('c7');
  if (birthdays.length >= 5)                                   unlocked.add('c8');
  // c2 (calendar opened) relies on collectedCards set externally

  // ── RARE — months ───────────────────────────────────────────────────────────
  const monthIds = ['r2','r3','r4','r5','r6','r7','r8','r9','r10','r11','r12','r13'];
  monthIds.forEach((id, i) => { if (inMonth(i).length >= 1) unlocked.add(id); });

  // ── RARE — zodiac signs ─────────────────────────────────────────────────────
  const zodiacMap: [ZodiacSign, string][] = [
    ['Bélier','r14'],['Taureau','r15'],['Gémeaux','r16'],['Cancer','r17'],
    ['Lion','r18'],['Vierge','r19'],['Balance','r20'],['Scorpion','r21'],
    ['Sagittaire','r22'],['Capricorne','r23'],['Verseau','r24'],['Poissons','r25'],
  ];
  zodiacMap.forEach(([sign, id]) => { if (byZodiac(sign) >= 3) unlocked.add(id); });

  // ── RARE — seasonal weeks ───────────────────────────────────────────────────
  if (allWeeksOfMonth(0))  unlocked.add('r26'); // Janvier
  if (allWeeksOfMonth(6))  unlocked.add('r27'); // Juillet
  if (allWeeksOfMonth(9))  unlocked.add('r28'); // Octobre
  if (allWeeksOfMonth(11)) unlocked.add('r29'); // Décembre

  // ── RARE — scans & friends ──────────────────────────────────────────────────
  if (scans >= 5)                unlocked.add('r1');
  if (scans >= 10)               unlocked.add('r30');
  if (birthdays.length >= 10)    unlocked.add('r31');

  // ── ÉPIQUE ───────────────────────────────────────────────────────────────────
  // Maître du Temps: 1 ami/mois on 6 consecutive months
  const coveredMonths = Array.from({ length: 12 }, (_, m) => inMonth(m).length > 0);
  let streak = 0;
  for (let m = 0; m < 24; m++) {
    if (coveredMonths[m % 12]) { if (++streak >= 6) { unlocked.add('e1'); break; } }
    else streak = 0;
  }

  // Toutes Saisons
  const hasWinter = [11, 0, 1].some(m => inMonth(m).length > 0);
  const hasSpring = [2, 3, 4].some(m => inMonth(m).length > 0);
  const hasSummer = [5, 6, 7].some(m => inMonth(m).length > 0);
  const hasFall   = [8, 9, 10].some(m => inMonth(m).length > 0);
  if (hasWinter && hasSpring && hasSummer && hasFall) unlocked.add('e2');

  // Zodiaque Complet
  if (zodiacMap.every(([sign]) => byZodiac(sign) >= 1)) unlocked.add('e3');

  if (scans >= 25)               unlocked.add('e4');
  if (birthdays.length >= 25)    unlocked.add('e5');

  // Nuit d'Été: all weeks of June, July, August
  if ([5, 6, 7].every(m => allWeeksOfMonth(m))) unlocked.add('e6');

  // Blizzard: all weeks of December, January, February
  if ([11, 0, 1].every(m => allWeeksOfMonth(m))) unlocked.add('e7');

  // 12 Mois
  if (coveredMonths.every(Boolean)) unlocked.add('e8');

  if (user.level >= 5)           unlocked.add('e9');
  if (birthdays.length >= 50)    unlocked.add('e10');

  // ── LÉGENDAIRE ───────────────────────────────────────────────────────────────
  // Calendrier Parfait: 1 ami in each of the 52 weeks of the year
  const weeksCovered = new Set(
    birthdays.map(b => {
      const d = new Date(b.birthDate);
      const fixed = new Date(2001, d.getMonth(), d.getDate());
      const start = new Date(2001, 0, 1);
      return Math.floor((fixed.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
    })
  );
  if (weeksCovered.size >= 52) unlocked.add('l1');

  // 365 Jours
  const daysCovered = new Set(birthdays.map(b => {
    const d = new Date(b.birthDate);
    return `${d.getMonth()}-${d.getDate()}`;
  }));
  if (daysCovered.size >= 365) unlocked.add('l2');

  // Univers Complet: all Épique cards unlocked
  const epicIds = ['e1','e2','e3','e4','e5','e6','e7','e8','e9','e10'];
  if (epicIds.every(id => unlocked.has(id))) unlocked.add('l3');

  if (birthdays.length >= 100) unlocked.add('l4');
  if (user.level >= 10)        unlocked.add('l5');

  // Le Collectionneur: 50 cards (check last)
  if (unlocked.size >= 50)     unlocked.add('l6');

  return [...unlocked];
};
