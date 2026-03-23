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
  Statistic,
  Spin,
  Modal,
  Form,
  Segmented,
  Descriptions,
  Divider,
} from 'antd';
import {
  FileProtectOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  PrinterOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UploadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as healthCheckupApi from '../api/healthCheckup';
import type { HealthCheckup as HealthCheckupType, HealthCheckupStats } from '../api/healthCheckup';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const CHECKUP_TYPE_LABELS: Record<string, string> = {
  general_adult: 'Tổng quát >= 18',
  general_child: 'Tổng quát < 18',
  periodic: 'Định kỳ',
  driver: 'Lái xe',
  student: 'Học sinh',
  elderly: 'Người cao tuổi',
  occupational: 'Nghề nghiệp',
  infant: 'Trẻ < 24th',
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Chờ khám',
  1: 'Đang khám',
  2: 'Hoàn thành',
  3: 'Đã cấp GCN',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'default',
  1: 'processing',
  2: 'success',
  3: 'blue',
};

const CONCLUSION_LABELS: Record<string, { label: string; color: string }> = {
  pass: { label: 'Đạt sức khỏe', color: 'green' },
  fail: { label: 'Không đạt', color: 'red' },
  conditional: { label: 'Đạt có điều kiện', color: 'orange' },
};

const HealthCheckup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HealthCheckupType[]>([]);
  const [stats, setStats] = useState<HealthCheckupStats>({
    totalCheckups: 0,
    todayCount: 0,
    passCount: 0,
    failCount: 0,
  });
  const [keyword, setKeyword] = useState('');
  const [checkupTypeFilter, setCheckupTypeFilter] = useState<string>('general_adult');
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [selectedRecord, setSelectedRecord] = useState<HealthCheckupType | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formInstance] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        keyword: keyword || undefined,
        checkupType: checkupTypeFilter || undefined,
        status: statusFilter,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        healthCheckupApi.searchHealthCheckups(params),
        healthCheckupApi.getHealthCheckupStats(),
      ]);
      if (results[0].status === 'fulfilled') setData(results[0].value);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
    } catch {
      message.warning('Không thể tải dữ liệu khám sức khỏe');
    } finally {
      setLoading(false);
    }
  }, [keyword, checkupTypeFilter, statusFilter, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = (record: HealthCheckupType) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleCreate = () => {
    setEditMode(false);
    setSelectedRecord(null);
    formInstance.resetFields();
    setIsFormModalOpen(true);
  };

  const handleEdit = (record: HealthCheckupType) => {
    setEditMode(true);
    setSelectedRecord(record);
    formInstance.setFieldsValue({
      ...record,
      checkupDate: record.checkupDate ? dayjs(record.checkupDate) : undefined,
    });
    setIsFormModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await formInstance.validateFields();
      setSaving(true);
      const payload = {
        ...values,
        checkupDate: values.checkupDate?.format('YYYY-MM-DD'),
      };
      if (editMode && selectedRecord) {
        await healthCheckupApi.updateHealthCheckup(selectedRecord.id, payload);
        message.success('Đã cập nhật phiếu khám sức khỏe');
      } else {
        await healthCheckupApi.createHealthCheckup(payload);
        message.success('Đã tạo phiếu khám sức khỏe');
      }
      setIsFormModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể lưu phiếu khám');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = (id: string) => {
    window.open(`/api/health-checkup/${id}/print`, '_blank');
  };

  const columns: ColumnsType<HealthCheckupType> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'checkupCode',
      key: 'checkupCode',
      width: 120,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 160,
    },
    {
      title: 'Giới',
      dataIndex: 'gender',
      key: 'gender',
      width: 60,
      render: (g: number) => (g === 1 ? 'Nam' : 'Nữ'),
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'dateOfBirth',
      key: 'dateOfBirth',
      width: 100,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Loại khám',
      dataIndex: 'checkupType',
      key: 'checkupType',
      width: 130,
      render: (t: string) => CHECKUP_TYPE_LABELS[t] || t,
    },
    {
      title: 'Công ty',
      dataIndex: 'companyName',
      key: 'companyName',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Ngày khám',
      dataIndex: 'checkupDate',
      key: 'checkupDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'BS khám',
      dataIndex: 'examDoctor',
      key: 'examDoctor',
      width: 130,
    },
    {
      title: 'Kết luận',
      dataIndex: 'conclusion',
      key: 'conclusion',
      width: 120,
      render: (c: string) => {
        const info = CONCLUSION_LABELS[c];
        return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>Chưa KL</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
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
      render: (_: unknown, record: HealthCheckupType) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            Xem
          </Button>
          {record.status < 2 && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              Sửa
            </Button>
          )}
          {record.status >= 2 && (
            <Button type="link" size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(record.id)}>
              In
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const segmentOptions = [
    { label: 'Tổng quát >= 18', value: 'general_adult' },
    { label: '< 18', value: 'general_child' },
    { label: 'Định kỳ', value: 'periodic' },
    { label: 'Lái xe', value: 'driver' },
    { label: 'Học sinh', value: 'student' },
    { label: 'Người cao tuổi', value: 'elderly' },
    { label: 'Nghề nghiệp', value: 'occupational' },
    { label: 'Trẻ < 24th', value: 'infant' },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        {/* Header */}
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <FileProtectOutlined style={{ marginRight: 8 }} />
                Khám sức khỏe tổng quát
              </Title>
            </Col>
            <Col>
              <Space>
                <Button icon={<UploadOutlined />}>Nhập lô</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  Tạo phiếu khám
                </Button>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>
                  Làm mới
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Tổng khám"
                value={stats.totalCheckups}
                prefix={<FileProtectOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Hôm nay"
                value={stats.todayCount}
                prefix={<CalendarOutlined />}
                styles={{ content: { color: '#722ed1' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Đạt SK"
                value={stats.passCount}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Không đạt"
                value={stats.failCount}
                prefix={<CloseCircleOutlined />}
                styles={{ content: { color: '#ff4d4f' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Segmented control */}
        <Card style={{ marginBottom: 16 }}>
          <Segmented
            options={segmentOptions}
            value={checkupTypeFilter}
            onChange={(val) => setCheckupTypeFilter(val as string)}
            block
          />
        </Card>

        {/* Filters */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={8} md={6}>
              <Search
                placeholder="Tìm kiếm họ tên, mã phiếu..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchData}
                allowClear
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Select
                placeholder="Trạng thái"
                allowClear
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 0, label: 'Chờ khám' },
                  { value: 1, label: 'Đang khám' },
                  { value: 2, label: 'Hoàn thành' },
                  { value: 3, label: 'Đã cấp GCN' },
                ]}
              />
            </Col>
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

        {/* Table */}
        <Card>
          <Table
            dataSource={data}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
            scroll={{ x: 1400 }}
            onRow={(record) => ({
              onDoubleClick: () => handleViewDetail(record),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>

        {/* Detail Modal */}
        <Modal
          title="Chi tiết phiếu khám sức khỏe"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>,
            selectedRecord && selectedRecord.status >= 2 && (
              <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint(selectedRecord.id)}>
                In giấy chứng nhận
              </Button>
            ),
          ]}
          width={800}
        >
          {selectedRecord && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Mã phiếu">{selectedRecord.checkupCode}</Descriptions.Item>
                <Descriptions.Item label="Loại khám">{CHECKUP_TYPE_LABELS[selectedRecord.checkupType] || selectedRecord.checkupType}</Descriptions.Item>
                <Descriptions.Item label="Họ tên">{selectedRecord.patientName}</Descriptions.Item>
                <Descriptions.Item label="Giới tính">{selectedRecord.gender === 1 ? 'Nam' : 'Nữ'}</Descriptions.Item>
                <Descriptions.Item label="Ngày sinh">{selectedRecord.dateOfBirth ? dayjs(selectedRecord.dateOfBirth).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày khám">{selectedRecord.checkupDate ? dayjs(selectedRecord.checkupDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Công ty" span={2}>{selectedRecord.companyName || '-'}</Descriptions.Item>
              </Descriptions>
              <Divider>Kết quả khám</Divider>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Nội khoa">{selectedRecord.internalMedicine || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngoại khoa">{selectedRecord.surgery || '-'}</Descriptions.Item>
                <Descriptions.Item label="Mắt">{selectedRecord.ophthalmology || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tai mũi họng">{selectedRecord.entExam || '-'}</Descriptions.Item>
                <Descriptions.Item label="Răng hàm mặt">{selectedRecord.dentalExam || '-'}</Descriptions.Item>
                <Descriptions.Item label="Da liễu">{selectedRecord.dermatology || '-'}</Descriptions.Item>
                <Descriptions.Item label="Phụ khoa">{selectedRecord.gynecology || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tâm thần">{selectedRecord.psychiatry || '-'}</Descriptions.Item>
                <Descriptions.Item label="Xét nghiệm" span={2}>{selectedRecord.labResults || '-'}</Descriptions.Item>
                <Descriptions.Item label="X-quang" span={2}>{selectedRecord.xrayResults || '-'}</Descriptions.Item>
              </Descriptions>
              <Divider>Kết luận</Divider>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Kết luận">
                  {selectedRecord.conclusion ? (
                    <Tag color={CONCLUSION_LABELS[selectedRecord.conclusion]?.color}>
                      {CONCLUSION_LABELS[selectedRecord.conclusion]?.label || selectedRecord.conclusion}
                    </Tag>
                  ) : 'Chưa kết luận'}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={STATUS_COLORS[selectedRecord.status]}>{STATUS_LABELS[selectedRecord.status]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="BS khám">{selectedRecord.examDoctor || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ghi chú">{selectedRecord.notes || '-'}</Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Modal>

        {/* Create/Edit Form Modal */}
        <Modal
          title={editMode ? 'Sửa phiếu khám sức khỏe' : 'Tạo phiếu khám sức khỏe'}
          open={isFormModalOpen}
          onCancel={() => setIsFormModalOpen(false)}
          onOk={handleSave}
          okText="Lưu"
          cancelText="Hủy"
          confirmLoading={saving}
          width={900}
          destroyOnHidden
        >
          <Form form={formInstance} layout="vertical">
            <Divider>Thông tin chung</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="patientName" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                  <Input placeholder="Họ và tên" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="gender" label="Giới tính">
                  <Select options={[{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }]} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="checkupDate" label="Ngày khám">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="checkupType" label="Loại khám" rules={[{ required: true, message: 'Chọn loại khám' }]}>
                  <Select options={Object.entries(CHECKUP_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="companyName" label="Công ty / Đơn vị">
                  <Input placeholder="Tên công ty (nếu khám tập thể)" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="groupName" label="Nhóm / Đợt khám">
                  <Input placeholder="Tên nhóm / đợt khám" />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Nội khoa</Divider>
            <Form.Item name="internalMedicine"><TextArea rows={2} placeholder="Kết quả khám nội khoa..." /></Form.Item>

            <Divider>Ngoại khoa</Divider>
            <Form.Item name="surgery"><TextArea rows={2} placeholder="Kết quả khám ngoại khoa..." /></Form.Item>

            <Divider>Mắt</Divider>
            <Form.Item name="ophthalmology"><TextArea rows={2} placeholder="Thị lực, nhãn áp, đáy mắt..." /></Form.Item>

            <Divider>Tai Mũi Họng</Divider>
            <Form.Item name="entExam"><TextArea rows={2} placeholder="Kết quả khám TMH..." /></Form.Item>

            <Divider>Răng Hàm Mặt</Divider>
            <Form.Item name="dentalExam"><TextArea rows={2} placeholder="Kết quả khám RHM..." /></Form.Item>

            <Divider>Da liễu</Divider>
            <Form.Item name="dermatology"><TextArea rows={2} placeholder="Kết quả khám da liễu..." /></Form.Item>

            <Divider>Phụ khoa</Divider>
            <Form.Item name="gynecology"><TextArea rows={2} placeholder="Kết quả khám phụ khoa (nếu có)..." /></Form.Item>

            <Divider>Tâm thần</Divider>
            <Form.Item name="psychiatry"><TextArea rows={2} placeholder="Kết quả khám tâm thần..." /></Form.Item>

            <Divider>Xét nghiệm</Divider>
            <Form.Item name="labResults"><TextArea rows={2} placeholder="Kết quả xét nghiệm máu, nước tiểu..." /></Form.Item>

            <Divider>X-quang</Divider>
            <Form.Item name="xrayResults"><TextArea rows={2} placeholder="Kết quả X-quang ngực thẳng..." /></Form.Item>

            <Divider>Kết luận</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="conclusion" label="Phân loại sức khỏe">
                  <Select
                    placeholder="Chọn kết luận"
                    allowClear
                    options={[
                      { value: 'pass', label: 'Đạt sức khỏe' },
                      { value: 'fail', label: 'Không đạt' },
                      { value: 'conditional', label: 'Đạt có điều kiện' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="notes" label="Ghi chú">
                  <TextArea rows={2} placeholder="Ghi chú thêm..." />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default HealthCheckup;
