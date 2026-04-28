import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchLicenses } from '../api/practiceLicense';
import type { PracticeLicense } from '../api/practiceLicense';
import { GenericListPage } from './_GenericListPage';

const TYPE: Record<string, string> = {
  doctor: 'Bác sĩ', pharmacist: 'Dược sĩ', nurse: 'Điều dưỡng', midwife: 'Hộ sinh',
  technician: 'KTV', dentist: 'Nha sĩ', traditional_medicine: 'YHCT',
};
const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Hợp lệ', cls: 'ok' }, 1: { text: 'Sắp hết', cls: 'warn' },
  2: { text: 'Hết hạn', cls: 'crit' }, 3: { text: 'Thu hồi', cls: 'crit' }, 4: { text: 'Tạm dừng', cls: 'ghost' },
};

const PracticeLicenseV2: React.FC = () => {
  const [items, setItems] = useState<PracticeLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<PracticeLicense | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await searchLicenses({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as PracticeLicense[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const today = dayjs();
  const stats = useMemo(() => [
    { label: 'Tổng CCHN', value: items.length },
    { label: 'Đang hiệu lực', value: items.filter((l) => l.status === 0).length, tone: 'ok' as const },
    { label: 'Sắp hết hạn 30d', value: items.filter((l) => dayjs(l.expiryDate).diff(today, 'day') < 30 && dayjs(l.expiryDate).isAfter(today)).length, tone: 'warn' as const },
    { label: 'Đã hết hạn', value: items.filter((l) => dayjs(l.expiryDate).isBefore(today)).length, tone: 'crit' as const },
  ], [items, today]);

  return (
    <GenericListPage<PracticeLicense>
      title="CCHN — Chứng chỉ hành nghề" v1Path="/practice-license"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm tên / mã NV..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'no', label: 'Số CCHN', render: (r) => <span className="mono">{r.licenseNumber}</span> },
        { key: 'staff', label: 'NV', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.staffName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.staffCode}</div></>
        ) },
        { key: 'type', label: 'Loại', render: (r) => <span className="muted">{TYPE[r.licenseType] || r.licenseType}</span> },
        { key: 'spec', label: 'Chuyên khoa', render: (r) => <span className="muted">{r.specialty || '—'}</span> },
        { key: 'issue', label: 'Cấp', render: (r) => <span className="mono">{dayjs(r.issueDate).format('DD/MM/YYYY')}</span> },
        { key: 'exp', label: 'Hết hạn', render: (r) => {
          const d = dayjs(r.expiryDate);
          const daysLeft = d.diff(today, 'day');
          const color = daysLeft < 0 ? 'var(--s-crit)' : daysLeft < 30 ? 'var(--s-warn)' : undefined;
          return <span className="mono" style={{ color }}>{d.format('DD/MM/YYYY')}</span>;
        } },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.staffName || 'Chọn CCHN'}
      detailFields={!sel ? null : [
        { label: 'Số CCHN', value: <span className="mono">{sel.licenseNumber}</span> },
        { label: 'Nhân viên', value: `${sel.staffName} · ${sel.staffCode}` },
        { label: 'Loại', value: TYPE[sel.licenseType] || sel.licenseType },
        { label: 'Chuyên khoa', value: sel.specialty || '—' },
        { label: 'Phạm vi', value: sel.practiceScope || '—' },
        { label: 'Cấp bởi', value: sel.issuingAuthority },
        { label: 'Ngày cấp', value: <span className="mono">{dayjs(sel.issueDate).format('DD/MM/YYYY')}</span> },
        { label: 'Hết hạn', value: <span className="mono">{dayjs(sel.expiryDate).format('DD/MM/YYYY')}</span> },
        ...(sel.renewalDate ? [{ label: 'Gia hạn', value: <span className="mono">{dayjs(sel.renewalDate).format('DD/MM/YYYY')}</span> }] : []),
      ]}
    />
  );
};

export default PracticeLicenseV2;
