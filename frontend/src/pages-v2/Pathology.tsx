import React, { useCallback, useEffect, useRef, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { DatePicker, Form, Input, InputNumber, Select } from 'antd';
import {
  getPathologyRequests, getPathologyStatistics, createPathologyResult, printPathologyReport,
} from '../modules/pathology/api/pathology';
import type { PathologyRequest, PathologyStats } from '../modules/pathology/api/pathology';
import { normalizeArrayResponse } from '../utils/apiNormalize';
import {
  SimpleV2Page, StatusBadge, ActBtn, Btn, ModalShell, tk, tw,
  type ColumnDef, type StatusTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

type StatusKey = 'pending' | 'grossing' | 'processing' | 'completed' | 'verified';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'pending',    l: 'Chờ nhận mẫu', tone: 'info' },
  { v: 'grossing',   l: 'Cắt đại thể',  tone: 'warn' },
  { v: 'processing', l: 'Xử lý mô',      tone: 'warn' },
  { v: 'completed',  l: 'Hoàn tất',     tone: 'ok' },
  { v: 'verified',   l: 'Đã duyệt',     tone: 'ok' },
];
const statusKey = (s: number): StatusKey => s === 1 ? 'grossing' : s === 2 ? 'processing' : s === 3 ? 'completed' : s === 4 ? 'verified' : 'pending';
const SPECIMEN_LABEL: Record<string, string> = {
  biopsy: 'Sinh thiết', cytology: 'Tế bào học', pap: 'Pap', frozenSection: 'Cắt lạnh',
};
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const STAINING_OPTIONS = [
  { value: 'HE', label: 'H&E (Hematoxylin-Eosin)' },
  { value: 'PAS', label: 'PAS' },
  { value: 'Giemsa', label: 'Giemsa' },
  { value: 'ZiehlNeelsen', label: 'Ziehl-Neelsen' },
  { value: 'Gram', label: 'Gram' },
  { value: 'Masson', label: 'Masson Trichrome' },
  { value: 'Reticulin', label: 'Reticulin' },
  { value: 'Congo', label: 'Congo Red' },
  { value: 'Iron', label: 'Perls (Iron)' },
  { value: 'Alcian', label: 'Alcian Blue' },
];

const EMPTY_STATS: PathologyStats = {
  totalRequests: 0, pendingCount: 0, completedCount: 0, avgTurnaroundDays: 0, specimenTypeBreakdown: [],
};

