import React, { useCallback, useEffect, useState } from 'react';
import { Card, Tabs, Table, Row, Col, Statistic, Button, Space, Tag, Typography } from 'antd';
import { ReloadOutlined, DashboardOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { qualityDash, type QualityDashboardDto } from '../api/nangcap23';

const { Text } = Typography;

const fmtVnd = (n: number) => `${(n || 0).toLocaleString('vi-VN')}đ`;

const QualityDashboardLive: React.FC = () => {
  const [data, setData] = useState<QualityDashboardDto | null>(null);
  const [refreshAt, setRefreshAt] = useState<string>('');

  const load = useCallback(async () => {
    try { setData(await qualityDash.getFull()); setRefreshAt(dayjs().format('HH:mm:ss')); }
    catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 60000); return () => clearInterval(id); }, [load]);

  return (
    <Card
      title={<><DashboardOutlined /> Bảng điều khiển chất lượng — Live (theo HSMT mục 39)</>}
      extra={
        <Space>
          <Text type="secondary">Cập nhật: {refreshAt || '—'}</Text>
          <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
        </Space>
      }
    >
      <Tabs items={[
        { key: 'clinic',       label: '1. Phòng khám', children: <ClinicView data={data} /> },
        { key: 'inpatient',    label: '2. Nội trú',    children: <InpatientView data={data} /> },
        { key: 'paraclinical', label: '3. Cận lâm sàng', children: <ParaclinicalView data={data} /> },
        { key: 'lab',          label: '4. Xét nghiệm', children: <LabView data={data} /> },
        { key: 'revenue',      label: '5. Doanh thu trong ngày', children: <RevenueView data={data} /> }
      ]} />
    </Card>
  );
};

const ClinicView: React.FC<{ data: QualityDashboardDto | null }> = ({ data }) => {
  const rows = data?.clinicQueues || [];
  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="Phòng khám" value={rows.length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Chờ khám" value={rows.reduce((s, r) => s + r.waiting, 0)} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đang thực hiện y lệnh" value={rows.reduce((s, r) => s + r.inProgress, 0)} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đã khám" value={rows.reduce((s, r) => s + r.completed, 0)} valueStyle={{ color: '#3f8600' }} /></Card></Col>
      </Row>
      <Table
        rowKey="roomId" dataSource={rows} size="small" pagination={false}
        columns={[
          { title: 'Phòng khám', dataIndex: 'roomName' },
          { title: 'Chờ khám', dataIndex: 'waiting', width: 110, render: (v) => <Text type={v > 5 ? 'warning' : undefined}>{v}</Text> },
          { title: 'Đang thực hiện y lệnh', dataIndex: 'inProgress', width: 180 },
          { title: 'Đã khám', dataIndex: 'completed', width: 100, render: (v) => <Text type="success">{v}</Text> },
          { title: 'Tổng BN', width: 100, render: (_, r) => r.waiting + r.inProgress + r.completed }
        ]}
      />
    </>
  );
};

const InpatientView: React.FC<{ data: QualityDashboardDto | null }> = ({ data }) => {
  const rows = data?.inpatientByDepartment || [];
  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={5}><Card><Statistic title="Khoa NT" value={rows.length} /></Card></Col>
        <Col span={5}><Card><Statistic title="Hiện diện" value={rows.reduce((s, r) => s + r.present, 0)} /></Card></Col>
        <Col span={5}><Card><Statistic title="Nhập viện" value={rows.reduce((s, r) => s + r.admitted, 0)} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        <Col span={5}><Card><Statistic title="Xuất viện" value={rows.reduce((s, r) => s + r.discharged, 0)} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="Tổng chi phí" value={fmtVnd(rows.reduce((s, r) => s + r.totalCost, 0))} /></Card></Col>
      </Row>
      <Table
        rowKey="departmentId" dataSource={rows} size="small" pagination={false}
        columns={[
          { title: 'Khoa', dataIndex: 'departmentName' },
          { title: 'Hiện diện', dataIndex: 'present', width: 100 },
          { title: 'Nhập viện hôm nay', dataIndex: 'admitted', width: 150, render: (v) => <Text type="success">{v}</Text> },
          { title: 'Xuất viện hôm nay', dataIndex: 'discharged', width: 150, render: (v) => <Text type="warning">{v}</Text> },
          { title: 'Chi phí phát sinh', dataIndex: 'totalCost', width: 180, render: (v) => fmtVnd(v) }
        ]}
      />
    </>
  );
};

