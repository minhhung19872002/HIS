import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Select, Switch } from 'antd';
import * as api from '../api/centralSigning';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, ModalShell, DrSec, DrField, tk, ti, tw, Ico,
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

  // --- cert form modal ---
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<ManagedCertificate | null>(null);
  const [certSaving, setCertSaving] = useState(false);
  const [certForm] = Form.useForm();

  // --- appearance drawer ---
  const [appearOpen, setAppearOpen] = useState(false);
  const [appearData, setAppearData] = useState<Record<string, unknown> | null>(null);
  const [appearLoading, setAppearLoading] = useState(false);
  const [appearSaving, setAppearSaving] = useState(false);
  const [appearForm] = Form.useForm();

  // --- HSM info drawer ---
  const [hsmOpen, setHsmOpen] = useState(false);
  const [hsmData, setHsmData] = useState<Record<string, unknown> | null>(null);
  const [hsmLoading, setHsmLoading] = useState(false);

  // --- CSR modal ---
  const [csrOpen, setCsrOpen] = useState(false);
  const [csrSaving, setCsrSaving] = useState(false);
  const [csrResult, setCsrResult] = useState<string | null>(null);
  const [csrForm] = Form.useForm();

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

  const openCertModal = (cert?: ManagedCertificate) => {
    setEditingCert(cert ?? null);
    if (cert) {
      certForm.setFieldsValue({
        ...cert,
        validFrom: cert.validFrom ? dayjs(cert.validFrom).format('YYYY-MM-DD') : '',
        validTo: cert.validTo ? dayjs(cert.validTo).format('YYYY-MM-DD') : '',
      });
    } else {
      certForm.resetFields();
    }
    setCertModalOpen(true);
  };

  const handleSaveCert = async () => {
    setCertSaving(true);
    try {
      const v = await certForm.validateFields();
      await api.saveCertificate({
        id: editingCert?.id,
        serialNumber: v.serialNumber,
        subjectName: v.subjectName,
        issuerName: v.issuerName,
        caProvider: v.caProvider,
        validFrom: v.validFrom,
        validTo: v.validTo,
        isActive: v.isActive ?? true,
        ownerUserId: v.ownerUserId,
        cccd: v.cccd,
        storageType: v.storageType || 'Token',
      });
      tk(editingCert ? 'Đã cập nhật chứng thư' : 'Đã thêm chứng thư');
      setCertModalOpen(false);
      certForm.resetFields();
      setEditingCert(null);
      fetchCerts();
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (err?.errorFields) return;
      tw('Lưu chứng thư thất bại');
    } finally {
      setCertSaving(false);
    }
  };

  const openAppearance = async () => {
    setAppearOpen(true);
    setAppearLoading(true);
    try {
      const r = await api.getAppearanceConfig();
      const data = r.data as Record<string, unknown>;
      setAppearData(data);
      appearForm.setFieldsValue(data);
    } catch { ti('Không tải được cấu hình appearance'); }
    finally { setAppearLoading(false); }
  };

  const handleSaveAppearance = async () => {
    setAppearSaving(true);
    try {
      const v = await appearForm.validateFields();
      await api.saveAppearanceConfig(v as Parameters<typeof api.saveAppearanceConfig>[0]);
      tk('Đã lưu cấu hình appearance');
      setAppearOpen(false);
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (err?.errorFields) return;
      tw('Lưu cấu hình thất bại');
    } finally {
      setAppearSaving(false);
    }
  };

  const openHsm = async () => {
    setHsmOpen(true);
    setHsmLoading(true);
    try {
      const r = await api.getHsmInfo();
      setHsmData(r.data as Record<string, unknown>);
    } catch { ti('Không tải được HSM info'); }
    finally { setHsmLoading(false); }
  };

  const openCsr = () => {
    csrForm.resetFields();
    setCsrResult(null);
    setCsrOpen(true);
  };

  const handleCreateCsr = async () => {
    setCsrSaving(true);
    try {
      const v = await csrForm.validateFields();
      const r = await api.createCsr({
        commonName: v.commonName,
        organization: v.organization,
        organizationUnit: v.organizationUnit,
        country: v.country,
        province: v.province,
        keySize: v.keySize,
      });
      const result = r.data as { csr?: string; csrPem?: string } | string;
      setCsrResult(
        typeof result === 'string'
          ? result
          : (result as { csr?: string; csrPem?: string }).csr
            ?? (result as { csrPem?: string }).csrPem
            ?? JSON.stringify(result, null, 2)
      );
      tk('Đã tạo CSR');
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (err?.errorFields) return;
      tw('Tạo CSR thất bại');
    } finally {
      setCsrSaving(false);
    }
  };

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
        {r.ownerFullName && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>👤 {r.ownerFullName}</div>}
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
          <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>
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
          <Btn variant="ghost" onClick={() => {
            if (tab === 'certs') fetchCerts();
            else if (tab === 'transactions') fetchTxs(page);
            fetchStats();
          }}>
            <Ico name="refresh" size={12} /> Làm mới
          </Btn>
          {tab === 'certs' && (
            <Btn variant="primary" onClick={() => openCertModal()}>
              <Ico name="plus" size={12} /> Thêm chứng thư
            </Btn>
          )}
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        {tab === 'certs' && <>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Tìm subject / CCCD / serial / CA…" />
          <Filter value={fStorage} onChange={setFStorage} options={storages} placeholder="▾ Loại lưu trữ" />
          <Btn variant="ghost" onClick={() => { setSearch(''); setFStorage(''); }}>
            <Ico name="x" size={12} /> Bỏ lọc
          </Btn>
        </>}
        {tab === 'transactions' && <>
          <Filter value={fSuccess} onChange={(v) => { setFSuccess(v); setPage(0); }} options={successOpts} placeholder="▾ Trạng thái" />
          <Btn variant="ghost" onClick={() => setFSuccess('')}>
            <Ico name="x" size={12} /> Bỏ lọc
          </Btn>
        </>}
        <span className="spacer" />
        {tab === 'transactions' && (
          <Btn variant="ghost" onClick={async () => {
            try { const r = await api.exportSerials(); tk('Đã xuất serials'); console.log(r); }
            catch { tw('Lỗi khi xuất'); }
          }}>
            <Ico name="download" size={12} /> Xuất serials
          </Btn>
        )}
      </div>

      {tab === 'certs' && <>
        <DataTable<ManagedCertificate>
          columns={certCols} data={pagedCerts} rowKey={(r) => r.id}
          onRowClick={setSelCert}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="eye" title="Chi tiết" onClick={() => setSelCert(r)} />
              <ActBtn ic="edit" title="Sửa" onClick={() => openCertModal(r)} />
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
            <div style={{ padding: 24, color: 'var(--t-2)', fontSize: 'var(--fs-md)' }}>
              <div style={{ marginBottom: 8 }}>Cấu hình appearance · TOTP · CSR · HSM cho ký số tập trung.</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                <Btn onClick={openAppearance}>
                  <Ico name="edit" size={12} /> Cấu hình appearance
                </Btn>
                <Btn onClick={async () => {
                  try { await api.setupTotp(); tk('Đã setup TOTP'); }
                  catch { tw('Lỗi setup TOTP'); }
                }}>
                  <Ico name="lock" size={12} /> Setup TOTP
                </Btn>
                <Btn onClick={openHsm}>
                  <Ico name="card" size={12} /> HSM info
                </Btn>
                <Btn onClick={openCsr}>
                  <Ico name="plus" size={12} /> Tạo CSR
                </Btn>
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
          <Btn variant="ghost" onClick={() => setSelCert(null)}>Đóng</Btn>
          <Btn variant="primary" onClick={() => { if (selCert) { openCertModal(selCert); setSelCert(null); } }}>
            <Ico name="edit" size={12} /> Chỉnh sửa
          </Btn>
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

      {/* ===== Modal Thêm/Sửa chứng thư ===== */}
      <ModalShell
        open={certModalOpen}
        onClose={() => { setCertModalOpen(false); certForm.resetFields(); setEditingCert(null); }}
        title={editingCert ? `Chỉnh sửa · ${editingCert.subjectName}` : 'Thêm chứng thư mới'}
        size="lg"
        footer={<>
          <Btn variant="ghost" onClick={() => { setCertModalOpen(false); certForm.resetFields(); setEditingCert(null); }}>Hủy</Btn>
          <Btn variant="primary" onClick={handleSaveCert} loading={certSaving}>
            <Ico name="check" size={12} /> {editingCert ? 'Cập nhật' : 'Thêm mới'}
          </Btn>
        </>}
      >
        <Form form={certForm} layout="vertical" style={{ padding: '8px 0' }}>
          <Form.Item name="serialNumber" label="Số serial" rules={[{ required: true, message: 'Nhập số serial' }]}>
            <Input placeholder="VD: 01AB3F..." style={{ fontFamily: 'var(--font-mono)' }} />
          </Form.Item>
          <Form.Item name="subjectName" label="Chủ thể (Subject Name)" rules={[{ required: true, message: 'Nhập tên chủ thể' }]}>
            <Input placeholder="VD: CN=Nguyen Van A, O=BV..." />
          </Form.Item>
          <Form.Item name="issuerName" label="Cấp bởi (Issuer)" rules={[{ required: true, message: 'Nhập issuer' }]}>
            <Input placeholder="VD: CN=VietCA Root, O=..." />
          </Form.Item>
          <Form.Item name="caProvider" label="CA Provider" rules={[{ required: true, message: 'Nhập CA provider' }]}>
            <Input placeholder="VD: VietCA / VNPT-CA / FPT-CA" />
          </Form.Item>
          <Form.Item name="storageType" label="Loại lưu trữ">
            <Select placeholder="Chọn loại lưu trữ" options={[
              { value: 'Token', label: 'Token (USB)' },
              { value: 'HSM', label: 'HSM' },
              { value: 'Server', label: 'Server' },
            ]} />
          </Form.Item>
          <Form.Item name="validFrom" label="Hiệu lực từ" rules={[{ required: true, message: 'Nhập ngày bắt đầu' }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="validTo" label="Hết hạn" rules={[{ required: true, message: 'Nhập ngày hết hạn' }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="cccd" label="CCCD chủ sở hữu">
            <Input placeholder="12 chữ số" style={{ fontFamily: 'var(--font-mono)' }} />
          </Form.Item>
          <Form.Item name="ownerUserId" label="User ID chủ sở hữu">
            <Input placeholder="UUID của user trong hệ thống" style={{ fontFamily: 'var(--font-mono)' }} />
          </Form.Item>
          <Form.Item name="isActive" label="Kích hoạt" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </ModalShell>

      {/* ===== Drawer Appearance Config ===== */}
      <DrawerShell
        open={appearOpen}
        onClose={() => setAppearOpen(false)}
        size="lg"
        title="Cấu hình hiển thị chữ ký"
        sub="Vị trí, font, thông tin hiển thị trên chữ ký PDF"
        footer={<>
          <Btn variant="ghost" onClick={() => setAppearOpen(false)}>Đóng</Btn>
          <Btn variant="primary" onClick={handleSaveAppearance} loading={appearSaving}>
            <Ico name="check" size={12} /> Lưu cấu hình
          </Btn>
        </>}
      >
        {appearLoading ? (
          <div style={{ padding: 24, color: 'var(--t-2)', fontSize: 'var(--fs-md)' }}>Đang tải cấu hình…</div>
        ) : appearData === null && !appearLoading ? (
          <div style={{ padding: 24, color: 'var(--t-2)', fontSize: 'var(--fs-md)' }}>Không tải được cấu hình.</div>
        ) : (
          <Form form={appearForm} layout="vertical" style={{ padding: '8px 0' }}>
            <DrSec title="Vị trí chữ ký">
              <Form.Item name="position" label="Vị trí">
                <Select options={[
                  { value: 'bottom-right', label: 'Dưới phải' },
                  { value: 'bottom-left', label: 'Dưới trái' },
                  { value: 'top-right', label: 'Trên phải' },
                  { value: 'top-left', label: 'Trên trái' },
                  { value: 'custom', label: 'Tuỳ chỉnh' },
                ]} />
              </Form.Item>
              <div style={{ display: 'flex', gap: 8 }}>
                <Form.Item name="x" label="X" style={{ flex: 1 }}><InputNumber style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="y" label="Y" style={{ flex: 1 }}><InputNumber style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="width" label="Rộng" style={{ flex: 1 }}><InputNumber style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="page" label="Trang" style={{ flex: 1 }}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              </div>
            </DrSec>
            <DrSec title="Font chữ">
              <Form.Item name="fontFamily" label="Font">
                <Input placeholder="VD: Arial" />
              </Form.Item>
              <div style={{ display: 'flex', gap: 8 }}>
                <Form.Item name="fontSize" label="Cỡ chữ" style={{ flex: 1 }}><InputNumber min={6} max={72} style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="fontColor" label="Màu chữ" style={{ flex: 1 }}><Input type="color" /></Form.Item>
              </div>
            </DrSec>
            <DrSec title="Hiển thị thông tin">
              <Form.Item name="showSignerName" label="Tên người ký" valuePropName="checked"><Switch /></Form.Item>
              <Form.Item name="showDate" label="Ngày ký" valuePropName="checked"><Switch /></Form.Item>
              <Form.Item name="showCertSerial" label="Serial chứng thư" valuePropName="checked"><Switch /></Form.Item>
              <Form.Item name="showCaLogo" label="Logo CA" valuePropName="checked"><Switch /></Form.Item>
            </DrSec>
          </Form>
        )}
      </DrawerShell>

      {/* ===== Drawer HSM Info ===== */}
      <DrawerShell
        open={hsmOpen}
        onClose={() => setHsmOpen(false)}
        size="md"
        title="HSM Info"
        sub="Thông tin Hardware Security Module"
      >
        {hsmLoading ? (
          <div style={{ padding: 24, color: 'var(--t-2)', fontSize: 'var(--fs-md)' }}>Đang tải HSM info…</div>
        ) : !hsmData ? (
          <div style={{ padding: 24, color: 'var(--t-2)', fontSize: 'var(--fs-md)' }}>Không có dữ liệu HSM.</div>
        ) : (
          <DrSec title="Thông tin HSM">
            {Object.entries(hsmData).map(([k, v]) => (
              <DrField key={k} lbl={k}>
                <span style={{ fontFamily: typeof v === 'string' && v.length > 20 ? 'var(--font-mono)' : undefined, fontSize: 'var(--fs-sm)' }}>
                  {String(v ?? '—')}
                </span>
              </DrField>
            ))}
          </DrSec>
        )}
      </DrawerShell>

      {/* ===== Modal Tạo CSR ===== */}
      <ModalShell
        open={csrOpen}
        onClose={() => setCsrOpen(false)}
        title="Tạo CSR (Certificate Signing Request)"
        size="lg"
        footer={csrResult ? (
          <Btn variant="primary" onClick={() => setCsrOpen(false)}>Đóng</Btn>
        ) : (
          <>
            <Btn variant="ghost" onClick={() => setCsrOpen(false)}>Hủy</Btn>
            <Btn variant="primary" onClick={handleCreateCsr} loading={csrSaving}>
              <Ico name="plus" size={12} /> Tạo CSR
            </Btn>
          </>
        )}
      >
        {csrResult ? (
          <div style={{ padding: '8px 0' }}>
            <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--t-1)' }}>CSR đã tạo — sao chép gửi CA:</div>
            <textarea
              readOnly
              value={csrResult}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              style={{
                width: '100%', minHeight: 220, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)',
                background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4,
                padding: 8, resize: 'vertical', color: 'var(--t-0)',
              }}
            />
            <Btn variant="ghost" style={{ marginTop: 8 }} onClick={() => { navigator.clipboard.writeText(csrResult); tk('Đã copy CSR vào clipboard'); }}>
              <Ico name="download" size={12} /> Copy CSR
            </Btn>
          </div>
        ) : (
          <Form form={csrForm} layout="vertical" style={{ padding: '8px 0' }}>
            <Form.Item name="commonName" label="Common Name (CN)" rules={[{ required: true, message: 'Nhập Common Name' }]}>
              <Input placeholder="VD: Nguyen Van A" />
            </Form.Item>
            <Form.Item name="organization" label="Tổ chức (O)" rules={[{ required: true, message: 'Nhập tên tổ chức' }]}>
              <Input placeholder="VD: Benh Vien Xanh Pon" />
            </Form.Item>
            <Form.Item name="organizationUnit" label="Đơn vị (OU)" rules={[{ required: true, message: 'Nhập đơn vị' }]}>
              <Input placeholder="VD: Khoa Noi" />
            </Form.Item>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item name="country" label="Quốc gia (C)" style={{ flex: 1 }} initialValue="VN">
                <Input placeholder="VN" maxLength={2} />
              </Form.Item>
              <Form.Item name="province" label="Tỉnh/Thành (ST)" style={{ flex: 2 }}>
                <Input placeholder="VD: Ho Chi Minh" />
              </Form.Item>
            </div>
            <Form.Item name="keySize" label="Key size (bits)" initialValue={2048}>
              <Select options={[
                { value: 1024, label: '1024' },
                { value: 2048, label: '2048 (khuyến nghị)' },
                { value: 4096, label: '4096' },
              ]} />
            </Form.Item>
          </Form>
        )}
      </ModalShell>

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
                <span style={{ color: 'var(--a-rd-text)', fontSize: 'var(--fs-sm)' }}>{selTx.errorMessage}</span>
              </DrField>
            )}
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default CentralSigningV2;
