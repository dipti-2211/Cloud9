import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare, Send, Image as ImageIcon, Paperclip, X, Check, CheckCheck,
  Search, ArrowLeft, AlertTriangle, Shield, User, Clock, RefreshCw
} from 'lucide-react';
import { chatAPI, auth } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import toast from 'react-hot-toast';

const QUICK_PROMPTS = [
  "Casualties or injuries reported?",
  "Estimated time to clear road?",
  "Need emergency response team dispatched?",
  "Please upload a photo of the incident site.",
  "Is the road completely blocked or single lane passable?",
];

export const Chat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const user = auth.getUser();
  const isAdmin = user?.role === 'ADMIN';

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState(null);

  // Mobile navigation state
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Read URL query params: ?incidentId=...&officer=...
  const queryIncidentId = searchParams.get('incidentId');
  const queryOfficer = searchParams.get('officer');
  const queryOfficerId = searchParams.get('officerId');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Load conversations
  const loadConversations = useCallback(async () => {
    setLoadingThreads(true);
    try {
      let list = await chatAPI.getConversations();

      // If user came from an incident link, ensure conversation exists
      if (queryIncidentId || queryOfficer) {
        const existing = list.find(c =>
          (queryIncidentId && c.relatedIncidentId === queryIncidentId) ||
          (queryOfficer && c.fieldOfficerName?.toLowerCase().includes(queryOfficer.toLowerCase()))
        );
        if (existing) {
          setActiveConvId(existing._id);
          setShowMobileChat(true);
        } else {
          // Create conversation for this incident
          const created = await chatAPI.createOrGetConversation({
            fieldOfficerId: queryOfficerId || 'demo-ofc-001',
            fieldOfficerName: queryOfficer || 'Field Officer',
            relatedIncidentId: queryIncidentId || null,
            incidentSummary: `Incident Ref #${queryIncidentId?.slice(-6) || 'ALERT'}`,
          });
          if (created) {
            list = [created, ...list];
            setActiveConvId(created._id);
            setShowMobileChat(true);
          }
        }
      } else if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0]._id);
      }

      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      toast.error('Failed to load chat channels');
    } finally {
      setLoadingThreads(false);
    }
  }, [queryIncidentId, queryOfficer, queryOfficerId, activeConvId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 2. Load messages when active conversation changes
  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingMessages(true);
    try {
      const msgs = await chatAPI.getMessages(convId);
      setMessages(msgs);
      setTimeout(scrollToBottom, 50);

      // Reset unread on local conversation item
      setConversations(prev => prev.map(c => {
        if (c._id === convId) {
          return isAdmin ? { ...c, unreadCountAdmin: 0 } : { ...c, unreadCountOfficer: 0 };
        }
        return c;
      }));
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId, loadMessages]);

  // 3. Socket.io Room join/leave and message listener
  useEffect(() => {
    const s = socket?.current || socket;
    if (!s || !activeConvId) return;

    if (typeof s.emit === 'function') {
      s.emit('join_conversation', activeConvId);
    }

    const handleChatMessage = (newMsg) => {
      if (newMsg.conversationId === activeConvId) {
        setMessages(prev => {
          if (prev.some(m => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(scrollToBottom, 50);
      }
    };

    const handleGlobalChat = ({ conversationId, message }) => {
      setConversations(prev => {
        return prev.map(c => {
          if (c._id === conversationId) {
            return {
              ...c,
              lastMessage: message.text || (message.attachmentUrl ? '📷 Photo attached' : 'New message'),
              lastMessageAt: message.createdAt || new Date(),
              unreadCountAdmin: (!isAdmin || conversationId === activeConvId) ? c.unreadCountAdmin : (c.unreadCountAdmin || 0) + 1,
              unreadCountOfficer: (isAdmin || conversationId === activeConvId) ? c.unreadCountOfficer : (c.unreadCountOfficer || 0) + 1,
            };
          }
          return c;
        });
      });
    };

    if (typeof s.on === 'function') {
      s.on('chat_message', handleChatMessage);
      s.on('new_chat_message', handleGlobalChat);
    }

    return () => {
      if (typeof s.emit === 'function') {
        s.emit('leave_conversation', activeConvId);
      }
      if (typeof s.off === 'function') {
        s.off('chat_message', handleChatMessage);
        s.off('new_chat_message', handleGlobalChat);
      }
    };
  }, [socket, activeConvId, isAdmin]);

  // 4. Send message handler
  const handleSendMessage = async (customText = null) => {
    const textToSend = typeof customText === 'string' ? customText : inputText;
    if (!textToSend.trim() && !selectedFile) return;
    if (!activeConvId) return;

    setSending(true);
    try {
      let payload;
      if (selectedFile) {
        const fd = new FormData();
        fd.append('text', textToSend.trim());
        fd.append('senderRole', user?.role || 'ADMIN');
        fd.append('senderName', user?.name || (isAdmin ? 'Command Control Admin' : 'Field Officer'));
        fd.append('attachment', selectedFile);
        payload = fd;
      } else {
        payload = {
          text: textToSend.trim(),
          senderRole: user?.role || 'ADMIN',
          senderName: user?.name || (isAdmin ? 'Command Control Admin' : 'Field Officer'),
        };
      }

      const sent = await chatAPI.sendMessage(activeConvId, payload);
      if (sent) {
        setMessages(prev => [...prev, sent]);
        setInputText('');
        setSelectedFile(null);
        setFilePreview(null);
        setTimeout(scrollToBottom, 50);

        // Update local conversation lastMessage
        setConversations(prev => prev.map(c => {
          if (c._id === activeConvId) {
            return {
              ...c,
              lastMessage: sent.text || '📷 Photo attached',
              lastMessageAt: new Date(),
            };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error('Send message error:', err);
      toast.error('Failed to deliver message');
    } finally {
      setSending(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG/PNG)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setFilePreview(url);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Active conversation object
  const activeConv = conversations.find(c => c._id === activeConvId);

  // Filter conversations
  const filteredConversations = conversations.filter(c =>
    (c.fieldOfficerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.incidentSummary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 520 }}>
      <PageHeader
        title="Field Officer ↔ Control Room Live Chat"
        description="Real-time encrypted operational communications · Instant incident hazard inquiries · Photo assessment uploads"
      />

      {/* Main Two-Pane Chat Container */}
      <div
        className="card"
        style={{
          flex: 1,
          display: 'flex',
          padding: 0,
          overflow: 'hidden',
          position: 'relative',
          borderRadius: 12,
          border: '1px solid var(--line)',
        }}
      >
        {/* ================================================================
            LEFT PANE — Channels / Officers List
        ================================================================ */}
        <div
          style={{
            width: 320,
            borderRight: '1px solid var(--line)',
            background: 'var(--white)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            // On mobile, hide list if viewing active chat
            ...(showMobileChat ? { '@media(max-width: 768px)': { display: 'none' } } : {}),
          }}
          className={`chat-sidebar-pane ${showMobileChat ? 'hidden-mobile' : ''}`}
        >
          {/* Channel Header & Search */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', background: 'var(--sky-tint)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} color="var(--sky-dark)" />
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--ink)' }}>
                  {isAdmin ? 'Field Officer Channels' : 'Control Room Line'}
                </span>
              </div>
              <button
                onClick={loadConversations}
                title="Refresh channels"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', display: 'flex' }}
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {isAdmin && (
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)' }} />
                <input
                  type="text"
                  placeholder="Search officer or incident…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    fontSize: '0.8rem',
                    borderRadius: 6,
                    border: '1px solid var(--line)',
                    background: 'var(--white)',
                    outline: 'none',
                  }}
                />
              </div>
            )}
          </div>

          {/* Conversations Scrollable List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingThreads ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--slate)', fontSize: '0.85rem' }}>
                Loading channels…
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--slate)', fontSize: '0.85rem' }}>
                No active conversations found.
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = conv._id === activeConvId;
                const unread = isAdmin ? (conv.unreadCountAdmin || 0) : (conv.unreadCountOfficer || 0);

                return (
                  <div
                    key={conv._id}
                    onClick={() => {
                      setActiveConvId(conv._id);
                      setShowMobileChat(true);
                    }}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--line)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--sky-tint-2)' : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--sky)' : '4px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--ink)' }}>
                        {conv.fieldOfficerName}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--slate)' }}>
                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    {conv.incidentSummary && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 6px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', fontSize: '0.68rem', fontWeight: 600, marginBottom: 4 }}>
                        <AlertTriangle size={10} /> {conv.incidentSummary}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{
                        margin: 0,
                        fontSize: '0.78rem',
                        color: unread > 0 ? 'var(--ink)' : 'var(--slate)',
                        fontWeight: unread > 0 ? 600 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '220px',
                      }}>
                        {conv.lastMessage || 'No messages yet'}
                      </p>
                      {unread > 0 && (
                        <span style={{
                          background: 'var(--sky)',
                          color: '#fff',
                          borderRadius: 10,
                          padding: '1px 6px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                        }}>
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================================================================
            RIGHT PANE — Active Chat Stream & Input
        ================================================================ */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: '#fafbfc',
            minWidth: 0,
          }}
          className={`chat-main-pane ${!showMobileChat ? 'hidden-mobile-pane' : ''}`}
        >
          {activeConv ? (
            <>
              {/* Active Header */}
              <div
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid var(--line)',
                  background: 'var(--white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="chat-back-btn"
                    style={{
                      background: 'none',
                      border: '1px solid var(--line)',
                      borderRadius: 6,
                      padding: '5px 8px',
                      cursor: 'pointer',
                      color: 'var(--slate)',
                      display: 'none',
                    }}
                  >
                    <ArrowLeft size={16} />
                  </button>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>
                        {activeConv.fieldOfficerName}
                      </span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#15803d',
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} /> Live Channel
                      </span>
                    </div>
                    {activeConv.incidentSummary && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate)', marginTop: 2 }}>
                        Context: <strong style={{ color: 'var(--ink)' }}>{activeConv.incidentSummary}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge>{isAdmin ? 'Command Center Admin' : 'Field Officer'}</Badge>
                </div>
              </div>

              {/* Quick Assessment Prompts (Admin & Officer inquiry shortcuts) */}
              <div
                style={{
                  padding: '8px 16px',
                  background: 'var(--sky-tint)',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  scrollbarWidth: 'none',
                }}
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sky-dark)', alignSelf: 'center', marginRight: 4 }}>
                  Inquiry Prompts:
                </span>
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={sending}
                    style={{
                      background: 'var(--white)',
                      border: '1px solid var(--line)',
                      borderRadius: 14,
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 500,
                      color: 'var(--ink)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.background = 'var(--sky-tint-2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--white)'; }}
                  >
                    + {prompt}
                  </button>
                ))}
              </div>

              {/* Messages Stream */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', padding: 30, color: 'var(--slate)', fontSize: '0.85rem' }}>
                    Loading message stream…
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--slate)' }}>
                    <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>No messages in this channel yet</div>
                    <div style={{ fontSize: '0.78rem', marginTop: 4 }}>Send a message or select an assessment prompt above.</div>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isSelf = (m.senderRole === 'ADMIN' && isAdmin) || (m.senderRole === 'FIELD_OFFICER' && !isAdmin);

                    return (
                      <div
                        key={m._id || idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isSelf ? 'flex-end' : 'flex-start',
                          maxWidth: '82%',
                          alignSelf: isSelf ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {/* Sender Label */}
                        <div style={{ fontSize: '0.7rem', color: 'var(--slate)', marginBottom: 3, padding: '0 4px' }}>
                          {m.senderName} ({m.senderRole === 'ADMIN' ? 'Admin' : 'Officer'})
                        </div>

                        {/* Bubble */}
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: isSelf ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                            background: isSelf
                              ? 'linear-gradient(135deg, #1e6fa8 0%, #2c8fd1 100%)'
                              : 'var(--white)',
                            color: isSelf ? '#ffffff' : 'var(--ink)',
                            border: isSelf ? 'none' : '1px solid var(--line)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            fontSize: '0.86rem',
                            lineHeight: 1.45,
                            wordBreak: 'break-word',
                          }}
                        >
                          {/* Image Attachment Preview */}
                          {m.attachmentUrl && (
                            <div style={{ marginBottom: m.text ? 8 : 0 }}>
                              <img
                                src={m.attachmentUrl.startsWith('http') ? m.attachmentUrl : `http://localhost:5000${m.attachmentUrl}`}
                                alt="Chat attachment"
                                onClick={() => setPreviewModalImg(m.attachmentUrl.startsWith('http') ? m.attachmentUrl : `http://localhost:5000${m.attachmentUrl}`)}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: 240,
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  display: 'block',
                                  objectFit: 'cover',
                                }}
                              />
                            </div>
                          )}

                          {m.text && <div>{m.text}</div>}
                        </div>

                        {/* Timestamp & Read Receipt */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.66rem', color: 'var(--slate)', marginTop: 2, padding: '0 4px' }}>
                          <span>{m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                          {isSelf && <CheckCheck size={12} color="var(--sky)" />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* File preview bar before sending */}
              {filePreview && (
                <div style={{ padding: '8px 16px', background: 'var(--sky-tint)', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={filePreview} alt="Preview" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink)' }}>{selectedFile?.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--slate)' }}>Ready to upload with message</div>
                  </div>
                  <button
                    onClick={clearSelectedFile}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Message Input Box */}
              <div
                style={{
                  padding: '12px 18px',
                  background: 'var(--white)',
                  borderTop: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach Site Photo"
                  style={{
                    background: 'var(--sky-tint)',
                    border: '1px solid var(--sky-tint-2)',
                    borderRadius: 8,
                    padding: '9px 11px',
                    cursor: 'pointer',
                    color: 'var(--sky-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--sky-tint-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--sky-tint)'}
                >
                  <ImageIcon size={18} />
                </button>

                <input
                  type="text"
                  placeholder="Type operational update or response… (Press Enter to send)"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: '0.88rem',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    outline: 'none',
                    background: '#fafbfc',
                  }}
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={sending || (!inputText.trim() && !selectedFile)}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 8,
                    opacity: (inputText.trim() || selectedFile) ? 1 : 0.6,
                  }}
                >
                  <Send size={15} />
                  <span>Send</span>
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', padding: 24 }}>
              <MessageSquare size={44} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--ink)' }}>Select an Officer Channel</div>
              <div style={{ fontSize: '0.82rem', marginTop: 4 }}>Choose a channel on the left to start live communications.</div>
            </div>
          )}
        </div>
      </div>

      {/* Image Full Size Modal */}
      {previewModalImg && (
        <div
          className="modal-overlay"
          onClick={() => setPreviewModalImg(null)}
          style={{ zIndex: 10000 }}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '85vw', width: 'auto', padding: 12, background: 'var(--ink)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                onClick={() => setPreviewModalImg(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={previewModalImg}
              alt="Enlarged site attachment"
              style={{ maxHeight: '75vh', maxWidth: '80vw', borderRadius: 8, objectFit: 'contain' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
