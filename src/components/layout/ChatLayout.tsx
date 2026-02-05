// src/components/layout/ChatLayout.tsx


import React, { useEffect, useState } from "react";
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
  type ChatDto,
  type ChatMessageDto,
  type ChatUserDto,
} from "../../api/chatApi";
import "../../styles/chat.css";

// --- GroupMembersPanel wrapper for minimize/expand ---
const GroupMembersPanel: React.FC<{
  chatId: string;
  token: string;
  currentUserName: string;
  onRefresh?: () => void;
}> = ({ chatId, token, currentUserName, onRefresh }) => {
  const [expanded, setExpanded] = useState(true);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  // Callback to get member count from GroupMembers
  const handleMemberCount = (count: number) => setMemberCount(count);

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
            onRefresh={onRefresh}
            onMemberCount={handleMemberCount}
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
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  authToken,
  currentUserName,
  onLogout,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // user-search state
  const [userSearch, setUserSearch] = useState<string>("");
  const [userResults, setUserResults] = useState<ChatUserDto[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const meLower = currentUserName.toLowerCase();

  // Map backend ChatDto -> UI Conversation
  const mapChatDto = (dto: ChatDto): Conversation => ({
    id: dto.chatId,
    name: dto.name ?? (dto.isGroup ? "Group chat" : "Direct chat"),
    lastMessagePreview: "",
    unreadCount: dto.unreadCount ?? 0,
    type: dto.isGroup ? "group" : "direct",
    isOnline: undefined,
  });

  // Map backend ChatMessageDto -> UI Message
  const mapMessageDto = (dto: ChatMessageDto): Message => {
    const senderName = dto.senderUserName ?? dto.senderId;
    return {
      id: dto.id,
      conversationId: dto.chatId,
      senderId: dto.senderId,
      senderName,
      text: dto.text,
      createdAt: dto.createdAt,
      isMe: senderName.toLowerCase() === meLower,
      gifUrl: dto.gifUrl,
    };
  };

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

        // Auto-select first chat if none selected
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

  // Load messages when chat selection changes
  useEffect(() => {
    if (!authToken || !selectedConversationId) return;

    const loadMessages = async () => {
      try {
        setIsLoadingMessages(true);
        setError(null);

        const dtos = await getChatMessages(
          selectedConversationId,
          authToken,
          0,
          50
        );
        const uiMessages = dtos.map(mapMessageDto);
        setMessages(uiMessages);

        // mark as read on the server and ensure UI reflects it
        try {
          await markChatRead(selectedConversationId, authToken);
          // ensure unread badge is cleared locally after server acknowledgement
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

  // Select conversation and immediately clear its unread badge in the UI
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);

    // Optimistically clear unread count locally so the UI updates immediately
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  // User search – only hit API when there is actual search text
  useEffect(() => {
    if (!authToken) return;

    const trimmed = userSearch.trim();

    // If nothing typed, hide results & don't call the API
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
    }, 300); // debounce

    return () => window.clearTimeout(handle);
  }, [userSearch, authToken]);

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  const handleSendMessage = async (
  text: string,
  gifUrl?: string,
  attachmentId?: string
) => {
  if (!selectedConversationId) return;

  const trimmed = text.trim();

  // allow attachment-only or gif-only
  if (!trimmed && !gifUrl && !attachmentId) return;

  // Optimistic UI
  const tempId = `temp-${Date.now()}`;
  const optimistic: Message = {
    id: tempId,
    conversationId: selectedConversationId,
    senderId: currentUserName,
    senderName: currentUserName,
    text: trimmed,
    createdAt: new Date().toISOString(),
    isMe: true,
    gifUrl: gifUrl,
    // optional: if your UI Message type supports it later
    // attachmentId,
  };

  setMessages((prev) => [...prev, optimistic]);

  try {
    const dto = await sendChatMessage(
      selectedConversationId,
      trimmed,
      authToken,
      gifUrl,
      attachmentId
    );

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

      // 1) Create or reuse private chat on the server
      const dto = await createPrivateChat(user.id, authToken);
      const chatId = dto.id;

      // 2) Refresh full chat list from API so UI is in sync
      const chatDtos = await getChats(authToken);
      const uiConversations = chatDtos.map(mapChatDto);
      setConversations(uiConversations);

      // 3) Select this chat (use centralized handler to clear unread)
      handleSelectConversation(chatId);

      // 4) Clear search so dropdown disappears
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

      // 1) Create group on the server
      const dto = await createGroupChat(groupName, memberIds, authToken);
      const chatId = dto.id;

      // 2) Refresh full chat list from API so UI is in sync
      const chatDtos = await getChats(authToken);
      const uiConversations = chatDtos.map(mapChatDto);
      setConversations(uiConversations);

      // 3) Select this chat (use centralized handler to clear unread)
      handleSelectConversation(chatId);
    } catch (err: unknown) {
      console.error("Error creating group chat", err);
      setError("Failed to create group chat.");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  return (
  <div className="chat-root">
    {/* Top bar: logo + logged-in user + logout */}
    <div className="chat-topbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 24px',
      width: '100%',
      position: 'fixed',
      top: 0,
      right: 0,
      background: '#0f172a',
      zIndex: 1000,
      height: '56px',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <span className="chat-logo">ChatR 2.0</span>
        <span className="chat-topbar-user">Logged in as {currentUserName}</span>
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>

    {/* Main row: sidebar + chat area */}
    <div className="chat-body" style={{ marginTop: '56px' }}>
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          {/* Removed ChatR 2.0 logo from sidebar header */}
        </div>

        {/* Group Creation */}
        <GroupCreation
          onCreateGroup={handleCreateGroup}
          isLoading={isCreatingGroup}
          token={authToken}
        />

        {/* User search + dropdown to start private chat */}
        <div className="user-search-container">
          <div className="user-search-label">Start private chat</div>
          <input
            className="user-search-input"
            type="text"
            placeholder="Search users by name or email"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
          {/* Only show hints/results when there is some text */}
          {userSearch.trim() && isSearchingUsers && (
            <div className="user-search-hint">Searching…</div>
          )}
          {userSearch.trim() &&
            !isSearchingUsers &&
            userResults.length === 0 && (
              <div className="user-search-hint">No users found</div>
            )}
          {userSearch.trim() && userResults.length > 0 && (
            <div className="user-search-results">
              {userResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="user-search-item"
                  onClick={() => handleStartPrivateChat(u)}
                >
                  <div className="user-search-item-avatar">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-search-item-text">
                    <div className="user-search-item-name">
                      {u.username}
                    </div>
                    {u.email && (
                      <div className="user-search-item-email">
                        {u.email}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoadingConversations && conversations.length === 0 ? (
          <div
            style={{
              padding: "0.75rem",
              fontSize: "0.8rem",
              color: "#9ca3af",
            }}
          >
            Loading chats…
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={handleSelectConversation}
          />
        )}
      </aside>

      <main className="chat-main">
        {error && (
          <div
            style={{
              padding: "6px 10px",
              fontSize: "0.8rem",
              backgroundColor: "rgba(248,113,113,0.12)",
              color: "#fecaca",
            }}
          >
            {error}
          </div>
        )}

        {selectedConversation ? (
          <>
            <ChatHeader conversation={selectedConversation} />
            
            {/* Show group members panel for group chats */}
            {selectedConversation.type === "group" && (
              <GroupMembersPanel
                chatId={selectedConversation.id}
                token={authToken}
                currentUserName={currentUserName}
                onRefresh={() => {
                  getChats(authToken).then((chatDtos) => {
                    setConversations(chatDtos.map(mapChatDto));
                  });
                }}
              />
            )}
            {/* ...existing code... */}
            
            <MessageList messages={messages} />
            <MessageInput
              chatId={selectedConversationId}
              onSend={handleSendMessage}
/>

            {isLoadingMessages && messages.length === 0 && (
              <div
                style={{
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                }}
              >
                Loading messages…
              </div>
            )}
          </>
        ) : (
          <div className="chat-empty-state">
            <h2>
              {isLoadingConversations ? "Loading chats…" : "Select a chat"}
            </h2>
            {!isLoadingConversations && (
              <p>
                Create a private or group chat via the API and it will appear
                here.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  </div>
);
};

export default ChatLayout;
