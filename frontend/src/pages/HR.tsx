import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Typography,
  Tabs,
  Statistic,
  Descriptions,
  Avatar,
  Calendar,
  Badge,
  message,
  Divider,
  Progress,
  Spin,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  BookOutlined,
  PrinterOutlined,
  PlusOutlined,
  WarningOutlined,
  ScheduleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  getStaff,
  getShiftDefinitions,
  getDashboard,
  createStaff,
  generateRoster,
  getRoster,
  createCMERecord,
  getNonCompliantStaff,
  getExpiringCertifications,
} from '../api/medicalHR';
import type {
  StaffProfileDto,
  RosterAssignmentDto,
  CMERecordDto,
  MedicalHRDashboardDto,
  CertificationDto,
  ShiftDefinitionDto,
  CMESummaryDto,
} from '../api/medicalHR';
import { HOSPITAL_NAME } from '../constants/hospital';

const { Title, Text } = Typography;

const POSITIONS = [
  { value: 'Doctor', label: 'Bác sĩ' },
  { value: 'Nurse', label: 'Điều dưỡng' },
  { value: 'Technician', label: 'Kỹ thuật viên' },
  { value: 'Allied', label: 'Dược sĩ' },
  { value: 'Admin', label: 'Hành chính' },
  { value: 'Support', label: 'Hỗ trợ' },
];

