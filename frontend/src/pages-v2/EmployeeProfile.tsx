import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, InputNumber, DatePicker, Select, Checkbox } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, TopTabs, Filter, DataTable, StatusBadge, ActBtn,
  ModalShell, Ico, tk, tw, cf,
  type ColumnDef,
} from './_v2kit';

interface User { id: string; fullName: string; username?: string }

type Tab = 'assets' | 'allowances' | 'career' | 'educations' | 'families' | 'rewards' | 'banks' | 'contracts' | 'insurance';
const TABS = [
  { v: 'assets' as Tab,     l: 'Tài sản',     ic: 'archive' },
  { v: 'allowances' as Tab, l: 'Phụ cấp',     ic: 'dollar' },
  { v: 'career' as Tab,     l: 'Công tác',    ic: 'activity' },
  { v: 'educations' as Tab, l: 'Đào tạo',     ic: 'file-text' },
  { v: 'families' as Tab,   l: 'Gia đình',    ic: 'user' },
  { v: 'rewards' as Tab,    l: 'KT/KL',       ic: 'star' },
  { v: 'banks' as Tab,      l: 'Tài khoản NH', ic: 'card' },
  { v: 'contracts' as Tab,  l: 'Hợp đồng',    ic: 'file-text' },
  { v: 'insurance' as Tab,  l: 'BHXH/BHYT',   ic: 'heart' },
];

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');

const EmployeeProfileV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('assets');
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    apiClient.get<{ items?: User[] } | User[]>('/admin/users', { params: { pageSize: 300 } })
      .then((res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.items ?? [];
        setUsers(list);
      })
      .catch(() => setUsers([]));
  }, []);

  const selectedUser = users.find((u) => u.id === userId);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Đang xem', val: selectedUser ? selectedUser.fullName : '—', sub: selectedUser?.username || 'chưa chọn', tone: selectedUser ? 'ok' : 'warn' },
        { lbl: 'Module', val: 'HR Profile', sub: '9 tab', tone: 'info' },
        { lbl: 'Tổng NV', val: users.length, sub: 'có thể chọn' },
        { lbl: 'Tab hiện tại', val: TABS.find((t) => t.v === tab)?.l || '—', sub: '', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <span style={{ fontSize: 12, color: 'var(--t-2)' }}>Nhân viên:</span>
        <Filter value={userId} onChange={setUserId}
          options={users.map((u) => ({ v: u.id, l: `${u.fullName}${u.username ? ` (${u.username})` : ''}` }))}
          placeholder="▾ Chọn nhân viên" />
        <button className="ab-btn ghost" type="button" onClick={() => setUserId('')}>
          <Ico name="x" size={12} /> Bỏ chọn
        </button>
      </div>

      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} />

      {!userId && (
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--t-2)' }}>
          <div style={{ fontSize: 14 }}>Chọn nhân viên để xem hồ sơ đầy đủ</div>
        </div>
      )}
      {userId && tab === 'assets' && <AssetsTab userId={userId} />}
      {userId && tab === 'allowances' && <AllowancesTab userId={userId} />}
      {userId && tab === 'career' && <CareerTab userId={userId} />}
      {userId && tab === 'educations' && <EducationsTab userId={userId} />}
      {userId && tab === 'families' && <FamiliesTab userId={userId} />}
      {userId && tab === 'rewards' && <RewardsTab userId={userId} />}
      {userId && tab === 'banks' && <BanksTab userId={userId} />}
      {userId && tab === 'contracts' && <ContractsTab userId={userId} />}
      {userId && tab === 'insurance' && <InsuranceTab userId={userId} />}
    </div>
  );
};

