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
  Drawer,
  Timeline,
  Descriptions,
  Tooltip,
} from 'antd';
import {
  TeamOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as guidanceApi from '../api/clinicalGuidance';
import type {
  GuidanceBatchDto,
  GuidanceActivityDto,
  GuidanceStatisticsDto,
  CreateGuidanceBatchDto,
} from '../api/clinicalGuidance';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const TYPE_LABELS: Record<number, string> = {
  0: 'Kham chua benh',
  1: 'Dao tao',
  2: 'Chuyen giao KT',
  3: 'Ho tro',
};

const TYPE_COLORS: Record<number, string> = {
  0: 'blue',
  1: 'green',
  2: 'purple',
  3: 'orange',
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Ke hoach',
  1: 'Dang thuc hien',
  2: 'Hoan thanh',
  3: 'Da huy',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'default',
  1: 'processing',
  2: 'success',
  3: 'error',
};

const ACTIVITY_TYPE_LABELS: Record<number, string> = {
  0: 'Kham benh',
  1: 'Phau thuat',
  2: 'Dao tao',
  3: 'Hoi chan',
  4: 'Chuyen giao ky thuat',
  5: 'Ho tro vat tu',
};

const ACTIVITY_TYPE_COLORS: Record<number, string> = {
  0: 'blue',
  1: 'red',
  2: 'green',
  3: 'purple',
  4: 'orange',
  5: 'cyan',
};

const ClinicalGuidance: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<GuidanceBatchDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<GuidanceStatisticsDto>({
    inProgress: 0,
    completed: 0,
    totalBudget: 0,
  });
  const [activeTab, setActiveTab] = useState('inProgress');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  // Modal/Drawer states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<GuidanceBatchDto | null>(null);
  const [activities, setActivities] = useState<GuidanceActivityDto[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [editingBatch, setEditingBatch] = useState<GuidanceBatchDto | null>(null);
  const [batchForm] = Form.useForm();
  const [activityForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, number | undefined> = {
        inProgress: 1,
        planning: 0,
        completed: 2,
        all: undefined,
      };

      const results = await Promise.allSettled([
        guidanceApi.getGuidanceBatches({
          keyword: keyword || undefined,
          status: statusMap[activeTab],
          guidanceType: typeFilter,
          fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
          toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
          page: pagination.current,
          pageSize: pagination.pageSize,
        }),
        guidanceApi.getGuidanceStatistics(),
      ]);

      if (results[0].status === 'fulfilled') {
        const data = results[0].value;
        setBatches(data.items || []);
        setTotalCount(data.totalCount || 0);
      }
      if (results[1].status === 'fulfilled') {
        setStats(results[1].value);
      }
    } catch {
      message.warning('Khong the tai du lieu chi dao tuyen');
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, typeFilter, dateRange, pagination]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = async (record: GuidanceBatchDto) => {
    setSelectedBatch(record);
    setIsDetailDrawerOpen(true);
    setActivitiesLoading(true);
    try {
      const acts = await guidanceApi.getGuidanceActivities(record.id);
      setActivities(acts);
    } catch {
      message.warning('Khong the tai hoat dong chi dao tuyen');
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleOpenCreate = (batch?: GuidanceBatchDto) => {
    setEditingBatch(batch || null);
    batchForm.resetFields();
    if (batch) {
      batchForm.setFieldsValue({
        title: batch.title,
        targetFacility: batch.targetFacility,
        guidanceType: batch.guidanceType,
        startDate: batch.startDate ? dayjs(batch.startDate) : undefined,
        endDate: batch.endDate ? dayjs(batch.endDate) : undefined,
        teamMembers: batch.teamMembers,
        budget: batch.budget,
        notes: batch.notes,
      });
    }
    setIsCreateModalOpen(true);
  };

  const handleSaveBatch = async () => {
    try {
      const values = await batchForm.validateFields();
      setSaving(true);
      const payload: CreateGuidanceBatchDto = {
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        endDate: values.endDate?.format('YYYY-MM-DD'),
      };
      if (editingBatch) {
        await guidanceApi.updateGuidanceBatch(editingBatch.id, payload);
        message.success('Da cap nhat dot chi dao tuyen');
      } else {
        await guidanceApi.createGuidanceBatch(payload);
        message.success('Da tao dot chi dao tuyen');
      }
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Khong the luu dot chi dao tuyen');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await guidanceApi.deleteGuidanceBatch(id);
      message.success('Da xoa dot chi dao tuyen');
      fetchData();
    } catch {
      message.warning('Khong the xoa dot chi dao tuyen');
    }
  };

  const handleAddActivity = async () => {
    try {
      const values = await activityForm.validateFields();
      setSaving(true);
      await guidanceApi.createGuidanceActivity({
        batchId: selectedBatch!.id,
        ...values,
        activityDate: values.activityDate?.format('YYYY-MM-DD'),
      });
      message.success('Da them hoat dong');
      setIsActivityModalOpen(false);
      activityForm.resetFields();
      // Refresh activities
      const acts = await guidanceApi.getGuidanceActivities(selectedBatch!.id);
      setActivities(acts);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Khong the them hoat dong');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<GuidanceBatchDto> = [
    {
      title: 'Ma dot',
      dataIndex: 'batchCode',
      key: 'batchCode',
      width: 120,
    },
    {
      title: 'Tieu de',
      dataIndex: 'title',
      key: 'title',
      width: 220,
      ellipsis: true,
    },
    {
      title: 'Co so tuyen duoi',
      dataIndex: 'targetFacility',
      key: 'targetFacility',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Loai hinh',
      dataIndex: 'guidanceType',
      key: 'guidanceType',
      width: 140,
      render: (t: number) => <Tag color={TYPE_COLORS[t]}>{TYPE_LABELS[t] || 'Khac'}</Tag>,
    },
    {
      title: 'Ngay bat dau',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Ngay ket thuc',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s] || `${s}`}</Tag>,
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record: GuidanceBatchDto) => (
        <div className="flex items-center gap-1">
          <Tooltip title="Xem chi tiet">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          <Tooltip title="Chinh sua">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenCreate(record)} />
          </Tooltip>
          {record.status === 0 && (
            <Tooltip title="Xoa">
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <Spin spinning={loading && batches.length === 0}>
      <div>
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-semibold m-0">
                <TeamOutlined style={{ marginRight: 8 }} />
                Chi dao tuyen
              </h4>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenCreate()}>
                  Tao dot moi
                </Button>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>
                  Lam moi
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Dang thuc hien</div><div className="text-2xl font-semibold" style={{ color: '#1890ff' }}><ClockCircleOutlined className="mr-1" />{stats.inProgress}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Hoan thanh</div><div className="text-2xl font-semibold" style={{ color: '#52c41a' }}><CheckCircleOutlined className="mr-1" />{stats.completed}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <Statistic
                title="Tong ngan sach"
                value={stats.totalBudget}
                suffix="d"
                precision={0}
                prefix={<DollarOutlined />}
                styles={{ content: { color: '#faad14' } }}
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Search
                placeholder="Tim kiem dot chi dao, co so..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchData}
                allowClear
                prefix={<SearchOutlined />}
              />
            </div>
            <div>
              <Select
                placeholder="Loai hinh"
                allowClear
                style={{ width: '100%' }}
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 0, label: 'Kham chua benh' },
                  { value: 1, label: 'Dao tao' },
                  { value: 2, label: 'Chuyen giao KT' },
                  { value: 3, label: 'Ho tro' },
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

        {/* Tabs + Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => { setActiveTab(key); setPagination({ current: 1, pageSize: 20 }); }}
            items={[
              { key: 'inProgress', label: <span><ClockCircleOutlined /> Dang thuc hien</span> },
              { key: 'planning', label: 'Ke hoach' },
              { key: 'completed', label: <span><CheckCircleOutlined /> Hoan thanh</span> },
              { key: 'all', label: `Tat ca (${totalCount})` },
            ]}
          />
          <Table
            dataSource={batches}
            columns={columns}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: totalCount,
              showSizeChanger: true,
              showTotal: (t) => `Tong ${t} dot`,
              onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            }}
            scroll={{ x: 1200 }}
            onRow={(record) => ({
              onDoubleClick: () => handleViewDetail(record),
              style: { cursor: 'pointer' },
            })}
          />
        </div>

        {/* Create/Edit Modal */}
        <Modal
          title={editingBatch ? 'Chinh sua dot chi dao tuyen' : 'Tao dot chi dao tuyen'}
          open={isCreateModalOpen}
          onCancel={() => setIsCreateModalOpen(false)}
          onOk={handleSaveBatch}
          okText={editingBatch ? 'Cap nhat' : 'Tao moi'}
          cancelText="Huy"
          confirmLoading={saving}
          width={700}
          destroyOnHidden
        >
          <Form form={batchForm} layout="vertical">
            <Form.Item
              name="title"
              label="Tieu de"
              rules={[{ required: true, message: 'Vui long nhap tieu de' }]}
            >
              <Input placeholder="VD: Chi dao tuyen TTYT Huyen X Q2/2026" />
            </Form.Item>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item
                  name="targetFacility"
                  label="Co so tuyen duoi"
                  rules={[{ required: true, message: 'Vui long nhap co so' }]}
                >
                  <Input placeholder="Ten co so y te tuyen duoi" />
                </Form.Item>
              </div>
              <div>
                <Form.Item
                  name="guidanceType"
                  label="Loai hinh"
                  rules={[{ required: true, message: 'Vui long chon loai hinh' }]}
                >
                  <Select
                    placeholder="Chon loai hinh"
                    options={[
                      { value: 0, label: 'Kham chua benh' },
                      { value: 1, label: 'Dao tao' },
                      { value: 2, label: 'Chuyen giao ky thuat' },
                      { value: 3, label: 'Ho tro vat tu' },
                    ]}
                  />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item
                  name="startDate"
                  label="Ngay bat dau"
                  rules={[{ required: true, message: 'Vui long chon ngay' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item
                  name="endDate"
                  label="Ngay ket thuc"
                  rules={[{ required: true, message: 'Vui long chon ngay' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
            </div>
            <Form.Item name="teamMembers" label="Thanh vien doan">
              <TextArea rows={2} placeholder="Danh sach thanh vien tham gia..." />
            </Form.Item>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="budget" label="Ngan sach (VND)">
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    placeholder="0"
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </Form.Item>
              </div>
            </div>
            <Form.Item name="notes" label="Ghi chu">
              <TextArea rows={2} placeholder="Ghi chu them..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Detail Drawer */}
        <Drawer
          title={`Chi tiet dot chi dao tuyen - ${selectedBatch?.batchCode || ''}`}
          open={isDetailDrawerOpen}
          onClose={() => { setIsDetailDrawerOpen(false); setSelectedBatch(null); }}
          size="large"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { activityForm.resetFields(); setIsActivityModalOpen(true); }}>
              Them hoat dong
            </Button>
          }
        >
          {selectedBatch && (
            <>
              <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
                <Descriptions.Item label="Ma dot">{selectedBatch.batchCode}</Descriptions.Item>
                <Descriptions.Item label="Trang thai">
                  <Tag color={STATUS_COLORS[selectedBatch.status]}>{STATUS_LABELS[selectedBatch.status]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Tieu de" span={2}>{selectedBatch.title}</Descriptions.Item>
                <Descriptions.Item label="Co so tuyen duoi">{selectedBatch.targetFacility}</Descriptions.Item>
                <Descriptions.Item label="Loai hinh">
                  <Tag color={TYPE_COLORS[selectedBatch.guidanceType]}>{TYPE_LABELS[selectedBatch.guidanceType]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Ngay bat dau">
                  {selectedBatch.startDate ? dayjs(selectedBatch.startDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ngay ket thuc">
                  {selectedBatch.endDate ? dayjs(selectedBatch.endDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Thanh vien" span={2}>{selectedBatch.teamMembers || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngan sach">
                  {selectedBatch.budget ? selectedBatch.budget.toLocaleString() + ' d' : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="So hoat dong">{selectedBatch.activityCount || activities.length}</Descriptions.Item>
                <Descriptions.Item label="Ghi chu" span={2}>{selectedBatch.notes || '-'}</Descriptions.Item>
              </Descriptions>

              <h5 className="text-base font-semibold mb-3">Hoat dong chi dao tuyen</h4>
              <Spin spinning={activitiesLoading}>
                {activities.length > 0 ? (
                  <Timeline
                    items={activities.map((act) => ({
                      color: ACTIVITY_TYPE_COLORS[act.activityType] || 'blue',
                      content: (
                        <div>
                          <strong>{dayjs(act.activityDate).format('DD/MM/YYYY')}</strong>
                          {' - '}
                          <Tag color={ACTIVITY_TYPE_COLORS[act.activityType]}>
                            {ACTIVITY_TYPE_LABELS[act.activityType] || 'Khac'}
                          </Tag>
                          <div style={{ marginTop: 4 }}>{act.description}</div>
                          {act.staffName && <div style={{ color: '#666' }}>Nguoi thuc hien: {act.staffName}</div>}
                          {act.result && <div style={{ color: '#52c41a' }}>Ket qua: {act.result}</div>}
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#999', padding: 16 }}>Chua co hoat dong nao</div>
                )}
              </Spin>
            </>
          )}
        </Drawer>

        {/* Activity Create Modal */}
        <Modal
          title="Them hoat dong chi dao tuyen"
          open={isActivityModalOpen}
          onCancel={() => setIsActivityModalOpen(false)}
          onOk={handleAddActivity}
          okText="Them"
          cancelText="Huy"
          confirmLoading={saving}
          destroyOnHidden
        >
          <Form form={activityForm} layout="vertical">
            <Form.Item
              name="activityType"
              label="Loai hoat dong"
              rules={[{ required: true, message: 'Vui long chon loai' }]}
            >
              <Select
                placeholder="Chon loai hoat dong"
                options={[
                  { value: 0, label: 'Kham benh' },
                  { value: 1, label: 'Phau thuat' },
                  { value: 2, label: 'Dao tao' },
                  { value: 3, label: 'Hoi chan' },
                  { value: 4, label: 'Chuyen giao ky thuat' },
                  { value: 5, label: 'Ho tro vat tu' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="activityDate"
              label="Ngay thuc hien"
              rules={[{ required: true, message: 'Vui long chon ngay' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item
              name="description"
              label="Mo ta hoat dong"
              rules={[{ required: true, message: 'Vui long nhap mo ta' }]}
            >
              <TextArea rows={3} placeholder="Mo ta chi tiet hoat dong..." />
            </Form.Item>
            <Form.Item name="staffName" label="Nguoi thuc hien">
              <Input placeholder="Ten bac si / chuyen gia" />
            </Form.Item>
            <Form.Item name="result" label="Ket qua">
              <TextArea rows={2} placeholder="Ket qua hoat dong (neu co)..." />
            </Form.Item>
            <Form.Item name="notes" label="Ghi chu">
              <TextArea rows={2} placeholder="Ghi chu them..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default ClinicalGuidance;
