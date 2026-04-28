import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchRecords } from '../api/populationHealth';
import type { PopulationRecord } from '../api/populationHealth';
import { GenericListPage } from './_GenericListPage';

const TYPE: Record<string, string> = {
  birth: 'Khai sinh', family_planning: 'KHHGD', elderly_care: 'CS người già',
  prenatal: 'Tiền sản', child_health: 'SK trẻ em', other: 'Khác',
};

const PopulationHealthV2: React.FC = () => {
  const [items, setItems] = useState<PopulationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<PopulationRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await searchRecords({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as PopulationRecord[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng HS', value: items.length },
    { label: 'Đang quản lý', value: items.filter((r) => r.status === 0).length, tone: 'cy' as const },
    { label: 'KHHGD', value: items.filter((r) => r.recordType === 'family_planning').length },
    { label: 'CS người già', value: items.filter((r) => r.recordType === 'elderly_care').length, tone: 'warn' as const },
  ], [items]);

  return (
    <GenericListPage<PopulationRecord>
      title="SK dân số" v1Path="/population-health"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm họ tên / địa chỉ..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã HS', render: (r) => <span className="mono">{r.recordCode}</span> },
        { key: 'name', label: 'Họ tên', render: (r) => <span style={{ fontWeight: 500 }}>{r.fullName}</span> },
        { key: 'dob', label: 'DOB', render: (r) => <span className="mono">{dayjs(r.dateOfBirth).format('DD/MM/YYYY')}</span> },
        { key: 'gender', label: 'GT', render: (r) => r.gender === 1 ? 'Nam' : 'Nữ' },
        { key: 'type', label: 'Loại HS', render: (r) => <span className="muted">{TYPE[r.recordType] || r.recordType}</span> },
        { key: 'unit', label: 'Đơn vị', render: (r) => <span className="muted">{r.managingUnit}</span> },
      ]}
      detailTitle={sel?.fullName || 'Chọn HS'}
      detailFields={!sel ? null : [
        { label: 'Mã HS', value: <span className="mono">{sel.recordCode}</span> },
        { label: 'Họ tên', value: sel.fullName },
        { label: 'DOB', value: <span className="mono">{dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}</span> },
        { label: 'Giới tính', value: sel.gender === 1 ? 'Nam' : 'Nữ' },
        { label: 'Địa chỉ', value: sel.address },
        { label: 'Loại HS', value: TYPE[sel.recordType] || sel.recordType },
        { label: 'Đơn vị quản lý', value: sel.managingUnit },
        ...(sel.familyCode ? [{ label: 'Mã hộ', value: <span className="mono">{sel.familyCode}</span> }] : []),
        ...(sel.healthInsuranceNumber ? [{ label: 'BHYT', value: <span className="mono">{sel.healthInsuranceNumber}</span> }] : []),
        { label: 'Khám gần nhất', value: sel.lastVisitDate ? dayjs(sel.lastVisitDate).format('DD/MM/YYYY') : '—' },
      ]}
    />
  );
};

export default PopulationHealthV2;