interface CrudConfig<T extends { id: string }> {
  endpoint: string; userId: string; subPath: string;
  columns: ColumnDef<T>[];
  formItems: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formTransform?: (v: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valueTransform?: (v: any) => any;
}

function GenericCrudTab<T extends { id: string }>(props: CrudConfig<T>) {
  const { endpoint, userId, subPath, columns, formItems, formTransform, valueTransform } = props;
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await apiClient.get<T[]>(`${endpoint}/${userId}/${subPath}`); setItems(data); }
    catch { setItems([]); }
    finally { setLoading(false); }
  }, [endpoint, userId, subPath]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    try {
      const v = await form.validateFields();
      const payload = formTransform ? formTransform(v) : v;
      if (editing) (payload as Record<string, unknown>).id = editing.id;
      await apiClient.post(`${endpoint}/${userId}/${subPath}`, payload);
      tk('Đã lưu'); setModal(false); setEditing(null); form.resetFields(); load();
    } catch { tw('Lưu thất bại'); }
  };

  const remove = (r: T) => cf('Xóa mục này?', async () => {
    await apiClient.delete(`${endpoint}/${subPath}/${r.id}`); tk('Đã xóa'); load();
  }, { tone: 'crit', confirm: 'Xóa' });

  const openEdit = (r: T) => {
    setEditing(r); form.resetFields();
    form.setFieldsValue(valueTransform ? valueTransform(r as Record<string, unknown>) : r);
    setModal(true);
  };

  const openAdd = () => { setEditing(null); form.resetFields(); setModal(true); };

  return (
    <>
      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <span className="spacer" />
        <button className="ab-btn primary" type="button" onClick={openAdd}>
          <Ico name="plus" size={12} /> Thêm mới
        </button>
      </div>
      <DataTable<T> columns={columns} data={items} rowKey={(r) => r.id}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
            <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => remove(r)} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Chưa có dữ liệu'}
      />
      <ModalShell open={modal} onClose={() => { setModal(false); setEditing(null); form.resetFields(); }}
        size="md" title={editing ? 'Sửa' : 'Thêm mới'}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => { setModal(false); setEditing(null); form.resetFields(); }}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submit}><Ico name="check" size={12} /> Lưu</button>
        </>}>
        <Form form={form} layout="vertical">{formItems}</Form>
      </ModalShell>
    </>
  );
}

interface Asset { id: string; assetType: string; assetName: string; value: number; description?: string; location?: string; acquiredAt?: string }
const AssetsTab: React.FC<{ userId: string }> = ({ userId }) => (
  <GenericCrudTab<Asset> endpoint="/employee-profile" userId={userId} subPath="assets"
    columns={[
      { key: 'type', label: 'Loại', render: (r) => <StatusBadge tone="info">{r.assetType}</StatusBadge> },
      { key: 'name', label: 'Tên', render: (r) => r.assetName },
      { key: 'value', label: 'Giá trị', mono: true, render: (r) => fmt(r.value) },
      { key: 'loc', label: 'Vị trí', render: (r) => r.location || '—' },
      { key: 'desc', label: 'Mô tả', render: (r) => r.description || '—' },
    ]}
    formItems={<>
      <Form.Item name="assetType" label="Loại tài sản" rules={[{ required: true }]}>
        <Select options={[
          { value: 'BatDongSan', label: 'Bất động sản' },
          { value: 'HienKim', label: 'Hiện kim (tiền, vàng)' },
          { value: 'HienVat', label: 'Hiện vật (xe, đồ…)' },
          { value: 'TaiSanCoDinh', label: 'Tài sản cố định' },
        ]} />
      </Form.Item>
      <Form.Item name="assetName" label="Tên tài sản" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="value" label="Giá trị (VND)">
        <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
      </Form.Item>
      <Form.Item name="location" label="Vị trí / Địa chỉ"><Input /></Form.Item>
      <Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item name="acquiredAt" label="Ngày sở hữu"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
    </>}
    formTransform={(v) => ({ ...v, acquiredAt: (v.acquiredAt as Dayjs | undefined)?.toISOString() })}
    valueTransform={(v) => ({ ...v, acquiredAt: v.acquiredAt ? dayjs(v.acquiredAt) : undefined })}
  />
);

