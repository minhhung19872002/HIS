import React from 'react';
import { Drawer, Descriptions, Tag, Timeline, Button, Space, Popconfirm, message } from 'antd';
import {
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { DocumentSignatureDto } from '../../api/digitalSignature';
import { revokeSignature } from '../../api/digitalSignature';

interface SignatureVerificationPanelProps {
  open: boolean;
  onClose: () => void;
  signatureInfo: DocumentSignatureDto | null;
  onRevoked?: () => void;
}

export default function SignatureVerificationPanel({
  open,
  onClose,
  signatureInfo,
  onRevoked,
}: SignatureVerificationPanelProps) {
  if (!signatureInfo) return null;

  const handleRevoke = async () => {
    try {
      await revokeSignature(signatureInfo.id, 'Thu hồi chữ ký');
      message.success('Đã thu hồi chữ ký');
      onRevoked?.();
      onClose();
    } catch {
      message.warning('Không thể thu hồi chữ ký');
    }
  };

  const isActive = signatureInfo.status === 0;

  return (
    <Drawer
      title={
        <Space orientation="horizontal">
          <SafetyCertificateOutlined style={{ color: isActive ? '#52c41a' : '#ff4d4f' }} />
          <span>Chi tiết chữ ký số</span>
        </Space>
      }
      open={open}
      onClose={onClose}
      size="large"
    >
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Trạng thái">
          {isActive ? (
            <Tag icon={<CheckCircleOutlined />} color="success">Hợp lệ</Tag>
          ) : (
            <Tag icon={<CloseCircleOutlined />} color="error">Đã thu hồi</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Người ký">{signatureInfo.signerName}</Descriptions.Item>
        <Descriptions.Item label="Thời gian ký">{signatureInfo.signedAt}</Descriptions.Item>
        <Descriptions.Item label="Loại tài liệu">{signatureInfo.documentType}</Descriptions.Item>
        <Descriptions.Item label="Mã tài liệu">{signatureInfo.documentCode}</Descriptions.Item>
        <Descriptions.Item label="Số chứng thư">{signatureInfo.certificateSerial}</Descriptions.Item>
        <Descriptions.Item label="Nhà cung cấp CA">{signatureInfo.caProvider}</Descriptions.Item>
        {signatureInfo.tsaTimestamp && (
          <Descriptions.Item label="Dấu thời gian TSA">{signatureInfo.tsaTimestamp}</Descriptions.Item>
        )}
        {signatureInfo.ocspStatus && (
          <Descriptions.Item label="OCSP Status">
            <Tag color={signatureInfo.ocspStatus === 'Good' ? 'green' : 'red'}>
              {signatureInfo.ocspStatus}
            </Tag>
          </Descriptions.Item>
        )}
      </Descriptions>

      <div style={{ marginTop: 24 }}>
        <h4>Quy trình xác thực</h4>
        <Timeline
          items={[
            {
              dot: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
              content: 'Xác thực chữ ký RSA/SHA-256',
            },
            {
              dot: signatureInfo.tsaTimestamp
                ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                : <ClockCircleOutlined style={{ color: '#faad14' }} />,
              content: signatureInfo.tsaTimestamp
                ? 'Dấu thời gian TSA (RFC 3161)'
                : 'Không có dấu thời gian TSA',
            },
            {
              dot: signatureInfo.ocspStatus === 'Good'
                ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                : <ClockCircleOutlined style={{ color: '#faad14' }} />,
              content: signatureInfo.ocspStatus === 'Good'
                ? 'OCSP: Chứng thư hợp lệ'
                : 'OCSP: Chưa kiểm tra',
            },
          ]}
        />
      </div>

      {isActive && (
        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Popconfirm
            title="Thu hồi chữ ký?"
            description="Tài liệu sẽ được mở khóa để chỉnh sửa và ký lại."
            onConfirm={handleRevoke}
            okText="Thu hồi"
            cancelText="Hủy"
          >
            <Button danger>Thu hồi chữ ký</Button>
          </Popconfirm>
        </div>
      )}
    </Drawer>
  );
}
