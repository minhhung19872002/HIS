/**
 * SurgeryOrdersSection — chỉ định dịch vụ + kê máu + chi phí của MỘT ca mổ (drawer Phẫu thuật v2).
 *
 * QA-R11: drawer "CHI PHÍ" trước đây đọc r.serviceCost / r.medicineCost mà danh sách ca mổ không bao giờ trả
 * → luôn 0 ₫; các endpoint service-orders / blood-order / service-cost là stub nên không có màn nào dùng.
 * Nay BE ghi thật (ServiceRequests / BloodRequests gắn SurgeryRequestId) và section này đọc/ghi lại:
 *   - getServiceOrders / orderService / deleteServiceOrder  → chỉ định DV trong ca mổ (vào viện phí + LIS/RIS)
 *   - getBloodOrder / createBloodOrder / deleteBloodOrder   → yêu cầu máu (kho máu duyệt/cấp như thường)
 *   - getServiceCostInfo                                    → tổng chi phí thật (phí PTTT + DV + thuốc/VT)
 */
import React, { useCallback, useEffect, useState } from 'react';
import { InputNumber, Select } from 'antd';
import * as surgeryApi from '../api/surgery';
import type { SurgeryServiceOrderDto, SurgeryBloodOrderDto, ServiceCostInfoDto, ServiceDto } from '../api/surgery';
import { Btn, DataTable, cf, te, tk, type ColumnDef } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

const vnd = (n?: number) => `${(n || 0).toLocaleString('vi-VN')} ₫`;
const BLOOD_GROUPS = ['A', 'B', 'AB', 'O'].map((g) => ({ value: g, label: g }));
const RH = [{ value: '+', label: 'Rh+' }, { value: '-', label: 'Rh−' }];

