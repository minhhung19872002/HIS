import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input, Select, InputNumber } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { DatePicker } from 'antd';
import { getBloodStock, getBloodStockDetail, getExpiringBloodBags, getExpiredBloodBags, getIssueRequests, getProductTypes, createIssueRequest, createImportReceipt, getSuppliers, updateBloodBagStatus, destroyExpiredBloodBags, approveIssueRequest, issueBlood } from '../api/bloodBank';
import type { BloodStockDto, BloodBagDto, BloodIssueRequestDto, BloodProductTypeDto, BloodStockDetailDto, BloodSupplierDto } from '../api/bloodBank';
import { catalogApi } from '../../system/api/system';
import type { DepartmentCatalogDto } from '../../system/api/system';
import { openPrintWindow, escapeHtml as esc } from '../../../utils/printWindow';
import { HOSPITAL_NAME } from '../../../constants/hospital';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, DrSec, DrField, ModalShell, cf,
  type ColumnDef, type TopTab,
} from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';

/* ────────────────────────────────────────────────────────────
   Ngân hàng máu v2 — port of design-system-v2/his/project/BloodBank v2.html
   Layout: KpiStrip + TopTabs (stock / expiring / requests)
   Simplified vs design pack: skip donor + screening tabs (need separate APIs).
   ──────────────────────────────────────────────────────────── */

const BLOOD_TYPES = ['O', 'A', 'B', 'AB'];
const RH = ['+', '-'];
const ALL_TYPES = BLOOD_TYPES.flatMap((b) => RH.map((r) => `${b}${r}`));

type TopKey = 'stock' | 'expiring' | 'expired' | 'requests' | 'gelcard';

const TOP_TABS: TopTab<TopKey>[] = [
  { v: 'stock',     l: 'Kho máu',          ic: 'drop' },
  { v: 'expiring',  l: 'Sắp hết hạn',      ic: 'alert' },
  // #352: túi ĐÃ quá hạn — trước đây v2 không có view nào chứa chúng (getExpiringBloodBags
  // chỉ trả Available + ExpiryDate > GETDATE()) nên nút "Tiêu huỷ" không bao giờ với tới
  // đúng túi cần huỷ. Patient-safety.
  { v: 'expired',   l: 'Đã hết hạn',       ic: 'x' },
  { v: 'requests',  l: 'Yêu cầu xuất máu', ic: 'send' },
  { v: 'gelcard',   l: 'Gelcard',          ic: 'flask' },
];

const STATUS_LABEL: Record<string, { l: string; tone: 'ok' | 'warn' | 'info' | 'crit' }> = {
  Available: { l: 'Khả dụng', tone: 'ok' },
  Reserved: { l: 'Đặt trước', tone: 'info' },
  Issued: { l: 'Đã xuất', tone: 'info' },
  Expired: { l: 'Hết hạn', tone: 'crit' },
  Quarantine: { l: 'Cách ly', tone: 'warn' },
};

const fmtVol = (n: number) => `${n.toLocaleString('vi-VN')} mL`;
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const buildBloodLabelHtml = (u: BloodStockDetailDto): string => `<!DOCTYPE html>
<html><head><title>Nhãn đơn vị máu - ${esc(u.bagCode)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;padding:5px}.label{border:2px solid #000;padding:8px;width:280px}.header{text-align:center;font-weight:bold;font-size:12px;border-bottom:1px solid #000;padding-bottom:5px;margin-bottom:5px}.blood-type{font-size:36px;font-weight:bold;color:#d00;text-align:center;margin:10px 0}.info-row{display:flex;justify-content:space-between;margin:3px 0}.barcode{text-align:center;font-family:monospace;font-size:14px;letter-spacing:2px;margin:8px 0;padding:5px;background:#f0f0f0}.warning{background:#ffcc00;padding:3px;text-align:center;font-weight:bold;margin-top:5px}@media print{body{padding:0}}</style>
</head><body>
<div class="label">
  <div class="header">${esc(HOSPITAL_NAME)}</div>
  <div class="header" style="font-size:11px">NGÂN HÀNG MÁU</div>
  <div class="blood-type">${esc(u.bloodType)}${esc(u.rhFactor)}</div>
  <div class="barcode">${esc(u.bagCode)}</div>
  <div class="info-row"><span>Thành phần:</span><span><strong>${esc(u.productTypeName)}</strong></span></div>
  <div class="info-row"><span>Thể tích:</span><span><strong>${esc(u.volume)} mL</strong></span></div>
  <div class="info-row"><span>Ngày nhập:</span><span>${esc(dayjs(u.collectionDate).format('DD/MM/YYYY'))}</span></div>
  <div class="info-row"><span>Hạn SD:</span><span style="color:#d00"><strong>${esc(dayjs(u.expiryDate).format('DD/MM/YYYY'))}</strong></span></div>
  <div class="info-row"><span>Vị trí:</span><span>${esc(u.storageLocation || '—')}</span></div>
  <div class="warning">BẢO QUẢN 2-6°C</div>
</div>
</body></html>`;

type BloodIssueRequestRow = BloodIssueRequestDto & {
  statusName?: string; reason?: string; indication?: string;
};

const buildBloodRequestHtml = (r: BloodIssueRequestRow): string => {
  const urgencyColor = r.urgency === 'Emergency' || r.urgency === 'STAT' ? '#ff0000' : r.urgency === 'Urgent' || r.urgency === 'urgent' ? '#ff8800' : '#000';
  // Nhãn mức độ tiếng Việt như v1 (không in raw 'Emergency' lên phiếu)
  const urgencyText = r.urgency === 'Emergency' || r.urgency === 'STAT' ? 'CẤP CỨU'
    : r.urgency === 'Urgent' || r.urgency === 'urgent' ? 'Cần gấp' : 'Bình thường';
  const reason = r.clinicalIndication || r.indication || r.reason || 'Không có thông tin';
  return `<!DOCTYPE html>
<html><head><title>Phiếu yêu cầu truyền máu - ${esc(r.requestCode)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:13px;line-height:1.5;padding:20px}.header{display:flex;justify-content:space-between;margin-bottom:15px}.title{font-size:18px;font-weight:bold;text-align:center;margin:15px 0;text-transform:uppercase}.urgency{font-size:16px;font-weight:bold;text-align:center;color:${urgencyColor};margin-bottom:15px}.info-section{border:1px solid #000;padding:10px;margin-bottom:15px}.section-title{font-weight:bold;margin-bottom:5px;background:#f0f0f0;padding:5px}.info-row{margin:5px 0}.field{border-bottom:1px dotted #000;min-width:100px;display:inline-block;padding:0 5px}.blood-box{border:2px solid #000;padding:15px;margin:15px 0;background:#fff0f0}.blood-type-large{font-size:28px;font-weight:bold;color:#d00;text-align:center}.sig-row{display:flex;justify-content:space-between;margin-top:40px;text-align:center}.sig-col{width:30%}@media print{body{padding:10px}}</style>
</head><body>
<div class="header">
  <div><strong>${esc(HOSPITAL_NAME)}</strong><br>Khoa: ${esc(r.departmentName || '—')}</div>
  <div style="text-align:right"><strong>Số phiếu: ${esc(r.requestCode)}</strong><br>Ngày: ${esc(dayjs(r.requestDate || r.createdAt).format('DD/MM/YYYY HH:mm'))}</div>
</div>
<div class="title">PHIẾU YÊU CẦU TRUYỀN MÁU</div>
<div class="urgency">[${esc(urgencyText)}]</div>
<div class="info-section">
  <div class="section-title">THÔNG TIN BỆNH NHÂN</div>
  <div class="info-row">Mã bệnh nhân: <span class="field">${esc(r.patientCode || '—')}</span></div>
  <div class="info-row">Họ và tên: <span class="field" style="width:300px"><strong>${esc(r.patientName || '—')}</strong></span></div>
</div>
<div class="blood-box">
  <div class="section-title" style="background:#ffcccc">YÊU CẦU MÁU</div>
  <div style="display:flex;justify-content:space-around;margin:15px 0">
    <div style="text-align:center"><div>Nhóm máu:</div><div class="blood-type-large">${esc(r.bloodType || '—')}${esc(r.rhFactor || '')}</div></div>
    <div style="text-align:center"><div>Thành phần:</div><div style="font-size:18px;font-weight:bold">${esc(r.productTypeName || '—')}</div></div>
    <div style="text-align:center"><div>Số lượng:</div><div style="font-size:24px;font-weight:bold">${esc(String(r.requestedQuantity ?? '—'))} đơn vị</div></div>
  </div>
</div>
<div class="info-section">
  <div class="section-title">CHỈ ĐỊNH LÂM SÀNG</div>
  <div style="min-height:60px;padding:10px">${esc(reason)}</div>
</div>
<div class="sig-row">
  <div class="sig-col"><strong>BÁC SĨ YÊU CẦU</strong><div style="margin-top:50px">${esc(r.requestedByName || '')}</div></div>
  <div class="sig-col"><strong>TRƯỞNG KHOA</strong><div style="margin-top:50px"></div></div>
  <div class="sig-col"><strong>NGÂN HÀNG MÁU</strong><div style="margin-top:50px"></div></div>
</div>
</body></html>`;
};

