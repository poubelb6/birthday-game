export const ZODIAC_EMOJI: Record<string, string> = {
  'Bélier': '♈', 'Taureau': '♉', 'Gémeaux': '♊', 'Cancer': '♋',
  'Lion': '♌', 'Vierge': '♍', 'Balance': '♎', 'Scorpion': '♏',
  'Sagittaire': '♐', 'Capricorne': '♑', 'Verseau': '♒', 'Poissons': '♓',
};

/** Returns "♈ Bélier" */
export function formatZodiac(zodiac: string): string {
  const emoji = ZODIAC_EMOJI[zodiac];
  return emoji ? `${emoji} ${zodiac}` : zodiac;
}
