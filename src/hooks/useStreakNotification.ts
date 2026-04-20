import { useState, useEffect } from 'react';
import { getDay, startOfWeek } from 'date-fns';

const NOTIF_WEEK_KEY = 'streak_notif_week';
const BANNER_SESSION_KEY = 'streak_banner_shown';

function thisWeekKey() {
  return startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().slice(0, 10);
}

function shouldRemind(streakCount: number) {
  const day = getDay(new Date()); // 0=Sun…6=Sat
  const isLateInWeek = day === 0 || day >= 4; // Thu, Fri, Sat, Sun
  return isLateInWeek && streakCount === 0;
}

export function useStreakNotification(streakCount: number) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!shouldRemind(streakCount)) return;

    // In-app banner: once per session
    if (!sessionStorage.getItem(BANNER_SESSION_KEY)) {
      sessionStorage.setItem(BANNER_SESSION_KEY, '1');
      setShowBanner(true);
    }

    // Browser notification: once per week
    if (!('Notification' in window)) return;
    const weekKey = thisWeekKey();
    if (localStorage.getItem(NOTIF_WEEK_KEY) === weekKey) return;

    const send = () => {
      new Notification('🔥 Birthday Game', {
        body: "N'oublie pas d'ajouter un ami cette semaine pour garder ton streak !",
        icon: '/gigi.png',
      });
      localStorage.setItem(NOTIF_WEEK_KEY, weekKey);
    };

    if (Notification.permission === 'granted') {
      send();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => { if (p === 'granted') send(); });
    }
  }, [streakCount]);

  return {
    showBanner,
    dismissBanner: () => setShowBanner(false),
  };
}
