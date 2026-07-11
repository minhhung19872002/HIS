import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Form, Input } from 'antd';
import { getArchiveList, createArchive } from '../modules/medical-record/api/medicalRecordArchive';
import * as pdfApi from '../api/pdf';
import { deptApproveRecord, getArchiveApproval, finalizeRecord, type ArchiveApprovalStatusDto } from '../modules/emr/api/emrAdmin';
import {
  KpiStrip, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  StatusTabs, DrawerShell, ModalShell, DrSec, DrField, tk, ti, tw, Ico,
  type ColumnDef,
} from './_v2kit';

// ArchiveDto từ BE: status 1 = Archived, 0 = Pending
interface ArchivedRecord {
  id: string;
  archiveCode: string;
  patientCode: string;
  patientName: string;
  medicalRecordCode: string;
  medicalRecordId: string;
  archiveDate: string;
  departmentName?: string;
  dischargeDate?: string;
  storageLocation?: string;
  shelfNumber?: string;
  boxNumber?: string;
  status: number;           // 0=Pending, 1=Archived
  statusName: string;
  archiveYear: number;
  borrowCount: number;
}

const PER = 20;

// Tab "xác thực" tương ứng status=1 (Archived) vs 0 (Pending)
type ArchiveStatus = 'archived' | 'pending';
const STATUS_TABS = [
  { v: 'archived' as ArchiveStatus, l: 'Đã lưu trữ',  tone: 'ok'   as const },
  { v: 'pending'  as ArchiveStatus, l: 'Chờ xử lý',   tone: 'warn' as const },
];

