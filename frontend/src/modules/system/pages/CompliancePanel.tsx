// Panel ATTT Cấp độ 3 (NĐ 85/2016/NĐ-CP) — 4 báo cáo compliance qua TopTabs:
//  1. Truy cập dữ liệu nhạy cảm (port v1 ComplianceTab, giữ nguyên hành vi).
//  2. Thay đổi phân quyền — AUTHZ-5 (#371) GET /audit/permission-changes.
//  3. Tổng hợp hoạt động audit — AUTHZ-5 (#371) GET /audit/summary.
//  4. Tái chứng nhận — AUTHZ-5 (#371) inc-6: GET /audit/recertification.
// v1 dùng expandable row cho recent accesses; v2 chuyển thành row-click → DrawerShell.

import React, { useCallback, useEffect, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getComplianceSummary, getSensitiveAccessReport,
  type ComplianceSummaryDto, type SensitiveDataAccessReportDto,
} from '../api/security';
import {
  getPermissionChanges, getAuditSummary, getRecertification,
  type PermissionChangeHistoryDto, type PermissionChangeSearchDto,
  type AuditSummaryDto, type AuditCountItem,
  type RecertificationReportDto, type UserRoleRecordDto,
} from '../api/audit';
import {
  KpiStrip, DataTable, DrawerShell, DrSec, StatusBadge, Btn, TopTabs, Filter, Pager, type ColumnDef, te,
} from '@/_v2kit';
import { friendlyErrorMessage } from '@/utils/friendlyError';
import { getNestedData } from './helpers';

const { RangePicker } = DatePicker;

// ============================================================================
// Report 1 — Truy cập dữ liệu nhạy cảm (giữ nguyên logic port v1)
// ============================================================================
const SensitiveAccessReport: React.FC = () => {
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
    } catch (e) { te(friendlyErrorMessage(e)); }
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

// ============================================================================
// Report 2 — Truy vết thay đổi phân quyền (AUTHZ-5 #371)
// ============================================================================
const ACTION_OPTIONS: { v: string; l: string }[] = [
  { v: '', l: 'Tất cả' },
  { v: 'grant', l: 'Cấp' },
  { v: 'revoke', l: 'Thu hồi' },
  { v: 'modify', l: 'Sửa' },
];
const CHANGE_TYPE_OPTIONS: { v: string; l: string }[] = [
  { v: '', l: 'Tất cả' },
  { v: 'UserRole', l: 'UserRole' },
  { v: 'RolePermission', l: 'RolePermission' },
  { v: 'UserPermissionOverride', l: 'UserPermissionOverride' },
  { v: 'Delegation', l: 'Delegation' },
];
const ACTION_TONE: Record<string, 'ok' | 'crit' | 'warn' | 'info'> = { grant: 'ok', revoke: 'crit', modify: 'warn' };
const PC_PAGE_SIZE = 50;

/** Pretty-print 1 chuỗi JSON; parse lỗi → trả nguyên chuỗi gốc (raw). */
const prettyJson = (raw?: string): string => {
  if (!raw) return '—';
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
};

