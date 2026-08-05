/**
 * Báo cáo CĐHA — sổ đăng ký theo QĐ4069 (CĐHA / siêu âm / TDCN), thống kê, doanh thu
 * và đối chiếu định mức tiêu hao. Mỗi tab tải đúng báo cáo của nó và xuất được ra Excel.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  KpiStrip, TopTabs, DataTable, StatusBadge, Btn, Ico, tk, tw,
  fmtVNDg, fmtDMYg, type ColumnDef,
} from '@/_v2kit';
import {
  getRadiologyRegister, getUltrasoundRegister, getFunctionalTestRegister,
  getStatistics, getRevenueReport, getConsumptionNormReport, exportReportToExcel,
  type RadiologyRegisterItemDto, type UltrasoundRegisterItemDto,
  type FunctionalTestRegisterItemDto, type RadiologyStatisticsDto,
  type RadiologyRevenueReportDto, type ConsumptionNormReportDto,
} from '../api/ris/report';

const { RangePicker } = DatePicker;

type Tab = 'register' | 'ultrasound' | 'functional' | 'statistics' | 'revenue' | 'consumption';

/** `report` là reportType mà backend nhận cho việc xuất Excel. */
const TABS: Array<{ v: Tab; l: string; ic: string; report: string }> = [
  { v: 'register',    l: 'Sổ CĐHA',           ic: 'file-text', report: 'radiology-register' },
  { v: 'ultrasound',  l: 'Sổ siêu âm',        ic: 'file-text', report: 'ultrasound-register' },
  { v: 'functional',  l: 'Sổ TDCN',           ic: 'file-text', report: 'functional-test-register' },
  { v: 'statistics',  l: 'Thống kê',          ic: 'activity',  report: 'statistics' },
  { v: 'revenue',     l: 'Doanh thu',         ic: 'money',     report: 'revenue' },
  { v: 'consumption', l: 'Định mức tiêu hao', ic: 'medicine',  report: 'consumption-norm' },
];

/** Dòng phẳng của báo cáo tiêu hao: gộp dịch vụ + vật tư để hiển thị một bảng. */
interface ConsumptionRow {
  key: string;
  serviceCode: string;
  serviceName: string;
  examCount: number;
  itemCode: string;
  itemName: string;
  unit: string;
  normQuantity: number;
  actualQuantity: number;
  variance: number;
}

