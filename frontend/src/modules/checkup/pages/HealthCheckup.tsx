import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  searchHealthCheckups, getHealthCheckupStats, createHealthCheckup, updateHealthCheckup, getCheckupTypes,
  getCampaigns, createCampaign, updateCampaign, deleteCampaign,
  getCampaignGroups, createCampaignGroup, deleteCampaignGroup, importBatchExcel,
} from '../api/healthCheckup';
import { openPrintWindow } from '../../../utils/printWindow';
import type {
  HealthCheckup, HealthCheckupStats, CheckupType,
  CheckupCampaign, CampaignGroup, BatchImportResult,
} from '../api/healthCheckup';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti, cf, te, TopTabs,
  type ColumnDef, type CrudFieldCfg, type StatusTab,
} from '@/_v2kit';
import { DriverCheckupPrint, VsattpCheckupPrint, StudentCheckupPrint } from '../../patient/components/HealthCheckupPrintTemplates';

// ---- Static base fields (common to all KSK types) ----
const BASE_FIELDS: CrudFieldCfg[] = [
  { key: 'patientName', label: 'Ho ten doi tuong', required: true, placeholder: 'Nguyen Van A' },
  { key: 'patientCode', label: 'Ma/CCCD', placeholder: 'tuy chon' },
  { key: 'gender', label: 'Gioi tinh', type: 'select', required: true, options: [{ value: 1, label: 'Nam' }, { value: 2, label: 'Nu' }] },
  { key: 'dateOfBirth', label: 'Ngay sinh', type: 'date' },
  { key: 'checkupDate', label: 'Ngay kham', type: 'date', required: true },
  { key: 'examDoctor', label: 'BS kham' },
  { key: 'conclusion', label: 'Ket luan', type: 'select', options: [
    { value: 'pass', label: 'Dat' }, { value: 'conditional', label: 'Co dieu kien' }, { value: 'fail', label: 'Khong dat' }] },
  { key: 'status', label: 'Trang thai', type: 'select', options: [
    { value: 0, label: 'Cho' }, { value: 1, label: 'Dang kham' }, { value: 2, label: 'Hoan thanh' }, { value: 3, label: 'Da chung nhan' }] },
  { key: 'notes', label: 'Ghi chu', type: 'textarea' },
];

const DRIVER_FIELDS: CrudFieldCfg[] = [
  { key: 'driverLicenseClass', label: 'Hang lai xe', placeholder: 'B1, B2, C, D, E...' },
  { key: 'driverReactionTest', label: 'Thu phan xa', placeholder: 'KQ thu phan xa thi giac - van dong' },
  { key: 'driverColorVision', label: 'Thi giac mau sac', placeholder: 'Phan biet mau binh thuong / khieu sac' },
];

const VSATTP_FIELDS: CrudFieldCfg[] = [
  { key: 'foodHandlerRole', label: 'Vai tro tiep xuc thuc pham', placeholder: 'Nau an / phuc vu / che bien...' },
  { key: 'foodSafetyConclusion', label: 'Ket luan VSATTP', type: 'textarea', placeholder: 'Du/Khong du dieu kien SK tham gia che bien, kinh doanh thuc pham' },
];

const CHILD_FIELDS: CrudFieldCfg[] = [
  { key: 'ageMonths', label: 'Tuoi (thang)', placeholder: 'So thang tuoi' },
  { key: 'developmentAssessment', label: 'Danh gia phat trien', placeholder: 'Binh thuong / Cham phat trien' },
  { key: 'nutritionStatus', label: 'Tinh trang dinh duong', placeholder: 'Binh thuong / Suy dinh duong / Thua can' },
  { key: 'vaccinationStatus', label: 'Tinh trang tiem chung', placeholder: 'Day du / Chua day du / Khong ro' },
];

const STATUS_LABEL: Record<number, string> = {
  0: 'Cho', 1: 'Dang kham', 2: 'Hoan thanh', 3: 'Da chung nhan',
};

