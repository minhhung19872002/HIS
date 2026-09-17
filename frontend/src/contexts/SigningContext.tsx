import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import { storage, STORAGE_KEYS } from '../services/storage.service';
import { useAuth } from './AuthContext';
import type {
  OpenSessionResponse,
  SessionStatusResponse,
  SignDocumentResponse,
  BatchSignResponse,
} from '../modules/emr/api/digitalSignature';
import {
  openSession as apiOpenSession,
  getSessionStatus as apiGetSessionStatus,
  closeSession as apiCloseSession,
  signDocument as apiSignDocument,
  batchSign as apiBatchSign,
} from '../modules/emr/api/digitalSignature';
import * as signalR from '@microsoft/signalr';
import { createHubConnection } from '../services/signalr.service';

interface BatchProgress {
  current: number;
  total: number;
  documentId: string;
  success: boolean;
}

interface SigningContextType {
  sessionActive: boolean;
  sessionExpiresAt: string | null;
  tokenSerial: string | null;
  caProvider: string | null;
  certificateSubject: string | null;
  expiryWarningDays: number | null;
  batchProgress: BatchProgress | null;
  isSigningBatch: boolean;
  openSession: (pin: string, skipPkcs11?: boolean) => Promise<OpenSessionResponse>;
  tryAutoOpenSession: () => Promise<OpenSessionResponse>;
  closeSession: () => Promise<void>;
  signDocument: (documentId: string, documentType: string, reason: string, pin?: string) => Promise<SignDocumentResponse>;
  startBatchSign: (documentIds: string[], documentType: string, reason: string, pin?: string) => Promise<BatchSignResponse>;
  refreshSessionStatus: () => Promise<void>;
}

const SigningContext = createContext<SigningContextType | null>(null);

export function useSigningContext() {
  const ctx = useContext(SigningContext);
  if (!ctx) throw new Error('useSigningContext must be used within SigningProvider');
  return ctx;
}

