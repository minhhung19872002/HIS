// Panel chuyển giao dữ liệu — port v1 pages/system-admin/DataManagementTab.tsx sang v2.
// API dataExport trả giá trị đã unwrap (không phải AxiosResponse) — giữ nguyên cách dùng v1.

import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import * as dataExportApi from '../../administration/api/dataExport';
import type {
  DataStatsDto, ModuleDataCountDto, BackupInfoDto, DataExportResultDto, DataHandoverDto,
} from '../../administration/api/dataExport';
import {
  KpiStrip, DataTable, StatusBadge, Btn, tk, te, cf, type ColumnDef,
} from '../../../pages-v2/_v2kit';

const HANDOVER_TONE: Record<number, 'ok' | 'info' | 'warn' | 'crit' | undefined> = { 0: undefined, 1: 'warn', 2: 'ok', 3: 'info' };

const DataManagementPanel: React.FC = () => {
  const [stats, setStats] = useState<DataStatsDto | null>(null);
  const [moduleCounts, setModuleCounts] = useState<ModuleDataCountDto[]>([]);
  const [backups, setBackups] = useState<BackupInfoDto[]>([]);
  const [exportHistory, setExportHistory] = useState<DataExportResultDto[]>([]);
  const [handovers, setHandovers] = useState<DataHandoverDto[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, countsRes, backupsRes, exportsRes, handoversRes] = await Promise.allSettled([
        dataExportApi.getDataStats(),
        dataExportApi.getModuleDataCounts(),
        dataExportApi.getBackups(),
        dataExportApi.getExportHistory(),
        dataExportApi.getHandovers(),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (countsRes.status === 'fulfilled') setModuleCounts(Array.isArray(countsRes.value) ? countsRes.value : []);
      if (backupsRes.status === 'fulfilled') setBackups(Array.isArray(backupsRes.value) ? backupsRes.value : []);
      if (exportsRes.status === 'fulfilled') setExportHistory(Array.isArray(exportsRes.value) ? exportsRes.value : []);
      if (handoversRes.status === 'fulfilled') setHandovers(Array.isArray(handoversRes.value) ? handoversRes.value : []);
    } catch { /* keep current */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const createBackup = () => {
    dataExportApi.createBackup('Full')
      .then(() => { tk('Đang tạo bản sao lưu…'); load(); })
      .catch(() => te('Không thể tạo sao lưu'));
  };
  const exportAll = () => {
    dataExportApi.requestExport({ modules: ['all'], format: 'JSON', includeAttachments: false })
      .then(() => { tk('Đang xuất dữ liệu…'); load(); })
      .catch(() => te('Không thể xuất dữ liệu'));
  };
  const createHandover = () => cf('Tạo bản sao lưu đầy đủ + biên bản chuyển giao dữ liệu cho bên thuê dịch vụ?', async () => {
    try {
      await dataExportApi.createHandover({ recipientName: 'Chủ đầu tư', recipientOrganization: 'Bệnh viện', modules: ['all'] });
      tk('Đã tạo biên bản chuyển giao'); load();
    } catch { te('Lỗi tạo biên bản'); }
  }, { confirm: 'Tạo' });
  const confirmHandover = (h: DataHandoverDto) => {
    dataExportApi.confirmHandover(h.id)
      .then(() => { tk('Đã xác nhận'); load(); })
      .catch(() => te('Lỗi xác nhận'));
  };

  const moduleColumns: ColumnDef<ModuleDataCountDto>[] = [
    { key: 'moduleName', label: 'Module', render: (m) => m.moduleName },
    { key: 'recordCount', label: 'Số bản ghi', mono: true, width: 130, render: (m) => m.recordCount?.toLocaleString('vi-VN') },
    { key: 'lastUpdated', label: 'Cập nhật cuối', mono: true, width: 150, render: (m) => m.lastUpdated ? dayjs(m.lastUpdated).format('DD/MM/YYYY HH:mm') : '—' },
  ];
  const backupColumns: ColumnDef<BackupInfoDto>[] = [
    { key: 'backupType', label: 'Loại', width: 90, render: (b) => b.backupType },
    { key: 'fileName', label: 'File', mono: true, render: (b) => b.fileName },
    { key: 'fileSize', label: 'Kích thước', mono: true, width: 100, render: (b) => b.fileSize ? `${(b.fileSize / 1024 / 1024).toFixed(1)} MB` : '—' },
    { key: 'createdAt', label: 'Ngày', mono: true, width: 120, render: (b) => b.createdAt ? dayjs(b.createdAt).format('DD/MM/YY HH:mm') : '—' },
    { key: 'status', label: 'TT', width: 80, render: (b) => (
      <StatusBadge tone={b.status === 'Completed' ? 'ok' : b.status === 'InProgress' ? 'warn' : 'crit'}>
        {b.status === 'Completed' ? 'OK' : b.status === 'InProgress' ? '…' : 'Lỗi'}
      </StatusBadge>
    ) },
  ];
  const exportColumns: ColumnDef<DataExportResultDto>[] = [
    { key: 'modules', label: 'Modules', render: (e) => e.modules?.join(', ') || '—' },
    { key: 'format', label: 'Format', width: 70, render: (e) => e.format },
    { key: 'recordCount', label: 'Bản ghi', mono: true, width: 80, render: (e) => e.recordCount },
    { key: 'requestedAt', label: 'Ngày', mono: true, width: 120, render: (e) => e.requestedAt ? dayjs(e.requestedAt).format('DD/MM/YY HH:mm') : '—' },
    { key: 'status', label: 'TT', width: 90, render: (e) => (
      <StatusBadge tone={e.status === 'Completed' ? 'ok' : e.status === 'InProgress' ? 'warn' : 'crit'}>{e.status}</StatusBadge>
    ) },
  ];
  const handoverColumns: ColumnDef<DataHandoverDto>[] = [
    { key: 'handoverCode', label: 'Mã', mono: true, code: true, width: 130, render: (h) => h.handoverCode },
    { key: 'handoverDate', label: 'Ngày', mono: true, width: 110, render: (h) => h.handoverDate ? dayjs(h.handoverDate).format('DD/MM/YYYY') : '—' },
    { key: 'recipientName', label: 'Người nhận', render: (h) => h.recipientName },
    { key: 'recipientOrganization', label: 'Đơn vị', render: (h) => h.recipientOrganization },
    { key: 'modules', label: 'Modules', mono: true, width: 80, render: (h) => h.modules?.length || 0 },
    { key: 'totalRecords', label: 'Bản ghi', mono: true, width: 100, render: (h) => h.totalRecords?.toLocaleString('vi-VN') },
    { key: 'statusName', label: 'Trạng thái', width: 110, render: (h) => <StatusBadge tone={HANDOVER_TONE[h.status]}>{h.statusName}</StatusBadge> },
  ];

  return (
    <>
      {stats && (
        <KpiStrip items={[
          { lbl: 'Bệnh nhân', val: stats.totalPatients },
          { lbl: 'Lượt khám', val: stats.totalExaminations },
          { lbl: 'Đơn thuốc', val: stats.totalPrescriptions },
          { lbl: 'KQ XN', val: stats.totalLabResults },
          { lbl: 'DB', val: stats.databaseSizeMB, unit: 'MB' },
          { lbl: 'Files', val: stats.attachmentsSizeMB, unit: 'MB' },
        ]} />
      )}

      <div className="ab-tools">
        <span style={{ fontWeight: 600 }}>Dữ liệu theo module</span>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>{loading ? 'Đang tải…' : 'Làm mới'}</Btn>
      </div>
      <DataTable<ModuleDataCountDto> columns={moduleColumns} data={moduleCounts} rowKey={(m) => m.moduleName}
        empty={loading ? 'Đang tải…' : 'Chưa có dữ liệu'} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)', marginTop: 'var(--space-12)' }}>
        <div>
          <div className="ab-tools">
            <span style={{ fontWeight: 600 }}>Sao lưu</span>
            <span className="spacer" />
            <Btn variant="primary" size="sm" onClick={createBackup}>Tạo sao lưu</Btn>
          </div>
          <DataTable<BackupInfoDto> columns={backupColumns} data={backups} rowKey={(b) => b.id}
            empty="Chưa có bản sao lưu" />
        </div>
        <div>
          <div className="ab-tools">
            <span style={{ fontWeight: 600 }}>Xuất dữ liệu</span>
            <span className="spacer" />
            <Btn variant="primary" size="sm" onClick={exportAll}>Xuất toàn bộ</Btn>
          </div>
          <DataTable<DataExportResultDto> columns={exportColumns} data={exportHistory} rowKey={(e) => e.id}
            empty="Chưa có lần xuất nào" />
        </div>
      </div>

      <div className="ab-tools" style={{ marginTop: 'var(--space-12)' }}>
        <span style={{ fontWeight: 600 }}>Biên bản chuyển giao dữ liệu</span>
        <span className="spacer" />
        <Btn variant="primary" size="sm" onClick={createHandover}>Tạo biên bản</Btn>
      </div>
      <DataTable<DataHandoverDto> columns={handoverColumns} data={handovers} rowKey={(h) => h.id}
        actions={(h) => h.status === 2 ? <Btn variant="primary" size="sm" onClick={() => confirmHandover(h)}>Xác nhận</Btn> : null}
        empty="Chưa có biên bản chuyển giao" />
    </>
  );
};

export default DataManagementPanel;