interface Allowance { id: string; allowanceType: string; paymentMethod: string; amount: number; rate?: number; effectiveFrom: string; effectiveTo?: string }
const AllowancesTab: React.FC<{ userId: string }> = ({ userId }) => (
  <GenericCrudTab<Allowance> endpoint="/employee-profile" userId={userId} subPath="allowances"
    columns={[
      { key: 'type', label: 'Loại', render: (r) => r.allowanceType },
      { key: 'method', label: 'Cách thức', render: (r) => r.paymentMethod },
      { key: 'amt', label: 'Số tiền', mono: true, render: (r) => fmt(r.amount) },
      { key: 'rate', label: 'Hệ số', mono: true, render: (r) => r.rate ?? '—' },
      { key: 'from', label: 'Từ', mono: true, render: (r) => dayjs(r.effectiveFrom).format('DD/MM/YYYY') },
      { key: 'to', label: 'Đến', mono: true, render: (r) => r.effectiveTo ? dayjs(r.effectiveTo).format('DD/MM/YYYY') : '—' },
    ]}
    formItems={<>
      <Form.Item name="allowanceType" label="Loại phụ cấp" rules={[{ required: true }]}>
        <Input placeholder="VD: Trách nhiệm, độc hại, thu hút, khu vực…" />
      </Form.Item>
      <Form.Item name="paymentMethod" label="Cách thức" rules={[{ required: true }]}>
        <Select options={[
          { value: 'Monthly', label: 'Hàng tháng' },
          { value: 'OneTime', label: 'Một lần' },
          { value: 'Quarterly', label: 'Hàng quý' },
        ]} />
      </Form.Item>
      <Form.Item name="amount" label="Số tiền / tháng">
        <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
      </Form.Item>
      <Form.Item name="rate" label="Hệ số (nếu có)"><InputNumber step={0.1} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="effectiveFrom" label="Hiệu lực từ" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
      <Form.Item name="effectiveTo" label="Hiệu lực đến (để trống nếu còn)"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
      <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
    </>}
    formTransform={(v) => ({ ...v,
      effectiveFrom: (v.effectiveFrom as Dayjs | undefined)?.toISOString(),
      effectiveTo: (v.effectiveTo as Dayjs | undefined)?.toISOString(),
    })}
    valueTransform={(v) => ({ ...v,
      effectiveFrom: v.effectiveFrom ? dayjs(v.effectiveFrom) : undefined,
      effectiveTo: v.effectiveTo ? dayjs(v.effectiveTo) : undefined,
    })}
  />
);

interface Career { id: string; fromDepartmentName?: string; fromPosition?: string; toDepartmentName?: string; toPosition?: string; transferDate: string; decisionNumber?: string; reason?: string }
const CareerTab: React.FC<{ userId: string }> = ({ userId }) => (
  <GenericCrudTab<Career> endpoint="/employee-profile" userId={userId} subPath="career"
    columns={[
      { key: 'date', label: 'Ngày chuyển', mono: true, render: (r) => dayjs(r.transferDate).format('DD/MM/YYYY') },
      { key: 'fromDept', label: 'Từ khoa', render: (r) => r.fromDepartmentName || '—' },
      { key: 'fromPos', label: 'Chức vụ cũ', render: (r) => r.fromPosition || '—' },
      { key: 'toDept', label: 'Đến khoa', render: (r) => r.toDepartmentName || '—' },
      { key: 'toPos', label: 'Chức vụ mới', render: (r) => r.toPosition || '—' },
      { key: 'dec', label: 'Số QĐ', code: true, render: (r) => r.decisionNumber || '—' },
    ]}
    formItems={<>
      <Form.Item name="transferDate" label="Ngày chuyển" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
      <Form.Item name="fromDepartmentName" label="Từ khoa"><Input /></Form.Item>
      <Form.Item name="fromPosition" label="Chức vụ cũ"><Input /></Form.Item>
      <Form.Item name="toDepartmentName" label="Đến khoa" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="toPosition" label="Chức vụ mới" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="decisionNumber" label="Số quyết định"><Input /></Form.Item>
      <Form.Item name="reason" label="Lý do chuyển"><Input.TextArea rows={2} /></Form.Item>
    </>}
    formTransform={(v) => ({ ...v, transferDate: (v.transferDate as Dayjs | undefined)?.toISOString() })}
    valueTransform={(v) => ({ ...v, transferDate: v.transferDate ? dayjs(v.transferDate) : undefined })}
  />
);

