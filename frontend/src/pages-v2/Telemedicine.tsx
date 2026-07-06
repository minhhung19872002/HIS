import React, { useEffect, useMemo, useState } from 'react';
import * as file from '../services/file.service';
import dayjs from 'dayjs';
import { App as AntdApp, Input, InputNumber, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  getAppointments, confirmAppointment, cancelAppointment,
  createEPrescription, signEPrescription, sendToPharmacy,
} from '../api/telemedicine';
import type { TelemedicineAppointmentDto, TelePrescriptionDto, TelePrescriptionItemInput } from '../api/telemedicine';
import { searchMedicines } from '../api/examination';
import type { MedicineDto } from '../api/examination';
import {
  KpiStrip, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, ModalShell,
  type ColumnDef, type StatusTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* Khám từ xa v2 — port of design-system-v2/his/project/Telemedicine v2.html */

type StatusKey = 'scheduled' | 'waiting' | 'ongoing' | 'completed' | 'noshow' | 'cancelled';

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'scheduled', l: 'Đã đặt',         tone: 'info' },
  { v: 'waiting',   l: 'Chờ vào phòng',  tone: 'warn' },
  { v: 'ongoing',   l: 'Đang khám',      tone: 'warn' },
  { v: 'completed', l: 'Hoàn tất',       tone: 'ok' },
  { v: 'noshow',    l: 'Không tham gia', tone: 'crit' },
  { v: 'cancelled', l: 'Đã huỷ',         tone: 'crit' },
];

const statusKey = (s: number): StatusKey => {
  if (s === 5) return 'noshow';
  if (s === 4) return 'cancelled';
  if (s === 3) return 'completed';
  if (s === 2) return 'ongoing';
  if (s === 1) return 'waiting';
  return 'scheduled';
};
const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

const fmtHM = (iso?: string) => iso ? dayjs(iso).format('HH:mm') : '—';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY HH:mm') : '—';
const fmtVND = (n: number) => n ? `${n.toLocaleString('vi-VN')} ₫` : 'Miễn phí';

