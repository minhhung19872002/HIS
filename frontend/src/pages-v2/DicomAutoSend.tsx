import React, { useEffect, useState, useMemo } from 'react';
import { Form, Input, Button, Select, Switch, InputNumber, DatePicker, Tag } from 'antd';
import dayjs from 'dayjs';
import {
  KpiStrip, TopTabs, DataTable, DrawerShell, ModalShell,
  tk, te, fmtDTg
} from './_v2kit';
import type { ColumnDef } from './_v2kit';
import { dicomAutoSendApi } from '../api/nangcap24';
import type { DicomAutoSendRuleDto, DicomTransmissionLogDto, DicomTransmissionStatsDto } from '../api/nangcap24';
import apiClient from '../api/client';

type Tab = 'rules' | 'transmissions' | 'stats';

const TABS = [
  { v: 'rules' as const, l: 'Quy tắc tự động gửi' },
  { v: 'transmissions' as const, l: 'Lịch sử gửi' },
  { v: 'stats' as const, l: 'Thống kê' },
];

interface RemoteServerDto { id: string; name: string; aeTitle: string; host: string; port: number; isActive: boolean; }

const DicomAutoSend: React.FC = () => {
  const [tab, setTab] = useState<Tab>('rules');
  const [rules, setRules] = useState<DicomAutoSendRuleDto[]>([]);
  const [transmissions, setTransmissions] = useState<DicomTransmissionLogDto[]>([]);
  const [stats, setStats] = useState<DicomTransmissionStatsDto | null>(null);
  const [servers, setServers] = useState<RemoteServerDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [ruleModal, setRuleModal] = useState<DicomAutoSendRuleDto | 'new' | null>(null);
  const [form] = Form.useForm();
  const [fromDate, setFromDate] = useState(dayjs().subtract(7, 'day'));
  const [toDate, setToDate] = useState(dayjs());
  const [transmissionDetail, setTransmissionDetail] = useState<DicomTransmissionLogDto | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [rs, ss, ts, st] = await Promise.all([
        dicomAutoSendApi.listRules(),
        apiClient.get<RemoteServerDto[]>('/RISComplete/dicom/remote-servers').then(r => r.data).catch(() => []),
        dicomAutoSendApi.searchTransmissions(undefined, undefined, undefined, 1, 100),
        dicomAutoSendApi.getStats(fromDate.toISOString(), toDate.toISOString()),
      ]);
      setRules(rs);
      setServers(ss);
      setTransmissions(ts);
      setStats(st);
    } catch {
      te('Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const kpis = [
    { lbl: 'Quy tắc đang hoạt động', val: rules.filter(r => r.isActive).length },
    { lbl: 'Tổng giao dịch gửi', val: stats?.totalTransmissions ?? 0 },
    { lbl: 'Thành công', val: stats?.successCount ?? 0, tone: 'ok' as const },
    { lbl: 'Mã hóa AES-256', val: stats?.encryptedCount ?? 0, sub: 'AES-256-GCM' },
  ];

  const openCreateRule = () => {
    form.resetFields();
    form.setFieldsValue({ encryptBeforeSend: true, triggerType: 'on_arrival', priority: 5, isActive: true });
    setRuleModal('new');
  };

  const openEditRule = (r: DicomAutoSendRuleDto) => {
    form.setFieldsValue(r);
    setRuleModal(r);
  };

  const handleSaveRule = async () => {
    try {
      const values = await form.validateFields();
      if (ruleModal === 'new') {
        await dicomAutoSendApi.createRule(values);
        tk('Đã tạo quy tắc');
      } else if (ruleModal && typeof ruleModal === 'object') {
        await dicomAutoSendApi.updateRule(ruleModal.id, values);
        tk('Đã cập nhật quy tắc');
      }
      setRuleModal(null);
      loadAll();
    } catch {
      te('Lưu thất bại');
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await dicomAutoSendApi.deleteRule(id);
      tk('Đã xóa quy tắc');
      loadAll();
    } catch {
      te('Xóa thất bại');
    }
  };

  const triggerNow = async () => {
    try {
      const result = await dicomAutoSendApi.triggerCheck();
      tk(`Đã trigger ${result.triggered} ca`);
      loadAll();
    } catch {
      te('Trigger thất bại');
    }
  };

  const reloadStats = async () => {
    try {
      const st = await dicomAutoSendApi.getStats(fromDate.toISOString(), toDate.toISOString());
      setStats(st);
    } catch {
      te('Không tải được thống kê');
    }
  };

  // ─── Rules columns ───
  const rulesCols: ColumnDef<DicomAutoSendRuleDto>[] = [
    { key: 'name', label: 'Tên quy tắc', render: r => <strong>{r.ruleName}</strong> },
    { key: 'modality', label: 'Modality', render: r => r.modality ? <Tag>{r.modality}</Tag> : <Tag color="default">Tất cả</Tag> },
    { key: 'dest', label: 'Server đích', render: r => r.destinationName },
    { key: 'encrypt', label: 'Mã hóa', render: r => r.encryptBeforeSend ? <Tag color="green">AES-256</Tag> : <Tag>Không</Tag> },
    { key: 'trigger', label: 'Trigger', render: r => r.triggerType === 'on_arrival' ? 'Tự động khi nhận' : r.triggerType === 'scheduled' ? `Định kỳ (${r.scheduleCron})` : 'Thủ công' },
    { key: 'priority', label: 'Ưu tiên', mono: true, render: r => `${r.priority}` },
    { key: 'active', label: 'Trạng thái', render: r => r.isActive ? <Tag color="green">Hoạt động</Tag> : <Tag>Tạm dừng</Tag> },
    { key: 'count', label: 'Lần kích hoạt', mono: true, render: r => `${r.timesTriggered}` },
  ];

  // ─── Transmissions columns ───
  const txnsCols: ColumnDef<DicomTransmissionLogDto>[] = [
    { key: 'study', label: 'Study UID', code: true, render: r => r.studyInstanceUid.slice(-20) },
    { key: 'dest', label: 'Đích', render: r => r.destinationName },
    {
      key: 'trigger', label: 'Loại', render: r => {
        const c = r.triggerType === 'auto' ? 'blue' : r.triggerType === 'scheduled' ? 'purple' : 'default';
        return <Tag color={c}>{r.triggerType === 'auto' ? 'Tự động' : r.triggerType === 'scheduled' ? 'Định kỳ' : 'Thủ công'}</Tag>;
      }
    },
    { key: 'instances', label: 'Số ảnh', mono: true, render: r => `${r.instanceCount}` },
    { key: 'bytes', label: 'Dung lượng', mono: true, render: r => `${(r.totalBytes / 1024 / 1024).toFixed(1)} MB` },
    { key: 'enc', label: 'Mã hóa', render: r => r.wasEncrypted ? <Tag color="green">{r.encryptionAlgorithm}</Tag> : <Tag>Không</Tag> },
    {
      key: 'status', label: 'Trạng thái', render: r => {
        const tone = r.status === 'done' ? '#16a34a' : r.status === 'failed' ? '#ef4444' : '#f59e0b';
        return <span style={{ color: tone, fontWeight: 600 }}>{r.status}</span>;
      }
    },
    { key: 'duration', label: 'Thời gian (ms)', mono: true, render: r => `${r.durationMs}` },
    { key: 'started', label: 'Bắt đầu', render: r => fmtDTg(r.startedAt) },
  ];

  const byDestRows = useMemo(() => stats?.byDestination ?? [], [stats]);
  const byDayRows = useMemo(() => stats?.byDay ?? [], [stats]);

  return (
    <div className="ab-stack">
      <KpiStrip items={kpis} />
      <TopTabs tab={tab} setTab={setTab} tabs={TABS} />

      {tab === 'rules' && (
        <>
          <div className="ab-tools">
            <Button type="primary" onClick={openCreateRule} data-testid="create-rule-btn">+ Thêm quy tắc</Button>
            <Button onClick={triggerNow}>Trigger ngay</Button>
            <Button onClick={loadAll} loading={loading}>Tải lại</Button>
          </div>
          <DataTable
            columns={rulesCols}
            data={rules}
            rowKey={r => r.id}
            onRowClick={r => openEditRule(r)}
            actions={r => (
              <button className="ab-iconbtn" onClick={(e) => { e.stopPropagation(); handleDeleteRule(r.id); }}>Xóa</button>
            )}
          />
        </>
      )}

      {tab === 'transmissions' && (
        <>
          <div className="ab-tools">
            <Button onClick={loadAll}>Tải lại</Button>
          </div>
          <DataTable
            columns={txnsCols}
            data={transmissions}
            rowKey={r => r.id}
            onRowClick={r => setTransmissionDetail(r)}
          />
        </>
      )}

      {tab === 'stats' && stats && (
        <>
          <div className="ab-tools">
            <DatePicker value={fromDate} onChange={d => setFromDate(d!)} format="DD/MM/YYYY" />
            <DatePicker value={toDate} onChange={d => setToDate(d!)} format="DD/MM/YYYY" />
            <Button type="primary" onClick={reloadStats}>Lọc</Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="panel">
              <div className="panel-h">Theo điểm đích</div>
              <div className="panel-body">
                <table className="tbl">
                  <thead><tr><th>Đích</th><th>Số ca</th><th>Dung lượng</th></tr></thead>
                  <tbody>
                    {byDestRows.map((b) => (
                      <tr key={b.destinationName}>
                        <td>{b.destinationName}</td>
                        <td className="mono">{b.count}</td>
                        <td className="mono">{(b.bytes / 1024 / 1024).toFixed(1)} MB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="panel">
              <div className="panel-h">Theo ngày</div>
              <div className="panel-body">
                <table className="tbl">
                  <thead><tr><th>Ngày</th><th>Số ca</th><th>Dung lượng</th></tr></thead>
                  <tbody>
                    {byDayRows.map((d) => (
                      <tr key={d.date}>
                        <td>{dayjs(d.date).format('DD/MM/YYYY')}</td>
                        <td className="mono">{d.count}</td>
                        <td className="mono">{(d.bytes / 1024 / 1024).toFixed(1)} MB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      <DrawerShell open={!!transmissionDetail} onClose={() => setTransmissionDetail(null)} title={transmissionDetail?.studyInstanceUid ?? ''}>
        {transmissionDetail && (
          <div className="rec-section">
            <div className="rec-kv">
              <div className="lbl">Server đích:</div><div>{transmissionDetail.destinationName}</div>
              <div className="lbl">Số ảnh:</div><div>{transmissionDetail.instanceCount}</div>
              <div className="lbl">Dung lượng:</div><div>{(transmissionDetail.totalBytes / 1024 / 1024).toFixed(2)} MB</div>
              <div className="lbl">Mã hóa:</div><div>{transmissionDetail.wasEncrypted ? transmissionDetail.encryptionAlgorithm : 'Không'}</div>
              <div className="lbl">Thời gian:</div><div>{transmissionDetail.durationMs} ms</div>
              <div className="lbl">Người trigger:</div><div>{transmissionDetail.triggeredByUserName ?? '(System auto)'}</div>
            </div>
            {transmissionDetail.errorMessage && (
              <div style={{ marginTop: 12, padding: 10, background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
                {transmissionDetail.errorMessage}
              </div>
            )}
          </div>
        )}
      </DrawerShell>

      <ModalShell
        open={!!ruleModal}
        onClose={() => setRuleModal(null)}
        title={ruleModal === 'new' ? 'Tạo quy tắc tự động gửi' : 'Sửa quy tắc'}
        footer={(
          <>
            <Button onClick={() => setRuleModal(null)}>Hủy</Button>
            <Button type="primary" onClick={handleSaveRule}>Lưu</Button>
          </>
        )}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="ruleName" label="Tên quy tắc" rules={[{ required: true }]}>
            <Input placeholder="VD: Auto gửi CT từ Toshiba sang Cloud-PACS" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="modality" label="Modality">
              <Select allowClear options={['CT', 'MR', 'CR', 'DX', 'US', 'XA', 'MG', 'NM', 'PT'].map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item name="sourceAeTitle" label="Source AE Title">
              <Input placeholder="VD: TOSHIBA_CT01" />
            </Form.Item>
            <Form.Item name="destinationServerId" label="Server đích" rules={[{ required: true }]}>
              <Select options={servers.map(s => ({ value: s.id, label: `${s.name} (${s.aeTitle})` }))} />
            </Form.Item>
            <Form.Item name="triggerType" label="Loại trigger">
              <Select options={[
                { value: 'on_arrival', label: 'Tự động khi nhận' },
                { value: 'scheduled', label: 'Định kỳ (cron)' },
                { value: 'manual', label: 'Thủ công' },
              ]} />
            </Form.Item>
            <Form.Item name="priority" label="Ưu tiên (1=cao)">
              <InputNumber min={1} max={10} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="encryptBeforeSend" valuePropName="checked" label="Mã hóa">
              <Switch checkedChildren="AES-256" unCheckedChildren="Không" />
            </Form.Item>
          </div>
          <Form.Item name="scheduleCron" label="Cron expression (chỉ khi định kỳ)">
            <Input placeholder="0 0 2 * * *" />
          </Form.Item>
          <Form.Item name="isActive" valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" />
          </Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default DicomAutoSend;
