"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWeeklyStreakReminders = exports.sendDailyBirthdayReminders = exports.onNewMessage = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const firestore_2 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
(0, app_1.initializeApp)();
const FIRESTORE_DATABASE_ID = 'ai-studio-205d5702-c386-45bf-9a75-c55bd6d77f3b';
const firestore = (0, firestore_1.getFirestore)(FIRESTORE_DATABASE_ID);
const BIRTHDAY_REMINDER_DAYS = [0, 3, 7, 15, 30];
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
function getPseudoParisToday() {
    var _a, _b, _c, _d, _e, _f;
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const year = Number((_b = (_a = parts.find((part) => part.type === 'year')) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '1970');
    const month = Number((_d = (_c = parts.find((part) => part.type === 'month')) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : '01');
    const day = Number((_f = (_e = parts.find((part) => part.type === 'day')) === null || _e === void 0 ? void 0 : _e.value) !== null && _f !== void 0 ? _f : '01');
    return new Date(Date.UTC(year, month - 1, day));
}
function addDays(date, days) {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}
function getPseudoDateFromIso(iso) {
    const parsed = new Date(iso);
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}
function toDateKey(date) {
    return [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, '0'),
        String(date.getUTCDate()).padStart(2, '0'),
    ].join('-');
}
function toMonthDay(date) {
    return [
        String(date.getUTCMonth() + 1).padStart(2, '0'),
        String(date.getUTCDate()).padStart(2, '0'),
    ].join('-');
}
function getReminderCopy(days, names) {
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
    const label = days === 30 ? 'dans 30 jours' :
        days === 15 ? 'dans 15 jours' :
            days === 7 ? 'dans 7 jours' :
                'dans 3 jours';
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
function getStreakReminderCopy(userName) {
    return {
        title: '🔥 Garde ton streak en vie',
        body: `${userName ? `${userName}, ` : ''}ajoute un ami avant la fin de la semaine pour ne pas casser ta série.`,
    };
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
    const today = getPseudoParisToday();
    const todayKey = getTodayKeyInParis();
    const usersSnap = await firestore.collection('users').get();
    const targets = Object.fromEntries(BIRTHDAY_REMINDER_DAYS.map((days) => [days, toMonthDay(addDays(today, days))]));
    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;
        if (!fcmToken)
            continue;
        const birthdaysSnap = await userDoc.ref.collection('birthdays').get();
        const birthdays = birthdaysSnap.docs
            .map((doc) => doc.data())
            .filter((birthday) => birthday.name && birthday.birthDate)
            .map((birthday) => ({
            name: String(birthday.name),
            monthDay: getMonthDay(String(birthday.birthDate)),
        }));
        for (const days of BIRTHDAY_REMINDER_DAYS) {
            const logRef = userDoc.ref.collection('systemNotifications').doc(`birthday-${todayKey}-${days}`);
            if ((await logRef.get()).exists)
                continue;
            const names = birthdays
                .filter((birthday) => birthday.monthDay === targets[days])
                .map((birthday) => birthday.name);
            if (names.length === 0)
                continue;
            const { title, body } = getReminderCopy(days, names);
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
                        scope: days === 0 ? 'daily' : `d-${days}`,
                    },
                });
                await logRef.set({
                    sentAt: new Date().toISOString(),
                    count: names.length,
                    names,
                    days,
                });
            }
            catch (err) {
                console.error('[FCM] birthday reminder send error:', userDoc.id, days, err);
            }
        }
    }
});
exports.sendWeeklyStreakReminders = (0, scheduler_1.onSchedule)({
    schedule: '0 18 * * 5',
    timeZone: 'Europe/Paris',
    region: 'us-central1',
    retryCount: 0,
}, async () => {
    const today = getPseudoParisToday();
    const todayKey = getTodayKeyInParis();
    const dayOfWeek = today.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = addDays(today, -mondayOffset);
    const weekStartKey = toDateKey(weekStart);
    const usersSnap = await firestore.collection('users').get();
    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;
        if (!fcmToken)
            continue;
        const logRef = userDoc.ref.collection('systemNotifications').doc(`streak-${todayKey}`);
        if ((await logRef.get()).exists)
            continue;
        const birthdaysSnap = await userDoc.ref.collection('birthdays').get();
        const hasAddedThisWeek = birthdaysSnap.docs.some((doc) => {
            var _a;
            const addedAt = (_a = doc.data()) === null || _a === void 0 ? void 0 : _a.addedAt;
            if (typeof addedAt !== 'string')
                return false;
            const addedDate = toDateKey(getPseudoDateFromIso(addedAt));
            return addedDate >= weekStartKey && addedDate <= todayKey;
        });
        if (hasAddedThisWeek)
            continue;
        const { title, body } = getStreakReminderCopy(userData.name);
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
                    type: 'streak',
                    scope: 'weekly',
                },
            });
            await logRef.set({
                sentAt: new Date().toISOString(),
                weekStart: weekStartKey,
            });
        }
        catch (err) {
            console.error('[FCM] streak reminder send error:', userDoc.id, err);
        }
    }
});
//# sourceMappingURL=index.js.map