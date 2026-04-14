import { useState, useEffect } from 'react';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

const KEY = 'weekly_adds';

/** Enregistre un ajout d'ami (appelé depuis Dashboard lors de handleAddFriend) */
export function recordFriendAdd() {
  const existing: string[] = JSON.parse(localStorage.getItem(KEY) || '[]');
  existing.push(new Date().toISOString());
  localStorage.setItem(KEY, JSON.stringify(existing));
}

/** Retourne le nombre d'amis ajoutés cette semaine (lundi → dimanche) */
export function useStreak() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd   = endOfWeek(now,   { weekStartsOn: 1 });

    const timestamps: string[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    const thisWeek = timestamps.filter(ts =>
      isWithinInterval(parseISO(ts), { start: weekStart, end: weekEnd })
    );
    setCount(thisWeek.length);
  }, []);

  return count;
}
