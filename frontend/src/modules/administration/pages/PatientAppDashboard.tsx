/**
 * Bảng điều khiển app bệnh nhân — HSMT I.3 #1.2.
 *
 * Số liệu lấy thẳng từ BFF (CSDL riêng của app), không đi qua HIS Core: tài khoản app, thiết bị,
 * thông báo và liên kết gia đình đều là dữ liệu của app.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'antd';
import { getDashboard, type PatientAppDashboard } from '@/api/patientApp';
import { KpiStrip, LoadingState, ErrorState, Filter, type KpiItem } from '@/_v2kit';

const WINDOWS = [
  { v: '7', l: '7 ngày qua' },
  { v: '30', l: '30 ngày qua' },
  { v: '90', l: '90 ngày qua' },
  { v: '365', l: '1 năm qua' },
];

const pct = (part: number, whole: number): string =>
  whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`;

const PatientAppDashboardPage: React.FC = () => {
  const [days, setDays] = useState('30');
  const [data, setData] = useState<PatientAppDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    getDashboard(Number(days))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { reload(); }, [reload]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={reload} />;

  const accountKpis: KpiItem[] = [
    { lbl: 'Tài khoản app', val: data.totalAccounts, tone: 'info' },
    {
      lbl: 'Đã liên kết hồ sơ',
      val: data.linkedAccounts,
      sub: pct(data.linkedAccounts, data.totalAccounts),
      tone: 'ok',
    },
    { lbl: `Đăng ký mới (${data.windowDays} ngày)`, val: data.newAccounts, tone: 'info' },
    { lbl: `Có hoạt động (${data.windowDays} ngày)`, val: data.activeAccounts, tone: 'ok' },
    { lbl: 'Đang bị khoá', val: data.lockedAccounts, tone: data.lockedAccounts > 0 ? 'warn' : 'info' },
  ];

  const usageKpis: KpiItem[] = [
    { lbl: 'Thiết bị đang đăng nhập', val: data.devices, tone: 'info' },
    {
      lbl: 'Nhận được thông báo đẩy',
      val: data.devicesWithPush,
      sub: pct(data.devicesWithPush, data.devices),
      tone: data.devicesWithPush === 0 ? 'warn' : 'ok',
    },
    { lbl: 'Lượt lấy số thứ tự', val: data.queueTicketsTaken, tone: 'info' },
    { lbl: 'Lượt đặt khám', val: data.appointmentsBooked, tone: 'info' },
    { lbl: 'Liên kết gia đình', val: data.familyLinks, tone: 'info' },
    { lbl: 'Giấy tờ trong ví', val: data.documentsStored, tone: 'info' },
  ];

  const notificationKpis: KpiItem[] = [
    { lbl: 'Thông báo đã gửi', val: data.notificationsSent, tone: 'info' },
    {
      lbl: 'Đã đọc',
      val: data.notificationsRead,
      sub: pct(data.notificationsRead, data.notificationsSent),
      tone: 'ok',
    },
  ];

  const peak = Math.max(1, ...data.registrationsByDay.map((d) => d.count));

  return (
    <div className="ab">
      <div className="ab-tools">
        <Filter
          value={days}
          onChange={setDays}
          options={WINDOWS}
          placeholder="Khoảng thời gian"
        />
      </div>

      {data.devicesWithPush === 0 && data.devices > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Chưa có thiết bị nào nhận được thông báo đẩy"
          description={
            'Thông báo vẫn vào hộp thư trong app, nhưng người bệnh sẽ không thấy trên màn hình khoá. '
            + 'Nguyên nhân thường gặp: chưa cấu hình Firebase (google-services.json / khoá FCM).'
          }
        />
      )}

      <h3 style={{ margin: '8px 0' }}>Tài khoản</h3>
      <KpiStrip items={accountKpis} />

      <h3 style={{ margin: '16px 0 8px' }}>Sử dụng</h3>
      <KpiStrip items={usageKpis} />

      <h3 style={{ margin: '16px 0 8px' }}>Thông báo</h3>
      <KpiStrip items={notificationKpis} />

      <h3 style={{ margin: '16px 0 8px' }}>Đăng ký theo ngày</h3>
      {data.registrationsByDay.length === 0 ? (
        <p style={{ color: 'var(--c-text-dim)' }}>
          Chưa có tài khoản nào đăng ký trong khoảng thời gian này.
        </p>
      ) : (
        // Biểu đồ cột dựng bằng CSS thay vì kéo thêm thư viện: chỉ có một biểu đồ trong cả module,
        // không đáng thêm vài trăm KB vào gói giao diện.
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140, overflowX: 'auto' }}>
          {data.registrationsByDay.map((d) => (
            <div
              key={d.date}
              title={`${new Date(d.date).toLocaleDateString('vi-VN')}: ${d.count} tài khoản`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 24 }}
            >
              <div
                style={{
                  width: 18,
                  height: Math.max(2, (d.count / peak) * 110),
                  background: 'var(--c-primary, #1677ff)',
                  borderRadius: '3px 3px 0 0',
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--c-text-dim)', marginTop: 4 }}>
                {new Date(d.date).getDate()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientAppDashboardPage;
