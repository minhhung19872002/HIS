/**
 * NangCap24 — HL7 Message Queue v2 (port từ mod-hl7-message-queue.jsx)
 *
 * Queue HL7 messages giữa RIS/LIS/HIS · retry workflow.
 * KPI + StatusTabs (6) + DataTable + Drawer payload + Modal enqueue.
 */
import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Button } from 'antd';
import {
  KpiStrip, DataTable, StatusTabs, SearchBox, DrawerShell, ModalShell,
  Filter, Pager, ActBtn, StatusBadge, DrSec, DrField,
  tk, ti, te, fmtDTg, fmtHMg,
} from './_v2kit';
import type { ColumnDef } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import { hl7QueueApi } from '../api/nangcap24';
import type { Hl7MessageQueueDto } from '../api/nangcap24';

const HL7Q_STATUS = [
  { v: 'pending'  as const, l: 'Chờ gửi',    tone: 'warn' as const },
  { v: 'retrying' as const, l: 'Đang retry', tone: 'warn' as const },
  { v: 'sending'  as const, l: 'Đang gửi',   tone: 'info' as const },
  { v: 'sent'     as const, l: 'Đã gửi',     tone: 'info' as const },
  { v: 'acked'    as const, l: 'Đã ACK',     tone: 'ok'   as const },
  { v: 'failed'   as const, l: 'Lỗi',        tone: 'crit' as const },
];
type Hl7StatusKey = (typeof HL7Q_STATUS)[number]['v'];

const SYSTEMS = ['HIS', 'RIS', 'LIS', 'PACS', 'BHXH'];
const MSG_TYPES = ['ADT^A04', 'ADT^A08', 'ORM^O01', 'ORU^R01', 'MDM^T02', 'RDE^O11', 'DFT^P03'];
const PER = 18;

const DEMO_PAYLOAD = `MSH|^~\\&|HIS|BVHUNGYEN|RIS|BVHUNGYEN|20261018142235||ORM^O01^ORM_O01|MSG-1018-00742|P|2.5
PID|1||BN-2026-018834||NGUYỄN^VĂN AN||19720815|M
ORC|NW|ORD-2026-14772|||||||20261018142000
OBR|1|ORD-2026-14772||XQ-NGUC-T^X-Quang ngực thẳng^LIS|||20261018142000`;

