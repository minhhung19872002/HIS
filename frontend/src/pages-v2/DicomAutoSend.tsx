/**
 * NangCap24 — DICOM Auto Send v2 (port từ mod-dicom-auto-send.jsx)
 *
 * 3 tab: Rules · Transmissions · Stats
 * Quy tắc tự động gửi DICOM + lịch sử transmission + thống kê 14 ngày.
 */
import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Form, Input, Select, InputNumber, Checkbox, Button } from 'antd';
import {
  KpiStrip, TopTabs, DataTable, DrawerShell, ModalShell, ActBtn, StatusBadge, DrSec, DrField,
  tk, te, cf, fmtDTg, fmtHMg, fmtDMYg,
} from './_v2kit';
import type { ColumnDef } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import { dicomAutoSendApi } from '../api/nangcap24';
import type {
  DicomAutoSendRuleDto, DicomTransmissionLogDto, DicomTransmissionStatsDto,
} from '../api/nangcap24';
import apiClient from '../services/apiClient';

interface RemoteServerDto { id: string; name: string; aeTitle: string; host: string; port: number; isActive: boolean; }

type Tab = 'rules' | 'transmissions' | 'stats';
const TABS = [
  { v: 'rules' as const,         l: 'Quy tắc tự động gửi', ic: 'settings' },
  { v: 'transmissions' as const, l: 'Lịch sử gửi',         ic: 'list' },
  { v: 'stats' as const,         l: 'Thống kê',            ic: 'chart' },
];

