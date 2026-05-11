// =====================================================================
// HIS Terminal · DANH MỤC DƯỢC (Pharmacy Catalogs) — v2
// 3 tabs: Hãng sản xuất · Đường dùng · Hội đồng kiểm nhập
// Bound to /api/master-catalog/{manufacturers,medication-routes,
// inspection-committees}
// =====================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Input, InputNumber, Select, DatePicker, Switch } from 'antd';
import dayjs from 'dayjs';
import * as api from '../api/masterCatalog';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, te, cf, Ico,
  type ColumnDef,
} from './_v2kit';

type TabKey = 'mfr' | 'route' | 'comm';

type AnyRow =
  | (api.ManufacturerDto & { _kind: 'mfr' })
  | (api.MedicationRouteDto & { _kind: 'route' })
  | (api.InspectionCommitteeDto & { _kind: 'comm' });

type EditState = Record<string, unknown> & { id?: string; members?: api.InspectionCommitteeMemberDto[] };

const ROLE_OPTIONS = [
  { value: 'Chủ tịch', label: 'Chủ tịch' },
  { value: 'Phó Chủ tịch', label: 'Phó Chủ tịch' },
  { value: 'Thư ký', label: 'Thư ký' },
  { value: 'Ủy viên', label: 'Ủy viên' },
];

const PER = 12;

const committeeStatus = (c: api.InspectionCommitteeDto): { tone: 'ok' | 'crit' | 'info'; label: string } => {
  if (!c.isActive) return { tone: 'info', label: 'Tạm dừng' };
  if (c.effectiveTo) {
    const end = dayjs(c.effectiveTo);
    if (end.isBefore(dayjs(), 'day')) return { tone: 'crit', label: 'Hết hạn' };
  }
  return { tone: 'ok', label: 'Hiệu lực' };
};

