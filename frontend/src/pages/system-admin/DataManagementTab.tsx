// Tab chuyển giao dữ liệu — tách từ pages/SystemAdmin.tsx (K1 refactor 2026-05-30, phiên 3).

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Modal, Row, Spin, Statistic, Table, Tag, message } from 'antd';
import { CloudServerOutlined, DatabaseOutlined, FileTextOutlined, HddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as dataExportApi from '../../api/dataExport';
import type {
  DataStatsDto, ModuleDataCountDto, BackupInfoDto, DataExportResultDto, DataHandoverDto,
} from '../../api/dataExport';

const DataManagementTab: React.FC = () => {
  const [dataStats, setDataStats] = useState<DataStatsDto | null>(null);
  const [moduleCounts, setModuleCounts] = useState<ModuleDataCountDto[]>([]);
  const [backups, setBackups] = useState<BackupInfoDto[]>([]);
  const [exportHistory, setExportHistory] = useState<DataExportResultDto[]>([]);
  const [handovers, setHandovers] = useState<DataHandoverDto[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, countsRes, backupsRes, exportsRes, handoversRes] = await Promise.allSettled([
        dataExportApi.getDataStats(),
        dataExportApi.getModuleDataCounts(),
        dataExportApi.getBackups(),
        dataExportApi.getExportHistory(),
        dataExportApi.getHandovers(),
      ]);
      if (statsRes.status === 'fulfilled') setDataStats(statsRes.value);
      if (countsRes.status === 'fulfilled') setModuleCounts(Array.isArray(countsRes.value) ? countsRes.value : []);
      if (backupsRes.status === 'fulfilled') setBackups(Array.isArray(backupsRes.value) ? backupsRes.value : []);
      if (exportsRes.status === 'fulfilled') setExportHistory(Array.isArray(exportsRes.value) ? exportsRes.value : []);
      if (handoversRes.status === 'fulfilled') setHandovers(Array.isArray(handoversRes.value) ? handoversRes.value : []);
    } catch { console.warn('Error fetching data management info'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Spin spinning={loading}>
      {/* Data Overview */}
      {dataStats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6} lg={4}><Card size="small"><Statistic title="Bệnh nhân" value={dataStats.totalPatients} /></Card></Col>
          <Col xs={12} sm={6} lg={4}><Card size="small"><Statistic title="Lượt khám" value={dataStats.totalExaminations} /></Card></Col>
          <Col xs={12} sm={6} lg={4}><Card size="small"><Statistic title="Đơn thuốc" value={dataStats.totalPrescriptions} /></Card></Col>
          <Col xs={12} sm={6} lg={4}><Card size="small"><Statistic title="KQ XN" value={dataStats.totalLabResults} /></Card></Col>
          <Col xs={12} sm={6} lg={4}><Card size="small"><Statistic title="DB (MB)" value={dataStats.databaseSizeMB} /></Card></Col>
          <Col xs={12} sm={6} lg={4}><Card size="small"><Statistic title="Files (MB)" value={dataStats.attachmentsSizeMB} /></Card></Col>
        </Row>
      )}

      {/* Module Data Counts */}
      <Card size="small" title="Dữ liệu theo module" style={{ marginBottom: 16 }}>
        <Table
          columns={[
            { title: 'Module', dataIndex: 'moduleName', key: 'name' },
            { title: 'Số bản ghi', dataIndex: 'recordCount', key: 'count', align: 'right' as const, render: (v: number) => v?.toLocaleString('vi-VN') },
            { title: 'Cập nhật cuối', dataIndex: 'lastUpdated', key: 'updated', width: 150, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-' },
          ]}
          dataSource={moduleCounts}
          rowKey="module"
          size="small"
          pagination={false}
        />
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          {/* Backup History */}
          <Card size="small" title="Sao lưu" extra={
            <Button size="small" type="primary" icon={<HddOutlined />} onClick={() => {
              dataExportApi.createBackup('Full').then(() => { message.success('Đang tạo bản sao lưu...'); fetchData(); }).catch(() => message.warning('Không thể tạo sao lưu'));
            }}>Tạo sao lưu</Button>
          }>
            <Table
              columns={[
                { title: 'Loại', dataIndex: 'backupType', key: 'type', width: 100 },
                { title: 'File', dataIndex: 'fileName', key: 'file', ellipsis: true },
                { title: 'Kích thước', dataIndex: 'fileSize', key: 'size', width: 100, render: (v: number) => v ? `${(v / 1024 / 1024).toFixed(1)} MB` : '-' },
                { title: 'Ngày', dataIndex: 'createdAt', key: 'date', width: 140, render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '-' },
                { title: 'TT', dataIndex: 'status', key: 'status', width: 80, render: (v: string) => <Tag color={v === 'Completed' ? 'green' : v === 'InProgress' ? 'processing' : 'red'}>{v === 'Completed' ? 'OK' : v === 'InProgress' ? '...' : 'Lỗi'}</Tag> },
              ]}
              dataSource={backups}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>
        <Col span={12}>
          {/* Export History */}
          <Card size="small" title="Xuất dữ liệu" extra={
            <Button size="small" type="primary" icon={<CloudServerOutlined />} onClick={() => {
              dataExportApi.requestExport({ modules: ['all'], format: 'JSON', includeAttachments: false }).then(() => { message.success('Đang xuất dữ liệu...'); fetchData(); }).catch(() => message.warning('Không thể xuất dữ liệu'));
            }}>Xuất toàn bộ</Button>
          }>
            <Table
              columns={[
                { title: 'Modules', dataIndex: 'modules', key: 'modules', render: (v: string[]) => v?.join(', ') || '-', ellipsis: true },
                { title: 'Format', dataIndex: 'format', key: 'format', width: 70 },
                { title: 'Bản ghi', dataIndex: 'recordCount', key: 'count', width: 80, align: 'right' as const },
                { title: 'Ngày', dataIndex: 'requestedAt', key: 'date', width: 140, render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '-' },
                { title: 'TT', dataIndex: 'status', key: 'status', width: 80, render: (v: string) => <Tag color={v === 'Completed' ? 'green' : v === 'InProgress' ? 'processing' : 'red'}>{v}</Tag> },
              ]}
              dataSource={exportHistory}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Handover Management */}
      <Card size="small" title="Biên bản chuyển giao dữ liệu" extra={
        <Button size="small" type="primary" icon={<FileTextOutlined />} onClick={() => {
          Modal.confirm({
            title: 'Tạo biên bản chuyển giao',
            content: 'Hệ thống sẽ tạo bản sao lưu đầy đủ và biên bản chuyển giao dữ liệu cho bên thuê dịch vụ.',
            okText: 'Tạo',
            onOk: () => {
              dataExportApi.createHandover({ recipientName: 'Chủ đầu tư', recipientOrganization: 'Bệnh viện', modules: ['all'] })
                .then(() => { message.success('Đã tạo biên bản chuyển giao'); fetchData(); })
                .catch(() => message.warning('Lỗi tạo biên bản'));
            },
          });
        }}>Tạo biên bản</Button>
      }>
        <Table
          columns={[
            { title: 'Mã', dataIndex: 'handoverCode', key: 'code', width: 130 },
            { title: 'Ngày', dataIndex: 'handoverDate', key: 'date', width: 110, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
            { title: 'Người nhận', dataIndex: 'recipientName', key: 'recipient' },
            { title: 'Đơn vị', dataIndex: 'recipientOrganization', key: 'org' },
            { title: 'Modules', dataIndex: 'modules', key: 'modules', render: (v: string[]) => v?.length || 0, width: 80 },
            { title: 'Bản ghi', dataIndex: 'totalRecords', key: 'records', width: 90, align: 'right' as const, render: (v: number) => v?.toLocaleString('vi-VN') },
            {
              title: 'Trạng thái', dataIndex: 'statusName', key: 'status', width: 110,
              render: (text: string, record: DataHandoverDto) => {
                const colors: Record<number, string> = { 0: 'default', 1: 'processing', 2: 'success', 3: 'cyan' };
                return <Tag color={colors[record.status] || 'default'}>{text}</Tag>;
              },
            },
            {
              title: 'Thao tác', key: 'action', width: 100,
              render: (_: unknown, record: DataHandoverDto) => (
                record.status === 2 ? (
                  <Button size="small" type="primary" onClick={() => { dataExportApi.confirmHandover(record.id).then(() => { message.success('Đã xác nhận'); fetchData(); }).catch(() => message.warning('Lỗi')); }}>Xác nhận</Button>
                ) : null
              ),
            },
          ] as ColumnsType<DataHandoverDto>}
          dataSource={handovers}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Chưa có biên bản chuyển giao' }}
        />
      </Card>

    </Spin>
  );
};

export const DataManagementTabIcon = <DatabaseOutlined />;
export const DataManagementTabLabel = 'Chuyển giao DL';
export const DataManagementTabKey = 'data-management';

export default DataManagementTab;
