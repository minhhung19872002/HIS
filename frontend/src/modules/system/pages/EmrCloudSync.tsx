/**
 * NangCap24 — EMR Cloud Sync v2 (port từ mod-emr-cloud-sync.jsx)
 *
 * Đồng bộ HSBA lên Cloudflare R2 (Primary + DR) + Local Backup.
 * KPI + StatusTabs + DataTable + Drawer chi tiết + Modal đồng bộ mới.
 */
import React, { useEffect, useState } from 'react';
import { Form, Input, Checkbox, Button } from 'antd';
import {
  KpiStrip, DataTable, StatusTabs, SearchBox, DrawerShell, ModalShell,
  Filter, Pager, ActBtn, StatusBadge, DrSec, DrField,
  tk, te, fmtDTg, fmtHMg, useTabCounts,
} from '../../../pages-v2/_v2kit';
import type { ColumnDef } from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { emrCloudSyncApi } from '../../../api/nangcap24';
import type { EmrCloudSyncLogDto, EmrCloudSyncStatusDto } from '../../../api/nangcap24';

const CS_STATUS = [
  { v: 'done'     as const, l: 'Đã đồng bộ', tone: 'ok'   as const },
  { v: 'pending'  as const, l: 'Đang xử lý', tone: 'warn' as const },
  { v: 'uploading'as const, l: 'Đang tải',   tone: 'info' as const },
  { v: 'failed'   as const, l: 'Lỗi',        tone: 'crit' as const },
];
type CSStatusKey = (typeof CS_STATUS)[number]['v'];

const CS_DESTS: Record<string, { label: string; color: string; icon: string }> = {
  r2_primary:   { label: 'R2 Primary',   color: 'var(--s-ok)', icon: 'cloud' },
  r2_dr:        { label: 'R2 DR',        color: '#0ea5e9', icon: 'cloud' },
  local_backup: { label: 'Local Backup', color: 'var(--t-2)', icon: 'shield' },
};

const PER = 18;

