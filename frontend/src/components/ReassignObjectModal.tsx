import { useState } from 'react';
import { Modal, Form, Select, Radio, Input, Alert, message, Descriptions, Tag } from 'antd';
import { reassignObject, type ReassignObjectResult } from '../api/reassignObject';

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: string;
  patientName?: string;
  onSuccess?: (result: ReassignObjectResult) => void;
}

const PATIENT_TYPES = [
  { value: 1, label: 'BHYT' },
  { value: 2, label: 'Viện phí' },
  { value: 3, label: 'Dịch vụ' },
  { value: 4, label: 'Khám sức khỏe' },
];

export default function ReassignObjectModal({ open, onClose, patientId, patientName, onSuccess }: Props) {
  const [form] = Form.useForm<{
    scope: 'service' | 'medicine';
    mode: 'all' | 'detail';
    fromPatientType?: number;
    toPatientType: number;
    reason: string;
  }>();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReassignObjectResult | null>(null);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const res = await reassignObject({
        patientId,
        scope: values.scope,
        mode: values.mode,
        fromPatientType: values.fromPatientType,
        toPatientType: values.toPatientType,
        reason: values.reason,
      });
      setResult(res);
      message.success(`Đã đổi đối tượng ${res.updatedCount} dòng`);
      onSuccess?.(res);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Đổi đối tượng thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setResult(null);
    onClose();
  };

  return (
    <Modal
      title={`Sửa đối tượng hàng loạt: ${patientName || patientId}`}
      open={open}
      onOk={handleOk}
      onCancel={handleClose}
      confirmLoading={submitting}
      okText={result ? 'Đóng' : 'Thực hiện'}
      cancelText="Hủy"
      width={560}
      destroyOnHidden
    >
      {result ? (
        <>
          <Alert
            title="Hoàn thành"
            type="success"
            showIcon
            style={{ marginBottom: 12 }}
            description={`Đã cập nhật ${result.updatedCount} dòng. Tổng tiền BN phải trả thay đổi: ${result.oldTotal.toLocaleString('vi-VN')}đ → ${result.newTotal.toLocaleString('vi-VN')}đ`}
          />
          {result.warnings.length > 0 && (
            <Alert
              title="Cảnh báo"
              type="warning"
              showIcon
              description={<ul>{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
            />
          )}
          <Descriptions size="small" column={1}>
            <Descriptions.Item label="Số dòng cập nhật">
              <Tag color="blue">{result.updatedCount}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tổng tiền BN cũ">{result.oldTotal.toLocaleString('vi-VN')}đ</Descriptions.Item>
            <Descriptions.Item label="Tổng tiền BN mới">{result.newTotal.toLocaleString('vi-VN')}đ</Descriptions.Item>
          </Descriptions>
        </>
      ) : (
        <>
          <Alert
            title="Chỉ áp dụng cho dịch vụ chưa thanh toán / thuốc chưa phát"
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
          <Form form={form} layout="vertical" initialValues={{ scope: 'service', mode: 'all' }}>
            <Form.Item name="scope" label="Số liệu" rules={[{ required: true }]}>
              <Radio.Group>
                <Radio value="service">Viện phí (CLS, PTTT, khám)</Radio>
                <Radio value="medicine">Thuốc</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="mode" label="Phạm vi" rules={[{ required: true }]}>
              <Radio.Group>
                <Radio value="all">Toàn bộ (tất cả dòng theo filter)</Radio>
                <Radio value="detail" disabled>Chi tiết (chọn từng dòng — sẽ bổ sung)</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="fromPatientType" label="Đối tượng cũ (lọc)" tooltip="Để trống nếu đổi mọi đối tượng">
              <Select options={PATIENT_TYPES} allowClear />
            </Form.Item>
            <Form.Item name="toPatientType" label="Đối tượng mới" rules={[{ required: true }]}>
              <Select options={PATIENT_TYPES} />
            </Form.Item>
            <Form.Item name="reason" label="Lý do (bắt buộc, lưu audit log)" rules={[{ required: true, min: 5 }]}>
              <Input.TextArea rows={3} placeholder="VD: Thẻ BHYT của BN đã hết hạn, chuyển sang thu phí" />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
}
