// src/components/layout/ChatLayout.tsx

import React, { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import ConversationList from "../chat/ConversationList";
import ChatHeader from "../chat/ChatHeader";
import MessageList from "../chat/MessageList";
import MessageInput from "../chat/MessageInput";
import GroupCreation from "../chat/GroupCreation";
import GroupMembers from "../chat/GroupMembers";
import type { Conversation, Message } from "../../types/chat";
import {
  getChats,
  getChatMessages,
  sendChatMessage,
  markChatRead,
  createPrivateChat,
  createGroupChat,
  getUsers,
  updateMyAvailability,
  getMe,
  editMessage,
  type ChatDto,
  type ChatMessageDto,
  type ChatUserDto,
} from "../../api/chatApi";
import AvailabilityEditor from "../chat/AvailabilityEditor";
import { presignDownload, getAvatarUploadUrl, confirmAvatar } from "../../api";
import { useTheme } from "../../context/ThemeContext";
import UserAvatar from "../ui/UserAvatar";
import "../../styles/chat.css";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function isOnlineFromLastSeen(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

// --- GroupMembersPanel wrapper for minimize/expand ---
const GroupMembersPanel: React.FC<{
  chatId: string;
  token: string;
  currentUserName: string;
  createdByUserId?: string;
  onRefresh?: () => void;
}> = ({ chatId, token, currentUserName, createdByUserId, onRefresh }) => {
  const [expanded, setExpanded] = useState(true);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const { tokens } = useTheme();

  return (
    <div style={{ margin: '12px 0', border: `1px solid ${tokens.border}`, borderRadius: 8, background: tokens.accentSoft }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer' }} onClick={() => setExpanded((v) => !v)}>
        <span style={{ fontWeight: 600, fontSize: '1.1rem', color: tokens.textMain }}>
          Members{memberCount !== null ? ` (${memberCount})` : ''}
        </span>
        <span style={{ fontSize: 20, color: tokens.textMuted }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ padding: '0 16px 12px 16px' }}>
          <GroupMembers
            chatId={chatId}
            token={token}
            currentUserName={currentUserName}
            createdByUserId={createdByUserId}
            onRefresh={onRefresh}
            onMemberCount={setMemberCount}
          />
        </div>
      )}
    </div>
  );
};

