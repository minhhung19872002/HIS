// Tab nhật ký hệ thống (Level 6 audit log) — tách từ pages/SystemAdmin.tsx (K1 phiên 3).

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Col, DatePicker, Descriptions, Input, Modal, Row, Select, Table, Tag, Tooltip,
} from 'antd';
import { FileTextOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getAuditLogs as fetchAuditLogsApi,
  type AuditLogDto as AuditLogLevel6,
  type AuditLogSearchDto as AuditLogLevel6Search,
  type AuditLogPagedResult,
} from '../../api/audit';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AuditTab: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLogLevel6[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [entityType, setEntityType] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string | undefined>();
  const [keyword, setKeyword] = useState<string>('');

  const fetchAuditLogs = useCallback(async (pageIdx?: number) => {
    setLoading(true);
    try {
      const params: AuditLogLevel6Search = {
        pageIndex: pageIdx ?? pageIndex,
        pageSize,
      };
      if (action) params.action = action;
      if (entityType) params.entityType = entityType;
      if (moduleFilter) params.module = moduleFilter;
      if (keyword) params.keyword = keyword;
      if (dateRange?.[0]) params.fromDate = dateRange[0].format('YYYY-MM-DD');
      if (dateRange?.[1]) params.toDate = dateRange[1].format('YYYY-MM-DD');

      const res = await fetchAuditLogsApi(params);
      const data = res.data as AuditLogPagedResult;
      if (data && Array.isArray(data.items)) {
        setAuditLogs(data.items);
        setTotalCount(data.totalCount);
      } else if (Array.isArray(res.data)) {
        setAuditLogs(res.data as unknown as AuditLogLevel6[]);
        setTotalCount((res.data as unknown as AuditLogLevel6[]).length);
      }
    } catch (error) {
      console.warn('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, action, entityType, moduleFilter, keyword, dateRange]);

  useEffect(() => { fetchAuditLogs(); }, [fetchAuditLogs]);

  return (
    <>
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col>
          <Select placeholder="Phân hệ" style={{ width: 160 }} allowClear onChange={(v) => { setModuleFilter(v); setPageIndex(0); }}>
            <Option value="Reception">Tiếp đón</Option>
            <Option value="OPD">Khám bệnh</Option>
            <Option value="Inpatient">Nội trú</Option>
            <Option value="Pharmacy">Nhà thuốc</Option>
            <Option value="Warehouse">Kho dược</Option>
            <Option value="Billing">Thu ngân</Option>
            <Option value="Laboratory">Xét nghiệm</Option>
            <Option value="Radiology">CĐHA</Option>
            <Option value="EMR">Hồ sơ BA</Option>
            <Option value="Prescription">Kê đơn</Option>
            <Option value="Surgery">Phẫu thuật</Option>
            <Option value="BloodBank">Ngân hàng máu</Option>
            <Option value="SystemAdmin">Quản trị</Option>
            <Option value="Auth">Đăng nhập</Option>
            <Option value="MasterData">Danh mục</Option>
          </Select>
        </Col>
        <Col>
          <Select placeholder="Đối tượng" style={{ width: 160 }} allowClear onChange={(v) => { setEntityType(v); setPageIndex(0); }}>
            <Option value="patients">Bệnh nhân</Option>
            <Option value="examination">Lượt khám</Option>
            <Option value="prescription">Đơn thuốc</Option>
            <Option value="inpatient">Nội trú</Option>
            <Option value="billing">Viện phí</Option>
            <Option value="admin">Quản trị</Option>
            <Option value="auth">Xác thực</Option>
          </Select>
        </Col>
        <Col>
          <Select placeholder="Hành động" style={{ width: 130 }} allowClear onChange={(v) => { setAction(v); setPageIndex(0); }}>
            <Option value="Create">Tạo mới</Option>
            <Option value="Update">Cập nhật</Option>
            <Option value="Delete">Xóa</Option>
            <Option value="Print">In</Option>
            <Option value="Export">Xuất</Option>
            <Option value="Auth">Đăng nhập</Option>
            <Option value="Approve">Duyệt</Option>
            <Option value="Cancel">Hủy</Option>
          </Select>
        </Col>
        <Col>
          <RangePicker
            format="DD/MM/YYYY"
            onChange={(dates) => { setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null); setPageIndex(0); }}
          />
        </Col>
        <Col>
          <Search
            placeholder="Tìm theo tên, IP, đường dẫn..."
            allowClear
            style={{ width: 250 }}
            enterButton={<SearchOutlined />}
            onSearch={(v) => { setKeyword(v); setPageIndex(0); }}
          />
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => fetchAuditLogs()}>Làm mới</Button>
        </Col>
      </Row>

      <Table
        columns={[
          {
            title: 'Thời gian', dataIndex: 'timestamp', key: 'timestamp', width: 160,
            render: (ts: string) => ts ? dayjs(ts).format('DD/MM/YYYY HH:mm:ss') : '-',
          },
          {
            title: 'Người dùng', key: 'user', width: 180,
            render: (_: unknown, record: AuditLogLevel6) => (
              <>
                <div>{record.userFullName || record.userName || '-'}</div>
                {record.userName && <div style={{ fontSize: 11, color: '#888' }}>@{record.userName}</div>}
              </>
            ),
          },
          {
            title: 'Phân hệ', dataIndex: 'module', key: 'module', width: 110,
            render: (mod: string) => mod ? <Tag color="blue">{mod}</Tag> : '-',
          },
          {
            title: 'Hành động', dataIndex: 'action', key: 'action', width: 100,
            render: (a: string) => {
              const colorMap: Record<string, string> = {
                Create: 'green', Update: 'orange', Delete: 'red',
                Print: 'purple', Export: 'cyan', Auth: 'geekblue',
                Approve: 'lime', Cancel: 'volcano',
              };
              return <Tag color={colorMap[a] || 'default'}>{a}</Tag>;
            },
          },
          { title: 'Đối tượng', dataIndex: 'entityType', key: 'entityType', width: 120 },
          {
            title: 'Đường dẫn', dataIndex: 'requestPath', key: 'requestPath', width: 250, ellipsis: true,
            render: (path: string, record: AuditLogLevel6) => (
              <Tooltip title={path}>
                <Tag color={record.requestMethod === 'DELETE' ? 'red' : record.requestMethod === 'PUT' ? 'orange' : 'blue'} style={{ marginRight: 4 }}>
                  {record.requestMethod}
                </Tag>
                <span style={{ fontSize: 12 }}>{path}</span>
              </Tooltip>
            ),
          },
          {
            title: 'Status', dataIndex: 'responseStatusCode', key: 'responseStatusCode', width: 70, align: 'center' as const,
            render: (code: number) => {
              if (!code) return '-';
              const color = code < 300 ? 'green' : code < 400 ? 'blue' : code < 500 ? 'orange' : 'red';
              return <Tag color={color}>{code}</Tag>;
            },
          },
          { title: 'IP', dataIndex: 'ipAddress', key: 'ipAddress', width: 120, ellipsis: true },
        ] as ColumnsType<AuditLogLevel6>}
        dataSource={auditLogs}
        rowKey="id"
        size="small"
        scroll={{ x: 1400 }}
        loading={loading}
        pagination={{
          current: pageIndex + 1,
          pageSize,
          total: totalCount,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Tổng: ${total} bản ghi`,
          onChange: (page, size) => {
            setPageIndex(page - 1);
            setPageSize(size);
          },
        }}
        onRow={(record) => ({
          onDoubleClick: () => {
            Modal.info({
              title: 'Chi tiết nhật ký kiểm toán',
              width: 700,
              content: (
                <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                  <Descriptions.Item label="Thời gian">{record.timestamp ? dayjs(record.timestamp).format('DD/MM/YYYY HH:mm:ss') : '-'}</Descriptions.Item>
                  <Descriptions.Item label="Người thực hiện">{record.userFullName || record.userName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Phân hệ">{record.module || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Hành động">{record.action}</Descriptions.Item>
                  <Descriptions.Item label="Đối tượng">{record.entityType || '-'}</Descriptions.Item>
                  <Descriptions.Item label="ID bản ghi">{record.entityId || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Phương thức">{record.requestMethod || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Mã trạng thái">{record.responseStatusCode || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Đường dẫn" span={2}>{record.requestPath || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ IP">{record.ipAddress || '-'}</Descriptions.Item>
                  <Descriptions.Item label="User Agent">{record.userAgent || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Chi tiết" span={2}>
                    <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {record.details || '-'}
                    </pre>
                  </Descriptions.Item>
                  {(record.oldValues || record.newValues) && (
                    <>
                      <Descriptions.Item label="Giá trị cũ" span={2}>
                        <pre style={{ maxHeight: 150, overflow: 'auto', fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>
                          {record.oldValues || '-'}
                        </pre>
                      </Descriptions.Item>
                      <Descriptions.Item label="Giá trị mới" span={2}>
                        <pre style={{ maxHeight: 150, overflow: 'auto', fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>
                          {record.newValues || '-'}
                        </pre>
                      </Descriptions.Item>
                    </>
                  )}
                </Descriptions>
              ),
            });
          },
          style: { cursor: 'pointer' },
        })}
      />
    </>
  );
};

export const AuditTabIcon = <FileTextOutlined />;
export const AuditTabLabel = 'Nhật ký hệ thống';
export const AuditTabKey = 'audit';

export default AuditTab;
