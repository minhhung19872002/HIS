import React, { useCallback, useState } from 'react';
import { Alert, Form, Input, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import {
  getConnections,
  saveConnection,
  deleteConnection,
  testConnection,
  checkMissingForms,
  type HisConnectionDto,
  type SaveHisConnectionDto,
  type MissingFormsCheckResultDto,
} from '../api/hisConnector';
import {
  SimpleV2Page,
  StatusBadge,
  ActBtn,
  ModalShell,
  Btn,
  DrSec,
  DrField,
  te,
  ti,
  type ColumnDef,
  type StatusTab,
  type KpiItem,
} from '../../../pages-v2/_v2kit';

// ─── Status tabs ─────────────────────────────────────────────────────────────

type ConnKey = 'active' | 'inactive';
const STATUS_TABS: StatusTab<ConnKey>[] = [
  { v: 'active',   l: 'Đang hoạt động', tone: 'ok' },
  { v: 'inactive', l: 'Vô hiệu hoá',    tone: 'crit' },
];
const statusKey = (c: HisConnectionDto): ConnKey =>
  c.isActive ? 'active' : 'inactive';

const statusTone = (s?: string): 'ok' | 'crit' | 'info' =>
  s === 'Online' ? 'ok' : s === 'Offline' ? 'crit' : 'info';

// ─── Modal Form CRUD ──────────────────────────────────────────────────────────

const AUTH_TYPES = ['ApiKey', 'Bearer', 'Basic', 'None'];

interface ConnectionFormProps {
  open: boolean;
  initial?: HisConnectionDto | null;
  onClose: () => void;
  onSaved: () => void;
}

const ConnectionForm: React.FC<ConnectionFormProps> = ({ open, initial, onClose, onSaved }) => {
  const [form] = Form.useForm<SaveHisConnectionDto>();
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(initial?.id);

  React.useEffect(() => {
    if (open) {
      form.setFieldsValue(initial ?? {
        name: '', baseUrl: '', provider: '', authType: 'ApiKey',
        apiKeyRef: '', isActive: true, notes: '',
      });
    }
  }, [open, initial, form]);

  const handleOk = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      await saveConnection({ ...vals, id: initial?.id });
      ti(isEdit ? 'Cập nhật thành công' : 'Thêm kết nối thành công');
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return; // validation only
      te('Lưu thất bại — kiểm tra console');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={isEdit ? `Sửa kết nối — ${initial?.name}` : 'Thêm kết nối HIS mới'}
      size="md"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" loading={saving} onClick={handleOk}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo kết nối'}
          </Btn>
        </div>
      }
    >
      <Form form={form} layout="vertical" style={{ padding: '4px 0' }}>
        <Form.Item name="name" label="Tên kết nối" rules={[{ required: true, message: 'Bắt buộc' }]}>
          <Input placeholder="VD: BV Huyện B - HIS VNPT" />
        </Form.Item>
        <Form.Item name="provider" label="Nhà cung cấp (NCC)">
          <Input placeholder="VNPT / Viettel / Custom…" />
        </Form.Item>
        <Form.Item name="baseUrl" label="Base URL" rules={[
          { required: true, message: 'Bắt buộc' },
          { type: 'url', message: 'Phải là URL hợp lệ (https://...)' },
        ]}>
          <Input placeholder="https://his.hospital-b.vn/api" />
        </Form.Item>
        <Form.Item name="authType" label="Kiểu xác thực">
          <Select options={AUTH_TYPES.map(t => ({ value: t, label: t }))} allowClear />
        </Form.Item>
        <Form.Item
          name="apiKeyRef"
          label="ApiKey Ref"
          tooltip="Tên key trong SystemConfig trỏ tới secret. KHÔNG nhập secret trực tiếp vào đây."
        >
          <Input placeholder="VD: HisConn_HospitalB_ApiKey" />
        </Form.Item>
        <Form.Item name="notes" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Mô tả, lý do vô hiệu…" />
        </Form.Item>
        <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
          <Switch checkedChildren="Hoạt động" unCheckedChildren="Vô hiệu" />
        </Form.Item>
      </Form>
    </ModalShell>
  );
};

// ─── Modal kiểm thiếu phiếu ───────────────────────────────────────────────────

interface MissingFormsModalProps {
  open: boolean;
  onClose: () => void;
}

