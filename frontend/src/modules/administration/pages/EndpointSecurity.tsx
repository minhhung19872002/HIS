import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  getDevices, registerDevice, updateDeviceStatus, deleteDevice, getIncidents,
  createIncident, resolveIncident, getSoftwareInventory, flagUnauthorized, getSecurityDashboard,
} from '../api/endpointSecurity';
import type {
  EndpointDeviceDto, RegisterDeviceDto, UpdateDeviceStatusDto, SecurityIncidentDto,
  CreateIncidentDto, InstalledSoftwareDto, EndpointSecurityDashboardDto,
} from '../api/endpointSecurity';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn, CrudModal,
  DrawerShell, DrSec, DrField, tk, ti, te, cf,
  type TopTab, type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';

const DEVICE_FIELDS: CrudFieldCfg[] = [
  { key: 'hostname', label: 'Hostname', required: true },
  { key: 'ipAddress', label: 'Địa chỉ IP', placeholder: 'VD: 192.168.1.50' },
  { key: 'macAddress', label: 'Địa chỉ MAC' },
  { key: 'operatingSystem', label: 'Hệ điều hành', placeholder: 'Windows / Linux / macOS' },
  { key: 'osVersion', label: 'Phiên bản OS' },
  { key: 'antivirusName', label: 'Phần mềm AV' },
  { key: 'antivirusStatus', label: 'Trạng thái AV' },
  { key: 'departmentName', label: 'Khoa / Phòng' },
  { key: 'assignedUser', label: 'Người sử dụng' },
  { key: 'agentVersion', label: 'Phiên bản agent' },
];

const DEVICE_UPDATE_FIELDS: CrudFieldCfg[] = [
  { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [
    { value: 0, label: 'Offline' }, { value: 1, label: 'Online' }, { value: 2, label: 'Cảnh báo' }, { value: 3, label: 'Nguy hiểm' }] },
  { key: 'isCompliant', label: 'Tuân thủ chính sách', type: 'switch' },
  { key: 'complianceNotes', label: 'Ghi chú tuân thủ', type: 'textarea' },
  { key: 'antivirusStatus', label: 'Trạng thái AV' },
  { key: 'agentVersion', label: 'Phiên bản agent' },
];

const INCIDENT_FIELDS: CrudFieldCfg[] = [
  { key: 'title', label: 'Tiêu đề', required: true },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
  { key: 'severity', label: 'Mức độ', type: 'select', required: true, options: [
    { value: 1, label: 'Nghiêm trọng' }, { value: 2, label: 'Cao' }, { value: 3, label: 'Trung bình' }, { value: 4, label: 'Thấp' }] },
  { key: 'category', label: 'Phân loại', type: 'select', options: [
    { value: 'Malware', label: 'Malware' }, { value: 'Phishing', label: 'Phishing' }, { value: 'Unauthorized', label: 'Unauthorized' },
    { value: 'DataBreach', label: 'DataBreach' }, { value: 'DDoS', label: 'DDoS' }, { value: 'Other', label: 'Other' }] },
  { key: 'affectedSystem', label: 'Hệ thống bị ảnh hưởng' },
  { key: 'reportedByName', label: 'Người báo cáo' },
];

const RESOLVE_FIELDS: CrudFieldCfg[] = [
  { key: 'resolution', label: 'Cách xử lý', type: 'textarea', required: true },
  { key: 'rootCause', label: 'Nguyên nhân gốc', type: 'textarea' },
];

type PageTab = 'overview' | 'devices';
const PAGE_TABS: TopTab<PageTab>[] = [
  { v: 'overview', l: 'Tổng quan',   ic: 'activity' },
  { v: 'devices',  l: 'Danh sách máy', ic: 'grid' },
];

type SKey = 'compliant' | 'noncompliant' | 'offline';
const STATUS_TABS = [
  { v: 'compliant' as SKey,    l: 'Tuân thủ',     tone: 'ok' as const },
  { v: 'noncompliant' as SKey, l: 'Chưa tuân thủ', tone: 'crit' as const },
  { v: 'offline' as SKey,      l: 'Ngắt kết nối',  tone: 'warn' as const },
];

const sKey = (r: EndpointDeviceDto): SKey => {
  const last = r.lastSeenAt ? dayjs(r.lastSeenAt) : null;
  const offline = !last || last.isBefore(dayjs().subtract(7, 'day'));
  if (offline) return 'offline';
  return r.isCompliant ? 'compliant' : 'noncompliant';
};

const PER = 18;

