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
  Statistic,
  Badge,
  Divider,
  Alert,
  Tooltip,
  Progress,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  PrinterOutlined,
  SoundOutlined,
  QrcodeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  IdcardOutlined,
  ReloadOutlined,
  SwapOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;

interface ReceptionRecord {
  id: string;
  queueNumber: number;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  phoneNumber?: string;
  identityNumber?: string;
  patientType: number;
  insuranceNumber?: string;
  departmentName?: string;
  roomName?: string;
  roomId?: string;
  status: number;
  admissionDate: string;
  address?: string;
  priority?: number;
}

interface RoomStatistics {
  roomId: string;
  roomName: string;
  departmentName: string;
  totalWaiting: number;
  totalServing: number;
  totalCompleted: number;
  currentNumber?: number;
  doctorName?: string;
}

interface InsuranceVerification {
  insuranceNumber: string;
  isValid: boolean;
  patientName?: string;
  dateOfBirth?: string;
  facilityName?: string;
  startDate?: string;
  endDate?: string;
  isExpired: boolean;
  isRightRoute: boolean;
  paymentRate?: number;
  validationMessage?: string;
}

const mockData: ReceptionRecord[] = [
  {
    id: '1',
    queueNumber: 1,
    patientCode: 'BN26000001',
    patientName: 'Nguyễn Văn A',
    gender: 1,
    dateOfBirth: '1985-05-15',
    phoneNumber: '0912345678',
    identityNumber: '001085012345',
    patientType: 1,
    insuranceNumber: 'DN1234567890',
    departmentName: 'Khoa Nội',
    roomName: 'Phòng khám Nội 1',
    roomId: 'room-1',
    status: 0,
    admissionDate: '2026-01-30T08:00:00',
    address: '123 Nguyễn Trãi, Q.1, TP.HCM',
    priority: 0,
  },
  {
    id: '2',
    queueNumber: 2,
    patientCode: 'BN26000002',
    patientName: 'Trần Thị B',
    gender: 2,
    dateOfBirth: '1990-10-20',
    phoneNumber: '0987654321',
    identityNumber: '001090098765',
    patientType: 2,
    departmentName: 'Khoa Ngoại',
    roomName: 'Phòng khám Ngoại 1',
    roomId: 'room-3',
    status: 1,
    admissionDate: '2026-01-30T08:15:00',
    address: '456 Lê Lợi, Q.3, TP.HCM',
    priority: 0,
  },
  {
    id: '3',
    queueNumber: 3,
    patientCode: 'BN26000003',
    patientName: 'Lê Văn C',
    gender: 1,
    dateOfBirth: '1975-03-10',
    phoneNumber: '0909123456',
    identityNumber: '001075054321',
    patientType: 1,
    insuranceNumber: 'DN9876543210',
    departmentName: 'Khoa Nội',
    roomName: 'Phòng khám Nội 2',
    roomId: 'room-2',
    status: 0,
    admissionDate: '2026-01-30T08:30:00',
    address: '789 Hai Bà Trưng, Q.1, TP.HCM',
    priority: 1,
  },
  {
    id: '4',
    queueNumber: 4,
    patientCode: 'BN26000004',
    patientName: 'Phạm Thị D',
    gender: 2,
    dateOfBirth: '2000-12-25',
    phoneNumber: '0978123456',
    patientType: 3,
    departmentName: 'Khoa Ngoại',
    roomName: 'Phòng khám Ngoại 1',
    roomId: 'room-3',
    status: 2,
    admissionDate: '2026-01-30T08:45:00',
    address: '321 Pasteur, Q.1, TP.HCM',
    priority: 0,
  },
];

const mockRoomStats: RoomStatistics[] = [
  {
    roomId: 'room-1',
    roomName: 'Phòng khám Nội 1',
    departmentName: 'Khoa Nội',
    totalWaiting: 5,
    totalServing: 1,
    totalCompleted: 12,
    currentNumber: 8,
    doctorName: 'BS. Nguyễn Văn X',
  },
  {
    roomId: 'room-2',
    roomName: 'Phòng khám Nội 2',
    departmentName: 'Khoa Nội',
    totalWaiting: 3,
    totalServing: 1,
    totalCompleted: 10,
    currentNumber: 5,
    doctorName: 'BS. Trần Thị Y',
  },
  {
    roomId: 'room-3',
    roomName: 'Phòng khám Ngoại 1',
    departmentName: 'Khoa Ngoại',
    totalWaiting: 8,
    totalServing: 1,
    totalCompleted: 15,
    currentNumber: 12,
    doctorName: 'BS. Lê Văn Z',
  },
];

