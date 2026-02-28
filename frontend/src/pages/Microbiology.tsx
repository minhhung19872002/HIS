import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select, DatePicker,
  Tag, Tabs, message, Spin, Statistic, Row, Col, Descriptions, Badge, Tooltip
} from 'antd';
import {
  BugOutlined, PlusOutlined, ReloadOutlined, SearchOutlined,
  CheckCircleOutlined, ExperimentOutlined, FileTextOutlined, EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { MicrobiologyCulture, MicrobiologyOrganism, AntibioticSensitivity } from '../api/microbiology';
import * as microApi from '../api/microbiology';

const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: 'Chờ nuôi cấy', color: 'default' },
  1: { text: 'Đang ủ', color: 'processing' },
  2: { text: 'Phát hiện VK', color: 'warning' },
  3: { text: 'Không mọc', color: 'green' },
  4: { text: 'Đã định danh', color: 'blue' },
  5: { text: 'Hoàn thành', color: 'success' },
};

const Microbiology: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [cultures, setCultures] = useState<MicrobiologyCulture[]>([]);
  const [searchText, setSearchText] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [cultureModalOpen, setCultureModalOpen] = useState(false);
  const [organismModalOpen, setOrganismModalOpen] = useState(false);
  const [astModalOpen, setAstModalOpen] = useState(false);
  const [selectedCulture, setSelectedCulture] = useState<MicrobiologyCulture | null>(null);
  const [selectedOrganism, setSelectedOrganism] = useState<MicrobiologyOrganism | null>(null);
  const [cultureForm] = Form.useForm();
  const [organismForm] = Form.useForm();
  const [astData, setAstData] = useState<AntibioticSensitivity[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await microApi.getMicrobiologyCultures({ keyword: searchText || undefined });
      setCultures(Array.isArray(data) ? data : []);
    } catch {
      message.warning('Không thể tải dữ liệu vi sinh');
      setCultures([]);
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getFilteredCultures = (statusFilter?: number[]) => {
    if (!statusFilter) return cultures;
    return cultures.filter(c => statusFilter.includes(c.status));
  };

  const handleCreateCulture = async () => {
    try {
      const values = await cultureForm.validateFields();
      if (values.cultureDate) values.cultureDate = values.cultureDate.format('YYYY-MM-DDTHH:mm:ss');
      await microApi.createCulture(values);
      message.success('Tạo nuôi cấy thành công');
      setCultureModalOpen(false);
      cultureForm.resetFields();
      fetchData();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  const handleAddOrganism = async () => {
    if (!selectedCulture) return;
    try {
      const values = await organismForm.validateFields();
      await microApi.addOrganism(selectedCulture.id, values);
      message.success('Thêm vi khuẩn thành công');
      setOrganismModalOpen(false);
      organismForm.resetFields();
      fetchData();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  const showDetail = (record: MicrobiologyCulture) => {
    setSelectedCulture(record);
    setDetailModalOpen(true);
  };

  const showAST = (org: MicrobiologyOrganism) => {
    setSelectedOrganism(org);
    setAstData(org.antibiogram || []);
    setAstModalOpen(true);
  };

  const columns = [
    { title: 'Mã YC', dataIndex: 'requestCode', key: 'requestCode', width: 100 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 150 },
    { title: 'Mã BN', dataIndex: 'patientCode', key: 'patientCode', width: 90 },
    { title: 'Loại mẫu', dataIndex: 'sampleType', key: 'sampleType', width: 100 },
    { title: 'Barcode', dataIndex: 'sampleBarcode', key: 'sampleBarcode', width: 110 },
    { title: 'Loại nuôi cấy', dataIndex: 'cultureType', key: 'cultureType', width: 100,
      render: (v: string) => v === 'aerobic' ? 'Hiếu khí' : v === 'anaerobic' ? 'Kỵ khí' : v === 'fungal' ? 'Nấm' : 'Mycobacteria' },
    { title: 'Ngày cấy', dataIndex: 'cultureDate', key: 'cultureDate', width: 100, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 110,
      render: (v: number) => { const s = statusMap[v]; return <Tag color={s?.color}>{s?.text}</Tag>; } },
    { title: 'Vi khuẩn', key: 'organisms', width: 120,
      render: (_: unknown, r: MicrobiologyCulture) => r.organisms?.length > 0
        ? r.organisms.map(o => <Tag key={o.id} color="volcano">{o.organismName}</Tag>)
        : <Tag color="default">Chưa có</Tag> },
    {
      title: 'Thao tác', key: 'action', width: 100,
      render: (_: unknown, record: MicrobiologyCulture) => (
        <Space>
          <Tooltip title="Chi tiết"><Button size="small" icon={<EyeOutlined />} onClick={() => showDetail(record)} /></Tooltip>
        </Space>
      ),
    },
  ];

  const astColumns = [
    { title: 'Kháng sinh', dataIndex: 'antibioticName', key: 'antibioticName' },
    { title: 'MIC', dataIndex: 'mic', key: 'mic', width: 80 },
    { title: 'Zone (mm)', dataIndex: 'zoneDiameter', key: 'zoneDiameter', width: 80 },
    { title: 'Kết quả', dataIndex: 'interpretation', key: 'interpretation', width: 80,
      render: (v: string) => v === 'S' ? <Tag color="green">S</Tag> : v === 'I' ? <Tag color="orange">I</Tag> : <Tag color="red">R</Tag> },
    { title: 'Phương pháp', dataIndex: 'method', key: 'method', width: 100 },
  ];

  const pendingCount = cultures.filter(c => c.status <= 1).length;
  const growthCount = cultures.filter(c => c.status === 2 || c.status === 4).length;

  const tabItems = [
    { key: 'pending', label: <span><Badge count={pendingCount} size="small" offset={[8, 0]}>Chờ / Đang ủ</Badge></span>,
      children: <Table columns={columns} dataSource={getFilteredCultures([0, 1])} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
    { key: 'growth', label: <span><Badge count={growthCount} size="small" offset={[8, 0]}>Phát hiện VK</Badge></span>,
      children: <Table columns={columns} dataSource={getFilteredCultures([2, 4])} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
    { key: 'noGrowth', label: 'Không mọc',
      children: <Table columns={columns} dataSource={getFilteredCultures([3])} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
    { key: 'completed', label: <span><CheckCircleOutlined /> Hoàn thành</span>,
      children: <Table columns={columns} dataSource={getFilteredCultures([5])} rowKey="id" size="small" pagination={{ pageSize: 15 }} /> },
  ];

  return (
    <Spin spinning={loading}>
      <Card
        title={<span><BugOutlined /> Vi sinh (Microbiology)</span>}
        extra={
          <Space>
            <Input.Search placeholder="Tìm kiếm BN, mã YC..." value={searchText} onChange={e => setSearchText(e.target.value)} onSearch={fetchData} style={{ width: 250 }} allowClear />
            <Button icon={<PlusOutlined />} onClick={() => { cultureForm.resetFields(); setCultureModalOpen(true); }}>Tạo nuôi cấy</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Statistic title="Tổng mẫu" value={cultures.length} prefix={<ExperimentOutlined />} /></Col>
          <Col span={6}><Statistic title="Chờ / Đang ủ" value={pendingCount} styles={{ content: { color: '#1890ff' } }} /></Col>
          <Col span={6}><Statistic title="Phát hiện VK" value={growthCount} styles={{ content: { color: '#fa8c16' } }} prefix={<BugOutlined />} /></Col>
          <Col span={6}><Statistic title="Hoàn thành" value={cultures.filter(c => c.status >= 3).length} styles={{ content: { color: '#52c41a' } }} prefix={<CheckCircleOutlined />} /></Col>
        </Row>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* Create Culture Modal */}
      <Modal title="Tạo nuôi cấy" open={cultureModalOpen} onOk={handleCreateCulture} onCancel={() => setCultureModalOpen(false)} width={600} destroyOnHidden>
        <Form form={cultureForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="labRequestId" label="Mã yêu cầu XN" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="sampleType" label="Loại mẫu" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'blood', label: 'Máu' }, { value: 'urine', label: 'Nước tiểu' },
                  { value: 'sputum', label: 'Đờm' }, { value: 'csf', label: 'Dịch não tủy' },
                  { value: 'wound', label: 'Dịch vết thương' }, { value: 'stool', label: 'Phân' },
                  { value: 'tissue', label: 'Mô' }, { value: 'other', label: 'Khác' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cultureType" label="Loại nuôi cấy" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'aerobic', label: 'Hiếu khí' }, { value: 'anaerobic', label: 'Kỵ khí' },
                  { value: 'fungal', label: 'Nấm' }, { value: 'mycobacteria', label: 'Mycobacteria' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="sampleBarcode" label="Barcode mẫu"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Culture Detail Modal */}
      <Modal title={`Chi tiết nuôi cấy - ${selectedCulture?.requestCode}`} open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} width={800} footer={
        <Space>
          <Button onClick={() => { setOrganismModalOpen(true); organismForm.resetFields(); }}>Thêm vi khuẩn</Button>
          <Button onClick={() => setDetailModalOpen(false)}>Đóng</Button>
        </Space>
      }>
        {selectedCulture && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã YC">{selectedCulture.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Bệnh nhân">{selectedCulture.patientName} ({selectedCulture.patientCode})</Descriptions.Item>
              <Descriptions.Item label="Loại mẫu">{selectedCulture.sampleType}</Descriptions.Item>
              <Descriptions.Item label="Barcode">{selectedCulture.sampleBarcode}</Descriptions.Item>
              <Descriptions.Item label="Loại cấy">{selectedCulture.cultureType}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái"><Tag color={statusMap[selectedCulture.status]?.color}>{statusMap[selectedCulture.status]?.text}</Tag></Descriptions.Item>
              <Descriptions.Item label="Ngày cấy">{selectedCulture.cultureDate ? dayjs(selectedCulture.cultureDate).format('DD/MM/YYYY HH:mm') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Ghi chú">{selectedCulture.notes || '-'}</Descriptions.Item>
            </Descriptions>
            <h4>Vi khuẩn phân lập ({selectedCulture.organisms?.length || 0})</h4>
            {selectedCulture.organisms?.length > 0 ? selectedCulture.organisms.map(org => (
              <Card key={org.id} size="small" style={{ marginBottom: 8 }} title={<span><BugOutlined /> {org.organismName}</span>}
                extra={<Button size="small" onClick={() => showAST(org)}>Kháng sinh đồ</Button>}>
                <Descriptions size="small" column={3}>
                  <Descriptions.Item label="Mã">{org.organismCode}</Descriptions.Item>
                  <Descriptions.Item label="Colony">{org.colonyCount || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Gram">{org.gramStain === 'positive' ? <Tag color="blue">Gram(+)</Tag> : org.gramStain === 'negative' ? <Tag color="red">Gram(-)</Tag> : '-'}</Descriptions.Item>
                  <Descriptions.Item label="Hình thái">{org.morphology || '-'}</Descriptions.Item>
                  <Descriptions.Item label="PP định danh">{org.identificationMethod || '-'}</Descriptions.Item>
                </Descriptions>
              </Card>
            )) : <p style={{ color: '#999' }}>Chưa phân lập được vi khuẩn</p>}
          </>
        )}
      </Modal>

      {/* Add Organism Modal */}
      <Modal title="Thêm vi khuẩn" open={organismModalOpen} onOk={handleAddOrganism} onCancel={() => setOrganismModalOpen(false)} destroyOnHidden>
        <Form form={organismForm} layout="vertical">
          <Form.Item name="organismCode" label="Mã vi khuẩn" rules={[{ required: true }]}><Input placeholder="VD: STAAUR" /></Form.Item>
          <Form.Item name="organismName" label="Tên vi khuẩn" rules={[{ required: true }]}><Input placeholder="VD: Staphylococcus aureus" /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="colonyCount" label="Số khuẩn lạc"><Input placeholder="VD: >100,000 CFU/mL" /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="gramStain" label="Nhuộm Gram">
                <Select options={[{ value: 'positive', label: 'Gram (+)' }, { value: 'negative', label: 'Gram (-)' }, { value: 'mixed', label: 'Hỗn hợp' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="morphology" label="Hình thái"><Input placeholder="VD: Cầu khuẩn chùm nho" /></Form.Item>
          <Form.Item name="identificationMethod" label="PP định danh"><Input placeholder="VD: VITEK 2, MALDI-TOF" /></Form.Item>
        </Form>
      </Modal>

      {/* AST Modal */}
      <Modal title={`Kháng sinh đồ - ${selectedOrganism?.organismName}`} open={astModalOpen} onCancel={() => setAstModalOpen(false)} width={700} footer={null}>
        <Table columns={astColumns} dataSource={astData} rowKey="id" size="small" pagination={false}
          locale={{ emptyText: 'Chưa có kháng sinh đồ' }} />
      </Modal>
    </Spin>
  );
};

export default Microbiology;
