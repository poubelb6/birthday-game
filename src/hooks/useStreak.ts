import { useEffect, useState } from 'react';
import { endOfWeek, isWithinInterval, parseISO, startOfWeek } from 'date-fns';

const KEY = 'weekly_adds';
const EVENT_NAME = 'streak:updated';

function readWeeklyAdds(): string[] {
  const raw: string[] = JSON.parse(localStorage.getItem(KEY) || '[]');
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeek = raw.filter((timestamp) => {
    try {
      return isWithinInterval(parseISO(timestamp), { start: weekStart, end: weekEnd });
    } catch {
      return false;
    }
  });

  if (thisWeek.length !== raw.length) {
    localStorage.setItem(KEY, JSON.stringify(thisWeek));
  }

  return thisWeek;
}

export function recordFriendAdd() {
  const existing = readWeeklyAdds();
  existing.push(new Date().toISOString());
  localStorage.setItem(KEY, JSON.stringify(existing));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: existing.length }));
}

export function useStreak() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(readWeeklyAdds().length);

    sync();
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return count;
}
