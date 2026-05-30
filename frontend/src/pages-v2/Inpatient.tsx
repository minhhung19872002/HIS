import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getInpatientList, getWardLayout } from '../api/inpatient';
import type { InpatientListDto, WardLayoutDto, BedLayoutDto } from '../api/inpatient';
import { catalogApi } from '../api/system';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell,
  type ColumnDef, type TopTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* ────────────────────────────────────────────────────────────
   Nội trú v2 — bed-map (Sơ đồ giường) theo mock Ward v2.
   3 tab: Sơ đồ giường (grid card theo khoa) · Danh sách BN · Y lệnh.
   Dữ liệu thật: getWardLayout (rooms→beds) + getInpatientList.
   ──────────────────────────────────────────────────────────── */

type TopKey = 'grid' | 'list' | 'orders';
const TOP_TABS: TopTab<TopKey>[] = [
  { v: 'grid',   l: 'Sơ đồ giường', ic: 'grid' },
  { v: 'list',   l: 'Danh sách BN', ic: 'users' },
  { v: 'orders', l: 'Y lệnh hôm nay', ic: 'clipboard' },
];

// Bed status: 1 trống · 2 có BN · 3 bảo trì (khớp BedLayoutDto.status)
const BED_STATUS = [
  { v: '2', l: 'Có bệnh nhân' },
  { v: '1', l: 'Trống' },
  { v: '3', l: 'Bảo trì' },
];
const bedTone = (s: number): { bg: string; line: string } => {
  if (s === 2) return { bg: 'var(--a-cy-bg, #ecfeff)', line: 'var(--a-cy-line, #a5f3fc)' };
  if (s === 3) return { bg: 'var(--a-or-bg, #fff7ed)', line: 'var(--a-or-line, #fed7aa)' };
  return { bg: '#fff', line: 'var(--line)' };
};

const fmtDMY = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '—');
const fmtVND = (n: number) => `${(n || 0).toLocaleString('vi-VN')} ₫`;
const genderLabel = (g?: number) => (g === 1 ? 'Nam' : g === 2 ? 'Nữ' : '—');

type IpStatusKey = 'admitted' | 'transferred' | 'discharged';
const ipStatusKey = (s: number): IpStatusKey => (s === 1 ? 'transferred' : s === 2 ? 'discharged' : 'admitted');
const IP_STATUS_LABEL: Record<IpStatusKey, string> = { admitted: 'Đang điều trị', transferred: 'Đã chuyển', discharged: 'Đã xuất viện' };