const TelemedicineV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState<TelemedicineAppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<TelemedicineAppointmentDto | null>(null);
  const [rxFor, setRxFor] = useState<TelemedicineAppointmentDto | null>(null); // F8: kê đơn từ buổi tele
  const PAGE_SIZE = 16;

  const reload = () => {
    setLoading(true);
    getAppointments({
      fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      toDate:   dayjs().add(60, 'day').format('YYYY-MM-DD'),
    }).then((r) => {
      setRows(r.data?.items || []);
    }).catch(() => setRows([])).finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUS_TABS.forEach((s) => { c[s.v] = rows.filter((r) => statusKey(r.status) === s.v).length; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.appointmentCode, r.patientName, r.patientCode, r.doctorName, r.chiefComplaint]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, stab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const today = dayjs().startOf('day');
  const kpis = useMemo(() => ({
    today: rows.filter((r) => dayjs(r.scheduledDate).isSame(today, 'day')).length,
    ongoing: counts.ongoing || 0,
    waiting: counts.waiting || 0,
    completed7d: rows.filter((r) =>
      statusKey(r.status) === 'completed' &&
      dayjs(r.scheduledDate).isAfter(today.subtract(7, 'day'))).length,
    noshow: counts.noshow || 0,
    total: rows.length,
  }), [rows, counts, today]);

  const onConfirm = async (r: TelemedicineAppointmentDto) => {
    try { await confirmAppointment(r.id); message.success(`Đã xác nhận · ${r.patientName}`); reload(); }
    catch { message.error('Xác nhận thất bại'); }
  };

  const onCancel = async (r: TelemedicineAppointmentDto) => {
    try { await cancelAppointment(r.id, 'Hủy từ giao diện quản trị'); message.warning(`Đã hủy · ${r.patientName}`); reload(); }
    catch { message.error('Hủy thất bại'); }
  };

  const onJoin = (r: TelemedicineAppointmentDto) => {
    if (r.videoRoomUrl) window.open(r.videoRoomUrl, '_blank');
    else message.info('Phòng họp chưa được tạo');
  };

  const columns: ColumnDef<TelemedicineAppointmentDto>[] = [
    { key: 'code', label: 'Mã', mono: true, width: 130, render: (r) => r.appointmentCode },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode} · {r.phone || '—'}</i>
        </div>
      ),
    },
    {
      key: 'doctor', label: 'Bác sĩ', width: 200,
      render: (r) => (
        <div className="cell-2l">
          <b>{r.doctorName}</b>
          <i>{r.doctorSpecialty || r.departmentName || '—'}</i>
        </div>
      ),
    },
    { key: 'subject', label: 'Lý do khám', render: (r) => r.chiefComplaint || r.appointmentTypeName || '—' },
    {
      key: 'when', label: 'Lịch hẹn', width: 130, mono: true,
      render: (r) => (
        <div className="cell-2l">
          <b>{fmtDMY(r.scheduledDate)}</b>
          <i>{r.scheduledTime?.slice(0, 5) || fmtHM(r.scheduledDate)} · {r.durationMinutes || 30}p</i>
        </div>
      ),
    },
    { key: 'fee', label: 'Phí', mono: true, width: 110, render: (r) => fmtVND(r.fee) },
    {
      key: 'paid', label: 'Thanh toán', width: 110,
      render: (r) => r.paymentStatus === 1 ? <span className="chip ok">Đã trả</span> : <span className="chip warn">Chưa</span>,
    },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={statusTone(sk)} dot>{r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Hôm nay', val: kpis.today, sub: 'lịch hẹn', tone: 'info' },
          { lbl: 'Đang khám', val: kpis.ongoing, sub: 'live', tone: 'warn' },
          { lbl: 'Chờ vào phòng', val: kpis.waiting, sub: 'sẵn sàng', tone: 'warn' },
          { lbl: 'Hoàn tất 7 ngày', val: kpis.completed7d, sub: 'tuần qua', tone: 'ok' },
          { lbl: 'Không tham gia', val: kpis.noshow, sub: 'no-show', tone: 'crit' },
          { lbl: 'Tổng cộng', val: kpis.total },
        ]}
      />

      <div className="ab-tools">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / BS / mã hẹn / lý do…" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setStab('all'); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={reload}>
          <TermIcon name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => {
          if (!filtered.length) { message.warning('Không có dữ liệu để xuất'); return; }
          const header = 'Mã hẹn,Bệnh nhân,Bác sĩ,Ngày hẹn,Lý do,Trạng thái,URL phòng';
          const csvRows = filtered.map((r) => [
            r.appointmentCode,
            r.patientName,
            r.doctorName || '',
            r.scheduledDate ? `${dayjs(r.scheduledDate).format('DD/MM/YYYY')} ${(r.scheduledTime || '').slice(0, 5)}`.trim() : '',
            r.chiefComplaint || '',
            r.statusName || '',
            r.videoRoomUrl || '',
          ].map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','));
          const blob = new Blob(['﻿' + [header, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
          file.downloadBlob(blob, `telemedicine_${dayjs().format('YYYYMMDD-HHmm')}.csv`);
          message.success(`Đã xuất ${filtered.length} dòng`);
        }}>
          <TermIcon name="download" size={12} /> Xuất CSV
        </Btn>
        <Btn variant="primary" onClick={() => navigate('/v2/booking-management')}>
          <TermIcon name="plus" size={12} /> Đặt lịch
        </Btn>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<TelemedicineAppointmentDto>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r)}
        actions={(r) => (
          <div className="ab-actions">
            {[0, 1].includes(r.status) && r.videoRoomUrl && (
              <ActBtn ic="play" title="Vào phòng" onClick={() => onJoin(r)} />
            )}
            {r.status === 0 && <ActBtn ic="check" title="Xác nhận" onClick={() => onConfirm(r)} />}
            <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetail(r)} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">
            <TermIcon name="search" size={20} />
            <div>Không có lịch khám từ xa nào</div>
          </div>
        )}
      />

      <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PAGE_SIZE} />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{detail.appointmentCode}</span>
              <span style={{ fontSize: 14 }}>{detail.patientName}</span>
            </span>
          : ''}
        sub={detail ? `${detail.doctorName} · ${fmtDT(detail.scheduledDate)}` : ''}
        size="lg"
        footer={detail ? (
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <span style={{ flex: 1 }} />
            {detail.status === 0 && (
              <Btn variant="ok" onClick={() => { onConfirm(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> Xác nhận
              </Btn>
            )}
            {![3, 4, 5].includes(detail.status) && (
              <Btn onClick={() => { onCancel(detail); setDetail(null); }} style={{ color: 'var(--s-crit)' }}>
                <TermIcon name="x" size={12} /> Huỷ
              </Btn>
            )}
            {detail.sessionId && ![4, 5].includes(detail.status) && (
              <Btn variant="ok" onClick={() => setRxFor(detail)}>
                <TermIcon name="pill" size={12} /> Kê đơn thuốc
              </Btn>
            )}
            {detail.videoRoomUrl && (
              <Btn variant="primary" onClick={() => onJoin(detail)}>
                <TermIcon name="play" size={12} /> Vào phòng
              </Btn>
            )}
          </>
        ) : null}
      >
        {detail && <TelemedicineDrawerBody r={detail} />}
      </DrawerShell>

      <TeleRxModal appt={rxFor} onClose={() => setRxFor(null)} />
    </div>
  );
};

/* ─────────── F8: Modal kê đơn tele → ký → gửi quầy phát ─────────── */
interface RxRowDraft {
  key: number;
  medicine: MedicineDto | null;
  quantity: number;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
}
const emptyRxRow = (key: number): RxRowDraft =>
  ({ key, medicine: null, quantity: 1, dosage: '', frequency: '', durationDays: 1, instructions: '' });

const TeleRxModal: React.FC<{ appt: TelemedicineAppointmentDto | null; onClose: () => void }> = ({ appt, onClose }) => {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<RxRowDraft[]>([emptyRxRow(1)]);
  const [note, setNote] = useState('');
  const [options, setOptions] = useState<MedicineDto[]>([]);
  const [created, setCreated] = useState<TelePrescriptionDto | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!appt) return;
    setRows([emptyRxRow(1)]); setNote(''); setCreated(null); setOptions([]);
  }, [appt]);

  const onSearchMedicine = (kw: string) => {
    if (!kw || kw.trim().length < 2) return;
    searchMedicines(kw.trim()).then((r) => setOptions(Array.isArray(r.data) ? r.data : [])).catch(() => setOptions([]));
  };

  const setRow = (key: number, patch: Partial<RxRowDraft>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const doCreate = async () => {
    if (!appt?.sessionId) { message.warning('Buổi khám chưa có phiên video (sessionId)'); return; }
    const items: TelePrescriptionItemInput[] = rows
      .filter((r) => r.medicine && r.quantity > 0)
      .map((r) => ({
        drugId: r.medicine!.id,
        drugCode: r.medicine!.code,
        drugName: r.medicine!.name,
        unit: r.medicine!.unit,
        quantity: r.quantity,
        dosage: r.dosage.trim() || undefined,
        frequency: r.frequency.trim() || undefined,
        durationDays: r.durationDays || undefined,
        instructions: r.instructions.trim() || undefined,
      }));
    if (!items.length) { message.warning('Chọn ít nhất 1 thuốc'); return; }
    setBusy(true);
    try {
      const r = await createEPrescription(appt.sessionId, items, note.trim() || undefined);
      setCreated(r.data);
      message.success(`Đã tạo đơn ${r.data?.prescriptionCode ?? ''}`);
    } catch { message.error('Tạo đơn thất bại'); }
    finally { setBusy(false); }
  };

  const doSign = async () => {
    if (!created) return;
    setBusy(true);
    try {
      const r = await signEPrescription(created.id);
      setCreated((c) => (c ? { ...c, status: r.data?.status ?? 'Signed' } : c));
      message.success('Đã ký đơn');
    } catch { message.error('Ký đơn thất bại'); }
    finally { setBusy(false); }
  };

  const doSend = async () => {
    if (!created) return;
    setBusy(true);
    try {
      const ok = (await sendToPharmacy(created.id)).data;
      if (ok) {
        setCreated((c) => (c ? { ...c, status: 'SentToPharmacy' } : c));
        message.success('Đã gửi đơn sang quầy phát thuốc');
      } else message.error('Gửi quầy phát thất bại');
    } catch { message.error('Gửi quầy phát thất bại'); }
    finally { setBusy(false); }
  };

  const medOptions = options.map((m) => ({
    value: m.id,
    label: `${m.code} · ${m.name}${m.unit ? ` (${m.unit})` : ''}`,
  }));

  return (
    <ModalShell
      open={!!appt}
      onClose={onClose}
      size="lg"
      title="Kê đơn thuốc khám từ xa"
      sub={appt ? `${appt.patientName} · ${appt.appointmentCode}` : ''}
      footer={
        created ? (
          <>
            <span style={{ fontSize: 12.5 }}>
              Đơn <b className="mono">{created.prescriptionCode}</b> · <span className="chip info">{created.status}</span>
            </span>
            <span style={{ flex: 1 }} />
            <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
            {created.status === 'Draft' && (
              <Btn variant="ok" disabled={busy} onClick={doSign}><TermIcon name="check" size={12} /> Ký đơn</Btn>
            )}
            {created.status !== 'SentToPharmacy' && (
              <Btn variant="primary" disabled={busy} onClick={doSend}>
                <TermIcon name="send" size={12} /> Gửi quầy phát
              </Btn>
            )}
          </>
        ) : (
          <>
            <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
            <span style={{ flex: 1 }} />
            <Btn variant="ghost" onClick={() => setRows((rs) => [...rs, emptyRxRow(Math.max(0, ...rs.map((x) => x.key)) + 1)])}>
              <TermIcon name="plus" size={12} /> Thêm dòng
            </Btn>
            <Btn variant="primary" disabled={busy} onClick={doCreate}>
              {busy ? 'Đang tạo…' : 'Tạo đơn'}
            </Btn>
          </>
        )
      }
    >
      {created ? (
        <div className="rec-section">
          <h5><TermIcon name="pill" size={11} /> ĐƠN ĐÃ TẠO</h5>
          <div className="rec-kv">
            <span>Mã đơn</span><b className="mono">{created.prescriptionCode}</b>
            <span>Trạng thái</span><span><span className="chip info">{created.status}</span></span>
            <span>Số thuốc</span><span>{created.items?.length ?? 0}</span>
          </div>
          <div style={{ marginTop: 'var(--space-10)', fontSize: 12.5, color: 'var(--t-2)' }}>
            Ký đơn rồi gửi sang quầy phát — quầy sẽ thấy đơn chờ cấp phát (mã TELE-…).
          </div>
        </div>
      ) : (
        <>
          {rows.map((r, idx) => (
            <div key={r.key} style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'flex-end', marginBottom: 'var(--space-10)', flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 260px', minWidth: 240 }}>
                <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Thuốc #{idx + 1}</div>
                <Select
                  showSearch
                  style={{ width: '100%' }}
                  placeholder="Gõ ≥2 ký tự để tìm thuốc…"
                  filterOption={false}
                  onSearch={onSearchMedicine}
                  options={medOptions}
                  value={r.medicine?.id}
                  onChange={(v) => setRow(r.key, { medicine: options.find((m) => m.id === v) ?? r.medicine })}
                  notFoundContent="Gõ để tìm trong danh mục thuốc"
                />
              </div>
              <div style={{ width: 90 }}>
                <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>SL</div>
                <InputNumber min={1} style={{ width: '100%' }} value={r.quantity} onChange={(v) => setRow(r.key, { quantity: v ?? 1 })} />
              </div>
              <div style={{ width: 140 }}>
                <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Liều dùng</div>
                <Input value={r.dosage} onChange={(e) => setRow(r.key, { dosage: e.target.value })} placeholder="1 viên/lần" />
              </div>
              <div style={{ width: 130 }}>
                <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Tần suất</div>
                <Input value={r.frequency} onChange={(e) => setRow(r.key, { frequency: e.target.value })} placeholder="2 lần/ngày" />
              </div>
              <div style={{ width: 90 }}>
                <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Số ngày</div>
                <InputNumber min={1} style={{ width: '100%' }} value={r.durationDays} onChange={(v) => setRow(r.key, { durationDays: v ?? 1 })} />
              </div>
              <div style={{ flex: '1 1 160px', minWidth: 150 }}>
                <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Hướng dẫn</div>
                <Input value={r.instructions} onChange={(e) => setRow(r.key, { instructions: e.target.value })} placeholder="Sau ăn…" />
              </div>
              {rows.length > 1 && (
                <Btn variant="ghost" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} style={{ color: 'var(--s-crit)' }}>
                  <TermIcon name="x" size={12} />
                </Btn>
              )}
            </div>
          ))}
          <div style={{ marginTop: 'var(--space-6)' }}>
            <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Ghi chú đơn</div>
            <Input.TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lời dặn của bác sĩ…" />
          </div>
        </>
      )}
    </ModalShell>
  );
};

