import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, ArrowLeft, MessageCircle, Plus } from 'lucide-react';
import { Birthday, Message, UserProfile } from '../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  open: boolean;
  onClose: () => void;
  inbox: Message[];
  sentMessages: Message[];
  friends: Birthday[];
  currentUser: UserProfile;
  onSend: (toId: string, text: string) => Promise<void>;
  onMarkConversationRead: (fromId: string) => Promise<void>;
}

type View = 'list' | 'newConv' | 'chat';

interface ConvData {
  partnerId: string;
  friend: Birthday | null;
  messages: Message[];
  unread: number;
  lastMsg: Message;
}

function Avatar({ photoUrl, name, size = 'md' }: { photoUrl?: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sizeClass} rounded-2xl overflow-hidden border border-black/10 shrink-0`}>
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-rose-400 flex items-center justify-center text-white font-black">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export function MessagesModal({ open, onClose, inbox, sentMessages, friends, currentUser, onSend, onMarkConversationRead }: Props) {
  const [view, setView] = useState<View>('list');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messageable = friends.filter(b => !!b.userId);

  // Build conversations from all messages
  const allMessages = [...inbox, ...sentMessages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const convMap = new Map<string, ConvData>();
  allMessages.forEach(msg => {
    const partnerId = msg.fromId === currentUser.id ? msg.toId : msg.fromId;
    if (!convMap.has(partnerId)) {
      convMap.set(partnerId, {
        partnerId,
        friend: messageable.find(f => f.userId === partnerId) || null,
        messages: [],
        unread: 0,
        lastMsg: msg,
      });
    }
    const conv = convMap.get(partnerId)!;
    conv.messages.push(msg);
    conv.lastMsg = msg;
    if (msg.fromId !== currentUser.id && !msg.read) conv.unread++;
  });

  const conversations = Array.from(convMap.values())
    .sort((a, b) => b.lastMsg.createdAt.localeCompare(a.lastMsg.createdAt));

  const activeConv = selectedPartnerId ? convMap.get(selectedPartnerId) : null;
  const activeMessages = activeConv?.messages || [];
  const activeFriend = selectedPartnerId
    ? (activeConv?.friend || messageable.find(f => f.userId === selectedPartnerId) || null)
    : null;

  const totalUnread = inbox.filter(m => !m.read).length;

  // Auto-scroll when chat opens or new message arrives
  useEffect(() => {
    if (view === 'chat') {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [view, activeMessages.length]);

  // Mark conversation as read when opening chat
  useEffect(() => {
    if (view === 'chat' && selectedPartnerId) {
      onMarkConversationRead(selectedPartnerId);
    }
  }, [view, selectedPartnerId]); // eslint-disable-line

  const openChat = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    setView('chat');
    setText('');
  };

  const handleSend = async () => {
    if (!selectedPartnerId || !text.trim() || sending) return;
    setSending(true);
    try {
      await onSend(selectedPartnerId, text.trim());
      setText('');
      textareaRef.current?.focus();
    } catch (e) {
      console.error('Send error:', e);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setView('list');
    setSelectedPartnerId(null);
    setText('');
    onClose();
  };

  const goBack = () => {
    setView('list');
    setSelectedPartnerId(null);
    setText('');
  };

  const getPartnerName = (conv: ConvData) =>
    conv.friend?.name || (conv.lastMsg.fromId !== currentUser.id ? conv.lastMsg.fromName : 'Inconnu');
  const getPartnerPhoto = (conv: ConvData) =>
    conv.friend?.photoUrl || (conv.lastMsg.fromId !== currentUser.id ? conv.lastMsg.fromPhotoUrl : undefined);

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
            className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{ border: '2px solid #0f172a', height: '85vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0 border-b border-slate-100">
              <AnimatePresence mode="wait">
                {view === 'list' && (
                  <motion.div key="h-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <MessageCircle size={20} style={{ color: '#FF4B4B' }} />
                    <h2 className="font-black text-slate-900 text-lg">Messages</h2>
                    {totalUnread > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-black text-white" style={{ background: '#FF4B4B' }}>
                        {totalUnread}
                      </span>
                    )}
                  </motion.div>
                )}
                {view === 'newConv' && (
                  <motion.button key="h-new" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={goBack} className="flex items-center gap-2 text-slate-700">
                    <ArrowLeft size={18} />
                    <span className="font-black text-slate-900 text-base">Nouveau message</span>
                  </motion.button>
                )}
                {view === 'chat' && (
                  <motion.button key="h-chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={goBack} className="flex items-center gap-2 text-slate-700">
                    <ArrowLeft size={18} />
                    {activeFriend ? (
                      <div className="flex items-center gap-2">
                        <Avatar photoUrl={activeFriend.photoUrl} name={activeFriend.name} size="sm" />
                        <span className="font-black text-slate-900 text-base">{activeFriend.name}</span>
                      </div>
                    ) : (
                      <span className="font-black text-slate-900 text-base">Discussion</span>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2">
                {view === 'list' && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setView('newConv')}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                    style={{ background: '#FF4B4B' }}
                  >
                    <Plus size={16} />
                  </motion.button>
                )}
                <button onClick={handleClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <X size={16} className="text-slate-500" />
                </button>
              </div>
            </div>

            {/* Views */}
            <AnimatePresence mode="wait">

              {/* ── List ── */}
              {view === 'list' && (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 pb-10">
                      <div className="text-5xl">💌</div>
                      <p className="font-bold text-slate-500 text-sm">Aucune conversation</p>
                      <p className="text-xs text-slate-400 text-center px-6">Démarre une discussion avec un ami qui a l'app</p>
                      <button
                        onClick={() => setView('newConv')}
                        className="mt-2 px-5 py-3 rounded-2xl font-black text-white text-sm"
                        style={{ background: '#FF4B4B', boxShadow: '0 4px 0 #CC2E2E' }}
                      >
                        Nouveau message
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {conversations.map(conv => (
                        <motion.button
                          key={conv.partnerId}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => openChat(conv.partnerId)}
                          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="relative shrink-0">
                            <Avatar photoUrl={getPartnerPhoto(conv)} name={getPartnerName(conv)} size="lg" />
                            {conv.unread > 0 && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center" style={{ background: '#FF4B4B' }}>
                                {conv.unread}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-sm ${conv.unread > 0 ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                                {getPartnerName(conv)}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {format(parseISO(conv.lastMsg.createdAt), 'd MMM', { locale: fr })}
                              </span>
                            </div>
                            <p className={`text-xs mt-0.5 truncate ${conv.unread > 0 ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>
                              {conv.lastMsg.fromId === currentUser.id ? 'Vous : ' : ''}{conv.lastMsg.text}
                            </p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── New conversation ── */}
              {view === 'newConv' && (
                <motion.div key="newConv" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 overflow-y-auto p-4 space-y-2">
                  {messageable.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 pb-10">
                      <div className="text-5xl">👥</div>
                      <p className="font-bold text-slate-500 text-sm">Aucun ami sur l'app</p>
                      <p className="text-xs text-slate-400 text-center px-6">Seuls les amis avec un compte peuvent recevoir des messages</p>
                    </div>
                  ) : (
                    messageable.map(f => (
                      <motion.button
                        key={f.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => openChat(f.userId!)}
                        className="w-full flex items-center gap-3 p-3 bg-slate-50 border border-black/10 rounded-2xl hover:border-rose-300 transition-colors"
                      >
                        <Avatar photoUrl={f.photoUrl} name={f.name} size="md" />
                        <div className="text-left">
                          <p className="font-black text-slate-900 text-sm">{f.name}</p>
                          <p className="text-xs text-emerald-500 font-bold">🎮 Sur l'app</p>
                        </div>
                      </motion.button>
                    ))
                  )}
                </motion.div>
              )}

              {/* ── Chat thread ── */}
              {view === 'chat' && (
                <motion.div key="chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col min-h-0">
                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                    {activeMessages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full gap-2 pb-6">
                        <div className="text-3xl">👋</div>
                        <p className="text-xs text-slate-400">Commence la conversation !</p>
                      </div>
                    )}
                    {activeMessages.map((msg, i) => {
                      const isMine = msg.fromId === currentUser.id;
                      const prevMsg = activeMessages[i - 1];
                      const showDate = i === 0 || prevMsg.createdAt.slice(0, 10) !== msg.createdAt.slice(0, 10);
                      const sameAuthorAsPrev = prevMsg && prevMsg.fromId === msg.fromId && !showDate;
                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="text-center text-[10px] text-slate-400 my-3 font-semibold">
                              {format(parseISO(msg.createdAt), 'EEEE d MMMM', { locale: fr })}
                            </div>
                          )}
                          <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${sameAuthorAsPrev ? 'mt-0.5' : 'mt-2'}`}>
                            <div
                              className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed ${
                                isMine
                                  ? 'text-white rounded-2xl rounded-br-sm'
                                  : 'text-slate-900 bg-slate-100 rounded-2xl rounded-bl-sm'
                              }`}
                              style={isMine ? { background: '#FF4B4B' } : {}}
                            >
                              <p>{msg.text}</p>
                              <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60 text-right' : 'text-slate-400'}`}>
                                {format(parseISO(msg.createdAt), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input bar */}
                  <div className="px-4 py-3 border-t border-slate-100 flex items-end gap-2 shrink-0 bg-white">
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={e => setText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                      placeholder="Écrire un message..."
                      maxLength={300}
                      rows={1}
                      className="flex-1 px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-rose-400 outline-none text-sm text-slate-800 resize-none transition-colors"
                      style={{ maxHeight: '100px' }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={handleSend}
                      disabled={!text.trim() || sending}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-opacity"
                      style={{ background: '#FF4B4B', boxShadow: '0 3px 0 #CC2E2E' }}
                    >
                      <Send size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
