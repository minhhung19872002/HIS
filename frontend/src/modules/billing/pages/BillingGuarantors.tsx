// =====================================================================
// HIS Terminal · BẢO LÃNH VIỆN PHÍ — v2
// 3 tabs: Đơn vị bảo lãnh · Gán bảo lãnh · Báo cáo công nợ
// Issues #41 #68 #69 #70 #71 #72
// Bound to /api/billing-guarantor/{sponsor-orgs,guarantors,debt-report}
// =====================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DatePicker, Input, InputNumber, Select, Switch } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getSponsorOrgs, saveSponsorOrg, deleteSponsorOrg,
  getGuarantors, saveGuarantor, deleteGuarantor,
  getDebtReport,
  type SponsorOrgDto, type BillingGuarantorDto, type GuarantorDebtReportDto,
} from '../api/billingGuarantor';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, useListData, tk, te, cf,
  type ColumnDef,
} from '../../../pages-v2/_v2kit';

// ─── Constants ───────────────────────────────────────────────────────────────

type TabKey = 'orgs' | 'guarantors' | 'report';

const TABS: { v: TabKey; l: string; ic: string }[] = [
  { v: 'orgs',       l: 'Đơn vị bảo lãnh', ic: 'building' },
  { v: 'guarantors', l: 'Gán bảo lãnh',     ic: 'shield'   },
  { v: 'report',     l: 'Báo cáo công nợ',  ic: 'bar-chart'},
];

const GUARANTOR_STATUS: { value: number; label: string }[] = [
  { value: 0, label: 'Hiệu lực' },
  { value: 1, label: 'Hết hạn'  },
  { value: 2, label: 'Hủy'      },
];

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
const PER = 20;

// ─── Edit state types ─────────────────────────────────────────────────────────

type OrgEdit = Omit<SponsorOrgDto, 'id'> & { id?: string };
type GuarantorEdit = Omit<BillingGuarantorDto, 'id' | 'sponsorOrgName'> & { id?: string };

const EMPTY_ORG: OrgEdit = {
  code: '', name: '', taxCode: '', address: '', contactPerson: '', phone: '', isActive: true,
};

const EMPTY_GUARANTOR: GuarantorEdit = {
  sponsorOrgId: '',
  patientId: undefined,
  medicalRecordId: undefined,
  guaranteeNo: '',
  guaranteeRate: 100,
  guaranteeAmount: undefined,
  fromDate: undefined,
  toDate: undefined,
  status: 0,
  notes: '',
};

// ─── Status badge helper ──────────────────────────────────────────────────────

function GuarantorStatusBadge({ status }: { status: number }) {
  const map: Record<number, { tone: 'ok' | 'warn' | 'crit'; label: string }> = {
    0: { tone: 'ok',   label: 'Hiệu lực' },
    1: { tone: 'warn', label: 'Hết hạn'  },
    2: { tone: 'crit', label: 'Hủy'      },
  };
  const s = map[status] ?? { tone: 'info' as const, label: String(status) };
  return <StatusBadge tone={s.tone} dot>{s.label}</StatusBadge>;
}

// ─── Main component ───────────────────────────────────────────────────────────