const PermissionChangesReport: React.FC = () => {
  const [rows, setRows] = useState<PermissionChangeHistoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()]);
  const [action, setAction] = useState('');
  const [changeType, setChangeType] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selChange, setSelChange] = useState<PermissionChangeHistoryDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: PermissionChangeSearchDto = {
        fromDate: dateRange[0].format('YYYY-MM-DD'),
        toDate: dateRange[1].format('YYYY-MM-DD'),
        action: action || undefined,
        changeType: changeType || undefined,
        pageIndex,
        pageSize: PC_PAGE_SIZE,
      };
      const res = await getPermissionChanges(params);
      const paged = getNestedData(res.data, { items: [], totalCount: 0, pageIndex: 0, pageSize: PC_PAGE_SIZE, totalPages: 1 });
      setRows(Array.isArray(paged.items) ? paged.items : []);
      setTotalCount(paged.totalCount ?? 0);
      setTotalPages(paged.totalPages ?? 1);
    } catch (e) { te(friendlyErrorMessage(e)); }
    finally { setLoading(false); }
  }, [dateRange, action, changeType, pageIndex]);
  useEffect(() => { load(); }, [load]);

  const resetAndReload = (patch: { action?: string; changeType?: string; dateRange?: [Dayjs, Dayjs] }) => {
    if (patch.action !== undefined) setAction(patch.action);
    if (patch.changeType !== undefined) setChangeType(patch.changeType);
    if (patch.dateRange !== undefined) setDateRange(patch.dateRange);
    setPageIndex(0);
  };

  const columns: ColumnDef<PermissionChangeHistoryDto>[] = [
    { key: 'changedAt', label: 'Thời gian', mono: true, width: 150, render: (r) => dayjs(r.changedAt).format('DD/MM/YYYY HH:mm') },
    { key: 'changeType', label: 'Loại thay đổi', width: 170, render: (r) => r.changeType },
    { key: 'action', label: 'Hành động', width: 110, render: (r) => (
      <StatusBadge tone={ACTION_TONE[r.action] ?? 'info'}>{r.action}</StatusBadge>
    ) },
    { key: 'targetUserName', label: 'Người dùng đích', render: (r) => r.targetUserName || (r.targetUserId ? r.targetUserId.slice(0, 8) : '—') },
    { key: 'targetRoleName', label: 'Vai trò đích', render: (r) => r.targetRoleName || '—' },
    { key: 'changedBy', label: 'Người thực hiện', render: (r) => r.changedBy || '—' },
    { key: 'reason', label: 'Lý do', render: (r) => r.reason || '—' },
  ];

  return (
    <>
      <div className="ab-tools">
        <span style={{ fontWeight: 600 }}>Truy vết thay đổi phân quyền</span>
        <RangePicker format="DD/MM/YYYY" value={dateRange}
          onChange={(dates) => { if (dates && dates[0] && dates[1]) resetAndReload({ dateRange: [dates[0], dates[1]] }); }} />
        <Filter value={action} onChange={(v) => resetAndReload({ action: v })} options={ACTION_OPTIONS} placeholder="Hành động" />
        <Filter value={changeType} onChange={(v) => resetAndReload({ changeType: v })} options={CHANGE_TYPE_OPTIONS} placeholder="Loại thay đổi" />
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>Làm mới</Btn>
      </div>

      <DataTable<PermissionChangeHistoryDto> columns={columns} data={rows} rowKey={(r) => r.id}
        onRowClick={(r) => setSelChange(r)}
        empty={loading ? 'Đang tải…' : 'Không có thay đổi phân quyền trong khoảng này'} />

      <Pager page={pageIndex} totalPages={totalPages} total={totalCount} perPage={PC_PAGE_SIZE}
        setPage={(next) => { setPageIndex(typeof next === 'function' ? next(pageIndex) : next); }} />

      <DrawerShell open={!!selChange} onClose={() => setSelChange(null)}
        title={selChange ? selChange.changeType : ''}
        sub={selChange ? dayjs(selChange.changedAt).format('DD/MM/YYYY HH:mm') : ''} size="lg">
        {selChange && (
          <>
            <DrSec title="Thông tin thay đổi">
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, fontSize: 12.5 }}>
                <div style={{ color: 'var(--t-2)' }}>Loại thay đổi</div><div>{selChange.changeType}</div>
                <div style={{ color: 'var(--t-2)' }}>Hành động</div>
                <div><StatusBadge tone={ACTION_TONE[selChange.action] ?? 'info'}>{selChange.action}</StatusBadge></div>
                <div style={{ color: 'var(--t-2)' }}>Người dùng đích</div><div>{selChange.targetUserName || selChange.targetUserId || '—'}</div>
                <div style={{ color: 'var(--t-2)' }}>Vai trò đích</div><div>{selChange.targetRoleName || '—'}</div>
                <div style={{ color: 'var(--t-2)' }}>Mã quyền</div><div>{selChange.permissionCode || '—'}</div>
                <div style={{ color: 'var(--t-2)' }}>Người thực hiện</div><div>{selChange.changedBy || '—'}</div>
                <div style={{ color: 'var(--t-2)' }}>Lý do</div><div>{selChange.reason || '—'}</div>
                <div style={{ color: 'var(--t-2)' }}>Thời gian</div><div>{dayjs(selChange.changedAt).format('DD/MM/YYYY HH:mm')}</div>
              </div>
            </DrSec>
            <DrSec title="Giá trị cũ (old)">
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{prettyJson(selChange.oldValueJson)}</pre>
            </DrSec>
            <DrSec title="Giá trị mới (new)">
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{prettyJson(selChange.newValueJson)}</pre>
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
};

