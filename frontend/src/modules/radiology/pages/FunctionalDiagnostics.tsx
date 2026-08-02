import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KpiStrip, DataTable, SearchBox, Filter, StatusBadge,
  DrawerShell, ActBtn, Btn, DrSec, DrField, Pager, useListData,
  type ColumnDef, type KpiItem, type StatusTone,
  tk, te, fmtDTg
} from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import {
  fdt,
  type FunctionalDiagnosticTestDto
} from '../../../api/nangcap23';

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
  const [search, setSearch] = useState('');
  const [fType, setFType] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<FunctionalDiagnosticTestDto | null>(null);

  // #352: lọc SERVER-SIDE. Trước đây chỉ tải 500 bản ghi mới nhất rồi lọc client ⇒ bản ghi cũ
  // hơn cửa sổ 500 dòng không thể tìm/lọc ra ở v2 (v1 truyền keyword/testType/status lên
  // fdt.search, backend lọc TOÀN BẢNG — FunctionalDiagnosticsService.SearchAsync:42-52).
  const { rows, loading, reload } = useListData<FunctionalDiagnosticTestDto>(
    useCallback(() => fdt.search({
      keyword: search.trim() || undefined,
      testType: fType || undefined,
      status: fStatus === '' ? undefined : Number(fStatus),
      pageSize: 500,
    }), [search, fType, fStatus]),
    useCallback(() => te('Không tải được'), []),
  );

  // Server đã lọc; giữ lại lọc client như lưới an toàn khi API bỏ qua tham số.
  const filtered = useMemo(() => rows.filter((r) => {
    if (fType && r.testType !== fType) return false;
    if (fStatus !== '' && r.status !== Number(fStatus)) return false;
    return true;
  }), [rows, fType, fStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);
  useEffect(() => { setPage(0); }, [search, fType, fStatus]);

  const complete = async (r: FunctionalDiagnosticTestDto) => {
    try { await fdt.complete(r.id); tk('Đã hoàn thành thăm dò'); reload(); setDetail(null); }
    catch { te('Cập nhật thất bại'); }
  };
  const verify = async (r: FunctionalDiagnosticTestDto) => {
    try { await fdt.verify(r.id); tk('Đã duyệt kết quả'); reload(); setDetail(null); }
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
          <div className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
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
        <span className="spacer" />
        {/* #352: nút Làm mới — worklist trước đây chỉ fetch 1 lần lúc mount nên bị stale
            (house-style v2: SimpleV2Page và các trang khác đều có nút này) */}
        <Btn variant="ghost" icon="refresh" onClick={reload}>Làm mới</Btn>
      </div>
      <DataTable<FunctionalDiagnosticTestDto>
        rowKey={(r) => r.id} data={paged} columns={columns}
        onRowClick={setDetail}
        // #352: phân biệt đang-tải với không-có-dữ-liệu (trước đây bảng trống trơn khi tải)
        empty={loading ? 'Đang tải…' : 'Không có phiếu thăm dò chức năng'}
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
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            {detail.status === 1 && (
              <Btn onClick={() => complete(detail)}>
                <TermIcon name="check" size={12} /> Hoàn thành
              </Btn>
            )}
            {detail.status === 2 && (
              <Btn variant="primary" onClick={() => verify(detail)}>
                <TermIcon name="check" size={12} /> Duyệt KQ
              </Btn>
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
            {/* #352: LUÔN hiện khối kết quả. Trước đây cả khối bọc trong `detail.findings &&`
                nên phiếu có Kết luận/Khuyến nghị mà Mô tả rỗng thì ẨN LUÔN dữ liệu lâm sàng
                — bác sĩ mở drawer không thấy kết luận. v1 luôn render với fallback '—'. */}
            {(detail.findings || detail.conclusion || detail.recommendation || detail.status >= 2) && (
              <DrSec title="KẾT QUẢ">
                <div style={{ marginBottom: 'var(--space-8)' }}><b>Mô tả:</b></div>
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap', marginBottom: 'var(--space-12)' }}>
                  {detail.findings || '—'}
                </div>
                <div style={{ marginBottom: 'var(--space-8)' }}><b>Kết luận:</b></div>
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap', marginBottom: 'var(--space-12)' }}>
                  {detail.conclusion || '—'}
                </div>
                <div style={{ marginBottom: 'var(--space-8)' }}><b>Khuyến nghị:</b></div>
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>
                  {detail.recommendation || '—'}
                </div>
              </DrSec>
            )}
            {detail.measurementsJson && detail.measurementsJson !== '{}' && (
              <DrSec title="THÔNG SỐ">
                <pre style={{ fontSize: 'var(--fs-xs)', padding: 'var(--space-8)', background: 'var(--d-1)', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
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