const BillingGuarantorsV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('orgs');

  // data
  const { rows: orgs, reload: reloadOrgs } = useListData<SponsorOrgDto>(
    useCallback(() => getSponsorOrgs(), []),
    useCallback(() => te('Không tải được đơn vị bảo lãnh'), []),
  );
  const { rows: guarantors, reload: reloadGuarantors } = useListData<BillingGuarantorDto>(
    useCallback(() => getGuarantors(), []),
    useCallback(() => te('Không tải được danh sách bảo lãnh'), []),
  );
  const [report, setReport]           = useState<GuarantorDebtReportDto[]>([]);

  // ui
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(0);
  const [orgEdit, setOrgEdit]               = useState<OrgEdit | null>(null);
  const [guarantorEdit, setGuarantorEdit]   = useState<GuarantorEdit | null>(null);
  const [saving, setSaving]   = useState(false);

  // report date filter
  const [reportFrom, setReportFrom] = useState<Dayjs | null>(null);
  const [reportTo, setReportTo]     = useState<Dayjs | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadReport = useCallback(async () => {
    try {
      setReport(await getDebtReport(
        reportFrom ? reportFrom.toISOString() : undefined,
        reportTo   ? reportTo.toISOString()   : undefined,
      ));
    } catch { te('Không tải được báo cáo công nợ'); }
  }, [reportFrom, reportTo]);

  useEffect(() => {
    if (tab === 'report') void loadReport();
  }, [tab, loadReport]);

  useEffect(() => { setSearch(''); setPage(0); }, [tab]);

  // ── Filtered rows ──────────────────────────────────────────────────────────
  const orgRows = useMemo(() => {
    const kw = search.toLowerCase();
    return !kw ? orgs
      : orgs.filter(o => o.name.toLowerCase().includes(kw) || o.code.toLowerCase().includes(kw));
  }, [orgs, search]);

  const guarantorRows = useMemo(() => {
    const kw = search.toLowerCase();
    return !kw ? guarantors
      : guarantors.filter(g =>
          (g.guaranteeNo ?? '').toLowerCase().includes(kw) ||
          (g.sponsorOrgName ?? '').toLowerCase().includes(kw)
        );
  }, [guarantors, search]);

  // ── KPI ────────────────────────────────────────────────────────────────────
  const kpis = [
    { lbl: 'Đơn vị bảo lãnh',  val: orgs.filter(o => o.isActive).length,                            tone: 'info' as const },
    { lbl: 'Đang bảo lãnh',    val: guarantors.filter(g => g.status === 0).length,                   tone: 'ok'   as const },
    { lbl: 'Tổng công nợ (k)', val: report.reduce((s, r) => s + r.totalGuaranteed, 0) / 1000 | 0,   tone: 'warn' as const },
  ];

  // ── Columns ────────────────────────────────────────────────────────────────
  const colsOrg: ColumnDef<SponsorOrgDto>[] = [
    { key: 'code',          label: 'Mã',             width: 80,  mono: true },
    { key: 'name',          label: 'Tên đơn vị'                            },
    { key: 'taxCode',       label: 'MST',            width: 120             },
    { key: 'contactPerson', label: 'Người liên hệ',  width: 160             },
    { key: 'phone',         label: 'Điện thoại',     width: 120             },
    { key: 'isActive',      label: 'Trạng thái',     width: 110,
      render: o => <StatusBadge tone={o.isActive ? 'ok' : 'crit'} dot>{o.isActive ? 'Đang dùng' : 'Ngưng'}</StatusBadge> },
  ];

  const colsGuarantor: ColumnDef<BillingGuarantorDto>[] = [
    { key: 'sponsorOrgName', label: 'Đơn vị bảo lãnh'                       },
    { key: 'guaranteeNo',    label: 'Số công văn',      width: 140, mono: true },
    { key: 'guaranteeRate',  label: '% BL',             width: 70,
      render: g => `${g.guaranteeRate}%` },
    { key: 'guaranteeAmount', label: 'Hạn mức (k)',     width: 110,
      render: g => g.guaranteeAmount != null ? (g.guaranteeAmount / 1000 | 0).toLocaleString() : '—' },
    { key: 'fromDate',       label: 'Từ ngày',          width: 100,
      render: g => g.fromDate ? dayjs(g.fromDate).format('DD/MM/YYYY') : '—' },
    { key: 'toDate',         label: 'Đến ngày',         width: 100,
      render: g => g.toDate ? dayjs(g.toDate).format('DD/MM/YYYY') : '—' },
    { key: 'status',         label: 'Trạng thái',       width: 100,
      render: g => <GuarantorStatusBadge status={g.status} /> },
  ];

  const colsReport: ColumnDef<GuarantorDebtReportDto>[] = [
    { key: 'sponsorOrgName',  label: 'Đơn vị bảo lãnh'                           },
    { key: 'count',           label: 'Số lượt',  width: 80                        },
    { key: 'totalGuaranteed', label: 'Tổng hạn mức (VNĐ)', width: 180,
      render: r => r.totalGuaranteed.toLocaleString('vi-VN') },
  ];

  // ── Row actions ────────────────────────────────────────────────────────────
  const onOrgRowClick = (o: SponsorOrgDto) => {
    setOrgEdit({ ...o });
  };

  const onOrgDelete = (id: string) => {
    cf('Xóa đơn vị bảo lãnh này?', async () => {
      try { await deleteSponsorOrg(id); tk('Đã xóa'); void reloadOrgs(); }
      catch { te('Xóa thất bại'); }
    }, { tone: 'crit' });
  };

  const onGuarantorRowClick = (g: BillingGuarantorDto) => {
    setGuarantorEdit({
      id: g.id,
      sponsorOrgId:    g.sponsorOrgId,
      patientId:       g.patientId,
      medicalRecordId: g.medicalRecordId,
      guaranteeNo:     g.guaranteeNo,
      guaranteeRate:   g.guaranteeRate,
      guaranteeAmount: g.guaranteeAmount,
      fromDate:        g.fromDate,
      toDate:          g.toDate,
      status:          g.status,
      notes:           g.notes,
    });
  };

  const onGuarantorDelete = (id: string) => {
    cf('Hủy bảo lãnh này?', async () => {
      try { await deleteGuarantor(id); tk('Đã hủy'); void reloadGuarantors(); }
      catch { te('Hủy thất bại'); }
    }, { tone: 'crit' });
  };

  // ── Save org ───────────────────────────────────────────────────────────────
  const onSaveOrg = async () => {
    if (!orgEdit) return;
    if (!orgEdit.code.trim() || !orgEdit.name.trim()) { te('Vui lòng nhập Mã và Tên'); return; }
    setSaving(true);
    try {
      await saveSponsorOrg({ id: orgEdit.id ?? EMPTY_GUID, ...orgEdit });
      tk(orgEdit.id ? 'Đã cập nhật' : 'Đã thêm mới');
      setOrgEdit(null);
      void reloadOrgs();
    } catch { te('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  // ── Save guarantor ─────────────────────────────────────────────────────────
  const onSaveGuarantor = async () => {
    if (!guarantorEdit) return;
    if (!guarantorEdit.sponsorOrgId) { te('Vui lòng chọn đơn vị bảo lãnh'); return; }
    if (guarantorEdit.guaranteeRate < 0 || guarantorEdit.guaranteeRate > 100) {
      te('Tỷ lệ bảo lãnh phải từ 0-100%'); return;
    }
    setSaving(true);
    try {
      await saveGuarantor({ id: guarantorEdit.id ?? EMPTY_GUID, ...guarantorEdit });
      tk(guarantorEdit.id ? 'Đã cập nhật' : 'Đã thêm mới');
      setGuarantorEdit(null);
      void reloadGuarantors();
    } catch { te('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  // ── Paged data ─────────────────────────────────────────────────────────────
  const currentRows = tab === 'orgs' ? orgRows : guarantorRows;
  const pagedRows = currentRows.slice(page * PER, (page + 1) * PER);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ab-module">
      <div className="ab-header">
        <h2 className="ab-title">Bảo lãnh viện phí</h2>
        <div className="ab-actions">
          {tab !== 'report' && (
            <>
              <SearchBox
                value={search}
                onChange={v => { setSearch(v); setPage(0); }}
                placeholder={tab === 'orgs' ? 'Tìm mã, tên đơn vị...' : 'Tìm số công văn, đơn vị...'}
              />
              <ActBtn
                ic="plus"
                title={tab === 'orgs' ? 'Thêm đơn vị' : 'Gán bảo lãnh'}
                onClick={() => tab === 'orgs' ? setOrgEdit({ ...EMPTY_ORG }) : setGuarantorEdit({ ...EMPTY_GUARANTOR })}
              />
            </>
          )}
          {tab === 'report' && (
            <>
              <DatePicker
                placeholder="Từ ngày"
                value={reportFrom}
                onChange={v => setReportFrom(v)}
                format="DD/MM/YYYY"
                style={{ width: 140 }}
              />
              <DatePicker
                placeholder="Đến ngày"
                value={reportTo}
                onChange={v => setReportTo(v)}
                format="DD/MM/YYYY"
                style={{ width: 140 }}
              />
              <ActBtn ic="refresh-cw" title="Làm mới" onClick={() => void loadReport()} />
            </>
          )}
        </div>
      </div>

      <KpiStrip items={kpis} />

      <TopTabs<TabKey>
        tabs={TABS}
        tab={tab}
        setTab={t => { setTab(t); setPage(0); }}
      />

      {/* ── Tab: Đơn vị bảo lãnh ─────────────────────────────────────── */}
      {tab === 'orgs' && (
        <>
          <DataTable<SponsorOrgDto>
            columns={colsOrg}
            data={pagedRows as SponsorOrgDto[]}
            rowKey={r => r.id}
            onRowClick={onOrgRowClick}
            actions={row => (
              <ActBtn ic="trash" title="Xóa" tone="crit"
                onClick={e => { e.stopPropagation(); onOrgDelete(row.id); }} />
            )}
          />
          <Pager page={page} totalPages={Math.ceil(orgRows.length / PER)}
            setPage={setPage} total={orgRows.length} perPage={PER} />
        </>
      )}

      {/* ── Tab: Gán bảo lãnh ────────────────────────────────────────── */}
      {tab === 'guarantors' && (
        <>
          <DataTable<BillingGuarantorDto>
            columns={colsGuarantor}
            data={pagedRows as BillingGuarantorDto[]}
            rowKey={r => r.id}
            onRowClick={onGuarantorRowClick}
            actions={row => (
              <ActBtn ic="trash" title="Hủy" tone="crit"
                onClick={e => { e.stopPropagation(); onGuarantorDelete(row.id); }} />
            )}
          />
          <Pager page={page} totalPages={Math.ceil(guarantorRows.length / PER)}
            setPage={setPage} total={guarantorRows.length} perPage={PER} />
        </>
      )}

      {/* ── Tab: Báo cáo công nợ ─────────────────────────────────────── */}
      {tab === 'report' && (
        <DataTable<GuarantorDebtReportDto>
          columns={colsReport}
          data={report}
          rowKey={r => r.sponsorOrgId}
          empty="Không có dữ liệu công nợ trong kỳ"
        />
      )}

      {/* ── Drawer: Đơn vị bảo lãnh ──────────────────────────────────── */}
      <DrawerShell
        open={orgEdit !== null}
        onClose={() => setOrgEdit(null)}
        title={orgEdit?.id ? 'Chỉnh sửa đơn vị bảo lãnh' : 'Thêm đơn vị bảo lãnh'}
        footer={<>
          <Btn onClick={() => setOrgEdit(null)}>Hủy</Btn>
          <ActBtn ic="save" title="Lưu" onClick={onSaveOrg} loading={saving} />
        </>}
      >
        {orgEdit && (
          <DrSec title="Thông tin đơn vị">
            <DrField lbl="Mã *">
              <Input
                value={orgEdit.code}
                onChange={e => setOrgEdit({ ...orgEdit, code: e.target.value })}
                placeholder="VD: BHXH-DN, CONG-TY-ABC"
                maxLength={50}
              />
            </DrField>
            <DrField lbl="Tên đơn vị *">
              <Input
                value={orgEdit.name}
                onChange={e => setOrgEdit({ ...orgEdit, name: e.target.value })}
                placeholder="Tên đầy đủ của đơn vị bảo lãnh"
                maxLength={500}
              />
            </DrField>
            <DrField lbl="Mã số thuế">
              <Input
                value={orgEdit.taxCode ?? ''}
                onChange={e => setOrgEdit({ ...orgEdit, taxCode: e.target.value })}
                placeholder="MST (tùy chọn)"
                maxLength={20}
              />
            </DrField>
            <DrField lbl="Địa chỉ">
              <Input
                value={orgEdit.address ?? ''}
                onChange={e => setOrgEdit({ ...orgEdit, address: e.target.value })}
                placeholder="Địa chỉ liên hệ"
                maxLength={500}
              />
            </DrField>
            <DrField lbl="Người liên hệ">
              <Input
                value={orgEdit.contactPerson ?? ''}
                onChange={e => setOrgEdit({ ...orgEdit, contactPerson: e.target.value })}
                placeholder="Họ tên người liên hệ"
                maxLength={200}
              />
            </DrField>
            <DrField lbl="Điện thoại">
              <Input
                value={orgEdit.phone ?? ''}
                onChange={e => setOrgEdit({ ...orgEdit, phone: e.target.value })}
                placeholder="Số điện thoại"
                maxLength={20}
              />
            </DrField>
            <DrField lbl="Đang dùng">
              <Switch
                checked={orgEdit.isActive}
                onChange={v => setOrgEdit({ ...orgEdit, isActive: v })}
                checkedChildren="Có" unCheckedChildren="Không"
              />
            </DrField>
          </DrSec>
        )}
      </DrawerShell>

      {/* ── Drawer: Gán bảo lãnh ─────────────────────────────────────── */}
      <DrawerShell
        open={guarantorEdit !== null}
        onClose={() => setGuarantorEdit(null)}
        title={guarantorEdit?.id ? 'Chỉnh sửa bảo lãnh' : 'Gán bảo lãnh mới'}
        footer={<>
          <Btn onClick={() => setGuarantorEdit(null)}>Hủy</Btn>
          <ActBtn ic="save" title="Lưu" onClick={onSaveGuarantor} loading={saving} />
        </>}
      >
        {guarantorEdit && (
          <DrSec title="Thông tin bảo lãnh">
            <DrField lbl="Đơn vị bảo lãnh *">
              <Select
                style={{ width: '100%' }}
                showSearch
                placeholder="Chọn đơn vị bảo lãnh"
                value={guarantorEdit.sponsorOrgId || undefined}
                onChange={v => setGuarantorEdit({ ...guarantorEdit, sponsorOrgId: v })}
                options={orgs.filter(o => o.isActive).map(o => ({ value: o.id, label: `[${o.code}] ${o.name}` }))}
                optionFilterProp="label"
              />
            </DrField>
            <DrField lbl="Số công văn BL">
              <Input
                value={guarantorEdit.guaranteeNo ?? ''}
                onChange={e => setGuarantorEdit({ ...guarantorEdit, guaranteeNo: e.target.value })}
                placeholder="Số công văn / giấy bảo lãnh"
                maxLength={100}
              />
            </DrField>
            <DrField lbl="Tỷ lệ BL (%) *">
              <InputNumber
                style={{ width: '100%' }}
                min={0} max={100} step={1}
                value={guarantorEdit.guaranteeRate}
                onChange={v => setGuarantorEdit({ ...guarantorEdit, guaranteeRate: v ?? 0 })}
                addonAfter="%"
              />
            </DrField>
            <DrField lbl="Hạn mức (VNĐ)">
              <InputNumber
                style={{ width: '100%' }}
                min={0} step={100000}
                value={guarantorEdit.guaranteeAmount ?? undefined}
                onChange={v => setGuarantorEdit({ ...guarantorEdit, guaranteeAmount: v ?? undefined })}
                formatter={v => v ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                placeholder="Để trống = không giới hạn"
              />
            </DrField>
            <DrField lbl="Từ ngày">
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                value={guarantorEdit.fromDate ? dayjs(guarantorEdit.fromDate) : null}
                onChange={v => setGuarantorEdit({ ...guarantorEdit, fromDate: v ? v.toISOString() : undefined })}
              />
            </DrField>
            <DrField lbl="Đến ngày">
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                value={guarantorEdit.toDate ? dayjs(guarantorEdit.toDate) : null}
                onChange={v => setGuarantorEdit({ ...guarantorEdit, toDate: v ? v.toISOString() : undefined })}
              />
            </DrField>
            <DrField lbl="Trạng thái">
              <Select
                style={{ width: '100%' }}
                value={guarantorEdit.status}
                onChange={v => setGuarantorEdit({ ...guarantorEdit, status: v })}
                options={GUARANTOR_STATUS.map(s => ({ value: s.value, label: s.label }))}
              />
            </DrField>
            <DrField lbl="Ghi chú">
              <Input.TextArea
                value={guarantorEdit.notes ?? ''}
                onChange={e => setGuarantorEdit({ ...guarantorEdit, notes: e.target.value })}
                rows={3}
                placeholder="Ghi chú thêm (tùy chọn)"
              />
            </DrField>
          </DrSec>
        )}
      </DrawerShell>
    </div>
  );
};

export default BillingGuarantorsV2;