// ============================================================================
// Report 3 — Tổng hợp hoạt động audit (AUTHZ-5 #371) — 3 bảng breakdown cạnh nhau
// ============================================================================
const countColumns = (labelCol: string): ColumnDef<AuditCountItem>[] => [
  { key: 'key', label: labelCol, render: (r) => r.key || '—' },
  { key: 'count', label: 'Số lượng', width: 120, render: (r) => (
    <div style={{ textAlign: 'right' }}><StatusBadge tone="info">{r.count}</StatusBadge></div>
  ) },
];

const AuditSummaryReport: React.FC = () => {
  const [summary, setSummary] = useState<AuditSummaryDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditSummary(dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD'));
      setSummary(getNestedData<AuditSummaryDto | null>(res.data, null));
    } catch (e) { te(friendlyErrorMessage(e)); }
    finally { setLoading(false); }
  }, [dateRange]);
  useEffect(() => { load(); }, [load]);

  const byAction = summary?.byAction ?? [];
  const byModule = summary?.byModule ?? [];
  const topUsers = summary?.topUsers ?? [];
  const emptyText = loading ? 'Đang tải…' : 'Không có dữ liệu';

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng sự kiện', val: summary?.totalEvents ?? 0, tone: 'info' },
        { lbl: 'Số loại hành động', val: byAction.length },
        { lbl: 'Số phân hệ', val: byModule.length },
        { lbl: 'Số người dùng', val: topUsers.length },
      ]} />

      <div className="ab-tools">
        <span style={{ fontWeight: 600 }}>Báo cáo tổng hợp hoạt động audit</span>
        <RangePicker format="DD/MM/YYYY" value={dateRange}
          onChange={(dates) => { if (dates && dates[0] && dates[1]) setDateRange([dates[0], dates[1]]); }} />
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>Làm mới</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-8)', alignItems: 'start' }}>
        <div>
          <div style={{ fontWeight: 600, padding: '6px 2px', color: 'var(--t-1)' }}>Theo hành động ({byAction.length})</div>
          <DataTable<AuditCountItem> columns={countColumns('Hành động')} data={byAction} rowKey={(r) => r.key} empty={emptyText} />
        </div>
        <div>
          <div style={{ fontWeight: 600, padding: '6px 2px', color: 'var(--t-1)' }}>Theo phân hệ ({byModule.length})</div>
          <DataTable<AuditCountItem> columns={countColumns('Phân hệ')} data={byModule} rowKey={(r) => r.key} empty={emptyText} />
        </div>
        <div>
          <div style={{ fontWeight: 600, padding: '6px 2px', color: 'var(--t-1)' }}>Top người dùng ({topUsers.length})</div>
          <DataTable<AuditCountItem> columns={countColumns('Người dùng')} data={topUsers} rowKey={(r) => r.key} empty={emptyText} />
        </div>
      </div>
    </>
  );
};

// ============================================================================
// Report 4 — Tái chứng nhận (Recertification) — ai đang có role gì hiện tại
// ============================================================================
const scopeToneMap: Record<string, 'ok' | 'info' | 'warn' | 'crit'> = {
  ORG: 'warn', BRANCH: 'info', DEPT: 'ok', OWN: 'info',
};

