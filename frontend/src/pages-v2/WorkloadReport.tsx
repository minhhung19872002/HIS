import React, { useCallback, useEffect, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getWorkload, type WorkloadReportDto, type DoctorWorkloadDto,
  type RadiologistWorkloadDto, type TechnicianWorkloadDto,
} from '../api/workloadReport';
import {
  KpiStrip, TopTabs, DataTable, StatusBadge, Ico, tk, ti, tw,
  type ColumnDef,
} from './_v2kit';

const { RangePicker } = DatePicker;

type Tab = 'doctors' | 'radiologists' | 'technicians';

const WorkloadReportV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('doctors');
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day').startOf('day'), dayjs().endOf('day')]);
  const [data, setData] = useState<WorkloadReportDto | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getWorkload(range[0].toISOString(), range[1].toISOString());
      setData(d);
    } catch { ti('Không tải được báo cáo workload'); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const doctorCols: ColumnDef<DoctorWorkloadDto>[] = [
    { key: 'name', label: 'Bác sĩ', render: (r) => <b>{r.fullName}</b> },
    { key: 'exam', label: 'Lượt khám', mono: true, render: (r) => <StatusBadge tone="info">{r.examinationCount}</StatusBadge> },
    { key: 'rx', label: 'Đơn thuốc', mono: true, render: (r) => <StatusBadge tone="ok">{r.prescriptionCount}</StatusBadge> },
    { key: 'svc', label: 'Phiếu chỉ định', mono: true, render: (r) => <StatusBadge tone="warn">{r.serviceRequestCount}</StatusBadge> },
    { key: 'tot', label: 'Tổng', mono: true, render: (r) => <b>{r.examinationCount + r.prescriptionCount + r.serviceRequestCount}</b> },
  ];

  const radiologistCols: ColumnDef<RadiologistWorkloadDto>[] = [
    { key: 'name', label: 'Người dùng', render: (r) => <b>{r.fullName}</b> },
    { key: 'req', label: 'Chỉ định CĐHA', mono: true, render: (r) => <StatusBadge tone="info">{r.studiesRequested}</StatusBadge> },
    { key: 'tech', label: 'Chụp (KTV)', mono: true, render: (r) => <StatusBadge tone="warn">{r.studiesPerformedAsTech}</StatusBadge> },
    { key: 'app', label: 'Đọc KQ', mono: true, render: (r) => <StatusBadge tone="ok">{r.reportsApproved}</StatusBadge> },
  ];

  const labCols: ColumnDef<TechnicianWorkloadDto>[] = [
    { key: 'name', label: 'BS chỉ định', render: (r) => <b>{r.fullName}</b> },
    { key: 'lab', label: 'Số phiếu XN', mono: true, render: (r) => <StatusBadge tone="info">{r.labRequestsOrdered}</StatusBadge> },
  ];

  const exportCsv = () => {
    if (!data) { tw('Chưa có dữ liệu'); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = tab === 'doctors' ? data.doctors : tab === 'radiologists' ? data.radiologists : data.technicians;
    if (rows.length === 0) { tw('Không có dữ liệu'); return; }
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(',')].concat(rows.map((r) => keys.map((k) => r[k] ?? '').join(','))).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `workload-${tab}-${range[0].format('YYYYMMDD')}-${range[1].format('YYYYMMDD')}.csv`;
    a.click();
    tk('Đã xuất CSV');
  };

  const TABS = [
    { v: 'doctors' as Tab,      l: `Bác sĩ (${data?.doctors.length ?? 0})`,           ic: 'medicine' },
    { v: 'radiologists' as Tab, l: `CĐHA (${data?.radiologists.length ?? 0})`,        ic: 'qr' },
    { v: 'technicians' as Tab,  l: `Xét nghiệm (${data?.technicians.length ?? 0})`,   ic: 'activity' },
  ];

  const totalDoc = data?.doctors.reduce((s, d) => s + d.examinationCount + d.prescriptionCount + d.serviceRequestCount, 0) || 0;
  const totalRad = data?.radiologists.reduce((s, d) => s + d.studiesRequested + d.studiesPerformedAsTech + d.reportsApproved, 0) || 0;
  const totalLab = data?.technicians.reduce((s, d) => s + d.labRequestsOrdered, 0) || 0;

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Số bác sĩ', val: data?.doctors.length ?? 0, sub: 'có hoạt động', tone: 'info' },
        { lbl: 'Số NV CĐHA', val: data?.radiologists.length ?? 0, sub: 'có hoạt động', tone: 'warn' },
        { lbl: 'Tổng workload', val: totalDoc + totalRad + totalLab, sub: 'tất cả phiếu', tone: 'ok' },
        { lbl: 'Khoảng thời gian', val: range[1].diff(range[0], 'day') + 1, unit: 'ngày', sub: range[0].format('DD/MM') + '–' + range[1].format('DD/MM') },
      ]} />

      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} actions={
        <>
          <button className="ab-btn ghost" type="button" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </button>
          <button className="ab-btn primary" type="button" onClick={exportCsv}>
            <Ico name="download" size={12} /> Xuất CSV
          </button>
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <RangePicker value={range} onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
          format="DD/MM/YYYY" allowClear={false} />
        <button className="ab-btn ghost" type="button" onClick={() => setRange([dayjs().subtract(30, 'day').startOf('day'), dayjs().endOf('day')])}>
          <Ico name="x" size={12} /> Reset
        </button>
      </div>

      {tab === 'doctors' && (
        <DataTable<DoctorWorkloadDto> columns={doctorCols} data={data?.doctors || []} rowKey={(r) => r.userId}
          empty={loading ? 'Đang tải…' : 'Không có dữ liệu'} />
      )}
      {tab === 'radiologists' && (
        <DataTable<RadiologistWorkloadDto> columns={radiologistCols} data={data?.radiologists || []} rowKey={(r) => r.userId}
          empty={loading ? 'Đang tải…' : 'Không có dữ liệu'} />
      )}
      {tab === 'technicians' && (
        <DataTable<TechnicianWorkloadDto> columns={labCols} data={data?.technicians || []} rowKey={(r) => r.userId}
          empty={loading ? 'Đang tải…' : 'Không có dữ liệu'} />
      )}
    </div>
  );
};

export default WorkloadReportV2;
