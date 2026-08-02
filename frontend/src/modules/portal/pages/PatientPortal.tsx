import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Input } from 'antd';
import {
  useListData, DataTable, DrawerShell, DrSec, DrField, TopTabs, KpiStrip, StatusBadge,
  fmtDMYg, fmtVNDg, tk, te,
  type ColumnDef, type TopTab,
} from '@/_v2kit';
import type {
  OnlineAppointmentDto, LabResultDto,
  VisitSummaryDto, PrescriptionHistoryDto, BillSummaryDto,
  NotificationDto, PatientAccountDto,
} from '../api/patientPortal';
import {
  getMyAppointments, getLabResults,
  getVisits, getPrescriptions, getBills,
  getNotifications, markNotificationRead, markAllNotificationsRead,
  getAccount, updateAccount,
} from '../api/patientPortal';
import TermIcon from '../../../components/layout/terminal/Icon';

type AppTab = 'appt' | 'lab' | 'visits' | 'rx' | 'bills' | 'notif' | 'account';

const TABS: TopTab<AppTab>[] = [
  { v: 'appt', l: 'Lịch hẹn', ic: 'calendar' },
  { v: 'lab', l: 'Kết quả XN', ic: 'flask' },
  { v: 'visits', l: 'Lịch sử khám', ic: 'folder' },
  { v: 'rx', l: 'Đơn thuốc', ic: 'pill' },
  { v: 'bills', l: 'Hóa đơn', ic: 'dollar' },
  { v: 'notif', l: 'Thông báo', ic: 'bell' },
  { v: 'account', l: 'Tài khoản', ic: 'user' },
];

const fmtDT = (d?: string, t?: string) =>
  d ? `${dayjs(d).format('DD/MM/YYYY')}${t ? ` ${t.slice(0, 5)}` : ''}` : '—';

const Loading: React.FC = () => (
  <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)', fontSize: 13 }}>Đang tải…</div>
);

// ─── Appointments ─────────────────────────────────────────────────────────────

function AppointmentsSection() {
  const cols: ColumnDef<OnlineAppointmentDto>[] = [
    { key: 'code', label: 'Mã hẹn', mono: true, width: 130, render: (r) => r.appointmentCode },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => (
      <div className="cell-2l">
        <b>{r.patientName}</b>
        <i>{r.appointmentTypeName}{r.isFirstVisit ? ' · BN mới' : ''}</i>
      </div>
    )},
    { key: 'dept', label: 'Khoa · BS', render: (r) => (
      <div className="cell-2l"><b>{r.departmentName}</b><i>{r.doctorName || 'Chưa chọn'}</i></div>
    )},
    { key: 'preferred', label: 'Hẹn mong muốn', mono: true, width: 130, render: (r) => fmtDT(r.preferredDate, r.preferredTime) },
    { key: 'scheduled', label: 'Đã xếp', mono: true, width: 130, render: (r) => fmtDT(r.scheduledDate, r.scheduledTime) },
    { key: 'status', label: 'TT', width: 130, render: (r) => (
      <StatusBadge tone="info" dot>{r.statusName || 'Đã đặt'}</StatusBadge>
    )},
  ];

  const loader = useCallback(async () =>
    (await getMyAppointments(
      undefined,
      dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      dayjs().add(60, 'day').format('YYYY-MM-DD'),
    )).data, []);
  const { rows, loading } = useListData(loader);
  const [detail, setDetail] = useState<OnlineAppointmentDto | null>(null);

  const upcoming = rows.filter((r) => r.scheduledDate && dayjs(r.scheduledDate).isAfter(dayjs())).length;

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng đặt', val: rows.length },
        { lbl: 'Sắp đến', val: upcoming, tone: 'info' },
        { lbl: 'Đã TT', val: rows.filter((r) => r.paymentStatus === 1).length, tone: 'ok' },
        { lbl: 'BN mới', val: rows.filter((r) => r.isFirstVisit).length },
        { lbl: 'BHYT', val: rows.filter((r) => r.insuranceUsed).length, sub: 'sử dụng' },
      ]} />
      {loading ? <Loading /> : (
        <DataTable
          columns={cols}
          data={rows}
          rowKey={(r) => r.id}
          onRowClick={setDetail}
        />
      )}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? <span className="mono" style={{ color: 'var(--a-cy)' }}>{detail.appointmentCode}</span> : ''}
        sub={detail ? `${detail.appointmentTypeName} · ${detail.departmentName}` : ''}
      >
        {detail && (
          <>
            <DrSec title="Cuộc hẹn">
              <DrField lbl="Bệnh nhân"><b>{detail.patientName}</b></DrField>
              <DrField lbl="Loại">{detail.appointmentTypeName}</DrField>
              <DrField lbl="Khoa">{detail.departmentName}</DrField>
              <DrField lbl="Bác sĩ">{detail.doctorName || 'Chưa chọn'}</DrField>
              {detail.specialtyName && <DrField lbl="Chuyên khoa">{detail.specialtyName}</DrField>}
            </DrSec>
            <DrSec title="Thời gian">
              <DrField lbl="Hẹn mong muốn">{fmtDT(detail.preferredDate, detail.preferredTime)}</DrField>
              <DrField lbl="Đã xếp">{fmtDT(detail.scheduledDate, detail.scheduledTime)}</DrField>
              {detail.estimatedDuration && <DrField lbl="Thời lượng">{detail.estimatedDuration} phút</DrField>}
            </DrSec>
            {detail.chiefComplaint && (
              <DrSec title="Lý do khám">
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{detail.chiefComplaint}</div>
                {detail.symptoms && detail.symptoms.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {detail.symptoms.map((s, i) => <span key={i} className="chip warn">{s}</span>)}
                  </div>
                )}
              </DrSec>
            )}
            <DrSec title="Thanh toán">
              <DrField lbl="Phí dự kiến"><b className="mono">{detail.estimatedFee ? fmtVNDg(detail.estimatedFee) : '—'}</b></DrField>
              <DrField lbl="BHYT">{detail.insuranceUsed ? <span className="chip ok">Có sử dụng</span> : 'Không'}</DrField>
              <DrField lbl="Trạng thái TT"><span className={`chip ${detail.paymentStatus === 1 ? 'ok' : 'warn'}`}>{detail.paymentStatusName}</span></DrField>
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
}

