/**
 * PayerChangeDrugLineButton — Nút đổi đối tượng trên từng dòng thuốc/VTYT tại CĐHA (#137).
 * Đặt trong cột Action của bảng thuốc/VTYT trong màn hình RIS/CĐHA.
 *
 * Usage:
 *   <PayerChangeDrugLineButton
 *     prescriptionDetailId={item.id}
 *     currentObjectType={item.patientType}
 *     itemName={item.itemName}
 *     onSuccess={(result) => { refresh(); }}
 *   />
 */
import { useState } from 'react';
import { Modal, Form, Select, Input, Tag, message, Button, Descriptions, Alert } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import {
  changeObjectForDrugLine,
  OBJECT_TYPE_LABELS,
  type ChangeObjectResult,
} from '../api/reassignObject';

interface Props {
  prescriptionDetailId: string;
  currentObjectType: number;
  itemName?: string;
  onSuccess?: (result: ChangeObjectResult) => void;
  /** Disable khi đơn đã phát */
  disabled?: boolean;
}

const OBJECT_TYPE_OPTIONS = [
  { value: 1, label: 'BHYT' },
  { value: 2, label: 'Viện phí' },
  { value: 3, label: 'Dịch vụ' },
  { value: 4, label: 'Khám sức khỏe' },
];

export default function PayerChangeDrugLineButton({
  prescriptionDetailId,
  currentObjectType,
  itemName,
  onSuccess,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ toObjectType: number; reason: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ChangeObjectResult | null>(null);

  const handleOpen = () => {
    setOpen(true);
    setResult(null);
    form.resetFields();
  };

  const handleClose = () => {
    setOpen(false);
    setResult(null);
    form.resetFields();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const res = await changeObjectForDrugLine({
        prescriptionDetailId,
        toObjectType: values.toObjectType,
        reason: values.reason,
      });
      setResult(res);
      message.success('Đổi đối tượng thành công');
      onSuccess?.(res);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      if (err?.response) {
        message.error(err.response.data?.message || 'Đổi đối tượng thất bại');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        size="small"
        icon={<SwapOutlined />}
        onClick={handleOpen}
        disabled={disabled}
        title="Đổi đối tượng dòng này"
      >
        Đổi ĐT
      </Button>

      <Modal
        title={
          <>
            Đổi đối tượng:{' '}
            <span style={{ fontWeight: 400 }}>{itemName || prescriptionDetailId}</span>
          </>
        }
        open={open}
        onCancel={handleClose}
        onOk={result ? handleClose : handleOk}
        okText={result ? 'Đóng' : 'Xác nhận đổi'}
        cancelText="Hủy"
        confirmLoading={submitting}
        width={480}
        destroyOnHidden
      >
        {result ? (
          <>
            <Alert
              title="Hoàn thành"
              type="success"
              showIcon
              style={{ marginBottom: 12 }}
            />
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Đối tượng cũ">
                <Tag>{OBJECT_TYPE_LABELS[result.fromObjectType]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Đối tượng mới">
                <Tag color="blue">{OBJECT_TYPE_LABELS[result.toObjectType]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tiền BN cũ">
                {result.oldPatientAmount.toLocaleString('vi-VN')}đ
              </Descriptions.Item>
              <Descriptions.Item label="Tiền BN mới">
                {result.newPatientAmount.toLocaleString('vi-VN')}đ
              </Descriptions.Item>
              <Descriptions.Item label="Chênh lệch">
                <Tag color={result.deltaPatientAmount >= 0 ? 'red' : 'green'}>
                  {result.deltaPatientAmount >= 0 ? '+' : ''}
                  {result.deltaPatientAmount.toLocaleString('vi-VN')}đ
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </>
        ) : (
          <>
            <Alert
              title={
                <>
                  Đối tượng hiện tại:{' '}
                  <Tag color="default">{OBJECT_TYPE_LABELS[currentObjectType] || currentObjectType}</Tag>
                </>
              }
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
            />
            <Form form={form} layout="vertical">
              <Form.Item
                name="toObjectType"
                label="Đổi sang đối tượng"
                rules={[{ required: true, message: 'Vui lòng chọn đối tượng' }]}
              >
                <Select
                  options={OBJECT_TYPE_OPTIONS.filter(o => o.value !== currentObjectType)}
                  placeholder="Chọn đối tượng mới"
                />
              </Form.Item>
              <Form.Item
                name="reason"
                label="Lý do (bắt buộc, lưu audit)"
                rules={[{ required: true, min: 5, message: 'Lý do tối thiểu 5 ký tự' }]}
              >
                <Input.TextArea
                  rows={2}
                  placeholder="VD: Thuốc đặc trị — BN hết BHYT, chuyển dịch vụ"
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </>
  );
}
