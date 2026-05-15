import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KpiStrip, DataTable, SearchBox, Filter, StatusBadge,
  DrawerShell, ActBtn, DrSec, DrField, Pager,
  type ColumnDef, type KpiItem, type StatusTone,
  tk, te, fmtDTg
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import {
  fdt,
  type FunctionalDiagnosticTestDto
} from '../api/nangcap23';

const FDT_TYPES: { v: string; l: string }[] = [
  { v: 'ECG',         l: 'Điện tim thường quy' },
  { v: 'ECGStress',   l: 'Điện tim gắng sức' },
  { v: 'Endoscopy',   l: 'Nội soi' },
  { v: 'BoneDensity', l: 'Đo loãng xương' },
  { v: 'EEG',         l: 'Điện não' },
  { v: 'EMG',         l: 'Điện cơ' },
  { v: 'Spirometry',  l: 'Đo CN hô hấp' },
  { v: 'Audiometry',  l: 'Đo thính lực' },
];

const FDT_STATUS: { v: number; l: string; tone: StatusTone }[] = [
  { v: 0, l: 'Đã chỉ định', tone: 'info' },
  { v: 1, l: 'Đang TH',     tone: 'warn' },
  { v: 2, l: 'Hoàn thành',  tone: 'info' },
  { v: 3, l: 'Đã duyệt',    tone: 'ok'   },
  { v: 4, l: 'Hủy',         tone: 'crit' },
];
const fdtTone = (s: number): StatusTone => FDT_STATUS[s]?.tone || 'info';
const fdtLabel = (s: number): string => FDT_STATUS[s]?.l || '—';

const PER = 20;