const EmrCloudSync: React.FC = () => {
  const [rows, setRows] = useState<EmrCloudSyncLogDto[]>([]);
  const [status, setStatus] = useState<EmrCloudSyncStatusDto | null>(null);
  // loading state value chưa render trực tiếp (giữ setLoading cho deps callbacks)
  const [, setLoading] = useState(false);
  const [stab, setStab] = useState<CSStatusKey | 'all'>('all');
  const [fDest, setFDest] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<EmrCloudSyncLogDto | null>(null);
  const [syncModal, setSyncModal] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [logs, st] = await Promise.all([
        emrCloudSyncApi.getLogs(undefined, undefined, 1, 200),
        emrCloudSyncApi.getStatus(),
      ]);
      setRows(logs); setStatus(st);
    } catch { te('Không tải được danh sách'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const counts = useTabCounts(rows, CS_STATUS, (r) => r.status);

  const filtered = rows.filter(r => {
    if (stab !== 'all' && r.status !== stab) return false;
    if (fDest && r.destination !== fDest) return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = [r.fileName, r.medicalRecordId, r.destination].join(' ').toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const totalBytes = rows.reduce((s, r) => s + r.fileSizeBytes, 0);
  const doneBytes = rows.filter(r => r.status === 'done').reduce((s, r) => s + r.fileSizeBytes, 0);
  const primaryDone = rows.filter(r => r.destination === 'r2_primary' && r.status === 'done').length;
  const drDone = rows.filter(r => r.destination === 'r2_dr' && r.status === 'done').length;

  const kpis = [
    { lbl: 'Tổng file đồng bộ', val: rows.length, sub: `${status?.totalRecordsTracked ?? 0} HSBA` },
    { lbl: 'Đã hoàn tất',      val: counts.done || 0, tone: 'ok' as const, sub: `${(doneBytes / 1024 / 1024).toFixed(1)} MB` },
    { lbl: 'Đang xử lý',       val: (counts.pending || 0) + (counts.uploading || 0), tone: 'warn' as const },
    { lbl: 'Lỗi đồng bộ',      val: counts.failed || 0, tone: 'crit' as const, sub: 'cần retry' },
    { lbl: 'R2 Primary / DR',  val: `${primaryDone} / ${drDone}`, tone: 'info' as const, sub: 'tỷ lệ DR replica' },
    { lbl: 'Tổng dung lượng',  val: `${(totalBytes / 1024 / 1024).toFixed(1)} MB` },
  ];

  const retry = async (r: EmrCloudSyncLogDto) => {
    try {
      await emrCloudSyncApi.retryFailed();
      tk(`Đang retry · ${r.fileName}`);
      load();
    } catch { te('Retry thất bại'); }
  };
  const retryAll = async () => {
    try {
      const r = await emrCloudSyncApi.retryFailed();
      tk(`Đã retry ${r.retried} file lỗi`);
      load();
    } catch { te('Retry thất bại'); }
  };

  const handleSync = async () => {
    try {
      const v = await form.validateFields();
      await emrCloudSyncApi.sync({
        medicalRecordId: v.medicalRecordId,
        fileTypes: v.fileTypes,
        syncToDr: v.syncToDr,
      });
      tk('Đã trigger đồng bộ');
      setSyncModal(false); form.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (!err?.errorFields) te('Đồng bộ thất bại');
    }
  };

  const cols: ColumnDef<EmrCloudSyncLogDto>[] = [
    {
      key: 'fileName', label: 'Tên file', mono: true, code: true,
      render: r => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 11.5 }}>{r.fileName}</div>
          <div style={{ fontSize: 10.5, color: 'var(--t-2)' }}>{r.medicalRecordId}</div>
        </div>
      )
    },
    {
      key: 'fileType', label: 'Loại', width: 110,
      render: r => <StatusBadge tone="info">
        {({ signed_xml: 'Signed XML', hl7: 'HL7', pdf: 'PDF', dicom_zip: 'DICOM zip' } as Record<string, string>)[r.fileType] ?? r.fileType}
      </StatusBadge>
    },
    {
      key: 'size', label: 'Kích thước', mono: true, width: 110,
      render: r => `${(r.fileSizeBytes / 1024).toFixed(1)} KB`
    },
    {
      key: 'dest', label: 'Đích', width: 150,
      render: r => {
        const d = CS_DESTS[r.destination] ?? { label: r.destination, color: 'var(--t-2)', icon: 'cloud' };
        return <span style={{ color: d.color, fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
          <TermIcon name={d.icon} size={11} /> {d.label}
        </span>;
      }
    },
    {
      key: 'retry', label: 'Retry', mono: true, width: 70,
      render: r => r.retryCount > 0
        ? <span style={{ color: 'var(--s-warn)' }}>×{r.retryCount}</span>
        : '—'
    },
    {
      key: 'startedAt', label: 'Bắt đầu', mono: true, width: 110,
      render: r => fmtHMg(r.completedAt ?? r.errorMessage)
    },
    {
      key: 'completedAt', label: 'Hoàn tất', mono: true, width: 110,
      render: r => r.completedAt ? fmtHMg(r.completedAt) : <span style={{ color: 'var(--t-3)' }}>—</span>
    },
    {
      key: 'status', label: 'Trạng thái', width: 140, render: r => {
        const s = CS_STATUS.find(x => x.v === r.status);
        return s ? <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge> : <StatusBadge>{r.status}</StatusBadge>;
      }
    },
  ];

  const actions = (r: EmrCloudSyncLogDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetail(r)} />
      {r.status === 'failed' && <ActBtn ic="refresh" title="Retry" tone="warn" onClick={() => retry(r)} />}
    </div>
  );

  return (
    <div className="ab" data-testid="emr-cloud-sync-page">
      <KpiStrip items={kpis} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Tìm tên file / HSBA / đích…" />
        <Filter
          value={fDest}
          onChange={(v) => { setFDest(v); setPage(0); }}
          options={Object.entries(CS_DESTS).map(([v, d]) => ({ v, l: d.label }))}
          placeholder="▾ Đích"
        />
        <span className="spacer" style={{ flex: 1 }} />
        <Button size="small" onClick={retryAll} disabled={(counts.failed || 0) === 0} data-testid="cs-retry-all">
          <TermIcon name="refresh" size={12} /> Retry lỗi ({counts.failed || 0})
        </Button>
        <Button type="primary" size="small" onClick={() => setSyncModal(true)} data-testid="cs-sync-btn">
          <TermIcon name="upload" size={12} /> Đồng bộ HSBA mới
        </Button>
      </div>

      <StatusTabs value={stab} onChange={(v) => { setStab(v as CSStatusKey | 'all'); setPage(0); }} tabs={CS_STATUS} counts={counts} />
      <DataTable columns={cols} data={paged} rowKey={r => r.id} onRowClick={setDetail} actions={actions} />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      {/* Detail drawer */}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.fileName ?? ''}
        sub={detail ? `${CS_DESTS[detail.destination]?.label ?? detail.destination} · ${detail.medicalRecordId}` : undefined}
        size="lg"
        footer={detail && (
          <>
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            {detail.status === 'failed' && (
              <Button type="primary" onClick={() => retry(detail)}><TermIcon name="refresh" size={12} /> Retry</Button>
            )}
          </>
        )}
      >
        {detail && (() => {
          const d = CS_DESTS[detail.destination] ?? { label: detail.destination, color: 'var(--t-2)', icon: 'cloud' };
          const s = CS_STATUS.find(x => x.v === detail.status);
          return (
            <>
              <DrSec title="Trạng thái">
                <DrField lbl="Trạng thái">{s ? <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge> : detail.status}</DrField>
                <DrField lbl="Đích"><span style={{ color: d.color, fontWeight: 600 }}><TermIcon name={d.icon} size={11} /> {d.label}</span></DrField>
                <DrField lbl="Số lần retry">{detail.retryCount}</DrField>
              </DrSec>
              <DrSec title="File">
                <DrField lbl="Loại">{detail.fileType}</DrField>
                <DrField lbl="Kích thước"><span className="mono">{(detail.fileSizeBytes / 1024).toFixed(1)} KB</span></DrField>
                <DrField lbl="SHA-256"><span className="mono" style={{ fontSize: 'var(--fs-xxs)', wordBreak: 'break-all' }}>{detail.fileHash ?? '—'}</span></DrField>
                <DrField lbl="Remote path"><span className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{detail.remotePath ?? '—'}</span></DrField>
              </DrSec>
              <DrSec title="Thời gian">
                <DrField lbl="Hoàn tất">{detail.completedAt ? fmtDTg(detail.completedAt) : <span style={{ color: 'var(--t-3)' }}>—</span>}</DrField>
              </DrSec>
              {detail.errorMessage && (
                <DrSec title="Lỗi">
                  <div style={{
                    padding: 'var(--space-12)', background: 'var(--s-crit-bg)', border: '1px solid var(--s-crit-bd)',
                    borderRadius: 'var(--r-2)', color: 'var(--s-crit-tx)', fontSize: 12.5, fontFamily: 'var(--font-mono)',
                  }}>
                    <TermIcon name="alert" size={12} /> {detail.errorMessage}
                  </div>
                </DrSec>
              )}
            </>
          );
        })()}
      </DrawerShell>

      {/* Sync modal */}
      <ModalShell
        open={syncModal}
        onClose={() => { setSyncModal(false); form.resetFields(); }}
        title="Đồng bộ HSBA mới lên Cloud"
        size="md"
        footer={(
          <>
            <Button onClick={() => { setSyncModal(false); form.resetFields(); }}>Hủy</Button>
            <Button type="primary" onClick={handleSync}><TermIcon name="upload" size={12} /> Bắt đầu đồng bộ</Button>
          </>
        )}
      >
        <div style={{ padding: 'var(--space-18)' }}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ fileTypes: ['signed_xml', 'hl7', 'pdf'], syncToDr: true }}
          >
            <Form.Item name="medicalRecordId" label="HSBA ID hoặc Mã" rules={[{ required: true, message: 'Cần nhập HSBA ID' }]}>
              <Input placeholder="HSBA-1018-20100 hoặc UUID" />
            </Form.Item>
            <Form.Item name="fileTypes" label="Loại file đồng bộ">
              <Checkbox.Group options={[
                { label: 'Signed XML (đã ký số)', value: 'signed_xml' },
                { label: 'HL7 v2 archive',         value: 'hl7' },
                { label: 'PDF bệnh án',            value: 'pdf' },
                { label: 'DICOM ZIP',              value: 'dicom_zip' },
              ]} />
            </Form.Item>
            <Form.Item name="syncToDr" valuePropName="checked" label="Đồng bộ sang DR">
              <Checkbox>Đồng bộ song song lên server dự phòng khác địa lý (R2 DR · Singapore)</Checkbox>
            </Form.Item>
          </Form>
        </div>
      </ModalShell>
    </div>
  );
};

export default EmrCloudSync;
