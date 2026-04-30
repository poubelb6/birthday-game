import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Birthday, Message, UserProfile } from '../types';

const ENABLED_KEY = 'notifications_enabled';
const CHANNEL_ID  = 'birthday-reminders';
const FCM_TOKEN_KEY = 'push_fcm_token';

const MILESTONES = [
  { days: 30, index: 0 },
  { days: 15, index: 1 },
  { days: 7,  index: 2 },
  { days: 3,  index: 3 },
  { days: 0,  index: 4 },
] as const;

// Deterministic numeric ID from a string
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 800000;
}

// Next date at which a notification should fire for a given birthday + days offset
function nextNotifAt(birthDateStr: string, daysOffset: number): Date | null {
  try {
    const birth = parseISO(birthDateStr);
    const now   = new Date();
    const hour  = daysOffset === 0 ? 8 : 9; // 8h le Jour J, 9h sinon

    for (let yr = 0; yr <= 1; yr++) {
      const bday = new Date(now.getFullYear() + yr, birth.getMonth(), birth.getDate());
      bday.setHours(hour, 0, 0, 0);
      const at = new Date(bday);
      at.setDate(at.getDate() - daysOffset);
      if (at > now) return at;
    }
    return null;
  } catch {
    return null;
  }
}

function friendTexts(friend: Birthday, days: number): { title: string; body: string } {
  const dateStr = format(parseISO(friend.birthDate), 'd MMMM', { locale: fr });
  switch (days) {
    case 0:  return { title: `🎈 Anniversaire de ${friend.name} aujourd'hui !`, body: 'Envoie-lui un message pour lui souhaiter un beau jour ✨' };
    case 3:  return { title: `🎉 ${friend.name} fête son anniv' dans 3 jours !`, body: `Le ${dateStr} — prépare ton message !` };
    case 7:  return { title: `🎂 ${friend.name} — anniversaire dans 1 semaine`, body: `Le ${dateStr} — ne l'oublie pas !` };
    case 15: return { title: `🎂 ${friend.name} fête bientôt son anniversaire`, body: `Dans 15 jours, le ${dateStr}` };
    default: return { title: `🎂 Rappel anniversaire — ${friend.name}`, body: `Dans ${days} jours, le ${dateStr}` };
  }
}

function ownTexts(days: number): { title: string; body: string } {
  switch (days) {
    case 0:  return { title: '🎉 Joyeux anniversaire !', body: "Tes amis pensent à toi aujourd'hui 🎈" };
    case 3:  return { title: '🥳 Plus que 3 jours avant ton anniversaire !', body: 'Tes amis préparent peut-être une surprise...' };
    case 7:  return { title: '🎂 Ton anniversaire arrive dans 1 semaine !', body: 'Prépare-toi pour les surprises 🎊' };
    case 15: return { title: "🎈 Dans 15 jours, c'est ton anniversaire !", body: 'Tes amis seront notifiés automatiquement' };
    default: return { title: `🎈 Dans ${days} jours, c'est ton anniversaire !`, body: 'Tes amis seront notifiés de ton grand jour' };
  }
}

