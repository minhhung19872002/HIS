import React, { useEffect, useState } from 'react';
import { Button, Tag, Form, Input, Select, message } from 'antd';
import {
  KpiStrip, DataTable, StatusTabs, SearchBox, DrawerShell, ModalShell, Filter,
  tk, te, fmtDTg
} from './_v2kit';
import type { ColumnDef } from './_v2kit';
import { hl7QueueApi } from '../api/nangcap24';
import type { Hl7MessageQueueDto } from '../api/nangcap24';

type StatusTab = 'pending' | 'failed' | 'acked' | 'sent';
const STATUS_TABS = [
  { v: 'pending' as const, l: 'Chờ gửi', tone: 'warn' as const },
  { v: 'failed' as const, l: 'Lỗi', tone: 'crit' as const },
  { v: 'sent' as const, l: 'Đã gửi', tone: 'info' as const },
  { v: 'acked' as const, l: 'Đã ACK', tone: 'ok' as const },
];

const Hl7MessageQueue: React.FC = () => {
  const [rows, setRows] = useState<Hl7MessageQueueDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [stab, setStab] = useState<StatusTab | 'all'>('all');
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('');
  const [counts, setCounts] = useState({ pending: 0, failed: 0, acked: 0, total: 0 });
  const [detail, setDetail] = useState<Hl7MessageQueueDto | null>(null);
  const [enqueueModal, setEnqueueModal] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const r = await hl7QueueApi.search({
        status: stab === 'all' ? undefined : stab,
        direction: direction || undefined,
        pageIndex: 1,
        pageSize: 100,
      });
      setRows(r.items);
      setCounts({ pending: r.pendingCount, failed: r.failedCount, acked: r.ackedCount, total: r.totalCount });
    } catch {
      te('Không tải được queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [stab, direction]);

  const filtered = rows.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.messageControlId.toLowerCase().includes(s) ||
           r.messageType.toLowerCase().includes(s) ||
           r.sourceSystem.toLowerCase().includes(s) ||
           r.targetSystem.toLowerCase().includes(s);
  });

  const kpis = [
    { lbl: 'Tổng message', val: counts.total },
    { lbl: 'Chờ gửi', val: counts.pending, tone: 'warn' as const },
    { lbl: 'Đã ACK', val: counts.acked, tone: 'ok' as const },
    { lbl: 'Lỗi', val: counts.failed, tone: 'crit' as const },
  ];

  const handleRetry = async (id: string) => {
    try {
      await hl7QueueApi.retry(id);
      tk('Đã gửi lại');
      load();
    } catch {
      te('Gửi lại thất bại');
    }
  };

  const handleRetryAll = async () => {
    try {
      const r = await hl7QueueApi.retryAllFailed();
      message.success(`Retry ${r.retried} message, thành công ${r.succeededImmediately}, vẫn lỗi ${r.stillFailed}`);
      load();
    } catch {
      te('Retry batch thất bại');
    }
  };

  const handleEnqueue = async () => {
    try {
      const values = await form.validateFields();
      await hl7QueueApi.demoEnqueue(values);
      tk('Đã thêm message vào queue');
      setEnqueueModal(false);
      form.resetFields();
      load();
    } catch {
      te('Thêm queue thất bại');
    }
  };

  const columns: ColumnDef<Hl7MessageQueueDto>[] = [
    { key: 'ctrl', label: 'Control ID', code: true, render: r => r.messageControlId },
    {
      key: 'dir', label: 'Hướng', render: r => (
        <Tag color={r.direction === 'outbound' ? 'blue' : 'purple'}>
          {r.direction === 'outbound' ? '→ Gửi' : '← Nhận'}
        </Tag>
      )
    },
    { key: 'src-tgt', label: 'Source → Target', render: r => `${r.sourceSystem} → ${r.targetSystem}` },
    { key: 'type', label: 'Loại MSG', code: true, render: r => r.messageType },
    {
      key: 'status', label: 'Trạng thái', render: r => {
        const tones: Record<string, string> = {
          pending: '#f59e0b',
          retrying: '#f59e0b',
          sending: '#0ea5e9',
          sent: '#16a34a',
          acked: '#16a34a',
          failed: '#ef4444'
        };
        return <span style={{ color: tones[r.status] ?? '#64748b', fontWeight: 600 }}>{r.status}</span>;
      }
    },
    { key: 'retry', label: 'Retry', mono: true, render: r => `${r.retryCount}/${r.maxRetries}` },
    { key: 'last', label: 'Lần thử cuối', render: r => r.lastTryAt ? fmtDTg(r.lastTryAt) : '-' },
    { key: 'next', label: 'Retry tiếp', render: r => r.nextRetryAt ? fmtDTg(r.nextRetryAt) : '-' },
  ];

  return (
    <div className="ab-stack">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm Control ID, MSG type, system..." />
        <Filter
          value={direction}
          onChange={setDirection}
          options={[
            { v: '', l: 'Tất cả hướng' },
            { v: 'outbound', l: 'Outbound (gửi)' },
            { v: 'inbound', l: 'Inbound (nhận)' },
          ]}
        />
        <Button type="primary" danger onClick={handleRetryAll} data-testid="retry-all-btn">Gửi lại tất cả lỗi</Button>
        <Button onClick={() => setEnqueueModal(true)} data-testid="enqueue-demo-btn">Thêm demo message</Button>
        <Button onClick={load} loading={loading}>Tải lại</Button>
      </div>

      <StatusTabs
        value={stab}
        onChange={setStab}
        tabs={STATUS_TABS}
        counts={{
          all: counts.total,
          pending: counts.pending,
          failed: counts.failed,
          sent: rows.filter(r => r.status === 'sent').length,
          acked: counts.acked,
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={r => r.id}
        onRowClick={async r => {
          const full = await hl7QueueApi.getById(r.id);
          setDetail(full);
        }}
        actions={r => r.status === 'failed' || r.status === 'pending' ? (
          <button className="ab-iconbtn" onClick={(e) => { e.stopPropagation(); handleRetry(r.id); }}>Gửi lại</button>
        ) : null}
      />

      <DrawerShell open={!!detail} onClose={() => setDetail(null)} title={detail?.messageControlId ?? ''} sub={detail?.messageType}>
        {detail && (
          <>
            <div className="rec-section">
              <div className="rec-kv">
                <div className="lbl">Source:</div><div>{detail.sourceSystem}</div>
                <div className="lbl">Target:</div><div>{detail.targetSystem}</div>
                <div className="lbl">Endpoint:</div><div className="mono" style={{ fontSize: 11 }}>{detail.endpoint || '-'}</div>
                <div className="lbl">Trạng thái:</div><div>{detail.status}</div>
                <div className="lbl">Retry:</div><div>{detail.retryCount}/{detail.maxRetries}</div>
                <div className="lbl">Tạo lúc:</div><div>{fmtDTg(detail.createdAt)}</div>
                <div className="lbl">Lần thử đầu:</div><div>{detail.firstTryAt ? fmtDTg(detail.firstTryAt) : '-'}</div>
                <div className="lbl">Lần thử cuối:</div><div>{detail.lastTryAt ? fmtDTg(detail.lastTryAt) : '-'}</div>
              </div>
            </div>
            {detail.errorMessage && (
              <div style={{ marginTop: 12, padding: 10, background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
                <strong>Lỗi:</strong> {detail.errorMessage}
              </div>
            )}
            {detail.payload && (
              <>
                <div style={{ marginTop: 16, fontWeight: 600 }}>Payload HL7:</div>
                <pre style={{ background: 'var(--bg-2)', padding: 12, fontSize: 11, fontFamily: 'var(--font-mono)', overflow: 'auto', maxHeight: 300 }}>
                  {detail.payload}
                </pre>
              </>
            )}
          </>
        )}
      </DrawerShell>

      <ModalShell
        open={enqueueModal}
        onClose={() => { setEnqueueModal(false); form.resetFields(); }}
        title="Thêm demo message vào queue"
        footer={(
          <>
            <Button onClick={() => { setEnqueueModal(false); form.resetFields(); }}>Hủy</Button>
            <Button type="primary" onClick={handleEnqueue}>Thêm</Button>
          </>
        )}
      >
        <Form form={form} layout="vertical" initialValues={{ direction: 'outbound', source: 'HIS', target: 'RIS', messageType: 'ORM^O01' }}>
          <Form.Item name="direction" label="Hướng">
            <Select options={[{ value: 'outbound', label: 'Outbound' }, { value: 'inbound', label: 'Inbound' }]} />
          </Form.Item>
          <Form.Item name="source" label="Source">
            <Input />
          </Form.Item>
          <Form.Item name="target" label="Target">
            <Input />
          </Form.Item>
          <Form.Item name="messageType" label="Message Type">
            <Select options={['ADT^A04', 'ADT^A08', 'ORM^O01', 'ORU^R01', 'MDM^T02', 'RDE^O11'].map(v => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="payload" label="HL7 Payload">
            <Input.TextArea rows={5} placeholder="MSH|^~\&|HIS|HOSPITAL|RIS|HOSPITAL|..." />
          </Form.Item>
          <Form.Item name="endpoint" label="Endpoint">
            <Input placeholder="tcp://ris.host:2575 hoặc https://ris/hl7" />
          </Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default Hl7MessageQueue;