export const SurgeryOrdersSection: React.FC<{ surgeryId: string; status: number }> = ({ surgeryId, status }) => {
  const [orders, setOrders] = useState<SurgeryServiceOrderDto[]>([]);
  const [blood, setBlood] = useState<SurgeryBloodOrderDto | null>(null);
  const [cost, setCost] = useState<ServiceCostInfoDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // add-service form
  const [svcOptions, setSvcOptions] = useState<{ value: string; label: string }[]>([]);
  const [svcSearching, setSvcSearching] = useState(false);
  const [svcId, setSvcId] = useState<string | undefined>();
  const [svcQty, setSvcQty] = useState<number>(1);
  // add-blood form
  const [bGroup, setBGroup] = useState<string | undefined>();
  const [bRh, setBRh] = useState<string>('+');
  const [bQty, setBQty] = useState<number>(1);

  const cancelled = status === 4;

  const load = useCallback(async () => {
    setLoading(true);
    const [o, b, c] = await Promise.allSettled([
      surgeryApi.getServiceOrders(surgeryId),
      surgeryApi.getBloodOrder(surgeryId),
      surgeryApi.getServiceCostInfo(surgeryId),
    ]);
    if (o.status === 'fulfilled') setOrders(Array.isArray(o.value.data) ? o.value.data : []);
    else te(friendlyErrorMessage(o.reason, 'Không tải được chỉ định dịch vụ của ca mổ'));
    // Chưa kê máu: BE trả 204 (trước QA-R11 là 404) — không phải lỗi. 204 → data rỗng ('').
    setBlood(b.status === 'fulfilled' && b.value.data ? b.value.data : null);
    if (c.status === 'fulfilled') setCost(c.value.data ?? null);
    setLoading(false);
  }, [surgeryId]);

  useEffect(() => { void load(); }, [load]);

  const searchSvc = async (kw: string) => {
    if (kw.trim().length < 2) return;
    setSvcSearching(true);
    try {
      const r = await surgeryApi.searchServices(kw.trim());
      setSvcOptions((Array.isArray(r.data) ? r.data : []).map((s: ServiceDto) => ({
        value: s.id, label: `${s.code} · ${s.name} · ${(s.unitPrice || 0).toLocaleString('vi-VN')} ₫`,
      })));
    } catch (e) { te(friendlyErrorMessage(e, 'Không tìm được dịch vụ')); }
    finally { setSvcSearching(false); }
  };

  const addService = async () => {
    if (!svcId || busy) return;
    setBusy(true);
    try {
      await surgeryApi.orderService(surgeryId, { surgeryId, serviceId: svcId, quantity: svcQty, paymentObject: 0 });
      tk('Đã chỉ định dịch vụ cho ca mổ');
      setSvcId(undefined); setSvcQty(1);
      await load();
    } catch (e) { te(friendlyErrorMessage(e, 'Chỉ định dịch vụ thất bại')); }
    finally { setBusy(false); }
  };

  const removeService = (o: SurgeryServiceOrderDto) => cf(`Hủy chỉ định ${o.serviceName}?`, () => {
    void (async () => {
      try { await surgeryApi.deleteServiceOrder(o.id); tk('Đã hủy chỉ định'); await load(); }
      catch (e) { te(friendlyErrorMessage(e, 'Hủy chỉ định thất bại')); }
    })();
  }, { title: 'Hủy chỉ định dịch vụ', tone: 'warn', confirm: 'Hủy chỉ định' });

  const addBlood = async () => {
    if (!bGroup || busy) return;
    setBusy(true);
    try {
      await surgeryApi.createBloodOrder(surgeryId, {
        surgeryId, bloodBankId: '00000000-0000-0000-0000-000000000000',
        bloodProducts: [{ bloodProductId: '00000000-0000-0000-0000-000000000000', bloodType: bGroup, rhFactor: bRh, quantity: bQty }],
      });
      tk('Đã gửi yêu cầu máu tới kho máu');
      setBGroup(undefined); setBQty(1);
      await load();
    } catch (e) { te(friendlyErrorMessage(e, 'Kê máu thất bại')); }
    finally { setBusy(false); }
  };

  const removeBlood = (id: string, label: string) => cf(`Hủy yêu cầu máu ${label}?`, () => {
    void (async () => {
      try { await surgeryApi.deleteBloodOrder(id); tk('Đã hủy yêu cầu máu'); await load(); }
      catch (e) { te(friendlyErrorMessage(e, 'Hủy yêu cầu máu thất bại')); }
    })();
  }, { title: 'Hủy yêu cầu máu', tone: 'warn', confirm: 'Hủy yêu cầu' });

  const orderCols: ColumnDef<SurgeryServiceOrderDto>[] = [
    { key: 'svc', label: 'Dịch vụ', render: (o) => (
      <div className="cell-2l"><b>{o.serviceName}</b><i className="mono">{o.serviceCode} · {o.paymentObjectName}</i></div>
    ) },
    { key: 'qty', label: 'SL', mono: true, width: 50, render: (o) => o.quantity },
    { key: 'amt', label: 'Thành tiền', mono: true, width: 120, render: (o) => vnd(o.amount) },
    { key: 'st', label: 'Trạng thái', width: 110, render: (o) => o.statusName },
    { key: 'act', label: '', width: 44, render: (o) => (o.status === 0 && !cancelled
      ? <Btn variant="ghost" size="sm" onClick={() => removeService(o)} title="Hủy chỉ định"><TermIcon name="x" size={11} /></Btn>
      : null) },
  ];

  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="clipboard" size={11} /> CHỈ ĐỊNH DỊCH VỤ TRONG CA MỔ ({orders.filter((o) => o.status !== 3).length})</h5>
        {!cancelled && (
          <div style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            <Select
              showSearch filterOption={false} allowClear style={{ flex: 1 }}
              placeholder="Tìm dịch vụ (mã / tên)…"
              value={svcId} onChange={(v) => setSvcId(v)}
              onSearch={(kw) => { void searchSvc(kw); }}
              loading={svcSearching} options={svcOptions}
              notFoundContent={svcSearching ? 'Đang tìm...' : 'Nhập ít nhất 2 ký tự'}
            />
            <InputNumber min={1} max={99} value={svcQty} onChange={(v) => setSvcQty(Number(v) || 1)} style={{ width: 70 }} />
            <Btn variant="primary" size="sm" disabled={!svcId || busy} onClick={() => { void addService(); }}>
              <TermIcon name="plus" size={11} /> Chỉ định
            </Btn>
          </div>
        )}
        <DataTable<SurgeryServiceOrderDto>
          columns={orderCols} data={orders} rowKey={(o) => o.id} loading={loading}
          empty="Chưa có chỉ định dịch vụ trong ca mổ"
        />
      </div>

      <div className="rec-section">
        <h5><TermIcon name="droplet" size={11} /> YÊU CẦU MÁU {blood ? `· ${blood.statusName}` : ''}</h5>
        {blood?.bloodProducts?.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            {blood.bloodProducts.map((p) => (
              <span key={p.id} className="chip info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {p.bloodType}{p.rhFactor} × {p.quantity} đv <i className="mono">{p.productCode}</i>
                {blood.status === 0 && (
                  <button type="button" aria-label="Hủy yêu cầu máu" onClick={() => removeBlood(p.id, `${p.bloodType}${p.rhFactor}`)}
                    style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'inherit' }}>
                    <TermIcon name="x" size={10} />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--t-3)', marginBottom: 'var(--space-6)' }}>Chưa kê máu cho ca mổ.</div>
        )}
        {!cancelled && status !== 3 && (
          <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
            <Select placeholder="Nhóm máu" value={bGroup} onChange={setBGroup} options={BLOOD_GROUPS} style={{ width: 110 }} />
            <Select value={bRh} onChange={setBRh} options={RH} style={{ width: 90 }} />
            <InputNumber min={1} max={20} value={bQty} onChange={(v) => setBQty(Number(v) || 1)} style={{ width: 70 }} />
            <Btn variant="ghost" size="sm" disabled={!bGroup || busy} onClick={() => { void addBlood(); }}>
              <TermIcon name="plus" size={11} /> Kê máu
            </Btn>
          </div>
        )}
      </div>

      <div className="rec-section">
        <h5><TermIcon name="dollar" size={11} /> CHI PHÍ CA MỔ</h5>
        <div className="rec-kv">
          <span>Tổng chi phí</span><b className="mono">{vnd(cost?.totalServiceCost)}</b>
          <span>BHYT chi trả</span><span className="mono">{vnd(cost?.insuranceCoverage)}</span>
          <span>Người bệnh trả</span><b className="mono">{vnd(cost?.patientPayment)}</b>
          <span>Tạm ứng còn</span>
          <span className="mono" style={{ color: cost && !cost.hasSufficientDeposit ? 'var(--s-crit)' : undefined }}>
            {vnd(cost?.depositBalance)}{cost && !cost.hasSufficientDeposit ? ' · thiếu tạm ứng' : ''}
          </span>
        </div>
      </div>
    </>
  );
};