type SKey = 'pending' | 'progress' | 'done' | 'certified';
const STATUS_TABS = [
  { v: 'pending' as SKey,   l: 'Cho',          tone: 'warn' as const },
  { v: 'progress' as SKey,  l: 'Dang kham',    tone: 'info' as const },
  { v: 'done' as SKey,      l: 'Hoan thanh',   tone: 'info' as const },
  { v: 'certified' as SKey, l: 'Da chung nhan', tone: 'ok' as const },
];

const sKey = (n: number): SKey => n === 0 ? 'pending' : n === 1 ? 'progress' : n === 2 ? 'done' : 'certified';

const CONCL_LABEL: Record<string, string> = {
  pass: 'Dat', fail: 'Khong dat', conditional: 'Co dieu kien',
};
const CONCL_TONE: Record<string, 'ok' | 'warn' | 'crit'> = {
  pass: 'ok', conditional: 'warn', fail: 'crit',
};

const PER = 18;

// Map checkupType code -> which speciality fields to show
const TYPE_EXTRA_FIELDS: Record<string, CrudFieldCfg[]> = {
  Driver: DRIVER_FIELDS,
  FoodSafety: VSATTP_FIELDS,
  Student: CHILD_FIELDS,
  ChildUnder24m: CHILD_FIELDS,
};

// Print component map: checkupType -> component key
type PrintKey = 'ksk-driver' | 'ksk-vsattp' | 'ksk-student' | null;
const TYPE_PRINT_KEY: Record<string, PrintKey> = {
  Driver: 'ksk-driver',
  FoodSafety: 'ksk-vsattp',
  Student: 'ksk-student',
  ChildUnder24m: 'ksk-student',
};

// ──────────────────────────────────────────────────────────────────────────────
// Campaign tab static data
// ──────────────────────────────────────────────────────────────────────────────

type CamKey = 'draft' | 'active' | 'completed' | 'cancelled';

const CAM_TABS: StatusTab<CamKey>[] = [
  { v: 'draft',     l: 'Nháp',             tone: 'warn' },
  { v: 'active',    l: 'Đang hoạt động',   tone: 'ok' },
  { v: 'completed', l: 'Hoàn thành',       tone: 'info' },
  { v: 'cancelled', l: 'Hủy',              tone: 'crit' },
];

const CAM_STATUS_LABEL: Record<number, string> = {
  0: 'Nháp', 1: 'Đang hoạt động', 2: 'Hoàn thành', 3: 'Hủy',
};
const CAM_STATUS_TONE: Record<number, 'warn' | 'ok' | 'info' | 'crit'> = {
  0: 'warn', 1: 'ok', 2: 'info', 3: 'crit',
};

const camSKey = (n: number): CamKey =>
  (['draft', 'active', 'completed', 'cancelled'] as CamKey[])[n] ?? 'draft';

const CAM_CRUD_FIELDS: CrudFieldCfg[] = [
  { key: 'campaignCode',    label: 'Mã chiến dịch',      required: true, disabledOnEdit: true },
  { key: 'campaignName',    label: 'Tên chiến dịch',      required: true },
  { key: 'companyName',     label: 'Đơn vị / Công ty',    required: true },
  { key: 'contactPerson',   label: 'Người liên hệ' },
  { key: 'contactPhone',    label: 'Số điện thoại' },
  { key: 'startDate',       label: 'Ngày bắt đầu',        type: 'date', required: true },
  { key: 'endDate',         label: 'Ngày kết thúc',       type: 'date' },
  { key: 'checkupType',     label: 'Loại KSK',            placeholder: 'Tổng quát, Lái xe, VSATTP...' },
  { key: 'servicePackage',  label: 'Gói dịch vụ' },
  { key: 'discountPercent', label: 'Chiết khấu (%)',       type: 'number', placeholder: '0' },
  { key: 'notes',           label: 'Ghi chú',              type: 'textarea' },
];

