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
  TimePicker,
  InputNumber,
  Typography,
  message,
  Tabs,
  Badge,
  Descriptions,
  Alert,
  Divider,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getSurgeries, getOperatingRooms, type SurgeryDto, type OperatingRoomDto, type SurgerySearchDto } from '../api/surgery';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

// Interfaces
interface SurgeryRequest {
  id: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  age?: number;
  requestDate: string;
  surgeryType: string;
  plannedProcedure?: string;
  requestingDoctorName: string;
  priority: number; // 1: Normal, 2: Urgent, 3: Emergency
  status: number; // 0: Pending, 1: Scheduled, 2: InProgress, 3: Completed, 4: Cancelled
  preOpDiagnosis?: string;
  estimatedDuration?: number;
  anesthesiaType?: number;
}

interface SurgerySchedule {
  id: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  surgeryType: string;
  plannedProcedure?: string;
  operatingRoomName: string;
  scheduledDateTime: string;
  estimatedDuration?: number;
  surgeonName: string;
  anesthesiologistName?: string;
  status: number; // 0: Scheduled, 1: Confirmed, 2: Preparing, 3: InProgress, 4: Completed, 5: Cancelled
}

interface OperatingRoom {
  id: string;
  roomCode: string;
  roomName: string;
  roomType: number; // 1: Major, 2: Minor, 3: Emergency, 4: Specialty
  status: number; // 1: Available, 2: InUse, 3: Maintenance, 4: Inactive
  location?: string;
  todaySchedules?: SurgerySchedule[];
}

interface SurgeryRecord {
  id: string;
  requestCode: string;
  patientName: string;
  patientCode: string;
  operatingRoomName: string;
  scheduledDateTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  actualDuration?: number;
  procedurePerformed?: string;
  surgeonName: string;
  result?: number; // 1: Success, 2: Complications, 3: Death
  isApproved: boolean;
}

// Mock data
const mockSurgeryRequests: SurgeryRequest[] = [
  {
    id: '1',
    requestCode: 'PT26010001',
    patientCode: 'BN26000001',
    patientName: 'Nguyễn Văn A',
    gender: 1,
    dateOfBirth: '1975-05-15',
    age: 51,
    requestDate: '2026-01-30T08:00:00',
    surgeryType: 'Phẫu thuật lớn',
    plannedProcedure: 'Cắt túi mật nội soi',
    requestingDoctorName: 'BS. Trần Văn B',
    priority: 2,
    status: 0,
    preOpDiagnosis: 'Viêm túi mật cấp',
    estimatedDuration: 120,
    anesthesiaType: 1,
  },
  {
    id: '2',
    requestCode: 'PT26010002',
    patientCode: 'BN26000002',
    patientName: 'Trần Thị B',
    gender: 2,
    dateOfBirth: '1990-10-20',
    age: 36,
    requestDate: '2026-01-30T09:00:00',
    surgeryType: 'Phẫu thuật nhỏ',
    plannedProcedure: 'Cắt bỏ u nang vú',
    requestingDoctorName: 'BS. Lê Thị C',
    priority: 1,
    status: 1,
    preOpDiagnosis: 'U nang vú phải',
    estimatedDuration: 60,
    anesthesiaType: 3,
  },
];

const mockSurgerySchedules: SurgerySchedule[] = [
  {
    id: '1',
    requestCode: 'PT26010002',
    patientCode: 'BN26000002',
    patientName: 'Trần Thị B',
    surgeryType: 'Phẫu thuật nhỏ',
    plannedProcedure: 'Cắt bỏ u nang vú',
    operatingRoomName: 'Phòng mổ 1',
    scheduledDateTime: '2026-01-31T08:00:00',
    estimatedDuration: 60,
    surgeonName: 'BS. Nguyễn Văn D',
    anesthesiologistName: 'BS. Hoàng Thị E',
    status: 1,
  },
];

