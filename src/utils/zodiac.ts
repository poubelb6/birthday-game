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

/** Returns a consistent soft color based on the first letter of a name */
const AVATAR_COLORS = [
  '#F87171', // rouge doux
  '#FB923C', // orange
  '#FBBF24', // ambre
  '#34D399', // vert émeraude
  '#22D3EE', // cyan
  '#60A5FA', // bleu
  '#A78BFA', // violet
  '#F472B6', // rose
  '#2DD4BF', // teal
  '#86EFAC', // vert clair
];

export function getAvatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}
