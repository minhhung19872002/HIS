import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, SearchBox, DataTable, StatusBadge, ActBtn,
  DrawerShell, ModalShell, DrSec, DrField, Ico, tk, ti, tw,
  type ColumnDef,
} from './_v2kit';

interface PendingSample {
  id: string; sampleBarcode?: string; serviceRequestId: string;
  requestCode: string; patientCode: string; patientName: string;
  serviceCode: string; serviceName: string;
  sampleCollectedAt?: string; collectedByUserId?: string;
  status: number;
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
  const [keyword, setKeyword] = useState('');
  const [samples, setSamples] = useState<PendingSample[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [rejectRow, setRejectRow] = useState<PendingSample | null>(null);
  const [runRow, setRunRow] = useState<PendingSample | null>(null);
  const [reviewRow, setReviewRow] = useState<PendingSample | null>(null);
  const [detail, setDetail] = useState<DetailStatus | null>(null);
  const [rejectForm] = Form.useForm();
  const [runForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<PendingSample[]>('/sample-receive/pending', { params: { keyword } });
      setSamples(data || []);
    } catch { ti('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }, [keyword]);

  useEffect(() => { load(); }, [load]);

  const accept = async () => {
    if (selected.size === 0) { tw('Chưa chọn mẫu'); return; }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data }: { data: any } = await apiClient.post('/sample-receive/accept', { detailIds: Array.from(selected) });
      tk(`Đã nhận ${data.received} mẫu`); setSelected(new Set()); load();
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
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.patientCode}</div>
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

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Mẫu chờ nhận', val: samples.length, sub: 'tất cả', tone: 'warn' },
        { lbl: 'Đã chọn', val: selected.size, sub: 'sẽ nhận', tone: selected.size > 0 ? 'crit' : 'ok' },
        { lbl: 'BN unique', val: new Set(samples.map((s) => s.patientCode)).size, sub: 'số BN', tone: 'info' },
        { lbl: 'DV unique', val: new Set(samples.map((s) => s.serviceCode)).size, sub: 'số DV', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm barcode / mã BN / tên / mã phiếu…" />
        <button className="ab-btn ghost" type="button" onClick={() => { setKeyword(''); load(); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        {selected.size > 0 && (
          <button className="ab-btn primary" type="button" onClick={accept}>
            <Ico name="check" size={12} /> Nhận {selected.size} mẫu
          </button>
        )}
      </div>

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

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail?.sampleBarcode || 'Chi tiết mẫu'}
        sub={detail ? `${detail.serviceName} · ${detail.patientName}` : ''}
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
          <button type="button" className="ab-btn ghost" onClick={() => setRejectRow(null)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submitReject} style={{ color: 'var(--a-rd-text)' }}>
            <Ico name="x" size={12} /> Từ chối
          </button>
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
          <button type="button" className="ab-btn ghost" onClick={() => setRunRow(null)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submitRun}>
            <Ico name="check" size={12} /> Lưu KQ
          </button>
        </>}
      >
        <div style={{ marginBottom: 12 }}><StatusBadge tone="warn">Chỉ ghi KQ — chờ người khác duyệt</StatusBadge></div>
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
          <button type="button" className="ab-btn ghost" onClick={() => setReviewRow(null)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submitReview}>
            <Ico name="check" size={12} /> Duyệt
          </button>
        </>}
      >
        <div style={{ marginBottom: 12 }}><StatusBadge tone="crit">Người duyệt phải khác KTV ghi KQ (4-eyes principle)</StatusBadge></div>
        <Form form={reviewForm} layout="vertical">
          <Form.Item label="Kết luận (nếu cần sửa)" name="conclusion">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

const Timeline: React.FC<{ items: { ok?: boolean; fail?: boolean; label: string; time?: string; by?: string; extra?: string }[] }> = ({ items }) => (
  <div>
    {items.map((it, i) => (
      <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', marginTop: 4,
          background: it.fail ? 'var(--a-rd-text)' : it.ok ? 'var(--a-em-text)' : 'var(--t-2)',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{it.label}</div>
          {it.time && <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{dayjs(it.time).format('DD/MM/YYYY HH:mm')}</div>}
          {it.by && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>Người thực hiện: {it.by}</div>}
          {it.extra && <div style={{ fontSize: 12, marginTop: 4, color: it.fail ? 'var(--a-rd-text)' : 'var(--t-1)' }}>{it.extra}</div>}
        </div>
      </div>
    ))}
  </div>
);

export default SampleReceiveV2;
