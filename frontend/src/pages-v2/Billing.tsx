import React from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { searchInvoices } from '../api/billing';
import type { InvoiceDto } from '../api/billing';
import { SimpleV2Page, StatusBadge, ActBtn, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* Viện phí v2 — port of Billing v2.html */

type StatusKey = 'unpaid' | 'partial' | 'paid' | 'voided';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'unpaid',  l: 'Chưa thu',     tone: 'warn' },
  { v: 'partial', l: 'Một phần',     tone: 'warn' },
  { v: 'paid',    l: 'Đã thu',       tone: 'ok' },
  { v: 'voided',  l: 'Hủy',          tone: 'crit' },
];
// paymentStatus: 0=Chưa, 1=Một phần, 2=Đã, 3=Hủy
const statusKey = (s: number): StatusKey =>
  s === 1 ? 'partial' : s === 2 ? 'paid' : s === 3 ? 'voided' : 'unpaid';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const fmtVND = (n: number) => `${(n || 0).toLocaleString('vi-VN')} ₫`;

const KIND_LABEL: Record<number, string> = { 1: 'Ngoại trú', 2: 'Nội trú' };

const BillingV2: React.FC = () => {
  const { message } = AntdApp.useApp();

  const columns: ColumnDef<InvoiceDto>[] = [
    {
      key: 'code', label: 'Mã HĐ', mono: true, width: 150,
      render: (r) => (
        <span>
          {r.invoiceCode}
          {r.insuranceCardNumber && (
            <span style={{
              marginLeft: 6, padding: '1px 5px',
              background: 'var(--a-cy-bg, #cffafe)', color: 'var(--a-cy, #0e7490)',
              border: '1px solid #67e8f9', borderRadius: 3,
              fontSize: 9, fontWeight: 700,
            }}>BHYT {r.insuranceRate || 0}%</span>
          )}
        </span>
      ),
    },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode}{r.gender ? ` · ${r.gender}` : ''}</i>
        </div>
      ),
    },
    { key: 'mr', label: 'Hồ sơ', mono: true, width: 130, render: (r) => r.medicalRecordCode },
    {
      key: 'kind', label: 'Loại', width: 110,
      render: (r) => <span className="chip info">{r.patientTypeName || KIND_LABEL[r.patientType]}</span>,
    },
    { key: 'subTotal', label: 'Tổng', mono: true, width: 130, render: (r) => fmtVND(r.subTotal) },
    {
      key: 'bhyt', label: 'BHYT chi trả', mono: true, width: 130,
      render: (r) => r.insuranceAmount > 0
        ? <span style={{ color: 'var(--a-cy)' }}>{fmtVND(r.insuranceAmount)}</span>
        : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'patientPay', label: 'BN trả', mono: true, width: 130,
      render: (r) => <b>{fmtVND(r.totalAmount)}</b>,
    },
    {
      key: 'paid', label: 'Đã thu', mono: true, width: 130,
      render: (r) => r.paidAmount > 0 ? <span style={{ color: '#15803d' }}>{fmtVND(r.paidAmount)}</span> : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'remain', label: 'Còn lại', mono: true, width: 130,
      render: (r) => r.remainingAmount > 0 ? <span style={{ color: 'var(--s-warn)' }}>{fmtVND(r.remainingAmount)}</span> : '—',
    },
    {
      key: 'status', label: 'TT', width: 130,
      render: (r) => {
        const sk = statusKey(r.paymentStatus);
        return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{r.paymentStatusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <SimpleV2Page<InvoiceDto>
      title="Hóa đơn viện phí"
      load={async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = await searchInvoices({ pageIndex: 0, pageSize: 200 } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ((r as any)?.data?.items || []) as InvoiceDto[];
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / mã HĐ / hồ sơ…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.invoiceCode} ${r.medicalRecordCode}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.paymentStatus)}
      filters={[{
        key: 'kind', placeholder: '▾ Loại HĐ',
        options: Object.entries(KIND_LABEL).map(([v, l]) => ({ v, l })),
        valueOf: (r) => String(r.patientType),
      }]}
      pageSize={18}
      kpis={(rows) => {
        const today = dayjs().startOf('day');
        const todayCount = rows.filter((r) => dayjs(r.createdAt).isSame(today, 'day')).length;
        const pending = rows.filter((r) => r.paymentStatus === 0 || r.paymentStatus === 1).length;
        const paid = rows.filter((r) => r.paymentStatus === 2).length;
        const totalRevenue = rows.filter((r) => r.paymentStatus === 2).reduce((s, r) => s + r.paidAmount, 0);
        const totalBhyt = rows.reduce((s, r) => s + (r.insuranceAmount || 0), 0);
        const totalDebt = rows.reduce((s, r) => s + (r.remainingAmount || 0), 0);
        return [
          { lbl: 'HĐ hôm nay', val: todayCount, sub: 'tạo mới' },
          { lbl: 'Chờ thu', val: pending, sub: 'công nợ', tone: 'warn' },
          { lbl: 'Đã thu', val: paid, sub: rows.length > 0 ? `${Math.round(paid / rows.length * 100)}%` : '—', tone: 'ok' },
          { lbl: 'Doanh thu', val: Math.round(totalRevenue / 1_000_000), unit: 'tr', sub: 'VND', tone: 'ok' },
          { lbl: 'BHYT', val: Math.round(totalBhyt / 1_000_000), unit: 'tr', sub: 'VND' },
          { lbl: 'Tổng nợ', val: Math.round(totalDebt / 1_000_000), unit: 'tr', sub: 'VND', tone: 'crit' },
        ];
      }}
      rowActions={(r) => (
        <div className="ab-actions">
          {(r.paymentStatus === 0 || r.paymentStatus === 1) && (
            <ActBtn ic="dollar" title="Thu tiền" onClick={() => message.info(`TODO: Thu tiền ${r.invoiceCode}`)} />
          )}
          <ActBtn ic="print" title="In HĐ" onClick={() => message.success('Đã in hóa đơn')} />
        </div>
      )}
      drawer={(r) => <BillingDrawerBody r={r} />}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.invoiceCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.patientTypeName || '—'} · ${fmtDMY(r.createdAt)}`}
      toolbarRight={
        <button type="button" className="ab-btn primary" onClick={() => message.info('TODO: Tạo HĐ mới')}>
          <TermIcon name="plus" size={12} /> Tạo HĐ
        </button>
      }
    />
  );
};

const BillingDrawerBody: React.FC<{ r: InvoiceDto }> = ({ r }) => (
  <>
    <div className="rec-section">
      <h5><TermIcon name="user" size={11} /> THÔNG TIN HÓA ĐƠN</h5>
      <div className="rec-kv">
        <span>Mã HĐ</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.invoiceCode}</span>
        <span>Bệnh nhân</span><b>{r.patientName} · {r.patientCode}</b>
        <span>Hồ sơ</span><span className="mono">{r.medicalRecordCode}</span>
        <span>Loại</span><span>{r.patientTypeName}</span>
        {r.departmentName && (<><span>Khoa</span><span>{r.departmentName}</span></>)}
        {r.insuranceCardNumber && (
          <>
            <span>Số BHYT</span><span className="mono">{r.insuranceCardNumber}</span>
            <span>Mức BHYT</span><span><span className="chip ok">{r.insuranceRate}%</span></span>
          </>
        )}
        <span>Ngày HĐ</span><span>{fmtDMY(r.createdAt)}</span>
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="dollar" size={11} /> TỔNG HỢP CHI PHÍ</h5>
      <div className="rec-kv">
        <span>Tiền dịch vụ</span><span className="mono">{fmtVND(r.serviceTotal)}</span>
        <span>Tiền thuốc</span><span className="mono">{fmtVND(r.medicineTotal)}</span>
        <span>Vật tư</span><span className="mono">{fmtVND(r.supplyTotal)}</span>
        {r.bedTotal > 0 && (<><span>Tiền giường</span><span className="mono">{fmtVND(r.bedTotal)}</span></>)}
        <span>Tổng phụ</span><b className="mono">{fmtVND(r.subTotal)}</b>
        {r.insuranceAmount > 0 && (
          <><span>BHYT chi trả</span><b className="mono" style={{ color: 'var(--a-cy)' }}>−{fmtVND(r.insuranceAmount)}</b></>
        )}
        {r.discountAmount > 0 && (
          <><span>Giảm giá</span><span className="mono">−{fmtVND(r.discountAmount)}</span></>
        )}
        {r.surchargeAmount > 0 && (
          <><span>Phụ phí</span><span className="mono">+{fmtVND(r.surchargeAmount)}</span></>
        )}
        <span>BN phải trả</span><b className="mono" style={{ fontSize: 14 }}>{fmtVND(r.totalAmount)}</b>
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="check" size={11} /> THANH TOÁN</h5>
      <div className="rec-kv">
        <span>Đã thu</span><b className="mono" style={{ color: '#15803d' }}>{fmtVND(r.paidAmount)}</b>
        <span>Còn lại</span>
        <b className="mono" style={{ color: r.remainingAmount > 0 ? 'var(--s-warn)' : '#15803d' }}>{fmtVND(r.remainingAmount)}</b>
        <span>Trạng thái TT</span>
        <span><span className={`chip ${r.paymentStatus === 2 ? 'ok' : 'warn'}`}>{r.paymentStatusName}</span></span>
        <span>Trạng thái duyệt</span>
        <span><span className={`chip ${r.approvalStatus === 1 ? 'ok' : 'warn'}`}>{r.approvalStatusName}</span></span>
        {r.isLocked && (<><span>Đã khóa</span><b style={{ color: 'var(--s-crit)' }}>{r.lockReason || 'Yes'}</b></>)}
      </div>
    </div>
    {r.serviceItems && r.serviceItems.length > 0 && (
      <div className="rec-section">
        <h5><TermIcon name="activity" size={11} /> DỊCH VỤ ({r.serviceItems.length})</h5>
        <div style={{ fontSize: 12.5 }}>
          {r.serviceItems.slice(0, 8).map((it) => (
            <div key={it.id} style={{
              padding: '8px 0', borderBottom: '1px solid var(--line-soft)',
              display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center',
            }}>
              <div>
                <b style={{ color: 'var(--t-0)' }}>{it.serviceName}</b>
                <div style={{ fontSize: 11, color: 'var(--t-2)' }}>
                  <span className="mono">{it.serviceCode}</span>
                  {it.serviceGroup && ` · ${it.serviceGroup}`}
                </div>
              </div>
              <span className="mono">{it.quantity}×</span>
              <b className="mono">{fmtVND(it.amount)}</b>
            </div>
          ))}
          {r.serviceItems.length > 8 && (
            <div style={{ padding: '8px 0', textAlign: 'center', color: 'var(--t-2)', fontSize: 11.5 }}>
              … và {r.serviceItems.length - 8} dịch vụ khác
            </div>
          )}
        </div>
      </div>
    )}
  </>
);

export default BillingV2;
