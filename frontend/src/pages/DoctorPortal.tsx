import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Segmented, Spin, Table, Tag, Button, Modal,
  Descriptions, Badge, Calendar, Space, message, Statistic, Input,
  Avatar, Checkbox, Tooltip, Empty, Typography,
} from 'antd';
import {
  UserOutlined, MedicineBoxOutlined, ExperimentOutlined, SaveOutlined,
  ReloadOutlined, FileProtectOutlined, CalendarOutlined, EditOutlined,
  CheckCircleOutlined, ClockCircleOutlined, TeamOutlined, ScheduleOutlined,
  SolutionOutlined, LogoutOutlined, AlertOutlined, FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import client from '../api/client';
import * as examApi from '../api/examination';
import * as inpatientApi from '../api/inpatient';
import * as digitalSignApi from '../api/digitalSignature';
import * as hrApi from '../api/medicalHR';

const { Search } = Input;
const { Title, Text } = Typography;

// ============================================================================
// Local interfaces
// ============================================================================

interface PendingDocument {
  id: string;
  documentId: string;
  documentType: string;
  documentCode: string;
  patientName?: string;
  title: string;
  createdAt: string;
  status: string;
}

interface DutyShift {
  date: string;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  location?: string;
  isOnCall: boolean;
  isNightShift: boolean;
}

// ============================================================================
// Component
// ============================================================================

const DoctorPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('outpatient');
  const [loading, setLoading] = useState(false);

  // Outpatient
  const [opdPatients, setOpdPatients] = useState<examApi.ExaminationDto[]>([]);
  const [opdTotal, setOpdTotal] = useState(0);
  const [opdKeyword, setOpdKeyword] = useState('');
  const [opdPage, setOpdPage] = useState(1);
  const [selectedOpd, setSelectedOpd] = useState<examApi.ExaminationDto | null>(null);
  const [opdDetailOpen, setOpdDetailOpen] = useState(false);

  // Inpatient
  const [ipdPatients, setIpdPatients] = useState<inpatientApi.InpatientListDto[]>([]);
  const [ipdTotal, setIpdTotal] = useState(0);
  const [ipdKeyword, setIpdKeyword] = useState('');
  const [ipdPage, setIpdPage] = useState(1);
  const [selectedIpd, setSelectedIpd] = useState<inpatientApi.InpatientListDto | null>(null);
  const [ipdDetailOpen, setIpdDetailOpen] = useState(false);

  // Digital signature
  const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);
  const [sigLoading, setSigLoading] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signingDoc, setSigningDoc] = useState<PendingDocument | null>(null);

  // Duty schedule
  const [dutyShifts, setDutyShifts] = useState<DutyShift[]>([]);
  const [dutyMonth, setDutyMonth] = useState(dayjs());
  const selectedDocs = pendingDocs.filter((doc) => selectedDocIds.includes(doc.id));
  const selectedDocTypes = Array.from(new Set(selectedDocs.map((doc) => doc.documentType)));
  const hasMixedSelectedDocTypes = selectedDocTypes.length > 1;

  // ============================================================================
  // Data fetching
  // ============================================================================

  const fetchOutpatients = useCallback(async () => {
    setLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const res = await examApi.searchExaminations({
        keyword: opdKeyword || undefined,
        fromDate: today,
        toDate: today,
        pageIndex: opdPage,
        pageSize: 20,
      });
      if (res.data) {
        setOpdPatients(res.data.items || []);
        setOpdTotal(res.data.totalCount || 0);
      }
    } catch {
      message.warning('Không thể tải danh sách bệnh nhân ngoại trú');
    } finally {
      setLoading(false);
    }
  }, [opdKeyword, opdPage]);

  const fetchInpatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inpatientApi.getInpatientList({
        keyword: ipdKeyword || undefined,
        status: 1,
        page: ipdPage,
        pageSize: 20,
      });
      if (res.data) {
        setIpdPatients(res.data.items || []);
        setIpdTotal(res.data.totalCount || 0);
      }
    } catch {
      message.warning('Không thể tải danh sách bệnh nhân nội trú');
    } finally {
      setLoading(false);
    }
  }, [ipdKeyword, ipdPage]);

  const fetchPendingDocuments = useCallback(async () => {
    setSigLoading(true);
    try {
      const res = await client.get<PendingDocument[]>('/digital-signature/pending');
      setPendingDocs(res.data || []);
    } catch {
      setPendingDocs([]);
    } finally {
      setSigLoading(false);
    }
  }, []);

  const fetchDutySchedule = useCallback(async () => {
    setLoading(true);
    try {
      const user = localStorage.getItem('user');
      const userId = user ? JSON.parse(user).id : null;
      if (!userId) { setDutyShifts([]); setLoading(false); return; }
      const res = await hrApi.getStaffRoster(userId, dutyMonth.year(), dutyMonth.month() + 1);
      if (res.data) {
        setDutyShifts((res.data || []).map((a: hrApi.RosterAssignmentDto) => ({
          date: a.date,
          shiftName: a.shiftName,
          shiftStart: a.shiftStart,
          shiftEnd: a.shiftEnd,
          location: a.location,
          isOnCall: a.isOnCall,
          isNightShift: (a.shiftName || '').toLowerCase().includes('dem'),
        })));
      }
    } catch {
      setDutyShifts([]);
    } finally {
      setLoading(false);
    }
  }, [dutyMonth]);

  useEffect(() => {
    if (activeTab === 'outpatient') fetchOutpatients();
    else if (activeTab === 'inpatient') fetchInpatients();
    else if (activeTab === 'signature') fetchPendingDocuments();
    else if (activeTab === 'schedule') fetchDutySchedule();
  }, [activeTab, fetchOutpatients, fetchInpatients, fetchPendingDocuments, fetchDutySchedule]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleRefresh = () => {
    if (activeTab === 'outpatient') fetchOutpatients();
    else if (activeTab === 'inpatient') fetchInpatients();
    else if (activeTab === 'signature') fetchPendingDocuments();
    else if (activeTab === 'schedule') fetchDutySchedule();
  };

  const handleSignDocument = (doc: PendingDocument) => {
    setSigningDoc(doc);
    setSignModalOpen(true);
  };

  const handleConfirmSign = async () => {
    if (!signingDoc) return;
    try {
      await digitalSignApi.signDocument({
        documentId: signingDoc.documentId,
        documentType: signingDoc.documentType,
        reason: 'Ký xác nhận',
        location: 'Bệnh viện',
      });
      message.success('Ký số thành công');
      setSignModalOpen(false);
      setSigningDoc(null);
      fetchPendingDocuments();
    } catch {
      message.warning('Không thể ký số tài liệu');
    }
  };

  const handleBatchSign = async () => {
    if (selectedDocIds.length === 0) {
      message.warning('Vui lòng chọn tài liệu cần ký');
      return;
    }
    if (hasMixedSelectedDocTypes) {
      message.warning('Ch�‰ có th�ƒ ký hàng lo�¡t các tài li�‡u cùng lo�¡i');
      return;
    }
    try {
      const docType = selectedDocs[0]?.documentType || 'EMR';
      await digitalSignApi.batchSign({
        documentIds: selectedDocIds,
        documentType: docType,
        reason: 'Ký hàng loạt',
      });
      message.success(`Đã ký ${selectedDocIds.length} tài liệu`);
      setSelectedDocIds([]);
      fetchPendingDocuments();
    } catch {
      message.warning('Ký hàng loạt thất bại');
    }
  };

  const handleUnavailableAction = (actionName: string) => {
    message.info(`${actionName} chưa Ä‘ư�£c tri�ƒn khai trong c�•ng bác sĩ. Vui lòng th�±c hi�‡n t�¡i phân h�‡ chuyên bi�‡t.`);
  };

  // ============================================================================
  // Helpers
  // ============================================================================

  const getOpdStatusTag = (status: number) => {
    const map: Record<number, { color: string; label: string }> = {
      0: { color: 'default', label: 'Chờ khám' },
      1: { color: 'blue', label: 'Đang khám' },
      2: { color: 'orange', label: 'Chờ KQ CLS' },
      3: { color: 'green', label: 'Hoàn thành' },
      4: { color: 'red', label: 'Đã khóa' },
    };
    const info = map[status] || { color: 'default', label: String(status) };
    return <Tag color={info.color}>{info.label}</Tag>;
  };

  const getIpdStatusTag = (status: number) => {
    const map: Record<number, { color: string; label: string }> = {
      1: { color: 'blue', label: 'Đang điều trị' },
      2: { color: 'orange', label: 'Chờ xuất viện' },
      3: { color: 'green', label: 'Đã xuất viện' },
      4: { color: 'red', label: 'Chuyển viện' },
    };
    const info = map[status] || { color: 'default', label: String(status) };
    return <Tag color={info.color}>{info.label}</Tag>;
  };

  const getShiftColor = (name: string) => {
    const l = (name || '').toLowerCase();
    if (l.includes('sang') || l.includes('morning')) return '#52c41a';
    if (l.includes('chieu') || l.includes('afternoon')) return '#faad14';
    if (l.includes('dem') || l.includes('night')) return '#722ed1';
    if (l.includes('24') || l.includes('truc')) return '#f5222d';
    return '#1890ff';
  };

  // ============================================================================
  // Outpatient Tab
  // ============================================================================

  const opdWaiting = opdPatients.filter(p => p.status === 0).length;
  const opdInProgress = opdPatients.filter(p => p.status === 1).length;
  const opdCompleted = opdPatients.filter(p => p.status === 3).length;

  const opdColumns: ColumnsType<examApi.ExaminationDto> = [
    {
      title: 'STT', dataIndex: 'queueNumber', key: 'queueNumber', width: 70,
      render: (num: number) => <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>{num}</Avatar>,
    },
    { title: 'Họ tên', dataIndex: 'patientName', key: 'patientName', ellipsis: true },
    { title: 'Mã BN', dataIndex: 'patientCode', key: 'patientCode', width: 110, responsive: ['md'] as const },
    { title: 'Phòng', dataIndex: 'roomName', key: 'roomName', width: 120, responsive: ['lg'] as const },
    {
      title: 'Chẩn đoán', dataIndex: 'diagnosisName', key: 'diagnosisName', ellipsis: true,
      responsive: ['md'] as const,
      render: (t: string) => t || <Text type="secondary">Chưa có</Text>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 130,
      render: (s: number) => getOpdStatusTag(s),
    },
    {
      title: '', key: 'action', width: 80,
      render: (_: unknown, r: examApi.ExaminationDto) => (
        <Button type="link" size="small" icon={<EditOutlined />}
          onClick={() => { setSelectedOpd(r); setOpdDetailOpen(true); }}>Xem</Button>
      ),
    },
  ];

  const renderOutpatientTab = () => (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8} md={6}>
          <Card size="small"><Statistic title="Chờ khám" value={opdWaiting} prefix={<ClockCircleOutlined />}
            styles={{ content: { color: '#faad14', fontSize: 20 } }} /></Card>
        </Col>
        <Col xs={8} md={6}>
          <Card size="small"><Statistic title="Đang khám" value={opdInProgress} prefix={<UserOutlined />}
            styles={{ content: { color: '#1890ff', fontSize: 20 } }} /></Card>
        </Col>
        <Col xs={8} md={6}>
          <Card size="small"><Statistic title="Hoàn thành" value={opdCompleted} prefix={<CheckCircleOutlined />}
            styles={{ content: { color: '#52c41a', fontSize: 20 } }} /></Card>
        </Col>
        <Col xs={24} md={6}>
          <Card size="small"><Statistic title="Tổng hôm nay" value={opdTotal} prefix={<TeamOutlined />} /></Card>
        </Col>
      </Row>

      <Row style={{ marginBottom: 12 }}>
        <Col xs={24} sm={16} md={12}>
          <Search placeholder="Tìm bệnh nhân (tên, mã BN)..."
            onSearch={(v) => { setOpdKeyword(v); setOpdPage(1); }} allowClear enterButton />
        </Col>
      </Row>

      <Table columns={opdColumns} dataSource={opdPatients} rowKey="id" size="small" loading={loading}
        pagination={{ current: opdPage, pageSize: 20, total: opdTotal, showSizeChanger: false,
          showTotal: (t) => `${t} bệnh nhân`, onChange: (p) => setOpdPage(p), size: 'small' }}
        onRow={(r) => ({ onClick: () => { setSelectedOpd(r); setOpdDetailOpen(true); }, style: { cursor: 'pointer' } })}
        scroll={{ x: 600 }} />

      <Modal title={<Space><UserOutlined /><span>Bệnh nhân - {selectedOpd?.patientName}</span></Space>}
        open={opdDetailOpen} onCancel={() => { setOpdDetailOpen(false); setSelectedOpd(null); }}
        destroyOnHidden width={700}
        footer={selectedOpd ? (
          <Space wrap>
            <Tooltip title="Chuyển sang phân hệ khám bệnh/đơn thuốc để thao tác">
              <Button icon={<MedicineBoxOutlined />} type="primary"
                onClick={() => handleUnavailableAction('Kê đơn')}>
                Kê đơn
              </Button>
            </Tooltip>
            <Tooltip title="Chuyển sang phân hệ khám bệnh/CLS để thao tác">
              <Button icon={<ExperimentOutlined />}
                onClick={() => handleUnavailableAction('Chỉ định CLS')}>
                Chỉ định CLS
              </Button>
            </Tooltip>
            <Tooltip title="Modal này chỉ dùng để xem nhanh thông tin">
              <Button icon={<SaveOutlined />} onClick={() => handleUnavailableAction('Lưu')}>
                Lưu
              </Button>
            </Tooltip>
            <Button onClick={() => setOpdDetailOpen(false)}>Đóng</Button>
          </Space>
        ) : null}>
        {selectedOpd && (
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="Mã bệnh nhân">{selectedOpd.patientCode}</Descriptions.Item>
            <Descriptions.Item label="Họ tên">{selectedOpd.patientName}</Descriptions.Item>
            <Descriptions.Item label="Số thứ tự">
              <Badge count={selectedOpd.queueNumber} style={{ backgroundColor: '#1890ff' }} />
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{getOpdStatusTag(selectedOpd.status)}</Descriptions.Item>
            <Descriptions.Item label="Phòng khám">{selectedOpd.roomName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Bác sĩ">{selectedOpd.doctorName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Ngày khám">
              {dayjs(selectedOpd.examinationDate).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Chẩn đoán">
              {selectedOpd.diagnosisCode
                ? `${selectedOpd.diagnosisCode} - ${selectedOpd.diagnosisName}`
                : <Text type="secondary">Chưa có chẩn đoán</Text>}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );

  // ============================================================================
  // Inpatient Tab
  // ============================================================================

  const ipdActive = ipdPatients.filter(p => p.status === 1).length;
  const ipdPendingDischarge = ipdPatients.filter(p => p.status === 2).length;
  const ipdAlerts = ipdPatients.filter(p => p.hasPendingOrders || p.hasPendingLabResults || p.hasUnclaimedMedicine).length;

  const ipdColumns: ColumnsType<inpatientApi.InpatientListDto> = [
    {
      title: 'Giường', dataIndex: 'bedName', key: 'bedName', width: 80,
      render: (b: string, r: inpatientApi.InpatientListDto) => <Tag color={r.isDebtWarning ? 'red' : 'blue'}>{b || '-'}</Tag>,
    },
    {
      title: 'Họ tên', dataIndex: 'patientName', key: 'patientName', ellipsis: true,
      render: (n: string, r: inpatientApi.InpatientListDto) => (
        <Space><span>{n}</span>
          {r.hasPendingOrders && <Badge status="processing" />}
          {r.hasPendingLabResults && <Badge status="warning" />}
          {r.hasUnclaimedMedicine && <Badge status="error" />}
        </Space>
      ),
    },
    { title: 'Khoa', dataIndex: 'departmentName', key: 'dept', width: 120, ellipsis: true, responsive: ['md'] as const },
    {
      title: 'Ngày NV', dataIndex: 'daysOfStay', key: 'days', width: 85,
      render: (d: number) => <Tag color={d > 14 ? 'orange' : 'default'}>{d} ngày</Tag>,
    },
    {
      title: 'Chẩn đoán', dataIndex: 'mainDiagnosis', key: 'diag', ellipsis: true,
      responsive: ['lg'] as const,
      render: (t: string) => t || <Text type="secondary">-</Text>,
    },
    {
      title: 'TT', dataIndex: 'status', key: 'status', width: 110,
      render: (s: number) => getIpdStatusTag(s),
    },
  ];

  const renderInpatientTab = () => (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8} md={6}>
          <Card size="small"><Statistic title="Đang điều trị" value={ipdActive} prefix={<MedicineBoxOutlined />}
            styles={{ content: { color: '#1890ff', fontSize: 20 } }} /></Card>
        </Col>
        <Col xs={8} md={6}>
          <Card size="small"><Statistic title="Chờ xuất viện" value={ipdPendingDischarge} prefix={<LogoutOutlined />}
            styles={{ content: { color: '#faad14', fontSize: 20 } }} /></Card>
        </Col>
        <Col xs={8} md={6}>
          <Card size="small"><Statistic title="Có cảnh báo" value={ipdAlerts} prefix={<AlertOutlined />}
            styles={{ content: { color: ipdAlerts > 0 ? '#f5222d' : '#52c41a', fontSize: 20 } }} /></Card>
        </Col>
        <Col xs={24} md={6}>
          <Card size="small"><Statistic title="Tổng nội trú" value={ipdTotal} prefix={<TeamOutlined />} /></Card>
        </Col>
      </Row>

      <Row style={{ marginBottom: 12 }}>
        <Col xs={24} sm={16} md={12}>
          <Search placeholder="Tìm bệnh nhân (tên, mã BN, giường)..."
            onSearch={(v) => { setIpdKeyword(v); setIpdPage(1); }} allowClear enterButton />
        </Col>
      </Row>

      <Table columns={ipdColumns} dataSource={ipdPatients} rowKey="admissionId" size="small" loading={loading}
        pagination={{ current: ipdPage, pageSize: 20, total: ipdTotal, showSizeChanger: false,
          showTotal: (t) => `${t} bệnh nhân`, onChange: (p) => setIpdPage(p), size: 'small' }}
        onRow={(r) => ({ onClick: () => { setSelectedIpd(r); setIpdDetailOpen(true); }, style: { cursor: 'pointer' } })}
        scroll={{ x: 600 }} />

      <Modal title={<Space><SolutionOutlined /><span>Bệnh nhân nội trú - {selectedIpd?.patientName}</span></Space>}
        open={ipdDetailOpen} onCancel={() => { setIpdDetailOpen(false); setSelectedIpd(null); }}
        destroyOnHidden width={750}
        footer={selectedIpd ? (
          <Space wrap>
            <Tooltip title="Chuyển sang phân hệ nội trú để thao tác y lệnh">
              <Button icon={<EditOutlined />} type="primary"
                onClick={() => handleUnavailableAction('Y lệnh')}>
                Y lệnh
              </Button>
            </Tooltip>
            <Tooltip title="Chuyển sang phân hệ nội trú để lập phiếu điều trị">
              <Button icon={<FileTextOutlined />}
                onClick={() => handleUnavailableAction('Phiếu điều trị')}>
                Phiếu điều trị
              </Button>
            </Tooltip>
            <Tooltip title="Xuất viện cần thực hiện trong phân hệ nội trú">
              <Button icon={<LogoutOutlined />} danger
                onClick={() => handleUnavailableAction('Xuất viện')}>
                Xuất viện
              </Button>
            </Tooltip>
            <Button onClick={() => setIpdDetailOpen(false)}>Đóng</Button>
          </Space>
        ) : null}>
        {selectedIpd && (
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="Mã bệnh nhân">{selectedIpd.patientCode}</Descriptions.Item>
            <Descriptions.Item label="Họ tên">{selectedIpd.patientName}</Descriptions.Item>
            <Descriptions.Item label="Giới tính">
              {selectedIpd.gender === 1 ? 'Nam' : selectedIpd.gender === 2 ? 'Nữ' : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Tuổi">{selectedIpd.age ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Khoa">{selectedIpd.departmentName}</Descriptions.Item>
            <Descriptions.Item label="Phòng">{selectedIpd.roomName}</Descriptions.Item>
            <Descriptions.Item label="Giường">{selectedIpd.bedName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Số ngày">
              <Tag color={selectedIpd.daysOfStay > 14 ? 'orange' : 'blue'}>{selectedIpd.daysOfStay} ngày</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày nhập viện">
              {dayjs(selectedIpd.admissionDate).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{getIpdStatusTag(selectedIpd.status)}</Descriptions.Item>
            <Descriptions.Item label="Chẩn đoán" span={2}>
              {selectedIpd.mainDiagnosis || <Text type="secondary">Chưa có chẩn đoán</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="BS điều trị">{selectedIpd.attendingDoctorName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Bảo hiểm">
              {selectedIpd.isInsurance
                ? <Tag color="green">BHYT: {selectedIpd.insuranceNumber}</Tag>
                : <Tag color="default">Thu phí</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Cảnh báo" span={2}>
              <Space wrap>
                {selectedIpd.hasPendingOrders && <Tag color="processing">Y lệnh chưa TH</Tag>}
                {selectedIpd.hasPendingLabResults && <Tag color="warning">Chờ KQ XN</Tag>}
                {selectedIpd.hasUnclaimedMedicine && <Tag color="error">Thuốc chưa nhận</Tag>}
                {selectedIpd.isDebtWarning && (
                  <Tag color="red">Nợ: {(selectedIpd.totalDebt ?? 0).toLocaleString('vi-VN')} VND</Tag>
                )}
                {!selectedIpd.hasPendingOrders && !selectedIpd.hasPendingLabResults
                  && !selectedIpd.hasUnclaimedMedicine && !selectedIpd.isDebtWarning
                  && <Tag color="green">Không có cảnh báo</Tag>}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );

  // ============================================================================
  // Digital Signature Tab
  // ============================================================================

  const docTypeLabel = (type: string) => {
    const m: Record<string, { l: string; c: string }> = {
      EMR: { l: 'Hồ sơ BA', c: 'blue' }, PRESCRIPTION: { l: 'Đơn thuốc', c: 'green' },
      LAB: { l: 'Xét nghiệm', c: 'orange' }, RADIOLOGY: { l: 'CĐHA', c: 'purple' },
      DISCHARGE: { l: 'Ra viện', c: 'cyan' },
    };
    const info = m[type] || { l: type, c: 'default' };
    return <Tag color={info.c}>{info.l}</Tag>;
  };

  const sigColumns: ColumnsType<PendingDocument> = [
    {
      title: (
        <Checkbox
          checked={selectedDocIds.length > 0 && selectedDocIds.length === pendingDocs.length}
          indeterminate={selectedDocIds.length > 0 && selectedDocIds.length < pendingDocs.length}
          onChange={(e) => setSelectedDocIds(e.target.checked ? pendingDocs.map(d => d.id) : [])}
        />
      ),
      key: 'sel', width: 50,
      render: (_: unknown, r: PendingDocument) => (
        <Checkbox checked={selectedDocIds.includes(r.id)}
          onChange={(e) => setSelectedDocIds(prev =>
            e.target.checked ? [...prev, r.id] : prev.filter(id => id !== r.id))} />
      ),
    },
    { title: 'Mã', dataIndex: 'documentCode', key: 'code', width: 130 },
    { title: 'Loại', dataIndex: 'documentType', key: 'type', width: 120,
      render: (t: string) => docTypeLabel(t) },
    { title: 'Tiêu đề', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'pn', width: 150, responsive: ['md'] as const },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'date', width: 130, responsive: ['lg'] as const,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm') },
    { title: '', key: 'act', width: 80,
      render: (_: unknown, r: PendingDocument) => (
        <Button type="primary" size="small" icon={<FileProtectOutlined />}
          onClick={() => handleSignDocument(r)}>Ký</Button>
      ),
    },
  ];

  const renderSignatureTab = () => (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small"><Statistic title="Chờ ký" value={pendingDocs.length}
            prefix={<FileProtectOutlined />}
            styles={{ content: { color: pendingDocs.length > 0 ? '#faad14' : '#52c41a', fontSize: 20 } }} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small"><Statistic title="Đã chọn" value={selectedDocIds.length}
            prefix={<CheckCircleOutlined />}
            styles={{ content: { color: '#1890ff', fontSize: 20 } }} /></Card>
        </Col>
      </Row>

      {selectedDocIds.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Space orientation="vertical" size={4}>
            <Tooltip title={hasMixedSelectedDocTypes ? 'Chỉ có thể ký hàng loạt khi tất cả cùng loại tài liệu' : ''}>
              <Button type="primary" icon={<FileProtectOutlined />} onClick={handleBatchSign}
                disabled={hasMixedSelectedDocTypes}>
                Ký hàng loạt ({selectedDocIds.length} tài liệu)
              </Button>
            </Tooltip>
            {hasMixedSelectedDocTypes && (
              <Text type="warning">
                Đang chọn {selectedDocTypes.length} loại tài liệu. Hãy chọn các tài liệu cùng loại để ký hàng loạt.
              </Text>
            )}
          </Space>
        </div>
      )}

      <Table columns={sigColumns} dataSource={pendingDocs} rowKey="id" size="small" loading={sigLoading}
        locale={{ emptyText: <Empty description="Không có tài liệu chờ ký" /> }}
        pagination={{ pageSize: 20, showTotal: (t) => `${t} tài liệu` }}
        scroll={{ x: 600 }} />

      <Modal title={<Space><FileProtectOutlined /><span>Xác nhận ký số</span></Space>}
        open={signModalOpen} onCancel={() => { setSignModalOpen(false); setSigningDoc(null); }}
        destroyOnHidden onOk={handleConfirmSign} okText="Ký số" cancelText="Hủy">
        {signingDoc && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Mã">{signingDoc.documentCode}</Descriptions.Item>
            <Descriptions.Item label="Loại">{signingDoc.documentType}</Descriptions.Item>
            <Descriptions.Item label="Tiêu đề">{signingDoc.title}</Descriptions.Item>
            <Descriptions.Item label="Bệnh nhân">{signingDoc.patientName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{dayjs(signingDoc.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
          </Descriptions>
        )}
        <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', borderRadius: 6 }}>
          <Text type="warning">
            <AlertOutlined /> Bạn sắp ký số tài liệu này. Hành động này không thể hoàn tác.
          </Text>
        </div>
      </Modal>
    </>
  );

  // ============================================================================
  // Duty Schedule Tab
  // ============================================================================

  const getShiftsForDate = (date: Dayjs): DutyShift[] =>
    dutyShifts.filter(s => s.date === date.format('YYYY-MM-DD'));

  const dateCellRender = (date: Dayjs) => {
    const shifts = getShiftsForDate(date);
    if (shifts.length === 0) return null;
    return (
      <div>{shifts.map((s, i) => (
        <Tooltip key={i} title={`${s.shiftStart} - ${s.shiftEnd}${s.location ? ` | ${s.location}` : ''}${s.isOnCall ? ' (Trực)' : ''}`}>
          <Tag color={getShiftColor(s.shiftName)} style={{ marginBottom: 2, fontSize: 11, cursor: 'pointer' }}>
            {s.shiftName}{s.isOnCall && ' *'}
          </Tag>
        </Tooltip>
      ))}</div>
    );
  };

  const renderScheduleTab = () => {
    const today = dayjs();
    const upcoming = dutyShifts
      .filter(s => dayjs(s.date).isSame(today, 'day') || dayjs(s.date).isAfter(today))
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7);

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} md={17}>
          <Card size="small" title="Lịch trực" extra={
            <Space>
              {['Sáng', 'Chiều', 'Đêm', 'Trực 24h'].map(l => (
                <Tag key={l} color={getShiftColor(l)}>{l}</Tag>
              ))}
            </Space>
          }>
            <Calendar fullscreen={false} value={dutyMonth}
              onChange={(d) => setDutyMonth(d)} cellRender={(d) => dateCellRender(d)} />
          </Card>
        </Col>
        <Col xs={24} md={7}>
          <Card size="small" title="Lịch sắp tới">
            {upcoming.length === 0 ? <Empty description="Không có ca trực sắp tới" /> :
              upcoming.map((s, i) => {
                const isToday = dayjs(s.date).isSame(today, 'day');
                return (
                  <Card key={i} size="small" style={{ marginBottom: 8,
                    borderLeft: `3px solid ${getShiftColor(s.shiftName)}`,
                    background: isToday ? '#e6f7ff' : undefined }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong={isToday}>{isToday ? 'Hôm nay' : dayjs(s.date).format('DD/MM (ddd)')}</Text>
                        <br />
                        <Tag color={getShiftColor(s.shiftName)} style={{ marginTop: 4 }}>{s.shiftName}</Tag>
                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>{s.shiftStart} - {s.shiftEnd}</Text>
                      </div>
                      {s.isOnCall && <Badge status="processing" text="Trực" />}
                    </div>
                    {s.location && (
                      <Text type="secondary" style={{ fontSize: 12 }}><ScheduleOutlined /> {s.location}</Text>
                    )}
                  </Card>
                );
              })}
          </Card>
          <Card size="small" title="Thống kê tháng" style={{ marginTop: 12 }}>
            <Statistic title="Tổng ca trực" value={dutyShifts.length} prefix={<CalendarOutlined />}
              styles={{ content: { fontSize: 18 } }} />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Ca đêm: {dutyShifts.filter(s => s.isNightShift).length} |
                Trực: {dutyShifts.filter(s => s.isOnCall).length}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    );
  };

  // ============================================================================
  // Main render
  // ============================================================================

  return (
    <Spin spinning={loading && opdPatients.length === 0 && ipdPatients.length === 0}>
      <div style={{ padding: 0 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <Title level={4} style={{ margin: 0 }}><SolutionOutlined /> Cổng Bác sĩ</Title>
            <Tooltip title="Làm mới"><Button icon={<ReloadOutlined />} onClick={handleRefresh} /></Tooltip>
          </div>

          <div style={{ marginBottom: 16, overflowX: 'auto' }}>
            <Segmented value={activeTab} onChange={(v) => setActiveTab(v as string)}
              options={[
                { label: <Space><UserOutlined /><span>Ngoại trú</span>
                  {opdTotal > 0 && <Badge count={opdTotal} size="small" />}</Space>, value: 'outpatient' },
                { label: <Space><MedicineBoxOutlined /><span>Nội trú</span>
                  {ipdTotal > 0 && <Badge count={ipdTotal} size="small" />}</Space>, value: 'inpatient' },
                { label: <Space><FileProtectOutlined /><span>Chữ ký số</span>
                  {pendingDocs.length > 0 && <Badge count={pendingDocs.length} size="small" />}</Space>, value: 'signature' },
                { label: <Space><CalendarOutlined /><span>Lịch trực</span></Space>, value: 'schedule' },
              ]}
              block style={{ minWidth: 400 }} />
          </div>

          {activeTab === 'outpatient' && renderOutpatientTab()}
          {activeTab === 'inpatient' && renderInpatientTab()}
          {activeTab === 'signature' && renderSignatureTab()}
          {activeTab === 'schedule' && renderScheduleTab()}
        </Card>
      </div>
    </Spin>
  );
};

export default DoctorPortal;