// ─── Lab Results ──────────────────────────────────────────────────────────────

function LabSection() {
  const cols: ColumnDef<LabResultDto>[] = [
    { key: 'code', label: 'Mã XN', mono: true, width: 120, render: (r) => r.orderCode },
    { key: 'test', label: 'Xét nghiệm', render: (r) => (
      <div className="cell-2l"><b>{r.testName}</b><i>{r.testCategory}</i></div>
    )},
    { key: 'date', label: 'Ngày', mono: true, width: 110, render: (r) => fmtDMYg(r.testDate) },
    { key: 'doctor', label: 'BS chỉ định', render: (r) => r.orderingDoctor },
    { key: 'status', label: 'TT', width: 100, render: (r) => (
      <StatusBadge tone={r.status === 'Final' ? 'ok' : r.status === 'Partial' ? 'warn' : 'info'} dot>
        {r.statusName}
      </StatusBadge>
    )},
    { key: 'flag', label: 'KQ', width: 110, render: (r) =>
      r.isAbnormal
        ? <span className="chip crit">Bất thường</span>
        : <span className="chip ok">Bình thường</span>
    },
  ];

  const loader = useCallback(async () => (await getLabResults()).data, []);
  const { rows, loading } = useListData(loader);
  const [detail, setDetail] = useState<LabResultDto | null>(null);

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng KQ', val: rows.length },
        { lbl: 'Xác định', val: rows.filter((r) => r.status === 'Final').length, tone: 'ok' },
        { lbl: 'Bất thường', val: rows.filter((r) => r.isAbnormal).length, tone: 'crit' },
      ]} />
      {loading ? <Loading /> : (
        <DataTable
          columns={cols}
          data={rows}
          rowKey={(r) => r.id}
          onRowClick={setDetail}
        />
      )}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? detail.testName : ''}
        sub={detail ? `${detail.orderCode} · ${fmtDMYg(detail.testDate)}` : ''}
      >
        {detail && (
          <>
            <DrSec title="Kết quả chi tiết">
              {detail.results.map((item, i) => (
                <DrField key={i} lbl={item.testItemName}>
                  <span className={item.isAbnormal ? 'chip crit' : undefined}>
                    {item.value}{item.unit ? ` ${item.unit}` : ''}
                    {item.referenceRange ? <span style={{ color: 'var(--t-2)', marginLeft: 6 }}>({item.referenceRange})</span> : null}
                    {item.flag ? <span className="chip warn" style={{ marginLeft: 4 }}>{item.flag}</span> : null}
                  </span>
                </DrField>
              ))}
            </DrSec>
            {detail.interpretation && (
              <DrSec title="Nhận xét">
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{detail.interpretation}</div>
              </DrSec>
            )}
            <DrSec title="Thông tin">
              <DrField lbl="Bác sĩ">{detail.orderingDoctor}</DrField>
              {detail.verifiedAt && <DrField lbl="Xác nhận lúc">{fmtDMYg(detail.verifiedAt)}</DrField>}
              {detail.verifiedBy && <DrField lbl="Người xác nhận">{detail.verifiedBy}</DrField>}
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
}

// ─── Visit History ────────────────────────────────────────────────────────────

function VisitsSection() {
  const cols: ColumnDef<VisitSummaryDto>[] = [
    { key: 'date', label: 'Ngày khám', mono: true, width: 120, render: (r) => fmtDMYg(r.visitDate) },
    { key: 'type', label: 'Loại', width: 110, render: (r) => r.visitType },
    { key: 'dept', label: 'Khoa · BS', render: (r) => (
      <div className="cell-2l"><b>{r.department}</b><i>{r.doctorName}</i></div>
    )},
    { key: 'complaint', label: 'Lý do khám', render: (r) => r.chiefComplaint || '—' },
    { key: 'diag', label: 'Chẩn đoán', render: (r) => r.diagnosis || '—' },
  ];

  const loader = useCallback(async () => {
    const res = await getVisits(undefined, undefined, 1, 100);
    return res.data.items;
  }, []);
  const { rows, loading } = useListData(loader);
  const [detail, setDetail] = useState<VisitSummaryDto | null>(null);

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng lần khám', val: rows.length },
      ]} />
      {loading ? <Loading /> : (
        <DataTable
          columns={cols}
          data={rows}
          rowKey={(r) => r.visitId}
          onRowClick={setDetail}
        />
      )}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? fmtDMYg(detail.visitDate) : ''}
        sub={detail ? `${detail.department} · ${detail.doctorName}` : ''}
      >
        {detail && (
          <DrSec title="Chi tiết lần khám">
            <DrField lbl="Ngày khám">{fmtDMYg(detail.visitDate)}</DrField>
            <DrField lbl="Loại">{detail.visitType}</DrField>
            <DrField lbl="Khoa">{detail.department}</DrField>
            <DrField lbl="Bác sĩ">{detail.doctorName}</DrField>
            {detail.chiefComplaint && <DrField lbl="Lý do khám">{detail.chiefComplaint}</DrField>}
            {detail.diagnosis && <DrField lbl="Chẩn đoán"><b>{detail.diagnosis}</b></DrField>}
            {detail.notes && <DrField lbl="Ghi chú">{detail.notes}</DrField>}
          </DrSec>
        )}
      </DrawerShell>
    </>
  );
}