const RadiologyReportsV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('register');
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [register, setRegister] = useState<RadiologyRegisterItemDto[]>([]);
  const [ultrasound, setUltrasound] = useState<UltrasoundRegisterItemDto[]>([]);
  const [functional, setFunctional] = useState<FunctionalTestRegisterItemDto[]>([]);
  const [stats, setStats] = useState<RadiologyStatisticsDto | null>(null);
  const [revenue, setRevenue] = useState<RadiologyRevenueReportDto | null>(null);
  const [consumption, setConsumption] = useState<ConsumptionNormReportDto | null>(null);

  const from = range[0].format('YYYY-MM-DD');
  const to = range[1].format('YYYY-MM-DD');
  const current = TABS.find((t) => t.v === tab)!;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      switch (tab) {
        case 'register': setRegister((await getRadiologyRegister(from, to)).data?.items || []); break;
        case 'ultrasound': setUltrasound((await getUltrasoundRegister(from, to)).data?.items || []); break;
        case 'functional': setFunctional((await getFunctionalTestRegister(from, to)).data?.items || []); break;
        case 'statistics': setStats((await getStatistics(from, to)).data || null); break;
        case 'revenue': setRevenue((await getRevenueReport(from, to)).data || null); break;
        case 'consumption': setConsumption((await getConsumptionNormReport(from, to)).data || null); break;
      }
    } catch {
      tw('Không tải được báo cáo');
    } finally {
      setLoading(false);
    }
  }, [tab, from, to]);

  useEffect(() => { load(); }, [load]);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const response = await exportReportToExcel(current.report, from, to);
      const blob = new Blob([response.data as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${current.report}-${from}-${to}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      tk('Đã tải file Excel');
    } catch {
      tw('Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  };

  const consumptionRows = useMemo<ConsumptionRow[]>(
    () => (consumption?.byService || []).flatMap((s) =>
      s.items.map((i) => ({
        key: `${s.serviceId}:${i.itemId}`,
        serviceCode: s.serviceCode,
        serviceName: s.serviceName,
        examCount: s.examCount,
        itemCode: i.itemCode,
        itemName: i.itemName,
        unit: i.unit,
        normQuantity: i.normQuantity,
        actualQuantity: i.actualQuantity,
        variance: i.variance,
      }))),
    [consumption],
  );

  const kpis = useMemo(() => {
    const period = { lbl: 'Kỳ báo cáo', val: `${fmtDMYg(from)} → ${fmtDMYg(to)}`, sub: 'từ ngày → đến ngày', tone: 'info' as const };
    switch (tab) {
      case 'register':
        return [period, { lbl: 'Số ca ghi sổ', val: register.length, sub: 'phiếu đã thực hiện', tone: 'ok' as const }];
      case 'ultrasound':
        return [period, { lbl: 'Số ca siêu âm', val: ultrasound.length, sub: 'đã thực hiện', tone: 'ok' as const }];
      case 'functional':
        return [period, { lbl: 'Số ca TDCN', val: functional.length, sub: 'đã thực hiện', tone: 'ok' as const }];
      case 'statistics':
        return [
          period,
          { lbl: 'Phiếu chỉ định', val: stats?.totalOrders ?? 0, sub: 'trong kỳ', tone: 'info' as const },
          { lbl: 'Đã hoàn thành', val: stats?.completedExams ?? 0, sub: `chờ: ${stats?.pendingExams ?? 0}`, tone: 'ok' as const },
          { lbl: 'TAT trung bình', val: `${stats?.averageTATMinutes ?? 0} phút`, sub: 'chỉ định → xong ca chụp', tone: 'warn' as const },
        ];
      case 'revenue':
        return [
          period,
          { lbl: 'Tổng doanh thu', val: fmtVNDg(revenue?.totalRevenue ?? 0), sub: `${revenue?.totalExams ?? 0} ca`, tone: 'ok' as const },
          { lbl: 'BHYT chi trả', val: fmtVNDg(revenue?.insuranceRevenue ?? 0), sub: 'quỹ BHYT', tone: 'info' as const },
          { lbl: 'Người bệnh trả', val: fmtVNDg(revenue?.patientRevenue ?? 0), sub: 'thu trực tiếp', tone: 'warn' as const },
        ];
      case 'consumption':
        return [
          period,
          { lbl: 'Dịch vụ có phát sinh', val: consumption?.byService.length ?? 0, sub: 'đã kê vật tư', tone: 'info' as const },
          {
            lbl: 'Dòng vượt định mức',
            val: consumptionRows.filter((r) => r.variance > 0).length,
            sub: 'thực dùng > định mức',
            tone: 'crit' as const,
          },
        ];
    }
  }, [tab, from, to, register, ultrasound, functional, stats, revenue, consumption, consumptionRows]);

  const registerCols: ColumnDef<RadiologyRegisterItemDto>[] = [
    { key: 'no', label: 'STT', width: 60, render: (r) => r.rowNumber },
    { key: 'date', label: 'Ngày TH', width: 110, render: (r) => fmtDMYg(r.examDate) },
    { key: 'code', label: 'Mã BN', code: true, width: 150, render: (r) => r.patientCode },
    { key: 'name', label: 'Họ tên', render: (r) => <b>{r.patientName}</b> },
    { key: 'age', label: 'Tuổi', width: 70, render: (r) => r.age ?? '—' },
    { key: 'sex', label: 'Giới', width: 70, render: (r) => r.gender || '—' },
    { key: 'svc', label: 'Dịch vụ', render: (r) => r.serviceName },
    { key: 'part', label: 'Vùng chụp', width: 120, render: (r) => r.bodyPart || '—' },
    { key: 'tech', label: 'Máy', width: 140, render: (r) => r.technique || '—' },
    { key: 'concl', label: 'Kết luận', render: (r) => r.conclusion || '—' },
    { key: 'doctor', label: 'Bác sĩ', width: 150, render: (r) => r.doctorName || '—' },
  ];

  const ultrasoundCols: ColumnDef<UltrasoundRegisterItemDto>[] = [
    { key: 'no', label: 'STT', width: 60, render: (r) => r.rowNumber },
    { key: 'date', label: 'Ngày TH', width: 110, render: (r) => fmtDMYg(r.examDate) },
    { key: 'code', label: 'Mã BN', code: true, width: 150, render: (r) => r.patientCode },
    { key: 'name', label: 'Họ tên', render: (r) => <b>{r.patientName}</b> },
    { key: 'age', label: 'Tuổi', width: 70, render: (r) => r.age ?? '—' },
    { key: 'sex', label: 'Giới', width: 70, render: (r) => r.gender || '—' },
    { key: 'type', label: 'Loại siêu âm', render: (r) => r.examType },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => r.diagnosis || '—' },
    { key: 'concl', label: 'Kết luận', render: (r) => r.conclusion || '—' },
    { key: 'doctor', label: 'Bác sĩ', width: 150, render: (r) => r.doctorName || '—' },
  ];

  const functionalCols: ColumnDef<FunctionalTestRegisterItemDto>[] = [
    { key: 'no', label: 'STT', width: 60, render: (r) => r.rowNumber },
    { key: 'date', label: 'Ngày TH', width: 110, render: (r) => fmtDMYg(r.examDate) },
    { key: 'code', label: 'Mã BN', code: true, width: 150, render: (r) => r.patientCode },
    { key: 'name', label: 'Họ tên', render: (r) => <b>{r.patientName}</b> },
    { key: 'age', label: 'Tuổi', width: 70, render: (r) => r.age ?? '—' },
    { key: 'type', label: 'Loại thăm dò', render: (r) => r.testType },
    { key: 'concl', label: 'Kết luận', render: (r) => r.conclusion || '—' },
    { key: 'tech', label: 'KTV', width: 140, render: (r) => r.technicianName || '—' },
    { key: 'doctor', label: 'Bác sĩ', width: 150, render: (r) => r.doctorName || '—' },
  ];

  const consumptionCols: ColumnDef<ConsumptionRow>[] = [
    { key: 'svcCode', label: 'Mã DV', code: true, width: 130, render: (r) => r.serviceCode },
    { key: 'svc', label: 'Dịch vụ', render: (r) => r.serviceName },
    { key: 'exams', label: 'Số ca kê', width: 100, render: (r) => r.examCount },
    { key: 'itemCode', label: 'Mã VT', code: true, width: 120, render: (r) => r.itemCode || '—' },
    { key: 'item', label: 'Thuốc / vật tư', render: (r) => <b>{r.itemName || '—'}</b> },
    { key: 'unit', label: 'ĐVT', width: 90, render: (r) => r.unit || '—' },
    { key: 'norm', label: 'Định mức', width: 110, render: (r) => r.normQuantity },
    { key: 'actual', label: 'Thực dùng', width: 110, render: (r) => r.actualQuantity },
    {
      key: 'var', label: 'Chênh lệch', width: 130,
      render: (r) => (r.variance > 0
        ? <StatusBadge tone="crit">+{r.variance}</StatusBadge>
        : r.variance < 0
          ? <StatusBadge tone="warn">{r.variance}</StatusBadge>
          : <StatusBadge tone="ok">0</StatusBadge>),
    },
  ];

  const emptyText = loading ? 'Đang tải…' : 'Không có dữ liệu trong kỳ';

  return (
    <div className="ab">
      <KpiStrip items={kpis} />
      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} />

      <div className="ab-toolbar">
        <RangePicker
          value={range}
          onChange={(v) => v?.[0] && v?.[1] && setRange([v[0], v[1]])}
          format="DD/MM/YYYY"
          allowClear={false}
        />
        <span className="spacer" />
        <Btn onClick={load} disabled={loading}>
          <Ico name="refresh" size={12} /> {loading ? 'Đang tải…' : 'Làm mới'}
        </Btn>
        <Btn variant="primary" onClick={exportExcel} disabled={exporting || loading}>
          <Ico name="download" size={12} /> {exporting ? 'Đang xuất…' : 'Xuất Excel'}
        </Btn>
      </div>

      {tab === 'register' && (
        <DataTable<RadiologyRegisterItemDto> columns={registerCols} data={register}
          rowKey={(r) => `${r.rowNumber}`} empty={emptyText} />
      )}
      {tab === 'ultrasound' && (
        <DataTable<UltrasoundRegisterItemDto> columns={ultrasoundCols} data={ultrasound}
          rowKey={(r) => `${r.rowNumber}`} empty={emptyText} />
      )}
      {tab === 'functional' && (
        <DataTable<FunctionalTestRegisterItemDto> columns={functionalCols} data={functional}
          rowKey={(r) => `${r.rowNumber}`} empty={emptyText} />
      )}
      {tab === 'statistics' && <StatisticsPanel stats={stats} loading={loading} />}
      {tab === 'revenue' && <RevenuePanel revenue={revenue} loading={loading} />}
      {tab === 'consumption' && (
        <DataTable<ConsumptionRow> columns={consumptionCols} data={consumptionRows}
          rowKey={(r) => r.key}
          empty={loading ? 'Đang tải…' : 'Chưa có phiếu kê vật tư nào trong kỳ'} />
      )}
    </div>
  );
};