const RecertificationReport: React.FC = () => {
  const [report, setReport] = useState<RecertificationReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [selRecord, setSelRecord] = useState<UserRoleRecordDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRecertification();
      setReport(Array.isArray(res.data) ? null : (res.data as RecertificationReportDto));
    } catch (e) { te(friendlyErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns: ColumnDef<UserRoleRecordDto>[] = [
    { key: 'fullName', label: 'Người dùng', render: (r) => `${r.fullName}${r.username ? ` (@${r.username})` : ''}` },
    { key: 'roleName', label: 'Vai trò', render: (r) => (
      <StatusBadge tone={scopeToneMap[r.scopeType] ?? 'info'}>{r.roleName}</StatusBadge>
    ) },
    { key: 'scopeType', label: 'Phạm vi', width: 100, render: (r) => (
      <StatusBadge tone={scopeToneMap[r.scopeType] ?? 'info'}>{r.scopeType}</StatusBadge>
    ) },
    { key: 'validFrom', label: 'Hiệu lực từ', mono: true, width: 120, render: (r) => r.validFrom ? dayjs(r.validFrom).format('DD/MM/YYYY') : '—' },
    { key: 'validTo', label: 'Hết hạn', mono: true, width: 120, render: (r) => r.validTo ? dayjs(r.validTo).format('DD/MM/YYYY') : 'Vĩnh viễn' },
    { key: 'grantedBy', label: 'Gán bởi', width: 120, render: (r) => r.grantedBy ?? '—' },
  ];

  if (!report && !loading) return (
    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--t-2)' }}>
      <Btn onClick={load}>Tải báo cáo</Btn>
    </div>
  );

  const allAssignments = report?.groups.flatMap(g => g.assignments) ?? [];

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng phân quyền', val: report?.totalActiveAssignments ?? 0 },
        { lbl: 'Người dùng có quyền', val: report?.totalUsers ?? 0, tone: 'ok' },
        { lbl: 'Nhóm phạm vi', val: report?.groups.length ?? 0 },
        { lbl: 'Phạm vi ORG (rộng)', val: report?.groups.find(g => g.scopeType === 'ORG')?.totalAssignments ?? 0, tone: 'warn' },
      ]} />
      <div className="ab-tools">
        <span style={{ fontWeight: 600 }}>Tái chứng nhận phân quyền</span>
        <span style={{ color: 'var(--t-2)', fontSize: '0.85em' }}>
          {report ? `Tại: ${dayjs(report.asOf).format('DD/MM/YYYY HH:mm')}` : ''}
        </span>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>Làm mới</Btn>
      </div>
      {report?.groups.map(group => (
        <div key={group.scopeType} style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 2px', borderBottom: '1px solid var(--line)' }}>
            <StatusBadge tone={scopeToneMap[group.scopeType] ?? 'info'} dot>{group.scopeLabel}</StatusBadge>
            <span style={{ color: 'var(--t-2)', fontSize: '0.85em' }}>
              {group.totalAssignments} lần gán · {group.totalUniqueUsers} người dùng
            </span>
          </div>
          <DataTable<UserRoleRecordDto>
            columns={columns}
            data={group.assignments}
            rowKey={(r) => `${r.userId}-${r.roleCode}`}
            onRowClick={setSelRecord}
            empty={loading ? 'Đang tải…' : 'Không có phân quyền'}
          />
        </div>
      ))}
      {!loading && allAssignments.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--t-2)' }}>
          Chưa có phân quyền nào đang hoạt động
        </div>
      )}

      <DrawerShell open={!!selRecord} onClose={() => setSelRecord(null)}
        title={selRecord?.fullName ?? ''} sub={selRecord?.username ? `@${selRecord.username}` : ''}>
        {selRecord && (
          <DrSec title="Chi tiết phân quyền">
            <div className="rec-kv">
              <span>Vai trò</span><span>{selRecord.roleName} ({selRecord.roleCode})</span>
              <span>Phạm vi</span><span><StatusBadge tone={scopeToneMap[selRecord.scopeType] ?? 'info'}>{selRecord.scopeType}</StatusBadge></span>
              <span>Hiệu lực từ</span><span>{selRecord.validFrom ? dayjs(selRecord.validFrom).format('DD/MM/YYYY HH:mm') : '—'}</span>
              <span>Hết hạn</span><span>{selRecord.validTo ? dayjs(selRecord.validTo).format('DD/MM/YYYY HH:mm') : 'Vĩnh viễn'}</span>
              <span>Gán bởi</span><span>{selRecord.grantedBy ?? '—'}</span>
            </div>
          </DrSec>
        )}
      </DrawerShell>
    </>
  );
};

// ============================================================================
// Panel — 4 báo cáo qua TopTabs
// ============================================================================
type ReportTab = 'sensitive' | 'permchange' | 'summary' | 'recertify';

const CompliancePanel: React.FC = () => {
  const [reportTab, setReportTab] = useState<ReportTab>('sensitive');
  return (
    <>
      <TopTabs<ReportTab> tab={reportTab} setTab={setReportTab} tabs={[
        { v: 'sensitive', l: 'Truy cập nhạy cảm' },
        { v: 'permchange', l: 'Thay đổi phân quyền' },
        { v: 'summary', l: 'Tổng hợp audit' },
        { v: 'recertify', l: 'Tái chứng nhận' },
      ]} />
      {reportTab === 'sensitive' && <SensitiveAccessReport />}
      {reportTab === 'permchange' && <PermissionChangesReport />}
      {reportTab === 'summary' && <AuditSummaryReport />}
      {reportTab === 'recertify' && <RecertificationReport />}
    </>
  );
};

export default CompliancePanel;
