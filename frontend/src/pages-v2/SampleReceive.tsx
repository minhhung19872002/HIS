import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, Tabs } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, SearchBox, DataTable, StatusBadge, ActBtn, Btn,
  DrawerShell, ModalShell, DrSec, DrField, Ico, tk, ti, tw,
  type ColumnDef,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

// ── Types cho Panel Tiện ích XN (tái sử dụng từ Laboratory.tsx) ──
interface UtilWarehouseStock {
  id: string; itemCode: string; itemName: string; unit: string;
  quantity: number; availableQuantity: number;
  warehouseName: string; warehouseType?: number;
  expiryDate?: string; daysToExpiry?: number;
}
const UTIL_CABINET_TYPE = 5; // WarehouseType=5 = Tủ trực

interface PendingSample {
  id: string; sampleBarcode?: string; serviceRequestId: string;
  requestCode: string; patientCode: string; patientName: string;
  serviceCode: string; serviceName: string;
  sampleCollectedAt?: string; collectedByUserId?: string;
  receivedAt?: string; receivedByUserId?: string;
  status: number;
  receiveStatus?: number;  // included from accepted list
}
interface DetailStatus {
  id: string; sampleBarcode?: string;
  serviceName: string; patientName: string;
  isSampleCollected: boolean; sampleCollectedAt?: string; collectedByUserId?: string;
  receiveStatus: number; receivedByUserId?: string; receivedAt?: string; rejectReason?: string;
  technicianUserId?: string; technicianRunAt?: string;
  reviewerUserId?: string; reviewedAt?: string;
  status: number; result?: string; conclusion?: string;
}

