import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import type {
  OpenSessionResponse,
  SessionStatusResponse,
  SignDocumentResponse,
  BatchSignResponse,
  BatchSignItemResult,
} from '../api/digitalSignature';
import {
  openSession as apiOpenSession,
  getSessionStatus as apiGetSessionStatus,
  closeSession as apiCloseSession,
  signDocument as apiSignDocument,
  batchSign as apiBatchSign,
} from '../api/digitalSignature';
import * as signalR from '@microsoft/signalr';

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
  openSession: (pin: string) => Promise<OpenSessionResponse>;
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

  // Setup SignalR connection for batch signing progress
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/notifications', {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

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

    connection.start().catch(() => {
      // SignalR connection errors are handled by NotificationContext
    });

    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, []);

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

  const openSessionHandler = useCallback(async (pin: string): Promise<OpenSessionResponse> => {
    const res = await apiOpenSession({ pin });
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
    const res = await apiSignDocument({
      documentId,
      documentType,
      pin,
      reason,
      location: 'Việt Nam',
    });
    return res.data;
  }, []);

  const startBatchSignHandler = useCallback(async (
    documentIds: string[], documentType: string, reason: string, pin?: string
  ): Promise<BatchSignResponse> => {
    setIsSigningBatch(true);
    setBatchProgress(null);
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
    const token = localStorage.getItem('token');
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
