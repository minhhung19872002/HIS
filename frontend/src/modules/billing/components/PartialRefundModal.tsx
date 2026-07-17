/**
 * Partial refund modal — tick từng dòng dịch vụ/thuốc để hoàn.
 * Fill gap cho Sprint 3 Item 2.5.
 */

import { useEffect, useState } from 'react';
import {
  Modal, Form, Input, Radio, Table, Alert, Tag, Space, message,
  Typography, Select,
} from 'antd';
import {
  createRefund, getRefundableItems, getPatientPayments,
  type RefundableItemDto, type PatientPaymentBriefDto,
} from '../api/billing';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  patientId: string;
  patientName?: string;
  originalPaymentId?: string;
  medicalRecordId?: string;
}

type ServiceRow = RefundableItemDto;

export default function PartialRefundModal({
  open, onClose, onSuccess, patientId, patientName, originalPaymentId, medicalRecordId,
}: Props) {
  const [form] = Form.useForm<{
    refundType: 1 | 2;
    mode: 'full' | 'detail';
    refundMethod: number;
    reason: string;
    bankAccount?: string;
    bankName?: string;
  }>();
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [payments, setPayments] = useState<PatientPaymentBriefDto[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | undefined>(originalPaymentId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      // #419: interceptor apiClient đã unwrap envelope — nhận payload trực tiếp
      const [items, pays] = await Promise.all([
        getRefundableItems(patientId, medicalRecordId).catch(() => ({ data: [] as RefundableItemDto[] })),
        getPatientPayments(patientId).catch(() => ({ data: [] as PatientPaymentBriefDto[] })),
      ]);
      setRows(Array.isArray(items.data) ? items.data : []);
      const payList = Array.isArray(pays.data) ? pays.data : [];
      setPayments(payList);
      // Mặc định: prop truyền vào (nếu có trong list) > phiếu mới nhất
      setSelectedPaymentId(
        originalPaymentId && payList.some(p => p.id === originalPaymentId)
          ? originalPaymentId
          : payList[0]?.id,
      );
    } catch {
      setRows([]);
      setPayments([]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ refundType: 2, mode: 'full', refundMethod: 1 });
      setSelectedIds(new Set());
      loadData();
    }
  }, [open, patientId]);

  const selectedPayment = payments.find(p => p.id === selectedPaymentId);
  const selectedItems = rows.filter(r => selectedIds.has(r.id));
  const totalSelected = selectedItems.reduce((sum, r) => sum + r.patientAmount, 0);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // #419: backend RefundType=2 bắt buộc phiếu thanh toán gốc
      if (!selectedPayment) {
        message.error('Chọn phiếu thanh toán gốc để hoàn');
        return;
      }
      if (values.mode === 'detail' && selectedIds.size === 0) {
        message.error('Chọn ít nhất 1 mục để hoàn chi tiết');
        return;
      }
      if (values.mode === 'detail') {
        // Validate BHYT rules
        const bhytService = selectedItems.filter(r => r.itemType === 'service' && r.patientType === 1 && r.hasResult);
        if (bhytService.length > 0) {
          message.error(`${bhytService.length} CLS BHYT đã có kết quả — không thể hoàn chi tiết. Phải hủy KQ trước.`);
          return;
        }
        const bhytMed = selectedItems.filter(r => r.itemType === 'medicine' && r.patientType === 1);
        if (bhytMed.length > 0) {
          message.error('BHYT không cho hoàn chi tiết thuốc. Phải hoàn toàn bộ toa.');
          return;
        }
      }
      // #419: full = hoàn theo số tiền phiếu gốc; detail = tổng các dòng đã tick
      const refundAmount = values.mode === 'detail' ? totalSelected : selectedPayment.finalAmount;
      if (refundAmount <= 0) {
        message.error('Số tiền hoàn phải lớn hơn 0');
        return;
      }
      if (refundAmount > selectedPayment.finalAmount) {
        message.error(
          `Tổng hoàn (${refundAmount.toLocaleString('vi-VN')}đ) vượt quá số tiền phiếu gốc (${selectedPayment.finalAmount.toLocaleString('vi-VN')}đ)`,
        );
        return;
      }
      setSubmitting(true);
      await createRefund({
        patientId,
        refundType: values.refundType,
        originalPaymentId: selectedPayment.id,
        refundAmount,
        refundMethod: values.refundMethod,
        bankAccount: values.bankAccount,
        bankName: values.bankName,
        reason: values.reason,
        items: values.mode === 'detail'
          ? selectedItems.map(r => ({
              itemId: r.id,
              itemType: r.itemType,
              refundAmount: r.patientAmount,
            }))
          : undefined,
      });
      message.success(`Đã tạo phiếu hoàn ${refundAmount.toLocaleString('vi-VN')}đ — chờ duyệt`);
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      if (err?.response?.data?.message) message.error(err.response.data.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Hoàn trả — ${patientName || ''}`}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="Tạo phiếu hoàn"
      okButtonProps={{ disabled: !selectedPayment }}
      confirmLoading={submitting}
      width={900}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        {!loading && payments.length === 0 && (
          <Alert
            title="Bệnh nhân chưa có phiếu thanh toán nào đã thu — không thể tạo phiếu hoàn"
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
          />
        )}
        <Form.Item label="Phiếu thanh toán gốc" required>
          <Select
            value={selectedPaymentId}
            onChange={setSelectedPaymentId}
            loading={loading}
            placeholder="— Chọn phiếu thanh toán đã thu —"
            options={payments.map(p => ({
              value: p.id,
              label: `${p.receiptCode} · ${new Date(p.receiptDate).toLocaleDateString('vi-VN')} · ${p.finalAmount.toLocaleString('vi-VN')}đ`,
            }))}
          />
        </Form.Item>
        <Form.Item name="mode" label="Phạm vi hoàn">
          <Radio.Group>
            <Radio value="full">Hoàn toàn bộ phiếu gốc{selectedPayment ? ` (${selectedPayment.finalAmount.toLocaleString('vi-VN')}đ)` : ''}</Radio>
            <Radio value="detail">Hoàn chi tiết (tick từng mục)</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(p, c) => p.mode !== c.mode}>
          {({ getFieldValue }) => getFieldValue('mode') === 'detail' && (
            <>
              <Alert
                title="Quy tắc hoàn chi tiết"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li>BHYT: không hoàn chi tiết thuốc — phải hoàn toàn bộ toa.</li>
                    <li>BHYT: không hoàn CLS đã có kết quả — phải hủy KQ trước.</li>
                    <li>Thu phí: hoàn chi tiết tự do hơn.</li>
                  </ul>
                }
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
              />
              <Table<ServiceRow>
                rowKey="id"
                dataSource={rows}
                loading={loading}
                pagination={{ pageSize: 10 }}
                size="small"
                rowSelection={{
                  selectedRowKeys: Array.from(selectedIds),
                  onChange: (keys) => setSelectedIds(new Set(keys as string[])),
                  getCheckboxProps: (r) => {
                    if (r.itemType === 'service' && r.patientType === 1 && r.hasResult) {
                      return { disabled: true };
                    }
                    if (r.itemType === 'medicine' && r.patientType === 1) {
                      return { disabled: true };
                    }
                    return {};
                  },
                }}
                columns={[
                  {
                    title: 'Loại',
                    dataIndex: 'itemType',
                    width: 80,
                    render: (t: string) => t === 'service' ? <Tag color="blue">DV</Tag> : <Tag color="purple">Thuốc</Tag>,
                  },
                  { title: 'Tên', dataIndex: 'name' },
                  { title: 'SL', dataIndex: 'quantity', width: 60, align: 'right' },
                  {
                    title: 'Đối tượng',
                    dataIndex: 'patientType',
                    width: 90,
                    render: (t: number) => t === 1 ? <Tag color="green">BHYT</Tag> : <Tag>Thu phí</Tag>,
                  },
                  {
                    title: 'BN phải trả',
                    dataIndex: 'patientAmount',
                    width: 120,
                    align: 'right',
                    render: (v: number) => v.toLocaleString('vi-VN'),
                  },
                  {
                    title: 'Trạng thái',
                    width: 120,
                    render: (_, r) => {
                      if (r.itemType === 'service' && r.hasResult) return <Tag color="orange">Đã có KQ</Tag>;
                      if (r.itemType === 'medicine' && r.isDispensed) return <Tag color="red">Đã phát</Tag>;
                      return <Tag color="green">Có thể hoàn</Tag>;
                    },
                  },
                ]}
                summary={() => (
                  <Table.Summary>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={4} align="right">
                        <strong>Tổng chọn hoàn:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong>{totalSelected.toLocaleString('vi-VN')}đ</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} />
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </>
          )}
        </Form.Item>

        <Form.Item name="refundMethod" label="Phương thức hoàn" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 1, label: 'Tiền mặt' },
              { value: 2, label: 'Chuyển khoản' },
              { value: 3, label: 'Ví điện tử' },
              { value: 4, label: 'Hoàn về thẻ (VNPAY refund)' },
            ]}
          />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(p, c) => p.refundMethod !== c.refundMethod}>
          {({ getFieldValue }) => getFieldValue('refundMethod') === 2 && (
            <Space style={{ width: '100%' }}>
              <Form.Item name="bankName" label="Ngân hàng"><Input placeholder="VD: VCB" /></Form.Item>
              <Form.Item name="bankAccount" label="Số tài khoản"><Input /></Form.Item>
            </Space>
          )}
        </Form.Item>

        <Form.Item name="reason" label="Lý do hoàn" rules={[{ required: true, min: 5 }]}>
          <Input.TextArea rows={2} placeholder="VD: BN từ chối làm CLS, hoàn tiền" />
        </Form.Item>

        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          Sau khi tạo phiếu hoàn, cần kế toán phê duyệt trước khi chi trả.
        </Text>
      </Form>
    </Modal>
  );
}
