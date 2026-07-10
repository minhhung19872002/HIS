/**
 * Toolbar cho workflow lấy mẫu XN theo MQ Solutions:
 * - Cấp STT tuần tự theo ngày tự động
 * - Thêm XN trên cùng 1 mẫu
 * - Sửa STT
 * - Xem lịch sử lấy mẫu theo đợt
 */

import { useEffect, useState } from 'react';
import { Button, Modal, Form, Input, InputNumber, Select, message, Table, Tag, Space, Drawer, DatePicker } from 'antd';
import { PlusOutlined, BarcodeOutlined, EditOutlined, HistoryOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../../../services/apiClient';

interface Props {
  serviceRequestDetailId?: string;
  patientId?: string;
  existingBarcode?: string;
  onUpdated?: (barcode: string) => void;
}

interface SampleAppointment {
  id: string;
  patientId: string;
  patientName?: string;
  patientCode?: string;
  appointmentAt: string;
  recurrenceType: string;
  recurrenceCount: number;
  serviceName?: string;
  note?: string;
  status: string;
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
  // Hẹn lấy mẫu / tái XN
  const [appointOpen, setAppointOpen] = useState(false);
  const [appointForm] = Form.useForm<{
    appointmentAt: Dayjs;
    recurrenceType: string;
    recurrenceCount: number;
    serviceName?: string;
    note?: string;
  }>();
  const [appointList, setAppointList] = useState<SampleAppointment[]>([]);
  const [appointListOpen, setAppointListOpen] = useState(false);

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

  const handleCreateAppoint = async () => {
    if (!patientId) { message.warning('Cần patientId để tạo hẹn'); return; }
    try {
      const values = await appointForm.validateFields();
      await apiClient.post('/sample-collection/appointments', {
        patientId,
        appointmentAt: values.appointmentAt.toISOString(),
        recurrenceType: values.recurrenceType,
        recurrenceCount: values.recurrenceCount ?? 0,
        serviceName: values.serviceName,
        note: values.note,
        serviceRequestDetailId: serviceRequestDetailId ?? null,
      });
      message.success('Đã tạo lịch hẹn lấy mẫu');
      setAppointOpen(false);
      appointForm.resetFields();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tạo lịch hẹn thất bại');
    }
  };

  useEffect(() => {
    if (!appointListOpen || !patientId) return;
    apiClient.get<SampleAppointment[]>('/sample-collection/appointments', { params: { patientId } })
      .then(res => setAppointList(res.data || []))
      .catch(() => setAppointList([]));
  }, [appointListOpen, patientId]);

  const cancelAppoint = async (id: string) => {
    try {
      await apiClient.patch(`/sample-collection/appointments/${id}`, { status: 'Cancelled', note: 'Hủy từ UI' });
      message.success('Đã hủy lịch hẹn');
      setAppointList(prev => prev.map(a => a.id === id ? { ...a, status: 'Cancelled' } : a));
    } catch {
      message.error('Hủy lịch hẹn thất bại');
    }
  };

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
        {patientId && (
          <Button icon={<CalendarOutlined />} onClick={() => setAppointOpen(true)}>
            Hẹn lấy mẫu / tái XN
          </Button>
        )}
        {patientId && (
          <Button icon={<CalendarOutlined />} onClick={() => setAppointListOpen(true)}>
            Lịch hẹn đã đặt
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

      {/* Tạo lịch hẹn lấy mẫu / tái XN */}
      <Modal
        title="Hẹn lấy mẫu / Tái XN định kỳ"
        open={appointOpen}
        onOk={handleCreateAppoint}
        onCancel={() => setAppointOpen(false)}
        okText="Tạo lịch hẹn"
        width={520}
        destroyOnHidden
      >
        <Form form={appointForm} layout="vertical" initialValues={{ recurrenceType: 'None', recurrenceCount: 0 }}>
          <Form.Item name="appointmentAt" label="Ngày giờ hẹn" rules={[{ required: true, message: 'Chọn ngày hẹn' }]}>
            <DatePicker
              showTime
              style={{ width: '100%' }}
              disabledDate={(d) => d && d.isBefore(dayjs(), 'day')}
              format="DD/MM/YYYY HH:mm"
              placeholder="Chọn ngày và giờ hẹn"
            />
          </Form.Item>
          <Form.Item name="recurrenceType" label="Lặp lại">
            <Select options={[
              { value: 'None', label: 'Không lặp' },
              { value: 'Daily', label: 'Hàng ngày' },
              { value: 'Weekly', label: 'Hàng tuần' },
              { value: 'Monthly', label: 'Hàng tháng' },
            ]} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.recurrenceType !== cur.recurrenceType}>
            {({ getFieldValue }) => getFieldValue('recurrenceType') !== 'None' && (
              <Form.Item name="recurrenceCount" label="Số lần lặp (0 = không giới hạn)">
                <InputNumber min={0} max={365} style={{ width: '100%' }} />
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item name="serviceName" label="Loại XN / ghi chú kỹ thuật">
            <Input placeholder="VD: Công thức máu, Sinh hóa toàn bộ…" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Lưu ý đặc biệt cho BN…" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Danh sách lịch hẹn đã đặt */}
      <Drawer
        title="Lịch hẹn lấy mẫu đã đặt"
        open={appointListOpen}
        onClose={() => setAppointListOpen(false)}
        width={680}
      >
        {appointList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Chưa có lịch hẹn nào</div>
        ) : (
          <Table
            size="small"
            dataSource={appointList}
            rowKey="id"
            pagination={false}
            columns={[
              {
                title: 'Ngày hẹn',
                dataIndex: 'appointmentAt',
                width: 140,
                render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
              },
              { title: 'Loại XN', dataIndex: 'serviceName', render: (v?: string) => v || '—' },
              {
                title: 'Lặp',
                dataIndex: 'recurrenceType',
                width: 80,
                render: (v: string, r: SampleAppointment) => {
                  if (v === 'None') return <Tag>Một lần</Tag>;
                  const label: Record<string, string> = { Daily: 'Ngày', Weekly: 'Tuần', Monthly: 'Tháng' };
                  return <Tag color="blue">{label[v] || v}{r.recurrenceCount > 0 ? ` ×${r.recurrenceCount}` : ''}</Tag>;
                },
              },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                width: 100,
                render: (s: string) => {
                  const map: Record<string, { color: string; label: string }> = {
                    Scheduled: { color: 'blue', label: 'Đã hẹn' },
                    Completed: { color: 'green', label: 'Hoàn thành' },
                    Cancelled: { color: 'red', label: 'Đã hủy' },
                  };
                  const m = map[s] || { color: 'default', label: s };
                  return <Tag color={m.color}>{m.label}</Tag>;
                },
              },
              {
                title: '',
                width: 80,
                render: (_: unknown, r: SampleAppointment) =>
                  r.status === 'Scheduled' ? (
                    <Button size="small" danger onClick={() => cancelAppoint(r.id)}>Hủy</Button>
                  ) : null,
              },
            ]}
          />
        )}
      </Drawer>

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
