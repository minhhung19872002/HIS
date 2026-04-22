/**
 * Public PACS viewer — Sprint 4 Item 2.18.
 * Không yêu cầu login, chỉ cần token URL + (optional) password.
 * Render DICOM images via Orthanc preview API.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Input, Button, Spin, Result, Alert, Tag, Space, message, Typography } from 'antd';
import { LockOutlined, EyeOutlined } from '@ant-design/icons';
import { peekShare, accessShare, type AccessResult } from '../api/studyShare';

const { Title, Text } = Typography;
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5106/api').replace(/\/api$/, '');
const ORTHANC_URL = import.meta.env.VITE_ORTHANC_URL || 'http://localhost:8042';

export default function PublicStudyViewer() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | undefined>();
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instances, setInstances] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!token) return;
    peekShare(token)
      .then((p) => {
        setRequiresPassword(p.requiresPassword);
        setExpiresAt(p.expiresAt);
        if (!p.requiresPassword) handleAccess();
      })
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string } }; response_status?: number };
        setError(err?.response?.data?.message || 'Link không hợp lệ hoặc đã hết hạn');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccess = async (pw?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await accessShare(token, pw ?? password);
      setAccessResult(r);
      setRequiresPassword(false);
      if (r.orthancStudyId) loadInstances(r.orthancStudyId);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Sai mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const loadInstances = async (orthancStudyId: string) => {
    try {
      // Orthanc REST: GET /studies/{id}/instances
      const res = await fetch(`${ORTHANC_URL}/studies/${orthancStudyId}/instances`, {
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error('Không tải được danh sách ảnh');
      const data = await res.json() as Array<{ ID: string }>;
      setInstances(data.map(i => i.ID));
    } catch {
      // Fallback: sử dụng API bệnh viện để lấy danh sách qua backend
      try {
        const res = await fetch(`${API_ORIGIN}/api/RISComplete/pacs/studies/${orthancStudyId}/instances`);
        if (res.ok) {
          const data = await res.json() as Array<{ id: string }>;
          setInstances(data.map(i => i.id));
        }
      } catch { /* swallow */ }
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <Spin size="large" tip="Đang tải..." />
    </div>
  );

  if (error) return (
    <Result status="error" title="Không thể truy cập" subTitle={error} />
  );

  if (requiresPassword) {
    return (
      <div style={{ maxWidth: 420, margin: '80px auto' }}>
        <Card title={<Space><LockOutlined /> Link ca chụp DICOM</Space>}>
          <Alert
            title="Link này được bảo vệ bằng mật khẩu. Vui lòng nhập mật khẩu do bác sĩ cung cấp."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Input.Password
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={() => handleAccess()}
            size="large"
            style={{ marginBottom: 12 }}
          />
          <Button type="primary" block size="large" onClick={() => handleAccess()} loading={loading}>
            Xem ảnh
          </Button>
          {expiresAt && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Text type="secondary">Link hết hạn: {new Date(expiresAt).toLocaleString('vi-VN')}</Text>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (!accessResult) return null;

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <EyeOutlined /> Ca chụp DICOM (chỉ xem)
            </Title>
            {!accessResult.hideDemographics && accessResult.patientName && (
              <Text type="secondary">
                BN: {accessResult.patientName} ({accessResult.patientCode})
              </Text>
            )}
            {accessResult.hideDemographics && <Tag color="gold">Đã ẩn thông tin BN</Tag>}
          </div>
          {accessResult.expiresAt && (
            <Tag color="orange">
              Link hết hạn: {new Date(accessResult.expiresAt).toLocaleString('vi-VN')}
            </Tag>
          )}
        </div>

        {instances.length === 0 ? (
          <Alert
            title="Không tải được danh sách ảnh — kiểm tra kết nối với PACS server"
            type="warning"
            showIcon
          />
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <Space>
                <Button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}>
                  ← Ảnh trước
                </Button>
                <Tag>{currentIndex + 1} / {instances.length}</Tag>
                <Button
                  onClick={() => setCurrentIndex(i => Math.min(instances.length - 1, i + 1))}
                  disabled={currentIndex >= instances.length - 1}
                >
                  Ảnh tiếp →
                </Button>
              </Space>
            </div>
            <div style={{ textAlign: 'center', background: '#000', padding: 16, borderRadius: 4 }}>
              <img
                src={`${ORTHANC_URL}/instances/${instances[currentIndex]}/preview`}
                alt={`DICOM ${currentIndex + 1}`}
                style={{ maxWidth: '100%', maxHeight: '70vh' }}
              />
            </div>
          </>
        )}

        <Alert
          style={{ marginTop: 16 }}
          title="Lưu ý: Đây là link xem ảnh y khoa chỉ đọc. Không được tải về, sao chép, hoặc chia sẻ lại."
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
}