const DicomAutoSend: React.FC = () => {
  const [tab, setTab] = useState<Tab>('rules');
  const [rules, setRules] = useState<DicomAutoSendRuleDto[]>([]);
  const [txns, setTxns] = useState<DicomTransmissionLogDto[]>([]);
  const [stats, setStats] = useState<DicomTransmissionStatsDto | null>(null);
  const [servers, setServers] = useState<RemoteServerDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [ruleModal, setRuleModal] = useState<DicomAutoSendRuleDto | 'new' | null>(null);
  const [form] = Form.useForm();
  const [txnDetail, setTxnDetail] = useState<DicomTransmissionLogDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [rs, ss, ts, st] = await Promise.all([
        dicomAutoSendApi.listRules(),
        apiClient.get<RemoteServerDto[]>('/RISComplete/dicom/remote-servers').then(r => r.data).catch(() => []),
        dicomAutoSendApi.searchTransmissions(undefined, undefined, undefined, 1, 100),
        dicomAutoSendApi.getStats(dayjs().subtract(13, 'day').toISOString(), dayjs().toISOString()),
      ]);
      setRules(rs); setServers(ss); setTxns(ts); setStats(st);
    } catch { te('Không tải được dữ liệu'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Số ca truyền trong 24h gần nhất — tính từ stats.byDay thật trong DB (không hardcode).
  const triggerCount24h = stats?.byDay
    ?.filter(d => dayjs(d.date).isAfter(dayjs().subtract(24, 'hour')))
    .reduce((sum, d) => sum + d.count, 0) ?? 0;

  const kpis = [
    { lbl: 'Quy tắc hoạt động', val: rules.filter(r => r.isActive).length, sub: `/ ${rules.length} tổng`, tone: 'ok' as const },
    { lbl: 'Giao dịch gửi',     val: (stats?.totalTransmissions ?? 0).toLocaleString(), sub: 'tích luỹ' },
    { lbl: 'Thành công',        val: (stats?.successCount ?? 0).toLocaleString(),
      sub: stats && stats.totalTransmissions > 0 ? `${(stats.successCount / stats.totalTransmissions * 100).toFixed(1)}%` : '—',
      tone: 'ok' as const },
    { lbl: 'Mã hoá AES-256',    val: (stats?.encryptedCount ?? 0).toLocaleString(), sub: 'AES-256-GCM', tone: 'info' as const },
    { lbl: 'Trigger 24h',       val: triggerCount24h, sub: 'tự động + cron', tone: 'warn' as const },
  ];

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      encryptBeforeSend: true, triggerType: 'on_arrival', priority: 5, isActive: true,
      destinationServerId: servers[0]?.id,
    });
    setRuleModal('new');
  };
  const openEdit = (r: DicomAutoSendRuleDto) => {
    form.setFieldsValue(r);
    setRuleModal(r);
  };
  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      if (ruleModal === 'new') { await dicomAutoSendApi.createRule(v); tk('Đã tạo quy tắc'); }
      else if (ruleModal && typeof ruleModal === 'object') { await dicomAutoSendApi.updateRule(ruleModal.id, v); tk('Đã cập nhật quy tắc'); }
      setRuleModal(null); load();
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (!err?.errorFields) te('Lưu thất bại');
    }
  };
  const handleDelete = (r: DicomAutoSendRuleDto) =>
    cf(`Xoá quy tắc "${r.ruleName}"?`, async () => {
      try { await dicomAutoSendApi.deleteRule(r.id); tk('Đã xoá'); load(); }
      catch { te('Xoá thất bại'); }
    }, { tone: 'crit', confirm: 'Xoá' });
  const triggerNow = async () => {
    try {
      const r = await dicomAutoSendApi.triggerCheck();
      tk(`Đã trigger ${r.triggered} ca mới`);
      load();
    } catch { te('Trigger thất bại'); }
  };

  // ─── Rules columns ───
  const rulesCols: ColumnDef<DicomAutoSendRuleDto>[] = [
    { key: 'ruleName', label: 'Tên quy tắc', render: r => <strong style={{ fontSize: 12.5 }}>{r.ruleName}</strong> },
    { key: 'modality', label: 'Modality', width: 110, render: r => r.modality
        ? <StatusBadge tone="info">{r.modality}</StatusBadge>
        : <span style={{ color: 'var(--t-3)' }}>Tất cả</span> },
    { key: 'sourceAeTitle', label: 'Source AE', mono: true,
      render: r => r.sourceAeTitle || <span style={{ color: 'var(--t-3)' }}>—</span> },
    { key: 'dest', label: 'Server đích', render: r => r.destinationName },
    { key: 'encrypt', label: 'Mã hoá', width: 110,
      render: r => r.encryptBeforeSend
        ? <StatusBadge tone="ok" dot>AES-256</StatusBadge>
        : <StatusBadge tone="info">Không</StatusBadge> },
    { key: 'trigger', label: 'Trigger', render: r => r.triggerType === 'on_arrival'
        ? 'Khi nhận DICOM'
        : r.triggerType === 'scheduled'
          ? <span className="mono">Cron · {r.scheduleCron}</span>
          : 'Thủ công' },
    { key: 'priority', label: 'Ưu tiên', mono: true, width: 80 },
    { key: 'isActive', label: 'TT', width: 110, render: r => r.isActive
        ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
        : <StatusBadge tone="info" dot>Tạm dừng</StatusBadge> },
    { key: 'timesTriggered', label: 'Trigger ×', mono: true, width: 100 },
  ];

  // ─── Transmissions columns ───
  const txnsCols: ColumnDef<DicomTransmissionLogDto>[] = [
    { key: 'study', label: 'Study UID', mono: true, code: true,
      render: r => '…' + r.studyInstanceUid.slice(-20) },
    { key: 'dest', label: 'Đích', render: r => r.destinationName },
    { key: 'trigger', label: 'Loại', width: 110,
      render: r => <StatusBadge tone={r.triggerType === 'auto' ? 'info' : r.triggerType === 'scheduled' ? 'warn' : 'ok'}>
        {r.triggerType === 'auto' ? 'Tự động' : r.triggerType === 'scheduled' ? 'Định kỳ' : 'Thủ công'}
      </StatusBadge> },
    { key: 'instances', label: 'Số ảnh', mono: true, width: 80,
      render: r => `${r.instanceCount}` },
    { key: 'bytes', label: 'Dung lượng', mono: true, width: 110,
      render: r => `${(r.totalBytes / 1024 / 1024).toFixed(1)} MB` },
    { key: 'enc', label: 'Mã hoá', width: 130,
      render: r => r.wasEncrypted
        ? <StatusBadge tone="ok" dot>{r.encryptionAlgorithm ?? 'AES-256'}</StatusBadge>
        : <StatusBadge tone="info">Không</StatusBadge> },
    { key: 'duration', label: 'Thời gian', mono: true, width: 100,
      render: r => `${(r.durationMs / 1000).toFixed(1)}s` },
    { key: 'status', label: 'Trạng thái', width: 130,
      render: r => <StatusBadge tone={r.status === 'done' ? 'ok' : r.status === 'failed' ? 'crit' : 'warn'} dot>
        {r.status === 'done' ? 'Hoàn tất' : r.status === 'failed' ? 'Lỗi' : 'Đang gửi'}
      </StatusBadge> },
    { key: 'startedAt', label: 'Lúc', mono: true, width: 110,
      render: r => fmtHMg(r.startedAt) },
  ];

  const maxDay = useMemo(() => stats?.byDay?.length
    ? Math.max(...stats.byDay.map(d => d.count)) : 0, [stats]);

  return (
    <div className="ab" data-testid="dicom-autosend-page">
      <KpiStrip items={kpis} />
      <TopTabs tab={tab} setTab={setTab} tabs={TABS} />

      {tab === 'rules' && (
        <>
          <div className="ab-toolbar">
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
              🔁 Quy tắc auto-send · {rules.filter(r => r.isActive).length} active · {rules.filter(r => r.triggerType === 'scheduled').length} cron
            </span>
            <span className="spacer" style={{ flex: 1 }} />
            <Button size="small" onClick={triggerNow} loading={loading}>
              <TermIcon name="zap" size={12} /> Trigger ngay
            </Button>
            <Button type="primary" size="small" onClick={openCreate} data-testid="das-create-rule">
              <TermIcon name="plus" size={12} /> Quy tắc mới
            </Button>
          </div>
          <DataTable
            rowKey={r => r.id}
            data={rules}
            columns={rulesCols}
            actions={r => (
              <div className="ab-actions">
                <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
                <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => handleDelete(r)} />
              </div>
            )}
          />
        </>
      )}

      {tab === 'transmissions' && (
        <>
          <div className="ab-toolbar">
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>📡 {txns.length} giao dịch gần nhất · sort theo thời gian</span>
            <span className="spacer" style={{ flex: 1 }} />
            <Button size="small" onClick={load} loading={loading}>
              <TermIcon name="refresh" size={12} /> Tải lại
            </Button>
          </div>
          <DataTable
            rowKey={r => r.id}
            data={txns}
            columns={txnsCols}
            onRowClick={setTxnDetail}
          />
        </>
      )}

      {tab === 'stats' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-14)', padding: 'var(--space-14)' }}>
          <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', fontWeight: 600, fontSize: 'var(--fs-md)' }}>
              Theo server đích
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
              <thead style={{ background: 'var(--d-1)' }}>
                <tr><th style={{ textAlign: 'left', padding: '8px 16px' }}>Đích</th><th style={{ textAlign: 'right', padding: '8px 16px' }}>Số ca</th><th style={{ textAlign: 'right', padding: '8px 16px' }}>Dung lượng</th></tr>
              </thead>
              <tbody>
                {stats.byDestination.map(b => (
                  <tr key={b.destinationName} style={{ borderTop: '1px solid var(--line-soft)' }}>
                    <td style={{ padding: '8px 16px' }}>{b.destinationName}</td>
                    <td className="mono" style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600 }}>{b.count.toLocaleString()}</td>
                    <td className="mono" style={{ padding: '8px 16px', textAlign: 'right' }}>{(b.bytes / 1024 / 1024 / 1024).toFixed(2)} GB</td>
                  </tr>
                ))}
                {stats.byDestination.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: 'var(--space-24)', textAlign: 'center', color: 'var(--t-3)' }}>Không có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', fontWeight: 600, fontSize: 'var(--fs-md)' }}>
              14 ngày gần nhất
            </div>
            <div style={{ padding: 'var(--space-14)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', height: 200 }}>
              {stats.byDay.map((d, i) => {
                const h = maxDay > 0 ? (d.count / maxDay * 170) : 4;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }} title={`${fmtDMYg(d.date)}: ${d.count} ca`}>
                    <div style={{
                      width: '100%', height: Math.max(4, h),
                      background: 'linear-gradient(180deg, var(--a-cy), var(--c-pri-dim))',
                      borderRadius: '2px 2px 0 0',
                    }} />
                    <div style={{ fontSize: 9, color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>
                      {dayjs(d.date).format('D/M')}
                    </div>
                  </div>
                );
              })}
              {stats.byDay.length === 0 && (
                <div style={{ flex: 1, textAlign: 'center', color: 'var(--t-3)', alignSelf: 'center' }}>Không có dữ liệu</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transmission detail drawer */}
      <DrawerShell
        open={!!txnDetail}
        onClose={() => setTxnDetail(null)}
        title={txnDetail ? '…' + txnDetail.studyInstanceUid.slice(-30) : ''}
        sub={txnDetail ? `${txnDetail.destinationName} · ${txnDetail.instanceCount} ảnh` : undefined}
        size="lg"
        footer={<Button onClick={() => setTxnDetail(null)}>Đóng</Button>}
      >
        {txnDetail && (
          <>
            <DrSec title="Giao dịch">
              <DrField lbl="Server đích">{txnDetail.destinationName}</DrField>
              <DrField lbl="Số ảnh">{txnDetail.instanceCount}</DrField>
              <DrField lbl="Dung lượng">{(txnDetail.totalBytes / 1024 / 1024).toFixed(2)} MB</DrField>
              <DrField lbl="Mã hoá">{txnDetail.wasEncrypted ? txnDetail.encryptionAlgorithm : 'Không'}</DrField>
              <DrField lbl="Thời gian"><span className="mono">{txnDetail.durationMs} ms</span></DrField>
              <DrField lbl="Người trigger">{txnDetail.triggeredByUserName ?? '(System auto)'}</DrField>
              <DrField lbl="Bắt đầu">{fmtDTg(txnDetail.startedAt)}</DrField>
            </DrSec>
            {txnDetail.errorMessage && (
              <DrSec title="Lỗi">
                <div style={{ padding: 'var(--space-10)', background: 'var(--s-crit-bg)', color: 'var(--s-crit)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', borderRadius: 4 }}>
                  {txnDetail.errorMessage}
                </div>
              </DrSec>
            )}
          </>
        )}
      </DrawerShell>

      {/* Rule modal */}
      <ModalShell
        open={!!ruleModal}
        onClose={() => setRuleModal(null)}
        title={ruleModal === 'new'
          ? 'Tạo quy tắc tự động gửi'
          : ruleModal && typeof ruleModal === 'object'
            ? `Sửa: ${ruleModal.ruleName}` : 'Sửa quy tắc'}
        size="md"
        footer={(
          <>
            <Button onClick={() => setRuleModal(null)}>Hủy</Button>
            <Button type="primary" onClick={handleSave}><TermIcon name="check" size={12} /> Lưu</Button>
          </>
        )}
      >
        <div style={{ padding: 'var(--space-18)' }}>
          <Form form={form} layout="vertical">
            <Form.Item name="ruleName" label="Tên quy tắc" rules={[{ required: true }]}>
              <Input placeholder="VD: Auto gửi CT từ Toshiba sang Cloud-PACS" />
            </Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
              <Form.Item name="modality" label="Modality">
                <Select allowClear options={['CT', 'MR', 'CR', 'DX', 'US', 'XA', 'MG', 'NM', 'PT'].map(m => ({ value: m, label: m }))} />
              </Form.Item>
              <Form.Item name="sourceAeTitle" label="Source AE Title">
                <Input placeholder="VD: TOSHIBA_CT01" />
              </Form.Item>
              <Form.Item name="destinationServerId" label="Server đích" rules={[{ required: true }]}>
                <Select options={servers.map(s => ({ value: s.id, label: `${s.name} (${s.aeTitle})` }))} />
              </Form.Item>
              <Form.Item name="triggerType" label="Trigger">
                <Select options={[
                  { value: 'on_arrival', label: 'Tự động khi nhận DICOM' },
                  { value: 'scheduled',  label: 'Định kỳ (cron)' },
                  { value: 'manual',     label: 'Thủ công' },
                ]} />
              </Form.Item>
              <Form.Item name="priority" label="Ưu tiên (1=cao)">
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="encryptBeforeSend" valuePropName="checked" label="Mã hoá AES-256">
                <Checkbox>Mã hoá trước khi gửi (khuyến nghị)</Checkbox>
              </Form.Item>
            </div>
            <Form.Item shouldUpdate={(prev, cur) => prev.triggerType !== cur.triggerType} noStyle>
              {() => form.getFieldValue('triggerType') === 'scheduled' && (
                <Form.Item name="scheduleCron" label="Cron expression" extra="VD: 0 0 2 * * * (đêm 2h hằng ngày)">
                  <Input placeholder="0 0 2 * * *" />
                </Form.Item>
              )}
            </Form.Item>
            <Form.Item name="isActive" valuePropName="checked" label="Hoạt động">
              <Checkbox>Quy tắc đang chạy</Checkbox>
            </Form.Item>
          </Form>
        </div>
      </ModalShell>
    </div>
  );
};

export default DicomAutoSend;