const FunctionalDiagnosticsV2: React.FC = () => {
  const [rows, setRows] = useState<FunctionalDiagnosticTestDto[]>([]);
  const [search, setSearch] = useState('');
  const [fType, setFType] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<FunctionalDiagnosticTestDto | null>(null);

  const load = useCallback(async () => {
    try { setRows(await fdt.search({ pageSize: 500 })); }
    catch { te('Không tải được'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (fType && r.testType !== fType) return false;
    if (fStatus !== '' && r.status !== Number(fStatus)) return false;
    if (search) {
      const k = search.toLowerCase();
      return [r.testCode, r.patientName || '', r.patientCode || '']
        .some((x) => x.toLowerCase().includes(k));
    }
    return true;
  }), [rows, fType, fStatus, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);
  useEffect(() => { setPage(0); }, [search, fType, fStatus]);

  const complete = async (r: FunctionalDiagnosticTestDto) => {
    try { await fdt.complete(r.id); tk('Đã hoàn thành thăm dò'); load(); setDetail(null); }
    catch { te('Cập nhật thất bại'); }
  };
  const verify = async (r: FunctionalDiagnosticTestDto) => {
    try { await fdt.verify(r.id); tk('Đã duyệt kết quả'); load(); setDetail(null); }
    catch { te('Duyệt thất bại'); }
  };

  const kpis: KpiItem[] = [
    { lbl: 'Tổng',         val: rows.length },
    { lbl: 'Đã duyệt',     val: rows.filter((r) => r.status === 3).length, tone: 'ok'   },
    { lbl: 'Đã hoàn thành',val: rows.filter((r) => r.status === 2).length, tone: 'info' },
    { lbl: 'Đang chờ',     val: rows.filter((r) => r.status < 2).length,   tone: 'warn' },
  ];

  const columns: ColumnDef<FunctionalDiagnosticTestDto>[] = [
    { key: 'testCode', label: 'Mã', mono: true, code: true, width: 180 },
    { key: 'patientName', label: 'Bệnh nhân',
      render: (r) => (
        <div>
          <b>{r.patientName || '—'}</b>
          <div className="mono" style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
        </div>
      ) },
    { key: 'testTypeName', label: 'Loại TDCN', width: 200 },
    { key: 'performingDoctorName', label: 'BS thực hiện', width: 180,
      render: (r) => r.performingDoctorName || '—' },
    { key: 'performedAt', label: 'Thực hiện', mono: true, width: 140,
      render: (r) => fmtDTg(r.performedAt) },
    { key: 'status', label: 'Trạng thái', width: 140,
      render: (r) => <StatusBadge tone={fdtTone(r.status)} dot>{r.statusName || fdtLabel(r.status)}</StatusBadge> },
  ];

  return (
    <div className="ab" data-testid="functional-diagnostics-page">
      <KpiStrip items={kpis} />
      <div className="ab-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã / BN…" />
        <Filter value={fType} onChange={setFType}
          options={FDT_TYPES.map((t) => ({ v: t.v, l: t.l }))}
          placeholder="▾ Loại TDCN" />
        <Filter value={fStatus} onChange={setFStatus}
          options={FDT_STATUS.map((s) => ({ v: String(s.v), l: s.l }))}
          placeholder="▾ Trạng thái" />
      </div>
      <DataTable<FunctionalDiagnosticTestDto>
        rowKey={(r) => r.id} data={paged} columns={columns}
        onRowClick={setDetail}
        actions={(r) => (
          <>
            {r.status === 1 && <ActBtn ic="check" title="Hoàn thành" onClick={() => complete(r)} />}
            {r.status === 2 && <ActBtn ic="check" title="Duyệt" onClick={() => verify(r)} />}
          </>
        )}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} size="lg"
        title={detail ? `${detail.testTypeName} · ${detail.testCode}` : ''}
        footer={detail ? (
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
            {detail.status === 1 && (
              <button type="button" className="ab-btn" onClick={() => complete(detail)}>
                <TermIcon name="check" size={12} /> Hoàn thành
              </button>
            )}
            {detail.status === 2 && (
              <button type="button" className="ab-btn primary" onClick={() => verify(detail)}>
                <TermIcon name="check" size={12} /> Duyệt KQ
              </button>
            )}
          </>
        ) : undefined}
      >
        {detail && (
          <>
            <DrSec title="BỆNH NHÂN">
              <DrField lbl="Họ tên">{detail.patientName}</DrField>
              <DrField lbl="Mã BN"><span className="mono">{detail.patientCode}</span></DrField>
            </DrSec>
            <DrSec title="KHÁM">
              <DrField lbl="Loại">{detail.testTypeName}</DrField>
              <DrField lbl="BS thực hiện">{detail.performingDoctorName || '—'}</DrField>
              <DrField lbl="Thực hiện lúc">{fmtDTg(detail.performedAt)}</DrField>
              <DrField lbl="Thiết bị">{detail.deviceName || '—'}</DrField>
              <DrField lbl="Số seri"><span className="mono">{detail.deviceSerialNumber || '—'}</span></DrField>
            </DrSec>
            <DrSec title="CHỈ ĐỊNH">
              <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>
                {detail.clinicalIndication || '—'}
              </div>
            </DrSec>
            {detail.findings && (
              <DrSec title="KẾT QUẢ">
                <div style={{ marginBottom: 8 }}><b>Mô tả:</b></div>
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap', marginBottom: 12 }}>
                  {detail.findings}
                </div>
                <div style={{ marginBottom: 8 }}><b>Kết luận:</b></div>
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap', marginBottom: 12 }}>
                  {detail.conclusion || '—'}
                </div>
                <div style={{ marginBottom: 8 }}><b>Khuyến nghị:</b></div>
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>
                  {detail.recommendation || '—'}
                </div>
              </DrSec>
            )}
            {detail.measurementsJson && detail.measurementsJson !== '{}' && (
              <DrSec title="THÔNG SỐ">
                <pre style={{ fontSize: 11, padding: 8, background: 'var(--d-1)', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
                  {(() => { try { return JSON.stringify(JSON.parse(detail.measurementsJson), null, 2); } catch { return detail.measurementsJson; } })()}
                </pre>
              </DrSec>
            )}
          </>
        )}
      </DrawerShell>
    </div>
  );
};

export default FunctionalDiagnosticsV2;
