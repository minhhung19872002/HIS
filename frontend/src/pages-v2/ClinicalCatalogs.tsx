// =====================================================================
// HIS Terminal · DANH MỤC LÂM SÀNG (Clinical Catalogs) — v2
// 2 tabs: Chế độ chăm sóc · Loại bệnh án
// Bound to /api/master-catalog/{nursing-care-levels,medical-record-types}
// =====================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Input, InputNumber, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import * as api from '../api/masterCatalog';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, te, cf, Ico,
  type ColumnDef,
} from './_v2kit';

type TabKey = 'nursing' | 'mr';

type AnyRow =
  | (api.NursingCareLevelDto & { _kind: 'nursing' })
  | (api.MedicalRecordTypeDto & { _kind: 'mr' });

type EditState = Record<string, unknown> & { id?: string };

const MR_CATEGORIES: { value: number; label: string; tone: 'info' | 'ok' | 'crit' | 'warn' }[] = [
  { value: 1, label: 'Ngoại trú', tone: 'info' },
  { value: 2, label: 'Nội trú',   tone: 'ok' },
  { value: 3, label: 'Cấp cứu',   tone: 'crit' },
  { value: 4, label: 'Khám SK',   tone: 'warn' },
  { value: 5, label: 'Khác',      tone: 'info' },
];

const NursingLevelChip: React.FC<{ level: number }> = ({ level }) => {
  const tone: 'crit' | 'warn' | 'ok' = level === 1 ? 'crit' : level === 2 ? 'warn' : 'ok';
  const lbl = level === 1 ? 'Cấp 1 — Toàn diện' : level === 2 ? 'Cấp 2 — Một phần' : 'Cấp 3 — Tự CS';
  return <StatusBadge tone={tone} dot>{lbl}</StatusBadge>;
};

const PER = 15;

