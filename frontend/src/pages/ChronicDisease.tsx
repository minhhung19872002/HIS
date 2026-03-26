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
  Tooltip,
  Timeline,
  Popconfirm,
} from 'antd';
import {
  HeartOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  PrinterOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  UndoOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as chronicApi from '../api/chronicDisease';
import type {
  ChronicRecordDto,
  ChronicFollowUpDto,
  ChronicStatisticsDto,
  CreateChronicRecordDto,
} from '../api/chronicDisease';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const STATUS_LABELS: Record<number, string> = {
  0: 'Dang theo doi',
  1: 'Can tai kham',
  2: 'Da dong',
  3: 'Da loai',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'blue',
  1: 'orange',
  2: 'default',
  3: 'red',
};

const FOLLOWUP_STATUS_LABELS: Record<number, string> = {
  0: 'Da hen',
  1: 'Da kham',
  2: 'Bo lo',
};

const FOLLOWUP_STATUS_COLORS: Record<number, string> = {
  0: 'blue',
  1: 'green',
  2: 'red',
};

const ChronicDisease: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<ChronicRecordDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<ChronicStatisticsDto>({
    totalActive: 0,
    needFollowUp: 0,
    newThisMonth: 0,
    closedOrRemoved: 0,
  });
  const [activeTab, setActiveTab] = useState('active');
  const [keyword, setKeyword] = useState('');
  const [icdCodeFilter, setIcdCodeFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ChronicRecordDto | null>(null);
  const [followUps, setFollowUps] = useState<ChronicFollowUpDto[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [createForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ChronicRecordDto | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, number | undefined> = {
        active: 0,
        needFollowUp: 1,
        closed: 2,
        all: undefined,
      };

      const results = await Promise.allSettled([
        chronicApi.getChronicRecords({
          keyword: keyword || undefined,
          status: statusMap[activeTab],
          icdCode: icdCodeFilter || undefined,
          fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
          toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
          page: pagination.current,
          pageSize: pagination.pageSize,
        }),
        chronicApi.getChronicStatistics(),
      ]);

      if (results[0].status === 'fulfilled') {
        const data = results[0].value;
        setRecords(data.items || []);
        setTotalCount(data.totalCount || 0);
      }
      if (results[1].status === 'fulfilled') {
        setStats(results[1].value);
      }
    } catch {
      message.warning('Khong the tai du lieu benh man tinh');
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, icdCodeFilter, dateRange, pagination]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = async (record: ChronicRecordDto) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
    setFollowUpsLoading(true);
    try {
      const fups = await chronicApi.getFollowUps(record.id);
      setFollowUps(fups);
    } catch {
      message.warning('Khong the tai lich su tai kham');
    } finally {
      setFollowUpsLoading(false);
    }
  };

  const handleOpenCreate = (record?: ChronicRecordDto) => {
    setEditingRecord(record || null);
    createForm.resetFields();
    if (record) {
      createForm.setFieldsValue({
        patientId: record.patientId,
        icdCode: record.icdCode,
        diagnosisDate: record.diagnosisDate ? dayjs(record.diagnosisDate) : undefined,
        followUpIntervalDays: record.followUpIntervalDays,
        notes: record.notes,
      });
    }
    setIsCreateModalOpen(true);
  };

  const handleSaveRecord = async () => {
    try {
      const values = await createForm.validateFields();
      setSaving(true);
      const payload: CreateChronicRecordDto = {
        ...values,
        diagnosisDate: values.diagnosisDate?.format('YYYY-MM-DD'),
      };
      if (editingRecord) {
        await chronicApi.updateChronicRecord(editingRecord.id, payload);
        message.success('Da cap nhat ho so benh man tinh');
      } else {
        await chronicApi.createChronicRecord(payload);
        message.success('Da tao ho so benh man tinh');
      }
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Khong the luu ho so');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (record: ChronicRecordDto) => {
    try {
      await chronicApi.closeChronicRecord(record.id, 'Dong ho so');
      message.success('Da dong ho so');
      fetchData();
    } catch {
      message.warning('Khong the dong ho so');
    }
  };

  const handleRemove = async (record: ChronicRecordDto) => {
    try {
      await chronicApi.removeChronicRecord(record.id);
      message.success('Da loai bo ho so');
      fetchData();
    } catch {
      message.warning('Khong the loai bo ho so');
    }
  };

  const handleReopen = async (record: ChronicRecordDto) => {
    try {
      await chronicApi.reopenChronicRecord(record.id);
      message.success('Da mo lai ho so');
      fetchData();
    } catch {
      message.warning('Khong the mo lai ho so');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const columns: ColumnsType<ChronicRecordDto> = [
    {
      title: 'Ma BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 110,
    },
    {
      title: 'Ho ten',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 170,
      ellipsis: true,
    },
    {
      title: 'Benh (ICD)',
      key: 'icd',
      width: 200,
      ellipsis: true,
      render: (_: unknown, record: ChronicRecordDto) => (
        <Tooltip title={record.icdName}>
          <Tag color="blue">{record.icdCode}</Tag> {record.icdName}
        </Tooltip>
      ),
    },
    {
      title: 'Ngay chan doan',
      dataIndex: 'diagnosisDate',
      key: 'diagnosisDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
      sorter: (a, b) => (a.diagnosisDate || '').localeCompare(b.diagnosisDate || ''),
    },
    {
      title: 'BS phu trach',
      dataIndex: 'doctorName',
      key: 'doctorName',
      width: 140,
      ellipsis: true,
      render: (name: string) => name || '-',
    },
    {
      title: 'Tai kham tiep',
      dataIndex: 'nextFollowUpDate',
      key: 'nextFollowUpDate',
      width: 120,
      render: (date: string) => {
        if (!date) return '-';
        const isOverdue = dayjs(date).isBefore(dayjs(), 'day');
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined, fontWeight: isOverdue ? 'bold' : undefined }}>
            {dayjs(date).format('DD/MM/YYYY')}
          </span>
        );
      },
      sorter: (a, b) => (a.nextFollowUpDate || '').localeCompare(b.nextFollowUpDate || ''),
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: number) => (
        <Tag color={STATUS_COLORS[s] || 'default'}>
          {STATUS_LABELS[s] || `Status ${s}`}
        </Tag>
      ),
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_: unknown, record: ChronicRecordDto) => (
        <Space size="small" wrap>
          <Tooltip title="Xem chi tiet">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          {record.status === 0 && (
            <>
              <Tooltip title="Chinh sua">
                <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenCreate(record)} />
              </Tooltip>
              <Popconfirm title="Dong ho so nay?" onConfirm={() => handleClose(record)} okText="Dong" cancelText="Huy">
                <Tooltip title="Dong BA">
                  <Button size="small" icon={<CloseCircleOutlined />} />
                </Tooltip>
              </Popconfirm>
              <Popconfirm title="Loai bo ho so nay?" onConfirm={() => handleRemove(record)} okText="Loai" cancelText="Huy">
                <Tooltip title="Loai bo">
                  <Button size="small" danger icon={<StopOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
          {(record.status === 2 || record.status === 3) && (
            <Tooltip title="Mo lai">
              <Button size="small" type="primary" ghost icon={<UndoOutlined />} onClick={() => handleReopen(record)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Spin spinning={loading && records.length === 0}>
      <div>
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-semibold m-0">
                <HeartOutlined style={{ marginRight: 8 }} />
                Quan ly benh man tinh
              </h4>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenCreate()}>
                  Them ho so
                </Button>
                <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                  In DS
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
              <div className="text-gray-500 text-sm mb-1">Tong dang theo doi</div><div className="text-2xl font-semibold" style={{ color: '#1890ff' }}><HeartOutlined className="mr-1" />{stats.totalActive}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Can tai kham</div><div className="text-2xl font-semibold" style={{ color: '#fa8c16' }}><ClockCircleOutlined className="mr-1" />{stats.needFollowUp}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Moi trong thang</div><div className="text-2xl font-semibold" style={{ color: '#52c41a' }}><CheckCircleOutlined className="mr-1" />{stats.newThisMonth}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Da dong/loai</div><div className="text-2xl font-semibold" style={{ color: '#8c8c8c' }}><CloseCircleOutlined className="mr-1" />{stats.closedOrRemoved}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Search
                placeholder="Tim kiem BN, ma BN, ten benh..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchData}
                allowClear
                prefix={<SearchOutlined />}
              />
            </div>
            <div>
              <Input
                placeholder="Ma ICD (VD: E11)"
                value={icdCodeFilter}
                onChange={(e) => setIcdCodeFilter(e.target.value || undefined)}
                allowClear
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
              {
                key: 'active',
                label: (
                  <span>
                    <CheckCircleOutlined /> Dang theo doi ({stats.totalActive})
                  </span>
                ),
              },
              {
                key: 'needFollowUp',
                label: (
                  <span>
                    <ClockCircleOutlined /> Can tai kham ({stats.needFollowUp})
                  </span>
                ),
              },
              {
                key: 'closed',
                label: (
                  <span>
                    <CloseCircleOutlined /> Da dong ({stats.closedOrRemoved})
                  </span>
                ),
              },
              {
                key: 'all',
                label: `Tat ca (${totalCount})`,
              },
            ]}
          />
          <Table
            dataSource={records}
            columns={columns}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: totalCount,
              showSizeChanger: true,
              showTotal: (t) => `Tong ${t} ban ghi`,
              onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            }}
            scroll={{ x: 1300 }}
            onRow={(record) => ({
              onDoubleClick: () => handleViewDetail(record),
              style: { cursor: 'pointer' },
            })}
          />
        </div>

        {/* Create/Edit Modal */}
        <Modal
          title={editingRecord ? 'Chinh sua ho so benh man tinh' : 'Them ho so benh man tinh'}
          open={isCreateModalOpen}
          onCancel={() => setIsCreateModalOpen(false)}
          onOk={handleSaveRecord}
          okText={editingRecord ? 'Cap nhat' : 'Tao moi'}
          cancelText="Huy"
          confirmLoading={saving}
          width={600}
          destroyOnHidden
        >
          <Form form={createForm} layout="vertical">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item
                  name="patientId"
                  label="Ma benh nhan"
                  rules={[{ required: true, message: 'Vui long nhap ma benh nhan' }]}
                >
                  <Input placeholder="Nhap ma benh nhan" />
                </Form.Item>
              </div>
              <div>
                <Form.Item
                  name="icdCode"
                  label="Ma ICD"
                  rules={[{ required: true, message: 'Vui long nhap ma ICD' }]}
                >
                  <Input placeholder="VD: E11, I10, J45" />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item
                  name="diagnosisDate"
                  label="Ngay chan doan"
                  rules={[{ required: true, message: 'Vui long chon ngay' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item
                  name="followUpIntervalDays"
                  label="Chu ky tai kham (ngay)"
                  rules={[{ required: true, message: 'Vui long nhap chu ky' }]}
                >
                  <InputNumber min={1} max={365} style={{ width: '100%' }} placeholder="30" />
                </Form.Item>
              </div>
            </div>
            <Form.Item name="doctorId" label="Ma bac si phu trach">
              <Input placeholder="Ma bac si (tuy chon)" />
            </Form.Item>
            <Form.Item name="notes" label="Ghi chu">
              <TextArea rows={3} placeholder="Ghi chu them ve tinh trang benh..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Detail + Follow-up Modal */}
        <Modal
          title={`Chi tiet ho so - ${selectedRecord?.patientName || ''}`}
          open={isDetailModalOpen}
          onCancel={() => { setIsDetailModalOpen(false); setSelectedRecord(null); }}
          footer={[
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Dong</Button>,
            <Button key="followup" type="primary" icon={<CalendarOutlined />} onClick={() => setIsFollowUpModalOpen(true)}>
              Them lan tai kham
            </Button>,
          ]}
          width={750}
        >
          {selectedRecord && (
            <>
              <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Ma BN">{selectedRecord.patientCode}</Descriptions.Item>
                <Descriptions.Item label="Ho ten">{selectedRecord.patientName}</Descriptions.Item>
                <Descriptions.Item label="Benh">
                  <Tag color="blue">{selectedRecord.icdCode}</Tag> {selectedRecord.icdName}
                </Descriptions.Item>
                <Descriptions.Item label="Ngay chan doan">
                  {selectedRecord.diagnosisDate ? dayjs(selectedRecord.diagnosisDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="BS phu trach">{selectedRecord.doctorName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Chu ky tai kham">{selectedRecord.followUpIntervalDays} ngay</Descriptions.Item>
                <Descriptions.Item label="Tai kham tiep">
                  {selectedRecord.nextFollowUpDate ? dayjs(selectedRecord.nextFollowUpDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Trang thai">
                  <Tag color={STATUS_COLORS[selectedRecord.status]}>
                    {STATUS_LABELS[selectedRecord.status]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Ghi chu" span={2}>{selectedRecord.notes || '-'}</Descriptions.Item>
              </Descriptions>

              <h5 className="text-base font-semibold mb-3">Lich su tai kham</h5>
              <Spin spinning={followUpsLoading}>
                {followUps.length > 0 ? (
                  <Timeline
                    items={followUps.map((fu) => ({
                      color: fu.status === 1 ? 'green' : fu.status === 2 ? 'red' : 'blue',
                      content: (
                        <div>
                          <strong>{dayjs(fu.visitDate).format('DD/MM/YYYY')}</strong>
                          {' - '}
                          <Tag color={FOLLOWUP_STATUS_COLORS[fu.status]}>{FOLLOWUP_STATUS_LABELS[fu.status]}</Tag>
                          {fu.doctorName && <span> - BS: {fu.doctorName}</span>}
                          {fu.notes && <div style={{ marginTop: 4, color: '#666' }}>{fu.notes}</div>}
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#999', padding: 16 }}>Chua co lan tai kham nao</div>
                )}
              </Spin>
            </>
          )}
        </Modal>

        {/* Follow-up Create Modal */}
        <Modal
          title="Them lan tai kham"
          open={isFollowUpModalOpen}
          onCancel={() => setIsFollowUpModalOpen(false)}
          onOk={async () => {
            try {
              if (!selectedRecord) return;
              await chronicApi.createFollowUp({
                chronicRecordId: selectedRecord.id,
                visitDate: dayjs().format('YYYY-MM-DD'),
                notes: 'Tai kham dinh ky',
              });
              message.success('Da ghi nhan lan tai kham');
              setIsFollowUpModalOpen(false);
              // Refresh follow-ups
              const fups = await chronicApi.getFollowUps(selectedRecord.id);
              setFollowUps(fups);
              fetchData();
            } catch {
              message.warning('Khong the ghi nhan tai kham');
            }
          }}
          okText="Luu"
          cancelText="Huy"
          destroyOnHidden
        >
          <p>Ghi nhan tai kham cho benh nhan <strong>{selectedRecord?.patientName}</strong></p>
          <p>Benh: <Tag color="blue">{selectedRecord?.icdCode}</Tag> {selectedRecord?.icdName}</p>
          <p>Ngay tai kham: <strong>{dayjs().format('DD/MM/YYYY')}</strong></p>
        </Modal>
      </div>
    </Spin>
  );
};

export default ChronicDisease;
