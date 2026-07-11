// Panel ATTT Cấp độ 3 (NĐ 85/2016/NĐ-CP) + báo cáo truy cập dữ liệu nhạy cảm —
// port v1 pages/system-admin/ComplianceTab.tsx sang v2.
// v1 dùng expandable row cho recent accesses; v2 chuyển thành row-click → DrawerShell.

import React, { useCallback, useEffect, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getComplianceSummary, getSensitiveAccessReport,
  type ComplianceSummaryDto, type SensitiveDataAccessReportDto,
} from '../../modules/system/api/security';
import {
  KpiStrip, DataTable, DrawerShell, DrSec, StatusBadge, Btn, type ColumnDef,
} from '../_v2kit';
import { getNestedData } from './helpers';

const { RangePicker } = DatePicker;

const CompliancePanel: React.FC = () => {
  const [summary, setSummary] = useState<ComplianceSummaryDto | null>(null);
  const [report, setReport] = useState<SensitiveDataAccessReportDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [selUser, setSelUser] = useState<SensitiveDataAccessReportDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, reportRes] = await Promise.allSettled([
        getComplianceSummary(),
        getSensitiveAccessReport(dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD'), 50),
      ]);
      if (summaryRes.status === 'fulfilled') setSummary(getNestedData<ComplianceSummaryDto | null>(summaryRes.value.data, null));
      if (reportRes.status === 'fulfilled') setReport(getNestedData<SensitiveDataAccessReportDto[]>(reportRes.value.data, []));
    } catch { /* keep current */ }
    finally { setLoading(false); }
  }, [dateRange]);
  useEffect(() => { load(); }, [load]);

  const twoFaPct = summary?.totalUsers ? Math.round((summary.usersWithTwoFactor / summary.totalUsers) * 100) : 0;
  const backupHoursAgo = summary?.lastBackupDate ? dayjs().diff(dayjs(summary.lastBackupDate), 'hour') : null;

  const columns: ColumnDef<SensitiveDataAccessReportDto>[] = [
    { key: 'user', label: 'Người dùng', render: (r) => `${r.userFullName || r.userName}${r.userName ? ` (@${r.userName})` : ''}` },
    { key: 'totalAccesses', label: 'Tổng truy cập', width: 130, render: (r) => (
      <StatusBadge tone={r.totalAccesses > 50 ? 'crit' : r.totalAccesses > 20 ? 'warn' : 'ok'}>{r.totalAccesses}</StatusBadge>
    ) },
    { key: 'mostRecent', label: 'Truy cập gần nhất', mono: true, width: 150, render: (r) => {
      const recent = r.recentAccesses?.[0];
      return recent ? dayjs(recent.timestamp).format('DD/MM/YYYY HH:mm') : '—';
    } },
    { key: 'mainEntityType', label: 'Đối tượng chính', render: (r) => {
      const types = [...new Set(r.recentAccesses?.map((a) => a.entityType) || [])];
      return types.length ? (
        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          {types.map((t) => <StatusBadge key={t}>{t}</StatusBadge>)}
        </span>
      ) : '—';
    } },
  ];

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng người dùng', val: summary?.totalUsers ?? 0 },
        { lbl: 'Đang hoạt động', val: summary?.activeUsers ?? 0, tone: 'ok' },
        { lbl: 'Bật 2FA', val: twoFaPct, unit: '%', sub: `${summary?.usersWithTwoFactor ?? 0}/${summary?.totalUsers ?? 0} người dùng`, tone: (summary?.usersWithTwoFactor ?? 0) > 0 ? 'ok' : 'crit' },
        { lbl: 'TDE (mã hoá DL)', val: summary?.tdeEnabled ? 'BẬT' : 'TẮT', tone: summary?.tdeEnabled ? 'ok' : 'crit' },
        { lbl: 'Mã hoá cột', val: summary?.columnEncryptionEnabled ? 'BẬT' : 'TẮT', tone: summary?.columnEncryptionEnabled ? 'ok' : 'crit' },
        { lbl: 'Sao lưu gần nhất', val: summary?.lastBackupDate ? dayjs(summary.lastBackupDate).format('DD/MM HH:mm') : 'Chưa có', tone: backupHoursAgo == null ? 'crit' : backupHoursAgo > 24 ? 'warn' : 'ok' },
        { lbl: 'Nhật ký (30 ngày)', val: summary?.auditLogsLast30Days ?? 0 },
        { lbl: 'Truy cập nhạy cảm (30 ngày)', val: summary?.sensitiveAccessLast30Days ?? 0, tone: (summary?.sensitiveAccessLast30Days ?? 0) > 100 ? 'crit' : 'ok' },
      ]} />

      <div className="ab-tools">
        <span style={{ fontWeight: 600 }}>Báo cáo truy cập dữ liệu nhạy cảm</span>
        <RangePicker format="DD/MM/YYYY" value={dateRange}
          onChange={(dates) => { if (dates && dates[0] && dates[1]) setDateRange([dates[0], dates[1]]); }} />
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>Làm mới</Btn>
      </div>

      <DataTable<SensitiveDataAccessReportDto> columns={columns} data={report} rowKey={(r) => r.userId}
        onRowClick={(r) => setSelUser(r)}
        empty={loading ? 'Đang tải…' : 'Không có truy cập nhạy cảm trong khoảng thời gian này'} />

      <DrawerShell open={!!selUser} onClose={() => setSelUser(null)}
        title={selUser ? (selUser.userFullName || selUser.userName) : ''} sub={selUser?.userName ? `@${selUser.userName}` : ''} size="lg">
        {selUser && (
          <DrSec title={`Truy cập gần đây (${selUser.recentAccesses?.length || 0})`}>
            <DataTable<NonNullable<SensitiveDataAccessReportDto['recentAccesses']>[number]>
              columns={[
                { key: 'timestamp', label: 'Thời gian', mono: true, width: 150, render: (a) => a.timestamp ? dayjs(a.timestamp).format('DD/MM/YY HH:mm:ss') : '—' },
                { key: 'entityType', label: 'Đối tượng', width: 110, render: (a) => a.entityType || '—' },
                { key: 'entityId', label: 'ID', mono: true, width: 130, render: (a) => (a.entityId || '').toString().slice(0, 12) || '—' },
                { key: 'requestPath', label: 'Đường dẫn', mono: true, render: (a) => a.requestPath || '—' },
                { key: 'module', label: 'Phân hệ', width: 110, render: (a) => a.module ? <StatusBadge tone="info">{a.module}</StatusBadge> : '—' },
              ]}
              data={selUser.recentAccesses || []}
              rowKey={(a) => `${a.timestamp}-${a.entityId}`}
              empty="Không có bản ghi" />
          </DrSec>
        )}
      </DrawerShell>
    </>
  );
};

export default CompliancePanel;
