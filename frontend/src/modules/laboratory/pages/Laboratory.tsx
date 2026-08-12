import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegisterCommands } from '@/contexts/CommandContext';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import apiClient from '../../../services/apiClient';
import * as labApi from '../api/laboratory';
import type { LabRequest } from '../api/laboratory';
import * as settingsApi from '../../system/api/userSettings';
import type { LabDefaultRoles } from '../../system/api/userSettings';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager,
  Btn, DrawerShell,
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { RowActions } from '../../../components/actions';
import { openPrintWindow } from '../../../utils/printWindow';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { SignatureStatusIcon, PinEntryModal } from '../../../components/digitalSignature';
import { useSigningContext } from '../../../contexts/SigningContext';
import { getSignatures } from '../../emr/api/digitalSignature';
import type { DocumentSignatureDto } from '../../emr/api/digitalSignature';
import {
  WAREHOUSE_TYPE_CABINET, STATUS_TABS, statusKey, abnormalCount, fmtDT,
  printLabResultBlob,
  type WarehouseStock, type LabChemicalItem, type StatusKey,
} from './_shared';
import { LAB_COLUMNS } from './columns';
import { LabDrawerBody } from './LabDrawerBody';
import { LabChainCancelModal } from './LabChainCancelModal';
import { LabResultEntryModal } from './LabResultEntryModal';
import { LabUtilDrawer } from './LabUtilDrawer';
import { LabRolesModal } from './LabRolesModal';
import { buildBarcodeLabelHtml } from './printTemplates';

/* ────────────────────────────────────────────────────────────
   Lab v2 (LIS) — port of design-system-v2/his/project/LIS v2.html
   Layout: KpiStrip + filter toolbar + StatusTabs + DataTable + Drawer
   ──────────────────────────────────────────────────────────── */

