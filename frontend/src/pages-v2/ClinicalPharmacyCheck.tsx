import React, { useCallback, useState } from 'react';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, SearchBox, StatusBadge, Ico, tk, ti, tw,
} from './_v2kit';

interface PharmacyCheckData {
  patient: {
    id: string; patientCode: string; fullName: string; gender: number;
    dateOfBirth?: string; phoneNumber?: string; address?: string; insuranceNumber?: string;
  };
  activeMedicalRecords: Array<{ id: string; medicalRecordCode: string; admissionDate: string; mainDiagnosis?: string; patientType: number }>;
  prescriptions: Array<{
    id: string; prescriptionCode: string; prescriptionDate: string; totalAmount: number; isDispensed: boolean;
    items: Array<{ id: string; medicineName: string; medicineCode: string; quantity: number; dosage?: string; days: number; usageInstructions?: string }>;
  }>;
  services: Array<{ serviceName: string; amount: number; status: number; result?: string; createdAt: string }>;
  flags: Array<{ id: string; flagType: number; color: string; note: string }>;
  interactions: Array<{ id: string; medicine1Id: string; medicine2Id: string; severity: number; description?: string; management?: string }>;
  summary: { totalActiveMedicines: number; totalPrescriptions: number; totalServices: number; warningFlagsCount: number; drugInteractionsCount: number };
}

const SEVERITY_LABEL: Record<number, string> = { 1: 'Nhẹ', 2: 'Trung bình', 3: 'Nặng', 4: 'Chống chỉ định' };
const SEVERITY_TONE: Record<number, 'ok' | 'warn' | 'crit'> = { 1: 'warn', 2: 'warn', 3: 'crit', 4: 'crit' };

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');

