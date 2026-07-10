// =====================================================================
// HIS Terminal · DANH MỤC ĐỊA DANH HÀNH CHÍNH — v2
// 3 tabs: Tỉnh/Thành phố · Quận/Huyện · Xã/Phường/Thị trấn
// F10.1 #94 — Bound to /api/administrative-unit/{provinces,districts,wards}
// =====================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, Select, Switch } from 'antd';
import {
  getProvinces, saveProvince, deleteProvince,
  getDistricts, saveDistrict, deleteDistrict,
  getWards, saveWard, deleteWard,
  type ProvinceDto, type DistrictDto, type WardDto,
} from '../modules/administration/api/administrativeUnit';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, tk, te, cf,
  type ColumnDef,
} from './_v2kit';

type TabKey = 'province' | 'district' | 'ward';

const TABS: { v: TabKey; l: string; ic: string }[] = [
  { v: 'province', l: 'Tỉnh/Thành phố', ic: 'map' },
  { v: 'district', l: 'Quận/Huyện',     ic: 'building' },
  { v: 'ward',     l: 'Xã/Phường/TT',   ic: 'home' },
];

type EditState = {
  id?: string;
  code: string;
  name: string;
  isActive: boolean;
  // district / ward
  provinceId?: string;
  districtId?: string;
};

const EMPTY_EDIT: EditState = { code: '', name: '', isActive: true };
const PER = 20;

