import React, { useState } from 'react';
import { Modal, Progress, Table, Tag, Button, Alert, Space } from 'antd';
import {
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useSigningContext } from '../../contexts/SigningContext';

interface BatchDocument {
  id: string;
  code?: string;
  name?: string;
}

interface BatchSigningModalProps {
  open: boolean;
  onClose: () => void;
  documents: BatchDocument[];
  documentType: string;
  onComplete?: () => void;
}

export default function BatchSigningModal({
  open,
  onClose,
  documents,
  documentType,
  onComplete,
}: BatchSigningModalProps) {
  const { batchProgress, isSigningBatch, startBatchSign, sessionActive } = useSigningContext();
  const [results, setResults] = useState<Map<string, boolean>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleSign = async () => {
    setError(null);
    setResults(new Map());
    setCompleted(false);

    try {
      const response = await startBatchSign(
        documents.map((d) => d.id),
        documentType,
        'Ký hàng loạt tài liệu'
      );

      const newResults = new Map<string, boolean>();
      response.results.forEach((r) => {
        newResults.set(r.documentId, r.success);
      });
      setResults(newResults);
      setCompleted(true);
      onComplete?.();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi ký hàng loạt';
      setError(errorMessage);
    }
  };

  const handleClose = () => {
    setResults(new Map());
    setError(null);
    setCompleted(false);
    onClose();
  };

  const progress = batchProgress
    ? Math.round((batchProgress.current / batchProgress.total) * 100)
    : 0;

  const columns = [
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (text: string, record: BatchDocument) => text || record.id.substring(0, 8),
    },
    {
      title: 'Tên tài liệu',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => text || documentType,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_: unknown, record: BatchDocument) => {
        const result = results.get(record.id);
        if (result === undefined) {
          if (isSigningBatch && batchProgress) {
            const idx = documents.findIndex((d) => d.id === record.id);
            if (idx < batchProgress.current) {
              return <Tag color="processing" icon={<LoadingOutlined />}>Đang ký</Tag>;
            }
          }
          return <Tag>Chờ ký</Tag>;
        }
        return result
          ? <Tag icon={<CheckCircleOutlined />} color="success">Thành công</Tag>
          : <Tag icon={<CloseCircleOutlined />} color="error">Thất bại</Tag>;
      },
    },
  ];

  return (
    <Modal
      title={
        <Space orientation="horizontal">
          <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
          <span>Ký hàng loạt ({documents.length} tài liệu)</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={600}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#666' }}>
            {completed
              ? `Hoàn tất: ${[...results.values()].filter(Boolean).length}/${documents.length} thành công`
              : `${documents.length} tài liệu sẽ được ký`}
          </span>
          <Space orientation="horizontal">
            <Button onClick={handleClose}>{completed ? 'Đóng' : 'Hủy'}</Button>
            {!completed && (
              <Button
                type="primary"
                onClick={handleSign}
                loading={isSigningBatch}
                disabled={!sessionActive || documents.length === 0}
                icon={<SafetyCertificateOutlined />}
              >
                Bắt đầu ký
              </Button>
            )}
          </Space>
        </div>
      }
    >
      {!sessionActive && (
        <Alert
          type="warning"
          title="Chưa mở phiên ký số. Vui lòng nhập PIN trước."
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {error && (
        <Alert
          type="error"
          title={error}
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {isSigningBatch && (
        <Progress
          percent={progress}
          status="active"
          format={() => `${batchProgress?.current || 0}/${batchProgress?.total || documents.length}`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        dataSource={documents}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ y: 300 }}
      />
    </Modal>
  );
}