const InpatientV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TopKey>('grid');
  const [loading, setLoading] = useState(true);
  const [wards, setWards] = useState<WardLayoutDto[]>([]);
  const [inpatients, setInpatients] = useState<InpatientListDto[]>([]);
  const [search, setSearch] = useState('');
  const [fWard, setFWard] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [page, setPage] = useState(0);
  const [bed, setBed] = useState<(BedLayoutDto & { wardName?: string }) | null>(null);
  const [detail, setDetail] = useState<InpatientListDto | null>(null);
  const LIST_PAGE = 16;

  const loadData = useCallback(() => {
    setLoading(true);
    (async () => {
      // 1) inpatient list (list tab + KPIs)
      let ip: InpatientListDto[] = [];
      try {
        // InpatientSearchDto dùng `page` (1-based), không phải `pageIndex` (0-based)
        const r = await getInpatientList({ page: 1, pageSize: 300 });
        ip = r.data?.items || [];
      } catch { ip = []; }
      setInpatients(ip);

      // 2) ward layouts for clinical departments with beds
      try {
        const depts = (await catalogApi.getDepartments(undefined, undefined, true)).data || [];
        const layouts = await Promise.allSettled(
          depts.slice(0, 40).map((d) => getWardLayout(d.id!).then((res) => res.data)),
        );
        const ws = layouts
          .filter((l): l is PromiseFulfilledResult<WardLayoutDto> => l.status === 'fulfilled' && !!l.value)
          .map((l) => l.value)
          .filter((w) => (w.totalBeds ?? 0) > 0);
        setWards(ws);
      } catch { setWards([]); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // All beds flattened (with ward name) for grid + filtering.
  const allBeds = useMemo(
    () => wards.flatMap((w) => (w.rooms ?? []).flatMap((r) => (r.beds ?? []).map((b) => ({ ...b, wardId: w.departmentId, wardName: w.departmentName })))),
    [wards],
  );

  const wardOpts = useMemo(
    () => wards.map((w) => ({ v: w.departmentId, l: w.departmentName })),
    [wards],
  );

  const filteredBeds = useMemo(() => allBeds.filter((b) => {
    if (fWard && b.wardId !== fWard) return false;
    if (fStatus && String(b.status) !== fStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [b.patientName, b.patientCode, b.bedName, b.bedCode].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [allBeds, fWard, fStatus, search]);

  // KPIs (match mock: Tổng giường / Có BN / Trống / Cảnh báo / TB ngày nằm / Bàn giao ca)
  const kpis = useMemo(() => {
    const total = allBeds.length;
    const occupied = allBeds.filter((b) => b.status === 2).length;
    const empty = allBeds.filter((b) => b.status === 1).length;
    const occupancy = total > 0 ? Math.round(occupied / total * 100) : 0;
    const alerts = inpatients.filter((r) => r.hasPendingOrders || r.hasPendingLabResults || r.hasUnclaimedMedicine || r.isDebtWarning).length;
    const avgLos = inpatients.length > 0 ? Math.round(inpatients.reduce((s, r) => s + (r.daysOfStay || 0), 0) / inpatients.length * 10) / 10 : 0;
    return [
      { lbl: 'Tổng giường', val: total, sub: `${wards.length} khoa` },
      { lbl: 'Có BN', val: occupied, sub: `${occupancy}% công suất`, tone: 'info' as const },
      { lbl: 'Trống', val: empty, sub: 'sẵn sàng', tone: 'ok' as const },
      { lbl: 'Cảnh báo', val: alerts, sub: 'BN cần theo dõi', tone: 'crit' as const },
      { lbl: 'TB ngày nằm', val: avgLos, unit: 'ngày', sub: '/ ca' },
      { lbl: 'Bàn giao ca', val: '07:00', sub: 'ca sáng' },
    ];
  }, [allBeds, inpatients, wards]);

  // ─── List tab data (filtered inpatients) ───
  const listFiltered = useMemo(() => inpatients.filter((r) => {
    if (fWard) {
      const w = wards.find((x) => x.departmentId === fWard);
      if (w && r.departmentName !== w.departmentName) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [r.patientName, r.patientCode, r.medicalRecordCode, r.mainDiagnosis].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [inpatients, fWard, wards, search]);
  const listTotalPages = Math.max(1, Math.ceil(listFiltered.length / LIST_PAGE));
  const listPaged = listFiltered.slice(page * LIST_PAGE, (page + 1) * LIST_PAGE);

  const ordersList = useMemo(() => inpatients.filter((r) => r.hasPendingOrders || r.hasUnclaimedMedicine || r.hasPendingLabResults), [inpatients]);

  const listColumns: ColumnDef<InpatientListDto>[] = [
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode} · {genderLabel(r.gender)} · {r.age || '—'}t</i></div>
      ),
    },
    { key: 'ward', label: 'Khoa · Phòng · Giường', render: (r) => (
      <div className="cell-2l"><b>{r.departmentName}</b><i>{r.roomName}{r.bedName ? ` · ${r.bedName}` : ''}</i></div>
    ) },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => r.mainDiagnosis || '—' },
    { key: 'doctor', label: 'BS điều trị', width: 170, render: (r) => r.attendingDoctorName || '—' },
    { key: 'los', label: 'Ngày nằm', mono: true, width: 90, render: (r) => `${r.daysOfStay} ngày` },
    { key: 'flags', label: 'Cảnh báo', width: 180, render: (r) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {r.hasPendingOrders && <span className="chip warn">Y lệnh</span>}
        {r.hasPendingLabResults && <span className="chip warn">CLS</span>}
        {r.hasUnclaimedMedicine && <span className="chip warn">Thuốc</span>}
        {r.isDebtWarning && <span className="chip crit">Nợ</span>}
        {!r.hasPendingOrders && !r.hasPendingLabResults && !r.hasUnclaimedMedicine && !r.isDebtWarning && <span style={{ color: 'var(--t-3)' }}>—</span>}
      </div>
    ) },
    { key: 'status', label: 'TT', width: 120, render: (r) => {
      const sk = ipStatusKey(r.status);
      return <StatusBadge tone={sk === 'admitted' ? 'ok' : 'info'} dot>{r.statusName || IP_STATUS_LABEL[sk]}</StatusBadge>;
    } },
  ];

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <TopTabs<TopKey>
        tab={tab}
        setTab={(t) => { setTab(t); setPage(0); }}
        tabs={TOP_TABS}
        actions={
          <>
            <Btn variant="ghost" onClick={loadData}>
              <TermIcon name="refresh" size={12} /> Làm mới
            </Btn>
            <Btn variant="ghost" onClick={() => navigate('/v2/hr')}>
              <TermIcon name="users" size={12} /> Bàn giao ca <kbd>F4</kbd>
            </Btn>
            <Btn variant="primary" onClick={() => navigate('/v2/inpatient-dispensing')}>
              <TermIcon name="plus" size={12} /> Y lệnh mới <kbd>F2</kbd>
            </Btn>
          </>
        }
      />

      <div className="ab-tools">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Tìm tên BN, mã BN, mã giường…" />
        <Filter value={fWard} onChange={(v) => { setFWard(v); setPage(0); }} options={wardOpts} placeholder="▾ Khoa" />
        {tab === 'grid' && <Filter value={fStatus} onChange={setFStatus} options={BED_STATUS} placeholder="▾ Trạng thái" />}
        <Btn variant="ghost" onClick={() => { setSearch(''); setFWard(''); setFStatus(''); setPage(0); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <span style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
          {tab === 'grid' ? `${filteredBeds.length} giường` : tab === 'list' ? `${listFiltered.length} BN` : `${ordersList.length} BN có y lệnh`}
        </span>
      </div>

      {/* ── Tab: Sơ đồ giường ── */}
      {tab === 'grid' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 18, background: 'var(--d-1)' }}>
          {loading && <div style={{ textAlign: 'center', color: 'var(--t-2)', fontSize: 12, padding: 20 }}>Đang tải sơ đồ giường…</div>}
          {!loading && filteredBeds.length === 0 && (
            <div className="ab-empty" style={{ padding: 40 }}><TermIcon name="grid" size={20} /><div>Không có giường phù hợp</div></div>
          )}
          {wards.map((w) => {
            const wardBeds = filteredBeds.filter((b) => b.wardId === w.departmentId);
            if (wardBeds.length === 0) return null;
            const occ = wardBeds.filter((b) => b.status === 2).length;
            return (
              <div key={w.departmentId} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>{w.departmentName}</h3>
                  <span style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{occ}/{wardBeds.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
                  {wardBeds.map((b) => {
                    const t = bedTone(b.status);
                    return (
                      <div
                        key={b.bedId}
                        onClick={() => setBed(b)}
                        style={{ padding: 10, background: t.bg, border: `1px solid ${t.line}`, borderRadius: 6, cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--t-0)' }}>{b.bedName || b.bedCode}</span>
                        </div>
                        {b.patientName ? (
                          <>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-0)', lineHeight: 1.2, marginBottom: 2 }}>{b.patientName}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--t-2)', marginBottom: 4 }}>{b.age || '—'}T · {genderLabel(b.gender)}{b.daysOfStay != null ? ` · ${b.daysOfStay} ngày` : ''}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--t-1)', lineHeight: 1.3 }}>{b.mainDiagnosis || '—'}</div>
                          </>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--t-2)', padding: '14px 0', textAlign: 'center' }}>{b.statusName || BED_STATUS.find((s) => s.v === String(b.status))?.l}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Danh sách BN ── */}
      {tab === 'list' && (
        <div className="ab-stack">
          <DataTable<InpatientListDto>
            columns={listColumns}
            data={listPaged}
            rowKey={(r) => r.admissionId}
            onRowClick={setDetail}
            actions={(r) => (
              <div className="ab-actions">
                <ActBtn ic="eye" title="Hồ sơ" onClick={() => setDetail(r)} />
                <ActBtn ic="clipboard" title="Y lệnh" onClick={() => navigate('/v2/inpatient-dispensing')} />
              </div>
            )}
            empty={loading ? 'Đang tải…' : <div className="ab-empty"><TermIcon name="users" size={20} /><div>Không có bệnh nhân nội trú</div></div>}
          />
          <div className="ab-tbl-ft">
            <span>Tổng <b>{listFiltered.length}</b> BN · trang <b>{page + 1}/{listTotalPages}</b></span>
            <span className="spacer" />
            <Pager page={page} totalPages={listTotalPages} setPage={setPage} total={listFiltered.length} perPage={LIST_PAGE} />
          </div>
        </div>
      )}

      {/* ── Tab: Y lệnh hôm nay ── */}
      {tab === 'orders' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 18, background: 'var(--d-1)' }}>
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6 }}>
            {ordersList.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: 'var(--t-2)', fontSize: 12 }}>Không có bệnh nhân cần xử lý y lệnh</div>}
            {ordersList.map((r) => (
              <div key={r.admissionId} style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setDetail(r)}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--t-0)', minWidth: 90 }}>{r.bedName || r.roomName}</span>
                <span style={{ fontWeight: 600 }}>{r.patientName}</span>
                <span style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.mainDiagnosis || '—'}</span>
                <span className="spacer" />
                {r.hasPendingOrders && <span className="chip warn">Y lệnh chờ</span>}
                {r.hasPendingLabResults && <span className="chip warn">CLS</span>}
                {r.hasUnclaimedMedicine && <span className="chip warn">Thuốc</span>}
                <span style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.attendingDoctorName || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bed drawer */}
      <DrawerShell
        open={!!bed}
        onClose={() => setBed(null)}
        size="md"
        title={bed ? `Giường ${bed.bedName || bed.bedCode}` : ''}
        sub={bed?.wardName}
        footer={bed ? (
          bed.patientName ? (
            <>
              <Btn variant="ghost" onClick={() => setBed(null)}>Đóng</Btn>
              <Btn variant="primary" onClick={() => { setBed(null); navigate('/v2/inpatient-dispensing'); }}>
                <TermIcon name="clipboard" size={12} /> Y lệnh
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="ghost" onClick={() => setBed(null)}>Đóng</Btn>
              <Btn variant="primary" onClick={() => { setBed(null); message.info('Chọn giường để nhập viện'); }}>Nhập viện vào giường này</Btn>
            </>
          )
        ) : null}
      >
        {bed && (bed.patientName ? (
          <div style={{ padding: 18 }}>
            <div className="rec-section">
              <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
              <div className="rec-kv">
                <span>Họ tên</span><b>{bed.patientName}</b>
                <span>Mã BN</span><span className="mono">{bed.patientCode || '—'}</span>
                <span>Giới · Tuổi</span><span>{genderLabel(bed.gender)} · {bed.age || '—'}t</span>
                <span>BHYT</span><span>{bed.isInsurance ? <span className="chip ok">Có</span> : <span className="chip">Không</span>}</span>
              </div>
            </div>
            <div className="rec-section">
              <h5><TermIcon name="activity" size={11} /> GIƯỜNG · ĐIỀU TRỊ</h5>
              <div className="rec-kv">
                <span>Giường</span><span className="mono">{bed.bedName || bed.bedCode}</span>
                <span>Khoa</span><b>{bed.wardName}</b>
                <span>Chẩn đoán</span><span>{bed.mainDiagnosis || '—'}</span>
                <span>Vào viện</span><span>{fmtDMY(bed.admissionDate)}</span>
                <span>Ngày nằm</span><b>{bed.daysOfStay ?? 0} ngày</b>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ color: 'var(--t-3)', marginBottom: 8 }}><TermIcon name="grid" size={40} /></div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Giường trống</div>
            <div style={{ fontSize: 12, color: 'var(--t-2)' }}>Trạng thái: {bed.statusName || BED_STATUS.find((s) => s.v === String(bed.status))?.l}</div>
          </div>
        ))}
      </DrawerShell>

      {/* Patient (list) drawer */}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{detail.medicalRecordCode}</span>
            <span style={{ fontSize: 14 }}>{detail.patientName}</span>
          </span>
        ) : ''}
        sub={detail ? `${detail.departmentName} · ${detail.roomName}${detail.bedName ? ` · ${detail.bedName}` : ''} · ${detail.daysOfStay} ngày` : ''}
        footer={detail ? (
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <Btn variant="primary" onClick={() => { setDetail(null); navigate('/v2/inpatient-dispensing'); }}>
              <TermIcon name="clipboard" size={12} /> Y lệnh
            </Btn>
          </>
        ) : null}
      >
        {detail && (
          <div style={{ padding: 18 }}>
            <div className="rec-section">
              <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
              <div className="rec-kv">
                <span>Họ tên</span><b>{detail.patientName}</b>
                <span>Mã BN</span><span className="mono">{detail.patientCode}</span>
                <span>Giới · Tuổi</span><span>{genderLabel(detail.gender)} · {detail.age || '—'}t</span>
                {detail.dateOfBirth && (<><span>Ngày sinh</span><span>{fmtDMY(detail.dateOfBirth)}</span></>)}
              </div>
            </div>
            <div className="rec-section">
              <h5><TermIcon name="activity" size={11} /> ĐIỀU TRỊ</h5>
              <div className="rec-kv">
                <span>Khoa</span><b>{detail.departmentName}</b>
                <span>Phòng / Giường</span><span>{detail.roomName}{detail.bedName ? ` · ${detail.bedName}` : ''}</span>
                <span>BS điều trị</span><span>{detail.attendingDoctorName || 'Chưa phân'}</span>
                <span>Chẩn đoán</span><span>{detail.mainDiagnosis || '—'}</span>
                <span>Vào viện</span><span>{fmtDMY(detail.admissionDate)}</span>
                <span>Ngày nằm</span><b>{detail.daysOfStay} ngày</b>
              </div>
            </div>
            {(detail.hasPendingOrders || detail.hasPendingLabResults || detail.hasUnclaimedMedicine || detail.isDebtWarning || detail.isInsuranceExpiring) && (
              <div className="rec-section">
                <h5><TermIcon name="alert" size={11} /> CẢNH BÁO</h5>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {detail.hasPendingOrders && <span className="chip warn">Y lệnh đang chờ</span>}
                  {detail.hasPendingLabResults && <span className="chip warn">Kết quả CLS chưa về</span>}
                  {detail.hasUnclaimedMedicine && <span className="chip warn">Thuốc chưa lấy</span>}
                  {detail.isDebtWarning && <span className="chip crit">Nợ {fmtVND(detail.totalDebt || 0)}</span>}
                  {detail.isInsuranceExpiring && <span className="chip crit">BHYT hết hạn</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </DrawerShell>
    </div>
  );
};

export default InpatientV2;