// ─── Prescriptions ────────────────────────────────────────────────────────────

function PrescriptionsSection() {
  const cols: ColumnDef<PrescriptionHistoryDto>[] = [
    { key: 'code', label: 'Mã đơn', mono: true, width: 140, render: (r) => r.prescriptionCode },
    { key: 'date', label: 'Ngày kê', mono: true, width: 110, render: (r) => fmtDMYg(r.prescribedDate) },
    { key: 'doctor', label: 'Bác sĩ', render: (r) => r.prescribedBy },
    { key: 'count', label: 'Số thuốc', width: 80, render: (r) => r.items.length },
    { key: 'valid', label: 'Hiệu lực đến', mono: true, width: 120, render: (r) => fmtDMYg(r.validTo) },
    { key: 'status', label: 'TT', width: 110, render: (r) => (
      <StatusBadge tone={
        r.status === 'Active' ? 'ok'
          : r.status === 'Dispensed' ? 'info'
          : r.status === 'Cancelled' ? 'warn'
          : 'info'
      } dot>{r.statusName}</StatusBadge>
    )},
  ];

  const loader = useCallback(async () => (await getPrescriptions()).data, []);
  const { rows, loading } = useListData(loader);
  const [detail, setDetail] = useState<PrescriptionHistoryDto | null>(null);

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng đơn', val: rows.length },
        { lbl: 'Đang dùng', val: rows.filter((r) => r.status === 'Active').length, tone: 'ok' },
        { lbl: 'Đã cấp', val: rows.filter((r) => r.status === 'Dispensed').length, tone: 'info' },
        { lbl: 'Hết hạn', val: rows.filter((r) => r.status === 'Expired').length },
      ]} />
      {loading ? <Loading /> : (
        <DataTable
          columns={cols}
          data={rows}
          rowKey={(r) => r.id}
          onRowClick={setDetail}
        />
      )}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? detail.prescriptionCode : ''}
        sub={detail ? `${detail.prescribedBy} · ${fmtDMYg(detail.prescribedDate)}` : ''}
      >
        {detail && (
          <>
            <DrSec title="Danh sách thuốc">
              {detail.items.map((item, i) => (
                <DrField key={i} lbl={item.drugName}>
                  <div>
                    <div>{item.dosage} · {item.frequency} · {item.duration}</div>
                    {item.instructions && <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>{item.instructions}</div>}
                    {item.warnings && <div style={{ fontSize: 11, color: 'var(--a-rd)', marginTop: 2 }}>{item.warnings}</div>}
                  </div>
                </DrField>
              ))}
            </DrSec>
            {detail.instructions && (
              <DrSec title="Hướng dẫn">
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{detail.instructions}</div>
              </DrSec>
            )}
            <DrSec title="Thông tin">
              <DrField lbl="Hiệu lực từ">{fmtDMYg(detail.validFrom)}</DrField>
              <DrField lbl="Đến ngày">{fmtDMYg(detail.validTo)}</DrField>
              {detail.dispensedAt && <DrField lbl="Cấp lúc">{fmtDMYg(detail.dispensedAt)}</DrField>}
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
}

// ─── Bills ────────────────────────────────────────────────────────────────────

function BillsSection() {
  const cols: ColumnDef<BillSummaryDto>[] = [
    { key: 'code', label: 'Mã HĐ', mono: true, width: 140, render: (r) => r.billCode },
    { key: 'date', label: 'Ngày', mono: true, width: 110, render: (r) => fmtDMYg(r.billDate) },
    { key: 'dept', label: 'Khoa', render: (r) => r.department || '—' },
    { key: 'total', label: 'Tổng tiền', mono: true, width: 130, render: (r) => fmtVNDg(r.subtotal) },
    { key: 'due', label: 'Còn nợ', mono: true, width: 130, render: (r) => (
      <b style={{ color: r.amountDue > 0 ? 'var(--a-rd)' : undefined }}>{fmtVNDg(r.amountDue)}</b>
    )},
    { key: 'status', label: 'TT', width: 110, render: (r) => (
      <StatusBadge tone={
        r.status === 'Paid' ? 'ok'
          : r.status === 'Overdue' ? 'crit'
          : 'warn'
      } dot>{r.statusName}</StatusBadge>
    )},
  ];

  const loader = useCallback(async () => (await getBills()).data, []);
  const { rows, loading } = useListData(loader);
  const [detail, setDetail] = useState<BillSummaryDto | null>(null);

  const totalDue = rows.reduce((acc, r) => acc + (r.amountDue ?? 0), 0);

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng HĐ', val: rows.length },
        { lbl: 'Chưa TT', val: rows.filter((r) => r.status !== 'Paid').length, tone: 'warn' },
        { lbl: 'Còn nợ', val: fmtVNDg(totalDue), tone: totalDue > 0 ? 'crit' : 'ok' },
      ]} />
      {loading ? <Loading /> : (
        <DataTable
          columns={cols}
          data={rows}
          rowKey={(r) => r.id}
          onRowClick={setDetail}
        />
      )}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? detail.billCode : ''}
        sub={detail ? `${fmtDMYg(detail.billDate)} · ${detail.department ?? ''}` : ''}
      >
        {detail && (
          <>
            <DrSec title="Dịch vụ">
              {detail.items.map((item, i) => (
                <DrField key={i} lbl={item.description}>
                  <span className="mono">{fmtVNDg(item.amount)}</span>
                </DrField>
              ))}
            </DrSec>
            <DrSec title="Tổng kết">
              <DrField lbl="Tổng cộng"><b className="mono">{fmtVNDg(detail.subtotal)}</b></DrField>
              {detail.discount != null && detail.discount > 0 && (
                <DrField lbl="Giảm giá"><span className="mono ok">{fmtVNDg(detail.discount)}</span></DrField>
              )}
              {detail.insuranceCoverage != null && detail.insuranceCoverage > 0 && (
                <DrField lbl="BHYT chi trả"><span className="mono ok">{fmtVNDg(detail.insuranceCoverage)}</span></DrField>
              )}
              <DrField lbl="BN phải TT"><b className="mono">{fmtVNDg(detail.patientResponsibility)}</b></DrField>
              <DrField lbl="Đã thanh toán"><span className="mono">{fmtVNDg(detail.amountPaid)}</span></DrField>
              <DrField lbl="Còn nợ">
                <b className="mono" style={{ color: detail.amountDue > 0 ? 'var(--a-rd)' : 'var(--ok-1)' }}>
                  {fmtVNDg(detail.amountDue)}
                </b>
              </DrField>
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsSection() {
  const loader = useCallback(async () => {
    const res = await getNotifications(false, 1, 50);
    return res.data.items;
  }, []);
  const { rows, loading, reload } = useListData(loader);

  const markRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      reload();
    } catch {
      te('Không thể đánh dấu đã đọc');
    }
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      tk('Đã đánh dấu tất cả là đã đọc');
      reload();
    } catch {
      te('Không thể cập nhật thông báo');
    }
  };

  const unread = rows.filter((r) => !r.isRead).length;

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng', val: rows.length },
        { lbl: 'Chưa đọc', val: unread, tone: unread > 0 ? 'warn' : 'ok' },
      ]} />
      <div className="ab-tools">
        <span className="spacer" />
        {unread > 0 && (
          <button type="button" className="ab-btn ghost" onClick={markAll}>
            <TermIcon name="check" size={12} /> Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>
      {loading ? <Loading /> : rows.length === 0 ? (
        <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)', fontSize: 13 }}>
          Không có thông báo
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rows.map((n: NotificationDto) => (
            <div
              key={n.id}
              style={{
                padding: '12px 16px',
                background: n.isRead ? 'transparent' : 'var(--bg-3)',
                border: '1px solid var(--border-1)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: n.isRead ? 400 : 600, fontSize: 13 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: 'var(--t-2)', marginTop: 2 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: 'var(--t-3)', marginTop: 4 }}>{fmtDMYg(n.createdAt)}</div>
              </div>
              {!n.isRead && (
                <button
                  type="button"
                  className="ab-btn ghost"
                  style={{ fontSize: 11, flexShrink: 0 }}
                  onClick={() => void markRead(n.id)}
                >
                  <TermIcon name="check" size={10} /> Đọc
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Account ──────────────────────────────────────────────────────────────────

function AccountSection() {
  const [account, setAccount] = useState<PatientAccountDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    setLoading(true);
    getAccount()
      .then((res) => {
        const data = res.data;
        setAccount(data);
        setPhone(data.phone ?? '');
        setEmail(data.email ?? '');
        setAddress(data.address ?? '');
      })
      .catch(() => te('Không tải được thông tin tài khoản'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await updateAccount({ phone, email, address });
      tk('Đã cập nhật thông tin tài khoản');
    } catch {
      te('Không thể cập nhật thông tin');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  if (!account) return null;

  return (
    <div style={{ maxWidth: 520, padding: '0 0 var(--space-24)' }}>
      <DrSec title="Thông tin tài khoản">
        <DrField lbl="Họ tên"><b>{account.fullName}</b></DrField>
        <DrField lbl="Mã tài khoản"><span className="mono">{account.accountCode}</span></DrField>
        {account.patientCode && <DrField lbl="Mã BN"><span className="mono">{account.patientCode}</span></DrField>}
        <DrField lbl="Trạng thái">
          <StatusBadge tone={account.accountStatus === 1 ? 'ok' : 'warn'}>{account.accountStatusName}</StatusBadge>
        </DrField>
        {account.lastLoginAt && <DrField lbl="Đăng nhập gần nhất">{fmtDMYg(account.lastLoginAt)}</DrField>}
      </DrSec>
      <DrSec title="Cập nhật thông tin">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 4 }}>Số điện thoại</div>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại"
              size="small"
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 4 }}>Email</div>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email"
              size="small"
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 4 }}>Địa chỉ</div>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Nhập địa chỉ"
              size="small"
            />
          </div>
          <button
            type="button"
            className="ab-btn"
            onClick={() => void save()}
            disabled={saving}
            style={{ marginTop: 4, alignSelf: 'flex-start' }}
          >
            {saving ? 'Đang lưu…' : 'Lưu thông tin'}
          </button>
        </div>
      </DrSec>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PatientPortalV2: React.FC = () => {
  const [tab, setTab] = useState<AppTab>('appt');

  return (
    <div className="ab">
      <TopTabs tab={tab} setTab={setTab} tabs={TABS} />
      <div style={{ paddingTop: 'var(--space-4)' }}>
        {tab === 'appt' && <AppointmentsSection />}
        {tab === 'lab' && <LabSection />}
        {tab === 'visits' && <VisitsSection />}
        {tab === 'rx' && <PrescriptionsSection />}
        {tab === 'bills' && <BillsSection />}
        {tab === 'notif' && <NotificationsSection />}
        {tab === 'account' && <AccountSection />}
      </div>
    </div>
  );
};

export default PatientPortalV2;
