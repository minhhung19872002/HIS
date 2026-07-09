import React, { useEffect, useMemo, useState } from 'react';
import { message, Form, Input, InputNumber, Switch, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { ModalShell } from '../ModalShell';
import {
  OptionsSelect, RadioField, CheckboxField, AutoCompleteField,
} from '../../form/Options';
import type { OptFieldNames } from '../../form/Options';
import { applyServerErrors } from '../../form/applyServerErrors';

// ─────────────────────────── CRUD modal (validate + focus + lỗi BE) ───────────────────────────

export interface CrudFieldCfg {
  key: string; label: string;
  type?: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'autocomplete' | 'switch' | 'date' | 'password';
  required?: boolean;
  // datasource JSON (config-driven) — phần tử {value,label,disabled,group,children} hoặc tuỳ biến qua fieldNames
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any[];
  fieldNames?: OptFieldNames;
  placeholder?: string; disabledOnEdit?: boolean;
  showSearch?: boolean; allowClear?: boolean;        // select/multiselect
  onSearch?: (kw: string) => void; debounce?: number; // autocomplete async datasource
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules?: any[];
}

/** Modal CRUD tái dùng: Antd Form + validate (rules) + scrollToFirstError + map lỗi BE → field + focus.
 *  Date field tự convert string↔dayjs; submit trả values (date dạng 'YYYY-MM-DD'). */
export const CrudModal: React.FC<{
  open: boolean; onClose: () => void; title: string; sub?: string;
  fields: CrudFieldCfg[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initial?: Record<string, any> | null;   // có id = sửa; null/{} = thêm
  size?: 'sm' | 'md' | 'lg' | 'xl';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (values: Record<string, any>, editing: boolean) => Promise<void>;
}> = ({ open, onClose, title, sub, fields, initial, size = 'md', onSubmit }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const editing = !!(initial && initial.id);
  const dateKeys = useMemo(() => fields.filter((f) => f.type === 'date').map((f) => f.key), [fields]);
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (initial && Object.keys(initial).length) {
      const v = { ...initial };
      dateKeys.forEach((k) => { if (v[k]) v[k] = dayjs(v[k]); });
      form.setFieldsValue(v);
    }
  }, [open, initial, form, dateKeys]);
  const submit = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let v: Record<string, any>;
    try { v = await form.validateFields(); } catch { return; }  // client UX: hiện lỗi inline + focus field lỗi
    dateKeys.forEach((k) => { if (v[k] && dayjs.isDayjs(v[k])) v[k] = v[k].format('YYYY-MM-DD'); });
    if (initial?.id) v.id = initial.id;
    setSaving(true);
    try { await onSubmit(v, editing); onClose(); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (e: any) { if (!applyServerErrors(form, e)) message.error(e?.response?.data?.message || 'Lưu thất bại'); }
    finally { setSaving(false); }
  };
  return (
    <ModalShell open={open} onClose={onClose} title={title} sub={sub} size={size}
      footer={<>
        <button type="button" className="ab-btn" onClick={onClose}>Huỷ</button>
        <button type="button" className="ab-btn primary" disabled={saving} onClick={submit}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
      </>}>
      <Form form={form} layout="vertical" scrollToFirstError requiredMark>
        {fields.map((f) => (
          <Form.Item key={f.key} name={f.key} label={f.label}
            valuePropName={f.type === 'switch' ? 'checked' : undefined}
            rules={f.rules || (f.required ? [{ required: true, message: `Nhập ${f.label}` }] : undefined)}>
            {f.type === 'select' ? <OptionsSelect options={f.options} fieldNames={f.fieldNames} showSearch={f.showSearch ?? true} allowClear={f.allowClear ?? true} placeholder={f.placeholder} />
              : f.type === 'multiselect' ? <OptionsSelect multiple options={f.options} fieldNames={f.fieldNames} showSearch={f.showSearch ?? true} allowClear={f.allowClear ?? true} placeholder={f.placeholder} />
              : f.type === 'radio' ? <RadioField options={f.options} fieldNames={f.fieldNames} />
              : f.type === 'checkbox' ? <CheckboxField options={f.options} fieldNames={f.fieldNames} />
              : f.type === 'autocomplete' ? <AutoCompleteField options={f.options} fieldNames={f.fieldNames} placeholder={f.placeholder} onSearch={f.onSearch} debounce={f.debounce} allowClear={f.allowClear ?? true} />
              : f.type === 'number' ? <InputNumber style={{ width: '100%' }} placeholder={f.placeholder} />
              : f.type === 'switch' ? <Switch />
              : f.type === 'date' ? <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              : f.type === 'textarea' ? <Input.TextArea rows={3} placeholder={f.placeholder} />
              : f.type === 'password' ? <Input.Password placeholder={f.placeholder} />
              : <Input disabled={editing && f.disabledOnEdit} placeholder={f.placeholder} />}
          </Form.Item>
        ))}
      </Form>
    </ModalShell>
  );
};
