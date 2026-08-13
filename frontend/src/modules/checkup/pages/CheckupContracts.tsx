import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  checkupContractApi,
  type CheckupCompanyDto,
  type CheckupContractDto,
  type CheckupContractFilter,
} from '../../../api/nangcap27';
import {
  KpiStrip, SearchBox, Filter, DataTable, StatusBadge, ActBtn, Btn, TopTabs,
  DrawerShell, DrSec, DrField, CrudModal, fmtVNDg, fmtDMYg, tk, te, tw,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';

const { RangePicker } = DatePicker;

/* NangCap27 G8 — HSMT 17.1 Danh mục công ty + 17.2 Quản lý hợp đồng khám sức khỏe theo đoàn.
   Đợt khám / nhập danh sách Excel / gói dịch vụ đã có ở màn Khám sức khỏe (/v2/health-checkup);
   trang này bổ sung phần công ty + hợp đồng còn thiếu và trỏ sang đợt khám qua CampaignId. */

const CONTRACT_STATUS = [
  { v: '0', l: 'Nháp' },
  { v: '1', l: 'Hiệu lực' },
  { v: '2', l: 'Hoàn thành' },
  { v: '3', l: 'Đã thanh lý' },
];

const contractTone = (status: number): 'info' | 'ok' | 'warn' | 'crit' =>
  status === 0 ? 'warn' : status === 1 ? 'info' : status === 2 ? 'ok' : 'crit';

const CheckupContractsV2: React.FC = () => {
  const [tab, setTab] = useState<'contracts' | 'companies'>('contracts');

  const [companies, setCompanies] = useState<CheckupCompanyDto[]>([]);
  const [contracts, setContracts] = useState<CheckupContractDto[]>([]);
  const [loading, setLoading] = useState(false);

  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<CheckupContractDto | null>(null);

  const [companyModal, setCompanyModal] = useState(false);
  const [contractModal, setContractModal] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  const loadCompanies = useCallback(async () => {
    try { setCompanies(await checkupContractApi.listCompanies()); }
    catch { tw('Không tải được danh mục công ty'); }
  }, []);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    try {
      const filter: CheckupContractFilter = {};
      if (range?.[0]) filter.fromDate = range[0].toISOString();
      if (range?.[1]) filter.toDate = range[1].toISOString();
      if (filterStatus) filter.status = Number(filterStatus);
      if (keyword) filter.keyword = keyword;
      setContracts(await checkupContractApi.list(filter));
    } catch { te('Tải danh sách hợp đồng thất bại'); }
    finally { setLoading(false); }
  }, [range, filterStatus, keyword]);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);
  useEffect(() => { loadContracts(); }, [loadContracts]);

  const companyOptions = useMemo(
    () => companies.map(c => ({ value: c.id, label: `${c.code} — ${c.name}` })),
    [companies],
  );

  // ── Công ty ──
  const companyFields: CrudFieldCfg[] = [
    { key: 'code', label: 'Mã công ty', placeholder: 'Bỏ trống để hệ thống tự sinh', disabledOnEdit: true },
    { key: 'name', label: 'Tên công ty', required: true },
    { key: 'taxCode', label: 'Mã số thuế' },
    { key: 'address', label: 'Địa chỉ', type: 'textarea' },
    { key: 'phone', label: 'Điện thoại' },
    { key: 'email', label: 'Email' },
    { key: 'contactPerson', label: 'Người liên hệ' },
    { key: 'contactPhone', label: 'ĐT người liên hệ' },
    { key: 'note', label: 'Ghi chú', type: 'textarea' },
    { key: 'isActive', label: 'Đang hoạt động', type: 'switch' },
  ];

  const submitCompany = async (values: Record<string, unknown>) => {
    await checkupContractApi.saveCompany({
      id: values.id as string | undefined,
      code: (values.code as string) ?? '',
      name: values.name as string,
      taxCode: values.taxCode as string | undefined,
      address: values.address as string | undefined,
      phone: values.phone as string | undefined,
      email: values.email as string | undefined,
      contactPerson: values.contactPerson as string | undefined,
      contactPhone: values.contactPhone as string | undefined,
      note: values.note as string | undefined,
      isActive: values.isActive !== false,
    });
    tk('Đã lưu công ty');
    await loadCompanies();
  };

  // ── Hợp đồng ──
  const contractFields: CrudFieldCfg[] = [
    { key: 'contractCode', label: 'Số hợp đồng', placeholder: 'Bỏ trống để hệ thống tự sinh' },
    { key: 'checkupCompanyId', label: 'Công ty', type: 'select', required: true, options: companyOptions },
    { key: 'contractDate', label: 'Ngày ký', type: 'date', required: true },
    { key: 'effectiveFrom', label: 'Hiệu lực từ', type: 'date' },
    { key: 'effectiveTo', label: 'Hiệu lực đến', type: 'date' },
    { key: 'packageName', label: 'Gói khám' },
    { key: 'unitPrice', label: 'Đơn giá / người', type: 'number', required: true },
    { key: 'expectedHeadcount', label: 'Số người dự kiến', type: 'number', required: true },
    {
      key: 'status', label: 'Trạng thái', type: 'select', required: true,
      options: CONTRACT_STATUS.map(s => ({ value: Number(s.v), label: s.l })),
    },
    { key: 'note', label: 'Ghi chú', type: 'textarea' },
  ];

  const submitContract = async (values: Record<string, unknown>) => {
    await checkupContractApi.save({
      id: values.id as string | undefined,
      contractCode: values.contractCode as string | undefined,
      checkupCompanyId: values.checkupCompanyId as string,
      contractDate: values.contractDate ? dayjs(values.contractDate as string).toISOString() : undefined,
      effectiveFrom: values.effectiveFrom ? dayjs(values.effectiveFrom as string).toISOString() : undefined,
      effectiveTo: values.effectiveTo ? dayjs(values.effectiveTo as string).toISOString() : undefined,
      packageName: values.packageName as string | undefined,
      unitPrice: Number(values.unitPrice ?? 0),
      expectedHeadcount: Number(values.expectedHeadcount ?? 0),
      status: Number(values.status ?? 0),
      note: values.note as string | undefined,
    });
    tk('Đã lưu hợp đồng');
    await loadContracts();
    await loadCompanies();
  };

  const removeCompany = async (row: CheckupCompanyDto) => {
    try { await checkupContractApi.removeCompany(row.id); tk('Đã xóa công ty'); await loadCompanies(); }
    catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      te(err.response?.data?.message || 'Xóa công ty thất bại');
    }
  };

  const removeContract = async (row: CheckupContractDto) => {
    try { await checkupContractApi.remove(row.id); tk('Đã xóa hợp đồng'); await loadContracts(); }
    catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      te(err.response?.data?.message || 'Xóa hợp đồng thất bại');
    }
  };

  const contractCols: ColumnDef<CheckupContractDto>[] = [
    { key: 'code', label: 'Số HĐ', render: (r) => (
      <span style={{ fontFamily: 'var(--font-mono)' }}>{r.contractCode}</span>
    ) },
    { key: 'company', label: 'Công ty', render: (r) => r.companyName || '—' },
    { key: 'date', label: 'Ngày ký', render: (r) => fmtDMYg(r.contractDate) },
    { key: 'eff', label: 'Hiệu lực', render: (r) =>
      r.effectiveFrom || r.effectiveTo
        ? `${r.effectiveFrom ? fmtDMYg(r.effectiveFrom) : '…'} → ${r.effectiveTo ? fmtDMYg(r.effectiveTo) : '…'}`
        : '—' },
    { key: 'pkg', label: 'Gói khám', render: (r) => r.packageName || '—' },
    { key: 'head', label: 'Số người', render: (r) => r.expectedHeadcount },
    { key: 'total', label: 'Giá trị HĐ', render: (r) => fmtVNDg(r.totalAmount) },
    { key: 'status', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={contractTone(r.status)}>{r.statusName}</StatusBadge>
    ) },
  ];

  const companyCols: ColumnDef<CheckupCompanyDto>[] = [
    { key: 'code', label: 'Mã', render: (r) => (
      <span style={{ fontFamily: 'var(--font-mono)' }}>{r.code}</span>
    ) },
    { key: 'name', label: 'Tên công ty', render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: 'tax', label: 'MST', render: (r) => r.taxCode || '—' },
    { key: 'contact', label: 'Người liên hệ', render: (r) => (
      <div>
        <div>{r.contactPerson || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.contactPhone || r.phone || ''}</div>
      </div>
    ) },
    { key: 'contracts', label: 'Số HĐ', render: (r) => r.contractCount },
    { key: 'active', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={r.isActive ? 'ok' : 'crit'}>{r.isActive ? 'Hoạt động' : 'Ngừng'}</StatusBadge>
    ) },
  ];

  const activeContracts = contracts.filter(c => c.status === 1);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Công ty', val: companies.length, sub: 'trong danh mục' },
        { lbl: 'Hợp đồng', val: contracts.length, sub: 'kỳ này' },
        { lbl: 'Đang hiệu lực', val: activeContracts.length, sub: 'triển khai', tone: 'info' },
        { lbl: 'Giá trị HĐ hiệu lực', val: fmtVNDg(activeContracts.reduce((s, c) => s + c.totalAmount, 0)), sub: 'dự kiến' },
      ]} />

      <TopTabs<'contracts' | 'companies'>
        tab={tab}
        setTab={setTab}
        tabs={[
          { v: 'contracts', l: 'Hợp đồng KSK' },
          { v: 'companies', l: 'Danh mục công ty' },
        ]}
      />

      {tab === 'contracts' ? (
        <>
          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <RangePicker format="DD/MM/YYYY" value={range} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
            <Filter value={filterStatus} onChange={setFilterStatus} options={CONTRACT_STATUS} placeholder="▾ Trạng thái" />
            <SearchBox value={keyword} onChange={setKeyword} placeholder="Số HĐ / gói khám…" />
            <Btn variant="ghost" icon="x" onClick={() => { setKeyword(''); setFilterStatus(''); setRange(null); }}>Reset</Btn>
            <span className="spacer" />
            <Btn variant="primary" icon="plus" onClick={() => {
              setEditing({ contractDate: dayjs().format('YYYY-MM-DD'), status: 0, unitPrice: 0, expectedHeadcount: 0 });
              setContractModal(true);
            }}>Thêm hợp đồng</Btn>
          </div>

          <DataTable<CheckupContractDto>
            columns={contractCols} data={contracts} rowKey={(r) => r.id} loading={loading}
            onRowClick={setDetail}
            actions={(r) => (
              <div className="ab-actions">
                <ActBtn ic="eye" title="Xem" onClick={() => setDetail(r)} />
                <ActBtn ic="edit" title="Sửa" onClick={() => {
                  setEditing({
                    id: r.id,
                    contractCode: r.contractCode,
                    checkupCompanyId: r.checkupCompanyId,
                    contractDate: dayjs(r.contractDate).format('YYYY-MM-DD'),
                    effectiveFrom: r.effectiveFrom ? dayjs(r.effectiveFrom).format('YYYY-MM-DD') : undefined,
                    effectiveTo: r.effectiveTo ? dayjs(r.effectiveTo).format('YYYY-MM-DD') : undefined,
                    packageName: r.packageName,
                    unitPrice: r.unitPrice,
                    expectedHeadcount: r.expectedHeadcount,
                    status: r.status,
                    note: r.note,
                  });
                  setContractModal(true);
                }} />
                {r.status === 0 && <ActBtn ic="trash" title="Xóa" onClick={() => removeContract(r)} />}
              </div>
            )}
            empty="Chưa có hợp đồng khám sức khỏe"
          />
        </>
      ) : (
        <>
          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="spacer" />
            <Btn variant="primary" icon="plus" onClick={() => { setEditing({ isActive: true }); setCompanyModal(true); }}>
              Thêm công ty
            </Btn>
          </div>

          <DataTable<CheckupCompanyDto>
            columns={companyCols} data={companies} rowKey={(r) => r.id}
            actions={(r) => (
              <div className="ab-actions">
                <ActBtn ic="edit" title="Sửa" onClick={() => {
                  setEditing({ ...r } as unknown as Record<string, unknown>);
                  setCompanyModal(true);
                }} />
                {r.contractCount === 0 && <ActBtn ic="trash" title="Xóa" onClick={() => removeCompany(r)} />}
              </div>
            )}
            empty="Chưa có công ty nào"
          />
        </>
      )}

      <CrudModal
        open={companyModal} onClose={() => setCompanyModal(false)}
        title={editing?.id ? 'Sửa công ty' : 'Thêm công ty'}
        fields={companyFields} initial={editing} onSubmit={submitCompany}
      />

      <CrudModal
        open={contractModal} onClose={() => setContractModal(false)}
        title={editing?.id ? 'Sửa hợp đồng KSK' : 'Thêm hợp đồng KSK'}
        sub="Giá trị hợp đồng = đơn giá × số người dự kiến"
        size="lg"
        fields={contractFields} initial={editing} onSubmit={submitContract}
      />

      <DrawerShell
        open={!!detail} onClose={() => setDetail(null)} size="lg"
        title={detail ? `Hợp đồng ${detail.contractCode}` : ''}
        sub={detail ? `${detail.companyName ?? ''} · ${detail.statusName}` : ''}
        footer={<Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>}
      >
        {detail && <>
          <DrSec title="Hợp đồng">
            <DrField lbl="Số HĐ"><span style={{ fontFamily: 'var(--font-mono)' }}>{detail.contractCode}</span></DrField>
            <DrField lbl="Công ty">{detail.companyName || '—'}</DrField>
            <DrField lbl="Ngày ký">{fmtDMYg(detail.contractDate)}</DrField>
            <DrField lbl="Hiệu lực từ">{detail.effectiveFrom ? fmtDMYg(detail.effectiveFrom) : '—'}</DrField>
            <DrField lbl="Hiệu lực đến">{detail.effectiveTo ? fmtDMYg(detail.effectiveTo) : '—'}</DrField>
            <DrField lbl="Trạng thái"><StatusBadge tone={contractTone(detail.status)}>{detail.statusName}</StatusBadge></DrField>
          </DrSec>
          <DrSec title="Gói khám & giá trị">
            <DrField lbl="Gói khám">{detail.packageName || '—'}</DrField>
            <DrField lbl="Đơn giá / người">{fmtVNDg(detail.unitPrice)}</DrField>
            <DrField lbl="Số người dự kiến">{detail.expectedHeadcount}</DrField>
            <DrField lbl="Giá trị hợp đồng"><b>{fmtVNDg(detail.totalAmount)}</b></DrField>
            <DrField lbl="Đợt khám liên kết">{detail.campaignId || 'Chưa gắn đợt khám'}</DrField>
            <DrField lbl="Ghi chú">{detail.note || '—'}</DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default CheckupContractsV2;
