import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Form, Input, Modal } from 'antd';
import * as dsApi from '../api/digitalSignature';
import type {
  TokenInfoDto, SessionStatusResponse, BatchSignResponse,
} from '../api/digitalSignature';
import { apiClient } from '../api/client';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, tw, Ico,
  type ColumnDef,
} from './_v2kit';

interface CertificateInfo {
  thumbprint: string;
  subject: string;
  subjectName: string;
  issuer: string;
  issuerName: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  isValid: boolean;
  hasPrivateKey: boolean;
  keyUsage: string;
  signatureAlgorithm: string;
  providerName: string;
}

interface PendingDocument {
  id: string;
  documentCode: string;
  documentType: string;
  patientName: string;
  patientCode: string;
  department: string;
  createdAt: string;
  createdBy: string;
  status: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  EMR: 'Bệnh án', Prescription: 'Đơn thuốc', LabResult: 'KQ xét nghiệm',
  Radiology: 'KQ CĐHA', Discharge: 'Giấy ra viện', Surgery: 'Phiếu PT',
  TreatmentSheet: 'Tờ điều trị', Consultation: 'Biên bản hội chẩn',
};

type Tab = 'pending' | 'tokens' | 'certs';
const TABS = [
  { v: 'pending' as Tab, l: 'Tài liệu chờ ký', ic: 'file-text' },
  { v: 'tokens' as Tab,  l: 'USB Token',       ic: 'lock' },
  { v: 'certs' as Tab,   l: 'Chứng chỉ',       ic: 'card' },
];

const PER = 18;

