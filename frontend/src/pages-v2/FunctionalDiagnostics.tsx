import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  KpiStrip, DataTable, SearchBox, Filter, StatusBadge,
  DrawerShell, ActBtn, DrSec, DrField,
  type ColumnDef, tk, te
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import {
  fdt,
  type FunctionalDiagnosticTestDto
} from '../api/nangcap23';

const fmtDT = (s?: string) => s ? dayjs(s).format('DD/MM/YYYY HH:mm') : '—';

const toneOfStatus = (s: number): 'ok' | 'warn' | 'crit' | 'info' =>
  s === 3 ? 'ok' : s === 2 ? 'info' : s === 4 ? 'crit' : 'warn';

const FunctionalDiagnosticsV2: React.FC = () => {
  const [rows, setRows] = useState<FunctionalDiagnosticTestDto[]>([]);
  const [keyword, setKeyword] = useState('');
  const [testType, setTestType] = useState('');
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState<FunctionalDiagnosticTestDto | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await fdt.search({
        keyword: keyword.trim() || undefined,
        testType: testType || undefined,
        status: status !== '' ? Number(status) : undefined,
        pageSize: 100
      }));
    } catch { te('Không tải được'); }
  }, [keyword, testType, status]);

  useEffect(() => { load(); }, [load]);

  const complete = async (r: FunctionalDiagnosticTestDto) => {
    try { await fdt.complete(r.id); tk('Đã hoàn thành'); load(); }
    catch { te('Cập nhật thất bại'); }
  };
  const verify = async (r: FunctionalDiagnosticTestDto) => {
    try { await fdt.verify(r.id); tk('Đã duyệt'); load(); }
    catch { te('Duyệt thất bại'); }
  };

  const columns: ColumnDef<FunctionalDiagnosticTestDto>[] = [
    { key: 'code', label: 'Mã', mono: true, width: 180, render: r => r.testCode },
    { key: 'patient', label: 'Bệnh nhân', render: r => (
      <div><b>{r.patientName || '—'}</b><br /><span className="mono" style={{ color: 'var(--t-2)' }}>{r.patientCode}</span></div>
    )},
    { key: 'type', label: 'Loại TDCN', width: 200, render: r => r.testTypeName },
    { key: 'doctor', label: 'BS thực hiện', width: 180, render: r => r.performingDoctorName || '—' },
    { key: 'date', label: 'Thực hiện', mono: true, width: 140, render: r => fmtDT(r.performedAt) },
    { key: 'st', label: 'Trạng thái', width: 140, render: r => <StatusBadge tone={toneOfStatus(r.status)} dot>{r.statusName}</StatusBadge> },
  ];

  const actions = (r: FunctionalDiagnosticTestDto) => (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {r.status === 1 && <ActBtn ic="check" title="Hoàn thành" onClick={() => complete(r)} />}
      {r.status === 2 && <ActBtn ic="check-circle" title="Duyệt" onClick={() => verify(r)} />}
    </span>
  );

  return (
    <div className="ab-stack" data-testid="functional-diagnostics-page">
      <KpiStrip items={[
        { lbl: 'Tổng', val: rows.length },
        { lbl: 'Đã duyệt', val: rows.filter(r => r.status === 3).length, tone: 'ok' },
        { lbl: 'Đã hoàn thành', val: rows.filter(r => r.status === 2).length, tone: 'info' },
        { lbl: 'Đang chờ', val: rows.filter(r => r.status < 2).length, tone: 'warn' },
      ]} />
      <div className="ab-toolbar">
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm theo mã / BN…" minWidth={300} />
        <Filter value={testType} onChange={setTestType} placeholder="— Loại TDCN —" options={[
          { v: 'ECG', l: 'Điện tim thường quy' },
          { v: 'ECGStress', l: 'Điện tim gắng sức' },
          { v: 'Endoscopy', l: 'Nội soi' },
          { v: 'BoneDensity', l: 'Đo loãng xương' },
          { v: 'EEG', l: 'Điện não' },
          { v: 'EMG', l: 'Điện cơ' },
          { v: 'Spirometry', l: 'Đo CN hô hấp' },
          { v: 'Audiometry', l: 'Đo thính lực' },
        ]} />
        <Filter value={status} onChange={setStatus} placeholder="— Trạng thái —" options={[
          { v: '0', l: 'Đã chỉ định' }, { v: '1', l: 'Đang TH' }, { v: '2', l: 'Hoàn thành' }, { v: '3', l: 'Đã duyệt' }, { v: '4', l: 'Hủy' }
        ]} />
        <button type="button" className="ab-btn" onClick={load}><TermIcon name="rotate-cw" size={12}/> Tải lại</button>
      </div>
      <DataTable<FunctionalDiagnosticTestDto> data={rows} rowKey={r => r.id} columns={columns} actions={actions} onRowClick={setDetail} />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} title={`${detail?.testTypeName || ''} — ${detail?.testCode || ''}`}>
        {detail && (
          <>
            <DrSec title="BỆNH NHÂN">
              <DrField lbl="Họ tên">{detail.patientName}</DrField>
              <DrField lbl="Mã BN"><span className="mono">{detail.patientCode}</span></DrField>
            </DrSec>
            <DrSec title="KHÁM">
              <DrField lbl="Loại">{detail.testTypeName}</DrField>
              <DrField lbl="BS thực hiện">{detail.performingDoctorName || '—'}</DrField>
              <DrField lbl="Thực hiện lúc"><span className="mono">{fmtDT(detail.performedAt)}</span></DrField>
              <DrField lbl="Thiết bị">{detail.deviceName || '—'}</DrField>
              <DrField lbl="Số seri thiết bị"><span className="mono">{detail.deviceSerialNumber || '—'}</span></DrField>
            </DrSec>
            <DrSec title="CHỈ ĐỊNH">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 12.5 }}>{detail.clinicalIndication || '—'}</div>
            </DrSec>
            <DrSec title="KẾT QUẢ">
              <div style={{ marginBottom: 8 }}><b>Mô tả:</b></div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 12.5, marginBottom: 12 }}>{detail.findings || '—'}</div>
              <div style={{ marginBottom: 8 }}><b>Kết luận:</b></div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 12.5, marginBottom: 12 }}>{detail.conclusion || '—'}</div>
              <div style={{ marginBottom: 8 }}><b>Khuyến nghị:</b></div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 12.5 }}>{detail.recommendation || '—'}</div>
            </DrSec>
            {detail.measurementsJson && detail.measurementsJson !== '{}' && (
              <DrSec title="THÔNG SỐ">
                <pre style={{ fontSize: 11, padding: 8, background: 'var(--bg-1)' }}>
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
