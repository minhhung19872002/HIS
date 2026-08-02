import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import * as risApi from '../api/ris';
import type { RadiologyOrderDto, RadiologyResultDto, PtttServiceMappingDto } from '../api/ris';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager,
  ActBtn, Btn, DrawerShell,
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { SurgeryReportModal } from '../../surgery/pages/SurgeryReportModal';
import ShareStudyModal from '../components/ShareStudyModal';
import { radiologyColumns } from './columns';
import { CallPatientModal } from './CallPatientModal';
import { ResultEntryModal } from './ResultEntryModal';
import { RadiologyDrawerBody } from './RadiologyDrawerBody';
import {
  type ApiErr, type StatusKey, STATUS_TABS, MODALITIES,
  detectModality, statusKey, printResultBlob, fmtDT,
} from './_shared';

// ─────────────── Modal chia sẻ ca chụp (v2 wrapper) ───────────────
// ShareStudyModal đã có đầy đủ HideDemographics — dùng lại không sửa.

const RadiologyV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RadiologyOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [fMod, setFMod] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<RadiologyOrderDto | null>(null);
  const [result, setResult] = useState<RadiologyResultDto | null>(null);
  const [resultTarget, setResultTarget] = useState<RadiologyOrderDto | null>(null);
  const [callTarget, setCallTarget] = useState<RadiologyOrderDto | null>(null);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [date, setDate] = useState(() => dayjs());
  // Chia sẻ ca chụp (Prompt 8 Đợt 2)
  const [shareCtx, setShareCtx] = useState<{
    studyInstanceUID: string;
    orthancStudyId?: string;
    patientId?: string;
  } | null>(null);
  // Tường trình PTTT từ drawer chi tiết (Prompt 8 DEFER-resolve)
  const [ptttDrawerOpen, setPtttDrawerOpen] = useState(false);
  const [detailPtttMapping, setDetailPtttMapping] = useState<PtttServiceMappingDto | null>(null);
  // Batch-check PTTT mapping cho cả trang (1 call thay vì N) — dùng cho row action icon
  const [ptttMapByRow, setPtttMapByRow] = useState<Record<string, { hasMapping: boolean; templateId?: string }>>({});
  // Quick-open PTTT từ row action (không cần mở drawer)
  const [ptttRowTarget, setPtttRowTarget] = useState<RadiologyOrderDto | null>(null);
  // Bulk selection (Issue #144)
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkPrinting, setBulkPrinting] = useState(false);
  // orderId → resultId map; populated lazily when a row with hasResult is selected
  const bulkResultIdMapRef = useRef<Record<string, string>>({});
  const PAGE_SIZE = 18;

  const reload = () => {
    setLoading(true);
    risApi.getRadiologyOrders(
      date.subtract(7, 'day').format('YYYY-MM-DD'),
      date.format('YYYY-MM-DD'),
      undefined, undefined, undefined,
      search || undefined,
    )
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [date, search]);

  // Batch-check PTTT mapping: chạy sau khi rows thay đổi.
  // Thu thập serviceId duy nhất từ items[0], gọi 1 request, lưu vào map.
  useEffect(() => {
    const serviceIds = Array.from(new Set(
      rows.map((r) => r.items?.[0]?.serviceId).filter((id): id is string => !!id)
    ));
    if (serviceIds.length === 0) { setPtttMapByRow({}); return; }
    risApi.checkBatchPtttMappings(serviceIds)
      .then((res) => setPtttMapByRow(res.data ?? {}))
      .catch(() => setPtttMapByRow({}));
  }, [rows]);

  // Nạp danh sách phòng chụp một lần khi mount (dùng cho CallPatientModal)
  useEffect(() => {
    risApi.getRooms()
      .then((r) => setRooms((Array.isArray(r.data) ? r.data : []).map((rm) => ({ id: rm.id, name: rm.name }))))
      .catch(() => setRooms([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load full result when drawer opens
  useEffect(() => {
    setResult(null);
    if (!detail) return;
    const firstItem = detail.items?.[0];
    if (!firstItem?.hasResult) return;
    risApi.getRadiologyResult(firstItem.id)
      .then((r) => setResult(r.data || null))
      .catch(() => setResult(null));
  }, [detail]);

  // Load PTTT mapping khi drawer mở để kiểm tra dịch vụ có mapping hay không
  useEffect(() => {
    setDetailPtttMapping(null);
    if (!detail) return;
    const serviceId = detail.items?.[0]?.serviceId;
    if (!serviceId) return;
    risApi.getPtttMappingByService(serviceId)
      .then((r) => setDetailPtttMapping(r.data || null))
      .catch(() => setDetailPtttMapping(null)); // 404 = không có mapping — ẩn nút
  }, [detail]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUS_TABS.forEach((s) => {
      c[s.v] = rows.filter((r) => statusKey(r.status) === s.v).length;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (fMod) {
        const m = detectModality(r.items?.[0]);
        if (m.v !== fMod) return false;
      }
      return true;
    });
  }, [rows, stab, fMod]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const kpis = useMemo(() => {
    const reading  = rows.filter((r) => statusKey(r.status) === 'reading').length;
    const reported = rows.filter((r) => statusKey(r.status) === 'reported').length;
    const imaging  = rows.filter((r) => statusKey(r.status) === 'imaging').length;
    const ctScans  = rows.filter((r) => detectModality(r.items?.[0]).v === 'CT').length;
    return {
      total: rows.length,
      reading,
      reported,
      imaging,
      ctScans,
      modalities: MODALITIES.length,
    };
  }, [rows]);

  const onPrintRow = async (r: RadiologyOrderDto) => {
    const it = r.items?.[0];
    if (!it?.hasResult) { message.warning('Chưa có kết quả để in'); return; }
    try {
      const res = await risApi.getRadiologyResult(it.id);
      const id = res.data?.id;
      if (!id) { message.warning('Chưa có kết quả để in'); return; }
      await printResultBlob(id);
    } catch { message.error('Không in được phiếu'); }
  };
  const onPrintResult = async () => {
    if (!result?.id) { message.warning('Chưa có kết quả để in'); return; }
    try { await printResultBlob(result.id); }
    catch { message.error('Không in được phiếu'); }
  };
  const onViewer = (r: RadiologyOrderDto) => {
    const uid = r.studyInstanceUID;
    if (!uid) { message.warning('Ca chụp chưa có Study UID — DICOM chưa được gửi về PACS'); return; }
    navigate(`/v2/radiology/viewer?study=${encodeURIComponent(uid)}`);
  };
  const onStartExam = async (r: RadiologyOrderDto) => {
    try { await risApi.startExam(r.id); message.success('Đã bắt đầu ca chụp'); reload(); }
    catch (e) { message.error((e as ApiErr)?.response?.data?.message || 'Không bắt đầu được ca'); }
  };
  const onCompleteExam = async (r: RadiologyOrderDto) => {
    try { await risApi.completeExam(r.id); message.success('Đã hoàn thành ca chụp'); reload(); }
    catch (e) { message.error((e as ApiErr)?.response?.data?.message || 'Không hoàn thành được ca'); }
  };

  const onShare = (r: RadiologyOrderDto) => {
    // Dùng studyInstanceUID thật từ DicomStudy nếu có; fallback về orderId để StudyShareController
    // vẫn tạo được link (BS cập nhật UID thật sau khi DICOM về).
    setShareCtx({
      studyInstanceUID: r.studyInstanceUID || r.id,
      patientId: r.patientId,
    });
  };

  const onBulkDownload = async (anonymize: boolean) => {
    if (bulkSelected.length === 0) { message.warning('Chọn ít nhất 1 ca để tải'); return; }
    setBulkDownloading(true);
    try {
      const resp = await risApi.bulkExportDicom({ studyIds: bulkSelected, anonymize });
      const blob = new Blob([resp.data as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = anonymize ? 'bulk_anon_export.zip' : 'bulk_export.zip';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      message.success(`Đã tải ${bulkSelected.length} study`);
      setBulkSelected([]);
      bulkResultIdMapRef.current = {};
    } catch { message.error('Tải xuống thất bại'); }
    finally { setBulkDownloading(false); }
  };

  const toggleBulkSelect = (r: RadiologyOrderDto) => {
    const id = r.id;
    setBulkSelected((prev) => {
      if (prev.includes(id)) {
        delete bulkResultIdMapRef.current[id];
        return prev.filter((x) => x !== id);
      }
      // Resolve resultId lazily for rows that have a result
      const item = r.items?.[0];
      if (item?.hasResult) {
        risApi.getRadiologyResult(item.id)
          .then((res) => {
            if (res.data?.id) bulkResultIdMapRef.current[id] = res.data.id;
          })
          .catch(() => { /* no result yet — skip */ });
      }
      return [...prev, id];
    });
  };

  const onBulkApprove = async () => {
    const resultIds = bulkSelected
      .map((id) => bulkResultIdMapRef.current[id])
      .filter(Boolean);
    if (resultIds.length === 0) {
      message.warning('Không có ca nào đã có kết quả để duyệt. Hãy đợi load xong hoặc chọn ca có KQ.');
      return;
    }
    setBulkApproving(true);
    try {
      const res = await risApi.bulkApproveResults({ resultIds });
      const { approvedCount, skippedCount } = res.data;
      if (approvedCount > 0) {
        message.success(`Đã duyệt ${approvedCount} kết quả${skippedCount > 0 ? ` (bỏ qua ${skippedCount})` : ''}`);
        setBulkSelected([]);
        bulkResultIdMapRef.current = {};
        reload();
      } else {
        message.warning(`Không duyệt được ca nào (${skippedCount} bị bỏ qua — kiểm tra trạng thái hoặc quyền)`);
      }
    } catch { message.error('Duyệt hàng loạt thất bại'); }
    finally { setBulkApproving(false); }
  };

  const onBulkPrint = async () => {
    const resultIds = bulkSelected
      .map((id) => bulkResultIdMapRef.current[id])
      .filter(Boolean);
    if (resultIds.length === 0) {
      message.warning('Không có ca nào đã có kết quả để in. Hãy đợi load xong hoặc chọn ca có KQ.');
      return;
    }
    setBulkPrinting(true);
    try {
      const resp = await risApi.printRadiologyResultsBatch(resultIds);
      const blob = new Blob([resp.data as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      message.success(`Đã mở PDF gộp ${resultIds.length} kết quả`);
    } catch { message.error('In hàng loạt thất bại'); }
    finally { setBulkPrinting(false); }
  };

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Tổng ca', val: kpis.total, sub: 'gần đây' },
          { lbl: 'Chờ đọc phim', val: kpis.reading, sub: 'backlog', tone: 'warn' },
          {
            lbl: 'Đã có KQ', val: kpis.reported,
            sub: kpis.total > 0 ? `${Math.round(kpis.reported / kpis.total * 100)}%` : '—',
            tone: 'ok',
          },
          { lbl: 'Đang chụp', val: kpis.imaging, sub: 'tại các phòng', tone: 'warn' },
          { lbl: 'CT/MRI', val: kpis.ctScans, sub: 'cần chuẩn bị', tone: 'info' },
          { lbl: 'Modality', val: kpis.modalities, sub: 'loại máy' },
        ]}
      />

      <div className="ab-tools">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Tìm BN, mã RIS, kỹ thuật, chẩn đoán…"
        />
        <Filter
          value={fMod} onChange={setFMod}
          options={MODALITIES.map((m) => ({ v: m.v, l: `${m.v} · ${m.l}` }))}
          placeholder="▾ Modality"
        />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFMod(''); setStab('all'); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <Btn variant="ghost" onClick={() => setDate(date.subtract(1, 'day'))}>
          <TermIcon name="chevronL" size={12} />
        </Btn>
        <Btn variant="ghost" onClick={() => setDate(dayjs())}>Hôm nay</Btn>
        <Btn variant="ghost" onClick={() => setDate(date.add(1, 'day'))}>
          <TermIcon name="chevronR" size={12} />
        </Btn>
        <span className="spacer" />
        {bulkSelected.length > 0 && (
          <>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
              {bulkSelected.length} đã chọn
            </span>
            <Btn variant="ghost" onClick={() => void onBulkApprove()} loading={bulkApproving} disabled={bulkPrinting || bulkDownloading}>
              <TermIcon name="check" size={12} /> Duyệt đã chọn
            </Btn>
            <Btn variant="ghost" onClick={() => void onBulkPrint()} loading={bulkPrinting} disabled={bulkApproving || bulkDownloading}>
              <TermIcon name="print" size={12} /> In đã chọn
            </Btn>
            <Btn variant="ghost" onClick={() => void onBulkDownload(false)} loading={bulkDownloading} disabled={bulkApproving || bulkPrinting}>
              <TermIcon name="download" size={12} /> Tải DICOM
            </Btn>
            <Btn variant="ghost" onClick={() => void onBulkDownload(true)} loading={bulkDownloading} disabled={bulkApproving || bulkPrinting}>
              <TermIcon name="shield" size={12} /> Tải ẩn danh
            </Btn>
            <Btn variant="ghost" onClick={() => { setBulkSelected([]); bulkResultIdMapRef.current = {}; }}>
              <TermIcon name="x" size={12} /> Bỏ chọn
            </Btn>
          </>
        )}
        <Btn variant="ghost" onClick={reload}>
          <TermIcon name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => navigate('/v2/ris-dispatcher')}>
          <TermIcon name="image" size={12} /> DICOM
        </Btn>
        <Btn variant="primary" onClick={() => navigate('/v2/radiology-ops')}>
          <TermIcon name="plus" size={12} /> Chỉ định <kbd>F2</kbd>
        </Btn>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<RadiologyOrderDto>
        columns={radiologyColumns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r)}
        actions={(r) => {
          const sk = statusKey(r.status);
          return (
            <div className="ab-actions">
              {r.items?.[0]?.hasResult && (
                <ActBtn ic="eye" title="Xem KQ" onClick={() => setDetail(r)} />
              )}
              {(sk === 'scheduled' || sk === 'imaging') && (
                <ActBtn ic="user" title="Gọi bệnh nhân" onClick={() => setCallTarget(r)} />
              )}
              {sk === 'scheduled' && (
                <ActBtn ic="play" title="Bắt đầu chụp" onClick={() => void onStartExam(r)} />
              )}
              {sk === 'imaging' && (
                <ActBtn ic="check" title="Hoàn thành chụp" onClick={() => void onCompleteExam(r)} />
              )}
              {sk !== 'cancelled' && sk !== 'reported' && (
                <ActBtn ic="edit" title="Nhập kết quả" onClick={() => setResultTarget(r)} />
              )}
              {r.items?.[0]?.hasImages && (
                <ActBtn ic="image" title="Xem ảnh DICOM" onClick={() => onViewer(r)} />
              )}
              <ActBtn ic="share" title="Chia sẻ ca chụp (ẩn danh tùy chọn)" onClick={() => onShare(r)} />
              <ActBtn
                ic={bulkSelected.includes(r.id) ? 'check' : 'download'}
                title={bulkSelected.includes(r.id) ? 'Đã chọn (bỏ chọn)' : 'Chọn cho thao tác hàng loạt'}
                onClick={() => toggleBulkSelect(r)}
              />
              <ActBtn ic="print" title="In phiếu" onClick={() => onPrintRow(r)} />
              {/* Nút PTTT: chỉ hiện khi serviceId có mapping (từ batch-check) */}
              {ptttMapByRow[r.items?.[0]?.serviceId ?? '']?.hasMapping && (
                <ActBtn
                  ic="scissors"
                  title="Tường trình PTTT"
                  onClick={() => setPtttRowTarget(r)}
                />
              )}
            </div>
          );
        }}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">
            <TermIcon name="search" size={20} />
            <div>Không có ca CĐHA nào</div>
          </div>
        )}
      />

      <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PAGE_SIZE} />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{detail.orderCode}</span>
              <span style={{ fontSize: 14 }}>{detail.patientName}</span>
            </span>
          : ''}
        sub={detail
          ? `${detail.patientCode} · ${detail.departmentName || '—'} · ${fmtDT(detail.orderDate)}`
          : ''}
        size="lg"
        footer={detail ? (
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <span style={{ flex: 1 }} />
            {/* Nút PTTT chỉ hiện khi dịch vụ có mapping trong RisSurgeryServiceMappings */}
            {detailPtttMapping && statusKey(detail.status) !== 'cancelled' && (
              <Btn
                onClick={() => setPtttDrawerOpen(true)}
                title={`Tường trình PTTT — mẫu: ${detailPtttMapping.surgeryNarrativeTemplateName || 'tự do'}`}
              >
                <TermIcon name="scissors" size={12} /> Tường trình PTTT
              </Btn>
            )}
            {statusKey(detail.status) !== 'cancelled' && (
              <Btn onClick={() => { setResultTarget(detail); setDetail(null); }}>
                <TermIcon name="edit" size={12} /> {detail.items?.[0]?.hasResult ? 'Sửa KQ' : 'Nhập KQ'}
              </Btn>
            )}
            <Btn onClick={onPrintResult}>
              <TermIcon name="print" size={12} /> In phiếu
            </Btn>
            {detail.items?.[0]?.hasImages && (
              <Btn variant="primary" onClick={() => onViewer(detail)}>
                <TermIcon name="image" size={12} /> Xem ảnh DICOM
              </Btn>
            )}
          </>
        ) : null}
      >
        {detail && <RadiologyDrawerBody r={detail} result={result} />}
      </DrawerShell>

      <ResultEntryModal
        open={!!resultTarget}
        order={resultTarget}
        onClose={() => setResultTarget(null)}
        onSaved={reload}
      />

      <CallPatientModal
        open={!!callTarget}
        order={callTarget}
        rooms={rooms}
        onClose={() => setCallTarget(null)}
        onCalled={reload}
      />

      {/* Chia sẻ ca chụp với anonymize (Prompt 8 Đợt 2) */}
      <ShareStudyModal
        open={shareCtx !== null}
        onClose={() => setShareCtx(null)}
        studyInstanceUID={shareCtx?.studyInstanceUID || ''}
        orthancStudyId={shareCtx?.orthancStudyId}
        patientId={shareCtx?.patientId}
      />

      {/* Tường trình PTTT từ drawer chi tiết — chỉ hiện khi dịch vụ có mapping */}
      <SurgeryReportModal
        open={ptttDrawerOpen}
        onClose={() => setPtttDrawerOpen(false)}
        examinationId={detail?.visitId ?? null}
        patientId={detail?.patientId}
        patientName={detail?.patientName}
        patientCode={detail?.patientCode}
        prefillServiceName={detailPtttMapping?.template?.surgeryMethod || detail?.items?.[0]?.serviceName}
        prefillDiagnosis={detailPtttMapping?.template?.preOpDiagnosis || detail?.diagnosis}
        prefillNarrativeBody={detailPtttMapping?.template?.narrativeBody}
      />

      {/* Tường trình PTTT từ row action (batch-check) — không cần mở drawer */}
      <SurgeryReportModal
        open={!!ptttRowTarget}
        onClose={() => setPtttRowTarget(null)}
        examinationId={ptttRowTarget?.visitId ?? null}
        patientId={ptttRowTarget?.patientId}
        patientName={ptttRowTarget?.patientName}
        patientCode={ptttRowTarget?.patientCode}
        prefillServiceName={ptttRowTarget?.items?.[0]?.serviceName}
        prefillDiagnosis={ptttRowTarget?.diagnosis}
      />
    </div>
  );
};

export default RadiologyV2;