const BloodBankV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [tab, setTab] = useState<TopKey>('stock');
  const [stock, setStock] = useState<BloodStockDto[]>([]);
  const [units, setUnits] = useState<BloodStockDetailDto[]>([]);
  // BE stock/expiring trả BloodStockDetailDto (bloodBagId, KHÔNG có id/donorName/unit)
  // — cast BloodBagDto cũ che lệch shape làm Cấp phát/Tiêu huỷ gửi id=undefined.
  const [expiring, setExpiring] = useState<BloodStockDetailDto[]>([]);
  const [expired, setExpired] = useState<BloodStockDetailDto[]>([]);
  const [requests, setRequests] = useState<BloodIssueRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(0);
  const [detailType, setDetailType] = useState<string | null>(null);
  const [unitSel, setUnitSel] = useState<BloodStockDetailDto | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  // Gelcard results — local-only (v1 lưu vào state, không có API persist). Key = bloodBagId.
  const [gelcardResults, setGelcardResults] = useState<Record<string, string>>({});
  const saveGelcardResult = (bloodBagId: string, testResult: string) =>
    setGelcardResults((prev) => ({ ...prev, [bloodBagId]: testResult }));
  const PAGE_SIZE = 16;

  const reload = () => {
    setLoading(true);
    Promise.allSettled([
      getBloodStock(),
      getBloodStockDetail(),
      getExpiringBloodBags(7),
      getIssueRequests(dayjs().subtract(60, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')),
      getExpiredBloodBags(),
    ]).then(([s, u, e, r, x]) => {
      if (s.status === 'fulfilled') setStock((s.value.data || []) as BloodStockDto[]);
      if (u.status === 'fulfilled') setUnits((u.value.data || []) as BloodStockDetailDto[]);
      if (e.status === 'fulfilled') setExpiring((e.value.data || []) as BloodStockDetailDto[]);
      if (r.status === 'fulfilled') setRequests((r.value.data || []) as BloodIssueRequestDto[]);
      if (x.status === 'fulfilled') setExpired((x.value.data || []) as BloodStockDetailDto[]);
      setLoading(false);
    });
  };
  useEffect(reload, []);

  // ─── Aggregate stock by blood type+rh ───
  const byType = useMemo(() => {
    const map: Record<string, { total: number; available: number; reserved: number; expiring: number; expired: number; volume: number }> = {};
    ALL_TYPES.forEach((k) => {
      map[k] = { total: 0, available: 0, reserved: 0, expiring: 0, expired: 0, volume: 0 };
    });
    stock.forEach((s) => {
      const k = `${s.bloodType}${s.rhFactor}`;
      if (!map[k]) map[k] = { total: 0, available: 0, reserved: 0, expiring: 0, expired: 0, volume: 0 };
      map[k].total += s.totalBags;
      map[k].available += s.availableBags;
      map[k].reserved += s.reservedBags;
      map[k].expiring += s.expiringWithin7Days;
      map[k].expired += s.expiredBags;
      map[k].volume += s.totalVolume || 0;
    });
    return map;
  }, [stock]);

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const total = stock.reduce((s, r) => s + r.totalBags, 0);
    const available = stock.reduce((s, r) => s + r.availableBags, 0);
    const reserved = stock.reduce((s, r) => s + r.reservedBags, 0);
    const expiring7 = stock.reduce((s, r) => s + r.expiringWithin7Days, 0);
    const pendingReq = requests.filter((r) => r.status === 'pending' || r.status === 'Pending').length;
    const oNeg = byType['O-']?.available || 0;
    return { total, available, reserved, expiring7, pendingReq, oNeg };
  }, [stock, requests, byType]);

  // (stockRows useMemo + StockTab component dead code — removed K1 audit cleanup 2026-05-30)

  // ─── Blood units (Kho máu table) ───
  const unitsFiltered = useMemo(() => {
    return units.filter((u) => {
      if (filterType && `${u.bloodType}${u.rhFactor}` !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [u.bagCode, u.barcode, u.storageLocation, u.productTypeName, u.bloodType]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [units, search, filterType]);

  /**
   * #352: hợp nhất nguồn "sắp hết hạn".
   * `getExpiringBloodBags` bị backend ép `status='Available'` (BloodBankCompleteService.Stock.cs:109)
   * nên **túi Đã đặt trước (Reserved) sắp hết hạn KHÔNG hiện** — v1 tính theo status 0|1 nên vẫn thấy.
   * Bổ sung bằng cách tự tính từ danh sách đơn vị máu (đã có sẵn `units`), gộp theo bloodBagId.
   */
  const expiringMerged = useMemo(() => {
    const byId = new Map<string, BloodStockDetailDto>();
    expiring.forEach((b) => byId.set(b.bloodBagId, b));
    units.forEach((u) => {
      if (u.status !== 'Available' && u.status !== 'Reserved') return;
      const days = dayjs(u.expiryDate).diff(dayjs(), 'day');
      if (days >= 0 && days <= 7 && !byId.has(u.bloodBagId)) byId.set(u.bloodBagId, u);
    });
    return [...byId.values()];
  }, [expiring, units]);

  const expiringFiltered = useMemo(() => {
    return expiringMerged.filter((b) => {
      if (filterType && `${b.bloodType}${b.rhFactor}` !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [b.bagCode, b.barcode, b.storageLocation, b.productTypeName]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [expiringMerged, search, filterType]);

  /**
   * #352: phân bố hạn dùng 4 bucket (v1 pages/BloodBank.tsx:1035-1048 + :1060-1063).
   * v2 trước đây chỉ có mốc ≤7 ngày → không thấy được nhóm 8-30 ngày để lên kế hoạch dùng trước.
   */
  const expiryBuckets = useMemo(() => {
    let expiredN = 0, d7 = 0, d30 = 0, safe = 0;
    units.forEach((u) => {
      if (u.status !== 'Available' && u.status !== 'Reserved') return;
      const days = dayjs(u.expiryDate).diff(dayjs(), 'day');
      if (days < 0) expiredN++;
      else if (days <= 7) d7++;
      else if (days <= 30) d30++;
      else safe++;
    });
    return { expiredN, d7, d30, safe };
  }, [units]);

  const expiredFiltered = useMemo(() => {
    return expired.filter((b) => {
      if (filterType && `${b.bloodType}${b.rhFactor}` !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [b.bagCode, b.barcode, b.storageLocation, b.productTypeName]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [expired, search, filterType]);

  const requestsFiltered = useMemo(() => {
    return requests.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.requestCode, r.patientName, r.departmentName]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requests, search]);

  // ─── Gelcard: đơn vị máu còn hoạt động (Khả dụng / Đặt trước) ───
  const gelcardBase = useMemo(
    () => units.filter((u) => u.status === 'Available' || u.status === 'Reserved'),
    [units],
  );
  const gelcardFiltered = useMemo(() => {
    return gelcardBase.filter((u) => {
      if (filterType && `${u.bloodType}${u.rhFactor}` !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [u.bagCode, u.barcode, u.storageLocation, u.productTypeName, u.bloodType]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [gelcardBase, search, filterType]);

  const totalPages = Math.max(1, Math.ceil(
    (tab === 'stock' ? unitsFiltered.length : tab === 'expiring' ? expiringFiltered.length : tab === 'expired' ? expiredFiltered.length : tab === 'gelcard' ? gelcardFiltered.length : requestsFiltered.length) / PAGE_SIZE,
  ));

  // Unit table columns (mock "Kho máu")
  const unitColumns: ColumnDef<BloodStockDetailDto>[] = [
    { key: 'bag', label: 'Mã đơn vị', mono: true, code: true, width: 150, render: (u) => u.bagCode },
    { key: 'type', label: 'Nhóm', width: 80, render: (u) => <span className="chip crit" style={{ fontWeight: 700 }}>{u.bloodType}{u.rhFactor}</span> },
    { key: 'product', label: 'Chế phẩm', render: (u) => u.productTypeName },
    { key: 'vol', label: 'Thể tích', mono: true, width: 90, render: (u) => `${u.volume} mL` },
    { key: 'loc', label: 'Vị trí', render: (u) => u.storageLocation || '—' },
    {
      key: 'exp', label: 'HSD', mono: true, width: 130,
      render: (u) => (
        <span style={{ color: u.daysUntilExpiry < 7 ? 'var(--s-crit)' : u.daysUntilExpiry < 30 ? 'var(--s-warn)' : 'var(--t-1)' }}>
          {fmtDMY(u.expiryDate)}{u.daysUntilExpiry != null ? ` · ${u.daysUntilExpiry}d` : ''}
        </span>
      ),
    },
    {
      key: 'status', label: 'Trạng thái', width: 120,
      render: (u) => {
        const m = STATUS_LABEL[u.status] || { l: u.status, tone: 'info' as const };
        return <StatusBadge tone={m.tone} dot>{m.l}</StatusBadge>;
      },
    },
  ];
  const unitsPaged = unitsFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Tổng đơn vị', val: kpis.total, sub: 'tất cả nhóm' },
          { lbl: 'Khả dụng', val: kpis.available, sub: 'sẵn sàng cấp', tone: 'ok' },
          { lbl: 'Đặt trước', val: kpis.reserved, sub: 'đã reserve' },
          { lbl: 'Hết hạn ≤7 ngày', val: kpis.expiring7, sub: 'cần xử lý', tone: 'warn' },
          { lbl: 'Yêu cầu chờ', val: kpis.pendingReq, sub: 'chờ duyệt', tone: 'warn' },
          { lbl: 'O- khả dụng', val: kpis.oNeg, sub: 'cấp cứu', tone: kpis.oNeg < 5 ? 'crit' : 'ok' },
        ]}
      />

      <TopTabs<TopKey>
        tab={tab}
        setTab={(t) => { setTab(t); setPage(0); }}
        tabs={TOP_TABS}
        actions={
          <>
            <Btn variant="ghost" onClick={reload}>
              <TermIcon name="refresh" size={12} /> Làm mới
            </Btn>
            <Btn variant="ghost" onClick={() => setReceiveOpen(true)}>
              <TermIcon name="plus" size={12} /> Nhận máu
            </Btn>
            <Btn variant="primary" onClick={() => setIssueOpen(true)}>
              <TermIcon name="send" size={12} /> Xuất máu
            </Btn>
          </>
        }
      />

      <div className="ab-tools">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Tìm mã túi / barcode / hiến / khoa…" />
        <Filter
          value={filterType} onChange={setFilterType}
          options={ALL_TYPES.map((t) => ({ v: t, l: t }))}
          placeholder="▾ Nhóm máu"
        />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFilterType(''); setPage(0); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
          {tab === 'stock' ? `${unitsFiltered.length} đơn vị` :
           tab === 'expiring' ? `${expiringFiltered.length} túi` :
           tab === 'gelcard' ? `${gelcardFiltered.length} đơn vị` :
           `${requestsFiltered.length} yêu cầu`}
        </span>
      </div>

      {tab === 'stock' && (
        <>
          {/* Group-count chip bar */}
          <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', padding: '8px 14px', borderBottom: '1px solid var(--line-soft)', background: 'var(--d-1)' }}>
            {ALL_TYPES.map((t) => {
              const a = byType[t]?.available || 0;
              return (
                <span key={t} style={{
                  display: 'inline-flex', alignItems: 'center', borderRadius: 14, overflow: 'hidden',
                  border: filterType === t ? '1px solid var(--a-cy)' : '1px solid var(--line)',
                  background: filterType === t ? 'var(--a-cy-bg)' : 'var(--d-2)', fontSize: 11.5,
                }}>
                  <button type="button" onClick={() => { setFilterType(filterType === t ? '' : t); setPage(0); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 'var(--space-6)', padding: '4px 6px 4px 10px',
                      border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'inherit',
                    }}>
                    <b style={{ color: a < 5 ? 'var(--s-crit)' : 'var(--t-0)' }}>{t}</b>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-2)' }}>{a}đv</span>
                  </button>
                  {/* #420: trigger mở drawer chi tiết nhóm máu (BloodTypeDetail trước đây dead-wired) */}
                  <button type="button" title={`Chi tiết nhóm máu ${t}`} onClick={() => setDetailType(t)}
                    style={{
                      border: 'none', borderLeft: '1px solid var(--line-soft)', background: 'transparent',
                      cursor: 'pointer', padding: '4px 8px', color: 'var(--t-2)', display: 'inline-flex', alignItems: 'center',
                    }}>
                    <TermIcon name="info" size={11} />
                  </button>
                </span>
              );
            })}
          </div>
          <DataTable<BloodStockDetailDto>
            columns={unitColumns}
            data={unitsPaged}
            rowKey={(u) => u.bloodBagId}
            onRowClick={setUnitSel}
            empty={loading ? 'Đang tải…' : <div className="ab-empty"><TermIcon name="drop" size={20} /><div>Không có đơn vị máu</div></div>}
          />
        </>
      )}
      {tab === 'expiring' && (
        <>
          {/* #352: 4 stat-card phân bố hạn dùng (v1 có, v2 trước đây chỉ có mốc ≤7 ngày) */}
          <div style={{ display: 'flex', gap: 'var(--space-8)', margin: '0 16px 10px', flexWrap: 'wrap' }}>
            {[
              { l: 'Đã quá hạn', v: expiryBuckets.expiredN, c: 'var(--s-crit)' },
              { l: 'Còn ≤ 7 ngày', v: expiryBuckets.d7, c: 'var(--s-warn)' },
              { l: '8–30 ngày', v: expiryBuckets.d30, c: 'var(--a-cy)' },
              { l: '> 30 ngày (an toàn)', v: expiryBuckets.safe, c: 'var(--s-ok)' },
            ].map((b) => (
              <div key={b.l} style={{
                flex: '1 1 140px', padding: '8px 12px', borderRadius: 'var(--r-2)',
                border: '1px solid var(--line)', borderLeft: `3px solid ${b.c}`, background: 'var(--d-0)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{b.l}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: b.c }}>{b.v}</div>
              </div>
            ))}
          </div>
          <ExpiringTab rows={expiringFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)} loading={loading} message={message} onReload={reload} />
        </>
      )}
      {tab === 'expired' && (
        <>
          {expiredFiltered.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-8)',
              margin: '0 16px 10px', padding: '8px 12px', borderRadius: 'var(--r-2)',
              border: '1px solid var(--s-crit)', borderLeft: '3px solid var(--s-crit)',
              background: 'var(--d-0)', fontSize: 12.5,
            }}>
              <TermIcon name="alert" size={14} />
              <div>
                <strong>{expiredFiltered.length} túi máu đã quá hạn — cần xử lý ngay.</strong>
                <span style={{ color: 'var(--t-2)' }}> Máu quá hạn KHÔNG được cấp phát; chỉ có thao tác tiêu huỷ.</span>
              </div>
            </div>
          )}
          <ExpiringTab
            rows={expiredFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
            loading={loading} message={message} onReload={reload} mode="expired"
          />
        </>
      )}
      {tab === 'requests' && <RequestsTab rows={requestsFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)} loading={loading} units={units} onReload={reload} />}
      {tab === 'gelcard' && <GelcardTab rows={gelcardFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)} allActiveUnits={gelcardBase} loading={loading} results={gelcardResults} onSaveResult={saveGelcardResult} />}

      <Pager page={page} totalPages={totalPages} setPage={setPage}
        total={tab === 'stock' ? unitsFiltered.length : tab === 'expiring' ? expiringFiltered.length : tab === 'expired' ? expiredFiltered.length : tab === 'gelcard' ? gelcardFiltered.length : requestsFiltered.length} perPage={PAGE_SIZE} />

      <DrawerShell
        open={!!detailType}
        onClose={() => setDetailType(null)}
        title={detailType ? `Nhóm máu ${detailType}` : ''}
        sub={detailType ? `Tồn kho và phân bổ chế phẩm` : ''}
        size="lg"
      >
        {detailType && <BloodTypeDetail type={detailType} stock={stock} />}
      </DrawerShell>

      <DrawerShell
        open={!!unitSel}
        onClose={() => setUnitSel(null)}
        size="md"
        title={unitSel ? `Đơn vị máu ${unitSel.bagCode}` : ''}
        sub={unitSel ? `${unitSel.bloodType}${unitSel.rhFactor} · ${unitSel.productTypeName}` : ''}
      >
        {unitSel && (
          <DrSec title="Đơn vị máu">
            <DrField lbl="Mã đơn vị"><span style={{ fontFamily: 'var(--font-mono)' }}>{unitSel.bagCode}</span></DrField>
            <DrField lbl="Nhóm máu">{unitSel.bloodType}{unitSel.rhFactor}</DrField>
            <DrField lbl="Chế phẩm">{unitSel.productTypeName}</DrField>
            <DrField lbl="Thể tích"><span style={{ fontFamily: 'var(--font-mono)' }}>{unitSel.volume} mL</span></DrField>
            <DrField lbl="Vị trí">{unitSel.storageLocation || '—'}</DrField>
            <DrField lbl="Hạn sử dụng">{fmtDMY(unitSel.expiryDate)}{unitSel.daysUntilExpiry != null ? ` · còn ${unitSel.daysUntilExpiry}d` : ''}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={(STATUS_LABEL[unitSel.status] || { tone: 'info' as const }).tone} dot>
                {(STATUS_LABEL[unitSel.status] || { l: unitSel.status }).l}
              </StatusBadge>
            </DrField>
            <div style={{ marginTop: 'var(--space-12)', borderTop: '1px solid var(--line-soft)', paddingTop: 'var(--space-10)' }}>
              <Btn variant="ghost" onClick={() => openPrintWindow(buildBloodLabelHtml(unitSel), { focus: true, print: { delayMs: 500 } })}>
                <TermIcon name="printer" size={12} /> In nhãn đơn vị máu
              </Btn>
            </div>
          </DrSec>
        )}
      </DrawerShell>

      <BloodIssueModal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        onDone={() => { setIssueOpen(false); reload(); }}
      />

      <BloodReceiveModal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        onDone={() => { setReceiveOpen(false); reload(); }}
      />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   Blood issue-request modal — real createIssueRequest with
   department + product-type lookups.
   ────────────────────────────────────────────────────────── */

const BLOOD_GROUPS = ['A', 'B', 'AB', 'O'];
const RH_OPTS = [{ value: '+', label: 'Rh+' }, { value: '-', label: 'Rh−' }];
const URGENCY_OPTS = [
  { value: 'Routine', label: 'Thường quy' },
  { value: 'Urgent', label: 'Khẩn' },
  { value: 'Emergency', label: 'Cấp cứu' },
];

const BloodIssueModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [depts, setDepts] = useState<DepartmentCatalogDto[]>([]);
  const [products, setProducts] = useState<BloodProductTypeDto[]>([]);
  const [deptId, setDeptId] = useState<string | undefined>(undefined);
  const [bloodType, setBloodType] = useState('O');
  const [rh, setRh] = useState('+');
  const [productTypeId, setProductTypeId] = useState<string | undefined>(undefined);
  const [qty, setQty] = useState(1);
  const [urgency, setUrgency] = useState('Routine');
  const [indication, setIndication] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setDeptId(undefined); setBloodType('O'); setRh('+'); setProductTypeId(undefined);
      setQty(1); setUrgency('Routine'); setIndication('');
      Promise.allSettled([
        catalogApi.getDepartments(undefined, undefined, true),
        getProductTypes(),
      ]).then(([d, p]) => {
        if (d.status === 'fulfilled') setDepts(d.value.data || []);
        if (p.status === 'fulfilled') setProducts((p.value.data || []) as BloodProductTypeDto[]);
      });
    }
  }, [open]);

  const submit = async () => {
    if (!deptId) { message.warning('Chọn khoa yêu cầu'); return; }
    if (!productTypeId) { message.warning('Chọn chế phẩm máu'); return; }
    if (!qty || qty <= 0) { message.warning('Nhập số lượng'); return; }
    setBusy(true);
    try {
      await createIssueRequest({
        departmentId: deptId,
        bloodType,
        rhFactor: rh,
        productTypeId,
        requestedQuantity: qty,
        urgency,
        clinicalIndication: indication.trim() || undefined,
      });
      message.success('Đã tạo phiếu yêu cầu xuất máu');
      onDone();
    } catch {
      message.error('Tạo phiếu xuất máu thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Tạo phiếu yêu cầu xuất máu"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Tạo phiếu'}
          </Btn>
        </>
      )}
    >
      <div style={{ padding: 'var(--space-16)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <BbFld label="Khoa yêu cầu *" full>
          <Select
            value={deptId} onChange={setDeptId} showSearch optionFilterProp="label"
            placeholder="Chọn khoa" style={{ width: '100%' }}
            options={depts.map((d) => ({ value: d.id!, label: d.name }))}
          />
        </BbFld>
        <BbFld label="Nhóm máu">
          <Select value={bloodType} onChange={setBloodType} style={{ width: '100%' }}
            options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))} />
        </BbFld>
        <BbFld label="Rh">
          <Select value={rh} onChange={setRh} options={RH_OPTS} style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Chế phẩm *" full>
          <Select
            value={productTypeId} onChange={setProductTypeId} showSearch optionFilterProp="label"
            placeholder="Chọn chế phẩm máu" style={{ width: '100%' }}
            options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.unit})` }))}
          />
        </BbFld>
        <BbFld label="Số lượng">
          <InputNumber value={qty} onChange={(v) => setQty(Number(v) || 1)} min={1} style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Mức độ">
          <Select value={urgency} onChange={setUrgency} options={URGENCY_OPTS} style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Chỉ định lâm sàng" full>
          <Input.TextArea value={indication} onChange={(e) => setIndication(e.target.value)} rows={2} placeholder="Lý do truyền máu, chẩn đoán…" />
        </BbFld>
      </div>
    </ModalShell>
  );
};

const BbFld: React.FC<{ label?: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
    {label && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>{label}</div>}
    {children}
  </div>
);

const ExpiringTab: React.FC<{
  rows: BloodStockDetailDto[];
  loading: boolean;
  message: MessageInstance;
  onReload: () => void;
  /** #352: 'expired' = túi ĐÃ quá hạn → CHỈ được tiêu huỷ, không cấp phát (patient-safety). */
  mode?: 'expiring' | 'expired';
}> = ({ rows, loading, message, onReload, mode = 'expiring' }) => {
  const isExpired = mode === 'expired';
  const [sel, setSel] = useState<BloodStockDetailDto | null>(null);
  const [actionBag, setActionBag] = useState<{ bag: BloodStockDetailDto; type: 'dispense' | 'discard' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
  const columns: ColumnDef<BloodStockDetailDto>[] = [
    { key: 'bag', label: 'Mã túi', mono: true, width: 130, render: (b) => b.bagCode },
    { key: 'barcode', label: 'Barcode', mono: true, width: 130, render: (b) => b.barcode },
    {
      key: 'type', label: 'Nhóm', width: 80,
      render: (b) => (
        <span className="chip cy mono" style={{ fontWeight: 700 }}>{b.bloodType}{b.rhFactor}</span>
      ),
    },
    { key: 'product', label: 'Chế phẩm', render: (b) => b.productTypeName },
    {
      key: 'volume', label: 'Thể tích', mono: true, width: 100,
      render: (b) => `${b.volume} mL`,
    },
    {
      key: 'expiry', label: 'HSD', mono: true, width: 110,
      render: (b) => {
        const days = dayjs(b.expiryDate).diff(dayjs(), 'day');
        const color = days < 0 ? 'var(--s-crit)' : days <= 3 ? 'var(--s-warn)' : 'var(--t-1)';
        return (
          <div className="cell-2l">
            <b style={{ color }}>{fmtDMY(b.expiryDate)}</b>
            <i style={{ color }}>{days < 0 ? `Hết ${-days}d` : `Còn ${days}d`}</i>
          </div>
        );
      },
    },
    { key: 'storage', label: 'Vị trí', mono: true, width: 100, render: (b) => b.storageLocation || '—' },
    {
      key: 'status', label: 'TT', width: 110,
      render: (b) => {
        const m = STATUS_LABEL[b.status] || { l: b.status, tone: 'info' as const };
        return <StatusBadge tone={m.tone} dot>{m.l}</StatusBadge>;
      },
    },
  ];
  return (
    <>
    <DataTable<BloodStockDetailDto>
      columns={columns}
      data={rows}
      rowKey={(b) => b.bloodBagId}
      onRowClick={setSel}
      actions={(b) => (
        <div className="ab-actions">
          {/* Máu quá hạn TUYỆT ĐỐI không cấp phát → chỉ hiện nút Tiêu huỷ */}
          {!isExpired && (
            <ActBtn ic="send" title="Cấp phát" onClick={() => { setDiscardReason(''); setActionBag({ bag: b, type: 'dispense' }); }} />
          )}
          <ActBtn ic="alert" title="Tiêu huỷ" tone={isExpired ? 'crit' : 'warn'}
            onClick={() => { setDiscardReason(''); setActionBag({ bag: b, type: 'discard' }); }} />
        </div>
      )}
      empty={loading ? 'Đang tải…' : (
        <div className="ab-empty">
          <TermIcon name="check" size={20} />
          <div>{isExpired ? 'Không có túi máu nào quá hạn' : 'Không có túi máu nào sắp hết hạn'}</div>
        </div>
      )}
    />
    <DrawerShell
      open={!!sel}
      onClose={() => setSel(null)}
      size="md"
      title={sel ? `Túi máu ${sel.bagCode}` : ''}
      sub={sel ? `${sel.bloodType}${sel.rhFactor} · ${sel.productTypeName}` : ''}
    >
      {sel && (
        <DrSec title={isExpired ? 'Túi máu đã quá hạn' : 'Túi máu sắp hết hạn'}>
          <DrField lbl="Mã túi"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.bagCode}</span></DrField>
          <DrField lbl="Barcode"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.barcode || '—'}</span></DrField>
          <DrField lbl="Nhóm máu">{sel.bloodType}{sel.rhFactor}</DrField>
          <DrField lbl="Chế phẩm">{sel.productTypeName}</DrField>
          <DrField lbl="Thể tích"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.volume} mL</span></DrField>
          <DrField lbl="Vị trí">{sel.storageLocation || '—'}</DrField>
          <DrField lbl="Hạn sử dụng">{fmtDMY(sel.expiryDate)}</DrField>
          <DrField lbl="Trạng thái">{(() => { const m = STATUS_LABEL[sel.status] || { l: sel.status, tone: 'info' as const }; return <StatusBadge tone={m.tone} dot>{m.l}</StatusBadge>; })()}</DrField>
        </DrSec>
      )}
    </DrawerShell>

    {/* Confirm modal cho Cấp phát / Tiêu huỷ */}
    <ModalShell
      open={!!actionBag}
      onClose={() => setActionBag(null)}
      title={actionBag?.type === 'dispense' ? `Cấp phát túi máu ${actionBag.bag.bagCode}` : `Tiêu huỷ túi máu ${actionBag?.bag.bagCode}`}
      sub={actionBag ? `${actionBag.bag.bloodType}${actionBag.bag.rhFactor} · ${actionBag.bag.productTypeName} · ${actionBag.bag.volume} mL` : ''}
      size="sm"
      footer={<>
        <Btn variant="ghost" onClick={() => setActionBag(null)}>Huỷ</Btn>
        <Btn
          variant={actionBag?.type === 'dispense' ? 'primary' : 'ghost'}
          style={actionBag?.type === 'discard' ? { background: 'var(--s-crit)', color: '#fff', borderColor: 'var(--s-crit)' } : undefined}
          loading={actionLoading}
          onClick={async () => {
            if (!actionBag) return;
            if (actionBag.type === 'discard' && !discardReason.trim()) {
              message.warning('Cần nhập lý do tiêu huỷ');
              return;
            }
            setActionLoading(true);
            try {
              if (actionBag.type === 'dispense') {
                if (isExpired) { message.error('Không được cấp phát túi máu đã quá hạn'); setActionLoading(false); return; }
                await updateBloodBagStatus(actionBag.bag.bloodBagId, 'Issued', 'Cấp phát từ kho sắp hết hạn');
                message.success(`Đã cấp phát túi máu ${actionBag.bag.bagCode}`);
              } else {
                await destroyExpiredBloodBags([actionBag.bag.bloodBagId], discardReason.trim());
                message.success(`Đã tiêu huỷ túi máu ${actionBag.bag.bagCode}`);
              }
              setActionBag(null);
              onReload();
            } catch {
              message.error(actionBag.type === 'dispense' ? 'Cấp phát thất bại' : 'Tiêu huỷ thất bại');
            } finally {
              setActionLoading(false);
            }
          }}
        >
          {actionBag?.type === 'dispense' ? 'Xác nhận cấp phát' : 'Xác nhận tiêu huỷ'}
        </Btn>
      </>}
    >
      {actionBag?.type === 'discard' && (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Lý do tiêu huỷ *</div>
          <Input.TextArea
            rows={2}
            value={discardReason}
            onChange={(e) => setDiscardReason(e.target.value)}
            placeholder="Nhập lý do tiêu huỷ túi máu…"
          />
        </div>
      )}
      {actionBag?.type === 'dispense' && (
        <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-md)' }}>
          Xác nhận cấp phát túi máu <b>{actionBag.bag.bagCode}</b> ({actionBag.bag.bloodType}{actionBag.bag.rhFactor}) ra khỏi kho?
        </div>
      )}
    </ModalShell>
    </>
  );
};

const RequestsTab: React.FC<{
  rows: BloodIssueRequestDto[];
  loading: boolean;
  units: BloodStockDetailDto[];
  onReload: () => void;
}> = ({ rows, loading, units, onReload }) => {
  const { message } = AntdApp.useApp();
  const [sel, setSel] = useState<BloodIssueRequestRow | null>(null);
  // #420: port Duyệt + Xuất máu từ v1 (approveIssueRequest / issueBlood)
  const [issueFor, setIssueFor] = useState<BloodIssueRequestRow | null>(null);
  const [pickedBags, setPickedBags] = useState<Set<string>>(new Set());
  const [issueSaving, setIssueSaving] = useState(false);

  const stKey = (st?: string) => String(st || '').toLowerCase();
  const canApprove = (r: BloodIssueRequestRow) => stKey(r.status) === 'pending';
  const canIssue = (r: BloodIssueRequestRow) => ['approved', 'partiallyissued'].includes(stKey(r.status));

  const handleApprove = (r: BloodIssueRequestRow) => {
    cf(`Duyệt yêu cầu ${r.requestCode || r.id?.slice(0, 8)} — BN ${r.patientName || '—'}, ${r.bloodType}${r.rhFactor} × ${r.requestedQuantity}?`, async () => {
      try {
        await approveIssueRequest(r.id);
        message.success('Đã duyệt yêu cầu');
        setSel(null);
        onReload();
      } catch {
        message.error('Lỗi khi duyệt yêu cầu. Vui lòng thử lại.');
      }
    }, { title: 'Xác nhận duyệt yêu cầu' });
  };

  const openIssue = (r: BloodIssueRequestRow) => {
    setPickedBags(new Set());
    setIssueFor(r);
  };

  // Túi máu khớp yêu cầu: đúng nhóm + Rh + chế phẩm, còn Khả dụng (patient-safety: backend KHÔNG tự chặn)
  const matchingBags = useMemo(() => {
    if (!issueFor) return [];
    return units.filter((u) =>
      u.status === 'Available'
      && u.bloodType === issueFor.bloodType
      && u.rhFactor === issueFor.rhFactor
      && (!issueFor.productTypeName || u.productTypeName === issueFor.productTypeName));
  }, [units, issueFor]);

  const remainingQty = issueFor
    ? Math.max(0, (issueFor.requestedQuantity || 0) - (issueFor.issuedQuantity || 0))
    : 0;

  const toggleBag = (bagId: string) => {
    setPickedBags((prev) => {
      const next = new Set(prev);
      if (next.has(bagId)) next.delete(bagId);
      else if (next.size >= remainingQty) {
        message.warning(`Yêu cầu chỉ còn ${remainingQty} đơn vị — bỏ chọn túi khác trước`);
        return prev;
      } else next.add(bagId);
      return next;
    });
  };

  const submitIssue = async () => {
    if (!issueFor) return;
    if (pickedBags.size === 0) { message.warning('Chọn ít nhất 1 túi máu để xuất'); return; }
    setIssueSaving(true);
    try {
      await issueBlood({
        requestId: issueFor.id,
        bloodBagIds: Array.from(pickedBags),
        note: `Xuất máu cho BN ${issueFor.patientName || ''}${issueFor.patientCode ? ` - ${issueFor.patientCode}` : ''}`.trim(),
      });
      message.success(`Đã xuất ${pickedBags.size} đơn vị máu cho bệnh nhân`);
      setIssueFor(null);
      setSel(null);
      onReload();
    } catch {
      message.error('Lỗi khi xuất máu. Vui lòng thử lại.');
    } finally {
      setIssueSaving(false);
    }
  };

  const cols: ColumnDef<BloodIssueRequestRow>[] = [
    { key: 'code', label: 'Mã YC', mono: true, width: 130, render: (r) => r.requestCode || r.id?.slice(0, 8) },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => r.patientName || '—' },
    { key: 'dept', label: 'Khoa yêu cầu', render: (r) => r.departmentName || '—' },
    { key: 'reason', label: 'Lý do', render: (r) => r.clinicalIndication || r.indication || r.reason || '—' },
    { key: 'urgency', label: 'Mức', width: 100,
      render: (r) => {
        // Backend + modal tạo phiếu dùng 'Routine'/'Urgent'/'Emergency' (URGENCY_OPTS)
        const crit = r.urgency === 'Emergency' || r.urgency === 'STAT';
        const warn = r.urgency === 'Urgent' || r.urgency === 'urgent';
        const label = crit ? 'Cấp cứu' : warn ? 'Khẩn' : 'Thường quy';
        return <span className={`chip ${crit ? 'crit' : warn ? 'warn' : 'info'}`}>{label}</span>;
      } },
    {
      key: 'status', label: 'TT', width: 130,
      render: (r) => {
        // Backend trả 'Approved' / 'FullyIssued' / 'PartiallyIssued' (PascalCase)
        const done = r.status === 'Approved' || r.status === 'FullyIssued' || r.status === 'PartiallyIssued';
        return <StatusBadge tone={done ? 'ok' : 'warn'} dot>{r.statusName || r.status}</StatusBadge>;
      },
    },
    {
      key: 'date', label: 'Ngày YC', mono: true, width: 110,
      render: (r) => fmtDMY(r.requestDate || r.createdAt),
    },
    {
      key: 'act', label: '', width: 90,
      render: (r) => (
        <>
          {canApprove(r) && <ActBtn ic="check" title="Duyệt yêu cầu" onClick={() => handleApprove(r)} />}
          {canIssue(r) && <ActBtn ic="send" title="Xuất máu" onClick={() => openIssue(r)} />}
        </>
      ),
    },
  ];
  return (
    <>
    <DataTable<BloodIssueRequestRow>
      columns={cols}
      data={rows}
      rowKey={(r) => r.id}
      onRowClick={(r) => setSel(r)}
      empty={loading ? 'Đang tải…' : (
        <div className="ab-empty">
          <TermIcon name="search" size={20} />
          <div>Chưa có yêu cầu xuất máu</div>
        </div>
      )}
    />
    <DrawerShell
      open={!!sel}
      onClose={() => setSel(null)}
      size="md"
      title={sel ? `Yêu cầu ${sel.requestCode || sel.id?.slice(0, 8)}` : ''}
      sub={sel ? (sel.patientName || '—') : ''}
    >
      {sel && (
        <DrSec title="Yêu cầu xuất máu">
          <DrField lbl="Mã YC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.requestCode || sel.id?.slice(0, 8)}</span></DrField>
          <DrField lbl="Bệnh nhân">{sel.patientName || '—'}</DrField>
          <DrField lbl="Khoa yêu cầu">{sel.departmentName || '—'}</DrField>
          <DrField lbl="Lý do / Chỉ định">{sel.clinicalIndication || sel.indication || sel.reason || '—'}</DrField>
          <DrField lbl="Mức độ">{sel.urgency || 'Thường'}</DrField>
          <DrField lbl="Trạng thái">
            <StatusBadge tone={sel.status === 'approved' || sel.status === 'issued' ? 'ok' : 'warn'} dot>{sel.statusName || sel.status || '—'}</StatusBadge>
          </DrField>
          <DrField lbl="Ngày YC">{fmtDMY(sel.requestDate || sel.createdAt)}</DrField>
          <DrField lbl="Số lượng">
            <span style={{ fontFamily: 'var(--font-mono)' }}>{sel.issuedQuantity || 0}/{sel.requestedQuantity || 0} đơn vị</span>
          </DrField>
          <div style={{ marginTop: 'var(--space-12)', borderTop: '1px solid var(--line-soft)', paddingTop: 'var(--space-10)', display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
            {canApprove(sel) && (
              <Btn variant="primary" onClick={() => handleApprove(sel)}>
                <TermIcon name="check" size={12} /> Duyệt yêu cầu
              </Btn>
            )}
            {canIssue(sel) && (
              <Btn variant="primary" onClick={() => openIssue(sel)}>
                <TermIcon name="send" size={12} /> Xuất máu
              </Btn>
            )}
            <Btn variant="ghost" onClick={() => openPrintWindow(buildBloodRequestHtml(sel), { focus: true, print: { delayMs: 500 } })}>
              <TermIcon name="printer" size={12} /> In phiếu yêu cầu truyền máu
            </Btn>
          </div>
        </DrSec>
      )}
    </DrawerShell>

    {/* #420: modal xuất máu — chọn túi khớp nhóm/Rh/chế phẩm, tối đa số lượng còn lại */}
    <ModalShell
      open={!!issueFor}
      onClose={() => setIssueFor(null)}
      size="md"
      title={issueFor ? `Xuất máu — ${issueFor.requestCode || issueFor.id?.slice(0, 8)}` : ''}
      sub={issueFor ? `${issueFor.patientName || '—'} · cần ${remainingQty} đơn vị ${issueFor.bloodType}${issueFor.rhFactor}${issueFor.productTypeName ? ` · ${issueFor.productTypeName}` : ''}` : ''}
      footer={<>
        <Btn variant="ghost" onClick={() => setIssueFor(null)}>Đóng</Btn>
        <Btn variant="primary" disabled={issueSaving || pickedBags.size === 0} onClick={submitIssue}>
          {issueSaving ? 'Đang xuất…' : `Xuất ${pickedBags.size} túi`}
        </Btn>
      </>}
    >
      {issueFor && (
        matchingBags.length === 0 ? (
          <div className="ab-empty" style={{ padding: 'var(--space-16)' }}>
            <TermIcon name="alert" size={20} />
            <div>Không có túi máu khả dụng khớp {issueFor.bloodType}{issueFor.rhFactor}{issueFor.productTypeName ? ` · ${issueFor.productTypeName}` : ''}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxHeight: 380, overflowY: 'auto' }}>
            {matchingBags.map((u) => {
              const picked = pickedBags.has(u.bloodBagId);
              return (
                <button key={u.bloodBagId} type="button" onClick={() => toggleBag(u.bloodBagId)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-10)', padding: '8px 10px', textAlign: 'left',
                    border: picked ? '1px solid var(--a-cy)' : '1px solid var(--line)', borderRadius: 6,
                    background: picked ? 'var(--a-cy-bg)' : 'var(--d-2)', cursor: 'pointer',
                  }}>
                  <span style={{ width: 16, textAlign: 'center', color: picked ? 'var(--a-cy)' : 'var(--t-3)' }}>
                    {picked ? <TermIcon name="check" size={12} /> : '·'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, minWidth: 120 }}>{u.bagCode}</span>
                  <span className="chip crit" style={{ fontWeight: 700 }}>{u.bloodType}{u.rhFactor}</span>
                  <span style={{ flex: 1 }}>{u.productTypeName}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{u.volume} mL</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: u.daysUntilExpiry < 7 ? 'var(--s-crit)' : 'var(--t-2)' }}>
                    HSD {fmtDMY(u.expiryDate)}
                  </span>
                </button>
              );
            })}
          </div>
        )
      )}
    </ModalShell>
    </>
  );
};

/* ──────────────────────────────────────────────────────────
   Gelcard compatibility-test tab — port từ v1 (pages/BloodBank.tsx
   tab 'gelcard' + handleGelcardSubmit). Ghi kết quả phản ứng hòa hợp
   gelcard per-đơn-vị-máu. Local-only: v1 lưu vào state (setInventory),
   KHÔNG có API persist → v2 giữ nguyên bản chất, lưu map local.
   ────────────────────────────────────────────────────────── */

const GELCARD_TEST_TYPES = [
  { value: 'ABO/Rh', label: 'Định nhóm ABO/Rh' },
  { value: 'CrossMatch', label: 'Phản ứng chéo (Cross-match)' },
  { value: 'Antibody', label: 'Sàng lọc kháng thể bất thường' },
  { value: 'DAT', label: 'Direct Antiglobulin Test (DAT)' },
];
const GELCARD_RESULT_OPTS = [
  { value: 'Phù hợp', label: 'Phù hợp (Compatible)' },
  { value: 'Không phù hợp', label: 'Không phù hợp (Incompatible)' },
  { value: 'Dương tính', label: 'Dương tính (Positive)' },
  { value: 'Âm tính', label: 'Âm tính (Negative)' },
];
const GELCARD_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GELCARD_RH_OPTS = [{ value: '+', label: 'Rh (+)' }, { value: '-', label: 'Rh (-)' }];

const GelcardTab: React.FC<{
  rows: BloodStockDetailDto[];
  allActiveUnits: BloodStockDetailDto[];
  loading: boolean;
  results: Record<string, string>;
  onSaveResult: (bloodBagId: string, testResult: string) => void;
}> = ({ rows, allActiveUnits, loading, results, onSaveResult }) => {
  const { message } = AntdApp.useApp();
  const [open, setOpen] = useState(false);
  const [unitId, setUnitId] = useState<string | undefined>(undefined);
  const [testType, setTestType] = useState<string | undefined>(undefined);
  const [bloodTypeResult, setBloodTypeResult] = useState<string | undefined>(undefined);
  const [rhResult, setRhResult] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');

  const openModal = () => {
    setUnitId(undefined); setTestType(undefined); setBloodTypeResult(undefined);
    setRhResult(undefined); setResult(undefined); setNotes('');
    setOpen(true);
  };

  const submit = () => {
    if (!unitId) { message.warning('Chọn đơn vị máu'); return; }
    if (!testType) { message.warning('Chọn loại xét nghiệm'); return; }
    if (!result) { message.warning('Chọn kết quả'); return; }
    const unit = allActiveUnits.find((u) => u.bloodBagId === unitId);
    if (unit) {
      // Business logic VERBATIM từ v1 handleGelcardSubmit (chuỗi kết quả giữ nguyên format)
      const testResult = `Gelcard ${testType}: ${bloodTypeResult || ''} Rh${rhResult || ''} - ${result} (${dayjs().format('DD/MM/YYYY HH:mm')})`;
      onSaveResult(unit.bloodBagId, testResult);
      message.success(`Ghi nhận kết quả Gelcard cho ${unit.bagCode}`);
    }
    setOpen(false);
  };

  const columns: ColumnDef<BloodStockDetailDto>[] = [
    { key: 'bag', label: 'Mã đơn vị', mono: true, code: true, width: 140, render: (u) => u.bagCode },
    { key: 'type', label: 'Nhóm máu', width: 90, render: (u) => <span className="chip crit" style={{ fontWeight: 700 }}>{u.bloodType}{u.rhFactor}</span> },
    { key: 'product', label: 'Chế phẩm', render: (u) => u.productTypeName },
    { key: 'exp', label: 'Hạn SD', mono: true, width: 110, render: (u) => fmtDMY(u.expiryDate) },
    {
      key: 'gel', label: 'Kết quả Gelcard',
      render: (u) => (
        results[u.bloodBagId]
          ? <span style={{ color: '#15803d', fontSize: 12 }}>{results[u.bloodBagId]}</span>
          : <span style={{ color: 'var(--t-3)' }}>Chưa test</span>
      ),
    },
    {
      key: 'status', label: 'TT', width: 110,
      render: (u) => {
        const m = STATUS_LABEL[u.status] || { l: u.status, tone: 'info' as const };
        return <StatusBadge tone={m.tone} dot>{m.l}</StatusBadge>;
      },
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--space-10)', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--line-soft)', background: 'var(--d-1)' }}>
        <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>
          <TermIcon name="info" size={14} />
          Gelcard: Phương pháp xác định nhóm máu và thử phản ứng chéo bằng gel card
        </div>
        <Btn variant="primary" onClick={openModal}>
          <TermIcon name="plus" size={12} /> Ghi kết quả Gelcard
        </Btn>
      </div>

      <DataTable<BloodStockDetailDto>
        columns={columns}
        data={rows}
        rowKey={(u) => u.bloodBagId}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">
            <TermIcon name="flask" size={20} />
            <div>Không có đơn vị máu để thử Gelcard</div>
          </div>
        )}
      />

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title="Ghi nhận kết quả Gelcard"
        footer={(
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Hủy</Btn>
            <Btn variant="primary" onClick={submit}>
              <TermIcon name="check" size={12} /> Lưu kết quả
            </Btn>
          </>
        )}
      >
        <div style={{ padding: 'var(--space-16)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <BbFld label="Đơn vị máu *" full>
            <Select
              value={unitId} onChange={setUnitId} showSearch optionFilterProp="label"
              placeholder="Chọn đơn vị máu" style={{ width: '100%' }}
              options={allActiveUnits.map((u) => ({ value: u.bloodBagId, label: `${u.bagCode} - ${u.bloodType}${u.rhFactor} - ${u.productTypeName}` }))}
            />
          </BbFld>
          <BbFld label="Loại xét nghiệm *" full>
            <Select value={testType} onChange={setTestType} placeholder="Chọn loại xét nghiệm" style={{ width: '100%' }} options={GELCARD_TEST_TYPES} />
          </BbFld>
          <BbFld label="Nhóm máu xác nhận">
            <Select value={bloodTypeResult} onChange={setBloodTypeResult} allowClear placeholder="—" style={{ width: '100%' }}
              options={GELCARD_BLOOD_GROUPS.map((g) => ({ value: g, label: g }))} />
          </BbFld>
          <BbFld label="Rh">
            <Select value={rhResult} onChange={setRhResult} allowClear placeholder="—" style={{ width: '100%' }} options={GELCARD_RH_OPTS} />
          </BbFld>
          <BbFld label="Kết quả *" full>
            <Select value={result} onChange={setResult} placeholder="Chọn kết quả" style={{ width: '100%' }} options={GELCARD_RESULT_OPTS} />
          </BbFld>
          <BbFld label="Ghi chú" full>
            <Input.TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ghi chú kết quả Gelcard…" />
          </BbFld>
        </div>
      </ModalShell>
    </>
  );
};

const BloodTypeDetail: React.FC<{ type: string; stock: BloodStockDto[] }> = ({ type, stock }) => {
  const bloodType = type.replace(/[+-]$/, '');
  const rh = type.endsWith('+') ? '+' : '-';
  const items = stock.filter((s) => s.bloodType === bloodType && s.rhFactor === rh);
  const totals = items.reduce((acc, s) => ({
    total: acc.total + s.totalBags,
    available: acc.available + s.availableBags,
    reserved: acc.reserved + s.reservedBags,
    expiring: acc.expiring + s.expiringWithin7Days,
    expired: acc.expired + s.expiredBags,
    volume: acc.volume + s.totalVolume,
  }), { total: 0, available: 0, reserved: 0, expiring: 0, expired: 0, volume: 0 });

  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="drop" size={11} /> TỔNG QUAN</h5>
        <div className="rec-kv">
          <span>Nhóm máu</span><b className="mono" style={{ fontSize: 14 }}>{type}</b>
          <span>Tổng đơn vị</span><b>{totals.total}</b>
          <span>Khả dụng</span><b style={{ color: '#15803d' }}>{totals.available}</b>
          <span>Đặt trước</span><b>{totals.reserved}</b>
          <span>Sắp HSD ≤7d</span><b style={{ color: 'var(--s-warn)' }}>{totals.expiring}</b>
          <span>Đã hết hạn</span><b style={{ color: 'var(--s-crit)' }}>{totals.expired}</b>
          <span>Tổng thể tích</span><b className="mono">{fmtVol(totals.volume)}</b>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="activity" size={11} /> THEO CHẾ PHẨM ({items.length})</h5>
        {items.length === 0 && <span style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Không có chế phẩm nào trong nhóm này</span>}
        {items.map((s) => (
          <div key={`${s.productTypeId}`} style={{
            padding: '10px 0', borderBottom: '1px solid var(--line-soft)',
            display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 'var(--space-10)', fontSize: 12.5, alignItems: 'center',
          }}>
            <b>{s.productTypeName}</b>
            <span className="chip ok">{s.availableBags}</span>
            <span className="chip info">{s.reservedBags}</span>
            <span className="mono" style={{ color: 'var(--t-2)' }}>{fmtVol(s.totalVolume)}</span>
          </div>
        ))}
      </div>
    </>
  );
};

/* ──────────────────────────────────────────────────────────
   Blood receive (nhập kho từ nhà cung cấp) modal — port từ v1
   (pages/BloodBank.tsx). Pattern raw useState theo BloodIssueModal.
   API: createImportReceipt + getSuppliers + getProductTypes (đã có).
   ────────────────────────────────────────────────────────── */

const BloodReceiveModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [suppliers, setSuppliers] = useState<BloodSupplierDto[]>([]);
  const [products, setProducts] = useState<BloodProductTypeDto[]>([]);
  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
  const [bloodType, setBloodType] = useState('O');
  const [rh, setRh] = useState('+');
  const [productTypeId, setProductTypeId] = useState<string | undefined>(undefined);
  const [volume, setVolume] = useState<number>(350);
  const [receiveDate, setReceiveDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [expiryDate, setExpiryDate] = useState<dayjs.Dayjs | null>(dayjs().add(42, 'day'));
  const [bagCode, setBagCode] = useState('');
  const [deliveryPerson, setDeliveryPerson] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset state + load lookup khi mở (pattern BloodIssueModal)
  useEffect(() => {
    if (open) {
      setSupplierId(undefined); setBloodType('O'); setRh('+'); setProductTypeId(undefined);
      setVolume(350); setReceiveDate(dayjs()); setExpiryDate(dayjs().add(42, 'day'));
      setBagCode(`BU${dayjs().format('YYMMDD')}${String(Date.now()).slice(-4)}`);
      setDeliveryPerson(''); setNote('');
      Promise.allSettled([
        getSuppliers(),
        getProductTypes(),
      ]).then(([s, p]) => {
        if (s.status === 'fulfilled') setSuppliers((s.value.data || []) as BloodSupplierDto[]);
        if (p.status === 'fulfilled') setProducts((p.value.data || []) as BloodProductTypeDto[]);
      });
    }
  }, [open]);

  const submit = async () => {
    if (!supplierId) { message.warning('Chọn nhà cung cấp'); return; }
    if (!productTypeId) { message.warning('Chọn chế phẩm máu'); return; }
    if (!bagCode.trim()) { message.warning('Nhập mã túi máu'); return; }
    if (!volume || volume <= 0) { message.warning('Nhập thể tích'); return; }
    if (!receiveDate) { message.warning('Chọn ngày nhập'); return; }
    if (!expiryDate) { message.warning('Chọn hạn sử dụng'); return; }
    setBusy(true);
    try {
      await createImportReceipt({
        receiptDate: receiveDate.format('YYYY-MM-DD'),
        supplierId,
        deliveryPerson: deliveryPerson.trim() || undefined,
        note: note.trim() || undefined,
        items: [{
          bagCode: bagCode.trim(),
          barcode: bagCode.trim(),
          bloodType,
          rhFactor: rh,
          productTypeId,
          volume,
          collectionDate: receiveDate.format('YYYY-MM-DD'),
          expiryDate: expiryDate.format('YYYY-MM-DD'),
          price: 0,
        }],
      });
      message.success(`Đã nhập đơn vị máu ${bagCode}`);
      onDone();
    } catch {
      message.error('Nhập máu thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Nhận máu vào kho"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Lưu'}
          </Btn>
        </>
      )}
    >
      <div style={{ padding: 'var(--space-16)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <BbFld label="Nhà cung cấp *" full>
          <Select
            value={supplierId} onChange={setSupplierId} showSearch optionFilterProp="label"
            placeholder="Chọn nhà cung cấp" style={{ width: '100%' }}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </BbFld>
        <BbFld label="Mã túi máu *">
          <Input value={bagCode} onChange={(e) => setBagCode(e.target.value)} placeholder="BU241231xxxx" />
        </BbFld>
        <BbFld label="Người giao">
          <Input value={deliveryPerson} onChange={(e) => setDeliveryPerson(e.target.value)} placeholder="Tên người giao" />
        </BbFld>
        <BbFld label="Nhóm máu">
          <Select value={bloodType} onChange={setBloodType} style={{ width: '100%' }}
            options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))} />
        </BbFld>
        <BbFld label="Rh">
          <Select value={rh} onChange={setRh} options={RH_OPTS} style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Chế phẩm *" full>
          <Select
            value={productTypeId} onChange={setProductTypeId} showSearch optionFilterProp="label"
            placeholder="Chọn chế phẩm máu" style={{ width: '100%' }}
            options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.unit})` }))}
          />
        </BbFld>
        <BbFld label="Thể tích (mL)">
          <InputNumber value={volume} onChange={(v) => setVolume(Number(v) || 0)} min={100} max={500} step={50} style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Ngày nhập / lấy máu *">
          <DatePicker value={receiveDate} onChange={setReceiveDate} format="DD/MM/YYYY" style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Hạn sử dụng *" full>
          <DatePicker value={expiryDate} onChange={setExpiryDate} format="DD/MM/YYYY" style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Ghi chú" full>
          <Input.TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Ghi chú nhập máu…" />
        </BbFld>
      </div>
    </ModalShell>
  );
};

export default BloodBankV2;
