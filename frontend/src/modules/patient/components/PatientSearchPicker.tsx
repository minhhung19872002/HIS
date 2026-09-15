import React, { useCallback, useMemo, useState } from 'react';
import { Select, Spin } from 'antd';
import type { SelectProps } from 'antd';
import { apiClient } from '../../../services/apiClient';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';

/**
 * PatientSearchPicker — reusable Antd Select bound to POST /patients/search.
 *
 * Same endpoint + response-unwrap pattern as the inline autocomplete in
 * ChronicDisease.tsx / MethadoneTreatment.tsx (public-health), extracted here so
 * non-CrudDrawer forms (plain Antd Form, custom modals) get the same behaviour
 * without re-typing it. Works as an Antd `Form.Item` child via `value`/`onChange`.
 */
export interface PatientSearchResult {
  id: string;
  patientCode: string;
  fullName: string;
  gender?: number;
  dateOfBirth?: string;
  bloodType?: string;
  /** Recorded Rh (PatientDto.RhFactor — "+"/"-" or "Positive"/"Negative"). */
  rhFactor?: string;
  phoneNumber?: string;
  identityNumber?: string;
}

export interface PatientSearchPickerProps {
  value?: string;
  onChange?: (id: string | undefined, patient?: PatientSearchResult) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Label to show for the currently-selected value before any search has run (edit mode). */
  seedLabel?: string;
  allowClear?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const fmtOptionLabel = (p: PatientSearchResult) => `${p.patientCode} — ${p.fullName}`;

export const PatientSearchPicker: React.FC<PatientSearchPickerProps> = ({
  value,
  onChange,
  placeholder = 'Gõ mã BN hoặc họ tên (≥ 2 ký tự)…',
  disabled,
  seedLabel,
  allowClear = true,
  style,
  className,
}) => {
  const [options, setOptions] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback((kw: string) => {
    const keyword = kw.trim();
    if (keyword.length < 2) { setOptions([]); return; }
    setLoading(true);
    apiClient.post<unknown>('/patients/search', { keyword, page: 1, pageSize: 20 })
      .then((r) => setOptions(normalizeArrayResponse<PatientSearchResult>(r.data)))
      .catch(() => { /* đang gõ dở — không toast */ })
      .finally(() => setLoading(false));
  }, []);
  const debouncedSearch = useDebouncedCallback(runSearch, 300);

  const selectOptions = useMemo<SelectProps['options']>(() => {
    const list = options.map((p) => ({ value: p.id, label: fmtOptionLabel(p), patient: p }));
    // Keep the seed/edit-mode label visible even before the user has searched anything.
    if (value && seedLabel && !list.some((o) => o.value === value)) {
      list.unshift({ value, label: seedLabel, patient: undefined as unknown as PatientSearchResult });
    }
    return list;
  }, [options, value, seedLabel]);

  const handleChange = (id: string | undefined) => {
    const found = options.find((p) => p.id === id);
    onChange?.(id, found);
  };

  return (
    <Select
      showSearch
      allowClear={allowClear}
      disabled={disabled}
      value={value}
      placeholder={placeholder}
      filterOption={false}
      notFoundContent={loading ? <Spin size="small" /> : null}
      onSearch={debouncedSearch}
      onChange={handleChange}
      options={selectOptions}
      style={style}
      className={className}
    />
  );
};

export default PatientSearchPicker;
