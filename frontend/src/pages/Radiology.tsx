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
  Typography,
  message,
  Tabs,
  Badge,
  Descriptions,
  DatePicker,
  Alert,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  CalendarOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

// Interfaces
interface RadiologyRequest {
  id: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  serviceName: string;
  bodyPart?: string;
  contrast: boolean;
  priority: number; // 1: Normal, 2: Urgent, 3: Emergency
  requestDate: string;
  scheduledDate?: string;
  status: number; // 0: Pending, 1: Scheduled, 2: InProgress, 3: Completed, 4: Reported, 5: Approved
  departmentName?: string;
  doctorName?: string;
  clinicalInfo?: string;
  modalityName?: string;
}

interface RadiologyExam {
  id: string;
  requestId: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  serviceName: string;
  modalityCode: string;
  modalityName: string;
  accessionNumber: string;
  examDate: string;
  technicianName?: string;
  status: number; // 0: Pending, 1: InProgress, 2: Completed
  startTime?: string;
  endTime?: string;
  dose?: number;
  notes?: string;
}

interface RadiologyReport {
  id: string;
  examId: string;
  requestCode: string;
  patientName: string;
  patientCode: string;
  serviceName: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  radiologistName?: string;
  reportDate?: string;
  status: number; // 0: Draft, 1: Completed, 2: Approved
  approvedBy?: string;
  approvedAt?: string;
}

// Mock data
const mockRadiologyRequests: RadiologyRequest[] = [
  {
    id: '1',
    requestCode: 'CDHA26010001',
    patientCode: 'BN26000001',
    patientName: 'Nguyễn Văn A',
    gender: 1,
    dateOfBirth: '1985-05-15',
    serviceName: 'Chụp X-quang ngực thẳng',
    bodyPart: 'Ngực',
    contrast: false,
    priority: 3,
    requestDate: '2026-01-30T08:00:00',
    status: 0,
    departmentName: 'Khoa Nội',
    doctorName: 'BS. Trần Văn B',
    clinicalInfo: 'Ho, khó thở, nghi viêm phổi',
  },
  {
    id: '2',
    requestCode: 'CDHA26010002',
    patientCode: 'BN26000002',
    patientName: 'Trần Thị B',
    gender: 2,
    dateOfBirth: '1990-10-20',
    serviceName: 'Siêu âm ổ bụng tổng quát',
    bodyPart: 'Ổ bụng',
    contrast: false,
    priority: 1,
    requestDate: '2026-01-30T08:15:00',
    scheduledDate: '2026-01-30T10:00:00',
    status: 1,
    departmentName: 'Khoa Ngoại',
    doctorName: 'BS. Lê Thị C',
    clinicalInfo: 'Đau bụng trên, nghi viêm túi mật',
    modalityName: 'Siêu âm',
  },
];

const mockRadiologyExams: RadiologyExam[] = [
  {
    id: '1',
    requestId: '3',
    requestCode: 'CDHA26010003',
    patientCode: 'BN26000003',
    patientName: 'Phạm Văn C',
    serviceName: 'CT Scanner sọ não không cản quang',
    modalityCode: 'CT',
    modalityName: 'CT Scanner',
    accessionNumber: '202601300001',
    examDate: '2026-01-30T09:00:00',
    technicianName: 'KTV. Hoàng Văn D',
    status: 1,
    startTime: '2026-01-30T09:15:00',
  },
];

const mockRadiologyReports: RadiologyReport[] = [
  {
    id: '1',
    examId: '2',
    requestCode: 'CDHA26010004',
    patientCode: 'BN26000004',
    patientName: 'Lê Thị D',
    serviceName: 'Chụp X-quang cột sống thắt lưng',
    status: 1,
    radiologistName: 'BS. Nguyễn Văn E',
    reportDate: '2026-01-30T10:30:00',
  },
];

