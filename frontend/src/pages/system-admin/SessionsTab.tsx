// K1 phiên 6a (2026-05-30): tách tab `sessions` khỏi SystemAdmin.tsx god-file.
// ⚠️ LOGIC-PRESERVE: parent cũ start interval theo `activeTab === 'sessions'`.
// Antd Tabs giữ mount sau lần active đầu → interval vẫn chạy nền nếu KHÔNG `active` prop.
// Pattern giống HealthTab (K1 phiên 2): nhận `active: boolean` từ parent, pause interval khi false.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button, Card, Col, Popconfirm, Row, Spin, Statistic, Table, Tag, Typography, message,
} from 'antd';
import { LaptopOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminApi, type UserSessionDto } from '../../api/system';

interface Props {
  active?: boolean;
}

export const SessionsTabLabel: React.FC = () => (
  <span><LaptopOutlined /> Phien lam viec</span>
);

const SessionsTab: React.FC<Props> = ({ active = true }) => {
  const [sessions, setSessions] = useState<UserSessionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getActiveSessions();
      if (Array.isArray(res)) {
        setSessions(res);
      } else if (res && Array.isArray((res as { data?: UserSessionDto[] }).data)) {
        setSessions((res as { data: UserSessionDto[] }).data);
      }
    } catch {
      console.warn('Error fetching sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTerminate = async (sessionId: string) => {
    try {
      await adminApi.terminateSession(sessionId);
      message.success('Da ket thuc phien lam viec');
      fetchSessions();
    } catch {
      message.warning('Khong the ket thuc phien');
    }
  };

  // Auto-refresh every 15s khi tab active. Pause khi switch sang tab khác (Antd Tabs giữ mount).
  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    fetchSessions();
    intervalRef.current = setInterval(fetchSessions, 15000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, fetchSessions]);

  return (
    <Spin spinning={loading}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Giam sat may tram ({sessions.filter((s) => s.isActive).length} dang hoat dong)
        </Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={fetchSessions}>Lam moi</Button>
      </div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Tong phien" value={sessions.length} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Dang hoat dong"
              value={sessions.filter((s) => s.isActive).length}
              styles={{ content: { color: '#3f8600' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Desktop" value={sessions.filter((s) => s.deviceType === 'Desktop').length} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Mobile" value={sessions.filter((s) => s.deviceType !== 'Desktop').length} />
          </Card>
        </Col>
      </Row>
      <Table
        dataSource={sessions}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 15 }}
        columns={[
          {
            title: 'Nguoi dung', key: 'user', width: 160,
            render: (_: unknown, r: UserSessionDto) => (
              <div>
                <strong>{r.fullName || r.username}</strong>
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.username}</Typography.Text>
              </div>
            ),
          },
          {
            title: 'Trang thai', key: 'status', width: 100,
            render: (_: unknown, r: UserSessionDto) => (
              <Tag color={r.isActive ? 'green' : 'default'}>{r.isActive ? 'Online' : 'Offline'}</Tag>
            ),
          },
          { title: 'IP', dataIndex: 'ipAddress', key: 'ip', width: 130 },
          {
            title: 'Thiet bi', dataIndex: 'deviceType', key: 'device', width: 100,
            render: (d: string) => <Tag>{d || 'Unknown'}</Tag>,
          },
          {
            title: 'Trinh duyet', dataIndex: 'userAgent', key: 'ua', ellipsis: true, width: 200,
            render: (ua: string) => {
              if (!ua) return '-';
              if (ua.includes('Chrome')) return 'Chrome';
              if (ua.includes('Firefox')) return 'Firefox';
              if (ua.includes('Safari')) return 'Safari';
              if (ua.includes('Edge')) return 'Edge';
              return ua.substring(0, 30);
            },
          },
          {
            title: 'Dang nhap', dataIndex: 'loginTime', key: 'login', width: 160,
            render: (t: string) => t ? new Date(t).toLocaleString('vi-VN') : '-',
          },
          {
            title: 'Hoat dong cuoi', dataIndex: 'lastActivityTime', key: 'lastActivity', width: 160,
            render: (t: string) => t ? new Date(t).toLocaleString('vi-VN') : '-',
          },
          {
            title: 'Thao tac', key: 'actions', width: 100,
            render: (_: unknown, r: UserSessionDto) => (
              r.isActive ? (
                <Popconfirm
                  title="Ket thuc phien nay?"
                  onConfirm={() => handleTerminate(r.id)}
                  okText="Ket thuc"
                  cancelText="Huy"
                >
                  <Button size="small" danger>Kick</Button>
                </Popconfirm>
              ) : <Tag color="default">Da ket thuc</Tag>
            ),
          },
        ]}
      />
    </Spin>
  );
};

export default SessionsTab;