const TelemedicineDrawerBody: React.FC<{ r: TelemedicineAppointmentDto }> = ({ r }) => {
  const sk = statusKey(r.status);
  const tone = statusTone(sk);
  const lbl = r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l || '';
  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          <span className={`chip ${r.paymentStatus === 1 ? 'ok' : 'warn'}`}>
            {r.paymentStatusName || (r.paymentStatus === 1 ? 'Đã thanh toán' : 'Chưa thanh toán')}
          </span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
        <div className="rec-kv">
          <span>Họ tên</span><b>{r.patientName}</b>
          <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
          <span>Điện thoại</span><span className="mono">{r.phone || '—'}</span>
          {r.email && (<><span>Email</span><span className="mono">{r.email}</span></>)}
          {r.dateOfBirth && (<><span>Ngày sinh</span><span>{fmtDMY(r.dateOfBirth)}</span></>)}
          {r.gender && (<><span>Giới tính</span><span>{r.gender}</span></>)}
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="stethoscope" size={11} /> BÁC SĨ & LỊCH</h5>
        <div className="rec-kv">
          <span>Bác sĩ</span><b>{r.doctorName}</b>
          <span>Chuyên khoa</span><span>{r.doctorSpecialty || r.departmentName}</span>
          <span>Loại khám</span><span>{r.appointmentTypeName}</span>
          {r.chiefComplaint && (<><span>Lý do</span><span>{r.chiefComplaint}</span></>)}
          <span>Lịch hẹn</span><span className="mono">{fmtDT(r.scheduledDate)}</span>
          <span>Thời lượng</span><span>{r.durationMinutes || 30} phút</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="play" size={11} /> PHIÊN VIDEO</h5>
        <div className="rec-kv">
          <span>Meeting URL</span>
          {r.videoRoomUrl
            ? <a className="mono" href={r.videoRoomUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--a-cy)' }}>{r.videoRoomUrl}</a>
            : <span style={{ color: 'var(--t-3)' }}>Chưa tạo</span>}
          <span>Session ID</span><span className="mono">{r.sessionId || '—'}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="dollar" size={11} /> THANH TOÁN</h5>
        <div className="rec-kv">
          <span>Phí khám</span><b className="mono" style={{ color: 'var(--a-cy)' }}>{fmtVND(r.fee)}</b>
          <span>Trạng thái</span>
          <span>
            <span className={`chip ${r.paymentStatus === 1 ? 'ok' : 'warn'}`}>
              {r.paymentStatusName || (r.paymentStatus === 1 ? 'Đã thanh toán' : 'Chưa thanh toán')}
            </span>
          </span>
        </div>
      </div>

      {r.notes && (
        <div className="rec-section">
          <h5><TermIcon name="info" size={11} /> GHI CHÚ</h5>
          <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.notes}</div>
        </div>
      )}
    </>
  );
};

export default TelemedicineV2;