interface Edu { id: string; degree: string; major: string; school?: string; graduatedAt?: string; certificateNumber?: string }
const EducationsTab: React.FC<{ userId: string }> = ({ userId }) => (
  <GenericCrudTab<Edu> endpoint="/employee-profile" userId={userId} subPath="educations"
    columns={[
      { key: 'deg', label: 'Bằng cấp', render: (r) => <StatusBadge tone="info">{r.degree}</StatusBadge> },
      { key: 'major', label: 'Chuyên ngành', render: (r) => r.major },
      { key: 'school', label: 'Trường', render: (r) => r.school || '—' },
      { key: 'date', label: 'Tốt nghiệp', mono: true, render: (r) => r.graduatedAt ? dayjs(r.graduatedAt).format('DD/MM/YYYY') : '—' },
      { key: 'cert', label: 'Số bằng', code: true, render: (r) => r.certificateNumber || '—' },
    ]}
    formItems={<>
      <Form.Item name="degree" label="Bằng cấp / Học vị" rules={[{ required: true }]}>
        <Select options={[
          { value: 'Trung cấp', label: 'Trung cấp' },
          { value: 'Cao đẳng', label: 'Cao đẳng' },
          { value: 'Đại học', label: 'Đại học (Cử nhân, Kỹ sư, Bác sĩ)' },
          { value: 'CKI', label: 'Chuyên khoa I (CKI)' },
          { value: 'CKII', label: 'Chuyên khoa II (CKII)' },
          { value: 'Thạc sĩ', label: 'Thạc sĩ' },
          { value: 'Tiến sĩ', label: 'Tiến sĩ' },
          { value: 'Giáo sư', label: 'Giáo sư / Phó GS' },
          { value: 'Khác', label: 'Khác' },
        ]} />
      </Form.Item>
      <Form.Item name="major" label="Chuyên ngành" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="school" label="Trường / Cơ sở đào tạo"><Input /></Form.Item>
      <Form.Item name="graduatedAt" label="Ngày tốt nghiệp"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
      <Form.Item name="certificateNumber" label="Số bằng / chứng chỉ"><Input /></Form.Item>
      <Form.Item name="documentUrl" label="URL scan bằng"><Input /></Form.Item>
    </>}
    formTransform={(v) => ({ ...v, graduatedAt: (v.graduatedAt as Dayjs | undefined)?.toISOString() })}
    valueTransform={(v) => ({ ...v, graduatedAt: v.graduatedAt ? dayjs(v.graduatedAt) : undefined })}
  />
);

interface Fam { id: string; relation: string; fullName: string; dateOfBirth?: string; occupation?: string; phoneNumber?: string; isDependent: boolean }
const FamiliesTab: React.FC<{ userId: string }> = ({ userId }) => (
  <GenericCrudTab<Fam> endpoint="/employee-profile" userId={userId} subPath="families"
    columns={[
      { key: 'rel', label: 'Quan hệ', render: (r) => r.relation },
      { key: 'name', label: 'Họ tên', render: (r) => r.fullName },
      { key: 'dob', label: 'Ngày sinh', mono: true, render: (r) => r.dateOfBirth ? dayjs(r.dateOfBirth).format('DD/MM/YYYY') : '—' },
      { key: 'occ', label: 'Nghề nghiệp', render: (r) => r.occupation || '—' },
      { key: 'phone', label: 'SĐT', code: true, render: (r) => r.phoneNumber || '—' },
      { key: 'dep', label: 'Phụ thuộc', render: (r) => r.isDependent ? <StatusBadge tone="ok">Có</StatusBadge> : '—' },
    ]}
    formItems={<>
      <Form.Item name="relation" label="Quan hệ" rules={[{ required: true }]}>
        <Select options={[
          { value: 'Vợ', label: 'Vợ' }, { value: 'Chồng', label: 'Chồng' },
          { value: 'Con', label: 'Con' }, { value: 'Bố', label: 'Bố' }, { value: 'Mẹ', label: 'Mẹ' },
          { value: 'Anh', label: 'Anh' }, { value: 'Chị', label: 'Chị' }, { value: 'Em', label: 'Em' },
          { value: 'Khác', label: 'Khác' },
        ]} />
      </Form.Item>
      <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="dateOfBirth" label="Ngày sinh"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
      <Form.Item name="occupation" label="Nghề nghiệp"><Input /></Form.Item>
      <Form.Item name="phoneNumber" label="Số điện thoại"><Input /></Form.Item>
      <Form.Item name="identityNumber" label="CCCD/CMND"><Input maxLength={12} /></Form.Item>
      <Form.Item name="isDependent" valuePropName="checked">
        <Checkbox>Người phụ thuộc (giảm trừ thuế TNCN)</Checkbox>
      </Form.Item>
    </>}
    formTransform={(v) => ({ ...v, dateOfBirth: (v.dateOfBirth as Dayjs | undefined)?.toISOString() })}
    valueTransform={(v) => ({ ...v, dateOfBirth: v.dateOfBirth ? dayjs(v.dateOfBirth) : undefined })}
  />
);