const PharmacyCatalogsV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('mfr');
  const [mfrs, setMfrs] = useState<api.ManufacturerDto[]>([]);
  const [routes, setRoutes] = useState<api.MedicationRouteDto[]>([]);
  const [committees, setCommittees] = useState<api.InspectionCommitteeDto[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [editIsNew, setEditIsNew] = useState(false);

  useEffect(() => { setSearch(''); setPage(0); }, [tab]);

  const reload = async (which?: TabKey) => {
    try {
      if (!which || which === 'mfr')   setMfrs(await api.getManufacturers());
      if (!which || which === 'route') setRoutes(await api.getMedicationRoutes());
      if (!which || which === 'comm')  setCommittees(await api.getInspectionCommittees());
    } catch { te('Không tải được danh mục'); }
  };
  useEffect(() => { reload(); }, []);

  // Derived rows
  const rows = useMemo<AnyRow[]>(() => {
    if (tab === 'mfr') return mfrs.map((r) => ({ ...r, _kind: 'mfr' as const }));
    if (tab === 'route') return routes.map((r) => ({ ...r, _kind: 'route' as const }));
    return committees.map((r) => ({ ...r, _kind: 'comm' as const }));
  }, [tab, mfrs, routes, committees]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((r) => {
      if (r._kind === 'mfr') return `${r.code} ${r.name} ${r.country || ''} ${r.address || ''}`.toLowerCase().includes(k);
      if (r._kind === 'route') return `${r.code} ${r.name} ${r.bhxhCode || ''}`.toLowerCase().includes(k);
      return `${r.code} ${r.name} ${r.description || ''}`.toLowerCase().includes(k);
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const pageData = filtered.slice(page * PER, (page + 1) * PER);

  // KPIs
  const kpis = useMemo(() => {
    if (tab === 'mfr') {
      const vn = mfrs.filter((r) => (r.country || '').toLowerCase().includes('việt nam')).length;
      const active = mfrs.filter((r) => r.isActive).length;
      return [
        { lbl: 'Tổng hãng',       val: mfrs.length, sub: 'đăng ký' },
        { lbl: 'Việt Nam',        val: vn,         sub: 'nội địa',   tone: 'ok' as const },
        { lbl: 'Nước ngoài',      val: mfrs.length - vn, sub: 'nhập khẩu', tone: 'info' as const },
        { lbl: 'Đang hoạt động',  val: active,     sub: `/ ${mfrs.length}`, tone: 'ok' as const },
      ];
    }
    if (tab === 'route') {
      const withBhxh = routes.filter((r) => r.bhxhCode).length;
      const active = routes.filter((r) => r.isActive).length;
      return [
        { lbl: 'Tổng đường dùng', val: routes.length,    sub: 'TT 52/2017' },
        { lbl: 'Có mã BHXH',      val: withBhxh,         sub: 'XML 4210',         tone: 'info' as const },
        { lbl: 'Hoạt động',       val: active,           sub: 'khả dụng',         tone: 'ok' as const },
        { lbl: 'Tạm khoá',        val: routes.length - active, sub: 'không dùng', tone: 'warn' as const },
      ];
    }
    const expired = committees.filter((c) => committeeStatus(c).label === 'Hết hạn').length;
    const effective = committees.filter((c) => committeeStatus(c).label === 'Hiệu lực').length;
    const members = committees.reduce((s, c) => s + (c.members?.length || 0), 0);
    return [
      { lbl: 'Tổng hội đồng',   val: committees.length, sub: 'kiểm nhập' },
      { lbl: 'Đang hiệu lực',   val: effective, sub: 'khả dụng',           tone: 'ok' as const },
      { lbl: 'Hết hạn',         val: expired,   sub: 'đã hết hiệu lực',    tone: 'crit' as const },
      { lbl: 'Tổng thành viên', val: members,   sub: 'vai trò',            tone: 'info' as const },
    ];
  }, [tab, mfrs, routes, committees]);

  const tabsDef = [
    { v: 'mfr' as const,   ic: 'factory', l: `Hãng sản xuất (${mfrs.length})` },
    { v: 'route' as const, ic: 'pill',    l: `Đường dùng (${routes.length})` },
    { v: 'comm' as const,  ic: 'users',   l: `Hội đồng kiểm nhập (${committees.length})` },
  ];

  // Columns
  const cols: ColumnDef<AnyRow>[] = useMemo(() => {
    if (tab === 'mfr') {
      return [
        { key: 'code', label: 'Mã',  mono: true, code: true, width: 110 },
        { key: 'name', label: 'Tên hãng' },
        { key: 'country', label: 'Quốc gia', width: 130, render: (r) => {
          const c = (r as api.ManufacturerDto).country || '';
          const vn = c.toLowerCase().includes('việt nam');
          return c ? <StatusBadge tone={vn ? 'ok' : 'info'} dot>{c}</StatusBadge> : '—';
        } },
        { key: 'address', label: 'Địa chỉ', render: (r) => (
          <span style={{ color: 'var(--t-2)', fontSize: 12 }}>{(r as api.ManufacturerDto).address || '—'}</span>
        ) },
        { key: 'sortOrder', label: 'TT', mono: true, width: 50 },
        { key: 'isActive', label: 'Trạng thái', width: 120, render: (r) => (
          (r as api.ManufacturerDto).isActive
            ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
            : <StatusBadge tone="info" dot>Tạm dừng</StatusBadge>
        ) },
      ];
    }
    if (tab === 'route') {
      return [
        { key: 'code', label: 'Mã', mono: true, code: true, width: 80 },
        { key: 'name', label: 'Tên đường dùng' },
        { key: 'bhxhCode', label: 'Mã BHXH (XML 4210)', width: 180, mono: true, render: (r) => {
          const v = (r as api.MedicationRouteDto).bhxhCode;
          return v ? <code>{v}</code> : <span style={{ color: 'var(--t-3)' }}>—</span>;
        } },
        { key: 'note', label: 'Ghi chú', render: (r) => (
          <span style={{ color: 'var(--t-2)', fontSize: 12 }}>{(r as api.MedicationRouteDto).note || '—'}</span>
        ) },
        { key: 'sortOrder', label: 'TT', mono: true, width: 50 },
        { key: 'isActive', label: 'Trạng thái', width: 120, render: (r) => (
          (r as api.MedicationRouteDto).isActive
            ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
            : <StatusBadge tone="info" dot>Khoá</StatusBadge>
        ) },
      ];
    }
    return [
      { key: 'code', label: 'Mã', mono: true, code: true, width: 140 },
      { key: 'name', label: 'Tên hội đồng' },
      { key: 'members', label: 'Số TV', width: 90, mono: true, render: (r) => {
        const c = r as api.InspectionCommitteeDto;
        return <span><b>{c.members?.length || 0}</b> <span style={{ color: 'var(--t-3)' }}>người</span></span>;
      } },
      { key: 'effective', label: 'Hiệu lực', width: 210, render: (r) => {
        const c = r as api.InspectionCommitteeDto;
        const from = c.effectiveFrom ? dayjs(c.effectiveFrom).format('DD/MM/YYYY') : '—';
        const to = c.effectiveTo ? dayjs(c.effectiveTo).format('DD/MM/YYYY') : '—';
        return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t-2)' }}>{from} → {to}</span>;
      } },
      { key: 'status', label: 'Trạng thái', width: 120, render: (r) => {
        const s = committeeStatus(r as api.InspectionCommitteeDto);
        return <StatusBadge tone={s.tone} dot>{s.label}</StatusBadge>;
      } },
    ];
  }, [tab]);

  // ----- Drawer open / save / delete -----
  const openDrawer = (row?: AnyRow) => {
    if (row) { setEdit({ ...row } as EditState); setEditIsNew(false); }
    else {
      const seed: EditState =
        tab === 'mfr' ? { code: '', name: '', country: 'Việt Nam', address: '', isActive: true, sortOrder: rows.length + 1 }
        : tab === 'route' ? { code: '', name: '', bhxhCode: '', note: '', isActive: true, sortOrder: rows.length + 1 }
        : { code: '', name: '', description: '', effectiveFrom: dayjs().format('YYYY-MM-DD'), effectiveTo: dayjs().add(3, 'month').format('YYYY-MM-DD'), isActive: true, members: [] };
      setEdit(seed);
      setEditIsNew(true);
    }
  };

  const handleSave = async () => {
    if (!edit) return;
    try {
      if (tab === 'mfr') await api.saveManufacturer(edit as Partial<api.ManufacturerDto>);
      else if (tab === 'route') await api.saveMedicationRoute(edit as Partial<api.MedicationRouteDto>);
      else await api.saveInspectionCommittee(edit as Partial<api.InspectionCommitteeDto>);
      tk(editIsNew ? 'Đã thêm' : 'Đã cập nhật');
      setEdit(null);
      reload(tab);
    } catch { te('Lưu thất bại'); }
  };

  const handleDelete = (row: AnyRow) => {
    cf(`Xoá "${(row as { name?: string }).name || row.id}"?`, async () => {
      try {
        if (tab === 'mfr') await api.deleteManufacturer(row.id);
        else if (tab === 'route') await api.deleteMedicationRoute(row.id);
        else await api.deleteInspectionCommittee(row.id);
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
    a.download = `pharmacy-catalog-${tab}-${dayjs().format('YYYYMMDD')}.csv`;
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
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder={tab === 'mfr' ? 'Tìm hãng / quốc gia / địa chỉ…' : tab === 'route' ? 'Tìm đường dùng / mã BHXH…' : 'Tìm hội đồng / mô tả…'}
        />
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
        empty={search ? 'Không khớp từ khoá.' : 'Chưa có dữ liệu — bắt đầu bằng cách thêm bản ghi đầu tiên.'}
      />
      <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!edit}
        onClose={() => setEdit(null)}
        size={tab === 'comm' ? 'xl' : 'lg'}
        title={editIsNew ? 'Thêm bản ghi mới' : `Sửa: ${(edit?.name as string) || (edit?.code as string) || ''}`}
        sub={`Mục: ${tabsDef.find((t) => t.v === tab)?.l.split(' (')[0]}`}
        footer={(
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setEdit(null)}>Huỷ</button>
            <button type="button" className="ab-btn primary" onClick={handleSave}><Ico name="check" size={12} /> {editIsNew ? 'Tạo mới' : 'Lưu'}</button>
          </>
        )}
      >
        {edit && <EditForm tab={tab} edit={edit} setEdit={setEdit} />}
      </DrawerShell>
    </div>
  );
};

// ───── Drawer body ─────
const EditForm: React.FC<{ tab: TabKey; edit: EditState; setEdit: (e: EditState) => void }> = ({ tab, edit, setEdit }) => {
  const set = (k: string, v: unknown) => setEdit({ ...edit, [k]: v });

  if (tab === 'mfr') {
    return (
      <DrSec title="Thông tin hãng">
        <DrField lbl="Mã hãng *">
          <Input value={edit.code as string || ''} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="VD: STADA" />
        </DrField>
        <DrField lbl="Quốc gia *">
          <Input value={edit.country as string || ''} onChange={(e) => set('country', e.target.value)} placeholder="Việt Nam" />
        </DrField>
        <DrField lbl="Tên đầy đủ *">
          <Input value={edit.name as string || ''} onChange={(e) => set('name', e.target.value)} />
        </DrField>
        <DrField lbl="Địa chỉ">
          <Input.TextArea value={edit.address as string || ''} onChange={(e) => set('address', e.target.value)} rows={2} />
        </DrField>
        <DrField lbl="Ghi chú">
          <Input value={edit.note as string || ''} onChange={(e) => set('note', e.target.value)} placeholder="VD: EU-GMP" />
        </DrField>
        <DrField lbl="Thứ tự">
          <InputNumber value={edit.sortOrder as number ?? 1} min={0} onChange={(v) => set('sortOrder', v ?? 0)} style={{ width: '100%' }} />
        </DrField>
        <DrField lbl="Hoạt động">
          <Switch checked={!!edit.isActive} onChange={(v) => set('isActive', v)} />
        </DrField>
      </DrSec>
    );
  }

  if (tab === 'route') {
    return (
      <DrSec title="Thông tin đường dùng">
        <DrField lbl="Mã *">
          <Input value={edit.code as string || ''} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="VD: UO" />
        </DrField>
        <DrField lbl="Tên đường dùng *">
          <Input value={edit.name as string || ''} onChange={(e) => set('name', e.target.value)} placeholder="VD: Tiêm tĩnh mạch" />
        </DrField>
        <DrField lbl="Mã BHXH (XML 4210)">
          <Input value={edit.bhxhCode as string || ''} onChange={(e) => set('bhxhCode', e.target.value)} placeholder="STT theo TT 52/2017" />
        </DrField>
        <DrField lbl="Ghi chú">
          <Input value={edit.note as string || ''} onChange={(e) => set('note', e.target.value)} placeholder="VD: Intravenous, IV" />
        </DrField>
        <DrField lbl="Thứ tự">
          <InputNumber value={edit.sortOrder as number ?? 1} min={0} onChange={(v) => set('sortOrder', v ?? 0)} style={{ width: '100%' }} />
        </DrField>
        <DrField lbl="Hoạt động">
          <Switch checked={!!edit.isActive} onChange={(v) => set('isActive', v)} />
        </DrField>
      </DrSec>
    );
  }

  // Committee with nested members
  const members = (edit.members as api.InspectionCommitteeMemberDto[] | undefined) || [];
  const addMember = () => setEdit({
    ...edit,
    members: [...members, { id: `tmp-${Date.now()}`, committeeId: edit.id as string || '', fullName: '', title: '', role: 'Ủy viên', sortOrder: members.length + 1 }],
  });
  const updateMember = (i: number, k: keyof api.InspectionCommitteeMemberDto, v: string | number) =>
    setEdit({ ...edit, members: members.map((m, j) => j === i ? { ...m, [k]: v } : m) });
  const removeMember = (i: number) =>
    setEdit({ ...edit, members: members.filter((_, j) => j !== i).map((m, k) => ({ ...m, sortOrder: k + 1 })) });

  return (
    <>
      <DrSec title="Thông tin chung">
        <DrField lbl="Mã hội đồng *">
          <Input value={edit.code as string || ''} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="VD: HD-2026-001" />
        </DrField>
        <DrField lbl="Tên *">
          <Input value={edit.name as string || ''} onChange={(e) => set('name', e.target.value)} />
        </DrField>
        <DrField lbl="Mô tả">
          <Input.TextArea value={edit.description as string || ''} onChange={(e) => set('description', e.target.value)} rows={2} />
        </DrField>
        <DrField lbl="Hiệu lực từ *">
          <DatePicker
            value={edit.effectiveFrom ? dayjs(edit.effectiveFrom as string) : null}
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
            onChange={(d) => set('effectiveFrom', d ? d.toISOString() : null)}
          />
        </DrField>
        <DrField lbl="Đến *">
          <DatePicker
            value={edit.effectiveTo ? dayjs(edit.effectiveTo as string) : null}
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
            onChange={(d) => set('effectiveTo', d ? d.toISOString() : null)}
          />
        </DrField>
        <DrField lbl="Hoạt động">
          <Switch checked={!!edit.isActive} onChange={(v) => set('isActive', v)} />
        </DrField>
      </DrSec>

      <DrSec
        title={`Thành viên hội đồng (${members.length})`}
        action={(
          <button type="button" className="ab-btn ghost sm" onClick={addMember}>
            <Ico name="plus" size={11} /> Thêm
          </button>
        )}
      >
        {members.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--t-3)', fontSize: 12.5 }}>
            Chưa có thành viên — bấm "Thêm" để bắt đầu.
          </div>
        ) : (
          <table className="ab-tbl" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>STT</th>
                <th>Họ tên</th>
                <th>Chức danh</th>
                <th style={{ width: 130 }}>Vai trò</th>
                <th style={{ width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.id || i}>
                  <td className="mono">{i + 1}</td>
                  <td><Input size="small" value={m.fullName} onChange={(e) => updateMember(i, 'fullName', e.target.value)} placeholder="Họ và tên" /></td>
                  <td><Input size="small" value={m.title || ''} onChange={(e) => updateMember(i, 'title', e.target.value)} placeholder="Chức danh" /></td>
                  <td>
                    <Select
                      size="small"
                      value={m.role || 'Ủy viên'}
                      options={ROLE_OPTIONS}
                      style={{ width: '100%' }}
                      onChange={(v) => updateMember(i, 'role', v)}
                    />
                  </td>
                  <td><ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => removeMember(i)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrSec>
    </>
  );
};

export default PharmacyCatalogsV2;
