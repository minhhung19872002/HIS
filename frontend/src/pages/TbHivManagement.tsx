import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  Tooltip,
  Timeline,
  Divider,
} from 'antd';
import {
  MedicineBoxOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as tbHivApi from '../api/tbHivManagement';
import type {
  TbHivRecordDto,
  TbHivFollowUpDto,
  TbHivStatisticsDto,
  CreateTbHivRecordDto,
} from '../api/tbHivManagement';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const RECORD_TYPE_LABELS: Record<number, string> = {
  0: 'Lao',
  1: 'HIV',
  2: 'Dong nhiem Lao/HIV',
};

const RECORD_TYPE_COLORS: Record<number, string> = {
  0: 'green',
  1: 'red',
  2: 'orange',
};

const CATEGORY_LABELS: Record<number, string> = {
  0: 'Moi',
  1: 'Tai phat',
  2: 'That bai',
  3: 'Bo tri quay lai',
  4: 'Khac',
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Dang dieu tri',
  1: 'Hoan thanh',
  2: 'That bai',
  3: 'Bo tri',
  4: 'Tu vong',
  5: 'Chuyen di',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'processing',
  1: 'success',
  2: 'error',
  3: 'warning',
  4: 'default',
  5: 'purple',
};

const ADHERENCE_LABELS: Record<number, string> = {
  0: 'Tot',
  1: 'Trung binh',
  2: 'Kem',
};

const ADHERENCE_COLORS: Record<number, string> = {
  0: 'green',
  1: 'orange',
  2: 'red',
};

type FormValidationError = {
  errorFields?: unknown[];
};

function isFormValidationError(error: unknown): error is FormValidationError {
  return typeof error === 'object' && error !== null && 'errorFields' in error;
}

const TbHivManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<TbHivRecordDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<TbHivStatisticsDto>({
    onTreatment: 0,
    tbCount: 0,
    hivCount: 0,
    coInfectionCount: 0,
  });
  const [activeTab, setActiveTab] = useState('onTreatment');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<number | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TbHivRecordDto | null>(null);
  const [followUps, setFollowUps] = useState<TbHivFollowUpDto[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TbHivRecordDto | null>(null);
  const [recordForm] = Form.useForm();
  const [followUpForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [recordTypeValue, setRecordTypeValue] = useState<number | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, number | undefined> = {
        onTreatment: 0,
        completed: 1,
        failed: undefined, // we filter locally for 2+3
        all: undefined,
      };

      const results = await Promise.allSettled([
        tbHivApi.getTbHivRecords({
          keyword: keyword || undefined,
          recordType: typeFilter,
          treatmentCategory: categoryFilter,
          status: statusMap[activeTab],
          fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
          toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
          page: pagination.current,
          pageSize: pagination.pageSize,
        }),
        tbHivApi.getTbHivStatistics(),
      ]);

      if (results[0].status === 'fulfilled') {
        const data = results[0].value;
        let items = data.items || [];
        // Special filtering for "failed/defaulted" tab
        if (activeTab === 'failed') {
          items = items.filter((r) => r.status === 2 || r.status === 3);
        }
        setRecords(items);
        setTotalCount(data.totalCount || 0);
      }
      if (results[1].status === 'fulfilled') {
        setStats(results[1].value);
      }
    } catch {
      message.warning('Khong the tai du lieu Lao/HIV');
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, typeFilter, categoryFilter, dateRange, pagination]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = async (record: TbHivRecordDto) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
    setFollowUpsLoading(true);
    try {
      const fups = await tbHivApi.getFollowUps(record.id);
      setFollowUps(fups);
    } catch {
      message.warning('Khong the tai lich su dieu tri');
    } finally {
      setFollowUpsLoading(false);
    }
  };

  const handleOpenCreate = (record?: TbHivRecordDto) => {
    setEditingRecord(record || null);
    recordForm.resetFields();
    if (record) {
      setRecordTypeValue(record.recordType);
      recordForm.setFieldsValue({
        patientId: record.patientId,
        recordType: record.recordType,
        treatmentCategory: record.treatmentCategory,
        regimen: record.regimen,
        startDate: record.startDate ? dayjs(record.startDate) : undefined,
        sputumSmearResult: record.sputumSmearResult,
        geneXpertResult: record.geneXpertResult,
        cd4Count: record.cd4Count,
        viralLoad: record.viralLoad,
        artRegimen: record.artRegimen,
        notes: record.notes,
      });
    } else {
      setRecordTypeValue(undefined);
    }
    setIsCreateModalOpen(true);
  };

  const handleSaveRecord = async () => {
    try {
      const values = await recordForm.validateFields();
      setSaving(true);
      const payload: CreateTbHivRecordDto = {
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
      };
      if (editingRecord) {
        await tbHivApi.updateTbHivRecord(editingRecord.id, payload);
        message.success('Da cap nhat ho so Lao/HIV');
      } else {
        await tbHivApi.createTbHivRecord(payload);
        message.success('Da tao ho so Lao/HIV');
      }
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      if (isFormValidationError(err)) return;
      message.warning('Khong the luu ho so');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFollowUp = async () => {
    try {
      const values = await followUpForm.validateFields();
      setSaving(true);
      await tbHivApi.createFollowUp({
        recordId: selectedRecord!.id,
        ...values,
        visitDate: values.visitDate?.format('YYYY-MM-DD'),
      });
      message.success('Da ghi nhan lan dieu tri');
      setIsFollowUpModalOpen(false);
      followUpForm.resetFields();
      // Refresh follow-ups
      const fups = await tbHivApi.getFollowUps(selectedRecord!.id);
      setFollowUps(fups);
    } catch (err) {
      if (isFormValidationError(err)) return;
      message.warning('Khong the ghi nhan lan dieu tri');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async (id: string) => {
    try {
      const blob = await tbHivApi.printTreatmentCard(id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      message.warning('Khong the in phieu dieu tri');
    }
  };

  const columns: ColumnsType<TbHivRecordDto> = [
    {
      title: 'Ma DK',
      dataIndex: 'registrationCode',
      key: 'registrationCode',
      width: 120,
    },
    {
      title: 'Ho ten',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 170,
      ellipsis: true,
    },
    {
      title: 'Loai',
      dataIndex: 'recordType',
      key: 'recordType',
      width: 130,
      render: (t: number) => <Tag color={RECORD_TYPE_COLORS[t]}>{RECORD_TYPE_LABELS[t]}</Tag>,
    },
    {
      title: 'Phan loai',
      dataIndex: 'treatmentCategory',
      key: 'treatmentCategory',
      width: 120,
      render: (c: number) => CATEGORY_LABELS[c] || 'Khac',
    },
    {
      title: 'Phac do',
      dataIndex: 'regimen',
      key: 'regimen',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Ngay bat dau',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Thang DT',
      dataIndex: 'treatmentMonth',
      key: 'treatmentMonth',
      width: 90,
      align: 'center',
      render: (m: number) => m ? `T${m}` : '-',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 160,
      fixed: 'right',
      render: (_: unknown, record: TbHivRecordDto) => (
        <div className="flex items-center gap-1">
          <Tooltip title="Xem chi tiet">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          {record.status === 0 && (
            <Tooltip title="Chinh sua">
              <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenCreate(record)} />
            </Tooltip>
          )}
          <Tooltip title="In phieu">
            <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(record.id)} />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, background: 'rgba(168,85,247,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>
    <Spin spinning={loading && records.length === 0}>
      <div>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-semibold m-0">
                <MedicineBoxOutlined style={{ marginRight: 8 }} />
                Quan ly BN Lao/HIV
              </h4>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenCreate()}>
                  Them ho so
                </Button>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>
                  Lam moi
                </Button>
              </div>
            </div>
          </div>
        </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Dang dieu tri</div><div className="text-2xl font-semibold" style={{ color: '#1890ff' }}><ClockCircleOutlined className="mr-1" />{stats.onTreatment}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Lao</div><div className="text-2xl font-semibold" style={{ color: '#52c41a' }}><CheckCircleOutlined className="mr-1" />{stats.tbCount}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">HIV</div><div className="text-2xl font-semibold" style={{ color: '#ff4d4f' }}><ExclamationCircleOutlined className="mr-1" />{stats.hivCount}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Dong nhiem Lao/HIV</div><div className="text-2xl font-semibold" style={{ color: '#fa8c16' }}><WarningOutlined className="mr-1" />{stats.coInfectionCount}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Search
                placeholder="Tim kiem BN, ma DK..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchData}
                allowClear
                prefix={<SearchOutlined />}
              />
            </div>
            <div>
              <Select
                placeholder="Loai benh"
                allowClear
                style={{ width: '100%' }}
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 0, label: 'Lao' },
                  { value: 1, label: 'HIV' },
                  { value: 2, label: 'Dong nhiem' },
                ]}
              />
            </div>
            <div>
              <Select
                placeholder="Phan loai DT"
                allowClear
                style={{ width: '100%' }}
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { value: 0, label: 'Moi' },
                  { value: 1, label: 'Tai phat' },
                  { value: 2, label: 'That bai' },
                  { value: 3, label: 'Bo tri quay lai' },
                  { value: 4, label: 'Khac' },
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
              { key: 'onTreatment', label: <span><ClockCircleOutlined /> Dang dieu tri</span> },
              { key: 'completed', label: <span><CheckCircleOutlined /> Hoan thanh</span> },
              { key: 'failed', label: <span><WarningOutlined /> That bai/Bo tri</span> },
              { key: 'all', label: `Tat ca (${totalCount})` },
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
            scroll={{ x: 1200 }}
            onRow={(record) => ({
              onDoubleClick: () => handleViewDetail(record),
              style: { cursor: 'pointer' },
            })}
          />
        </div>

        {/* Create/Edit Modal */}
        <Modal
          title={editingRecord ? 'Chinh sua ho so Lao/HIV' : 'Them ho so Lao/HIV'}
          open={isCreateModalOpen}
          onCancel={() => setIsCreateModalOpen(false)}
          onOk={handleSaveRecord}
          okText={editingRecord ? 'Cap nhat' : 'Tao moi'}
          cancelText="Huy"
          confirmLoading={saving}
          width={700}
          destroyOnHidden
        >
          <Form form={recordForm} layout="vertical">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item
                  name="patientId"
                  label="Ma benh nhan"
                  rules={[{ required: true, message: 'Vui long nhap ma benh nhan' }]}
                >
                  <Input placeholder="Ma benh nhan" />
                </Form.Item>
              </div>
              <div>
                <Form.Item
                  name="recordType"
                  label="Loai"
                  rules={[{ required: true, message: 'Vui long chon loai' }]}
                >
                  <Select
                    placeholder="Chon loai"
                    onChange={(v) => setRecordTypeValue(v)}
                    options={[
                      { value: 0, label: 'Lao' },
                      { value: 1, label: 'HIV' },
                      { value: 2, label: 'Dong nhiem Lao/HIV' },
                    ]}
                  />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item
                  name="treatmentCategory"
                  label="Phan loai dieu tri"
                  rules={[{ required: true, message: 'Vui long chon' }]}
                >
                  <Select
                    placeholder="Chon phan loai"
                    options={[
                      { value: 0, label: 'Moi' },
                      { value: 1, label: 'Tai phat' },
                      { value: 2, label: 'That bai' },
                      { value: 3, label: 'Bo tri quay lai' },
                      { value: 4, label: 'Khac' },
                    ]}
                  />
                </Form.Item>
              </div>
              <div>
                <Form.Item
                  name="regimen"
                  label="Phac do dieu tri"
                  rules={[{ required: true, message: 'Vui long nhap phac do' }]}
                >
                  <Input placeholder="VD: 2RHZE/4RH, TDF/3TC/DTG" />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item
                  name="startDate"
                  label="Ngay bat dau dieu tri"
                  rules={[{ required: true, message: 'Vui long chon ngay' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
            </div>

            {/* TB-specific fields */}
            {(recordTypeValue === 0 || recordTypeValue === 2) && (
              <>
                <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Thong tin Lao</div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Form.Item name="sputumSmearResult" label="Ket qua soi dom">
                      <Select
                        placeholder="Chon ket qua"
                        allowClear
                        options={[
                          { value: 'AFB(+)', label: 'AFB duong tinh (+)' },
                          { value: 'AFB(-)', label: 'AFB am tinh (-)' },
                          { value: 'AFB(++)', label: 'AFB (++)' },
                          { value: 'AFB(+++)', label: 'AFB (+++)' },
                        ]}
                      />
                    </Form.Item>
                  </div>
                  <div>
                    <Form.Item name="geneXpertResult" label="Ket qua GeneXpert">
                      <Select
                        placeholder="Chon ket qua"
                        allowClear
                        options={[
                          { value: 'MTB detected, RIF sensitive', label: 'MTB(+), nhay Rifampicin' },
                          { value: 'MTB detected, RIF resistant', label: 'MTB(+), khang Rifampicin' },
                          { value: 'MTB not detected', label: 'MTB(-)' },
                          { value: 'Invalid', label: 'Khong hop le' },
                        ]}
                      />
                    </Form.Item>
                  </div>
                </div>
              </>
            )}

            {/* HIV-specific fields */}
            {(recordTypeValue === 1 || recordTypeValue === 2) && (
              <>
                <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Thong tin HIV</div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Form.Item name="cd4Count" label="CD4 (te bao/uL)">
                      <InputNumber min={0} max={3000} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                  </div>
                  <div>
                    <Form.Item name="viralLoad" label="Viral Load (copies/mL)">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                  </div>
                  <div>
                    <Form.Item name="artRegimen" label="Phac do ART">
                      <Input placeholder="VD: TDF/3TC/DTG" />
                    </Form.Item>
                  </div>
                </div>
              </>
            )}

            <Form.Item name="notes" label="Ghi chu">
              <TextArea rows={2} placeholder="Ghi chu them..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Detail Modal */}
        <Modal
          title={`Chi tiet ho so - ${selectedRecord?.patientName || ''}`}
          open={isDetailModalOpen}
          onCancel={() => { setIsDetailModalOpen(false); setSelectedRecord(null); }}
          footer={[
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Dong</Button>,
            selectedRecord && selectedRecord.status === 0 && (
              <Button
                key="followup"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => { followUpForm.resetFields(); setIsFollowUpModalOpen(true); }}
              >
                Them lan dieu tri
              </Button>
            ),
            selectedRecord && (
              <Button
                key="print"
                icon={<PrinterOutlined />}
                onClick={() => handlePrint(selectedRecord.id)}
              >
                In phieu
              </Button>
            ),
          ]}
          width={800}
        >
          {selectedRecord && (
            <>
              <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Ma DK">{selectedRecord.registrationCode}</Descriptions.Item>
                <Descriptions.Item label="Ho ten">{selectedRecord.patientName}</Descriptions.Item>
                <Descriptions.Item label="Loai">
                  <Tag color={RECORD_TYPE_COLORS[selectedRecord.recordType]}>{RECORD_TYPE_LABELS[selectedRecord.recordType]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Phan loai">{CATEGORY_LABELS[selectedRecord.treatmentCategory]}</Descriptions.Item>
                <Descriptions.Item label="Phac do">{selectedRecord.regimen}</Descriptions.Item>
                <Descriptions.Item label="Ngay bat dau">
                  {selectedRecord.startDate ? dayjs(selectedRecord.startDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Thang dieu tri">{selectedRecord.treatmentMonth ? `T${selectedRecord.treatmentMonth}` : '-'}</Descriptions.Item>
                <Descriptions.Item label="Trang thai">
                  <Tag color={STATUS_COLORS[selectedRecord.status]}>{STATUS_LABELS[selectedRecord.status]}</Tag>
                </Descriptions.Item>

                {/* TB fields */}
                {(selectedRecord.recordType === 0 || selectedRecord.recordType === 2) && (
                  <>
                    <Descriptions.Item label="Soi dom">{selectedRecord.sputumSmearResult || '-'}</Descriptions.Item>
                    <Descriptions.Item label="GeneXpert">{selectedRecord.geneXpertResult || '-'}</Descriptions.Item>
                  </>
                )}

                {/* HIV fields */}
                {(selectedRecord.recordType === 1 || selectedRecord.recordType === 2) && (
                  <>
                    <Descriptions.Item label="CD4">
                      {selectedRecord.cd4Count !== undefined && selectedRecord.cd4Count !== null ? (
                        <span style={{ color: selectedRecord.cd4Count < 200 ? '#ff4d4f' : '#52c41a' }}>
                          {selectedRecord.cd4Count} te bao/uL
                        </span>
                      ) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Viral Load">
                      {selectedRecord.viralLoad !== undefined && selectedRecord.viralLoad !== null ? (
                        <span style={{ color: selectedRecord.viralLoad > 1000 ? '#ff4d4f' : '#52c41a' }}>
                          {selectedRecord.viralLoad.toLocaleString()} copies/mL
                        </span>
                      ) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="ART">{selectedRecord.artRegimen || '-'}</Descriptions.Item>
                  </>
                )}

                <Descriptions.Item label="Ghi chu" span={2}>{selectedRecord.notes || '-'}</Descriptions.Item>
              </Descriptions>

              <h5 className="text-base font-semibold mb-3">Lich su dieu tri</h5>
              <Spin spinning={followUpsLoading}>
                {followUps.length > 0 ? (
                  <Timeline
                    items={followUps.map((fu) => ({
                      color: ADHERENCE_COLORS[fu.drugAdherence] || 'blue',
                      content: (
                        <div>
                          <strong>{dayjs(fu.visitDate).format('DD/MM/YYYY')}</strong>
                          {' - '}
                          <Tag>T{fu.treatmentMonth}</Tag>
                          {' '}
                          <Tag color={ADHERENCE_COLORS[fu.drugAdherence]}>
                            Tuan thu: {ADHERENCE_LABELS[fu.drugAdherence]}
                          </Tag>
                          {fu.weight && <span> | {fu.weight}kg</span>}
                          {fu.sputumSmearResult && <span> | Dom: {fu.sputumSmearResult}</span>}
                          {fu.cd4Count && <span> | CD4: {fu.cd4Count}</span>}
                          {fu.viralLoad !== undefined && fu.viralLoad !== null && <span> | VL: {fu.viralLoad.toLocaleString()}</span>}
                          {fu.sideEffects && <div style={{ marginTop: 4, color: '#ff4d4f' }}>Tac dung phu: {fu.sideEffects}</div>}
                          {fu.notes && <div style={{ marginTop: 4, color: '#666' }}>{fu.notes}</div>}
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#999', padding: 16 }}>Chua co lan dieu tri nao</div>
                )}
              </Spin>
            </>
          )}
        </Modal>

        {/* Follow-up Create Modal */}
        <Modal
          title="Them lan dieu tri"
          open={isFollowUpModalOpen}
          onCancel={() => setIsFollowUpModalOpen(false)}
          onOk={handleAddFollowUp}
          okText="Luu"
          cancelText="Huy"
          confirmLoading={saving}
          width={600}
          destroyOnHidden
        >
          <Form form={followUpForm} layout="vertical">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item
                  name="visitDate"
                  label="Ngay kham"
                  rules={[{ required: true, message: 'Vui long chon ngay' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item
                  name="treatmentMonth"
                  label="Thang dieu tri"
                  rules={[{ required: true, message: 'Vui long nhap thang' }]}
                >
                  <InputNumber min={1} max={36} style={{ width: '100%' }} placeholder="1" />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="weight" label="Can nang (kg)">
                  <InputNumber min={0} max={300} style={{ width: '100%' }} placeholder="0" />
                </Form.Item>
              </div>
              <div>
                <Form.Item
                  name="drugAdherence"
                  label="Tuan thu thuoc"
                  rules={[{ required: true, message: 'Vui long chon' }]}
                >
                  <Select
                    placeholder="Chon muc"
                    options={[
                      { value: 0, label: 'Tot' },
                      { value: 1, label: 'Trung binh' },
                      { value: 2, label: 'Kem' },
                    ]}
                  />
                </Form.Item>
              </div>
            </div>
            <Form.Item name="sideEffects" label="Tac dung phu">
              <TextArea rows={2} placeholder="Mo ta tac dung phu (neu co)..." />
            </Form.Item>

            {/* Conditional fields based on selected record type */}
            {selectedRecord && (selectedRecord.recordType === 0 || selectedRecord.recordType === 2) && (
              <Form.Item name="sputumSmearResult" label="Ket qua soi dom">
                <Select
                  placeholder="Chon ket qua"
                  allowClear
                  options={[
                    { value: 'AFB(+)', label: 'AFB duong tinh (+)' },
                    { value: 'AFB(-)', label: 'AFB am tinh (-)' },
                    { value: 'AFB(++)', label: 'AFB (++)' },
                    { value: 'AFB(+++)', label: 'AFB (+++)' },
                  ]}
                />
              </Form.Item>
            )}

            {selectedRecord && (selectedRecord.recordType === 1 || selectedRecord.recordType === 2) && (
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Form.Item name="cd4Count" label="CD4 (te bao/uL)">
                    <InputNumber min={0} max={3000} style={{ width: '100%' }} placeholder="0" />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item name="viralLoad" label="Viral Load (copies/mL)">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                  </Form.Item>
                </div>
              </div>
            )}

            <Form.Item name="notes" label="Ghi chu">
              <TextArea rows={2} placeholder="Ghi chu them..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
    </div>
  );
};

export default TbHivManagement;
