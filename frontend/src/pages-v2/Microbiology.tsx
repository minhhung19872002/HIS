import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input, Select } from 'antd';
import { getMicrobiologyCultures, createCulture, updateCultureStatus } from '../api/microbiology';
import type { MicrobiologyCulture } from '../api/microbiology';
import { printLabResult } from '../api/pdf';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, ModalShell, DrSec, DrField, tk, ti, te, Ico,
  type ColumnDef,
} from './_v2kit';

const SAMPLE_OPTS = [
  { value: 'blood', label: 'Máu' }, { value: 'urine', label: 'Nước tiểu' },
  { value: 'sputum', label: 'Đờm' }, { value: 'csf', label: 'Dịch não tủy' },
  { value: 'wound', label: 'Dịch vết thương' }, { value: 'stool', label: 'Phân' },
  { value: 'tissue', label: 'Mô' }, { value: 'other', label: 'Khác' },
];
const CULTURE_OPTS = [
  { value: 'aerobic', label: 'Hiếu khí' }, { value: 'anaerobic', label: 'Kỵ khí' },
  { value: 'fungal', label: 'Nấm' }, { value: 'mycobacteria', label: 'Mycobacteria' },
];

const STATUS_LABEL: Record<number, string> = {
  0: 'Chờ', 1: 'Đang ủ', 2: 'Có VSV mọc', 3: 'Không mọc', 4: 'Đã định danh', 5: 'Hoàn tất',
};
const STATUS_OPTS = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value: Number(value), label }));

