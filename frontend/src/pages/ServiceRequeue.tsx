/**
 * Cho lại chỉ định CLS sau hoàn hóa đơn — N1.09.
 * Tìm HSBA → chọn các dịch vụ đã hủy/hoàn → nhập lý do → cho lại.
 */

import { useCallback, useState } from 'react';
import {
  Card, Input, Button, Space, Table, Tag, message, Form, Modal, Typography, Alert, Checkbox,
} from 'antd';
import { SearchOutlined, RedoOutlined, UndoOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';

const { Text } = Typography;

interface CancelledService {
  id: string;
  serviceRequestId: string;
  requestCode: string;
  requestDate: string;
  serviceCode: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  patientAmount: number;
  insuranceAmount: number;
  note?: string;
  cancelledAt?: string;
}

export default function ServiceRequeue() {
  const [keyword, setKeyword] = useState('');
  const [medicalRecord, setMedicalRecord] = useState<{ id: string; code: string; patientName: string } | null>(null);
  const [services, setServices] = useState<CancelledService[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form] = Form.useForm();

  const search = useCallback(async () => {
    if (!keyword) return;
    setLoading(true);
    try {
      // Lookup medical record by code OR patient search
      const { data: r } = await apiClient.get('/examination/medical-records/search', {
        params: { keyword, pageSize: 1 },
      }).catch(() => ({ data: { items: [] } }));
      const item = (r?.items || [])[0];
      if (!item) {
        message.warning('Không tìm thấy hồ sơ bệnh án');
        setServices([]);
        setMedicalRecord(null);
        return;
      }
      setMedicalRecord({
        id: item.id,
        code: item.medicalRecordCode,
        patientName: item.patientName || item.patient?.fullName || '',
      });
      const { data } = await apiClient.get<CancelledService[]>(
        `/service-refund/cancelled-services/${item.id}`
      );
      setServices(data || []);
      setSelected([]);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải dữ liệu thất bại');
    } finally { setLoading(false); }
  }, [keyword]);

  const submitRequeue = async () => {
    const v = await form.validateFields();
    try {
      const { data } = await apiClient.post('/service-refund/requeue', {
        serviceRequestDetailIds: selected,
        reason: v.reason,
        keepAsPaid: v.keepAsPaid ?? true,
      });
      message.success(`Đã cho lại ${data.requeued}/${data.total} chỉ định`);
      setConfirmOpen(false);
      form.resetFields();
      await search();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Xử lý thất bại');
    }
  };

  const totalSelectedAmount = services
    .filter(s => selected.includes(s.id))
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <div>
      <Card title={<Space><UndoOutlined /> Cho lại chỉ định CLS sau hoàn hóa đơn (N1.09)</Space>}>
        <Input.Search
          placeholder="Nhập mã HSBA / mã BN / tên BN / SĐT..."
          enterButton={<Button type="primary" icon={<SearchOutlined />}>Tìm HSBA</Button>}
          size="large"
          style={{ marginBottom: 16 }}
          loading={loading}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onSearch={search}
        />

        {medicalRecord && (
          <Alert style={{ marginBottom: 16 }}
            title={<Space>
              <Text strong>Mã HSBA: {medicalRecord.code}</Text>
              <Text>BN: {medicalRecord.patientName}</Text>
              <Tag color="blue">{services.length} dịch vụ đã hủy</Tag>
            </Space>}
            type="info"
          />
        )}

        {services.length > 0 && (
          <>
            <Space style={{ marginBottom: 12 }}>
              <Button type="primary" icon={<RedoOutlined />}
                disabled={selected.length === 0}
                onClick={() => setConfirmOpen(true)}>
                Cho lại ({selected.length}) - {totalSelectedAmount.toLocaleString('vi-VN')}đ
              </Button>
            </Space>

            <Table
              size="small"
              rowKey="id"
              dataSource={services}
              pagination={{ pageSize: 20 }}
              rowSelection={{ selectedRowKeys: selected, onChange: k => setSelected(k as string[]) }}
              columns={[
                { title: 'Phiếu', dataIndex: 'requestCode', width: 140 },
                { title: 'Ngày', dataIndex: 'requestDate', width: 110,
                  render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                { title: 'Mã DV', dataIndex: 'serviceCode', width: 100 },
                { title: 'Tên dịch vụ', dataIndex: 'serviceName' },
                { title: 'SL', dataIndex: 'quantity', width: 60, align: 'right' },
                { title: 'Đơn giá', dataIndex: 'unitPrice', width: 110, align: 'right',
                  render: (v: number) => v?.toLocaleString('vi-VN') },
                { title: 'BN trả', dataIndex: 'patientAmount', width: 110, align: 'right',
                  render: (v: number) => v?.toLocaleString('vi-VN') },
                { title: 'BHYT', dataIndex: 'insuranceAmount', width: 100, align: 'right',
                  render: (v: number) => v?.toLocaleString('vi-VN') },
                { title: 'Hủy lúc', dataIndex: 'cancelledAt', width: 130,
                  render: (v: string) => v ? dayjs(v).format('DD/MM HH:mm') : '-' },
                { title: 'Ghi chú', dataIndex: 'note', ellipsis: true },
              ]}
            />
          </>
        )}

        {medicalRecord && services.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Text type="secondary">Không có dịch vụ CLS đã hủy trong hồ sơ này</Text>
          </div>
        )}
      </Card>

      <Modal
        open={confirmOpen}
        title="Cho lại chỉ định"
        onCancel={() => setConfirmOpen(false)}
        onOk={submitRequeue}
        okText="Xác nhận cho lại"
        width={520}
      >
        <Alert style={{ marginBottom: 16 }}
          title="Dịch vụ sẽ được kích hoạt lại, trạng thái chuyển về 'Chờ'"
          type="warning"
          description={`${selected.length} dịch vụ - ${totalSelectedAmount.toLocaleString('vi-VN')}đ`}
          showIcon
        />
        <Form form={form} layout="vertical" initialValues={{ keepAsPaid: true }}>
          <Form.Item label="Lý do cho lại" name="reason"
            rules={[{ required: true, message: 'Bắt buộc nhập lý do' }]}>
            <Input.TextArea rows={3} placeholder="VD: BN muốn thực hiện lại sau..." />
          </Form.Item>
          <Form.Item name="keepAsPaid" valuePropName="checked">
            <Checkbox>Giữ trạng thái "đã thanh toán" (không cần thu lại)</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
