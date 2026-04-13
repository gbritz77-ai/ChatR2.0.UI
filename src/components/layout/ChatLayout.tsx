// src/components/layout/ChatLayout.tsx

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import ConversationList from "../chat/ConversationList";
import ChatHeader from "../chat/ChatHeader";
import MessageList from "../chat/MessageList";
import MessageInput from "../chat/MessageInput";
import GroupCreation from "../chat/GroupCreation";
import GroupMembers from "../chat/GroupMembers";
import IncomingCallModal from "../call/IncomingCallModal";
import VideoCallModal from "../call/VideoCallModal";
import { useWebRTC, type RemoteStream } from "../../hooks/useWebRTC";
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
  deleteMessage,
  deleteGroup,
  updateGroupAvatar,
  getGroupAvatarUploadUrl,
  toggleReaction,
  getTurnCredentials,
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

const HamburgerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);

  const [myAvailability, setMyAvailability] = useState<{ days: string; from: string; to: string } | null>(null);
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);

  // Reply / Forward state
  const [replyingTo, setReplyingTo] = useState<(Message & { messageId: string }) | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);

  // ─── Video Call State ────────────────────────────────────────────────────────
  const [incomingCall, setIncomingCall] = useState<{ callId: string; callerName: string; groupName?: string } | null>(null);
  const [activeCall, setActiveCall] = useState<{ callId: string; calleeName?: string } | null>(null);
  const activeCallIdRef = useRef<string>("");  // always up-to-date callId for callbacks
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showCallInvite, setShowCallInvite] = useState(false);
  const [callInviteSearch, setCallInviteSearch] = useState("");
  const [pendingCallInvitees, setPendingCallInvitees] = useState<{ userId: string; name: string }[]>([]);
  const webRTC = useWebRTC(connectionRef);

  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showGroupCreationForm, setShowGroupCreationForm] = useState(false);

  useEffect(() => {
    const handle = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

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

  // Update browser tab title + favicon badge with total unread count
  useEffect(() => {
    const total = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
    document.title = total > 0 ? `(${total}) ChatR` : "ChatR";

    // Update favicon with red dot badge when there are unread messages
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = "/logo.jpeg";
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 32, 32);
      if (total > 0) {
        // Red dot badge in top-right corner
        ctx.beginPath();
        ctx.arc(24, 8, 8, 0, 2 * Math.PI);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        // Count text inside dot
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(total > 9 ? "9+" : String(total), 24, 8);
      }
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = canvas.toDataURL("image/png");
    };
    img.onerror = () => {
      // Fallback: plain red circle favicon when logo fails to load
      if (total > 0) {
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, 2 * Math.PI);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(total > 9 ? "9+" : String(total), 16, 16);
        let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
        link.href = canvas.toDataURL("image/png");
      }
    };
  }, [conversations]);

  // Initialise AudioContext on first user interaction (browser autoplay policy)
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      } else if (audioCtxRef.current.state === "suspended") {
        void audioCtxRef.current.resume();
      }
    };
    document.addEventListener("click", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  // Auto-request notification permission on mount if not yet decided
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
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
    chatAvatarUrl: dto.chatAvatarUrl ?? null,
    availability: (!dto.isGroup && dto.otherUserAvailabilityDays && dto.otherUserAvailabilityFrom && dto.otherUserAvailabilityTo)
      ? { days: dto.otherUserAvailabilityDays, from: dto.otherUserAvailabilityFrom, to: dto.otherUserAvailabilityTo }
      : null,
    otherMemberLastReadAt: (dto as any).otherMemberLastReadAt ?? null,
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
      isEdited: (dto as any).isEdited,
      editedAt: (dto as any).editedAt,
      replyTo: (dto as any).replyTo ?? undefined,
      reactions: (dto as any).reactions ?? [],
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

    // Helper: play a soft notification ding
    const playNotificationSound = () => {
      try {
        let ctx = audioCtxRef.current;
        if (!ctx) { ctx = new AudioContext(); audioCtxRef.current = ctx; }
        const play = () => {
          const oscillator = ctx!.createOscillator();
          const gain = ctx!.createGain();
          oscillator.connect(gain);
          gain.connect(ctx!.destination);
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(880, ctx!.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(660, ctx!.currentTime + 0.12);
          gain.gain.setValueAtTime(0.25, ctx!.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx!.currentTime + 0.35);
          oscillator.start(ctx!.currentTime);
          oscillator.stop(ctx!.currentTime + 0.35);
        };
        if (ctx.state === "suspended") {
          void ctx.resume().then(play);
        } else {
          play();
        }
      } catch {
        // Audio unavailable
      }
    };

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

        // Sound always; if window not focused treat same as background chat
        playNotificationSound();
        if (!document.hasFocus()) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === chatId ? { ...c, unreadCount: c.unreadCount + 1 } : c
            )
          );
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
          // Always sound + notify for messages in background chats
          playNotificationSound();
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

    connection.on("MessageDeleted", (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    });

    connection.on("ReactionUpdated", (data: { messageId: string; reactions: { emoji: string; count: number; userIds: string[] }[] }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === data.messageId ? { ...m, reactions: data.reactions } : m)
      );
    });

    connection.on("GroupDeleted", (data: { chatId: string }) => {
      setConversations((prev) => prev.filter((c) => c.id !== data.chatId));
      setSelectedConversationId((prev) => prev === data.chatId ? "" : prev);
    });

    connection.on("GroupAvatarUpdated", (data: { chatId: string; avatarUrl: string }) => {
      setConversations((prev) =>
        prev.map((c) => c.id === data.chatId ? { ...c, chatAvatarUrl: data.avatarUrl } : c)
      );
    });

    // When the other user reads the chat — update their lastReadAt so our ticks update
    connection.on("ChatRead", (data: { chatId: string; userId: string; lastReadAt: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.chatId && c.otherUserId === data.userId
            ? { ...c, otherMemberLastReadAt: data.lastReadAt }
            : c
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

    // ─── Video Call Events ───────────────────────────────────────────────────
    connection.on("CallCreated", (data: { callId: string }) => {
      activeCallIdRef.current = data.callId;
      setActiveCall({ callId: data.callId });
    });

    connection.on("IncomingCall", (data: { callId: string; callerName: string; groupName?: string }) => {
      setIncomingCall({ callId: data.callId, callerName: data.callerName, groupName: data.groupName });
    });

    connection.on("CallAccepted", async (data: { callId: string; participants: { userId: string; connectionId: string }[] }) => {
      console.log("[Call] CallAccepted — participants:", data.participants);
      for (const p of data.participants) {
        try {
          const pc = webRTC.createPeerConnection(
            p.connectionId, p.userId, data.callId,
            (rs) => setRemoteStreams((prev) => [...prev.filter((s) => s.connectionId !== rs.connectionId), rs]),
          );
          console.log("[Call] Creating offer for", p.connectionId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          console.log("[Call] Sending offer to", p.connectionId);
          await connection.invoke("SendOffer", data.callId, p.connectionId, offer);
        } catch (e) {
          console.error("[Call] CallAccepted error:", e);
        }
      }
    });

    connection.on("UserJoinedCall", async (data: { callId: string; userId: string; connectionId: string }) => {
      console.log("[Call] UserJoinedCall:", data);
      setPendingCallInvitees((prev) => prev.filter((p) => p.userId !== data.userId));
      webRTC.createPeerConnection(
        data.connectionId, data.userId, data.callId,
        (rs) => setRemoteStreams((prev) => [...prev.filter((s) => s.connectionId !== rs.connectionId), rs]),
      );
    });

    connection.on("ReceiveOffer", async (data: { callId: string; fromConnectionId: string; offer: RTCSessionDescriptionInit }) => {
      console.log("[Call] ReceiveOffer from", data.fromConnectionId);
      try {
        let pc = webRTC.peerConnections.current.get(data.fromConnectionId);
        if (!pc) {
          console.log("[Call] No existing PC — creating one");
          pc = webRTC.createPeerConnection(
            data.fromConnectionId, data.fromConnectionId, data.callId,
            (rs) => setRemoteStreams((prev) => [...prev.filter((s) => s.connectionId !== rs.connectionId), rs]),
          );
        }
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("[Call] Sending answer to", data.fromConnectionId);
        await connection.invoke("SendAnswer", data.callId, data.fromConnectionId, answer);
      } catch (e) {
        console.error("[Call] ReceiveOffer error:", e);
      }
    });

    connection.on("ReceiveAnswer", async (data: { callId: string; fromConnectionId: string; answer: RTCSessionDescriptionInit }) => {
      console.log("[Call] ReceiveAnswer from", data.fromConnectionId);
      const pc = webRTC.peerConnections.current.get(data.fromConnectionId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch((e) => console.error("[Call] setRemoteDescription answer error:", e));
      else console.warn("[Call] ReceiveAnswer — no PC found for", data.fromConnectionId);
    });

    connection.on("ReceiveIceCandidate", async (data: { callId: string; fromConnectionId: string; candidate: RTCIceCandidateInit }) => {
      console.log("[Call] ReceiveIceCandidate from", data.fromConnectionId);
      const pc = webRTC.peerConnections.current.get(data.fromConnectionId);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
      else console.warn("[Call] ReceiveIceCandidate — no PC found for", data.fromConnectionId);
    });

    connection.on("CallRejected", () => {
      setActiveCall(null);
      setIncomingCall(null);
      webRTC.closeAllConnections();
      setRemoteStreams([]);
      setLocalStream(null);
    });

    connection.on("UserLeftCall", (data: { userId: string; callId: string }) => {
      setRemoteStreams((prev) => prev.filter((s) => s.userId !== data.userId));
    });

    connection.on("CallEnded", () => {
      setActiveCall(null);
      webRTC.closeAllConnections();
      setRemoteStreams([]);
      setLocalStream(null);
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
    // On mobile, close sidebar when a chat is selected
    if (isMobile) setSidebarOpen(false);
  };
  selectConversationRef.current = handleSelectConversation;

  // ─── Video Call Handlers ─────────────────────────────────────────────────────
  const handleStartCall = useCallback(async (targetUserId: string, chatId?: string) => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
    try {
      // Fetch fresh TURN credentials from backend before starting
      try {
        const turnServers = await getTurnCredentials(authToken);
        console.log("[Call] TURN credentials fetched:", turnServers.length, "servers");
        webRTC.setIceServers(turnServers);
      } catch (e) {
        console.warn("[Call] Could not fetch TURN credentials, using STUN only:", e);
      }
      const stream = await webRTC.getLocalStream();
      setLocalStream(stream);
      const calleeName = conversations.find((c) => c.otherUserId === targetUserId)?.name;
      setActiveCall({ callId: "", calleeName });
      await conn.invoke("CallUser", targetUserId, chatId ?? null);
    } catch (e) {
      console.error("Failed to start call", e);
      setActiveCall(null);
      webRTC.stopLocalStream();
      setLocalStream(null);
    }
  }, [webRTC, authToken, conversations]);

  const handleStartGroupCall = useCallback(async (chatId: string, groupName: string) => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
    try {
      try {
        const turnServers = await getTurnCredentials(authToken);
        webRTC.setIceServers(turnServers);
      } catch (e) {
        console.warn("[Call] Could not fetch TURN credentials, using STUN only:", e);
      }
      const stream = await webRTC.getLocalStream();
      setLocalStream(stream);
      setActiveCall({ callId: "", calleeName: groupName });
      await conn.invoke("CallGroup", chatId);
    } catch (e) {
      console.error("Failed to start group call", e);
      setActiveCall(null);
      webRTC.stopLocalStream();
      setLocalStream(null);
    }
  }, [webRTC, authToken]);

  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const conn = connectionRef.current;
    if (!conn) return;
    try {
      try {
        const turnServers = await getTurnCredentials(authToken);
        webRTC.setIceServers(turnServers);
      } catch { /* fall back to STUN */ }
      const stream = await webRTC.getLocalStream();
      setLocalStream(stream);
      activeCallIdRef.current = incomingCall.callId;
      setActiveCall({ callId: incomingCall.callId });
      setIncomingCall(null);
      await conn.invoke("AcceptCall", incomingCall.callId);
    } catch (e) {
      console.error("Failed to accept call", e);
    }
  }, [incomingCall, webRTC, authToken]);

  const handleRejectCall = useCallback(async () => {
    if (!incomingCall) return;
    const conn = connectionRef.current;
    try {
      await conn?.invoke("RejectCall", incomingCall.callId);
    } catch { /* ignore */ }
    setIncomingCall(null);
  }, [incomingCall]);

  const handleHangUp = useCallback(async () => {
    const callId = activeCallIdRef.current;
    const conn = connectionRef.current;
    try {
      if (callId) await conn?.invoke("HangUp", callId);
    } catch { /* ignore */ }
    activeCallIdRef.current = "";
    setActiveCall(null);
    webRTC.closeAllConnections();
    setRemoteStreams([]);
    setLocalStream(null);
    setPendingCallInvitees([]);
  }, [webRTC]);

  const handleToggleMute = useCallback(() => {
    if (webRTC.localStream.current) {
      webRTC.localStream.current.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
      setIsMuted((v) => !v);
    }
  }, [webRTC]);

  const handleToggleCamera = useCallback(() => {
    if (webRTC.localStream.current) {
      webRTC.localStream.current.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
      setIsCameraOff((v) => !v);
    }
  }, [webRTC]);

  const handleInviteToCall = useCallback(async (targetUserId: string, targetName?: string) => {
    const callId = activeCallIdRef.current;
    const conn = connectionRef.current;
    if (!callId || !conn) return;
    try {
      await conn.invoke("InviteToCall", callId, targetUserId);
      setPendingCallInvitees((prev) => [...prev.filter((p) => p.userId !== targetUserId), { userId: targetUserId, name: targetName ?? targetUserId.slice(0, 8) }]);
    } catch (e) {
      console.error("[Call] InviteToCall failed", e);
    }
    setShowCallInvite(false);
    setCallInviteSearch("");
  }, []);

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

  const handleSendMessage = async (text: string, gifUrl?: string, attachmentId?: string, replyToMessageId?: string) => {
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
      replyTo: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : undefined,
    };

    setMessages((prev) => [...prev, optimistic]);
    setReplyingTo(null);

    try {
      const dto = await sendChatMessage(selectedConversationId, trimmed, authToken, gifUrl, attachmentId, replyToMessageId);
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

  const handleCreateGroup = async (groupName: string, memberIds: string[], avatarKey?: string) => {
    try {
      setError(null);
      setIsCreatingGroup(true);
      const dto = await createGroupChat(groupName, memberIds, authToken, avatarKey);
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

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedConversationId) return;
    await deleteMessage(selectedConversationId, messageId, authToken);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!selectedConversationId) return;
    await toggleReaction(selectedConversationId, messageId, emoji, authToken);
  };

  const handleDeleteGroup = async (chatId: string) => {
    try {
      await deleteGroup(chatId, authToken);
      setConversations((prev) => prev.filter((c) => c.id !== chatId));
      if (selectedConversationId === chatId) setSelectedConversationId("");
    } catch (e) {
      console.error("Failed to delete group", e);
      alert("Failed to delete group. Please try again.");
    }
  };

  const handleUpdateGroupPhoto = async (chatId: string, file: File) => {
    try {
      const { uploadUrl, key } = await getGroupAvatarUploadUrl(authToken, file.type || "image/jpeg");
      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "image/jpeg" } });
      const { avatarUrl } = await updateGroupAvatar(chatId, key, authToken);
      setConversations((prev) =>
        prev.map((c) => c.id === chatId ? { ...c, chatAvatarUrl: avatarUrl } : c)
      );
    } catch (e) {
      console.error("Failed to update group photo", e);
      alert("Failed to update group photo.");
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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 12px' : '0 24px', width: '100%', position: 'fixed', top: 'var(--android-top, 0px)', left: 0,
        background: tokens.bgMain, zIndex: 1000, height: '56px', boxSizing: 'border-box',
        borderBottom: `1px solid ${tokens.border}`,
      }}>
        {/* Left side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
          {isMobile && (
            <button
              type="button"
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Toggle menu"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: tokens.textMain, display: 'flex', alignItems: 'center' }}
            >
              <HamburgerIcon />
            </button>
          )}
          <img src="/logo.jpeg" alt="ChatR" style={{ height: 32, borderRadius: 6 }} />
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
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
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: tokens.textMuted, fontSize: isMobile ? '1rem' : '0.85rem' }}
              title="Edit availability"
            >
              {isMobile ? '✎' : `${currentUserName} ✎`}
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
          {!isMobile && onInviteUser && (
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

      {/* Forward message modal — outside topbar so position:fixed works from viewport */}
      {/* ─── Video Call Modals ─────────────────────────────────────────────── */}
      {incomingCall && !activeCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          groupName={incomingCall.groupName}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
      {activeCall && (
        <VideoCallModal
          callId={activeCall.callId}
          calleeName={activeCall.calleeName}
          localStream={localStream}
          remoteStreams={remoteStreams}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onHangUp={handleHangUp}
          pendingInvitees={pendingCallInvitees}
          onInvite={() => { setShowCallInvite(true); setCallInviteSearch(""); }}
        />
      )}

      {showCallInvite && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: tokens.bgCard, borderRadius: 14, padding: "20px 24px", width: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: 12, color: tokens.textMain }}>Invite to call</div>
            <input
              autoFocus
              value={callInviteSearch}
              onChange={(e) => setCallInviteSearch(e.target.value)}
              placeholder="Search by name or email…"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${tokens.border}`, background: tokens.bgMain, color: tokens.textMain, fontSize: "0.9rem", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
            />
            <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {conversations
                .filter((c) => c.type === "direct" && !!c.otherUserId)
                .filter((c) => {
                  const q = callInviteSearch.toLowerCase();
                  return !q || c.name.toLowerCase().includes(q);
                })
                .map((c) => (
                  <button key={c.id} type="button"
                    onClick={() => { console.log("[Call] Inviting", c.otherUserId); handleInviteToCall(c.otherUserId!, c.name); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", color: tokens.textMain, width: "100%" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = tokens.bgSidebar)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: tokens.accent, color: tokens.textOnAccent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 500 }}>{c.name}</div>
                      {c.otherUserGroup && <div style={{ fontSize: "0.72rem", opacity: 0.6 }}>{c.otherUserGroup}</div>}
                    </div>
                  </button>
                ))}
            </div>
            <button type="button" onClick={() => setShowCallInvite(false)}
              style={{ marginTop: 12, width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${tokens.border}`, background: "transparent", color: tokens.textMuted, cursor: "pointer", fontSize: "0.85rem" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {forwardingMessage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: tokens.bgCard, borderRadius: 14, padding: "20px 24px", minWidth: 300, maxWidth: 400, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: 4, color: tokens.textMain }}>Forward message</div>
            <div style={{ fontSize: "0.8rem", color: tokens.textMuted, marginBottom: 14, borderLeft: `3px solid ${tokens.accent}`, paddingLeft: 8 }}>
              {forwardingMessage.text || "📎 Attachment"}
            </div>
            <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {conversations.filter((c) => c.id !== selectedConversationId).map((c) => (
                <button key={c.id} type="button"
                  onClick={async () => {
                    await sendChatMessage(c.id, forwardingMessage.text, authToken);
                    setForwardingMessage(null);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    borderRadius: 8, border: `1px solid ${tokens.border}`, background: "none",
                    cursor: "pointer", color: tokens.textMain, textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = tokens.border)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{c.name}</span>
                  <span style={{ fontSize: "0.72rem", color: tokens.textMuted, marginLeft: "auto" }}>
                    {c.type === "group" ? "Group" : "Direct"}
                  </span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setForwardingMessage(null)}
              style={{ marginTop: 14, width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${tokens.border}`, background: "none", color: tokens.textMuted, cursor: "pointer", fontSize: "0.85rem" }}
            >Cancel</button>
          </div>
        </div>
      )}

      <div className="chat-body" style={{ marginTop: 'calc(56px + var(--android-top, 0px))' }}>
        <aside className={`chat-sidebar${isMobile && !sidebarOpen ? ' sidebar-hidden' : ''}`}>
          <div className="chat-sidebar-header" />

          {isMobile ? (
            <div style={{ borderBottom: `1px solid ${tokens.border}` }}>
              <button
                type="button"
                onClick={() => setShowGroupCreationForm(v => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  color: tokens.textMain, fontSize: '0.9rem', fontWeight: 500,
                }}
              >
                <span>+ Create Group</span>
                <span style={{ color: tokens.textMuted, fontSize: '0.8rem' }}>{showGroupCreationForm ? '▲' : '▼'}</span>
              </button>
              {showGroupCreationForm && (
                <div style={{ paddingBottom: 8 }}>
                  <GroupCreation onCreateGroup={handleCreateGroup} isLoading={isCreatingGroup} token={authToken} />
                </div>
              )}
            </div>
          ) : (
            <GroupCreation onCreateGroup={handleCreateGroup} isLoading={isCreatingGroup} token={authToken} />
          )}

          <div className="user-search-container">
            <div className="user-search-label">Start private chat</div>
            <input
              className="user-search-input"
              type="text"
              placeholder="Search by name or email…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            {userSearch.trim() && isLoadingUsers && <div className="user-search-hint">Searching…</div>}
            {userSearch.trim() && !isLoadingUsers && allUsers.length === 0 && (
              <div className="user-search-hint">No users found</div>
            )}
            {userSearch.trim() && !isLoadingUsers && allUsers.length > 0 && (
              <div className="user-search-results">
                {allUsers.map((u) => (
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
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <ChatHeader
                    conversation={selectedConversation}
                    currentUserId={currentUserId}
                    onDeleteGroup={handleDeleteGroup}
                    onUpdateGroupPhoto={handleUpdateGroupPhoto}
                  />
                </div>
                {selectedConversation.type === "direct" && selectedConversation.otherUserId && (
                  <button
                    onClick={() => handleStartCall(selectedConversation.otherUserId!, selectedConversation.id)}
                    title="Start video call"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 22,
                      padding: "0 14px",
                      color: tokens.textMuted,
                      flexShrink: 0,
                    }}
                  >
                    📹
                  </button>
                )}
                {selectedConversation.type === "group" && (
                  <button
                    onClick={() => handleStartGroupCall(selectedConversation.id, selectedConversation.name)}
                    title="Start group video call"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 22,
                      padding: "0 14px",
                      color: tokens.textMuted,
                      flexShrink: 0,
                    }}
                  >
                    📹
                  </button>
                )}
              </div>

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

              <MessageList
                messages={messages}
                onDownloadAttachment={handleGetAttachmentUrl}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onReplyMessage={(msg) => setReplyingTo({ ...msg, messageId: msg.id })}
                onForwardMessage={(msg) => setForwardingMessage(msg)}
                onReactMessage={handleToggleReaction}
                currentUserId={currentUserId}
                otherMemberLastReadAt={selectedConversation?.otherMemberLastReadAt ?? null}
                isGroupChat={selectedConversation?.type === "group"}
              />
              <MessageInput
                chatId={selectedConversationId}
                onSend={handleSendMessage}
                replyingTo={replyingTo ? { messageId: replyingTo.messageId, id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : undefined}
                onCancelReply={() => setReplyingTo(null)}
              />

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
