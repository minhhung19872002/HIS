import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Badge, Button, Tooltip, Space, Popconfirm, message } from 'antd';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getDocumentLockStatus, acquireDocumentLock, releaseDocumentLock, forceReleaseDocumentLock } from '../api/emrManagement';
import type { DocumentLockDto } from '../api/emrManagement';

interface DocumentLockIndicatorProps {
  documentType: string;
  documentId: string;
  onLockAcquired?: () => void;
  onLockReleased?: () => void;
  showForceUnlock?: boolean;
  refreshInterval?: number;
}

const DocumentLockIndicator: React.FC<DocumentLockIndicatorProps> = ({
  documentType,
  documentId,
  onLockAcquired,
  onLockReleased,
  showForceUnlock = true,
  refreshInterval = 30000,
}) => {
  const [lockStatus, setLockStatus] = useState<DocumentLockDto | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!documentType || !documentId) return;
    try {
      const res = await getDocumentLockStatus(documentType, documentId);
      setLockStatus(res.data || null);
    } catch {
      // Silently ignore - document may not have lock support
    }
  }, [documentType, documentId]);

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus, refreshInterval]);

  const handleAcquireLock = async () => {
    setLoading(true);
    try {
      await acquireDocumentLock({ documentType, documentId });
      message.success('Da khoa tai lieu');
      await fetchStatus();
      onLockAcquired?.();
    } catch {
      message.warning('Khong the khoa tai lieu. Co the tai lieu da bi khoa boi nguoi khac.');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseLock = async () => {
    if (!lockStatus?.id) {
      message.warning('Khong tim thay khoa hien tai');
      return;
    }
    setLoading(true);
    try {
      await releaseDocumentLock({ lockId: lockStatus.id });
      message.success('Da mo khoa tai lieu');
      await fetchStatus();
      onLockReleased?.();
    } catch {
      message.warning('Khong the mo khoa tai lieu');
    } finally {
      setLoading(false);
    }
  };

  const handleForceRelease = async () => {
    if (!lockStatus?.id) {
      message.warning('Khong tim thay khoa hien tai');
      return;
    }
    setLoading(true);
    try {
      await forceReleaseDocumentLock({ lockId: lockStatus.id });
      message.success('Da cuong che mo khoa');
      await fetchStatus();
      onLockReleased?.();
    } catch {
      message.warning('Khong the cuong che mo khoa');
    } finally {
      setLoading(false);
    }
  };

  if (!lockStatus) {
    return (
      <Tooltip title="Khoa tai lieu de chinh sua">
        <Button size="small" icon={<UnlockOutlined />} loading={loading} onClick={handleAcquireLock}>
          Khoa
        </Button>
      </Tooltip>
    );
  }

  if (lockStatus.isLocked) {
    const expiresText = lockStatus.expiresAt
      ? `Het han: ${dayjs(lockStatus.expiresAt).format('HH:mm DD/MM')}`
      : '';
    const lockedByText = lockStatus.lockedByName || 'Nguoi dung khac';

    return (
      <Space orientation="horizontal" size={4}>
        <Tooltip title={`Dang khoa boi ${lockedByText}. ${expiresText}`}>
          <Badge status="error" text={<span style={{ fontSize: 12 }}><LockOutlined /> {lockedByText}</span>} />
        </Tooltip>
        <Button size="small" icon={<UnlockOutlined />} loading={loading} onClick={handleReleaseLock}>
          Mo khoa
        </Button>
        {showForceUnlock && (
          <Popconfirm
            title="Cuong che mo khoa?"
            description="Nguoi dang chinh sua se mat quyen truy cap."
            onConfirm={handleForceRelease}
          >
            <Button size="small" danger loading={loading}>
              Cuong che
            </Button>
          </Popconfirm>
        )}
      </Space>
    );
  }

  return (
    <Space orientation="horizontal" size={4}>
      <Badge status="success" text={<span style={{ fontSize: 12 }}><UnlockOutlined /> Khong khoa</span>} />
      <Button size="small" icon={<LockOutlined />} loading={loading} onClick={handleAcquireLock}>
        Khoa
      </Button>
    </Space>
  );
};

export default DocumentLockIndicator;
