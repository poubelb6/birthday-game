"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDailyBirthdayReminders = exports.onNewMessage = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const firestore_2 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
(0, app_1.initializeApp)();
const FIRESTORE_DATABASE_ID = 'ai-studio-205d5702-c386-45bf-9a75-c55bd6d77f3b';
const firestore = (0, firestore_1.getFirestore)(FIRESTORE_DATABASE_ID);
function getMonthDay(dateStr) {
    const match = dateStr.match(/^\d{4}-(\d{2})-(\d{2})/);
    if (!match)
        return null;
    return `${match[1]}-${match[2]}`;
}
function getTodayMonthDayInParis() {
    var _a, _b, _c, _d;
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Paris',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const month = (_b = (_a = parts.find((part) => part.type === 'month')) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '01';
    const day = (_d = (_c = parts.find((part) => part.type === 'day')) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : '01';
    return `${month}-${day}`;
}
function getTodayKeyInParis() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}
exports.onNewMessage = (0, firestore_2.onDocumentCreated)({
    document: 'messages/{messageId}',
    database: FIRESTORE_DATABASE_ID,
}, async (event) => {
    var _a, _b, _c;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!(data === null || data === void 0 ? void 0 : data.toId) || !(data === null || data === void 0 ? void 0 : data.fromName) || !(data === null || data === void 0 ? void 0 : data.text))
        return;
    const userSnap = await firestore.doc(`users/${data.toId}`).get();
    const fcmToken = (_b = userSnap.data()) === null || _b === void 0 ? void 0 : _b.fcmToken;
    if (!fcmToken)
        return;
    const body = typeof data.text === 'string' && data.text.length > 60
        ? `${data.text.slice(0, 57)}…`
        : String(data.text);
    try {
        await (0, messaging_1.getMessaging)().send({
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
                fromId: String((_c = data.fromId) !== null && _c !== void 0 ? _c : ''),
            },
        });
    }
    catch (err) {
        console.error('[FCM] send error:', err);
    }
});
exports.sendDailyBirthdayReminders = (0, scheduler_1.onSchedule)({
    schedule: '0 8 * * *',
    timeZone: 'Europe/Paris',
    region: 'us-central1',
    retryCount: 0,
}, async () => {
    const todayMonthDay = getTodayMonthDayInParis();
    const todayKey = getTodayKeyInParis();
    const usersSnap = await firestore.collection('users').get();
    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;
        if (!fcmToken)
            continue;
        const logRef = userDoc.ref.collection('systemNotifications').doc(`birthday-${todayKey}`);
        if ((await logRef.get()).exists)
            continue;
        const birthdaysSnap = await userDoc.ref.collection('birthdays').get();
        const todaysBirthdays = birthdaysSnap.docs
            .map((doc) => doc.data())
            .filter((birthday) => birthday.name && birthday.birthDate)
            .filter((birthday) => getMonthDay(String(birthday.birthDate)) === todayMonthDay)
            .map((birthday) => String(birthday.name));
        if (todaysBirthdays.length === 0)
            continue;
        const title = todaysBirthdays.length === 1
            ? `🎉 C'est l'anniversaire de ${todaysBirthdays[0]}`
            : `🎉 ${todaysBirthdays.length} anniversaires aujourd'hui`;
        const body = todaysBirthdays.length === 1
            ? "Ouvre Birthday Game pour lui envoyer un message."
            : `${todaysBirthdays.slice(0, 3).join(', ')}${todaysBirthdays.length > 3 ? '…' : ''} comptent sur toi aujourd'hui.`;
        try {
            await (0, messaging_1.getMessaging)().send({
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
        }
        catch (err) {
            console.error('[FCM] daily birthday send error:', userDoc.id, err);
        }
    }
});
//# sourceMappingURL=index.js.map