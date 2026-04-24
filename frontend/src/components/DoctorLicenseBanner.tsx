/**
 * NangCap18 — Cấm khám khi BS chưa có CCHN.
 * Banner hiển thị warning trên top OPD nếu người đang login
 * không có CCHN hợp lệ hoặc đã hết hạn.
 */

import { useEffect, useState } from 'react';
import { Alert, Tag } from 'antd';
import { WarningFilled, SafetyCertificateOutlined } from '@ant-design/icons';
import { getMyLicenseStatus, type LicenseStatusDto } from '../api/doctorLicense';

interface Props {
  /** If true, only shows when license INVALID. Default true. */
  onlyWhenInvalid?: boolean;
  /** Callback when status loaded so parent can block actions. */
  onStatus?: (status: LicenseStatusDto) => void;
}

export default function DoctorLicenseBanner({ onlyWhenInvalid = true, onStatus }: Props) {
  const [status, setStatus] = useState<LicenseStatusDto | null>(null);

  useEffect(() => {
    getMyLicenseStatus()
      .then((s) => {
        setStatus(s);
        onStatus?.(s);
      })
      .catch(() => {});
  }, [onStatus]);

  if (!status) return null;
  if (onlyWhenInvalid && status.isValid && (status.daysUntilExpiry ?? 999) > 30) return null;

  const severity =
    status.status === 'Valid'
      ? 'success'
      : status.status === 'NoStaffProfile' || status.status === 'Inactive'
        ? 'warning'
        : 'error';

  return (
    <Alert
      title={
        <span>
          <SafetyCertificateOutlined /> CCHN (Chứng chỉ hành nghề): {status.message}
        </span>
      }
      description={
        <div>
          {status.licenseNumber && (
            <Tag icon={<SafetyCertificateOutlined />} color="blue">
              Số CCHN: {status.licenseNumber}
            </Tag>
          )}
          {status.specialty && <Tag color="geekblue">Chuyên khoa: {status.specialty}</Tag>}
          {status.expiryDate && (
            <Tag color={severity === 'error' ? 'red' : severity === 'warning' ? 'orange' : 'green'}>
              Hết hạn: {new Date(status.expiryDate).toLocaleDateString('vi-VN')}
              {status.daysUntilExpiry !== undefined && status.daysUntilExpiry >= 0 &&
                ` (còn ${status.daysUntilExpiry} ngày)`}
            </Tag>
          )}
          {!status.isValid && (
            <div style={{ marginTop: 8, fontWeight: 500, color: '#cf1322' }}>
              <WarningFilled /> Không được phép khám bệnh khi CCHN không hợp lệ.
            </div>
          )}
        </div>
      }
      type={severity === 'success' ? 'info' : severity}
      showIcon
      closable={status.isValid}
      style={{ marginBottom: 12 }}
      data-testid="doctor-license-banner"
    />
  );
}
