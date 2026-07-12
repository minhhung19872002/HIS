/**
 * InpatientServiceOrderCreateModal — TAO chi dinh dich vu/CLS noi tru.
 *
 * 2 che do chon dich vu (đều dồn vào danh sách "dịch vụ đã chọn" bên dưới):
 *   - Tìm dịch vụ:  searchServices(keyword, serviceType?) → ServiceSearchResultDto[]
 *   - Cây danh mục: getServiceTree(parentId?) lazy-load (Antd Tree checkable) → tick nhiều
 *
 * Moi dong: doi tuong TT (BHYT|Viện phí|Dịch vụ) · so luong · cap cuu/khan · ghi chu.
 * Luu → createServiceOrder(CreateInpatientServiceOrderDto).
 *
 * API verify trong api/inpatient.ts:
 *   searchServices · getServiceTree · createServiceOrder · getDiagnosisFromRecord
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AutoComplete, Checkbox, Input, InputNumber, Select, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  searchServices, getServiceTree, createServiceOrder, getDiagnosisFromRecord,
} from '../api/inpatient';
import type {
  ServiceSearchResultDto, ServiceTreeNodeDto, CreateInpatientServiceOrderDto,
} from '../api/inpatient';
import { ModalShell, Btn, DrSec, DrField, tk, tw, te } from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';

// ── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_TYPE_OPTIONS = [
  { value: 1, label: 'BHYT' },
  { value: 2, label: 'Viện phí' },
  { value: 3, label: 'Dịch vụ' },
];

// ── Types ────────────────────────────────────────────────────────────────────

interface SvcLine {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  unitPrice: number;
  quantity: number;
  paymentSource: number;
  isUrgent: boolean;
  isEmergency: boolean;
  note: string;
}

function makeLine(id: string, name: string, code = '', unitPrice = 0): SvcLine {
  return {
    serviceId: id, serviceCode: code, serviceName: name, unitPrice,
    quantity: 1, paymentSource: 1, isUrgent: false, isEmergency: false, note: '',
  };
}

// ── Service search picker ────────────────────────────────────────────────────

const ServicePicker: React.FC<{ onPick: (svc: ServiceSearchResultDto) => void }> = ({ onPick }) => {
  const [value, setValue] = useState('');
  const [options, setOptions] = useState<{ value: string; label: string; svc: ServiceSearchResultDto }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (kw: string) => {
    setValue(kw);
    if (timer.current) clearTimeout(timer.current);
    if (!kw.trim()) { setOptions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await searchServices(kw.trim());
        const list = (res.data as ServiceSearchResultDto[]) || [];
        setOptions(list.map((s) => ({
          value: s.id,
          label: `[${s.code ?? '—'}] ${s.name}${s.groupName ? ` · ${s.groupName}` : ''}`,
          svc: s,
        })));
      } catch { setOptions([]); }
    }, 280);
  };

  return (
    <AutoComplete
      value={value}
      options={options}
      onChange={setValue}
      onSearch={handleSearch}
      onSelect={(_v, opt) => {
        onPick((opt as typeof options[number]).svc);
        setValue(''); setOptions([]);
      }}
      placeholder="Tìm tên / mã dịch vụ…"
      allowClear
      filterOption={false}
      style={{ width: '100%' }}
    />
  );
};

// ── Main modal ───────────────────────────────────────────────────────────────

export interface InpatientServiceOrderCreateModalProps {
  open: boolean;
  admissionId: string;
  onClose: () => void;
  onDone: () => void;
  patientName?: string;
}

export const InpatientServiceOrderCreateModal: React.FC<InpatientServiceOrderCreateModalProps> = ({
  open, admissionId, onClose, onDone, patientName,
}) => {
  const [mode, setMode] = useState<'search' | 'tree'>('search');
  const [lines, setLines] = useState<SvcLine[]>([]);
  const [mainDiagnosisCode, setMainDiagnosisCode] = useState('');
  const [mainDiagnosis, setMainDiagnosis] = useState('');
  const [saving, setSaving] = useState(false);

  // Tree state
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [treeChecked, setTreeChecked] = useState<string[]>([]);
  const nodeMap = useRef<Map<string, ServiceTreeNodeDto>>(new Map());

  const toNode = (n: ServiceTreeNodeDto): DataNode => {
    nodeMap.current.set(n.id, n);
    return {
      key: n.id,
      title: `${n.code ? `[${n.code}] ` : ''}${n.name}`,
      isLeaf: n.hasChildren === false ? true : undefined,
      // Tick được mọi node trừ nhóm chắc chắn có con (hasChildren === true)
      checkable: n.hasChildren !== true,
    };
  };

  const loadTreeLevel = useCallback(async (parentId?: string): Promise<DataNode[]> => {
    try {
      const res = await getServiceTree(parentId);
      const list = (res.data as ServiceTreeNodeDto[]) || [];
      return list.map(toNode);
    } catch { return []; }
  }, []);

  const reset = useCallback(() => {
    setMode('search'); setLines([]); setTreeChecked([]);
    setMainDiagnosisCode(''); setMainDiagnosis('');
    nodeMap.current.clear();
    void getDiagnosisFromRecord(admissionId)
      .then((r) => { setMainDiagnosisCode(r.data?.mainDiagnosisCode ?? ''); setMainDiagnosis(r.data?.mainDiagnosis ?? ''); })
      .catch(() => { /* optional */ });
    void loadTreeLevel(undefined).then(setTreeData);
  }, [admissionId, loadTreeLevel]);

  useEffect(() => { if (open) reset(); }, [open, reset]);

  const onLoadData = async (node: DataNode): Promise<void> => {
    if (node.children && node.children.length) return;
    const children = await loadTreeLevel(String(node.key));
    setTreeData((prev) => updateTreeChildren(prev, String(node.key), children));
  };

  // Thêm dịch vụ (tránh trùng)
  const addService = (id: string, name: string, code = '', unitPrice = 0) =>
    setLines((prev) => prev.some((l) => l.serviceId === id) ? prev : [...prev, makeLine(id, name, code, unitPrice)]);

  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.serviceId !== id));
  const updateLine = (id: string, patch: Partial<SvcLine>) =>
    setLines((prev) => prev.map((l) => (l.serviceId === id ? { ...l, ...patch } : l)));

  // Đẩy các node đã tick (chỉ node lá) vào danh sách
  const addCheckedFromTree = () => {
    let added = 0;
    treeChecked.forEach((id) => {
      const n = nodeMap.current.get(id);
      if (n && n.hasChildren !== true) { addService(n.id, n.name, n.code ?? ''); added++; }
    });
    if (added === 0) { tw('Chưa tick dịch vụ nào'); return; }
    tk(`Đã thêm ${added} dịch vụ từ cây danh mục`);
    setTreeChecked([]);
  };

  const submit = async () => {
    if (!lines.length) { tw('Chưa chọn dịch vụ nào'); return; }
    const dto: CreateInpatientServiceOrderDto = {
      admissionId,
      mainDiagnosisCode: mainDiagnosisCode.trim() || undefined,
      mainDiagnosis: mainDiagnosis.trim() || undefined,
      services: lines.map((l) => ({
        serviceId: l.serviceId,
        quantity: l.quantity,
        paymentSource: l.paymentSource,
        isUrgent: l.isUrgent,
        isEmergency: l.isEmergency,
        note: l.note.trim() || undefined,
      })),
    };
    setSaving(true);
    try {
      await createServiceOrder(dto);
      tk(`Đã tạo chỉ định ${lines.length} dịch vụ`);
      onDone();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      te(msg || 'Tạo chỉ định dịch vụ thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <TermIcon name="plus" size={14} />
          <span>Tạo chỉ định CLS nội trú</span>
        </span>
      }
      sub={patientName}
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
          <Btn variant="ghost" size="sm" onClick={onClose}>Đóng</Btn>
          <Btn variant="primary" size="sm" loading={saving} disabled={!lines.length} onClick={() => { void submit(); }}>
            <TermIcon name="check" size={12} /> Lưu chỉ định
          </Btn>
        </div>
      }
    >
      {/* Chẩn đoán */}
      <DrSec title="Chẩn đoán">
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '2px 16px' }}>
          <DrField lbl="Mã ICD">
            <Input value={mainDiagnosisCode} onChange={(e) => setMainDiagnosisCode(e.target.value)} placeholder="VD: J18.9" />
          </DrField>
          <DrField lbl="Chẩn đoán">
            <Input value={mainDiagnosis} onChange={(e) => setMainDiagnosis(e.target.value)} placeholder="Chẩn đoán chính" />
          </DrField>
        </div>
      </DrSec>

      {/* Chọn dịch vụ */}
      <DrSec title="Chọn dịch vụ" action={
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <Btn variant={mode === 'search' ? 'primary' : 'ghost'} size="sm" onClick={() => setMode('search')}>
            <TermIcon name="search" size={11} /> Tìm
          </Btn>
          <Btn variant={mode === 'tree' ? 'primary' : 'ghost'} size="sm" onClick={() => setMode('tree')}>
            <TermIcon name="list" size={11} /> Cây danh mục
          </Btn>
        </div>
      }>
        {mode === 'search' && <ServicePicker onPick={(s) => addService(s.id, s.name, s.code ?? '', s.unitPrice ?? 0)} />}
        {mode === 'tree' && (
          <div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 'var(--space-8)', maxHeight: 240, overflow: 'auto', background: 'var(--d-0)' }}>
              {treeData.length === 0
                ? <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)', textAlign: 'center', padding: 'var(--space-12)' }}>Không có danh mục dịch vụ</div>
                : (
                  <Tree
                    checkable
                    checkStrictly
                    selectable={false}
                    treeData={treeData}
                    loadData={onLoadData}
                    checkedKeys={treeChecked}
                    onCheck={(checked) => {
                      const keys = Array.isArray(checked) ? checked : checked.checked;
                      setTreeChecked(keys.map(String));
                    }}
                  />
                )}
            </div>
            <div style={{ marginTop: 'var(--space-8)', textAlign: 'right' }}>
              <Btn variant="ghost" size="sm" disabled={!treeChecked.length} onClick={addCheckedFromTree}>
                <TermIcon name="plus" size={11} /> Thêm {treeChecked.length ? `(${treeChecked.length})` : ''} dịch vụ đã tick
              </Btn>
            </div>
          </div>
        )}
      </DrSec>

      {/* Dịch vụ đã chọn */}
      <DrSec title={`Dịch vụ đã chọn (${lines.length})`}>
        {lines.length === 0
          ? <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)', textAlign: 'center', padding: 'var(--space-12)' }}>Chưa có dịch vụ nào — tìm hoặc tick từ cây danh mục.</div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)', minWidth: 720 }}>
                <thead>
                  <tr style={{ background: 'var(--d-1)', borderBottom: '1px solid var(--line)' }}>
                    {['Dịch vụ', 'SL', 'Đối tượng', 'Cấp cứu', 'Khẩn', 'Ghi chú', ''].map((h) => (
                      <th key={h} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 'var(--fs-xs)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.serviceId} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '4px 6px', minWidth: 200 }}>
                        {l.serviceCode ? <span className="mono" style={{ color: 'var(--t-2)' }}>[{l.serviceCode}] </span> : null}{l.serviceName}
                      </td>
                      <td style={{ padding: '4px', width: 70 }}>
                        <InputNumber size="small" min={1} max={999} value={l.quantity} onChange={(v) => updateLine(l.serviceId, { quantity: v ?? 1 })} style={{ width: '100%' }} />
                      </td>
                      <td style={{ padding: '4px', width: 110 }}>
                        <Select<number> size="small" value={l.paymentSource} onChange={(v) => updateLine(l.serviceId, { paymentSource: v })} options={PAYMENT_TYPE_OPTIONS} style={{ width: '100%' }} />
                      </td>
                      <td style={{ padding: '4px', width: 60, textAlign: 'center' }}>
                        <Checkbox checked={l.isEmergency} onChange={(e) => updateLine(l.serviceId, { isEmergency: e.target.checked })} />
                      </td>
                      <td style={{ padding: '4px', width: 50, textAlign: 'center' }}>
                        <Checkbox checked={l.isUrgent} onChange={(e) => updateLine(l.serviceId, { isUrgent: e.target.checked })} />
                      </td>
                      <td style={{ padding: '4px', minWidth: 120 }}>
                        <Input size="small" value={l.note} onChange={(e) => updateLine(l.serviceId, { note: e.target.value })} placeholder="Ghi chú" />
                      </td>
                      <td style={{ padding: '4px', width: 32 }}>
                        <Btn variant="ghost" size="sm" onClick={() => removeLine(l.serviceId)} style={{ color: 'var(--s-crit)' }}>
                          <TermIcon name="x" size={11} />
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </DrSec>
    </ModalShell>
  );
};

// Cập nhật children của 1 node trong cây (immutable)
function updateTreeChildren(nodes: DataNode[], key: string, children: DataNode[]): DataNode[] {
  return nodes.map((n) => {
    if (String(n.key) === key) return { ...n, children };
    if (n.children) return { ...n, children: updateTreeChildren(n.children, key, children) };
    return n;
  });
}

export default InpatientServiceOrderCreateModal;