const ClinicalCatalogsV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('nursing');
  const [nursing, setNursing] = useState<api.NursingCareLevelDto[]>([]);
  const [mrTypes, setMrTypes] = useState<api.MedicalRecordTypeDto[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [editIsNew, setEditIsNew] = useState(false);

  useEffect(() => { setSearch(''); setPage(0); }, [tab]);

  const reload = async (which?: TabKey) => {
    try {
      if (!which || which === 'nursing') setNursing(await api.getNursingCareLevels());
      if (!which || which === 'mr')      setMrTypes(await api.getMedicalRecordTypes());
    } catch { te('Không tải được danh mục'); }
  };
  useEffect(() => { reload(); }, []);

  const rows = useMemo<AnyRow[]>(() =>
    tab === 'nursing'
      ? nursing.map((r) => ({ ...r, _kind: 'nursing' as const }))
      : mrTypes.map((r) => ({ ...r, _kind: 'mr' as const })),
    [tab, nursing, mrTypes]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((r) =>
      `${r.code} ${r.name} ${(r as { note?: string }).note || ''} ${(r as { description?: string }).description || ''}`
        .toLowerCase().includes(k),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const pageData = filtered.slice(page * PER, (page + 1) * PER);

  const kpis = useMemo(() => {
    if (tab === 'nursing') {
      return [
        { lbl: 'Tổng chế độ',          val: nursing.length,                              sub: 'trong danh mục' },
        { lbl: 'Cấp 1 — Toàn diện',    val: nursing.filter((r) => r.level === 1).length, sub: 'nguy kịch', tone: 'crit' as const },
        { lbl: 'Cấp 2 — Một phần',     val: nursing.filter((r) => r.level === 2).length, sub: 'nặng',      tone: 'warn' as const },
        { lbl: 'Cấp 3 — Tự chăm sóc',  val: nursing.filter((r) => r.level === 3).length, sub: 'nhẹ',       tone: 'ok' as const },
      ];
    }
    const opd = mrTypes.filter((r) => r.category === 1).length;
    const ipd = mrTypes.filter((r) => r.category === 2).length;
    const er  = mrTypes.filter((r) => r.category === 3).length;
    const locked = mrTypes.filter((r) => r.isLocked).length;
    return [
      { lbl: 'Tổng loại BA',     val: mrTypes.length,         sub: 'TT 32/2023' },
      { lbl: 'Ngoại trú',        val: opd,                     sub: 'OPD',            tone: 'info' as const },
      { lbl: 'Nội trú',          val: ipd,                     sub: 'IPD',            tone: 'ok' as const },
      { lbl: 'Cấp cứu / Khoá',   val: `${er} / ${locked}`,     sub: 'A&E · không xoá', tone: 'crit' as const },
    ];
  }, [tab, nursing, mrTypes]);

  const tabsDef = [
    { v: 'nursing' as const, ic: 'stethoscope', l: `Chế độ chăm sóc (${nursing.length})` },
    { v: 'mr' as const,      ic: 'folder',      l: `Loại bệnh án (${mrTypes.length})` },
  ];

  const cols: ColumnDef<AnyRow>[] = useMemo(() => {
    if (tab === 'nursing') {
      return [
        { key: 'code', label: 'Mã', mono: true, code: true, width: 80 },
        { key: 'name', label: 'Tên chế độ' },
        { key: 'level', label: 'Cấp', width: 200, render: (r) => <NursingLevelChip level={(r as api.NursingCareLevelDto).level} /> },
        { key: 'description', label: 'Mô tả ngắn', render: (r) => {
          const d = (r as api.NursingCareLevelDto).description || '';
          return <span style={{ color: 'var(--t-2)', fontSize: 12 }}>{d.slice(0, 90)}{d.length > 90 ? '…' : ''}</span>;
        } },
        { key: 'sortOrder', label: 'TT', mono: true, width: 60 },
        { key: 'isActive', label: 'Trạng thái', width: 120, render: (r) => (
          (r as api.NursingCareLevelDto).isActive
            ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
            : <StatusBadge tone="info" dot>Tạm dừng</StatusBadge>
        ) },
      ];
    }
    return [
      { key: 'code', label: 'Mã', mono: true, code: true, width: 100 },
      { key: 'name', label: 'Tên loại bệnh án' },
      { key: 'category', label: 'Phân loại', width: 140, render: (r) => {
        const c = MR_CATEGORIES.find((x) => x.value === (r as api.MedicalRecordTypeDto).category);
        return c ? <StatusBadge tone={c.tone} dot>{c.label}</StatusBadge> : '—';
      } },
      { key: 'note', label: 'Ghi chú', render: (r) => (
        <span style={{ color: 'var(--t-2)', fontSize: 12 }}>{(r as api.MedicalRecordTypeDto).note || '—'}</span>
      ) },
      { key: 'isLocked', label: 'Khoá', width: 80, render: (r) => (
        (r as api.MedicalRecordTypeDto).isLocked
          ? <span title="Hệ thống — không xoá" style={{ color: 'var(--a-rd-text)' }}><Ico name="lock" size={13} /></span>
          : <span style={{ color: 'var(--t-3)' }}>—</span>
      ) },
      { key: 'isActive', label: 'Trạng thái', width: 120, render: (r) => (
        (r as api.MedicalRecordTypeDto).isActive
          ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
          : <StatusBadge tone="info" dot>Tạm dừng</StatusBadge>
      ) },
    ];
  }, [tab]);

  const openDrawer = (row?: AnyRow) => {
    if (row) { setEdit({ ...row } as EditState); setEditIsNew(false); }
    else {
      const seed: EditState =
        tab === 'nursing'
          ? { code: '', name: '', level: 3, description: '', note: '', isActive: true, sortOrder: rows.length + 1 }
          : { code: '', name: '', category: 1, note: '', isLocked: false, isActive: true, sortOrder: rows.length + 1 };
      setEdit(seed);
      setEditIsNew(true);
    }
  };

  const handleSave = async () => {
    if (!edit) return;
    try {
      if (tab === 'nursing') await api.saveNursingCareLevel(edit as Partial<api.NursingCareLevelDto>);
      else await api.saveMedicalRecordType(edit as Partial<api.MedicalRecordTypeDto>);
      tk(editIsNew ? 'Đã thêm' : 'Đã cập nhật');
      setEdit(null);
      reload(tab);
    } catch { te('Lưu thất bại'); }
  };

  const handleDelete = (row: AnyRow) => {
    if ((row as { isLocked?: boolean }).isLocked) {
      te('Bản ghi đã khoá — không thể xoá');
      return;
    }
    cf(`Xoá "${(row as { name?: string }).name || row.id}"?`, async () => {
      try {
        if (tab === 'nursing') await api.deleteNursingCareLevel(row.id);
        else await api.deleteMedicalRecordType(row.id);
        tk('Đã xoá');
        reload(tab);
      } catch { te('Xoá thất bại'); }
    }, { tone: 'crit', confirm: 'Xoá' });
  };

  const exportCsv = () => {
    const header = cols.map((c) => c.label).join(',');
    const body = filtered.map((r) => cols.map((c) => {
      const v = (r as unknown as Record<string, unknown>)[c.key];
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `clinical-catalog-${tab}-${dayjs().format('YYYYMMDD')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    tk('Đã xuất CSV');
  };

  const rowAct = (r: AnyRow) => (
    <>
      <ActBtn ic="edit" title="Sửa" onClick={() => openDrawer(r)} />
      <ActBtn
        ic="trash"
        title={(r as { isLocked?: boolean }).isLocked ? 'Đã khoá' : 'Xoá'}
        tone="crit"
        onClick={() => handleDelete(r)}
      />
    </>
  );

  return (
    <div className="ab">
      <KpiStrip items={kpis} />
      <TopTabs tab={tab} setTab={setTab} tabs={tabsDef} />
      <div className="ab-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={tab === 'nursing' ? 'Tìm chế độ chăm sóc…' : 'Tìm loại bệnh án…'} />
        <span className="spacer" />
        <button type="button" className="ab-btn ghost" onClick={exportCsv}><Ico name="download" size={12} /> Xuất CSV</button>
        <button type="button" className="ab-btn primary" onClick={() => openDrawer()}><Ico name="plus" size={12} /> Thêm mới</button>
      </div>
      <DataTable
        columns={cols}
        data={pageData}
        rowKey={(r) => r.id}
        onRowClick={(r) => openDrawer(r)}
        actions={rowAct}
        empty={search ? 'Không khớp từ khoá.' : 'Chưa có dữ liệu.'}
      />
      <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!edit}
        onClose={() => setEdit(null)}
        size="lg"
        title={editIsNew ? 'Thêm bản ghi mới' : `Sửa: ${(edit?.name as string) || (edit?.code as string) || ''}`}
        sub={`Mục: ${tabsDef.find((t) => t.v === tab)?.l.split(' (')[0]}`}
        footer={(
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setEdit(null)}>Huỷ</button>
            <button type="button" className="ab-btn primary" onClick={handleSave}>
              <Ico name="check" size={12} /> {editIsNew ? 'Tạo mới' : 'Lưu'}
            </button>
          </>
        )}
      >
        {edit && (
          <DrSec title="Thông tin">
            <DrField lbl="Mã *">
              <Input value={edit.code as string || ''} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} />
            </DrField>
            <DrField lbl="Tên *">
              <Input value={edit.name as string || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </DrField>
            {tab === 'nursing' && (
              <>
                <DrField lbl="Cấp chăm sóc *">
                  <Select
                    value={edit.level as number ?? 3}
                    options={[
                      { value: 1, label: 'Cấp 1 — Toàn diện' },
                      { value: 2, label: 'Cấp 2 — Một phần' },
                      { value: 3, label: 'Cấp 3 — Tự chăm sóc' },
                    ]}
                    style={{ width: '100%' }}
                    onChange={(v) => setEdit({ ...edit, level: v })}
                  />
                </DrField>
                <DrField lbl="Mô tả chi tiết">
                  <Input.TextArea
                    rows={4}
                    value={edit.description as string || ''}
                    onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                  />
                </DrField>
              </>
            )}
            {tab === 'mr' && (
              <DrField lbl="Phân loại *">
                <Select
                  value={edit.category as number ?? 1}
                  options={MR_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                  style={{ width: '100%' }}
                  onChange={(v) => setEdit({ ...edit, category: v })}
                />
              </DrField>
            )}
            <DrField lbl="Ghi chú">
              <Input.TextArea
                rows={2}
                value={edit.note as string || ''}
                onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                placeholder="Căn cứ pháp lý / ghi chú nội bộ"
              />
            </DrField>
            <DrField lbl="Thứ tự">
              <InputNumber
                value={edit.sortOrder as number ?? 1}
                min={0}
                style={{ width: '100%' }}
                onChange={(v) => setEdit({ ...edit, sortOrder: v ?? 0 })}
              />
            </DrField>
            {tab === 'mr' && (
              <DrField lbl="Khoá hệ thống">
                <Switch checked={!!edit.isLocked} onChange={(v) => setEdit({ ...edit, isLocked: v })} />
              </DrField>
            )}
            <DrField lbl="Hoạt động">
              <Switch checked={!!edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} />
            </DrField>
          </DrSec>
        )}
      </DrawerShell>
    </div>
  );
};

export default ClinicalCatalogsV2;
