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
  searchUsers,
  updateMyAvailability,
  getMe,
  type ChatDto,
  type ChatMessageDto,
  type ChatUserDto,
} from "../../api/chatApi";
import AvailabilityEditor from "../chat/AvailabilityEditor";
import { presignDownload } from "../../api";
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

  return (
    <div style={{ margin: '12px 0', border: '1px solid #14532d', borderRadius: 8, background: 'rgba(16,32,32,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer' }} onClick={() => setExpanded((v) => !v)}>
        <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#e0f2fe' }}>
          Members{memberCount !== null ? ` (${memberCount})` : ''}
        </span>
        <span style={{ fontSize: 20, color: '#e0f2fe' }}>{expanded ? '▲' : '▼'}</span>
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
  currentUserName: string;
  onLogout: () => void;
  onInviteUser?: () => void;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  authToken,
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

  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const [myAvailability, setMyAvailability] = useState<{ days: string; from: string; to: string } | null>(null);
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);

  // user-search state
  const [userSearch, setUserSearch] = useState<string>("");
  const [userResults, setUserResults] = useState<ChatUserDto[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Refs to avoid stale closures in SignalR event handlers
  const selectedConversationIdRef = useRef(selectedConversationId);
  useEffect(() => { selectedConversationIdRef.current = selectedConversationId; }, [selectedConversationId]);

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

    // New message arrives
    connection.on("ReceiveMessage", (dto: ChatMessageDto) => {
      const chatId = dto.chatId;
      const senderName = dto.senderUserName ?? dto.senderId;
      const isMyMessage = senderName.toLowerCase() === meLower;

      if (chatId === selectedConversationIdRef.current) {
        // Skip own messages in the active chat — the optimistic update + API response handles them.
        // Adding here too causes a duplicate when SignalR fires before the POST response returns.
        if (isMyMessage) return;

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

    connection.start()
      .then(() => console.log("[SignalR] Connected"))
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

  // User search
  useEffect(() => {
    if (!authToken) return;

    const trimmed = userSearch.trim();

    if (!trimmed) {
      setUserResults([]);
      setIsSearchingUsers(false);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        setIsSearchingUsers(true);
        const results = await searchUsers(authToken, trimmed);
        setUserResults(results);
      } catch (err: unknown) {
        console.error("Error searching users", err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

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
      setUserResults([]);
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

  const handleSaveAvailability = async (days: string | null, from: string | null, to: string | null) => {
    try {
      await updateMyAvailability(authToken, { days, from, to });
      setMyAvailability(days && from && to ? { days, from, to } : null);
      setShowAvailabilityEditor(false);
    } catch (e) {
      console.error('Failed to save availability', e);
    }
  };

  return (
    <div className="chat-root">
      <div className="chat-topbar" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 24px', width: '100%', position: 'fixed', top: 0, right: 0,
        background: '#0f172a', zIndex: 1000, height: '56px', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span className="chat-logo">ChatR 2.0</span>
          <button
            type="button"
            className="chat-topbar-user"
            onClick={() => setShowAvailabilityEditor((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Logged in as {currentUserName} ✎
          </button>
          {onInviteUser && (
            <button
              type="button"
              onClick={onInviteUser}
              style={{
                borderRadius: '999px', border: '1px solid #0369a1',
                padding: '6px 16px', background: 'transparent',
                color: '#38bdf8', fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              + Invite user
            </button>
          )}
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
              placeholder="Search users by name or email"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            {userSearch.trim() && isSearchingUsers && <div className="user-search-hint">Searching…</div>}
            {userSearch.trim() && !isSearchingUsers && userResults.length === 0 && (
              <div className="user-search-hint">No users found</div>
            )}
            {userSearch.trim() && userResults.length > 0 && (
              <div className="user-search-results">
                {userResults.map((u) => (
                  <button key={u.id} type="button" className="user-search-item" onClick={() => handleStartPrivateChat(u)}>
                    <div className="user-search-item-avatar">{u.username.charAt(0).toUpperCase()}</div>
                    <div className="user-search-item-text">
                      <div className="user-search-item-name">{u.username}</div>
                      {u.email && <div className="user-search-item-email">{u.email}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isLoadingConversations && conversations.length === 0 ? (
            <div style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#9ca3af" }}>Loading chats…</div>
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

              <MessageList messages={messages} onDownloadAttachment={handleGetAttachmentUrl} />
              <MessageInput chatId={selectedConversationId} onSend={handleSendMessage} />

              {isLoadingMessages && messages.length === 0 && (
                <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "#9ca3af" }}>
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
