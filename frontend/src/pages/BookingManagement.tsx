import { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Input, Select, DatePicker, Row, Col, Tag, Tabs, Statistic,
  Modal, Form, message, Spin, Divider, Typography, Space as AntSpace, Tooltip, Popconfirm, TimePicker, Progress,
} from 'antd';
import {
  CalendarOutlined, SearchOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UserOutlined, PlusOutlined, ReloadOutlined, DeleteOutlined, LoginOutlined,
  TeamOutlined, ScheduleOutlined, BarChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as bookingApi from '../api/bookingManagement';
import type { DoctorScheduleListDto, BookingStatsDto } from '../api/bookingManagement';
import type { BookingStatusDto } from '../api/appointmentBooking';
import { getBookingDepartments, getBookingDoctors } from '../api/appointmentBooking';
import type { BookingDepartmentDto, BookingDoctorDto } from '../api/appointmentBooking';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const BookingManagement = () => {
  const [activeTab, setActiveTab] = useState('bookings');
  const [loading, setLoading] = useState(false);

  // Booking list state
  const [bookings, setBookings] = useState<BookingStatusDto[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [bookingPage, setBookingPage] = useState(0);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatus, setBookingStatus] = useState<number | undefined>(undefined);
  const [bookingDateRange, setBookingDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // Schedule state
  const [schedules, setSchedules] = useState<DoctorScheduleListDto[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleForm] = Form.useForm();
  const [editingSchedule, setEditingSchedule] = useState<DoctorScheduleListDto | null>(null);

  // Stats state
  const [stats, setStats] = useState<BookingStatsDto | null>(null);
  const [statsDate, setStatsDate] = useState<dayjs.Dayjs>(dayjs());

  // Reference data
  const [departments, setDepartments] = useState<BookingDepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<BookingDoctorDto[]>([]);

  useEffect(() => {
    getBookingDepartments().then(setDepartments).catch(() => {});
    getBookingDoctors().then(setDoctors).catch(() => {});
  }, []);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await bookingApi.getBookings({
        fromDate: bookingDateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: bookingDateRange?.[1]?.format('YYYY-MM-DD'),
        status: bookingStatus,
        keyword: bookingSearch || undefined,
        pageIndex: bookingPage,
        pageSize: 20,
      });
      setBookings(result.items);
      setTotalBookings(result.totalCount);
    } catch {
      message.warning('Không thể tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  }, [bookingDateRange, bookingStatus, bookingSearch, bookingPage]);

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const result = await bookingApi.getDoctorSchedules({
        fromDate: dayjs().format('YYYY-MM-DD'),
        toDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
      });
      setSchedules(result);
    } catch {
      message.warning('Không thể tải lịch bác sĩ');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await bookingApi.getBookingStats(statsDate.format('YYYY-MM-DD'));
      setStats(result);
    } catch {
      message.warning('Không thể tải thống kê');
    }
  }, [statsDate]);

  useEffect(() => {
    if (activeTab === 'bookings') fetchBookings();
    else if (activeTab === 'schedules') fetchSchedules();
    else if (activeTab === 'stats') fetchStats();
  }, [activeTab, fetchBookings, fetchSchedules, fetchStats]);

  // Booking actions
  const handleConfirm = async (code: string) => {
    try {
      await bookingApi.confirmBooking(code);
      message.success('Đã xác nhận');
      fetchBookings();
    } catch { message.warning('Lỗi xác nhận'); }
  };

  const handleCheckin = async (code: string) => {
    try {
      await bookingApi.checkInBooking(code);
      message.success('Đã check-in');
      fetchBookings();
    } catch { message.warning('Lỗi check-in'); }
  };

  const handleNoShow = async (code: string) => {
    try {
      await bookingApi.markNoShow(code);
      message.success('Đã đánh dấu không đến');
      fetchBookings();
    } catch { message.warning('Lỗi cập nhật'); }
  };

  // Schedule CRUD
  const handleSaveSchedule = async () => {
    try {
      const values = await scheduleForm.validateFields();
      await bookingApi.saveDoctorSchedule({
        id: editingSchedule?.id,
        doctorId: values.doctorId,
        departmentId: values.departmentId,
        roomId: values.roomId,
        scheduleDate: dayjs(values.scheduleDate).format('YYYY-MM-DD'),
        startTime: dayjs(values.startTime).format('HH:mm:ss'),
        endTime: dayjs(values.endTime).format('HH:mm:ss'),
        maxPatients: values.maxPatients || 30,
        slotDurationMinutes: values.slotDurationMinutes || 30,
        scheduleType: values.scheduleType || 1,
        note: values.note,
        isRecurring: values.isRecurring || false,
      });
      message.success(editingSchedule ? 'Đã cập nhật' : 'Đã tạo lịch');
      setScheduleModalOpen(false);
      scheduleForm.resetFields();
      setEditingSchedule(null);
      fetchSchedules();
    } catch { message.warning('Vui lòng điền đầy đủ thông tin'); }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await bookingApi.deleteDoctorSchedule(id);
      message.success('Đã xóa');
      fetchSchedules();
    } catch { message.warning('Lỗi xóa'); }
  };

  const openScheduleModal = (schedule?: DoctorScheduleListDto) => {
    setEditingSchedule(schedule || null);
    if (schedule) {
      scheduleForm.setFieldsValue({
        doctorId: schedule.doctorId,
        departmentId: schedule.departmentId,
        roomId: schedule.roomId,
        scheduleDate: dayjs(schedule.scheduleDate),
        startTime: dayjs(schedule.startTime, 'HH:mm:ss'),
        endTime: dayjs(schedule.endTime, 'HH:mm:ss'),
        maxPatients: schedule.maxPatients,
        slotDurationMinutes: schedule.slotDurationMinutes,
        scheduleType: schedule.scheduleType,
        note: schedule.note,
        isRecurring: schedule.isRecurring,
      });
    } else {
      scheduleForm.resetFields();
    }
    setScheduleModalOpen(true);
  };

  const statusColor = (s: number) => {
    const map: Record<number, string> = { 0: 'default', 1: 'blue', 2: 'green', 3: 'red', 4: 'default' };
    return map[s] || 'default';
  };

  // Booking columns
  const bookingColumns: ColumnsType<BookingStatusDto> = [
    {
      title: 'Mã hẹn', dataIndex: 'appointmentCode', width: 140,
      render: (code: string) => <Text strong copyable>{code}</Text>,
    },
    { title: 'Bệnh nhân', dataIndex: 'patientName', width: 150 },
    { title: 'SĐT', dataIndex: 'phoneNumber', width: 120 },
    {
      title: 'Ngày', dataIndex: 'appointmentDate', width: 100,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Giờ', dataIndex: 'appointmentTime', width: 80,
      render: (t: string) => t ? t.substring(0, 5) : '-',
    },
    { title: 'Khoa', dataIndex: 'departmentName', width: 150 },
    { title: 'Bác sĩ', dataIndex: 'doctorName', width: 130 },
    {
      title: 'Loại', dataIndex: 'appointmentTypeName', width: 100,
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: (_: number, record: BookingStatusDto) => (
        <Tag color={statusColor(record.status)}>{record.statusName}</Tag>
      ),
    },
    {
      title: 'Thao tác', width: 200, fixed: 'right' as const,
      render: (_: unknown, record: BookingStatusDto) => (
        <AntSpace orientation="horizontal" size={4}>
          {record.status === 0 && (
            <Tooltip title="Xác nhận">
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleConfirm(record.appointmentCode)} />
            </Tooltip>
          )}
          {record.status <= 1 && (
            <Tooltip title="Check-in">
              <Button size="small" icon={<LoginOutlined />} onClick={() => handleCheckin(record.appointmentCode)} />
            </Tooltip>
          )}
          {record.status <= 1 && (
            <Tooltip title="Không đến">
              <Popconfirm title="Đánh dấu không đến?" onConfirm={() => handleNoShow(record.appointmentCode)}>
                <Button size="small" danger icon={<CloseCircleOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </AntSpace>
      ),
    },
  ];

  // Schedule columns
  const scheduleColumns: ColumnsType<DoctorScheduleListDto> = [
    {
      title: 'Ngày', dataIndex: 'scheduleDate', width: 100,
      render: (d: string) => dayjs(d).format('DD/MM (ddd)'),
    },
    { title: 'Bác sĩ', dataIndex: 'doctorName', width: 150,
      render: (name: string, r: DoctorScheduleListDto) => `${r.title ? r.title + ' ' : ''}${name}`,
    },
    { title: 'Khoa', dataIndex: 'departmentName', width: 150 },
    { title: 'Phòng', dataIndex: 'roomName', width: 100 },
    {
      title: 'Ca', width: 120,
      render: (_: unknown, r: DoctorScheduleListDto) =>
        `${r.startTime.substring(0, 5)} - ${r.endTime.substring(0, 5)}`,
    },
    {
      title: 'Đã đặt / Tối đa', width: 120,
      render: (_: unknown, r: DoctorScheduleListDto) => (
        <Progress
          percent={Math.round(r.bookedCount / r.maxPatients * 100)}
          size="small"
          format={() => `${r.bookedCount}/${r.maxPatients}`}
          status={r.bookedCount >= r.maxPatients ? 'exception' : 'active'}
        />
      ),
    },
    {
      title: 'Trạng thái', width: 100,
      render: (_: unknown, r: DoctorScheduleListDto) => (
        <>
          {r.isActive ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Nghỉ</Tag>}
          {r.isRecurring && <Tag color="blue">Lặp</Tag>}
        </>
      ),
    },
    {
      title: 'Thao tác', width: 120,
      render: (_: unknown, r: DoctorScheduleListDto) => (
        <AntSpace orientation="horizontal" size={4}>
          <Button size="small" onClick={() => openScheduleModal(r)}>Sửa</Button>
          <Popconfirm title="Xóa lịch này?" onConfirm={() => handleDeleteSchedule(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </AntSpace>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}><ScheduleOutlined /> Quản lý đặt lịch</Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'bookings',
            label: <><CalendarOutlined /> Lịch hẹn</>,
            children: (
              <Card>
                <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                  <Col xs={24} sm={8}>
                    <Input
                      placeholder="Tìm mã hẹn, tên BN, SĐT..."
                      prefix={<SearchOutlined />}
                      value={bookingSearch}
                      onChange={e => setBookingSearch(e.target.value)}
                      onPressEnter={fetchBookings}
                    />
                  </Col>
                  <Col xs={12} sm={4}>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="Trạng thái"
                      allowClear
                      value={bookingStatus}
                      onChange={setBookingStatus}
                      options={[
                        { value: 0, label: 'Chờ xác nhận' },
                        { value: 1, label: 'Đã xác nhận' },
                        { value: 2, label: 'Đã đến khám' },
                        { value: 3, label: 'Không đến' },
                        { value: 4, label: 'Đã hủy' },
                      ]}
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <RangePicker
                      style={{ width: '100%' }}
                      format="DD/MM/YYYY"
                      value={bookingDateRange}
                      onChange={(dates) => setBookingDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                    />
                  </Col>
                  <Col xs={24} sm={4}>
                    <Button type="primary" icon={<SearchOutlined />} onClick={fetchBookings}>Tìm</Button>
                    <Button icon={<ReloadOutlined />} onClick={() => { setBookingSearch(''); setBookingStatus(undefined); setBookingDateRange(null); setBookingPage(0); }} style={{ marginLeft: 8 }}>Xóa lọc</Button>
                  </Col>
                </Row>

                <Table
                  columns={bookingColumns}
                  dataSource={bookings}
                  rowKey="appointmentCode"
                  loading={loading}
                  size="small"
                  scroll={{ x: 1200 }}
                  pagination={{
                    current: bookingPage + 1,
                    pageSize: 20,
                    total: totalBookings,
                    onChange: (page) => setBookingPage(page - 1),
                    showTotal: (total) => `Tổng ${total} lịch hẹn`,
                  }}
                />
              </Card>
            ),
          },
          {
            key: 'schedules',
            label: <><TeamOutlined /> Lịch bác sĩ</>,
            children: (
              <Card>
                <div style={{ marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openScheduleModal()}>
                    Thêm lịch làm việc
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={fetchSchedules} style={{ marginLeft: 8 }}>
                    Làm mới
                  </Button>
                </div>

                <Table
                  columns={scheduleColumns}
                  dataSource={schedules}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  scroll={{ x: 1000 }}
                  pagination={{ pageSize: 50, showTotal: (total) => `Tổng ${total} ca` }}
                />
              </Card>
            ),
          },
          {
            key: 'stats',
            label: <><BarChartOutlined /> Thống kê</>,
            children: (
              <Card>
                <div style={{ marginBottom: 16 }}>
                  <DatePicker
                    value={statsDate}
                    onChange={(d) => d && setStatsDate(d)}
                    format="DD/MM/YYYY"
                  />
                  <Button icon={<ReloadOutlined />} onClick={fetchStats} style={{ marginLeft: 8 }}>Làm mới</Button>
                </div>

                {stats && (
                  <>
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                      <Col xs={8} sm={4}>
                        <Statistic title="Tổng lịch hẹn" value={stats.totalBookings} />
                      </Col>
                      <Col xs={8} sm={4}>
                        <Statistic title="Chờ xác nhận" value={stats.pending} styles={{ content: { color: '#faad14' } }} />
                      </Col>
                      <Col xs={8} sm={4}>
                        <Statistic title="Đã xác nhận" value={stats.confirmed} styles={{ content: { color: '#1890ff' } }} />
                      </Col>
                      <Col xs={8} sm={4}>
                        <Statistic title="Đã đến khám" value={stats.attended} styles={{ content: { color: '#52c41a' } }} />
                      </Col>
                      <Col xs={8} sm={4}>
                        <Statistic title="Không đến" value={stats.noShow} styles={{ content: { color: '#ff4d4f' } }} />
                      </Col>
                      <Col xs={8} sm={4}>
                        <Statistic title="Tỷ lệ vắng" value={stats.noShowRate} suffix="%" styles={{ content: { color: stats.noShowRate > 20 ? '#ff4d4f' : '#333' } }} />
                      </Col>
                    </Row>

                    <Divider>Phân bổ theo khoa</Divider>
                    {stats.byDepartment.map((dept) => (
                      <div key={dept.departmentName} style={{ marginBottom: 8 }}>
                        <Row>
                          <Col span={8}><Text>{dept.departmentName}</Text></Col>
                          <Col span={16}>
                            <Progress
                              percent={stats.totalBookings > 0 ? Math.round(dept.count / stats.totalBookings * 100) : 0}
                              format={() => `${dept.count}`}
                            />
                          </Col>
                        </Row>
                      </div>
                    ))}
                    {stats.byDepartment.length === 0 && <Text type="secondary">Không có dữ liệu</Text>}
                  </>
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* Schedule Modal */}
      <Modal
        title={editingSchedule ? 'Sửa lịch làm việc' : 'Thêm lịch làm việc'}
        open={scheduleModalOpen}
        onOk={handleSaveSchedule}
        onCancel={() => { setScheduleModalOpen(false); scheduleForm.resetFields(); setEditingSchedule(null); }}
        destroyOnHidden
        width={600}
      >
        <Form form={scheduleForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="doctorId" label="Bác sĩ" rules={[{ required: true, message: 'Chọn bác sĩ' }]}>
                <Select
                  placeholder="Chọn bác sĩ"
                  showSearch
                  filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                  options={doctors.map(d => ({ value: d.id, label: `${d.title ? d.title + ' ' : ''}${d.fullName}` }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="departmentId" label="Khoa" rules={[{ required: true, message: 'Chọn khoa' }]}>
                <Select
                  placeholder="Chọn khoa"
                  options={departments.map(d => ({ value: d.id, label: d.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scheduleDate" label="Ngày" rules={[{ required: true, message: 'Chọn ngày' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scheduleType" label="Loại ca" initialValue={1}>
                <Select options={[
                  { value: 1, label: 'Thường' },
                  { value: 2, label: 'Trực' },
                  { value: 3, label: 'Hẹn trước' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="startTime" label="Giờ bắt đầu" rules={[{ required: true, message: 'Chọn giờ' }]}>
                <TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="Giờ kết thúc" rules={[{ required: true, message: 'Chọn giờ' }]}>
                <TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxPatients" label="Số BN tối đa" initialValue={30}>
                <Input type="number" min={1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="slotDurationMinutes" label="Thời gian slot (phút)" initialValue={30}>
                <Select options={[
                  { value: 15, label: '15 phút' },
                  { value: 20, label: '20 phút' },
                  { value: 30, label: '30 phút' },
                  { value: 45, label: '45 phút' },
                  { value: 60, label: '60 phút' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="note" label="Ghi chú">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default BookingManagement;
