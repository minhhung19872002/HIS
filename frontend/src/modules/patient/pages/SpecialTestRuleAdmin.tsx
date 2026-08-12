// =====================================================================
// HIS Terminal · DANH MỤC XN/CLS ĐẶC BIỆT — F2.13
// Quản trị khung thời gian cảnh báo tái chỉ định cho từng XN.
// WindowType 0 = 1 lần/đợt điều trị, 1 = cấm lại trong N ngày.
// Bound to /api/business-alerts/special-test-rules
// =====================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AutoComplete, Input, InputNumber, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import * as api from '../api/businessAlerts';
import { searchServices } from '../../opd/api/examination';
import {
  KpiStrip, DataTable, Pager, SearchBox, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, tk, te, cf, Ico,
  type ColumnDef,
} from '@/_v2kit';

const PER = 20;

const WINDOW_TYPE_OPTIONS = [
  { value: 0, label: '1 lần/đợt điều trị (per-episode)' },
  { value: 1, label: 'Cách nhau N ngày' },
];

type EditState = Partial<api.SpecialTestRuleSaveDto> & { _testName?: string };

const SpecialTestRuleAdmin: React.FC = () => {
  const [rows, setRows] = useState<api.SpecialTestRuleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [editIsNew, setEditIsNew] = useState(false);
  const [serviceSuggestions, setServiceSuggestions] = useState<{ value: string; label: string; id: string }[]>([]);
  const [serviceSearchValue, setServiceSearchValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getSpecialTestRules({
        keyword: search || undefined,
        isActive: filterActive,
        pageIndex: page,
        pageSize: PER,
      });
      setRows(result.data.items);
      setTotal(result.data.totalCount);
    } catch {
      te('Không tải được danh mục XN đặc biệt');
    } finally {
      setLoading(false);
    }
  }, [search, filterActive, page]);

  useEffect(() => { load(); }, [load]);

  const kpis = useMemo(() => [
    { lbl: 'Tổng quy tắc', val: total, sub: 'trong danh mục' },
    { lbl: 'Per-episode', val: rows.filter((r) => r.windowType === 0).length, sub: '1 lần/đợt', tone: 'info' as const },
    { lbl: 'N-ngày', val: rows.filter((r) => r.windowType === 1).length, sub: 'khung ngày cố định', tone: 'warn' as const },
    { lbl: 'Đang hiệu lực', val: rows.filter((r) => r.isActive).length, sub: 'active', tone: 'ok' as const },
  ], [rows, total]);

  const cols: ColumnDef<api.SpecialTestRuleDto>[] = [
    { key: 'testName', label: 'Tên XN/CLS' },
    {
      key: 'windowType',
      label: 'Loại khung',
      width: 180,
      render: (r) => (
        <StatusBadge tone={r.windowType === 0 ? 'info' : 'warn'} dot>
          {r.windowType === 0 ? '1 lần/đợt' : `${r.windowDays ?? '?'} ngày`}
        </StatusBadge>
      ),
    },
    {
      key: 'note',
      label: 'Ghi chú',
      render: (r) => (
        <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
          {r.note ? r.note.slice(0, 80) + (r.note.length > 80 ? '…' : '') : '—'}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Trạng thái',
      width: 120,
      render: (r) => (
        r.isActive
          ? <StatusBadge tone="ok" dot>Hiệu lực</StatusBadge>
          : <StatusBadge tone="info" dot>Tạm dừng</StatusBadge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Ngày tạo',
      width: 110,
      render: (r) => (
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
          {dayjs(r.createdAt).format('DD/MM/YYYY')}
        </span>
      ),
    },
  ];

  const openDrawer = (row?: api.SpecialTestRuleDto) => {
    if (row) {
      setEdit({
        id: row.id,
        testId: row.testId,
        windowType: row.windowType,
        windowDays: row.windowDays,
        note: row.note,
        isActive: row.isActive,
        _testName: row.testName,
      });
      setServiceSearchValue(row.testName);
      setEditIsNew(false);
    } else {
      setEdit({ windowType: 1, windowDays: 1, isActive: true });
      setServiceSearchValue('');
      setEditIsNew(true);
    }
  };

  const handleSave = async () => {
    if (!edit) return;
    if (!edit.testId) { te('Vui lòng chọn XN/CLS'); return; }
    if (edit.windowType === 1 && (!edit.windowDays || edit.windowDays < 1)) {
      te('Số ngày phải ≥ 1'); return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await api.saveSpecialTestRule({
        id: edit.id,
        testId: edit.testId!,
        windowType: edit.windowType as 0 | 1,
        windowDays: edit.windowType === 1 ? edit.windowDays : undefined,
        note: edit.note,
        isActive: edit.isActive ?? true,
      });
      tk(editIsNew ? 'Đã thêm quy tắc XN' : 'Đã cập nhật');
      setEdit(null);
      load();
    } catch {
      te('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: api.SpecialTestRuleDto) => {
    cf(`Xoá quy tắc cho "${row.testName}"?`, async () => {
      try {
        await api.deleteSpecialTestRule(row.id);
        tk('Đã xoá');
        load();
      } catch {
        te('Xoá thất bại');
      }
    }, { tone: 'crit', confirm: 'Xoá' });
  };

  const handleServiceSearch = async (kw: string) => {
    setServiceSearchValue(kw);
    if (!kw || kw.length < 2) { setServiceSuggestions([]); return; }
    try {
      // searchServices uses legacy `request` interceptor which wraps result as { success, data }
      const resp = await searchServices(kw, 20) as unknown as { data?: { id: string; name: string; code: string; serviceType: number }[] };
      const list = resp.data ?? [];
      // Filter only XN lab services (serviceType === 1)
      const labServices = list.filter((s) => s.serviceType === 1);
      setServiceSuggestions(labServices.map((s) => ({
        id: s.id,
        value: s.name,
        label: `${s.name} (${s.code})`,
      })));
    } catch {
      setServiceSuggestions([]);
    }
  };

  const rowAct = (r: api.SpecialTestRuleDto) => (
    <>
      <ActBtn ic="edit" title="Sửa" onClick={() => openDrawer(r)} />
      <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => handleDelete(r)} />
    </>
  );

  const totalPages = Math.max(1, Math.ceil(total / PER));

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <div className="ab-toolbar">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Tìm XN/CLS…" />
        <Select
          allowClear
          placeholder="Trạng thái"
          style={{ width: 140 }}
          value={filterActive}
          onChange={(v) => { setFilterActive(v); setPage(0); }}
          options={[
            { value: true, label: 'Đang hiệu lực' },
            { value: false, label: 'Tạm dừng' },
          ]}
        />
        <span className="spacer" />
        <Btn variant="primary" icon="plus" onClick={() => openDrawer()}>Thêm mới</Btn>
      </div>

      <DataTable
        columns={cols}
        data={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => openDrawer(r)}
        actions={rowAct}
        loading={loading}
        empty={search ? 'Không khớp từ khoá.' : 'Chưa có quy tắc XN nào. Thêm để bắt đầu.'}
      />
      <Pager page={page} totalPages={totalPages} setPage={setPage} total={total} perPage={PER} />

      <DrawerShell
        open={!!edit}
        onClose={() => setEdit(null)}
        size="lg"
        title={editIsNew ? 'Thêm quy tắc XN đặc biệt' : `Sửa: ${edit?._testName || ''}`}
        sub="Danh mục XN/CLS · Khung thời gian cảnh báo tái chỉ định"
        footer={(
          <>
            <Btn variant="ghost" onClick={() => setEdit(null)}>Huỷ</Btn>
            <Btn variant="primary" icon="check" onClick={handleSave}>
              {editIsNew ? 'Tạo mới' : 'Lưu'}
            </Btn>
          </>
        )}
      >
        {edit && (
          <DrSec title="Cấu hình quy tắc">
            <DrField lbl="Dịch vụ XN/CLS *">
              <AutoComplete
                style={{ width: '100%' }}
                value={serviceSearchValue}
                options={serviceSuggestions}
                onSearch={handleServiceSearch}
                onSelect={(_val, opt) => {
                  const o = opt as { id: string; value: string };
                  setEdit({ ...edit, testId: o.id, _testName: o.value });
                  setServiceSearchValue(o.value);
                }}
                placeholder="Gõ tên hoặc mã XN để tìm…"
              />
            </DrField>

            <DrField lbl="Loại khung thời gian *">
              <Select
                value={edit.windowType ?? 1}
                options={WINDOW_TYPE_OPTIONS}
                style={{ width: '100%' }}
                onChange={(v) => setEdit({ ...edit, windowType: v as 0 | 1 })}
              />
            </DrField>

            {edit.windowType === 1 && (
              <DrField lbl="Số ngày cấm tái chỉ định *">
                <InputNumber
                  value={edit.windowDays ?? 1}
                  min={1}
                  max={365}
                  addonAfter="ngày"
                  style={{ width: '100%' }}
                  onChange={(v) => setEdit({ ...edit, windowDays: v ?? 1 })}
                />
              </DrField>
            )}

            {edit.windowType === 0 && (
              <DrField lbl="">
                <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
                  <Ico name="info" size={13} /> XN này chỉ được chỉ định 1 lần trong cùng 1 đợt điều trị (MedicalRecord).
                  Cảnh báo sẽ hiện nếu chỉ định lần 2 trong cùng hồ sơ bệnh án.
                </span>
              </DrField>
            )}

            <DrField lbl="Ghi chú / căn cứ">
              <Input.TextArea
                rows={3}
                value={edit.note || ''}
                onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                placeholder="VD: TT 52/2017 phụ lục IV — xét nghiệm này 1 lần/đợt"
              />
            </DrField>

            <DrField lbl="Đang hiệu lực">
              <Switch
                checked={!!edit.isActive}
                onChange={(v) => setEdit({ ...edit, isActive: v })}
              />
            </DrField>
          </DrSec>
        )}
      </DrawerShell>
    </div>
  );
};

export default SpecialTestRuleAdmin;