export function SigningProvider({ children }: { children: React.ReactNode }) {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [tokenSerial, setTokenSerial] = useState<string | null>(null);
  const [caProvider, setCaProvider] = useState<string | null>(null);
  const [certificateSubject, setCertificateSubject] = useState<string | null>(null);
  const [expiryWarningDays, setExpiryWarningDays] = useState<number | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [isSigningBatch, setIsSigningBatch] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const { isAuthenticated } = useAuth();

  // Setup SignalR connection for batch signing progress.
  // QA-R10: keyed on isAuthenticated — the provider mounts at app root BEFORE login, so with `[]` deps it
  // never connected after a fresh login (no batch progress until a full page reload), and after logout it
  // kept the previous user's connection. Default token factory reads the latest (refreshed) token.
  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) return;
    const token = storage.getRaw(STORAGE_KEYS.token);
    if (!token) return;

    // Shared factory — reconnect delays kept as this context's own [0,2000,5000,10000];
    // LogLevel.None via factory default.
    const connection = createHubConnection('/hubs/notifications', {
      reconnectDelays: [0, 2000, 5000, 10000],
    });

    connection.on('SigningProgress', (data: BatchProgress) => {
      setBatchProgress(data);
    });

    connection.on('SigningComplete', (data: { total: number; succeeded: number; failed: number }) => {
      setIsSigningBatch(false);
      if (data.failed === 0) {
        message.success(`Ký thành công ${data.succeeded}/${data.total} tài liệu`);
      } else {
        message.warning(`Ký ${data.succeeded}/${data.total} thành công, ${data.failed} thất bại`);
      }
    });

    connection.start()
      .then(() => {
        if (cancelled) {
          return connection.stop();
        }
      })
      .catch(() => {
        // SignalR connection errors are handled by NotificationContext
      });

    connectionRef.current = connection;

    return () => {
      cancelled = true;
      connection.stop();
      if (connectionRef.current === connection) connectionRef.current = null;
    };
  }, [isAuthenticated]);

  const updateSessionState = useCallback((status: SessionStatusResponse) => {
    setSessionActive(status.active);
    setSessionExpiresAt(status.expiresAt || null);
    setTokenSerial(status.tokenSerial || null);
    setCaProvider(status.caProvider || null);
    setCertificateSubject(status.certificateSubject || null);
    setExpiryWarningDays(status.expiryWarningDays ?? null);
  }, []);

  const refreshSessionStatus = useCallback(async () => {
    try {
      const res = await apiGetSessionStatus();
      updateSessionState(res.data);
    } catch {
      setSessionActive(false);
    }
  }, [updateSessionState]);

  const openSessionHandler = useCallback(async (pin: string, skipPkcs11?: boolean): Promise<OpenSessionResponse> => {
    const res = await apiOpenSession({ pin, skipPkcs11 });
    if (res.data.success) {
      setSessionActive(true);
      setSessionExpiresAt(res.data.sessionExpiresAt || null);
      setTokenSerial(res.data.tokenSerial || null);
      setCaProvider(res.data.caProvider || null);
      setCertificateSubject(res.data.certificateSubject || null);
    }
    return res.data;
  }, []);

  const tryAutoOpenSessionHandler = useCallback(async (): Promise<OpenSessionResponse> => {
    // Try opening session with Windows Certificate Store (no PIN needed)
    const res = await apiOpenSession({ pin: '', skipPkcs11: true });
    if (res.data.success) {
      setSessionActive(true);
      setSessionExpiresAt(res.data.sessionExpiresAt || null);
      setTokenSerial(res.data.tokenSerial || null);
      setCaProvider(res.data.caProvider || null);
      setCertificateSubject(res.data.certificateSubject || null);
    }
    return res.data;
  }, []);

  const closeSessionHandler = useCallback(async () => {
    await apiCloseSession();
    setSessionActive(false);
    setSessionExpiresAt(null);
    setTokenSerial(null);
    setCaProvider(null);
    setCertificateSubject(null);
  }, []);

  const signDocumentHandler = useCallback(async (
    documentId: string, documentType: string, reason: string, pin?: string
  ): Promise<SignDocumentResponse> => {
    try {
      const res = await apiSignDocument({
        documentId,
        documentType,
        pin,
        reason,
        location: 'Việt Nam',
      });
      return res.data;
    } catch (err: unknown) {
      // Extract error message from HTTP error responses (e.g. 409 Conflict)
      const axiosErr = err as { response?: { data?: { success?: boolean; message?: string } } };
      if (axiosErr.response?.data?.message) {
        return { success: false, message: axiosErr.response.data.message };
      }
      return { success: false, message: 'Lỗi ký số' };
    }
  }, []);

  const startBatchSignHandler = useCallback(async (
    documentIds: string[], documentType: string, reason: string, pin?: string
  ): Promise<BatchSignResponse> => {
    setIsSigningBatch(true);
    setBatchProgress(null);
    // QA-R10: the server closes the hub when the access token expires; make sure progress events arrive.
    const conn = connectionRef.current;
    if (conn && conn.state === signalR.HubConnectionState.Disconnected) {
      await conn.start().catch(() => {});
    }
    try {
      const res = await apiBatchSign({
        documentIds,
        documentType,
        pin,
        reason,
      });
      return res.data;
    } finally {
      setIsSigningBatch(false);
    }
  }, []);

  // Check session status on mount
  useEffect(() => {
    const token = storage.getRaw(STORAGE_KEYS.token);
    if (token) {
      refreshSessionStatus();
    }
  }, [refreshSessionStatus]);

  return (
    <SigningContext.Provider
      value={{
        sessionActive,
        sessionExpiresAt,
        tokenSerial,
        caProvider,
        certificateSubject,
        expiryWarningDays,
        batchProgress,
        isSigningBatch,
        openSession: openSessionHandler,
        tryAutoOpenSession: tryAutoOpenSessionHandler,
        closeSession: closeSessionHandler,
        signDocument: signDocumentHandler,
        startBatchSign: startBatchSignHandler,
        refreshSessionStatus,
      }}
    >
      {children}
    </SigningContext.Provider>
  );
}