const Reception: React.FC = () => {
  const [data] = useState<ReceptionRecord[]>(mockData);
  const [roomStats] = useState<RoomStatistics[]>(mockRoomStats);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ReceptionRecord | null>(null);
  const [insuranceVerification, setInsuranceVerification] = useState<InsuranceVerification | null>(null);
  const [verifyingInsurance, setVerifyingInsurance] = useState(false);
  const [form] = Form.useForm();
  const [verifyForm] = Form.useForm();

  const getStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange">Chờ khám</Tag>;
      case 1:
        return <Tag color="blue">Đang khám</Tag>;
      case 2:
        return <Tag color="cyan">Chờ kết luận</Tag>;
      case 3:
        return <Tag color="green">Hoàn thành</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  const getPatientTypeTag = (type: number) => {
    switch (type) {
      case 1:
        return <Tag color="green">BHYT</Tag>;
      case 2:
        return <Tag color="blue">Viện phí</Tag>;
      case 3:
        return <Tag color="purple">Dịch vụ</Tag>;
      default:
        return <Tag>Khác</Tag>;
    }
  };

  const columns: ColumnsType<ReceptionRecord> = [
    {
      title: 'STT',
      dataIndex: 'queueNumber',
      key: 'queueNumber',
      width: 60,
      align: 'center',
      render: (num) => <strong>{num}</strong>,
    },
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
      width: 180,
    },
    {
      title: 'Giới tính',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (gender) => (gender === 1 ? 'Nam' : gender === 2 ? 'Nữ' : 'Khác'),
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'dateOfBirth',
      key: 'dateOfBirth',
      width: 100,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '',
    },
    {
      title: 'Đối tượng',
      dataIndex: 'patientType',
      key: 'patientType',
      width: 100,
      render: (type) => getPatientTypeTag(type),
    },
    {
      title: 'Số thẻ BHYT',
      dataIndex: 'insuranceNumber',
      key: 'insuranceNumber',
      width: 140,
    },
    {
      title: 'Phòng khám',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 150,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority) => getPriorityTag(priority),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="Gọi số">
            <Button size="small" type="primary" icon={<SoundOutlined />} onClick={() => handleCallNumber(record)}>
              Gọi
            </Button>
          </Tooltip>
          <Tooltip title="Gọi lại">
            <Button size="small" icon={<ReloadOutlined />} onClick={() => handleRecall(record)} />
          </Tooltip>
          <Tooltip title="Bỏ qua">
            <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleSkip(record)} />
          </Tooltip>
          <Tooltip title="Chuyển phòng">
            <Button size="small" icon={<SwapOutlined />} onClick={() => handleTransferRoom(record)} />
          </Tooltip>
          <Tooltip title="Lịch sử khám">
            <Button size="small" icon={<HistoryOutlined />} onClick={() => handleViewHistory(record)} />
          </Tooltip>
          <Tooltip title="In phiếu">
            <Button size="small" icon={<PrinterOutlined />} onClick={() => message.info('In phiếu khám')} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleCreate = () => {
    form.validateFields().then(() => {
      message.success('Đăng ký khám thành công!');
      setIsModalOpen(false);
      form.resetFields();
    });
  };

  const handleCallNumber = (record: ReceptionRecord) => {
    message.info(`Gọi số ${record.queueNumber} - ${record.patientName}`);
  };

  const handleRecall = (record: ReceptionRecord) => {
    message.info(`Gọi lại số ${record.queueNumber}`);
  };

  const handleSkip = (record: ReceptionRecord) => {
    Modal.confirm({
      title: 'Bỏ qua số',
      content: `Xác nhận bỏ qua số ${record.queueNumber} - ${record.patientName}?`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: () => {
        message.success('Đã bỏ qua số');
      },
    });
  };

  const handleTransferRoom = (_record: ReceptionRecord) => {
    message.info('Chức năng chuyển phòng');
  };

  const handleViewHistory = (record: ReceptionRecord) => {
    setSelectedRecord(record);
    setIsHistoryModalOpen(true);
  };

  const handleVerifyInsurance = () => {
    verifyForm.validateFields().then((values) => {
      setVerifyingInsurance(true);
      // Simulate API call
      setTimeout(() => {
        const mockVerification: InsuranceVerification = {
          insuranceNumber: values.insuranceNumber,
          isValid: true,
          patientName: 'Nguyễn Văn A',
          dateOfBirth: '1985-05-15',
          facilityName: 'BV Đa khoa Trung ương',
          startDate: '2025-01-01',
          endDate: '2026-12-31',
          isExpired: false,
          isRightRoute: true,
          paymentRate: 80,
          validationMessage: 'Thẻ BHYT hợp lệ',
        };
        setInsuranceVerification(mockVerification);
        setVerifyingInsurance(false);
        message.success('Xác minh thẻ BHYT thành công!');
      }, 1500);
    });
  };

  const getPriorityTag = (priority?: number) => {
    switch (priority) {
      case 1:
        return <Tag color="gold">Ưu tiên</Tag>;
      case 2:
        return <Tag color="red">Cấp cứu</Tag>;
      default:
        return null;
    }
  };

  return (
    <div>
      <Title level={4}>Tiếp đón bệnh nhân</Title>

      {/* Thống kê tổng quan */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng BN hôm nay"
              value={data.length + 28}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đang chờ khám"
              value={data.filter(d => d.status === 0).length + 16}
              prefix={<Badge status="warning" />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đang khám"
              value={data.filter(d => d.status === 1).length + 3}
              prefix={<Badge status="processing" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Hoàn thành"
              value={data.filter(d => d.status === 3).length + 37}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          items={[
            {
              key: 'list',
              label: 'Danh sách tiếp đón',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Space>
                        <Search
                          placeholder="Tìm theo mã BN, tên, SĐT, CCCD..."
                          allowClear
                          enterButton={<SearchOutlined />}
                          style={{ width: 350 }}
                        />
                        <Select defaultValue="" style={{ width: 150 }} placeholder="Phòng khám">
                          <Select.Option value="">Tất cả phòng</Select.Option>
                          <Select.Option value="room-1">Phòng khám Nội 1</Select.Option>
                          <Select.Option value="room-2">Phòng khám Nội 2</Select.Option>
                          <Select.Option value="room-3">Phòng khám Ngoại 1</Select.Option>
                        </Select>
                        <Select defaultValue="" style={{ width: 120 }} placeholder="Trạng thái">
                          <Select.Option value="">Tất cả</Select.Option>
                          <Select.Option value="0">Chờ khám</Select.Option>
                          <Select.Option value="1">Đang khám</Select.Option>
                          <Select.Option value="2">Chờ kết luận</Select.Option>
                          <Select.Option value="3">Hoàn thành</Select.Option>
                        </Select>
                        <DatePicker defaultValue={dayjs()} format="DD/MM/YYYY" />
                      </Space>
                    </Col>
                    <Col>
                      <Space>
                        <Button icon={<QrcodeOutlined />} onClick={() => setIsVerifyModalOpen(true)}>
                          Tra cứu BHYT
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                          Đăng ký khám
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1500 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} bệnh nhân`,
                    }}
                    rowClassName={(record) =>
                      record.priority === 2 ? 'emergency-row' : record.priority === 1 ? 'priority-row' : ''
                    }
                  />
                </>
              ),
            },
            {
              key: 'stats',
              label: 'Thống kê phòng khám',
              children: (
                <Row gutter={[16, 16]}>
                  {roomStats.map((room) => (
                    <Col span={8} key={room.roomId}>
                      <Card
                        title={
                          <Space>
                            <Badge status={room.totalServing > 0 ? 'processing' : 'default'} />
                            {room.roomName}
                          </Space>
                        }
                        extra={<Tag color="blue">{room.departmentName}</Tag>}
                      >
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="Bác sĩ">{room.doctorName}</Descriptions.Item>
                          <Descriptions.Item label="Số hiện tại">
                            <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                              {room.currentNumber}
                            </Text>
                          </Descriptions.Item>
                        </Descriptions>
                        <Divider style={{ margin: '12px 0' }} />
                        <Row gutter={8}>
                          <Col span={8}>
                            <Statistic title="Chờ" value={room.totalWaiting} valueStyle={{ color: '#faad14' }} />
                          </Col>
                          <Col span={8}>
                            <Statistic title="Đang khám" value={room.totalServing} valueStyle={{ color: '#1890ff' }} />
                          </Col>
                          <Col span={8}>
                            <Statistic title="Hoàn thành" value={room.totalCompleted} valueStyle={{ color: '#52c41a' }} />
                          </Col>
                        </Row>
                        <Progress
                          percent={Math.round((room.totalCompleted / (room.totalWaiting + room.totalServing + room.totalCompleted)) * 100)}
                          size="small"
                          style={{ marginTop: 12 }}
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal Tra cứu BHYT */}
      <Modal
        title={
          <Space>
            <IdcardOutlined />
            Tra cứu thẻ BHYT
          </Space>
        }
        open={isVerifyModalOpen}
        onCancel={() => {
          setIsVerifyModalOpen(false);
          setInsuranceVerification(null);
          verifyForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={verifyForm} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="insuranceNumber"
                label="Số thẻ BHYT"
                rules={[{ required: true, message: 'Vui lòng nhập số thẻ BHYT' }]}
              >
                <Input placeholder="Nhập số thẻ BHYT (15 ký tự)" maxLength={15} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label=" ">
                <Button type="primary" onClick={handleVerifyInsurance} loading={verifyingInsurance} block>
                  Tra cứu
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {insuranceVerification && (
          <>
            <Divider />
            <Alert
              message={insuranceVerification.isValid ? 'Thẻ BHYT hợp lệ' : 'Thẻ BHYT không hợp lệ'}
              type={insuranceVerification.isValid ? 'success' : 'error'}
              showIcon
              icon={insuranceVerification.isValid ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              style={{ marginBottom: 16 }}
            />
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Số thẻ" span={2}>
                <Text strong>{insuranceVerification.insuranceNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Họ tên">{insuranceVerification.patientName}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">
                {insuranceVerification.dateOfBirth ? dayjs(insuranceVerification.dateOfBirth).format('DD/MM/YYYY') : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Nơi ĐKKCB BĐ" span={2}>
                {insuranceVerification.facilityName}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày bắt đầu">
                {insuranceVerification.startDate ? dayjs(insuranceVerification.startDate).format('DD/MM/YYYY') : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày kết thúc">
                {insuranceVerification.endDate ? dayjs(insuranceVerification.endDate).format('DD/MM/YYYY') : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Đúng tuyến">
                {insuranceVerification.isRightRoute ? (
                  <Tag color="green">Đúng tuyến</Tag>
                ) : (
                  <Tag color="orange">Trái tuyến</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Tỷ lệ thanh toán">
                <Text strong style={{ color: '#1890ff' }}>{insuranceVerification.paymentRate}%</Text>
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Button
                type="primary"
                onClick={() => {
                  form.setFieldsValue({
                    insuranceNumber: insuranceVerification.insuranceNumber,
                    patientType: 1,
                  });
                  setIsVerifyModalOpen(false);
                  setIsModalOpen(true);
                }}
              >
                Sử dụng thông tin này
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Modal Lịch sử khám */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            Lịch sử khám bệnh - {selectedRecord?.patientName}
          </Space>
        }
        open={isHistoryModalOpen}
        onCancel={() => setIsHistoryModalOpen(false)}
        footer={null}
        width={800}
      >
        <Table
          size="small"
          columns={[
            { title: 'Ngày khám', dataIndex: 'date', key: 'date' },
            { title: 'Phòng khám', dataIndex: 'room', key: 'room' },
            { title: 'Bác sĩ', dataIndex: 'doctor', key: 'doctor' },
            { title: 'Chẩn đoán', dataIndex: 'diagnosis', key: 'diagnosis' },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => <Tag color="green">{status}</Tag>,
            },
          ]}
          dataSource={[
            {
              key: '1',
              date: '15/01/2026',
              room: 'Phòng khám Nội 1',
              doctor: 'BS. Nguyễn Văn X',
              diagnosis: 'Viêm họng cấp',
              status: 'Hoàn thành',
            },
            {
              key: '2',
              date: '02/12/2025',
              room: 'Phòng khám Nội 2',
              doctor: 'BS. Trần Thị Y',
              diagnosis: 'Cao huyết áp',
              status: 'Hoàn thành',
            },
          ]}
          pagination={false}
        />
      </Modal>

      {/* Modal Đăng ký khám */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            Đăng ký khám bệnh
          </Space>
        }
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => setIsModalOpen(false)}
        width={900}
        okText="Đăng ký"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fullName"
                label="Họ tên"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input placeholder="Nhập họ tên bệnh nhân" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="gender"
                label="Giới tính"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn">
                  <Select.Option value={1}>Nam</Select.Option>
                  <Select.Option value={2}>Nữ</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="dateOfBirth" label="Ngày sinh">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="identityNumber" label="CCCD/CMND">
                <Input placeholder="Nhập số CCCD" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phoneNumber" label="Số điện thoại">
                <Input placeholder="Nhập SĐT" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="patientType"
                label="Đối tượng"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn đối tượng">
                  <Select.Option value={1}>BHYT</Select.Option>
                  <Select.Option value={2}>Viện phí</Select.Option>
                  <Select.Option value={3}>Dịch vụ</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="insuranceNumber" label="Số thẻ BHYT">
                <Input placeholder="Nhập số thẻ BHYT" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="roomId"
                label="Phòng khám"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn phòng khám">
                  <Select.Option value="1">Phòng khám Nội 1</Select.Option>
                  <Select.Option value="2">Phòng khám Nội 2</Select.Option>
                  <Select.Option value="3">Phòng khám Ngoại 1</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={2} placeholder="Nhập địa chỉ" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Reception;