interface ChatLayoutProps {
  authToken: string;
  currentUserId: string;
  currentUserName: string;
  onLogout: () => void;
  onInviteUser?: () => void;
}

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const ChatLayout: React.FC<ChatLayoutProps> = ({
  authToken,
  currentUserId,
  currentUserName,
  onLogout,
  onInviteUser,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { theme, tokens, toggleTheme } = useTheme();
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);

  const [myAvailability, setMyAvailability] = useState<{ days: string; from: string; to: string } | null>(null);
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);

  // user-search state
  const [userSearch, setUserSearch] = useState<string>("");
  const [allUsers, setAllUsers] = useState<ChatUserDto[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Refs to avoid stale closures in SignalR event handlers
  const selectedConversationIdRef = useRef(selectedConversationId);
  useEffect(() => { selectedConversationIdRef.current = selectedConversationId; }, [selectedConversationId]);

  const conversationsRef = useRef<Conversation[]>([]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  // Ref to latest handleSelectConversation so notification onclick can use it without stale closure
  const selectConversationRef = useRef<(id: string) => void>(() => {});

  // Request desktop notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const meLower = currentUserName.toLowerCase();

  // Map backend ChatDto -> UI Conversation
  const mapChatDto = (dto: ChatDto): Conversation => ({
    id: dto.chatId,
    name: dto.name ?? (dto.isGroup ? "Group chat" : "Direct chat"),
    lastMessagePreview: "",
    unreadCount: dto.unreadCount ?? 0,
    type: dto.isGroup ? "group" : "direct",
    isOnline: dto.isGroup ? undefined : isOnlineFromLastSeen(dto.otherUserLastSeenAt),
    otherUserId: dto.otherUserId ?? undefined,
    createdByUserId: dto.createdByUserId ?? undefined,
    otherUserHasAvatar: dto.otherUserHasAvatar ?? false,
    otherUserGroup: dto.otherUserGroup ?? null,
    availability: (!dto.isGroup && dto.otherUserAvailabilityDays && dto.otherUserAvailabilityFrom && dto.otherUserAvailabilityTo)
      ? { days: dto.otherUserAvailabilityDays, from: dto.otherUserAvailabilityFrom, to: dto.otherUserAvailabilityTo }
      : null,
  });

  // Map backend ChatMessageDto -> UI Message
  const mapMessageDto = (dto: ChatMessageDto): Message => {
    const senderName = dto.senderUserName ?? dto.senderId;
    return {
      id: dto.id,
      conversationId: dto.chatId,
      senderId: dto.senderId,
      senderName,
      text: dto.text ?? "",
      createdAt: dto.createdAt,
      isMe: senderName.toLowerCase() === meLower,
      gifUrl: dto.gifUrl,
      attachments: dto.attachments?.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        contentType: a.contentType,
      })),
    };
  };

  const handleGetAttachmentUrl = async (attachmentId: string, chatId: string): Promise<string> => {
    const result = await presignDownload({ chatId, attachmentId });
    return result.downloadUrl;
  };

  // ── SignalR ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authToken) return;

    const apiBase = (import.meta.env.VITE_API_BASE as string).replace(/\/+$/, "");
    const hubUrl = `${apiBase}/hubs/chat?access_token=${encodeURIComponent(authToken)}`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    // Helper: fire a desktop notification for a message from someone else
    const fireNotification = (chatId: string, senderName: string, text: string | undefined) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const notif = new Notification(senderName, {
        body: text?.trim() || '📎 Sent an attachment',
        icon: '/favicon.ico',
        tag: chatId, // collapses multiple rapid messages per chat into one
      });
      notif.onclick = () => {
        window.focus();
        selectConversationRef.current(chatId);
        notif.close();
      };
    };

    // New message arrives
    connection.on("ReceiveMessage", (dto: ChatMessageDto) => {
      const chatId = dto.chatId;
      const senderName = dto.senderUserName ?? dto.senderId;
      const isMyMessage = senderName.toLowerCase() === meLower;

      if (chatId === selectedConversationIdRef.current) {
        // Skip own messages in the active chat — the optimistic update + API response handles them.
        // Adding here too causes a duplicate when SignalR fires before the POST response returns.
        if (isMyMessage) return;

        // Notify if the window is not focused (user has switched to another app/tab)
        if (!document.hasFocus()) {
          fireNotification(chatId, senderName, dto.text);
        }

        setMessages((prev) => {
          if (prev.some((m) => m.id === dto.id)) return prev;
          return [...prev, {
            id: dto.id,
            conversationId: dto.chatId,
            senderId: dto.senderId,
            senderName,
            text: dto.text ?? "",
            createdAt: dto.createdAt,
            isMe: false,
            gifUrl: dto.gifUrl,
            attachments: dto.attachments?.map((a) => ({ id: a.id, fileName: a.fileName, contentType: a.contentType })),
          }];
        });
      } else {
        // Increment unread for background chat (only messages from others)
        if (!isMyMessage) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === chatId ? { ...c, unreadCount: c.unreadCount + 1 } : c
            )
          );
          // Always notify for messages in background chats
          fireNotification(chatId, senderName, dto.text);
        }
      }
    });

    // Sidebar refresh — update preview text only; ReceiveMessage handles unread counts
    connection.on("ChatUpdated", (data: { chatId: string; lastMessagePreview?: string }) => {
      if (data.lastMessagePreview) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === data.chatId
              ? { ...c, lastMessagePreview: data.lastMessagePreview ?? c.lastMessagePreview }
              : c
          )
        );
      }
    });

    // Presence updates
    connection.on("UserPresenceChanged", (data: { userId: string; isOnline: boolean }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.otherUserId === data.userId ? { ...c, isOnline: data.isOnline } : c
        )
      );
    });

    connection.on("MessageEdited", (data: { messageId: string; text: string; editedAt: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, text: data.text, isEdited: true, editedAt: data.editedAt } : m
        )
      );
    });

    // Handle new chat created by another user
    connection.on("NewChatCreated", async () => {
      const chatDtos = await getChats(authToken);
      const uiConversations = chatDtos.map(mapChatDto);
      setConversations(uiConversations);
      for (const dto of chatDtos) {
        connection.invoke("JoinChat", dto.chatId).catch(() => {});
      }
    });

    // Re-join all groups after automatic reconnection (server drops group membership on disconnect)
    connection.onreconnected(() => {
      console.log("[SignalR] Reconnected — rejoining chat groups");
      for (const c of conversationsRef.current) {
        connection.invoke("JoinChat", c.id).catch(() => {});
      }
    });

    connection.start()
      .then(() => {
        console.log("[SignalR] Connected");
        // Fix race condition: join all chats that loaded before SignalR connected
        for (const c of conversationsRef.current) {
          connection.invoke("JoinChat", c.id).catch(() => {});
        }
      })
      .catch((err) => console.error("[SignalR] Connection error", err));

    return () => {
      connectionRef.current = null;
      connection.stop();
    };
  }, [authToken]);
  // ────────────────────────────────────────────────────────────────────────

  // Load chats on startup / token change
  useEffect(() => {
    if (!authToken) return;

    const loadChats = async () => {
      try {
        setIsLoadingConversations(true);
        setError(null);

        const dtos = await getChats(authToken);
        const uiConversations = dtos.map(mapChatDto);

        setConversations(uiConversations);

        // Join all chat groups so ReceiveMessage is delivered for every chat
        const conn = connectionRef.current;
        if (conn?.state === signalR.HubConnectionState.Connected) {
          for (const dto of dtos) {
            conn.invoke("JoinChat", dto.chatId).catch(() => {});
          }
        }

        if (uiConversations.length > 0) {
          setSelectedConversationId((prev) => prev || uiConversations[0].id);
        }
      } catch (err: unknown) {
        console.error("Error loading chats", err);
        setError("Failed to load chats.");
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadChats();
  }, [authToken]);

  // Load my availability on mount
  useEffect(() => {
    if (!authToken) return;
    getMe(authToken).then(me => {
      if (me.availabilityDays && me.availabilityFrom && me.availabilityTo) {
        setMyAvailability({ days: me.availabilityDays, from: me.availabilityFrom, to: me.availabilityTo });
      }
    }).catch(() => {});
  }, [authToken]);

  // Load messages when chat selection changes
  useEffect(() => {
    if (!authToken || !selectedConversationId) return;

    const loadMessages = async () => {
      try {
        setIsLoadingMessages(true);
        setError(null);

        const dtos = await getChatMessages(selectedConversationId, authToken, 0, 50);
        setMessages(dtos.map(mapMessageDto));

        try {
          await markChatRead(selectedConversationId, authToken);
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedConversationId ? { ...c, unreadCount: 0 } : c))
          );
        } catch (err: unknown) {
          console.warn("Failed to mark chat read", err);
        }
      } catch (err: unknown) {
        console.error("Error loading messages", err);
        setError("Failed to load messages.");
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [authToken, selectedConversationId, currentUserName]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
    const conn = connectionRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected) {
      conn.invoke("JoinChat", id).catch(() => {});
    }
  };
  selectConversationRef.current = handleSelectConversation;

  // Load users for "Start private chat" panel
  useEffect(() => {
    if (!authToken) return;
    const handle = window.setTimeout(async () => {
      try {
        setIsLoadingUsers(true);
        const results = await getUsers(authToken, {
          search: userSearch.trim() || undefined,
        });
        setAllUsers(results);
      } catch (err: unknown) {
        console.error("Error loading users", err);
      } finally {
        setIsLoadingUsers(false);
      }
    }, userSearch.trim() ? 300 : 0);
    return () => window.clearTimeout(handle);
  }, [userSearch, authToken]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  const handleSendMessage = async (text: string, gifUrl?: string, attachmentId?: string) => {
    if (!selectedConversationId) return;

    const trimmed = text.trim();
    if (!trimmed && !gifUrl && !attachmentId) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversationId: selectedConversationId,
      senderId: currentUserName,
      senderName: currentUserName,
      text: trimmed,
      createdAt: new Date().toISOString(),
      isMe: true,
      gifUrl,
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const dto = await sendChatMessage(selectedConversationId, trimmed, authToken, gifUrl, attachmentId);
      const real = mapMessageDto(dto);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
    } catch (err: unknown) {
      console.error("Error sending message", err);
      setError("Failed to send message.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleStartPrivateChat = async (user: ChatUserDto) => {
    try {
      setError(null);
      const dto = await createPrivateChat(user.id, authToken);
      const chatDtos = await getChats(authToken);
      setConversations(chatDtos.map(mapChatDto));
      const conn = connectionRef.current;
      if (conn?.state === signalR.HubConnectionState.Connected) {
        for (const c of chatDtos) conn.invoke("JoinChat", c.chatId).catch(() => {});
      }
      handleSelectConversation(dto.id);
      setUserSearch("");
    } catch (err: unknown) {
      console.error("Error creating private chat", err);
      setError("Failed to create private chat.");
    }
  };

  const handleCreateGroup = async (groupName: string, memberIds: string[]) => {
    try {
      setError(null);
      setIsCreatingGroup(true);
      const dto = await createGroupChat(groupName, memberIds, authToken);
      const chatDtos = await getChats(authToken);
      setConversations(chatDtos.map(mapChatDto));
      const conn = connectionRef.current;
      if (conn?.state === signalR.HubConnectionState.Connected) {
        for (const c of chatDtos) conn.invoke("JoinChat", c.chatId).catch(() => {});
      }
      handleSelectConversation(dto.id);
    } catch (err: unknown) {
      console.error("Error creating group chat", err);
      setError("Failed to create group chat.");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!selectedConversationId) return;
    await editMessage(selectedConversationId, messageId, newText, authToken);
    setMessages((prev) =>
      prev.map((m) => m.id === messageId ? { ...m, text: newText, isEdited: true } : m)
    );
  };

  const handleSaveAvailability = async (days: string | null, from: string | null, to: string | null) => {
    try {
      await updateMyAvailability(authToken, { days, from, to });
      setMyAvailability(days && from && to ? { days, from, to } : null);
      setShowAvailabilityEditor(false);
    } catch (e) {
      console.error('Failed to save availability', e);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected after a bust
    e.target.value = "";

    setIsUploadingAvatar(true);
    try {
      const { uploadUrl, key } = await getAvatarUploadUrl(file.type || "image/jpeg");
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!s3Res.ok) {
        throw new Error(`S3 upload failed: ${s3Res.status} ${s3Res.statusText}`);
      }
      await confirmAvatar(key);
      UserAvatar.bustCache(currentUserId);
      setAvatarVersion(v => v + 1);
      setIsUploadingAvatar(false);
    } catch (err) {
      console.error("Avatar upload failed", err);
      setError("Avatar upload failed. Check S3 CORS configuration.");
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="chat-root">
      <div className="chat-topbar" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 24px', width: '100%', position: 'fixed', top: 0, right: 0,
        background: tokens.bgMain, zIndex: 1000, height: '56px', boxSizing: 'border-box',
        borderBottom: `1px solid ${tokens.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <img src="/logo.jpeg" alt="ChatR" style={{ height: 32, borderRadius: 6 }} />
          {/* Avatar — click opens file picker; pencil opens availability editor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserAvatar
              key={avatarVersion}
              userId={currentUserId}
              name={currentUserName}
              size={32}
              editable
              onClick={() => fileInputRef.current?.click()}
            />
            <button
              type="button"
              className="chat-topbar-user"
              onClick={() => setShowAvailabilityEditor((v) => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: tokens.textMuted, fontSize: '0.85rem' }}
              title="Edit availability"
            >
              {currentUserName} ✎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarFileChange}
            />
            {isUploadingAvatar && (
              <span style={{ fontSize: '0.75rem', color: tokens.textMuted }}>Uploading…</span>
            )}
          </div>
          {onInviteUser && (
            <button
              type="button"
              onClick={onInviteUser}
              style={{
                borderRadius: '999px', border: `1px solid ${tokens.accentBorder}`,
                padding: '6px 16px', background: 'transparent',
                color: tokens.accent, fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              + Invite user
            </button>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              background: 'none', border: `1px solid ${tokens.border}`, borderRadius: '999px',
              padding: '6px 10px', cursor: 'pointer', color: tokens.textMuted, display: 'flex', alignItems: 'center',
            }}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="logout-button" onClick={onLogout}>Logout</button>
        </div>
        {showAvailabilityEditor && (
          <AvailabilityEditor
            current={myAvailability}
            onSave={handleSaveAvailability}
            onClose={() => setShowAvailabilityEditor(false)}
          />
        )}
      </div>

      <div className="chat-body" style={{ marginTop: '56px' }}>
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header" />

          <GroupCreation onCreateGroup={handleCreateGroup} isLoading={isCreatingGroup} token={authToken} />

          <div className="user-search-container">
            <div className="user-search-label">Start private chat</div>
            <input
              className="user-search-input"
              type="text"
              placeholder="Search by name or email…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            {isLoadingUsers && <div className="user-search-hint">Loading…</div>}
            {!isLoadingUsers && allUsers.length === 0 && (
              <div className="user-search-hint">No users found</div>
            )}
            {!isLoadingUsers && allUsers.length > 0 && (() => {
              // Group users by their group field
              const grouped: Record<string, ChatUserDto[]> = {};
              for (const u of allUsers) {
                const g = u.group ?? "No group";
                if (!grouped[g]) grouped[g] = [];
                grouped[g].push(u);
              }
              const showGroupHeadings = Object.keys(grouped).length > 1;
              return (
                <div className="user-search-results">
                  {Object.entries(grouped).map(([groupName, members]) => (
                    <div key={groupName}>
                      {showGroupHeadings && (
                        <div style={{
                          fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em",
                          textTransform: "uppercase", color: tokens.accent,
                          padding: "8px 10px 4px", opacity: 0.85,
                        }}>
                          {groupName}
                        </div>
                      )}
                      {members.map((u) => (
                        <button key={u.id} type="button" className="user-search-item" onClick={() => handleStartPrivateChat(u)}>
                          <div className="user-search-item-avatar">{u.username.charAt(0).toUpperCase()}</div>
                          <div className="user-search-item-text">
                            <div className="user-search-item-name">{u.username}</div>
                            {u.email && <div className="user-search-item-email">{u.email}</div>}
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {isLoadingConversations && conversations.length === 0 ? (
            <div style={{ padding: "0.75rem", fontSize: "0.8rem", color: tokens.textMuted }}>Loading chats…</div>
          ) : (
            <ConversationList conversations={conversations} selectedId={selectedConversationId} onSelect={handleSelectConversation} />
          )}
        </aside>

        <main className="chat-main">
          {error && (
            <div style={{ padding: "6px 10px", fontSize: "0.8rem", backgroundColor: "rgba(248,113,113,0.12)", color: "#fecaca" }}>
              {error}
            </div>
          )}

          {selectedConversation ? (
            <>
              <ChatHeader conversation={selectedConversation} />

              {selectedConversation.type === "group" && (
                <GroupMembersPanel
                  chatId={selectedConversation.id}
                  token={authToken}
                  currentUserName={currentUserName}
                  createdByUserId={selectedConversation.createdByUserId}
                  onRefresh={() => {
                    getChats(authToken).then((chatDtos) => setConversations(chatDtos.map(mapChatDto)));
                  }}
                />
              )}

              <MessageList messages={messages} onDownloadAttachment={handleGetAttachmentUrl} onEditMessage={handleEditMessage} />
              <MessageInput chatId={selectedConversationId} onSend={handleSendMessage} />

              {isLoadingMessages && messages.length === 0 && (
                <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: tokens.textMuted }}>
                  Loading messages…
                </div>
              )}
            </>
          ) : (
            <div className="chat-empty-state">
              <h2>{isLoadingConversations ? "Loading chats…" : "Select a chat"}</h2>
              {!isLoadingConversations && <p>Create a private or group chat via the API and it will appear here.</p>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ChatLayout;