// ──────────────────────────────────────────────────────────────────────────────
// CampaignTab component (defined outside HealthCheckupV2)
// ──────────────────────────────────────────────────────────────────────────────

const CampaignTab: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CheckupCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [camStab, setCamStab] = useState<CamKey | 'all'>('all');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<CheckupCampaign | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);

  // Groups sub-panel state
  const [groups, setGroups] = useState<CampaignGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRoom, setNewGroupRoom] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);

  // Excel import state
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const c = await getCampaigns();
      setCampaigns(c);
    } catch {
      ti('Không tải được chiến dịch');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Load groups when drawer opens
  useEffect(() => {
    if (!sel) { setGroups([]); setImportResult(null); return; }
    setGroupsLoading(true);
    getCampaignGroups(sel.id)
      .then(setGroups)
      .catch(() => ti('Không tải được nhóm'))
      .finally(() => setGroupsLoading(false));
  }, [sel]);

  const openCreate = () => { setCrudInit({}); setCrudOpen(true); };
  const openEdit = (r: CheckupCampaign) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  const camCounts = useMemo(() => {
    const c: Record<string, number> = { all: campaigns.length };
    CAM_TABS.forEach((t) => { c[t.v] = campaigns.filter((r) => camSKey(r.status) === t.v).length; });
    return c;
  }, [campaigns]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return campaigns.filter((r) => {
      if (camStab !== 'all' && camSKey(r.status) !== camStab) return false;
      if (!k) return true;
      return [r.campaignName, r.campaignCode, r.companyName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [campaigns, search, camStab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const camCols: ColumnDef<CheckupCampaign>[] = [
    { key: 'code', label: 'Mã chiến dịch', code: true, render: (r) => r.campaignCode },
    { key: 'name', label: 'Chiến dịch / Đơn vị', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.campaignName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.companyName}</div>
      </div>
    ) },
    { key: 'start', label: 'Từ ngày', mono: true, render: (r) => dayjs(r.startDate).format('DD/MM/YYYY') },
    { key: 'end',   label: 'Đến ngày', mono: true, render: (r) => r.endDate ? dayjs(r.endDate).format('DD/MM/YYYY') : '—' },
    { key: 'reg',   label: 'ĐK / HT', mono: true, render: (r) => `${r.totalRegistered}/${r.totalCompleted}` },
    { key: 'disc',  label: 'Chiết khấu', render: (r) => r.discountPercent > 0
      ? <span style={{ fontFamily: 'var(--font-mono)' }}>{r.discountPercent}%</span>
      : <span style={{ color: 'var(--t-2)' }}>—</span> },
    { key: 'status', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={CAM_STATUS_TONE[r.status] || 'info'} dot>
        {CAM_STATUS_LABEL[r.status] || '—'}
      </StatusBadge>
    ) },
  ];

  const camActions = (r: CheckupCampaign) => (
    <div className="ab-actions">
      <ActBtn ic="eye"   title="Chi tiết"   onClick={() => setSel(r)} />
      <ActBtn ic="edit"  title="Sửa"        onClick={() => openEdit(r)} />
      <ActBtn ic="trash" title="Xóa" tone="crit"
        onClick={() => cf(
          `Xóa chiến dịch "${r.campaignName}"?`,
          async () => { await deleteCampaign(r.id); tk('Đã xóa'); load(); },
          { tone: 'crit', confirm: 'Xóa' },
        )}
      />
    </div>
  );

  const handleAddGroup = async () => {
    if (!sel || !newGroupName.trim()) return;
    setAddingGroup(true);
    try {
      await createCampaignGroup(sel.id, { groupName: newGroupName.trim(), roomAssignment: newGroupRoom.trim() || undefined });
      tk('Đã thêm nhóm');
      setNewGroupName('');
      setNewGroupRoom('');
      const updated = await getCampaignGroups(sel.id);
      setGroups(updated);
    } catch {
      te('Thêm nhóm thất bại');
    } finally {
      setAddingGroup(false);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!sel) return;
    cf('Xóa nhóm này?', async () => {
      await deleteCampaignGroup(sel.id, groupId);
      tk('Đã xóa nhóm');
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    }, { tone: 'crit', confirm: 'Xóa' });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sel) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importBatchExcel(sel.id, file);
      setImportResult(result);
      if (result.errorCount === 0) tk(`Nhập thành công ${result.successCount} bản ghi`);
      else ti(`Nhập xong: ${result.successCount} thành công, ${result.errorCount} lỗi`);
    } catch {
      te('Nhập Excel thất bại');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng chiến dịch',  val: campaigns.length },
        { lbl: 'Đang hoạt động',   val: campaigns.filter((c) => c.status === 1).length, tone: 'ok' },
        { lbl: 'Tổng đã đăng ký',  val: campaigns.reduce((s, c) => s + c.totalRegistered, 0), tone: 'info' },
        { lbl: 'Tổng hoàn thành',  val: campaigns.reduce((s, c) => s + c.totalCompleted, 0), tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm chiến dịch / mã / đơn vị..." />
        <Filter
          value={camStab === 'all' ? '' : camStab}
          onChange={(v) => { setCamStab((v as CamKey) || 'all'); setPage(0); }}
          options={CAM_TABS.map((t) => ({ v: t.v, l: t.l }))}
          placeholder="Trạng thái"
        />
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setCamStab('all'); setPage(0); }}>Bỏ lọc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Chiến dịch mới</Btn>
      </div>

      <StatusTabs<CamKey>
        value={camStab}
        onChange={(v) => { setCamStab(v); setPage(0); }}
        tabs={CAM_TABS}
        counts={camCounts}
      />

      <DataTable<CheckupCampaign>
        columns={camCols}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={setSel}
        actions={camActions}
        empty={loading ? 'Đang tải...' : 'Chưa có chiến dịch KSK'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      {/* Campaign detail drawer */}
      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.campaignName : ''}
        sub={sel ? `${sel.campaignCode} · ${sel.companyName}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn variant="primary" icon="edit" onClick={() => { if (sel) { openEdit(sel); setSel(null); } }}>Cập nhật</Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin chiến dịch">
            <DrField lbl="Mã chiến dịch">
              <span style={{ fontFamily: 'var(--font-mono)' }}>{sel.campaignCode}</span>
            </DrField>
            <DrField lbl="Tên chiến dịch">{sel.campaignName}</DrField>
            <DrField lbl="Đơn vị / Công ty">{sel.companyName}</DrField>
            {sel.contactPerson && <DrField lbl="Người liên hệ">{sel.contactPerson}{sel.contactPhone ? ` · ${sel.contactPhone}` : ''}</DrField>}
            <DrField lbl="Thời gian">
              {dayjs(sel.startDate).format('DD/MM/YYYY')}
              {sel.endDate ? ` → ${dayjs(sel.endDate).format('DD/MM/YYYY')}` : ''}
            </DrField>
            {sel.checkupType && <DrField lbl="Loại KSK">{sel.checkupType}</DrField>}
            {sel.servicePackage && <DrField lbl="Gói dịch vụ">{sel.servicePackage}</DrField>}
          </DrSec>

          <DrSec title="Số liệu">
            <DrField lbl="Trạng thái">
              <StatusBadge tone={CAM_STATUS_TONE[sel.status] || 'info'} dot>
                {CAM_STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
            <DrField lbl="Đăng ký / Hoàn thành">
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {sel.totalRegistered} / {sel.totalCompleted}
              </span>
            </DrField>
            {sel.discountPercent > 0 && (
              <DrField lbl="Chiết khấu">
                <span style={{ fontFamily: 'var(--font-mono)' }}>{sel.discountPercent}%</span>
              </DrField>
            )}
            {sel.totalCost > 0 && (
              <DrField lbl="Tổng chi phí">
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {sel.totalCost.toLocaleString('vi-VN')} ₫
                </span>
              </DrField>
            )}
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>

          {/* Groups sub-panel */}
          <DrSec title="Nhóm khám">
            {groupsLoading ? (
              <div style={{ color: 'var(--t-2)', padding: '8px 0' }}>Đang tải nhóm...</div>
            ) : groups.length === 0 ? (
              <div style={{ color: 'var(--t-2)', padding: '8px 0' }}>Chưa có nhóm nào</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--t-2)' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Tên nhóm</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Phòng khám</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 500 }}>Thành viên</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 500 }}>Hoàn thành</th>
                      <th style={{ width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 500 }}>{g.groupName}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--t-2)' }}>{g.roomAssignment || '—'}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{g.totalMembers}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{g.completedMembers}</td>
                        <td style={{ padding: '4px 8px' }}>
                          <ActBtn ic="trash" tone="crit" title="Xóa nhóm" onClick={() => handleDeleteGroup(g.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add group inline form */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Tên nhóm mới..."
                style={{
                  flex: '1 1 140px', padding: '4px 8px',
                  border: '1px solid var(--line)', borderRadius: 4,
                  background: 'var(--bg)', color: 'var(--t-0)', fontSize: 'var(--fs-sm)',
                }}
              />
              <input
                value={newGroupRoom}
                onChange={(e) => setNewGroupRoom(e.target.value)}
                placeholder="Phòng khám (tùy chọn)"
                style={{
                  flex: '1 1 140px', padding: '4px 8px',
                  border: '1px solid var(--line)', borderRadius: 4,
                  background: 'var(--bg)', color: 'var(--t-0)', fontSize: 'var(--fs-sm)',
                }}
              />
              <Btn
                variant="primary" icon="plus"
                onClick={handleAddGroup}
                disabled={addingGroup || !newGroupName.trim()}
              >
                Thêm nhóm
              </Btn>
            </div>
          </DrSec>

          {/* Excel import section */}
          <DrSec title="Nhập danh sách (Excel)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleImport}
                  disabled={importing}
                />
                <span className="ab-btn" style={{ pointerEvents: importing ? 'none' : 'auto', opacity: importing ? 0.6 : 1 }}>
                  {importing ? 'Đang nhập...' : 'Chọn file Excel'}
                </span>
              </label>
              <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>.xlsx / .xls</span>
            </div>

            {importResult && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 'var(--fs-sm)' }}>
                  <span>Tổng dòng: <strong>{importResult.totalRows}</strong></span>
                  <span style={{ color: 'var(--c-ok)' }}>Thành công: <strong>{importResult.successCount}</strong></span>
                  {importResult.errorCount > 0 && (
                    <span style={{ color: 'var(--c-crit)' }}>Lỗi: <strong>{importResult.errorCount}</strong></span>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <ul style={{
                    margin: 0, padding: '8px 12px', listStyle: 'disc',
                    background: 'var(--bg-2)', borderRadius: 4,
                    fontSize: 'var(--fs-xs)', color: 'var(--c-crit)',
                    maxHeight: 120, overflowY: 'auto',
                  }}>
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </DrSec>
        </>}
      </DrawerShell>

      {/* Campaign CrudModal */}
      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật chiến dịch' : 'Chiến dịch KSK mới'}
        sub="Tổ chức khám sức khỏe theo lô cho đơn vị / doanh nghiệp"
        fields={CAM_CRUD_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          if (editing && crudInit?.id) await updateCampaign(String(crudInit.id), v);
          else await createCampaign(v);
          tk(editing ? 'Đã cập nhật chiến dịch' : 'Đã tạo chiến dịch');
          load();
        }}
      />
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// HealthCheckupV2 — main component
// ──────────────────────────────────────────────────────────────────────────────

const HealthCheckupV2: React.FC = () => {
  const [mainTab, setMainTab] = useState<'ksk' | 'campaign'>('ksk');

  const [items, setItems] = useState<HealthCheckup[]>([]);
  const [stats, setStats] = useState<HealthCheckupStats | null>(null);
  const [checkupTypes, setCheckupTypes] = useState<CheckupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<HealthCheckup | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const [selectedType, setSelectedType] = useState('');
  const printRef = useRef<HTMLDivElement | null>(null);

  const handlePrintKsk = () => {
    if (!printRef.current) return;
    const html = `<html><head><title>Giay KSK</title></head><body>${printRef.current.innerHTML}</body></html>`;
    openPrintWindow(html, { print: 'immediate' });
  };

  const openCreate = () => { setSelectedType(''); setCrudInit({}); setCrudOpen(true); };
  const openEdit = (r: HealthCheckup) => { setSelectedType(r.checkupType || ''); setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  const load = async () => {
    setLoading(true);
    try {
      const [list, s, types] = await Promise.all([
        searchHealthCheckups({ keyword: search, pageSize: 200 }),
        getHealthCheckupStats(),
        getCheckupTypes(),
      ]);
      setItems(list);
      setStats(s);
      setCheckupTypes(types);
    } catch { ti('Khong tai duoc KSK'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const typeOptions = useMemo(() => checkupTypes.map((t) => ({ v: t.code, l: t.name })), [checkupTypes]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fType && r.checkupType !== fType) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.checkupCode, r.companyName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  // Dynamic fields: show type selector + base fields + specialty fields based on selectedType.
  // selectedType is updated when user opens edit (from record.checkupType) or when selecting type in form.
  const crudFields = useMemo<CrudFieldCfg[]>(() => {
    const typeField: CrudFieldCfg = {
      key: 'checkupType',
      label: 'Loai KSK',
      type: 'select',
      required: true,
      options: checkupTypes.map((t) => ({ value: t.code, label: t.name })),
    };
    const extra = TYPE_EXTRA_FIELDS[selectedType] ?? [];
    return [typeField, ...BASE_FIELDS, ...extra];
  }, [selectedType, checkupTypes]);

  // Watch crudInit.checkupType to update extra fields when editing an existing record
  useEffect(() => {
    if (crudInit?.checkupType && typeof crudInit.checkupType === 'string') {
      setSelectedType(crudInit.checkupType);
    }
  }, [crudInit]);

  const printKey = sel ? (TYPE_PRINT_KEY[sel.checkupType] ?? null) : null;

  const cols: ColumnDef<HealthCheckup>[] = [
    { key: 'code', label: 'Ma KSK', code: true, render: (r) => r.checkupCode },
    { key: 'pt', label: 'Doi tuong', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.gender === 1 ? 'Nam' : 'Nu'} · {r.patientCode}</div>
      </div>
    ) },
    { key: 'date', label: 'Ngay', mono: true, render: (r) => dayjs(r.checkupDate).format('DD/MM/YYYY') },
    { key: 'type', label: 'Loai', render: (r) => {
      const t = checkupTypes.find((x) => x.code === r.checkupType);
      return t ? t.name : r.checkupType;
    } },
    { key: 'doc', label: 'BS kham', render: (r) => r.examDoctor },
    { key: 'concl', label: 'Ket luan', render: (r) => r.conclusion ? (
      <StatusBadge tone={CONCL_TONE[r.conclusion] || 'info'} dot>{CONCL_LABEL[r.conclusion] || r.conclusion}</StatusBadge>
    ) : <span style={{ color: 'var(--t-2)' }}>—</span> },
    { key: 'st', label: 'Trang thai', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: HealthCheckup) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiet" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sua" onClick={() => openEdit(r)} />
    </div>
  );

  return (
    <div className="ab">
      <TopTabs<'ksk' | 'campaign'>
        tab={mainTab}
        setTab={setMainTab}
        tabs={[
          { v: 'ksk',      l: 'Danh sách KSK',  ic: 'list' },
          { v: 'campaign', l: 'Chiến dịch KSK',  ic: 'briefcase' },
        ]}
      />

      {mainTab === 'ksk' && (
        <>
          <KpiStrip items={[
            { lbl: 'Tong KSK', val: stats?.totalCheckups ?? items.length, sub: 'tat ca' },
            { lbl: 'Hom nay', val: stats?.todayCount ?? 0, sub: 'da kham', tone: 'info' },
            { lbl: 'Dat', val: stats?.passCount ?? items.filter((c) => c.conclusion === 'pass').length, sub: `${Math.round(((stats?.passCount ?? 0) / Math.max(1, stats?.totalCheckups ?? items.length)) * 100)}%`, tone: 'ok' },
            { lbl: 'Khong dat', val: stats?.failCount ?? items.filter((c) => c.conclusion === 'fail').length, sub: 'can dieu tri', tone: 'crit' },
          ]} />

          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
              placeholder="Tim BN / ma KSK..." />
            <Filter value={fType} onChange={setFType} options={typeOptions} placeholder="Loai KSK" />
            <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>Bo loc</Btn>
            <span className="spacer" />
            <Btn variant="ghost" icon="refresh" onClick={load}>Lam moi</Btn>
            <Btn variant="primary" icon="plus" onClick={openCreate}>KSK moi</Btn>
          </div>

          <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

          <DataTable<HealthCheckup>
            columns={cols} data={paged} rowKey={(r) => r.id}
            onRowClick={setSel} actions={actions}
            empty={loading ? 'Dang tai...' : 'Chua co kham SK'}
          />
          <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

          <DrawerShell
            open={!!sel}
            onClose={() => setSel(null)}
            size="lg"
            title={sel ? sel.patientName : ''}
            sub={sel ? `${sel.checkupCode} · ${sel.checkupType}` : ''}
            footer={<>
              <Btn variant="ghost" onClick={() => setSel(null)}>Dong</Btn>
              {printKey && <Btn icon="print" onClick={handlePrintKsk}>In giay CN</Btn>}
              <Btn variant="primary" icon="edit" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>Cap nhat</Btn>
            </>}
          >
            {sel && <>
              <DrSec title="Doi tuong">
                <DrField lbl="Ma KSK"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.checkupCode}</span></DrField>
                <DrField lbl="Ho ten">{sel.patientName} · {sel.patientCode}</DrField>
                <DrField lbl="Gioi tinh">{sel.gender === 1 ? 'Nam' : 'Nu'}</DrField>
                <DrField lbl="Ngay sinh">{dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}</DrField>
                {sel.companyName && <DrField lbl="Cong ty">{sel.companyName}</DrField>}
              </DrSec>
              <DrSec title="Kham">
                <DrField lbl="Loai">{checkupTypes.find((t) => t.code === sel.checkupType)?.name ?? sel.checkupType}</DrField>
                <DrField lbl="Ngay kham">{dayjs(sel.checkupDate).format('DD/MM/YYYY')}</DrField>
                <DrField lbl="BS kham">{sel.examDoctor}</DrField>
                <DrField lbl="Trang thai">
                  <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                    {STATUS_LABEL[sel.status] || '—'}
                  </StatusBadge>
                </DrField>
              </DrSec>
              <DrSec title="Kham chuyen khoa">
                {sel.internalMedicine && <DrField lbl="Noi khoa">{sel.internalMedicine}</DrField>}
                {sel.surgery && <DrField lbl="Ngoai khoa">{sel.surgery}</DrField>}
                {sel.ophthalmology && <DrField lbl="Mat">{sel.ophthalmology}</DrField>}
                {sel.entExam && <DrField lbl="TMH">{sel.entExam}</DrField>}
                {sel.dentalExam && <DrField lbl="RHM">{sel.dentalExam}</DrField>}
                {sel.dermatology && <DrField lbl="Da lieu">{sel.dermatology}</DrField>}
                {sel.gynecology && <DrField lbl="Phu khoa">{sel.gynecology}</DrField>}
                {sel.psychiatry && <DrField lbl="Tam than">{sel.psychiatry}</DrField>}
              </DrSec>
              {sel.checkupType === 'Driver' && (
                <DrSec title="KSK Lai xe (TT36)">
                  {sel.driverLicenseClass && <DrField lbl="Hang lai xe">{sel.driverLicenseClass}</DrField>}
                  {sel.driverReactionTest && <DrField lbl="Thu phan xa">{sel.driverReactionTest}</DrField>}
                  {sel.driverColorVision && <DrField lbl="Thi giac mau">{sel.driverColorVision}</DrField>}
                </DrSec>
              )}
              {sel.checkupType === 'FoodSafety' && (
                <DrSec title="KSK VSATTP (TT15)">
                  {sel.foodHandlerRole && <DrField lbl="Vai tro">{sel.foodHandlerRole}</DrField>}
                  {sel.foodSafetyConclusion && <DrField lbl="Ket luan VSATTP">{sel.foodSafetyConclusion}</DrField>}
                </DrSec>
              )}
              {(sel.checkupType === 'Student' || sel.checkupType === 'ChildUnder24m') && (
                <DrSec title="KSK Tre em / Di hoc">
                  {sel.ageMonths != null && <DrField lbl="Tuoi (thang)">{sel.ageMonths}</DrField>}
                  {sel.developmentAssessment && <DrField lbl="Phat trien">{sel.developmentAssessment}</DrField>}
                  {sel.nutritionStatus && <DrField lbl="Dinh duong">{sel.nutritionStatus}</DrField>}
                  {sel.vaccinationStatus && <DrField lbl="Tiem chung">{sel.vaccinationStatus}</DrField>}
                </DrSec>
              )}
              <DrSec title="Ket luan">
                {sel.labResults && <DrField lbl="KQ XN">{sel.labResults}</DrField>}
                {sel.xrayResults && <DrField lbl="X-quang">{sel.xrayResults}</DrField>}
                <DrField lbl="Ket luan">
                  {sel.conclusion ? (
                    <StatusBadge tone={CONCL_TONE[sel.conclusion] || 'info'} dot>{CONCL_LABEL[sel.conclusion] || sel.conclusion}</StatusBadge>
                  ) : '—'}
                </DrField>
                {sel.notes && <DrField lbl="Ghi chu">{sel.notes}</DrField>}
              </DrSec>

              {/* Hidden print area */}
              {printKey === 'ksk-driver' && <div style={{ display: 'none' }}><DriverCheckupPrint ref={printRef} record={sel} /></div>}
              {printKey === 'ksk-vsattp' && <div style={{ display: 'none' }}><VsattpCheckupPrint ref={printRef} record={sel} /></div>}
              {printKey === 'ksk-student' && <div style={{ display: 'none' }}><StudentCheckupPrint ref={printRef} record={sel} /></div>}
            </>}
          </DrawerShell>

          <CrudModal
            open={crudOpen}
            onClose={() => setCrudOpen(false)}
            title={crudInit?.id ? 'Cap nhat KSK' : 'Kham suc khoe moi'}
            sub="KSK chuyen biet: lai xe / VSATTP / di hoc / tong quat"
            fields={crudFields}
            initial={crudInit}
            size="lg"
            onSubmit={async (v, editing) => {
              if (editing && crudInit?.id) await updateHealthCheckup(String(crudInit.id), v);
              else await createHealthCheckup(v);
              tk(editing ? 'Da cap nhat KSK' : 'Da tao KSK');
              load();
            }}
          />
        </>
      )}

      {mainTab === 'campaign' && <CampaignTab />}
    </div>
  );
};

export default HealthCheckupV2;
