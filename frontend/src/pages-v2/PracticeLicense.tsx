import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchLicenses, createLicense, updateLicense } from '../api/practiceLicense';
import type { PracticeLicense } from '../api/practiceLicense';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti, Ico,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

const LICENSE_FIELDS: CrudFieldCfg[] = [
  { key: 'licenseCode', label: 'Mã CCHN', required: true, disabledOnEdit: true },
  { key: 'staffName', label: 'Họ tên NV', required: true },
  { key: 'staffCode', label: 'Mã NV' },
  { key: 'licenseType', label: 'Loại CCHN', type: 'select', required: true, options: [
    { value: 'doctor', label: 'Bác sĩ' }, { value: 'pharmacist', label: 'Dược sĩ' },
    { value: 'nurse', label: 'Điều dưỡng' }, { value: 'midwife', label: 'Hộ sinh' },
    { value: 'technician', label: 'KTV' }, { value: 'dentist', label: 'Nha sĩ' },
    { value: 'traditional_medicine', label: 'YHCT' }] },
  { key: 'licenseNumber', label: 'Số CCHN', required: true },
  { key: 'issueDate', label: 'Ngày cấp', type: 'date', required: true },
  { key: 'expiryDate', label: 'Ngày hết hạn', type: 'date', required: true },
  { key: 'issuingAuthority', label: 'Nơi cấp' },
  { key: 'specialty', label: 'Chuyên khoa' },
  { key: 'practiceScope', label: 'Phạm vi hành nghề', type: 'textarea' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Hợp lệ' }, { value: 1, label: 'Sắp hết hạn' }, { value: 2, label: 'Hết hạn' },
    { value: 3, label: 'Thu hồi' }, { value: 4, label: 'Đình chỉ' }] },
  { key: 'renewalDate', label: 'Ngày gia hạn', type: 'date' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const TYPE_LABEL: Record<string, string> = {
  doctor: 'Bác sĩ', pharmacist: 'Dược sĩ', nurse: 'Điều dưỡng', midwife: 'Hộ sinh',
  technician: 'KTV', dentist: 'Nha sĩ', traditional_medicine: 'YHCT',
};

const STATUS_LABEL: Record<number, string> = {
  0: 'Hợp lệ', 1: 'Sắp hết', 2: 'Hết hạn', 3: 'Thu hồi', 4: 'Tạm dừng',
};

type SKey = 'valid' | 'expiring' | 'expired' | 'revoked' | 'suspended';
const STATUS_TABS = [
  { v: 'valid' as SKey,     l: 'Hợp lệ',   tone: 'ok' as const },
  { v: 'expiring' as SKey,  l: 'Sắp hết',  tone: 'warn' as const },
  { v: 'expired' as SKey,   l: 'Hết hạn',  tone: 'crit' as const },
  { v: 'revoked' as SKey,   l: 'Thu hồi',  tone: 'crit' as const },
  { v: 'suspended' as SKey, l: 'Tạm dừng', tone: 'warn' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'valid' : n === 1 ? 'expiring' : n === 2 ? 'expired' : n === 3 ? 'revoked' : 'suspended';

const PER = 18;

const PracticeLicenseV2: React.FC = () => {
  const [items, setItems] = useState<PracticeLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<PracticeLicense | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await searchLicenses({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as PracticeLicense[];
      setItems(list);
    } catch { ti('Không tải được CCHN'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const today = dayjs();
  const types = useMemo(() => Object.entries(TYPE_LABEL).map(([v, l]) => ({ v, l })), []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fType && r.licenseType !== fType) return false;
      if (!k) return true;
      return [r.staffName, r.staffCode, r.licenseNumber, r.specialty]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<PracticeLicense>[] = [
    { key: 'no', label: 'Số CCHN', code: true, render: (r) => r.licenseNumber },
    { key: 'staff', label: 'Nhân viên', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.staffName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.staffCode}</div>
      </div>
    ) },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone="info">{TYPE_LABEL[r.licenseType] || r.licenseType}</StatusBadge>
    ) },
    { key: 'spec', label: 'Chuyên khoa', render: (r) => r.specialty || '—' },
    { key: 'issue', label: 'Cấp', mono: true, render: (r) => dayjs(r.issueDate).format('DD/MM/YYYY') },
    { key: 'exp', label: 'Hết hạn', mono: true, render: (r) => {
      const d = dayjs(r.expiryDate);
      const days = d.diff(today, 'day');
      const tone = days < 0 ? 'var(--a-rd-text)' : days < 30 ? 'var(--a-or-text)' : undefined;
      return (
        <div>
          <div style={{ color: tone, fontWeight: days < 30 ? 600 : 400 }}>{d.format('DD/MM/YYYY')}</div>
          <div style={{ fontSize: 10, color: 'var(--t-2)' }}>
            {days < 0 ? `quá ${-days}d` : days < 30 ? `còn ${days}d` : `${Math.round(days / 30)} tháng`}
          </div>
        </div>
      );
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const openCreate = () => { setCrudInit({ status: 0, licenseType: 'doctor' }); setCrudOpen(true); };
  const openEdit = (r: PracticeLicense) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  const actions = (r: PracticeLicense) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      <ActBtn ic="refresh" title="Gia hạn" onClick={() => openEdit(r)} />
    </div>
  );

  const expiringSoon = items.filter((l) => {
    const d = dayjs(l.expiryDate);
    return d.diff(today, 'day') < 30 && d.isAfter(today);
  }).length;
  const expired = items.filter((l) => dayjs(l.expiryDate).isBefore(today)).length;

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng CCHN', val: items.length, sub: 'tất cả' },
        { lbl: 'Hợp lệ', val: counts.valid || 0, sub: `${Math.round(((counts.valid || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Sắp hết hạn', val: expiringSoon, sub: '< 30 ngày', tone: 'warn' },
        { lbl: 'Đã hết hạn', val: expired, sub: 'cần xử lý', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm tên / mã NV / số CCHN…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại CCHN" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => tk('Mở cảnh báo CCHN sắp hết')}>
          <Ico name="alert" size={12} /> Cảnh báo
        </Btn>
        <Btn variant="primary" onClick={openCreate}>
          <Ico name="plus" size={12} /> CCHN mới
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<PracticeLicense>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có CCHN'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.staffName : ''}
        sub={sel ? `${sel.licenseNumber} · ${TYPE_LABEL[sel.licenseType] || sel.licenseType}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => tk('Đã in CCHN')}>
            <Ico name="print" size={12} /> In CCHN
          </Btn>
          <Btn variant="primary" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>
            <Ico name="refresh" size={12} /> Gia hạn / Sửa
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Nhân viên">
            <DrField lbl="Họ tên">{sel.staffName}</DrField>
            <DrField lbl="Mã NV"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.staffCode}</span></DrField>
          </DrSec>
          <DrSec title="Chứng chỉ">
            <DrField lbl="Số CCHN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.licenseNumber}</span></DrField>
            <DrField lbl="Loại">{TYPE_LABEL[sel.licenseType] || sel.licenseType}</DrField>
            <DrField lbl="Chuyên khoa">{sel.specialty || '—'}</DrField>
            <DrField lbl="Phạm vi">{sel.practiceScope || '—'}</DrField>
            <DrField lbl="Cấp bởi">{sel.issuingAuthority}</DrField>
          </DrSec>
          <DrSec title="Hiệu lực">
            <DrField lbl="Ngày cấp">{dayjs(sel.issueDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Hết hạn">
              <span style={{ color: dayjs(sel.expiryDate).isBefore(today) ? 'var(--a-rd-text)' : undefined, fontFamily: 'var(--font-mono)' }}>
                {dayjs(sel.expiryDate).format('DD/MM/YYYY')}
              </span>
            </DrField>
            {sel.renewalDate && <DrField lbl="Gia hạn">{dayjs(sel.renewalDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật / Gia hạn CCHN' : 'Đăng ký CCHN mới'}
        fields={LICENSE_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          if (editing && crudInit?.id) await updateLicense(String(crudInit.id), v);
          else await createLicense(v);
          tk(editing ? 'Đã cập nhật CCHN' : 'Đã đăng ký CCHN');
          load();
        }}
      />
    </div>
  );
};

export default PracticeLicenseV2;
