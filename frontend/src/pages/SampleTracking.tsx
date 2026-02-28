import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Tabs,
  message, Spin, Statistic, Row, Col, Badge, Tooltip, Timeline, Descriptions
} from 'antd';
import {
  AuditOutlined, ReloadOutlined, SearchOutlined, WarningOutlined,
  CheckCircleOutlined, CloseCircleOutlined, UndoOutlined, ScanOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { SampleTrackingEvent, SampleRejection, SampleTrackingSummary } from '../api/sampleTracking';
import * as trackingApi from '../api/sampleTracking';
import BarcodeScanner from '../components/BarcodeScanner';

const eventTypeMap: Record<string, { text: string; color: string }> = {
  collected: { text: 'Lấy mẫu', color: 'blue' },
  received: { text: 'Tiếp nhận', color: 'cyan' },
  rejected: { text: 'Từ chối', color: 'red' },
  reCollected: { text: 'Lấy lại', color: 'orange' },
  processing: { text: 'Đang XN', color: 'processing' },
  completed: { text: 'Hoàn thành', color: 'green' },
  stored: { text: 'Lưu trữ', color: 'purple' },
  retrieved: { text: 'Lấy ra', color: 'gold' },
  disposed: { text: 'Hủy', color: 'default' },
};

const SampleTracking: React.FC = () => {
  const [activeTab, setActiveTab] = useState('rejections');
  const [loading, setLoading] = useState(false);
  const [rejections, setRejections] = useState<SampleRejection[]>([]);
  const [summary, setSummary] = useState<SampleTrackingSummary | null>(null);
  const [timeline, setTimeline] = useState<SampleTrackingEvent[]>([]);
  const [searchText, setSearchText] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState('');
  const [rejectForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rejectionsRes, summaryRes] = await Promise.allSettled([
        trackingApi.getSampleRejections({ keyword: searchText || undefined }),
        trackingApi.getSampleTrackingSummary(),
      ]);
      if (rejectionsRes.status === 'fulfilled') setRejections(Array.isArray(rejectionsRes.value) ? rejectionsRes.value : []);
      if (summaryRes.status === 'fulfilled' && summaryRes.value) setSummary(summaryRes.value);
    } catch {
      message.warning('Không thể tải dữ liệu theo dõi mẫu');
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showTimeline = async (barcode: string) => {
    setSelectedBarcode(barcode);
    try {
      const data = await trackingApi.getSampleTimeline(barcode);
      setTimeline(Array.isArray(data) ? data : []);
    } catch {
      setTimeline([]);
    }
    setTimelineModalOpen(true);
  };

  const handleReject = async () => {
    try {
      const values = await rejectForm.validateFields();
      await trackingApi.rejectSample(values);
      message.success('Đã từ chối mẫu');
      setRejectModalOpen(false);
      rejectForm.resetFields();
      fetchData();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  const handleUndo = async (record: SampleRejection) => {
    Modal.confirm({
      title: 'Hoàn tác từ chối',
      content: `Xác nhận hoàn tác từ chối mẫu ${record.sampleBarcode}?`,
      onOk: async () => {
        try {
          await trackingApi.undoRejection(record.id, { reason: 'Hoàn tác' });
          message.success('Đã hoàn tác');
          fetchData();
        } catch {
          message.warning('Không thể hoàn tác');
        }
      },
    });
  };

  const handleReCollect = async (record: SampleRejection) => {
    try {
      await trackingApi.reCollectSample(record.id);
      message.success('Đã yêu cầu lấy mẫu lại');
      fetchData();
    } catch {
      message.warning('Không thể yêu cầu lấy lại');
    }
  };

  const handleBarcodeScan = (code: string) => {
    setScannerOpen(false);
    showTimeline(code);
  };

  const rejectionColumns = [
    { title: 'Barcode', dataIndex: 'sampleBarcode', key: 'sampleBarcode', width: 120,
      render: (v: string) => <Button type="link" size="small" onClick={() => showTimeline(v)}>{v}</Button> },
    { title: 'Mã YC', dataIndex: 'requestCode', key: 'requestCode', width: 100 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 140 },
    { title: 'Mã BN', dataIndex: 'patientCode', key: 'patientCode', width: 90 },
    { title: 'Lý do từ chối', dataIndex: 'rejectionReason', key: 'rejectionReason', width: 180 },
    { title: 'Mã lý do', dataIndex: 'rejectionCode', key: 'rejectionCode', width: 80 },
    { title: 'Thời gian', dataIndex: 'rejectedAt', key: 'rejectedAt', width: 140, render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: 'Người từ chối', dataIndex: 'rejectedBy', key: 'rejectedBy', width: 120 },
    { title: 'Trạng thái', key: 'state', width: 100,
      render: (_: unknown, r: SampleRejection) => r.isUndone ? <Tag color="green">Đã hoàn tác</Tag> : r.reCollected ? <Tag color="blue">Đã lấy lại</Tag> : <Tag color="red">Từ chối</Tag> },
    {
      title: 'Thao tác', key: 'action', width: 120,
      render: (_: unknown, record: SampleRejection) => (
        <Space>
          {!record.isUndone && !record.reCollected && (
            <>
              <Tooltip title="Hoàn tác"><Button size="small" icon={<UndoOutlined />} onClick={() => handleUndo(record)} /></Tooltip>
              <Tooltip title="Lấy lại"><Button size="small" type="primary" icon={<ReloadOutlined />} onClick={() => handleReCollect(record)} /></Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  const rejectionReasonColumns = [
    { title: 'Lý do', dataIndex: 'reason', key: 'reason' },
    { title: 'Số lần', dataIndex: 'count', key: 'count', width: 80 },
  ];

  const activeRejections = rejections.filter(r => !r.isUndone && !r.reCollected).length;

  const tabItems = [
    { key: 'rejections', label: <span><Badge count={activeRejections} size="small" offset={[8, 0]}><CloseCircleOutlined /> Từ chối mẫu</Badge></span>,
      children: <Table columns={rejectionColumns} dataSource={rejections} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
    { key: 'stats', label: <span><AuditOutlined /> Thống kê</span>,
      children: summary ? (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="Tổng quan mẫu" size="small">
              <Row gutter={16}>
                <Col span={8}><Statistic title="Tổng mẫu" value={summary.totalSamples} /></Col>
                <Col span={8}><Statistic title="Từ chối" value={summary.rejected} styles={{ content: { color: '#cf1322' } }} /></Col>
                <Col span={8}><Statistic title="Tỉ lệ TC" value={`${(summary.rejectionRate * 100).toFixed(1)}%`} styles={{ content: { color: summary.rejectionRate > 0.05 ? '#cf1322' : '#3f8600' } }} /></Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={8}><Statistic title="Đã lấy" value={summary.collected} /></Col>
                <Col span={8}><Statistic title="Đang XN" value={summary.processing} /></Col>
                <Col span={8}><Statistic title="Hoàn thành" value={summary.completed} styles={{ content: { color: '#52c41a' } }} /></Col>
              </Row>
              <div style={{ marginTop: 16 }}><Statistic title="Thời gian XN TB" value={summary.averageTurnaroundMinutes} suffix="phút" /></div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Lý do từ chối hàng đầu" size="small">
              <Table columns={rejectionReasonColumns} dataSource={summary.topRejectionReasons} rowKey="reason" size="small" pagination={false} />
            </Card>
          </Col>
        </Row>
      ) : <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Không có dữ liệu thống kê</div>,
    },
  ];

  return (
    <Spin spinning={loading}>
      <Card
        title={<span><AuditOutlined /> Theo dõi mẫu xét nghiệm</span>}
        extra={
          <Space>
            <Input.Search placeholder="Tìm barcode, BN..." value={searchText} onChange={e => setSearchText(e.target.value)} onSearch={fetchData} style={{ width: 220 }} allowClear />
            <Button icon={<ScanOutlined />} onClick={() => setScannerOpen(true)}>Quét barcode</Button>
            <Button icon={<CloseCircleOutlined />} danger onClick={() => { rejectForm.resetFields(); setRejectModalOpen(true); }}>Từ chối mẫu</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* Reject Sample Modal */}
      <Modal title="Từ chối mẫu" open={rejectModalOpen} onOk={handleReject} onCancel={() => setRejectModalOpen(false)} destroyOnHidden>
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="sampleBarcode" label="Barcode mẫu" rules={[{ required: true }]}><Input addonBefore={<ScanOutlined />} /></Form.Item>
          <Form.Item name="labRequestId" label="Mã yêu cầu XN" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="rejectionCode" label="Mã lý do" rules={[{ required: true }]}>
            <Select options={[
              { value: 'HEM', label: 'HEM - Mẫu vỡ hồng cầu' },
              { value: 'CLT', label: 'CLT - Mẫu đông' },
              { value: 'QNS', label: 'QNS - Không đủ lượng mẫu' },
              { value: 'WRG', label: 'WRG - Sai ống/loại mẫu' },
              { value: 'LBL', label: 'LBL - Sai nhãn/không nhãn' },
              { value: 'TMP', label: 'TMP - Nhiệt độ không đạt' },
              { value: 'OLD', label: 'OLD - Mẫu quá hạn' },
              { value: 'OTH', label: 'OTH - Lý do khác' },
            ]} />
          </Form.Item>
          <Form.Item name="rejectionReason" label="Chi tiết lý do" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Timeline Modal */}
      <Modal title={`Timeline mẫu - ${selectedBarcode}`} open={timelineModalOpen} onCancel={() => setTimelineModalOpen(false)} footer={null} width={600}>
        {timeline.length > 0 ? (
          <Timeline
            items={timeline.map(event => {
              const info = eventTypeMap[event.eventType] || { text: event.eventType, color: 'default' };
              return {
                color: info.color === 'red' ? 'red' : info.color === 'green' ? 'green' : info.color === 'blue' ? 'blue' : 'gray',
                content: (
                  <div>
                    <strong><Tag color={info.color}>{info.text}</Tag></strong>
                    <span style={{ marginLeft: 8 }}>{dayjs(event.eventDate).format('DD/MM/YYYY HH:mm')}</span>
                    <div style={{ color: '#666' }}>{event.userName}{event.location ? ` - ${event.location}` : ''}</div>
                    {event.reason && <div style={{ color: '#999', fontSize: 12 }}>Lý do: {event.reason}</div>}
                    {event.notes && <div style={{ color: '#999', fontSize: 12 }}>{event.notes}</div>}
                  </div>
                ),
              };
            })}
          />
        ) : <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Không có dữ liệu timeline</div>}
      </Modal>

      {/* Barcode Scanner */}
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScan} />
    </Spin>
  );
};

export default SampleTracking;
