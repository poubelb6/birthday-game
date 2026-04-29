"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNewMessage = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
(0, app_1.initializeApp)();
// Triggered every time a new message document is created in /messages
exports.onNewMessage = (0, firestore_1.onDocumentCreated)('messages/{messageId}', async (event) => {
    var _a, _b, _c;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!(data === null || data === void 0 ? void 0 : data.toId) || !(data === null || data === void 0 ? void 0 : data.fromName) || !(data === null || data === void 0 ? void 0 : data.text))
        return;
    // Read recipient's FCM token stored in their user document
    const userSnap = await (0, firestore_2.getFirestore)().doc(`users/${data.toId}`).get();
    const fcmToken = (_b = userSnap.data()) === null || _b === void 0 ? void 0 : _b.fcmToken;
    if (!fcmToken)
        return; // user hasn't enabled push notifications
    const body = typeof data.text === 'string' && data.text.length > 60
        ? data.text.slice(0, 57) + '…'
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
        // Stale or invalid token — log only, don't crash the function
        console.error('[FCM] send error:', err);
    }
});
//# sourceMappingURL=index.js.map