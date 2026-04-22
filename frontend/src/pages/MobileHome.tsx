/**
 * Mobile Home — Sprint 5 Item 2.19.
 * Dashboard tối ưu cho BS/ĐD dùng điện thoại/tablet:
 * - Quick search BN
 * - Tiếp BN tiếp theo (nếu BS đang trực phòng khám)
 * - Tờ điều trị nhanh (nội trú)
 * - Xem KQ XN/CĐHA
 * - Danh sách BN đang điều trị
 * - Thông báo realtime
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Input, Button, List, Avatar, Tag, Space, Typography, Spin, Badge } from 'antd';
import {
  SearchOutlined, UserOutlined, FileTextOutlined, ExperimentOutlined,
  ScanOutlined, BarcodeOutlined, NotificationOutlined, MedicineBoxOutlined,
  HeartOutlined, TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { patientApi } from '../api/patient';
import { useAuth } from '../contexts/AuthContext';
import BarcodeScanner from '../components/BarcodeScanner';

const { Title, Text } = Typography;

interface QuickPatient {
  id: string;
  patientCode: string;
  fullName: string;
  gender?: number;
  yearOfBirth?: number;
  lastVisitAt?: string;
  status?: string;
}

export default function MobileHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<QuickPatient[]>([]);
  const [recentPatients, setRecentPatients] = useState<QuickPatient[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  const loadRecent = useCallback(async () => {
    try {
      const res = await patientApi.search({ pageSize: 10 });
      const list = ((res.data as unknown as { items?: Array<Record<string, unknown>> })?.items || []) as Array<Record<string, unknown>>;
      setRecentPatients(list.map((p) => ({
        id: p.id as string,
        patientCode: (p.patientCode || p.code || '') as string,
        fullName: (p.fullName || p.name || '') as string,
        gender: p.gender as number | undefined,
        yearOfBirth: (p.yearOfBirth || p.dateOfBirth) as number | undefined,
      })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const handleSearch = async (v: string) => {
    if (!v || v.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await patientApi.search({ keyword: v, pageSize: 15 });
      const list = ((res.data as unknown as { items?: Array<Record<string, unknown>> })?.items || []) as Array<Record<string, unknown>>;
      setResults(list.map((p) => ({
        id: p.id as string,
        patientCode: (p.patientCode || p.code || '') as string,
        fullName: (p.fullName || p.name || '') as string,
        gender: p.gender as number | undefined,
        yearOfBirth: (p.yearOfBirth || p.dateOfBirth) as number | undefined,
      })));
    } catch { setResults([]); } finally { setSearching(false); }
  };

  const handleScanResult = (text: string) => {
    setScannerOpen(false);
    setKeyword(text);
    handleSearch(text);
  };

  const quickActions = [
    { key: 'emr', label: 'Hồ sơ BA', icon: <FileTextOutlined />, color: '#1890ff', path: '/emr' },
    { key: 'opd', label: 'Phòng khám', icon: <UserOutlined />, color: '#52c41a', path: '/opd' },
    { key: 'inpatient', label: 'Nội trú', icon: <HeartOutlined />, color: '#eb2f96', path: '/inpatient' },
    { key: 'lab', label: 'KQ XN', icon: <ExperimentOutlined />, color: '#faad14', path: '/lab' },
    { key: 'radiology', label: 'KQ CĐHA', icon: <ScanOutlined />, color: '#722ed1', path: '/radiology' },
    { key: 'prescription', label: 'Kê đơn', icon: <MedicineBoxOutlined />, color: '#13c2c2', path: '/prescription' },
    { key: 'consultation', label: 'Hội chẩn', icon: <TeamOutlined />, color: '#2f54eb', path: '/video-consultation' },
    { key: 'notifications', label: 'Thông báo', icon: <NotificationOutlined />, color: '#fa541c', path: '/notifications' },
  ];

  return (
    <div style={{ padding: '8px 12px', maxWidth: 720, margin: '0 auto' }}>
      <Card size="small" bodyStyle={{ padding: 12 }} style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>Xin chào</Text>
              <br />
              <Text strong style={{ fontSize: 15 }}>{user?.fullName || user?.username}</Text>
            </div>
            <Badge count={0}>
              <Button shape="circle" icon={<NotificationOutlined />} onClick={() => navigate('/notifications')} />
            </Badge>
          </Space>

          <Input.Search
            placeholder="Tìm BN: mã, tên, SĐT..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={handleSearch}
            enterButton={
              <Button type="primary" icon={<SearchOutlined />} />
            }
            size="large"
          />
          <Button block icon={<BarcodeOutlined />} onClick={() => setScannerOpen(true)}>
            Quét QR CCCD / barcode BN
          </Button>
        </Space>
      </Card>

      {searching && <Spin style={{ display: 'block', textAlign: 'center', padding: 20 }} />}
      {results.length > 0 && (
        <Card title={`Kết quả tìm kiếm (${results.length})`} size="small" style={{ marginBottom: 12 }}>
          <List
            size="small"
            dataSource={results}
            renderItem={(p) => (
              <List.Item
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/emr?patientId=${p.id}`)}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={
                    <Space>
                      <strong>{p.fullName}</strong>
                      <Tag>{p.patientCode}</Tag>
                    </Space>
                  }
                  description={
                    <span>
                      {p.gender === 1 ? 'Nam' : p.gender === 2 ? 'Nữ' : ''}
                      {p.yearOfBirth && ` • ${p.yearOfBirth}`}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      <Title level={5} style={{ margin: '12px 0 8px', fontSize: 13 }}>Thao tác nhanh</Title>
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        {quickActions.map(a => (
          <Col span={6} key={a.key}>
            <div
              onClick={() => navigate(a.path)}
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: 12,
                textAlign: 'center',
                border: '1px solid #f0f0f0',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ color: a.color, fontSize: 24, marginBottom: 4 }}>{a.icon}</div>
              <div style={{ fontSize: 11, color: '#333' }}>{a.label}</div>
            </div>
          </Col>
        ))}
      </Row>

      {recentPatients.length > 0 && (
        <Card title="BN mới truy cập" size="small">
          <List
            size="small"
            dataSource={recentPatients}
            renderItem={(p) => (
              <List.Item
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/emr?patientId=${p.id}`)}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={<Space><strong>{p.fullName}</strong><Tag>{p.patientCode}</Tag></Space>}
                  description={p.lastVisitAt ? dayjs(p.lastVisitAt).format('DD/MM HH:mm') : ''}
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {scannerOpen && (
        <BarcodeScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleScanResult}
        />
      )}
    </div>
  );
}
