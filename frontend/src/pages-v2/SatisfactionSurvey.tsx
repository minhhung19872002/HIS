import React, { useEffect, useMemo, useState } from 'react';
import * as file from '../services/file.service';
import dayjs from 'dayjs';
import { Form, Input } from 'antd';
import { getSurveyResults, contactCallback, createCampaign, exportSurveys } from '../modules/survey/api/satisfactionSurvey';
import type { CreateCampaignDto, ContactCallbackDto } from '../modules/survey/api/satisfactionSurvey';
import { normalizeArrayResponse } from '../utils/apiNormalize';
import { downloadCsv, escapeCsvCell } from '../utils/csvExport';
import {
  KpiStrip, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  StatusTabs, DrawerShell, DrSec, DrField, ModalShell, tk, ti, tw, Ico,
  type ColumnDef,
} from './_v2kit';

interface SurveyResult {
  id: string;
  patientCode: string;
  patientName: string;
  templateName: string;
  score: number;
  date: string;
  status: string;
  department?: string;
}

const PER = 18;

type ScoreKey = 'high' | 'mid' | 'low';
const SCORE_TABS = [
  { v: 'high' as ScoreKey, l: 'Hài lòng (≥4)', tone: 'ok' as const },
  { v: 'mid' as ScoreKey,  l: 'Trung bình (3)', tone: 'warn' as const },
  { v: 'low' as ScoreKey,  l: 'Không hài lòng (≤2)', tone: 'crit' as const },
];

const scoreKey = (s: number): ScoreKey => s >= 4 ? 'high' : s >= 3 ? 'mid' : 'low';
const toneFor = (s: number): 'ok' | 'warn' | 'crit' | 'info' =>
  s >= 4.5 ? 'ok' : s >= 3.5 ? 'info' : s >= 2.5 ? 'warn' : 'crit';

