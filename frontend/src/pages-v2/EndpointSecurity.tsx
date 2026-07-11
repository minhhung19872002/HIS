import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getDevices, registerDevice, updateDeviceStatus, deleteDevice, getIncidents } from '../modules/administration/api/endpointSecurity';
import type { EndpointDeviceDto, RegisterDeviceDto, UpdateDeviceStatusDto, SecurityIncidentDto } from '../modules/administration/api/endpointSecurity';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn, CrudModal,
  DrawerShell, DrSec, DrField, tk, ti, te, cf,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

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

  const openCreate = () => { setCrudInit({}); setCrudOpen(true); };
  const openEdit = (r: EndpointDeviceDto) => {
    setCrudInit({ id: r.id, status: r.status, isCompliant: r.isCompliant, complianceNotes: r.complianceNotes, antivirusStatus: r.antivirusStatus, agentVersion: r.agentVersion });
    setCrudOpen(true);
  };
  const del = (r: EndpointDeviceDto) => cf(`Xoá máy "${r.hostname}"?`, async () => {
    try { await deleteDevice(r.id); tk('Đã xoá'); load(); } catch { te('Xoá thất bại'); }
  }, { tone: 'crit', confirm: 'Xoá' });

  const load = async () => {
    setLoading(true);
    try {
      // getDevices đã unwrap `r.data` → trả EndpointDeviceDto[]
      const r = await getDevices(search || undefined);
      setItems(Array.isArray(r) ? r : []);
    } catch { ti('Không tải được danh sách máy'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

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

  return (
    <div className="ab">
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
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="ghost" icon="alert" onClick={async () => {
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
        }}>Sự cố ATTT</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Thêm máy</Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<EndpointDeviceDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có máy nào'}
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
        {incidentLoading && <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải danh sách sự cố…</div>}
        {!incidentLoading && incidents.length === 0 && (
          <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Không có sự cố ATTT nào</div>
        )}
        {!incidentLoading && incidents.length > 0 && (
          <table className="ab-tbl" style={{ width: '100%', fontSize: 'var(--fs-sm)' }}>
            <thead>
              <tr>
                <th>Mã SC</th><th>Tiêu đề</th><th>Mức độ</th>
                <th>Danh mục</th><th>Máy bị ảnh hưởng</th><th>Trạng thái</th><th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc.id}>
                  <td className="mono">{inc.incidentCode}</td>
                  <td>{inc.title}</td>
                  <td>
                    <StatusBadge tone={inc.severity >= 4 ? 'crit' : inc.severity >= 3 ? 'warn' : 'info'} dot>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrawerShell>
    </div>
  );
};

export default EndpointSecurityV2;
