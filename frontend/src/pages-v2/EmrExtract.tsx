/* =====================================================================
 * EmrExtract v2 — Trích lục bệnh án chống sao chép (#85 / F8.3)
 * Chọn HSBA bệnh nhân -> tạo/thu hồi bản trích lục có watermark chống sao
 * chép + thời hạn + giới hạn lượt truy cập; xem bản trích lục có watermark.
 * Backend sẵn: EmrManagementController (extracts) · api/emrManagement.ts.
 * ===================================================================== */
import { useState, useCallback } from 'react';
import {
  KpiStrip, DataTable, StatusBadge, ActBtn, Btn, ModalShell, DrawerShell, SearchBox,
  tk, te, tw, cf, fmtDTg, fmtDMYg, type ColumnDef, type StatusTone,
} from './_v2kit';
import { HOSPITAL_NAME } from '../constants/hospital';
import { getEmrRecords, getPatientMedicalHistory, type EmrRecordDto } from '../modules/opd/api/examination';
import {
  getEmrExtracts, createEmrExtract, revokeEmrExtract, type EmrExtractDto,
} from '../modules/emr/api/emrManagement';

const STATUS_TONE: Record<string, StatusTone> = { Active: 'ok', Revoked: 'crit', Expired: 'warn' };
const STATUS_LABEL: Record<string, string> = { Active: 'Hiệu lực', Revoked: 'Đã thu hồi', Expired: 'Hết hạn' };

interface SelectedExam { examinationId: string; patientName: string; patientCode: string }
interface CreateForm { extractType: 'Full' | 'Partial'; formTypes: string; maxAccessCount: number; expiresAt: string }
const EMPTY_FORM: CreateForm = { extractType: 'Full', formTypes: '', maxAccessCount: 5, expiresAt: '' };

