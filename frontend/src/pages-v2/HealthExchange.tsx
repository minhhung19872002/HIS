import React, { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  getConnections, createConnection, updateConnection, testConnection, activateConnection, deactivateConnection,
  syncAll,
  type HIEConnectionDto, type CreateConnectionDto,
} from '../api/healthExchange';
import { normalizeArrayResponse } from '../utils/apiNormalize';
import {
  KpiStrip, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn, CrudModal,
  StatusTabs, DrawerShell, DrSec, DrField, tk, ti, tw, te, Ico, useListData, useTabCounts,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

const CONN_FIELDS: CrudFieldCfg[] = [
  { key: 'connectionName', label: 'Tên kết nối', required: true },
  { key: 'connectionType', label: 'Loại kết nối', type: 'select', required: true, options: [
    { value: 'BHXH', label: 'BHXH' }, { value: 'MOH', label: 'Bộ Y tế (MOH)' }, { value: 'CDC', label: 'CDC' },
    { value: 'Hospital', label: 'Bệnh viện' }, { value: 'Lab', label: 'Xét nghiệm' }, { value: 'Pharmacy', label: 'Nhà thuốc' }] },
  { key: 'partnerCode', label: 'Mã đối tác', required: true },
  { key: 'partnerName', label: 'Tên đối tác', required: true },
  { key: 'endpoint', label: 'Endpoint URL', required: true, placeholder: 'https://...' },
  { key: 'protocol', label: 'Protocol', type: 'select', required: true, options: [
    { value: 'REST', label: 'REST' }, { value: 'SOAP', label: 'SOAP' }, { value: 'HL7', label: 'HL7' }, { value: 'FHIR', label: 'FHIR' }] },
  { key: 'dataExchangeFormat', label: 'Định dạng dữ liệu', type: 'select', required: true, options: [
    { value: 'JSON', label: 'JSON' }, { value: 'XML', label: 'XML' }, { value: 'HL7v2', label: 'HL7 v2' }] },
  { key: 'authType', label: 'Xác thực', type: 'select', required: true, options: [
    { value: 'OAuth2', label: 'OAuth2' }, { value: 'APIKey', label: 'API Key' }, { value: 'Certificate', label: 'Chứng thư số' }, { value: 'Basic', label: 'Basic Auth' }] },
  { key: 'supportedOperations', label: 'Hoạt động hỗ trợ', type: 'multiselect', options: [
    { value: 'Query', label: 'Query (tra cứu)' }, { value: 'Submit', label: 'Submit (gửi)' },
    { value: 'Subscribe', label: 'Subscribe (đăng ký)' }, { value: 'Notify', label: 'Notify (thông báo)' }] },
];

const PER = 18;

type StatusKey = 'active' | 'inactive' | 'error';
const STATUS_TABS = [
  { v: 'active' as StatusKey,   l: 'Hoạt động', tone: 'ok' as const },
  { v: 'inactive' as StatusKey, l: 'Tạm dừng',  tone: 'warn' as const },
  { v: 'error' as StatusKey,    l: 'Lỗi',       tone: 'crit' as const },
];

const statusKey = (n: number): StatusKey => n === 1 ? 'active' : n === 3 ? 'error' : 'inactive';

const HealthExchangeV2: React.FC = () => {
  const { rows: items, loading, reload } = useListData<HIEConnectionDto>(
    useCallback(() => getConnections().then((r) => normalizeArrayResponse<HIEConnectionDto>(r)), []),
    useCallback(() => ti('Không tải được kết nối HIE'), []),
  );
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<HIEConnectionDto | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);

  const openCreate = () => { setCrudInit({ protocol: 'REST', dataExchangeFormat: 'JSON', authType: 'APIKey', connectionType: 'BHXH', supportedOperations: [] }); setCrudOpen(true); };
  const openEdit = (r: HIEConnectionDto) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const doTest = async (r: HIEConnectionDto) => {
    try {
      const res = await testConnection(r.id);
      const d = res.data as { success?: boolean; message?: string } | undefined;
      const ok = d?.success !== false;
      (ok ? tk : tw)(d?.message || (ok ? `Kết nối ${r.connectionName} OK` : 'Kết nối thất bại'));
      reload();
    } catch { te('Test kết nối thất bại'); }
  };
  const toggleActive = async (r: HIEConnectionDto) => {
    try {
      if (r.status === 1) { await deactivateConnection(r.id); tk('Đã tạm dừng kết nối'); }
      else { await activateConnection(r.id); tk('Đã kích hoạt kết nối'); }
      reload();
    } catch { te('Đổi trạng thái thất bại'); }
  };


  const types = useMemo(() => {
    const set = new Set(items.map((r) => r.connectionType).filter(Boolean));
    return Array.from(set).map((t) => ({ v: t, l: t }));
  }, [items]);

  const counts = useTabCounts(items, STATUS_TABS, (r) => statusKey(r.status));

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (fType && r.connectionType !== fType) return false;
      if (!k) return true;
      return [r.connectionName, r.connectionCode, r.partnerName].some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const totalErr = items.reduce((s, r) => s + (r.errorCount || 0), 0);

  const cols: ColumnDef<HIEConnectionDto>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.connectionCode || '—' },
    { key: 'name', label: 'Tên kết nối', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.connectionName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.partnerName}</div>
      </div>
    ) },
    { key: 'type', label: 'Loại', render: (r) => r.connectionTypeName || r.connectionType },
    { key: 'protocol', label: 'Protocol', mono: true, render: (r) => `${r.protocol} · ${r.dataExchangeFormat}` },
    { key: 'last', label: 'Đồng bộ cuối', mono: true, render: (r) => r.lastSyncAt ? dayjs(r.lastSyncAt).fromNow() : '—' },
    { key: 'err', label: 'Lỗi', mono: true, render: (r) => (r.errorCount || 0) > 0
      ? <span style={{ color: 'var(--a-rd-text)' }}>{r.errorCount}</span>
      : <span style={{ color: 'var(--t-3)' }}>0</span>
    },
    { key: 'status', label: 'Trạng thái', render: (r) => {
      const s = statusKey(r.status);
      const tone = s === 'active' ? 'ok' : s === 'error' ? 'crit' : 'warn';
      return <StatusBadge tone={tone} dot>{r.statusName || STATUS_TABS.find((x) => x.v === s)?.l}</StatusBadge>;
    } },
  ];

  const actions = (r: HIEConnectionDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="refresh" title="Test kết nối" onClick={() => doTest(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      <ActBtn ic={r.status === 1 ? 'x' : 'check'} title={r.status === 1 ? 'Tạm dừng' : 'Kích hoạt'} tone={r.status === 1 ? 'crit' : undefined} onClick={() => toggleActive(r)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng kết nối', val: items.length, sub: `${types.length} loại` },
        { lbl: 'Hoạt động', val: counts.active || 0, sub: 'đang chạy', tone: 'ok' },
        { lbl: 'Tạm dừng', val: counts.inactive || 0, sub: 'inactive', tone: 'warn' },
        { lbl: 'Lỗi', val: counts.error || 0, sub: 'cần xử lý', tone: 'crit' },
        { lbl: 'Tổng lỗi 24h', val: totalErr, sub: 'sự cố', tone: totalErr > 0 ? 'warn' : 'ok' },
        { lbl: 'Đối tác', val: new Set(items.map((r) => r.partnerCode)).size, sub: 'BHXH/MOH/Lab' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên / đối tác…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại kết nối" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={reload}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" disabled={syncing} onClick={async () => {
          setSyncing(true);
          try {
            const res = await syncAll();
            const d = res.data as { synced?: number; failed?: number; message?: string } | undefined;
            if (d?.failed && d.failed > 0) {
              tw(`Đồng bộ xong: ${d.synced ?? 0} thành công, ${d.failed} thất bại`);
            } else {
              tk(d?.message || `Đồng bộ hoàn tất${d?.synced != null ? ` (${d.synced} kết nối)` : ''}`);
            }
            reload();
          } catch { te('Đồng bộ thất bại'); }
          finally { setSyncing(false); }
        }}>
          <Ico name="cloud" size={12} /> {syncing ? 'Đang đồng bộ…' : 'Đồng bộ tất cả'}
        </Btn>
        <Btn variant="primary" onClick={openCreate}>
          <Ico name="plus" size={12} /> Thêm kết nối
        </Btn>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<HIEConnectionDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có kết nối HIE nào'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel?.connectionName ?? ''}
        sub={sel ? `${sel.connectionCode} · ${sel.partnerName}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => { if (sel) doTest(sel); }}>
            <Ico name="refresh" size={12} /> Test kết nối
          </Btn>
          <Btn variant="primary" onClick={() => { if (sel) { openEdit(sel); setSel(null); } }}>
            <Ico name="edit" size={12} /> Chỉnh sửa
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin chung">
            <DrField lbl="Mã">{sel.connectionCode}</DrField>
            <DrField lbl="Tên">{sel.connectionName}</DrField>
            <DrField lbl="Loại">{sel.connectionTypeName || sel.connectionType}</DrField>
            <DrField lbl="Đối tác">{sel.partnerCode} — {sel.partnerName}</DrField>
            <DrField lbl="Endpoint"><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{sel.endpoint}</span></DrField>
            <DrField lbl="Protocol"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.protocol} · {sel.dataExchangeFormat}</span></DrField>
            <DrField lbl="Auth">{sel.authType}</DrField>
          </DrSec>
          <DrSec title="Trạng thái & lịch sử">
            <DrField lbl="Trạng thái">
              <StatusBadge tone={statusKey(sel.status) === 'active' ? 'ok' : statusKey(sel.status) === 'error' ? 'crit' : 'warn'} dot>
                {sel.statusName || STATUS_TABS.find((x) => x.v === statusKey(sel.status))?.l}
              </StatusBadge>
            </DrField>
            <DrField lbl="Kết nối cuối">{sel.lastConnectedAt ? dayjs(sel.lastConnectedAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Đồng bộ cuối">{sel.lastSyncAt ? dayjs(sel.lastSyncAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Số lỗi"><span style={{ color: (sel.errorCount || 0) > 0 ? 'var(--a-rd-text)' : 'var(--t-2)' }}>{sel.errorCount}</span></DrField>
            <DrField lbl="Lỗi gần nhất">{sel.lastError || '—'}</DrField>
          </DrSec>
          <DrSec title="Hoạt động hỗ trợ">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)' }}>
              {(sel.supportedOperations || []).map((op, i) => (
                <span key={i} className="ab-stat info" style={{ height: 22, padding: '0 8px', fontSize: 'var(--fs-xs)' }}>{op}</span>
              ))}
              {(!sel.supportedOperations || sel.supportedOperations.length === 0) && (
                <span style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>—</span>
              )}
            </div>
          </DrSec>
          {sel.certificateExpiry && (
            <DrSec title="Chứng thư">
              <DrField lbl="Hết hạn">{dayjs(sel.certificateExpiry).format('DD/MM/YYYY')}</DrField>
            </DrSec>
          )}
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật kết nối HIE' : 'Thêm kết nối HIE'}
        fields={CONN_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          const dto = { credentials: {}, ...v, supportedOperations: (v.supportedOperations as string[]) || [] } as unknown as CreateConnectionDto;
          if (editing && crudInit?.id) await updateConnection(crudInit.id as string, dto);
          else await createConnection(dto);
          tk(editing ? 'Đã cập nhật kết nối' : 'Đã thêm kết nối');
          reload();
        }}
      />
    </div>
  );
};

export default HealthExchangeV2;
