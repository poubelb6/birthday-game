import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();

const FIRESTORE_DATABASE_ID = 'ai-studio-205d5702-c386-45bf-9a75-c55bd6d77f3b';
const firestore = getFirestore(FIRESTORE_DATABASE_ID);
const BIRTHDAY_REMINDER_DAYS = [0, 3, 7, 30] as const;

function getMonthDay(dateStr: string): string | null {
  const match = dateStr.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}`;
}

function getTodayMonthDayInParis(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${month}-${day}`;
}

function getTodayKeyInParis(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getPseudoParisToday(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '1970');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '01');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '01');

  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getPseudoDateFromIso(iso: string): Date {
  const parsed = new Date(iso);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function toDateKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function toMonthDay(date: Date): string {
  return [
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function getReminderCopy(days: number, names: string[]): { title: string; body: string } {
  if (days === 0) {
    return names.length === 1
      ? {
          title: `🎉 C'est l'anniversaire de ${names[0]}`,
          body: "Ouvre Birthday Game pour lui envoyer un message.",
        }
      : {
          title: `🎉 ${names.length} anniversaires aujourd'hui`,
          body: `${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''} comptent sur toi aujourd'hui.`,
        };
  }

  const label = days === 30 ? 'dans 30 jours' : days === 7 ? 'dans 7 jours' : 'dans 3 jours';

  return names.length === 1
    ? {
        title: `🎂 ${names[0]} fête son anniversaire ${label}`,
        body: "Tu peux déjà préparer ton message ou ton idée cadeau.",
      }
    : {
        title: `🎂 ${names.length} anniversaires arrivent ${label}`,
        body: `${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''} arrivent bientôt.`,
      };
}

function getStreakReminderCopy(userName?: string): { title: string; body: string } {
  return {
    title: '🔥 Garde ton streak en vie',
    body: `${userName ? `${userName}, ` : ''}ajoute un ami avant la fin de la semaine pour ne pas casser ta série.`,
  };
}

export const onNewMessage = onDocumentCreated(
  {
    document: 'messages/{messageId}',
    database: FIRESTORE_DATABASE_ID,
  },
  async (event) => {
    const data = event.data?.data();
    if (!data?.toId || !data?.fromName || !data?.text) return;

    const userSnap = await firestore.doc(`users/${data.toId}`).get();
    const fcmToken = userSnap.data()?.fcmToken as string | undefined;
    if (!fcmToken) return;

    const body =
      typeof data.text === 'string' && data.text.length > 60
        ? `${data.text.slice(0, 57)}…`
        : String(data.text);

    try {
      await getMessaging().send({
        token: fcmToken,
        notification: {
          title: `💬 Message de ${data.fromName}`,
          body,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'birthday-reminders',
            priority: 'high',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        data: {
          type: 'message',
          fromId: String(data.fromId ?? ''),
        },
      });
    } catch (err) {
      console.error('[FCM] send error:', err);
    }
  },
);

export const sendDailyBirthdayReminders = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'Europe/Paris',
    region: 'us-central1',
    retryCount: 0,
  },
  async () => {
    const today = getPseudoParisToday();
    const todayKey = getTodayKeyInParis();
    const usersSnap = await firestore.collection('users').get();
    const targets = Object.fromEntries(
      BIRTHDAY_REMINDER_DAYS.map((days) => [days, toMonthDay(addDays(today, days))]),
    ) as Record<(typeof BIRTHDAY_REMINDER_DAYS)[number], string>;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data() as { fcmToken?: string };
      const fcmToken = userData.fcmToken;
      if (!fcmToken) continue;

      const birthdaysSnap = await userDoc.ref.collection('birthdays').get();
      const birthdays = birthdaysSnap.docs
        .map((doc) => doc.data() as { name?: string; birthDate?: string })
        .filter((birthday) => birthday.name && birthday.birthDate)
        .map((birthday) => ({
          name: String(birthday.name),
          monthDay: getMonthDay(String(birthday.birthDate)),
        }));

      for (const days of BIRTHDAY_REMINDER_DAYS) {
        const logRef = userDoc.ref.collection('systemNotifications').doc(`birthday-${todayKey}-${days}`);
        if ((await logRef.get()).exists) continue;

        const names = birthdays
          .filter((birthday) => birthday.monthDay === targets[days])
          .map((birthday) => birthday.name);

        if (names.length === 0) continue;

        const { title, body } = getReminderCopy(days, names);

        try {
          await getMessaging().send({
            token: fcmToken,
            notification: { title, body },
            android: {
              priority: 'high',
              notification: {
                channelId: 'birthday-reminders',
                priority: 'high',
                sound: 'default',
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                },
              },
            },
            data: {
              type: 'birthday',
              scope: days === 0 ? 'daily' : `d-${days}`,
            },
          });

          await logRef.set({
            sentAt: new Date().toISOString(),
            count: names.length,
            names,
            days,
          });
        } catch (err) {
          console.error('[FCM] birthday reminder send error:', userDoc.id, days, err);
        }
      }
    }
  },
);

export const sendWeeklyStreakReminders = onSchedule(
  {
    schedule: '0 18 * * 5',
    timeZone: 'Europe/Paris',
    region: 'us-central1',
    retryCount: 0,
  },
  async () => {
    const today = getPseudoParisToday();
    const todayKey = getTodayKeyInParis();
    const dayOfWeek = today.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = addDays(today, -mondayOffset);
    const weekStartKey = toDateKey(weekStart);

    const usersSnap = await firestore.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data() as { fcmToken?: string; name?: string };
      const fcmToken = userData.fcmToken;
      if (!fcmToken) continue;

      const logRef = userDoc.ref.collection('systemNotifications').doc(`streak-${todayKey}`);
      if ((await logRef.get()).exists) continue;

      const birthdaysSnap = await userDoc.ref.collection('birthdays').get();
      const hasAddedThisWeek = birthdaysSnap.docs.some((doc) => {
        const addedAt = doc.data()?.addedAt;
        if (typeof addedAt !== 'string') return false;
        const addedDate = toDateKey(getPseudoDateFromIso(addedAt));
        return addedDate >= weekStartKey && addedDate <= todayKey;
      });

      if (hasAddedThisWeek) continue;

      const { title, body } = getStreakReminderCopy(userData.name);

      try {
        await getMessaging().send({
          token: fcmToken,
          notification: { title, body },
          android: {
            priority: 'high',
            notification: {
              channelId: 'birthday-reminders',
              priority: 'high',
              sound: 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
          data: {
            type: 'streak',
            scope: 'weekly',
          },
        });

        await logRef.set({
          sentAt: new Date().toISOString(),
          weekStart: weekStartKey,
        });
      } catch (err) {
        console.error('[FCM] streak reminder send error:', userDoc.id, err);
      }
    }
  },
);
