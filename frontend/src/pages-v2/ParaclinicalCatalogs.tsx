// =====================================================================
// HIS Terminal · DANH MỤC CLS (Paraclinical Catalogs) — v2
// 3 tabs: Mã máy BHXH · Mã máy ↔ DV · Thứ tự phòng CLS
// Bound to /api/master-catalog/{machine-codes,machine-services,
// paraclinical-room-priorities}
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

type TabKey = 'machines' | 'svc' | 'rooms';

type AnyRow =
  | (api.MachineCodeDto & { _kind: 'machines' })
  | (api.MachineServiceDto & { _kind: 'svc' })
  | (api.ParaclinicalRoomPriorityDto & { _kind: 'rooms' });

type EditState = Record<string, unknown> & { id?: string };

const PER = 15;

const ParaclinicalCatalogsV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('machines');
  const [machines, setMachines] = useState<api.MachineCodeDto[]>([]);
  const [msvc, setMsvc] = useState<api.MachineServiceDto[]>([]);
  const [rooms, setRooms] = useState<api.ParaclinicalRoomPriorityDto[]>([]);
  const [search, setSearch] = useState('');
  const [filterMfr, setFilterMfr] = useState('');
  const [filterMachine, setFilterMachine] = useState('');
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [editIsNew, setEditIsNew] = useState(false);

  useEffect(() => { setSearch(''); setFilterMfr(''); setFilterMachine(''); setPage(0); }, [tab]);

  const reload = async (which?: TabKey) => {
    try {
      if (!which || which === 'machines') setMachines(await api.getMachineCodes());
      if (!which || which === 'svc')      setMsvc(await api.getMachineServices());
      if (!which || which === 'rooms')    setRooms(await api.getParaclinicalRoomPriorities());
    } catch { te('Không tải được danh mục'); }
  };
  useEffect(() => { reload(); }, []);

  const manufacturerOptions = useMemo(() => {
    const set = new Set(machines.map((m) => m.manufacturer || '').filter(Boolean));
    return Array.from(set).map((m) => ({ v: m, l: m }));
  }, [machines]);

  const machineOptions = useMemo(() => machines.map((m) => ({ v: m.id, l: `${m.code} · ${m.name}`.slice(0, 60) })), [machines]);

  // Derived rows for active tab
  const rows = useMemo<AnyRow[]>(() => {
    if (tab === 'machines') return machines.map((r) => ({ ...r, _kind: 'machines' as const }));
    if (tab === 'svc') return msvc.map((r) => ({ ...r, _kind: 'svc' as const }));
    return rooms.map((r) => ({ ...r, _kind: 'rooms' as const }));
  }, [tab, machines, msvc, rooms]);

  const filtered = useMemo(() => {
    let r = rows;
    const k = search.trim().toLowerCase();
    if (k) {
      r = r.filter((row) => {
        const blob = `${(row as { code?: string }).code || ''} ${(row as { name?: string }).name || ''} ${(row as { machineName?: string }).machineName || ''} ${(row as { serviceName?: string }).serviceName || ''} ${(row as { manufacturer?: string }).manufacturer || ''} ${(row as { bhxhCode?: string }).bhxhCode || ''} ${(row as { roomName?: string }).roomName || ''}`;
        return blob.toLowerCase().includes(k);
      });
    }
    if (tab === 'machines' && filterMfr) r = r.filter((row) => (row as api.MachineCodeDto).manufacturer === filterMfr);
    if (tab === 'svc' && filterMachine)  r = r.filter((row) => (row as api.MachineServiceDto).machineCodeId === filterMachine);
    return r;
  }, [rows, search, filterMfr, filterMachine, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const pageData = filtered.slice(page * PER, (page + 1) * PER);

  const kpis = useMemo(() => {
    if (tab === 'machines') {
      const mfrs = new Set(machines.map((m) => m.manufacturer || '').filter(Boolean)).size;
      const active = machines.filter((m) => m.isActive).length;
      const locked = machines.filter((m) => m.isLocked).length;
      return [
        { lbl: 'Tổng máy',        val: machines.length, sub: 'đăng ký BHXH' },
        { lbl: 'Hãng SX',         val: mfrs,            sub: 'chủng loại',  tone: 'info' as const },
        { lbl: 'Đang hoạt động',  val: active,          sub: 'khả dụng',    tone: 'ok' as const },
        { lbl: 'Khoá / tạm dừng', val: locked + (machines.length - active), sub: 'không thao tác', tone: 'warn' as const },
      ];
    }
    if (tab === 'svc') {
      const machinesWithSvc = new Set(msvc.map((s) => s.machineCodeId)).size;
      const services = new Set(msvc.map((s) => s.serviceId)).size;
      const defaults = msvc.filter((s) => s.isDefault).length;
      return [
        { lbl: 'Tổng liên kết',   val: msvc.length,       sub: 'máy ↔ DV' },
        { lbl: 'Máy có DV',       val: machinesWithSvc,   sub: 'đã gán',         tone: 'info' as const },
        { lbl: 'DV duy nhất',     val: services,          sub: 'trong gói',      tone: 'info' as const },
        { lbl: 'Mặc định',        val: defaults,          sub: 'auto-assign',    tone: 'ok' as const },
      ];
    }
    const depts = new Set(rooms.map((r) => r.departmentId || '').filter(Boolean)).size;
    const services = new Set(rooms.map((r) => r.serviceId || '').filter(Boolean)).size;
    return [
      { lbl: 'Tổng cấu hình',  val: rooms.length, sub: 'thứ tự phòng' },
      { lbl: 'Khoa',           val: depts,        sub: 'phân bố',        tone: 'info' as const },
      { lbl: 'Dịch vụ',        val: services,     sub: 'mapping DV',     tone: 'info' as const },
      { lbl: 'Ưu tiên cao',    val: rooms.filter((r) => r.priorityLevel === 1).length, sub: 'priority 1', tone: 'crit' as const },
    ];
  }, [tab, machines, msvc, rooms]);

  const tabsDef = [
    { v: 'machines' as const, ic: 'hardware', l: `Mã máy BHXH (${machines.length})` },
    { v: 'svc' as const,      ic: 'link',     l: `Mã máy ↔ DV (${msvc.length})` },
    { v: 'rooms' as const,    ic: 'grid',     l: `Thứ tự phòng CLS (${rooms.length})` },
  ];

  const cols: ColumnDef<AnyRow>[] = useMemo(() => {
    if (tab === 'machines') {
      return [
        { key: 'code', label: 'Mã máy', mono: true, code: true, width: 140 },
        { key: 'bhxhCode', label: 'Mã BHXH', mono: true, code: true, width: 100, render: (r) => (r as api.MachineCodeDto).bhxhCode || '—' },
        { key: 'name', label: 'Tên máy' },
        { key: 'manufacturer', label: 'Hãng / Model', width: 220, render: (r) => {
          const m = r as api.MachineCodeDto;
          return <span style={{ fontSize: 12 }}>{m.manufacturer || '—'} {m.model ? `· ${m.model}` : ''}</span>;
        } },
        { key: 'serialNumber', label: 'Số sê-ri', mono: true, width: 160, render: (r) => (r as api.MachineCodeDto).serialNumber || '—' },
        { key: 'isLocked', label: 'Khoá', width: 70, render: (r) => (
          (r as api.MachineCodeDto).isLocked
            ? <span title="Hệ thống — không xoá" style={{ color: 'var(--a-rd-text)' }}><Ico name="lock" size={13} /></span>
            : <span style={{ color: 'var(--t-3)' }}>—</span>
        ) },
        { key: 'isActive', label: 'Trạng thái', width: 110, render: (r) => (
          (r as api.MachineCodeDto).isActive
            ? <StatusBadge tone="ok" dot>OK</StatusBadge>
            : <StatusBadge tone="warn" dot>Tạm dừng</StatusBadge>
        ) },
      ];
    }
    if (tab === 'svc') {
      return [
        { key: 'machineName', label: 'Máy', render: (r) => {
          const s = r as api.MachineServiceDto;
          return <span style={{ fontSize: 12 }}>{s.machineName || s.machineCodeId}</span>;
        } },
        { key: 'serviceName', label: 'Dịch vụ', render: (r) => {
          const s = r as api.MachineServiceDto;
          return <span style={{ fontSize: 12 }}>{s.serviceName || s.serviceId}</span>;
        } },
        { key: 'isDefault', label: 'Mặc định', width: 110, render: (r) => (
          (r as api.MachineServiceDto).isDefault
            ? <StatusBadge tone="ok" dot>Mặc định</StatusBadge>
            : <StatusBadge tone="info" dot>—</StatusBadge>
        ) },
        { key: 'note', label: 'Ghi chú', render: (r) => (
          <span style={{ color: 'var(--t-2)', fontSize: 12 }}>{(r as api.MachineServiceDto).note || '—'}</span>
        ) },
      ];
    }
    return [
      { key: 'priorityLevel', label: 'Ưu tiên', width: 90, mono: true, render: (r) => {
        const p = (r as api.ParaclinicalRoomPriorityDto).priorityLevel || 0;
        return <StatusBadge tone={p === 1 ? 'crit' : p === 2 ? 'warn' : 'info'}>P{p}</StatusBadge>;
      } },
      { key: 'sequence', label: 'STT', width: 70, mono: true, render: (r) => (r as api.ParaclinicalRoomPriorityDto).sequence },
      { key: 'serviceName', label: 'Dịch vụ', render: (r) => (r as api.ParaclinicalRoomPriorityDto).serviceName || (r as api.ParaclinicalRoomPriorityDto).serviceId },
      { key: 'roomName', label: 'Phòng', width: 200, render: (r) => (r as api.ParaclinicalRoomPriorityDto).roomName || '—' },
      { key: 'departmentName', label: 'Khoa', width: 160, render: (r) => (r as api.ParaclinicalRoomPriorityDto).departmentName || '—' },
      { key: 'note', label: 'Ghi chú', render: (r) => (
        <span style={{ color: 'var(--t-2)', fontSize: 12 }}>{(r as api.ParaclinicalRoomPriorityDto).note || '—'}</span>
      ) },
    ];
  }, [tab]);

  const openDrawer = (row?: AnyRow) => {
    if (row) { setEdit({ ...row } as EditState); setEditIsNew(false); }
    else {
      const seed: EditState =
        tab === 'machines'
          ? { code: '', bhxhCode: '', name: '', manufacturer: '', model: '', serialNumber: '', isActive: true, isLocked: false, note: '' }
          : tab === 'svc'
          ? { machineCodeId: machines[0]?.id || '', serviceId: '', isDefault: false, note: '' }
          : { serviceId: '', roomId: '', departmentId: '', priorityLevel: 1, sequence: 1, note: '' };
      setEdit(seed);
      setEditIsNew(true);
    }
  };

  const handleSave = async () => {
    if (!edit) return;
    try {
      if (tab === 'machines')   await api.saveMachineCode(edit as Partial<api.MachineCodeDto>);
      else if (tab === 'svc')   await api.saveMachineService(edit as Partial<api.MachineServiceDto>);
      else                      await api.saveParaclinicalRoomPriority(edit as Partial<api.ParaclinicalRoomPriorityDto>);
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
    const label = (row as { name?: string; serviceName?: string }).name
      || (row as { serviceName?: string }).serviceName
      || row.id;
    cf(`Xoá "${label}"?`, async () => {
      try {
        if (tab === 'machines') await api.deleteMachineCode(row.id);
        else if (tab === 'svc') await api.deleteMachineService(row.id);
        else await api.deleteParaclinicalRoomPriority(row.id);
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
    a.download = `paraclinical-catalog-${tab}-${dayjs().format('YYYYMMDD')}.csv`;
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
        <SearchBox value={search} onChange={setSearch}
          placeholder={tab === 'machines' ? 'Tìm theo mã, tên, hãng…' : tab === 'svc' ? 'Tìm theo máy / dịch vụ…' : 'Tìm theo phòng / dịch vụ…'} />
        {tab === 'machines' && manufacturerOptions.length > 0 && (
          <Filter value={filterMfr} onChange={setFilterMfr} options={manufacturerOptions} placeholder="Tất cả hãng" />
        )}
        {tab === 'svc' && machineOptions.length > 0 && (
          <Filter value={filterMachine} onChange={setFilterMachine} options={machineOptions} placeholder="Tất cả máy" />
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
        title={editIsNew ? 'Thêm bản ghi mới' : `Sửa: ${(edit?.name as string) || (edit?.serviceName as string) || (edit?.code as string) || ''}`}
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
            {tab === 'machines' && (
              <>
                <DrField lbl="Mã máy *">
                  <Input value={edit.code as string || ''} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} placeholder="VD: MAY-XQ-01" />
                </DrField>
                <DrField lbl="Mã gửi BHXH">
                  <Input value={edit.bhxhCode as string || ''} onChange={(e) => setEdit({ ...edit, bhxhCode: e.target.value })} placeholder="VD: X001" />
                </DrField>
                <DrField lbl="Tên máy *">
                  <Input value={edit.name as string || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                </DrField>
                <DrField lbl="Hãng SX">
                  <Input value={edit.manufacturer as string || ''} onChange={(e) => setEdit({ ...edit, manufacturer: e.target.value })} placeholder="Siemens / Philips / GE…" />
                </DrField>
                <DrField lbl="Model">
                  <Input value={edit.model as string || ''} onChange={(e) => setEdit({ ...edit, model: e.target.value })} />
                </DrField>
                <DrField lbl="Số sê-ri">
                  <Input value={edit.serialNumber as string || ''} onChange={(e) => setEdit({ ...edit, serialNumber: e.target.value })} />
                </DrField>
                <DrField lbl="Ghi chú">
                  <Input.TextArea value={edit.note as string || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} rows={2} />
                </DrField>
                <DrField lbl="Khoá hệ thống">
                  <Switch checked={!!edit.isLocked} onChange={(v) => setEdit({ ...edit, isLocked: v })} />
                </DrField>
                <DrField lbl="Hoạt động">
                  <Switch checked={!!edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} />
                </DrField>
              </>
            )}
            {tab === 'svc' && (
              <>
                <DrField lbl="Máy *">
                  <Select
                    value={edit.machineCodeId as string || ''}
                    options={machines.map((m) => ({ value: m.id, label: `${m.code} · ${m.name}` }))}
                    style={{ width: '100%' }}
                    onChange={(v) => setEdit({ ...edit, machineCodeId: v })}
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn máy"
                  />
                </DrField>
                <DrField lbl="Dịch vụ *">
                  <Input
                    value={edit.serviceId as string || ''}
                    onChange={(e) => setEdit({ ...edit, serviceId: e.target.value })}
                    placeholder="ID dịch vụ"
                  />
                </DrField>
                <DrField lbl="Là dịch vụ mặc định">
                  <Switch checked={!!edit.isDefault} onChange={(v) => setEdit({ ...edit, isDefault: v })} />
                </DrField>
                <DrField lbl="Ghi chú">
                  <Input.TextArea value={edit.note as string || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} rows={2} />
                </DrField>
              </>
            )}
            {tab === 'rooms' && (
              <>
                <DrField lbl="Dịch vụ *">
                  <Input value={edit.serviceId as string || ''} onChange={(e) => setEdit({ ...edit, serviceId: e.target.value })} placeholder="ID dịch vụ" />
                </DrField>
                <DrField lbl="Phòng">
                  <Input value={edit.roomId as string || ''} onChange={(e) => setEdit({ ...edit, roomId: e.target.value })} placeholder="ID phòng" />
                </DrField>
                <DrField lbl="Khoa">
                  <Input value={edit.departmentId as string || ''} onChange={(e) => setEdit({ ...edit, departmentId: e.target.value })} placeholder="ID khoa" />
                </DrField>
                <DrField lbl="Mức ưu tiên *">
                  <InputNumber
                    value={edit.priorityLevel as number ?? 1}
                    min={1}
                    max={9}
                    style={{ width: '100%' }}
                    onChange={(v) => setEdit({ ...edit, priorityLevel: v ?? 1 })}
                  />
                </DrField>
                <DrField lbl="Thứ tự *">
                  <InputNumber
                    value={edit.sequence as number ?? 1}
                    min={0}
                    style={{ width: '100%' }}
                    onChange={(v) => setEdit({ ...edit, sequence: v ?? 0 })}
                  />
                </DrField>
                <DrField lbl="Ghi chú">
                  <Input.TextArea value={edit.note as string || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} rows={2} />
                </DrField>
              </>
            )}
          </DrSec>
        )}
      </DrawerShell>
    </div>
  );
};

export default ParaclinicalCatalogsV2;