const Hl7MessageQueue: React.FC = () => {
  const [rows, setRows] = useState<Hl7MessageQueueDto[]>([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, failed: 0, acked: 0 });
  const [loading, setLoading] = useState(false);
  const [stab, setStab] = useState<Hl7StatusKey | 'all'>('all');
  const [fDir, setFDir] = useState('');
  const [fType, setFType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<Hl7MessageQueueDto | null>(null);
  const [enqueueModal, setEnqueueModal] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const r = await hl7QueueApi.search({
        status: stab === 'all' ? undefined : stab,
        direction: fDir || undefined,
        messageType: fType || undefined,
        pageIndex: 1, pageSize: 200,
      });
      setRows(r.items);
      setCounts({ total: r.totalCount, pending: r.pendingCount, failed: r.failedCount, acked: r.ackedCount });
    } catch { te('Không tải được queue'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [stab, fDir, fType]);

  const all = rows;
  const statusCounts: Record<string, number> = { all: counts.total };
  HL7Q_STATUS.forEach(s => { statusCounts[s.v] = all.filter(r => r.status === s.v).length; });

  const filtered = all.filter(r => {
    if (search) {
      const s = search.toLowerCase();
      return [r.messageControlId, r.sourceSystem, r.targetSystem, r.messageType]
        .some(x => x.toLowerCase().includes(s));
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const kpis = [
    { lbl: 'Tổng message', val: counts.total, sub: 'queue hiện tại' },
    { lbl: 'Chờ gửi + Retry',
      val: (statusCounts.pending || 0) + (statusCounts.retrying || 0),
      tone: 'warn' as const },
    { lbl: 'Đã ACK',
      val: counts.acked,
      sub: counts.total > 0 ? `${(counts.acked / counts.total * 100).toFixed(1)}%` : '—',
      tone: 'ok' as const },
    { lbl: 'Lỗi', val: counts.failed, sub: 'vượt max retry', tone: 'crit' as const },
    { lbl: 'Direction', val: `${all.filter(r => r.direction === 'outbound').length}/${all.filter(r => r.direction === 'inbound').length}`, sub: '→ / ←', tone: 'info' as const },
  ];

  const retry = async (r: Hl7MessageQueueDto) => {
    try {
      await hl7QueueApi.retry(r.id);
      tk(`Đang retry · ${r.messageControlId}`);
      load();
    } catch { te('Retry thất bại'); }
  };
  const retryAll = async () => {
    if ((counts.failed || 0) === 0) { ti('Không có message lỗi'); return; }
    try {
      const r = await hl7QueueApi.retryAllFailed();
      tk(`Retry ${r.retried} · OK ${r.succeededImmediately} · Còn lỗi ${r.stillFailed}`);
      load();
    } catch { te('Retry batch thất bại'); }
  };
  const enqueue = async () => {
    try {
      const v = await form.validateFields();
      await hl7QueueApi.demoEnqueue(v);
      tk('Đã thêm message vào queue');
      setEnqueueModal(false); form.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (!err?.errorFields) te('Thêm thất bại');
    }
  };
  const openDetail = async (r: Hl7MessageQueueDto) => {
    try {
      const full = await hl7QueueApi.getById(r.id);
      setDetail(full ?? r);
    } catch { setDetail(r); }
  };

  const cols: ColumnDef<Hl7MessageQueueDto>[] = [
    { key: 'messageControlId', label: 'Control ID', mono: true, code: true, width: 200 },
    {
      key: 'direction', label: 'Hướng', width: 90,
      render: r => r.direction === 'outbound'
        ? <StatusBadge tone="info">→ Gửi</StatusBadge>
        : <StatusBadge tone="warn">← Nhận</StatusBadge>
    },
    {
      key: 'route', label: 'Route',
      render: r => <span style={{ fontSize: 11.5 }}><b>{r.sourceSystem}</b> → <b>{r.targetSystem}</b></span>
    },
    { key: 'messageType', label: 'MSG type', mono: true, code: true, width: 110 },
    {
      key: 'retry', label: 'Retry', mono: true, width: 80,
      render: r => `${r.retryCount}/${r.maxRetries}`
    },
    {
      key: 'lastTry', label: 'Lần thử cuối', mono: true, width: 110,
      render: r => r.lastTryAt ? fmtHMg(r.lastTryAt) : <span style={{ color: 'var(--t-3)' }}>—</span>
    },
    {
      key: 'nextRetry', label: 'Retry tiếp', mono: true, width: 110,
      render: r => r.nextRetryAt ? fmtHMg(r.nextRetryAt) : <span style={{ color: 'var(--t-3)' }}>—</span>
    },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: r => {
        const s = HL7Q_STATUS.find(x => x.v === r.status);
        return s ? <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge> : <StatusBadge>{r.status}</StatusBadge>;
      }
    },
  ];

  const actions = (r: Hl7MessageQueueDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => openDetail(r)} />
      {(r.status === 'failed' || r.status === 'pending') && (
        <ActBtn ic="refresh" title="Retry" onClick={() => retry(r)} />
      )}
    </div>
  );

  return (
    <div className="ab" data-testid="hl7-queue-page">
      <KpiStrip items={kpis} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Tìm Control ID, MSG type, system…" />
        <Filter value={fDir} onChange={(v) => { setFDir(v); setPage(0); }}
          options={[{ v: 'outbound', l: '→ Gửi' }, { v: 'inbound', l: '← Nhận' }]}
          placeholder="▾ Hướng" />
        <Filter value={fType} onChange={(v) => { setFType(v); setPage(0); }}
          options={MSG_TYPES.map(t => ({ v: t, l: t }))} placeholder="▾ MSG type" />
        <span className="spacer" style={{ flex: 1 }} />
        <Button size="small" onClick={load} loading={loading}>
          <TermIcon name="refresh" size={12} /> Sync ACK
        </Button>
        <Button
          size="small"
          danger
          onClick={retryAll}
          disabled={counts.failed === 0}
          data-testid="hl7-retry-all"
        >
          <TermIcon name="alert" size={12} /> Retry tất cả lỗi
        </Button>
        <Button type="primary" size="small" onClick={() => setEnqueueModal(true)} data-testid="enqueue-demo-btn">
          <TermIcon name="plus" size={12} /> Thêm demo
        </Button>
      </div>

      <StatusTabs
        value={stab}
        onChange={(v) => { setStab(v as Hl7StatusKey | 'all'); setPage(0); }}
        tabs={HL7Q_STATUS}
        counts={statusCounts}
      />
      <DataTable columns={cols} data={paged} rowKey={r => r.id} onRowClick={openDetail} actions={actions} />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      {/* Detail drawer */}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.messageControlId ?? ''}
        sub={detail ? `${detail.messageType} · ${detail.sourceSystem} → ${detail.targetSystem}` : undefined}
        size="xl"
        footer={detail && (
          <>
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            {(detail.status === 'failed' || detail.status === 'pending') && (
              <Button type="primary" onClick={() => { retry(detail); setDetail(null); }}>
                <TermIcon name="refresh" size={12} /> Gửi lại ngay
              </Button>
            )}
          </>
        )}
      >
        {detail && (() => {
          const s = HL7Q_STATUS.find(x => x.v === detail.status);
          return (
            <>
              <DrSec title="Trạng thái">
                <DrField lbl="Trạng thái">{s ? <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge> : detail.status}</DrField>
                <DrField lbl="Hướng">{detail.direction === 'outbound' ? '→ Outbound (HIS gửi)' : '← Inbound (HIS nhận)'}</DrField>
                <DrField lbl="Retry">{detail.retryCount}/{detail.maxRetries}</DrField>
              </DrSec>
              <DrSec title="Endpoint">
                <DrField lbl="Source">{detail.sourceSystem}</DrField>
                <DrField lbl="Target">{detail.targetSystem}</DrField>
                <DrField lbl="Endpoint"><span className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{detail.endpoint ?? '—'}</span></DrField>
              </DrSec>
              <DrSec title="Thời gian">
                <DrField lbl="Tạo lúc">{fmtDTg(detail.createdAt)}</DrField>
                <DrField lbl="Thử đầu">{detail.firstTryAt ? fmtDTg(detail.firstTryAt) : <span style={{ color: 'var(--t-3)' }}>—</span>}</DrField>
                <DrField lbl="Thử cuối">{detail.lastTryAt ? fmtDTg(detail.lastTryAt) : <span style={{ color: 'var(--t-3)' }}>—</span>}</DrField>
                <DrField lbl="Retry tiếp">{detail.nextRetryAt ? fmtDTg(detail.nextRetryAt) : <span style={{ color: 'var(--t-3)' }}>—</span>}</DrField>
              </DrSec>
              {detail.errorMessage && (
                <DrSec title="Lỗi">
                  <div style={{ padding: 10, background: 'var(--s-crit-bg)', color: 'var(--s-crit)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', borderRadius: 4 }}>
                    {detail.errorMessage}
                  </div>
                </DrSec>
              )}
              {detail.payload && (
                <DrSec title="Payload HL7">
                  <pre style={{
                    background: '#0b1220', color: '#86efac', padding: 12, margin: 0,
                    fontSize: 10.5, fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all', maxHeight: 320, overflow: 'auto', borderRadius: 4,
                  }}>{detail.payload}</pre>
                </DrSec>
              )}
            </>
          );
        })()}
      </DrawerShell>

      {/* Enqueue modal */}
      <ModalShell
        open={enqueueModal}
        onClose={() => { setEnqueueModal(false); form.resetFields(); }}
        title="Thêm demo HL7 message"
        size="md"
        footer={(
          <>
            <Button onClick={() => { setEnqueueModal(false); form.resetFields(); }}>Hủy</Button>
            <Button type="primary" onClick={enqueue}>Thêm</Button>
          </>
        )}
      >
        <div style={{ padding: 18 }}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ direction: 'outbound', source: 'HIS', target: 'RIS', messageType: 'ORM^O01', payload: DEMO_PAYLOAD, endpoint: 'tcp://ris.bvhungyen:2575' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="direction" label="Hướng">
                <Select options={[{ value: 'outbound', label: 'Outbound' }, { value: 'inbound', label: 'Inbound' }]} />
              </Form.Item>
              <Form.Item name="messageType" label="MSG type">
                <Select options={MSG_TYPES.map(t => ({ value: t, label: t }))} />
              </Form.Item>
              <Form.Item name="source" label="Source">
                <Select options={SYSTEMS.map(s => ({ value: s, label: s }))} />
              </Form.Item>
              <Form.Item name="target" label="Target">
                <Select options={SYSTEMS.map(s => ({ value: s, label: s }))} />
              </Form.Item>
            </div>
            <Form.Item name="endpoint" label="Endpoint">
              <Input />
            </Form.Item>
            <Form.Item name="payload" label="HL7 Payload">
              <Input.TextArea rows={6} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }} />
            </Form.Item>
          </Form>
        </div>
      </ModalShell>
    </div>
  );
};

export default Hl7MessageQueue;
