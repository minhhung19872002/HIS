import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getReferrals } from '../api/rehabilitation';
import { GenericListPage } from './_GenericListPage';

type Row = {
  id: string;
  referralCode?: string;
  patientId?: string;
  patientName?: string;
  patientCode?: string;
  patientAge?: number;
  patientGender?: string;
  rehabType?: string;
  rehabTypeName?: string;
  // Backend uses PrimaryDiagnosis / DiagnosisICD; frontend type uses diagnosis / diagnosisIcd
  diagnosis?: string;
  primaryDiagnosis?: string;
  diagnosisIcd?: string;
  diagnosisICD?: string;
  // Backend uses SourceDepartment / ReferringDoctor; frontend type uses referringDepartmentName / referringDoctorName
  sourceDepartment?: string;
  referringDoctor?: string;
  referringDepartmentName?: string;
  referringDoctorName?: string;
  // Priority encoded as number on frontend type, "Routine"/"Urgent" string on backend
  priority?: number;
  priorityName?: string;
  urgency?: string;
  rehabGoals?: string;
  goals?: string;
  precautions?: string;
  referralReason?: string;
  specificRequests?: string;
  status?: string | number;
  statusName?: string;
  referralDate?: string;
  acceptedDate?: string;
};

const URGENCY: Record<string, { text: string; cls: string }> = {
  Routine: { text: 'Thường', cls: 'ok' },
  Urgent: { text: 'Khẩn', cls: 'warn' },
  Stat: { text: 'Cấp cứu', cls: 'crit' },
};

const STATUS: Record<string, { text: string; cls: string }> = {
  Pending: { text: 'Chờ', cls: 'cy' },
  Accepted: { text: 'Chấp nhận', cls: 'ok' },
  InProgress: { text: 'Đang điều trị', cls: 'cy' },
  Completed: { text: 'Hoàn tất', cls: 'ok' },
  Cancelled: { text: 'Hủy', cls: 'ghost' },
  Declined: { text: 'Từ chối', cls: 'crit' },
};

const RehabilitationV2: React.FC = () => {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getReferrals({ keyword, pageSize: 100 });
      const body = r.data as unknown;
      const list = (Array.isArray(body) ? body : ((body as { items?: Row[] })?.items || [])) as Row[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const dx = (r: Row) => r.diagnosis || r.primaryDiagnosis || '';
  const dxIcd = (r: Row) => r.diagnosisIcd || r.diagnosisICD || '';
  const dept = (r: Row) => r.referringDepartmentName || r.sourceDepartment || '';
  const doc = (r: Row) => r.referringDoctorName || r.referringDoctor || '';
  const urgencyText = (r: Row) => {
    if (r.priority) return r.priority >= 3 ? 'Stat' : (r.priority === 2 ? 'Urgent' : 'Routine');
    return r.urgency || 'Routine';
  };
  const acceptedCount = items.filter((r) => r.status === 'Accepted' || r.acceptedDate).length;
  const urgentCount = items.filter((r) => urgencyText(r) === 'Urgent' || urgencyText(r) === 'Stat').length;
  const ptCount = items.filter((r) => r.rehabType === 'PT').length;

  const stats = useMemo(() => [
    { label: 'Tổng giấy GT', value: items.length },
    { label: 'Khẩn / cấp cứu', value: urgentCount, tone: 'warn' as const },
    { label: 'Đã chấp nhận', value: acceptedCount, tone: 'ok' as const },
    { label: 'PT', value: ptCount, tone: 'cy' as const },
  ], [items, urgentCount, acceptedCount, ptCount]);

  return (
    <GenericListPage<Row>
      title="Phục hồi chức năng — Giấy giới thiệu" v1Path="/rehabilitation"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN / mã GT..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã GT', render: (r) => <span className="mono">{r.referralCode || ''}</span> },
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName || '—'}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode || ''}</div></>
        ) },
        { key: 'type', label: 'Loại PHCN', render: (r) => <span className="muted">{r.rehabTypeName || r.rehabType || '—'}</span> },
        { key: 'dx', label: 'Chẩn đoán', render: (r) => (
          <><div className="muted">{dx(r) || '—'}</div>
            {dxIcd(r) && <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{dxIcd(r)}</div>}</>
        ) },
        { key: 'dept', label: 'Khoa GT', render: (r) => <span className="muted">{dept(r) || '—'}</span> },
        { key: 'date', label: 'GT', render: (r) => r.referralDate ? <span className="mono">{dayjs(r.referralDate).format('DD/MM')}</span> : <span className="muted">—</span> },
        { key: 'pri', label: 'ƯT', render: (r) => {
          const u = URGENCY[urgencyText(r)] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${u.cls}`}>{u.text}</span>;
        } },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[String(r.status || '')] || { text: String(r.status || '—'), cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{r.statusName || s.text}</span>;
        } },
      ]}
      detailTitle={sel?.referralCode || 'Chọn giấy GT'}
      detailFields={!sel ? null : [
        { label: 'Mã GT', value: <span className="mono">{sel.referralCode || ''}</span> },
        { label: 'BN', value: `${sel.patientName || '—'}${sel.patientCode ? ' · ' + sel.patientCode : ''}` },
        ...(sel.patientAge !== undefined && sel.patientAge > 0 ? [{ label: 'Tuổi · GT', value: `${sel.patientAge}${sel.patientGender ? ' · ' + sel.patientGender : ''}` }] : []),
        { label: 'Loại PHCN', value: sel.rehabTypeName || sel.rehabType || '—' },
        { label: 'Ưu tiên', value: URGENCY[urgencyText(sel)]?.text || urgencyText(sel) },
        { label: 'Chẩn đoán', value: `${dx(sel) || '—'}${dxIcd(sel) ? ' (' + dxIcd(sel) + ')' : ''}` },
        { label: 'Khoa GT', value: dept(sel) || '—' },
        { label: 'BS GT', value: doc(sel) || '—' },
        { label: 'Mục tiêu', value: sel.rehabGoals || sel.goals || '—' },
        { label: 'Yêu cầu cụ thể', value: sel.specificRequests || sel.referralReason || '—' },
        ...(sel.precautions ? [{ label: 'Lưu ý', value: sel.precautions }] : []),
        ...(sel.referralDate ? [{ label: 'Ngày GT', value: <span className="mono">{dayjs(sel.referralDate).format('DD/MM/YYYY')}</span> }] : []),
        ...(sel.acceptedDate ? [{ label: 'Chấp nhận', value: <span className="mono">{dayjs(sel.acceptedDate).format('DD/MM/YYYY')}</span> }] : []),
      ]}
    />
  );
};

export default RehabilitationV2;
