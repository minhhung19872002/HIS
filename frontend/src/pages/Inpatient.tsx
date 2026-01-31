import React, { useState } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  SwapOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

// Interfaces
interface Admission {
  id: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  phoneNumber?: string;
  medicalRecordCode: string;
  admissionDate: string;
  admissionType: number;
  departmentName: string;
  roomName: string;
  bedName?: string;
  diagnosisOnAdmission?: string;
  status: number;
  daysOfStay: number;
}

interface BedStatus {
  bedId: string;
  bedCode: string;
  bedName: string;
  roomName: string;
  departmentName: string;
  bedStatus: number;
  patientName?: string;
  patientCode?: string;
  admissionDate?: string;
  daysOfStay?: number;
}

// Mock data
const mockAdmissions: Admission[] = [
  {
    id: '1',
    patientCode: 'BN26000001',
    patientName: 'Nguyễn Văn A',
    gender: 1,
    dateOfBirth: '1985-05-15',
    phoneNumber: '0912345678',
    medicalRecordCode: 'HS260130001',
    admissionDate: '2026-01-28T10:00:00',
    admissionType: 1,
    departmentName: 'Khoa Nội',
    roomName: 'Phòng Nội 1',
    bedName: 'Giường 01',
    diagnosisOnAdmission: 'Viêm phổi',
    status: 0,
    daysOfStay: 2,
  },
  {
    id: '2',
    patientCode: 'BN26000002',
    patientName: 'Trần Thị B',
    gender: 2,
    dateOfBirth: '1990-10-20',
    phoneNumber: '0987654321',
    medicalRecordCode: 'HS260130002',
    admissionDate: '2026-01-29T14:30:00',
    admissionType: 3,
    departmentName: 'Khoa Ngoại',
    roomName: 'Phòng Ngoại 2',
    bedName: 'Giường 05',
    diagnosisOnAdmission: 'Viêm ruột thừa cấp',
    status: 0,
    daysOfStay: 1,
  },
];

const mockBeds: BedStatus[] = [
  {
    bedId: '1',
    bedCode: 'B01',
    bedName: 'Giường 01',
    roomName: 'Phòng Nội 1',
    departmentName: 'Khoa Nội',
    bedStatus: 1,
    patientName: 'Nguyễn Văn A',
    patientCode: 'BN26000001',
    admissionDate: '2026-01-28T10:00:00',
    daysOfStay: 2,
  },
  {
    bedId: '2',
    bedCode: 'B02',
    bedName: 'Giường 02',
    roomName: 'Phòng Nội 1',
    departmentName: 'Khoa Nội',
    bedStatus: 0,
  },
  {
    bedId: '3',
    bedCode: 'B03',
    bedName: 'Giường 03',
    roomName: 'Phòng Nội 1',
    departmentName: 'Khoa Nội',
    bedStatus: 0,
  },
];

const Inpatient: React.FC = () => {
  const [admissions] = useState<Admission[]>(mockAdmissions);
  const [beds] = useState<BedStatus[]>(mockBeds);
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isCareModalOpen, setIsCareModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [_selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [form] = Form.useForm();

  // Status tags
  const getStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="blue">Đang điều trị</Tag>;
      case 1:
        return <Tag color="orange">Chuyển khoa</Tag>;
      case 2:
        return <Tag color="green">Xuất viện</Tag>;
      case 3:
        return <Tag color="red">Tử vong</Tag>;
      case 4:
        return <Tag color="default">Bỏ về</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  const getAdmissionTypeTag = (type: number) => {
    switch (type) {
      case 1:
        return <Tag color="red">Cấp cứu</Tag>;
      case 2:
        return <Tag color="orange">Chuyển tuyến</Tag>;
      case 3:
        return <Tag color="blue">Điều trị</Tag>;
      case 4:
        return <Tag color="default">Khác</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  const getBedStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge status="success" text="Trống" />;
      case 1:
        return <Badge status="processing" text="Đang sử dụng" />;
      case 2:
        return <Badge status="warning" text="Bảo trì" />;
      default:
        return <Badge status="default" text="Không xác định" />;
    }
  };

  // Admission columns
  const admissionColumns: ColumnsType<Admission> = [
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
      title: 'Ngày sinh',
      dataIndex: 'dateOfBirth',
      key: 'dateOfBirth',
      width: 100,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : ''),
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
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Loại NV',
      dataIndex: 'admissionType',
      key: 'admissionType',
      width: 110,
      render: (type) => getAdmissionTypeTag(type),
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
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status),
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
              message.info('Xem chi tiết bệnh án');
            }}
          >
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  // Bed columns
  const bedColumns: ColumnsType<BedStatus> = [
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
      render: (status) => getBedStatusBadge(status),
    },
    {
      title: 'Bệnh nhân',
      key: 'patient',
      width: 200,
      render: (_, record) =>
        record.bedStatus === 1 ? (
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
                        />
                        <Select placeholder="Khoa" style={{ width: 150 }} allowClear>
                          <Select.Option value="1">Khoa Nội</Select.Option>
                          <Select.Option value="2">Khoa Ngoại</Select.Option>
                          <Select.Option value="3">Khoa Sản</Select.Option>
                        </Select>
                        <Select placeholder="Trạng thái" style={{ width: 150 }} allowClear>
                          <Select.Option value="0">Đang điều trị</Select.Option>
                          <Select.Option value="1">Chuyển khoa</Select.Option>
                          <Select.Option value="2">Xuất viện</Select.Option>
                        </Select>
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

                  <Table
                    columns={admissionColumns}
                    dataSource={admissions}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1400 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} bệnh nhân`,
                    }}
                  />
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
                          <Select.Option value="0">Trống</Select.Option>
                          <Select.Option value="1">Đang sử dụng</Select.Option>
                          <Select.Option value="2">Bảo trì</Select.Option>
                        </Select>
                      </Space>
                    </Col>
                  </Row>

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
                  />
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
    </div>
  );
};

export default Inpatient;
