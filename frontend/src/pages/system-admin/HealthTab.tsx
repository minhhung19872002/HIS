// Tab giám sát hệ thống — tách từ pages/SystemAdmin.tsx (K1 refactor 2026-05-30, phiên 2).
// Behavior-preserving: state + handlers + JSX y nguyên. Auto-refresh interval 30s + cleanup.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Badge, Button, Card, Col, Progress, Row, Space, Spin, Statistic, Table, Tag, Tooltip, Typography,
} from 'antd';
import {
  ApiOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  CloudServerOutlined, DatabaseOutlined, HddOutlined, HeartOutlined, ReloadOutlined,
  SettingOutlined, WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { API_ORIGIN } from '../../config/api';
import {
  getHealthDetails, getMetrics,
  type HealthCheckResult, type MetricsSnapshot, type ComponentHealth,
} from '../../api/health';

// `active=false` để pause interval khi user rời tab (Antd Tabs keep tab mounted by default,
// nên nếu interval không gắn với `active` thì health polling sẽ chạy mãi → behavior khác bản v1).
const HealthTab: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const [healthData, setHealthData] = useState<HealthCheckResult | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealthData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, metricsRes] = await Promise.allSettled([
        getHealthDetails(),
        getMetrics(),
      ]);
      if (healthRes.status === 'fulfilled' && healthRes.value.data && typeof healthRes.value.data === 'object' && healthRes.value.data.status) {
        setHealthData(healthRes.value.data);
      }
      if (metricsRes.status === 'fulfilled') {
        setMetricsData(metricsRes.value.data);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.warn('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh 30s CHỈ KHI tab đang active (bản v1 pause interval khi user rời tab —
  // pass prop `active` để preserve behavior này; Antd Tabs giữ component mount sau khi
  // user click 1 lần, nên không thể dùng mount/unmount để pause).
  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    fetchHealthData();
    intervalRef.current = setInterval(fetchHealthData, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, fetchHealthData]);

  return (
    <Spin spinning={loading}>
      {/* Header with refresh controls */}
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col flex="auto">
          {healthData && (
            <Space>
              <Badge
                status={healthData.status === 'Healthy' ? 'success' : healthData.status === 'Degraded' ? 'warning' : 'error'}
                text={
                  <Typography.Text strong style={{ fontSize: 16 }}>
                    {healthData.status === 'Healthy' ? 'Hệ thống hoạt động bình thường' :
                     healthData.status === 'Degraded' ? 'Hệ thống hoạt động hạn chế' :
                     'Hệ thống gặp sự cố'}
                  </Typography.Text>
                }
              />
              <Tag color={healthData.status === 'Healthy' ? 'green' : healthData.status === 'Degraded' ? 'orange' : 'red'}>
                {healthData.status}
              </Tag>
            </Space>
          )}
        </Col>
        <Col>
          <Space>
            {lastUpdated && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                <ClockCircleOutlined /> Cập nhật: {dayjs(lastUpdated).format('HH:mm:ss')}
              </Typography.Text>
            )}
            <Tooltip title="Tự động làm mới mỗi 30 giây">
              <Button icon={<ReloadOutlined />} onClick={fetchHealthData} loading={loading}>
                Làm mới
              </Button>
            </Tooltip>
          </Space>
        </Col>
      </Row>

      {!healthData && !loading && (
        <Alert title="Không thể kết nối đến máy chủ" type="warning" showIcon
          description={`Vui lòng kiểm tra backend API đang chạy tại ${API_ORIGIN || window.location.origin}`}
        />
      )}

      {healthData && (
        <>
          {/* Overview metrics row */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic title="Phiên bản" value={healthData.version} prefix={<ApiOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic title="Uptime" value={healthData.uptime} prefix={<ClockCircleOutlined />} />
              </Card>
            </Col>
            {metricsData && (
              <>
                <Col xs={12} sm={6}>
                  <Card size="small">
                    <Statistic title="Tổng requests" value={metricsData.totalRequests} />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small">
                    <Statistic title="Requests/phút" value={metricsData.requestsPerMinute} precision={1} />
                  </Card>
                </Col>
              </>
            )}
          </Row>

          {metricsData && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={12} sm={6}>
                <Card size="small"><Statistic title="Active requests" value={metricsData.activeRequests} /></Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small"><Statistic title="Thời gian phản hồi TB" value={metricsData.averageResponseTimeMs} precision={1} suffix="ms" /></Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="Lỗi" value={metricsData.errorCount}
                    styles={{ content: { color: metricsData.errorCount > 0 ? '#cf1322' : '#3f8600' } }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="Tỷ lệ lỗi" value={metricsData.errorRate} precision={2} suffix="%"
                    styles={{ content: { color: metricsData.errorRate > 5 ? '#cf1322' : '#3f8600' } }}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* Component health cards */}
          <Typography.Title level={5} style={{ marginBottom: 16 }}>Trạng thái thành phần</Typography.Title>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {(healthData.checks ? Object.entries(healthData.checks) : []).map(([key, check]: [string, ComponentHealth]) => {
              const labels: Record<string, { name: string; icon: React.ReactNode }> = {
                sqlServer: { name: 'SQL Server', icon: <DatabaseOutlined /> },
                redis: { name: 'Redis Cache', icon: <CloudServerOutlined /> },
                orthancPacs: { name: 'Orthanc PACS', icon: <HddOutlined /> },
                hl7Listener: { name: 'HL7 Listener', icon: <ApiOutlined /> },
                diskSpace: { name: 'Ổ đĩa', icon: <HddOutlined /> },
                memory: { name: 'Bộ nhớ', icon: <CloudServerOutlined /> },
              };
              const label = labels[key] || { name: key, icon: <SettingOutlined /> };
              const statusColor = check.status === 'Healthy' ? '#52c41a' : check.status === 'Degraded' ? '#faad14' : '#ff4d4f';
              const statusIcon = check.status === 'Healthy' ? <CheckCircleOutlined style={{ color: statusColor }} /> :
                check.status === 'Degraded' ? <WarningOutlined style={{ color: statusColor }} /> :
                <CloseCircleOutlined style={{ color: statusColor }} />;

              return (
                <Col xs={24} sm={12} md={8} key={key}>
                  <Card
                    size="small"
                    title={<Space>{label.icon}{label.name}{statusIcon}</Space>}
                    style={{ borderLeft: `3px solid ${statusColor}` }}
                  >
                    <Row gutter={8}>
                      <Col span={12}>
                        <Typography.Text type="secondary">Trạng thái</Typography.Text>
                        <div>
                          <Tag color={check.status === 'Healthy' ? 'green' : check.status === 'Degraded' ? 'orange' : 'red'}>
                            {check.status}
                          </Tag>
                        </div>
                      </Col>
                      {check.responseTime && (
                        <Col span={12}>
                          <Typography.Text type="secondary">Phản hồi</Typography.Text>
                          <div><Typography.Text strong>{check.responseTime}</Typography.Text></div>
                        </Col>
                      )}
                    </Row>
                    {check.error && (
                      <div style={{ marginTop: 8 }}>
                        <Typography.Text type="danger" style={{ fontSize: 12 }}>{check.error}</Typography.Text>
                      </div>
                    )}
                    {key === 'diskSpace' && check.freeGb !== undefined && (
                      <div style={{ marginTop: 8 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Trống: {check.freeGb} GB / {check.totalGb} GB
                        </Typography.Text>
                        <Progress percent={check.usagePercent || 0} size="small" status={check.status === 'Healthy' ? 'normal' : 'exception'} />
                      </div>
                    )}
                    {key === 'memory' && check.usedMb !== undefined && (
                      <div style={{ marginTop: 8 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Sử dụng: {check.usedMb} MB / {check.totalMb} MB
                        </Typography.Text>
                        <Progress percent={check.usagePercent || 0} size="small" status={check.status === 'Healthy' ? 'normal' : 'exception'} />
                      </div>
                    )}
                    {key === 'hl7Listener' && check.port && (
                      <div style={{ marginTop: 8 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Port: {check.port}</Typography.Text>
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Metrics details */}
          {metricsData && (
            <>
              {Object.keys(metricsData.statusCodeDistribution).length > 0 && (
                <>
                  <Typography.Title level={5} style={{ marginBottom: 16 }}>Phân bố mã trạng thái HTTP</Typography.Title>
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    {Object.entries(metricsData.statusCodeDistribution).map(([code, count]) => {
                      const numCode = parseInt(code);
                      const color = numCode < 300 ? '#52c41a' : numCode < 400 ? '#1890ff' : numCode < 500 ? '#faad14' : '#ff4d4f';
                      return (
                        <Col xs={8} sm={4} key={code}>
                          <Card size="small">
                            <Statistic title={`HTTP ${code}`} value={count} styles={{ content: { color, fontSize: 20 } }} />
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                </>
              )}

              {Object.keys(metricsData.topEndpoints).length > 0 && (
                <>
                  <Typography.Title level={5} style={{ marginBottom: 16 }}>Endpoint phổ biến</Typography.Title>
                  <Table
                    dataSource={Object.entries(metricsData.topEndpoints).map(([path, count]) => ({ key: path, path, count }))}
                    columns={[
                      { title: 'Endpoint', dataIndex: 'path', key: 'path' },
                      {
                        title: 'Số lượng', dataIndex: 'count', key: 'count', width: 120, align: 'right' as const,
                        sorter: (a: { count: number }, b: { count: number }) => a.count - b.count,
                        defaultSortOrder: 'descend' as const,
                      },
                    ]}
                    size="small"
                    pagination={false}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
    </Spin>
  );
};

export const HealthTabIcon = <HeartOutlined />;
export const HealthTabLabel = 'Giám sát hệ thống';
export const HealthTabKey = 'health';

export default HealthTab;
