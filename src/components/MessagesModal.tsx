import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, ArrowLeft, MessageCircle } from 'lucide-react';
import { Birthday, Message, UserProfile } from '../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  open: boolean;
  onClose: () => void;
  inbox: Message[];
  friends: Birthday[];
  friendsWithAccount: Set<string>;
  currentUser: UserProfile;
  onSend: (toId: string, text: string) => Promise<void>;
  onMarkRead: () => void;
}

export function MessagesModal({ open, onClose, inbox, friends, friendsWithAccount, currentUser, onSend, onMarkRead }: Props) {
  const [view, setView] = useState<'inbox' | 'compose'>('inbox');
  const [selectedFriend, setSelectedFriend] = useState<Birthday | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const unread = inbox.filter(m => !m.read).length;

  // Seuls les amis avec un compte (userId défini = enrichi depuis Firestore)
  const messageable = friends.filter(b => !!b.userId);

  const handleClose = () => {
    onMarkRead();
    setView('inbox');
    setSelectedFriend(null);
    setText('');
    setSent(false);
    onClose();
  };

  const handleSend = async () => {
    if (!selectedFriend || !text.trim() || sending) return;
    setSending(true);
    try {
      // Use the friend's original UID stored in their birthday doc
      // We need to find it — it's stored as the `id` field in Firestore before being overridden
      // Since we enrich photoUrl by querying users where documentId() in friendUids,
      // the friendUid is the same as what we query. But after enrichment, b.id = Firestore doc ID.
      // We store the friend's UID separately via a data attribute on the birthday.
      // For now, use the birthday id which after enrichment is the Firestore doc ID.
      // We need to pass the real UID — let's use a workaround via the inbox approach.
      // Actually, looking at the data flow: friends with accounts are found by querying
      // users collection where documentId() in [b's original uid].
      // The simplest approach: we'll store the real UID as a separate field.
      // For now, we pass selectedFriend.id (Firestore doc ID) but this is wrong for inbox path.
      // Let me use the approach: friends list is filtered by those whose photoUrl was enriched.
      // The real UID is in friendsWithAccount — but we don't have a direct mapping b -> uid.
      // WORKAROUND: use fromId from inbox messages to get real UIDs, or better:
      // fetch the user by name match. Actually best: store realId on birthday.
      // For now, let's use a different approach: pass toId via a prop on the birthday.
      await onSend(selectedFriend.userId!, text);
      setSent(true);
      setText('');
      setTimeout(() => { setSent(false); setView('inbox'); setSelectedFriend(null); }, 1800);
    } catch (e) {
      console.error('Send error:', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh]"
            style={{ border: '2px solid #0f172a' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 border-b border-slate-100">
              {view === 'compose' ? (
                <button onClick={() => { setView('inbox'); setSelectedFriend(null); setText(''); }} className="flex items-center gap-2 text-slate-600">
                  <ArrowLeft size={20} />
                  <span className="font-bold text-sm">Retour</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <MessageCircle size={20} style={{ color: '#FF4B4B' }} />
                  <h2 className="font-black text-slate-900 text-lg">Messages</h2>
                  {unread > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black text-white" style={{ background: '#FF4B4B' }}>
                      {unread}
                    </span>
                  )}
                </div>
              )}
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <X size={16} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {view === 'inbox' ? (
                  <motion.div key="inbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-3">

                    {/* New message button */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setView('compose')}
                      className="w-full py-3.5 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2"
                      style={{ background: '#FF4B4B', boxShadow: '0 4px 0 #CC2E2E' }}
                    >
                      <Send size={16} />
                      Nouveau message
                    </motion.button>

                    {/* Messages list */}
                    {inbox.length === 0 ? (
                      <div className="text-center py-12 space-y-3">
                        <div className="text-5xl">💌</div>
                        <p className="font-bold text-slate-500 text-sm">Aucun message pour l'instant</p>
                        <p className="text-xs text-slate-400">Tes amis peuvent t'envoyer des messages depuis leur app</p>
                      </div>
                    ) : (
                      inbox.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors ${
                            !msg.read ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-black/10">
                            {msg.fromPhotoUrl ? (
                              <img src={msg.fromPhotoUrl} alt={msg.fromName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-rose-400 flex items-center justify-center text-white font-black text-sm">
                                {msg.fromName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-slate-900 text-sm">{msg.fromName}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {format(parseISO(msg.createdAt), 'd MMM', { locale: fr })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{msg.text}</p>
                          </div>
                          {!msg.read && (
                            <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: '#FF4B4B' }} />
                          )}
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="compose" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-4">

                    {/* Select recipient */}
                    {!selectedFriend ? (
                      <>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Choisir un ami</p>
                        {messageable.length === 0 ? (
                          <div className="text-center py-12 space-y-3">
                            <div className="text-5xl">👥</div>
                            <p className="font-bold text-slate-500 text-sm">Aucun ami sur l'app</p>
                            <p className="text-xs text-slate-400">Seuls les amis qui ont un compte peuvent recevoir des messages</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {messageable.map(f => (
                              <motion.button
                                key={f.id}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setSelectedFriend(f)}
                                className="w-full flex items-center gap-3 p-3 bg-slate-50 border border-black/60 rounded-2xl hover:border-rose-300 transition-colors"
                              >
                                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-black/10">
                                  {f.photoUrl ? (
                                    <img src={f.photoUrl} alt={f.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-rose-400 flex items-center justify-center text-white font-black text-sm">
                                      {f.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div className="text-left">
                                  <p className="font-black text-slate-900 text-sm">{f.name}</p>
                                  <p className="text-xs text-emerald-500 font-bold">🎮 Sur l'app</p>
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Recipient header */}
                        <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-rose-200">
                            {selectedFriend.photoUrl ? (
                              <img src={selectedFriend.photoUrl} alt={selectedFriend.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-rose-400 flex items-center justify-center text-white font-black text-sm">
                                {selectedFriend.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm">{selectedFriend.name}</p>
                            <p className="text-xs text-rose-400 font-bold">Destinataire</p>
                          </div>
                          <button onClick={() => setSelectedFriend(null)} className="ml-auto w-7 h-7 rounded-full bg-white border border-rose-200 flex items-center justify-center">
                            <X size={13} className="text-slate-400" />
                          </button>
                        </div>

                        {/* Text input */}
                        <textarea
                          value={text}
                          onChange={e => setText(e.target.value)}
                          placeholder={`Écris un message à ${selectedFriend.name}...`}
                          maxLength={300}
                          className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-rose-400 outline-none text-sm text-slate-800 resize-none transition-colors"
                          rows={4}
                        />
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400">{text.length}/300</span>
                          {sent && <span className="text-xs font-black text-emerald-500">✓ Envoyé !</span>}
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={handleSend}
                          disabled={!text.trim() || sending}
                          className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                          style={{ background: '#FF4B4B', boxShadow: '0 4px 0 #CC2E2E' }}
                        >
                          {sending ? 'Envoi...' : <><Send size={16} /> Envoyer</>}
                        </motion.button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
