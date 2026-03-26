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
  InputNumber,
  Descriptions,
  Divider,
} from 'antd';
import {
  ReadOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import * as schoolHealthApi from '../api/schoolHealth';
import type { SchoolExam, SchoolStats, School } from '../api/schoolHealth';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;

const NUTRITION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  normal: { label: 'Bình thường', color: 'green' },
  underweight: { label: 'Nhẹ cân', color: 'orange' },
  overweight: { label: 'Thừa cân', color: 'gold' },
  obese: { label: 'Béo phì', color: 'red' },
  stunted: { label: 'Thấp còi', color: 'volcano' },
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Chờ khám',
  1: 'Hoàn thành',
  2: 'Cần theo dõi',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'default',
  1: 'success',
  2: 'warning',
};

const GRADE_OPTIONS = [
  { value: '1', label: 'Lớp 1' },
  { value: '2', label: 'Lớp 2' },
  { value: '3', label: 'Lớp 3' },
  { value: '4', label: 'Lớp 4' },
  { value: '5', label: 'Lớp 5' },
  { value: '6', label: 'Lớp 6' },
  { value: '7', label: 'Lớp 7' },
  { value: '8', label: 'Lớp 8' },
  { value: '9', label: 'Lớp 9' },
  { value: '10', label: 'Lớp 10' },
  { value: '11', label: 'Lớp 11' },
  { value: '12', label: 'Lớp 12' },
];

