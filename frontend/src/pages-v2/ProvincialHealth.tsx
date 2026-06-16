// =====================================================================
// HIS Terminal · CHỈ ĐẠO TUYẾN — v2
// Tabs: Chỉ đạo tuyến (persist thật) · Báo cáo tháng
// #47 — Bound to /api/provincial-health/directives/* + /reports/*
// =====================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, Select, DatePicker } from 'antd';
import dayjs from 'dayjs';
import {
  searchDirectives, saveDirective, deleteDirective,
  searchReports as searchProvincialReports,
  type ProvincialDirectiveDto,
  type SaveProvincialDirectiveRequest,
  type ProvincialReportDto,
} from '../api/provincialHealth';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, tk, te, cf,
  type ColumnDef, type TopTab,
} from './_v2kit';

// ─── Constants ───────────────────────────────────────────────────────────────

type TabKey = 'directives' | 'reports';

const TABS: TopTab<TabKey>[] = [
  { v: 'directives', l: 'Chỉ đạo tuyến', ic: 'file-text' },
  { v: 'reports',    l: 'Báo cáo tháng', ic: 'bar-chart' },
];

const DIRECTIVE_STATUS: Record<number, { l: string; tone: 'info' | 'warn' | 'ok' | 'crit' }> = {
  0: { l: 'Mới',             tone: 'info' },
  1: { l: 'Đang thực hiện', tone: 'warn' },
  2: { l: 'Hoàn thành',     tone: 'ok'   },
  3: { l: 'Hết hiệu lực',   tone: 'crit' },
};

const REPORT_STATUS: Record<number, { l: string; tone: 'info' | 'warn' | 'ok' | 'crit' }> = {
  0: { l: 'Nháp',        tone: 'info' },
  1: { l: 'Đã gửi',      tone: 'warn' },
  2: { l: 'Đã xác nhận', tone: 'ok'   },
  3: { l: 'Từ chối',     tone: 'crit' },
};

const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

type EditDirective = {
  id?: string;
  title: string;
  directiveNo: string;
  content: string;
  issueDate: string;
  fromLevel: string;
  toLevel: string;
  status: number;
  notes: string;
};

const EMPTY_DIRECTIVE: EditDirective = {
  title: '', directiveNo: '', content: '', issueDate: dayjs().toISOString(),
  fromLevel: '', toLevel: '', status: 0, notes: '',
};

const PER = 20;

// ─── Component ───────────────────────────────────────────────────────────────