const Radiology: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [radiologyRequests, setRadiologyRequests] = useState<RadiologyRequest[]>(mockRadiologyRequests);
  const [radiologyExams, setRadiologyExams] = useState<RadiologyExam[]>(mockRadiologyExams);
  const [radiologyReports, setRadiologyReports] = useState<RadiologyReport[]>(mockRadiologyReports);
  const [selectedRequest, setSelectedRequest] = useState<RadiologyRequest | null>(null);
  const [selectedExam, setSelectedExam] = useState<RadiologyExam | null>(null);
  const [selectedReport, setSelectedReport] = useState<RadiologyReport | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReportViewModalOpen, setIsReportViewModalOpen] = useState(false);
  const [scheduleForm] = Form.useForm();
  const [reportForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');

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

  // Get status tag
  const getStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ thực hiện</Tag>;
      case 1:
        return <Tag color="blue" icon={<CalendarOutlined />}>Đã hẹn lịch</Tag>;
      case 2:
        return <Tag color="purple" icon={<PlayCircleOutlined />}>Đang thực hiện</Tag>;
      case 3:
        return <Tag color="cyan" icon={<CameraOutlined />}>Hoàn thành chụp</Tag>;
      case 4:
        return <Tag color="geekblue" icon={<FileSearchOutlined />}>Đã có báo cáo</Tag>;
      case 5:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Get exam status tag
  const getExamStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ thực hiện</Tag>;
      case 1:
        return <Tag color="purple" icon={<PlayCircleOutlined />}>Đang thực hiện</Tag>;
      case 2:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Get report status tag
  const getReportStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange">Nháp</Tag>;
      case 1:
        return <Tag color="cyan">Hoàn thành</Tag>;
      case 2:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Handle schedule exam
  const handleScheduleExam = (record: RadiologyRequest) => {
    setSelectedRequest(record);
    scheduleForm.setFieldsValue({
      scheduledDate: dayjs().add(1, 'hour'),
      modalityId: null,
    });
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = () => {
    scheduleForm.validateFields().then((values) => {
      setRadiologyRequests(prev =>
        prev.map(req =>
          req.id === selectedRequest?.id
            ? {
                ...req,
                status: 1,
                scheduledDate: values.scheduledDate.format('YYYY-MM-DDTHH:mm:ss'),
                modalityName: 'CT Scanner', // Mock
              }
            : req
        )
      );

      message.success('Đã hẹn lịch thành công');
      setIsScheduleModalOpen(false);
      scheduleForm.resetFields();
      setSelectedRequest(null);
    });
  };

  // Handle start exam
  const handleStartExam = (record: RadiologyExam) => {
    setRadiologyExams(prev =>
      prev.map(exam =>
        exam.id === record.id
          ? {
              ...exam,
              status: 1,
              startTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
            }
          : exam
      )
    );
    message.success('Đã bắt đầu thực hiện');
  };

  // Handle complete exam
  const handleCompleteExam = (record: RadiologyExam) => {
    setRadiologyExams(prev =>
      prev.map(exam =>
        exam.id === record.id
          ? {
              ...exam,
              status: 2,
              endTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
            }
          : exam
      )
    );

    // Update request status
    setRadiologyRequests(prev =>
      prev.map(req =>
        req.id === record.requestId
          ? { ...req, status: 3 }
          : req
      )
    );

    message.success('Đã hoàn thành thực hiện');
  };

  // Handle create report
  const handleCreateReport = (record: RadiologyExam) => {
    setSelectedExam(record);
    reportForm.resetFields();
    setIsReportModalOpen(true);
  };

  const handleReportSubmit = () => {
    reportForm.validateFields().then((values) => {
      const newReport: RadiologyReport = {
        id: `report_${Date.now()}`,
        examId: selectedExam!.id,
        requestCode: selectedExam!.requestCode,
        patientCode: selectedExam!.patientCode,
        patientName: selectedExam!.patientName,
        serviceName: selectedExam!.serviceName,
        findings: values.findings,
        impression: values.impression,
        recommendations: values.recommendations,
        status: 1,
        radiologistName: 'BS. Nguyễn Văn E',
        reportDate: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
      };

      setRadiologyReports(prev => [...prev, newReport]);

      // Update request status
      setRadiologyRequests(prev =>
        prev.map(req =>
          req.requestCode === selectedExam!.requestCode
            ? { ...req, status: 4 }
            : req
        )
      );

      message.success('Đã tạo báo cáo thành công');
      setIsReportModalOpen(false);
      reportForm.resetFields();
      setSelectedExam(null);
    });
  };

  // Handle approve report
  const handleApproveReport = (record: RadiologyReport) => {
    Modal.confirm({
      title: 'Xác nhận duyệt báo cáo',
      content: `Bạn có chắc chắn muốn duyệt báo cáo ${record.requestCode}?`,
      onOk: () => {
        setRadiologyReports(prev =>
          prev.map(r =>
            r.id === record.id
              ? {
                  ...r,
                  status: 2,
                  approvedBy: 'BS. Trưởng khoa CĐHA',
                  approvedAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
                }
              : r
          )
        );

        // Update request status
        setRadiologyRequests(prev =>
          prev.map(req =>
            req.requestCode === record.requestCode
              ? { ...req, status: 5 }
              : req
          )
        );

        message.success('Đã duyệt báo cáo thành công');
      },
    });
  };

  // Pending Requests columns
  const pendingColumns: ColumnsType<RadiologyRequest> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 130,
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
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 200,
    },
    {
      title: 'Vùng chụp',
      dataIndex: 'bodyPart',
      key: 'bodyPart',
      width: 120,
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
      title: 'Ngày chỉ định',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'doctorName',
      key: 'doctorName',
      width: 130,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<CalendarOutlined />}
          onClick={() => handleScheduleExam(record)}
        >
          Hẹn lịch
        </Button>
      ),
    },
  ];

  // Worklist columns
  const worklistColumns: ColumnsType<RadiologyRequest> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 130,
      fixed: 'left',
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 200,
    },
    {
      title: 'Modality',
      dataIndex: 'modalityName',
      key: 'modalityName',
      width: 120,
    },
    {
      title: 'Giờ hẹn',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      width: 150,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 130,
      render: (priority) => getPriorityBadge(priority),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => getStatusTag(status),
    },
  ];

  // In Progress Exams columns
  const inProgressColumns: ColumnsType<RadiologyExam> = [
    {
      title: 'Accession No.',
      dataIndex: 'accessionNumber',
      key: 'accessionNumber',
      width: 140,
      fixed: 'left',
    },
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 130,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 200,
    },
    {
      title: 'Modality',
      dataIndex: 'modalityName',
      key: 'modalityName',
      width: 120,
    },
    {
      title: 'KTV',
      dataIndex: 'technicianName',
      key: 'technicianName',
      width: 130,
    },
    {
      title: 'Thời gian bắt đầu',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 150,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => getExamStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 0 && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartExam(record)}
            >
              Bắt đầu
            </Button>
          )}
          {record.status === 1 && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleCompleteExam(record)}
            >
              Hoàn thành
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Reporting columns
  const reportingColumns: ColumnsType<RadiologyExam> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 130,
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
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 200,
    },
    {
      title: 'Ngày thực hiện',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 150,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<FileSearchOutlined />}
          onClick={() => handleCreateReport(record)}
        >
          Đọc kết quả
        </Button>
      ),
    },
  ];

  // Completed Reports columns
  const completedColumns: ColumnsType<RadiologyReport> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 130,
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
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 200,
    },
    {
      title: 'Bác sĩ đọc',
      dataIndex: 'radiologistName',
      key: 'radiologistName',
      width: 130,
    },
    {
      title: 'Ngày đọc',
      dataIndex: 'reportDate',
      key: 'reportDate',
      width: 150,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getReportStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 1 && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApproveReport(record)}
            >
              Duyệt
            </Button>
          )}
          <Button
            size="small"
            icon={<FileSearchOutlined />}
            onClick={() => {
              setSelectedReport(record);
              setIsReportViewModalOpen(true);
            }}
          >
            Xem
          </Button>
          {record.status === 2 && (
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => message.info(`In báo cáo ${record.requestCode}`)}
            >
              In
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Filter data
  const pendingRequests = radiologyRequests.filter(r => r.status === 0);
  const scheduledRequests = radiologyRequests.filter(r => r.status === 1);
  const inProgressExams = radiologyExams;
  const completedExams = radiologyExams.filter(e => e.status === 2);
  const completedReports = radiologyReports;

  return (
    <div>
      <Title level={4}>Quản lý Chẩn đoán Hình ảnh (RIS/PACS)</Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'pending',
              label: (
                <span>
                  <ClockCircleOutlined />
                  Chờ thực hiện
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
                        placeholder="Tìm theo mã phiếu, mã BN, tên bệnh nhân..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                    </Col>
                    <Col>
                      <Button icon={<ReloadOutlined />} onClick={() => message.info('Đã làm mới danh sách')}>
                        Làm mới
                      </Button>
                    </Col>
                  </Row>

                  <Table
                    columns={pendingColumns}
                    dataSource={pendingRequests}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1500 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} phiếu`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'worklist',
              label: (
                <span>
                  <CalendarOutlined />
                  Worklist
                  {scheduledRequests.length > 0 && (
                    <Badge count={scheduledRequests.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col>
                      <Select
                        placeholder="Chọn Modality"
                        style={{ width: 200 }}
                        allowClear
                        options={[
                          { value: 'XR', label: 'X-quang' },
                          { value: 'CT', label: 'CT Scanner' },
                          { value: 'MR', label: 'MRI' },
                          { value: 'US', label: 'Siêu âm' },
                        ]}
                      />
                    </Col>
                  </Row>

                  <Table
                    columns={worklistColumns}
                    dataSource={scheduledRequests}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1200 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} phiếu`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'inProgress',
              label: (
                <span>
                  <PlayCircleOutlined />
                  Đang thực hiện
                  {inProgressExams.length > 0 && (
                    <Badge count={inProgressExams.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Alert
                    message="Lưu ý"
                    description="Theo dõi và quản lý các lượt chụp đang thực hiện"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Table
                    columns={inProgressColumns}
                    dataSource={inProgressExams}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1300 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} lượt`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'reporting',
              label: (
                <span>
                  <FileSearchOutlined />
                  Đọc kết quả
                  {completedExams.length > 0 && (
                    <Badge count={completedExams.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Alert
                    message="Đọc và nhập kết quả"
                    description="Nhập kết quả chẩn đoán hình ảnh cho các lượt chụp đã hoàn thành"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Table
                    columns={reportingColumns}
                    dataSource={completedExams}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1200 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} lượt`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'completed',
              label: (
                <span>
                  <CheckCircleOutlined />
                  Đã hoàn thành
                  {completedReports.filter(r => r.status === 2).length > 0 && (
                    <Badge count={completedReports.filter(r => r.status === 2).length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã phiếu, mã BN..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                      />
                    </Col>
                  </Row>

                  <Table
                    columns={completedColumns}
                    dataSource={completedReports}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1300 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} báo cáo`,
                    }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Schedule Exam Modal */}
      <Modal
        title={
          <Space>
            <CalendarOutlined />
            <span>Hẹn lịch thực hiện</span>
          </Space>
        }
        open={isScheduleModalOpen}
        onOk={handleScheduleSubmit}
        onCancel={() => {
          setIsScheduleModalOpen(false);
          scheduleForm.resetFields();
          setSelectedRequest(null);
        }}
        width={700}
        okText="Lưu"
        cancelText="Hủy"
      >
        {selectedRequest && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã phiếu">{selectedRequest.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedRequest.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{selectedRequest.patientName}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">
                {selectedRequest.dateOfBirth ? dayjs(selectedRequest.dateOfBirth).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Dịch vụ" span={2}>
                <Tag color="blue">{selectedRequest.serviceName}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Vùng chụp" span={2}>
                {selectedRequest.bodyPart || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Form form={scheduleForm} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="modalityId"
                    label="Chọn Modality"
                    rules={[{ required: true, message: 'Vui lòng chọn modality' }]}
                  >
                    <Select placeholder="Chọn modality">
                      <Select.Option value="1">X-quang - Phòng 1</Select.Option>
                      <Select.Option value="2">CT Scanner - Phòng 2</Select.Option>
                      <Select.Option value="3">MRI - Phòng 3</Select.Option>
                      <Select.Option value="4">Siêu âm - Phòng 4</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="scheduledDate"
                    label="Thời gian hẹn"
                    rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
                  >
                    <DatePicker
                      showTime
                      format="DD/MM/YYYY HH:mm"
                      style={{ width: '100%' }}
                      placeholder="Chọn thời gian"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="notes" label="Ghi chú">
                <TextArea rows={3} placeholder="Nhập ghi chú (nếu có)" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* Report Modal */}
      <Modal
        title={
          <Space>
            <FileSearchOutlined />
            <span>Nhập kết quả chẩn đoán hình ảnh</span>
          </Space>
        }
        open={isReportModalOpen}
        onOk={handleReportSubmit}
        onCancel={() => {
          setIsReportModalOpen(false);
          reportForm.resetFields();
          setSelectedExam(null);
        }}
        width={900}
        okText="Lưu báo cáo"
        cancelText="Hủy"
      >
        {selectedExam && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã phiếu">{selectedExam.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedExam.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{selectedExam.patientName}</Descriptions.Item>
              <Descriptions.Item label="Dịch vụ">
                <Tag color="blue">{selectedExam.serviceName}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Accession No.">{selectedExam.accessionNumber}</Descriptions.Item>
              <Descriptions.Item label="Modality">{selectedExam.modalityName}</Descriptions.Item>
            </Descriptions>

            <Divider>Kết quả chẩn đoán</Divider>

            <Form form={reportForm} layout="vertical">
              <Form.Item
                name="findings"
                label="Mô tả hình ảnh"
                rules={[{ required: true, message: 'Vui lòng nhập mô tả hình ảnh' }]}
              >
                <TextArea rows={6} placeholder="Nhập mô tả chi tiết hình ảnh..." />
              </Form.Item>

              <Form.Item
                name="impression"
                label="Kết luận"
                rules={[{ required: true, message: 'Vui lòng nhập kết luận' }]}
              >
                <TextArea rows={4} placeholder="Nhập kết luận..." />
              </Form.Item>

              <Form.Item name="recommendations" label="Đề nghị">
                <TextArea rows={3} placeholder="Nhập đề nghị (nếu có)..." />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* Report View Modal */}
      <Modal
        title={
          <Space>
            <FileSearchOutlined />
            <span>Xem báo cáo chẩn đoán hình ảnh</span>
          </Space>
        }
        open={isReportViewModalOpen}
        onCancel={() => {
          setIsReportViewModalOpen(false);
          setSelectedReport(null);
        }}
        width={900}
        footer={[
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => selectedReport && message.info(`In báo cáo ${selectedReport.requestCode}`)}
          >
            In báo cáo
          </Button>,
          <Button key="close" onClick={() => setIsReportViewModalOpen(false)}>
            Đóng
          </Button>,
        ]}
      >
        {selectedReport && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã phiếu">{selectedReport.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedReport.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{selectedReport.patientName}</Descriptions.Item>
              <Descriptions.Item label="Dịch vụ">
                <Tag color="blue">{selectedReport.serviceName}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Bác sĩ đọc">{selectedReport.radiologistName}</Descriptions.Item>
              <Descriptions.Item label="Ngày đọc">
                {selectedReport.reportDate ? dayjs(selectedReport.reportDate).format('DD/MM/YYYY HH:mm') : '-'}
              </Descriptions.Item>
              {selectedReport.approvedBy && (
                <>
                  <Descriptions.Item label="Người duyệt">{selectedReport.approvedBy}</Descriptions.Item>
                  <Descriptions.Item label="Thời gian duyệt">
                    {selectedReport.approvedAt ? dayjs(selectedReport.approvedAt).format('DD/MM/YYYY HH:mm') : '-'}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>

            <Divider>Kết quả chẩn đoán</Divider>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Mô tả hình ảnh:</Text>
              <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                <Text>{selectedReport.findings || 'Chưa có mô tả'}</Text>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Kết luận:</Text>
              <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                <Text>{selectedReport.impression || 'Chưa có kết luận'}</Text>
              </div>
            </div>

            {selectedReport.recommendations && (
              <div>
                <Text strong>Đề nghị:</Text>
                <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                  <Text>{selectedReport.recommendations}</Text>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default Radiology;