export function useNotifications(
  birthdays: Birthday[],
  user: UserProfile | null,
  inbox: Message[],
  onTap?: (type: 'birthday' | 'message', id: string) => void,
) {
  const isNative = Capacitor.isNativePlatform();
  const [enabled, setEnabledState] = useState(() => localStorage.getItem(ENABLED_KEY) === 'true');
  const prevInboxRef    = useRef<Message[]>([]);
  const firstLoadRef    = useRef(true);

  function persist(val: boolean) {
    localStorage.setItem(ENABLED_KEY, String(val));
    setEnabledState(val);
  }

  const persistFcmToken = useCallback(async (token: string) => {
    localStorage.setItem(FCM_TOKEN_KEY, token);

    const uid = user?.id ?? auth.currentUser?.uid;
    if (!uid) return;

    try {
      await updateDoc(doc(db, 'users', uid), { fcmToken: token });
    } catch (e) {
      console.error('[FCM] token save:', e);
    }
  }, [user?.id]);

  // ── Native: schedule all birthday notifications ──────────────────────────
  const scheduleAll = useCallback(async () => {
    if (!isNative) return;
    try {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: "Rappels d'anniversaires",
        description: 'Rappels Birthday Game',
        importance: 4,
        visibility: 1,
        vibration: true,
      });

      const notifications: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = [];

      for (const friend of birthdays) {
        if (!friend.birthDate) continue;
        for (const { days, index } of MILESTONES) {
          const at = nextNotifAt(friend.birthDate, days);
          if (!at) continue;
          const { title, body } = friendTexts(friend, days);
          notifications.push({
            id: hashStr(friend.id) * 10 + index,
            title, body,
            schedule: { at, allowWhileIdle: true },
            channelId: CHANNEL_ID,
            extra: { type: 'birthday', friendId: friend.id },
          });
        }
      }

      if (user?.birthDate) {
        for (const { days, index } of MILESTONES) {
          const at = nextNotifAt(user.birthDate, days);
          if (!at) continue;
          const { title, body } = ownTexts(days);
          notifications.push({
            id: 9000000 + index,
            title, body,
            schedule: { at, allowWhileIdle: true },
            channelId: CHANNEL_ID,
            extra: { type: 'own-birthday' },
          });
        }
      }

      // Cancel stale then reschedule fresh
      const { notifications: pending } = await LocalNotifications.getPending();
      if (pending.length > 0) await LocalNotifications.cancel({ notifications: pending });
      if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
    } catch (e) {
      console.error('[Notif] scheduleAll:', e);
    }
  }, [birthdays, user, isNative]);

  // Trigger reschedule when enabled or data changes
  useEffect(() => {
    if (!enabled) return;
    scheduleAll();
  }, [enabled, scheduleAll]);

  // ── Web fallback: check-on-open ──────────────────────────────────────────
  useEffect(() => {
    if (isNative || !enabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const fire = (
      dateStr: string,
      idKey: string,
      textFn: (d: number) => { title: string; body: string },
    ) => {
      try {
        const birth = parseISO(dateStr);
        const bday  = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
        const diff  = Math.round((bday.getTime() - today.getTime()) / 86400000);
        const m     = MILESTONES.find(x => x.days === diff);
        if (!m) return;
        const key = `notif_web_${idKey}_${m.days}_${now.getFullYear()}`;
        if (localStorage.getItem(key)) return;
        const { title, body } = textFn(m.days);
        new Notification(title, { body, icon: '/gigi.png' });
        localStorage.setItem(key, '1');
      } catch { /* ignore */ }
    };

    for (const f of birthdays) {
      if (f.birthDate) fire(f.birthDate, f.id, d => friendTexts(f, d));
    }
    if (user?.birthDate) fire(user.birthDate, 'own', ownTexts);
  }, [birthdays, user, isNative, enabled]);

  // ── Message notifications ────────────────────────────────────────────────
  useEffect(() => {
    // Skip the very first snapshot to avoid notifying for all existing messages
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      prevInboxRef.current = inbox;
      return;
    }

    const prevIds = new Set(prevInboxRef.current.map(m => m.id));
    const fresh   = inbox.filter(m => !m.read && !prevIds.has(m.id));
    prevInboxRef.current = inbox;

    if (fresh.length === 0 || !enabled) return;

    fresh.forEach(async (msg) => {
      const title = `💬 Message de ${msg.fromName}`;
      const body  = msg.text.length > 60 ? msg.text.slice(0, 57) + '…' : msg.text;

      if (isNative) {
        try {
          await LocalNotifications.schedule({
            notifications: [{
              id: 8000000 + (hashStr(msg.id) % 100000),
              title, body,
              channelId: CHANNEL_ID,
              extra: { type: 'message', fromId: msg.fromId },
            }],
          });
        } catch (e) {
          console.error('[Notif] msg notif:', e);
        }
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/gigi.png' });
      }
    });
  }, [inbox, enabled, isNative]);

  // ── Local notification tap (native only) ────────────────────────────────
  // Keep a stable ref so we don't re-add the listener on every render
  const onTapRef = useRef(onTap);
  useEffect(() => { onTapRef.current = onTap; }, [onTap]);

  useEffect(() => {
    if (!isNative) return;
    let removeFn: (() => void) | undefined;
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const extra = action.notification.extra as { type?: string; friendId?: string; fromId?: string } | undefined;
      if (!extra) return;
      if (extra.type === 'message')     onTapRef.current?.('message', extra.fromId ?? '');
      if (extra.type === 'birthday' || extra.type === 'own-birthday') onTapRef.current?.('birthday', extra.friendId ?? '');
    }).then(h => { removeFn = () => h.remove(); });
    return () => removeFn?.();
  }, [isNative]);

  // ── FCM token registration & push tap ────────────────────────────────────
  useEffect(() => {
    if (!isNative) return;
    const handles: Array<{ remove: () => void }> = [];

    // Save token to Firestore so the Cloud Function can target this device
    PushNotifications.addListener('registration', async (token) => {
      await persistFcmToken(token.value);
    }).then(h => handles.push(h));

    // Tap on FCM push (app was closed or background)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data as { type?: string; fromId?: string } | undefined;
      if (data?.type === 'message') onTapRef.current?.('message', data.fromId ?? '');
    }).then(h => handles.push(h));

    // Foreground FCM — already handled by Firestore listener, no duplicate needed
    PushNotifications.addListener('pushNotificationReceived', (_n) => { /* no-op */ })
      .then(h => handles.push(h));

    return () => handles.forEach(h => h.remove());
  }, [isNative, persistFcmToken]);

  useEffect(() => {
    if (!isNative || !enabled) return;

    const existingToken = localStorage.getItem(FCM_TOKEN_KEY);
    if (!existingToken) return;

    void persistFcmToken(existingToken);
  }, [enabled, isNative, persistFcmToken]);

  // ── Public API ────────────────────────────────────────────────────────────
  const requestAndEnable = async (): Promise<boolean> => {
    try {
      if (isNative) {
        const { display } = await LocalNotifications.requestPermissions();
        if (display !== 'granted') return false;

        const exactAlarm = await LocalNotifications.checkExactNotificationSetting();
        if (exactAlarm.exact_alarm !== 'granted') {
          await LocalNotifications.changeExactNotificationSetting();
          return false;
        }

        // Also register for FCM push (background/closed notifications)
        const { receive } = await PushNotifications.requestPermissions();
        if (receive === 'granted') await PushNotifications.register();
      } else {
        if (!('Notification' in window)) return false;
        if (await Notification.requestPermission() !== 'granted') return false;
      }
      persist(true);
      if (isNative) {
        await scheduleAll();
        await LocalNotifications.schedule({
          notifications: [{
            id: 9100001,
            title: 'Rappels activés',
            body: "Les notifications d'anniversaires sont prêtes sur ton téléphone.",
            schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
            channelId: CHANNEL_ID,
            extra: { type: 'birthday-test' },
          }],
        });
      }
      return true;
    } catch {
      return false;
    }
  };

  const disable = async () => {
    persist(false);
    if (isNative) {
      try {
        const { notifications } = await LocalNotifications.getPending();
        if (notifications.length > 0) await LocalNotifications.cancel({ notifications });
      } catch (e) {
        console.error('[Notif] cancel:', e);
      }
    }
  };

  return { enabled, requestAndEnable, disable };
}