interface R { id: string; type: 'reward' | 'discipline'; title: string; decisionNumber?: string; decisionDate: string; amount?: number; reason?: string }
const RewardsTab: React.FC<{ userId: string }> = ({ userId }) => (
  <GenericCrudTab<R> endpoint="/employee-profile" userId={userId} subPath="rewards"
    columns={[
      { key: 'type', label: 'Loại', render: (r) => r.type === 'reward' ? <StatusBadge tone="ok">Khen thưởng</StatusBadge> : <StatusBadge tone="crit">Kỷ luật</StatusBadge> },
      { key: 'title', label: 'Nội dung', render: (r) => r.title },
      { key: 'dec', label: 'Số QĐ', code: true, render: (r) => r.decisionNumber || '—' },
      { key: 'date', label: 'Ngày QĐ', mono: true, render: (r) => dayjs(r.decisionDate).format('DD/MM/YYYY') },
      { key: 'amt', label: 'Số tiền', mono: true, render: (r) => r.amount ? fmt(r.amount) : '—' },
    ]}
    formItems={<>
      <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
        <Select options={[{ value: 'reward', label: 'Khen thưởng' }, { value: 'discipline', label: 'Kỷ luật' }]} />
      </Form.Item>
      <Form.Item name="title" label="Nội dung" rules={[{ required: true }]}>
        <Input placeholder="VD: Chiến sĩ thi đua cấp cơ sở" />
      </Form.Item>
      <Form.Item name="decisionNumber" label="Số quyết định"><Input /></Form.Item>
      <Form.Item name="decisionDate" label="Ngày quyết định" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
      <Form.Item name="amount" label="Số tiền thưởng (nếu có)">
        <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
      </Form.Item>
      <Form.Item name="reason" label="Lý do"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item name="decidedBy" label="Người quyết định"><Input /></Form.Item>
    </>}
    formTransform={(v) => ({ ...v, decisionDate: (v.decisionDate as Dayjs | undefined)?.toISOString() })}
    valueTransform={(v) => ({ ...v, decisionDate: v.decisionDate ? dayjs(v.decisionDate) : undefined })}
  />
);

interface B { id: string; bankName: string; accountNumber: string; accountHolder: string; branchName?: string; isPrimary: boolean }
const BanksTab: React.FC<{ userId: string }> = ({ userId }) => (
  <GenericCrudTab<B> endpoint="/employee-profile" userId={userId} subPath="banks"
    columns={[
      { key: 'bank', label: 'Ngân hàng', render: (r) => r.bankName },
      { key: 'acc', label: 'Số TK', code: true, render: (r) => r.accountNumber },
      { key: 'holder', label: 'Chủ TK', render: (r) => r.accountHolder },
      { key: 'branch', label: 'Chi nhánh', render: (r) => r.branchName || '—' },
      { key: 'pri', label: 'Chính', render: (r) => r.isPrimary ? <StatusBadge tone="ok">Chính</StatusBadge> : '—' },
    ]}
    formItems={<>
      <Form.Item name="bankName" label="Ngân hàng" rules={[{ required: true }]}>
        <Input placeholder="VD: VCB, TCB, BIDV, VietinBank…" />
      </Form.Item>
      <Form.Item name="accountNumber" label="Số tài khoản" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="accountHolder" label="Chủ tài khoản" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="branchName" label="Chi nhánh"><Input /></Form.Item>
      <Form.Item name="isPrimary" valuePropName="checked">
        <Checkbox>Tài khoản chính (nhận lương)</Checkbox>
      </Form.Item>
    </>}
  />
);

