/**
 * QW3.10 — Thống kê khối lượng công việc BS/KTV (workload report).
 */

import { useCallback, useEffect, useState } from 'react';
import { Card, DatePicker, Table, Tabs, Button, Space, Typography, Tag, message } from 'antd';
import { ReloadOutlined, FileExcelOutlined, TeamOutlined, ExperimentOutlined, PictureOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getWorkload,
  type WorkloadReportDto,
  type DoctorWorkloadDto,
  type RadiologistWorkloadDto,
  type TechnicianWorkloadDto,
} from '../api/workloadReport';
import { exportToExcel } from '../utils/excelExport';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function WorkloadReport() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'day').startOf('day'),
    dayjs().endOf('day'),
  ]);
  const [data, setData] = useState<WorkloadReportDto | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getWorkload(range[0].toISOString(), range[1].toISOString());
      setData(d);
    } catch (e) {
      console.warn(e);
      message.error('Không tải được báo cáo workload');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const doctorColumns = [
    { title: 'Bác sĩ', dataIndex: 'fullName', key: 'fullName' },
    {
      title: 'Lượt khám',
      dataIndex: 'examinationCount',
      key: 'examinationCount',
      align: 'right' as const,
      sorter: (a: DoctorWorkloadDto, b: DoctorWorkloadDto) => a.examinationCount - b.examinationCount,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Đơn thuốc',
      dataIndex: 'prescriptionCount',
      key: 'prescriptionCount',
      align: 'right' as const,
      sorter: (a: DoctorWorkloadDto, b: DoctorWorkloadDto) => a.prescriptionCount - b.prescriptionCount,
      render: (v: number) => <Tag color="green">{v}</Tag>,
    },
    {
      title: 'Phiếu chỉ định',
      dataIndex: 'serviceRequestCount',
      key: 'serviceRequestCount',
      align: 'right' as const,
      sorter: (a: DoctorWorkloadDto, b: DoctorWorkloadDto) => a.serviceRequestCount - b.serviceRequestCount,
      render: (v: number) => <Tag color="orange">{v}</Tag>,
    },
    {
      title: 'Tổng',
      key: 'total',
      align: 'right' as const,
      render: (_: unknown, row: DoctorWorkloadDto) =>
        <strong>{row.examinationCount + row.prescriptionCount + row.serviceRequestCount}</strong>,
    },
  ];

  const radiologistColumns = [
    { title: 'Người dùng', dataIndex: 'fullName', key: 'fullName' },
    {
      title: 'Chỉ định CĐHA',
      dataIndex: 'studiesRequested',
      key: 'studiesRequested',
      align: 'right' as const,
      sorter: (a: RadiologistWorkloadDto, b: RadiologistWorkloadDto) => a.studiesRequested - b.studiesRequested,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Chụp (KTV)',
      dataIndex: 'studiesPerformedAsTech',
      key: 'studiesPerformedAsTech',
      align: 'right' as const,
      sorter: (a: RadiologistWorkloadDto, b: RadiologistWorkloadDto) => a.studiesPerformedAsTech - b.studiesPerformedAsTech,
      render: (v: number) => <Tag color="purple">{v}</Tag>,
    },
    {
      title: 'Đọc KQ (duyệt)',
      dataIndex: 'reportsApproved',
      key: 'reportsApproved',
      align: 'right' as const,
      sorter: (a: RadiologistWorkloadDto, b: RadiologistWorkloadDto) => a.reportsApproved - b.reportsApproved,
      render: (v: number) => <Tag color="green">{v}</Tag>,
    },
  ];

  const labColumns = [
    { title: 'Bác sĩ chỉ định', dataIndex: 'fullName', key: 'fullName' },
    {
      title: 'Số phiếu XN',
      dataIndex: 'labRequestsOrdered',
      key: 'labRequestsOrdered',
      align: 'right' as const,
      sorter: (a: TechnicianWorkloadDto, b: TechnicianWorkloadDto) => a.labRequestsOrdered - b.labRequestsOrdered,
      render: (v: number) => <Tag color="cyan">{v}</Tag>,
    },
  ];

  const exportCurrent = (tab: string) => {
    if (!data) return;
    const name = `Workload_${tab}_${dayjs(range[0]).format('YYYYMMDD')}-${dayjs(range[1]).format('YYYYMMDD')}`;
    if (tab === 'doctors') {
      exportToExcel(data.doctors as unknown as Record<string, unknown>[], [
        { key: 'fullName', header: 'Bác sĩ' },
        { key: 'examinationCount', header: 'Lượt khám' },
        { key: 'prescriptionCount', header: 'Đơn thuốc' },
        { key: 'serviceRequestCount', header: 'Phiếu chỉ định' },
      ], name, 'Bác sĩ');
    } else if (tab === 'radiologists') {
      exportToExcel(data.radiologists as unknown as Record<string, unknown>[], [
        { key: 'fullName', header: 'Người dùng' },
        { key: 'studiesRequested', header: 'Chỉ định CĐHA' },
        { key: 'studiesPerformedAsTech', header: 'Chụp (KTV)' },
        { key: 'reportsApproved', header: 'Đọc KQ' },
      ], name, 'CĐHA');
    } else {
      exportToExcel(data.technicians as unknown as Record<string, unknown>[], [
        { key: 'fullName', header: 'BS chỉ định XN' },
        { key: 'labRequestsOrdered', header: 'Số phiếu XN' },
      ], name, 'XN');
    }
  };

  return (
    <div>
      <Card>
        <Space style={{ marginBottom: 16 }} size="middle" wrap>
          <Title level={4} style={{ margin: 0 }}>
            <TeamOutlined /> Thống kê workload BS/KTV
          </Title>
          <RangePicker
            value={range}
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
            format="DD/MM/YYYY"
            allowClear={false}
          />
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Làm mới
          </Button>
        </Space>

        <Tabs
          items={[
            {
              key: 'doctors',
              label: <Space><MedicineBoxOutlined /> Bác sĩ ({data?.doctors.length ?? 0})</Space>,
              children: (
                <>
                  <div style={{ textAlign: 'right', marginBottom: 8 }}>
                    <Button icon={<FileExcelOutlined />} size="small" onClick={() => exportCurrent('doctors')}>
                      Xuất Excel
                    </Button>
                  </div>
                  <Table
                    rowKey="userId"
                    size="small"
                    loading={loading}
                    dataSource={data?.doctors ?? []}
                    columns={doctorColumns}
                    pagination={{ pageSize: 20 }}
                  />
                </>
              ),
            },
            {
              key: 'radiologists',
              label: <Space><PictureOutlined /> CĐHA ({data?.radiologists.length ?? 0})</Space>,
              children: (
                <>
                  <div style={{ textAlign: 'right', marginBottom: 8 }}>
                    <Button icon={<FileExcelOutlined />} size="small" onClick={() => exportCurrent('radiologists')}>
                      Xuất Excel
                    </Button>
                  </div>
                  <Table
                    rowKey="userId"
                    size="small"
                    loading={loading}
                    dataSource={data?.radiologists ?? []}
                    columns={radiologistColumns}
                    pagination={{ pageSize: 20 }}
                  />
                </>
              ),
            },
            {
              key: 'technicians',
              label: <Space><ExperimentOutlined /> XN ({data?.technicians.length ?? 0})</Space>,
              children: (
                <>
                  <div style={{ textAlign: 'right', marginBottom: 8 }}>
                    <Button icon={<FileExcelOutlined />} size="small" onClick={() => exportCurrent('technicians')}>
                      Xuất Excel
                    </Button>
                  </div>
                  <Table
                    rowKey="userId"
                    size="small"
                    loading={loading}
                    dataSource={data?.technicians ?? []}
                    columns={labColumns}
                    pagination={{ pageSize: 20 }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
