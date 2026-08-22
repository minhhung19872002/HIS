// Panel ma trận kiểm soát truy cập — port v1 pages/system-admin/AccessMatrixTab.tsx sang v2.
// v1 dùng expandable row; v2 chuyển thành row-click → DrawerShell liệt kê quyền theo module.

import React, { useCallback, useEffect, useState } from 'react';
import { getAccessControlMatrix, type AccessControlMatrixDto } from '../api/security';
import {
  DataTable, DrawerShell, DrSec, DrField, StatusBadge, Btn, type ColumnDef, te,
} from '@/_v2kit';
import { friendlyErrorMessage } from '@/utils/friendlyError';
import { getNestedData } from './helpers';
import { RefreshButton } from '../../../components/actions';

const CLINICAL_ROLES = ['DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH'];

const AccessMatrixPanel: React.FC = () => {
  const [matrix, setMatrix] = useState<AccessControlMatrixDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selRole, setSelRole] = useState<AccessControlMatrixDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAccessControlMatrix();
      setMatrix(getNestedData<AccessControlMatrixDto[]>(res.data, []));
    } catch (e) { te(friendlyErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const columns: ColumnDef<AccessControlMatrixDto>[] = [
    { key: 'roleCode', label: 'Mã vai trò', mono: true, width: 130, render: (r) => (
      <StatusBadge tone={r.roleCode === 'ADMIN' ? 'info' : CLINICAL_ROLES.includes(r.roleCode) ? 'ok' : undefined}>{r.roleCode}</StatusBadge>
    ) },
    { key: 'roleName', label: 'Tên vai trò', width: 180, render: (r) => r.roleName },
    { key: 'userCount', label: 'Số người dùng', mono: true, width: 130, render: (r) => r.userCount },
    { key: 'moduleCount', label: 'Số module', mono: true, width: 110, render: (r) => r.modulePermissions?.length || 0 },
    { key: 'totalPermissions', label: 'Tổng quyền', mono: true, width: 110, render: (r) => r.modulePermissions?.reduce((sum, mp) => sum + (mp.permissions?.length || 0), 0) || 0 },
    { key: 'description', label: 'Mô tả', render: (r) => r.description || '—' },
  ];

  return (
    <>
      <div className="ab-tools">
        <span style={{ fontWeight: 600 }}>Ma trận kiểm soát truy cập</span>
        <span className="spacer" />
        <Btn variant="ghost" onClick={() => window.print()}>Xuất báo cáo</Btn>
        <RefreshButton onRefresh={load} loading={loading} />
      </div>

      <DataTable<AccessControlMatrixDto> columns={columns} data={matrix} rowKey={(r) => r.roleCode}
        onRowClick={(r) => setSelRole(r)}
        empty={loading ? 'Đang tải…' : 'Chưa có dữ liệu ma trận quyền'} />

      <DrawerShell open={!!selRole} onClose={() => setSelRole(null)} title={selRole?.roleName || ''} sub={selRole?.roleCode || ''} size="md">
        {selRole && (<>
          <DrSec title="Tổng quan">
            <DrField lbl="Số người dùng">{selRole.userCount}</DrField>
            <DrField lbl="Số module">{selRole.modulePermissions?.length || 0}</DrField>
            <DrField lbl="Mô tả">{selRole.description || '—'}</DrField>
          </DrSec>
          {(selRole.modulePermissions || []).map((mp) => (
            <DrSec key={mp.module} title={mp.module}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', padding: 'var(--space-4) 0' }}>
                {(mp.permissions || []).map((p) => (
                  <StatusBadge key={p.permissionCode} tone="info">{p.permissionName}</StatusBadge>
                ))}
                {(!mp.permissions || mp.permissions.length === 0) && <span style={{ color: 'var(--t-2)' }}>Không có quyền nào</span>}
              </div>
            </DrSec>
          ))}
          {(!selRole.modulePermissions || selRole.modulePermissions.length === 0) && (
            <div style={{ color: 'var(--t-2)', padding: 'var(--space-8) 0' }}>Không có quyền nào</div>
          )}
        </>)}
      </DrawerShell>
    </>
  );
};

export default AccessMatrixPanel;