const ProvincialHealthV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('directives');

  // ── Directives state ───────────────────────────────────────────────────────
  const [directives, setDirectives] = useState<ProvincialDirectiveDto[]>([]);
  const [dirTotal, setDirTotal]     = useState(0);
  const [dirPage, setDirPage]       = useState(0);
  const [dirSearch, setDirSearch]   = useState('');
  const [dirStatus, setDirStatus]   = useState<number | undefined>(undefined);
  const [editDir, setEditDir]       = useState<EditDirective | null>(null);
  const [saving, setSaving]         = useState(false);

  // ── Reports state ──────────────────────────────────────────────────────────
  const [reports, setReports] = useState<ProvincialReportDto[]>([]);
  const [rptTotal, setRptTotal] = useState(0);
  const [rptPage, setRptPage]   = useState(0);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadDirectives = useCallback(async () => {
    try {
      const res = await searchDirectives({
        keyword: dirSearch || undefined,
        status: dirStatus,
        pageIndex: dirPage,
        pageSize: PER,
      });
      setDirectives(res.items);
      setDirTotal(res.totalCount);
    } catch { te('Không tải được danh sách chỉ đạo tuyến'); }
  }, [dirSearch, dirStatus, dirPage]);

  const loadReports = useCallback(async () => {
    try {
      const res = await searchProvincialReports({ pageIndex: rptPage, pageSize: PER });
      setReports(res.items);
      setRptTotal(res.totalCount);
    } catch { te('Không tải được danh sách báo cáo'); }
  }, [rptPage]);

  useEffect(() => { if (tab === 'directives') void loadDirectives(); }, [tab, loadDirectives]);
  useEffect(() => { if (tab === 'reports')    void loadReports();    }, [tab, loadReports]);

  // ── KPI ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (tab === 'directives') return [
      { lbl: 'Tổng chỉ đạo', val: dirTotal },
      { lbl: 'Mới',          val: directives.filter(d => d.status === 0).length, tone: 'info' as const },
      { lbl: 'Đang TH',      val: directives.filter(d => d.status === 1).length, tone: 'warn' as const },
      { lbl: 'Hoàn thành',   val: directives.filter(d => d.status === 2).length, tone: 'ok'   as const },
    ];
    return [
      { lbl: 'Tổng báo cáo', val: rptTotal },
      { lbl: 'Đã gửi',       val: reports.filter(r => r.status === 1).length, tone: 'warn' as const },
      { lbl: 'Đã xác nhận',  val: reports.filter(r => r.status === 2).length, tone: 'ok'   as const },
    ];
  }, [tab, directives, dirTotal, reports, rptTotal]);

  // ── Directive columns ──────────────────────────────────────────────────────
  const colsDir: ColumnDef<ProvincialDirectiveDto>[] = [
    { key: 'no', label: 'Số VB', width: 140, mono: true, render: r => r.directiveNo || '—' },
    { key: 'title', label: 'Tiêu đề', render: r => (
      <div className="cell-2l"><b>{r.title}</b><i>{r.fromLevel || '—'} → {r.toLevel || '—'}</i></div>
    )},
    { key: 'issueDate', label: 'Ngày ban hành', width: 120, mono: true, render: r => fmtDMY(r.issueDate) },
    { key: 'status', label: 'Trạng thái', width: 140, render: r => {
      const s = DIRECTIVE_STATUS[r.status] ?? { l: 'Không xác định', tone: 'info' as const };
      return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>;
    }},
  ];

  // ── Report columns ─────────────────────────────────────────────────────────
  const colsRpt: ColumnDef<ProvincialReportDto>[] = [
    { key: 'code',   label: 'Mã BC',  width: 160, mono: true, render: r => r.reportCode },
    { key: 'type',   label: 'Loại',   width: 120, render: r => r.reportTypeName },
    { key: 'period', label: 'Kỳ',     width: 120, mono: true, render: r => r.reportPeriod },
    { key: 'outp',   label: 'Ngoại trú', width: 90, mono: true, render: r => r.totalOutpatients.toLocaleString() },
    { key: 'inp',    label: 'Nội trú',   width: 80, mono: true, render: r => r.totalInpatients.toLocaleString() },
    { key: 'status', label: 'TT', width: 130, render: r => {
      const s = REPORT_STATUS[r.status] ?? { l: '?', tone: 'info' as const };
      return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>;
    }},
  ];

  // ── Directive CRUD ─────────────────────────────────────────────────────────
  const openNew = () => setEditDir({ ...EMPTY_DIRECTIVE });

  const onRowClickDir = (r: ProvincialDirectiveDto) => setEditDir({
    id: r.id,
    title: r.title,
    directiveNo: r.directiveNo ?? '',
    content: r.content ?? '',
    issueDate: r.issueDate,
    fromLevel: r.fromLevel ?? '',
    toLevel: r.toLevel ?? '',
    status: r.status,
    notes: r.notes ?? '',
  });

  const onDeleteDir = (id: string) => {
    cf('Xóa chỉ đạo này?', async () => {
      try {
        await deleteDirective(id);
        tk('Đã xóa');
        void loadDirectives();
      } catch { te('Xóa thất bại'); }
    }, { tone: 'crit' });
  };

  const onSaveDir = async () => {
    if (!editDir) return;
    if (!editDir.title.trim()) { te('Vui lòng nhập Tiêu đề'); return; }
    setSaving(true);
    try {
      const req: SaveProvincialDirectiveRequest = {
        id: editDir.id,
        title: editDir.title,
        directiveNo: editDir.directiveNo || undefined,
        content: editDir.content || undefined,
        issueDate: editDir.issueDate,
        fromLevel: editDir.fromLevel || undefined,
        toLevel: editDir.toLevel || undefined,
        status: editDir.status,
        notes: editDir.notes || undefined,
      };
      await saveDirective(req);
      tk(editDir.id ? 'Đã cập nhật chỉ đạo' : 'Đã thêm chỉ đạo mới');
      setEditDir(null);
      void loadDirectives();
    } catch { te('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ab-module">
      <div className="ab-header">
        <h2 className="ab-title">Chỉ đạo tuyến — Sở Y tế</h2>
        <div className="ab-actions">
          {tab === 'directives' && (
            <>
              <Select
                placeholder="Trạng thái"
                allowClear
                style={{ width: 160 }}
                value={dirStatus}
                onChange={v => { setDirStatus(v); setDirPage(0); }}
                options={Object.entries(DIRECTIVE_STATUS).map(([k, v]) => ({ value: Number(k), label: v.l }))}
              />
              <SearchBox
                value={dirSearch}
                onChange={v => { setDirSearch(v); setDirPage(0); }}
                placeholder="Tìm số VB / tiêu đề..."
              />
              <ActBtn ic="plus" title="Thêm chỉ đạo" onClick={openNew} />
            </>
          )}
        </div>
      </div>

      <KpiStrip items={kpis} />

      <TopTabs<TabKey> tabs={TABS} tab={tab} setTab={t => { setTab(t); }} />

      {tab === 'directives' && (
        <>
          <DataTable<ProvincialDirectiveDto>
            columns={colsDir}
            data={directives}
            rowKey={r => r.id}
            onRowClick={onRowClickDir}
            actions={r => (
              <ActBtn ic="trash" title="Xóa" tone="crit"
                onClick={e => { e.stopPropagation(); onDeleteDir(r.id); }} />
            )}
          />
          <Pager
            page={dirPage}
            totalPages={Math.ceil(dirTotal / PER)}
            setPage={setDirPage}
            total={dirTotal}
            perPage={PER}
          />
        </>
      )}

      {tab === 'reports' && (
        <>
          <DataTable<ProvincialReportDto>
            columns={colsRpt}
            data={reports}
            rowKey={r => r.id}
          />
          <Pager
            page={rptPage}
            totalPages={Math.ceil(rptTotal / PER)}
            setPage={setRptPage}
            total={rptTotal}
            perPage={PER}
          />
        </>
      )}

      {/* ── Directive edit drawer ─────────────────────────────────────────── */}
      <DrawerShell
        open={editDir !== null}
        onClose={() => setEditDir(null)}
        title={editDir?.id ? 'Chỉnh sửa chỉ đạo tuyến' : 'Thêm chỉ đạo tuyến mới'}
        footer={<>
          <Btn onClick={() => setEditDir(null)}>Hủy</Btn>
          <ActBtn ic="save" title="Lưu" onClick={onSaveDir} loading={saving} />
        </>}
      >
        {editDir && (
          <>
            <DrSec title="Thông tin văn bản">
              <DrField lbl="Tiêu đề *">
                <Input
                  value={editDir.title}
                  onChange={e => setEditDir({ ...editDir, title: e.target.value })}
                  placeholder="Tiêu đề chỉ đạo tuyến"
                  maxLength={500}
                />
              </DrField>
              <DrField lbl="Số văn bản">
                <Input
                  value={editDir.directiveNo}
                  onChange={e => setEditDir({ ...editDir, directiveNo: e.target.value })}
                  placeholder="VD: 1234/SYT-NVY"
                  maxLength={100}
                />
              </DrField>
              <DrField lbl="Ngày ban hành">
                <DatePicker
                  style={{ width: '100%' }}
                  value={editDir.issueDate ? dayjs(editDir.issueDate) : null}
                  onChange={d => setEditDir({ ...editDir, issueDate: d ? d.toISOString() : dayjs().toISOString() })}
                  format="DD/MM/YYYY"
                />
              </DrField>
              <DrField lbl="Từ tuyến">
                <Input
                  value={editDir.fromLevel}
                  onChange={e => setEditDir({ ...editDir, fromLevel: e.target.value })}
                  placeholder="VD: Sở Y tế Lai Châu"
                  maxLength={200}
                />
              </DrField>
              <DrField lbl="Đến tuyến">
                <Input
                  value={editDir.toLevel}
                  onChange={e => setEditDir({ ...editDir, toLevel: e.target.value })}
                  placeholder="VD: Bệnh viện Đa khoa"
                  maxLength={200}
                />
              </DrField>
              <DrField lbl="Trạng thái">
                <Select
                  style={{ width: '100%' }}
                  value={editDir.status}
                  onChange={v => setEditDir({ ...editDir, status: v })}
                  options={Object.entries(DIRECTIVE_STATUS).map(([k, v]) => ({ value: Number(k), label: v.l }))}
                />
              </DrField>
            </DrSec>

            <DrSec title="Nội dung & ghi chú">
              <DrField lbl="Nội dung">
                <Input.TextArea
                  rows={5}
                  value={editDir.content}
                  onChange={e => setEditDir({ ...editDir, content: e.target.value })}
                  placeholder="Tóm tắt nội dung chỉ đạo..."
                />
              </DrField>
              <DrField lbl="Ghi chú">
                <Input.TextArea
                  rows={3}
                  value={editDir.notes}
                  onChange={e => setEditDir({ ...editDir, notes: e.target.value })}
                  placeholder="Ghi chú thêm..."
                />
              </DrField>
            </DrSec>
          </>
        )}
      </DrawerShell>
    </div>
  );
};

export default ProvincialHealthV2;
