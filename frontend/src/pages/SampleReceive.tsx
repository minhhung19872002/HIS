/**
 * Sample Receive + KTV/Reviewer workflow — N1.16 + N1.17.
 * LIS nhận mẫu / từ chối → KTV nhập KQ → Reviewer duyệt (phải khác KTV).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, Tabs, Table, Button, Space, Input, Modal, Form, message, Tag, Typography, Drawer, Descriptions,
  Divider, Timeline,
} from 'antd';
import {
  ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, ExperimentOutlined, EyeOutlined, CheckOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';

const { Text } = Typography;

interface PendingSample {
  id: string; sampleBarcode?: string; serviceRequestId: string;
  requestCode: string; patientCode: string; patientName: string;
  serviceCode: string; serviceName: string;
  sampleCollectedAt?: string; collectedByUserId?: string;
  status: number;
}

interface DetailStatus {
  id: string; sampleBarcode?: string;
  serviceName: string; patientName: string;
  isSampleCollected: boolean; sampleCollectedAt?: string; collectedByUserId?: string;
  receiveStatus: number; receivedByUserId?: string; receivedAt?: string; rejectReason?: string;
  technicianUserId?: string; technicianRunAt?: string;
  reviewerUserId?: string; reviewedAt?: string;
  status: number; result?: string; conclusion?: string;
}

export default function SampleReceive() {
  const [keyword, setKeyword] = useState('');
  const [samples, setSamples] = useState<PendingSample[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectRow, setRejectRow] = useState<PendingSample | null>(null);
  const [runRow, setRunRow] = useState<PendingSample | null>(null);
  const [reviewRow, setReviewRow] = useState<PendingSample | null>(null);
  const [detailRow, setDetailRow] = useState<DetailStatus | null>(null);
  const [rejectForm] = Form.useForm();
  const [runForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<PendingSample[]>('/sample-receive/pending',
        { params: { keyword } });
      setSamples(data || []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải danh sách thất bại');
    } finally { setLoading(false); }
  }, [keyword]);

  useEffect(() => { load(); }, [load]);

  const accept = async () => {
    if (selected.length === 0) return message.warning('Chưa chọn mẫu');
    try {
      const { data } = await apiClient.post('/sample-receive/accept', { detailIds: selected });
      message.success(`Đã nhận ${data.received} mẫu`);
      setSelected([]);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Nhận mẫu thất bại');
    }
  };

  const submitReject = async () => {
    if (!rejectRow) return;
    const v = await rejectForm.validateFields();
    try {
      await apiClient.post('/sample-receive/reject', { detailId: rejectRow.id, reason: v.reason });
      message.success('Đã từ chối mẫu');
      setRejectRow(null);
      rejectForm.resetFields();
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Từ chối thất bại');
    }
  };

  const submitRun = async () => {
    if (!runRow) return;
    const v = await runForm.validateFields();
    try {
      await apiClient.post('/sample-receive/technician-run', {
        detailId: runRow.id,
        result: v.result,
        resultDescription: v.resultDescription,
      });
      message.success('Đã ghi KQ (chờ duyệt)');
      setRunRow(null);
      runForm.resetFields();
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Ghi KQ thất bại');
    }
  };

  const submitReview = async () => {
    if (!reviewRow) return;
    const v = await reviewForm.validateFields();
    try {
      await apiClient.post('/sample-receive/review', {
        detailId: reviewRow.id,
        conclusion: v.conclusion,
      });
      message.success('Đã duyệt KQ');
      setReviewRow(null);
      reviewForm.resetFields();
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Duyệt thất bại');
    }
  };

  const openDetail = async (row: PendingSample) => {
    try {
      const { data } = await apiClient.get<DetailStatus>(`/sample-receive/status/${row.id}`);
      setDetailRow(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải chi tiết thất bại');
    }
  };

  return (
    <div>
      <Card title={<Space><ExperimentOutlined /> Nhận mẫu + Duyệt KQ (N1.16 + N1.17)</Space>}
        extra={<Space>
          <Input.Search placeholder="Mã mẫu / mã BN / tên / mã phiếu..." style={{ width: 280 }}
            value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} allowClear />
          <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
          <Button type="primary" icon={<CheckCircleOutlined />}
            disabled={selected.length === 0} onClick={accept}>
            Nhận mẫu ({selected.length})
          </Button>
        </Space>}
      >
        <Table
          size="small"
          rowKey="id"
          dataSource={samples}
          loading={loading}
          pagination={{ pageSize: 20 }}
          rowSelection={{ selectedRowKeys: selected, onChange: k => setSelected(k as string[]) }}
          columns={[
            { title: 'Barcode', dataIndex: 'sampleBarcode', width: 180 },
            { title: 'Phiếu', dataIndex: 'requestCode', width: 140 },
            { title: 'Mã BN', dataIndex: 'patientCode', width: 120 },
            { title: 'Họ tên', dataIndex: 'patientName' },
            { title: 'DV XN', dataIndex: 'serviceName' },
            { title: 'Lấy mẫu lúc', dataIndex: 'sampleCollectedAt', width: 140,
              render: (v: string) => v ? dayjs(v).format('DD/MM HH:mm') : '-' },
            { title: 'Thao tác', width: 320,
              render: (_: any, r: PendingSample) => <Space size="small" wrap>
                <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>Xem</Button>
                <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => setRejectRow(r)}>
                  Từ chối
                </Button>
                <Button size="small" icon={<ExperimentOutlined />} onClick={() => setRunRow(r)}>
                  KTV ghi KQ
                </Button>
                <Button size="small" type="primary" icon={<CheckOutlined />}
                  onClick={() => setReviewRow(r)}>
                  Duyệt
                </Button>
              </Space> },
          ]}
        />
      </Card>

      {/* Reject */}
      <Modal open={!!rejectRow} title={`Từ chối mẫu ${rejectRow?.sampleBarcode}`}
        onCancel={() => setRejectRow(null)} onOk={submitReject} okText="Từ chối" okButtonProps={{ danger: true }}>
        <Form form={rejectForm} layout="vertical">
          <Form.Item label="Lý do từ chối" name="reason" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="VD: mẫu vỡ hồng cầu, thiếu số lượng, nhầm ống..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Technician run */}
      <Modal open={!!runRow} title={`KTV ghi KQ - ${runRow?.serviceName}`}
        onCancel={() => setRunRow(null)} onOk={submitRun} okText="Lưu KQ" width={640}>
        <Form form={runForm} layout="vertical">
          <Form.Item label="Kết quả" name="result" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Giá trị kết quả" />
          </Form.Item>
          <Form.Item label="Mô tả / diễn giải" name="resultDescription">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Tag color="orange">Chỉ ghi KQ — chờ người khác duyệt</Tag>
        </Form>
      </Modal>

      {/* Review */}
      <Modal open={!!reviewRow} title={`Duyệt KQ - ${reviewRow?.serviceName}`}
        onCancel={() => setReviewRow(null)} onOk={submitReview} okText="Duyệt" width={640}>
        <Form form={reviewForm} layout="vertical">
          <Tag color="red" style={{ marginBottom: 12 }}>
            Người duyệt phải khác KTV đã ghi KQ (4-eyes principle)
          </Tag>
          <Form.Item label="Kết luận (nếu cần sửa)" name="conclusion">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail drawer */}
      <Drawer open={!!detailRow} title={`Chi tiết mẫu ${detailRow?.sampleBarcode ?? ''}`}
        onClose={() => setDetailRow(null)} size="large">
        {detailRow && (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Barcode">{detailRow.sampleBarcode}</Descriptions.Item>
              <Descriptions.Item label="Dịch vụ">{detailRow.serviceName}</Descriptions.Item>
              <Descriptions.Item label="Bệnh nhân" span={2}>{detailRow.patientName}</Descriptions.Item>
              <Descriptions.Item label="Status">{detailRow.status}</Descriptions.Item>
              <Descriptions.Item label="Receive status">
                {detailRow.receiveStatus === 0 ? 'Chờ nhận'
                 : detailRow.receiveStatus === 1 ? <Tag color="green">Đã nhận</Tag>
                 : <Tag color="red">Từ chối</Tag>}
              </Descriptions.Item>
            </Descriptions>
            <Divider>Timeline</Divider>
            <Timeline
              items={[
                {
                  color: detailRow.isSampleCollected ? 'green' : 'gray',
                  children: <>
                    <Text strong>Lấy mẫu</Text>
                    {detailRow.sampleCollectedAt && <div>{dayjs(detailRow.sampleCollectedAt).format('DD/MM HH:mm')}</div>}
                    {detailRow.collectedByUserId && <div><Text type="secondary">Người lấy: {detailRow.collectedByUserId}</Text></div>}
                  </>,
                },
                {
                  color: detailRow.receiveStatus === 1 ? 'green'
                       : detailRow.receiveStatus === 2 ? 'red' : 'gray',
                  children: <>
                    <Text strong>LIS nhận mẫu</Text>
                    {detailRow.receivedAt && <div>{dayjs(detailRow.receivedAt).format('DD/MM HH:mm')}</div>}
                    {detailRow.receivedByUserId && <div><Text type="secondary">Người nhận: {detailRow.receivedByUserId}</Text></div>}
                    {detailRow.rejectReason && <div style={{ color: '#cf1322' }}>Lý do từ chối: {detailRow.rejectReason}</div>}
                  </>,
                },
                {
                  color: detailRow.technicianUserId ? 'blue' : 'gray',
                  children: <>
                    <Text strong>KTV ghi KQ</Text>
                    {detailRow.technicianRunAt && <div>{dayjs(detailRow.technicianRunAt).format('DD/MM HH:mm')}</div>}
                    {detailRow.technicianUserId && <div><Text type="secondary">KTV: {detailRow.technicianUserId}</Text></div>}
                    {detailRow.result && <div>KQ: {detailRow.result}</div>}
                  </>,
                },
                {
                  color: detailRow.reviewerUserId ? 'green' : 'gray',
                  children: <>
                    <Text strong>Reviewer duyệt</Text>
                    {detailRow.reviewedAt && <div>{dayjs(detailRow.reviewedAt).format('DD/MM HH:mm')}</div>}
                    {detailRow.reviewerUserId && <div><Text type="secondary">Reviewer: {detailRow.reviewerUserId}</Text></div>}
                    {detailRow.conclusion && <div>KL: {detailRow.conclusion}</div>}
                  </>,
                },
              ]}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}
