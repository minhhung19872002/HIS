/**
 * Modal miễn giảm viện phí với lý do chuẩn hóa + duyệt ngưỡng.
 * Fill gap cho Sprint 3 Item 2.4.
 */

import { useState } from 'react';
import { Modal, Form, InputNumber, Select, Input, Alert, Space, Tag, message, Radio } from 'antd';
import apiClient from '../api/client';
import { DISCOUNT_REASONS, DISCOUNT_APPROVAL_THRESHOLD, DISCOUNT_GM_THRESHOLD } from '../constants/discountReasons';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  invoiceId: string;
  totalAmount: number;
  patientName?: string;
}

interface ApproverUser {
  id: string;
  fullName: string;
  username?: string;
}

export default function ApplyDiscountModal({ open, onClose, onSuccess, invoiceId, totalAmount, patientName }: Props) {
  const [form] = Form.useForm<{
    discountType: 1 | 2;
    discountPercent?: number;
    discountAmount?: number;
    discountReasonCode: number;
    discountReason?: string;
    discountNote?: string;
    approverId?: string;
  }>();
  const [computedDiscount, setComputedDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [approvers, setApprovers] = useState<ApproverUser[]>([]);

  const requiresApproval = computedDiscount >= DISCOUNT_APPROVAL_THRESHOLD;
  const requiresGmApproval = computedDiscount >= DISCOUNT_GM_THRESHOLD;

  const recalculate = () => {
    const v = form.getFieldsValue();
    if (v.discountType === 1 && v.discountPercent) {
      setComputedDiscount(Math.round(totalAmount * v.discountPercent / 100));
    } else if (v.discountType === 2 && v.discountAmount) {
      setComputedDiscount(v.discountAmount);
    } else {
      setComputedDiscount(0);
    }
  };

  const loadApprovers = async () => {
    if (approvers.length > 0) return;
    try {
      const { data } = await apiClient.get<{ items?: ApproverUser[] } | ApproverUser[]>('/admin/users', {
        params: { role: 'DepartmentHead,Director,Accountant', pageSize: 100 },
      });
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setApprovers(list);
    } catch { /* ignore */ }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (requiresApproval && !values.approverId) {
        message.error(`Giảm từ ${DISCOUNT_APPROVAL_THRESHOLD.toLocaleString('vi-VN')}đ trở lên phải có người duyệt`);
        return;
      }
      if (requiresGmApproval && values.discountReasonCode !== 4) {
        message.error(`Giảm từ ${DISCOUNT_GM_THRESHOLD.toLocaleString('vi-VN')}đ trở lên phải chọn lý do 'Giám đốc duyệt miễn'`);
        return;
      }
      if (values.discountReasonCode === 6 && !values.discountNote) {
        message.error('Chọn lý do "Khác" phải ghi chi tiết trong ghi chú');
        return;
      }
      setSubmitting(true);
      await apiClient.post('/billingcomplete/invoices/apply-discount', {
        invoiceId,
        discountScope: 1,
        discountType: values.discountType,
        discountPercent: values.discountPercent,
        discountAmount: values.discountType === 2 ? values.discountAmount : undefined,
        discountReason: values.discountReason,
        discountReasonCode: values.discountReasonCode,
        discountNote: values.discountNote,
        approverId: values.approverId,
      });
      message.success('Đã áp dụng giảm giá');
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
      title={`Miễn giảm viện phí${patientName ? ` — ${patientName}` : ''}`}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="Áp dụng giảm"
      confirmLoading={submitting}
      width={600}
      destroyOnHidden
      afterOpenChange={(o) => { if (o) loadApprovers(); }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ discountType: 1, discountReasonCode: 0 }}
        onValuesChange={recalculate}
      >
        <Form.Item label="Tổng hóa đơn">
          <Tag color="blue" style={{ fontSize: 14 }}>
            {totalAmount.toLocaleString('vi-VN')}đ
          </Tag>
        </Form.Item>

        <Form.Item name="discountType" label="Phương thức" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value={1}>Theo phần trăm (%)</Radio>
            <Radio value={2}>Theo số tiền cụ thể</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(p, c) => p.discountType !== c.discountType}>
          {({ getFieldValue }) => getFieldValue('discountType') === 1 ? (
            <Form.Item name="discountPercent" label="% giảm" rules={[{ required: true, type: 'number', min: 1, max: 100 }]}>
              <InputNumber style={{ width: '100%' }} min={1} max={100} suffix="%" />
            </Form.Item>
          ) : (
            <Form.Item name="discountAmount" label="Số tiền giảm" rules={[{ required: true }]}>
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={totalAmount}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                suffix="đ"
              />
            </Form.Item>
          )}
        </Form.Item>

        {computedDiscount > 0 && (
          <Alert
            type={requiresGmApproval ? 'error' : requiresApproval ? 'warning' : 'info'}
            showIcon
            style={{ marginBottom: 12 }}
            title={`Số tiền giảm: ${computedDiscount.toLocaleString('vi-VN')}đ → BN phải trả: ${(totalAmount - computedDiscount).toLocaleString('vi-VN')}đ`}
            description={
              requiresGmApproval
                ? '⚠️ Vượt ngưỡng 5 triệu: BẮT BUỘC Giám đốc duyệt miễn (lý do = 4) + người duyệt'
                : requiresApproval
                ? 'Vượt ngưỡng 500k: bắt buộc có người duyệt (trưởng phòng TCKT hoặc GĐ)'
                : undefined
            }
          />
        )}

        <Form.Item
          name="discountReasonCode"
          label="Lý do miễn giảm (chuẩn hóa)"
          rules={[{ required: true, message: 'Chọn lý do' }]}
        >
          <Select
            options={Object.entries(DISCOUNT_REASONS)
              .filter(([k]) => k !== '0')
              .map(([k, v]) => ({ value: Number(k), label: v }))}
          />
        </Form.Item>

        <Form.Item
          name="discountNote"
          label="Ghi chú"
          tooltip="Bắt buộc nếu chọn lý do 'Khác' (6)"
          rules={[
            ({ getFieldValue }) => ({
              validator: (_, value) => {
                if (getFieldValue('discountReasonCode') === 6 && !value) {
                  return Promise.reject(new Error('Chọn Khác phải ghi chi tiết'));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <Input.TextArea rows={2} placeholder="VD: BN hoàn cảnh khó khăn, có xác nhận địa phương" />
        </Form.Item>

        <Form.Item
          name="approverId"
          label="Người duyệt"
          tooltip="Bắt buộc khi số tiền giảm ≥ 500.000đ"
          rules={[
            () => ({
              validator: (_, value) => {
                if (requiresApproval && !value) {
                  return Promise.reject(new Error('Cần chọn người duyệt'));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <Select
            showSearch
            placeholder="Chọn trưởng phòng TCKT / Giám đốc"
            optionFilterProp="label"
            options={approvers.map(u => ({ value: u.id, label: `${u.fullName}${u.username ? ` (${u.username})` : ''}` }))}
            allowClear
          />
        </Form.Item>

        <Form.Item name="discountReason" label="Ghi chú tự do (tùy chọn)">
          <Input placeholder="Mô tả thêm" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
