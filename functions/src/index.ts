import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

initializeApp();

const FIRESTORE_DATABASE_ID = 'ai-studio-205d5702-c386-45bf-9a75-c55bd6d77f3b';

// Triggered every time a new message document is created in /messages
export const onNewMessage = onDocumentCreated({
  document: 'messages/{messageId}',
  database: FIRESTORE_DATABASE_ID,
}, async (event) => {
  const data = event.data?.data();
  if (!data?.toId || !data?.fromName || !data?.text) return;

  // Read recipient's FCM token stored in their user document
  const userSnap = await getFirestore(FIRESTORE_DATABASE_ID).doc(`users/${data.toId}`).get();
  const fcmToken = userSnap.data()?.fcmToken as string | undefined;
  if (!fcmToken) return; // user hasn't enabled push notifications

  const body: string =
    typeof data.text === 'string' && data.text.length > 60
      ? data.text.slice(0, 57) + '…'
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
    // Stale or invalid token — log only, don't crash the function
    console.error('[FCM] send error:', err);
  }
});
