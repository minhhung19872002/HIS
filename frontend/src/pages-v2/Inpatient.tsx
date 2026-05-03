import React from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { getInpatientList } from '../api/inpatient';
import type { InpatientListDto } from '../api/inpatient';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* Nội trú v2 — port of Ward v2.html (BN list focus) */

type StatusKey = 'admitted' | 'transferred' | 'discharged';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'admitted',    l: 'Đang điều trị', tone: 'ok' },
  { v: 'transferred', l: 'Đã chuyển',     tone: 'info' },
  { v: 'discharged',  l: 'Đã xuất viện',  tone: 'info' },
];
const statusKey = (s: number): StatusKey => s === 1 ? 'transferred' : s === 2 ? 'discharged' : 'admitted';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const fmtVND = (n: number) => `${(n || 0).toLocaleString('vi-VN')} ₫`;

const InpatientV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const columns: ColumnDef<InpatientListDto>[] = [
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode} · {r.gender === 1 ? 'Nam' : 'Nữ'} · {r.age || '—'}t</i>
        </div>
      ),
    },
    {
      key: 'mr', label: 'Hồ sơ', mono: true, width: 130,
      render: (r) => r.medicalRecordCode,
    },
    {
      key: 'ward', label: 'Khoa · Phòng · Giường',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.departmentName}</b>
          <i>{r.roomName}{r.bedName ? ` · ${r.bedName}` : ''}</i>
        </div>
      ),
    },
    { key: 'admit', label: 'Vào viện', mono: true, width: 100, render: (r) => fmtDMY(r.admissionDate) },
    { key: 'los', label: 'Ngày nằm', mono: true, width: 90, render: (r) => `${r.daysOfStay} ngày` },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => r.mainDiagnosis || '—' },
    { key: 'doctor', label: 'BS điều trị', width: 180, render: (r) => r.attendingDoctorName || '—' },
    {
      key: 'flags', label: 'Cảnh báo', width: 200,
      render: (r) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {r.hasPendingOrders && <span className="chip warn">Y lệnh chờ</span>}
          {r.hasPendingLabResults && <span className="chip warn">CLS</span>}
          {r.hasUnclaimedMedicine && <span className="chip warn">Thuốc</span>}
          {r.isDebtWarning && <span className="chip crit">Nợ</span>}
          {r.isInsuranceExpiring && <span className="chip crit">BHYT hết</span>}
          {!r.hasPendingOrders && !r.hasPendingLabResults && !r.hasUnclaimedMedicine && !r.isDebtWarning && !r.isInsuranceExpiring &&
            <span style={{ color: 'var(--t-3)' }}>—</span>}
        </div>
      ),
    },
    {
      key: 'bhyt', label: 'BHYT', width: 100,
      render: (r) => r.isInsurance ? <span className="chip ok">Có</span> : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'status', label: 'TT', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <SimpleV2Page<InpatientListDto>
      title="Bệnh nhân nội trú"
      load={async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = await getInpatientList({ pageIndex: 0, pageSize: 200 } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ((r as any)?.data?.items || []) as InpatientListDto[];
      }}
      rowKey={(r) => r.admissionId}
      columns={columns}
      searchPlaceholder="Tìm BN / mã / hồ sơ / chẩn đoán…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.medicalRecordCode} ${r.mainDiagnosis || ''}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      kpis={(rows) => {
        const admitted = rows.filter((r) => r.status === 0).length;
        const longStay = rows.filter((r) => r.daysOfStay >= 14).length;
        const alerts = rows.filter((r) => r.hasPendingOrders || r.hasPendingLabResults || r.hasUnclaimedMedicine).length;
        const debt = rows.filter((r) => r.isDebtWarning).length;
        const totalDebt = rows.reduce((s, r) => s + (r.totalDebt || 0), 0);
        const avgLos = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.daysOfStay, 0) / rows.length * 10) / 10 : 0;
        return [
          { lbl: 'Đang điều trị', val: admitted, tone: 'ok' },
          { lbl: 'TB ngày nằm', val: avgLos, unit: 'ngày' },
          { lbl: 'Nằm ≥14 ngày', val: longStay, sub: 'cần review', tone: 'warn' },
          { lbl: 'Cần xử lý', val: alerts, sub: 'y lệnh/CLS/thuốc', tone: 'warn' },
          { lbl: 'Nợ viện phí', val: debt, tone: 'crit' },
          { lbl: 'Tổng nợ', val: Math.round(totalDebt / 1_000_000), unit: 'tr', sub: 'VND' },
        ];
      }}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã BN</span><span className="mono">{r.patientCode}</span>
              <span>Giới · Tuổi</span><span>{r.gender === 1 ? 'Nam' : 'Nữ'} · {r.age || '—'}t</span>
              {r.dateOfBirth && (<><span>Ngày sinh</span><span>{fmtDMY(r.dateOfBirth)}</span></>)}
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="activity" size={11} /> ĐIỀU TRỊ</h5>
            <div className="rec-kv">
              <span>Mã hồ sơ</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.medicalRecordCode}</span>
              <span>Khoa</span><b>{r.departmentName}</b>
              <span>Phòng / Giường</span><span>{r.roomName}{r.bedName ? ` · ${r.bedName}` : ''}</span>
              <span>BS điều trị</span><span>{r.attendingDoctorName || 'Chưa phân'}</span>
              <span>Chẩn đoán chính</span><span>{r.mainDiagnosis || '—'}</span>
              <span>Vào viện</span><span>{fmtDMY(r.admissionDate)}</span>
              <span>Ngày nằm</span><b>{r.daysOfStay} ngày</b>
            </div>
          </div>
          {(r.hasPendingOrders || r.hasPendingLabResults || r.hasUnclaimedMedicine || r.isDebtWarning || r.isInsuranceExpiring) && (
            <div className="rec-section">
              <h5><TermIcon name="alert" size={11} /> CẢNH BÁO</h5>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {r.hasPendingOrders && <span className="chip warn">Y lệnh đang chờ</span>}
                {r.hasPendingLabResults && <span className="chip warn">Kết quả CLS chưa về</span>}
                {r.hasUnclaimedMedicine && <span className="chip warn">Thuốc chưa lấy</span>}
                {r.isDebtWarning && <span className="chip crit">Nợ {fmtVND(r.totalDebt || 0)}</span>}
                {r.isInsuranceExpiring && <span className="chip crit">BHYT hết hạn</span>}
              </div>
            </div>
          )}
          <div className="rec-section">
            <h5><TermIcon name="dollar" size={11} /> BHYT & CHI PHÍ</h5>
            <div className="rec-kv">
              <span>BHYT</span><span>{r.isInsurance ? <span className="chip ok">Có</span> : <span className="chip">Không</span>}</span>
              {r.insuranceNumber && (<><span>Số thẻ</span><span className="mono">{r.insuranceNumber}</span></>)}
              {r.insuranceExpiry && (<><span>Hạn thẻ</span><span>{fmtDMY(r.insuranceExpiry)}</span></>)}
              {r.totalDebt != null && (<><span>Nợ hiện tại</span><b className="mono">{fmtVND(r.totalDebt)}</b></>)}
            </div>
          </div>
        </>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.medicalRecordCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.departmentName} · ${r.roomName}${r.bedName ? ` · ${r.bedName}` : ''} · ${r.daysOfStay} ngày`}
      toolbarRight={
        <>
          <button type="button" className="ab-btn ghost" onClick={() => message.info('TODO: Bàn giao ca')}>
            <TermIcon name="users" size={12} /> Bàn giao ca
          </button>
          <button type="button" className="ab-btn primary" onClick={() => message.info('TODO: Y lệnh mới')}>
            <TermIcon name="plus" size={12} /> Y lệnh mới
          </button>
        </>
      }
    />
  );
};

export default InpatientV2;
