import React from 'react';
import { Tooltip } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import type { DocumentSignatureDto } from '../../api/digitalSignature';

interface SignatureStatusIconProps {
  signed: boolean;
  signatureInfo?: DocumentSignatureDto;
  onVerifyClick?: () => void;
}

export default function SignatureStatusIcon({ signed, signatureInfo, onVerifyClick }: SignatureStatusIconProps) {
  if (!signed) {
    return (
      <Tooltip title="Chưa ký số">
        <SafetyCertificateOutlined
          style={{ color: '#d9d9d9', fontSize: 18, cursor: 'default' }}
        />
      </Tooltip>
    );
  }

  const orgName = signatureInfo?.organizationName || signatureInfo?.signerName;
  const tooltipContent = signatureInfo ? (
    <div style={{ border: '2px solid #52c41a', borderRadius: 4, padding: '8px 10px', minWidth: 240 }}>
      <div style={{ fontWeight: 'bold', fontStyle: 'italic', marginBottom: 4 }}>Signature Valid</div>
      {orgName && <div>Ký bởi: {orgName}</div>}
      <div>Ký ngày: {signatureInfo.signedAt}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: '#91d5ff' }}>Click để xem chi tiết</div>
    </div>
  ) : 'Đã ký số';

  return (
    <Tooltip title={tooltipContent}>
      <SafetyCertificateOutlined
        style={{ color: '#52c41a', fontSize: 18, cursor: onVerifyClick ? 'pointer' : 'default' }}
        onClick={onVerifyClick}
      />
    </Tooltip>
  );
}