const LaboratoryV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [rows, setRows]   = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab]   = useState<StatusKey | 'all'>('all');
  const [fGroup, setFGroup] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage]   = useState(0);
  const [detail, setDetail] = useState<LabRequest | null>(null);
  const [date, setDate]   = useState(() => dayjs());
  const PAGE_SIZE = 18;

  // Panel Tiện ích: tủ trực + tồn kho hóa chất (2 nguồn tách biệt)
  const [utilOpen, setUtilOpen] = useState(false);
  const [utilCabinetStock, setUtilCabinetStock] = useState<WarehouseStock[]>([]); // WarehouseType=5
  const [utilChemStock, setUtilChemStock] = useState<WarehouseStock[]>([]);       // Tồn kho hóa chất chung
  const [utilChemicals, setUtilChemicals] = useState<LabChemicalItem[]>([]);
  const [utilLoading, setUtilLoading] = useState(false);
  // Filter cho panel
  const [utilFilterMonth, setUtilFilterMonth] = useState<string>(''); // 'YYYY-MM' hoặc '' để lọc HSD

  const loadUtilData = async () => {
    setUtilLoading(true);
    try {
      const [cabinetRes, chemStockRes, chemRes] = await Promise.all([
        // Tủ trực: warehouseType=5, itemType=3 (Hóa chất)
        apiClient.get<{ items: WarehouseStock[] } | WarehouseStock[]>('/warehouse/stock', {
          params: { warehouseType: WAREHOUSE_TYPE_CABINET, itemType: 3, pageSize: 200 },
        }),
        // Tồn kho hóa chất chung (không phải tủ trực)
        apiClient.get<{ items: WarehouseStock[] } | WarehouseStock[]>('/warehouse/stock', {
          params: { itemType: 3, pageSize: 200 },
        }),
        apiClient.get<LabChemicalItem[]>('/lis-catalog/chemicals'),
      ]);

      const toItems = (res: { data: { items: WarehouseStock[] } | WarehouseStock[] }) => {
        const p = res.data;
        return Array.isArray(p) ? p : ((p as { items?: WarehouseStock[] }).items ?? []);
      };

      const cabinetItems = toItems(cabinetRes);
      const allChemItems = toItems(chemStockRes);
      // Tách tồn kho hóa chất = all − tủ trực (không trùng nhau)
      const cabinetIds = new Set(cabinetItems.map((s) => s.id));
      const chemOnlyItems = allChemItems.filter((s) => !cabinetIds.has(s.id));

      setUtilCabinetStock(cabinetItems);
      setUtilChemStock(chemOnlyItems);
      setUtilChemicals(Array.isArray(chemRes.data) ? chemRes.data : []);
    } catch (e) {
      // panel phụ — không chặn nghiệp vụ, chỉ cảnh báo cho người dùng biết
      message.warning(friendlyErrorMessage(e, 'Không tải được dữ liệu tiện ích (tủ trực / hóa chất)'));
    } finally {
      setUtilLoading(false);
    }
  };

  // DefaultLabRole per-user (Prompt 11 Đợt 3)
  const [labRoles, setLabRoles] = useState<LabDefaultRoles>({});
  const [rolesOpen, setRolesOpen] = useState(false);
  const [rolesEdit, setRolesEdit] = useState<LabDefaultRoles>({});
  const [rolesSaving, setRolesSaving] = useState(false);
  // Track first mount — load once
  const rolesFetched = useRef(false);

  useEffect(() => {
    if (rolesFetched.current) return;
    rolesFetched.current = true;
    settingsApi.getLabDefaultRoles().then(setLabRoles).catch((e) => {
      message.warning(friendlyErrorMessage(e, 'Không tải được vai trò XN mặc định — sẽ dùng giá trị mặc định.'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nhập kết quả thủ công per-test (port v1 Result Entry Modal)
  const [entryTarget, setEntryTarget] = useState<LabRequest | null>(null);

  // Ký số kết quả XN (port v1: SigningContext + PIN modal + signature map)
  const { sessionActive, openSession, tryAutoOpenSession, signDocument } = useSigningContext();
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [signatureMap, setSignatureMap] = useState<Map<string, DocumentSignatureDto>>(new Map());

  const loadResultSignature = async (resultId: string) => {
    try {
      const res = await getSignatures(resultId);
      if (res.data.length > 0) {
        setSignatureMap((prev) => new Map(prev).set(resultId, res.data[0]));
      }
    } catch (e) {
      message.warning(friendlyErrorMessage(e, 'Không tải được trạng thái ký số của kết quả'));
    }
  };

  const handlePinSubmit = async (pin: string) => {
    setPinLoading(true);
    setPinError('');
    try {
      const res = await openSession(pin);
      if (res.success) {
        setPinModalOpen(false);
        message.success('Phiên ký số đã mở');
      } else {
        setPinError(res.message || 'PIN không đúng');
      }
    } catch {
      setPinError('Không thể kết nối USB Token');
    } finally {
      setPinLoading(false);
    }
  };

  const handleSignResult = async (resultId: string) => {
    if (!sessionActive) {
      // Try auto-open with Windows Certificate Store first
      try {
        const autoRes = await tryAutoOpenSession();
        if (autoRes.success) {
          message.success(`Đã kết nối chứng thư số: ${autoRes.caProvider || 'Windows'}`);
          const signRes = await signDocument(resultId, 'LabResult', 'Ký xác nhận kết quả xét nghiệm');
          if (signRes.success) {
            message.success('Ký kết quả xét nghiệm thành công');
            void loadResultSignature(resultId);
          } else {
            message.warning(signRes.message || 'Ký số thất bại');
          }
          return;
        }
      } catch { /* fallback to PIN */ }
      setPinModalOpen(true);
      return;
    }
    try {
      const res = await signDocument(resultId, 'LabResult', 'Ký xác nhận kết quả xét nghiệm');
      if (res.success) {
        message.success('Ký kết quả xét nghiệm thành công');
        void loadResultSignature(resultId);
      } else {
        message.warning(res.message || 'Ký số thất bại');
      }
    } catch {
      message.warning('Lỗi ký số');
    }
  };

  // Mở drawer phiếu đã duyệt → nạp trạng thái chữ ký (hiển thị đúng đã-ký/chưa-ký)
  const detailId = detail && detail.status >= 4 ? detail.id : null;
  useEffect(() => {
    if (detailId) void loadResultSignature(detailId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId]);

  // Hủy ngược chuỗi workflow (M3.14): mức hủy + lý do, áp cho mọi test item của phiếu
  const [chainOpen, setChainOpen] = useState(false);
  const [chainTarget, setChainTarget] = useState<LabRequest | null>(null);
  const [chainLevel, setChainLevel] = useState<1 | 2 | 3>(1);
  const [chainReason, setChainReason] = useState('');
  const [chainBusy, setChainBusy] = useState(false);

  // Guard double-submit (#467): id phiếu đang có thao tác ghi chạy dở (duyệt / lấy mẫu / hủy duyệt)
  const [acting, setActing] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    labApi.getLabRequests({ fromDate: date.format('YYYY-MM-DD'), search: search || undefined })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((e) => {
        // key cố định: reload chạy theo TỪNG KÝ TỰ gõ vào SearchBox (SearchBox không debounce)
        // → nếu API lỗi, toast phải THAY THẾ nhau chứ không xếp chồng thành hàng chục cái.
        message.warning({ key: 'lab-list-load', content: friendlyErrorMessage(e, 'Không tải được danh sách xét nghiệm') });
        setRows([]);
      })
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [date, search]);

  // F2=Chỉ định XN · F5=Làm mới (khớp kbd hint trên nút)
  useRegisterCommands({
    save: () => navigate('/v2/sample-receive'),
    refresh: reload,
  });

  const groupOpts = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => (r.tests || []).forEach((t) => t.testGroup && set.add(t.testGroup)));
    return Array.from(set).map((g) => ({ v: g, l: g }));
  }, [rows]);

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
      if (fGroup && !(r.tests || []).some((t) => t.testGroup === fGroup)) return false;
      return true;
    });
  }, [rows, stab, fGroup]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // KPIs
  const kpis = useMemo(() => {
    const verified = rows.filter((r) => r.status >= 3).length;
    const pending  = rows.filter((r) => r.status >= 0 && r.status <= 2).length;
    const stat     = rows.filter((r) => r.priority === 2).length;
    const totalAbnormal = rows.reduce((a, r) => a + abnormalCount(r.tests), 0);
    const tatTimes = rows
      .filter((l) => l.processingStartTime && l.processingEndTime)
      .map((l) => dayjs(l.processingEndTime).diff(dayjs(l.processingStartTime), 'minute'));
    const tat = tatTimes.length > 0 ? Math.round(tatTimes.reduce((a, b) => a + b, 0) / tatTimes.length) : 0;
    return { total: rows.length, verified, pending, stat, abnormal: totalAbnormal, tat };
  }, [rows]);

  const onApprove = async (r: LabRequest) => {
    if (acting) return;
    setActing(r.id);
    try {
      await labApi.completeProcessing(r.id);
      message.success(`Đã duyệt ${r.requestCode}`);
      reload();
    } catch {
      message.error('Duyệt thất bại');
    } finally {
      setActing(null);
    }
  };

  const onCollect = async (r: LabRequest) => {
    if (acting) return;
    setActing(r.id);
    try {
      // Auto-fill KTV từ DefaultLabRole; fallback về tên generic nếu chưa cấu hình
      const collectorName = labRoles.defaultKtvName || 'KTV thu mẫu';
      await labApi.collectSample(r.id, {
        sampleType: 'Blood',
        collectionTime: new Date().toISOString(),
        collectorName,
        collectorUserId: labRoles.defaultKtvId ?? undefined,
      });
      message.success(`Đã ghi nhận lấy mẫu · ${r.requestCode}`);
      reload();
    } catch {
      message.error('Ghi nhận thất bại');
    } finally {
      setActing(null);
    }
  };

  // Duyệt 2 bước: KTV duyệt sơ bộ (status 3 → 4)
  const onPreliminary = async (r: LabRequest) => {
    if (acting) return;
    setActing(r.id);
    try {
      await labApi.preliminaryApprove(r.id);
      message.success(`Đã duyệt sơ bộ · ${r.requestCode}`);
      reload();
    } catch {
      message.error('Duyệt sơ bộ thất bại');
    } finally {
      setActing(null);
    }
  };

  // Duyệt 2 bước: BS duyệt chính thức (status 4 → 5)
  const onFinal = async (r: LabRequest) => {
    if (acting) return;
    setActing(r.id);
    try {
      await labApi.finalApprove(r.id);
      message.success(`Đã duyệt chính thức · ${r.requestCode}`);
      reload();
    } catch {
      message.error('Duyệt chính thức thất bại');
    } finally {
      setActing(null);
    }
  };

  // Hủy duyệt (status 4/5 → 3) — yêu cầu lý do
  const onCancelApproval = async (r: LabRequest) => {
    if (acting) return;
    const reason = window.prompt(`Lý do hủy duyệt ${r.requestCode}:`, '');
    if (reason === null) return;            // bấm Cancel
    if (!reason.trim()) { message.warning('Cần nhập lý do hủy duyệt'); return; }
    setActing(r.id);
    try {
      await labApi.cancelApproval(r.id, reason.trim());
      message.success(`Đã hủy duyệt · ${r.requestCode}`);
      reload();
    } catch {
      message.error('Hủy duyệt thất bại');
    } finally {
      setActing(null);
    }
  };

  const onPrintRow = async (r: LabRequest) => {
    // Rule tài liệu: chưa duyệt KQ (status < 4) → "Không có số liệu", không in.
    // (Backend PrintLabResultAsync cũng enforce — đây là guard sớm phía client.)
    if (r.status < 4) {
      message.warning(`Chưa duyệt kết quả ${r.requestCode} — không có số liệu để in.`);
      return;
    }
    try { await printLabResultBlob(r.id); }
    catch { message.error('Không in được phiếu'); }
  };

  // In nhãn barcode dán mẫu (port v1 handlePrintBarcode):
  // thử API blob trước → fallback labApi.printBarcode → cuối cùng render HTML local.
  const onPrintBarcode = async (r: LabRequest) => {
    const barcode = r.sampleBarcode || r.id;

    try {
      // Try to get a PDF/blob from the API first.
      // Backend PrintSampleBarcodeAsync hiện là stub trả bytes "BARCODE:{id}" gắn mác
      // application/pdf → phải kiểm tra magic-bytes %PDF thật, không thì rơi xuống fallback
      // HTML local (nhãn đầy đủ thông tin BN) thay vì mở tab PDF hỏng.
      const blobData = await labApi.printBarcodeLabel(r.id);
      const isRealPdf = blobData instanceof Blob && blobData.size > 4 &&
        new TextDecoder().decode(new Uint8Array(await blobData.slice(0, 4).arrayBuffer())) === '%PDF';
      if (isRealPdf) {
        const url = URL.createObjectURL(blobData);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            // Clean up the blob URL after a delay
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          };
        } else {
          message.warning('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
          URL.revokeObjectURL(url);
        }
        return;
      }
    } catch {
      // API not available or returned error, fall back to local print
    }

    // Fallback: nhãn HTML local ĐẦY ĐỦ thông tin BN (buildBarcodeLabelHtml).
    // Bỏ tầng labApi.printBarcode (nhãn thô chỉ có code, không bao giờ throw →
    // che mất nhãn đầy đủ; xác nhận ở verify #409).
    openPrintWindow(buildBarcodeLabelHtml(r, barcode), {
      focus: true,
      print: { delayMs: 500 },
      onBlocked: () => message.warning('Không thể mở cửa sổ in. Vui lòng cho phép popup.'),
    });
  };

  const openChainCancel = (r: LabRequest) => {
    setChainTarget(r); setChainLevel(1); setChainReason(''); setChainOpen(true);
  };

  /**
   * Hủy ngược chuỗi cho mọi test item của phiếu, tuần tự theo bước backend:
   * 4→3 (hủy duyệt) → 3/2→1 (hủy KQ + nhận mẫu) → 1→0 (hủy lấy mẫu).
   * Mỗi bước backend tự validate; item không đúng trạng thái sẽ bị bỏ qua.
   */
  const runChainCancel = async () => {
    if (!chainTarget) return;
    if (!chainReason.trim()) { message.warning('Cần nhập lý do hủy'); return; }
    const items = chainTarget.tests || [];
    if (items.length === 0) { message.warning('Phiếu không có test item để hủy'); return; }
    setChainBusy(true);
    const reason = chainReason.trim();
    let touched = 0;
    for (const t of items) {
      const r1 = await labApi.cancelChainApproval(t.id, reason).catch(() => null);
      const r2 = chainLevel >= 2 ? await labApi.cancelChainResult(t.id, reason).catch(() => null) : null;
      const r3 = chainLevel >= 3 ? await labApi.cancelChainCollection(t.id, reason).catch(() => null) : null;
      if (r1 || r2 || r3) touched += 1;
    }
    setChainBusy(false);
    setChainOpen(false);
    if (touched > 0) message.success(`Đã hủy ngược chuỗi ${touched}/${items.length} chỉ số · ${chainTarget.requestCode}`);
    else message.warning('Không có chỉ số nào hủy được — kiểm tra trạng thái từng bước');
    setDetail(null);
    reload();
  };

  const saveRoles = async () => {
    setRolesSaving(true);
    try {
      await settingsApi.saveLabDefaultRoles(rolesEdit);
      setLabRoles({ ...rolesEdit });
      message.success('Đã lưu cài đặt vai trò mặc định');
      setRolesOpen(false);
    } catch {
      message.error('Không lưu được cài đặt');
    } finally {
      setRolesSaving(false);
    }
  };

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Tổng XN', val: kpis.total, sub: date.isSame(dayjs(), 'day') ? 'hôm nay' : date.format('DD/MM') },
          {
            lbl: 'Đã duyệt', val: kpis.verified,
            sub: kpis.total > 0 ? `${Math.round(kpis.verified / kpis.total * 100)}%` : '—',
            tone: 'ok',
          },
          { lbl: 'Đang chờ', val: kpis.pending, sub: 'trong quy trình', tone: 'warn' },
          { lbl: 'Bất thường', val: kpis.abnormal, sub: 'H/L flags', tone: 'crit' },
          { lbl: 'STAT', val: kpis.stat, sub: 'ưu tiên', tone: 'crit' },
          { lbl: 'TAT', val: kpis.tat, unit: 'p', sub: 'TB', tone: 'ok' },
        ]}
      />

      <div className="ab-tools">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Tìm BN, mã XN, barcode mẫu…"
        />
        <Filter value={fGroup} onChange={setFGroup} options={groupOpts} placeholder="▾ Nhóm XN" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFGroup(''); setStab('all'); }}>
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
        <Btn variant="ghost" onClick={reload} loading={loading} icon="refresh">Làm mới</Btn>
        <Btn variant="ghost" onClick={() => navigate('/v2/lab-qc')}>
          <TermIcon name="chart" size={12} /> QC hôm nay
        </Btn>
        <Btn variant="ghost" onClick={() => { setUtilOpen(true); loadUtilData(); }}>
          <TermIcon name="flask" size={12} /> Tiện ích
        </Btn>
        <Btn variant="ghost" title="Cài đặt KTV / Người duyệt mặc định" onClick={() => {
          setRolesEdit({ ...labRoles });
          setRolesOpen(true);
        }}>
          <TermIcon name="user" size={12} /> Vai trò
          {labRoles.defaultKtvName && (
            <span style={{ marginLeft: 'var(--space-4)', fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>
              {labRoles.defaultKtvName.split(' ').slice(-1)[0]}
            </span>
          )}
        </Btn>
        <Btn variant="primary" onClick={() => navigate('/v2/sample-receive')}>
          <TermIcon name="plus" size={12} /> Chỉ định <kbd>F2</kbd>
        </Btn>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<LabRequest>
        columns={LAB_COLUMNS}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r)}
        actions={(r) => {
          const sk = statusKey(r.status);
          // Điều kiện hiển thị theo status giữ NGUYÊN 1-1 (map sang `hidden`).
          // `disabled: !!acting` — khóa `acting` là khóa THEO TRANG (`if (acting) return` trong
          // onApprove/onCollect/…), nên nút của MỌI dòng phải mờ đi khi có 1 thao tác ghi đang chạy;
          // nếu chỉ mờ đúng dòng đang chạy thì bấm ở dòng khác sẽ chết lặng (không phản hồi gì).
          return (
            <div className="ab-actions">
              <RowActions actions={[
                { key: 'collect', icon: 'check', label: 'Đánh dấu đã lấy mẫu', primary: true,
                  hidden: sk !== 'ordered', disabled: !!acting, onClick: () => onCollect(r) },
                { key: 'approve', icon: 'check', label: 'Duyệt kết quả', primary: true,
                  hidden: sk !== 'running', disabled: !!acting, onClick: () => onApprove(r) },
                { key: 'prelim', icon: 'check', label: 'Duyệt sơ bộ (KTV)', primary: true,
                  hidden: r.status !== 3, disabled: !!acting, onClick: () => onPreliminary(r) },
                { key: 'final', icon: 'check', label: 'Duyệt chính thức (BS)', primary: true,
                  hidden: r.status !== 4, disabled: !!acting, onClick: () => onFinal(r) },
                { key: 'entry', icon: 'edit', label: 'Nhập kết quả thủ công', primary: true,
                  hidden: !(r.status === 2 || r.status === 3), onClick: () => setEntryTarget(r) },
                { key: 'view', icon: 'eye', label: 'Xem chi tiết', onClick: () => setDetail(r) },
                { key: 'barcode', icon: 'qr', label: 'In nhãn barcode mẫu',
                  hidden: r.status !== 1, onClick: () => onPrintBarcode(r) },
                { key: 'sign', icon: 'shield', label: 'Ký số kết quả xét nghiệm',
                  hidden: !(r.status >= 4 && !signatureMap.has(r.id)), onClick: () => handleSignResult(r.id) },
                { key: 'print', icon: 'print', label: 'In phiếu kết quả', onClick: () => onPrintRow(r) },
                // window.prompt đã hỏi lý do bắt buộc → không confirm thêm (tránh 2 lớp hỏi)
                { key: 'cancel-approval', icon: 'x', label: 'Hủy duyệt', tone: 'danger', confirm: false,
                  hidden: r.status < 4, disabled: !!acting, onClick: () => onCancelApproval(r) },
              ]} />
            </div>
          );
        }}
        loading={loading}
        empty={(
          <div className="ab-empty">
            <TermIcon name="search" size={20} />
            <div>Không có xét nghiệm nào</div>
          </div>
        )}
      />

      <Pager
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        total={filtered.length}
        perPage={PAGE_SIZE}
      />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{detail.requestCode}</span>
              <span style={{ fontSize: 14 }}>{detail.patientName}</span>
            </span>
          : ''}
        sub={detail
          ? `${detail.patientCode} · ${detail.departmentName || '—'} · ${fmtDT(detail.requestDate)}`
          : ''}
        size="lg"
        footer={detail ? (
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <Btn variant="ghost" onClick={() => navigate(`/v2/emr/edit?patientId=${encodeURIComponent(detail.patientId)}`)}>
              <TermIcon name="folder" size={12} /> Xem HSBA
            </Btn>
            {detail.status >= 4 && (
              <span style={{ display: 'inline-flex', alignItems: 'center' }} title="Trạng thái ký số">
                <SignatureStatusIcon
                  signed={signatureMap.has(detail.id)}
                  signatureInfo={signatureMap.get(detail.id)}
                />
              </span>
            )}
            <span className="ab-u-flex1" />
            {detail.status >= 1 && (
              <Btn onClick={() => openChainCancel(detail)}>
                <TermIcon name="refresh" size={12} /> Hủy ngược chuỗi
              </Btn>
            )}
            {detail.status === 1 && (
              <Btn onClick={() => onPrintBarcode(detail)}>
                <TermIcon name="qr" size={12} /> In nhãn
              </Btn>
            )}
            {(detail.status === 2 || detail.status === 3) && (
              <Btn onClick={() => setEntryTarget(detail)}>
                <TermIcon name="edit" size={12} /> Nhập KQ
              </Btn>
            )}
            {detail.status >= 4 && (
              <Btn disabled={!!acting} onClick={() => onCancelApproval(detail)}>
                <TermIcon name="x" size={12} /> Hủy duyệt
              </Btn>
            )}
            {detail.status >= 4 && !signatureMap.has(detail.id) && (
              <Btn onClick={() => handleSignResult(detail.id)}>
                <TermIcon name="shield" size={12} /> Ký KQ
              </Btn>
            )}
            <Btn onClick={() => onPrintRow(detail)}>
              <TermIcon name="print" size={12} /> In phiếu
            </Btn>
            {statusKey(detail.status) === 'running' && (
              <Btn variant="primary" disabled={!!acting} onClick={() => { onApprove(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> {acting === detail.id ? 'Đang duyệt…' : 'Duyệt KQ'}
              </Btn>
            )}
            {detail.status === 3 && (
              <Btn variant="primary" disabled={!!acting} onClick={() => { onPreliminary(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> {acting === detail.id ? 'Đang duyệt…' : 'Duyệt sơ bộ'}
              </Btn>
            )}
            {detail.status === 4 && (
              <Btn variant="primary" disabled={!!acting} onClick={() => { onFinal(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> {acting === detail.id ? 'Đang duyệt…' : 'Duyệt chính thức'}
              </Btn>
            )}
          </>
        ) : null}
      >
        {detail && <LabDrawerBody r={detail} />}
      </DrawerShell>

      {/* ── Drawer: Tiện ích — Tủ trực | Tồn kho hóa chất | Định mức XN ── */}
      <LabUtilDrawer
        open={utilOpen}
        onClose={() => setUtilOpen(false)}
        loading={utilLoading}
        filterMonth={utilFilterMonth}
        setFilterMonth={setUtilFilterMonth}
        cabinetStock={utilCabinetStock}
        chemStock={utilChemStock}
        chemicals={utilChemicals}
      />

      {/* ── Modal: cài đặt KTV / Người duyệt mặc định ───────────────── */}
      <LabRolesModal
        open={rolesOpen}
        onClose={() => setRolesOpen(false)}
        saving={rolesSaving}
        value={rolesEdit}
        onChange={setRolesEdit}
        onSave={saveRoles}
      />

      {/* ── Modal: hủy ngược chuỗi workflow XN ───────────────────────── */}
      <LabChainCancelModal
        open={chainOpen}
        onClose={() => setChainOpen(false)}
        busy={chainBusy}
        target={chainTarget}
        level={chainLevel}
        setLevel={setChainLevel}
        reason={chainReason}
        setReason={setChainReason}
        onConfirm={runChainCancel}
      />

      {/* ── Modal: nhập kết quả xét nghiệm thủ công ─────────────────── */}
      <LabResultEntryModal
        open={!!entryTarget}
        request={entryTarget}
        onClose={() => setEntryTarget(null)}
        onSaved={() => { setEntryTarget(null); setDetail(null); reload(); }}
      />

      {/* ── Ký số: nhập PIN USB Token ────────────────────────────────── */}
      <PinEntryModal
        open={pinModalOpen}
        onSubmit={handlePinSubmit}
        onCancel={() => { setPinModalOpen(false); setPinError(''); }}
        loading={pinLoading}
        error={pinError}
      />
    </div>
  );
};

export default LaboratoryV2;
