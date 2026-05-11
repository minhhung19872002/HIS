// =====================================================================
// HIS Terminal · DANH MỤC BÁO CÁO (Report Catalogs) — v2
// 2 tabs: Loại nhóm BC · Nhóm báo cáo
// Bound to /api/master-catalog/{report-group-types,report-groups}
// =====================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Input, InputNumber, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import * as api from '../api/masterCatalog';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, te, cf, Ico,
  type ColumnDef,
} from './_v2kit';

type TabKey = 'types' | 'groups';

type AnyRow =
  | (api.ReportServiceGroupTypeDto & { _kind: 'types' })
  | (api.ReportServiceGroupDto & { _kind: 'groups' });

type EditState = Record<string, unknown> & { id?: string };

const PER = 15;

const ReportCatalogsV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('types');
  const [types, setTypes] = useState<api.ReportServiceGroupTypeDto[]>([]);
  const [groups, setGroups] = useState<api.ReportServiceGroupDto[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [editIsNew, setEditIsNew] = useState(false);

  useEffect(() => { setSearch(''); setFilterType(''); setPage(0); }, [tab]);

  const reload = async (which?: TabKey) => {
    try {
      if (!which || which === 'types')  setTypes(await api.getReportServiceGroupTypes());
      if (!which || which === 'groups') setGroups(await api.getReportServiceGroups());
    } catch { te('Không tải được danh mục'); }
  };
  useEffect(() => { reload(); }, []);

  const typeOptions = useMemo(() => types.map((t) => ({ v: t.id, l: `${t.code} · ${t.name}` })), [types]);

  const rows = useMemo<AnyRow[]>(() =>
    tab === 'types'
      ? types.map((r) => ({ ...r, _kind: 'types' as const }))
      : groups.map((r) => ({ ...r, _kind: 'groups' as const })),
    [tab, types, groups]);

  const filtered = useMemo(() => {
    let r = rows;
    const k = search.trim().toLowerCase();
    if (k) {
      r = r.filter((row) => {
        const blob = `${(row as { code?: string }).code || ''} ${(row as { name?: string }).name || ''} ${(row as { note?: string }).note || ''} ${(row as { reportLabel?: string }).reportLabel || ''} ${(row as { groupTypeName?: string }).groupTypeName || ''}`;
        return blob.toLowerCase().includes(k);
      });
    }
    if (tab === 'groups' && filterType) r = r.filter((row) => (row as api.ReportServiceGroupDto).groupTypeId === filterType);
    return r;
  }, [rows, search, filterType, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const pageData = filtered.slice(page * PER, (page + 1) * PER);

  const kpis = useMemo(() => {
    if (tab === 'types') {
      const active = types.filter((r) => r.isActive).length;
      const groupsPerType = (typeId: string) => groups.filter((g) => g.groupTypeId === typeId).length;
      const totalGroups = types.reduce((s, t) => s + groupsPerType(t.id), 0);
      return [
        { lbl: 'Tổng loại',     val: types.length, sub: 'phân nhóm BC' },
        { lbl: 'Hoạt động',     val: active,       sub: 'đang dùng',    tone: 'ok' as const },
        { lbl: 'Tạm dừng',      val: types.length - active, sub: 'không dùng', tone: 'warn' as const },
        { lbl: 'Tổng nhóm BC',  val: totalGroups,  sub: 'trải khắp',    tone: 'info' as const },
      ];
    }
    const active = groups.filter((r) => r.isActive).length;
    const byType = new Set(groups.map((g) => g.groupTypeId)).size;
    return [
      { lbl: 'Tổng nhóm BC', val: groups.length, sub: 'đăng ký' },
      { lbl: 'Hoạt động',    val: active,         sub: 'khả dụng',     tone: 'ok' as const },
      { lbl: 'Tạm dừng',     val: groups.length - active, sub: 'không dùng', tone: 'warn' as const },
      { lbl: 'Số loại đang dùng', val: byType,    sub: 'phân nhóm',    tone: 'info' as const },
    ];
  }, [tab, types, groups]);

  const tabsDef = [
    { v: 'types' as const,  ic: 'folder', l: `Loại nhóm BC (${types.length})` },
    { v: 'groups' as const, ic: 'list',   l: `Nhóm báo cáo (${groups.length})` },
  ];

  const cols: ColumnDef<AnyRow>[] = useMemo(() => {
    if (tab === 'types') {
      return [
        { key: 'code', label: 'Mã', mono: true, code: true, width: 130 },
        { key: 'name', label: 'Tên loại nhóm' },
        { key: 'reportLabel', label: 'Nhãn BC', width: 200, render: (r) => (
          <span style={{ color: 'var(--t-2)', fontSize: 12 }}>{(r as api.ReportServiceGroupTypeDto).reportLabel || '—'}</span>
        ) },
        { key: 'groupCount', label: 'Số nhóm BC', mono: true, width: 110, render: (r) => {
          const t = r as api.ReportServiceGroupTypeDto;
          return <span style={{ fontWeight: 600 }}>{groups.filter((g) => g.groupTypeId === t.id).length}</span>;
        } },
        { key: 'sortOrder', label: 'TT', mono: true, width: 60 },
        { key: 'isActive', label: 'Trạng thái', width: 120, render: (r) => (
          (r as api.ReportServiceGroupTypeDto).isActive
            ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
            : <StatusBadge tone="info" dot>Tạm dừng</StatusBadge>
        ) },
      ];
    }
    return [
      { key: 'code', label: 'Mã', mono: true, code: true, width: 170 },
      { key: 'name', label: 'Tên báo cáo' },
      { key: 'groupTypeName', label: 'Loại', width: 200, render: (r) => {
        const g = r as api.ReportServiceGroupDto;
        const t = types.find((x) => x.id === g.groupTypeId);
        return t
          ? <StatusBadge tone="info">{t.code}</StatusBadge>
          : <span style={{ fontFamily: 'var(--font-mono)' }}>{g.groupTypeName || g.groupTypeId}</span>;
      } },
      { key: 'note', label: 'Ghi chú', render: (r) => (
        <span style={{ color: 'var(--t-2)', fontSize: 12 }}>{(r as api.ReportServiceGroupDto).note || '—'}</span>
      ) },
      { key: 'sortOrder', label: 'TT', mono: true, width: 60 },
      { key: 'isActive', label: 'Trạng thái', width: 120, render: (r) => (
        (r as api.ReportServiceGroupDto).isActive
          ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
          : <StatusBadge tone="info" dot>Tạm dừng</StatusBadge>
      ) },
    ];
  }, [tab, types, groups]);

  const openDrawer = (row?: AnyRow) => {
    if (row) { setEdit({ ...row } as EditState); setEditIsNew(false); }
    else {
      const seed: EditState =
        tab === 'types'
          ? { code: '', name: '', reportLabel: '', note: '', isActive: true, sortOrder: rows.length + 1 }
          : { groupTypeId: types[0]?.id || '', code: '', name: '', note: '', isActive: true, sortOrder: rows.length + 1 };
      setEdit(seed);
      setEditIsNew(true);
    }
  };

  const handleSave = async () => {
    if (!edit) return;
    try {
      if (tab === 'types') await api.saveReportServiceGroupType(edit as Partial<api.ReportServiceGroupTypeDto>);
      else                 await api.saveReportServiceGroup(edit as Partial<api.ReportServiceGroupDto>);
      tk(editIsNew ? 'Đã thêm' : 'Đã cập nhật');
      setEdit(null);
      reload();  // both, so groups KPI on types tab refreshes
    } catch { te('Lưu thất bại'); }
  };

  const handleDelete = (row: AnyRow) => {
    cf(`Xoá "${(row as { name?: string }).name || row.id}"?`, async () => {
      try {
        if (tab === 'types') await api.deleteReportServiceGroupType(row.id);
        else await api.deleteReportServiceGroup(row.id);
        tk('Đã xoá');
        reload();
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
    a.download = `report-catalog-${tab}-${dayjs().format('YYYYMMDD')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    tk('Đã xuất CSV');
  };

  const rowAct = (r: AnyRow) => (
    <>
      <ActBtn ic="edit" title="Sửa" onClick={() => openDrawer(r)} />
      <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => handleDelete(r)} />
    </>
  );

  return (
    <div className="ab">
      <KpiStrip items={kpis} />
      <TopTabs tab={tab} setTab={setTab} tabs={tabsDef} />
      <div className="ab-toolbar">
        <SearchBox value={search} onChange={setSearch}
          placeholder={tab === 'types' ? 'Tìm loại nhóm BC…' : 'Tìm theo mã / tên báo cáo…'} />
        {tab === 'groups' && typeOptions.length > 0 && (
          <Filter value={filterType} onChange={setFilterType} options={typeOptions} placeholder="Tất cả loại" />
        )}
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
            {tab === 'types' && (
              <DrField lbl="Nhãn báo cáo">
                <Input
                  value={edit.reportLabel as string || ''}
                  onChange={(e) => setEdit({ ...edit, reportLabel: e.target.value })}
                  placeholder="Tiêu đề khi xuất báo cáo"
                />
              </DrField>
            )}
            {tab === 'groups' && (
              <DrField lbl="Loại nhóm *">
                <Select
                  value={edit.groupTypeId as string || ''}
                  options={types.map((t) => ({ value: t.id, label: `${t.code} · ${t.name}` }))}
                  style={{ width: '100%' }}
                  onChange={(v) => setEdit({ ...edit, groupTypeId: v })}
                  placeholder="Chọn loại"
                  showSearch
                  optionFilterProp="label"
                />
              </DrField>
            )}
            <DrField lbl="Ghi chú">
              <Input.TextArea
                rows={2}
                value={edit.note as string || ''}
                onChange={(e) => setEdit({ ...edit, note: e.target.value })}
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
            <DrField lbl="Hoạt động">
              <Switch checked={!!edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} />
            </DrField>
          </DrSec>
        )}
      </DrawerShell>
    </div>
  );
};

export default ReportCatalogsV2;
