/**
 * Employee HR Profile 9 tab — Sprint 6 Item 2.13.
 * Chọn user → xem đầy đủ 9 tab: Tài sản / Phụ cấp / Công tác / Đào tạo /
 * Gia đình / Khen thưởng / Tài khoản NH / Hợp đồng / BHXH-BHYT
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, Tabs, Select, Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker,
  Tag, Popconfirm, message, Typography, Checkbox,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../api/client';

const { Text } = Typography;

interface User { id: string; fullName: string; username?: string }

export default function EmployeeProfile() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

  useEffect(() => {
    apiClient.get<{ items?: User[] } | User[]>('/admin/users', { params: { pageSize: 300 } })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
        setUsers(list);
      })
      .catch(() => setUsers([]));
  }, []);

  return (
    <Card
      title={
        <Space>
          <UserOutlined />
          Hồ sơ nhân viên (HR 9 tab)
          <Select
            showSearch
            placeholder="Chọn nhân viên"
            value={selectedUserId}
            onChange={setSelectedUserId}
            style={{ width: 360 }}
            optionFilterProp="label"
            options={users.map(u => ({ value: u.id, label: `${u.fullName}${u.username ? ` (${u.username})` : ''}` }))}
          />
        </Space>
      }
    >
      {selectedUserId ? (
        <Tabs
          items={[
            { key: 'assets', label: 'Tài sản', children: <AssetsTab userId={selectedUserId} /> },
            { key: 'allowances', label: 'Phụ cấp', children: <AllowancesTab userId={selectedUserId} /> },
            { key: 'career', label: 'Quá trình công tác', children: <CareerTab userId={selectedUserId} /> },
            { key: 'educations', label: 'Đào tạo', children: <EducationTab userId={selectedUserId} /> },
            { key: 'families', label: 'Gia đình', children: <FamilyTab userId={selectedUserId} /> },
            { key: 'rewards', label: 'Khen thưởng / Kỷ luật', children: <RewardsTab userId={selectedUserId} /> },
            { key: 'banks', label: 'Tài khoản NH', children: <BanksTab userId={selectedUserId} /> },
            { key: 'contracts', label: 'Hợp đồng', children: <ContractsTab userId={selectedUserId} /> },
            { key: 'insurance', label: 'BHXH / BHYT', children: <InsuranceTab userId={selectedUserId} /> },
          ]}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
          <Text>Chọn nhân viên để xem hồ sơ đầy đủ</Text>
        </div>
      )}
    </Card>
  );
}

// =========================================================
// TAB: TÀI SẢN
// =========================================================
function AssetsTab({ userId }: { userId: string }) {
  type Asset = { id: string; assetType: string; assetName: string; value: number; description?: string; location?: string; acquiredAt?: string };
  return (
    <GenericCrudTab<Asset>
      endpoint="/employee-profile"
      userId={userId}
      subPath="assets"
      renderColumns={() => [
        { title: 'Loại', dataIndex: 'assetType', width: 140, render: (v: string) => <Tag color="blue">{v}</Tag> },
        { title: 'Tên', dataIndex: 'assetName' },
        { title: 'Giá trị', dataIndex: 'value', align: 'right', render: (v: number) => v?.toLocaleString('vi-VN') },
        { title: 'Vị trí', dataIndex: 'location' },
        { title: 'Mô tả', dataIndex: 'description' },
      ]}
      formItems={() => (
        <>
          <Form.Item name="assetType" label="Loại tài sản" rules={[{ required: true }]}>
            <Select options={[
              { value: 'BatDongSan', label: 'Bất động sản' },
              { value: 'HienKim', label: 'Hiện kim (tiền, vàng)' },
              { value: 'HienVat', label: 'Hiện vật (xe, đồ...)' },
              { value: 'TaiSanCoDinh', label: 'Tài sản cố định' },
            ]} />
          </Form.Item>
          <Form.Item name="assetName" label="Tên tài sản" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="value" label="Giá trị (VND)">
            <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="location" label="Vị trí / Địa chỉ">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="acquiredAt" label="Ngày sở hữu">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </>
      )}
      formTransform={(v) => ({ ...v, acquiredAt: (v.acquiredAt as Dayjs | undefined)?.toISOString() })}
      valueTransform={(v) => ({ ...v, acquiredAt: v.acquiredAt ? dayjs(v.acquiredAt) : undefined })}
    />
  );
}

// =========================================================
// TAB: PHỤ CẤP
// =========================================================
function AllowancesTab({ userId }: { userId: string }) {
  type Allowance = { id: string; allowanceType: string; paymentMethod: string; amount: number; rate?: number; effectiveFrom: string; effectiveTo?: string };
  return (
    <GenericCrudTab<Allowance>
      endpoint="/employee-profile"
      userId={userId}
      subPath="allowances"
      renderColumns={() => [
        { title: 'Loại', dataIndex: 'allowanceType' },
        { title: 'Cách thức', dataIndex: 'paymentMethod', width: 120 },
        { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: (v: number) => v?.toLocaleString('vi-VN') },
        { title: 'Hệ số', dataIndex: 'rate', width: 80 },
        { title: 'Từ ngày', dataIndex: 'effectiveFrom', width: 120, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
        { title: 'Đến ngày', dataIndex: 'effectiveTo', width: 120, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
      ]}
      formItems={() => (
        <>
          <Form.Item name="allowanceType" label="Loại phụ cấp" rules={[{ required: true }]}>
            <Input placeholder="VD: Trách nhiệm, độc hại, thu hút, khu vực..." />
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
          <Form.Item name="rate" label="Hệ số (nếu có)">
            <InputNumber step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="effectiveFrom" label="Hiệu lực từ" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="effectiveTo" label="Hiệu lực đến (để trống nếu còn)">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input />
          </Form.Item>
        </>
      )}
      formTransform={(v) => ({
        ...v,
        effectiveFrom: (v.effectiveFrom as Dayjs | undefined)?.toISOString(),
        effectiveTo: (v.effectiveTo as Dayjs | undefined)?.toISOString(),
      })}
      valueTransform={(v) => ({
        ...v,
        effectiveFrom: v.effectiveFrom ? dayjs(v.effectiveFrom) : undefined,
        effectiveTo: v.effectiveTo ? dayjs(v.effectiveTo) : undefined,
      })}
    />
  );
}

// =========================================================
// TAB: CAREER HISTORY
// =========================================================
function CareerTab({ userId }: { userId: string }) {
  type Career = { id: string; fromDepartmentName?: string; fromPosition?: string; toDepartmentName?: string; toPosition?: string; transferDate: string; decisionNumber?: string; reason?: string };
  return (
    <GenericCrudTab<Career>
      endpoint="/employee-profile"
      userId={userId}
      subPath="career"
      renderColumns={() => [
        { title: 'Ngày chuyển', dataIndex: 'transferDate', width: 120, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
        { title: 'Từ khoa', dataIndex: 'fromDepartmentName' },
        { title: 'Chức vụ cũ', dataIndex: 'fromPosition' },
        { title: 'Đến khoa', dataIndex: 'toDepartmentName' },
        { title: 'Chức vụ mới', dataIndex: 'toPosition' },
        { title: 'Số QĐ', dataIndex: 'decisionNumber', width: 110 },
      ]}
      formItems={() => (
        <>
          <Form.Item name="transferDate" label="Ngày chuyển" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="fromDepartmentName" label="Từ khoa">
            <Input />
          </Form.Item>
          <Form.Item name="fromPosition" label="Chức vụ cũ">
            <Input />
          </Form.Item>
          <Form.Item name="toDepartmentName" label="Đến khoa" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="toPosition" label="Chức vụ mới" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="decisionNumber" label="Số quyết định">
            <Input />
          </Form.Item>
          <Form.Item name="reason" label="Lý do chuyển">
            <Input.TextArea rows={2} />
          </Form.Item>
        </>
      )}
      formTransform={(v) => ({ ...v, transferDate: (v.transferDate as Dayjs | undefined)?.toISOString() })}
      valueTransform={(v) => ({ ...v, transferDate: v.transferDate ? dayjs(v.transferDate) : undefined })}
    />
  );
}

// =========================================================
// TAB: EDUCATION
// =========================================================
function EducationTab({ userId }: { userId: string }) {
  type Edu = { id: string; degree: string; major: string; school?: string; graduatedAt?: string; certificateNumber?: string };
  return (
    <GenericCrudTab<Edu>
      endpoint="/employee-profile"
      userId={userId}
      subPath="educations"
      renderColumns={() => [
        { title: 'Bằng cấp', dataIndex: 'degree', width: 140, render: (v: string) => <Tag color="blue">{v}</Tag> },
        { title: 'Chuyên ngành', dataIndex: 'major' },
        { title: 'Trường', dataIndex: 'school' },
        { title: 'Tốt nghiệp', dataIndex: 'graduatedAt', width: 120, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
        { title: 'Số bằng', dataIndex: 'certificateNumber' },
      ]}
      formItems={() => (
        <>
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
          <Form.Item name="major" label="Chuyên ngành" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="school" label="Trường / Cơ sở đào tạo">
            <Input />
          </Form.Item>
          <Form.Item name="graduatedAt" label="Ngày tốt nghiệp">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="certificateNumber" label="Số bằng / chứng chỉ">
            <Input />
          </Form.Item>
          <Form.Item name="documentUrl" label="URL scan bằng">
            <Input />
          </Form.Item>
        </>
      )}
      formTransform={(v) => ({ ...v, graduatedAt: (v.graduatedAt as Dayjs | undefined)?.toISOString() })}
      valueTransform={(v) => ({ ...v, graduatedAt: v.graduatedAt ? dayjs(v.graduatedAt) : undefined })}
    />
  );
}

// =========================================================
// TAB: FAMILY
// =========================================================
function FamilyTab({ userId }: { userId: string }) {
  type Fam = { id: string; relation: string; fullName: string; dateOfBirth?: string; occupation?: string; phoneNumber?: string; isDependent: boolean };
  return (
    <GenericCrudTab<Fam>
      endpoint="/employee-profile"
      userId={userId}
      subPath="families"
      renderColumns={() => [
        { title: 'Quan hệ', dataIndex: 'relation', width: 100 },
        { title: 'Họ tên', dataIndex: 'fullName' },
        { title: 'Ngày sinh', dataIndex: 'dateOfBirth', width: 110, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
        { title: 'Nghề nghiệp', dataIndex: 'occupation' },
        { title: 'SĐT', dataIndex: 'phoneNumber', width: 120 },
        { title: 'Phụ thuộc', dataIndex: 'isDependent', width: 100, render: (v: boolean) => v ? <Tag color="green">Có</Tag> : null },
      ]}
      formItems={() => (
        <>
          <Form.Item name="relation" label="Quan hệ" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Vợ', label: 'Vợ' }, { value: 'Chồng', label: 'Chồng' },
              { value: 'Con', label: 'Con' }, { value: 'Bố', label: 'Bố' }, { value: 'Mẹ', label: 'Mẹ' },
              { value: 'Anh', label: 'Anh' }, { value: 'Chị', label: 'Chị' }, { value: 'Em', label: 'Em' },
              { value: 'Khác', label: 'Khác' },
            ]} />
          </Form.Item>
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dateOfBirth" label="Ngày sinh">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="occupation" label="Nghề nghiệp">
            <Input />
          </Form.Item>
          <Form.Item name="phoneNumber" label="Số điện thoại">
            <Input />
          </Form.Item>
          <Form.Item name="identityNumber" label="CCCD/CMND">
            <Input maxLength={12} />
          </Form.Item>
          <Form.Item name="isDependent" valuePropName="checked">
            <Checkbox>Người phụ thuộc (giảm trừ thuế TNCN)</Checkbox>
          </Form.Item>
        </>
      )}
      formTransform={(v) => ({ ...v, dateOfBirth: (v.dateOfBirth as Dayjs | undefined)?.toISOString() })}
      valueTransform={(v) => ({ ...v, dateOfBirth: v.dateOfBirth ? dayjs(v.dateOfBirth) : undefined })}
    />
  );
}

// =========================================================
// TAB: REWARDS / DISCIPLINE
// =========================================================
function RewardsTab({ userId }: { userId: string }) {
  type R = { id: string; type: 'reward' | 'discipline'; title: string; decisionNumber?: string; decisionDate: string; amount?: number; reason?: string };
  return (
    <GenericCrudTab<R>
      endpoint="/employee-profile"
      userId={userId}
      subPath="rewards"
      renderColumns={() => [
        { title: 'Loại', dataIndex: 'type', width: 100, render: (v: string) => v === 'reward' ? <Tag color="green">Khen thưởng</Tag> : <Tag color="red">Kỷ luật</Tag> },
        { title: 'Nội dung', dataIndex: 'title' },
        { title: 'Số QĐ', dataIndex: 'decisionNumber', width: 120 },
        { title: 'Ngày QĐ', dataIndex: 'decisionDate', width: 120, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
        { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: (v: number) => v?.toLocaleString('vi-VN') },
      ]}
      formItems={() => (
        <>
          <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
            <Select options={[
              { value: 'reward', label: 'Khen thưởng' },
              { value: 'discipline', label: 'Kỷ luật' },
            ]} />
          </Form.Item>
          <Form.Item name="title" label="Nội dung" rules={[{ required: true }]}>
            <Input placeholder="VD: Chiến sĩ thi đua cấp cơ sở" />
          </Form.Item>
          <Form.Item name="decisionNumber" label="Số quyết định">
            <Input />
          </Form.Item>
          <Form.Item name="decisionDate" label="Ngày quyết định" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="amount" label="Số tiền thưởng (nếu có)">
            <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="reason" label="Lý do">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="decidedBy" label="Người quyết định">
            <Input />
          </Form.Item>
        </>
      )}
      formTransform={(v) => ({ ...v, decisionDate: (v.decisionDate as Dayjs | undefined)?.toISOString() })}
      valueTransform={(v) => ({ ...v, decisionDate: v.decisionDate ? dayjs(v.decisionDate) : undefined })}
    />
  );
}

// =========================================================
// TAB: BANK ACCOUNTS
// =========================================================
function BanksTab({ userId }: { userId: string }) {
  type B = { id: string; bankName: string; accountNumber: string; accountHolder: string; branchName?: string; isPrimary: boolean };
  return (
    <GenericCrudTab<B>
      endpoint="/employee-profile"
      userId={userId}
      subPath="banks"
      renderColumns={() => [
        { title: 'Ngân hàng', dataIndex: 'bankName', width: 150 },
        { title: 'Số TK', dataIndex: 'accountNumber' },
        { title: 'Chủ TK', dataIndex: 'accountHolder' },
        { title: 'Chi nhánh', dataIndex: 'branchName' },
        { title: 'Chính', dataIndex: 'isPrimary', width: 80, render: (v: boolean) => v ? <Tag color="green">Chính</Tag> : null },
      ]}
      formItems={() => (
        <>
          <Form.Item name="bankName" label="Ngân hàng" rules={[{ required: true }]}>
            <Input placeholder="VD: VCB, TCB, BIDV, VietinBank..." />
          </Form.Item>
          <Form.Item name="accountNumber" label="Số tài khoản" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="accountHolder" label="Chủ tài khoản" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="branchName" label="Chi nhánh">
            <Input />
          </Form.Item>
          <Form.Item name="isPrimary" valuePropName="checked">
            <Checkbox>Tài khoản chính (nhận lương)</Checkbox>
          </Form.Item>
        </>
      )}
    />
  );
}

// =========================================================
// TAB: CONTRACTS
// =========================================================
function ContractsTab({ userId }: { userId: string }) {
  type C = { id: string; contractNumber: string; contractType: string; startDate: string; endDate?: string; position?: string; baseSalary?: number; salaryCoefficient?: number };
  return (
    <GenericCrudTab<C>
      endpoint="/employee-profile"
      userId={userId}
      subPath="contracts"
      renderColumns={() => [
        { title: 'Số HĐ', dataIndex: 'contractNumber', width: 120 },
        { title: 'Loại', dataIndex: 'contractType', width: 120 },
        { title: 'Từ ngày', dataIndex: 'startDate', width: 120, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
        { title: 'Đến ngày', dataIndex: 'endDate', width: 120, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : 'Không thời hạn' },
        { title: 'Chức danh', dataIndex: 'position' },
        { title: 'Lương', dataIndex: 'baseSalary', align: 'right', render: (v: number) => v?.toLocaleString('vi-VN') },
        { title: 'Hệ số', dataIndex: 'salaryCoefficient', width: 80 },
      ]}
      formItems={() => (
        <>
          <Form.Item name="contractNumber" label="Số hợp đồng" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contractType" label="Loại HĐ" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Probation', label: 'Thử việc' },
              { value: 'FixedTerm', label: 'Có thời hạn' },
              { value: 'Indefinite', label: 'Không thời hạn' },
              { value: 'Seasonal', label: 'Thời vụ' },
            ]} />
          </Form.Item>
          <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="endDate" label="Đến ngày (không thời hạn: bỏ trống)">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="position" label="Chức danh">
            <Input />
          </Form.Item>
          <Form.Item name="baseSalary" label="Lương cơ bản">
            <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="salaryGrade" label="Bậc lương">
            <InputNumber step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="salaryCoefficient" label="Hệ số lương">
            <InputNumber step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="documentUrl" label="URL scan HĐ">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </>
      )}
      formTransform={(v) => ({
        ...v,
        startDate: (v.startDate as Dayjs | undefined)?.toISOString(),
        endDate: (v.endDate as Dayjs | undefined)?.toISOString(),
      })}
      valueTransform={(v) => ({
        ...v,
        startDate: v.startDate ? dayjs(v.startDate) : undefined,
        endDate: v.endDate ? dayjs(v.endDate) : undefined,
      })}
    />
  );
}

// =========================================================
// TAB: INSURANCE (1 record per user)
// =========================================================
function InsuranceTab({ userId }: { userId: string }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient.get(`/employee-profile/${userId}/insurance`)
      .then(({ data }) => {
        if (data) {
          form.setFieldsValue({
            ...data,
            socialInsuranceStartDate: data.socialInsuranceStartDate ? dayjs(data.socialInsuranceStartDate) : undefined,
            healthInsuranceStartDate: data.healthInsuranceStartDate ? dayjs(data.healthInsuranceStartDate) : undefined,
            healthInsuranceEndDate: data.healthInsuranceEndDate ? dayjs(data.healthInsuranceEndDate) : undefined,
          });
        }
      })
      .catch(() => {});
  }, [userId, form]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      await apiClient.post(`/employee-profile/${userId}/insurance`, {
        ...values,
        socialInsuranceStartDate: (values.socialInsuranceStartDate as Dayjs | undefined)?.toISOString(),
        healthInsuranceStartDate: (values.healthInsuranceStartDate as Dayjs | undefined)?.toISOString(),
        healthInsuranceEndDate: (values.healthInsuranceEndDate as Dayjs | undefined)?.toISOString(),
      });
      message.success('Đã lưu');
    } finally { setLoading(false); }
  };

  return (
    <Form form={form} layout="vertical" style={{ maxWidth: 720 }}>
      <Form.Item name="socialInsuranceNumber" label="Số sổ BHXH">
        <Input maxLength={10} placeholder="10 chữ số" />
      </Form.Item>
      <Form.Item name="socialInsuranceStartDate" label="Ngày tham gia BHXH">
        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
      </Form.Item>
      <Form.Item name="healthInsuranceNumber" label="Số thẻ BHYT">
        <Input maxLength={15} />
      </Form.Item>
      <Space style={{ width: '100%' }}>
        <Form.Item name="healthInsuranceStartDate" label="BHYT từ" style={{ flex: 1 }}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item name="healthInsuranceEndDate" label="BHYT đến" style={{ flex: 1 }}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
      </Space>
      <Form.Item name="healthInsuranceFacilityCode" label="Mã CSKCB ban đầu">
        <Input maxLength={10} />
      </Form.Item>
      <Space style={{ width: '100%' }}>
        <Form.Item name="monthlyEmployeeContribution" label="NV đóng / tháng" style={{ flex: 1 }}>
          <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
        </Form.Item>
        <Form.Item name="monthlyEmployerContribution" label="BV đóng / tháng" style={{ flex: 1 }}>
          <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
        </Form.Item>
      </Space>
      <Form.Item name="note" label="Ghi chú">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Button type="primary" loading={loading} onClick={handleSave}>Lưu</Button>
    </Form>
  );
}

// =========================================================
// GENERIC CRUD COMPONENT
// =========================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
interface GenericCrudTabProps<T extends { id: string }> {
  endpoint: string;
  userId: string;
  subPath: string;
  renderColumns: () => Array<{
    title: string;
    dataIndex?: keyof T & string;
    width?: number;
    align?: 'left' | 'right' | 'center';
    render?: (v: any, r: T) => React.ReactNode;
  }>;
  formItems: () => React.ReactNode;
  formTransform?: (values: any) => any;
  valueTransform?: (values: any) => any;
}

function GenericCrudTab<T extends { id: string }>(props: GenericCrudTabProps<T>) {
  const { endpoint, userId, subPath, renderColumns, formItems, formTransform, valueTransform } = props;
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<T[]>(`${endpoint}/${userId}/${subPath}`);
      setItems(data);
    } catch { setItems([]); } finally { setLoading(false); }
  }, [endpoint, userId, subPath]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = formTransform ? formTransform(values) : values;
      if (editing) (payload as Record<string, unknown>).id = editing.id;
      await apiClient.post(`${endpoint}/${userId}/${subPath}`, payload);
      message.success('Đã lưu');
      setModal(false);
      setEditing(null);
      form.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      if (err?.response?.data?.message) message.error(err.response.data.message);
    }
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`${endpoint}/${subPath}/${id}`);
    message.success('Đã xóa');
    load();
  };

  const handleEdit = (row: T) => {
    setEditing(row);
    form.resetFields();
    form.setFieldsValue(valueTransform ? valueTransform(row as Record<string, unknown>) : row);
    setModal(true);
  };

  const cols = [
    ...renderColumns(),
    {
      title: 'Hành động',
      width: 140,
      render: (_: unknown, r: T) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
          <Popconfirm title="Xóa?" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditing(null);
          form.resetFields();
          setModal(true);
        }}>
          Thêm mới
        </Button>
      </Space>
      <Table rowKey="id" dataSource={items} loading={loading} columns={cols} pagination={{ pageSize: 10 }} />
      <Modal
        title={editing ? 'Sửa' : 'Thêm mới'}
        open={modal}
        onOk={handleSave}
        onCancel={() => { setModal(false); setEditing(null); form.resetFields(); }}
        okText="Lưu"
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">{formItems()}</Form>
      </Modal>
    </>
  );
}
