import React, { useCallback, useEffect, useState } from 'react';
import { DatePicker, Form, Input, Select } from 'antd';
import dayjs from 'dayjs';
import {
  KpiStrip, DataTable, DrawerShell, DrSec, DrField, ModalShell,
  ActBtn, Btn, StatusBadge, tk, te, cf,
  type ColumnDef, type KpiItem,
} from '../../../pages-v2/_v2kit';
import { getGrants, createGrant, revokeGrant } from '../api/delegation';
import type { DelegationGrantDto, CreateDelegationGrantDto } from '../api/delegation';
import { adminApi } from '../api/system';
import type { SystemUserDto, RoleDto } from '../api/system';
import type { StatusTone } from '../../../components/navigation/Tabs';

const STATUS_TONE: Record<number, StatusTone> = {
  0: 'ok',
  1: 'warn',
  2: 'crit',
};

const COLS: ColumnDef<DelegationGrantDto>[] = [
  { key: 'grantorName', label: 'Người ủy quyền', render: (r) => r.grantorName },
  { key: 'granteeName', label: 'Người được ủy',  render: (r) => r.granteeName },
  { key: 'roleName',    label: 'Vai trò',          render: (r) => r.roleName },
  { key: 'validFrom',  label: 'Từ ngày',           render: (r) => dayjs(r.validFrom).format('DD/MM/YYYY') },
  { key: 'validTo',    label: 'Đến ngày',          render: (r) => dayjs(r.validTo).format('DD/MM/YYYY') },
  { key: 'status',     label: 'Trạng thái',        render: (r) => <StatusBadge tone={STATUS_TONE[r.status]}>{r.statusText}</StatusBadge> },
  { key: 'reason',     label: 'Lý do',             render: (r) => r.reason || '—' },
];

export default function DelegationPanel() {
  const [grants, setGrants]         = useState<DelegationGrantDto[]>([]);
  const [users, setUsers]           = useState<SystemUserDto[]>([]);
  const [roles, setRoles]           = useState<RoleDto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selGrant, setSelGrant]     = useState<DelegationGrantDto | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [revoking, setRevoking]     = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, u, r] = await Promise.all([
        getGrants(),
        adminApi.getUsers(undefined, undefined, true),
        adminApi.getRoles(true),
      ]);
      setGrants(g as unknown as DelegationGrantDto[]);
      setUsers(u as unknown as SystemUserDto[]);
      setRoles(r as unknown as RoleDto[]);
    } catch { /* table shows empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active  = grants.filter((g) => g.status === 0).length;
  const expired = grants.filter((g) => g.status === 1).length;
  const revoked = grants.filter((g) => g.status === 2).length;

  const kpis: KpiItem[] = [
    { lbl: 'Tổng ủy quyền',    val: grants.length },
    { lbl: 'Đang hoạt động',   val: active,  tone: active  ? 'ok'   : undefined },
    { lbl: 'Đã hết hạn',       val: expired, tone: expired ? 'warn' : undefined },
    { lbl: 'Đã thu hồi',       val: revoked, tone: revoked ? 'crit' : undefined },
  ];

  const handleCreate = async () => {
    const vals = await form.validateFields();
    setSaving(true);
    try {
      const dto: CreateDelegationGrantDto = {
        granteeId: vals.granteeId,
        roleId: vals.roleId,
        validFrom: (vals.validFrom as dayjs.Dayjs).toISOString(),
        validTo: (vals.validTo as dayjs.Dayjs).toISOString(),
        reason: vals.reason || undefined,
      };
      await createGrant(dto);
      setCreateOpen(false);
      form.resetFields();
      load();
    } catch { /* errors surfaced by apiClient */ }
    finally { setSaving(false); }
  };

  const handleRevoke = async (g: DelegationGrantDto) => {
    if (!window.confirm(`Thu hồi ủy quyền "${g.roleName}" cho ${g.granteeName}?`)) return;
    setRevoking(true);
    try {
      await revokeGrant(g.id);
      load();
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div>
      <KpiStrip items={kpis} />

      <div style={{ marginBottom: 12 }}>
        <Btn icon="plus" onClick={() => { form.resetFields(); setCreateOpen(true); }}>Tạo ủy quyền</Btn>
      </div>

      <DataTable<DelegationGrantDto>
        columns={COLS}
        data={grants}
        rowKey={(g) => g.id}
        onRowClick={(g) => setSelGrant(g)}
        actions={(g) => (
          g.status === 0
            ? <ActBtn ic="x" title="Thu hồi" tone="crit" loading={revoking} onClick={(e) => { e.stopPropagation(); handleRevoke(g); }} />
            : null
        )}
        empty={loading ? 'Đang tải…' : 'Chưa có ủy quyền nào'}
      />

      {/* ─── Detail drawer ─── */}
      <DrawerShell open={!!selGrant} onClose={() => setSelGrant(null)}
        title={selGrant ? `${selGrant.grantorName} → ${selGrant.granteeName}` : ''}
        sub={selGrant?.roleName}
        size="sm">
        {selGrant && (
          <>
            <DrSec title="Thông tin ủy quyền">
              <DrField lbl="Người ủy quyền">{selGrant.grantorName}</DrField>
              <DrField lbl="Người được ủy">{selGrant.granteeName}</DrField>
              <DrField lbl="Vai trò">{selGrant.roleName}</DrField>
              <DrField lbl="Từ ngày">{dayjs(selGrant.validFrom).format('DD/MM/YYYY HH:mm')}</DrField>
              <DrField lbl="Đến ngày">{dayjs(selGrant.validTo).format('DD/MM/YYYY HH:mm')}</DrField>
              <DrField lbl="Lý do">{selGrant.reason || '—'}</DrField>
              <DrField lbl="Trạng thái">
                <StatusBadge tone={STATUS_TONE[selGrant.status]}>{selGrant.statusText}</StatusBadge>
              </DrField>
              {selGrant.revokedAt && (
                <DrField lbl="Thu hồi lúc">{dayjs(selGrant.revokedAt).format('DD/MM/YYYY HH:mm')} — {selGrant.revokedBy}</DrField>
              )}
            </DrSec>
          </>
        )}
      </DrawerShell>

      {/* ─── Create modal ─── */}
      <ModalShell open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo ủy quyền mới"
        footer={<><Btn onClick={() => setCreateOpen(false)}>Hủy</Btn><Btn icon="check" loading={saving} onClick={handleCreate}>Lưu</Btn></>}>
        <Form form={form} layout="vertical">
          <Form.Item name="granteeId" label="Người được ủy quyền" rules={[{ required: true, message: 'Chọn người nhận ủy quyền' }]}>
            <Select
              showSearch
              placeholder="Chọn người dùng…"
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              options={users.map((u) => ({ value: u.id, label: `${u.fullName || u.username} (@${u.username})` }))}
            />
          </Form.Item>
          <Form.Item name="roleId" label="Vai trò được ủy" rules={[{ required: true, message: 'Chọn vai trò' }]}>
            <Select
              showSearch
              placeholder="Chọn vai trò…"
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
            />
          </Form.Item>
          <Form.Item name="validFrom" label="Từ ngày" rules={[{ required: true, message: 'Nhập ngày bắt đầu' }]}>
            <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="validTo" label="Đến ngày" rules={[{ required: true, message: 'Nhập ngày kết thúc' }]}>
            <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="reason" label="Lý do (tùy chọn)">
            <Input placeholder="Lý do ủy quyền…" />
          </Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
}
