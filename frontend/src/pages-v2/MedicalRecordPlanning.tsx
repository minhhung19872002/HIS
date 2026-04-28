import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getRecordCodes } from '../api/medicalRecordPlanning';
import { GenericListPage } from './_GenericListPage';

interface RecordCode {
  id: string;
  recordCode: string;
  examinationId?: string;
  patientCode?: string;
  patientName?: string;
  departmentName?: string;
  doctorName?: string;
  assignedDate?: string;
  assignedByName?: string;
  status: number;
  statusName: string;
  createdAt: string;
}

const STATUS_CLS: Record<number, string> = { 0: 'ghost', 1: 'cy', 2: 'ok', 3: 'warn', 4: 'crit' };

const MedicalRecordPlanningV2: React.FC = () => {
  const [items, setItems] = useState<RecordCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<RecordCode | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getRecordCodes({ pageIndex: 0, pageSize: 100, keyword: keyword || undefined });
      const list = ((r.data as { items?: RecordCode[] })?.items || []) as RecordCode[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng mã BA', value: items.length },
    { label: 'Đã gán', value: items.filter((r) => r.status >= 1 && r.status <= 2).length, tone: 'cy' as const },
    { label: 'Hoàn tất', value: items.filter((r) => r.status === 2).length, tone: 'ok' as const },
    { label: 'Hủy', value: items.filter((r) => r.status === 4).length, tone: 'crit' as const },
  ], [items]);

  return (
    <GenericListPage<RecordCode>
      title="Lập kế hoạch BA — Mã BA" v1Path="/medical-record-planning"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN / mã BA..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã BA', render: (r) => <span className="mono">{r.recordCode}</span> },
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName || '—'}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode || ''}</div></>
        ) },
        { key: 'dept', label: 'Khoa', render: (r) => <span className="muted">{r.departmentName || '—'}</span> },
        { key: 'doc', label: 'BS', render: (r) => <span className="muted">{r.doctorName || '—'}</span> },
        { key: 'date', label: 'Gán', render: (r) => r.assignedDate ? <span className="mono">{dayjs(r.assignedDate).format('DD/MM')}</span> : <span className="muted">—</span> },
        { key: 'status', label: 'TT', render: (r) => <span className={`chip ${STATUS_CLS[r.status] || 'ghost'}`}>{r.statusName}</span> },
      ]}
      detailTitle={sel?.recordCode || 'Chọn mã BA'}
      detailFields={!sel ? null : [
        { label: 'Mã BA', value: <span className="mono">{sel.recordCode}</span> },
        { label: 'BN', value: `${sel.patientName || '—'} · ${sel.patientCode || ''}` },
        { label: 'Khoa', value: sel.departmentName || '—' },
        { label: 'BS', value: sel.doctorName || '—' },
        ...(sel.assignedDate ? [{ label: 'Ngày gán', value: <span className="mono">{dayjs(sel.assignedDate).format('DD/MM/YYYY HH:mm')}</span> }] : []),
        { label: 'Người gán', value: sel.assignedByName || '—' },
        { label: 'Tạo', value: <span className="mono">{dayjs(sel.createdAt).format('DD/MM/YYYY')}</span> },
        { label: 'Trạng thái', value: sel.statusName },
      ]}
    />
  );
};

export default MedicalRecordPlanningV2;
