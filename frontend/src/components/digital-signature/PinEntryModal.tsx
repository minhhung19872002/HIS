import React, { useState } from 'react';
import { Modal, Input, Button, Alert, Space } from 'antd';
import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

interface PinEntryModalProps {
  open: boolean;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

export default function PinEntryModal({ open, onSubmit, onCancel, loading, error }: PinEntryModalProps) {
  const [pin, setPin] = useState('');

  const handleSubmit = () => {
    if (pin.length >= 4) {
      onSubmit(pin);
    }
  };

  const handleCancel = () => {
    setPin('');
    onCancel();
  };

  return (
    <Modal
      title={
        <Space orientation="horizontal">
          <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
          <span>Nhập PIN USB Token</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnHidden
      width={400}
    >
      <div style={{ padding: '16px 0' }}>
        <p style={{ color: '#666', marginBottom: 16 }}>
          Vui lòng nhập mã PIN của USB Token để mở phiên ký số.
          Phiên ký sẽ hoạt động trong 30 phút.
        </p>

        {error && (
          <Alert
            type="error"
            title={error}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Nhập PIN (tối thiểu 4 ký tự)"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onPressEnter={handleSubmit}
          size="large"
          autoFocus
          maxLength={16}
          style={{ marginBottom: 16 }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleCancel}>Hủy</Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={pin.length < 4}
            icon={<SafetyCertificateOutlined />}
          >
            Xác nhận
          </Button>
        </div>
      </div>
    </Modal>
  );
}
