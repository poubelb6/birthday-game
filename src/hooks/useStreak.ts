import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';

const KEY_COUNT = 'streak_count';
const KEY_DATE  = 'streak_last_date';

function computeStreak(): number {
  const today     = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const lastDate  = localStorage.getItem(KEY_DATE);
  const saved     = parseInt(localStorage.getItem(KEY_COUNT) || '0', 10);

  let next: number;
  if (!lastDate) {
    next = 1;
  } else if (lastDate === today) {
    return saved; // already counted today, don't touch storage
  } else if (lastDate === yesterday) {
    next = saved + 1;
  } else {
    next = 1; // missed at least one day
  }

  localStorage.setItem(KEY_COUNT, String(next));
  localStorage.setItem(KEY_DATE, today);
  return next;
}

export function useStreak() {
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    setStreak(computeStreak());
  }, []);

  return streak;
}