const mockOperatingRooms: OperatingRoom[] = [
  {
    id: '1',
    roomCode: 'PM01',
    roomName: 'Phòng mổ 1',
    roomType: 1,
    status: 1,
    location: 'Tầng 3 - Khoa Ngoại',
  },
  {
    id: '2',
    roomCode: 'PM02',
    roomName: 'Phòng mổ 2',
    roomType: 1,
    status: 2,
    location: 'Tầng 3 - Khoa Ngoại',
  },
  {
    id: '3',
    roomCode: 'PM03',
    roomName: 'Phòng mổ cấp cứu',
    roomType: 3,
    status: 1,
    location: 'Khoa Cấp cứu',
  },
];

const Surgery: React.FC = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [surgeryRequests, setSurgeryRequests] = useState<SurgeryRequest[]>([]);
  const [surgerySchedules, setSurgerySchedules] = useState<SurgerySchedule[]>([]);
  const [operatingRooms, setOperatingRooms] = useState<OperatingRoom[]>([]);
  const [_surgeryRecords, _setSurgeryRecords] = useState<SurgeryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState<SurgeryRequest | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<SurgerySchedule | null>(null);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isStartSurgeryModalOpen, setIsStartSurgeryModalOpen] = useState(false);

  // Fetch data from backend API
  const fetchSurgeries = async (searchDto?: SurgerySearchDto) => {
    setLoading(true);
    try {
      const response = await getSurgeries(searchDto || { page: 1, pageSize: 20 });
      // Map API response to local SurgeryRequest format
      const requests: SurgeryRequest[] = response.data.items.map((s: SurgeryDto) => ({
        id: s.id,
        requestCode: s.surgeryCode,
        patientCode: s.patientCode,
        patientName: s.patientName,
        gender: s.gender === 'Nam' ? 1 : 2,
        dateOfBirth: s.dateOfBirth,
        requestDate: s.createdAt,
        surgeryType: s.surgeryTypeName,
        plannedProcedure: s.surgeryServiceName,
        requestingDoctorName: s.requestDoctorName || 'N/A',
        priority: s.surgeryNature,
        status: s.status,
        preOpDiagnosis: s.preOperativeDiagnosis,
        estimatedDuration: s.durationMinutes,
        anesthesiaType: s.anesthesiaType,
      }));
      setSurgeryRequests(requests);
    } catch (error) {
      console.error('Error fetching surgeries:', error);
      message.error('Không thể tải danh sách phẫu thuật');
    } finally {
      setLoading(false);
    }
  };

  const fetchOperatingRooms = async () => {
    try {
      const response = await getOperatingRooms();
      const rooms: OperatingRoom[] = response.data.map((r: OperatingRoomDto) => ({
        id: r.id,
        roomCode: r.code,
        roomName: r.name,
        roomType: r.roomType,
        status: r.status === 0 ? 1 : 2, // Map: 0=Trống->1=Available, 1=Đang sử dụng->2=InUse
        location: r.description || '',
      }));
      setOperatingRooms(rooms);
    } catch (error) {
      console.error('Error fetching operating rooms:', error);
    }
  };

  useEffect(() => {
    fetchSurgeries();
    fetchOperatingRooms();
  }, []);

  const [requestForm] = Form.useForm();
  const [scheduleForm] = Form.useForm();
  const [startSurgeryForm] = Form.useForm();

  // Get priority badge
  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1:
        return <Badge status="default" text="Bình thường" />;
      case 2:
        return <Badge status="warning" text="Khẩn" />;
      case 3:
        return <Badge status="error" text="Cấp cứu" />;
      default:
        return <Badge status="default" text="Không xác định" />;
    }
  };

  // Get request status tag
  const getRequestStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ lên lịch</Tag>;
      case 1:
        return <Tag color="blue" icon={<CalendarOutlined />}>Đã lên lịch</Tag>;
      case 2:
        return <Tag color="purple" icon={<MedicineBoxOutlined />}>Đang thực hiện</Tag>;
      case 3:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>;
      case 4:
        return <Tag color="red">Đã hủy</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Get schedule status tag
  const getScheduleStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="blue">Đã lên lịch</Tag>;
      case 1:
        return <Tag color="cyan">Đã xác nhận</Tag>;
      case 2:
        return <Tag color="orange">Đang chuẩn bị</Tag>;
      case 3:
        return <Tag color="purple" icon={<MedicineBoxOutlined />}>Đang mổ</Tag>;
      case 4:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>;
      case 5:
        return <Tag color="red">Đã hủy</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Get room status tag
  const getRoomStatusTag = (status: number) => {
    switch (status) {
      case 1:
        return <Tag color="green">Sẵn sàng</Tag>;
      case 2:
        return <Tag color="red">Đang sử dụng</Tag>;
      case 3:
        return <Tag color="orange">Đang bảo trì</Tag>;
      case 4:
        return <Tag color="default">Ngừng hoạt động</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Handle create request
  const handleCreateRequest = () => {
    requestForm.resetFields();
    setSelectedRequest(null);
    setIsRequestModalOpen(true);
  };

  const handleRequestSubmit = () => {
    requestForm.validateFields().then((values) => {
      const newRequest: SurgeryRequest = {
        id: `${surgeryRequests.length + 1}`,
        requestCode: `PT${dayjs().format('YYMMDD')}${(surgeryRequests.length + 1).toString().padStart(4, '0')}`,
        patientCode: values.patientCode,
        patientName: values.patientName,
        gender: values.gender,
        requestDate: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
        surgeryType: values.surgeryType,
        plannedProcedure: values.plannedProcedure,
        requestingDoctorName: values.requestingDoctorName,
        priority: values.priority,
        status: 0,
        preOpDiagnosis: values.preOpDiagnosis,
        estimatedDuration: values.estimatedDuration,
        anesthesiaType: values.anesthesiaType,
      };

      setSurgeryRequests([...surgeryRequests, newRequest]);
      message.success('Tạo yêu cầu phẫu thuật thành công');
      setIsRequestModalOpen(false);
      requestForm.resetFields();
    });
  };

  // Handle schedule surgery
  const handleScheduleSurgery = (record: SurgeryRequest) => {
    setSelectedRequest(record);
    scheduleForm.setFieldsValue({
      scheduledDate: dayjs().add(1, 'day'),
      scheduledTime: dayjs('08:00', 'HH:mm'),
      estimatedDuration: record.estimatedDuration || 60,
    });
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = () => {
    scheduleForm.validateFields().then((values) => {
      if (!selectedRequest) return;

      const scheduledDateTime = values.scheduledDate
        .hour(values.scheduledTime.hour())
        .minute(values.scheduledTime.minute());

      const newSchedule: SurgerySchedule = {
        id: `${surgerySchedules.length + 1}`,
        requestCode: selectedRequest.requestCode,
        patientCode: selectedRequest.patientCode,
        patientName: selectedRequest.patientName,
        surgeryType: selectedRequest.surgeryType,
        plannedProcedure: selectedRequest.plannedProcedure,
        operatingRoomName: values.operatingRoomId === '1' ? 'Phòng mổ 1' : 'Phòng mổ 2',
        scheduledDateTime: scheduledDateTime.format('YYYY-MM-DDTHH:mm:ss'),
        estimatedDuration: values.estimatedDuration,
        surgeonName: values.surgeonName,
        anesthesiologistName: values.anesthesiologistName,
        status: 0,
      };

      setSurgerySchedules([...surgerySchedules, newSchedule]);

      // Update request status
      setSurgeryRequests(prev =>
        prev.map(req =>
          req.id === selectedRequest.id ? { ...req, status: 1 } : req
        )
      );

      message.success('Lên lịch phẫu thuật thành công');
      setIsScheduleModalOpen(false);
      scheduleForm.resetFields();
      setSelectedRequest(null);
    });
  };

  // Handle start surgery
  const handleStartSurgery = (record: SurgerySchedule) => {
    setSelectedSchedule(record);
    startSurgeryForm.setFieldsValue({
      actualStartTime: dayjs(),
    });
    setIsStartSurgeryModalOpen(true);
  };

  const handleStartSurgerySubmit = () => {
    if (!selectedSchedule) return;

    // Update schedule status
    setSurgerySchedules(prev =>
      prev.map(sch =>
        sch.id === selectedSchedule.id ? { ...sch, status: 3 } : sch
      )
    );

    message.success('Bắt đầu phẫu thuật thành công');
    setIsStartSurgeryModalOpen(false);
    startSurgeryForm.resetFields();
    setSelectedSchedule(null);
  };

  // Surgery Requests columns
  const requestColumns: ColumnsType<SurgeryRequest> = [
    {
      title: 'Mã yêu cầu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 120,
      fixed: 'left',
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
      width: 150,
    },
    {
      title: 'Loại PT',
      dataIndex: 'surgeryType',
      key: 'surgeryType',
      width: 130,
    },
    {
      title: 'Phương pháp PT',
      dataIndex: 'plannedProcedure',
      key: 'plannedProcedure',
      width: 180,
    },
    {
      title: 'BS chỉ định',
      dataIndex: 'requestingDoctorName',
      key: 'requestingDoctorName',
      width: 130,
    },
    {
      title: 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 130,
      render: (priority) => getPriorityBadge(priority),
      sorter: (a, b) => b.priority - a.priority,
    },
    {
      title: 'Ngày yêu cầu',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => getRequestStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 0 && (
            <Button
              type="primary"
              size="small"
              icon={<CalendarOutlined />}
              onClick={() => handleScheduleSurgery(record)}
            >
              Lên lịch
            </Button>
          )}
          {record.status === 1 && (
            <Tag color="blue">Đã lên lịch</Tag>
          )}
        </Space>
      ),
    },
  ];

  // Surgery Schedules columns
  const scheduleColumns: ColumnsType<SurgerySchedule> = [
    {
      title: 'Mã yêu cầu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 120,
      fixed: 'left',
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
      width: 150,
    },
    {
      title: 'Phương pháp PT',
      dataIndex: 'plannedProcedure',
      key: 'plannedProcedure',
      width: 180,
    },
    {
      title: 'Phòng mổ',
      dataIndex: 'operatingRoomName',
      key: 'operatingRoomName',
      width: 130,
    },
    {
      title: 'Ngày giờ mổ',
      dataIndex: 'scheduledDateTime',
      key: 'scheduledDateTime',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Thời gian dự kiến',
      dataIndex: 'estimatedDuration',
      key: 'estimatedDuration',
      width: 130,
      render: (duration) => duration ? `${duration} phút` : '-',
    },
    {
      title: 'Phẫu thuật viên',
      dataIndex: 'surgeonName',
      key: 'surgeonName',
      width: 130,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => getScheduleStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {(record.status === 0 || record.status === 1) && (
            <Button
              type="primary"
              size="small"
              icon={<MedicineBoxOutlined />}
              onClick={() => handleStartSurgery(record)}
            >
              Bắt đầu
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Operating Rooms columns
  const roomColumns: ColumnsType<OperatingRoom> = [
    {
      title: 'Mã phòng',
      dataIndex: 'roomCode',
      key: 'roomCode',
      width: 100,
    },
    {
      title: 'Tên phòng',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 150,
    },
    {
      title: 'Loại phòng',
      dataIndex: 'roomType',
      key: 'roomType',
      width: 150,
      render: (type) => {
        const types = { 1: 'Phòng mổ lớn', 2: 'Phòng mổ nhỏ', 3: 'Phòng mổ cấp cứu', 4: 'Phòng mổ chuyên khoa' };
        return types[type as keyof typeof types] || '-';
      },
    },
    {
      title: 'Vị trí',
      dataIndex: 'location',
      key: 'location',
      width: 200,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getRoomStatusTag(status),
    },
    {
      title: 'Lịch hôm nay',
      key: 'todaySchedules',
      width: 100,
      render: (_, record) => (
        <Text>{record.todaySchedules?.length || 0} ca</Text>
      ),
    },
  ];

  // In Progress columns
  const inProgressColumns: ColumnsType<SurgerySchedule> = [
    {
      title: 'Mã yêu cầu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 120,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Phương pháp PT',
      dataIndex: 'plannedProcedure',
      key: 'plannedProcedure',
      width: 180,
    },
    {
      title: 'Phòng mổ',
      dataIndex: 'operatingRoomName',
      key: 'operatingRoomName',
      width: 130,
    },
    {
      title: 'Phẫu thuật viên',
      dataIndex: 'surgeonName',
      key: 'surgeonName',
      width: 130,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: () => (
        <Button type="primary" size="small">
          Hoàn thành
        </Button>
      ),
    },
  ];

  const pendingRequests = surgeryRequests.filter(r => r.status === 0);
  const scheduledSurgeries = surgerySchedules.filter(s => s.status < 3);
  const inProgressSurgeries = surgerySchedules.filter(s => s.status === 3);

  return (
    <div>
      <Title level={4}>Quản lý Phẫu thuật / Thủ thuật</Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'requests',
              label: (
                <span>
                  <FileTextOutlined />
                  Yêu cầu phẫu thuật
                  {pendingRequests.length > 0 && (
                    <Badge count={pendingRequests.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã yêu cầu, mã BN, tên bệnh nhân..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                      />
                    </Col>
                    <Col>
                      <Space>
                        <Button icon={<ReloadOutlined />}>Làm mới</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateRequest}>
                          Tạo yêu cầu
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  <Table
                    columns={requestColumns}
                    dataSource={surgeryRequests}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1600 }}
                    loading={loading}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} yêu cầu`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedRequest(record);
                        Modal.info({
                          title: `Chi tiết yêu cầu: ${record.requestCode}`,
                          width: 700,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Mã yêu cầu">{record.requestCode}</Descriptions.Item>
                              <Descriptions.Item label="Mã BN">{record.patientCode}</Descriptions.Item>
                              <Descriptions.Item label="Họ tên">{record.patientName}</Descriptions.Item>
                              <Descriptions.Item label="Giới tính">{record.gender === 1 ? 'Nam' : 'Nữ'}</Descriptions.Item>
                              <Descriptions.Item label="Loại PT">{record.surgeryType}</Descriptions.Item>
                              <Descriptions.Item label="Độ ưu tiên">{getPriorityBadge(record.priority)}</Descriptions.Item>
                              <Descriptions.Item label="Phương pháp PT" span={2}>{record.plannedProcedure}</Descriptions.Item>
                              <Descriptions.Item label="Chẩn đoán trước mổ" span={2}>{record.preOpDiagnosis}</Descriptions.Item>
                              <Descriptions.Item label="BS chỉ định">{record.requestingDoctorName}</Descriptions.Item>
                              <Descriptions.Item label="Thời gian dự kiến">{record.estimatedDuration ? `${record.estimatedDuration} phút` : '-'}</Descriptions.Item>
                              <Descriptions.Item label="Ngày yêu cầu">{dayjs(record.requestDate).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">{getRequestStatusTag(record.status)}</Descriptions.Item>
                            </Descriptions>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'schedules',
              label: (
                <span>
                  <CalendarOutlined />
                  Lịch phẫu thuật
                  {scheduledSurgeries.length > 0 && (
                    <Badge count={scheduledSurgeries.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col>
                      <DatePicker
                        placeholder="Chọn ngày"
                        format="DD/MM/YYYY"
                        defaultValue={dayjs()}
                      />
                    </Col>
                    <Col>
                      <Select placeholder="Chọn phòng mổ" style={{ width: 200 }} allowClear>
                        {operatingRooms.map(room => (
                          <Select.Option key={room.id} value={room.id}>
                            {room.roomName}
                          </Select.Option>
                        ))}
                      </Select>
                    </Col>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã yêu cầu, tên bệnh nhân..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                      />
                    </Col>
                  </Row>

                  <Table
                    columns={scheduleColumns}
                    dataSource={surgerySchedules}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1500 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} ca phẫu thuật`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedSchedule(record);
                        Modal.info({
                          title: `Chi tiết lịch mổ: ${record.requestCode}`,
                          width: 700,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Mã yêu cầu">{record.requestCode}</Descriptions.Item>
                              <Descriptions.Item label="Mã BN">{record.patientCode}</Descriptions.Item>
                              <Descriptions.Item label="Họ tên">{record.patientName}</Descriptions.Item>
                              <Descriptions.Item label="Loại PT">{record.surgeryType}</Descriptions.Item>
                              <Descriptions.Item label="Phòng mổ">{record.operatingRoomName}</Descriptions.Item>
                              <Descriptions.Item label="Ngày giờ mổ">{dayjs(record.scheduledDateTime).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                              <Descriptions.Item label="Phương pháp PT" span={2}>{record.plannedProcedure}</Descriptions.Item>
                              <Descriptions.Item label="Thời gian dự kiến">{record.estimatedDuration ? `${record.estimatedDuration} phút` : '-'}</Descriptions.Item>
                              <Descriptions.Item label="Phẫu thuật viên">{record.surgeonName}</Descriptions.Item>
                              <Descriptions.Item label="BS gây mê">{record.anesthesiologistName || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">{getScheduleStatusTag(record.status)}</Descriptions.Item>
                            </Descriptions>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'rooms',
              label: (
                <span>
                  <TeamOutlined />
                  Phòng mổ
                </span>
              ),
              children: (
                <>
                  <Alert
                    message="Trạng thái phòng mổ"
                    description="Theo dõi trạng thái và lịch sử dụng các phòng mổ trong ngày"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Table
                    columns={roomColumns}
                    dataSource={operatingRooms}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Chi tiết phòng mổ: ${record.roomCode}`,
                          width: 500,
                          content: (
                            <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Mã phòng">{record.roomCode}</Descriptions.Item>
                              <Descriptions.Item label="Tên phòng">{record.roomName}</Descriptions.Item>
                              <Descriptions.Item label="Loại phòng">
                                {record.roomType === 1 ? 'Phòng mổ lớn' : record.roomType === 2 ? 'Phòng mổ nhỏ' : record.roomType === 3 ? 'Phòng mổ cấp cứu' : 'Phòng mổ chuyên khoa'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Vị trí">{record.location || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">{getRoomStatusTag(record.status)}</Descriptions.Item>
                              <Descriptions.Item label="Lịch hôm nay">{record.todaySchedules?.length || 0} ca</Descriptions.Item>
                            </Descriptions>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'inprogress',
              label: (
                <span>
                  <MedicineBoxOutlined />
                  Đang thực hiện
                  {inProgressSurgeries.length > 0 && (
                    <Badge count={inProgressSurgeries.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Alert
                    message="Phẫu thuật đang thực hiện"
                    description="Danh sách các ca phẫu thuật đang được tiến hành"
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Table
                    columns={inProgressColumns}
                    dataSource={inProgressSurgeries}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedSchedule(record);
                        Modal.info({
                          title: `Ca mổ đang thực hiện: ${record.requestCode}`,
                          width: 600,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Mã yêu cầu">{record.requestCode}</Descriptions.Item>
                              <Descriptions.Item label="Mã BN">{record.patientCode}</Descriptions.Item>
                              <Descriptions.Item label="Họ tên">{record.patientName}</Descriptions.Item>
                              <Descriptions.Item label="Phòng mổ">{record.operatingRoomName}</Descriptions.Item>
                              <Descriptions.Item label="Phương pháp PT" span={2}>{record.plannedProcedure}</Descriptions.Item>
                              <Descriptions.Item label="Phẫu thuật viên">{record.surgeonName}</Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">{getScheduleStatusTag(record.status)}</Descriptions.Item>
                            </Descriptions>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'records',
              label: (
                <span>
                  <FileTextOutlined />
                  Hồ sơ phẫu thuật
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col>
                      <DatePicker.RangePicker
                        format="DD/MM/YYYY"
                        placeholder={['Từ ngày', 'Đến ngày']}
                      />
                    </Col>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã yêu cầu, tên bệnh nhân..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                      />
                    </Col>
                  </Row>

                  <Alert
                    message="Chưa có dữ liệu"
                    description="Chưa có hồ sơ phẫu thuật nào được hoàn thành"
                    type="info"
                    showIcon
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Create Request Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            <span>Tạo yêu cầu phẫu thuật</span>
          </Space>
        }
        open={isRequestModalOpen}
        onOk={handleRequestSubmit}
        onCancel={() => {
          setIsRequestModalOpen(false);
          requestForm.resetFields();
        }}
        width={800}
        okText="Tạo yêu cầu"
        cancelText="Hủy"
      >
        <Form form={requestForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="patientCode"
                label="Mã bệnh nhân"
                rules={[{ required: true, message: 'Vui lòng nhập mã bệnh nhân' }]}
              >
                <Input placeholder="Nhập hoặc tìm mã bệnh nhân" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="patientName"
                label="Tên bệnh nhân"
                rules={[{ required: true, message: 'Vui lòng nhập tên bệnh nhân' }]}
              >
                <Input placeholder="Tên bệnh nhân" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="surgeryType"
                label="Loại phẫu thuật"
                rules={[{ required: true, message: 'Vui lòng chọn loại phẫu thuật' }]}
              >
                <Select placeholder="Chọn loại phẫu thuật">
                  <Select.Option value="Phẫu thuật lớn">Phẫu thuật lớn</Select.Option>
                  <Select.Option value="Phẫu thuật nhỏ">Phẫu thuật nhỏ</Select.Option>
                  <Select.Option value="Phẫu thuật cấp cứu">Phẫu thuật cấp cứu</Select.Option>
                  <Select.Option value="Thủ thuật">Thủ thuật</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="Độ ưu tiên"
                rules={[{ required: true, message: 'Vui lòng chọn độ ưu tiên' }]}
              >
                <Select placeholder="Chọn độ ưu tiên">
                  <Select.Option value={1}>Bình thường</Select.Option>
                  <Select.Option value={2}>Khẩn</Select.Option>
                  <Select.Option value={3}>Cấp cứu</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="plannedProcedure"
            label="Phương pháp phẫu thuật"
            rules={[{ required: true, message: 'Vui lòng nhập phương pháp phẫu thuật' }]}
          >
            <Input placeholder="Nhập phương pháp phẫu thuật" />
          </Form.Item>

          <Form.Item
            name="preOpDiagnosis"
            label="Chẩn đoán trước mổ"
            rules={[{ required: true, message: 'Vui lòng nhập chẩn đoán' }]}
          >
            <TextArea rows={2} placeholder="Nhập chẩn đoán trước mổ" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="estimatedDuration"
                label="Thời gian dự kiến (phút)"
              >
                <InputNumber min={15} max={480} style={{ width: '100%' }} placeholder="60" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="anesthesiaType" label="Loại gây mê">
                <Select placeholder="Chọn loại gây mê">
                  <Select.Option value={1}>Gây mê toàn thân</Select.Option>
                  <Select.Option value={2}>Gây tê tủy sống</Select.Option>
                  <Select.Option value={3}>Gây tê موضعی</Select.Option>
                  <Select.Option value={4}>Khác</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="requestingDoctorName"
            label="Bác sĩ chỉ định"
            rules={[{ required: true, message: 'Vui lòng nhập tên bác sĩ' }]}
          >
            <Input placeholder="Tên bác sĩ chỉ định" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Schedule Surgery Modal */}
      <Modal
        title={
          <Space>
            <CalendarOutlined />
            <span>Lên lịch phẫu thuật</span>
          </Space>
        }
        open={isScheduleModalOpen}
        onOk={handleScheduleSubmit}
        onCancel={() => {
          setIsScheduleModalOpen(false);
          scheduleForm.resetFields();
          setSelectedRequest(null);
        }}
        width={800}
        okText="Lên lịch"
        cancelText="Hủy"
      >
        {selectedRequest && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã yêu cầu">{selectedRequest.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedRequest.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{selectedRequest.patientName}</Descriptions.Item>
              <Descriptions.Item label="Loại PT">{selectedRequest.surgeryType}</Descriptions.Item>
              <Descriptions.Item label="Phương pháp PT" span={2}>
                {selectedRequest.plannedProcedure}
              </Descriptions.Item>
              <Descriptions.Item label="Chẩn đoán" span={2}>
                {selectedRequest.preOpDiagnosis}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Form form={scheduleForm} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="scheduledDate"
                    label="Ngày mổ"
                    rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                  >
                    <DatePicker
                      format="DD/MM/YYYY"
                      style={{ width: '100%' }}
                      placeholder="Chọn ngày"
                      disabledDate={(current) => current && current < dayjs().startOf('day')}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="scheduledTime"
                    label="Giờ mổ"
                    rules={[{ required: true, message: 'Vui lòng chọn giờ' }]}
                  >
                    <TimePicker
                      format="HH:mm"
                      style={{ width: '100%' }}
                      placeholder="Chọn giờ"
                      minuteStep={15}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="operatingRoomId"
                    label="Phòng mổ"
                    rules={[{ required: true, message: 'Vui lòng chọn phòng mổ' }]}
                  >
                    <Select placeholder="Chọn phòng mổ">
                      {operatingRooms
                        .filter(room => room.status === 1)
                        .map(room => (
                          <Select.Option key={room.id} value={room.id}>
                            {room.roomName}
                          </Select.Option>
                        ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="estimatedDuration"
                    label="Thời gian dự kiến (phút)"
                    rules={[{ required: true, message: 'Vui lòng nhập thời gian' }]}
                  >
                    <InputNumber min={15} max={480} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="surgeonName"
                label="Phẫu thuật viên chính"
                rules={[{ required: true, message: 'Vui lòng nhập tên phẫu thuật viên' }]}
              >
                <Input placeholder="Tên phẫu thuật viên chính" />
              </Form.Item>

              <Form.Item name="anesthesiologistName" label="Bác sĩ gây mê">
                <Input placeholder="Tên bác sĩ gây mê" />
              </Form.Item>

              <Alert
                message="Lưu ý"
                description="Vui lòng kiểm tra lịch phòng mổ và ekip trước khi lên lịch"
                type="info"
                showIcon
              />
            </Form>
          </>
        )}
      </Modal>

      {/* Start Surgery Modal */}
      <Modal
        title={
          <Space>
            <MedicineBoxOutlined />
            <span>Bắt đầu phẫu thuật</span>
          </Space>
        }
        open={isStartSurgeryModalOpen}
        onOk={handleStartSurgerySubmit}
        onCancel={() => {
          setIsStartSurgeryModalOpen(false);
          startSurgeryForm.resetFields();
          setSelectedSchedule(null);
        }}
        width={700}
        okText="Bắt đầu"
        cancelText="Hủy"
      >
        {selectedSchedule && (
          <>
            <Alert
              message="Xác nhận bắt đầu phẫu thuật"
              description="Vui lòng kiểm tra kỹ thông tin bệnh nhân và ekip trước khi bắt đầu"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Mã yêu cầu">{selectedSchedule.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedSchedule.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{selectedSchedule.patientName}</Descriptions.Item>
              <Descriptions.Item label="Phòng mổ">{selectedSchedule.operatingRoomName}</Descriptions.Item>
              <Descriptions.Item label="Phương pháp PT" span={2}>
                {selectedSchedule.plannedProcedure}
              </Descriptions.Item>
              <Descriptions.Item label="Phẫu thuật viên">
                {selectedSchedule.surgeonName}
              </Descriptions.Item>
              <Descriptions.Item label="Bác sĩ gây mê">
                {selectedSchedule.anesthesiologistName || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Form form={startSurgeryForm} layout="vertical">
              <Form.Item
                name="actualStartTime"
                label="Thời gian bắt đầu"
                rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Chọn thời gian"
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Surgery;