interface C { id: string; contractNumber: string; contractType: string; startDate: string; endDate?: string; position?: string; baseSalary?: number; salaryCoefficient?: number }
const ContractsTab: React.FC<{ userId: string }> = ({ userId }) => (
  <GenericCrudTab<C> endpoint="/employee-profile" userId={userId} subPath="contracts"
    columns={[
      { key: 'no', label: 'Số HĐ', code: true, render: (r) => r.contractNumber },
      { key: 'type', label: 'Loại', render: (r) => r.contractType },
      { key: 'from', label: 'Từ', mono: true, render: (r) => dayjs(r.startDate).format('DD/MM/YYYY') },
      { key: 'to', label: 'Đến', mono: true, render: (r) => r.endDate ? dayjs(r.endDate).format('DD/MM/YYYY') : 'Không thời hạn' },
      { key: 'pos', label: 'Chức danh', render: (r) => r.position || '—' },
      { key: 'salary', label: 'Lương', mono: true, render: (r) => r.baseSalary ? fmt(r.baseSalary) : '—' },
      { key: 'coef', label: 'Hệ số', mono: true, render: (r) => r.salaryCoefficient ?? '—' },
    ]}
    formItems={<>
      <Form.Item name="contractNumber" label="Số hợp đồng" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="contractType" label="Loại HĐ" rules={[{ required: true }]}>
        <Select options={[
          { value: 'Probation', label: 'Thử việc' },
          { value: 'FixedTerm', label: 'Có thời hạn' },
          { value: 'Indefinite', label: 'Không thời hạn' },
          { value: 'Seasonal', label: 'Thời vụ' },
        ]} />
      </Form.Item>
      <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
      <Form.Item name="endDate" label="Đến ngày (không thời hạn: bỏ trống)"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
      <Form.Item name="position" label="Chức danh"><Input /></Form.Item>
      <Form.Item name="baseSalary" label="Lương cơ bản">
        <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
      </Form.Item>
      <Form.Item name="salaryGrade" label="Bậc lương"><InputNumber step={0.1} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="salaryCoefficient" label="Hệ số lương"><InputNumber step={0.01} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="documentUrl" label="URL scan HĐ"><Input /></Form.Item>
      <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
    </>}
    formTransform={(v) => ({ ...v,
      startDate: (v.startDate as Dayjs | undefined)?.toISOString(),
      endDate: (v.endDate as Dayjs | undefined)?.toISOString(),
    })}
    valueTransform={(v) => ({ ...v,
      startDate: v.startDate ? dayjs(v.startDate) : undefined,
      endDate: v.endDate ? dayjs(v.endDate) : undefined,
    })}
  />
);

const InsuranceTab: React.FC<{ userId: string }> = ({ userId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient.get(`/employee-profile/${userId}/insurance`)
      .then(({ data }) => {
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = data as any;
          form.setFieldsValue({
            ...d,
            socialInsuranceStartDate: d.socialInsuranceStartDate ? dayjs(d.socialInsuranceStartDate) : undefined,
            healthInsuranceStartDate: d.healthInsuranceStartDate ? dayjs(d.healthInsuranceStartDate) : undefined,
            healthInsuranceEndDate: d.healthInsuranceEndDate ? dayjs(d.healthInsuranceEndDate) : undefined,
          });
        }
      })
      .catch(() => {});
  }, [userId, form]);

  const submit = async () => {
    setLoading(true);
    try {
      const v = await form.validateFields();
      await apiClient.post(`/employee-profile/${userId}/insurance`, {
        ...v,
        socialInsuranceStartDate: (v.socialInsuranceStartDate as Dayjs | undefined)?.toISOString(),
        healthInsuranceStartDate: (v.healthInsuranceStartDate as Dayjs | undefined)?.toISOString(),
        healthInsuranceEndDate: (v.healthInsuranceEndDate as Dayjs | undefined)?.toISOString(),
      });
      tk('Đã lưu');
    } catch { tw('Lưu thất bại'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <div className="panel" style={{ padding: 0 }}>
        <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
          <span>BHXH / BHYT</span>
        </div>
        <div style={{ padding: 20 }}>
          <Form form={form} layout="vertical">
            <Form.Item name="socialInsuranceNumber" label="Số sổ BHXH"><Input maxLength={10} placeholder="10 chữ số" /></Form.Item>
            <Form.Item name="socialInsuranceStartDate" label="Ngày tham gia BHXH"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
            <Form.Item name="healthInsuranceNumber" label="Số thẻ BHYT"><Input maxLength={15} /></Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="healthInsuranceStartDate" label="BHYT từ"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
              <Form.Item name="healthInsuranceEndDate" label="BHYT đến"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
            </div>
            <Form.Item name="healthInsuranceFacilityCode" label="Mã CSKCB ban đầu"><Input maxLength={10} /></Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="monthlyEmployeeContribution" label="NV đóng / tháng">
                <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
              <Form.Item name="monthlyEmployerContribution" label="BV đóng / tháng">
                <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </div>
            <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
            <button type="button" className="ab-btn primary" onClick={submit} disabled={loading}>
              <Ico name="check" size={12} /> {loading ? 'Đang lưu…' : 'Lưu'}
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileV2;
