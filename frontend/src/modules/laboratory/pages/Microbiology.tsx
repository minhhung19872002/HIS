import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input, Select } from 'antd';
import { getMicrobiologyCultures, createCulture, updateCultureStatus, addOrganism, saveAntibiogram } from '../api/microbiology';
import type { MicrobiologyCulture, MicrobiologyOrganism, AntibioticSensitivity } from '../api/microbiology';
import { printLabResult } from '../../../api/pdf';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, ModalShell, DrSec, DrField, useTabCounts, tk, ti, te, Ico,
  type ColumnDef,
} from '../../../pages-v2/_v2kit';

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
const GRAM_OPTS = [
  { value: 'positive', label: 'Gram (+)' },
  { value: 'negative', label: 'Gram (-)' },
  { value: 'mixed', label: 'Hỗn hợp' },
];
const INTERP_OPTS = [
  { value: 'S', label: 'S — Nhạy cảm' },
  { value: 'I', label: 'I — Trung gian' },
  { value: 'R', label: 'R — Kháng' },
];
const METHOD_OPTS = [
  { value: 'disk', label: 'Disk diffusion' },
  { value: 'mic', label: 'MIC' },
  { value: 'etest', label: 'E-test' },
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
  const [addOrgOpen, setAddOrgOpen] = useState(false);
  const [astOrg, setAstOrg] = useState<MicrobiologyOrganism | null>(null);

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

  const counts = useTabCounts(items, STATUS_TABS, (r) => sKey(r.status));

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
          <Btn onClick={() => setAddOrgOpen(true)}>
            <Ico name="plus" size={12} /> Thêm vi khuẩn
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                    <div>
                      <b style={{ color: 'var(--t-0)' }}>{o.organismName}</b>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginLeft: 'var(--space-8)' }}>{o.organismCode}</span>
                    </div>
                    <Btn variant="ghost" onClick={() => setAstOrg(o)}>
                      <Ico name="activity" size={12} /> Kháng sinh đồ{o.antibiogram?.length ? ` (${o.antibiogram.length})` : ''}
                    </Btn>
                  </div>
                  {o.colonyCount && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>Khuẩn lạc: {o.colonyCount}</div>}
                  {o.gramStain && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>Gram: {o.gramStain}</div>}
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

      {addOrgOpen && sel && (
        <AddOrganismModal
          cultureId={sel.id}
          onClose={() => setAddOrgOpen(false)}
          onDone={() => { setAddOrgOpen(false); load(); }}
        />
      )}

      {astOrg && (
        <AntibiogramModal
          organism={astOrg}
          onClose={() => setAstOrg(null)}
          onDone={() => { setAstOrg(null); load(); }}
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

/* ────────────────────────────────────────────────────────────
   Modal thêm vi khuẩn cho nuôi cấy — addOrganism(cultureId, data)
   ──────────────────────────────────────────────────────────── */

const AddOrganismModal: React.FC<{
  cultureId: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ cultureId, onClose, onDone }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [colony, setColony] = useState('');
  const [gram, setGram] = useState<string>('');
  const [morph, setMorph] = useState('');
  const [idMethod, setIdMethod] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (): Promise<void> => {
    if (!code.trim() || !name.trim()) { setErr('Nhập Mã vi khuẩn và Tên vi khuẩn'); return; }
    setErr('');
    setSaving(true);
    try {
      await addOrganism(cultureId, {
        organismCode: code.trim(),
        organismName: name.trim(),
        colonyCount: colony.trim() || undefined,
        gramStain: gram || undefined,
        morphology: morph.trim() || undefined,
        identificationMethod: idMethod.trim() || undefined,
      });
      tk('Đã thêm vi khuẩn');
      onDone();
    } catch { te('Thêm vi khuẩn thất bại'); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      size="md"
      title="Thêm vi khuẩn"
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" onClick={submit} disabled={saving}>
          <Ico name="check" size={12} /> {saving ? 'Đang lưu…' : 'Thêm'}
        </Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <Fld lbl="Mã vi khuẩn" req>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: STAAUR" />
          </Fld>
          <Fld lbl="Tên vi khuẩn" req>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Staphylococcus aureus" />
          </Fld>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <Fld lbl="Số khuẩn lạc">
            <Input value={colony} onChange={(e) => setColony(e.target.value)} placeholder="VD: >100,000 CFU/mL" />
          </Fld>
          <Fld lbl="Nhuộm Gram">
            <Select
              style={{ width: '100%' }} value={gram || undefined} onChange={setGram}
              allowClear options={GRAM_OPTS} placeholder="Chọn…"
            />
          </Fld>
        </div>
        <Fld lbl="Hình thái">
          <Input value={morph} onChange={(e) => setMorph(e.target.value)} placeholder="VD: Cầu khuẩn chùm nho" />
        </Fld>
        <Fld lbl="PP định danh">
          <Input value={idMethod} onChange={(e) => setIdMethod(e.target.value)} placeholder="VD: VITEK 2, MALDI-TOF" />
        </Fld>
        {err && <div style={{ color: 'var(--s-crit)', fontSize: 'var(--fs-sm)' }}>{err}</div>}
      </div>
    </ModalShell>
  );
};

/* ────────────────────────────────────────────────────────────
   Modal nhập kháng sinh đồ — saveAntibiogram(organismId, rows[])
   Inline-editable table; pre-populate từ organism.antibiogram
   ──────────────────────────────────────────────────────────── */

interface AstRow {
  key: number;
  antibioticCode: string;
  antibioticName: string;
  mic: string;
  zoneDiameter: string;
  interpretation: string;
  method: string;
}

const AntibiogramModal: React.FC<{
  organism: MicrobiologyOrganism;
  onClose: () => void;
  onDone: () => void;
}> = ({ organism, onClose, onDone }) => {
  const [rows, setRows] = useState<AstRow[]>(() =>
    (organism.antibiogram || []).map((a, i) => ({
      key: i,
      antibioticCode: a.antibioticCode || '',
      antibioticName: a.antibioticName || '',
      mic: a.mic != null ? String(a.mic) : '',
      zoneDiameter: a.zoneDiameter != null ? String(a.zoneDiameter) : '',
      interpretation: a.interpretation || '',
      method: a.method || '',
    }))
  );
  const [counter, setCounter] = useState(organism.antibiogram?.length || 0);
  const [saving, setSaving] = useState(false);

  const addRow = () => {
    setRows((r) => [...r, { key: counter, antibioticCode: '', antibioticName: '', mic: '', zoneDiameter: '', interpretation: '', method: '' }]);
    setCounter((c) => c + 1);
  };

  const removeRow = (key: number) => setRows((r) => r.filter((x) => x.key !== key));

  const updateRow = (key: number, field: keyof AstRow, val: string) =>
    setRows((r) => r.map((x) => x.key === key ? { ...x, [field]: val } : x));

  const submit = async (): Promise<void> => {
    const valid = rows.filter((r) => r.antibioticName.trim());
    if (!valid.length) { te('Chưa có kháng sinh nào để lưu'); return; }
    setSaving(true);
    try {
      const payload: AntibioticSensitivity[] = valid.map((r) => ({
        id: '',
        organismId: organism.id,
        antibioticCode: r.antibioticCode.trim(),
        antibioticName: r.antibioticName.trim(),
        mic: r.mic ? parseFloat(r.mic) : undefined,
        zoneDiameter: r.zoneDiameter ? parseFloat(r.zoneDiameter) : undefined,
        interpretation: r.interpretation || 'S',
        method: r.method || undefined,
      }));
      await saveAntibiogram(organism.id, payload);
      tk('Đã lưu kháng sinh đồ');
      onDone();
    } catch { te('Lưu kháng sinh đồ thất bại'); }
    finally { setSaving(false); }
  };

  const thStyle: React.CSSProperties = {
    padding: 'var(--space-6) var(--space-8)', textAlign: 'left',
    fontWeight: 600, color: 'var(--t-1)', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = { padding: 'var(--space-4) var(--space-6)', verticalAlign: 'middle' };

  return (
    <ModalShell
      open
      onClose={onClose}
      size="lg"
      title="Kháng sinh đồ"
      sub={organism.organismName}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
        <Btn onClick={addRow}><Ico name="plus" size={12} /> Thêm kháng sinh</Btn>
        <Btn variant="primary" onClick={submit} disabled={saving}>
          <Ico name="check" size={12} /> {saving ? 'Đang lưu…' : `Lưu (${rows.length})`}
        </Btn>
      </>}
    >
      <div style={{ overflowX: 'auto' }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--t-2)' }}>
            Chưa có kháng sinh đồ — nhấn "Thêm kháng sinh" để bắt đầu
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th style={thStyle}>Tên kháng sinh</th>
                <th style={thStyle}>MIC</th>
                <th style={thStyle}>Zone (mm)</th>
                <th style={thStyle}>Kết quả</th>
                <th style={thStyle}>Phương pháp</th>
                <th style={{ ...thStyle, width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ ...tdStyle, minWidth: 160 }}>
                    <Input size="small" value={row.antibioticName}
                      onChange={(e) => updateRow(row.key, 'antibioticName', e.target.value)}
                      placeholder="Tên kháng sinh" />
                  </td>
                  <td style={{ ...tdStyle, width: 80 }}>
                    <Input size="small" style={{ width: 68 }} value={row.mic}
                      onChange={(e) => updateRow(row.key, 'mic', e.target.value)}
                      placeholder="≥0.5" />
                  </td>
                  <td style={{ ...tdStyle, width: 84 }}>
                    <Input size="small" style={{ width: 68 }} value={row.zoneDiameter}
                      onChange={(e) => updateRow(row.key, 'zoneDiameter', e.target.value)}
                      placeholder="20" />
                  </td>
                  <td style={{ ...tdStyle, width: 104 }}>
                    <Select size="small" style={{ width: 96 }} value={row.interpretation || undefined}
                      onChange={(v) => updateRow(row.key, 'interpretation', v)}
                      options={INTERP_OPTS} placeholder="—" allowClear />
                  </td>
                  <td style={{ ...tdStyle, width: 128 }}>
                    <Select size="small" style={{ width: 116 }} value={row.method || undefined}
                      onChange={(v) => updateRow(row.key, 'method', v)}
                      options={METHOD_OPTS} placeholder="—" allowClear />
                  </td>
                  <td style={tdStyle}>
                    <Btn variant="ghost" onClick={() => removeRow(row.key)}>
                      <Ico name="x" size={12} />
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ModalShell>
  );
};

export default MicrobiologyV2;
