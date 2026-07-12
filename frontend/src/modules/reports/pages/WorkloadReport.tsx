import React, { useCallback, useEffect, useState } from 'react';
import * as file from '../../../services/file.service';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getWorkload, type WorkloadReportDto, type DoctorWorkloadDto,
  type RadiologistWorkloadDto, type TechnicianWorkloadDto,
} from '../api/workloadReport';
import { exportToExcel } from '../../../utils/excelExport';
import {
  KpiStrip, TopTabs, DataTable, StatusBadge, Btn, tk, ti, tw,
  type ColumnDef,
} from '../../../pages-v2/_v2kit';

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
    // 3 nhóm shape khác nhau (doctors/radiologists/technicians) → view chung cho CSV
    type CsvRow = Record<string, unknown>;
    const rows: CsvRow[] = (tab === 'doctors' ? data.doctors : tab === 'radiologists' ? data.radiologists : data.technicians) as unknown as CsvRow[];
    if (rows.length === 0) { tw('Không có dữ liệu'); return; }
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(',')].concat(rows.map((r) => keys.map((k) => r[k] ?? '').join(','))).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    file.downloadBlob(blob, `workload-${tab}-${range[0].format('YYYYMMDD')}-${range[1].format('YYYYMMDD')}.csv`);
    tk('Đã xuất CSV');
  };

  // #352 P4: parity v1 — Excel export per-tab (header tiếng Việt, cùng utils/excelExport)
  const exportExcel = () => {
    if (!data) { tw('Chưa có dữ liệu'); return; }
    const name = `Workload_${tab}_${range[0].format('YYYYMMDD')}-${range[1].format('YYYYMMDD')}`;
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
    tk('Đã xuất Excel');
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
          <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
          <Btn variant="ghost" icon="download" onClick={exportCsv}>Xuất CSV</Btn>
          <Btn variant="primary" icon="download" onClick={exportExcel}>Xuất Excel</Btn>
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <RangePicker value={range} onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
          format="DD/MM/YYYY" allowClear={false} />
        <Btn variant="ghost" icon="x" onClick={() => setRange([dayjs().subtract(30, 'day').startOf('day'), dayjs().endOf('day')])}>Reset</Btn>
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
