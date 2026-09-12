import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare, Send, Image as ImageIcon, Paperclip, X, Check, CheckCheck,
  Search, ArrowLeft, AlertTriangle, Shield, User, Clock, RefreshCw, UserPlus, Plus
} from 'lucide-react';
import { chatAPI, auth, authAPI } from '../services/api';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  // Tab-isolated user session
  const [currentUser, setCurrentUser] = useState(() => auth.getUser());

  useEffect(() => {
    const handleAuthChange = (e) => {
      setCurrentUser(e.detail?.user ?? auth.getUser());
    };
    window.addEventListener('sih_auth_change', handleAuthChange);
    return () => window.removeEventListener('sih_auth_change', handleAuthChange);
  }, []);

  const isAdmin = currentUser?.role === 'ADMIN';

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

  // New Officer Conversation Modal state
  const [showNewOfficerModal, setShowNewOfficerModal] = useState(false);
  const [availableOfficers, setAvailableOfficers] = useState([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [officerSearch, setOfficerSearch] = useState('');
  const [customOfficerId, setCustomOfficerId] = useState('');
  const [customOfficerName, setCustomOfficerName] = useState('');

  // Mobile navigation state
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const initialUrlHandledRef = useRef(false);

  // Read URL query params: ?incidentId=...&officer=...
  const queryIncidentId = searchParams.get('incidentId');
  const queryOfficer = searchParams.get('officer');
  const queryOfficerId = searchParams.get('officerId');

  // Bulletproof scroll-to-bottom targeting container scrollTop
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  // Safe unique message appender
  const appendUniqueMessage = useCallback((msg) => {
    if (!msg || !msg._id) return;
    setMessages(prev => {
      if (prev.some(m => String(m._id) === String(msg._id))) return prev;
      return [...prev, msg];
    });
  }, []);

  // 1. Load conversations (does NOT depend on activeConvId, never forces selection rollback)
  const loadConversations = useCallback(async (preferredId = null) => {
    setLoadingThreads(true);
    try {
      let list = await chatAPI.getConversations();

      // If user came from an incident link, handle on initial mount only
      if (!initialUrlHandledRef.current && (queryIncidentId || queryOfficer)) {
        initialUrlHandledRef.current = true;
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
        // Clear search params so user can freely click previous chats without being locked to the incident!
        setSearchParams({}, { replace: true });
      } else if (preferredId) {
        setActiveConvId(preferredId);
      } else {
        setActiveConvId(prevId => {
          if (prevId && list.some(c => String(c._id) === String(prevId))) return prevId;
          return list.length > 0 ? list[0]._id : null;
        });
      }

      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      toast.error('Failed to load chat channels');
    } finally {
      setLoadingThreads(false);
    }
  }, [queryIncidentId, queryOfficer, queryOfficerId, setSearchParams]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Open modal and fetch registered field officers
  const handleOpenNewOfficerModal = async () => {
    setShowNewOfficerModal(true);
    setLoadingOfficers(true);
    try {
      const users = await authAPI.getUsers('FIELD_OFFICER');
      const list = Array.isArray(users) ? users : [];
      const demoOfficers = [
        { userId: 'OFC-1042', firstName: 'Masoom', lastName: 'Singh', designation: 'Senior Field Geologist', district: 'Dima Hasao', postingLocation: 'Haflong Sector 4' },
        { userId: 'OFC-3115', firstName: 'Sounak', lastName: 'Norbu', designation: 'Field Operations Commander', district: 'Papum Pare', postingLocation: 'Banderdewa Checkpoint' },
        { userId: 'OFC-2088', firstName: 'Sagnik', lastName: 'Barman', designation: 'Regional Hazard Inspector', district: 'East Khasi Hills', postingLocation: 'Shillong Bypass Post' },
        { userId: 'OFC-1099', firstName: 'Vikram', lastName: 'Sharma', designation: 'Corridor Patrol Lead', district: 'Senapati', postingLocation: 'NH-2 Checkpoint' },
      ];
      const merged = [...list];
      demoOfficers.forEach(d => {
        if (!merged.some(u => u.userId === d.userId)) merged.push(d);
      });
      setAvailableOfficers(merged);
    } catch (err) {
      console.error('Failed to load officers:', err);
      setAvailableOfficers([
        { userId: 'OFC-1042', firstName: 'Masoom', lastName: 'Singh', designation: 'Senior Field Geologist', district: 'Dima Hasao' },
        { userId: 'OFC-3115', firstName: 'Sounak', lastName: 'Norbu', designation: 'Field Operations Commander', district: 'Papum Pare' },
        { userId: 'OFC-2088', firstName: 'Sagnik', lastName: 'Barman', designation: 'Regional Hazard Inspector', district: 'East Khasi Hills' },
      ]);
    } finally {
      setLoadingOfficers(false);
    }
  };

  // Start chat with selected officer
  const handleStartOfficerChat = async (officer) => {
    try {
      const officerId = officer.userId || officer._id || officer.id;
      const officerName = `${officer.firstName || ''} ${officer.lastName || ''}`.trim() || officer.name || officer.userId || 'Field Officer';
      const summary = officer.designation ? `${officer.designation} (${officer.district || 'NER'})` : (officer.district ? `District: ${officer.district}` : 'Field Operations');

      const conv = await chatAPI.createOrGetConversation({
        fieldOfficerId: officerId,
        fieldOfficerName: officerName,
        relatedIncidentId: null,
        incidentSummary: summary,
      });

      if (conv) {
        setConversations(prev => {
          const exists = prev.some(c => String(c._id) === String(conv._id));
          return exists ? prev : [conv, ...prev];
        });
        setActiveConvId(conv._id);
        setShowMobileChat(true);
        setSearchParams({}, { replace: true });
        setShowNewOfficerModal(false);
        toast.success(`Direct channel opened with ${officerName}!`, { icon: '💬' });
      }
    } catch (err) {
      console.error('Failed to start officer chat:', err);
      toast.error('Failed to start chat with officer');
    }
  };

  // Quick custom officer connect
  const handleQuickCustomChat = async (e) => {
    e.preventDefault();
    if (!customOfficerId.trim()) return;
    await handleStartOfficerChat({
      userId: customOfficerId.trim(),
      firstName: customOfficerName.trim() || customOfficerId.trim(),
      lastName: '',
      designation: 'Field Unit',
      district: 'Active Ops',
    });
    setCustomOfficerId('');
    setCustomOfficerName('');
  };

  // 2. Load messages when active conversation changes
  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingMessages(true);
    try {
      const msgs = await chatAPI.getMessages(convId);
      setMessages(msgs || []);
      // Scroll to bottom firmly on load
      setTimeout(() => scrollToBottom('auto'), 40);
      setTimeout(() => scrollToBottom('auto'), 160);

      // Reset unread on local conversation item
      setConversations(prev => prev.map(c => {
        if (String(c._id) === String(convId)) {
          return isAdmin ? { ...c, unreadCountAdmin: 0 } : { ...c, unreadCountOfficer: 0 };
        }
        return c;
      }));
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [isAdmin, scrollToBottom]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId, loadMessages]);

  // Auto-scroll whenever messages array length changes
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('smooth');
    }
  }, [messages.length, scrollToBottom]);

  // 3. Socket.io Room join/leave and message listener
  // Re-runs whenever `socket` identity changes (useSocket now returns state,
  // so a singleton swap causes a re-render and this effect re-subscribes).
  useEffect(() => {
    const s = socket;
    if (!s || !activeConvId) return;

    const convIdStr = String(activeConvId);

    // Emit join_conversation.  Socket.IO client buffers this automatically
    // if the socket isn't connected yet, so no explicit connected-guard needed.
    const joinRoom = () => s.emit('join_conversation', convIdStr);
    joinRoom();

    // Re-join on every reconnect (server drops room membership on disconnect)
    const onConnect = () => joinRoom();

    // ── Primary message delivery ──────────────────────────────────────────
    // Backend emits "chat_message" only to sockets inside conversation:{id}.
    // This is the single source of truth for appending new messages.
    const handleChatMessage = (newMsg) => {
      if (String(newMsg?.conversationId) === convIdStr) {
        appendUniqueMessage(newMsg);
        setTimeout(() => scrollToBottom('smooth'), 50);
      }
    };

    // ── Sidebar / unread counter update ───────────────────────────────────
    // Backend broadcasts "new_chat_message" globally (io.emit) so every
    // connected client can update its conversation list even if it hasn't
    // joined the room.  We do NOT appendUniqueMessage here — that's handled
    // above.  Keeping the two responsibilities separate prevents double
    // delivery in the two-tab scenario.
    const handleSidebarUpdate = ({ conversationId, message }) => {
      if (!message) return;
      const targetIdStr = String(conversationId);
      const isActive    = targetIdStr === convIdStr;

      setConversations(prev => prev.map(c => {
        if (String(c._id) !== targetIdStr) return c;
        return {
          ...c,
          lastMessage:       message.text || (message.attachmentUrl ? '📷 Photo' : 'New message'),
          lastMessageAt:     message.createdAt || new Date(),
          // Increment unread only for conversations the user isn't looking at
          unreadCountAdmin:   (!isAdmin && !isActive) ? (c.unreadCountAdmin   || 0) + 1 : c.unreadCountAdmin,
          unreadCountOfficer: ( isAdmin && !isActive) ? (c.unreadCountOfficer || 0) + 1 : c.unreadCountOfficer,
        };
      }));
    };

    if (typeof s.on === 'function') {
      s.on('connect',          onConnect);
      s.on('chat_message',     handleChatMessage);
      s.on('new_chat_message', handleSidebarUpdate);
    }

    return () => {
      if (typeof s.emit === 'function') s.emit('leave_conversation', convIdStr);
      if (typeof s.off === 'function') {
        s.off('connect',          onConnect);
        s.off('chat_message',     handleChatMessage);
        s.off('new_chat_message', handleSidebarUpdate);
      }
    };
  }, [socket, activeConvId, isAdmin, appendUniqueMessage, scrollToBottom]);

  // 4. Send message handler (typed text or quick prompt)
  const handleSendMessage = async (customText = null) => {
    const textToSend = typeof customText === 'string' ? customText : inputText;
    if (!textToSend.trim() && !selectedFile) return;
    if (!activeConvId) return;

    setSending(true);
    try {
      const senderRole = currentUser?.role || (isAdmin ? 'ADMIN' : 'FIELD_OFFICER');
      const senderName = currentUser?.name || (isAdmin ? 'Command Control Admin' : (currentUser?.firstName || 'Field Officer'));

      let payload;
      if (selectedFile) {
        const fd = new FormData();
        fd.append('text', textToSend.trim());
        fd.append('senderRole', senderRole);
        fd.append('senderName', senderName);
        fd.append('attachment', selectedFile);
        payload = fd;
      } else {
        payload = {
          text: textToSend.trim(),
          senderRole,
          senderName,
        };
      }

      const sent = await chatAPI.sendMessage(activeConvId, payload);
      if (sent) {
        appendUniqueMessage(sent);
        setInputText('');
        clearSelectedFile();
        setTimeout(() => scrollToBottom('smooth'), 50);

        // Update local conversation lastMessage
        setConversations(prev => prev.map(c => {
          if (String(c._id) === String(activeConvId)) {
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

  // Quick switch role in this tab only (ideal for 2-tab testing)
  const handleQuickRoleSwitch = async (targetRole) => {
    try {
      if (targetRole === 'FIELD_OFFICER') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'OFC-1042', password: 'officer123', role: 'FIELD_OFFICER' })
        });
        const data = await res.json();
        if (data.token) {
          auth.setSession(data.token, data.user || { role: 'FIELD_OFFICER', userId: 'OFC-1042', name: 'Masoom Singh' });
          toast.success('Switched this tab to Field Officer (Masoom Singh)');
        }
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'admin', password: 'admin123', role: 'ADMIN' })
        });
        const data = await res.json();
        if (data.token) {
          auth.setSession(data.token, data.user || { role: 'ADMIN', userId: 'admin', name: 'System Administrator' });
          toast.success('Switched this tab to Command Center Admin');
        }
      }
    } catch (err) {
      console.error('Role switch error:', err);
      toast.error('Failed to switch role');
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
  const activeConv = conversations.find(c => String(c._id) === String(activeConvId));

  // Filter conversations (Admin sees all field officers; Field Officer sees ONLY Admin / Control Room)
  const filteredConversations = conversations.filter(c => {
    if (!isAdmin) {
      const myId = String(currentUser?._id || currentUser?.userId || currentUser?.id || 'demo-ofc-001');
      const officerId = String(c.fieldOfficerId || '');
      const parts = (c.participants || []).map(String);
      const isMyLine = officerId === myId ||
                       parts.includes(myId) ||
                       officerId.includes('1042') ||
                       (c.fieldOfficerName || '').toLowerCase().includes('masoom') ||
                       (c.fieldOfficerName || '').toLowerCase().includes('1042') ||
                       (c.fieldOfficerName || '').toLowerCase().includes('admin');
      if (!isMyLine) {
        return false;
      }
    }
    return (
      (c.fieldOfficerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.incidentSummary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleOpenNewOfficerModal}
                    title="Start direct conversation with a Field Officer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: 'var(--sky)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(2, 132, 199, 0.3)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--sky-dark)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--sky)'}
                  >
                    <UserPlus size={13} />
                    <span>+ New Chat</span>
                  </button>
                )}
                <button
                  onClick={() => loadConversations()}
                  title="Refresh channels"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', display: 'flex', padding: 3 }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
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
                const isSelected = String(conv._id) === String(activeConvId);
                const unread = isAdmin ? (conv.unreadCountAdmin || 0) : (conv.unreadCountOfficer || 0);

                return (
                  <div
                    key={conv._id}
                    onClick={() => {
                      setActiveConvId(conv._id);
                      setShowMobileChat(true);
                      setSearchParams({}, { replace: true });
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
                      <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {!isAdmin && <Shield size={13} color="#7C3AED" />}
                        {isAdmin
                          ? (conv.fieldOfficerName && conv.fieldOfficerName.toLowerCase() !== 'admin' ? conv.fieldOfficerName : 'Field Officer (OFC-1042)')
                          : 'Command Control Room (Admin)'}
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
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
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
                  flexShrink: 0,
                  zIndex: 20,
                  position: 'relative',
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
                        {isAdmin
                          ? (activeConv.fieldOfficerName && activeConv.fieldOfficerName.toLowerCase() !== 'admin'
                              ? activeConv.fieldOfficerName
                              : 'Field Officer (OFC-1042)')
                          : 'Command Control Room (HQ Dispatch)'}
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
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                        {isAdmin ? 'Officer Live Channel' : 'HQ Operational Channel'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate)', marginTop: 2 }}>
                      {isAdmin ? (
                        activeConv.incidentSummary ? (
                          <>Context: <strong style={{ color: 'var(--ink)' }}>{activeConv.incidentSummary}</strong></>
                        ) : (
                          <span>Direct channel to assigned Field Officer</span>
                        )
                      ) : (
                        activeConv.incidentSummary ? (
                          <>Dispatch Alert Context: <strong style={{ color: 'var(--ink)' }}>{activeConv.incidentSummary}</strong></>
                        ) : (
                          <span>Direct encrypted line to Central Command & Logistics Control Room</span>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action: Active Identity & Tab Role Switcher */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: isAdmin ? 'rgba(124,58,237,0.08)' : 'var(--sky-tint)',
                    border: `1px solid ${isAdmin ? 'rgba(124,58,237,0.2)' : 'var(--sky-tint-2)'}`,
                  }}>
                    {isAdmin ? <Shield size={14} color="#7C3AED" /> : <User size={14} color="var(--sky-dark)" />}
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: isAdmin ? '#6D28D9' : 'var(--sky-dark)' }}>
                      {isAdmin ? 'Admin Session' : 'Officer Session'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuickRoleSwitch(isAdmin ? 'FIELD_OFFICER' : 'ADMIN')}
                    title={`Switch this tab's role to ${isAdmin ? 'Field Officer (OFC-1042)' : 'Command Admin'}`}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 7,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      background: 'var(--white)',
                      border: '1px solid var(--line)',
                      color: 'var(--slate)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.color = 'var(--sky-dark)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--slate)'; }}
                  >
                    Switch to {isAdmin ? 'Officer' : 'Admin'} Tab
                  </button>
                </div>
              </div>

              {/* Quick Assessment Prompts (Admin & Officer inquiry shortcuts) */}
              <div
                style={{
                  padding: '9px 18px',
                  background: '#ffffff',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  scrollbarWidth: 'none',
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: 15,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
              >
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--sky-dark)', alignSelf: 'center', marginRight: 4, flexShrink: 0 }}>
                  Inquiry Prompts:
                </span>
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    disabled={sending}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid var(--line)',
                      borderRadius: 16,
                      padding: '5px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.background = 'var(--sky-tint)'; e.currentTarget.style.color = 'var(--sky-dark)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = 'var(--ink)'; }}
                  >
                    + {prompt}
                  </button>
                ))}
              </div>

              {/* Messages Stream */}
              <div
                ref={messagesContainerRef}
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  scrollBehavior: 'smooth',
                }}
              >
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', padding: 30, color: 'var(--slate)', fontSize: '0.85rem' }}>
                    Loading message stream…
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--slate)' }}>
                    <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--ink)' }}>No messages in this channel yet</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Send a message or select an assessment prompt above.</div>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isSelf = (m.senderRole === currentUser?.role) ||
                      (String(m.senderId) === String(currentUser?._id || currentUser?.id || currentUser?.userId));

                    // Check consecutive same-sender grouping
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const isSameSenderAsPrev = prevMsg &&
                      prevMsg.senderRole === m.senderRole &&
                      (prevMsg.senderName === m.senderName || String(prevMsg.senderId) === String(m.senderId));

                    return (
                      <div
                        key={m._id || idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isSelf ? 'flex-end' : 'flex-start',
                          maxWidth: '78%',
                          alignSelf: isSelf ? 'flex-end' : 'flex-start',
                          marginTop: isSameSenderAsPrev ? 2 : 12,
                        }}
                      >
                        {/* Show Sender Label only if NOT consecutive from same sender */}
                        {!isSameSenderAsPrev && (
                          <div style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: isSelf ? 'var(--sky-dark)' : 'var(--slate)',
                            marginBottom: 4,
                            padding: '0 6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            {isSelf ? (
                              <span>You ({m.senderRole === 'ADMIN' ? 'Admin' : 'Field Officer'})</span>
                            ) : (
                              <span>{m.senderName} ({m.senderRole === 'ADMIN' ? 'Admin' : 'Officer'})</span>
                            )}
                          </div>
                        )}

                        {/* Bubble */}
                        <div
                          style={{
                            padding: '9px 14px',
                            borderRadius: isSelf
                              ? (isSameSenderAsPrev ? '14px 4px 4px 14px' : '14px 14px 4px 14px')
                              : (isSameSenderAsPrev ? '4px 14px 14px 4px' : '14px 14px 14px 4px'),
                            background: isSelf
                              ? 'linear-gradient(135deg, #1e6fa8 0%, #2c8fd1 100%)'
                              : 'var(--white)',
                            color: isSelf ? '#ffffff' : 'var(--ink)',
                            border: isSelf ? 'none' : '1px solid var(--line)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                            fontSize: '0.86rem',
                            lineHeight: 1.45,
                            wordBreak: 'break-word',
                          }}
                        >
                          {/* Image Attachment Preview */}
                          {m.attachmentUrl && (
                            <div style={{ marginBottom: m.text ? 8 : 0 }}>
                              <img
                                src={m.attachmentUrl.startsWith('http') ? m.attachmentUrl : `http://localhost:1710${m.attachmentUrl}`}
                                alt="Chat attachment"
                                onClick={() => setPreviewModalImg(m.attachmentUrl.startsWith('http') ? m.attachmentUrl : `http://localhost:1710${m.attachmentUrl}`)}
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
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '0.66rem',
                          color: 'var(--slate)',
                          marginTop: 2,
                          padding: '0 4px',
                        }}>
                          <span>{m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                          {isSelf && <CheckCheck size={12} color="var(--sky)" />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} style={{ height: 1, flexShrink: 0 }} />
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

      {/* Start Chat with New Officer Modal */}
      {showNewOfficerModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowNewOfficerModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 580,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--line)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--sky-tint)',
                  border: '1px solid var(--sky-tint-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--sky-dark)',
                }}>
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)' }}>
                    Connect with Field Officer
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--slate)' }}>
                    Start direct, real-time communications with field personnel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewOfficerModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--slate)',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--line)', background: '#ffffff' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)' }} />
                <input
                  type="text"
                  placeholder="Search by name, ID (e.g. OFC-1042), district, or role…"
                  value={officerSearch}
                  onChange={e => setOfficerSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    fontSize: '0.84rem',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: '#f8fafc',
                    color: 'var(--ink)',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = '#f8fafc'; }}
                />
                {officerSearch && (
                  <button
                    type="button"
                    onClick={() => setOfficerSearch('')}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--slate)',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Officer Roster List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: 320,
              padding: '8px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {loadingOfficers ? (
                <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--slate)', fontSize: '0.85rem' }}>
                  Loading field officers…
                </div>
              ) : (() => {
                const q = officerSearch.toLowerCase().trim();
                const filtered = availableOfficers.filter(o => {
                  if (!q) return true;
                  const fullName = `${o.firstName || ''} ${o.lastName || ''} ${o.name || ''}`.toLowerCase();
                  const id = (o.userId || o._id || '').toLowerCase();
                  const district = (o.district || '').toLowerCase();
                  const designation = (o.designation || '').toLowerCase();
                  const posting = (o.postingLocation || '').toLowerCase();
                  return fullName.includes(q) || id.includes(q) || district.includes(q) || designation.includes(q) || posting.includes(q);
                });

                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--slate)' }}>
                      <User size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ink)' }}>No field officers match "{officerSearch}"</div>
                      <div style={{ fontSize: '0.78rem', marginTop: 4 }}>You can enter their Officer ID below to connect directly.</div>
                    </div>
                  );
                }

                return filtered.map((officer, idx) => {
                  const officerId = officer.userId || officer._id || `OFC-${idx + 1}`;
                  const officerName = `${officer.firstName || ''} ${officer.lastName || ''}`.trim() || officer.name || officerId;
                  const initial = (officer.firstName?.[0] || officer.name?.[0] || officerId[0] || 'O').toUpperCase();
                  const designation = officer.designation || 'Field Operational Officer';
                  const location = officer.district ? `${officer.district}${officer.postingLocation ? ` • ${officer.postingLocation}` : ''}` : (officer.postingLocation || 'North-East Sector');

                  return (
                    <div
                      key={officerId}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--line)',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.background = '#f0f9ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1rem',
                          flexShrink: 0,
                          boxShadow: '0 2px 5px rgba(2, 132, 199, 0.25)',
                        }}>
                          {initial}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>
                              {officerName}
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                            }}>
                              {officerId}
                            </span>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              fontSize: '0.65rem',
                              color: '#16a34a',
                              fontWeight: 600,
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} /> Active
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--slate)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: '#475569', fontWeight: 500 }}>{designation}</span> · {location}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartOfficerChat(officer)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 8,
                          background: 'var(--sky)',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          flexShrink: 0,
                          boxShadow: '0 1px 3px rgba(2, 132, 199, 0.3)',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--sky-dark)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--sky)'; }}
                      >
                        <MessageSquare size={13} />
                        <span>Chat</span>
                      </button>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Bottom: Direct Officer ID Connect */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--line)',
              background: '#f8fafc',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Direct Connect by Officer ID</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--slate)', fontWeight: 400 }}>(enter any registered badge or radio code)</span>
              </div>
              <form onSubmit={handleQuickCustomChat} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Officer ID (e.g. OFC-4091)"
                  value={customOfficerId}
                  onChange={e => setCustomOfficerId(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    fontSize: '0.8rem',
                    borderRadius: 6,
                    border: '1px solid var(--line)',
                    background: '#fff',
                    outline: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Officer Name (optional)"
                  value={customOfficerName}
                  onChange={e => setCustomOfficerName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    fontSize: '0.8rem',
                    borderRadius: 6,
                    border: '1px solid var(--line)',
                    background: '#fff',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={!customOfficerId.trim()}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 6,
                    background: customOfficerId.trim() ? 'var(--sky)' : '#cbd5e1',
                    color: '#fff',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: customOfficerId.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Plus size={14} /> Connect
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

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