const EndpointSecurityV2: React.FC = () => {
  const [tab, setTab] = useState<PageTab>('overview');
  const [dashboard, setDashboard] = useState<EndpointSecurityDashboardDto | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [items, setItems] = useState<EndpointDeviceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fOs, setFOs] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<EndpointDeviceDto | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const editing = !!crudInit?.id;
  // Incidents drawer
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [incidents, setIncidents] = useState<SecurityIncidentDto[]>([]);
  const [incidentCreateOpen, setIncidentCreateOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<SecurityIncidentDto | null>(null);
  // Software inventory drawer
  const [softwareOpen, setSoftwareOpen] = useState(false);
  const [softwareLoading, setSoftwareLoading] = useState(false);
  const [software, setSoftware] = useState<InstalledSoftwareDto[]>([]);

  const openCreate = () => { setCrudInit({}); setCrudOpen(true); };
  const openEdit = (r: EndpointDeviceDto) => {
    setCrudInit({ id: r.id, status: r.status, isCompliant: r.isCompliant, complianceNotes: r.complianceNotes, antivirusStatus: r.antivirusStatus, agentVersion: r.agentVersion });
    setCrudOpen(true);
  };
  const del = (r: EndpointDeviceDto) => cf(`Xoá máy "${r.hostname}"?`, async () => {
    try { await deleteDevice(r.id); tk('Đã xoá'); load(); } catch { te('Xoá thất bại'); }
  }, { tone: 'crit', confirm: 'Xoá' });

  const loadDashboard = async () => {
    setDashLoading(true);
    try {
      const d = await getSecurityDashboard();
      setDashboard(d);
    } catch { /* silent — overview falls back gracefully */ }
    finally { setDashLoading(false); }
  };

  const load = async () => {
    setLoading(true);
    try {
      // getDevices đã unwrap `r.data` → trả EndpointDeviceDto[]
      const r = await getDevices(search || undefined);
      setItems(Array.isArray(r) ? r : []);
    } catch { ti('Không tải được danh sách máy'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadDashboard(); load(); /* eslint-disable-next-line */ }, []);

  const openIncidents = async () => {
    setIncidentOpen(true);
    setIncidentLoading(true);
    setIncidents([]);
    try {
      const data = await getIncidents();
      setIncidents(Array.isArray(data) ? data : []);
    } catch {
      te('Không tải được danh sách sự cố ATTT');
      setIncidentOpen(false);
    } finally {
      setIncidentLoading(false);
    }
  };
  const refreshIncidents = async () => {
    setIncidentLoading(true);
    try {
      const data = await getIncidents();
      setIncidents(Array.isArray(data) ? data : []);
    } catch { te('Không tải được danh sách sự cố ATTT'); }
    finally { setIncidentLoading(false); }
  };

  const openSoftware = async () => {
    setSoftwareOpen(true);
    setSoftwareLoading(true);
    setSoftware([]);
    try {
      const data = await getSoftwareInventory();
      setSoftware(Array.isArray(data) ? data : []);
    } catch {
      te('Không tải được danh mục phần mềm');
      setSoftwareOpen(false);
    } finally {
      setSoftwareLoading(false);
    }
  };
  const handleFlagUnauthorized = (sw: InstalledSoftwareDto) => cf(`Đánh dấu "${sw.softwareName}" là phần mềm không được phép?`, async () => {
    try {
      await flagUnauthorized(sw.id);
      tk('Đã đánh dấu phần mềm không được phép');
      setSoftware((prev) => prev.map((s) => (s.id === sw.id ? { ...s, isAuthorized: false } : s)));
    } catch { te('Không thể cập nhật phần mềm'); }
  }, { tone: 'crit', confirm: 'Đánh dấu' });

  const oses = useMemo(() => {
    const set = new Set(items.map((r) => r.operatingSystem).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r) !== stab) return false;
      if (fOs && r.operatingSystem !== fOs) return false;
      if (!k) return true;
      return [r.hostname, r.ipAddress, r.macAddress, r.assignedUser, r.departmentName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fOs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<EndpointDeviceDto>[] = [
    { key: 'host', label: 'Hostname', code: true, render: (r) => r.hostname },
    { key: 'net', label: 'IP · MAC', mono: true, render: (r) => (
      <div>
        <div>{r.ipAddress || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>{r.macAddress || '—'}</div>
      </div>
    ) },
    { key: 'os', label: 'OS', render: (r) => `${r.operatingSystem || '—'} ${r.osVersion || ''}`.trim() },
    { key: 'av', label: 'AV', render: (r) => (
      <div>
        <div style={{ fontSize: 'var(--fs-sm)' }}>{r.antivirusName || '—'}</div>
        {r.antivirusLastUpdate && <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>upd {dayjs(r.antivirusLastUpdate).format('DD/MM')}</div>}
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'user', label: 'NSD', render: (r) => r.assignedUser || '—' },
    { key: 'last', label: 'Last seen', mono: true, render: (r) => {
      if (!r.lastSeenAt) return '—';
      const d = dayjs(r.lastSeenAt);
      const days = dayjs().diff(d, 'day');
      const tone = days > 7 ? 'var(--a-rd-text)' : days > 1 ? 'var(--a-or-text)' : undefined;
      return <span style={{ color: tone }}>{d.format('DD/MM HH:mm')}</span>;
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const k = sKey(r);
      const t = STATUS_TABS.find((x) => x.v === k);
      return <StatusBadge tone={t?.tone || 'info'} dot>{t?.l}</StatusBadge>;
    } },
  ];

  const actions = (r: EndpointDeviceDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Cập nhật trạng thái" onClick={() => openEdit(r)} />
      <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => del(r)} />
    </div>
  );

  const statusLabel = (s: string) => {
    switch (s) {
      case 'Online': return 'Online';
      case 'Offline': return 'Offline';
      case 'Warning': return 'Cảnh báo';
      case 'Critical': return 'Nguy hiểm';
      default: return s;
    }
  };

  return (
    <div className="ab">
      <TopTabs<PageTab> tab={tab} setTab={setTab} tabs={PAGE_TABS} />

      {tab === 'overview' && (
        <div>
          <KpiStrip items={[
            { lbl: 'Tổng máy', val: dashboard?.totalDevices ?? items.length, sub: 'tất cả' },
            { lbl: 'Tuân thủ', val: dashboard?.compliantDevices ?? counts.compliant ?? 0, sub: dashboard ? `${dashboard.compliancePercent}%` : '—', tone: 'ok' },
            { lbl: 'Sự cố mở', val: dashboard?.openIncidents ?? 0, sub: `${dashboard?.criticalIncidents ?? 0} nghiêm trọng`, tone: (dashboard?.openIncidents ?? 0) > 0 ? 'crit' : 'ok' },
            { lbl: 'PM không phép', val: dashboard?.unauthorizedSoftware ?? 0, sub: `/${dashboard?.totalSoftware ?? 0} phần mềm`, tone: (dashboard?.unauthorizedSoftware ?? 0) > 0 ? 'warn' : 'ok' },
          ]} />

          {dashLoading && <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải tổng quan…</div>}

          {!dashLoading && dashboard && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-16)', padding: 'var(--space-16)' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 'var(--space-16)' }}>
                <div style={{ fontWeight: 600, marginBottom: 'var(--space-12)', fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>Thiết bị theo trạng thái</div>
                {dashboard.devicesByStatus.length === 0 && (
                  <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Không có dữ liệu</div>
                )}
                {dashboard.devicesByStatus.map((d) => {
                  const pct = dashboard.totalDevices > 0 ? Math.round(d.count / dashboard.totalDevices * 100) : 0;
                  const tone = d.status === 'Critical' ? 'var(--a-rd-text)' : d.status === 'Warning' ? 'var(--a-or-text)' : d.status === 'Offline' ? 'var(--t-2)' : 'var(--a-gr-text)';
                  return (
                    <div key={d.status} style={{ marginBottom: 'var(--space-10)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', marginBottom: 4 }}>
                        <span style={{ color: tone }}>{statusLabel(d.status)}</span>
                        <span style={{ color: 'var(--t-2)' }}>{d.count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: tone, borderRadius: 3, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 'var(--space-16)' }}>
                <div style={{ fontWeight: 600, marginBottom: 'var(--space-12)', fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>Sự cố theo danh mục</div>
                {dashboard.incidentsByCategory.length === 0 && (
                  <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Không có sự cố nào</div>
                )}
                {dashboard.incidentsByCategory.map((c) => (
                  <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-6) 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 'var(--fs-sm)' }}>{c.category}</span>
                    <StatusBadge tone={c.count > 5 ? 'crit' : c.count > 0 ? 'warn' : 'ok'}>
                      {c.count}
                    </StatusBadge>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 'var(--space-16)', gridColumn: '1 / -1' }}>
                <div style={{ fontWeight: 600, marginBottom: 'var(--space-12)', fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>Tóm tắt hệ thống</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-12)' }}>
                  {[
                    { l: 'Tổng máy',       v: dashboard.totalDevices },
                    { l: 'Máy tuân thủ',   v: dashboard.compliantDevices },
                    { l: 'Tổng phần mềm',  v: dashboard.totalSoftware },
                    { l: 'PM không phép',   v: dashboard.unauthorizedSoftware },
                    { l: 'SC nghiêm trọng', v: dashboard.criticalIncidents },
                  ].map((s) => (
                    <div key={s.l} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--t-1)' }}>{s.v}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!dashLoading && !dashboard && (
            <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>
              Không tải được dữ liệu tổng quan.{' '}
              <button type="button" style={{ color: 'var(--a-bl-text)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={loadDashboard}>Thử lại</button>
            </div>
          )}
        </div>
      )}

      {tab === 'devices' && <>
      <KpiStrip items={[
        { lbl: 'Tổng máy', val: items.length, sub: 'tất cả' },
        { lbl: 'Tuân thủ', val: counts.compliant || 0, sub: `${Math.round(((counts.compliant || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Vi phạm', val: counts.noncompliant || 0, sub: 'cần khắc phục', tone: 'crit' },
        { lbl: 'Mất kết nối', val: counts.offline || 0, sub: '> 7 ngày', tone: 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm hostname / IP / MAC / NSD…" />
        <Filter value={fOs} onChange={setFOs} options={oses} placeholder="▾ Hệ điều hành" />
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFOs(''); setStab('all'); }}>Bỏ lọc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" loading={loading} onClick={load}>Làm mới</Btn>
        <Btn variant="ghost" icon="grid" onClick={openSoftware}>Phần mềm</Btn>
        <Btn variant="ghost" icon="alert" onClick={openIncidents}>Sự cố ATTT</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Thêm máy</Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<EndpointDeviceDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        loading={loading}
        empty="Chưa có máy nào"
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.hostname : ''}
        sub={sel ? `${sel.ipAddress || '—'} · ${sel.operatingSystem || '—'}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn icon="activity" onClick={() => { if (sel) tk(`Yêu cầu quét bảo mật: ${sel.hostname}`); }}>Quét bảo mật</Btn>
          <Btn variant="primary" icon="edit" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>Cập nhật</Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Định danh">
            <DrField lbl="Hostname"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.hostname}</span></DrField>
            <DrField lbl="IP"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.ipAddress || '—'}</span></DrField>
            <DrField lbl="MAC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.macAddress || '—'}</span></DrField>
            <DrField lbl="OS">{sel.operatingSystem || '—'} {sel.osVersion || ''}</DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="NSD">{sel.assignedUser || '—'}</DrField>
          </DrSec>
          <DrSec title="Antivirus">
            <DrField lbl="AV">{sel.antivirusName || '—'}</DrField>
            <DrField lbl="AV trạng thái">{sel.antivirusStatus || '—'}</DrField>
            {sel.antivirusLastUpdate && <DrField lbl="AV cập nhật">{dayjs(sel.antivirusLastUpdate).format('DD/MM/YYYY HH:mm')}</DrField>}
          </DrSec>
          <DrSec title="Tuân thủ & kết nối">
            <DrField lbl="Tuân thủ">
              {sel.isCompliant
                ? <StatusBadge tone="ok" dot>Đạt</StatusBadge>
                : <StatusBadge tone="crit" dot>Vi phạm</StatusBadge>}
            </DrField>
            {sel.complianceNotes && <DrField lbl="Ghi chú TT">{sel.complianceNotes}</DrField>}
            <DrField lbl="Last seen">{sel.lastSeenAt ? dayjs(sel.lastSeenAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Agent version">{sel.agentVersion || '—'}</DrField>
            <DrField lbl="Trạng thái">{sel.statusText}</DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={editing ? 'Cập nhật trạng thái máy' : 'Đăng ký máy mới'}
        fields={editing ? DEVICE_UPDATE_FIELDS : DEVICE_FIELDS}
        initial={crudInit}
        size="md"
        onSubmit={async (v, isEdit) => {
          if (isEdit && crudInit?.id) await updateDeviceStatus(crudInit.id as string, v as unknown as UpdateDeviceStatusDto);
          else await registerDevice(v as unknown as RegisterDeviceDto);
          tk(isEdit ? 'Đã cập nhật trạng thái máy' : 'Đã đăng ký máy');
          load();
        }}
      />

      {/* Drawer sự cố ATTT */}
      <DrawerShell
        open={incidentOpen}
        onClose={() => setIncidentOpen(false)}
        size="lg"
        title="Sự cố An toàn thông tin"
        sub={incidentLoading ? 'Đang tải…' : `${incidents.length} sự cố`}
        footer={<Btn variant="ghost" onClick={() => setIncidentOpen(false)}>Đóng</Btn>}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-8)' }}>
          <Btn variant="primary" icon="plus" onClick={() => setIncidentCreateOpen(true)}>Tạo sự cố</Btn>
        </div>
        {incidentLoading && <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải danh sách sự cố…</div>}
        {!incidentLoading && incidents.length === 0 && (
          <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Không có sự cố ATTT nào</div>
        )}
        {!incidentLoading && incidents.length > 0 && (
          <table className="ab-tbl" style={{ width: '100%', fontSize: 'var(--fs-sm)' }}>
            <thead>
              <tr>
                <th>Mã SC</th><th>Tiêu đề</th><th>Mức độ</th>
                <th>Danh mục</th><th>Máy bị ảnh hưởng</th><th>Trạng thái</th><th>Thời gian</th><th></th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc.id}>
                  <td className="mono">{inc.incidentCode}</td>
                  <td>{inc.title}</td>
                  <td>
                    <StatusBadge tone={inc.severity <= 1 ? 'crit' : inc.severity === 2 ? 'warn' : inc.severity >= 4 ? 'ok' : 'info'} dot>
                      {inc.severityText}
                    </StatusBadge>
                  </td>
                  <td>{inc.category || '—'}</td>
                  <td className="mono">{inc.deviceHostname || '—'}</td>
                  <td>
                    <StatusBadge tone={inc.status >= 3 ? 'ok' : inc.status >= 2 ? 'warn' : 'crit'} dot>
                      {inc.statusText}
                    </StatusBadge>
                  </td>
                  <td className="mono">{dayjs(inc.createdAt).format('DD/MM HH:mm')}</td>
                  <td>
                    {inc.status < 3 && <ActBtn ic="check" title="Xử lý" onClick={() => setResolveTarget(inc)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrawerShell>

      <CrudModal
        open={incidentCreateOpen}
        onClose={() => setIncidentCreateOpen(false)}
        title="Tạo sự cố an ninh"
        fields={INCIDENT_FIELDS}
        initial={{ severity: 3 }}
        size="md"
        onSubmit={async (v) => {
          await createIncident(v as unknown as CreateIncidentDto);
          tk('Đã tạo sự cố');
          refreshIncidents();
        }}
      />

      <CrudModal
        open={!!resolveTarget}
        onClose={() => setResolveTarget(null)}
        title={resolveTarget ? `Xử lý sự cố: ${resolveTarget.incidentCode}` : 'Xử lý sự cố'}
        fields={RESOLVE_FIELDS}
        initial={{}}
        size="md"
        onSubmit={async (v) => {
          if (!resolveTarget) return;
          await resolveIncident(resolveTarget.id, v.resolution as string, v.rootCause as string | undefined);
          tk('Đã xử lý sự cố');
          setResolveTarget(null);
          refreshIncidents();
        }}
      />

      {/* Drawer phần mềm cài đặt */}
      <DrawerShell
        open={softwareOpen}
        onClose={() => setSoftwareOpen(false)}
        size="lg"
        title="Phần mềm cài đặt"
        sub={softwareLoading ? 'Đang tải…' : `${software.length} phần mềm`}
        footer={<Btn variant="ghost" onClick={() => setSoftwareOpen(false)}>Đóng</Btn>}
      >
        {softwareLoading && <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải danh mục phần mềm…</div>}
        {!softwareLoading && software.length === 0 && (
          <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Không có phần mềm nào</div>
        )}
        {!softwareLoading && software.length > 0 && (
          <table className="ab-tbl" style={{ width: '100%', fontSize: 'var(--fs-sm)' }}>
            <thead>
              <tr>
                <th>Phần mềm</th><th>Phiên bản</th><th>Nhà phát triển</th><th>Phân loại</th><th>Trạng thái</th><th></th>
              </tr>
            </thead>
            <tbody>
              {software.map((sw) => (
                <tr key={sw.id}>
                  <td>{sw.softwareName}</td>
                  <td className="mono">{sw.version || '—'}</td>
                  <td>{sw.publisher || '—'}</td>
                  <td>{sw.category || '—'}</td>
                  <td>
                    {sw.isAuthorized
                      ? <StatusBadge tone="ok" dot>Được phép</StatusBadge>
                      : <StatusBadge tone="crit" dot>Không phép</StatusBadge>}
                  </td>
                  <td>
                    {sw.isAuthorized && <ActBtn ic="trash" title="Cấm" tone="crit" onClick={() => handleFlagUnauthorized(sw)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrawerShell>
      </>}
    </div>
  );
};

export default EndpointSecurityV2;
