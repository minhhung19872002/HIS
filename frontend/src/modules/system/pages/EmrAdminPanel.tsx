// Panel quản trị danh mục EMR (vỏ bệnh án / người ký / vai trò / nghiệp vụ / nhóm VB / loại VB)
// Port v1 pages/system-admin/EmrAdminTabs.tsx sang v2.
// Pure CRUD — không có interval/side-effect, không cần prop `active`.

import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, Switch } from 'antd';
import {
  getCoverTypes, saveCoverType, deleteCoverType,
  getSigners, saveSigner, deleteSigner,
  getSigningRoles, saveSigningRole, deleteSigningRole,
  getSigningOperations, saveSigningOperation, deleteSigningOperation,
  getDocumentGroups, saveDocumentGroup, deleteDocumentGroup,
  getDocumentTypes, saveDocumentType, deleteDocumentType,
  type EmrCoverTypeDto, type EmrSignerCatalogDto, type EmrSigningRoleDto,
  type EmrSigningOperationDto, type EmrDocumentGroupDto, type EmrDocumentTypeDto,
} from '../../emr/api/emrAdmin';
import {
  TopTabs, DataTable, StatusBadge, ModalShell, ActBtn, Btn, tk, te, cf,
  type ColumnDef, type TopTab,
} from '../../../pages-v2/_v2kit';

type EmrTab = 'cover' | 'signer' | 'role' | 'operation' | 'group' | 'doctype';

const EMR_TABS: TopTab<EmrTab>[] = [
  { v: 'cover',     l: 'Vỏ bệnh án',  ic: 'file-text' },
  { v: 'signer',    l: 'Người ký',     ic: 'user' },
  { v: 'role',      l: 'Vai trò ký',   ic: 'shield' },
  { v: 'operation', l: 'Nghiệp vụ ký', ic: 'activity' },
  { v: 'group',     l: 'Nhóm VB',      ic: 'folder' },
  { v: 'doctype',   l: 'Loại VB',      ic: 'file' },
];

const MODAL_TITLES: Record<EmrTab, string> = {
  cover: 'Vỏ bệnh án', signer: 'Người ký', role: 'Vai trò ký',
  operation: 'Nghiệp vụ ký', group: 'Nhóm văn bản', doctype: 'Loại văn bản',
};