const DigitalSignatureV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('pending');
  const [tokens, setTokens] = useState<TokenInfoDto[]>([]);
  const [certs, setCerts] = useState<CertificateInfo[]>([]);
  const [session, setSession] = useState<SessionStatusResponse | null>(null);
  const [pending, setPending] = useState<PendingDocument[]>([]);
  const [search, setSearch] = useState('');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [selDoc, setSelDoc] = useState<PendingDocument | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchResult, setBatchResult] = useState<BatchSignResponse | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginForm] = Form.useForm();

  const isActive = !!session?.active;

  const fetchData = useCallback(async () => {
    try {
      const [tk, ct, ss, pd] = await Promise.allSettled([
        dsApi.getTokens(),
        apiClient.get<CertificateInfo[]>('/RISComplete/usb-token/certificates'),
        dsApi.getSessionStatus(),
        apiClient.get<PendingDocument[]>('/digital-signature/pending'),
      ]);
      if (tk.status === 'fulfilled') setTokens(Array.isArray(tk.value?.data) ? tk.value.data : []);
      if (ct.status === 'fulfilled') setCerts(Array.isArray(ct.value?.data) ? ct.value.data : []);
      if (ss.status === 'fulfilled') setSession(ss.value?.data || null);
      if (pd.status === 'fulfilled') {
        const raw = Array.isArray(pd.value?.data) ? pd.value.data : [];
        setPending(raw.map((d) => {
          const x = d as PendingDocument & { documentId?: string; documentName?: string };
          return {
            ...x,
            id: x.id || x.documentId || `${x.documentType}-${x.patientCode}-${x.createdAt}`,
            documentCode: x.documentCode || x.documentName || `${x.documentType}-${x.patientCode?.substring(0, 8)}`,
          };
        }));
      }
    } catch { ti('Không thể tải thông tin chữ ký số'); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const docTypes = useMemo(() => {
    const set = new Set(pending.map((d) => d.documentType).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: DOC_TYPE_LABELS[v] || v }));
  }, [pending]);

  const filteredPending = useMemo(() => {
    const k = search.trim().toLowerCase();
    return pending.filter((d) => {
      if (fType && d.documentType !== fType) return false;
      if (!k) return true;
      return [d.documentCode, d.patientName, d.patientCode, d.department]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [pending, search, fType]);

  const totalPages = Math.max(1, Math.ceil(filteredPending.length / PER));
  const paged = filteredPending.slice(page * PER, (page + 1) * PER);

  const openSession = async () => {
    try {
      const v = await loginForm.validateFields();
      const res = await dsApi.openSession({ pin: v.pin });
      if (res.data?.success) {
        tk('Mở phiên ký số thành công');
        setLoginOpen(false);
        loginForm.resetFields();
        fetchData();
      } else { tw(res.data?.message || 'Không mở được phiên'); }
    } catch { tw('Vui lòng nhập mã PIN'); }
  };

  const closeSession = async () => {
    try { await dsApi.closeSession(); tk('Đã đóng phiên'); setSession(null); fetchData(); }
    catch { tw('Không đóng được phiên'); }
  };

  const signSingle = async (d: PendingDocument) => {
    if (!isActive) { tw('Vui lòng mở phiên ký số'); setLoginOpen(true); return; }
    try {
      const res = await dsApi.signDocument({
        documentId: d.id, documentType: d.documentType,
        reason: 'Ký duyệt tài liệu', location: 'HIS System',
      });
      if (res.data?.success) {
        tk(`Đã ký ${d.documentCode}`);
        setPending((prev) => prev.filter((x) => x.id !== d.id));
      } else { tw(res.data?.message || 'Không ký được'); }
    } catch { tw('Lỗi khi ký'); }
  };

  const signBatch = async () => {
    if (!isActive) { tw('Vui lòng mở phiên ký số'); setLoginOpen(true); return; }
    if (selectedIds.size === 0) { tw('Chọn ít nhất 1 tài liệu'); return; }
    try {
      const ids = Array.from(selectedIds);
      const docType = pending.find((p) => p.id === ids[0])?.documentType || 'EMR';
      const res = await dsApi.batchSign({
        documentIds: ids, documentType: docType, reason: 'Ký hàng loạt',
      });
      setBatchResult(res.data || null);
      tk(`Đã ký ${res.data?.succeeded || 0}/${res.data?.total || 0}`);
      setSelectedIds(new Set());
      fetchData();
    } catch { tw('Lỗi khi ký hàng loạt'); }
  };

  const pendingCols: ColumnDef<PendingDocument>[] = [
    { key: 'code', label: 'Mã TL', code: true, render: (r) => r.documentCode },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone="info">{DOC_TYPE_LABELS[r.documentType] || r.documentType}</StatusBadge>
    ) },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.department || '—' },
    { key: 'date', label: 'Tạo lúc', mono: true, render: (r) => dayjs(r.createdAt).format('DD/MM HH:mm') },
    { key: 'by', label: 'Người tạo', render: (r) => r.createdBy },
  ];

  const tokenCols: ColumnDef<TokenInfoDto>[] = [
    { key: 'serial', label: 'Serial', code: true, render: (r) => r.tokenSerial },
    { key: 'label', label: 'Nhãn', render: (r) => r.tokenLabel },
    { key: 'ca', label: 'CA', render: (r) => r.caProvider },
    { key: 'user', label: 'Người dùng', render: (r) => r.mappedUserName || '—' },
    { key: 'last', label: 'Lần cuối', mono: true, render: (r) => r.lastUsedAt ? dayjs(r.lastUsedAt).format('DD/MM HH:mm') : '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => r.isActive
      ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
      : <StatusBadge tone="warn" dot>Tắt</StatusBadge>
    },
  ];

  const certCols: ColumnDef<CertificateInfo>[] = [
    { key: 'subj', label: 'Chủ thể', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.subjectName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.providerName}</div>
      </div>
    ) },
    { key: 'iss', label: 'Tổ chức cấp', render: (r) => r.issuerName },
    { key: 'sn', label: 'Serial', code: true, render: (r) => r.serialNumber.slice(0, 16) + '…' },
    { key: 'alg', label: 'Thuật toán', render: (r) => r.signatureAlgorithm },
    { key: 'valid', label: 'Hiệu lực', mono: true, render: (r) => {
      const to = dayjs(r.validTo);
      const days = to.diff(dayjs(), 'day');
      const tone = days < 0 ? 'var(--a-rd-text)' : days < 30 ? 'var(--a-or-text)' : undefined;
      return <span style={{ color: tone }}>{to.format('DD/MM/YYYY')}</span>;
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={r.isValid && r.hasPrivateKey ? 'ok' : 'crit'} dot>
        {r.isValid ? (r.hasPrivateKey ? 'Hợp lệ + private key' : 'Hợp lệ (no private)') : 'Không hợp lệ'}
      </StatusBadge>
    ) },
  ];

  const togglePending = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };
  const toggleAll = () => {
    if (paged.every((p) => selectedIds.has(p.id))) {
      const next = new Set(selectedIds);
      paged.forEach((p) => next.delete(p.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paged.forEach((p) => next.add(p.id));
      setSelectedIds(next);
    }
  };

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Phiên ký số',
          val: isActive ? 'ĐANG MỞ' : 'ĐÓNG',
          sub: session?.expiresAt ? `hết hạn ${dayjs(session.expiresAt).format('HH:mm')}` : 'chưa mở',
          tone: isActive ? 'ok' : 'warn' },
        { lbl: 'USB Token', val: tokens.filter((t) => t.isActive).length,
          sub: `${tokens.length} đã đăng ký`, tone: 'info' },
        { lbl: 'Chứng chỉ', val: certs.filter((c) => c.isValid).length,
          sub: `${certs.length} tổng`, tone: 'ok' },
        { lbl: 'Tài liệu chờ ký', val: pending.length, sub: 'cần ký', tone: pending.length > 0 ? 'warn' : 'ok' },
      ]} />

      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} actions={
        <>
          {!isActive ? (
            <button className="ab-btn primary" type="button" onClick={() => setLoginOpen(true)}>
              <Ico name="lock" size={12} /> Mở phiên ký
            </button>
          ) : (
            <button className="ab-btn" type="button" onClick={closeSession}>
              <Ico name="x" size={12} /> Đóng phiên
            </button>
          )}
          <button className="ab-btn ghost" type="button" onClick={fetchData}>
            <Ico name="refresh" size={12} /> Làm mới
          </button>
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder={tab === 'pending' ? 'Tìm BN / mã TL / khoa…' : 'Tìm…'} />
        {tab === 'pending' && (
          <Filter value={fType} onChange={setFType} options={docTypes} placeholder="▾ Loại tài liệu" />
        )}
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFType(''); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        {tab === 'pending' && selectedIds.size > 0 && (
          <button className="ab-btn primary" type="button" onClick={signBatch}>
            <Ico name="check" size={12} /> Ký {selectedIds.size} tài liệu
          </button>
        )}
      </div>

      {tab === 'pending' && <>
        <DataTable<PendingDocument>
          columns={pendingCols} data={paged} rowKey={(r) => r.id}
          onRowClick={setSelDoc}
          selected={selectedIds} onToggle={togglePending} onToggleAll={toggleAll}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="eye" title="Chi tiết" onClick={() => setSelDoc(r)} />
              <ActBtn ic="check" title="Ký tài liệu" onClick={() => signSingle(r)} />
            </div>
          )}
          empty={'Không có tài liệu chờ ký'}
        />
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filteredPending.length} perPage={PER} />
      </>}

      {tab === 'tokens' && (
        <DataTable<TokenInfoDto>
          columns={tokenCols} data={tokens} rowKey={(r) => r.tokenSerial}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="refresh" title="Đăng ký lại" onClick={async () => {
                try { await dsApi.registerToken(r.tokenSerial); tk('Đã đăng ký'); fetchData(); }
                catch { tw('Lỗi đăng ký'); }
              }} />
            </div>
          )}
          empty={'Chưa có USB Token'}
        />
      )}

      {tab === 'certs' && (
        <DataTable<CertificateInfo>
          columns={certCols} data={certs} rowKey={(r) => r.thumbprint}
          empty={'Chưa có chứng chỉ'}
        />
      )}

      <DrawerShell
        open={!!selDoc}
        onClose={() => setSelDoc(null)}
        size="md"
        title={selDoc?.documentCode || ''}
        sub={selDoc ? `${DOC_TYPE_LABELS[selDoc.documentType] || selDoc.documentType} · ${selDoc.patientName}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSelDoc(null)}>Đóng</button>
          <button type="button" className="ab-btn primary" onClick={() => { if (selDoc) signSingle(selDoc); }}>
            <Ico name="check" size={12} /> Ký tài liệu
          </button>
        </>}
      >
        {selDoc && <>
          <DrSec title="Tài liệu">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{selDoc.documentCode}</span></DrField>
            <DrField lbl="Loại">{DOC_TYPE_LABELS[selDoc.documentType] || selDoc.documentType}</DrField>
            <DrField lbl="Bệnh nhân">{selDoc.patientName} · {selDoc.patientCode}</DrField>
            <DrField lbl="Khoa">{selDoc.department || '—'}</DrField>
            <DrField lbl="Tạo bởi">{selDoc.createdBy}</DrField>
            <DrField lbl="Tạo lúc">{dayjs(selDoc.createdAt).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Trạng thái">{selDoc.status || 'Chờ ký'}</DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <Modal
        open={loginOpen}
        onCancel={() => setLoginOpen(false)}
        title="Mở phiên ký số"
        onOk={openSession}
        okText="Mở phiên"
        cancelText="Hủy"
      >
        <Form form={loginForm} layout="vertical">
          <Form.Item name="pin" label="Mã PIN USB Token" rules={[{ required: true, message: 'Vui lòng nhập PIN' }]}>
            <Input.Password placeholder="••••" autoFocus />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!batchResult}
        onCancel={() => setBatchResult(null)}
        title="Kết quả ký hàng loạt"
        footer={null}
      >
        {batchResult && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <StatusBadge tone="info">Tổng: {batchResult.total}</StatusBadge>
              <StatusBadge tone="ok">Thành công: {batchResult.succeeded}</StatusBadge>
              {batchResult.failed > 0 && <StatusBadge tone="crit">Lỗi: {batchResult.failed}</StatusBadge>}
            </div>
            {batchResult.results.filter((r) => !r.success).map((r) => (
              <div key={r.documentId} style={{ fontSize: 12, color: 'var(--a-rd-text)', marginBottom: 4 }}>
                {r.documentId}: {r.error}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DigitalSignatureV2;
