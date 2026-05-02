import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import * as api from '../api/centralSigning';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, tw, Ico,
  type ColumnDef,
} from './_v2kit';

interface ManagedCertificate {
  id: string; serialNumber: string; subjectName: string; issuerName: string;
  caProvider: string; validFrom: string; validTo: string; isActive: boolean;
  ownerUserId?: string; ownerFullName?: string; cccd?: string;
  signatureImagePath?: string; storageType: string; createdAt: string;
}

interface SigningTransaction {
  id: string; userId: string; userFullName: string; action: string; dataType: string;
  success: boolean; errorMessage?: string; certificateSerial?: string;
  caProvider?: string; hashAlgorithm?: string; dataSizeBytes: number;
  durationMs: number; ipAddress?: string; timestamp: string;
}

interface SigningStats {
  totalTransactions: number; totalSuccess: number; totalFailed: number;
  activeCertificates: number; expiringSoon: number; expiredCertificates: number;
  activeUsers: number; todayTransactions: number;
}

type Tab = 'certs' | 'transactions' | 'config';
const TABS = [
  { v: 'certs' as Tab,        l: 'Chứng thư',   ic: 'card' },
  { v: 'transactions' as Tab, l: 'Giao dịch ký', ic: 'activity' },
  { v: 'config' as Tab,       l: 'Cấu hình',    ic: 'edit' },
];

const PER = 18;

