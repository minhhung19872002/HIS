import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import client from '../api/client';
import {
  KpiStrip, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  StatusTabs, DrawerShell, DrSec, DrField, tk, ti, Ico,
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

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get('/satisfaction-survey/results');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (res.data?.items || res.data || []) as any[];
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
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
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
        <ActBtn ic="phone" title="Liên hệ phản hồi" onClick={() => tk('Đã ghi nhận yêu cầu liên hệ')} tone="warn" />
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
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFTmpl(''); setStab('all'); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Đã xuất CSV')}>
          <Ico name="download" size={12} /> Xuất CSV
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Tạo chiến dịch khảo sát mới')}>
          <Ico name="plus" size={12} /> Chiến dịch mới
        </button>
      </div>

      <StatusTabs<ScoreKey> value={stab} onChange={setStab} tabs={SCORE_TABS} counts={counts} />

      {/* Top dept performance bars (compact, before table) */}
      {byDept.length > 0 && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', background: 'var(--d-1)' }}>
          <div style={{ fontSize: 10, color: 'var(--t-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>TOP 5 KHOA THEO SỐ PHẢN HỒI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {byDept.map((d) => (
              <div key={d.d} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
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
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in phản hồi')}>
            <Ico name="print" size={12} /> In
          </button>
          {sel && sel.score <= 2 && sel.score > 0 && (
            <button type="button" className="ab-btn primary" onClick={() => { tk('Đã đặt lịch liên hệ BN'); setSel(null); }}>
              <Ico name="phone" size={12} /> Liên hệ BN
            </button>
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
            <div style={{ padding: 14, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-mono)', color: `var(--a-${toneFor(sel.score) === 'ok' ? 'em' : toneFor(sel.score) === 'warn' ? 'or' : toneFor(sel.score) === 'crit' ? 'rd' : 'cy'}-text)` }}>
                {sel.score?.toFixed(1) || '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 4 }}>trên 5 sao</div>
              <div style={{ marginTop: 12 }}>
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
    </div>
  );
};

export default SatisfactionSurveyV2;
