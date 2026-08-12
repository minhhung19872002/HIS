import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { searchLicenses, createLicense, updateLicense, getExpiringLicenses, renewLicense, printLicense } from '../api/practiceLicense';
import type { PracticeLicense } from '../api/practiceLicense';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { RowActions } from '../../../components/actions';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, useTabCounts, tk, ti, tw, te, Ico,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';

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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<PracticeLicense | null>(null);
  const [printing, setPrinting] = useState(false);
  const printRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await searchLicenses({
        keyword: search || undefined,
        licenseType: fType || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setItems(normalizeArrayResponse<PracticeLicense>(r));
    } catch { ti('Không tải được CCHN'); }
    finally { setLoading(false); }
  }, [search, fType, fromDate, toDate]);
  useEffect(() => { load(); }, [load]);

  const today = dayjs();
  const types = useMemo(() => Object.entries(TYPE_LABEL).map(([v, l]) => ({ v, l })), []);

  const counts = useTabCounts(items, STATUS_TABS, (r) => sKey(r.status));

  const filtered = useMemo(() =>
    items.filter((r) => stab === 'all' || sKey(r.status) === stab),
  [items, stab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<PracticeLicense>[] = [
    { key: 'no', label: 'Số CCHN', code: true, render: (r) => r.licenseNumber },
    { key: 'staff', label: 'Nhân viên', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.staffName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.staffCode}</div>
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
          <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>
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

  // --- Renew modal ---
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<PracticeLicense | null>(null);
  const [renewDate, setRenewDate] = useState('');
  const [renewSaving, setRenewSaving] = useState(false);
  // #467 khoá đồng bộ — `renewSaving` chỉ disable nút ở render kế tiếp, không chặn kịp double-click
  const renewRef = useRef(false);
  const openRenew = (r: PracticeLicense) => {
    setRenewTarget(r);
    setRenewDate(dayjs(r.expiryDate).add(1, 'year').format('YYYY-MM-DD'));
    setRenewOpen(true);
  };
  const handleRenew = async () => {
    if (!renewTarget || !renewDate) return;
    if (renewRef.current) return;   // #467 chống double-submit: gia hạn 2 lần = 2 bản ghi gia hạn
    renewRef.current = true;
    setRenewSaving(true);
    try {
      await renewLicense(renewTarget.id, { newExpiryDate: renewDate });
      tk(`Đã gia hạn CCHN ${renewTarget.staffName}`);
      setRenewOpen(false);
      load();
    } catch (e: unknown) { te(friendlyErrorMessage(e, 'Gia hạn thất bại')); }
    finally { renewRef.current = false; setRenewSaving(false); }
  };

  // --- Drawer cảnh báo CCHN sắp hết hạn ---
  const [expiringOpen, setExpiringOpen] = useState(false);
  const [expiringList, setExpiringList] = useState<PracticeLicense[]>([]);
  const [expiringLoading, setExpiringLoading] = useState(false);

  const openExpiring = async () => {
    setExpiringOpen(true);
    setExpiringLoading(true);
    try {
      const r = await getExpiringLicenses();
      setExpiringList(r);
    } catch { ti('Không tải được danh sách CCHN sắp hết'); }
    finally { setExpiringLoading(false); }
  };

  const actions = (r: PracticeLicense) => (
    <div className="ab-actions">
      <RowActions actions={[
        { key: 'view', icon: 'eye', label: 'Chi tiết', primary: true, onClick: () => setSel(r) },
        { key: 'edit', icon: 'edit', label: 'Sửa', primary: true, onClick: () => openEdit(r) },
        // confirm nằm ở drawer gia hạn (nhập ngày hết hạn mới) — không hỏi thêm ở đây
        { key: 'renew', icon: 'refresh', label: 'Gia hạn', onClick: () => openRenew(r) },
      ]} />
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
        <input type="date" style={{ height: 30, padding: '0 6px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--bg-1)', fontSize: 13 }}
          value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="Ngày cấp từ" />
        <input type="date" style={{ height: 30, padding: '0 6px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--bg-1)', fontSize: 13 }}
          value={toDate} onChange={(e) => setToDate(e.target.value)} title="Ngày cấp đến" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFType(''); setFromDate(''); setToDate(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load} loading={loading} icon="refresh">Làm mới</Btn>
        <Btn variant="ghost" onClick={openExpiring}>
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
        loading={loading}
        empty={'Chưa có CCHN'}
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
          <Btn disabled={printing} onClick={async () => {
            if (!sel) return;
            if (printRef.current) return;   // #467 chống double-submit: bấm In 2 lần = 2 tab/2 lần gọi BE
            printRef.current = true;
            setPrinting(true);
            try {
              const res = await printLicense(sel.id);
              const url = URL.createObjectURL(res.data as Blob);
              window.open(url, '_blank');
            } catch (e: unknown) {
              tw(friendlyErrorMessage(e, 'Không thể in CCHN'));
            } finally { printRef.current = false; setPrinting(false); }
          }}>
            <Ico name="print" size={12} /> {printing ? 'Đang tạo bản in…' : 'In CCHN'}
          </Btn>
          <Btn onClick={() => { if (sel) openEdit(sel); setSel(null); }}>
            <Ico name="edit" size={12} /> Sửa
          </Btn>
          <Btn variant="primary" onClick={() => { if (sel) { openRenew(sel); setSel(null); } }}>
            <Ico name="refresh" size={12} /> Gia hạn
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

      {/* ===== Drawer Cảnh báo CCHN sắp hết hạn ===== */}
      <DrawerShell
        open={expiringOpen}
        onClose={() => setExpiringOpen(false)}
        size="lg"
        title="Cảnh báo CCHN sắp hết hạn"
        sub={expiringList.length > 0 ? `${expiringList.length} CCHN cần chú ý` : 'Không có CCHN sắp hết hạn'}
      >
        {expiringLoading ? (
          <div style={{ padding: 'var(--space-24)', color: 'var(--t-2)', fontSize: 'var(--fs-md)' }}>Đang tải…</div>
        ) : expiringList.length === 0 ? (
          <div style={{ padding: 'var(--space-24)', color: 'var(--t-2)', fontSize: 'var(--fs-md)' }}>Không có CCHN sắp hết hạn trong thời gian tới.</div>
        ) : (
          <DrSec title="Danh sách CCHN sắp hết hạn">
            {expiringList.map((lic) => {
              const daysLeft = dayjs(lic.expiryDate).diff(today, 'day');
              const isExpired = daysLeft < 0;
              return (
                <div key={lic.id} style={{
                  padding: '10px 12px', marginBottom: 'var(--space-8)',
                  background: 'var(--d-1)', border: `1px solid ${isExpired ? 'var(--a-rd)' : 'var(--a-or)'}`,
                  borderRadius: 4,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--t-0)', marginBottom: 'var(--space-2)' }}>{lic.staffName}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                        {lic.staffCode} · {TYPE_LABEL[lic.licenseType] || lic.licenseType}
                        {lic.specialty ? ` · ${lic.specialty}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', fontWeight: 600,
                        color: isExpired ? 'var(--a-rd-text)' : 'var(--a-or-text)',
                      }}>
                        {dayjs(lic.expiryDate).format('DD/MM/YYYY')}
                      </div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: isExpired ? 'var(--a-rd-text)' : 'var(--a-or-text)' }}>
                        {isExpired ? `Quá hạn ${-daysLeft} ngày` : `Còn ${daysLeft} ngày`}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-8)' }}>
                    <ActBtn ic="edit" title="Gia hạn / Sửa" onClick={() => { setExpiringOpen(false); openEdit(lic); }} />
                  </div>
                </div>
              );
            })}
          </DrSec>
        )}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật CCHN' : 'Đăng ký CCHN mới'}
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

      {/* ===== Gia hạn CCHN ===== */}
      <DrawerShell
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        size="sm"
        title="Gia hạn chứng chỉ hành nghề"
        sub={renewTarget ? `${renewTarget.staffName} · ${renewTarget.licenseNumber}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setRenewOpen(false)} disabled={renewSaving}>Hủy</Btn>
          <Btn variant="primary" onClick={handleRenew} disabled={!renewDate || renewSaving}>
            {renewSaving ? 'Đang lưu…' : 'Xác nhận gia hạn'}
          </Btn>
        </>}
      >
        {renewTarget && (
          <DrSec title="Thông tin gia hạn">
            <DrField lbl="Nhân viên">{renewTarget.staffName} ({renewTarget.staffCode})</DrField>
            <DrField lbl="Loại CCHN">{TYPE_LABEL[renewTarget.licenseType] || renewTarget.licenseType}</DrField>
            <DrField lbl="Hết hạn hiện tại">
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--a-or-text)' }}>
                {dayjs(renewTarget.expiryDate).format('DD/MM/YYYY')}
              </span>
            </DrField>
            <DrField lbl="Ngày hết hạn mới">
              <input
                type="date"
                value={renewDate}
                onChange={(e) => setRenewDate(e.target.value)}
                style={{ height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--bg-1)', fontSize: 13, width: '100%' }}
              />
            </DrField>
          </DrSec>
        )}
      </DrawerShell>
    </div>
  );
};

export default PracticeLicenseV2;