const MissingFormsModal: React.FC<MissingFormsModalProps> = ({ open, onClose }) => {
  const [fromDate, setFromDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [encType, setEncType] = useState<'OPD' | 'IPD' | ''>('');
  const [result, setResult] = useState<MissingFormsCheckResultDto | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const r = await checkMissingForms(fromDate, toDate, encType || undefined);
      setResult(r);
    } catch {
      te('Kiểm tra thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Kiểm thiếu tờ phiếu bắt buộc"
      size="lg"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <Btn variant="primary" loading={loading} onClick={run}>Kiểm tra</Btn>
        </div>
      }
    >
      <div style={{ display: 'flex', gap: 'var(--space-12)', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 'var(--space-16)' }}>
        <div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Từ ngày</div>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{ border: '1px solid var(--b-1)', borderRadius: 4, padding: '4px 8px' }}
          />
        </div>
        <div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Đến ngày</div>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{ border: '1px solid var(--b-1)', borderRadius: 4, padding: '4px 8px' }}
          />
        </div>
        <div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Loại đợt</div>
          <Select
            value={encType}
            onChange={setEncType}
            style={{ width: 120 }}
            options={[
              { value: '', label: 'Tất cả' },
              { value: 'OPD', label: 'Ngoại trú' },
              { value: 'IPD', label: 'Nội trú' },
            ]}
          />
        </div>
      </div>

      {result && (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-16)', marginBottom: 'var(--space-12)' }}>
            <div className="ab-kpi info">
              <div className="lbl">Đã kiểm</div>
              <div className="val">{result.totalEncountersChecked}</div>
            </div>
            <div className={`ab-kpi ${result.encountersWithMissingForms > 0 ? 'crit' : 'ok'}`}>
              <div className="lbl">Thiếu phiếu</div>
              <div className="val">{result.encountersWithMissingForms}</div>
            </div>
          </div>

          {result.items.length === 0 ? (
            <Alert title="Không có đợt nào thiếu tờ phiếu bắt buộc" type="success" showIcon />
          ) : (
            <table style={{ width: '100%', fontSize: 'var(--fs-md)', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-2)', color: 'var(--t-2)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Loại</th>
                  <th style={{ padding: '6px 8px' }}>Mã BN</th>
                  <th style={{ padding: '6px 8px' }}>Tên BN</th>
                  <th style={{ padding: '6px 8px' }}>Ngày đợt</th>
                  <th style={{ padding: '6px 8px' }}>Phiếu còn thiếu</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.encounterId} style={{ borderBottom: '1px solid var(--b-1)' }}>
                    <td style={{ padding: '5px 8px' }}>
                      <StatusBadge tone={item.encounterType === 'OPD' ? 'info' : 'warn'}>
                        {item.encounterType}
                      </StatusBadge>
                    </td>
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace' }}>{item.patientCode || '—'}</td>
                    <td style={{ padding: '5px 8px' }}>{item.patientName || '—'}</td>
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontSize: 'var(--fs-sm)' }}>
                      {item.encounterDate ? dayjs(item.encounterDate).format('DD/MM/YYYY') : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', color: 'var(--s-crit)' }}>
                      {item.missingFormNames.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-3)', marginTop: 'var(--space-8)' }}>
            Rule: {result.ruleDescription}
          </div>
        </>
      )}
    </ModalShell>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const HisConnectionsPage: React.FC = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<HisConnectionDto | null>(null);
  const [missingOpen, setMissingOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const data = await getConnections();
    return data;
  }, [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = () => setReloadKey(k => k + 1);

  const handleTest = async (item: HisConnectionDto) => {
    setTestingId(item.id);
    try {
      const r = await testConnection(item.id);
      if (r.status === 'Online') {
        ti(`${item.name}: Online${r.isMock ? ' (MockMode)' : ` — ${r.latencyMs}ms`}`);
      } else {
        te(`${item.name}: Offline — ${r.errorMessage || 'Không kết nối được'}`);
      }
      reload();
    } catch {
      te('Kiểm tra kết nối thất bại');
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (item: HisConnectionDto) => {
    if (!window.confirm(`Xoá kết nối "${item.name}"?`)) return;
    await deleteConnection(item.id);
    ti('Đã xoá');
    reload();
  };

  const columns: ColumnDef<HisConnectionDto>[] = [
    {
      key: 'name', label: 'Tên kết nối',
      render: (c) => <strong>{c.name}</strong>,
    },
    {
      key: 'provider', label: 'NCC',
      render: (c) => c.provider || <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'baseUrl', label: 'Base URL', mono: true,
      render: (c) => (
        <span style={{ fontSize: 'var(--fs-sm)', maxWidth: 220, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.baseUrl}
        </span>
      ),
    },
    {
      key: 'authType', label: 'Auth',
      render: (c) => c.authType
        ? <StatusBadge tone="info">{c.authType}</StatusBadge>
        : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'lastStatus', label: 'Trạng thái ping',
      render: (c) => c.lastStatus
        ? <StatusBadge tone={statusTone(c.lastStatus)}>{c.lastStatus}</StatusBadge>
        : <span style={{ color: 'var(--t-3)' }}>Chưa test</span>,
    },
    {
      key: 'lastCheckedAt', label: 'Ping cuối', mono: true,
      render: (c) => c.lastCheckedAt
        ? dayjs(c.lastCheckedAt).format('DD/MM HH:mm')
        : '—',
    },
    {
      key: '_actions', label: '',
      render: (c) => (
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <ActBtn
            ic="link"
            title="Test kết nối"
            loading={testingId === c.id}
            onClick={() => handleTest(c)}
          />
          <ActBtn
            ic="edit"
            title="Sửa"
            onClick={() => { setEditItem(c); setFormOpen(true); }}
          />
          <ActBtn
            ic="trash"
            title="Xoá"
            tone="crit"
            onClick={() => handleDelete(c)}
          />
        </div>
      ),
    },
  ];

  const kpis = (rows: HisConnectionDto[]): KpiItem[] => [
    { lbl: 'Tổng kết nối',    val: rows.length },
    { lbl: 'Đang hoạt động',  val: rows.filter(r => r.isActive).length,                               tone: 'ok' },
    { lbl: 'Online',          val: rows.filter(r => r.lastStatus === 'Online').length,                 tone: 'ok' },
    { lbl: 'Offline',         val: rows.filter(r => r.lastStatus === 'Offline').length,                tone: 'crit' },
    { lbl: 'Chưa test',       val: rows.filter(r => !r.lastStatus || r.lastStatus === 'Unknown').length, tone: 'info' },
  ];

  return (
    <>
      <SimpleV2Page<HisConnectionDto>
        key={reloadKey}
        title="Kết nối HIS đa NCC"
        load={load}
        rowKey={(c) => c.id}
        columns={columns}
        searchPlaceholder="Tìm tên / NCC / URL…"
        searchOf={(c) => `${c.name} ${c.provider ?? ''} ${c.baseUrl}`}
        statusTabs={STATUS_TABS}
        statusOf={statusKey}
        kpis={kpis}
        pageSize={20}
        emptyMessage="Chưa có kết nối nào — nhấn + để thêm"
        toolbarRight={
          <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
            <Btn
              variant="ghost"
              icon="check-circle"
              onClick={() => setMissingOpen(true)}
            >
              Kiểm thiếu phiếu
            </Btn>
            <Btn
              variant="primary"
              icon="plus"
              onClick={() => { setEditItem(null); setFormOpen(true); }}
            >
              Thêm kết nối
            </Btn>
          </div>
        }
        drawerTitle={(c) => c.name}
        drawerSub={(c) => `${c.provider ?? 'Custom'} · ${c.isActive ? 'Hoạt động' : 'Vô hiệu'}`}
        drawer={(c) => (
          <>
            <DrSec title="Thông tin kết nối">
              <DrField lbl="Tên">{c.name}</DrField>
              <DrField lbl="NCC">{c.provider || '—'}</DrField>
              <DrField lbl="Base URL">
                <span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-sm)', wordBreak: 'break-all' }}>
                  {c.baseUrl}
                </span>
              </DrField>
              <DrField lbl="Auth">{c.authType || 'None'}</DrField>
              <DrField lbl="ApiKey Ref">{c.apiKeyRef || '—'}</DrField>
              {c.notes && <DrField lbl="Ghi chú">{c.notes}</DrField>}
            </DrSec>
            <DrSec title="Trạng thái">
              <DrField lbl="Ping cuối">
                {c.lastCheckedAt
                  ? dayjs(c.lastCheckedAt).format('DD/MM/YYYY HH:mm:ss')
                  : 'Chưa test'}
              </DrField>
              <DrField lbl="Kết quả ping">
                {c.lastStatus
                  ? <StatusBadge tone={statusTone(c.lastStatus)}>{c.lastStatus}</StatusBadge>
                  : '—'}
              </DrField>
              <DrField lbl="Kích hoạt">
                <StatusBadge tone={c.isActive ? 'ok' : 'crit'}>
                  {c.isActive ? 'Hoạt động' : 'Vô hiệu'}
                </StatusBadge>
              </DrField>
            </DrSec>
          </>
        )}
      />

      <ConnectionForm
        open={formOpen}
        initial={editItem}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
      />

      <MissingFormsModal
        open={missingOpen}
        onClose={() => setMissingOpen(false)}
      />
    </>
  );
};

export default HisConnectionsPage;
