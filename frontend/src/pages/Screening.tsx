import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select,
  DatePicker, Tag, Tabs, message, Spin, Statistic, Row, Col, Descriptions,
  Tooltip, Segmented
} from 'antd';
import {
  HeartOutlined, PlusOutlined, ReloadOutlined, SearchOutlined,
  CheckCircleOutlined, ExperimentOutlined, PrinterOutlined, EyeOutlined,
  UserOutlined, WomanOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ScreeningRequest, ScreeningResult } from '../api/screening';
import * as screeningApi from '../api/screening';

const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: 'Chờ xử lý', color: 'default' },
  1: { text: 'Đã lấy mẫu', color: 'blue' },
  2: { text: 'Đang XN', color: 'processing' },
  3: { text: 'Có kết quả', color: 'warning' },
  4: { text: 'Hoàn thành', color: 'success' },
};

const interpretationColors: Record<string, string> = {
  normal: 'green', borderline: 'gold', abnormal: 'orange', critical: 'red',
};

const Screening: React.FC = () => {
  const [screeningType, setScreeningType] = useState<string>('newborn');
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<ScreeningRequest[]>([]);
  const [searchText, setSearchText] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ScreeningRequest | null>(null);
  const [createForm] = Form.useForm();
  const [resultForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await screeningApi.getScreeningRequests({ type: screeningType, keyword: searchText || undefined });
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      message.warning('Không thể tải dữ liệu sàng lọc');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [screeningType, searchText]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      values.screeningType = screeningType;
      if (values.birthDate) values.birthDate = values.birthDate.format('YYYY-MM-DD');
      if (values.lastMenstrualDate) values.lastMenstrualDate = values.lastMenstrualDate.format('YYYY-MM-DD');
      if (values.ultrasoundDate) values.ultrasoundDate = values.ultrasoundDate.format('YYYY-MM-DD');
      await screeningApi.createScreeningRequest(values);
      message.success('Tạo yêu cầu sàng lọc thành công');
      setCreateModalOpen(false);
      createForm.resetFields();
      fetchData();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  const showDetail = async (record: ScreeningRequest) => {
    setSelectedRequest(record);
    setDetailModalOpen(true);
  };

  const getFilteredRequests = (statusFilter?: number[]) => {
    if (!statusFilter) return requests;
    return requests.filter(r => statusFilter.includes(r.status));
  };

  const newbornColumns = [
    { title: 'Mã YC', dataIndex: 'requestCode', key: 'requestCode', width: 100 },
    { title: 'Tên trẻ', dataIndex: 'babyName', key: 'babyName', width: 130 },
    { title: 'Giới', dataIndex: 'babyGender', key: 'babyGender', width: 60, render: (v: number) => v === 1 ? 'Nam' : 'Nữ' },
    { title: 'Cân nặng', dataIndex: 'birthWeight', key: 'birthWeight', width: 80, render: (v: number) => v ? `${v}g` : '-' },
    { title: 'Tuổi thai', dataIndex: 'gestationalAge', key: 'gestationalAge', width: 80, render: (v: number) => v ? `${v} tuần` : '-' },
    { title: 'Ngày sinh', dataIndex: 'birthDate', key: 'birthDate', width: 100, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
    { title: 'Mẹ', dataIndex: 'motherName', key: 'motherName', width: 130 },
    { title: 'PP sinh', dataIndex: 'deliveryMethod', key: 'deliveryMethod', width: 80 },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 100,
      render: (v: number) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag> },
    { title: 'Kết quả', key: 'results', width: 100,
      render: (_: unknown, r: ScreeningRequest) => {
        if (!r.results?.length) return <Tag>Chưa có</Tag>;
        const abnormal = r.results.filter(res => res.interpretation !== 'normal').length;
        return abnormal > 0 ? <Tag color="red">{abnormal} bất thường</Tag> : <Tag color="green">Bình thường</Tag>;
      },
    },
    {
      title: 'Thao tác', key: 'action', width: 80,
      render: (_: unknown, record: ScreeningRequest) => (
        <Tooltip title="Chi tiết"><Button size="small" icon={<EyeOutlined />} onClick={() => showDetail(record)} /></Tooltip>
      ),
    },
  ];

  const prenatalColumns = [
    { title: 'Mã YC', dataIndex: 'requestCode', key: 'requestCode', width: 100 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 140 },
    { title: 'Mã BN', dataIndex: 'patientCode', key: 'patientCode', width: 90 },
    { title: 'Tuổi mẹ', dataIndex: 'maternalAge', key: 'maternalAge', width: 70 },
    { title: 'Thai kỳ (tuần)', dataIndex: 'pregnancyWeek', key: 'pregnancyWeek', width: 100 },
    { title: 'PARA', key: 'para', width: 80, render: (_: unknown, r: ScreeningRequest) => `G${r.gravida || 0}P${r.para || 0}` },
    { title: 'Ngày KKC', dataIndex: 'lastMenstrualDate', key: 'lastMenstrualDate', width: 100, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 100,
      render: (v: number) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag> },
    { title: 'Kết quả', key: 'results', width: 100,
      render: (_: unknown, r: ScreeningRequest) => {
        if (!r.results?.length) return <Tag>Chưa có</Tag>;
        const abnormal = r.results.filter(res => res.interpretation !== 'normal').length;
        return abnormal > 0 ? <Tag color="red">{abnormal} nguy cơ</Tag> : <Tag color="green">Thấp</Tag>;
      },
    },
    {
      title: 'Thao tác', key: 'action', width: 80,
      render: (_: unknown, record: ScreeningRequest) => (
        <Tooltip title="Chi tiết"><Button size="small" icon={<EyeOutlined />} onClick={() => showDetail(record)} /></Tooltip>
      ),
    },
  ];

  const columns = screeningType === 'newborn' ? newbornColumns : prenatalColumns;
  const pendingCount = requests.filter(r => r.status <= 2).length;

  const tabItems = [
    { key: 'pending', label: <span>Chờ xử lý ({pendingCount})</span>,
      children: <Table columns={columns} dataSource={getFilteredRequests([0, 1, 2])} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
    { key: 'completed', label: <span><CheckCircleOutlined /> Hoàn thành</span>,
      children: <Table columns={columns} dataSource={getFilteredRequests([3, 4])} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
    { key: 'all', label: 'Tất cả',
      children: <Table columns={columns} dataSource={requests} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
  ];

  const resultColumns = [
    { title: 'Xét nghiệm', dataIndex: 'testName', key: 'testName' },
    { title: 'Giá trị', dataIndex: 'value', key: 'value', width: 80 },
    { title: 'Đơn vị', dataIndex: 'unit', key: 'unit', width: 70 },
    { title: 'Cutoff', dataIndex: 'cutoff', key: 'cutoff', width: 70 },
    { title: 'Khoảng tham chiếu', dataIndex: 'referenceRange', key: 'referenceRange', width: 130 },
    { title: 'Kết luận', dataIndex: 'interpretation', key: 'interpretation', width: 100,
      render: (v: string) => <Tag color={interpretationColors[v] || 'default'}>{v === 'normal' ? 'Bình thường' : v === 'borderline' ? 'Ranh giới' : v === 'abnormal' ? 'Bất thường' : 'Nguy hiểm'}</Tag> },
    { title: 'Mức nguy cơ', dataIndex: 'riskLevel', key: 'riskLevel', width: 100 },
  ];

  return (
    <Spin spinning={loading}>
      <Card
        title={<span><HeartOutlined /> Sàng lọc sơ sinh & trước sinh</span>}
        extra={
          <Space>
            <Segmented
              value={screeningType}
              onChange={(v) => setScreeningType(v as string)}
              options={[
                { value: 'newborn', label: <span><UserOutlined /> Sơ sinh</span> },
                { value: 'prenatal', label: <span><WomanOutlined /> Trước sinh</span> },
              ]}
            />
            <Input.Search placeholder="Tìm kiếm..." value={searchText} onChange={e => setSearchText(e.target.value)} onSearch={fetchData} style={{ width: 200 }} allowClear />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { createForm.resetFields(); setCreateModalOpen(true); }}>
              {screeningType === 'newborn' ? 'Sàng lọc sơ sinh' : 'Sàng lọc trước sinh'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Statistic title="Tổng yêu cầu" value={requests.length} prefix={<ExperimentOutlined />} /></Col>
          <Col span={6}><Statistic title="Chờ xử lý" value={pendingCount} styles={{ content: { color: '#1890ff' } }} /></Col>
          <Col span={6}><Statistic title="Bất thường" value={requests.filter(r => r.results?.some(res => res.interpretation !== 'normal')).length} styles={{ content: { color: '#cf1322' } }} /></Col>
          <Col span={6}><Statistic title="Hoàn thành" value={requests.filter(r => r.status >= 3).length} styles={{ content: { color: '#52c41a' } }} prefix={<CheckCircleOutlined />} /></Col>
        </Row>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* Create Modal */}
      <Modal title={screeningType === 'newborn' ? 'Sàng lọc sơ sinh' : 'Sàng lọc trước sinh'} open={createModalOpen} onOk={handleCreate}
        onCancel={() => setCreateModalOpen(false)} width={700} destroyOnHidden>
        <Form form={createForm} layout="vertical">
          {screeningType === 'newborn' ? (
            <>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="babyName" label="Tên trẻ" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col span={6}>
                  <Form.Item name="babyGender" label="Giới tính" rules={[{ required: true }]}>
                    <Select options={[{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }]} />
                  </Form.Item>
                </Col>
                <Col span={6}><Form.Item name="birthDate" label="Ngày sinh" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="birthWeight" label="Cân nặng (g)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={300} max={6000} /></Form.Item></Col>
                <Col span={8}><Form.Item name="gestationalAge" label="Tuổi thai (tuần)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={24} max={44} /></Form.Item></Col>
                <Col span={8}><Form.Item name="apgarScore" label="Apgar"><Input placeholder="VD: 8/9" /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="motherName" label="Tên mẹ" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col span={6}><Form.Item name="motherAge" label="Tuổi mẹ"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={6}>
                  <Form.Item name="deliveryMethod" label="PP sinh">
                    <Select options={[{ value: 'vaginal', label: 'Thường' }, { value: 'csection', label: 'Mổ' }, { value: 'vacuum', label: 'Hút' }, { value: 'forceps', label: 'Forceps' }]} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="feedingType" label="Nuôi dưỡng">
                    <Select options={[{ value: 'breastfed', label: 'Bú mẹ' }, { value: 'formula', label: 'Sữa công thức' }, { value: 'mixed', label: 'Hỗn hợp' }]} />
                  </Form.Item>
                </Col>
                <Col span={12}><Form.Item name="birthCondition" label="Tình trạng lúc sinh"><Input /></Form.Item></Col>
              </Row>
            </>
          ) : (
            <>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="patientName" label="Họ tên thai phụ" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col span={6}><Form.Item name="maternalAge" label="Tuổi mẹ" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={6}><Form.Item name="pregnancyWeek" label="Thai kỳ (tuần)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={8} max={42} /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="lastMenstrualDate" label="Ngày KKC"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={8}><Form.Item name="ultrasoundDate" label="Ngày siêu âm"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={4}><Form.Item name="gravida" label="PARA (G)"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item></Col>
                <Col span={4}><Form.Item name="para" label="PARA (P)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
              </Row>
              <Form.Item name="previousConditions" label="Tiền sử thai kỳ"><Input.TextArea rows={2} placeholder="VD: Đái tháo đường thai kỳ, tiền sản giật..." /></Form.Item>
              <Form.Item name="familyHistory" label="Tiền sử gia đình"><Input.TextArea rows={2} placeholder="VD: Bệnh di truyền, dị tật bẩm sinh..." /></Form.Item>
            </>
          )}
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title={`Chi tiết sàng lọc - ${selectedRequest?.requestCode}`} open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)} width={800} footer={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => message.info('Tính năng in đang phát triển')}>In phiếu</Button>
            <Button onClick={() => setDetailModalOpen(false)}>Đóng</Button>
          </Space>
        }>
        {selectedRequest && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã YC">{selectedRequest.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Loại">{selectedRequest.screeningType === 'newborn' ? 'Sơ sinh' : 'Trước sinh'}</Descriptions.Item>
              {selectedRequest.screeningType === 'newborn' ? (
                <>
                  <Descriptions.Item label="Tên trẻ">{selectedRequest.babyName}</Descriptions.Item>
                  <Descriptions.Item label="Giới tính">{selectedRequest.babyGender === 1 ? 'Nam' : 'Nữ'}</Descriptions.Item>
                  <Descriptions.Item label="Cân nặng">{selectedRequest.birthWeight ? `${selectedRequest.birthWeight}g` : '-'}</Descriptions.Item>
                  <Descriptions.Item label="Tuổi thai">{selectedRequest.gestationalAge ? `${selectedRequest.gestationalAge} tuần` : '-'}</Descriptions.Item>
                  <Descriptions.Item label="Ngày sinh">{selectedRequest.birthDate ? dayjs(selectedRequest.birthDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                  <Descriptions.Item label="Apgar">{selectedRequest.apgarScore || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Mẹ">{selectedRequest.motherName}</Descriptions.Item>
                  <Descriptions.Item label="PP sinh">{selectedRequest.deliveryMethod || '-'}</Descriptions.Item>
                </>
              ) : (
                <>
                  <Descriptions.Item label="Thai phụ">{selectedRequest.patientName}</Descriptions.Item>
                  <Descriptions.Item label="Tuổi">{selectedRequest.maternalAge}</Descriptions.Item>
                  <Descriptions.Item label="Thai kỳ">{selectedRequest.pregnancyWeek ? `${selectedRequest.pregnancyWeek} tuần` : '-'}</Descriptions.Item>
                  <Descriptions.Item label="PARA">G{selectedRequest.gravida || 0}P{selectedRequest.para || 0}</Descriptions.Item>
                  <Descriptions.Item label="Ngày KKC">{selectedRequest.lastMenstrualDate ? dayjs(selectedRequest.lastMenstrualDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                  <Descriptions.Item label="Tiền sử">{selectedRequest.previousConditions || '-'}</Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="Trạng thái"><Tag color={statusMap[selectedRequest.status]?.color}>{statusMap[selectedRequest.status]?.text}</Tag></Descriptions.Item>
              <Descriptions.Item label="Ngày YC">{dayjs(selectedRequest.requestDate).format('DD/MM/YYYY')}</Descriptions.Item>
            </Descriptions>
            <h4>Kết quả sàng lọc ({selectedRequest.results?.length || 0})</h4>
            <Table columns={resultColumns} dataSource={selectedRequest.results || []} rowKey="id" size="small" pagination={false}
              locale={{ emptyText: 'Chưa có kết quả' }} />
          </>
        )}
      </Modal>
    </Spin>
  );
};

export default Screening;
