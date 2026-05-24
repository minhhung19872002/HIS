import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Checkbox } from 'antd';
import {
  KpiStrip, DataTable, StatusTabs, SearchBox, DrawerShell, ModalShell,
  tk, te, fmtDTg
} from './_v2kit';
import type { ColumnDef } from './_v2kit';
import { emrCloudSyncApi } from '../api/nangcap24';
import type { EmrCloudSyncLogDto, EmrCloudSyncStatusDto } from '../api/nangcap24';

type StatusTab = 'done' | 'pending' | 'failed';
const STATUS_TABS = [
  { v: 'done' as const, l: 'Đã đồng bộ', tone: 'ok' as const },
  { v: 'pending' as const, l: 'Đang xử lý', tone: 'warn' as const },
  { v: 'failed' as const, l: 'Lỗi', tone: 'crit' as const },
];

const EmrCloudSync: React.FC = () => {
  const [rows, setRows] = useState<EmrCloudSyncLogDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState<EmrCloudSyncStatusDto | null>(null);
  const [stab, setStab] = useState<StatusTab | 'all'>('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<EmrCloudSyncLogDto | null>(null);
  const [syncModal, setSyncModal] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [logs, status] = await Promise.all([
        emrCloudSyncApi.getLogs(undefined, undefined, 1, 100),
        emrCloudSyncApi.getStatus(),
      ]);
      setRows(logs);
      setStatusInfo(status);
    } catch {
      te('Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => {
    if (stab !== 'all' && r.status !== stab) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.fileName.toLowerCase().includes(s) &&
          !r.destination.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const kpis = [
    { lbl: 'Tổng HSBA đã đồng bộ', val: statusInfo?.totalRecordsTracked ?? 0 },
    { lbl: 'Đồng bộ đầy đủ', val: statusInfo?.fullySyncedCount ?? 0, tone: 'ok' as const },
    { lbl: 'Đồng bộ một phần', val: statusInfo?.partialSyncedCount ?? 0, tone: 'warn' as const },
    { lbl: 'Lỗi đồng bộ', val: statusInfo?.failedSyncCount ?? 0, tone: 'crit' as const },
  ];

  const columns: ColumnDef<EmrCloudSyncLogDto>[] = [
    { key: 'fileName', label: 'Tên file', code: true, render: r => r.fileName },
    { key: 'fileType', label: 'Loại', render: r => <span style={{ color: '#0ea5e9' }}>{r.fileType}</span> },
    { key: 'size', label: 'Kích thước', mono: true, render: r => `${(r.fileSizeBytes / 1024).toFixed(1)} KB` },
    {
      key: 'dest', label: 'Đích', render: r => {
        const map: Record<string, { label: string; color: string }> = {
          r2_primary: { label: 'R2 Primary', color: '#16a34a' },
          r2_dr: { label: 'R2 DR (DR)', color: '#0ea5e9' },
          local_backup: { label: 'Local backup', color: '#64748b' },
        };
        const c = map[r.destination] ?? { label: r.destination, color: '#64748b' };
        return <span style={{ color: c.color, fontWeight: 600 }}>{c.label}</span>;
      }
    },
    {
      key: 'status', label: 'Trạng thái', render: r => {
        const tone = r.status === 'done' ? '#16a34a' : r.status === 'failed' ? '#ef4444' : '#f59e0b';
        return <span style={{ color: tone, fontWeight: 600 }}>{r.status}</span>;
      }
    },
    { key: 'retries', label: 'Retry', mono: true, render: r => `${r.retryCount}` },
    { key: 'completedAt', label: 'Hoàn tất', render: r => r.completedAt ? fmtDTg(r.completedAt) : '-' },
  ];

  const handleSync = async () => {
    try {
      const values = await form.validateFields();
      await emrCloudSyncApi.sync({
        medicalRecordId: values.medicalRecordId,
        fileTypes: values.fileTypes,
        syncToDr: values.syncToDr,
      });
      tk('Đã trigger đồng bộ');
      setSyncModal(false);
      form.resetFields();
      load();
    } catch {
      te('Đồng bộ thất bại');
    }
  };

  const retryAll = async () => {
    try {
      const result = await emrCloudSyncApi.retryFailed();
      tk(`Đã retry ${result.retried} file lỗi`);
      load();
    } catch {
      te('Retry thất bại');
    }
  };

  return (
    <div className="ab-stack">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm theo tên file / destination..." />
        <Button onClick={() => setSyncModal(true)} type="primary" data-testid="open-sync-modal">Đồng bộ HSBA mới</Button>
        <Button onClick={retryAll} loading={loading}>Retry lỗi</Button>
        <Button onClick={load} loading={loading}>Tải lại</Button>
      </div>

      <StatusTabs
        value={stab}
        onChange={setStab}
        tabs={STATUS_TABS}
        counts={{
          all: rows.length,
          done: rows.filter(r => r.status === 'done').length,
          pending: rows.filter(r => r.status === 'pending' || r.status === 'uploading').length,
          failed: rows.filter(r => r.status === 'failed').length,
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={r => r.id}
        onRowClick={r => setDetail(r)}
      />

      <DrawerShell open={!!detail} onClose={() => setDetail(null)} title={detail?.fileName ?? ''} sub={detail?.destination}>
        {detail && (
          <div className="rec-section">
            <div className="rec-kv">
              <div className="lbl">HSBA ID:</div><div className="mono">{detail.medicalRecordId}</div>
              <div className="lbl">Loại file:</div><div>{detail.fileType}</div>
              <div className="lbl">Kích thước:</div><div>{(detail.fileSizeBytes / 1024).toFixed(1)} KB</div>
              <div className="lbl">SHA-256:</div><div className="mono" style={{ fontSize: 10, wordBreak: 'break-all' }}>{detail.fileHash || '-'}</div>
              <div className="lbl">Remote path:</div><div className="mono" style={{ fontSize: 11 }}>{detail.remotePath || '-'}</div>
              <div className="lbl">Trạng thái:</div><div>{detail.status}</div>
              <div className="lbl">Số lần retry:</div><div>{detail.retryCount}</div>
              <div className="lbl">Hoàn tất:</div><div>{detail.completedAt ? fmtDTg(detail.completedAt) : '-'}</div>
            </div>
            {detail.errorMessage && (
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.08)', borderRadius: 6, color: '#dc2626' }}>
                <strong>Lỗi:</strong> {detail.errorMessage}
              </div>
            )}
          </div>
        )}
      </DrawerShell>

      <ModalShell
        open={syncModal}
        onClose={() => { setSyncModal(false); form.resetFields(); }}
        title="Đồng bộ HSBA lên Cloud"
        footer={(
          <>
            <Button onClick={() => { setSyncModal(false); form.resetFields(); }}>Hủy</Button>
            <Button type="primary" onClick={handleSync}>Bắt đầu đồng bộ</Button>
          </>
        )}
      >
        <Form form={form} layout="vertical" initialValues={{ fileTypes: ['signed_xml', 'hl7', 'pdf'], syncToDr: true }}>
          <Form.Item name="medicalRecordId" label="HSBA ID (UUID)" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Input placeholder="VD: 12345678-1234-1234-1234-123456789012" />
          </Form.Item>
          <Form.Item name="fileTypes" label="Loại file đồng bộ">
            <Checkbox.Group options={[
              { label: 'Signed XML (đã ký số)', value: 'signed_xml' },
              { label: 'HL7 v2 archive', value: 'hl7' },
              { label: 'PDF bệnh án', value: 'pdf' },
              { label: 'DICOM ZIP', value: 'dicom_zip' },
            ]} />
          </Form.Item>
          <Form.Item name="syncToDr" valuePropName="checked">
            <Checkbox>Đồng bộ sang server dự phòng (DR) khác địa lý</Checkbox>
          </Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default EmrCloudSync;
