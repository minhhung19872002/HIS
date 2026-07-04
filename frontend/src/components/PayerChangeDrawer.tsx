/**
 * PayerChangeDrawer — Đổi đối tượng thanh toán per-record + xem audit log (#127)
 * Dùng cho màn hình Reception, Billing v1/v2.
 */
import { useState } from 'react';
import { fmtDateTime } from '../utils/format';
import {
  Drawer,
  Form,
  Select,
  Input,
  Button,
  Alert,
  Table,
  Tag,
  Space,
  Descriptions,
  Tabs,
  message,
  Spin,
} from 'antd';
import { useEffect } from 'react';
import {
  changeObjectForRecord,
  getPayerChangeHistory,
  OBJECT_TYPE_LABELS,
  type ChangeObjectResult,
  type PayerChangeLogDto,
} from '../api/reassignObject';

interface Props {
  open: boolean;
  onClose: () => void;
  medicalRecordId: string;
  patientName?: string;
  onSuccess?: (result: ChangeObjectResult) => void;
}

const OBJECT_TYPE_OPTIONS = [
  { value: 1, label: 'BHYT' },
  { value: 2, label: 'Viện phí' },
  { value: 3, label: 'Dịch vụ' },
  { value: 4, label: 'Khám sức khỏe' },
];

const SCOPE_COLORS: Record<string, string> = {
  record: 'purple',
  service_line: 'blue',
  drug_line: 'green',
};

const SCOPE_LABELS: Record<string, string> = {
  record: 'Toàn hồ sơ',
  service_line: 'Dịch vụ',
  drug_line: 'Thuốc/VTYT',
};

const historyColumns = [
  {
    title: 'Phạm vi',
    dataIndex: 'changeScope',
    key: 'changeScope',
    width: 100,
    render: (v: string) => (
      <Tag color={SCOPE_COLORS[v] || 'default'}>{SCOPE_LABELS[v] || v}</Tag>
    ),
  },
  {
    title: 'Từ',
    dataIndex: 'fromObjectType',
    key: 'fromObjectType',
    width: 80,
    render: (v: number) => <Tag>{OBJECT_TYPE_LABELS[v] || v}</Tag>,
  },
  {
    title: 'Sang',
    dataIndex: 'toObjectType',
    key: 'toObjectType',
    width: 80,
    render: (v: number) => <Tag color="blue">{OBJECT_TYPE_LABELS[v] || v}</Tag>,
  },
  {
    title: 'Tiền BN cũ',
    dataIndex: 'oldPatientAmount',
    key: 'oldPatientAmount',
    width: 110,
    render: (v?: number) => v != null ? v.toLocaleString('vi-VN') + 'đ' : '—',
  },
  {
    title: 'Tiền BN mới',
    dataIndex: 'newPatientAmount',
    key: 'newPatientAmount',
    width: 110,
    render: (v?: number) => v != null ? v.toLocaleString('vi-VN') + 'đ' : '—',
  },
  {
    title: 'Lý do',
    dataIndex: 'reason',
    key: 'reason',
    ellipsis: true,
  },
  {
    title: 'Người đổi',
    dataIndex: 'changedByName',
    key: 'changedByName',
    width: 120,
  },
  {
    title: 'Thời gian',
    dataIndex: 'changedAt',
    key: 'changedAt',
    width: 140,
    render: (v: string) => fmtDateTime(v),
  },
];

export default function PayerChangeDrawer({
  open,
  onClose,
  medicalRecordId,
  patientName,
  onSuccess,
}: Props) {
  const [form] = Form.useForm<{ toObjectType: number; reason: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ChangeObjectResult | null>(null);
  const [history, setHistory] = useState<PayerChangeLogDto[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('change');

  const loadHistory = async () => {
    if (!medicalRecordId) return;
    setLoadingHistory(true);
    try {
      const logs = await getPayerChangeHistory(medicalRecordId);
      setHistory(logs);
    } catch {
      // history load failure is non-critical
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (open && activeTab === 'history') {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const res = await changeObjectForRecord({
        medicalRecordId,
        toObjectType: values.toObjectType,
        reason: values.reason,
      });
      setResult(res);
      message.success(`Đã đổi đối tượng ${res.affectedLineCount} dòng`);
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

  const handleClose = () => {
    form.resetFields();
    setResult(null);
    setActiveTab('change');
    onClose();
  };

  return (
    <Drawer
      title={`Đổi đối tượng thanh toán: ${patientName || medicalRecordId}`}
      open={open}
      onClose={handleClose}
      width={680}
      destroyOnHidden
      footer={
        activeTab === 'change' && !result ? (
          <Space>
            <Button onClick={handleClose}>Hủy</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              Thực hiện đổi đối tượng
            </Button>
          </Space>
        ) : null
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={key => {
          setActiveTab(key);
          if (key === 'history') loadHistory();
        }}
        items={[
          {
            key: 'change',
            label: 'Đổi đối tượng',
            children: result ? (
              <>
                <Alert
                  title="Hoàn thành"
                  type="success"
                  showIcon
                  style={{ marginBottom: 12 }}
                  description={`Đã cập nhật ${result.affectedLineCount} dòng.`}
                />
                <Descriptions size="small" column={2} bordered>
                  <Descriptions.Item label="Đối tượng mới">
                    <Tag color="blue">{OBJECT_TYPE_LABELS[result.toObjectType]}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Số dòng đổi">
                    <Tag color="blue">{result.affectedLineCount}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Tiền BN cũ">
                    {result.oldPatientAmount.toLocaleString('vi-VN')}đ
                  </Descriptions.Item>
                  <Descriptions.Item label="Tiền BN mới">
                    {result.newPatientAmount.toLocaleString('vi-VN')}đ
                  </Descriptions.Item>
                  <Descriptions.Item label="Chênh lệch" span={2}>
                    <Tag color={result.deltaPatientAmount >= 0 ? 'red' : 'green'}>
                      {result.deltaPatientAmount >= 0 ? '+' : ''}
                      {result.deltaPatientAmount.toLocaleString('vi-VN')}đ
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
                {result.warnings.length > 0 && (
                  <Alert
                    title="Cảnh báo"
                    type="warning"
                    showIcon
                    style={{ marginTop: 12 }}
                    description={<ul>{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
                  />
                )}
                <Button style={{ marginTop: 16 }} onClick={handleClose}>Đóng</Button>
              </>
            ) : (
              <>
                <Alert
                  title="Chỉ áp dụng cho dịch vụ chưa thanh toán và thuốc chưa phát"
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
                    <Select options={OBJECT_TYPE_OPTIONS} placeholder="Chọn đối tượng mới" />
                  </Form.Item>
                  <Form.Item
                    name="reason"
                    label="Lý do (bắt buộc, lưu audit)"
                    rules={[{ required: true, min: 5, message: 'Lý do tối thiểu 5 ký tự' }]}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="VD: Thẻ BHYT hết hạn, chuyển sang thu phí dịch vụ"
                    />
                  </Form.Item>
                </Form>
              </>
            ),
          },
          {
            key: 'history',
            label: 'Lịch sử đổi đối tượng',
            children: (
              <Spin spinning={loadingHistory}>
                <Table
                  dataSource={history}
                  columns={historyColumns}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 20 }}
                  scroll={{ x: 900 }}
                  locale={{ emptyText: 'Chưa có lần đổi đối tượng nào' }}
                />
              </Spin>
            ),
          },
        ]}
      />
    </Drawer>
  );
}