const HR: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<StaffProfileDto[]>([]);
  const [rosterAssignments, setRosterAssignments] = useState<RosterAssignmentDto[]>([]);
  const [cmeNonCompliant, setCmeNonCompliant] = useState<CMESummaryDto[]>([]);
  const [dashboard, setDashboard] = useState<MedicalHRDashboardDto | null>(null);
  const [expiringCerts, setExpiringCerts] = useState<CertificationDto[]>([]);
  const [shiftDefs, setShiftDefs] = useState<ShiftDefinitionDto[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<StaffProfileDto | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [shiftForm] = Form.useForm();
  const [trainingForm] = Form.useForm();
  const [employeeForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const results = await Promise.allSettled([
        getStaff({ page: 1, pageSize: 200 }),
        getDashboard(today),
        getNonCompliantStaff(),
        getExpiringCertifications(90),
        getShiftDefinitions(),
        getRoster('', dayjs().year(), dayjs().month() + 1),
      ]);

      // Staff list
      if (results[0].status === 'fulfilled') {
        const staffData = results[0].value?.data;
        if (staffData && staffData.items) {
          setEmployees(staffData.items);
        } else if (Array.isArray(staffData)) {
          setEmployees(staffData as unknown as StaffProfileDto[]);
        }
      } else {
        message.warning('Không thể tải danh sách nhân viên');
      }

      // Dashboard
      if (results[1].status === 'fulfilled') {
        setDashboard(results[1].value?.data || null);
      } else {
        message.warning('Không thể tải tổng quan nhân sự');
      }

      // CME non-compliant
      if (results[2].status === 'fulfilled') {
        const cmeData = results[2].value?.data;
        setCmeNonCompliant(Array.isArray(cmeData) ? cmeData : []);
      }

      // Expiring certifications
      if (results[3].status === 'fulfilled') {
        const certData = results[3].value?.data;
        setExpiringCerts(Array.isArray(certData) ? certData : []);
      }

      // Shift definitions
      if (results[4].status === 'fulfilled') {
        const shiftData = results[4].value?.data;
        setShiftDefs(Array.isArray(shiftData) ? shiftData : []);
      }

      // Roster assignments
      if (results[5].status === 'fulfilled') {
        const rosterData = results[5].value?.data;
        if (rosterData && rosterData.staffAssignments) {
          setRosterAssignments(rosterData.staffAssignments);
        }
      }
    } catch {
      message.warning('Có lỗi khi tải dữ liệu nhân sự');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics from dashboard or computed from data
  const activeEmployees = dashboard?.activeStaff ?? employees.filter((e) => e.employmentStatus === 1).length;
  const licenseExpiringSoon = dashboard?.expiringLicenses30Days ?? expiringCerts.length;
  const cmeIncomplete = dashboard?.cmeNonCompliant ?? cmeNonCompliant.length;

  const getStatusTag = (status: number) => {
    const config: Record<number, { color: string; text: string }> = {
      1: { color: 'green', text: 'Đang làm việc' },
      2: { color: 'orange', text: 'Nghỉ phép' },
      3: { color: 'volcano', text: 'Tạm ngừng' },
      4: { color: 'red', text: 'Đã nghỉ việc' },
    };
    const c = config[status] || { color: 'default', text: 'Không rõ' };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getShiftTag = (shiftName: string, isNightShift: boolean, isOnCall: boolean) => {
    if (isOnCall) return <Tag color="red">Trực</Tag>;
    if (isNightShift) return <Tag color="purple">Đêm</Tag>;
    const lower = shiftName.toLowerCase();
    if (lower.includes('sang') || lower.includes('morning')) return <Tag color="blue">Sáng</Tag>;
    if (lower.includes('chieu') || lower.includes('afternoon')) return <Tag color="orange">Chiều</Tag>;
    return <Tag color="blue">{shiftName}</Tag>;
  };

  const handleAddShift = async (values: any) => {
    try {
      const date = values.date ? dayjs(values.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
      const month = dayjs(date).month() + 1;
      const year = dayjs(date).year();
      const emp = employees.find((e) => e.id === values.employeeId);
      await generateRoster({
        departmentId: emp?.departmentId || '',
        year,
        month,
        respectLeaveRequests: true,
        availableStaffIds: [values.employeeId],
      });
      message.success('Đã thêm lịch trực');
      setIsShiftModalOpen(false);
      shiftForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể thêm lịch trực');
    }
  };

  const handleAddTraining = async (values: any) => {
    try {
      await createCMERecord({
        staffId: values.employeeId,
        activityType: values.trainingType || 'Workshop',
        activityName: values.trainingName,
        provider: 'Internal',
        startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        durationHours: values.credits ? Number(values.credits) : 0,
        credits: values.credits ? Number(values.credits) : 0,
        creditType: 'Category1',
        isOnline: false,
      });
      message.success('Đã đăng ký đào tạo');
      setIsTrainingModalOpen(false);
      trainingForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể đăng ký đào tạo');
    }
  };

  const handleAddEmployee = async (values: any) => {
    try {
      await createStaff({
        staffCode: values.staffCode,
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth ? dayjs(values.dateOfBirth).format('YYYY-MM-DD') : undefined,
        gender: values.gender,
        phone: values.phone,
        email: values.email,
        departmentId: values.departmentId || '',
        staffType: values.staffType || 'Doctor',
        specialty: values.specialty,
        hireDate: values.hireDate ? dayjs(values.hireDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      });
      message.success('Đã thêm nhân viên mới');
      setIsAddEmployeeModalOpen(false);
      employeeForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể thêm nhân viên');
    }
  };

  const executePrintEmployeeCard = () => {
    if (!selectedEmployee) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const mainCert = selectedEmployee.certifications?.[0];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hồ sơ nhân viên</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; max-width: 800px; margin: auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background: #f0f0f0; width: 30%; }
          .photo { width: 120px; height: 160px; border: 1px solid #000; float: right; margin-left: 20px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <strong>${HOSPITAL_NAME}</strong><br/>
          Phòng Tổ chức - Nhân sự
        </div>

        <div class="title">HỒ SƠ NHÂN VIÊN Y TẾ</div>

        <div class="photo">Ảnh 3x4</div>

        <table>
          <tr><th>Mã nhân viên</th><td>${selectedEmployee.staffCode}</td></tr>
          <tr><th>Họ và tên</th><td>${selectedEmployee.fullName}</td></tr>
          <tr><th>Giới tính</th><td>${selectedEmployee.gender === 'Male' ? 'Nam' : selectedEmployee.gender === 'Female' ? 'Nữ' : selectedEmployee.gender || '-'}</td></tr>
          <tr><th>Ngày sinh</th><td>${selectedEmployee.dateOfBirth || '-'}</td></tr>
          <tr><th>Chức vụ</th><td>${selectedEmployee.positionName || '-'}</td></tr>
          <tr><th>Khoa/Phòng</th><td>${selectedEmployee.departmentName}</td></tr>
          <tr><th>Chuyên khoa</th><td>${selectedEmployee.specialty || '-'}</td></tr>
          <tr><th>Số CCHN</th><td>${mainCert?.licenseNumber || '-'}</td></tr>
          <tr><th>CCHN hết hạn</th><td>${mainCert?.expiryDate || '-'}</td></tr>
          <tr><th>Ngày vào làm</th><td>${selectedEmployee.hireDate || '-'}</td></tr>
          <tr><th>SĐT</th><td>${selectedEmployee.phone || '-'}</td></tr>
          <tr><th>Email</th><td>${selectedEmployee.email || '-'}</td></tr>
        </table>

        <div style="margin-top: 50px; text-align: right;">
          <p>Ngày ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Trưởng phòng Nhân sự</strong></p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const employeeColumns: ColumnsType<StaffProfileDto> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={record.photoUrl} />
          <Space orientation="vertical" size={0}>
            <Text strong>{record.fullName}</Text>
            <Text type="secondary">{record.staffCode}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Chức vụ',
      key: 'position',
      render: (_, record) => record.positionName || record.staffTypeName || '-',
    },
    {
      title: 'Khoa/Phong',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Số CCHN',
      key: 'license',
      render: (_, record) => {
        const cert = record.certifications?.[0];
        if (!cert) return '-';
        const daysUntil = cert.expiryDate
          ? dayjs(cert.expiryDate).diff(dayjs(), 'day')
          : 999;
        return (
          <Space orientation="vertical" size={0}>
            <Text>{cert.licenseNumber}</Text>
            {daysUntil <= 90 && daysUntil > 0 && (
              <Tag color="orange" icon={<WarningOutlined />}>
                Còn {daysUntil} ngày
              </Tag>
            )}
            {daysUntil <= 0 && (
              <Tag color="red" icon={<WarningOutlined />}>
                Đã hết hạn
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'CME',
      key: 'cme',
      width: 120,
      render: (_, record) => {
        const summary = cmeNonCompliant.find((c) => c.staffId === record.id);
        if (!summary) return <Tag color="green">Đủ</Tag>;
        const percent = summary.requiredCredits > 0
          ? (summary.earnedCredits / summary.requiredCredits) * 100
          : 0;
        return (
          <Space orientation="vertical" size={0} style={{ width: '100%' }}>
            <Progress
              percent={Math.round(percent)}
              size="small"
              status={percent >= 100 ? 'success' : 'active'}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {summary.earnedCredits}/{summary.requiredCredits} tiết
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'employmentStatus',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setSelectedEmployee(record);
            setIsDetailModalOpen(true);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  const shiftColumns: ColumnsType<RosterAssignmentDto> = [
    {
      title: 'Nhân viên',
      dataIndex: 'staffName',
      key: 'staffName',
    },
    {
      title: 'Khoa',
      key: 'department',
      render: (_, record) => {
        const emp = employees.find((e) => e.id === record.staffId);
        return emp?.departmentName || '-';
      },
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: 'Ca',
      key: 'shiftType',
      render: (_, record) => getShiftTag(record.shiftName, false, record.isOnCall),
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_, record) => `${record.shiftStart || ''} - ${record.shiftEnd || ''}`,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config: Record<number, { color: string; text: string }> = {
          1: { color: 'blue', text: 'Đã lên lịch' },
          2: { color: 'cyan', text: 'Đã xác nhận' },
          3: { color: 'green', text: 'Hoàn thành' },
          4: { color: 'red', text: 'Vắng mặt' },
          5: { color: 'orange', text: 'Đã đổi ca' },
        };
        const c = config[status] || { color: 'default', text: 'Không rõ' };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
  ];

  const trainingColumns: ColumnsType<CMESummaryDto> = [
    {
      title: 'Nhân viên',
      dataIndex: 'staffName',
      key: 'staffName',
    },
    {
      title: 'Tổng số tiết',
      key: 'earnedCredits',
      render: (_, record) => `${record.earnedCredits}/${record.requiredCredits}`,
    },
    {
      title: 'Category 1',
      dataIndex: 'category1Credits',
      key: 'category1Credits',
    },
    {
      title: 'Category 2',
      dataIndex: 'category2Credits',
      key: 'category2Credits',
    },
    {
      title: 'Số hoạt động',
      dataIndex: 'activitiesCount',
      key: 'activitiesCount',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => {
        if (record.isCompliant) {
          return <Tag color="green">Đủ tiết</Tag>;
        }
        return <Tag color="red">Thiếu {record.shortfall} tiết</Tag>;
      },
    },
  ];

  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const dayShifts = rosterAssignments.filter((s) => {
      const sDate = s.date ? dayjs(s.date).format('YYYY-MM-DD') : '';
      return sDate === dateStr;
    });
    if (dayShifts.length === 0) return null;

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dayShifts.slice(0, 2).map((shift) => (
          <li key={shift.id}>
            <Badge
              status={
                shift.isOnCall
                  ? 'error'
                  : shift.shiftName?.toLowerCase().includes('sang') || shift.shiftName?.toLowerCase().includes('morning')
                  ? 'processing'
                  : 'warning'
              }
              text={<Text style={{ fontSize: 10 }}>{shift.staffName?.split(' ').pop()}</Text>}
            />
          </li>
        ))}
        {dayShifts.length > 2 && (
          <li><Text type="secondary" style={{ fontSize: 10 }}>+{dayShifts.length - 2} khác</Text></li>
        )}
      </ul>
    );
  };

  // Build license data from employees' certifications
  const licensedEmployees = employees.filter(
    (e) => e.certifications && e.certifications.length > 0
  );

  return (
    <Spin spinning={loading}>
      <div>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Quản lý nhân sự y tế</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Làm mới
          </Button>
        </Space>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Nhân viên đang làm việc"
                value={activeEmployees}
                prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="CCHN sắp hết hạn"
                value={licenseExpiringSoon}
                prefix={<SafetyCertificateOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="CME chưa đủ"
                value={cmeIncomplete}
                prefix={<BookOutlined style={{ color: '#ff4d4f' }} />}
                styles={{ content: { color: '#ff4d4f' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Additional dashboard stats */}
        {dashboard && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic title="Bác sĩ" value={dashboard.doctors} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic title="Điều dưỡng" value={dashboard.nurses} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic title="Ca trực hôm nay" value={dashboard.todayShifts} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic title="Nghỉ phép" value={dashboard.onLeaveStaff} />
              </Card>
            </Col>
          </Row>
        )}

        {/* Main Content */}
        <Card
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddEmployeeModalOpen(true)}>
              Thêm nhân viên
            </Button>
          }
        >
          <Tabs
            defaultActiveKey="employees"
            items={[
              {
                key: 'employees',
                label: 'Danh sách nhân viên',
                children: (
                  <Table
                    columns={employeeColumns}
                    dataSource={employees}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedEmployee(record);
                        setIsDetailModalOpen(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                    pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng: ${total} nhân viên` }}
                  />
                ),
              },
              {
                key: 'schedule',
                label: 'Lịch trực',
                children: (
                  <Row gutter={16}>
                    <Col span={16}>
                      <Calendar cellRender={dateCellRender} />
                    </Col>
                    <Col span={8}>
                      <Card
                        title="Lịch trực hôm nay"
                        extra={
                          <Button size="small" onClick={() => setIsShiftModalOpen(true)}>
                            Thêm
                          </Button>
                        }
                      >
                        <div>
                          {rosterAssignments
                            .filter((s) => {
                              const sDate = s.date ? dayjs(s.date).format('YYYY-MM-DD') : '';
                              return sDate === dayjs().format('YYYY-MM-DD');
                            })
                            .map((item) => (
                              <div key={item.id} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                                <Space>
                                  {getShiftTag(item.shiftName, false, item.isOnCall)}
                                  <Text>{item.staffName}</Text>
                                </Space>
                              </div>
                            ))}
                          {rosterAssignments.filter((s) => {
                            const sDate = s.date ? dayjs(s.date).format('YYYY-MM-DD') : '';
                            return sDate === dayjs().format('YYYY-MM-DD');
                          }).length === 0 && (
                            <Text type="secondary">Không có lịch trực hôm nay</Text>
                          )}
                        </div>
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'shifts',
                label: 'Phân ca',
                children: (
                  <>
                    <Button
                      type="primary"
                      icon={<ScheduleOutlined />}
                      style={{ marginBottom: 16 }}
                      onClick={() => setIsShiftModalOpen(true)}
                    >
                      Phân ca mới
                    </Button>
                    <Table
                      columns={shiftColumns}
                      dataSource={rosterAssignments}
                      rowKey="id"
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          const emp = employees.find((e) => e.id === record.staffId);
                          if (emp) {
                            setSelectedEmployee(emp);
                            setIsDetailModalOpen(true);
                          }
                        },
                        style: { cursor: 'pointer' },
                      })}
                      pagination={{ pageSize: 10, showSizeChanger: true }}
                    />
                  </>
                ),
              },
              {
                key: 'training',
                label: 'Đào tạo',
                children: (
                  <>
                    <Button
                      type="primary"
                      icon={<BookOutlined />}
                      style={{ marginBottom: 16 }}
                      onClick={() => setIsTrainingModalOpen(true)}
                    >
                      Đăng ký đào tạo
                    </Button>
                    <Table
                      columns={trainingColumns}
                      dataSource={cmeNonCompliant}
                      rowKey="staffId"
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          Modal.info({
                            title: `Chi tiết CME - ${record.staffName}`,
                            width: 600,
                            content: (
                              <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Nhân viên">{record.staffName}</Descriptions.Item>
                                <Descriptions.Item label="Kỳ hạn">{record.periodStart} - {record.periodEnd}</Descriptions.Item>
                                <Descriptions.Item label="Tiết yêu cầu">{record.requiredCredits}</Descriptions.Item>
                                <Descriptions.Item label="Tiết đạt được">{record.earnedCredits}</Descriptions.Item>
                                <Descriptions.Item label="Category 1">{record.category1Credits}</Descriptions.Item>
                                <Descriptions.Item label="Category 2">{record.category2Credits}</Descriptions.Item>
                                <Descriptions.Item label="Số hoạt động">{record.activitiesCount}</Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">
                                  {record.isCompliant
                                    ? <Tag color="green">Đủ tiết</Tag>
                                    : <Tag color="red">Thiếu {record.shortfall} tiết</Tag>
                                  }
                                </Descriptions.Item>
                              </Descriptions>
                            ),
                          });
                        },
                        style: { cursor: 'pointer' },
                      })}
                      pagination={{ pageSize: 10, showSizeChanger: true }}
                    />
                  </>
                ),
              },
              {
                key: 'licenses',
                label: (
                  <Badge count={expiringCerts.length} offset={[10, 0]}>
                    Chứng chỉ hành nghề
                  </Badge>
                ),
                children: (
                  <Table
                    columns={[
                      { title: 'Nhân viên', dataIndex: 'fullName', key: 'fullName' },
                      {
                        title: 'Chức vụ',
                        key: 'position',
                        render: (_, record: StaffProfileDto) => record.positionName || record.staffTypeName || '-',
                      },
                      {
                        title: 'Số CCHN',
                        key: 'licenseNumber',
                        render: (_, record: StaffProfileDto) => record.certifications?.[0]?.licenseNumber || '-',
                      },
                      {
                        title: 'Ngày hết hạn',
                        key: 'licenseExpiry',
                        render: (_, record: StaffProfileDto) => {
                          const cert = record.certifications?.[0];
                          if (!cert?.expiryDate) return '-';
                          const daysUntil = dayjs(cert.expiryDate).diff(dayjs(), 'day');
                          const color =
                            daysUntil <= 0 ? 'red' : daysUntil <= 90 ? 'orange' : 'green';
                          return <Tag color={color}>{cert.expiryDate}</Tag>;
                        },
                      },
                      {
                        title: 'Trang thai',
                        key: 'status',
                        render: (_, record: StaffProfileDto) => {
                          const cert = record.certifications?.[0];
                          if (!cert?.expiryDate) return '-';
                          const daysUntil = dayjs(cert.expiryDate).diff(dayjs(), 'day');
                          if (daysUntil <= 0) {
                            return <Tag color="red">Het han</Tag>;
                          }
                          if (daysUntil <= 90) {
                            return <Tag color="orange">Sap het han</Tag>;
                          }
                          return <Tag color="green">Con hieu luc</Tag>;
                        },
                      },
                    ]}
                    dataSource={licensedEmployees}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedEmployee(record);
                        setIsDetailModalOpen(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                  />
                ),
              },
            ]}
          />
        </Card>

        {/* Detail Modal */}
        <Modal
          title="Chi tiet nhan vien"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="print" icon={<PrinterOutlined />} onClick={executePrintEmployeeCard}>
              In ho so
            </Button>,
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
              Dong
            </Button>,
          ]}
          width={700}
        >
          {selectedEmployee && (
            <>
              <Row gutter={16}>
                <Col span={6}>
                  <Avatar size={100} icon={<UserOutlined />} src={selectedEmployee.photoUrl} />
                </Col>
                <Col span={18}>
                  <Descriptions bordered size="small" column={2}>
                    <Descriptions.Item label="Ma NV">{selectedEmployee.staffCode}</Descriptions.Item>
                    <Descriptions.Item label="Trang thai">
                      {getStatusTag(selectedEmployee.employmentStatus)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ho ten" span={2}>
                      {selectedEmployee.fullName}
                    </Descriptions.Item>
                    <Descriptions.Item label="Gioi tinh">
                      {selectedEmployee.gender === 'Male' ? 'Nam' : selectedEmployee.gender === 'Female' ? 'Nu' : selectedEmployee.gender || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngay sinh">
                      {selectedEmployee.dateOfBirth || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chuc vu">{selectedEmployee.positionName || selectedEmployee.staffTypeName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Khoa/Phong">
                      {selectedEmployee.departmentName}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chuyen khoa" span={2}>
                      {selectedEmployee.specialty || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="SDT">{selectedEmployee.phone || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Email">{selectedEmployee.email || '-'}</Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>

              {selectedEmployee.qualifications && selectedEmployee.qualifications.length > 0 && (
                <>
                  <Divider>Trinh do chuyen mon</Divider>
                  {selectedEmployee.qualifications.map((q) => (
                    <Descriptions key={q.id} bordered size="small" column={2} style={{ marginBottom: 8 }}>
                      <Descriptions.Item label="Loai">{q.qualificationType}</Descriptions.Item>
                      <Descriptions.Item label="Ten">{q.qualificationName}</Descriptions.Item>
                      <Descriptions.Item label="Co so">{q.institution}</Descriptions.Item>
                      <Descriptions.Item label="Nam">{q.yearObtained}</Descriptions.Item>
                    </Descriptions>
                  ))}
                </>
              )}

              <Divider>Chung chi hanh nghe</Divider>

              {selectedEmployee.certifications && selectedEmployee.certifications.length > 0 ? (
                selectedEmployee.certifications.map((cert) => (
                  <Descriptions key={cert.id} bordered size="small" column={2} style={{ marginBottom: 8 }}>
                    <Descriptions.Item label="So CCHN">
                      {cert.licenseNumber}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngay het han">
                      {cert.expiryDate || '-'}
                      {cert.isExpired && <Tag color="red" style={{ marginLeft: 8 }}>Het han</Tag>}
                      {cert.expiringWithin30Days && !cert.isExpired && <Tag color="orange" style={{ marginLeft: 8 }}>Sap het han</Tag>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Co quan cap">
                      {cert.issuingAuthority}
                    </Descriptions.Item>
                    <Descriptions.Item label="Xac minh">
                      {cert.verificationStatus}
                    </Descriptions.Item>
                  </Descriptions>
                ))
              ) : (
                <Text type="secondary">Chua co chung chi</Text>
              )}

              {(() => {
                const summary = cmeNonCompliant.find((c) => c.staffId === selectedEmployee.id);
                if (!summary) return null;
                const percent = summary.requiredCredits > 0
                  ? (summary.earnedCredits / summary.requiredCredits) * 100
                  : 0;
                return (
                  <>
                    <Divider>Dao tao lien tuc (CME)</Divider>
                    <Progress
                      percent={Math.round(percent)}
                      format={() =>
                        `${summary.earnedCredits}/${summary.requiredCredits} tiet`
                      }
                    />
                  </>
                );
              })()}
            </>
          )}
        </Modal>

        {/* Shift Modal */}
        <Modal
          title="Phan ca truc"
          open={isShiftModalOpen}
          onCancel={() => setIsShiftModalOpen(false)}
          onOk={() => shiftForm.submit()}
        >
          <Form form={shiftForm} layout="vertical" onFinish={handleAddShift}>
            <Form.Item name="employeeId" label="Nhan vien" rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={employees.map((e) => ({
                  value: e.id,
                  label: `${e.fullName} (${e.staffCode})`,
                }))}
              />
            </Form.Item>
            <Form.Item name="date" label="Ngay" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="shiftType" label="Ca" rules={[{ required: true }]}>
              <Select>
                {shiftDefs.length > 0 ? (
                  shiftDefs.map((sd) => (
                    <Select.Option key={sd.id} value={sd.id}>
                      {sd.name} ({sd.startTime} - {sd.endTime})
                    </Select.Option>
                  ))
                ) : (
                  <>
                    <Select.Option value="morning">Ca sang (07:00 - 14:00)</Select.Option>
                    <Select.Option value="afternoon">Ca chieu (14:00 - 21:00)</Select.Option>
                    <Select.Option value="night">Ca dem (21:00 - 07:00)</Select.Option>
                    <Select.Option value="on_call">Truc</Select.Option>
                  </>
                )}
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* Training Modal */}
        <Modal
          title="Dang ky dao tao"
          open={isTrainingModalOpen}
          onCancel={() => setIsTrainingModalOpen(false)}
          onOk={() => trainingForm.submit()}
        >
          <Form form={trainingForm} layout="vertical" onFinish={handleAddTraining}>
            <Form.Item name="employeeId" label="Nhan vien" rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={employees.map((e) => ({
                  value: e.id,
                  label: `${e.fullName} (${e.staffCode})`,
                }))}
              />
            </Form.Item>
            <Form.Item name="trainingName" label="Ten khoa hoc" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="trainingType" label="Loai" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="Conference">Hoi nghi</Select.Option>
                <Select.Option value="Workshop">Hoi thao</Select.Option>
                <Select.Option value="Webinar">Webinar</Select.Option>
                <Select.Option value="Course">Khoa hoc</Select.Option>
                <Select.Option value="SelfStudy">Tu hoc</Select.Option>
                <Select.Option value="Teaching">Giang day</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="startDate" label="Ngay bat dau" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="credits" label="So tiet">
              <Input type="number" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Add Employee Modal */}
        <Modal
          title="Them nhan vien moi"
          open={isAddEmployeeModalOpen}
          onCancel={() => setIsAddEmployeeModalOpen(false)}
          onOk={() => employeeForm.submit()}
          width={600}
        >
          <Form form={employeeForm} layout="vertical" onFinish={handleAddEmployee}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="staffCode" label="Ma nhan vien" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="fullName" label="Ho va ten" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="gender" label="Gioi tinh">
                  <Select>
                    <Select.Option value="Male">Nam</Select.Option>
                    <Select.Option value="Female">Nu</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="dateOfBirth" label="Ngay sinh">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="staffType" label="Loai nhan vien" rules={[{ required: true }]}>
                  <Select options={POSITIONS} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="specialty" label="Chuyen khoa">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="phone" label="So dien thoai">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="email" label="Email">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="hireDate" label="Ngay vao lam">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default HR;
