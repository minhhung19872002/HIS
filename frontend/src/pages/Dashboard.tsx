import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin, Tag, message, Progress, Divider, Badge, Tooltip, Button } from 'antd';
import {
  UserOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  ScissorOutlined,
  ReloadOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { statisticsApi } from '../api/system';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface DashboardData {
  outpatientCount: number;
  inpatientCount: number;
  emergencyCount: number;
  surgeryCount: number;
  admissionCount: number;
  dischargeCount: number;
  availableBeds: number;
  totalRevenue: number;
  outpatientByDepartment: { departmentName: string; count: number }[];
  revenueByDepartment: { departmentName: string; revenue: number }[];
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [data, setData] = useState<DashboardData>({
    outpatientCount: 0,
    inpatientCount: 0,
    emergencyCount: 0,
    surgeryCount: 0,
    admissionCount: 0,
    dischargeCount: 0,
    availableBeds: 0,
    totalRevenue: 0,
    outpatientByDepartment: [],
    revenueByDepartment: [],
  });

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, deptRes] = await Promise.allSettled([
        statisticsApi.getHospitalDashboard(),
        statisticsApi.getDepartmentStatistics(dayjs().format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')),
      ]);

      const d = dashRes.status === 'fulfilled' ? (dashRes.value.data as any) : null;
      const depts = deptRes.status === 'fulfilled' ? ((deptRes.value.data as any) ?? []) : [];

      if (d) {
        setData({
          outpatientCount: d.todayOutpatients ?? d.outpatientCount ?? 0,
          inpatientCount: d.currentInpatients ?? d.inpatientCount ?? 0,
          emergencyCount: d.todayEmergencies ?? d.emergencyCount ?? 0,
          surgeryCount: d.todaySurgeries ?? d.surgeryCount ?? 0,
          admissionCount: d.todayAdmissions ?? d.admissionCount ?? 0,
          dischargeCount: d.todayDischarges ?? d.dischargeCount ?? 0,
          availableBeds: d.availableBeds ?? 0,
          totalRevenue: d.todayRevenue ?? d.totalRevenue ?? 0,
          outpatientByDepartment: Array.isArray(depts)
            ? depts.map((dep: any) => ({ departmentName: dep.departmentName ?? dep.name ?? 'N/A', count: dep.outpatientCount ?? dep.count ?? 0 })).filter((d: any) => d.count > 0)
            : d.outpatientByDepartment ?? [],
          revenueByDepartment: Array.isArray(depts)
            ? depts.map((dep: any) => ({ departmentName: dep.departmentName ?? dep.name ?? 'N/A', revenue: dep.revenue ?? 0 })).filter((d: any) => d.revenue > 0)
            : d.revenueByDepartment ?? [],
        });
      }
      setLastUpdate(dayjs().format('HH:mm:ss'));
    } catch {
      console.warn('Error fetching dashboard');
      message.warning('Không thể tải dữ liệu tổng quan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000); // Auto-refresh every 60s
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const maxDeptCount = Math.max(...data.outpatientByDepartment.map(d => d.count), 1);
  const maxDeptRevenue = Math.max(...data.revenueByDepartment.map(d => d.revenue), 1);

  return (
    <Spin spinning={loading}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Tổng quan hoạt động - {dayjs().format('DD/MM/YYYY')}</Title>
          <div>
            {lastUpdate && <Text type="secondary" style={{ marginRight: 12 }}>Cập nhật: {lastUpdate}</Text>}
            <Button icon={<ReloadOutlined />} size="small" onClick={fetchDashboard}>Làm mới</Button>
          </div>
        </div>

        {/* Row 1: Main KPIs */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Khám ngoại trú"
                value={data.outpatientCount}
                prefix={<UserOutlined style={{ color: '#1890ff' }} />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Cấp cứu"
                value={data.emergencyCount}
                prefix={<AlertOutlined style={{ color: '#ff4d4f' }} />}
                styles={{ content: { color: '#ff4d4f' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Nội trú hiện tại"
                value={data.inpatientCount}
                prefix={<TeamOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Doanh thu hôm nay"
                value={data.totalRevenue}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
                formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
                suffix="₫"
              />
            </Card>
          </Col>
        </Row>

        {/* Row 2: Secondary stats */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={12} sm={6} lg={4}>
            <Card size="small">
              <Statistic title="Nhập viện" value={data.admissionCount} prefix={<ArrowUpOutlined style={{ color: '#1890ff' }} />} />
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Card size="small">
              <Statistic title="Xuất viện" value={data.dischargeCount} prefix={<ArrowDownOutlined style={{ color: '#52c41a' }} />} />
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Card size="small">
              <Statistic title="Phẫu thuật" value={data.surgeryCount} prefix={<ScissorOutlined style={{ color: '#722ed1' }} />} />
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Card size="small">
              <Statistic title="Giường trống" value={data.availableBeds} prefix={<HomeOutlined style={{ color: '#13c2c2' }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" title="Tổng hợp BN" style={{ height: '100%' }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Badge status="processing" text={<Text>Ngoại trú: <b>{data.outpatientCount}</b></Text>} />
                <Badge status="error" text={<Text>Cấp cứu: <b>{data.emergencyCount}</b></Text>} />
                <Badge status="warning" text={<Text>Nội trú: <b>{data.inpatientCount}</b></Text>} />
              </div>
            </Card>
          </Col>
        </Row>

        {/* Row 3: Department breakdown */}
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="Khám bệnh theo khoa" size="small" styles={{ body: { maxHeight: 350, overflowY: 'auto' } }}>
              {data.outpatientByDepartment.length > 0 ? (
                <div>
                  {data.outpatientByDepartment
                    .sort((a, b) => b.count - a.count)
                    .map((item) => (
                    <div key={item.departmentName} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text ellipsis style={{ maxWidth: '70%' }}>{item.departmentName}</Text>
                        <Tag color="blue">{item.count} BN</Tag>
                      </div>
                      <Progress
                        percent={Math.round((item.count / maxDeptCount) * 100)}
                        showInfo={false}
                        size="small"
                        strokeColor="#1890ff"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">Chưa có dữ liệu</Text>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Doanh thu theo khoa" size="small" styles={{ body: { maxHeight: 350, overflowY: 'auto' } }}>
              {data.revenueByDepartment.length > 0 ? (
                <div>
                  {data.revenueByDepartment
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((item) => (
                    <div key={item.departmentName} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text ellipsis style={{ maxWidth: '60%' }}>{item.departmentName}</Text>
                        <Tag color="green">{Number(item.revenue).toLocaleString('vi-VN')} ₫</Tag>
                      </div>
                      <Progress
                        percent={Math.round((item.revenue / maxDeptRevenue) * 100)}
                        showInfo={false}
                        size="small"
                        strokeColor="#52c41a"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">Chưa có dữ liệu</Text>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export default Dashboard;
