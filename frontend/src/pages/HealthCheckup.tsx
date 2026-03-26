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
  Segmented,
  Descriptions,
  Divider,
} from 'antd';
import {
  FileProtectOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  PrinterOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UploadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import * as healthCheckupApi from '../api/healthCheckup';
import type { HealthCheckup as HealthCheckupType, HealthCheckupStats } from '../api/healthCheckup';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const CHECKUP_TYPE_LABELS: Record<string, string> = {
  general_adult: 'Tổng quát >= 18',
  general_child: 'Tổng quát < 18',
  periodic: 'Định kỳ',
  driver: 'Lái xe',
  student: 'Học sinh',
  elderly: 'Người cao tuổi',
  occupational: 'Nghề nghiệp',
  infant: 'Trẻ < 24th',
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

const CONCLUSION_LABELS: Record<string, { label: string; color: string }> = {
  pass: { label: 'Đạt sức khỏe', color: 'green' },
  fail: { label: 'Không đạt', color: 'red' },
  conditional: { label: 'Đạt có điều kiện', color: 'orange' },
};

const HealthCheckup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HealthCheckupType[]>([]);
  const [stats, setStats] = useState<HealthCheckupStats>({
    totalCheckups: 0,
    todayCount: 0,
    passCount: 0,
    failCount: 0,
  });
  const [keyword, setKeyword] = useState('');
  const [checkupTypeFilter, setCheckupTypeFilter] = useState<string>('general_adult');
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [selectedRecord, setSelectedRecord] = useState<HealthCheckupType | null>(null);
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
        checkupType: checkupTypeFilter || undefined,
        status: statusFilter,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        healthCheckupApi.searchHealthCheckups(params),
        healthCheckupApi.getHealthCheckupStats(),
      ]);
      if (results[0].status === 'fulfilled') setData(results[0].value);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
    } catch {
      message.warning('Không thể tải dữ liệu khám sức khỏe');
    } finally {
      setLoading(false);
    }
  }, [keyword, checkupTypeFilter, statusFilter, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = (record: HealthCheckupType) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleCreate = () => {
    setEditMode(false);
    setSelectedRecord(null);
    formInstance.resetFields();
    setIsFormModalOpen(true);
  };

  const handleEdit = (record: HealthCheckupType) => {
    setEditMode(true);
    setSelectedRecord(record);
    formInstance.setFieldsValue({
      ...record,
      checkupDate: record.checkupDate ? dayjs(record.checkupDate) : undefined,
    });
    setIsFormModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await formInstance.validateFields();
      setSaving(true);
      const payload = {
        ...values,
        checkupDate: values.checkupDate?.format('YYYY-MM-DD'),
      };
      if (editMode && selectedRecord) {
        await healthCheckupApi.updateHealthCheckup(selectedRecord.id, payload);
        message.success('Đã cập nhật phiếu khám sức khỏe');
      } else {
        await healthCheckupApi.createHealthCheckup(payload);
        message.success('Đã tạo phiếu khám sức khỏe');
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

  const handlePrint = (id: string) => {
    window.open(`/api/health-checkup/${id}/print`, '_blank');
  };

  const columns: ColumnsType<HealthCheckupType> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'checkupCode',
      key: 'checkupCode',
      width: 120,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 160,
    },
    {
      title: 'Giới',
      dataIndex: 'gender',
      key: 'gender',
      width: 60,
      render: (g: number) => (g === 1 ? 'Nam' : 'Nữ'),
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'dateOfBirth',
      key: 'dateOfBirth',
      width: 100,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Loại khám',
      dataIndex: 'checkupType',
      key: 'checkupType',
      width: 130,
      render: (t: string) => CHECKUP_TYPE_LABELS[t] || t,
    },
    {
      title: 'Công ty',
      dataIndex: 'companyName',
      key: 'companyName',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Ngày khám',
      dataIndex: 'checkupDate',
      key: 'checkupDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'BS khám',
      dataIndex: 'examDoctor',
      key: 'examDoctor',
      width: 130,
    },
    {
      title: 'Kết luận',
      dataIndex: 'conclusion',
      key: 'conclusion',
      width: 120,
      render: (c: string) => {
        const info = CONCLUSION_LABELS[c];
        return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>Chưa KL</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: number) => (
        <Tag color={STATUS_COLORS[s] || 'default'}>
          {STATUS_LABELS[s] || `Status ${s}`}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: HealthCheckupType) => (
        <div className="flex items-center gap-2">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            Xem
          </Button>
          {record.status < 2 && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              Sửa
            </Button>
          )}
          {record.status >= 2 && (
            <Button type="link" size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(record.id)}>
              In
            </Button>
          )}
        </div>
      ),
    },
  ];

  const segmentOptions = [
    { label: 'Tổng quát >= 18', value: 'general_adult' },
    { label: '< 18', value: 'general_child' },
    { label: 'Định kỳ', value: 'periodic' },
    { label: 'Lái xe', value: 'driver' },
    { label: 'Học sinh', value: 'student' },
    { label: 'Người cao tuổi', value: 'elderly' },
    { label: 'Nghề nghiệp', value: 'occupational' },
    { label: 'Trẻ < 24th', value: 'infant' },
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-semibold m-0">
                <FileProtectOutlined style={{ marginRight: 8 }} />
                Khám sức khỏe tổng quát
              </h4>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Button icon={<UploadOutlined />}>Nhập lô</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  Tạo phiếu khám
                </Button>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>
                  Làm mới
                </Button>
              </div>
            </div>
          </div>
        </div>
        </motion.div>

        {/* Statistics */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Tổng khám</div><div className="text-2xl font-semibold" style={{ color: '#1890ff' }}><FileProtectOutlined className="mr-1" />{stats.totalCheckups}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Hôm nay</div><div className="text-2xl font-semibold" style={{ color: '#722ed1' }}><CalendarOutlined className="mr-1" />{stats.todayCount}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Đạt SK</div><div className="text-2xl font-semibold" style={{ color: '#52c41a' }}><CheckCircleOutlined className="mr-1" />{stats.passCount}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Không đạt</div><div className="text-2xl font-semibold" style={{ color: '#ff4d4f' }}><CloseCircleOutlined className="mr-1" />{stats.failCount}</div>
            </div>
          </div>
        </div>
        </motion.div>

        {/* Segmented control */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
          <Segmented
            options={segmentOptions}
            value={checkupTypeFilter}
            onChange={(val) => setCheckupTypeFilter(val as string)}
            block
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Search
                placeholder="Tìm kiếm họ tên, mã phiếu..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchData}
                allowClear
                prefix={<SearchOutlined />}
              />
            </div>
            <div>
              <Select
                placeholder="Trạng thái"
                allowClear
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 0, label: 'Chờ khám' },
                  { value: 1, label: 'Đang khám' },
                  { value: 2, label: 'Hoàn thành' },
                  { value: 3, label: 'Đã cấp GCN' },
                ]}
              />
            </div>
            <div>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(val) => setDateRange(val as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                format="DD/MM/YYYY"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <Table
            dataSource={data}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
            scroll={{ x: 1400 }}
            onRow={(record) => ({
              onDoubleClick: () => handleViewDetail(record),
              style: { cursor: 'pointer' },
            })}
          />
        </div>

        {/* Detail Modal */}
        <Modal
          title="Chi tiết phiếu khám sức khỏe"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>,
            selectedRecord && selectedRecord.status >= 2 && (
              <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint(selectedRecord.id)}>
                In giấy chứng nhận
              </Button>
            ),
          ]}
          width={800}
        >
          {selectedRecord && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Mã phiếu">{selectedRecord.checkupCode}</Descriptions.Item>
                <Descriptions.Item label="Loại khám">{CHECKUP_TYPE_LABELS[selectedRecord.checkupType] || selectedRecord.checkupType}</Descriptions.Item>
                <Descriptions.Item label="Họ tên">{selectedRecord.patientName}</Descriptions.Item>
                <Descriptions.Item label="Giới tính">{selectedRecord.gender === 1 ? 'Nam' : 'Nữ'}</Descriptions.Item>
                <Descriptions.Item label="Ngày sinh">{selectedRecord.dateOfBirth ? dayjs(selectedRecord.dateOfBirth).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày khám">{selectedRecord.checkupDate ? dayjs(selectedRecord.checkupDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Công ty" span={2}>{selectedRecord.companyName || '-'}</Descriptions.Item>
              </Descriptions>
              <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Kết quả khám</div>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Nội khoa">{selectedRecord.internalMedicine || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngoại khoa">{selectedRecord.surgery || '-'}</Descriptions.Item>
                <Descriptions.Item label="Mắt">{selectedRecord.ophthalmology || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tai mũi họng">{selectedRecord.entExam || '-'}</Descriptions.Item>
                <Descriptions.Item label="Răng hàm mặt">{selectedRecord.dentalExam || '-'}</Descriptions.Item>
                <Descriptions.Item label="Da liễu">{selectedRecord.dermatology || '-'}</Descriptions.Item>
                <Descriptions.Item label="Phụ khoa">{selectedRecord.gynecology || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tâm thần">{selectedRecord.psychiatry || '-'}</Descriptions.Item>
                <Descriptions.Item label="Xét nghiệm" span={2}>{selectedRecord.labResults || '-'}</Descriptions.Item>
                <Descriptions.Item label="X-quang" span={2}>{selectedRecord.xrayResults || '-'}</Descriptions.Item>
              </Descriptions>
              <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Kết luận</div>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Kết luận">
                  {selectedRecord.conclusion ? (
                    <Tag color={CONCLUSION_LABELS[selectedRecord.conclusion]?.color}>
                      {CONCLUSION_LABELS[selectedRecord.conclusion]?.label || selectedRecord.conclusion}
                    </Tag>
                  ) : 'Chưa kết luận'}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={STATUS_COLORS[selectedRecord.status]}>{STATUS_LABELS[selectedRecord.status]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="BS khám">{selectedRecord.examDoctor || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ghi chú">{selectedRecord.notes || '-'}</Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Modal>

        {/* Create/Edit Form Modal */}
        <Modal
          title={editMode ? 'Sửa phiếu khám sức khỏe' : 'Tạo phiếu khám sức khỏe'}
          open={isFormModalOpen}
          onCancel={() => setIsFormModalOpen(false)}
          onOk={handleSave}
          okText="Lưu"
          cancelText="Hủy"
          confirmLoading={saving}
          width={900}
          destroyOnHidden
        >
          <Form form={formInstance} layout="vertical">
            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Thông tin chung</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="patientName" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                  <Input placeholder="Họ và tên" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="gender" label="Giới tính">
                  <Select options={[{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }]} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="checkupDate" label="Ngày khám">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="checkupType" label="Loại khám" rules={[{ required: true, message: 'Chọn loại khám' }]}>
                  <Select options={Object.entries(CHECKUP_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="companyName" label="Công ty / Đơn vị">
                  <Input placeholder="Tên công ty (nếu khám tập thể)" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="groupName" label="Nhóm / Đợt khám">
                  <Input placeholder="Tên nhóm / đợt khám" />
                </Form.Item>
              </div>
            </div>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Nội khoa</div>
            <Form.Item name="internalMedicine"><TextArea rows={2} placeholder="Kết quả khám nội khoa..." /></Form.Item>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Ngoại khoa</div>
            <Form.Item name="surgery"><TextArea rows={2} placeholder="Kết quả khám ngoại khoa..." /></Form.Item>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Mắt</div>
            <Form.Item name="ophthalmology"><TextArea rows={2} placeholder="Thị lực, nhãn áp, đáy mắt..." /></Form.Item>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Tai Mũi Họng</div>
            <Form.Item name="entExam"><TextArea rows={2} placeholder="Kết quả khám TMH..." /></Form.Item>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Răng Hàm Mặt</div>
            <Form.Item name="dentalExam"><TextArea rows={2} placeholder="Kết quả khám RHM..." /></Form.Item>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Da liễu</div>
            <Form.Item name="dermatology"><TextArea rows={2} placeholder="Kết quả khám da liễu..." /></Form.Item>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Phụ khoa</div>
            <Form.Item name="gynecology"><TextArea rows={2} placeholder="Kết quả khám phụ khoa (nếu có)..." /></Form.Item>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Tâm thần</div>
            <Form.Item name="psychiatry"><TextArea rows={2} placeholder="Kết quả khám tâm thần..." /></Form.Item>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Xét nghiệm</div>
            <Form.Item name="labResults"><TextArea rows={2} placeholder="Kết quả xét nghiệm máu, nước tiểu..." /></Form.Item>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">X-quang</div>
            <Form.Item name="xrayResults"><TextArea rows={2} placeholder="Kết quả X-quang ngực thẳng..." /></Form.Item>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Kết luận</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="conclusion" label="Phân loại sức khỏe">
                  <Select
                    placeholder="Chọn kết luận"
                    allowClear
                    options={[
                      { value: 'pass', label: 'Đạt sức khỏe' },
                      { value: 'fail', label: 'Không đạt' },
                      { value: 'conditional', label: 'Đạt có điều kiện' },
                    ]}
                  />
                </Form.Item>
              </div>
              <div className="col-span-2">
                <Form.Item name="notes" label="Ghi chú">
                  <TextArea rows={2} placeholder="Ghi chú thêm..." />
                </Form.Item>
              </div>
            </div>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default HealthCheckup;