const StatisticsPanel: React.FC<{ stats: RadiologyStatisticsDto | null; loading: boolean }> = ({ stats, loading }) => {
  const empty = loading ? 'Đang tải…' : 'Không có dữ liệu trong kỳ';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--space-12)', padding: 'var(--space-12)' }}>
      <ReportPanel title="Theo loại dịch vụ">
        <DataTable
          columns={[
            { key: 'name', label: 'Loại dịch vụ', render: (r) => r.serviceTypeName },
            { key: 'count', label: 'Số phiếu', width: 100, render: (r) => r.examCount },
            { key: 'done', label: 'Hoàn thành', width: 110, render: (r) => r.completedCount },
            { key: 'pct', label: 'Tỷ lệ %', width: 100, render: (r) => r.percentage },
          ]}
          data={stats?.byServiceType || []} rowKey={(r) => r.serviceType} empty={empty} />
      </ReportPanel>
      <ReportPanel title="Theo máy chụp">
        <DataTable
          columns={[
            { key: 'name', label: 'Máy', render: (r) => r.modalityName },
            { key: 'count', label: 'Số ca', width: 100, render: (r) => r.examCount },
            { key: 'util', label: 'Tỷ trọng %', width: 120, render: (r) => r.utilizationPercent },
          ]}
          data={stats?.byModality || []} rowKey={(r) => r.modalityId} empty={empty} />
      </ReportPanel>
      <ReportPanel title="Theo ngày">
        <DataTable
          columns={[
            { key: 'date', label: 'Ngày', width: 130, render: (r) => fmtDMYg(r.date) },
            { key: 'count', label: 'Số phiếu', width: 110, render: (r) => r.examCount },
            { key: 'done', label: 'Hoàn thành', width: 120, render: (r) => r.completedCount },
          ]}
          data={stats?.byDay || []} rowKey={(r) => r.date} empty={empty} />
      </ReportPanel>
    </div>
  );
};

