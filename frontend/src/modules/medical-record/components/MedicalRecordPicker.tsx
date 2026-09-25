// =====================================================================
// Chọn hồ sơ bệnh án theo mã HSBA / mã BN / họ tên (thay ô nhập UUID).
// QA-R11: các modal "Tạo phiếu mượn", "Lưu trữ ngay", "Đồng bộ Cloud", "Xuất HL7" bắt người dùng gõ
// MedicalRecordId dạng UUID — không ai biết UUID, nên các nút này thực tế không dùng được.
// Nguồn: GET /medical-record-planning/record-codes?keyword= (id = MedicalRecordId).
// Dùng được trong antd <Form.Item> (value/onChange) hoặc độc lập.
// =====================================================================
import React, { useEffect, useRef, useState } from 'react';
import { Select } from 'antd';
import { getRecordCodes } from '../api/medicalRecordPlanning';

interface RecordOption {
  id: string;
  recordCode: string;
  patientCode?: string;
  patientName?: string;
  departmentName?: string;
}

interface Props {
  value?: string;
  onChange?: (id: string | undefined, rec?: RecordOption) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

const MedicalRecordPicker: React.FC<Props> = ({ value, onChange, placeholder, style, ...rest }) => {
  const [opts, setOpts] = useState<RecordOption[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const search = (kw: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const my = ++seq.current;
      setLoading(true);
      try {
        const r = await getRecordCodes({ keyword: kw.trim() || undefined, pageIndex: 0, pageSize: 20 });
        const items = ((r.data as { items?: RecordOption[] })?.items || []).filter((x) => !!x.recordCode);
        if (my === seq.current) setOpts(items);
      } catch {
        if (my === seq.current) setOpts([]);
      } finally {
        if (my === seq.current) setLoading(false);
      }
    }, 300);
  };

  useEffect(() => { search(''); return () => { if (timer.current) clearTimeout(timer.current); }; }, []);

  return (
    <Select
      {...rest}
      showSearch
      allowClear
      filterOption={false}
      loading={loading}
      value={value || undefined}
      placeholder={placeholder || 'Tìm mã HSBA / mã BN / họ tên…'}
      style={{ width: '100%', ...style }}
      onSearch={search}
      notFoundContent={loading ? 'Đang tìm…' : 'Không có hồ sơ'}
      options={opts.map((o) => ({
        value: o.id,
        label: `${o.recordCode} · ${o.patientName || '—'}${o.patientCode ? ` (${o.patientCode})` : ''}${o.departmentName ? ` · ${o.departmentName}` : ''}`,
      }))}
      onChange={(v: string | undefined) => onChange?.(v, opts.find((o) => o.id === v))}
    />
  );
};

export default MedicalRecordPicker;