const EmrExtractV2 = () => {
  const [kw, setKw] = useState('');
  const [records, setRecords] = useState<EmrRecordDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [sel, setSel] = useState<SelectedExam | null>(null);
  const [extracts, setExtracts] = useState<EmrExtractDto[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);

  const [viewExtract, setViewExtract] = useState<EmrExtractDto | null>(null);

  const search = useCallback(async () => {
    setSearching(true);
    try {
      const r = await getEmrRecords(kw || undefined, 1, 50);
      setRecords(Array.isArray(r.data) ? r.data : []);
    } catch { setRecords([]); te('Không tải được danh sách HSBA'); }
    finally { setSearching(false); setSearched(true); }
  }, [kw]);

  const loadExtracts = useCallback(async (examinationId: string) => {
    setLoading(true);
    try {
      const r = await getEmrExtracts(examinationId);
      setExtracts(Array.isArray(r.data) ? r.data : []);
    } catch { setExtracts([]); te('Không tải được danh sách trích lục'); }
    finally { setLoading(false); }
  }, []);

  const pickRecord = useCallback(async (rec: EmrRecordDto) => {
    try {
      const h = await getPatientMedicalHistory(rec.patientId, 30);
      const hist = Array.isArray(h.data) ? h.data : [];
      const examinationId = hist[0]?.examinationId;
      if (!examinationId) { tw('Bệnh nhân chưa có lần khám để trích lục'); return; }
      setSel({ examinationId, patientName: rec.patientName, patientCode: rec.patientCode });
      loadExtracts(examinationId);
    } catch { te('Không xác định được lần khám của bệnh nhân'); }
  }, [loadExtracts]);

  const submitCreate = async () => {
    if (!sel) return;
    setCreating(true);
    try {
      await createEmrExtract({
        examinationId: sel.examinationId,
        extractType: form.extractType,
        formTypes: form.formTypes.trim() || undefined,
        maxAccessCount: form.maxAccessCount || undefined,
        expiresAt: form.expiresAt || undefined,
      });
      tk('Đã tạo bản trích lục có watermark');
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      loadExtracts(sel.examinationId);
    } catch { te('Tạo trích lục thất bại'); }
    finally { setCreating(false); }
  };

  const doRevoke = (ex: EmrExtractDto) => {
    if (ex.status !== 'Active') { tw('Bản trích lục này đã thu hồi/hết hạn'); return; }
    cf(`Thu hồi bản trích lục (mã ${ex.accessCode || '—'})? Sau khi thu hồi sẽ không truy cập được nữa.`,
      async () => {
        try { await revokeEmrExtract(ex.id); tk('Đã thu hồi trích lục'); if (sel) loadExtracts(sel.examinationId); }
        catch { te('Thu hồi thất bại'); }
      },
      { tone: 'crit', confirm: 'Thu hồi' });
  };

  const columns: ColumnDef<EmrExtractDto>[] = [
    { key: 'extractType', label: 'Loại', render: (r) => r.extractType === 'Partial' ? 'Một phần' : 'Toàn bộ' },
    { key: 'formTypes', label: 'Phạm vi', render: (r) => r.formTypes || 'Toàn bộ HSBA' },
    { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge tone={STATUS_TONE[r.status] ?? 'info'} dot>{STATUS_LABEL[r.status] ?? r.status}</StatusBadge> },
    { key: 'access', label: 'Lượt truy cập', render: (r) => `${r.accessCount}/${r.maxAccessCount || '∞'}` },
    { key: 'accessCode', label: 'Mã truy cập', mono: true, render: (r) => r.accessCode || '—' },
    { key: 'expiresAt', label: 'Hạn dùng', render: (r) => r.expiresAt ? fmtDMYg(r.expiresAt) : 'Không giới hạn' },
    { key: 'createdAt', label: 'Tạo lúc', render: (r) => fmtDTg(r.createdAt) },
  ];

  const kpis = [
    { lbl: 'Tổng trích lục', val: extracts.length, tone: 'info' as const },
    { lbl: 'Còn hiệu lực', val: extracts.filter((e) => e.status === 'Active').length, tone: 'ok' as const },
    { lbl: 'Thu hồi / Hết hạn', val: extracts.filter((e) => e.status !== 'Active').length, tone: 'warn' as const },
  ];

  return (
    <div className="ab">
      {sel && <KpiStrip items={kpis} />}

      <div className="ab-tools">
        <SearchBox value={kw} onChange={setKw} placeholder="Tìm bệnh nhân theo tên / mã…" />
        <Btn variant="primary" icon="search" loading={searching} onClick={search}>Tìm HSBA</Btn>
        <span className="spacer" />
        {sel && (
          <>
            <span style={{ fontSize: 12.5, color: 'var(--t-1)' }}>
              Trích lục của: <b>{sel.patientName}</b> <span className="mono">({sel.patientCode})</span>
            </span>
            <Btn icon="refresh" onClick={() => loadExtracts(sel.examinationId)}>Làm mới</Btn>
            <Btn variant="primary" icon="plus" onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>Tạo trích lục</Btn>
          </>
        )}
      </div>

      {/* Kết quả tìm bệnh nhân — chọn để xem trích lục */}
      {searched && !sel && (
        <div style={{ padding: '4px 0 10px' }}>
          {records.length === 0 ? (
            <div className="ab-empty"><TermIconHint /> <div>Không tìm thấy bệnh nhân phù hợp</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {records.map((r) => (
                <button
                  key={r.patientId}
                  type="button"
                  onClick={() => pickRecord(r)}
                  style={{
                    textAlign: 'left', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-3)',
                    background: 'var(--d-2)', padding: '8px 12px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: 'var(--space-12)',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</span>
                  <span className="mono" style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>{r.patientCode}</span>
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
                    {r.gender === 1 ? 'Nam' : 'Nữ'}{r.age != null ? ` · ${r.age}T` : ''} · {r.lastRoomName || '—'} · {r.visitCount} lần khám
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bảng trích lục của bệnh nhân đang chọn */}
      {sel && (
        <DataTable<EmrExtractDto>
          columns={columns}
          data={extracts}
          rowKey={(r) => r.id}
          actions={(r) => (
            <>
              <ActBtn ic="eye" title="Xem bản trích lục (watermark)" onClick={() => setViewExtract(r)} />
              <ActBtn ic="trash" title="Thu hồi" tone="crit" onClick={() => doRevoke(r)} />
            </>
          )}
          empty={loading ? 'Đang tải…' : (
            <div className="ab-empty"><TermIconHint /> <div>Bệnh nhân chưa có bản trích lục nào — bấm “Tạo trích lục”.</div></div>
          )}
        />
      )}

      {!searched && !sel && (
        <div className="ab-empty" style={{ padding: '60px 20px' }}>
          <TermIconHint />
          <div>Tìm bệnh nhân để quản lý bản trích lục bệnh án (có watermark chống sao chép).</div>
        </div>
      )}

      {/* Modal tạo trích lục */}
      <ModalShell
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo bản trích lục bệnh án"
        sub={sel ? `${sel.patientName} · ${sel.patientCode}` : undefined}
        size="md"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setCreateOpen(false)}>Hủy</Btn>
            <span style={{ flex: 1 }} />
            <Btn variant="primary" icon="check" loading={creating} onClick={submitCreate}>Tạo trích lục</Btn>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          <label style={{ fontSize: 12.5 }}>
            <div style={{ marginBottom: 'var(--space-4)', color: 'var(--t-1)' }}>Loại trích lục</div>
            <select className="ed-fld" value={form.extractType}
              onChange={(e) => setForm({ ...form, extractType: e.target.value as 'Full' | 'Partial' })}
              style={{ width: '100%' }}>
              <option value="Full">Toàn bộ hồ sơ</option>
              <option value="Partial">Một phần (chọn loại tờ phiếu)</option>
            </select>
          </label>
          {form.extractType === 'Partial' && (
            <label style={{ fontSize: 12.5 }}>
              <div style={{ marginBottom: 'var(--space-4)', color: 'var(--t-1)' }}>Phạm vi (mã tờ phiếu, cách nhau dấu phẩy)</div>
              <input className="ed-fld" value={form.formTypes}
                onChange={(e) => setForm({ ...form, formTypes: e.target.value })}
                placeholder="VD: summary, treatment, discharge" style={{ width: '100%' }} />
            </label>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-10)' }}>
            <label style={{ fontSize: 12.5, flex: 1 }}>
              <div style={{ marginBottom: 'var(--space-4)', color: 'var(--t-1)' }}>Giới hạn lượt truy cập</div>
              <input type="number" min={1} className="ed-fld" value={form.maxAccessCount}
                onChange={(e) => setForm({ ...form, maxAccessCount: Number(e.target.value) })} style={{ width: '100%' }} />
            </label>
            <label style={{ fontSize: 12.5, flex: 1 }}>
              <div style={{ marginBottom: 'var(--space-4)', color: 'var(--t-1)' }}>Hạn dùng (để trống = không giới hạn)</div>
              <input type="date" className="ed-fld" value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} style={{ width: '100%' }} />
            </label>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--t-2)' }}>
            Bản trích lục được đóng watermark chống sao chép tự động; mã truy cập sinh khi tạo.
          </div>
        </div>
      </ModalShell>

      {/* Drawer xem bản trích lục có watermark */}
      <DrawerShell
        open={!!viewExtract}
        onClose={() => setViewExtract(null)}
        title="Bản trích lục bệnh án"
        sub={sel ? `${sel.patientName} · ${sel.patientCode}` : undefined}
        size="lg"
      >
        {viewExtract && sel && <WatermarkedPreview extract={viewExtract} patientName={sel.patientName} patientCode={sel.patientCode} />}
      </DrawerShell>
    </div>
  );
};

/** Empty-state icon (tránh import lặp TermIcon trong nhiều chỗ). */
const TermIconHint = () => <span style={{ fontSize: 'var(--fs-xl)', color: 'var(--t-3)' }}>🔎</span>;

/** Khung xem trích lục có watermark chống sao chép phủ chéo + thời hạn. */
const WatermarkedPreview = ({ extract, patientName, patientCode }: { extract: EmrExtractDto; patientName: string; patientCode: string }) => {
  const mark = `${HOSPITAL_NAME} • TRÍCH LỤC • ${patientCode}`;
  const expired = extract.status !== 'Active';
  return (
    <div style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', background: 'var(--d-2)', minHeight: 420 }}>
      {/* Watermark overlay phủ chéo, không chặn tương tác */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', placeItems: 'center',
        transform: 'rotate(-24deg) scale(1.4)', opacity: expired ? 0.18 : 0.1, zIndex: 1,
      }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <span key={i} style={{ whiteSpace: 'nowrap', fontSize: 'var(--fs-lg)', fontWeight: 700, color: expired ? '#b91c1c' : 'var(--a-cy-dim)' }}>{mark}</span>
        ))}
      </div>

      {/* Nội dung trích lục */}
      <div style={{ position: 'relative', zIndex: 2, padding: 'var(--space-20)', fontSize: 'var(--fs-md)', lineHeight: 1.7 }}>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 'var(--fs-lg)' }}>BẢN TRÍCH LỤC BỆNH ÁN</div>
        <div style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--t-2)', marginBottom: 'var(--space-16)' }}>{HOSPITAL_NAME}</div>
        <div><b>Người bệnh:</b> {patientName} <span className="mono">({patientCode})</span></div>
        <div><b>Loại:</b> {extract.extractType === 'Partial' ? 'Một phần' : 'Toàn bộ hồ sơ'}{extract.formTypes ? ` — ${extract.formTypes}` : ''}</div>
        <div><b>Mã truy cập:</b> <span className="mono">{extract.accessCode || '—'}</span></div>
        <div><b>Lượt truy cập:</b> {extract.accessCount}/{extract.maxAccessCount || '∞'}</div>
        <div><b>Hạn dùng:</b> {extract.expiresAt ? fmtDMYg(extract.expiresAt) : 'Không giới hạn'}</div>
        <div><b>Trạng thái:</b> <StatusBadge tone={STATUS_TONE[extract.status] ?? 'info'} dot>{STATUS_LABEL[extract.status] ?? extract.status}</StatusBadge></div>
        {expired && (
          <div style={{ marginTop: 'var(--space-14)', padding: 'var(--space-10)', border: '1px solid #fca5a5', background: 'var(--s-crit-bg)', borderRadius: 'var(--r-3)', color: '#b91c1c', fontSize: 'var(--fs-sm)' }}>
            Bản trích lục đã {extract.status === 'Revoked' ? 'bị thu hồi' : 'hết hạn'} — không còn giá trị sử dụng.
          </div>
        )}
        <div style={{ marginTop: 'var(--space-20)', fontSize: 11.5, color: 'var(--t-2)' }}>
          * Bản trích lục có watermark chống sao chép. Mọi hành vi sao chép, chỉnh sửa, phát tán trái phép đều vi phạm quy định bảo mật hồ sơ bệnh án.
        </div>
      </div>
    </div>
  );
};

export default EmrExtractV2;