const SchoolHealth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<SchoolExam[]>([]);
  const [stats, setStats] = useState<SchoolStats>({
    schoolsExamined: 0,
    studentsExamined: 0,
    completionRate: 0,
    needsFollowUp: 0,
  });
  const [schools, setSchools] = useState<School[]>([]);
  const [keyword, setKeyword] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<string | undefined>();
  const [gradeFilter, setGradeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [academicYear, setAcademicYear] = useState('2025-2026');

  const [selectedExam, setSelectedExam] = useState<SchoolExam | null>(null);
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
        schoolCode: schoolFilter,
        academicYear: academicYear || undefined,
        grade: gradeFilter,
        status: statusFilter,
      };
      const results = await Promise.allSettled([
        schoolHealthApi.searchSchoolExams(params),
        schoolHealthApi.getSchoolStats(),
        schoolHealthApi.getSchoolList(),
      ]);
      if (results[0].status === 'fulfilled') setExams(results[0].value);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
      if (results[2].status === 'fulfilled') setSchools(results[2].value);
    } catch {
      message.warning('Không thể tải dữ liệu y tế trường học');
    } finally {
      setLoading(false);
    }
  }, [keyword, schoolFilter, gradeFilter, statusFilter, academicYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = (record: SchoolExam) => {
    setSelectedExam(record);
    setIsDetailModalOpen(true);
  };

  const handleCreate = () => {
    setEditMode(false);
    setSelectedExam(null);
    formInstance.resetFields();
    formInstance.setFieldsValue({ academicYear: academicYear });
    setIsFormModalOpen(true);
  };

  const handleEdit = (record: SchoolExam) => {
    setEditMode(true);
    setSelectedExam(record);
    formInstance.setFieldsValue({
      ...record,
      examDate: record.examDate ? dayjs(record.examDate) : undefined,
      dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : undefined,
    });
    setIsFormModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await formInstance.validateFields();
      setSaving(true);
      const payload = {
        ...values,
        examDate: values.examDate?.format('YYYY-MM-DD'),
        dateOfBirth: values.dateOfBirth?.format('YYYY-MM-DD'),
      };
      if (editMode && selectedExam) {
        await schoolHealthApi.updateSchoolExam(selectedExam.id, payload);
        message.success('Đã cập nhật phiếu khám');
      } else {
        await schoolHealthApi.createSchoolExam(payload);
        message.success('Đã tạo phiếu khám');
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

  const columns: ColumnsType<SchoolExam> = [
    { title: 'Họ tên', dataIndex: 'studentName', key: 'studentName', width: 150 },
    { title: 'Ngày sinh', dataIndex: 'dateOfBirth', key: 'dateOfBirth', width: 100, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Giới', dataIndex: 'gender', key: 'gender', width: 60, render: (g: number) => g === 1 ? 'Nam' : 'Nữ' },
    { title: 'Trường', dataIndex: 'schoolName', key: 'schoolName', width: 160, ellipsis: true },
    { title: 'Lớp', key: 'class', width: 80, render: (_: unknown, r: SchoolExam) => `${r.grade}${r.className}` },
    { title: 'Chiều cao', dataIndex: 'height', key: 'height', width: 80, render: (v: number) => v ? `${v} cm` : '-' },
    { title: 'Cân nặng', dataIndex: 'weight', key: 'weight', width: 80, render: (v: number) => v ? `${v} kg` : '-' },
    { title: 'BMI', dataIndex: 'bmi', key: 'bmi', width: 60, render: (v: number) => v ? v.toFixed(1) : '-' },
    {
      title: 'Dinh dưỡng', dataIndex: 'nutritionStatus', key: 'nutritionStatus', width: 110,
      render: (s: string) => {
        const info = NUTRITION_STATUS_LABELS[s];
        return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>-</Tag>;
      },
    },
    {
      title: 'Cờ cảnh báo', key: 'flags', width: 160,
      render: (_: unknown, r: SchoolExam) => (
        <Space>
          {r.visionFlag && <Tag color="orange">Mắt</Tag>}
          {r.hearingFlag && <Tag color="purple">Tai</Tag>}
          {r.dentalFlag && <Tag color="cyan">Răng</Tag>}
          {r.scoliosisFlag && <Tag color="red">CV</Tag>}
        </Space>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 110,
      render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 120,
      render: (_: unknown, record: SchoolExam) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>Xem</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Sửa</Button>
        </Space>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, background: 'rgba(168,85,247,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        </div>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card style={{ marginBottom: 16, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <ReadOutlined style={{ marginRight: 8 }} />
                Y tế trường học
              </Title>
            </Col>
            <Col>
              <Space>
                <Button icon={<UploadOutlined />}>Khám lô (cả lớp)</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  Tạo phiếu khám
                </Button>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
              </Space>
            </Col>
          </Row>
        </Card>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Trường đã khám" value={stats.schoolsExamined} prefix={<ReadOutlined />} styles={{ content: { color: '#1890ff' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Học sinh đã khám" value={stats.studentsExamined} prefix={<TeamOutlined />} styles={{ content: { color: '#722ed1' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Tỷ lệ hoàn thành" value={stats.completionRate} suffix="%" prefix={<CheckCircleOutlined />} styles={{ content: { color: '#52c41a' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Cần theo dõi" value={stats.needsFollowUp} prefix={<WarningOutlined />} styles={{ content: { color: '#faad14' } }} />
            </Card>
          </Col>
        </Row>
        </motion.div>

        {/* Filters */}
        <Card style={{ marginBottom: 16, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={8} md={6}>
              <Search
                placeholder="Tìm họ tên học sinh..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchData}
                allowClear
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="Trường"
                allowClear
                style={{ width: '100%' }}
                value={schoolFilter}
                onChange={setSchoolFilter}
                showSearch
                optionFilterProp="label"
                options={schools.map(s => ({ value: s.code, label: s.name }))}
              />
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Select
                placeholder="Năm học"
                style={{ width: '100%' }}
                value={academicYear}
                onChange={setAcademicYear}
                options={[
                  { value: '2025-2026', label: '2025-2026' },
                  { value: '2024-2025', label: '2024-2025' },
                  { value: '2023-2024', label: '2023-2024' },
                ]}
              />
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Select
                placeholder="Khối lớp"
                allowClear
                style={{ width: '100%' }}
                value={gradeFilter}
                onChange={setGradeFilter}
                options={GRADE_OPTIONS}
              />
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Select
                placeholder="Trạng thái"
                allowClear
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 0, label: 'Chờ khám' },
                  { value: 1, label: 'Hoàn thành' },
                  { value: 2, label: 'Cần theo dõi' },
                ]}
              />
            </Col>
          </Row>
        </Card>

        {/* Table */}
        <Card>
          <Table
            dataSource={exams}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
            scroll={{ x: 1400 }}
            onRow={(record) => ({ onDoubleClick: () => handleViewDetail(record), style: { cursor: 'pointer' } })}
          />
        </Card>

        {/* Detail Modal */}
        <Modal
          title="Chi tiết phiếu khám sức khỏe học sinh"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={<Button onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>}
          width={700}
        >
          {selectedExam && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Họ tên">{selectedExam.studentName}</Descriptions.Item>
                <Descriptions.Item label="Ngày sinh">{selectedExam.dateOfBirth ? dayjs(selectedExam.dateOfBirth).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Giới tính">{selectedExam.gender === 1 ? 'Nam' : 'Nữ'}</Descriptions.Item>
                <Descriptions.Item label="Lớp">{selectedExam.grade}{selectedExam.className}</Descriptions.Item>
                <Descriptions.Item label="Trường" span={2}>{selectedExam.schoolName}</Descriptions.Item>
                <Descriptions.Item label="Năm học">{selectedExam.academicYear}</Descriptions.Item>
                <Descriptions.Item label="Ngày khám">{selectedExam.examDate ? dayjs(selectedExam.examDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              </Descriptions>
              <Divider>Thể chất</Divider>
              <Descriptions column={3} bordered size="small">
                <Descriptions.Item label="Chiều cao">{selectedExam.height ? `${selectedExam.height} cm` : '-'}</Descriptions.Item>
                <Descriptions.Item label="Cân nặng">{selectedExam.weight ? `${selectedExam.weight} kg` : '-'}</Descriptions.Item>
                <Descriptions.Item label="BMI">{selectedExam.bmi ? selectedExam.bmi.toFixed(1) : '-'}</Descriptions.Item>
              </Descriptions>
              <Divider>Kết quả kiểm tra</Divider>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Dinh dưỡng">
                  {NUTRITION_STATUS_LABELS[selectedExam.nutritionStatus] ? (
                    <Tag color={NUTRITION_STATUS_LABELS[selectedExam.nutritionStatus].color}>
                      {NUTRITION_STATUS_LABELS[selectedExam.nutritionStatus].label}
                    </Tag>
                  ) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={STATUS_COLORS[selectedExam.status]}>{STATUS_LABELS[selectedExam.status]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Thị lực trái">{selectedExam.visionLeft || '-'}</Descriptions.Item>
                <Descriptions.Item label="Thị lực phải">{selectedExam.visionRight || '-'}</Descriptions.Item>
                <Descriptions.Item label="Cờ mắt">{selectedExam.visionFlag ? <Tag color="orange">Cần theo dõi</Tag> : 'Bình thường'}</Descriptions.Item>
                <Descriptions.Item label="Cờ tai">{selectedExam.hearingFlag ? <Tag color="purple">Cần theo dõi</Tag> : 'Bình thường'}</Descriptions.Item>
                <Descriptions.Item label="Cờ răng">{selectedExam.dentalFlag ? <Tag color="cyan">Cần theo dõi</Tag> : 'Bình thường'}</Descriptions.Item>
                <Descriptions.Item label="Cờ cột sống">{selectedExam.scoliosisFlag ? <Tag color="red">Cần theo dõi</Tag> : 'Bình thường'}</Descriptions.Item>
              </Descriptions>
              {selectedExam.recommendations && (
                <>
                  <Divider>Khuyến nghị</Divider>
                  <p>{selectedExam.recommendations}</p>
                </>
              )}
            </>
          )}
        </Modal>

        {/* Create/Edit Form Modal */}
        <Modal
          title={editMode ? 'Sửa phiếu khám' : 'Tạo phiếu khám sức khỏe học sinh'}
          open={isFormModalOpen}
          onCancel={() => setIsFormModalOpen(false)}
          onOk={handleSave}
          okText="Lưu"
          cancelText="Hủy"
          confirmLoading={saving}
          width={800}
          destroyOnHidden
        >
          <Form form={formInstance} layout="vertical">
            <Divider>Thông tin học sinh</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="studentName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
                  <Input placeholder="Họ và tên học sinh" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="gender" label="Giới">
                  <Select options={[{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }]} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="dateOfBirth" label="Ngày sinh">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="examDate" label="Ngày khám">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="schoolName" label="Trường" rules={[{ required: true, message: 'Nhập tên trường' }]}>
                  <Input placeholder="Tên trường" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="grade" label="Khối" rules={[{ required: true, message: 'Chọn khối' }]}>
                  <Select options={GRADE_OPTIONS} />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="className" label="Lớp">
                  <Input placeholder="A1" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="academicYear" label="Năm học">
                  <Input placeholder="2025-2026" />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Thể chất</Divider>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="height" label="Chiều cao (cm)">
                  <InputNumber min={50} max={250} style={{ width: '100%' }} placeholder="cm" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="weight" label="Cân nặng (kg)">
                  <InputNumber min={5} max={200} style={{ width: '100%' }} placeholder="kg" step={0.1} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="visionLeft" label="Thị lực trái">
                  <Input placeholder="10/10" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="visionRight" label="Thị lực phải">
                  <Input placeholder="10/10" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="nutritionStatus" label="Dinh dưỡng">
                  <Select
                    options={Object.entries(NUTRITION_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v.label }))}
                    placeholder="Chọn"
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="visionFlag" label="Cờ mắt" valuePropName="checked">
                  <Select options={[{ value: true, label: 'Cần theo dõi' }, { value: false, label: 'Bình thường' }]} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="hearingFlag" label="Cờ tai" valuePropName="checked">
                  <Select options={[{ value: true, label: 'Cần theo dõi' }, { value: false, label: 'Bình thường' }]} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="dentalFlag" label="Cờ răng" valuePropName="checked">
                  <Select options={[{ value: true, label: 'Cần theo dõi' }, { value: false, label: 'Bình thường' }]} />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Kết luận</Divider>
            <Form.Item name="conclusion" label="Kết luận">
              <TextArea rows={2} placeholder="Kết luận khám sức khỏe..." />
            </Form.Item>
            <Form.Item name="recommendations" label="Khuyến nghị">
              <TextArea rows={2} placeholder="Lời khuyên, theo dõi..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default SchoolHealth;
