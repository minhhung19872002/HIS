import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { statisticsApi } from '../api/system';
import type { HospitalDashboardDto } from '../api/system';
import * as receptionApi from '../api/reception';
import type { AdmissionDto } from '../api/reception';
import TermIcon from '../layouts/terminal/Icon';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const formatTrend = (n: number): string => {
  if (!n || n === 0) return '0';
  return n > 0 ? `+${n}` : String(n);
};

const DashboardV2: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<HospitalDashboardDto | null>(null);
  const [admissions, setAdmissions] = useState<AdmissionDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const today = dayjs().format('YYYY-MM-DD');
        const [dashRes, admRes] = await Promise.allSettled([
          statisticsApi.getHospitalDashboard(today),
          receptionApi.getTodayAdmissions(undefined, today),
        ]);
        if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data ?? null);
        if (admRes.status === 'fulfilled' && Array.isArray(admRes.value.data)) {
          setAdmissions(admRes.value.data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const waitingCount = admissions.filter((a) => a.status === 0).length;
  const urgentCount = admissions.filter((a) => a.isEmergency).length;
  const firstName = (user?.fullName || 'Admin').split(' ').slice(-1)[0];

  return (
    <div style={{ padding: '32px 40px 40px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* HERO */}
      <section>
        <div className="mono up" style={{ fontSize: 11, color: 'var(--t-3)', letterSpacing: '0.14em' }}>
          {dayjs().format('dddd · DD/MM/YYYY · HH:mm')}
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 600, color: 'var(--t-0)', margin: '10px 0 4px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Chào buổi sáng, <span style={{ color: 'var(--a-cy)' }}>{firstName}</span>.
        </h1>
        <div style={{ fontSize: 15, color: 'var(--t-2)', maxWidth: 620 }}>
          {loading
            ? 'Đang tải dữ liệu ca trực…'
            : `${waitingCount} bệnh nhân đang chờ, ${urgentCount} ưu tiên/cấp cứu.`}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginTop: 32, paddingTop: 28, borderTop: '1px solid var(--line)' }}>
          <KPIBig label="Khám ngoại trú" value={dashboard?.outpatientCount ?? 0} sub="hôm nay" trend={formatTrend(dashboard?.outpatientChange ?? 0)} />
          <KPIBig label="Đang nội trú" value={dashboard?.inpatientCount ?? 0} sub="bệnh nhân" trend={formatTrend(dashboard?.inpatientChange ?? 0)} />
          <KPIBig label="Phẫu thuật" value={dashboard?.surgeryCount ?? 0} sub="hôm nay" trend={formatTrend(dashboard?.surgeryChange ?? 0)} />
          <KPIBig label="Cấp cứu" value={dashboard?.emergencyCount ?? 0} sub="lượt" trend={formatTrend(dashboard?.emergencyChange ?? 0)} warn />
        </div>
      </section>

      {/* SECONDARY */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        <div className="dashcard featured">
          <div className="dashcard-eyebrow">
            <span className="dot cy" />
            <span>HÀNG CHỜ · {waitingCount}</span>
          </div>
          <div className="dashcard-title" style={{ fontSize: 22 }}>Bệnh nhân đang đợi</div>
          <div className="dashcard-meta" style={{ marginBottom: 18 }}>Danh sách cần tiếp nhận khám</div>
          {admissions.length === 0 ? (
            <div className="ph">Chưa có bệnh nhân hôm nay</div>
          ) : (
            <div className="dashlist">
              {admissions.slice(0, 6).map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line-hair)' }}>
                  <div className="mono" style={{ color: 'var(--t-3)', fontSize: 12, width: 40 }}>#{a.queueNumber || '—'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--t-0)', fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patientName}</div>
                    <div className="mono" style={{ color: 'var(--t-3)', fontSize: 11 }}>{a.patientCode}</div>
                  </div>
                  {a.isEmergency ? (
                    <span className="chip crit">Cấp cứu</span>
                  ) : (
                    <span className="chip">{a.departmentName || 'N/A'}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashcard">
          <div className="dashcard-eyebrow">
            <span className="dot" />
            <span>NHẬP / XUẤT VIỆN</span>
          </div>
          <div className="dashcard-title" style={{ fontSize: 18 }}>Biến động giường</div>
          <div className="dashcard-meta" style={{ marginBottom: 18 }}>Hôm nay</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <VitalMini label="Nhập viện" value={dashboard?.admissionCount ?? 0} unit="lượt" />
            <VitalMini label="Xuất viện" value={dashboard?.dischargeCount ?? 0} unit="lượt" />
            <VitalMini label="Tỷ lệ giường" value={`${(dashboard?.bedOccupancyRate ?? 0).toFixed(0)}%`} unit="sử dụng" />
            <VitalMini label="Ngày nằm TB" value={(dashboard?.averageStayDays ?? 0).toFixed(1)} unit="ngày" />
          </div>
        </div>

        <div className="dashcard">
          <div className="dashcard-eyebrow">
            <span className="dot cy" />
            <span>LỐI TẮT</span>
          </div>
          <div className="dashcard-title" style={{ fontSize: 18 }}>Hành động nhanh</div>
          <div className="dashcard-meta" style={{ marginBottom: 18 }}>Thao tác thường dùng</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <QuickAction icon="user-plus" label="Tiếp nhận BN mới" onClick={() => navigate('/v2/reception')} />
            <QuickAction icon="stethoscope" label="Mở phòng khám" onClick={() => navigate('/v2/opd')} />
            <QuickAction icon="scan" label="CĐHA" onClick={() => navigate('/v2/radiology')} />
            <QuickAction icon="flask" label="Xét nghiệm" onClick={() => navigate('/v2/lab')} />
          </div>
        </div>
      </section>

      {/* REVENUE ROW */}
      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="dashcard">
          <div className="dashcard-eyebrow">
            <span className="dot warn" />
            <span>DOANH THU THEO KHOA · TOP 6</span>
          </div>
          <div className="dashcard-title" style={{ fontSize: 18 }}>Phân bổ doanh thu hôm nay</div>
          <div className="dashcard-meta" style={{ marginBottom: 18 }}>Tổng: {(dashboard?.totalRevenue ?? 0).toLocaleString('vi-VN')} đ</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Khoa</th>
                <th className="num">Số lượt</th>
                <th className="num">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard?.revenueByDepartment ?? []).slice(0, 6).map((d) => (
                <tr key={d.departmentId}>
                  <td>{d.departmentName}</td>
                  <td className="num muted">—</td>
                  <td className="num">{d.revenue?.toLocaleString('vi-VN') ?? 0} đ</td>
                </tr>
              ))}
              {(dashboard?.revenueByDepartment?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={3}>
                    <div className="ph" style={{ margin: 12 }}>Chưa có doanh thu</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="dashcard">
          <div className="dashcard-eyebrow">
            <span className="dot info" />
            <span>BN NGOẠI TRÚ THEO KHOA</span>
          </div>
          <div className="dashcard-title" style={{ fontSize: 18 }}>Top 6</div>
          <div className="dashcard-meta" style={{ marginBottom: 18 }}>Số lượt khám</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(dashboard?.outpatientByDepartment ?? []).slice(0, 6).map((d) => {
              const max = Math.max(1, ...(dashboard?.outpatientByDepartment?.map((x) => x.count) ?? [1]));
              const pct = Math.round((d.count / max) * 100);
              return (
                <div key={d.departmentId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--t-1)' }}>
                    <span>{d.departmentName}</span>
                    <span className="mono" style={{ color: 'var(--t-2)' }}>{d.count}</span>
                  </div>
                  <div style={{ marginTop: 4, height: 6, background: 'var(--d-3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--a-cy)' }} />
                  </div>
                </div>
              );
            })}
            {(dashboard?.outpatientByDepartment?.length ?? 0) === 0 && (
              <div className="ph">Chưa có dữ liệu</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const KPIBig: React.FC<{ label: string; value: number | string; sub: string; trend: string; warn?: boolean }> = ({ label, value, sub, trend, warn }) => (
  <div>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.12em' }}>{label}</div>
    <div style={{ fontSize: 44, fontWeight: 600, color: warn ? 'var(--s-warn)' : 'var(--t-0)', lineHeight: 1, marginTop: 10, letterSpacing: '-0.02em' }}>{value}</div>
    <div style={{ fontSize: 12, color: 'var(--t-2)', marginTop: 8 }}>
      {sub}{' '}
      <span
        className="mono"
        style={{
          color: trend === '0' ? 'var(--t-3)' : trend.startsWith('+') ? 'var(--s-ok)' : 'var(--s-crit)',
          marginLeft: 4,
        }}
      >
        {trend}
      </span>
    </div>
  </div>
);

const VitalMini: React.FC<{ label: string; value: string | number; unit: string }> = ({ label, value, unit }) => (
  <div style={{ padding: '12px 14px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
    <div style={{ fontSize: 22, color: 'var(--t-0)', marginTop: 4, fontWeight: 500 }}>
      {value} <span style={{ fontSize: 11, color: 'var(--t-3)', fontWeight: 400 }}>{unit}</span>
    </div>
  </div>
);

const QuickAction: React.FC<{ icon: string; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 14px', background: 'var(--d-1)', border: '1px solid var(--line)',
      borderRadius: 8, color: 'var(--t-0)', fontSize: 13, fontWeight: 500,
      cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s', width: '100%',
    }}
  >
    <TermIcon name={icon} size={15} />
    <span style={{ flex: 1 }}>{label}</span>
    <TermIcon name="arrow-right" size={12} />
  </button>
);

export default DashboardV2;
