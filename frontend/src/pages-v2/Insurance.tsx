import React, { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { searchInsuranceClaims } from '../api/insurance';
import type { InsuranceClaimSummaryDto } from '../api/insurance';
import {
  KpiStrip, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, useListData, useTabCounts,
  type ColumnDef, type StatusTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import { fmtVND } from '../utils/format';

/* BHYT v2 — claims management */

/** Tải CSV với BOM UTF-8 để Excel mở đúng tiếng Việt */
function downloadCsv(filename: string, lines: string[]): void {
  const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  window.URL.revokeObjectURL(url);
}

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

type StatusKey = 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected';

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'draft',     l: 'Nháp',     tone: 'info' },
  { v: 'pending',   l: 'Chờ gửi',  tone: 'warn' },
  { v: 'submitted', l: 'Đã gửi',   tone: 'warn' },
  { v: 'approved',  l: 'Đã duyệt', tone: 'ok' },
  { v: 'rejected',  l: 'Từ chối',  tone: 'crit' },
];
const statusKey = (s: number): StatusKey => {
  if (s === 4) return 'rejected';
  if (s === 3) return 'approved';
  if (s === 2) return 'submitted';
  if (s === 1) return 'pending';
  return 'draft';
};
const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const InsuranceV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const { rows, loading, reload } = useListData<InsuranceClaimSummaryDto>(
    useCallback(() => searchInsuranceClaims({
      fromDate: dayjs().subtract(60, 'day').format('YYYY-MM-DD'),
      toDate:   dayjs().format('YYYY-MM-DD'),
      pageNumber: 1, pageSize: 200,
    }).then((r) => Array.isArray(r.data?.items) ? r.data.items : []), []),
  );
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<InsuranceClaimSummaryDto | null>(null);
  const PAGE_SIZE = 16;

  const counts = useTabCounts(rows, STATUS_TABS, (r) => statusKey(r.status));

  const filtered = useMemo(() => rows.filter((r) => {
    if (stab !== 'all' && statusKey(r.status) !== stab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [r.maLk, r.patientName, r.patientCode, r.insuranceNumber, r.diagnosisName]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [rows, stab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const kpis = useMemo(() => {
    const totalAmount = rows.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const insuranceAmount = rows.reduce((s, r) => s + (r.insuranceAmount || 0), 0);
    const approvalRate = rows.length > 0
      ? Math.round(rows.filter((r) => r.status === 3).length / rows.length * 100)
      : 0;
    return {
      total: rows.length,
      pending: (counts.pending || 0) + (counts.submitted || 0),
      approved: counts.approved || 0,
      rejected: counts.rejected || 0,
      totalAmount,
      insuranceAmount,
      approvalRate,
    };
  }, [rows, counts]);

  const columns: ColumnDef<InsuranceClaimSummaryDto>[] = [
    { key: 'maLk', label: 'Mã LK', mono: true, width: 130, render: (r) => r.maLk },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode}</i>
        </div>
      ),
    },
    { key: 'bhyt', label: 'Số thẻ BHYT', mono: true, width: 160, render: (r) => r.insuranceNumber },
    {
      key: 'dx', label: 'Chẩn đoán',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.diagnosisName}</b>
          <i className="mono">{r.diagnosisCode}</i>
        </div>
      ),
    },
    { key: 'admit', label: 'Vào viện', mono: true, width: 100, render: (r) => fmtDMY(r.admissionDate) },
    { key: 'discharge', label: 'Ra viện', mono: true, width: 100, render: (r) => fmtDMY(r.dischargeDate) },
    { key: 'amount', label: 'Tổng tiền', mono: true, width: 120, render: (r) => fmtVND(r.totalAmount) },
    { key: 'bhyt-amount', label: 'BHYT chi trả', mono: true, width: 120, render: (r) => fmtVND(r.insuranceAmount) },
    {
      key: 'status', label: 'TT', width: 120,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={statusTone(sk)} dot>{r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Tổng hồ sơ', val: kpis.total, sub: '60 ngày' },
          { lbl: 'Chờ duyệt', val: kpis.pending, sub: 'đã gửi BHXH', tone: 'warn' },
          { lbl: 'Đã duyệt', val: kpis.approved, sub: `${kpis.approvalRate}% pass`, tone: 'ok' },
          { lbl: 'Từ chối', val: kpis.rejected, sub: 'cần sửa', tone: 'crit' },
          { lbl: 'Tổng tiền', val: Math.round(kpis.totalAmount / 1_000_000), unit: 'tr', sub: 'VND' },
          { lbl: 'BHYT chi trả', val: Math.round(kpis.insuranceAmount / 1_000_000), unit: 'tr', sub: 'VND', tone: 'ok' },
        ]}
      />

      <div className="ab-tools">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / mã LK / số thẻ BHYT / CĐ…" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setStab('all'); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={reload}>
          <TermIcon name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => navigate('/v2/bhxh-audit')}>
          <TermIcon name="check" size={12} /> Validate XML
        </Btn>
        <Btn variant="ghost" onClick={() => {
          const header = ['Ma LK', 'Ma BN', 'Ho ten', 'So the BHYT', 'Ngay vao vien', 'Ngay ra vien', 'Ma ICD', 'Chan doan', 'Tong tien', 'BHYT chi tra', 'BN dong chi tra', 'BN tu tra', 'Trang thai'];
          const rows = filtered.map((r) => [
            r.maLk, r.patientCode, r.patientName, r.insuranceNumber,
            r.admissionDate ? dayjs(r.admissionDate).format('DD/MM/YYYY') : '',
            r.dischargeDate ? dayjs(r.dischargeDate).format('DD/MM/YYYY') : '',
            r.diagnosisCode, r.diagnosisName,
            r.totalAmount, r.insuranceAmount, r.coPayAmount, r.patientAmount,
            r.statusName,
          ]);
          downloadCsv(
            `bhyt-claims-${dayjs().format('YYYYMMDD-HHmm')}.csv`,
            [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')),
          );
          message.success(`Đã xuất ${filtered.length} hồ sơ BHYT`);
        }}>
          <TermIcon name="download" size={12} /> Xuất CSV
        </Btn>
        <Btn variant="primary" onClick={() => navigate('/v2/bhxh-config')}>
          <TermIcon name="send" size={12} /> Gửi BHXH
        </Btn>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<InsuranceClaimSummaryDto>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r)}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetail(r)} />
            <ActBtn ic="print" title="In phiếu BHYT" onClick={() => { setDetail(r); setTimeout(() => window.print(), 300); }} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">
            <TermIcon name="search" size={20} />
            <div>Không có hồ sơ BHYT nào</div>
          </div>
        )}
      />

      <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PAGE_SIZE} />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{detail.maLk}</span>
              <span style={{ fontSize: 14 }}>{detail.patientName}</span>
            </span>
          : ''}
        sub={detail ? `${detail.patientCode} · ${fmtDMY(detail.admissionDate)}` : ''}
        size="lg"
      >
        {detail && <InsuranceDrawerBody r={detail} />}
      </DrawerShell>
    </div>
  );
};

