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
  Tabs,
  Statistic,
  Spin,
  Modal,
  Form,
  InputNumber,
  Descriptions,
  Divider,
} from 'antd';
import {
  SafetyCertificateOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  TeamOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import * as occApi from '../api/occupationalHealth';
import type { OccExam, OccStats, HazardType } from '../api/occupationalHealth';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const EXAM_TYPE_LABELS: Record<string, string> = {
  periodic: 'Định kỳ',
  preEmployment: 'Trước tuyển',
  postExposure: 'Sau phơi nhiễm',
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

const CLASSIFICATION_LABELS: Record<string, { label: string; color: string }> = {
  pass: { label: 'Đủ SK', color: 'green' },
  fail: { label: 'Không đủ SK', color: 'red' },
  restricted: { label: 'Hạn chế', color: 'orange' },
};

const HAZARD_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  dust: { label: 'Bụi', color: 'default' },
  chemical: { label: 'Hóa chất', color: 'purple' },
  noise: { label: 'Tiếng ồn', color: 'blue' },
  vibration: { label: 'Rung', color: 'cyan' },
  heat: { label: 'Nhiệt', color: 'volcano' },
  radiation: { label: 'Bức xạ', color: 'red' },
  biological: { label: 'Vi sinh', color: 'green' },
};

const OccupationalHealth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('periodic');
  const [exams, setExams] = useState<OccExam[]>([]);
  const [stats, setStats] = useState<OccStats>({
    totalExams: 0,
    diseaseDetected: 0,
    needsFollowUp: 0,
    companies: 0,
  });
  const [hazardTypes, setHazardTypes] = useState<HazardType[]>([]);
  const [keyword, setKeyword] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string | undefined>();
  const [hazardFilter, setHazardFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [selectedExam, setSelectedExam] = useState<OccExam | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formInstance] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const examTypeMap: Record<string, string | undefined> = {
        periodic: 'periodic',
        preEmployment: 'preEmployment',
        disease: undefined,
        stats: undefined,
      };
      const params: Record<string, unknown> = {
        keyword: keyword || undefined,
        companyCode: companyFilter,
        examType: examTypeMap[activeTab],
        hazardType: hazardFilter,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        occApi.searchOccExams(params),
        occApi.getOccStats(),
        occApi.getHazardTypes(),
      ]);
      if (results[0].status === 'fulfilled') setExams(results[0].value);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
      if (results[2].status === 'fulfilled') setHazardTypes(results[2].value);
    } catch {
      message.warning('Không thể tải dữ liệu sức khỏe nghề nghiệp');
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, companyFilter, hazardFilter, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = (record: OccExam) => {
    setSelectedExam(record);
    setIsDetailModalOpen(true);
  };

  const handleCreate = () => {
    setEditMode(false);
    setSelectedExam(null);
    formInstance.resetFields();
    setIsFormModalOpen(true);
  };

  const handleEdit = (record: OccExam) => {
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
        await occApi.updateOccExam(selectedExam.id, payload);
        message.success('Đã cập nhật phiếu khám');
      } else {
        await occApi.createOccExam(payload);
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

  const filteredExams = exams.filter(e => {
    if (activeTab === 'periodic') return e.examType === 'periodic';
    if (activeTab === 'preEmployment') return e.examType === 'preEmployment';
    if (activeTab === 'disease') return e.occupationalDisease;
    return true;
  });

  const columns: ColumnsType<OccExam> = [
    { title: 'Mã phiếu', dataIndex: 'examCode', key: 'examCode', width: 110 },
    { title: 'Họ tên', dataIndex: 'patientName', key: 'patientName', width: 150 },
    { title: 'Công ty', dataIndex: 'companyName', key: 'companyName', width: 150, ellipsis: true },
    { title: 'Nghề nghiệp', dataIndex: 'occupation', key: 'occupation', width: 120 },
    { title: 'Thâm niên', dataIndex: 'yearsOfExposure', key: 'yearsOfExposure', width: 80, render: (y: number) => y ? `${y} năm` : '-' },
    {
      title: 'Yếu tố NN', key: 'hazards', width: 200,
      render: (_: unknown, r: OccExam) => (
        <Space wrap>
          {(r.hazardTypes || []).map(h => {
            const info = HAZARD_TYPE_LABELS[h];
            return <Tag key={h} color={info?.color || 'default'}>{info?.label || h}</Tag>;
          })}
        </Space>
      ),
    },
    { title: 'Ngày khám', dataIndex: 'examDate', key: 'examDate', width: 100, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Loại', dataIndex: 'examType', key: 'examType', width: 100, render: (t: string) => EXAM_TYPE_LABELS[t] || t },
    {
      title: 'Phân loại', dataIndex: 'classification', key: 'classification', width: 110,
      render: (c: string) => {
        const info = CLASSIFICATION_LABELS[c];
        return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>Chưa PL</Tag>;
      },
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 100,
      render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 120,
      render: (_: unknown, record: OccExam) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>Xem</Button>
          {record.status < 2 && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Sửa</Button>}
        </Space>
      ),
    },
  ];

  const diseaseExams = exams.filter(e => e.occupationalDisease);

  const tabItems = [
    {
      key: 'periodic',
      label: <span><SafetyCertificateOutlined /> Khám định kỳ</span>,
    },
    {
      key: 'preEmployment',
      label: <span><TeamOutlined /> Khám trước tuyển</span>,
    },
    {
      key: 'disease',
      label: <span><WarningOutlined /> Bệnh nghề nghiệp ({diseaseExams.length})</span>,
    },
    {
      key: 'stats',
      label: <span><BarChartOutlined /> Thống kê</span>,
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
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                Khám sức khỏe nghề nghiệp
              </Title>
            </Col>
            <Col>
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Tạo phiếu khám</Button>
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
              <Statistic title="Tổng khám" value={stats.totalExams} prefix={<SafetyCertificateOutlined />} styles={{ content: { color: '#1890ff' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Phát hiện BNN" value={stats.diseaseDetected} prefix={<WarningOutlined />} styles={{ content: { color: '#ff4d4f' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Cần theo dõi" value={stats.needsFollowUp} prefix={<CloseCircleOutlined />} styles={{ content: { color: '#faad14' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Công ty" value={stats.companies} prefix={<TeamOutlined />} styles={{ content: { color: '#722ed1' } }} />
            </Card>
          </Col>
        </Row>
        </motion.div>

        {/* Tabs + Content */}
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

          {activeTab !== 'stats' ? (
            <>
              {/* Filters */}
              <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8} md={6}>
                  <Search
                    placeholder="Tìm họ tên, mã phiếu..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onSearch={fetchData}
                    allowClear
                    prefix={<SearchOutlined />}
                  />
                </Col>
                <Col xs={12} sm={6} md={4}>
                  <Input
                    placeholder="Công ty"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value || undefined)}
                    allowClear
                  />
                </Col>
                <Col xs={12} sm={6} md={4}>
                  <Select
                    placeholder="Yếu tố NN"
                    allowClear
                    style={{ width: '100%' }}
                    value={hazardFilter}
                    onChange={setHazardFilter}
                    options={hazardTypes.map(h => ({ value: h.code, label: h.name }))}
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

              <Table
                dataSource={filteredExams}
                columns={columns}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
                scroll={{ x: 1400 }}
                onRow={(record) => ({ onDoubleClick: () => handleViewDetail(record), style: { cursor: 'pointer' } })}
              />
            </>
          ) : (
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card title="Phân loại theo yếu tố nguy hại">
                  {hazardTypes.map(h => {
                    const count = exams.filter(e => (e.hazardTypes || []).includes(h.code)).length;
                    return (
                      <div key={h.code} style={{ marginBottom: 8 }}>
                        <Row justify="space-between">
                          <Col>
                            <Tag color={HAZARD_TYPE_LABELS[h.code]?.color}>{h.name}</Tag>
                            <span style={{ fontSize: 12, color: '#999' }}>{h.description}</span>
                          </Col>
                          <Col><strong>{count}</strong> ca</Col>
                        </Row>
                      </div>
                    );
                  })}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Kết quả phân loại sức khỏe">
                  {Object.entries(CLASSIFICATION_LABELS).map(([key, info]) => {
                    const count = exams.filter(e => e.classification === key).length;
                    return (
                      <div key={key} style={{ marginBottom: 12 }}>
                        <Row justify="space-between" align="middle">
                          <Col><Tag color={info.color}>{info.label}</Tag></Col>
                          <Col><strong>{count}</strong> người</Col>
                        </Row>
                      </div>
                    );
                  })}
                  <Divider />
                  <p>Tổng khám: <strong>{exams.length}</strong></p>
                  <p>Bệnh nghề nghiệp: <strong style={{ color: '#ff4d4f' }}>{diseaseExams.length}</strong></p>
                </Card>
              </Col>
              <Col xs={24}>
                <Card title="Danh sách yếu tố nguy hại nghề nghiệp">
                  <Row gutter={[16, 8]}>
                    {hazardTypes.map(h => (
                      <Col key={h.code} xs={24} sm={12} md={8} lg={6}>
                        <Card size="small">
                          <Tag color={HAZARD_TYPE_LABELS[h.code]?.color} style={{ marginBottom: 4 }}>{h.name}</Tag>
                          <p style={{ fontSize: 12, margin: 0, color: '#666' }}>{h.description}</p>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              </Col>
            </Row>
          )}
        </Card>

        {/* Detail Modal */}
        <Modal
          title="Chi tiết phiếu khám sức khỏe nghề nghiệp"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={<Button onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>}
          width={800}
        >
          {selectedExam && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Mã phiếu">{selectedExam.examCode}</Descriptions.Item>
                <Descriptions.Item label="Loại khám">{EXAM_TYPE_LABELS[selectedExam.examType] || selectedExam.examType}</Descriptions.Item>
                <Descriptions.Item label="Họ tên">{selectedExam.patientName}</Descriptions.Item>
                <Descriptions.Item label="Giới">{selectedExam.gender === 1 ? 'Nam' : 'Nữ'}</Descriptions.Item>
                <Descriptions.Item label="Công ty" span={2}>{selectedExam.companyName}</Descriptions.Item>
                <Descriptions.Item label="Nghề nghiệp">{selectedExam.occupation}</Descriptions.Item>
                <Descriptions.Item label="Thâm niên">{selectedExam.yearsOfExposure} năm</Descriptions.Item>
                <Descriptions.Item label="Yếu tố NN" span={2}>
                  <Space wrap>
                    {(selectedExam.hazardTypes || []).map(h => (
                      <Tag key={h} color={HAZARD_TYPE_LABELS[h]?.color}>{HAZARD_TYPE_LABELS[h]?.label || h}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
              <Divider>Kết quả chuyên khoa</Divider>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Hô hấp (Spirometry)">{selectedExam.spirometryResult || '-'}</Descriptions.Item>
                <Descriptions.Item label="Thính lực (Audiometry)">{selectedExam.audiometryResult || '-'}</Descriptions.Item>
                <Descriptions.Item label="Chì máu">{selectedExam.bloodLeadLevel ? `${selectedExam.bloodLeadLevel} ug/dL` : '-'}</Descriptions.Item>
                <Descriptions.Item label="Thị lực">{selectedExam.visionResult || '-'}</Descriptions.Item>
                <Descriptions.Item label="X-quang" span={2}>{selectedExam.xrayResult || '-'}</Descriptions.Item>
                <Descriptions.Item label="Xét nghiệm" span={2}>{selectedExam.labResults || '-'}</Descriptions.Item>
              </Descriptions>
              <Divider>Kết luận</Divider>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Phân loại">
                  {selectedExam.classification ? (
                    <Tag color={CLASSIFICATION_LABELS[selectedExam.classification]?.color}>
                      {CLASSIFICATION_LABELS[selectedExam.classification]?.label}
                    </Tag>
                  ) : 'Chưa phân loại'}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={STATUS_COLORS[selectedExam.status]}>{STATUS_LABELS[selectedExam.status]}</Tag>
                </Descriptions.Item>
                {selectedExam.occupationalDisease && (
                  <Descriptions.Item label="Bệnh nghề nghiệp" span={2}>
                    <Tag color="red">{selectedExam.occupationalDisease}</Tag>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Kết luận" span={2}>{selectedExam.conclusion || '-'}</Descriptions.Item>
                <Descriptions.Item label="Khuyến nghị" span={2}>{selectedExam.recommendations || '-'}</Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Modal>

        {/* Create/Edit Form Modal */}
        <Modal
          title={editMode ? 'Sửa phiếu khám' : 'Tạo phiếu khám sức khỏe nghề nghiệp'}
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
            <Divider>Thông tin cá nhân</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="patientName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
                  <Input placeholder="Họ và tên" />
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

            <Divider>Thông tin nghề nghiệp</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="companyName" label="Công ty" rules={[{ required: true, message: 'Nhập tên công ty' }]}>
                  <Input placeholder="Tên công ty" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="occupation" label="Nghề nghiệp">
                  <Input placeholder="Vị trí công việc" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="yearsOfExposure" label="Thâm niên">
                  <InputNumber min={0} max={50} style={{ width: '100%' }} placeholder="Năm" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="examType" label="Loại khám" rules={[{ required: true, message: 'Chọn loại' }]}>
                  <Select options={Object.entries(EXAM_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="hazardTypes" label="Yếu tố nguy hại">
              <Select
                mode="multiple"
                placeholder="Chọn yếu tố nguy hại"
                options={hazardTypes.map(h => ({ value: h.code, label: `${h.name} - ${h.description}` }))}
              />
            </Form.Item>

            <Divider>Kết quả chuyên khoa</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="spirometryResult" label="Hô hấp (Spirometry)">
                  <TextArea rows={2} placeholder="FVC, FEV1, FEV1/FVC..." />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="audiometryResult" label="Thính lực (Audiometry)">
                  <TextArea rows={2} placeholder="Ngưỡng nghe tần số 500-8000Hz..." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="bloodLeadLevel" label="Chì máu (ug/dL)">
                  <InputNumber min={0} max={200} style={{ width: '100%' }} step={0.1} placeholder="0" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="visionResult" label="Thị lực">
                  <Input placeholder="VD: Mắt phải 10/10, trái 9/10" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="classification" label="Phân loại SK">
                  <Select
                    placeholder="Chọn"
                    allowClear
                    options={Object.entries(CLASSIFICATION_LABELS).map(([k, v]) => ({ value: k, label: v.label }))}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="xrayResult" label="X-quang">
              <TextArea rows={2} placeholder="Kết quả X-quang phổi..." />
            </Form.Item>
            <Form.Item name="labResults" label="Xét nghiệm">
              <TextArea rows={2} placeholder="Kết quả xét nghiệm máu, nước tiểu..." />
            </Form.Item>

            <Divider>Kết luận</Divider>
            <Form.Item name="occupationalDisease" label="Bệnh nghề nghiệp (nếu có)">
              <Input placeholder="Tên bệnh nghề nghiệp..." />
            </Form.Item>
            <Form.Item name="conclusion" label="Kết luận">
              <TextArea rows={2} placeholder="Kết luận khám sức khỏe nghề nghiệp..." />
            </Form.Item>
            <Form.Item name="recommendations" label="Khuyến nghị">
              <TextArea rows={2} placeholder="Lời khuyên, đề xuất chuyển công tác..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default OccupationalHealth;
