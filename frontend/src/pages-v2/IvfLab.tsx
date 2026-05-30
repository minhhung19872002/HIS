import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { Select, Input, DatePicker, InputNumber } from 'antd';
import { getCouples, getIvfDashboard, saveCouple } from '../api/ivfLab';
import type { IvfCouple, IvfDashboard } from '../api/ivfLab';
import { patientApi } from '../api/patient';
import {
  KpiStrip, SearchBox, DataTable, Pager, ActBtn, Btn, ModalShell,
  DrawerShell, DrSec, DrField, tk, ti, te, Ico,
  type ColumnDef,
} from './_v2kit';

const PER = 18;

const IvfLabV2: React.FC = () => {
  const [items, setItems] = useState<IvfCouple[]>([]);
  const [dash, setDash] = useState<IvfDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<IvfCouple | null>(null);
  const [coupleModal, setCoupleModal] = useState<{ couple: IvfCouple | null } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, d] = await Promise.all([
        getCouples({ keyword: search, pageSize: 200 }),
        getIvfDashboard(),
      ]);
      setItems(list);
      setDash(d);
    } catch { ti('Không tải được dữ liệu IVF'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return items;
    return items.filter((r) =>
      [r.wifeName, r.husbandName, r.wifeCode, r.husbandCode]
        .some((v) => (v || '').toLowerCase().includes(k))
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const calcAge = (dob?: string) => dob ? dayjs().diff(dayjs(dob), 'year') : null;

  const cols: ColumnDef<IvfCouple>[] = [
    { key: 'wife', label: 'Vợ', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.wifeName || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
          {r.wifeCode || '—'}{calcAge(r.wifeDob) !== null && ` · ${calcAge(r.wifeDob)}t`}
        </div>
      </div>
    ) },
    { key: 'hus', label: 'Chồng', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.husbandName || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
          {r.husbandCode || '—'}{calcAge(r.husbandDob) !== null && ` · ${calcAge(r.husbandDob)}t`}
        </div>
      </div>
    ) },
    { key: 'mar', label: 'Kết hôn', mono: true, render: (r) => r.marriageDate
      ? dayjs(r.marriageDate).format('DD/MM/YYYY')
      : '—'
    },
    { key: 'dur', label: 'Vô sinh', mono: true, render: (r) => {
      const m = r.infertilityDurationMonths || 0;
      return m >= 12 ? `${(m / 12).toFixed(1)} năm` : `${m} tháng`;
    } },
    { key: 'cause', label: 'Nguyên nhân', render: (r) => r.infertilityCause || '—' },
    { key: 'cyc', label: 'Chu kỳ', mono: true, render: (r) => (
      <span style={{ fontWeight: 600, color: r.cycleCount > 0 ? 'var(--a-em-text)' : 'var(--t-2)' }}>
        {r.cycleCount}
      </span>
    ) },
  ];

  const actions = (r: IvfCouple) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => setCoupleModal({ couple: r })} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Cặp đôi', val: dash?.totalCouples ?? items.length, sub: 'tổng số', tone: 'info' },
        { lbl: 'Chu kỳ đang HĐ', val: dash?.activeCycles ?? 0, sub: 'IVF/IUI', tone: 'warn' },
        { lbl: 'Phôi đông', val: dash?.frozenEmbryos ?? 0, sub: 'tủ đông', tone: 'ok' },
        { lbl: 'Tỷ lệ TC', val: `${(dash?.successRate ?? 0).toFixed(1)}`, unit: '%', sub: 'thai LS', tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm vợ/chồng / mã BN…" />
        <Btn variant="ghost" onClick={() => setSearch('')}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => tk('Mở quản lý phôi đông')}>
          <Ico name="archive" size={12} /> Phôi đông
        </Btn>
        <Btn variant="primary" onClick={() => setCoupleModal({ couple: null })}>
          <Ico name="plus" size={12} /> Đăng ký
        </Btn>
      </div>

      <DataTable<IvfCouple>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có cặp đôi đăng ký IVF'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `${sel.wifeName || '?'} & ${sel.husbandName || '?'}` : ''}
        sub={sel ? `${sel.cycleCount} chu kỳ điều trị` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn variant="primary" onClick={() => { if (sel) { setCoupleModal({ couple: sel }); setSel(null); } }}>
            <Ico name="edit" size={12} /> Chỉnh sửa
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Vợ">
            <DrField lbl="Họ tên">{sel.wifeName || '—'}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.wifeCode || '—'}</span></DrField>
            {sel.wifeDob && <DrField lbl="Ngày sinh">{dayjs(sel.wifeDob).format('DD/MM/YYYY')} · {calcAge(sel.wifeDob)}t</DrField>}
          </DrSec>
          <DrSec title="Chồng">
            <DrField lbl="Họ tên">{sel.husbandName || '—'}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.husbandCode || '—'}</span></DrField>
            {sel.husbandDob && <DrField lbl="Ngày sinh">{dayjs(sel.husbandDob).format('DD/MM/YYYY')} · {calcAge(sel.husbandDob)}t</DrField>}
          </DrSec>
          <DrSec title="Tiền sử">
            {sel.marriageDate && <DrField lbl="Kết hôn">{dayjs(sel.marriageDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Thời gian vô sinh"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.infertilityDurationMonths} tháng</span></DrField>
            <DrField lbl="Nguyên nhân">{sel.infertilityCause || '—'}</DrField>
            <DrField lbl="Số chu kỳ"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.cycleCount}</span></DrField>
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      {coupleModal && (
        <CoupleModal
          couple={coupleModal.couple}
          onClose={() => setCoupleModal(null)}
          onDone={() => { setCoupleModal(null); load(); }}
        />
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Đăng ký / cập nhật cặp đôi IVF — saveCouple (upsert theo id)
   Vợ + chồng là FK bệnh nhân → chọn qua tìm kiếm (patientApi.search)
   ──────────────────────────────────────────────────────────── */

const PatientPicker: React.FC<{
  value?: string;
  seedLabel?: string;
  placeholder?: string;
  onChange: (id: string) => void;
}> = ({ value, seedLabel, placeholder, onChange }) => {
  const [opts, setOpts] = useState<{ value: string; label: string }[]>(
    value && seedLabel ? [{ value, label: seedLabel }] : [],
  );
  const [fetching, setFetching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const doSearch = (kw: string): void => {
    if (timer.current) clearTimeout(timer.current);
    if (!kw || kw.trim().length < 2) return;
    timer.current = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await patientApi.search({ keyword: kw.trim(), pageSize: 20 });
        const list = res.data?.items || [];
        setOpts(list.map((p) => ({ value: p.id, label: `${p.fullName} · ${p.patientCode}${p.yearOfBirth ? ` · ${p.yearOfBirth}` : ''}` })));
      } catch { /* ignore */ }
      finally { setFetching(false); }
    }, 350);
  };

  return (
    <Select
      showSearch filterOption={false} value={value || undefined} placeholder={placeholder}
      onSearch={doSearch} onChange={(v) => onChange(v)} options={opts} loading={fetching}
      notFoundContent={fetching ? 'Đang tìm…' : 'Gõ ≥2 ký tự để tìm bệnh nhân'} style={{ width: '100%' }}
    />
  );
};

const Fld: React.FC<{ lbl: string; req?: boolean; children: React.ReactNode }> = ({ lbl, req, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>
      {lbl}{req && <span style={{ color: 'var(--s-crit)' }}> *</span>}
    </span>
    {children}
  </div>
);

const CoupleModal: React.FC<{ couple: IvfCouple | null; onClose: () => void; onDone: () => void }> = ({ couple, onClose, onDone }) => {
  const editing = !!couple;
  const [wifeId, setWifeId] = useState(couple?.wifePatientId || '');
  const [husbandId, setHusbandId] = useState(couple?.husbandPatientId || '');
  const [duration, setDuration] = useState<number>(couple?.infertilityDurationMonths ?? 0);
  const [cause, setCause] = useState(couple?.infertilityCause || '');
  const [marriage, setMarriage] = useState<Dayjs | null>(couple?.marriageDate ? dayjs(couple.marriageDate) : null);
  const [notes, setNotes] = useState(couple?.notes || '');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (): Promise<void> => {
    if (!wifeId || !husbandId) { setErr('Chọn cả vợ và chồng'); return; }
    setErr('');
    setSubmitting(true);
    try {
      await saveCouple({
        ...(editing ? { id: couple!.id } : {}),
        wifePatientId: wifeId,
        husbandPatientId: husbandId,
        infertilityDurationMonths: duration,
        infertilityCause: cause.trim() || undefined,
        marriageDate: marriage ? marriage.format('YYYY-MM-DD') : undefined,
        notes: notes.trim() || undefined,
      });
      tk(editing ? 'Đã cập nhật cặp đôi' : 'Đã đăng ký cặp đôi');
      onDone();
    } catch {
      te('Lưu cặp đôi thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      size="md"
      title={editing ? 'Cập nhật cặp đôi IVF' : 'Đăng ký cặp đôi IVF'}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" onClick={submit} disabled={submitting}>
          <Ico name="check" size={12} /> {submitting ? 'Đang lưu…' : (editing ? 'Cập nhật' : 'Đăng ký')}
        </Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Fld lbl="Vợ (bệnh nhân)" req>
          <PatientPicker value={wifeId} seedLabel={couple ? `${couple.wifeName || ''} · ${couple.wifeCode || ''}` : undefined}
            placeholder="Tìm bệnh nhân nữ…" onChange={setWifeId} />
        </Fld>
        <Fld lbl="Chồng (bệnh nhân)" req>
          <PatientPicker value={husbandId} seedLabel={couple ? `${couple.husbandName || ''} · ${couple.husbandCode || ''}` : undefined}
            placeholder="Tìm bệnh nhân nam…" onChange={setHusbandId} />
        </Fld>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Fld lbl="Thời gian vô sinh (tháng)">
            <InputNumber style={{ width: '100%' }} min={0} value={duration} onChange={(v) => setDuration(v ?? 0)} />
          </Fld>
          <Fld lbl="Ngày kết hôn">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" value={marriage} onChange={setMarriage} />
          </Fld>
        </div>
        <Fld lbl="Nguyên nhân vô sinh">
          <Input value={cause} onChange={(e) => setCause(e.target.value)} placeholder="VD: Tắc vòi trứng, tinh trùng yếu…" />
        </Fld>
        <Fld lbl="Ghi chú">
          <Input.TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Fld>
        {err && <div style={{ color: 'var(--s-crit)', fontSize: 12 }}>{err}</div>}
      </div>
    </ModalShell>
  );
};

export default IvfLabV2;