const AdministrativeUnitsV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('province');
  const [provinces, setProvinces] = useState<ProvinceDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [wards, setWards]         = useState<WardDto[]>([]);
  const [search, setSearch] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      if (tab === 'province') setProvinces(await getProvinces());
      if (tab === 'district') setDistricts(await getDistricts(filterProvince || undefined));
      if (tab === 'ward')     setWards(await getWards(filterDistrict || undefined));
    } catch { te('Không tải được danh mục'); }
  }, [tab, filterProvince, filterDistrict]);

  useEffect(() => { setSearch(''); setPage(0); }, [tab, filterProvince, filterDistrict]);
  useEffect(() => { void reload(); }, [reload]);

  // ── Filtered rows ──────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    const kw = search.toLowerCase();
    if (tab === 'province')
      return provinces.filter(p => !kw || p.name.toLowerCase().includes(kw) || p.code.includes(kw));
    if (tab === 'district')
      return districts.filter(d => !kw || d.name.toLowerCase().includes(kw) || d.code.includes(kw));
    return wards.filter(w => !kw || w.name.toLowerCase().includes(kw) || w.code.includes(kw));
  }, [tab, provinces, districts, wards, search]);

  const paged = rows.slice(page * PER, (page + 1) * PER);

  // ── KPI ────────────────────────────────────────────────────────────────────
  const kpis = [
    { lbl: 'Tỉnh/TP', val: provinces.filter(p => p.isActive).length, tone: 'info' as const },
    { lbl: 'Quận/Huyện', val: districts.filter(d => d.isActive).length, tone: 'info' as const },
    { lbl: 'Xã/Phường', val: wards.filter(w => w.isActive).length, tone: 'info' as const },
  ];

  // ── Columns ────────────────────────────────────────────────────────────────
  const colsProvince: ColumnDef<ProvinceDto>[] = [
    { key: 'code', label: 'Mã', width: 80, mono: true },
    { key: 'name', label: 'Tên tỉnh/thành phố' },
    { key: 'isActive', label: 'Trạng thái', width: 120,
      render: r => <StatusBadge tone={r.isActive ? 'ok' : 'crit'} dot>{r.isActive ? 'Đang dùng' : 'Ngưng'}</StatusBadge> },
  ];
  const colsDistrict: ColumnDef<DistrictDto>[] = [
    { key: 'code', label: 'Mã', width: 80, mono: true },
    { key: 'name', label: 'Tên quận/huyện' },
    { key: 'provinceName', label: 'Tỉnh/TP', width: 200 },
    { key: 'isActive', label: 'Trạng thái', width: 120,
      render: r => <StatusBadge tone={r.isActive ? 'ok' : 'crit'} dot>{r.isActive ? 'Đang dùng' : 'Ngưng'}</StatusBadge> },
  ];
  const colsWard: ColumnDef<WardDto>[] = [
    { key: 'code', label: 'Mã', width: 80, mono: true },
    { key: 'name', label: 'Tên xã/phường/TT' },
    { key: 'districtName', label: 'Quận/Huyện', width: 200 },
    { key: 'isActive', label: 'Trạng thái', width: 120,
      render: r => <StatusBadge tone={r.isActive ? 'ok' : 'crit'} dot>{r.isActive ? 'Đang dùng' : 'Ngưng'}</StatusBadge> },
  ];

  const activeColumns = tab === 'province' ? colsProvince
    : tab === 'district' ? colsDistrict
    : colsWard;

  // ── Row actions ────────────────────────────────────────────────────────────
  const onRowClick = (row: ProvinceDto | DistrictDto | WardDto) => {
    setEdit({
      id: row.id,
      code: row.code,
      name: row.name,
      isActive: row.isActive,
      provinceId: (row as DistrictDto).provinceId,
      districtId: (row as WardDto).districtId,
    });
  };

  const onDelete = (id: string) => {
    cf('Xóa mục này?', async () => {
      try {
        if (tab === 'province') await deleteProvince(id);
        else if (tab === 'district') await deleteDistrict(id);
        else await deleteWard(id);
        tk('Đã xóa');
        void reload();
      } catch { te('Xóa thất bại'); }
    }, { tone: 'crit' });
  };

  const openNew = () => setEdit({ ...EMPTY_EDIT });

  // ── Save ───────────────────────────────────────────────────────────────────
  const onSave = async () => {
    if (!edit) return;
    if (!edit.code.trim() || !edit.name.trim()) { te('Vui lòng nhập Mã và Tên'); return; }
    setSaving(true);
    try {
      if (tab === 'province') {
        await saveProvince({ id: edit.id || '00000000-0000-0000-0000-000000000000', code: edit.code, name: edit.name, isActive: edit.isActive });
      } else if (tab === 'district') {
        if (!edit.provinceId) { te('Chọn Tỉnh/TP'); return; }
        await saveDistrict({ id: edit.id || '00000000-0000-0000-0000-000000000000', code: edit.code, name: edit.name, provinceId: edit.provinceId, isActive: edit.isActive });
      } else {
        if (!edit.districtId) { te('Chọn Quận/Huyện'); return; }
        await saveWard({ id: edit.id || '00000000-0000-0000-0000-000000000000', code: edit.code, name: edit.name, districtId: edit.districtId, isActive: edit.isActive });
      }
      tk(edit.id ? 'Đã cập nhật' : 'Đã thêm mới');
      setEdit(null);
      void reload();
    } catch { te('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  // ── Toolbar filter bar ─────────────────────────────────────────────────────
  const filterBar = (
    <>
      {tab === 'district' && (
        <Select
          placeholder="Lọc theo tỉnh/TP"
          allowClear
          showSearch
          style={{ width: 220 }}
          value={filterProvince || undefined}
          onChange={v => { setFilterProvince(v ?? ''); setPage(0); }}
          options={provinces.map(p => ({ value: p.id, label: p.name }))}
          optionFilterProp="label"
        />
      )}
      {tab === 'ward' && (
        <Select
          placeholder="Lọc theo quận/huyện"
          allowClear
          showSearch
          style={{ width: 220 }}
          value={filterDistrict || undefined}
          onChange={v => { setFilterDistrict(v ?? ''); setPage(0); }}
          options={districts.map(d => ({ value: d.id, label: d.name }))}
          optionFilterProp="label"
        />
      )}
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ab-module">
      <div className="ab-header">
        <h2 className="ab-title">Danh mục địa danh hành chính</h2>
        <div className="ab-actions">
          {filterBar}
          <SearchBox value={search} onChange={v => { setSearch(v); setPage(0); }} placeholder="Tìm mã hoặc tên..." />
          <ActBtn ic="plus" title="Thêm mới" onClick={openNew} />
        </div>
      </div>

      <KpiStrip items={kpis} />

      <TopTabs<TabKey>
        tabs={TABS}
        tab={tab}
        setTab={t => { setTab(t); setPage(0); }}
      />

      <DataTable<ProvinceDto | DistrictDto | WardDto>
        columns={activeColumns as ColumnDef<ProvinceDto | DistrictDto | WardDto>[]}
        data={paged}
        rowKey={r => r.id}
        onRowClick={onRowClick}
        actions={row => (
          <ActBtn ic="trash" title="Xóa" tone="crit" onClick={e => { e.stopPropagation(); onDelete(row.id); }} />
        )}
      />

      <Pager page={page} totalPages={Math.ceil(rows.length / PER)} setPage={setPage} total={rows.length} perPage={PER} />

      {/* ── Edit drawer ─────────────────────────────────────────────────── */}
      <DrawerShell
        open={edit !== null}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Chỉnh sửa' : 'Thêm mới'}
        footer={<>
          <Btn onClick={() => setEdit(null)}>Hủy</Btn>
          <ActBtn ic="save" title="Lưu" onClick={onSave} loading={saving} />
        </>}
      >
        {edit && (
          <>
            <DrSec title="Thông tin">
              <DrField lbl="Mã *">
                <Input
                  value={edit.code}
                  onChange={e => setEdit({ ...edit, code: e.target.value })}
                  placeholder="VD: 01, 48, 79..."
                  maxLength={20}
                />
              </DrField>
              <DrField lbl="Tên *">
                <Input
                  value={edit.name}
                  onChange={e => setEdit({ ...edit, name: e.target.value })}
                  placeholder={
                    tab === 'province' ? 'Tên tỉnh/thành phố'
                    : tab === 'district' ? 'Tên quận/huyện'
                    : 'Tên xã/phường/thị trấn'
                  }
                  maxLength={200}
                />
              </DrField>

              {tab === 'district' && (
                <DrField lbl="Tỉnh/TP *">
                  <Select
                    style={{ width: '100%' }}
                    showSearch
                    placeholder="Chọn tỉnh/TP"
                    value={edit.provinceId}
                    onChange={v => setEdit({ ...edit, provinceId: v })}
                    options={provinces.filter(p => p.isActive).map(p => ({ value: p.id, label: p.name }))}
                    optionFilterProp="label"
                  />
                </DrField>
              )}

              {tab === 'ward' && (
                <DrField lbl="Quận/Huyện *">
                  <Select
                    style={{ width: '100%' }}
                    showSearch
                    placeholder="Chọn quận/huyện"
                    value={edit.districtId}
                    onChange={v => setEdit({ ...edit, districtId: v })}
                    options={districts.filter(d => d.isActive).map(d => ({ value: d.id, label: d.name }))}
                    optionFilterProp="label"
                  />
                </DrField>
              )}

              <DrField lbl="Đang dùng">
                <Switch
                  checked={edit.isActive}
                  onChange={v => setEdit({ ...edit, isActive: v })}
                  checkedChildren="Có" unCheckedChildren="Không"
                />
              </DrField>
            </DrSec>
          </>
        )}
      </DrawerShell>
    </div>
  );
};

export default AdministrativeUnitsV2;