type SKey = 'pending' | 'incubating' | 'growth' | 'completed';
const STATUS_TABS = [
  { v: 'pending' as SKey,     l: 'Chờ',           tone: 'warn' as const },
  { v: 'incubating' as SKey,  l: 'Đang ủ',        tone: 'info' as const },
  { v: 'growth' as SKey,      l: 'Có VSV mọc',    tone: 'crit' as const },
  { v: 'completed' as SKey,   l: 'Hoàn tất',      tone: 'ok' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'pending' : n === 1 ? 'incubating' : (n === 2 || n === 4) ? 'growth' : 'completed';

const PER = 18;

const MicrobiologyV2: React.FC = () => {
  const [items, setItems] = useState<MicrobiologyCulture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<MicrobiologyCulture | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusCulture, setStatusCulture] = useState<MicrobiologyCulture | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getMicrobiologyCultures({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as MicrobiologyCulture[];
      setItems(list);
    } catch { setItems([]); ti('Không tải được danh sách cấy'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const types = useMemo(() => {
    const set = new Set(items.map((c) => c.cultureType).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fType && r.cultureType !== fType) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.requestCode, r.sampleBarcode]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<MicrobiologyCulture>[] = [
    { key: 'code', label: 'Mã YC', code: true, render: (r) => r.requestCode || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'sample', label: 'Loại mẫu', render: (r) => r.sampleType },
    { key: 'bar', label: 'Barcode', code: true, render: (r) => r.sampleBarcode },
    { key: 'cult', label: 'Loại cấy', render: (r) => <StatusBadge tone="info">{r.cultureType}</StatusBadge> },
    { key: 'date', label: 'Cấy lúc', mono: true, render: (r) => dayjs(r.cultureDate).format('DD/MM HH:mm') },
    { key: 'org', label: 'VSV', render: (r) => r.organisms?.length
      ? <span style={{ color: 'var(--a-rd-text)', fontWeight: 600 }}>{r.organisms.length}</span>
      : '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const k = sKey(r.status);
      const t = STATUS_TABS.find((x) => x.v === k);
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: MicrobiologyCulture) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="activity" title="Cập nhật trạng thái" onClick={() => setStatusCulture(r)} />
    </div>
  );

  const growthCount = counts.growth || 0;

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng cấy', val: items.length, sub: 'tất cả' },
        { lbl: 'Đang ủ', val: counts.incubating || 0, sub: 'đợi kết quả', tone: 'info' },
        { lbl: 'Có VSV mọc', val: growthCount, sub: 'cần xử lý', tone: 'crit' },
        { lbl: 'Hoàn tất', val: counts.completed || 0, sub: `${Math.round(((counts.completed || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã YC / barcode…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại cấy" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="primary" onClick={() => setCreateOpen(true)}>
          <Ico name="plus" size={12} /> Cấy mới
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<MicrobiologyCulture>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có cấy nào'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="xl"
        title={sel ? `Cấy · ${sel.requestCode}` : ''}
        sub={sel ? `${sel.patientName} · ${sel.sampleType}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => {
            if (!sel?.labRequestId) { ti('Mẫu chưa có mã yêu cầu xét nghiệm để in'); return; }
            printLabResult(sel.labRequestId);
            tk('Đang mở phiếu KQ vi sinh để in…');
          }}>
            <Ico name="print" size={12} /> In phiếu
          </Btn>
          <Btn variant="primary" onClick={() => { if (sel) { setStatusCulture(sel); setSel(null); } }}>
            <Ico name="activity" size={12} /> Cập nhật
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân & mẫu">
            <DrField lbl="Mã yêu cầu"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.requestCode}</span></DrField>
            <DrField lbl="Bệnh nhân">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Loại mẫu">{sel.sampleType}</DrField>
            <DrField lbl="Barcode"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.sampleBarcode}</span></DrField>
            <DrField lbl="Loại cấy">{sel.cultureType}</DrField>
          </DrSec>
          <DrSec title="Tiến trình">
            <DrField lbl="Cấy lúc">{dayjs(sel.cultureDate).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Bắt đầu ủ">{sel.incubationStart ? dayjs(sel.incubationStart).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Kết thúc ủ">{sel.incubationEnd ? dayjs(sel.incubationEnd).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Có kết quả">{sel.resultDate ? dayjs(sel.resultDate).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          {sel.organisms && sel.organisms.length > 0 && (
            <DrSec title={`Vi sinh vật phát hiện (${sel.organisms.length})`}>
              {sel.organisms.map((o) => (
                <div key={o.id} style={{
                  padding: 'var(--space-12)', marginBottom: 'var(--space-10)', background: 'var(--d-1)',
                  border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                    <b style={{ color: 'var(--t-0)' }}>{o.organismName}</b>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{o.organismCode}</span>
                  </div>
                  {o.colonyCount && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>Khuẩn lạc: {o.colonyCount}</div>}
                  {o.gramStain && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>Gram: {o.gramStain}</div>}
                  {o.antibiogram && o.antibiogram.length > 0 && (
                    <div style={{ marginTop: 'var(--space-6)', fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                      Antibiogram: {o.antibiogram.length} kháng sinh
                    </div>
                  )}
                </div>
              ))}
            </DrSec>
          )}
          {sel.notes && (
            <DrSec title="Ghi chú">
              <div style={{ fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>{sel.notes}</div>
            </DrSec>
          )}
        </>}
      </DrawerShell>

      {createOpen && (
        <CreateCultureModal
          onClose={() => setCreateOpen(false)}
          onDone={() => { setCreateOpen(false); load(); }}
        />
      )}

      {statusCulture && (
        <UpdateStatusModal
          culture={statusCulture}
          onClose={() => setStatusCulture(null)}
          onDone={() => { setStatusCulture(null); load(); }}
        />
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Modal tạo nuôi cấy mới — bám style _v2kit (ModalShell)
   Tái dùng API createCulture + field từ form v1 (8 loại mẫu, 4 loại cấy)
   ──────────────────────────────────────────────────────────── */

const Fld: React.FC<{ lbl: string; req?: boolean; children: React.ReactNode }> = ({ lbl, req, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>
      {lbl}{req && <span style={{ color: 'var(--s-crit)' }}> *</span>}
    </span>
    {children}
  </div>
);

const CreateCultureModal: React.FC<{ onClose: () => void; onDone: () => void }> = ({ onClose, onDone }) => {
  const [labRequestId, setLabRequestId] = useState('');
  const [sampleType, setSampleType] = useState<string>();
  const [cultureType, setCultureType] = useState<string>();
  const [sampleBarcode, setSampleBarcode] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (): Promise<void> => {
    if (!labRequestId.trim() || !sampleType || !cultureType) {
      setErr('Nhập Mã YC xét nghiệm, Loại mẫu và Loại nuôi cấy');
      return;
    }
    setErr('');
    setSubmitting(true);
    try {
      await createCulture({
        labRequestId: labRequestId.trim(),
        sampleType,
        cultureType,
        sampleBarcode: sampleBarcode.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      tk('Đã tạo nuôi cấy mới');
      onDone();
    } catch {
      te('Tạo nuôi cấy thất bại. Kiểm tra lại Mã YC xét nghiệm.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      size="md"
      title="Tạo nuôi cấy mới"
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" onClick={submit} disabled={submitting}>
          <Ico name="check" size={12} /> {submitting ? 'Đang lưu…' : 'Tạo cấy'}
        </Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <Fld lbl="Mã yêu cầu xét nghiệm" req>
          <Input value={labRequestId} onChange={(e) => setLabRequestId(e.target.value)} placeholder="Nhập / quét mã YC xét nghiệm" />
        </Fld>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <Fld lbl="Loại mẫu" req>
            <Select style={{ width: '100%' }} value={sampleType} onChange={setSampleType} placeholder="Chọn loại mẫu" options={SAMPLE_OPTS} />
          </Fld>
          <Fld lbl="Loại nuôi cấy" req>
            <Select style={{ width: '100%' }} value={cultureType} onChange={setCultureType} placeholder="Chọn loại cấy" options={CULTURE_OPTS} />
          </Fld>
        </div>
        <Fld lbl="Barcode mẫu">
          <Input value={sampleBarcode} onChange={(e) => setSampleBarcode(e.target.value)} placeholder="Quét barcode mẫu (nếu có)" />
        </Fld>
        <Fld lbl="Ghi chú">
          <Input.TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Fld>
        {err && <div style={{ color: 'var(--s-crit)', fontSize: 'var(--fs-sm)' }}>{err}</div>}
      </div>
    </ModalShell>
  );
};

/* ────────────────────────────────────────────────────────────
   Modal cập nhật trạng thái nuôi cấy — updateCultureStatus(id,{status,notes})
   ──────────────────────────────────────────────────────────── */

const UpdateStatusModal: React.FC<{ culture: MicrobiologyCulture; onClose: () => void; onDone: () => void }> = ({ culture, onClose, onDone }) => {
  const [status, setStatus] = useState<number>(culture.status);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (): Promise<void> => {
    setSubmitting(true);
    try {
      await updateCultureStatus(culture.id, { status, notes: notes.trim() || undefined });
      tk('Đã cập nhật trạng thái nuôi cấy');
      onDone();
    } catch {
      te('Cập nhật trạng thái thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      size="sm"
      title="Cập nhật trạng thái nuôi cấy"
      sub={culture.requestCode}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" onClick={submit} disabled={submitting}>
          <Ico name="check" size={12} /> {submitting ? 'Đang lưu…' : 'Cập nhật'}
        </Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <Fld lbl="Trạng thái" req>
          <Select style={{ width: '100%' }} value={status} onChange={setStatus} options={STATUS_OPTS} />
        </Fld>
        <Fld lbl="Ghi chú">
          <Input.TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú kết quả / diễn biến…" />
        </Fld>
      </div>
    </ModalShell>
  );
};

export default MicrobiologyV2;
