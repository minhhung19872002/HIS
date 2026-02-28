import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Form, Input, Select, DatePicker, Button, Steps, Result, Tag, message, Spin, Divider, Typography, Space as AntSpace } from 'antd';
import { CalendarOutlined, UserOutlined, PhoneOutlined, SearchOutlined, ClockCircleOutlined, CheckCircleOutlined, MedicineBoxOutlined, EnvironmentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getBookingDepartments, getBookingDoctors, getAvailableSlots, bookAppointment, lookupAppointment, cancelBooking,
} from '../api/appointmentBooking';
import type {
  BookingDepartmentDto, BookingDoctorDto, BookingSlotResult, BookingTimeSlot, BookingResultDto, BookingStatusDto
} from '../api/appointmentBooking';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../constants/hospital';

const { Title, Text, Paragraph } = Typography;

const AppointmentBooking = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<BookingDepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<BookingDoctorDto[]>([]);
  const [slots, setSlots] = useState<BookingSlotResult | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingTimeSlot | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResultDto | null>(null);
  const [lookupResults, setLookupResults] = useState<BookingStatusDto[]>([]);
  const [showLookup, setShowLookup] = useState(false);
  const [form] = Form.useForm();
  const [lookupForm] = Form.useForm();

  // Load departments on mount
  useEffect(() => {
    getBookingDepartments().then(setDepartments).catch(() => {});
  }, []);

  // Load doctors when department changes
  const handleDepartmentChange = useCallback(async (departmentId: string) => {
    form.setFieldValue('doctorId', undefined);
    setDoctors([]);
    setSlots(null);
    setSelectedSlot(null);
    try {
      const docs = await getBookingDoctors(departmentId);
      setDoctors(docs);
    } catch { /* ignore */ }
  }, [form]);

  // Load available slots
  const loadSlots = useCallback(async () => {
    const date = form.getFieldValue('appointmentDate');
    const deptId = form.getFieldValue('departmentId');
    const docId = form.getFieldValue('doctorId');
    if (!date) return;
    setLoading(true);
    try {
      const result = await getAvailableSlots(
        dayjs(date).format('YYYY-MM-DD'), deptId, docId
      );
      setSlots(result);
    } catch {
      message.warning('Không thể tải khung giờ');
    } finally {
      setLoading(false);
    }
  }, [form]);

  // Book appointment
  const handleBook = async () => {
    try {
      const values = await form.validateFields();
      if (!selectedSlot) {
        message.warning('Vui lòng chọn khung giờ');
        return;
      }
      setLoading(true);
      const result = await bookAppointment({
        patientName: values.patientName,
        phoneNumber: values.phoneNumber,
        email: values.email,
        dateOfBirth: values.dateOfBirth ? dayjs(values.dateOfBirth).format('YYYY-MM-DD') : undefined,
        gender: values.gender,
        identityNumber: values.identityNumber,
        address: values.address,
        appointmentDate: dayjs(values.appointmentDate).format('YYYY-MM-DD'),
        appointmentTime: selectedSlot.startTime,
        departmentId: values.departmentId,
        doctorId: values.doctorId,
        appointmentType: values.appointmentType || 2,
        reason: values.reason,
      });
      if (result.success) {
        setBookingResult(result);
        setCurrentStep(3);
        message.success('Đặt lịch thành công!');
      } else {
        message.warning(result.message || 'Không thể đặt lịch');
      }
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    } finally {
      setLoading(false);
    }
  };

  // Lookup appointment
  const handleLookup = async () => {
    const values = lookupForm.getFieldsValue();
    if (!values.lookupCode && !values.lookupPhone) {
      message.warning('Vui lòng nhập mã hẹn hoặc số điện thoại');
      return;
    }
    setLoading(true);
    try {
      const results = await lookupAppointment(values.lookupCode, values.lookupPhone);
      setLookupResults(results);
      if (results.length === 0) message.info('Không tìm thấy lịch hẹn');
    } catch {
      message.warning('Lỗi tra cứu');
    } finally {
      setLoading(false);
    }
  };

  // Cancel appointment
  const handleCancel = async (code: string) => {
    const phone = lookupForm.getFieldValue('lookupPhone');
    if (!phone) { message.warning('Cần nhập SĐT để xác thực hủy'); return; }
    try {
      await cancelBooking(code, phone, 'Bệnh nhân tự hủy');
      message.success('Đã hủy lịch hẹn');
      handleLookup();
    } catch {
      message.warning('Không thể hủy (SĐT không khớp hoặc lịch đã hoàn thành)');
    }
  };

  const statusColor = (s: number) => {
    const map: Record<number, string> = { 0: 'default', 1: 'blue', 2: 'green', 3: 'red', 4: 'default' };
    return map[s] || 'default';
  };

  // Slot selection render
  const renderSlots = (slotList: BookingTimeSlot[], label: string) => (
    <div style={{ marginBottom: 16 }}>
      <Text strong>{label}</Text>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {slotList.map((slot) => (
          <Button
            key={slot.displayTime}
            type={selectedSlot?.startTime === slot.startTime ? 'primary' : 'default'}
            disabled={!slot.isAvailable}
            onClick={() => setSelectedSlot(slot)}
            size="small"
            style={{ minWidth: 110 }}
          >
            <ClockCircleOutlined /> {slot.displayTime}
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {slot.currentBookings}/{slot.maxBookings}
            </Text>
          </Button>
        ))}
        {slotList.length === 0 && <Text type="secondary">Không có khung giờ</Text>}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16, padding: '16px 0', borderBottom: '2px solid #1890ff' }}>
        <MedicineBoxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
        <Title level={2} style={{ marginTop: 8, marginBottom: 4 }}>Đặt Lịch Khám Trực Tuyến</Title>
        <Title level={5} style={{ margin: 0, color: '#1890ff' }}>{HOSPITAL_NAME}</Title>
        <Text type="secondary">{HOSPITAL_ADDRESS} | ĐT: {HOSPITAL_PHONE}</Text>
        <div style={{ marginTop: 8, padding: '8px 16px', background: '#f6ffed', borderRadius: 6, display: 'inline-block' }}>
          <Text style={{ color: '#52c41a' }}>Đặt lịch trước - Không cần chờ đợi - Ưu tiên khám</Text>
        </div>
      </div>

      {/* Toggle: Book vs Lookup */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Button
          type={!showLookup ? 'primary' : 'default'}
          onClick={() => { setShowLookup(false); setCurrentStep(0); }}
          icon={<CalendarOutlined />}
          style={{ marginRight: 8 }}
        >
          Đặt lịch mới
        </Button>
        <Button
          type={showLookup ? 'primary' : 'default'}
          onClick={() => setShowLookup(true)}
          icon={<SearchOutlined />}
        >
          Tra cứu lịch hẹn
        </Button>
      </div>

      {/* Lookup Mode */}
      {showLookup && (
        <Card>
          <Title level={4}>Tra cứu lịch hẹn</Title>
          <Form form={lookupForm} layout="inline" style={{ marginBottom: 16 }}>
            <Form.Item name="lookupCode" label="Mã hẹn">
              <Input placeholder="VD: DK202602281234" style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="lookupPhone" label="Số điện thoại">
              <Input placeholder="0901234567" style={{ width: 160 }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" onClick={handleLookup} loading={loading} icon={<SearchOutlined />}>
                Tra cứu
              </Button>
            </Form.Item>
          </Form>

          {lookupResults.map((apt) => (
            <Card key={apt.appointmentCode} size="small" style={{ marginBottom: 8 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Text strong>{apt.appointmentCode}</Text><br />
                  <Text>{apt.patientName}</Text>
                </Col>
                <Col span={6}>
                  <CalendarOutlined /> {dayjs(apt.appointmentDate).format('DD/MM/YYYY')}
                  {apt.appointmentTime && <><br /><ClockCircleOutlined /> {apt.appointmentTime}</>}
                </Col>
                <Col span={6}>
                  {apt.departmentName && <><EnvironmentOutlined /> {apt.departmentName}<br /></>}
                  {apt.doctorName && <><UserOutlined /> {apt.doctorName}</>}
                </Col>
                <Col span={6} style={{ textAlign: 'right' }}>
                  <Tag color={statusColor(apt.status)}>{apt.statusName}</Tag>
                  {apt.status < 2 && (
                    <Button size="small" danger onClick={() => handleCancel(apt.appointmentCode)} style={{ marginTop: 4 }}>
                      Hủy
                    </Button>
                  )}
                </Col>
              </Row>
            </Card>
          ))}
          {lookupResults.length === 0 && !loading && (
            <Text type="secondary">Nhập mã hẹn hoặc số điện thoại để tra cứu</Text>
          )}
        </Card>
      )}

      {/* Booking Mode */}
      {!showLookup && (
        <>
          <Steps
            current={currentStep}
            items={[
              { title: 'Chọn khoa & ngày' },
              { title: 'Thông tin cá nhân' },
              { title: 'Xác nhận' },
              { title: 'Hoàn tất' },
            ]}
            style={{ marginBottom: 24 }}
          />

          <Spin spinning={loading}>
            <Form form={form} layout="vertical">
              {/* Step 1: Department, Doctor, Date, Time */}
              {currentStep === 0 && (
                <Card>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="departmentId" label="Khoa khám" rules={[{ required: true, message: 'Chọn khoa' }]}>
                        <Select
                          placeholder="Chọn khoa khám bệnh"
                          onChange={handleDepartmentChange}
                          options={departments.map(d => ({
                            value: d.id,
                            label: `${d.name} (${d.availableDoctors} BS)`,
                          }))}
                          showSearch
                          filterOption={(input, option) =>
                            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="doctorId" label="Bác sĩ (tùy chọn)">
                        <Select
                          placeholder="Chọn bác sĩ"
                          allowClear
                          options={doctors.map(d => ({
                            value: d.id,
                            label: `${d.title ? d.title + ' ' : ''}${d.fullName}${d.specialty ? ' - ' + d.specialty : ''}`,
                          }))}
                          showSearch
                          filterOption={(input, option) =>
                            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="appointmentDate" label="Ngày khám" rules={[{ required: true, message: 'Chọn ngày' }]}>
                        <DatePicker
                          style={{ width: '100%' }}
                          format="DD/MM/YYYY"
                          disabledDate={(d) => d.isBefore(dayjs(), 'day')}
                          onChange={() => { setSlots(null); setSelectedSlot(null); }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="appointmentType" label="Loại khám" initialValue={2}>
                        <Select options={[
                          { value: 1, label: 'Tái khám' },
                          { value: 2, label: 'Khám mới' },
                          { value: 3, label: 'Khám sức khỏe' },
                        ]} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Button type="dashed" onClick={loadSlots} icon={<ClockCircleOutlined />} style={{ marginBottom: 16 }}>
                    Xem khung giờ trống
                  </Button>

                  {slots && (
                    <div>
                      <Divider>Khung giờ ngày {dayjs(slots.date).format('DD/MM/YYYY')} - Còn trống: {slots.totalAvailable}</Divider>
                      {renderSlots(slots.morningSlots, 'Buổi sáng (7:30 - 11:30)')}
                      {renderSlots(slots.afternoonSlots, 'Buổi chiều (13:30 - 16:30)')}
                    </div>
                  )}

                  <div style={{ textAlign: 'right', marginTop: 16 }}>
                    <Button
                      type="primary"
                      onClick={() => {
                        form.validateFields(['departmentId', 'appointmentDate']).then(() => {
                          if (!selectedSlot) { message.warning('Vui lòng chọn khung giờ'); return; }
                          setCurrentStep(1);
                        }).catch(() => {});
                      }}
                    >
                      Tiếp theo
                    </Button>
                  </div>
                </Card>
              )}

              {/* Step 2: Patient Info */}
              {currentStep === 1 && (
                <Card>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="patientName" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="phoneNumber" label="Số điện thoại" rules={[{ required: true, message: 'Nhập SĐT' }]}>
                        <Input prefix={<PhoneOutlined />} placeholder="0901234567" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="email" label="Email">
                        <Input placeholder="email@example.com" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="dateOfBirth" label="Ngày sinh">
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="DD/MM/YYYY" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="gender" label="Giới tính">
                        <Select placeholder="Chọn" options={[
                          { value: 1, label: 'Nam' },
                          { value: 0, label: 'Nữ' },
                        ]} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="identityNumber" label="Số CCCD">
                        <Input placeholder="001234567890" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="address" label="Địa chỉ">
                        <Input placeholder="Số nhà, đường, phường, quận, TP" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="reason" label="Lý do khám">
                        <Input.TextArea rows={2} placeholder="Mô tả triệu chứng hoặc lý do khám" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                    <Button onClick={() => setCurrentStep(0)}>Quay lại</Button>
                    <Button type="primary" onClick={() => {
                      form.validateFields(['patientName', 'phoneNumber']).then(() => setCurrentStep(2)).catch(() => {});
                    }}>
                      Tiếp theo
                    </Button>
                  </div>
                </Card>
              )}

              {/* Step 3: Confirmation */}
              {currentStep === 2 && (
                <Card>
                  <Title level={4}>Xác nhận thông tin</Title>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Paragraph><Text strong>Họ tên:</Text> {form.getFieldValue('patientName')}</Paragraph>
                      <Paragraph><Text strong>SĐT:</Text> {form.getFieldValue('phoneNumber')}</Paragraph>
                      {form.getFieldValue('email') && <Paragraph><Text strong>Email:</Text> {form.getFieldValue('email')}</Paragraph>}
                    </Col>
                    <Col span={12}>
                      <Paragraph>
                        <Text strong>Ngày khám:</Text>{' '}
                        {form.getFieldValue('appointmentDate') ? dayjs(form.getFieldValue('appointmentDate')).format('DD/MM/YYYY') : ''}
                      </Paragraph>
                      <Paragraph><Text strong>Giờ khám:</Text> {selectedSlot?.displayTime}</Paragraph>
                      <Paragraph>
                        <Text strong>Khoa:</Text>{' '}
                        {departments.find(d => d.id === form.getFieldValue('departmentId'))?.name}
                      </Paragraph>
                      {form.getFieldValue('doctorId') && (
                        <Paragraph>
                          <Text strong>Bác sĩ:</Text>{' '}
                          {doctors.find(d => d.id === form.getFieldValue('doctorId'))?.fullName}
                        </Paragraph>
                      )}
                    </Col>
                  </Row>
                  {form.getFieldValue('reason') && (
                    <Paragraph><Text strong>Lý do:</Text> {form.getFieldValue('reason')}</Paragraph>
                  )}

                  <Divider />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Button onClick={() => setCurrentStep(1)}>Quay lại</Button>
                    <Button type="primary" size="large" onClick={handleBook} loading={loading} icon={<CheckCircleOutlined />}>
                      Xác nhận đặt lịch
                    </Button>
                  </div>
                </Card>
              )}

              {/* Step 4: Result */}
              {currentStep === 3 && bookingResult && (
                <Card>
                  <Result
                    status="success"
                    title="Đặt lịch thành công!"
                    subTitle={`Mã hẹn: ${bookingResult.appointmentCode}`}
                    extra={[
                      <Button type="primary" key="new" onClick={() => {
                        setCurrentStep(0);
                        form.resetFields();
                        setSelectedSlot(null);
                        setSlots(null);
                        setBookingResult(null);
                      }}>
                        Đặt lịch khác
                      </Button>,
                      <Button key="lookup" onClick={() => { setShowLookup(true); lookupForm.setFieldValue('lookupCode', bookingResult.appointmentCode); }}>
                        Tra cứu
                      </Button>,
                    ]}
                  />
                  <Card size="small" style={{ maxWidth: 400, margin: '0 auto' }}>
                    <Paragraph><Text strong>Mã hẹn:</Text> <Text copyable>{bookingResult.appointmentCode}</Text></Paragraph>
                    <Paragraph><Text strong>Ngày:</Text> {dayjs(bookingResult.appointmentDate).format('DD/MM/YYYY')}</Paragraph>
                    {bookingResult.appointmentTime && <Paragraph><Text strong>Giờ:</Text> {bookingResult.appointmentTime}</Paragraph>}
                    {bookingResult.departmentName && <Paragraph><Text strong>Khoa:</Text> {bookingResult.departmentName}</Paragraph>}
                    {bookingResult.doctorName && <Paragraph><Text strong>BS:</Text> {bookingResult.doctorName}</Paragraph>}
                    {bookingResult.roomName && <Paragraph><Text strong>Phòng:</Text> {bookingResult.roomName}</Paragraph>}
                    <Divider style={{ margin: '12px 0' }} />
                    <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>
                      Vui lòng lưu mã hẹn và đến viện trước giờ hẹn 15 phút.
                    </Paragraph>
                    <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
                      Mang theo CCCD/CMND và thẻ BHYT (nếu có). Liên hệ {HOSPITAL_PHONE} nếu cần hỗ trợ.
                    </Paragraph>
                  </Card>
                </Card>
              )}
            </Form>
          </Spin>
        </>
      )}
    </div>
  );
};

export default AppointmentBooking;