const InsuranceDrawerBody: React.FC<{ r: InsuranceClaimSummaryDto }> = ({ r }) => {
  const sk = statusKey(r.status);
  const tone = statusTone(sk);
  const lbl = r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l || '';
  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          {r.submitDate && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Gửi {fmtDMY(r.submitDate)}</span>}
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> BỆNH NHÂN & THẺ BHYT</h5>
        <div className="rec-kv">
          <span>Họ tên</span><b>{r.patientName}</b>
          <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
          <span>Số thẻ BHYT</span><span className="mono">{r.insuranceNumber}</span>
          <span>Mã LK</span><span className="mono">{r.maLk}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="stethoscope" size={11} /> CHẨN ĐOÁN</h5>
        <div className="rec-kv">
          <span>Mã ICD</span><b className="mono">{r.diagnosisCode}</b>
          <span>Tên</span><span>{r.diagnosisName}</span>
          <span>Vào viện</span><span className="mono">{fmtDMY(r.admissionDate)}</span>
          <span>Ra viện</span><span className="mono">{fmtDMY(r.dischargeDate)}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="dollar" size={11} /> CHI PHÍ</h5>
        <div className="rec-kv">
          <span>Tổng tiền</span><b className="mono">{fmtVND(r.totalAmount)}</b>
          <span>BHYT chi trả</span><b className="mono" style={{ color: '#15803d' }}>{fmtVND(r.insuranceAmount)}</b>
          <span>BN đồng chi trả</span><b className="mono">{fmtVND(r.coPayAmount)}</b>
          <span>BN tự trả</span><b className="mono" style={{ color: 'var(--s-warn)' }}>{fmtVND(r.patientAmount)}</b>
        </div>
      </div>

      {r.rejectReason && (
        <div className="rec-section">
          <h5><TermIcon name="alert" size={11} /> LÝ DO TỪ CHỐI</h5>
          <div style={{ fontSize: 12.5, color: 'var(--s-crit)', whiteSpace: 'pre-wrap' }}>{r.rejectReason}</div>
        </div>
      )}
    </>
  );
};

export default InsuranceV2;