const EmrAdminPanel: React.FC = () => {
  const [tab, setTab] = useState<EmrTab>('cover');
  const [coverTypes, setCoverTypes] = useState<EmrCoverTypeDto[]>([]);
  const [signers, setSigners] = useState<EmrSignerCatalogDto[]>([]);
  const [signingRoles, setSigningRoles] = useState<EmrSigningRoleDto[]>([]);
  const [signingOps, setSigningOps] = useState<EmrSigningOperationDto[]>([]);
  const [docGroups, setDocGroups] = useState<EmrDocumentGroupDto[]>([]);
  const [docTypes, setDocTypes] = useState<EmrDocumentTypeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<EmrTab>('cover');
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ct, sg, sr, so, dg, dt] = await Promise.allSettled([
        getCoverTypes(), getSigners(), getSigningRoles(),
        getSigningOperations(), getDocumentGroups(), getDocumentTypes(),
      ]);
      if (ct.status === 'fulfilled') setCoverTypes(ct.value);
      if (sg.status === 'fulfilled') setSigners(sg.value);
      if (sr.status === 'fulfilled') setSigningRoles(sr.value);
      if (so.status === 'fulfilled') setSigningOps(so.value);
      if (dg.status === 'fulfilled') setDocGroups(dg.value);
      if (dt.status === 'fulfilled') setDocTypes(dt.value);
    } catch { /* keep current */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openModal = (type: EmrTab, item?: Record<string, unknown>) => {
    setModalType(type);
    setEditingItem(item || null);
    form.resetFields();
    if (item) form.setFieldsValue(item);
    setModalOpen(true);
  };

  const handleSave = async () => {
    let values: Record<string, unknown>;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      const data = { ...editingItem, ...values };
      let ok = false;
      switch (modalType) {
        case 'cover':     ok = !!(await saveCoverType(data));      break;
        case 'signer':    ok = !!(await saveSigner(data));         break;
        case 'role':      ok = !!(await saveSigningRole(data));    break;
        case 'operation': ok = !!(await saveSigningOperation(data)); break;
        case 'group':     ok = !!(await saveDocumentGroup(data));  break;
        case 'doctype':   ok = !!(await saveDocumentType(data));   break;
      }
      if (ok) { tk('Đã lưu'); setModalOpen(false); fetchAll(); }
    } catch { te('Lưu thất bại'); } finally { setSaving(false); }
  };

  const handleDelete = (type: EmrTab, id: string) =>
    cf('Xoá mục này?', async () => {
      let ok = false;
      switch (type) {
        case 'cover':     ok = await deleteCoverType(id);     break;
        case 'signer':    ok = await deleteSigner(id);        break;
        case 'role':      ok = await deleteSigningRole(id);   break;
        case 'operation': ok = await deleteSigningOperation(id); break;
        case 'group':     ok = await deleteDocumentGroup(id); break;
        case 'doctype':   ok = await deleteDocumentType(id);  break;
      }
      if (ok) { tk('Đã xoá'); fetchAll(); } else te('Xoá thất bại');
    }, { tone: 'crit', confirm: 'Xoá' });

  // ─── Column defs ───
  const coverColumns: ColumnDef<EmrCoverTypeDto>[] = [
    { key: 'code', label: 'Mã', mono: true, code: true, width: 80, render: (r) => r.code },
    { key: 'name', label: 'Tên', render: (r) => r.name },
    { key: 'category', label: 'Phân loại', width: 130, render: (r) => (
      <StatusBadge tone={r.category === 'NoiTru' ? 'info' : r.category === 'NgoaiTru' ? 'ok' : undefined}>{r.category}</StatusBadge>
    ) },
    { key: 'sortOrder', label: 'Thứ tự', mono: true, width: 70, render: (r) => r.sortOrder },
    { key: 'isActive', label: 'TT', width: 90, render: (r) => r.isActive ? <StatusBadge tone="ok">Hoạt động</StatusBadge> : <StatusBadge tone="warn">Khoá</StatusBadge> },
  ];
  const signerColumns: ColumnDef<EmrSignerCatalogDto>[] = [
    { key: 'fullName', label: 'Họ tên', render: (r) => r.fullName },
    { key: 'title', label: 'Chức danh', width: 80, render: (r) => r.title || '—' },
    { key: 'userName', label: 'Username', mono: true, width: 120, render: (r) => r.userName || '—' },
    { key: 'departmentName', label: 'Khoa', width: 150, render: (r) => r.departmentName || '—' },
    { key: 'isActive', label: 'TT', width: 90, render: (r) => r.isActive ? <StatusBadge tone="ok">Hoạt động</StatusBadge> : <StatusBadge tone="warn">Khoá</StatusBadge> },
  ];
  const roleColumns: ColumnDef<EmrSigningRoleDto>[] = [
    { key: 'code', label: 'Mã', mono: true, code: true, width: 80, render: (r) => r.code },
    { key: 'name', label: 'Tên', render: (r) => r.name },
    { key: 'description', label: 'Mô tả', render: (r) => r.description || '—' },
    { key: 'sortOrder', label: 'Thứ tự', mono: true, width: 70, render: (r) => r.sortOrder },
  ];
  const operationColumns: ColumnDef<EmrSigningOperationDto>[] = [
    { key: 'code', label: 'Mã', mono: true, code: true, width: 100, render: (r) => r.code },
    { key: 'name', label: 'Tên', render: (r) => r.name },
    { key: 'roleName', label: 'Vai trò', width: 120, render: (r) => r.roleName || '—' },
    { key: 'documentType', label: 'Loại VB', width: 120, render: (r) => r.documentType || '—' },
    { key: 'isRequired', label: 'Bắt buộc', width: 80, render: (r) => r.isRequired ? <StatusBadge tone="crit">Có</StatusBadge> : '—' },
  ];
  const groupColumns: ColumnDef<EmrDocumentGroupDto>[] = [
    { key: 'code', label: 'Mã', mono: true, code: true, width: 80, render: (r) => r.code },
    { key: 'name', label: 'Tên', render: (r) => r.name },
    { key: 'category', label: 'Phân loại', width: 120, render: (r) => r.category || '—' },
    { key: 'sortOrder', label: 'Thứ tự', mono: true, width: 70, render: (r) => r.sortOrder },
  ];
  const docTypeColumns: ColumnDef<EmrDocumentTypeDto>[] = [
    { key: 'code', label: 'Mã', mono: true, code: true, width: 80, render: (r) => r.code },
    { key: 'name', label: 'Tên', render: (r) => r.name },
    { key: 'groupName', label: 'Nhóm', width: 120, render: (r) => r.groupName || '—' },
    { key: 'formTemplateKey', label: 'Template', mono: true, width: 130, render: (r) => r.formTemplateKey || '—' },
    { key: 'isRequired', label: 'Bắt buộc', width: 80, render: (r) => r.isRequired ? <StatusBadge tone="crit">Có</StatusBadge> : '—' },
  ];

  const emptyMsg = loading ? 'Đang tải…' : 'Chưa có dữ liệu';

  return (
    <>
      <div className="ab-tools">
        <TopTabs tab={tab} setTab={setTab} tabs={EMR_TABS} />
        <span className="spacer" />
        <Btn variant="primary" onClick={() => openModal(tab)}>+ Thêm</Btn>
        <Btn variant="ghost" onClick={fetchAll}>Làm mới</Btn>
      </div>

      {tab === 'cover' && (
        <DataTable<EmrCoverTypeDto> columns={coverColumns} data={coverTypes} rowKey={(r) => r.id}
          actions={(r) => (<>
            <ActBtn ic="edit" title="Sửa" onClick={() => openModal('cover', r as unknown as Record<string, unknown>)} />
            <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => handleDelete('cover', r.id)} />
          </>)}
          empty={emptyMsg} />
      )}
      {tab === 'signer' && (
        <DataTable<EmrSignerCatalogDto> columns={signerColumns} data={signers} rowKey={(r) => r.id}
          actions={(r) => (<>
            <ActBtn ic="edit" title="Sửa" onClick={() => openModal('signer', r as unknown as Record<string, unknown>)} />
            <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => handleDelete('signer', r.id)} />
          </>)}
          empty={emptyMsg} />
      )}
      {tab === 'role' && (
        <DataTable<EmrSigningRoleDto> columns={roleColumns} data={signingRoles} rowKey={(r) => r.id}
          actions={(r) => (<>
            <ActBtn ic="edit" title="Sửa" onClick={() => openModal('role', r as unknown as Record<string, unknown>)} />
            <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => handleDelete('role', r.id)} />
          </>)}
          empty={emptyMsg} />
      )}
      {tab === 'operation' && (
        <DataTable<EmrSigningOperationDto> columns={operationColumns} data={signingOps} rowKey={(r) => r.id}
          actions={(r) => (<>
            <ActBtn ic="edit" title="Sửa" onClick={() => openModal('operation', r as unknown as Record<string, unknown>)} />
            <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => handleDelete('operation', r.id)} />
          </>)}
          empty={emptyMsg} />
      )}
      {tab === 'group' && (
        <DataTable<EmrDocumentGroupDto> columns={groupColumns} data={docGroups} rowKey={(r) => r.id}
          actions={(r) => (<>
            <ActBtn ic="edit" title="Sửa" onClick={() => openModal('group', r as unknown as Record<string, unknown>)} />
            <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => handleDelete('group', r.id)} />
          </>)}
          empty={emptyMsg} />
      )}
      {tab === 'doctype' && (
        <DataTable<EmrDocumentTypeDto> columns={docTypeColumns} data={docTypes} rowKey={(r) => r.id}
          actions={(r) => (<>
            <ActBtn ic="edit" title="Sửa" onClick={() => openModal('doctype', r as unknown as Record<string, unknown>)} />
            <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => handleDelete('doctype', r.id)} />
          </>)}
          empty={emptyMsg} />
      )}

      {/* Shared modal — form khác theo type, switch-case như v1 */}
      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={MODAL_TITLES[modalType]}
        size="sm"
        footer={
          <>
            <Btn onClick={() => setModalOpen(false)}>Huỷ</Btn>
            <Btn variant="primary" disabled={saving} onClick={handleSave}>{saving ? 'Đang lưu…' : 'Lưu'}</Btn>
          </>
        }
      >
        <Form form={form} layout="vertical" requiredMark>
          {/* code + name — common (trừ signer dùng fullName thay name) */}
          {modalType !== 'signer' && (
            <Form.Item name="code" label="Mã" rules={[{ required: true, message: 'Nhập mã' }]}>
              <Input placeholder="VD: BA_NOI_TRU" />
            </Form.Item>
          )}

          {modalType === 'signer' ? (
            <>
              <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="title" label="Chức danh">
                <Select allowClear options={['BS','BSCKI','BSCKII','ThS','TS','PGS','GS'].map((v) => ({ value: v, label: v }))} />
              </Form.Item>
              <Form.Item name="departmentName" label="Khoa"><Input /></Form.Item>
            </>
          ) : (
            <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}>
              <Input />
            </Form.Item>
          )}

          {modalType === 'cover' && (
            <Form.Item name="category" label="Phân loại" rules={[{ required: true, message: 'Chọn phân loại' }]}>
              <Select options={[
                { value: 'NoiTru', label: 'Nội trú' },
                { value: 'NgoaiTru', label: 'Ngoại trú' },
                { value: 'ChuyenKhoa', label: 'Chuyên khoa' },
              ]} />
            </Form.Item>
          )}

          {modalType === 'operation' && (
            <>
              <Form.Item name="roleName" label="Vai trò"><Input /></Form.Item>
              <Form.Item name="documentType" label="Loại tài liệu"><Input /></Form.Item>
              <Form.Item name="isRequired" label="Bắt buộc" valuePropName="checked"><Switch /></Form.Item>
            </>
          )}

          {modalType === 'group' && (
            <Form.Item name="category" label="Phân loại">
              <Select allowClear options={[
                'BenhAn','DieuTri','ChamSoc','XetNghiem','ChanDoan','Khac',
              ].map((v) => ({ value: v, label: v }))} />
            </Form.Item>
          )}

          {modalType === 'doctype' && (
            <>
              <Form.Item name="groupName" label="Nhóm"><Input /></Form.Item>
              <Form.Item name="formTemplateKey" label="Template key"><Input /></Form.Item>
              <Form.Item name="isRequired" label="Bắt buộc" valuePropName="checked"><Switch /></Form.Item>
            </>
          )}

          {modalType !== 'signer' && (
            <Form.Item name="sortOrder" label="Thứ tự">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          )}

          {(modalType === 'cover' || modalType === 'role' || modalType === 'group') && (
            <Form.Item name="description" label="Mô tả">
              <Input.TextArea rows={2} />
            </Form.Item>
          )}
        </Form>
      </ModalShell>
    </>
  );
};

export default EmrAdminPanel;
