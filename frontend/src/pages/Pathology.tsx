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
import type { PathologyRequest, PathologyStats } from '../api/pathology';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const SPECIMEN_TYPE_LABELS: Record<string, string> = {
  biopsy: 'Sinh thiết',
  cytology: 'Tế bào học',
  pap: 'Pap smear',
  frozenSection: 'Cắt lạnh',
};

const SPECIMEN_TYPE_COLORS: Record<string, string> = {
  biopsy: 'blue',
  cytology: 'green',
  pap: 'pink',
  frozenSection: 'red',
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Chờ xử lý',
  1: 'Mô tả đại thể',
  2: 'Đang xử lý',
  3: 'Hoàn thành',
  4: 'Đã xác nhận',
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
        pathologyApi.getPathologyRequests(params),
        pathologyApi.getPathologyStatistics(),
      ]);

      if (results[0].status === 'fulfilled') {
        setRequests(results[0].value);
      }
      if (results[1].status === 'fulfilled') {
        setStats(results[1].value);
      }
    } catch {
      message.warning('Không thể tải dữ liệu giải phẫu bệnh');
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
      message.success('Đã lưu kết quả giải phẫu bệnh');
      setIsResultFormOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return; // validation error
      message.warning('Không thể lưu kết quả');
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
      message.warning('Không thể in phiếu kết quả');
    }
  };

  const columns: ColumnsType<PathologyRequest> = [
    {
      title: 'Mã YC',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 120,
    },
    {
      title: 'Bệnh nhân',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 160,
    },
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 100,
    },
    {
      title: 'Loại mẫu',
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
      title: 'Vị trí lấy mẫu',
      dataIndex: 'specimenSite',
      key: 'specimenSite',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'BS yêu cầu',
      dataIndex: 'requestingDoctor',
      key: 'requestingDoctor',
      width: 140,
    },
    {
      title: 'Ngày YC',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 110,
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (p: string) => (
        <Tag color={p === 'urgent' ? 'red' : 'default'}>
          {p === 'urgent' ? 'Khẩn' : 'Thường'}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
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
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: PathologyRequest) => (
        <div className="flex items-center gap-2">
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
        </div>
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
      <div>
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-semibold m-0">
                <ExperimentOutlined style={{ marginRight: 8 }} />
                Giải phẫu bệnh & Tế bào học
              </h4>
            </div>
            <div>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>
                Làm mới
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Search
                placeholder="Tìm kiếm bệnh nhân, mã YC..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchData}
                allowClear
                prefix={<SearchOutlined />}
              />
            </div>
            <div>
              <Select
                placeholder="Loại mẫu"
                allowClear
                style={{ width: '100%' }}
                value={specimenTypeFilter}
                onChange={setSpecimenTypeFilter}
                options={[
                  { value: 'biopsy', label: 'Sinh thiết' },
                  { value: 'cytology', label: 'Tế bào học' },
                  { value: 'pap', label: 'Pap smear' },
                  { value: 'frozenSection', label: 'Cắt lạnh' },
                ]}
              />
            </div>
            {activeTab === 'all' && (
              <div>
                <Select
                  placeholder="Trạng thái"
                  allowClear
                  style={{ width: '100%' }}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 0, label: 'Chờ xử lý' },
                    { value: 1, label: 'Mô tả đại thể' },
                    { value: 2, label: 'Đang xử lý' },
                    { value: 3, label: 'Hoàn thành' },
                    { value: 4, label: 'Đã xác nhận' },
                  ]}
                />
              </div>
            )}
            <div>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(val) => setDateRange(val as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                format="DD/MM/YYYY"
              />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Tổng mẫu</div><div className="text-2xl font-semibold" style={{ color: '#1890ff' }}><ExperimentOutlined className="mr-1" />{stats.totalRequests}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Chờ xử lý</div><div className="text-2xl font-semibold" style={{ color: '#faad14' }}><ClockCircleOutlined className="mr-1" />{stats.pendingCount}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Đang XL</div><div className="text-2xl font-semibold" style={{ color: '#722ed1' }}><FileSearchOutlined className="mr-1" />{processingCount}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Đã hoàn thành</div><div className="text-2xl font-semibold" style={{ color: '#52c41a' }}><CheckCircleOutlined className="mr-1" />{stats.completedCount}</div>
            </div>
          </div>
        </div>

        {/* Tabs + Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'pending',
                label: (
                  <span>
                    <ClockCircleOutlined /> Chờ mô tả ({requests.filter((r) => r.status <= 1).length})
                  </span>
                ),
              },
              {
                key: 'processing',
                label: (
                  <span>
                    <FileSearchOutlined /> Đang xử lý ({processingCount})
                  </span>
                ),
              },
              {
                key: 'completed',
                label: (
                  <span>
                    <CheckCircleOutlined /> Hoàn thành ({requests.filter((r) => r.status >= 3).length})
                  </span>
                ),
              },
              {
                key: 'all',
                label: `Tất cả (${requests.length})`,
              },
            ]}
          />
          <Table
            dataSource={filteredRequests}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
            scroll={{ x: 1200 }}
            onRow={(record) => ({
              onDoubleClick: () => handleViewDetail(record),
              style: { cursor: 'pointer' },
            })}
          />
        </div>

        {/* Detail Modal */}
        <Modal
          title="Chi tiết yêu cầu giải phẫu bệnh"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
              Đóng
            </Button>,
            selectedRequest && selectedRequest.status >= 3 && (
              <Button
                key="print"
                type="primary"
                icon={<PrinterOutlined />}
                onClick={() => handlePrint(selectedRequest.id)}
              >
                In kết quả
              </Button>
            ),
          ]}
          width={700}
        >
          {selectedRequest && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Mã yêu cầu">{selectedRequest.requestCode}</Descriptions.Item>
                <Descriptions.Item label="Ngày yêu cầu">
                  {selectedRequest.requestDate ? dayjs(selectedRequest.requestDate).format('DD/MM/YYYY HH:mm') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Bệnh nhân">{selectedRequest.patientName}</Descriptions.Item>
                <Descriptions.Item label="Mã BN">{selectedRequest.patientCode}</Descriptions.Item>
                <Descriptions.Item label="Loại mẫu">
                  <Tag color={SPECIMEN_TYPE_COLORS[selectedRequest.specimenType]}>
                    {SPECIMEN_TYPE_LABELS[selectedRequest.specimenType] || selectedRequest.specimenType}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Ưu tiên">
                  <Tag color={selectedRequest.priority === 'urgent' ? 'red' : 'default'}>
                    {selectedRequest.priority === 'urgent' ? 'Khẩn' : 'Thường'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Vị trí lấy mẫu" span={2}>
                  {selectedRequest.specimenSite || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Chẩn đoán lâm sàng" span={2}>
                  {selectedRequest.clinicalDiagnosis || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="BS yêu cầu">{selectedRequest.requestingDoctor}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
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
          title="Nhập kết quả giải phẫu bệnh"
          open={isResultFormOpen}
          onCancel={() => setIsResultFormOpen(false)}
          onOk={handleSaveResult}
          okText="Lưu kết quả"
          cancelText="Hủy"
          confirmLoading={saving}
          width={800}
          destroyOnHidden
        >
          {selectedRequest && (
            <>
              <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Mã YC">{selectedRequest.requestCode}</Descriptions.Item>
                <Descriptions.Item label="Bệnh nhân">{selectedRequest.patientName}</Descriptions.Item>
                <Descriptions.Item label="Loại mẫu">
                  <Tag color={SPECIMEN_TYPE_COLORS[selectedRequest.specimenType]}>
                    {SPECIMEN_TYPE_LABELS[selectedRequest.specimenType]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Vị trí">{selectedRequest.specimenSite || '-'}</Descriptions.Item>
              </Descriptions>
              <hr className="border-t border-gray-200 my-4" />
              <Form form={resultForm} layout="vertical">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <Form.Item
                      name="grossDescription"
                      label="Mô tả đại thể"
                      rules={[{ required: true, message: 'Vui lòng nhập mô tả đại thể' }]}
                    >
                      <TextArea rows={3} placeholder="Mô tả hình thái, kích thước, màu sắc, mặt cắt mẫu bệnh phẩm..." />
                    </Form.Item>
                  </div>
                  <div className="col-span-2">
                    <Form.Item
                      name="microscopicDescription"
                      label="Mô tả vi thể"
                      rules={[{ required: true, message: 'Vui lòng nhập mô tả vi thể' }]}
                    >
                      <TextArea rows={3} placeholder="Mô tả cấu trúc mô học dưới kính hiển vi..." />
                    </Form.Item>
                  </div>
                  <div className="col-span-2">
                    <Form.Item
                      name="diagnosis"
                      label="Chẩn đoán giải phẫu bệnh"
                      rules={[{ required: true, message: 'Vui lòng nhập chẩn đoán' }]}
                    >
                      <TextArea rows={2} placeholder="Kết luận chẩn đoán giải phẫu bệnh..." />
                    </Form.Item>
                  </div>
                  <div>
                    <Form.Item name="icdCode" label="Mã ICD">
                      <Input placeholder="VD: C34.1" />
                    </Form.Item>
                  </div>
                  <div>
                    <Form.Item name="stainingMethods" label="Phương pháp nhuộm">
                      <Select
                        mode="multiple"
                        placeholder="Chọn phương pháp nhuộm"
                        options={STAINING_OPTIONS}
                      />
                    </Form.Item>
                  </div>
                  <div>
                    <Form.Item name="slideCount" label="Số lam kính">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                  </div>
                  <div>
                    <Form.Item name="blockCount" label="Số block">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                  </div>
                  <div>
                    <Form.Item name="pathologist" label="BS giải phẫu bệnh">
                      <Input placeholder="Tên bác sĩ" />
                    </Form.Item>
                  </div>
                  <div className="col-span-2">
                    <Form.Item name="specialStains" label="Nhuộm đặc biệt">
                      <TextArea rows={2} placeholder="Kết quả nhuộm đặc biệt (nếu có)..." />
                    </Form.Item>
                  </div>
                  <div className="col-span-2">
                    <Form.Item name="immunohistochemistry" label="Hóa mô miễn dịch (IHC)">
                      <TextArea rows={2} placeholder="Kết quả IHC: marker, cường độ, tỷ lệ dương tính..." />
                    </Form.Item>
                  </div>
                  <div className="col-span-2">
                    <Form.Item name="molecularTests" label="Xét nghiệm phân tử">
                      <TextArea rows={2} placeholder="Kết quả xét nghiệm phân tử/gen (nếu có)..." />
                    </Form.Item>
                  </div>
                </div>
              </Form>
            </>
          )}
        </Modal>
      </div>
    </Spin>
  );
};

export default Pathology;
