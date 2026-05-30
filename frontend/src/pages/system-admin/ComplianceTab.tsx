// Tab ATTT Cấp độ 3 + báo cáo truy cập dữ liệu nhạy cảm — tách từ pages/SystemAdmin.tsx (K1 phiên 2).

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, DatePicker, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import {
  AuditOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined,
  LockOutlined, ReloadOutlined, SafetyOutlined, SearchOutlined, UserOutlined, WarningOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getComplianceSummary, getSensitiveAccessReport,
  type ComplianceSummaryDto, type SensitiveDataAccessReportDto,
} from '../../api/security';
import { getNestedData } from './helpers';

const { RangePicker } = DatePicker;

const ComplianceTab: React.FC = () => {
  const [summary, setSummary] = useState<ComplianceSummaryDto | null>(null);
  const [sensitiveReport, setSensitiveReport] = useState<SensitiveDataAccessReportDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, reportRes] = await Promise.allSettled([
        getComplianceSummary(),
        getSensitiveAccessReport(dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD'), 50),
      ]);
      if (summaryRes.status === 'fulfilled') {
        setSummary(getNestedData<ComplianceSummaryDto | null>(summaryRes.value.data, null));
      }
      if (reportRes.status === 'fulfilled') {
        setSensitiveReport(getNestedData<SensitiveDataAccessReportDto[]>(reportRes.value.data, []));
      }
    } catch (error) {
      console.warn('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Spin spinning={loading}>
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col flex="auto">
          <Typography.Text strong style={{ fontSize: 16 }}>
            <SafetyOutlined /> ATTT Cấp độ 3 (NĐ 85/2016/NĐ-CP)
          </Typography.Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
        </Col>
      </Row>

      {/* Compliance Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card size="small"><Statistic title="Tổng người dùng" value={summary?.totalUsers ?? 0} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small">
            <Statistic title="Người dùng hoạt động" value={summary?.activeUsers ?? 0}
              prefix={<CheckCircleOutlined />} styles={{ content: { color: '#3f8600' } }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small">
            <Statistic
              title="2FA đã bật"
              value={summary?.totalUsers ? Math.round((summary.usersWithTwoFactor / summary.totalUsers) * 100) : 0}
              suffix="%" prefix={<LockOutlined />}
              styles={{ content: { color: (summary?.usersWithTwoFactor ?? 0) > 0 ? '#3f8600' : '#cf1322' } }}
            />
            <div style={{ fontSize: 11, color: '#888' }}>
              {summary?.usersWithTwoFactor ?? 0} / {summary?.totalUsers ?? 0} người dùng
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small">
            <Statistic
              title="TDE (Mã hóa dữ liệu)" value={summary?.tdeEnabled ? 'BẬT' : 'TẮT'}
              prefix={summary?.tdeEnabled ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              styles={{ content: { color: summary?.tdeEnabled ? '#3f8600' : '#cf1322' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small">
            <Statistic
              title="Mã hóa cột" value={summary?.columnEncryptionEnabled ? 'BẬT' : 'TẮT'}
              prefix={summary?.columnEncryptionEnabled ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              styles={{ content: { color: summary?.columnEncryptionEnabled ? '#3f8600' : '#cf1322' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small">
            <Statistic
              title="Sao lưu gần nhất"
              value={summary?.lastBackupDate ? dayjs(summary.lastBackupDate).format('DD/MM HH:mm') : 'Chưa có'}
              prefix={(() => {
                if (!summary?.lastBackupDate) return <WarningOutlined style={{ color: '#ff4d4f' }} />;
                const hoursAgo = dayjs().diff(dayjs(summary.lastBackupDate), 'hour');
                return hoursAgo > 24 ? <WarningOutlined style={{ color: '#faad14' }} /> : <CheckCircleOutlined style={{ color: '#52c41a' }} />;
              })()}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small">
            <Statistic title="Nhật ký (30 ngày)" value={summary?.auditLogsLast30Days ?? 0} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small">
            <Statistic
              title="Truy cập nhạy cảm (30 ngày)" value={summary?.sensitiveAccessLast30Days ?? 0}
              prefix={<WarningOutlined />}
              styles={{ content: { color: (summary?.sensitiveAccessLast30Days ?? 0) > 100 ? '#cf1322' : '#3f8600' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Sensitive Data Access Report */}
      <Typography.Title level={5} style={{ marginBottom: 16 }}>Báo cáo truy cập dữ liệu nhạy cảm</Typography.Title>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <RangePicker format="DD/MM/YYYY" value={dateRange}
            onChange={(dates) => { if (dates && dates[0] && dates[1]) setDateRange([dates[0], dates[1]]); }}
          />
        </Col>
        <Col>
          <Button icon={<SearchOutlined />} onClick={fetchData}>Tìm kiếm</Button>
        </Col>
      </Row>

      <Table
        dataSource={sensitiveReport}
        rowKey="userId"
        size="small"
        scroll={{ x: 800 }}
        pagination={{ showSizeChanger: true, showTotal: (total) => `Tổng: ${total} người dùng` }}
        expandable={{
          expandedRowRender: (record: SensitiveDataAccessReportDto) => (
            <Table
              dataSource={record.recentAccesses}
              rowKey={(item) => `${item.timestamp}-${item.entityId}`}
              size="small"
              pagination={false}
              columns={[
                { title: 'Thời gian', dataIndex: 'timestamp', key: 'timestamp', width: 160, render: (ts: string) => ts ? dayjs(ts).format('DD/MM/YYYY HH:mm:ss') : '-' },
                { title: 'Đối tượng', dataIndex: 'entityType', key: 'entityType', width: 120 },
                { title: 'ID', dataIndex: 'entityId', key: 'entityId', width: 250, ellipsis: true },
                { title: 'Đường dẫn', dataIndex: 'requestPath', key: 'requestPath', ellipsis: true },
                { title: 'Phân hệ', dataIndex: 'module', key: 'module', width: 110, render: (mod: string) => mod ? <Tag color="blue">{mod}</Tag> : '-' },
              ]}
            />
          ),
        }}
        columns={[
          {
            title: 'Người dùng', key: 'user', width: 200,
            render: (_: unknown, record: SensitiveDataAccessReportDto) => (
              <>
                <div>{record.userFullName || record.userName}</div>
                {record.userName && <div style={{ fontSize: 11, color: '#888' }}>@{record.userName}</div>}
              </>
            ),
          },
          {
            title: 'Tổng truy cập', dataIndex: 'totalAccesses', key: 'totalAccesses', width: 130, align: 'center' as const,
            sorter: (a: SensitiveDataAccessReportDto, b: SensitiveDataAccessReportDto) => a.totalAccesses - b.totalAccesses,
            defaultSortOrder: 'descend' as const,
            render: (count: number) => <Tag color={count > 50 ? 'red' : count > 20 ? 'orange' : 'green'}>{count}</Tag>,
          },
          {
            title: 'Truy cập gần nhất', key: 'mostRecent', width: 160,
            render: (_: unknown, record: SensitiveDataAccessReportDto) => {
              const recent = record.recentAccesses?.[0];
              return recent ? dayjs(recent.timestamp).format('DD/MM/YYYY HH:mm') : '-';
            },
          },
          {
            title: 'Đối tượng chính', key: 'mainEntityType',
            render: (_: unknown, record: SensitiveDataAccessReportDto) => {
              const types = [...new Set(record.recentAccesses?.map((a) => a.entityType) || [])];
              return types.map((t) => <Tag key={t}>{t}</Tag>);
            },
          },
        ]}
      />
    </Spin>
  );
};

export const ComplianceTabIcon = <AuditOutlined />;
export const ComplianceTabLabel = 'ATTT Cấp độ 3';
export const ComplianceTabKey = 'compliance';

export default ComplianceTab;
