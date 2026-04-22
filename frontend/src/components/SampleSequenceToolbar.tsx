/**
 * Toolbar cho workflow lấy mẫu XN theo MQ Solutions:
 * - Cấp STT tuần tự theo ngày tự động
 * - Thêm XN trên cùng 1 mẫu
 * - Sửa STT
 * - Xem lịch sử lấy mẫu theo đợt
 */

import { useEffect, useState } from 'react';
import { Button, Modal, Form, Input, InputNumber, Select, message, Table, Tag, Space, Drawer } from 'antd';
import { PlusOutlined, BarcodeOutlined, EditOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';

interface Props {
  serviceRequestDetailId?: string;
  patientId?: string;
  existingBarcode?: string;
  onUpdated?: (barcode: string) => void;
}

interface SampleHistoryGroup {
  date: string;
  count: number;
  samples: Array<{
    id: string;
    sampleBarcode: string;
    sampleCollectedAt: string;
    serviceName: string;
    result?: string;
    status: number;
    requestCode: string;
  }>;
}

export default function SampleSequenceToolbar({
  serviceRequestDetailId, patientId, existingBarcode, onUpdated,
}: Props) {
  const [assignLoading, setAssignLoading] = useState(false);
  const [addTestOpen, setAddTestOpen] = useState(false);
  const [addTestForm] = Form.useForm<{ existingBarcode: string; additionalDetailIds: string }>();
  const [editSeqOpen, setEditSeqOpen] = useState(false);
  const [editSeqForm] = Form.useForm<{ newSequenceNumber: number; prefix?: string }>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SampleHistoryGroup[]>([]);

  const handleAssign = async () => {
    if (!serviceRequestDetailId) { message.warning('Chưa chọn XN'); return; }
    setAssignLoading(true);
    try {
      const { data } = await apiClient.post<{ sampleBarcode: string; sequenceNumber: number }>(
        '/sample-collection/assign-sequence',
        { serviceRequestDetailId, preferredPrefix: 'XN' },
      );
      message.success(`Đã cấp STT: ${data.sampleBarcode}`);
      onUpdated?.(data.sampleBarcode);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Cấp STT thất bại');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAddTest = async () => {
    try {
      const values = await addTestForm.validateFields();
      const ids = values.additionalDetailIds.split(',').map(s => s.trim()).filter(Boolean);
      const { data } = await apiClient.post<{ added: number; barcode: string }>(
        '/sample-collection/add-tests',
        { existingBarcode: values.existingBarcode, additionalDetailIds: ids },
      );
      message.success(`Đã thêm ${data.added} XN vào mẫu ${data.barcode}`);
      setAddTestOpen(false);
      addTestForm.resetFields();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Thêm XN thất bại');
    }
  };

  const handleEditSeq = async () => {
    if (!serviceRequestDetailId) return;
    try {
      const values = await editSeqForm.validateFields();
      const { data } = await apiClient.post<{ sampleBarcode: string }>(
        '/sample-collection/update-sequence',
        {
          serviceRequestDetailId,
          newSequenceNumber: values.newSequenceNumber,
          prefix: values.prefix,
        },
      );
      message.success(`Đã sửa STT: ${data.sampleBarcode}`);
      onUpdated?.(data.sampleBarcode);
      setEditSeqOpen(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Sửa STT thất bại');
    }
  };

  useEffect(() => {
    if (!historyOpen || !patientId) return;
    apiClient.get<SampleHistoryGroup[]>(`/sample-collection/history/${patientId}`)
      .then(res => setHistory(res.data))
      .catch(() => setHistory([]));
  }, [historyOpen, patientId]);

  return (
    <>
      <Space wrap>
        <Button
          type="primary"
          icon={<BarcodeOutlined />}
          onClick={handleAssign}
          loading={assignLoading}
          disabled={!serviceRequestDetailId}
        >
          Cấp STT + Barcode
        </Button>
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            if (existingBarcode) addTestForm.setFieldValue('existingBarcode', existingBarcode);
            setAddTestOpen(true);
          }}
        >
          Thêm XN cùng mẫu
        </Button>
        <Button
          icon={<EditOutlined />}
          onClick={() => setEditSeqOpen(true)}
          disabled={!existingBarcode}
        >
          Sửa STT
        </Button>
        {patientId && (
          <Button icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>
            Lịch sử lấy mẫu
          </Button>
        )}
        {existingBarcode && <Tag color="blue">Barcode: {existingBarcode}</Tag>}
      </Space>

      <Modal
        title="Thêm XN trên cùng 1 mẫu bệnh phẩm"
        open={addTestOpen}
        onOk={handleAddTest}
        onCancel={() => setAddTestOpen(false)}
        okText="Thêm XN"
        width={600}
        destroyOnHidden
      >
        <Form form={addTestForm} layout="vertical">
          <Form.Item name="existingBarcode" label="Barcode mẫu hiện có" rules={[{ required: true }]}>
            <Input placeholder="VD: XN-250102-0042" />
          </Form.Item>
          <Form.Item
            name="additionalDetailIds"
            label="Các ServiceRequestDetail ID mới (cách nhau bằng dấu phẩy)"
            rules={[{ required: true }]}
            tooltip="Copy ID các dịch vụ XN mới từ phần chỉ định CLS"
          >
            <Input.TextArea rows={3} placeholder="guid1, guid2, guid3" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Sửa STT mẫu"
        open={editSeqOpen}
        onOk={handleEditSeq}
        onCancel={() => setEditSeqOpen(false)}
        okText="Lưu STT mới"
        destroyOnHidden
      >
        <Form form={editSeqForm} layout="vertical">
          <Form.Item name="newSequenceNumber" label="STT mới" rules={[{ required: true, type: 'number', min: 1 }]}>
            <InputNumber style={{ width: '100%' }} placeholder="Số thứ tự (1-9999)" />
          </Form.Item>
          <Form.Item name="prefix" label="Tiền tố (tùy chọn)">
            <Select
              allowClear
              placeholder="Giữ nguyên prefix hiện tại"
              options={[
                { value: 'XN', label: 'XN (Xét nghiệm chung)' },
                { value: 'HH', label: 'HH (Huyết học)' },
                { value: 'SH', label: 'SH (Sinh hóa)' },
                { value: 'VS', label: 'VS (Vi sinh)' },
                { value: 'MB', label: 'MB (Miễn dịch)' },
                { value: 'GP', label: 'GP (Giải phẫu bệnh)' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Lịch sử lấy mẫu xét nghiệm"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        width={680}
      >
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Chưa có lịch sử lấy mẫu</div>
        ) : history.map((group) => (
          <div key={group.date} style={{ marginBottom: 16 }}>
            <h4>
              {dayjs(group.date).format('DD/MM/YYYY')} <Tag color="blue">{group.count} mẫu</Tag>
            </h4>
            <Table
              size="small"
              dataSource={group.samples}
              rowKey="id"
              pagination={false}
              columns={[
                { title: 'Barcode', dataIndex: 'sampleBarcode', width: 140 },
                { title: 'XN', dataIndex: 'serviceName' },
                {
                  title: 'Giờ',
                  dataIndex: 'sampleCollectedAt',
                  width: 80,
                  render: (v: string) => dayjs(v).format('HH:mm'),
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  width: 100,
                  render: (s: number) => {
                    if (s === 2) return <Tag color="green">Có KQ</Tag>;
                    if (s === 1) return <Tag color="blue">Đang TH</Tag>;
                    if (s === 3) return <Tag color="red">Hủy</Tag>;
                    return <Tag>Chờ</Tag>;
                  },
                },
              ]}
            />
          </div>
        ))}
      </Drawer>
    </>
  );
}
