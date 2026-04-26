import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchRequests } from '../api/interHospitalSharing';
import type { InterHospitalRequest } from '../api/interHospitalSharing';
import { GenericListPage } from './_GenericListPage';

const TYPE: Record<string, string> = {
  drug_lookup: 'Tra thuốc', ecpr: 'eCPR', patient_transfer: 'Chuyển BN',
  consultation: 'Hội chẩn', record_sharing: 'Chia sẻ HS',
};
const URGENCY: Record<string, { text: string; cls: string }> = {
  normal: { text: 'TT', cls: 'ok' }, urgent: { text: 'KHẨN', cls: 'warn' }, emergency: { text: 'CC', cls: 'crit' },
};
const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Chờ', cls: 'warn' }, 1: { text: 'Nhận', cls: 'cy' },
  2: { text: 'Xử lý', cls: 'cy' }, 3: { text: 'Xong', cls: 'ok' }, 4: { text: 'Từ chối', cls: 'crit' },
};

const InterHospitalSharingV2: React.FC = () => {
  const [items, setItems] = useState<InterHospitalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<InterHospitalRequest | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchRequests({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as InterHospitalRequest[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng YC', value: items.length },
    { label: 'Chờ xử lý', value: items.filter((r) => r.status === 0).length, tone: 'warn' as const },
    { label: 'Khẩn / CC', value: items.filter((r) => r.urgency !== 'normal').length, tone: 'crit' as const },
    { label: 'Hoàn thành', value: items.filter((r) => r.status === 3).length, tone: 'ok' as const },
  ], [items]);

  return (
    <GenericListPage<InterHospitalRequest>
      title="Liên viện" v1Path="/inter-hospital"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm chủ đề / BN..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã', render: (r) => <span className="mono">{r.requestCode}</span> },
        { key: 'type', label: 'Loại', render: (r) => <span className="muted">{TYPE[r.requestType] || r.requestType}</span> },
        { key: 'dir', label: 'Chiều', render: (r) => r.direction === 'incoming' ? '← Vào' : '→ Ra' },
        { key: 'subj', label: 'Chủ đề', render: (r) => <span style={{ fontWeight: 500 }}>{r.subject}</span> },
        { key: 'hosp', label: 'BV đối tác', render: (r) => <span className="muted">{r.direction === 'incoming' ? r.requestingHospital : r.respondingHospital}</span> },
        { key: 'urg', label: 'Ưu tiên', render: (r) => {
          const u = URGENCY[r.urgency] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${u.cls}`}>{u.text}</span>;
        } },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.subject || 'Chọn YC'}
      detailFields={!sel ? null : [
        { label: 'Mã', value: <span className="mono">{sel.requestCode}</span> },
        { label: 'Loại', value: TYPE[sel.requestType] || sel.requestType },
        { label: 'Chiều', value: sel.direction === 'incoming' ? 'Đi vào' : 'Đi ra' },
        { label: 'Chủ đề', value: sel.subject },
        { label: 'Chi tiết', value: <div style={{ whiteSpace: 'pre-wrap' }}>{sel.details}</div> },
        ...(sel.patientName ? [{ label: 'BN', value: `${sel.patientName} · ${sel.patientCode}` }] : []),
        { label: 'BV yêu cầu', value: sel.requestingHospital },
        { label: 'BV phản hồi', value: sel.respondingHospital },
        { label: 'Ưu tiên', value: URGENCY[sel.urgency]?.text || '—' },
        { label: 'YC lúc', value: <span className="mono">{dayjs(sel.requestedAt).format('DD/MM/YYYY HH:mm')}</span> },
        ...(sel.respondedAt ? [{ label: 'Phản hồi lúc', value: <span className="mono">{dayjs(sel.respondedAt).format('DD/MM/YYYY HH:mm')}</span> }] : []),
        { label: 'YC bởi', value: sel.requestedBy },
        ...(sel.respondedBy ? [{ label: 'Trả lời bởi', value: sel.respondedBy }] : []),
        ...(sel.responseNotes ? [{ label: 'Phản hồi', value: sel.responseNotes }] : []),
      ]}
    />
  );
};

export default InterHospitalSharingV2;