const MedicalRecordArchiveV2: React.FC = () => {
  const [items, setItems] = useState<ArchivedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<ArchiveStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<ArchivedRecord | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveForm] = Form.useForm<{ medicalRecordId: string; storageLocation?: string }>();

  // F8.5 — duyệt lưu trữ 2 cấp (buồng bệnh → KHTH)
  const [approval, setApproval] = useState<ArchiveApprovalStatusDto | null>(null);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const loadApproval = async (recordId: string) => {
    setApproval(null);
    setApproval(await getArchiveApproval(recordId));
  };
  useEffect(() => {
    if (sel?.medicalRecordId) loadApproval(sel.medicalRecordId);
    else setApproval(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.medicalRecordId]);
  const doDeptApprove = async () => {
    if (!sel?.medicalRecordId) return;
    setApprovalBusy(true);
    const r = await deptApproveRecord(sel.medicalRecordId);
    setApprovalBusy(false);
    if (r?.success) { tk(r.message || 'Đã duyệt cấp 1'); loadApproval(sel.medicalRecordId); }
    else tw(r?.message || 'Duyệt cấp 1 thất bại');
  };
  const doFinalize = async () => {
    if (!sel?.medicalRecordId) return;
    setApprovalBusy(true);
    const r = await finalizeRecord(sel.medicalRecordId);
    setApprovalBusy(false);
    if (r?.success) { tk(r.message || 'Đã lưu trữ (KHTH)'); loadApproval(sel.medicalRecordId); }
    else tw(r?.message || 'Lưu trữ thất bại');
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getArchiveList({ pageSize: 200 });
      // BE trả PagedArchiveResult: { totalCount, items: ArchiveDto[] }
      // interceptor đã unwrap envelope → res là PagedArchiveResult trực tiếp
      const raw = res.data as { totalCount?: number; items?: unknown[] } | unknown[];
      const list: unknown[] = Array.isArray(raw)
        ? raw
        : ((raw as { items?: unknown[] })?.items ?? []);

      interface RawDto {
        id?: string; archiveCode?: string;
        patientCode?: string; patientName?: string;
        medicalRecordCode?: string; medicalRecordId?: string;
        archivedDate?: string; createdAt?: string;
        departmentName?: string; dischargeDate?: string;
        storageLocation?: string; shelfNumber?: string; boxNumber?: string;
        status?: number; statusName?: string;
        archiveYear?: number; borrowCount?: number;
      }

      const rows: ArchivedRecord[] = (list as RawDto[]).map((r, i) => ({
        id: r.id || `r-${i}`,
        archiveCode: r.archiveCode || '',
        patientCode: r.patientCode || '',
        patientName: r.patientName || '',
        medicalRecordCode: r.medicalRecordCode || '',
        medicalRecordId: r.medicalRecordId || '',
        archiveDate: r.archivedDate || r.createdAt || '',
        departmentName: r.departmentName,
        dischargeDate: r.dischargeDate,
        storageLocation: r.storageLocation,
        shelfNumber: r.shelfNumber,
        boxNumber: r.boxNumber,
        status: r.status ?? 0,
        statusName: r.statusName || '',
        archiveYear: r.archiveYear ?? 0,
        borrowCount: r.borrowCount ?? 0,
      }));
      setItems(rows);
    } catch { setItems([]); ti('Không tải được hồ sơ lưu trữ'); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    c.archived = items.filter((r) => r.status === 1).length;
    c.pending  = items.filter((r) => r.status !== 1).length;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab === 'archived' && r.status !== 1) return false;
      if (stab === 'pending'  && r.status === 1) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.medicalRecordCode, r.archiveCode]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const archivedCount = counts.archived ?? 0;
  const pendingCount  = counts.pending  ?? 0;
  const borrowedCount = items.reduce((s, r) => s + r.borrowCount, 0);

  const cols: ColumnDef<ArchivedRecord>[] = [
    { key: 'code', label: 'Mã lưu trữ', code: true, render: (r) => r.archiveCode || '—' },
    { key: 'mrc',  label: 'Mã HSBA',    code: true, render: (r) => r.medicalRecordCode || '—' },
    { key: 'pat',  label: 'Bệnh nhân',  render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'date', label: 'Ngày lưu', mono: true,
      render: (r) => r.archiveDate ? dayjs(r.archiveDate).format('DD/MM/YYYY') : '—' },
    { key: 'year', label: 'Năm', mono: true, width: 70,
      render: (r) => r.archiveYear || '—' },
    { key: 'st',   label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={r.status === 1 ? 'ok' : 'warn'} dot>
        {r.status === 1 ? 'Đã lưu trữ' : (r.statusName || 'Chờ xử lý')}
      </StatusBadge>
    ) },
  ];

  const actions = (r: ArchivedRecord) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Xem chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="download" title="Tải xuống / In HSBA" onClick={() => {
        if (!r.medicalRecordId) { tw('Không có MedicalRecordId để in'); return; }
        pdfApi.printMedicalRecord(r.medicalRecordId);
        tk(`Đang mở HSBA · ${r.medicalRecordCode || r.archiveCode}`);
      }} />
    </div>
  );

  const handleArchiveNow = async () => {
    setArchiving(true);
    try {
      const vals = await archiveForm.validateFields();
      await createArchive({
        medicalRecordId: vals.medicalRecordId.trim(),
        storageLocation: vals.storageLocation?.trim() || undefined,
      });
      tk('Đã lưu trữ hồ sơ thành công');
      setArchiveOpen(false);
      archiveForm.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (err?.errorFields) return; // form validation error — không toast
      tw('Lưu trữ thất bại — kiểm tra MedicalRecordId và quyền truy cập');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng hồ sơ', val: items.length, sub: 'đã nhập hệ thống' },
        { lbl: 'Đã lưu trữ', val: archivedCount,
          sub: `${Math.round((archivedCount / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Chờ xử lý',  val: pendingCount, sub: 'cần lưu trữ', tone: 'warn' },
        { lbl: 'Lượt mượn',  val: borrowedCount, sub: 'tổng cộng', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã HSBA / mã lưu trữ…" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setStab('all'); setPage(0); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="primary" onClick={() => { archiveForm.resetFields(); setArchiveOpen(true); }}>
          <Ico name="archive" size={12} /> Lưu trữ ngay
        </Btn>
      </div>

      <StatusTabs<ArchiveStatus>
        value={stab}
        onChange={(v) => { setStab(v); setPage(0); }}
        tabs={STATUS_TABS}
        counts={counts}
      />

      <DataTable<ArchivedRecord>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có hồ sơ lưu trữ'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      {/* Modal Lưu trữ ngay */}
      <ModalShell
        open={archiveOpen}
        onClose={() => { setArchiveOpen(false); archiveForm.resetFields(); }}
        title="Lưu trữ hồ sơ ngay"
        size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => { setArchiveOpen(false); archiveForm.resetFields(); }}>Hủy</Btn>
          <Btn variant="primary" onClick={handleArchiveNow} loading={archiving}>
            <Ico name="archive" size={12} /> Xác nhận lưu trữ
          </Btn>
        </>}
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{
            padding: 'var(--space-10)', marginBottom: 'var(--space-14)', background: 'var(--d-1)',
            border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', color: 'var(--t-2)',
          }}>
            Lưu trữ ngay hồ sơ bệnh án đã hoàn thành. Hệ thống sẽ kiểm tra điều kiện và tạo bản lưu trữ.
          </div>
          <Form form={archiveForm} layout="vertical">
            <Form.Item
              name="medicalRecordId"
              label="ID hồ sơ bệnh án (MedicalRecordId)"
              rules={[{ required: true, message: 'Nhập ID hồ sơ cần lưu trữ' }]}
            >
              <Input placeholder="VD: 3fa85f64-5717-4562-b3fc-2c963f66afa6" style={{ fontFamily: 'var(--font-mono)' }} />
            </Form.Item>
            <Form.Item name="storageLocation" label="Vị trí lưu trữ (tuỳ chọn)">
              <Input placeholder="VD: Kho A / Tầng 2" />
            </Form.Item>
          </Form>
        </div>
      </ModalShell>

      {/* Drawer chi tiết */}
      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Hồ sơ · ${sel.archiveCode || sel.medicalRecordCode}` : ''}
        sub={sel?.patientName ?? ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => {
            if (!sel?.medicalRecordId) { tw('Không có MedicalRecordId để tải'); return; }
            pdfApi.printMedicalRecord(sel.medicalRecordId);
            tk(`Đang mở HSBA · ${sel.medicalRecordCode || sel.archiveCode}`);
          }}>
            <Ico name="download" size={12} /> Tải xuống
          </Btn>
          <Btn variant="primary" onClick={() => {
            if (!sel?.medicalRecordId) { tw('Không có MedicalRecordId để in'); return; }
            pdfApi.printMedicalRecord(sel.medicalRecordId);
            tk(`Đang mở in HSBA · ${sel.medicalRecordCode || sel.archiveCode}`);
          }}>
            <Ico name="print" size={12} /> In HSBA
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin bệnh nhân">
            <DrField lbl="Mã BN">{sel.patientCode}</DrField>
            <DrField lbl="Họ tên">{sel.patientName}</DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="Ngày ra viện">
              {sel.dischargeDate ? dayjs(sel.dischargeDate).format('DD/MM/YYYY') : '—'}
            </DrField>
          </DrSec>
          <DrSec title="Lưu trữ">
            <DrField lbl="Mã lưu trữ"><span className="mono">{sel.archiveCode || '—'}</span></DrField>
            <DrField lbl="Mã HSBA"><span className="mono">{sel.medicalRecordCode || '—'}</span></DrField>
            <DrField lbl="Năm lưu">{sel.archiveYear || '—'}</DrField>
            <DrField lbl="Ngày lưu">
              {sel.archiveDate ? dayjs(sel.archiveDate).format('DD/MM/YYYY HH:mm') : '—'}
            </DrField>
            {sel.storageLocation && <DrField lbl="Vị trí">{sel.storageLocation}</DrField>}
            {sel.shelfNumber    && <DrField lbl="Kệ số">{sel.shelfNumber}</DrField>}
            {sel.boxNumber      && <DrField lbl="Hộp số">{sel.boxNumber}</DrField>}
            <DrField lbl="Lượt mượn">{sel.borrowCount}</DrField>
          </DrSec>
          <DrSec title="Trạng thái">
            <DrField lbl="Trạng thái">
              <StatusBadge tone={sel.status === 1 ? 'ok' : 'warn'} dot>
                {sel.status === 1 ? 'Đã lưu trữ' : (sel.statusName || 'Chờ xử lý')}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Duyệt lưu trữ 2 cấp (buồng bệnh → KHTH)">
            <DrField lbl="Cấp 1 — Khoa">
              {approval?.deptApproved
                ? <StatusBadge tone="ok" dot>Đã duyệt{approval.deptApprovedByName ? ` · ${approval.deptApprovedByName}` : ''}{approval.deptApprovedAt ? ` · ${dayjs(approval.deptApprovedAt).format('DD/MM/YYYY')}` : ''}</StatusBadge>
                : <StatusBadge tone="warn" dot>Chưa duyệt</StatusBadge>}
            </DrField>
            <DrField lbl="Cấp 2 — KHTH">
              {approval?.finalized
                ? <StatusBadge tone="ok" dot>Đã lưu trữ{approval.finalizedByName ? ` · ${approval.finalizedByName}` : ''}{approval.finalizedAt ? ` · ${dayjs(approval.finalizedAt).format('DD/MM/YYYY')}` : ''}</StatusBadge>
                : <StatusBadge tone="warn" dot>Chưa lưu trữ</StatusBadge>}
            </DrField>
            <DrField lbl="Nộp muộn">
              {approval == null ? '—'
                : approval.lateDays > 0
                  ? <StatusBadge tone="crit" dot>Muộn {approval.lateDays} ngày (hạn {approval.deadlineDays} ngày)</StatusBadge>
                  : <StatusBadge tone="ok" dot>Đúng hạn{approval.daysSinceDischarge != null ? ` · ${approval.daysSinceDischarge} ngày` : ''}</StatusBadge>}
            </DrField>
            <div style={{ display: 'flex', gap: 'var(--space-8)', marginTop: 'var(--space-8)' }}>
              <Btn variant="primary" disabled={approvalBusy || !!approval?.deptApproved || !!approval?.finalized} onClick={doDeptApprove}>Duyệt cấp 1 (Khoa)</Btn>
              <Btn variant="ok" disabled={approvalBusy || !approval?.deptApproved || !!approval?.finalized} onClick={doFinalize}>Duyệt lưu trữ (KHTH)</Btn>
            </div>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default MedicalRecordArchiveV2;