const SatisfactionSurveyV2: React.FC = () => {
  const [items, setItems] = useState<SurveyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<ScoreKey | 'all'>('all');
  const [fTmpl, setFTmpl] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<SurveyResult | null>(null);

  // --- Chiến dịch mới ---
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignSubmitting, setCampaignSubmitting] = useState(false);
  const [campaignForm] = Form.useForm<{ name: string; description?: string; startDate: string; endDate: string; targetCount?: number; notes?: string }>();

  const submitCampaign = async () => {
    try {
      const v = await campaignForm.validateFields();
      setCampaignSubmitting(true);
      const dto: CreateCampaignDto = { name: v.name, description: v.description, startDate: v.startDate, endDate: v.endDate, targetCount: v.targetCount, notes: v.notes };
      await createCampaign(dto);
      tk('Đã tạo chiến dịch khảo sát');
      setCampaignOpen(false);
      campaignForm.resetFields();
      load();
    } catch { tw('Tạo chiến dịch thất bại'); }
    finally { setCampaignSubmitting(false); }
  };

  // --- Liên hệ phản hồi ---
  const [callbackTarget, setCallbackTarget] = useState<SurveyResult | null>(null);
  const [callbackSubmitting, setCallbackSubmitting] = useState(false);
  const [callbackForm] = Form.useForm<{ issueDescription?: string; contactedByName?: string; resolution?: string }>();

  const submitCallback = async () => {
    if (!callbackTarget) return;
    try {
      const v = await callbackForm.validateFields();
      setCallbackSubmitting(true);
      const dto: ContactCallbackDto = {
        surveyResultId: callbackTarget.id,
        patientCode: callbackTarget.patientCode,
        patientName: callbackTarget.patientName,
        issueDescription: v.issueDescription,
        contactedByName: v.contactedByName,
        resolution: v.resolution,
      };
      await contactCallback(dto);
      tk('Đã ghi nhận liên hệ phản hồi');
      setCallbackTarget(null);
      callbackForm.resetFields();
      load();
    } catch { tw('Ghi nhận liên hệ thất bại'); }
    finally { setCallbackSubmitting(false); }
  };

  // --- Xuất CSV ---
  const [csvLoading, setCsvLoading] = useState(false);

  const handleExportCsv = async () => {
    setCsvLoading(true);
    try {
      const res = await exportSurveys();
      // interceptor không unwrap blob → res.data là Blob
      const blob: Blob = (res as unknown as { data: Blob }).data;
      if (blob instanceof Blob) {
        file.downloadBlob(blob, `khao-sat-hai-long-${dayjs().format('YYYY-MM-DD')}.csv`);
        tk('Đã xuất CSV');
      } else throw new Error('no blob');
    } catch {
      // fallback: xuất từ data đang hiển thị
      const header = ['Mã BN', 'Họ tên', 'Mẫu khảo sát', 'Khoa', 'Điểm', 'Ngày', 'Trạng thái'].map(escapeCsvCell).join(',');
      const rows = filtered.map((r) =>
        [r.patientCode, r.patientName, r.templateName, r.department || '', r.score, r.date ? dayjs(r.date).format('DD/MM/YYYY') : '', r.status]
          .map(escapeCsvCell).join(',')
      );
      downloadCsv(`khao-sat-hai-long-${dayjs().format('YYYY-MM-DD')}.csv`, [header, ...rows]);
      tk('Đã xuất CSV (dữ liệu hiển thị)');
    } finally { setCsvLoading(false); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSurveyResults();
      // BE có thể trả mảng thô hoặc { items: [] } — chuẩn hoá. Field name alias do BE evolve.
      interface RawSurveyRow {
        id?: string; patientCode?: string; patientName?: string;
        templateName?: string; score?: number;
        date?: string; createdAt?: string;
        status?: string;
        department?: string; departmentName?: string;
      }
      const data = normalizeArrayResponse<RawSurveyRow>(res.data);
      const rows: SurveyResult[] = data.map((r, i) => ({
        id: r.id || `r-${i}`,
        patientCode: r.patientCode || '',
        patientName: r.patientName || '',
        templateName: r.templateName || '',
        score: r.score || 0,
        date: r.date || r.createdAt || '',
        status: r.status || '',
        department: r.department || r.departmentName,
      }));
      setItems(rows);
    } catch { setItems([]); ti('Không tải được phản hồi khảo sát'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const templates = useMemo(() => {
    const set = new Set(items.map((r) => r.templateName).filter(Boolean));
    return Array.from(set).map((t) => ({ v: t, l: t }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    SCORE_TABS.forEach((s) => { c[s.v] = items.filter((r) => r.score > 0 && scoreKey(r.score) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && (r.score === 0 || scoreKey(r.score) !== stab)) return false;
      if (fTmpl && r.templateName !== fTmpl) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.templateName].some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fTmpl]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const avg = items.length ? items.reduce((s, r) => s + (r.score || 0), 0) / items.length : 0;
  const last30 = items.filter((r) => r.date && dayjs(r.date).isAfter(dayjs().subtract(30, 'day'))).length;
  const npsLike = items.length ? Math.round(((counts.high || 0) - (counts.low || 0)) / items.length * 100) : 0;

  // Department aggregation
  const byDept = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    items.forEach((r) => {
      const d = r.department || 'Khác';
      const m = map.get(d) || { sum: 0, count: 0 };
      m.sum += r.score || 0; m.count += 1;
      map.set(d, m);
    });
    return Array.from(map.entries())
      .map(([d, m]) => ({ d, avg: m.count ? m.sum / m.count : 0, n: m.count }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  }, [items]);

  const cols: ColumnDef<SurveyResult>[] = [
    { key: 'pat', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'tmpl', label: 'Mẫu khảo sát', render: (r) => r.templateName },
    { key: 'dept', label: 'Khoa', render: (r) => r.department || '—' },
    { key: 'score', label: 'Điểm', mono: true, render: (r) => (
      <StatusBadge tone={toneFor(r.score)} dot>{r.score?.toFixed(1) || '—'}</StatusBadge>
    ) },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => r.date ? dayjs(r.date).format('DD/MM/YYYY') : '—' },
    { key: 'status', label: 'TT', render: (r) => r.status || '—' },
  ];

  const actions = (r: SurveyResult) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {r.score <= 2 && r.score > 0 && (
        <ActBtn ic="phone" title="Liên hệ phản hồi" onClick={() => { callbackForm.resetFields(); setCallbackTarget(r); }} tone="warn" />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng phản hồi', val: items.length, sub: `${last30} trong 30 ngày` },
        { lbl: 'Điểm TB', val: avg.toFixed(2), sub: '/5', tone: toneFor(avg) === 'crit' ? 'crit' : toneFor(avg) === 'warn' ? 'warn' : 'ok' },
        { lbl: '≥4 sao', val: counts.high || 0, sub: `${Math.round(((counts.high || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: '3 sao', val: counts.mid || 0, sub: 'trung bình', tone: 'warn' },
        { lbl: '≤2 sao', val: counts.low || 0, sub: 'cần xử lý', tone: 'crit' },
        { lbl: 'NPS-like', val: `${npsLike}%`, sub: 'điểm thuần', tone: npsLike >= 50 ? 'ok' : npsLike >= 0 ? 'warn' : 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / mẫu khảo sát…" />
        <Filter value={fTmpl} onChange={setFTmpl} options={templates} placeholder="▾ Mẫu khảo sát" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFTmpl(''); setStab('all'); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={handleExportCsv} disabled={csvLoading}>
          <Ico name="download" size={12} /> {csvLoading ? 'Đang xuất…' : 'Xuất CSV'}
        </Btn>
        <Btn variant="primary" onClick={() => { campaignForm.resetFields(); setCampaignOpen(true); }}>
          <Ico name="plus" size={12} /> Chiến dịch mới
        </Btn>
      </div>

      <StatusTabs<ScoreKey> value={stab} onChange={setStab} tabs={SCORE_TABS} counts={counts} />

      {/* Top dept performance bars (compact, before table) */}
      {byDept.length > 0 && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', background: 'var(--d-1)' }}>
          <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-8)' }}>TOP 5 KHOA THEO SỐ PHẢN HỒI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {byDept.map((d) => (
              <div key={d.d} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)', fontSize: 'var(--fs-sm)' }}>
                <span style={{ width: 160, color: 'var(--t-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.d}</span>
                <div style={{ flex: 1, height: 12, background: 'var(--bg-1)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--line-soft)' }}>
                  <div style={{
                    width: `${(d.n / Math.max(1, byDept[0].n)) * 100}%`,
                    height: '100%',
                    background: toneFor(d.avg) === 'ok' ? 'var(--a-em-line)' : toneFor(d.avg) === 'warn' ? 'var(--a-or-line)' : toneFor(d.avg) === 'crit' ? 'var(--a-rd-line)' : 'var(--a-cy-line)',
                  }} />
                </div>
                <span style={{ width: 50, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--t-0)' }}>{d.n}</span>
                <span style={{ width: 60, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--t-2)' }}>{d.avg.toFixed(2)}/5</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable<SurveyResult>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có phản hồi khảo sát'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Phản hồi · ${sel.patientName}` : ''}
        sub={sel ? `${sel.patientCode} · ${sel.templateName}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => window.print()}>
            <Ico name="print" size={12} /> In
          </Btn>
          {sel && sel.score <= 2 && sel.score > 0 && (
            <Btn variant="primary" onClick={() => { callbackForm.resetFields(); setCallbackTarget(sel); setSel(null); }}>
              <Ico name="phone" size={12} /> Liên hệ BN
            </Btn>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân">
            <DrField lbl="Mã BN">{sel.patientCode}</DrField>
            <DrField lbl="Họ tên">{sel.patientName}</DrField>
            <DrField lbl="Khoa">{sel.department || '—'}</DrField>
          </DrSec>
          <DrSec title="Khảo sát">
            <DrField lbl="Mẫu">{sel.templateName}</DrField>
            <DrField lbl="Ngày phản hồi">{sel.date ? dayjs(sel.date).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Trạng thái">{sel.status || '—'}</DrField>
          </DrSec>
          <DrSec title="Đánh giá">
            <div style={{ padding: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-mono)', color: `var(--a-${toneFor(sel.score) === 'ok' ? 'em' : toneFor(sel.score) === 'warn' ? 'or' : toneFor(sel.score) === 'crit' ? 'rd' : 'cy'}-text)` }}>
                {sel.score?.toFixed(1) || '—'}
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-4)' }}>trên 5 sao</div>
              <div style={{ marginTop: 'var(--space-12)' }}>
                <StatusBadge tone={toneFor(sel.score)} dot>
                  {toneFor(sel.score) === 'ok' ? 'Rất hài lòng'
                    : toneFor(sel.score) === 'info' ? 'Hài lòng'
                    : toneFor(sel.score) === 'warn' ? 'Trung bình' : 'Không hài lòng'}
                </StatusBadge>
              </div>
            </div>
          </DrSec>
        </>}
      </DrawerShell>

      {/* Modal tạo chiến dịch */}
      <ModalShell
        open={campaignOpen}
        onClose={() => setCampaignOpen(false)}
        size="md"
        title="Tạo chiến dịch khảo sát"
        footer={<>
          <Btn variant="ghost" onClick={() => setCampaignOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={submitCampaign} disabled={campaignSubmitting}>
            <Ico name="plus" size={12} /> {campaignSubmitting ? 'Đang tạo…' : 'Tạo chiến dịch'}
          </Btn>
        </>}
      >
        <Form form={campaignForm} layout="vertical">
          <Form.Item name="name" label="Tên chiến dịch" rules={[{ required: true, message: 'Nhập tên chiến dịch' }]}>
            <Input placeholder="VD: Khảo sát hài lòng tháng 6/2026" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả ngắn về chiến dịch…" />
          </Form.Item>
          <Form.Item name="startDate" label="Ngày bắt đầu" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="endDate" label="Ngày kết thúc" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="targetCount" label="Mục tiêu số phản hồi">
            <Input type="number" min={1} placeholder="VD: 200" />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </ModalShell>

      {/* Modal liên hệ phản hồi */}
      <ModalShell
        open={!!callbackTarget}
        onClose={() => setCallbackTarget(null)}
        size="md"
        title={callbackTarget ? `Liên hệ phản hồi · ${callbackTarget.patientName}` : 'Liên hệ phản hồi'}
        footer={<>
          <Btn variant="ghost" onClick={() => setCallbackTarget(null)}>Hủy</Btn>
          <Btn variant="primary" onClick={submitCallback} disabled={callbackSubmitting}>
            <Ico name="phone" size={12} /> {callbackSubmitting ? 'Đang ghi nhận…' : 'Ghi nhận liên hệ'}
          </Btn>
        </>}
      >
        <Form form={callbackForm} layout="vertical">
          <Form.Item name="issueDescription" label="Mô tả vấn đề BN phản ánh">
            <Input.TextArea rows={3} placeholder="BN phàn nàn về…" />
          </Form.Item>
          <Form.Item name="contactedByName" label="Người liên hệ (nhân viên)">
            <Input placeholder="Tên nhân viên xử lý" />
          </Form.Item>
          <Form.Item name="resolution" label="Hướng xử lý / kết quả">
            <Input.TextArea rows={2} placeholder="Đã giải thích / hẹn gặp / chuyển khoa…" />
          </Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default SatisfactionSurveyV2;
