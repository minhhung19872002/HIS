import React, { useMemo, useRef } from 'react';
import { Select, Radio, Checkbox, AutoComplete } from 'antd';

// ─────────────────────────── Config-driven options (Select/Radio/Checkbox/AutoComplete) ───────────────────────────
// Nhận datasource JSON + fieldNames linh hoạt (label/value/disabled/group/children), thay vì hard-code <Option> trong JSX.
export interface OptItem { value: string | number; label: React.ReactNode; disabled?: boolean; group?: string; children?: OptItem[]; }
export interface OptFieldNames { label?: string; value?: string; disabled?: string; group?: string; children?: string; }

/** Chuẩn hoá mảng option thô (object/string/number) → OptItem[] theo fieldNames tuỳ biến. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeOptions(raw: any[] | undefined, fn?: OptFieldNames): OptItem[] {
  if (!raw) return [];
  const L = fn?.label || 'label', V = fn?.value || 'value', D = fn?.disabled || 'disabled', G = fn?.group, C = fn?.children;
  return raw.filter((o) => o != null).map((o) => {
    if (typeof o === 'string' || typeof o === 'number') return { value: o, label: String(o) };
    return {
      value: o[V], label: o[L] ?? o[V], disabled: o[D],
      group: G ? o[G] : o.group,
      children: C && o[C] ? normalizeOptions(o[C], fn) : undefined,
    } as OptItem;
  });
}

/** Select config-driven: options JSON + fieldNames + multiple + search + clearable + group + loading. */
export const OptionsSelect: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any; onChange?: (v: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any[]; fieldNames?: OptFieldNames;
  multiple?: boolean; showSearch?: boolean; allowClear?: boolean;
  placeholder?: string; disabled?: boolean; loading?: boolean;
  style?: React.CSSProperties; size?: 'small' | 'middle' | 'large';
}> = ({ value, onChange, options, fieldNames, multiple, showSearch = true, allowClear = true, placeholder, disabled, loading, style, size }) => {
  const opts = useMemo(() => normalizeOptions(options, fieldNames), [options, fieldNames]);
  const grouped = useMemo(() => {
    if (!opts.some((o) => o.group)) return undefined;
    const map = new Map<string, OptItem[]>();
    opts.forEach((o) => { const g = o.group || '—'; if (!map.has(g)) map.set(g, []); map.get(g)!.push(o); });
    return Array.from(map.entries()).map(([label, options]) => ({ label, options }));
  }, [opts]);
  return (
    <Select
      value={value} onChange={onChange}
      mode={multiple ? 'multiple' : undefined}
      showSearch={showSearch} optionFilterProp="label" allowClear={allowClear}
      placeholder={placeholder} disabled={disabled} loading={loading}
      style={{ width: '100%', ...style }} size={size}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options={(grouped as any) || (opts as any)}
    />
  );
};

/** Radio group config-driven. */
export const RadioField: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any; onChange?: (e: any) => void; options?: any[]; fieldNames?: OptFieldNames;
  disabled?: boolean; optionType?: 'default' | 'button';
}> = ({ value, onChange, options, fieldNames, disabled, optionType }) => {
  const opts = useMemo(() => normalizeOptions(options, fieldNames), [options, fieldNames]);
  return (
    <Radio.Group value={value} onChange={onChange} disabled={disabled} optionType={optionType}
      options={opts.map((o) => ({ label: o.label, value: o.value, disabled: o.disabled }))} />
  );
};

/** Checkbox group config-driven (multiple). */
export const CheckboxField: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any[]; onChange?: (v: any[]) => void; options?: any[]; fieldNames?: OptFieldNames; disabled?: boolean;
}> = ({ value, onChange, options, fieldNames, disabled }) => {
  const opts = useMemo(() => normalizeOptions(options, fieldNames), [options, fieldNames]);
  return (
    <Checkbox.Group value={value} onChange={onChange} disabled={disabled}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options={opts.map((o) => ({ label: o.label as any, value: o.value, disabled: o.disabled }))} />
  );
};

/** AutoComplete config-driven + debounce search (async datasource qua onSearch). */
export const AutoCompleteField: React.FC<{
  value?: string; onChange?: (v: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any[]; fieldNames?: OptFieldNames;
  placeholder?: string; allowClear?: boolean; disabled?: boolean; loading?: boolean;
  onSearch?: (kw: string) => void; debounce?: number; style?: React.CSSProperties;
}> = ({ value, onChange, options, fieldNames, placeholder, allowClear = true, disabled, onSearch, debounce = 300, style }) => {
  const opts = useMemo(() => normalizeOptions(options, fieldNames), [options, fieldNames]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (kw: string) => {
    if (!onSearch) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(kw), debounce);
  };
  return (
    <AutoComplete
      value={value} onChange={onChange} onSearch={onSearch ? handleSearch : undefined}
      allowClear={allowClear} disabled={disabled} placeholder={placeholder}
      style={{ width: '100%', ...style }}
      options={opts.map((o) => ({ value: String(o.value), label: o.label }))}
      filterOption={onSearch ? false : (input, opt) => String(opt?.value ?? '').toLowerCase().includes(input.toLowerCase())}
    />
  );
};

/** Native select style ab-sel (giữ NGUYÊN look terminal) nhưng nhận options JSON config-driven — thay raw <select> trong form/modal. */
export const AbSelect: React.FC<{
  value?: string | number; onChange?: (v: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any[]; fieldNames?: OptFieldNames;
  placeholder?: string; disabled?: boolean; style?: React.CSSProperties; className?: string;
}> = ({ value, onChange, options, fieldNames, placeholder, disabled, style, className }) => {
  const opts = useMemo(() => normalizeOptions(options, fieldNames), [options, fieldNames]);
  return (
    <select className={className || 'ab-sel'} value={value as string} disabled={disabled} style={style}
      onChange={(e) => onChange?.(e.target.value)}>
      {placeholder != null && <option value="">{placeholder}</option>}
      {opts.map((o) => <option key={String(o.value)} value={o.value as string} disabled={o.disabled}>{o.label as string}</option>)}
    </select>
  );
};
