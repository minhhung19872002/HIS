import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { createHubConnection } from '../../../services/signalr.service';

export interface RisChatMessage {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

type MessageHandler = (msg: RisChatMessage) => void;
type UserEventHandler = (userId: string, username: string) => void;

let connection: HubConnection | null = null;
let messageHandlers: MessageHandler[] = [];
let userJoinedHandlers: UserEventHandler[] = [];
let userLeftHandlers: UserEventHandler[] = [];
const joinedStudies = new Set<string>();

function getConnection(): HubConnection {
  if (connection) return connection;

  // QA-R10: default factory reads the latest (refreshed) token on every (re)connect — a token captured
  // here expired after 30 min and every reconnect failed with 401.
  connection = createHubConnection('/hubs/ris-chat');

  // Server-side groups are per connection id: after an automatic reconnect the rooms are gone → rejoin.
  connection.onreconnected(() => {
    joinedStudies.forEach(id => { connection?.invoke('JoinStudyRoom', id).catch(() => {}); });
  });

  connection.on('ReceiveMessage', (senderId: string, senderName: string, message: string, timestamp: string) => {
    const msg: RisChatMessage = { senderId, senderName, message, timestamp };
    messageHandlers.forEach(h => h(msg));
  });

  connection.on('UserJoined', (userId: string, username: string) => {
    userJoinedHandlers.forEach(h => h(userId, username));
  });

  connection.on('UserLeft', (userId: string, username: string) => {
    userLeftHandlers.forEach(h => h(userId, username));
  });

  return connection;
}

async function ensureConnected(): Promise<HubConnection> {
  const conn = getConnection();
  if (conn.state === HubConnectionState.Disconnected) {
    try {
      await conn.start();
    } catch (err) {
      console.warn('RIS Chat SignalR connection failed:', err);
      throw err;
    }
  }
  return conn;
}

/** Join a study chat room and start receiving messages for that study. */
export async function connectToStudy(studyId: string): Promise<void> {
  const conn = await ensureConnected();
  await conn.invoke('JoinStudyRoom', studyId);
  joinedStudies.add(studyId);
}

/** Leave a study chat room. */
export async function disconnectFromStudy(studyId: string): Promise<void> {
  joinedStudies.delete(studyId);
  if (!connection || connection.state !== HubConnectionState.Connected) return;
  await connection.invoke('LeaveStudyRoom', studyId);
}

/** Send a message to everyone in the study chat room. */
export async function sendMessage(studyId: string, message: string): Promise<void> {
  if (!connection || connection.state !== HubConnectionState.Connected) {
    throw new Error('Not connected to RIS Chat hub');
  }
  await connection.invoke('SendMessage', studyId, message);
}

/** Register a handler for incoming chat messages. Returns an unsubscribe function. */
export function onReceiveMessage(handler: MessageHandler): () => void {
  messageHandlers.push(handler);
  return () => {
    messageHandlers = messageHandlers.filter(h => h !== handler);
  };
}

/** Register a handler for user join events. Returns an unsubscribe function. */
export function onUserJoined(handler: UserEventHandler): () => void {
  userJoinedHandlers.push(handler);
  return () => {
    userJoinedHandlers = userJoinedHandlers.filter(h => h !== handler);
  };
}

/** Register a handler for user leave events. Returns an unsubscribe function. */
export function onUserLeft(handler: UserEventHandler): () => void {
  userLeftHandlers.push(handler);
  return () => {
    userLeftHandlers = userLeftHandlers.filter(h => h !== handler);
  };
}

/** Disconnect from the hub entirely and clean up. */
export async function disconnect(): Promise<void> {
  if (connection) {
    try {
      await connection.stop();
    } catch {
      // Ignore stop errors
    }
    connection = null;
  }
  joinedStudies.clear();
  messageHandlers = [];
  userJoinedHandlers = [];
  userLeftHandlers = [];
}

/** Check if the hub connection is currently active. */
export function isConnected(): boolean {
  return connection?.state === HubConnectionState.Connected;
}
