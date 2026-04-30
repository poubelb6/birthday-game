import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();

const FIRESTORE_DATABASE_ID = 'ai-studio-205d5702-c386-45bf-9a75-c55bd6d77f3b';
const firestore = getFirestore(FIRESTORE_DATABASE_ID);

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
    const todayMonthDay = getTodayMonthDayInParis();
    const todayKey = getTodayKeyInParis();
    const usersSnap = await firestore.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data() as { fcmToken?: string };
      const fcmToken = userData.fcmToken;
      if (!fcmToken) continue;

      const logRef = userDoc.ref.collection('systemNotifications').doc(`birthday-${todayKey}`);
      if ((await logRef.get()).exists) continue;

      const birthdaysSnap = await userDoc.ref.collection('birthdays').get();
      const todaysBirthdays = birthdaysSnap.docs
        .map((doc) => doc.data() as { name?: string; birthDate?: string })
        .filter((birthday) => birthday.name && birthday.birthDate)
        .filter((birthday) => getMonthDay(String(birthday.birthDate)) === todayMonthDay)
        .map((birthday) => String(birthday.name));

      if (todaysBirthdays.length === 0) continue;

      const title =
        todaysBirthdays.length === 1
          ? `🎉 C'est l'anniversaire de ${todaysBirthdays[0]}`
          : `🎉 ${todaysBirthdays.length} anniversaires aujourd'hui`;

      const body =
        todaysBirthdays.length === 1
          ? "Ouvre Birthday Game pour lui envoyer un message."
          : `${todaysBirthdays.slice(0, 3).join(', ')}${todaysBirthdays.length > 3 ? '…' : ''} comptent sur toi aujourd'hui.`;

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
            scope: 'daily',
          },
        });

        await logRef.set({
          sentAt: new Date().toISOString(),
          count: todaysBirthdays.length,
          names: todaysBirthdays,
        });
      } catch (err) {
        console.error('[FCM] daily birthday send error:', userDoc.id, err);
      }
    }
  },
);
