import { useRef, useCallback } from "react";
import type { HubConnection } from "@microsoft/signalr";

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export interface RemoteStream {
  connectionId: string;
  userId: string;
  stream: MediaStream;
}

// Takes a ref so it always reads the current connection, even after reconnects
export function useWebRTC(connectionRef: React.MutableRefObject<HubConnection | null>) {
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStream = useRef<MediaStream | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE_SERVERS);

  const setIceServers = useCallback((servers: RTCIceServer[]) => {
    iceServersRef.current = servers.length > 0 ? servers : FALLBACK_ICE_SERVERS;
  }, []);

  const getLocalStream = useCallback(async (video = true, audio = true) => {
    if (!localStream.current) {
      localStream.current = await navigator.mediaDevices.getUserMedia({ video, audio });
    }
    return localStream.current;
  }, []);

  const stopLocalStream = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => t.stop());
      localStream.current = null;
    }
  }, []);

  const createPeerConnection = useCallback(
    (
      connectionId: string,
      userId: string,
      callId: string,
      onRemoteStream: (s: RemoteStream) => void,
      onConnectionStateChange?: (connectionId: string, state: RTCPeerConnectionState) => void
    ) => {
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      console.log("[WebRTC] Using ICE servers:", iceServersRef.current.map((s) => s.urls));

      // Add local tracks
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStream.current!);
        });
      }

      // Relay ICE candidates — always reads current connection via ref
      pc.onicecandidate = (e) => {
        if (e.candidate && connectionRef.current) {
          connectionRef.current
            .invoke("SendIceCandidate", callId, connectionId, e.candidate)
            .catch(() => {});
        }
      };

      // Build a stable MediaStream from incoming tracks
      const remoteStream = new MediaStream();
      pc.ontrack = (e) => {
        remoteStream.addTrack(e.track);
        onRemoteStream({ connectionId, userId, stream: remoteStream });
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE state (${connectionId.slice(0, 6)}):`, pc.iceConnectionState);
      };

      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state (${connectionId.slice(0, 6)}):`, pc.connectionState);
        onConnectionStateChange?.(connectionId, pc.connectionState);
      };

      peerConnections.current.set(connectionId, pc);
      return pc;
    },
    [connectionRef]
  );

  const closePeerConnection = useCallback((connectionId: string) => {
    const pc = peerConnections.current.get(connectionId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(connectionId);
    }
  }, []);

  const closeAllConnections = useCallback(() => {
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    stopLocalStream();
  }, [stopLocalStream]);

  return {
    getLocalStream,
    stopLocalStream,
    setIceServers,
    createPeerConnection,
    closePeerConnection,
    closeAllConnections,
    peerConnections,
    localStream,
  };
}
