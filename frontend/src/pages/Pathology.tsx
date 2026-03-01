import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Select,
  DatePicker,
  Typography,
  message,
  Tabs,
  Statistic,
  Spin,
  Modal,
  Form,
  InputNumber,
  Descriptions,
  Divider,
} from 'antd';
import {
  ExperimentOutlined,
  SearchOutlined,
  ReloadOutlined,
  PrinterOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as pathologyApi from '../api/pathology';
import type { PathologyRequest, PathologyResult, PathologyStats } from '../api/pathology';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const SPECIMEN_TYPE_LABELS: Record<string, string> = {
  biopsy: 'Sinh thiet',
  cytology: 'Te bao hoc',
  pap: 'Pap smear',
  frozenSection: 'Cat lanh',
};

const SPECIMEN_TYPE_COLORS: Record<string, string> = {
  biopsy: 'blue',
  cytology: 'green',
  pap: 'pink',
  frozenSection: 'red',
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Cho xu ly',
  1: 'Mo ta dai the',
  2: 'Dang xu ly',
  3: 'Hoan thanh',
  4: 'Da xac nhan',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'default',
  1: 'processing',
  2: 'warning',
  3: 'success',
  4: 'blue',
};

const STAINING_OPTIONS = [
  { value: 'HE', label: 'H&E (Hematoxylin-Eosin)' },
  { value: 'PAS', label: 'PAS' },
  { value: 'Giemsa', label: 'Giemsa' },
  { value: 'ZiehlNeelsen', label: 'Ziehl-Neelsen' },
  { value: 'Gram', label: 'Gram' },
  { value: 'Masson', label: 'Masson Trichrome' },
  { value: 'Reticulin', label: 'Reticulin' },
  { value: 'Congo', label: 'Congo Red' },
  { value: 'Iron', label: 'Perls (Iron)' },
  { value: 'Alcian', label: 'Alcian Blue' },
];

const Pathology: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<PathologyRequest[]>([]);
  const [stats, setStats] = useState<PathologyStats>({
    totalRequests: 0,
    pendingCount: 0,
    completedCount: 0,
    avgTurnaroundDays: 0,
    specimenTypeBreakdown: [],
  });
  const [activeTab, setActiveTab] = useState('pending');
  const [keyword, setKeyword] = useState('');
  const [specimenTypeFilter, setSpecimenTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // Detail / Result modal
  const [selectedRequest, setSelectedRequest] = useState<PathologyRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isResultFormOpen, setIsResultFormOpen] = useState(false);
  const [resultForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, number | undefined> = {
        pending: 0,
        processing: 2,
        completed: 3,
        all: statusFilter,
      };
      const params: Record<string, unknown> = {
        keyword: keyword || undefined,
        status: statusMap[activeTab],
        specimenType: specimenTypeFilter || undefined,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };

      const results = await Promise.allSettled([
        pathologyApi.getPathologyRequests(params as any),
        pathologyApi.getPathologyStatistics(),
      ]);

      if (results[0].status === 'fulfilled') {
        setRequests(results[0].value);
      }
      if (results[1].status === 'fulfilled') {
        setStats(results[1].value);
      }
    } catch {
      message.warning('Khong the tai du lieu giai phau benh');
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, specimenTypeFilter, statusFilter, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = async (record: PathologyRequest) => {
    setSelectedRequest(record);
    setIsDetailModalOpen(true);
  };

  const handleOpenResultForm = (record: PathologyRequest) => {
    setSelectedRequest(record);
    resultForm.resetFields();
    setIsResultFormOpen(true);
  };

  const handleSaveResult = async () => {
    try {
      const values = await resultForm.validateFields();
      setSaving(true);
      await pathologyApi.createPathologyResult({
        requestId: selectedRequest?.id,
        ...values,
      });
      message.success('Da luu ket qua giai phau benh');
      setIsResultFormOpen(false);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return; // validation error
      message.warning('Khong the luu ket qua');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async (id: string) => {
    try {
      const blob = await pathologyApi.printPathologyReport(id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      message.warning('Khong the in phieu ket qua');
    }
  };

  const columns: ColumnsType<PathologyRequest> = [
    {
      title: 'Ma YC',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 120,
    },
    {
      title: 'Benh nhan',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 160,
    },
    {
      title: 'Ma BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 100,
    },
    {
      title: 'Loai mau',
      dataIndex: 'specimenType',
      key: 'specimenType',
      width: 120,
      render: (type: string) => (
        <Tag color={SPECIMEN_TYPE_COLORS[type] || 'default'}>
          {SPECIMEN_TYPE_LABELS[type] || type}
        </Tag>
      ),
    },
    {
      title: 'Vi tri lay mau',
      dataIndex: 'specimenSite',
      key: 'specimenSite',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'BS yeu cau',
      dataIndex: 'requestingDoctor',
      key: 'requestingDoctor',
      width: 140,
    },
    {
      title: 'Ngay YC',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 110,
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Uu tien',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (p: string) => (
        <Tag color={p === 'urgent' ? 'red' : 'default'}>
          {p === 'urgent' ? 'Khan' : 'Thuong'}
        </Tag>
      ),
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: number) => (
        <Tag color={STATUS_COLORS[s] || 'default'}>
          {STATUS_LABELS[s] || `Status ${s}`}
        </Tag>
      ),
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: PathologyRequest) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            Xem
          </Button>
          {record.status < 3 && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenResultForm(record)}
            >
              KQ
            </Button>
          )}
          {record.status >= 3 && (
            <Button
              type="link"
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => handlePrint(record.id)}
            >
              In
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'pending') return r.status <= 1;
    if (activeTab === 'processing') return r.status === 2;
    if (activeTab === 'completed') return r.status >= 3;
    return true;
  });

  const processingCount = requests.filter((r) => r.status === 2).length;

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '0 4px' }}>
        {/* Header */}
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <ExperimentOutlined style={{ marginRight: 8 }} />
                Giai phau benh & Te bao hoc
              </Title>
            </Col>
            <Col>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>
                Lam moi
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Filters */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={8} md={6}>
              <Search
                placeholder="Tim kiem benh nhan, ma YC..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchData}
                allowClear
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Select
                placeholder="Loai mau"
                allowClear
                style={{ width: '100%' }}
                value={specimenTypeFilter}
                onChange={setSpecimenTypeFilter}
                options={[
                  { value: 'biopsy', label: 'Sinh thiet' },
                  { value: 'cytology', label: 'Te bao hoc' },
                  { value: 'pap', label: 'Pap smear' },
                  { value: 'frozenSection', label: 'Cat lanh' },
                ]}
              />
            </Col>
            {activeTab === 'all' && (
              <Col xs={12} sm={8} md={4}>
                <Select
                  placeholder="Trang thai"
                  allowClear
                  style={{ width: '100%' }}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 0, label: 'Cho xu ly' },
                    { value: 1, label: 'Mo ta dai the' },
                    { value: 2, label: 'Dang xu ly' },
                    { value: 3, label: 'Hoan thanh' },
                    { value: 4, label: 'Da xac nhan' },
                  ]}
                />
              </Col>
            )}
            <Col xs={24} sm={8} md={6}>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(val) => setDateRange(val as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                format="DD/MM/YYYY"
              />
            </Col>
          </Row>
        </Card>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Tong mau"
                value={stats.totalRequests}
                prefix={<ExperimentOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Cho xu ly"
                value={stats.pendingCount}
                prefix={<ClockCircleOutlined />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Dang XL"
                value={processingCount}
                prefix={<FileSearchOutlined />}
                styles={{ content: { color: '#722ed1' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Da hoan thanh"
                value={stats.completedCount}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Tabs + Table */}
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'pending',
                label: (
                  <span>
                    <ClockCircleOutlined /> Cho mo ta ({requests.filter((r) => r.status <= 1).length})
                  </span>
                ),
              },
              {
                key: 'processing',
                label: (
                  <span>
                    <FileSearchOutlined /> Dang xu ly ({processingCount})
                  </span>
                ),
              },
              {
                key: 'completed',
                label: (
                  <span>
                    <CheckCircleOutlined /> Hoan thanh ({requests.filter((r) => r.status >= 3).length})
                  </span>
                ),
              },
              {
                key: 'all',
                label: `Tat ca (${requests.length})`,
              },
            ]}
          />
          <Table
            dataSource={filteredRequests}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tong ${t} ban ghi` }}
            scroll={{ x: 1200 }}
            onRow={(record) => ({
              onDoubleClick: () => handleViewDetail(record),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>

        {/* Detail Modal */}
        <Modal
          title="Chi tiet yeu cau giai phau benh"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
              Dong
            </Button>,
            selectedRequest && selectedRequest.status >= 3 && (
              <Button
                key="print"
                type="primary"
                icon={<PrinterOutlined />}
                onClick={() => handlePrint(selectedRequest.id)}
              >
                In ket qua
              </Button>
            ),
          ]}
          width={700}
        >
          {selectedRequest && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Ma yeu cau">{selectedRequest.requestCode}</Descriptions.Item>
                <Descriptions.Item label="Ngay yeu cau">
                  {selectedRequest.requestDate ? dayjs(selectedRequest.requestDate).format('DD/MM/YYYY HH:mm') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Benh nhan">{selectedRequest.patientName}</Descriptions.Item>
                <Descriptions.Item label="Ma BN">{selectedRequest.patientCode}</Descriptions.Item>
                <Descriptions.Item label="Loai mau">
                  <Tag color={SPECIMEN_TYPE_COLORS[selectedRequest.specimenType]}>
                    {SPECIMEN_TYPE_LABELS[selectedRequest.specimenType] || selectedRequest.specimenType}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Uu tien">
                  <Tag color={selectedRequest.priority === 'urgent' ? 'red' : 'default'}>
                    {selectedRequest.priority === 'urgent' ? 'Khan' : 'Thuong'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Vi tri lay mau" span={2}>
                  {selectedRequest.specimenSite || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Chan doan lam sang" span={2}>
                  {selectedRequest.clinicalDiagnosis || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="BS yeu cau">{selectedRequest.requestingDoctor}</Descriptions.Item>
                <Descriptions.Item label="Trang thai">
                  <Tag color={STATUS_COLORS[selectedRequest.status]}>
                    {STATUS_LABELS[selectedRequest.status]}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Modal>

        {/* Result Form Modal */}
        <Modal
          title="Nhap ket qua giai phau benh"
          open={isResultFormOpen}
          onCancel={() => setIsResultFormOpen(false)}
          onOk={handleSaveResult}
          okText="Luu ket qua"
          cancelText="Huy"
          confirmLoading={saving}
          width={800}
          destroyOnHidden
        >
          {selectedRequest && (
            <>
              <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Ma YC">{selectedRequest.requestCode}</Descriptions.Item>
                <Descriptions.Item label="Benh nhan">{selectedRequest.patientName}</Descriptions.Item>
                <Descriptions.Item label="Loai mau">
                  <Tag color={SPECIMEN_TYPE_COLORS[selectedRequest.specimenType]}>
                    {SPECIMEN_TYPE_LABELS[selectedRequest.specimenType]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Vi tri">{selectedRequest.specimenSite || '-'}</Descriptions.Item>
              </Descriptions>
              <Divider />
              <Form form={resultForm} layout="vertical">
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="grossDescription"
                      label="Mo ta dai the"
                      rules={[{ required: true, message: 'Vui long nhap mo ta dai the' }]}
                    >
                      <TextArea rows={3} placeholder="Mo ta hinh thai, kich thuoc, mau sac, mat cat mau benh pham..." />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      name="microscopicDescription"
                      label="Mo ta vi the"
                      rules={[{ required: true, message: 'Vui long nhap mo ta vi the' }]}
                    >
                      <TextArea rows={3} placeholder="Mo ta cau truc mo hoc duoi kinh hien vi..." />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      name="diagnosis"
                      label="Chan doan giai phau benh"
                      rules={[{ required: true, message: 'Vui long nhap chan doan' }]}
                    >
                      <TextArea rows={2} placeholder="Ket luan chan doan giai phau benh..." />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="icdCode" label="Ma ICD">
                      <Input placeholder="VD: C34.1" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="stainingMethods" label="Phuong phap nhuom">
                      <Select
                        mode="multiple"
                        placeholder="Chon phuong phap nhuom"
                        options={STAINING_OPTIONS}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="slideCount" label="So lam kinh">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="blockCount" label="So block">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="pathologist" label="BS giai phau benh">
                      <Input placeholder="Ten bac si" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="specialStains" label="Nhuom dac biet">
                      <TextArea rows={2} placeholder="Ket qua nhuom dac biet (neu co)..." />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="immunohistochemistry" label="Hoa mo mien dich (IHC)">
                      <TextArea rows={2} placeholder="Ket qua IHC: marker, cuong do, ty le duong tinh..." />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="molecularTests" label="Xet nghiem phan tu">
                      <TextArea rows={2} placeholder="Ket qua xet nghiem phan tu/gen (neu co)..." />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </>
          )}
        </Modal>
      </div>
    </Spin>
  );
};

export default Pathology;