const SampleReceiveV2: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted'>('pending');
  const [keyword, setKeyword] = useState('');
  const [samples, setSamples] = useState<PendingSample[]>([]);
  const [accepted, setAccepted] = useState<PendingSample[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [rejectRow, setRejectRow] = useState<PendingSample | null>(null);
  const [runRow, setRunRow] = useState<PendingSample | null>(null);
  const [reviewRow, setReviewRow] = useState<PendingSample | null>(null);
  const [detail, setDetail] = useState<DetailStatus | null>(null);
  const [cancelReceiveBusy, setCancelReceiveBusy] = useState(false);
  const [rejectForm] = Form.useForm();
  const [runForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  // Panel Tiện ích XN
  const [utilOpen, setUtilOpen] = useState(false);
  const [utilCabinetStock, setUtilCabinetStock] = useState<UtilWarehouseStock[]>([]);
  const [utilChemStock, setUtilChemStock] = useState<UtilWarehouseStock[]>([]);
  const [utilLoading, setUtilLoading] = useState(false);

  const loadUtilData = async () => {
    setUtilLoading(true);
    try {
      const [cabRes, chemRes] = await Promise.all([
        apiClient.get<{ items: UtilWarehouseStock[] } | UtilWarehouseStock[]>('/warehouse/stock', {
          params: { warehouseType: UTIL_CABINET_TYPE, itemType: 3, pageSize: 200 },
        }),
        apiClient.get<{ items: UtilWarehouseStock[] } | UtilWarehouseStock[]>('/warehouse/stock', {
          params: { itemType: 3, pageSize: 200 },
        }),
      ]);
      const toItems = (r: { data: { items: UtilWarehouseStock[] } | UtilWarehouseStock[] }) => {
        const p = r.data;
        return Array.isArray(p) ? p : ((p as { items?: UtilWarehouseStock[] }).items ?? []);
      };
      const cabItems = toItems(cabRes);
      const cabIds = new Set(cabItems.map((s) => s.id));
      setUtilCabinetStock(cabItems);
      setUtilChemStock(toItems(chemRes).filter((s) => !cabIds.has(s.id)));
    } catch {
      console.warn('[SampleReceive] loadUtilData failed');
    } finally {
      setUtilLoading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, acceptedRes] = await Promise.all([
        apiClient.get<PendingSample[]>('/sample-receive/pending', { params: { keyword } }),
        apiClient.get<PendingSample[]>('/sample-receive/accepted', { params: { keyword } }),
      ]);
      setSamples(pendingRes.data || []);
      setAccepted(acceptedRes.data || []);
    } catch { ti('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }, [keyword]);

  useEffect(() => { load(); }, [load]);

  const accept = async () => {
    if (selected.size === 0) { tw('Chưa chọn mẫu'); return; }
    try {
      interface AcceptResponse { received?: number }
      const { data }: { data: AcceptResponse } = await apiClient.post('/sample-receive/accept', { detailIds: Array.from(selected) });
      tk(`Đã nhận ${data.received ?? 0} mẫu`); setSelected(new Set()); load();
    } catch { tw('Nhận mẫu thất bại'); }
  };

  const submitReject = async () => {
    if (!rejectRow) return;
    const v = await rejectForm.validateFields();
    try {
      await apiClient.post('/sample-receive/reject', { detailId: rejectRow.id, reason: v.reason });
      tk('Đã từ chối mẫu'); setRejectRow(null); rejectForm.resetFields(); load();
    } catch { tw('Từ chối thất bại'); }
  };

  const submitRun = async () => {
    if (!runRow) return;
    const v = await runForm.validateFields();
    try {
      await apiClient.post('/sample-receive/technician-run', {
        detailId: runRow.id, result: v.result, resultDescription: v.resultDescription,
      });
      tk('Đã ghi KQ (chờ duyệt)'); setRunRow(null); runForm.resetFields(); load();
    } catch { tw('Ghi KQ thất bại'); }
  };

  const submitReview = async () => {
    if (!reviewRow) return;
    const v = await reviewForm.validateFields();
    try {
      await apiClient.post('/sample-receive/review', { detailId: reviewRow.id, conclusion: v.conclusion });
      tk('Đã duyệt KQ'); setReviewRow(null); reviewForm.resetFields(); load();
    } catch { tw('Duyệt thất bại'); }
  };

  const cancelReceive = async (detailId: string, barcode?: string) => {
    if (!window.confirm(`Hủy nhận mẫu ${barcode || detailId}?\nMẫu sẽ trở về trạng thái chờ nhận.`)) return;
    setCancelReceiveBusy(true);
    try {
      interface CancelReceiveResponse { cancelled?: number }
      const { data }: { data: CancelReceiveResponse } = await apiClient.post('/sample-receive/cancel-receive', {
        detailIds: [detailId],
        reason: 'Hủy nhận thủ công từ UI',
      });
      tk(`Đã hủy nhận ${data.cancelled ?? 1} mẫu`);
      setDetail(null);
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      ti(e?.response?.data?.message || 'Hủy nhận thất bại');
    } finally {
      setCancelReceiveBusy(false);
    }
  };

  const openDetail = async (row: PendingSample) => {
    try {
      const { data } = await apiClient.get<DetailStatus>(`/sample-receive/status/${row.id}`);
      setDetail(data);
    } catch { tw('Tải chi tiết thất bại'); }
  };

  const cols: ColumnDef<PendingSample>[] = [
    { key: 'bar', label: 'Barcode', code: true, render: (r) => r.sampleBarcode || '—' },
    { key: 'req', label: 'Phiếu', code: true, render: (r) => r.requestCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'svc', label: 'Dịch vụ XN', render: (r) => r.serviceName },
    { key: 'col', label: 'Lấy mẫu lúc', mono: true, render: (r) => r.sampleCollectedAt ? dayjs(r.sampleCollectedAt).format('DD/MM HH:mm') : '—' },
  ];

  const togglePending = (id: string) => {
    const n = new Set(selected); if (n.has(id)) n.delete(id); else n.add(id); setSelected(n);
  };
  const toggleAll = () => {
    if (samples.every((s) => selected.has(s.id))) {
      const n = new Set(selected); samples.forEach((s) => n.delete(s.id)); setSelected(n);
    } else {
      const n = new Set(selected); samples.forEach((s) => n.add(s.id)); setSelected(n);
    }
  };

  const colsAccepted: ColumnDef<PendingSample>[] = [
    { key: 'bar', label: 'Barcode', code: true, render: (r) => r.sampleBarcode || '—' },
    { key: 'req', label: 'Phiếu', code: true, render: (r) => r.requestCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'svc', label: 'Dịch vụ XN', render: (r) => r.serviceName },
    { key: 'recv', label: 'Nhận lúc', mono: true, render: (r) => r.receivedAt ? dayjs(r.receivedAt).format('HH:mm') : '—' },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Mẫu chờ nhận', val: samples.length, sub: 'tất cả', tone: 'warn' },
        { lbl: 'Đã nhận hôm nay', val: accepted.length, sub: 'trong ngày', tone: 'ok' },
        { lbl: 'Đã chọn', val: selected.size, sub: 'sẽ nhận', tone: selected.size > 0 ? 'crit' : 'ok' },
        { lbl: 'BN unique', val: new Set(samples.map((s) => s.patientCode)).size, sub: 'chờ nhận', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as 'pending' | 'accepted')}
          size="small"
          style={{ marginBottom: 0 }}
          items={[
            { key: 'pending', label: `Chờ nhận (${samples.length})` },
            { key: 'accepted', label: `Đã nhận hôm nay (${accepted.length})` },
          ]}
        />
        <span className="spacer" />
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm barcode / mã BN / tên / mã phiếu…" />
        <Btn variant="ghost" onClick={() => { setKeyword(''); load(); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => { setUtilOpen(true); loadUtilData(); }}>
          <TermIcon name="flask" size={12} /> Tiện ích XN
        </Btn>
        {activeTab === 'pending' && selected.size > 0 && (
          <Btn variant="primary" onClick={accept}>
            <Ico name="check" size={12} /> Nhận {selected.size} mẫu
          </Btn>
        )}
      </div>

      {activeTab === 'pending' && (
        <DataTable<PendingSample>
          columns={cols} data={samples} rowKey={(r) => r.id}
          selected={selected} onToggle={togglePending} onToggleAll={toggleAll}
          onRowClick={openDetail}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="eye" title="Xem" onClick={() => openDetail(r)} />
              <ActBtn ic="x" title="Từ chối" tone="crit" onClick={() => setRejectRow(r)} />
              <ActBtn ic="activity" title="KTV ghi KQ" onClick={() => setRunRow(r)} />
              <ActBtn ic="check" title="Reviewer duyệt" onClick={() => setReviewRow(r)} />
            </div>
          )}
          empty={loading ? 'Đang tải…' : 'Không có mẫu chờ nhận'}
        />
      )}

      {activeTab === 'accepted' && (
        <DataTable<PendingSample>
          columns={colsAccepted} data={accepted} rowKey={(r) => r.id}
          onRowClick={openDetail}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="eye" title="Xem chi tiết" onClick={() => openDetail(r)} />
              <ActBtn ic="x" title="Hủy nhận" tone="crit" onClick={() => cancelReceive(r.id, r.sampleBarcode)} />
            </div>
          )}
          empty={loading ? 'Đang tải…' : 'Chưa nhận mẫu nào hôm nay'}
        />
      )}

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail?.sampleBarcode || 'Chi tiết mẫu'}
        sub={detail ? `${detail.serviceName} · ${detail.patientName}` : ''}
        footer={detail && detail.receiveStatus === 1 ? (
          <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <Btn
              variant="crit"
              disabled={cancelReceiveBusy}
              onClick={() => cancelReceive(detail.id, detail.sampleBarcode)}
            >
              <Ico name="x" size={12} /> {cancelReceiveBusy ? 'Đang xử lý…' : 'Hủy nhận mẫu'}
            </Btn>
          </div>
        ) : undefined}
      >
        {detail && <>
          <DrSec title="Mẫu">
            <DrField lbl="Barcode"><span style={{ fontFamily: 'var(--font-mono)' }}>{detail.sampleBarcode || '—'}</span></DrField>
            <DrField lbl="Dịch vụ">{detail.serviceName}</DrField>
            <DrField lbl="Bệnh nhân">{detail.patientName}</DrField>
            <DrField lbl="Trạng thái">
              {detail.receiveStatus === 0 ? <StatusBadge tone="warn" dot>Chờ nhận</StatusBadge>
                : detail.receiveStatus === 1 ? <StatusBadge tone="ok" dot>Đã nhận</StatusBadge>
                : <StatusBadge tone="crit" dot>Từ chối</StatusBadge>}
            </DrField>
          </DrSec>
          <DrSec title="Tiến trình">
            <Timeline items={[
              { ok: detail.isSampleCollected, label: 'Lấy mẫu',
                time: detail.sampleCollectedAt, by: detail.collectedByUserId },
              { ok: detail.receiveStatus === 1, fail: detail.receiveStatus === 2, label: 'LIS nhận mẫu',
                time: detail.receivedAt, by: detail.receivedByUserId,
                extra: detail.rejectReason ? `Lý do từ chối: ${detail.rejectReason}` : undefined },
              { ok: !!detail.technicianUserId, label: 'KTV ghi KQ',
                time: detail.technicianRunAt, by: detail.technicianUserId,
                extra: detail.result ? `KQ: ${detail.result}` : undefined },
              { ok: !!detail.reviewerUserId, label: 'Reviewer duyệt',
                time: detail.reviewedAt, by: detail.reviewerUserId,
                extra: detail.conclusion ? `KL: ${detail.conclusion}` : undefined },
            ]} />
          </DrSec>
        </>}
      </DrawerShell>

      <ModalShell
        open={!!rejectRow}
        onClose={() => setRejectRow(null)}
        size="md"
        title={`Từ chối mẫu ${rejectRow?.sampleBarcode || ''}`}
        footer={<>
          <Btn variant="ghost" onClick={() => setRejectRow(null)}>Hủy</Btn>
          <Btn variant="primary" onClick={submitReject} style={{ color: 'var(--a-rd-text)' }}>
            <Ico name="x" size={12} /> Từ chối
          </Btn>
        </>}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item label="Lý do từ chối" name="reason" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="VD: mẫu vỡ hồng cầu, thiếu số lượng, nhầm ống…" />
          </Form.Item>
        </Form>
      </ModalShell>

      <ModalShell
        open={!!runRow}
        onClose={() => setRunRow(null)}
        size="md"
        title={`KTV ghi KQ — ${runRow?.serviceName || ''}`}
        footer={<>
          <Btn variant="ghost" onClick={() => setRunRow(null)}>Hủy</Btn>
          <Btn variant="primary" onClick={submitRun}>
            <Ico name="check" size={12} /> Lưu KQ
          </Btn>
        </>}
      >
        <div style={{ marginBottom: 'var(--space-12)' }}><StatusBadge tone="warn">Chỉ ghi KQ — chờ người khác duyệt</StatusBadge></div>
        <Form form={runForm} layout="vertical">
          <Form.Item label="Kết quả" name="result" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Giá trị kết quả" />
          </Form.Item>
          <Form.Item label="Mô tả / diễn giải" name="resultDescription">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </ModalShell>

      <ModalShell
        open={!!reviewRow}
        onClose={() => setReviewRow(null)}
        size="md"
        title={`Duyệt KQ — ${reviewRow?.serviceName || ''}`}
        footer={<>
          <Btn variant="ghost" onClick={() => setReviewRow(null)}>Hủy</Btn>
          <Btn variant="primary" onClick={submitReview}>
            <Ico name="check" size={12} /> Duyệt
          </Btn>
        </>}
      >
        <div style={{ marginBottom: 'var(--space-12)' }}><StatusBadge tone="crit">Người duyệt phải khác KTV ghi KQ (4-eyes principle)</StatusBadge></div>
        <Form form={reviewForm} layout="vertical">
          <Form.Item label="Kết luận (nếu cần sửa)" name="conclusion">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </ModalShell>

      {/* ── Drawer: Tiện ích XN — tủ trực + tồn kho hóa chất ─────── */}
      <DrawerShell
        open={utilOpen}
        onClose={() => setUtilOpen(false)}
        title="Tiện ích XN — Tồn kho"
        sub="Tủ trực hóa chất · Tồn kho hóa chất"
        size="lg"
      >
        {utilLoading ? (
          <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải…</div>
        ) : (
          <>
            <div className="rec-section">
              <h5><TermIcon name="package" size={11} /> TỒN TỦ TRỰC</h5>
              {utilCabinetStock.length === 0 ? (
                <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)', padding: '8px 0' }}>Không có dữ liệu tủ trực</div>
              ) : (
                <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                  {utilCabinetStock.slice(0, 50).map((s) => (
                    <div key={s.id} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                      padding: '6px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 12.5, alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.itemName}</div>
                        <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>{s.warehouseName}</div>
                      </div>
                      <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{s.quantity} {s.unit}</span>
                      <span style={{
                        textAlign: 'right', fontFamily: 'var(--font-mono)',
                        color: s.availableQuantity <= 0 ? 'var(--s-crit)' : s.availableQuantity < 10 ? 'var(--s-warn)' : 'inherit',
                        fontWeight: s.availableQuantity <= 0 ? 700 : 400,
                      }}>{s.availableQuantity}</span>
                      <span style={{ fontSize: 'var(--fs-xs)', color: s.daysToExpiry !== undefined && s.daysToExpiry < 30 ? 'var(--s-warn)' : 'var(--t-2)' }}>
                        {s.expiryDate ? dayjs(s.expiryDate).format('MM/YYYY') : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rec-section" style={{ marginTop: 'var(--space-16)' }}>
              <h5><TermIcon name="flask" size={11} /> TỒN KHO HÓA CHẤT</h5>
              {utilChemStock.length === 0 ? (
                <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)', padding: '8px 0' }}>Không có dữ liệu tồn kho hóa chất</div>
              ) : (
                <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                  {utilChemStock.slice(0, 50).map((s) => (
                    <div key={s.id} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                      padding: '6px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 12.5, alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.itemName}</div>
                        <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>{s.warehouseName}</div>
                      </div>
                      <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{s.quantity} {s.unit}</span>
                      <span style={{
                        textAlign: 'right', fontFamily: 'var(--font-mono)',
                        color: s.availableQuantity <= 0 ? 'var(--s-crit)' : s.availableQuantity < 10 ? 'var(--s-warn)' : 'inherit',
                        fontWeight: s.availableQuantity <= 0 ? 700 : 400,
                      }}>{s.availableQuantity}</span>
                      <span style={{ fontSize: 'var(--fs-xs)', color: s.daysToExpiry !== undefined && s.daysToExpiry < 30 ? 'var(--s-warn)' : 'var(--t-2)' }}>
                        {s.expiryDate ? dayjs(s.expiryDate).format('MM/YYYY') : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </DrawerShell>
    </div>
  );
};

const Timeline: React.FC<{ items: { ok?: boolean; fail?: boolean; label: string; time?: string; by?: string; extra?: string }[] }> = ({ items }) => (
  <div>
    {items.map((it, i) => (
      <div key={i} style={{ display: 'flex', gap: 'var(--space-12)', padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', marginTop: 'var(--space-4)',
          background: it.fail ? 'var(--a-rd-text)' : it.ok ? 'var(--a-em-text)' : 'var(--t-2)',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{it.label}</div>
          {it.time && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{dayjs(it.time).format('DD/MM/YYYY HH:mm')}</div>}
          {it.by && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Người thực hiện: {it.by}</div>}
          {it.extra && <div style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--space-4)', color: it.fail ? 'var(--a-rd-text)' : 'var(--t-1)' }}>{it.extra}</div>}
        </div>
      </div>
    ))}
  </div>
);

export default SampleReceiveV2;
