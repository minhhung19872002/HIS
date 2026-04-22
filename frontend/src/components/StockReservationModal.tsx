/**
 * Modal Xuất dự trù thuốc/VTYT theo bệnh nhân (F10)
 * Sprint 2 Item 2.6 — tái sử dụng PharmacyApproval backend type 2/3
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Modal, Form, Select, Input, Button, Table, InputNumber, Space, message, Tag, Alert,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { createApproval, submitApproval, searchApprovals, APPROVAL_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS, type PharmacyApprovalDto } from '../api/pharmacyApproval';

const OBJECT_OPTIONS = [
  { value: 'BHYT', label: 'BHYT' },
  { value: 'ThuPhi', label: 'Thu phí' },
  { value: 'BHBL', label: 'BHBL' },
  { value: 'HaoPhi', label: 'Hao phí' },
];

interface MedicineOption {
  id: string;
  name: string;
  unit?: string;
  unitPrice?: number;
  batchNumber?: string;
  inventoryItemId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: string;
  patientName?: string;
  medicalRecordId?: string;
  departmentId?: string;
  warehouseId?: string;
  defaultType?: 2 | 3;
  medicines?: MedicineOption[];
}

interface ItemRow {
  id: string;
  medicineId?: string;
  medicineName: string;
  inventoryItemId?: string;
  batchNumber?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  usageInstruction?: string;
  objectType?: string;
}

export default function StockReservationModal({
  open, onClose, patientId, patientName, medicalRecordId, departmentId,
  warehouseId, defaultType = 2, medicines = [],
}: Props) {
  const [form] = Form.useForm<{
    approvalType: number;
    lockedObject: string;
    note?: string;
  }>();
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [existingList, setExistingList] = useState<PharmacyApprovalDto[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) { setRows([]); form.resetFields(); return; }
    form.setFieldsValue({ approvalType: defaultType, lockedObject: 'HaoPhi' });
    loadExisting();
  }, [open, defaultType]);

  const loadExisting = async () => {
    if (!patientId) return;
    setLoadingList(true);
    try {
      const res = await searchApprovals({ patientId, approvalType: defaultType, pageSize: 10 });
      setExistingList(res.items);
    } finally {
      setLoadingList(false);
    }
  };

  const medicineLookup = useMemo(() => new Map(medicines.map(m => [m.id, m])), [medicines]);

  const handleAddRow = () => {
    setRows(rs => [...rs, {
      id: crypto.randomUUID(),
      medicineName: '',
      quantity: 1,
      unitPrice: 0,
      objectType: form.getFieldValue('lockedObject'),
    }]);
  };

  const handleRemoveRow = (id: string) => {
    setRows(rs => rs.filter(r => r.id !== id));
  };

  const handleRowChange = (id: string, patch: Partial<ItemRow>) => {
    setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const handlePickMedicine = (rowId: string, medicineId: string) => {
    const med = medicineLookup.get(medicineId);
    if (!med) return;
    handleRowChange(rowId, {
      medicineId,
      medicineName: med.name,
      unit: med.unit,
      unitPrice: med.unitPrice ?? 0,
      batchNumber: med.batchNumber,
      inventoryItemId: med.inventoryItemId,
    });
  };

  const handleSave = async (andSubmit: boolean) => {
    if (!patientId) { message.error('Chưa chọn bệnh nhân'); return; }
    if (rows.length === 0) { message.warning('Chưa thêm thuốc/VTYT'); return; }

    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const req = {
        approvalType: values.approvalType,
        fromDepartmentId: departmentId,
        toWarehouseId: warehouseId,
        patientId,
        medicalRecordId,
        lockedObject: values.lockedObject,
        note: values.note,
        items: rows.filter(r => r.medicineId).map(r => ({
          medicineId: r.medicineId!,
          inventoryItemId: r.inventoryItemId,
          batchNumber: r.batchNumber,
          requestedQuantity: r.quantity,
          unit: r.unit,
          unitPrice: r.unitPrice,
          usageInstruction: r.usageInstruction,
          objectType: r.objectType || values.lockedObject,
        })),
      };
      const created = await createApproval(req);
      if (andSubmit) {
        await submitApproval(created.id);
        message.success('Đã gửi phiếu xuống kho chờ duyệt');
      } else {
        message.success('Đã lưu phiếu nháp');
      }
      setRows([]);
      loadExisting();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Không lưu được phiếu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`F10 - Xuất dự trù theo BN: ${patientName || patientId}`}
      open={open}
      onCancel={onClose}
      width={960}
      footer={
        <Space>
          <Button onClick={onClose}>Đóng</Button>
          <Button onClick={() => handleSave(false)} loading={submitting}>Lưu nháp</Button>
          <Button type="primary" onClick={() => handleSave(true)} loading={submitting}>
            Lưu & Gửi kho
          </Button>
        </Space>
      }
      destroyOnHidden
    >
      <Form form={form} layout="inline" style={{ marginBottom: 12 }}>
        <Form.Item name="approvalType" label="Loại phiếu" rules={[{ required: true }]}>
          <Select
            style={{ width: 200 }}
            options={[
              { value: 2, label: APPROVAL_TYPE_LABELS[2] },
              { value: 3, label: APPROVAL_TYPE_LABELS[3] },
            ]}
          />
        </Form.Item>
        <Form.Item name="lockedObject" label="Khóa đối tượng" tooltip="Các dòng mới nhập sẽ tự gán đối tượng này">
          <Select style={{ width: 140 }} options={OBJECT_OPTIONS} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input style={{ width: 250 }} />
        </Form.Item>
      </Form>

      <Alert
        title="Nhập nhiều BN trong cùng 1 phiếu: sau khi lưu, tiếp tục thêm BN khác dùng cùng phiếu. Khi đến hạn mức, bấm 'Lưu & Gửi kho' để chuyển toàn bộ danh sách xuống kho Dược."
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
      />

      <Table
        dataSource={rows}
        rowKey="id"
        pagination={false}
        size="small"
        columns={[
          {
            title: 'Thuốc / VTYT',
            width: 300,
            render: (_, row) => (
              <Select
                showSearch
                value={row.medicineId}
                placeholder="Chọn thuốc/VTYT"
                style={{ width: '100%' }}
                onChange={(v) => handlePickMedicine(row.id, v)}
                options={medicines.map(m => ({ value: m.id, label: `${m.name}${m.batchNumber ? ` (Lô ${m.batchNumber})` : ''}` }))}
                optionFilterProp="label"
              />
            ),
          },
          {
            title: 'Đối tượng',
            width: 110,
            render: (_, row) => (
              <Select
                value={row.objectType}
                style={{ width: '100%' }}
                options={OBJECT_OPTIONS}
                onChange={(v) => handleRowChange(row.id, { objectType: v })}
              />
            ),
          },
          {
            title: 'SL',
            width: 80,
            align: 'right',
            render: (_, row) => (
              <InputNumber
                min={1}
                value={row.quantity}
                onChange={(v) => handleRowChange(row.id, { quantity: v ?? 1 })}
              />
            ),
          },
          { title: 'ĐVT', dataIndex: 'unit', width: 60 },
          {
            title: 'Đơn giá',
            dataIndex: 'unitPrice',
            width: 110,
            align: 'right',
            render: (v: number) => v.toLocaleString('vi-VN'),
          },
          {
            title: 'Cách dùng',
            render: (_, row) => (
              <Input
                value={row.usageInstruction}
                placeholder="VD: uống 1v/lần x 3 lần/ngày x 5 ngày"
                onChange={(e) => handleRowChange(row.id, { usageInstruction: e.target.value })}
              />
            ),
          },
          {
            title: '',
            width: 50,
            render: (_, row) => (
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemoveRow(row.id)} />
            ),
          },
        ]}
      />
      <Button type="dashed" block icon={<PlusOutlined />} onClick={handleAddRow} style={{ marginTop: 8 }}>
        Thêm thuốc/VTYT
      </Button>

      <div style={{ marginTop: 20 }}>
        <h4>Lịch sử phiếu gần đây của BN</h4>
        <Table<PharmacyApprovalDto>
          rowKey="id"
          dataSource={existingList}
          loading={loadingList}
          pagination={false}
          size="small"
          columns={[
            { title: 'Mã phiếu', dataIndex: 'approvalCode', width: 200 },
            { title: 'Loại', dataIndex: 'approvalTypeName' },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              width: 120,
              render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
            },
            { title: 'Số dòng', render: (_, r) => r.items.length, width: 80 },
            {
              title: 'Tổng tiền',
              dataIndex: 'totalAmount',
              align: 'right',
              width: 120,
              render: (v: number) => v.toLocaleString('vi-VN'),
            },
            {
              title: 'Ngày',
              dataIndex: 'requestDate',
              width: 140,
              render: (v: string) => new Date(v).toLocaleString('vi-VN'),
            },
          ]}
        />
      </div>
    </Modal>
  );
}