const RevenuePanel: React.FC<{ revenue: RadiologyRevenueReportDto | null; loading: boolean }> = ({ revenue, loading }) => {
  const empty = loading ? 'Đang tải…' : 'Không có dữ liệu trong kỳ';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--space-12)', padding: 'var(--space-12)' }}>
      <ReportPanel title="Theo loại dịch vụ">
        <DataTable
          columns={[
            { key: 'name', label: 'Loại dịch vụ', render: (r) => r.serviceTypeName },
            { key: 'count', label: 'Số ca', width: 90, render: (r) => r.examCount },
            { key: 'rev', label: 'Doanh thu', width: 140, render: (r) => fmtVNDg(r.revenue) },
            { key: 'bh', label: 'BHYT', width: 130, render: (r) => fmtVNDg(r.insuranceRevenue) },
          ]}
          data={revenue?.byServiceType || []} rowKey={(r) => r.serviceType} empty={empty} />
      </ReportPanel>
      <ReportPanel title="Theo bác sĩ chỉ định">
        <DataTable
          columns={[
            { key: 'name', label: 'Bác sĩ', render: (r) => r.doctorName },
            { key: 'count', label: 'Số ca', width: 90, render: (r) => r.examCount },
            { key: 'rev', label: 'Doanh thu', width: 140, render: (r) => fmtVNDg(r.revenue) },
          ]}
          data={revenue?.byDoctor || []} rowKey={(r) => r.doctorId} empty={empty} />
      </ReportPanel>
      <ReportPanel title="Theo ngày">
        <DataTable
          columns={[
            { key: 'date', label: 'Ngày', width: 130, render: (r) => fmtDMYg(r.date) },
            { key: 'count', label: 'Số ca', width: 90, render: (r) => r.examCount },
            { key: 'rev', label: 'Doanh thu', width: 140, render: (r) => fmtVNDg(r.revenue) },
          ]}
          data={revenue?.byDay || []} rowKey={(r) => r.date} empty={empty} />
      </ReportPanel>
    </div>
  );
};

const ReportPanel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="panel" style={{ padding: 0 }}>
    <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
      <span>{title}</span>
    </div>
    {children}
  </div>
);

export default RadiologyReportsV2;