/** In phiếu kết quả GPB: tải blob PDF rồi mở tab mới (giữ đúng cách v1). */
const printReport = async (id: string) => {
  try {
    const blob = await printPathologyReport(id);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch {
    tw('Không thể in phiếu kết quả');
  }
};

const PathologyV2: React.FC = () => {
  const [stats, setStats] = useState<PathologyStats>(EMPTY_STATS);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [resultFor, setResultFor] = useState<PathologyRequest | null>(null);
  const reloadRef = useRef<() => void>(() => {});

  // Đổi khoảng ngày → load mới → SimpleV2Page tự reload (deps [load]).
  const load = useCallback(async () => {
    const [reqs, st] = await Promise.all([
      getPathologyRequests({
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      }),
      getPathologyStatistics(),
    ]);
    setStats(st);
    return normalizeArrayResponse<PathologyRequest>(reqs);
  }, [dateRange]);

  const columns: ColumnDef<PathologyRequest>[] = [
    { key: 'code', label: 'Mã GPB', mono: true, width: 130, render: (r) => r.requestCode },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => (
      <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div>
    )},
    { key: 'specimen', label: 'Bệnh phẩm', render: (r) => (
      <div className="cell-2l">
        <b>{SPECIMEN_LABEL[r.specimenType] || r.specimenType}</b>
        <i>{r.specimenSite}</i>
      </div>
    )},
    { key: 'dx', label: 'CĐ lâm sàng', render: (r) => r.clinicalDiagnosis },
    { key: 'doctor', label: 'BS chỉ định', width: 200, render: (r) => r.requestingDoctor || '—' },
    { key: 'date', label: 'Ngày YC', mono: true, width: 100, render: (r) => fmtDMY(r.requestDate) },
    { key: 'priority', label: 'Ưu tiên', width: 90, render: (r) =>
      <span className={`chip ${r.priority === 'urgent' ? 'crit' : 'info'}`}>{r.priority === 'urgent' ? 'Khẩn' : 'Thường'}</span>
    },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const sk = statusKey(r.status);
      return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
    }},
  ];

  return (
    <>
    <SimpleV2Page<PathologyRequest>
      title="Phiếu giải phẫu bệnh"
      load={load}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / mã GPB / chẩn đoán…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.requestCode} ${r.clinicalDiagnosis}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      filters={[{
        key: 'specimen', placeholder: '▾ Loại mẫu',
        options: Object.entries(SPECIMEN_LABEL).map(([v, l]) => ({ v, l })),
        valueOf: (r) => r.specimenType,
      }]}
      toolbarRight={
        <RangePicker
          format="DD/MM/YYYY"
          value={dateRange}
          onChange={(v) => setDateRange(v as [Dayjs, Dayjs] | null)}
          placeholder={['Từ ngày', 'Đến ngày']}
        />
      }
      kpis={(rows) => {
        const urgent = rows.filter((r) => r.priority === 'urgent').length;
        return [
          { lbl: 'Tổng phiếu', val: rows.length },
          { lbl: 'Chờ nhận', val: rows.filter((r) => r.status === 0).length, tone: 'info' },
          { lbl: 'Đang xử lý', val: rows.filter((r) => r.status >= 1 && r.status <= 2).length, tone: 'warn' },
          { lbl: 'Hoàn tất', val: rows.filter((r) => r.status === 3).length, tone: 'ok' },
          { lbl: 'Đã duyệt', val: rows.filter((r) => r.status === 4).length, tone: 'ok' },
          { lbl: 'Khẩn', val: urgent, tone: urgent > 0 ? 'crit' : 'ok' },
          { lbl: 'TAT TB', val: stats.avgTurnaroundDays, unit: 'ngày', sub: `${stats.completedCount} đã trả KQ`, tone: 'info' },
        ];
      }}
      rowActions={(r, reload) => {
        reloadRef.current = reload;
        return (
          <div className="ab-actions">
            {r.status < 3 && (
              <ActBtn ic="edit" title="Nhập kết quả" onClick={() => setResultFor(r)} />
            )}
            {r.status >= 3 && (
              <ActBtn ic="print" title="In phiếu KQ" onClick={() => { void printReport(r.id); }} />
            )}
          </div>
        );
      }}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã BN</span><span className="mono">{r.patientCode}</span>
              <span>Mã GPB</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.requestCode}</span>
              {r.gender && (<><span>Giới tính</span><span>{r.gender === 1 ? 'Nam' : 'Nữ'}</span></>)}
              {r.dateOfBirth && (<><span>Ngày sinh</span><span>{fmtDMY(r.dateOfBirth)}</span></>)}
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="flask" size={11} /> BỆNH PHẨM</h5>
            <div className="rec-kv">
              <span>Loại mẫu</span><b>{SPECIMEN_LABEL[r.specimenType]}</b>
              <span>Vị trí lấy</span><span>{r.specimenSite}</span>
              <span>Ưu tiên</span><span className={`chip ${r.priority === 'urgent' ? 'crit' : 'info'}`}>{r.priority === 'urgent' ? 'Khẩn' : 'Thường'}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="stethoscope" size={11} /> CHỈ ĐỊNH</h5>
            <div className="rec-kv">
              <span>BS chỉ định</span><span>{r.requestingDoctor}</span>
              <span>Khoa</span><span>{r.departmentName || '—'}</span>
              <span>CĐ lâm sàng</span><span>{r.clinicalDiagnosis}</span>
              <span>Ngày YC</span><span>{fmtDMY(r.requestDate)}</span>
            </div>
          </div>
          {r.status >= 3 && (
            <div className="rec-section">
              <Btn variant="primary" icon="print" onClick={() => { void printReport(r.id); }}>In kết quả</Btn>
            </div>
          )}
        </>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{r.requestCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${SPECIMEN_LABEL[r.specimenType]} · ${r.specimenSite}`}
    />

    <ResultModal
      request={resultFor}
      onClose={() => setResultFor(null)}
      onDone={() => { setResultFor(null); reloadRef.current(); }}
    />
    </>
  );
};

/* ──────────────────────────────────────────────────────────
   Modal nhập kết quả GPB — đại thể / vi thể / chẩn đoán / ICD /
   nhuộm / lam-block / IHC / phân tử — gọi createPathologyResult.
   ────────────────────────────────────────────────────────── */

interface ResultFormValues {
  grossDescription: string;
  microscopicDescription: string;
  diagnosis: string;
  icdCode?: string;
  stainingMethods?: string[];
  slideCount?: number;
  blockCount?: number;
  pathologist?: string;
  specialStains?: string;
  immunohistochemistry?: string;
  molecularTests?: string;
}

const ResultModal: React.FC<{
  request: PathologyRequest | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ request, onClose, onDone }) => {
  const [form] = Form.useForm<ResultFormValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (request) form.resetFields();
  }, [request, form]);

  const submit = async () => {
    if (!request) return;
    let values: ResultFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // lỗi validate — antd đã hiển thị dưới từng field
    }
    setSaving(true);
    try {
      await createPathologyResult({ requestId: request.id, ...values });
      tk('Đã lưu kết quả giải phẫu bệnh');
      onDone();
    } catch {
      tw('Không thể lưu kết quả');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={!!request}
      onClose={onClose}
      size="lg"
      title="Nhập kết quả giải phẫu bệnh"
      sub={request ? `${request.requestCode} · ${request.patientName}` : ''}
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" loading={saving} onClick={() => { void submit(); }}>
            Lưu kết quả
          </Btn>
        </>
      )}
    >
      {request && (
        <div style={{ padding: 'var(--space-16)' }}>
          <div style={{
            padding: 'var(--space-12)', background: 'var(--d-1)', borderRadius: 'var(--r-2)', marginBottom: 'var(--space-14)',
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-6)',
          }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>{request.patientName} · {request.patientCode}</span>
            <span className="mono" style={{ fontSize: 'var(--fs-sm)' }}>{request.requestCode}</span>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>{SPECIMEN_LABEL[request.specimenType] || request.specimenType}</span>
            <span style={{ fontSize: 'var(--fs-sm)' }}>{request.specimenSite || '—'}</span>
          </div>
          <Form form={form} layout="vertical">
            <Form.Item
              name="grossDescription"
              label="Mô tả đại thể"
              rules={[{ required: true, message: 'Vui lòng nhập mô tả đại thể' }]}
            >
              <TextArea rows={3} placeholder="Mô tả hình thái, kích thước, màu sắc, mặt cắt mẫu bệnh phẩm..." />
            </Form.Item>
            <Form.Item
              name="microscopicDescription"
              label="Mô tả vi thể"
              rules={[{ required: true, message: 'Vui lòng nhập mô tả vi thể' }]}
            >
              <TextArea rows={3} placeholder="Mô tả cấu trúc mô học dưới kính hiển vi..." />
            </Form.Item>
            <Form.Item
              name="diagnosis"
              label="Chẩn đoán giải phẫu bệnh"
              rules={[{ required: true, message: 'Vui lòng nhập chẩn đoán' }]}
            >
              <TextArea rows={2} placeholder="Kết luận chẩn đoán giải phẫu bệnh..." />
            </Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--space-12)' }}>
              <Form.Item name="icdCode" label="Mã ICD">
                <Input placeholder="VD: C34.1" />
              </Form.Item>
              <Form.Item name="stainingMethods" label="Phương pháp nhuộm">
                <Select mode="multiple" placeholder="Chọn phương pháp nhuộm" options={STAINING_OPTIONS} />
              </Form.Item>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 var(--space-12)' }}>
              <Form.Item name="slideCount" label="Số lam kính">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
              <Form.Item name="blockCount" label="Số block">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
              <Form.Item name="pathologist" label="BS giải phẫu bệnh">
                <Input placeholder="Tên bác sĩ" />
              </Form.Item>
            </div>
            <Form.Item name="specialStains" label="Nhuộm đặc biệt">
              <TextArea rows={2} placeholder="Kết quả nhuộm đặc biệt (nếu có)..." />
            </Form.Item>
            <Form.Item name="immunohistochemistry" label="Hóa mô miễn dịch (IHC)">
              <TextArea rows={2} placeholder="Kết quả IHC: marker, cường độ, tỷ lệ dương tính..." />
            </Form.Item>
            <Form.Item name="molecularTests" label="Xét nghiệm phân tử">
              <TextArea rows={2} placeholder="Kết quả xét nghiệm phân tử/gen (nếu có)..." />
            </Form.Item>
          </Form>
        </div>
      )}
    </ModalShell>
  );
};

export default PathologyV2;
