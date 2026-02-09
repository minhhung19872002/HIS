import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Modal,
  Form,
  Select,
  DatePicker,
  Typography,
  message,
  Tabs,
  Badge,
  Divider,
  Spin,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  SwapOutlined,
  ExportOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getInpatientList,
  getBedStatus,
  type InpatientListDto,
  type BedStatusDto,
  type InpatientSearchDto,
} from '../api/inpatient';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

const Inpatient: React.FC = () => {
  const [admissions, setAdmissions] = useState<InpatientListDto[]>([]);
  const [beds, setBeds] = useState<BedStatusDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [searchParams, setSearchParams] = useState<InpatientSearchDto>({
    page: 1,
    pageSize: 20,
  });
  const [total, setTotal] = useState(0);

  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isCareModalOpen, setIsCareModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<InpatientListDto | null>(null);
  const [form] = Form.useForm();

  // Load data on mount
  useEffect(() => {
    loadAdmissions();
    loadBeds();
  }, []);

  // Reload when search params change
  useEffect(() => {
    loadAdmissions();
  }, [searchParams]);

  const loadAdmissions = async () => {
    try {
      setLoading(true);
      const response = await getInpatientList(searchParams);
      // axios returns data in response.data
      const data = response.data;
      if (data) {
        setAdmissions(data.items || []);
        setTotal(data.totalCount || 0);
      } else {
        setAdmissions([]);
      }
    } catch (error) {
      console.error('Load admissions error:', error);
      message.error('Không thể tải danh sách bệnh nhân nội trú');
      setAdmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBeds = async () => {
    try {
      setLoadingBeds(true);
      const response = await getBedStatus();
      // axios returns data in response.data
      const data = response.data;
      if (data) {
        setBeds(Array.isArray(data) ? data : []);
      } else {
        setBeds([]);
      }
    } catch (error) {
      console.error('Load beds error:', error);
      message.error('Không thể tải danh sách giường');
      setBeds([]);
    } finally {
      setLoadingBeds(false);
    }
  };

  const handleSearch = (keyword: string) => {
    setSearchParams(prev => ({ ...prev, keyword, page: 1 }));
  };

  // Status tags
  const getStatusTag = (status: number, statusName?: string) => {
    const colorMap: Record<number, string> = {
      0: 'blue',     // Đang điều trị
      1: 'orange',   // Chuyển khoa
      2: 'green',    // Xuất viện
      3: 'red',      // Tử vong
      4: 'default',  // Bỏ về
    };
    const defaultNames: Record<number, string> = {
      0: 'Đang điều trị',
      1: 'Chuyển khoa',
      2: 'Xuất viện',
      3: 'Tử vong',
      4: 'Bỏ về',
    };
    return <Tag color={colorMap[status] || 'default'}>{statusName || defaultNames[status] || 'Không xác định'}</Tag>;
  };

  const getBedStatusBadge = (status: number, statusName?: string) => {
    const statusMap: Record<number, { status: 'success' | 'processing' | 'warning' | 'default'; text: string }> = {
      0: { status: 'success', text: statusName || 'Trống' },
      1: { status: 'processing', text: statusName || 'Đang sử dụng' },
      2: { status: 'warning', text: statusName || 'Bảo trì' },
    };
    const s = statusMap[status] || { status: 'default' as const, text: statusName || 'Không xác định' };
    return <Badge status={s.status} text={s.text} />;
  };

  // Admission columns - matches InpatientListDto
  const admissionColumns: ColumnsType<InpatientListDto> = [
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 120,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Giới tính',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (gender) => (gender === 1 ? 'Nam' : 'Nữ'),
    },
    {
      title: 'Tuổi',
      dataIndex: 'age',
      key: 'age',
      width: 60,
      render: (age) => age || 'N/A',
    },
    {
      title: 'Mã HS',
      dataIndex: 'medicalRecordCode',
      key: 'medicalRecordCode',
      width: 120,
    },
    {
      title: 'Ngày nhập viện',
      dataIndex: 'admissionDate',
      key: 'admissionDate',
      width: 140,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '',
    },
    {
      title: 'BHYT',
      dataIndex: 'isInsurance',
      key: 'isInsurance',
      width: 80,
      render: (isInsurance) => isInsurance ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>,
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 120,
    },
    {
      title: 'Phòng/Giường',
      key: 'roomBed',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.roomName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.bedName || 'Chưa phân giường'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Số ngày',
      dataIndex: 'daysOfStay',
      key: 'daysOfStay',
      width: 80,
      align: 'center',
      render: (days) => <strong>{days}</strong>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'statusName',
      key: 'statusName',
      width: 120,
      render: (statusName, record) => getStatusTag(record.status, statusName),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedAdmission(record);
              setIsDetailModalOpen(true);
            }}
          >
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  // Bed columns - matches BedStatusDto
  const bedColumns: ColumnsType<BedStatusDto> = [
    {
      title: 'Mã giường',
      dataIndex: 'bedCode',
      key: 'bedCode',
      width: 100,
    },
    {
      title: 'Tên giường',
      dataIndex: 'bedName',
      key: 'bedName',
      width: 120,
    },
    {
      title: 'Phòng',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 150,
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 120,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'bedStatus',
      key: 'bedStatus',
      width: 120,
      render: (status, record) => getBedStatusBadge(status, record.bedStatusName),
    },
    {
      title: 'Bệnh nhân',
      key: 'patient',
      width: 200,
      render: (_, record) =>
        record.bedStatus === 1 && record.patientName ? (
          <div>
            <div>
              <strong>{record.patientName}</strong>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.patientCode}
            </Text>
          </div>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Ngày nhập viện',
      dataIndex: 'admissionDate',
      key: 'admissionDate',
      width: 140,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Số ngày',
      dataIndex: 'daysOfStay',
      key: 'daysOfStay',
      width: 80,
      align: 'center',
      render: (days) => (days ? <strong>{days}</strong> : '-'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_, record) =>
        record.bedStatus === 1 ? (
          <Button
            size="small"
            icon={<SwapOutlined />}
            onClick={() => message.info('Chuyển giường')}
          >
            Chuyển giường
          </Button>
        ) : (
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => message.info('Phân giường')}
          >
            Phân giường
          </Button>
        ),
    },
  ];

  const handleAdmitPatient = () => {
    form.validateFields().then(() => {
      message.success('Nhập viện thành công!');
      setIsAdmitModalOpen(false);
      form.resetFields();
    });
  };

  const handleCreateProgress = () => {
    form.validateFields().then(() => {
      message.success('Ghi nhận diễn biến thành công!');
      setIsProgressModalOpen(false);
      form.resetFields();
    });
  };

  const handleCreateCare = () => {
    form.validateFields().then(() => {
      message.success('Ghi nhận chăm sóc thành công!');
      setIsCareModalOpen(false);
      form.resetFields();
    });
  };

  const handleDischarge = () => {
    form.validateFields().then(() => {
      message.success('Xuất viện thành công!');
      setIsDischargeModalOpen(false);
      form.resetFields();
    });
  };

  return (
    <div>
      <Title level={4}>Quản lý nội trú (IPD)</Title>

      <Card>
        <Tabs
          items={[
            {
              key: 'current',
              label: 'Danh sách đang điều trị',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Space>
                        <Search
                          placeholder="Tìm theo mã BN, tên, mã HS..."
                          allowClear
                          enterButton={<SearchOutlined />}
                          style={{ width: 300 }}
                          onSearch={handleSearch}
                        />
                        <Select
                          placeholder="Khoa"
                          style={{ width: 150 }}
                          allowClear
                          onChange={(value) => setSearchParams(prev => ({ ...prev, departmentId: value, page: 1 }))}
                        >
                          <Select.Option value="1">Khoa Nội</Select.Option>
                          <Select.Option value="2">Khoa Ngoại</Select.Option>
                          <Select.Option value="3">Khoa Sản</Select.Option>
                        </Select>
                        <Select
                          placeholder="Trạng thái"
                          style={{ width: 150 }}
                          allowClear
                          onChange={(value) => setSearchParams(prev => ({ ...prev, status: value, page: 1 }))}
                        >
                          <Select.Option value={0}>Đang điều trị</Select.Option>
                          <Select.Option value={1}>Chuyển khoa</Select.Option>
                          <Select.Option value={2}>Xuất viện</Select.Option>
                        </Select>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={loadAdmissions}
                          loading={loading}
                        >
                          Làm mới
                        </Button>
                      </Space>
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsAdmitModalOpen(true)}
                      >
                        Nhập viện
                      </Button>
                    </Col>
                  </Row>

                  <Spin spinning={loading}>
                    <Table
                      columns={admissionColumns}
                      dataSource={admissions}
                      rowKey="admissionId"
                      size="small"
                      scroll={{ x: 1400 }}
                      pagination={{
                        current: searchParams.page,
                        pageSize: searchParams.pageSize,
                        total: total,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `Tổng: ${total} bệnh nhân`,
                        onChange: (page, pageSize) => setSearchParams(prev => ({ ...prev, page, pageSize })),
                      }}
                      locale={{ emptyText: 'Không có bệnh nhân nội trú' }}
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          setSelectedAdmission(record);
                          setIsDetailModalOpen(true);
                        },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </Spin>
                </>
              ),
            },
            {
              key: 'beds',
              label: 'Quản lý giường',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Space>
                        <Select placeholder="Khoa" style={{ width: 150 }} allowClear>
                          <Select.Option value="1">Khoa Nội</Select.Option>
                          <Select.Option value="2">Khoa Ngoại</Select.Option>
                          <Select.Option value="3">Khoa Sản</Select.Option>
                        </Select>
                        <Select placeholder="Phòng" style={{ width: 150 }} allowClear>
                          <Select.Option value="1">Phòng Nội 1</Select.Option>
                          <Select.Option value="2">Phòng Nội 2</Select.Option>
                        </Select>
                        <Select placeholder="Trạng thái" style={{ width: 150 }} allowClear>
                          <Select.Option value={0}>Trống</Select.Option>
                          <Select.Option value={1}>Đang sử dụng</Select.Option>
                          <Select.Option value={2}>Bảo trì</Select.Option>
                        </Select>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={loadBeds}
                          loading={loadingBeds}
                        >
                          Làm mới
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  <Spin spinning={loadingBeds}>
                    <Table
                      columns={bedColumns}
                      dataSource={beds}
                      rowKey="bedId"
                      size="small"
                      scroll={{ x: 1200 }}
                      pagination={{
                        showSizeChanger: true,
                        showTotal: (total) => `Tổng: ${total} giường`,
                      }}
                      locale={{ emptyText: 'Không có giường' }}
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          Modal.info({
                            title: `Chi tiết giường: ${record.bedCode}`,
                            width: 500,
                            content: (
                              <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Mã giường">{record.bedCode}</Descriptions.Item>
                                <Descriptions.Item label="Tên giường">{record.bedName}</Descriptions.Item>
                                <Descriptions.Item label="Phòng">{record.roomName}</Descriptions.Item>
                                <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">{getBedStatusBadge(record.bedStatus, record.bedStatusName)}</Descriptions.Item>
                                <Descriptions.Item label="Bệnh nhân">{record.patientName || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Mã BN">{record.patientCode || '-'}</Descriptions.Item>
                              </Descriptions>
                            ),
                          });
                        },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </Spin>
                </>
              ),
            },
            {
              key: 'progress',
              label: 'Diễn biến hàng ngày',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã BN, tên..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ width: 300 }}
                      />
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsProgressModalOpen(true)}
                      >
                        Ghi nhận diễn biến
                      </Button>
                    </Col>
                  </Row>
                  <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Text type="secondary">Chọn bệnh nhân để xem diễn biến hàng ngày</Text>
                  </div>
                </>
              ),
            },
            {
              key: 'nursing',
              label: 'Chăm sóc điều dưỡng',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã BN, tên..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ width: 300 }}
                      />
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsCareModalOpen(true)}
                      >
                        Ghi nhận chăm sóc
                      </Button>
                    </Col>
                  </Row>
                  <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Text type="secondary">Chọn bệnh nhân để xem lịch sử chăm sóc</Text>
                  </div>
                </>
              ),
            },
            {
              key: 'discharge',
              label: 'Xuất viện',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Space>
                        <Search
                          placeholder="Tìm theo mã BN, tên..."
                          allowClear
                          enterButton={<SearchOutlined />}
                          style={{ width: 300 }}
                        />
                        <DatePicker.RangePicker format="DD/MM/YYYY" />
                      </Space>
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        danger
                        icon={<ExportOutlined />}
                        onClick={() => setIsDischargeModalOpen(true)}
                      >
                        Xuất viện
                      </Button>
                    </Col>
                  </Row>
                  <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Text type="secondary">Danh sách bệnh nhân đã xuất viện</Text>
                  </div>
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Admit Patient Modal */}
      <Modal
        title="Nhập viện"
        open={isAdmitModalOpen}
        onOk={handleAdmitPatient}
        onCancel={() => setIsAdmitModalOpen(false)}
        width={900}
        okText="Nhập viện"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="patientId"
                label="Bệnh nhân"
                rules={[{ required: true, message: 'Vui lòng chọn bệnh nhân' }]}
              >
                <Select
                  showSearch
                  placeholder="Tìm và chọn bệnh nhân"
                  optionFilterProp="children"
                >
                  <Select.Option value="1">BN26000001 - Nguyễn Văn A</Select.Option>
                  <Select.Option value="2">BN26000002 - Trần Thị B</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="medicalRecordId"
                label="Hồ sơ bệnh án"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn hồ sơ">
                  <Select.Option value="1">HS260130001</Select.Option>
                  <Select.Option value="2">HS260130002</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="admissionDate"
                label="Ngày nhập viện"
                initialValue={dayjs()}
                rules={[{ required: true }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="admissionType"
                label="Loại nhập viện"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn loại">
                  <Select.Option value={1}>Cấp cứu</Select.Option>
                  <Select.Option value={2}>Chuyển tuyến</Select.Option>
                  <Select.Option value={3}>Điều trị</Select.Option>
                  <Select.Option value={4}>Khác</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="referralSource" label="Nguồn chuyển đến">
                <Input placeholder="Nhập nguồn chuyển đến" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="departmentId"
                label="Khoa"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn khoa">
                  <Select.Option value="1">Khoa Nội</Select.Option>
                  <Select.Option value="2">Khoa Ngoại</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="roomId"
                label="Phòng"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn phòng">
                  <Select.Option value="1">Phòng Nội 1</Select.Option>
                  <Select.Option value="2">Phòng Nội 2</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bedId" label="Giường">
                <Select placeholder="Chọn giường" allowClear>
                  <Select.Option value="1">Giường 01</Select.Option>
                  <Select.Option value="2">Giường 02</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="admittingDoctorId"
                label="Bác sĩ nhập viện"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn bác sĩ">
                  <Select.Option value="1">BS. Nguyễn Văn A</Select.Option>
                  <Select.Option value="2">BS. Trần Thị B</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="diagnosisOnAdmission" label="Chẩn đoán khi nhập viện">
            <TextArea rows={2} placeholder="Nhập chẩn đoán" />
          </Form.Item>

          <Form.Item name="reasonForAdmission" label="Lý do nhập viện">
            <TextArea rows={2} placeholder="Nhập lý do nhập viện" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Daily Progress Modal */}
      <Modal
        title="Ghi nhận diễn biến hàng ngày"
        open={isProgressModalOpen}
        onOk={handleCreateProgress}
        onCancel={() => setIsProgressModalOpen(false)}
        width={900}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="admissionId"
                label="Bệnh nhân"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn bệnh nhân">
                  <Select.Option value="1">BN26000001 - Nguyễn Văn A</Select.Option>
                  <Select.Option value="2">BN26000002 - Trần Thị B</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="progressDate"
                label="Ngày ghi nhận"
                initialValue={dayjs()}
                rules={[{ required: true }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Diễn biến (SOAP)</Divider>

          <Form.Item name="subjectiveFindings" label="Chủ quan (S - Subjective)">
            <TextArea rows={2} placeholder="Triệu chứng, cảm giác của bệnh nhân..." />
          </Form.Item>

          <Form.Item name="objectiveFindings" label="Khách quan (O - Objective)">
            <TextArea rows={2} placeholder="Dấu hiệu lâm sàng, kết quả xét nghiệm..." />
          </Form.Item>

          <Form.Item name="assessment" label="Đánh giá (A - Assessment)">
            <TextArea rows={2} placeholder="Đánh giá tình trạng bệnh..." />
          </Form.Item>

          <Form.Item name="plan" label="Kế hoạch (P - Plan)">
            <TextArea rows={2} placeholder="Kế hoạch điều trị..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dietOrder" label="Chế độ ăn">
                <Input placeholder="Nhập chế độ ăn" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="activityOrder" label="Chế độ vận động">
                <Input placeholder="Nhập chế độ vận động" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Nursing Care Modal */}
      <Modal
        title="Ghi nhận chăm sóc điều dưỡng"
        open={isCareModalOpen}
        onOk={handleCreateCare}
        onCancel={() => setIsCareModalOpen(false)}
        width={700}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="admissionId"
                label="Bệnh nhân"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn bệnh nhân">
                  <Select.Option value="1">BN26000001 - Nguyễn Văn A</Select.Option>
                  <Select.Option value="2">BN26000002 - Trần Thị B</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="careDate"
                label="Ngày chăm sóc"
                initialValue={dayjs()}
                rules={[{ required: true }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="careType"
            label="Loại chăm sóc"
            rules={[{ required: true }]}
          >
            <Select placeholder="Chọn loại chăm sóc">
              <Select.Option value={1}>Theo dõi dấu hiệu sinh tồn</Select.Option>
              <Select.Option value={2}>Chăm sóc vệ sinh</Select.Option>
              <Select.Option value={3}>Thay băng</Select.Option>
              <Select.Option value={4}>Tiêm truyền</Select.Option>
              <Select.Option value={5}>Khác</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả công việc"
            rules={[{ required: true }]}
          >
            <TextArea rows={4} placeholder="Nhập mô tả chi tiết công việc chăm sóc..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Discharge Modal */}
      <Modal
        title="Xuất viện"
        open={isDischargeModalOpen}
        onOk={handleDischarge}
        onCancel={() => setIsDischargeModalOpen(false)}
        width={900}
        okText="Xuất viện"
        okButtonProps={{ danger: true }}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="admissionId"
                label="Bệnh nhân"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn bệnh nhân">
                  <Select.Option value="1">BN26000001 - Nguyễn Văn A</Select.Option>
                  <Select.Option value="2">BN26000002 - Trần Thị B</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dischargeDate"
                label="Ngày xuất viện"
                initialValue={dayjs()}
                rules={[{ required: true }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dischargeType"
                label="Loại xuất viện"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn loại">
                  <Select.Option value={1}>Ra viện</Select.Option>
                  <Select.Option value={2}>Chuyển viện</Select.Option>
                  <Select.Option value={3}>Bỏ về</Select.Option>
                  <Select.Option value={4}>Tử vong</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dischargeCondition"
                label="Tình trạng ra viện"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn tình trạng">
                  <Select.Option value={1}>Khỏi</Select.Option>
                  <Select.Option value={2}>Đỡ</Select.Option>
                  <Select.Option value={3}>Không thay đổi</Select.Option>
                  <Select.Option value={4}>Nặng hơn</Select.Option>
                  <Select.Option value={5}>Tử vong</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dischargeDiagnosis" label="Chẩn đoán ra viện">
            <TextArea rows={2} placeholder="Nhập chẩn đoán ra viện" />
          </Form.Item>

          <Form.Item name="dischargeInstructions" label="Hướng dẫn sau xuất viện">
            <TextArea rows={3} placeholder="Nhập hướng dẫn chăm sóc, dùng thuốc..." />
          </Form.Item>

          <Form.Item name="followUpDate" label="Ngày hẹn tái khám">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết bệnh nhân nội trú"
        open={isDetailModalOpen}
        onCancel={() => {
          setIsDetailModalOpen(false);
          setSelectedAdmission(null);
        }}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={900}
      >
        {selectedAdmission && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card size="small" title="Thông tin bệnh nhân">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text type="secondary">Mã bệnh nhân:</Text>
                      <div><strong>{selectedAdmission.patientCode}</strong></div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Họ tên:</Text>
                      <div><strong>{selectedAdmission.patientName}</strong></div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Giới tính / Tuổi:</Text>
                      <div>
                        <strong>
                          {selectedAdmission.gender === 1 ? 'Nam' : 'Nữ'} / {selectedAdmission.age || 'N/A'} tuổi
                        </strong>
                      </div>
                    </Col>
                  </Row>
                  <Divider style={{ margin: '12px 0' }} />
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text type="secondary">Mã hồ sơ:</Text>
                      <div><strong>{selectedAdmission.medicalRecordCode}</strong></div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">BHYT:</Text>
                      <div>
                        {selectedAdmission.isInsurance ? (
                          <Tag color="green">{selectedAdmission.insuranceNumber || 'Có BHYT'}</Tag>
                        ) : (
                          <Tag>Không có BHYT</Tag>
                        )}
                      </div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Trạng thái:</Text>
                      <div>{getStatusTag(selectedAdmission.status, selectedAdmission.statusName)}</div>
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Thông tin nhập viện">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text type="secondary">Ngày nhập viện:</Text>
                      <div>
                        <strong>
                          {selectedAdmission.admissionDate
                            ? dayjs(selectedAdmission.admissionDate).format('DD/MM/YYYY HH:mm')
                            : 'N/A'}
                        </strong>
                      </div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Số ngày điều trị:</Text>
                      <div><strong>{selectedAdmission.daysOfStay} ngày</strong></div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Bác sĩ điều trị:</Text>
                      <div><strong>{selectedAdmission.attendingDoctorName || 'N/A'}</strong></div>
                    </Col>
                  </Row>
                  <Divider style={{ margin: '12px 0' }} />
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text type="secondary">Khoa:</Text>
                      <div><strong>{selectedAdmission.departmentName}</strong></div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Phòng:</Text>
                      <div><strong>{selectedAdmission.roomName}</strong></div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Giường:</Text>
                      <div><strong>{selectedAdmission.bedName || 'Chưa phân giường'}</strong></div>
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Chẩn đoán">
                  <Text>{selectedAdmission.mainDiagnosis || 'Chưa có chẩn đoán'}</Text>
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Cảnh báo">
                  <Space wrap>
                    {selectedAdmission.hasPendingOrders && (
                      <Tag color="orange">Có y lệnh chờ xử lý</Tag>
                    )}
                    {selectedAdmission.hasPendingLabResults && (
                      <Tag color="blue">Có kết quả XN chờ</Tag>
                    )}
                    {selectedAdmission.hasUnclaimedMedicine && (
                      <Tag color="red">Thuốc chưa lĩnh</Tag>
                    )}
                    {selectedAdmission.isDebtWarning && (
                      <Tag color="red">Cảnh báo nợ: {selectedAdmission.totalDebt?.toLocaleString()} VNĐ</Tag>
                    )}
                    {selectedAdmission.isInsuranceExpiring && (
                      <Tag color="orange">BHYT sắp hết hạn</Tag>
                    )}
                    {!selectedAdmission.hasPendingOrders &&
                      !selectedAdmission.hasPendingLabResults &&
                      !selectedAdmission.hasUnclaimedMedicine &&
                      !selectedAdmission.isDebtWarning &&
                      !selectedAdmission.isInsuranceExpiring && (
                        <Text type="secondary">Không có cảnh báo</Text>
                      )}
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Inpatient;
