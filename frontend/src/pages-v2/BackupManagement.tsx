import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input, InputNumber, Modal, Switch, Select } from 'antd';
import {
  getBackupHistory, createBackupWithHistory, requestRestore,
  getBackupConfig, saveBackupConfig,
} from '../modules/administration/api/dataExport';
import type {
  BackupHistoryDto, BackupConfigDto, RestoreBackupResultDto,
} from '../modules/administration/api/dataExport';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, DrSec, DrField, ModalShell,
  type ColumnDef, type TopTab,
} from './_v2kit';

/* ────────────────────────────────────────────────────────────
   Backup Management v2 — Quản lý backup, restore, cấu hình lịch
   Tabs: history | config
   Cơ chế restore: KHÔNG tự động DROP/RESTORE — chỉ ghi nhận +
   trả script T-SQL để admin chạy thủ công. An toàn cho production.
   ──────────────────────────────────────────────────────────── */

type TopKey = 'history' | 'config';

const TOP_TABS: TopTab<TopKey>[] = [
  { v: 'history', l: 'Lịch sử backup', ic: 'archive' },
  { v: 'config',  l: 'Cấu hình & Lịch', ic: 'settings' },
];

const fmtSize = (bytes: number) => {
  if (bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY HH:mm') : '—';

const statusTone = (s: number): 'ok' | 'warn' | 'crit' | 'info' =>
  s === 1 ? 'ok' : s === 2 ? 'crit' : 'info';

const PAGE_SIZE = 20;

const DEST_OPTIONS = [
  { value: 'Local', label: 'Local (ổ đĩa máy chủ)' },
  { value: 'NAS',   label: 'NAS (mạng nội bộ)' },
  { value: 'Cloud', label: 'Cloud (R2/GCS/S3)' },
];

// ── Main component ──────────────────────────────────────────────────────────

const BackupManagement: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [tab, setTab] = useState<TopKey>('history');
  const [history, setHistory] = useState<BackupHistoryDto[]>([]);
  const [config, setConfig] = useState<BackupConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(0);

  // Drawer — chi tiết backup
  const [selRow, setSelRow] = useState<BackupHistoryDto | null>(null);

  // Restore modal
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');
  const [restoreResult, setRestoreResult] = useState<RestoreBackupResultDto | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Backup now modal
  const [backupNowOpen, setBackupNowOpen] = useState(false);
  const [backupNowDest, setBackupNowDest] = useState<string>('');
  const [backupNowLoading, setBackupNowLoading] = useState(false);

  // Config form state (local copy for editing)
  const [cfgForm, setCfgForm] = useState<BackupConfigDto>({
    destination: 'Local',
    scheduleEnabled: false,
    retentionCount: 30,
  });

  const reload = () => {
    setLoading(true);
    Promise.allSettled([getBackupHistory(), getBackupConfig()]).then(([h, c]) => {
      if (h.status === 'fulfilled') setHistory(h.value);
      if (c.status === 'fulfilled') {
        setConfig(c.value);
        setCfgForm(c.value);
      }
      setLoading(false);
    });
  };

  useEffect(reload, []);

  // ── KPI ──

  const kpis = useMemo(() => {
    const total = history.length;
    const success = history.filter(h => h.status === 1).length;
    const failed = history.filter(h => h.status === 2).length;
    const last = history.find(h => h.status === 1);
    const totalSize = history.filter(h => h.status === 1).reduce((s, h) => s + h.sizeBytes, 0);
    return [
      { lbl: 'Tổng bản backup', val: total, tone: undefined as never },
      { lbl: 'Thành công', val: success, tone: 'ok' as const },
      { lbl: 'Thất bại', val: failed, tone: failed > 0 ? 'crit' as const : undefined as never },
      { lbl: 'Dung lượng backup', val: fmtSize(totalSize), tone: undefined as never },
      { lbl: 'Backup gần nhất', val: last ? fmtDT(last.startedAt) : 'Chưa có', tone: undefined as never },
      { lbl: 'Backup tự động', val: config?.scheduleEnabled ? 'Bật' : 'Tắt', tone: config?.scheduleEnabled ? 'ok' as const : 'warn' as const },
    ];
  }, [history, config]);

  // ── Table data ──

  const filtered = useMemo(() => {
    let rows = history;
    if (filterStatus) rows = rows.filter(r => r.status === parseInt(filterStatus));
    if (filterType) rows = rows.filter(r => r.backupType === parseInt(filterType));
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.fileName.toLowerCase().includes(q) ||
        (r.destination ?? '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [history, filterStatus, filterType, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const COLS: ColumnDef<BackupHistoryDto>[] = [
    {
      key: 'fileName', label: 'Tên file', mono: true,
      render: r => <span title={r.filePath ?? r.fileName}>{r.fileName}</span>,
    },
    {
      key: 'status', label: 'Trạng thái', width: 110,
      render: r => <StatusBadge tone={statusTone(r.status)} dot>{r.statusName}</StatusBadge>,
    },
    {
      key: 'backupType', label: 'Loại', width: 90,
      render: r => <span style={{ color: r.backupType === 1 ? 'var(--s-info)' : 'var(--t-1)' }}>{r.backupTypeName}</span>,
    },
    { key: 'destination', label: 'Đích', width: 80, render: r => r.destination ?? '—' },
    { key: 'sizeBytes', label: 'Dung lượng', width: 110, render: r => fmtSize(r.sizeBytes) },
    { key: 'startedAt', label: 'Bắt đầu', width: 140, render: r => fmtDT(r.startedAt) },
    { key: 'completedAt', label: 'Hoàn thành', width: 140, render: r => fmtDT(r.completedAt) },
    { key: 'createdBy', label: 'Người tạo', width: 120, render: r => r.createdBy ?? '—' },
  ];

  // ── Handlers ──

  const handleBackupNow = async () => {
    setBackupNowLoading(true);
    try {
      await createBackupWithHistory({ backupLabel: 'Full', destination: backupNowDest || undefined });
      message.success('Đã khởi động backup. Trạng thái sẽ cập nhật sau vài giây.');
      setBackupNowOpen(false);
      setTimeout(reload, 3000);
    } catch {
      message.error('Tạo backup thất bại. Xem log backend để biết chi tiết.');
    } finally {
      setBackupNowLoading(false);
    }
  };

  const handleRequestRestore = async () => {
    if (!selRow) return;
    if (!restoreReason.trim()) {
      message.warning('Vui lòng nhập lý do restore.');
      return;
    }
    setRestoreLoading(true);
    try {
      const result = await requestRestore(selRow.id, { confirmRisk: true, reason: restoreReason });
      setRestoreResult(result);
    } catch {
      message.error('Yêu cầu restore thất bại.');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      const saved = await saveBackupConfig(cfgForm);
      setConfig(saved);
      message.success('Đã lưu cấu hình backup.');
    } catch {
      message.error('Lưu cấu hình thất bại.');
    } finally {
      setConfigSaving(false);
    }
  };

  // ── Render ──

  return (
    <div className="ab-module">
      <KpiStrip items={kpis} />

      <TopTabs
        tab={tab}
        setTab={v => { setTab(v); setPage(0); }}
        tabs={TOP_TABS}
        actions={
          tab === 'history' ? (
            <Btn variant="primary" icon="plus" onClick={() => setBackupNowOpen(true)}>
              Backup ngay
            </Btn>
          ) : null
        }
      />

      {/* ── Tab: Lịch sử backup ── */}
      {tab === 'history' && (
        <>
          <div className="ab-toolbar">
            <SearchBox value={search} onChange={v => { setSearch(v); setPage(0); }} placeholder="Tìm tên file..." />
            <Filter
              value={filterStatus}
              onChange={v => { setFilterStatus(v); setPage(0); }}
              options={[
                { v: '0', l: 'Đang chạy' },
                { v: '1', l: 'Thành công' },
                { v: '2', l: 'Thất bại' },
              ]}
              placeholder="Tất cả trạng thái"
            />
            <Filter
              value={filterType}
              onChange={v => { setFilterType(v); setPage(0); }}
              options={[
                { v: '0', l: 'Thủ công' },
                { v: '1', l: 'Tự động' },
              ]}
              placeholder="Tất cả loại"
            />
            <Btn variant="ghost" icon="refresh" onClick={reload}>Làm mới</Btn>
          </div>

          {loading ? (
            <div className="ab-empty">Đang tải...</div>
          ) : (
            <DataTable
              columns={COLS}
              data={pageData}
              rowKey={r => r.id}
              onRowClick={r => setSelRow(r)}
              actions={r => (
                <>
                  {r.status === 1 && (
                    <ActBtn
                      ic="rotate-ccw"
                      title="Yêu cầu restore"
                      tone="warn"
                      onClick={() => { setSelRow(r); setRestoreOpen(true); setRestoreResult(null); setRestoreReason(''); }}
                    />
                  )}
                </>
              )}
            />
          )}

          <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PAGE_SIZE} />
        </>
      )}

      {/* ── Tab: Cấu hình & Lịch ── */}
      {tab === 'config' && (
        <div style={{ padding: '20px 24px', maxWidth: 600 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-18)' }}>
            <div>
              <label className="ab-label">Đích lưu trữ mặc định</label>
              <Select
                value={cfgForm.destination}
                onChange={v => setCfgForm(f => ({ ...f, destination: v }))}
                options={DEST_OPTIONS}
                style={{ width: '100%' }}
              />
            </div>

            {cfgForm.destination === 'NAS' && (
              <div>
                <label className="ab-label">Đường dẫn NAS (UNC hoặc mount point)</label>
                <Input
                  value={cfgForm.nasPath ?? ''}
                  onChange={e => setCfgForm(f => ({ ...f, nasPath: e.target.value }))}
                  placeholder="\\\\nas-server\\backups hoặc /mnt/nas/backups"
                />
              </div>
            )}

            {cfgForm.destination === 'Cloud' && (
              <div>
                <label className="ab-label">Cloud Bucket / Container name</label>
                <Input
                  value={cfgForm.cloudBucket ?? ''}
                  onChange={e => setCfgForm(f => ({ ...f, cloudBucket: e.target.value }))}
                  placeholder="his-pacs-backup (R2) hoặc gs://his-backup"
                />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <Switch
                checked={cfgForm.scheduleEnabled}
                onChange={v => setCfgForm(f => ({ ...f, scheduleEnabled: v }))}
              />
              <span>Bật backup tự động</span>
            </div>

            {cfgForm.scheduleEnabled && (
              <>
                <div>
                  <label className="ab-label">Khoảng cách tự động (giờ)</label>
                  <InputNumber
                    min={1} max={168}
                    value={cfgForm.scheduleIntervalHours ?? 24}
                    onChange={v => setCfgForm(f => ({ ...f, scheduleIntervalHours: v ?? 24 }))}
                    addonAfter="giờ"
                    style={{ width: 180 }}
                  />
                </div>

                <div>
                  <label className="ab-label">Cron expression (tuỳ chọn, ưu tiên hơn khoảng cách giờ)</label>
                  <Input
                    value={cfgForm.scheduleCron ?? ''}
                    onChange={e => setCfgForm(f => ({ ...f, scheduleCron: e.target.value }))}
                    placeholder='Ví dụ: "0 2 * * *" = 2:00 sáng mỗi ngày'
                  />
                </div>
              </>
            )}

            <div>
              <label className="ab-label">Giữ tối đa (bản)</label>
              <InputNumber
                min={1} max={365}
                value={cfgForm.retentionCount}
                onChange={v => setCfgForm(f => ({ ...f, retentionCount: v ?? 30 }))}
                addonAfter="bản"
                style={{ width: 180 }}
              />
            </div>

            <div style={{ paddingTop: 'var(--space-8)' }}>
              <Btn variant="primary" loading={configSaving} onClick={handleSaveConfig}>
                Lưu cấu hình
              </Btn>
            </div>

            <div
              style={{
                marginTop: 'var(--space-8)', padding: '10px 14px',
                background: 'var(--bg-2)', borderRadius: 'var(--r-2)',
                fontSize: 'var(--fs-sm)', color: 'var(--t-2)', lineHeight: 1.6,
              }}
            >
              <b>Lưu ý về backup Cloud:</b> Hiện tại BackupSchedulerWorker thực hiện BACKUP TO DISK (local/NAS).
              Upload lên Cloud (R2/GCS/S3) yêu cầu tích hợp thêm storage SDK — xem Issue #129.
              Cấu hình Cloud bucket được lưu sẵn để dùng khi tích hợp đầy đủ.
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer chi tiết backup ── */}
      <DrawerShell
        open={!!selRow && !restoreOpen}
        onClose={() => setSelRow(null)}
        title={selRow?.fileName ?? 'Chi tiết backup'}
        size="md"
      >
        {selRow && (
          <>
            <DrSec title="Thông tin backup">
              <DrField lbl="Tên file">{selRow.fileName}</DrField>
              <DrField lbl="Đường dẫn">{selRow.filePath ?? '—'}</DrField>
              <DrField lbl="Dung lượng">{fmtSize(selRow.sizeBytes)}</DrField>
              <DrField lbl="Loại">{selRow.backupTypeName}</DrField>
              <DrField lbl="Đích">{selRow.destination ?? '—'}</DrField>
              <DrField lbl="Trạng thái">
                <StatusBadge tone={statusTone(selRow.status)} dot>{selRow.statusName}</StatusBadge>
              </DrField>
            </DrSec>
            <DrSec title="Thời gian">
              <DrField lbl="Bắt đầu">{fmtDT(selRow.startedAt)}</DrField>
              <DrField lbl="Hoàn thành">{fmtDT(selRow.completedAt)}</DrField>
              {selRow.errorMessage && (
                <DrField lbl="Lỗi">
                  <span style={{ color: 'var(--s-crit)', wordBreak: 'break-word' }}>{selRow.errorMessage}</span>
                </DrField>
              )}
            </DrSec>
            {selRow.status === 1 && (
              <div style={{ padding: '0 0 16px' }}>
                <Btn
                  variant="crit"
                  icon="rotate-ccw"
                  onClick={() => { setRestoreOpen(true); setRestoreResult(null); setRestoreReason(''); }}
                >
                  Yêu cầu Restore
                </Btn>
                <div style={{ marginTop: 'var(--space-8)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
                  Restore sẽ GHI DE toan bo du lieu. Chi admin co quyen moi thuc thi.
                </div>
              </div>
            )}
          </>
        )}
      </DrawerShell>

      {/* ── Modal Backup ngay ── */}
      <ModalShell
        open={backupNowOpen}
        onClose={() => setBackupNowOpen(false)}
        title="Backup ngay"
        footer={
          <>
            <Btn onClick={() => setBackupNowOpen(false)}>Huỷ</Btn>
            <Btn variant="primary" loading={backupNowLoading} onClick={handleBackupNow}>
              Bắt đầu backup
            </Btn>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          <div>
            <label className="ab-label">Đích lưu trữ (để trống = dùng cấu hình hệ thống)</label>
            <Select
              value={backupNowDest || undefined}
              onChange={v => setBackupNowDest(v ?? '')}
              options={DEST_OPTIONS}
              allowClear
              placeholder="Dùng cấu hình hệ thống"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
            Backup Full Database sẽ được chạy bất đồng bộ. Kết quả hiển thị trong lịch sử sau khi hoàn thành.
          </div>
        </div>
      </ModalShell>

      {/* ── Modal Restore ── */}
      <Modal
        open={restoreOpen}
        title="Yeu cau Restore Database"
        onCancel={() => { setRestoreOpen(false); setRestoreResult(null); }}
        footer={
          restoreResult ? (
            <Btn onClick={() => { setRestoreOpen(false); setRestoreResult(null); }}>Dong</Btn>
          ) : (
            <>
              <Btn onClick={() => setRestoreOpen(false)}>Huy</Btn>
              <Btn
                variant="crit"
                loading={restoreLoading}
                onClick={handleRequestRestore}
              >
                Gui yeu cau
              </Btn>
            </>
          )
        }
        destroyOnHidden
      >
        {!restoreResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-14)' }}>
            <div
              style={{
                padding: '10px 14px', borderRadius: 'var(--r-2)',
                background: '#fff3cd', border: '1px solid #ffc107',
                fontSize: 'var(--fs-md)',
              }}
            >
              <b>Canh bao:</b> Restore se GHI DE toan bo du lieu hien tai cua database.
              Hanh dong nay khong the hoan tac. Chi thuc hien khi co su dong y cua quan tri vien.
              <br /><br />
              Sau khi xac nhan, he thong se tra ve script T-SQL de admin chay thu cong.
              <b> He thong KHONG tu dong restore tren production.</b>
            </div>

            {selRow && (
              <div style={{ fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>
                File: <b>{selRow.fileName}</b> ({fmtSize(selRow.sizeBytes)}) — {fmtDT(selRow.startedAt)}
              </div>
            )}

            <div>
              <label className="ab-label">Ly do restore (*bat buoc)</label>
              <Input.TextArea
                rows={3}
                value={restoreReason}
                onChange={e => setRestoreReason(e.target.value)}
                placeholder="Mo ta ly do can restore du lieu (bat buoc de ghi audit log)"
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-14)' }}>
            <div
              style={{
                padding: '10px 14px', borderRadius: 'var(--r-2)',
                background: restoreResult.status === 'Pending' ? '#d4edda' : '#f8d7da',
                border: `1px solid ${restoreResult.status === 'Pending' ? '#28a745' : '#dc3545'}`,
                fontSize: 'var(--fs-md)',
              }}
            >
              <b>{restoreResult.status === 'Pending' ? 'Yeu cau da duoc ghi nhan' : 'Yeu cau bi tu choi'}</b>
              <br />{restoreResult.message}
            </div>

            {restoreResult.manualRestoreScript && (
              <div>
                <div style={{ marginBottom: 'var(--space-6)', fontWeight: 600, fontSize: 'var(--fs-md)' }}>
                  Script T-SQL de admin chay (SSMS / sqlcmd):
                </div>
                <pre
                  style={{
                    background: '#1e1e1e', color: '#d4d4d4',
                    padding: 'var(--space-12)', borderRadius: 'var(--r-2)', fontSize: 'var(--fs-sm)',
                    overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    maxHeight: 300, overflowY: 'auto',
                  }}
                >
                  {restoreResult.manualRestoreScript}
                </pre>
                <Btn
                  size="sm"
                  icon="copy"
                  onClick={() => {
                    navigator.clipboard.writeText(restoreResult.manualRestoreScript ?? '');
                    message.success('Da copy script');
                  }}
                  style={{ marginTop: 'var(--space-6)' }}
                >
                  Copy script
                </Btn>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BackupManagement;