const ClinicalPharmacyCheckV2: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<PharmacyCheckData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!keyword) return;
    setLoading(true);
    try {
      const patientRes = await apiClient.get<{ items?: Array<{ id: string }> }>('/admin/patients/search', {
        params: { keyword, pageSize: 1 },
      }).catch(async () => {
        const r = await apiClient.get<{ items?: Array<{ id: string }> }>('/reception/patients/search', {
          params: { keyword, pageSize: 1 },
        });
        return r;
      });
      const items = patientRes.data?.items ?? [];
      if (items.length === 0) { tw('Không tìm thấy bệnh nhân'); return; }
      const patientId = items[0].id;
      const { data: detail } = await apiClient.get<PharmacyCheckData>(`/clinical-pharmacy/patient-summary/${patientId}`);
      setData(detail); tk('Đã tải hồ sơ bệnh nhân');
    } catch { ti('Tải dữ liệu thất bại'); }
    finally { setLoading(false); }
  }, [keyword]);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Thuốc đang dùng', val: data?.summary.totalActiveMedicines ?? 0, sub: data ? data.patient.fullName : 'Tìm BN', tone: 'info' },
        { lbl: 'Đơn thuốc', val: data?.summary.totalPrescriptions ?? 0, sub: '6 tháng gần', tone: 'ok' },
        { lbl: 'CLS / Dịch vụ', val: data?.summary.totalServices ?? 0, sub: 'gần đây', tone: 'info' },
        { lbl: 'Cảnh báo', val: (data?.summary.warningFlagsCount ?? 0) + (data?.summary.drugInteractionsCount ?? 0),
          sub: data ? `${data.summary.drugInteractionsCount} tương tác` : '—',
          tone: (data?.summary.drugInteractionsCount ?? 0) > 0 ? 'crit' : 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={keyword} onChange={setKeyword}
          placeholder="Nhập mã BN / CCCD / SĐT / tên BN…" minWidth={400} />
        <button className="ab-btn primary" type="button" onClick={handleSearch} disabled={loading}>
          <Ico name="search" size={12} /> Kiểm tra
        </button>
        {data && (
          <button className="ab-btn ghost" type="button" onClick={() => { setData(null); setKeyword(''); }}>
            <Ico name="x" size={12} /> Tìm BN khác
          </button>
        )}
        <span className="spacer" />
        {loading && <span style={{ color: 'var(--t-2)', fontSize: 12 }}>Đang tải…</span>}
      </div>

      {!data && !loading && (
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--t-2)' }}>
          <Ico name="medicine" size={48} />
          <div style={{ fontSize: 14, marginTop: 16 }}>Nhập thông tin bệnh nhân để kiểm tra dược lâm sàng</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Hệ thống sẽ hiển thị thuốc đang dùng, tương tác và cảnh báo</div>
        </div>
      )}

      {data && (
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span>Thông tin bệnh nhân</span>
            </div>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12.5 }}>
              <Field label="Mã BN" value={<span style={{ fontFamily: 'var(--font-mono)' }}>{data.patient.patientCode}</span>} />
              <Field label="Họ tên" value={<b>{data.patient.fullName}</b>} />
              <Field label="Giới tính" value={data.patient.gender === 1 ? 'Nam' : data.patient.gender === 2 ? 'Nữ' : '—'} />
              <Field label="Ngày sinh" value={data.patient.dateOfBirth ? dayjs(data.patient.dateOfBirth).format('DD/MM/YYYY') : '—'} />
              <Field label="SĐT" value={data.patient.phoneNumber || '—'} />
              <Field label="BHYT" value={data.patient.insuranceNumber || '—'} />
              <Field label="Địa chỉ" value={data.patient.address || '—'} colSpan={2} />
            </div>
          </div>
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span>Cảnh báo</span>
            </div>
            <div style={{ padding: 14 }}>
              {data.flags.length === 0 && data.interactions.length === 0 && (
                <div style={{ color: 'var(--a-em-text)', fontSize: 13 }}>
                  <Ico name="check" /> Không có cảnh báo
                </div>
              )}
              {data.flags.map((f) => (
                <div key={f.id} style={{ marginBottom: 6, padding: 8, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 12 }}>
                  <StatusBadge tone="warn" dot>{f.note}</StatusBadge>
                </div>
              ))}
            </div>
          </div>

          {data.interactions.length > 0 && (
            <div className="panel" style={{ padding: 0, gridColumn: 'span 2' }}>
              <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', color: 'var(--a-rd-text)' }}>
                <span>⚠️ Tương tác thuốc ({data.interactions.length})</span>
              </div>
              <table className="ab-tbl">
                <thead><tr><th>Mức độ</th><th>Mô tả</th><th>Khuyến nghị</th></tr></thead>
                <tbody>
                  {data.interactions.map((it) => (
                    <tr key={it.id}>
                      <td><StatusBadge tone={SEVERITY_TONE[it.severity] || 'warn'} dot>{SEVERITY_LABEL[it.severity]}</StatusBadge></td>
                      <td>{it.description || '—'}</td>
                      <td>{it.management || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.activeMedicalRecords.length > 0 && (
            <div className="panel" style={{ padding: 0, gridColumn: 'span 2' }}>
              <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                <span>Hồ sơ BA đang hoạt động ({data.activeMedicalRecords.length})</span>
              </div>
              <table className="ab-tbl">
                <thead><tr><th>Mã HSBA</th><th>Vào viện</th><th>Chẩn đoán chính</th><th>Đối tượng</th></tr></thead>
                <tbody>
                  {data.activeMedicalRecords.map((mr) => (
                    <tr key={mr.id}>
                      <td className="mono">{mr.medicalRecordCode}</td>
                      <td className="mono">{dayjs(mr.admissionDate).format('DD/MM/YYYY')}</td>
                      <td>{mr.mainDiagnosis || '—'}</td>
                      <td>{mr.patientType === 1 ? <StatusBadge tone="ok">BHYT</StatusBadge> : <StatusBadge tone="info">Thu phí</StatusBadge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.prescriptions.length > 0 && (
            <div className="panel" style={{ padding: 0, gridColumn: 'span 2' }}>
              <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                <span>Đơn thuốc gần đây ({data.prescriptions.length})</span>
              </div>
              <div style={{ padding: 14 }}>
                {data.prescriptions.map((p) => (
                  <div key={p.id} style={{ marginBottom: 12, padding: 10, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <b style={{ fontFamily: 'var(--font-mono)' }}>{p.prescriptionCode}</b>
                      <span style={{ fontSize: 11, color: 'var(--t-2)' }}>{dayjs(p.prescriptionDate).format('DD/MM/YYYY')}</span>
                      {p.isDispensed
                        ? <StatusBadge tone="ok" dot>Đã phát</StatusBadge>
                        : <StatusBadge tone="warn" dot>Chưa phát</StatusBadge>}
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--a-em-text)' }}>{fmt(p.totalAmount)} đ</span>
                    </div>
                    <table className="ab-tbl" style={{ fontSize: 11 }}>
                      <thead><tr><th>Mã</th><th>Thuốc</th><th>SL</th><th>Liều</th><th>Ngày</th><th>Cách dùng</th></tr></thead>
                      <tbody>
                        {p.items.map((it) => (
                          <tr key={it.id}>
                            <td className="mono">{it.medicineCode}</td>
                            <td>{it.medicineName}</td>
                            <td className="mono">{it.quantity}</td>
                            <td>{it.dosage || '—'}</td>
                            <td className="mono">{it.days}</td>
                            <td>{it.usageInstructions || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.services.length > 0 && (
            <div className="panel" style={{ padding: 0, gridColumn: 'span 2' }}>
              <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                <span>CLS + Dịch vụ gần đây ({data.services.length})</span>
              </div>
              <table className="ab-tbl">
                <thead><tr><th>Dịch vụ</th><th>Ngày</th><th>Trạng thái</th><th>Giá</th></tr></thead>
                <tbody>
                  {data.services.slice(0, 20).map((s, i) => (
                    <tr key={i}>
                      <td>{s.serviceName}</td>
                      <td className="mono">{dayjs(s.createdAt).format('DD/MM HH:mm')}</td>
                      <td>{s.status === 2 ? <StatusBadge tone="ok">Có KQ</StatusBadge> : <StatusBadge tone="info">Chờ</StatusBadge>}</td>
                      <td className="mono">{fmt(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; value: React.ReactNode; colSpan?: number }> = ({ label, value, colSpan }) => (
  <div style={{ gridColumn: colSpan ? `span ${colSpan}` : undefined }}>
    <div style={{ color: 'var(--t-2)', fontSize: 11, marginBottom: 2 }}>{label}</div>
    <div style={{ color: 'var(--t-0)' }}>{value}</div>
  </div>
);

export default ClinicalPharmacyCheckV2;
