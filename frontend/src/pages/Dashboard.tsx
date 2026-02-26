import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin, Tag, message } from 'antd';
import {
  UserOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { statisticsApi } from '../api/system';

const { Title, Text } = Typography;

interface DashboardData {
  outpatientCount: number;
  outpatientChange: number;
  inpatientCount: number;
  inpatientChange: number;
  emergencyCount: number;
  emergencyChange: number;
  totalRevenue: number;
  revenueChange: number;
  admissionCount: number;
  dischargeCount: number;
  bedOccupancyRate: number;
  averageStayDays: number;
  outpatientByDepartment: { departmentName: string; count: number }[];
  revenueByDepartment: { departmentName: string; revenue: number }[];
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    outpatientCount: 0,
    outpatientChange: 0,
    inpatientCount: 0,
    inpatientChange: 0,
    emergencyCount: 0,
    emergencyChange: 0,
    totalRevenue: 0,
    revenueChange: 0,
    admissionCount: 0,
    dischargeCount: 0,
    bedOccupancyRate: 0,
    averageStayDays: 0,
    outpatientByDepartment: [],
    revenueByDepartment: [],
  });

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await statisticsApi.getHospitalDashboard();
      const d = response.data as any;
      if (d) {
        setData({
          outpatientCount: d.outpatientCount || 0,
          outpatientChange: d.outpatientChange || 0,
          inpatientCount: d.inpatientCount || 0,
          inpatientChange: d.inpatientChange || 0,
          emergencyCount: d.emergencyCount || 0,
          emergencyChange: d.emergencyChange || 0,
          totalRevenue: d.totalRevenue || 0,
          revenueChange: d.revenueChange || 0,
          admissionCount: d.admissionCount || 0,
          dischargeCount: d.dischargeCount || 0,
          bedOccupancyRate: d.bedOccupancyRate || 0,
          averageStayDays: d.averageStayDays || 0,
          outpatientByDepartment: d.outpatientByDepartment || [],
          revenueByDepartment: d.revenueByDepartment || [],
        });
      }
    } catch (error) {
      console.warn('Error fetching dashboard:', error);
      message.error('Không thể tải dữ liệu tổng quan');
    } finally {
      setLoading(false);
    }
  };

  const renderChange = (change: number) => {
    if (change > 0) return <Text type="success"><ArrowUpOutlined /> +{change}%</Text>;
    if (change < 0) return <Text type="danger"><ArrowDownOutlined /> {change}%</Text>;
    return <Text type="secondary">0%</Text>;
  };

  return (
    <Spin spinning={loading}>
      <div>
        <Title level={4}>Tổng quan hoạt động</Title>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Khám ngoại trú"
                value={data.outpatientCount}
                prefix={<UserOutlined style={{ color: '#1890ff' }} />}
                styles={{ content: { color: '#1890ff' } }}
                suffix={renderChange(data.outpatientChange)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Cấp cứu"
                value={data.emergencyCount}
                prefix={<MedicineBoxOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
                suffix={renderChange(data.emergencyChange)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Nội trú"
                value={data.inpatientCount}
                prefix={<TeamOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
                suffix={renderChange(data.inpatientChange)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Doanh thu hôm nay"
                value={data.totalRevenue}
                prefix={<DollarOutlined style={{ color: '#eb2f96' }} />}
                styles={{ content: { color: '#eb2f96' } }}
                suffix="VND"
                formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Nhập viện hôm nay"
                value={data.admissionCount}
                prefix={<ArrowUpOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Xuất viện hôm nay"
                value={data.dischargeCount}
                prefix={<ArrowDownOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Công suất giường"
                value={data.bedOccupancyRate}
                suffix="%"
                prefix={<TeamOutlined style={{ color: '#faad14' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Ngày nằm viện TB"
                value={data.averageStayDays}
                suffix="ngày"
                precision={1}
                prefix={<ClockCircleOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="Khám bệnh theo khoa" size="small">
              {data.outpatientByDepartment.length > 0 ? (
                <div>
                  {data.outpatientByDepartment.map((item) => (
                    <div key={item.departmentName} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <Text>{item.departmentName}</Text>
                      <Tag color="blue">{item.count} BN</Tag>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">Chưa có dữ liệu</Text>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Doanh thu theo khoa" size="small">
              {data.revenueByDepartment.length > 0 ? (
                <div>
                  {data.revenueByDepartment.map((item) => (
                    <div key={item.departmentName} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <Text>{item.departmentName}</Text>
                      <Tag color="green">{Number(item.revenue).toLocaleString('vi-VN')} VND</Tag>
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