const CentralSigningV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('certs');
  const [certs, setCerts] = useState<ManagedCertificate[]>([]);
  const [txs, setTxs] = useState<SigningTransaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [stats, setStats] = useState<SigningStats | null>(null);
  const [search, setSearch] = useState('');
  const [fStorage, setFStorage] = useState('');
  const [fSuccess, setFSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [selCert, setSelCert] = useState<ManagedCertificate | null>(null);
  const [selTx, setSelTx] = useState<SigningTransaction | null>(null);

  const fetchCerts = useCallback(async () => {
    try { const r = await api.getCertificates(); setCerts((r.data || []) as ManagedCertificate[]); }
    catch { ti('Không tải được chứng thư'); }
  }, []);

  const fetchTxs = useCallback(async (p = 0) => {
    try {
      const r = await api.getTransactions({
        pageIndex: p, pageSize: PER,
        success: fSuccess === '1' ? true : fSuccess === '0' ? false : undefined,
      });
      setTxs((r.data?.items || []) as SigningTransaction[]);
      setTxTotal(r.data?.total || 0);
    } catch { ti('Không tải được giao dịch'); }
  }, [fSuccess]);

  const fetchStats = useCallback(async () => {
    try { const r = await api.getStatistics(); setStats(r.data as SigningStats); }
    catch { /* silent */ }
  }, []);

  useEffect(() => { fetchCerts(); fetchStats(); }, [fetchCerts, fetchStats]);
  useEffect(() => { if (tab === 'transactions') fetchTxs(page); }, [tab, page, fetchTxs]);

  const storages = useMemo(() => {
    const set = new Set(certs.map((c) => c.storageType).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [certs]);

  const filteredCerts = useMemo(() => {
    const k = search.trim().toLowerCase();
    return certs.filter((c) => {
      if (fStorage && c.storageType !== fStorage) return false;
      if (!k) return true;
      return [c.serialNumber, c.subjectName, c.ownerFullName, c.cccd, c.caProvider]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [certs, search, fStorage]);

  const certPages = Math.max(1, Math.ceil(filteredCerts.length / PER));
  const pagedCerts = filteredCerts.slice(page * PER, (page + 1) * PER);

  const certCols: ColumnDef<ManagedCertificate>[] = [
    { key: 'sn', label: 'Số serial', code: true, render: (r) => r.serialNumber.slice(0, 16) + '…' },
    { key: 'subj', label: 'Chủ thể', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.subjectName}</div>
        {r.ownerFullName && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>👤 {r.ownerFullName}</div>}
      </div>
    ) },
    { key: 'ca', label: 'CA', render: (r) => r.caProvider },
    { key: 'storage', label: 'Lưu trữ', render: (r) => (
      <StatusBadge tone={r.storageType === 'HSM' ? 'crit' : r.storageType === 'Token' ? 'warn' : 'info'}>
        {r.storageType}
      </StatusBadge>
    ) },
    { key: 'cccd', label: 'CCCD', code: true, render: (r) => r.cccd || '—' },
    { key: 'valid', label: 'Hết hạn', mono: true, render: (r) => {
      const to = dayjs(r.validTo);
      const days = to.diff(dayjs(), 'day');
      const tone = days < 0 ? 'var(--a-rd-text)' : days < 30 ? 'var(--a-or-text)' : undefined;
      return (
        <div>
          <div style={{ color: tone, fontWeight: days < 30 ? 600 : 400 }}>{to.format('DD/MM/YYYY')}</div>
          <div style={{ fontSize: 10, color: 'var(--t-2)' }}>
            {days < 0 ? `quá ${-days}d` : days < 30 ? `còn ${days}d` : `${Math.round(days / 30)}t`}
          </div>
        </div>
      );
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => r.isActive
      ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
      : <StatusBadge tone="warn" dot>Tắt</StatusBadge>
    },
  ];

  const txCols: ColumnDef<SigningTransaction>[] = [
    { key: 'time', label: 'Thời gian', mono: true, render: (r) => dayjs(r.timestamp).format('DD/MM HH:mm:ss') },
    { key: 'user', label: 'Người ký', render: (r) => r.userFullName },
    { key: 'action', label: 'Hành động', render: (r) => (
      <StatusBadge tone="info">{r.action}</StatusBadge>
    ) },
    { key: 'type', label: 'Loại DL', render: (r) => r.dataType },
    { key: 'size', label: 'Kích cỡ', mono: true, render: (r) => `${(r.dataSizeBytes / 1024).toFixed(1)}KB` },
    { key: 'dur', label: 'Tg ký', mono: true, render: (r) => `${r.durationMs}ms` },
    { key: 'ip', label: 'IP', code: true, render: (r) => r.ipAddress || '—' },
    { key: 'st', label: 'KQ', render: (r) => r.success
      ? <StatusBadge tone="ok" dot>Thành công</StatusBadge>
      : <StatusBadge tone="crit" dot>Lỗi</StatusBadge>
    },
  ];

  const successOpts = [{ v: '1', l: 'Thành công' }, { v: '0', l: 'Lỗi' }];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Chứng thư', val: stats?.activeCertificates ?? certs.filter((c) => c.isActive).length,
          sub: `${certs.length} tổng`, tone: 'ok' },
        { lbl: 'Sắp hết hạn', val: stats?.expiringSoon ?? 0, sub: '< 30 ngày', tone: 'warn' },
        { lbl: 'Giao dịch hôm nay', val: stats?.todayTransactions ?? 0, sub: 'lượt ký', tone: 'info' },
        { lbl: 'Lỗi', val: stats?.totalFailed ?? 0,
          sub: stats ? `${Math.round(((stats.totalFailed || 0) / Math.max(1, stats.totalTransactions)) * 100)}% tỷ lệ` : '—',
          tone: 'crit' },
      ]} />

      <TopTabs<Tab> tab={tab} setTab={(v) => { setTab(v); setPage(0); }} tabs={TABS} actions={
        <>
          <button className="ab-btn ghost" type="button" onClick={() => {
            if (tab === 'certs') fetchCerts();
            else if (tab === 'transactions') fetchTxs(page);
            fetchStats();
          }}>
            <Ico name="refresh" size={12} /> Làm mới
          </button>
          {tab === 'certs' && (
            <button className="ab-btn primary" type="button" onClick={() => tk('Mở thêm chứng thư')}>
              <Ico name="plus" size={12} /> Thêm chứng thư
            </button>
          )}
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        {tab === 'certs' && <>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Tìm subject / CCCD / serial / CA…" />
          <Filter value={fStorage} onChange={setFStorage} options={storages} placeholder="▾ Loại lưu trữ" />
          <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFStorage(''); }}>
            <Ico name="x" size={12} /> Bỏ lọc
          </button>
        </>}
        {tab === 'transactions' && <>
          <Filter value={fSuccess} onChange={(v) => { setFSuccess(v); setPage(0); }} options={successOpts} placeholder="▾ Trạng thái" />
          <button className="ab-btn ghost" type="button" onClick={() => setFSuccess('')}>
            <Ico name="x" size={12} /> Bỏ lọc
          </button>
        </>}
        <span className="spacer" />
        {tab === 'transactions' && (
          <button className="ab-btn ghost" type="button" onClick={async () => {
            try { const r = await api.exportSerials(); tk('Đã xuất serials'); console.log(r); }
            catch { tw('Lỗi khi xuất'); }
          }}>
            <Ico name="download" size={12} /> Xuất serials
          </button>
        )}
      </div>

      {tab === 'certs' && <>
        <DataTable<ManagedCertificate>
          columns={certCols} data={pagedCerts} rowKey={(r) => r.id}
          onRowClick={setSelCert}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="eye" title="Chi tiết" onClick={() => setSelCert(r)} />
              <ActBtn ic="edit" title="Sửa" onClick={() => tk(`Sửa ${r.subjectName}`)} />
              <ActBtn ic="trash" title="Xóa" tone="crit" onClick={async () => {
                try { await api.deleteCertificate(r.id); tk('Đã xóa'); fetchCerts(); }
                catch { tw('Lỗi khi xóa'); }
              }} />
            </div>
          )}
          empty={'Chưa có chứng thư'}
        />
        <Pager page={page} setPage={setPage} totalPages={certPages} total={filteredCerts.length} perPage={PER} />
      </>}

      {tab === 'transactions' && <>
        <DataTable<SigningTransaction>
          columns={txCols} data={txs} rowKey={(r) => r.id}
          onRowClick={setSelTx}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="eye" title="Chi tiết" onClick={() => setSelTx(r)} />
            </div>
          )}
          empty={'Chưa có giao dịch'}
        />
        <Pager page={page} setPage={setPage} totalPages={Math.max(1, Math.ceil(txTotal / PER))} total={txTotal} perPage={PER} />
      </>}

      {tab === 'config' && (
        <div style={{ padding: 24 }}>
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span>Cấu hình hiển thị chữ ký</span>
            </div>
            <div style={{ padding: 24, color: 'var(--t-2)', fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}>Cấu hình appearance · TOTP · CSR · HSM cho ký số tập trung.</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                <button className="ab-btn" type="button" onClick={() => tk('Mở appearance config')}>
                  <Ico name="edit" size={12} /> Cấu hình appearance
                </button>
                <button className="ab-btn" type="button" onClick={async () => {
                  try { await api.setupTotp(); tk('Đã setup TOTP'); }
                  catch { tw('Lỗi setup TOTP'); }
                }}>
                  <Ico name="lock" size={12} /> Setup TOTP
                </button>
                <button className="ab-btn" type="button" onClick={() => tk('Mở HSM info')}>
                  <Ico name="card" size={12} /> HSM info
                </button>
                <button className="ab-btn" type="button" onClick={() => tk('Mở tạo CSR')}>
                  <Ico name="plus" size={12} /> Tạo CSR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DrawerShell
        open={!!selCert}
        onClose={() => setSelCert(null)}
        size="lg"
        title={selCert?.subjectName || ''}
        sub={selCert ? `${selCert.caProvider} · ${selCert.storageType}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSelCert(null)}>Đóng</button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở chỉnh sửa')}>
            <Ico name="edit" size={12} /> Chỉnh sửa
          </button>
        </>}
      >
        {selCert && <>
          <DrSec title="Chứng thư">
            <DrField lbl="Số serial"><span style={{ fontFamily: 'var(--font-mono)' }}>{selCert.serialNumber}</span></DrField>
            <DrField lbl="Chủ thể">{selCert.subjectName}</DrField>
            <DrField lbl="Cấp bởi">{selCert.issuerName}</DrField>
            <DrField lbl="CA Provider">{selCert.caProvider}</DrField>
            <DrField lbl="Lưu trữ">
              <StatusBadge tone={selCert.storageType === 'HSM' ? 'crit' : selCert.storageType === 'Token' ? 'warn' : 'info'}>
                {selCert.storageType}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Chủ sở hữu">
            <DrField lbl="Tên">{selCert.ownerFullName || '—'}</DrField>
            <DrField lbl="CCCD"><span style={{ fontFamily: 'var(--font-mono)' }}>{selCert.cccd || '—'}</span></DrField>
            <DrField lbl="Có ảnh chữ ký">{selCert.signatureImagePath ? 'Có' : 'Không'}</DrField>
          </DrSec>
          <DrSec title="Hiệu lực">
            <DrField lbl="Hiệu lực từ">{dayjs(selCert.validFrom).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Hết hạn">
              <span style={{ color: dayjs(selCert.validTo).isBefore(dayjs()) ? 'var(--a-rd-text)' : undefined, fontFamily: 'var(--font-mono)' }}>
                {dayjs(selCert.validTo).format('DD/MM/YYYY')}
              </span>
            </DrField>
            <DrField lbl="Tạo lúc">{dayjs(selCert.createdAt).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Trạng thái">
              {selCert.isActive
                ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
                : <StatusBadge tone="warn" dot>Tắt</StatusBadge>}
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <DrawerShell
        open={!!selTx}
        onClose={() => setSelTx(null)}
        size="md"
        title={selTx?.action || ''}
        sub={selTx ? dayjs(selTx.timestamp).format('DD/MM/YYYY HH:mm:ss') : ''}
      >
        {selTx && <>
          <DrSec title="Giao dịch">
            <DrField lbl="Người ký">{selTx.userFullName}</DrField>
            <DrField lbl="Hành động">{selTx.action}</DrField>
            <DrField lbl="Loại dữ liệu">{selTx.dataType}</DrField>
            <DrField lbl="Hash algorithm">{selTx.hashAlgorithm || '—'}</DrField>
            <DrField lbl="Kích cỡ DL"><span style={{ fontFamily: 'var(--font-mono)' }}>{(selTx.dataSizeBytes / 1024).toFixed(2)} KB</span></DrField>
            <DrField lbl="Thời gian xử lý"><span style={{ fontFamily: 'var(--font-mono)' }}>{selTx.durationMs} ms</span></DrField>
            <DrField lbl="IP"><span style={{ fontFamily: 'var(--font-mono)' }}>{selTx.ipAddress || '—'}</span></DrField>
          </DrSec>
          <DrSec title="Chứng thư dùng">
            <DrField lbl="Serial"><span style={{ fontFamily: 'var(--font-mono)' }}>{selTx.certificateSerial || '—'}</span></DrField>
            <DrField lbl="CA">{selTx.caProvider || '—'}</DrField>
          </DrSec>
          <DrSec title="Kết quả">
            <DrField lbl="Trạng thái">
              {selTx.success
                ? <StatusBadge tone="ok" dot>Thành công</StatusBadge>
                : <StatusBadge tone="crit" dot>Lỗi</StatusBadge>}
            </DrField>
            {selTx.errorMessage && (
              <DrField lbl="Lỗi">
                <span style={{ color: 'var(--a-rd-text)', fontSize: 12 }}>{selTx.errorMessage}</span>
              </DrField>
            )}
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default CentralSigningV2;