const ParaclinicalView: React.FC<{ data: QualityDashboardDto | null }> = ({ data }) => {
  const items = data?.paraclinical?.items || [];
  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card><Statistic title="Tổng loại CLS" value={items.length} /></Card></Col>
        <Col span={8}><Card><Statistic title="Chưa có KQ" value={items.reduce((s, r) => s + r.pending, 0)} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="Đã có KQ" value={items.reduce((s, r) => s + r.completed, 0)} valueStyle={{ color: '#3f8600' }} /></Card></Col>
      </Row>
      <Table
        rowKey="typeName" dataSource={items} size="small" pagination={false}
        columns={[
          { title: 'Loại CLS', dataIndex: 'typeName' },
          { title: 'Chưa có KQ', dataIndex: 'pending', width: 140, render: (v) => <Text type="warning">{v}</Text> },
          { title: 'Đã có KQ', dataIndex: 'completed', width: 140, render: (v) => <Text type="success">{v}</Text> },
          {
            title: 'Tỷ lệ', width: 100, render: (_, r) => {
              const total = r.pending + r.completed;
              return total > 0 ? `${Math.round((r.completed * 100) / total)}%` : '0%';
            }
          }
        ]}
      />
    </>
  );
};

const LabView: React.FC<{ data: QualityDashboardDto | null }> = ({ data }) => {
  const cats = data?.lab?.categories || [];
  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card><Statistic title="Nhóm XN" value={cats.length} /></Card></Col>
        <Col span={8}><Card><Statistic title="Chưa có KQ" value={cats.reduce((s, r) => s + r.pending, 0)} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="Đã có KQ" value={cats.reduce((s, r) => s + r.completed, 0)} valueStyle={{ color: '#3f8600' }} /></Card></Col>
      </Row>
      <Table
        rowKey="categoryName" dataSource={cats} size="small" pagination={false}
        columns={[
          { title: 'Nhóm XN (Huyết học / Sinh hóa / Vi sinh / Miễn dịch)', dataIndex: 'categoryName' },
          { title: 'Chưa có KQ', dataIndex: 'pending', width: 140, render: (v) => <Text type="warning">{v}</Text> },
          { title: 'Đã có KQ', dataIndex: 'completed', width: 140, render: (v) => <Text type="success">{v}</Text> },
          {
            title: 'Tỷ lệ', width: 100, render: (_, r) => {
              const total = r.pending + r.completed;
              return total > 0 ? `${Math.round((r.completed * 100) / total)}%` : '0%';
            }
          }
        ]}
      />
    </>
  );
};

const RevenueView: React.FC<{ data: QualityDashboardDto | null }> = ({ data }) => {
  const rev = data?.revenue || { outpatientTotal: 0, inpatientTotal: 0, grandTotal: 0, byCashier: [] };
  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="Tổng doanh thu" value={fmtVnd(rev.grandTotal)} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Ngoại trú" value={fmtVnd(rev.outpatientTotal)} /></Card></Col>
        <Col span={6}><Card><Statistic title="Nội trú" value={fmtVnd(rev.inpatientTotal)} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Số bàn thu ngân" value={rev.byCashier.length} /></Card></Col>
      </Row>
      <Table
        rowKey="cashierId" dataSource={rev.byCashier} size="small" pagination={false}
        columns={[
          { title: 'Bàn thu ngân', dataIndex: 'cashierName' },
          { title: 'Doanh thu Ngoại trú', dataIndex: 'outpatientRevenue', width: 180, render: (v) => fmtVnd(v) },
          { title: 'Doanh thu Nội trú', dataIndex: 'inpatientRevenue', width: 180, render: (v) => fmtVnd(v) },
          { title: 'Tổng', dataIndex: 'total', width: 180, render: (v) => <Tag color="cyan">{fmtVnd(v)}</Tag> },
          { title: 'Số biên lai', dataIndex: 'receiptCount', width: 110 }
        ]}
      />
    </>
  );
};

export default QualityDashboardLive;
