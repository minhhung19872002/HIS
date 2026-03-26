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
  message,
  Alert,
  Spin,
  Drawer,
} from 'antd';
import {
  CloudUploadOutlined,
  ApiOutlined,
  SafetyOutlined,
  FileTextOutlined,
  PrinterOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  LinkOutlined,
  TeamOutlined,
  SwapOutlined,
  SendOutlined,
  ReloadOutlined,
  MedicineBoxOutlined,
  SearchOutlined,
  DownloadOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getConnections,
  getInsuranceSubmissions,
  getReferrals,
  getTeleconsultRequests,
  getDashboard,
  testConnection,
  activateConnection,
  deactivateConnection,
  generateXML,
  submitToInsurance,
  createReferral,
  sendReferral,
  createTeleconsultRequest,
  startTeleconsult,
  printReferralLetter,
} from '../api/healthExchange';
import type {
  HIEConnectionDto,
  InsuranceSubmissionDto,
  ElectronicReferralDto,
  TeleconsultationRequestDto,
  HIEDashboardDto,
  CreateReferralDto,
  CreateTeleconsultRequestDto,
  GenerateXMLDto,
} from '../api/healthExchange';
import {
  getMetadata,
  searchResource,
  readResource,
  exportPatientBundle,
  fetchExternalMetadata,
} from '../api/fhir';
import type { FhirCapabilityStatement, FhirBundle, FhirResource } from '../api/fhir';
import * as nationalRxApi from '../api/nationalPrescription';
import type { NationalPrescriptionDto, NationalPrescriptionStatsDto } from '../api/nationalPrescription';
import * as provincialApi from '../api/provincialHealth';
import type { ProvincialReportDto, ProvincialStatsDto } from '../api/provincialHealth';

const { Title, Text } = Typography;
const { TextArea } = Input;

type ReferralFormValues = {
  patientId: string;
  destinationFacilityCode: string;
  destinationDepartment?: string;
  diagnosis: string;
  diagnosisIcd?: string;
  reason: string;
  clinicalSummary?: string;
  treatmentHistory?: string;
  currentMedications?: string;
  allergies?: string;
  specialInstructions?: string;
  urgency: number;
};

type ConsultationFormValues = {
  requestType?: string;
  patientId: string;
  consultingFacilityCode: string;
  specialty: string;
  chiefComplaint?: string;
  clinicalQuestion?: string;
  reason?: string;
  relevantHistory?: string;
  currentFindings?: string;
  urgency?: number;
  preferredDate?: dayjs.Dayjs;
  preferredTime?: string;
};

type XMLFormValues = {
  xmlType: string;
  periodFrom?: dayjs.Dayjs;
  periodTo?: dayjs.Dayjs;
  departmentId?: string;
  patientId?: string;
};

const HealthExchange: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<HIEConnectionDto[]>([]);
  const [submissions, setSubmissions] = useState<InsuranceSubmissionDto[]>([]);
  const [referrals, setReferrals] = useState<ElectronicReferralDto[]>([]);
  const [consultations, setConsultations] = useState<TeleconsultationRequestDto[]>([]);
  const [dashboard, setDashboard] = useState<HIEDashboardDto | null>(null);

  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const [consultationModalVisible, setConsultationModalVisible] = useState(false);
  const [xmlModalVisible, setXmlModalVisible] = useState(false);

  // FHIR state
  const [fhirMetadata, setFhirMetadata] = useState<FhirCapabilityStatement | null>(null);
  const [fhirSearchType, setFhirSearchType] = useState<string>('Patient');
  const [fhirSearchParams, setFhirSearchParams] = useState<Record<string, string>>({});
  const [fhirSearchResults, setFhirSearchResults] = useState<FhirBundle | null>(null);
  const [fhirSearchLoading, setFhirSearchLoading] = useState(false);
  const [fhirJsonDrawerOpen, setFhirJsonDrawerOpen] = useState(false);
  const [fhirJsonContent, setFhirJsonContent] = useState<string>('');
  const [fhirJsonTitle, setFhirJsonTitle] = useState<string>('');
  const [fhirExportPatientId, setFhirExportPatientId] = useState<string>('');
  const [fhirExternalUrl, setFhirExternalUrl] = useState<string>('');
  const [fhirExternalStatus, setFhirExternalStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // National Prescription Portal state
  const [nationalRxList, setNationalRxList] = useState<NationalPrescriptionDto[]>([]);
  const [nationalRxStats, setNationalRxStats] = useState<NationalPrescriptionStatsDto | null>(null);
  const [nationalRxTotal, setNationalRxTotal] = useState(0);
  const [nationalRxLoading, setNationalRxLoading] = useState(false);
  const [nationalRxSearch, setNationalRxSearch] = useState<{ status?: number; keyword?: string; pageIndex: number }>({ pageIndex: 0 });
  const [selectedNationalRxIds, setSelectedNationalRxIds] = useState<string[]>([]);

  // Provincial Health Monitoring state
  const [provReports, setProvReports] = useState<ProvincialReportDto[]>([]);
  const [provStats, setProvStats] = useState<ProvincialStatsDto | null>(null);
  const [provTotal, setProvTotal] = useState(0);
  const [provLoading, setProvLoading] = useState(false);
  const [provSearch, setProvSearch] = useState<{ reportType?: number; status?: number; pageIndex: number }>({ pageIndex: 0 });

  const [referralForm] = Form.useForm();
  const [consultationForm] = Form.useForm();
  const [xmlForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getConnections(),
        getInsuranceSubmissions(),
        getReferrals(),
        getTeleconsultRequests(),
        getDashboard(),
      ]);

      if (results[0].status === 'fulfilled') {
        setConnections(results[0].value?.data || []);
      } else {
        console.warn('Failed to fetch connections:', results[0].reason);
      }

      if (results[1].status === 'fulfilled') {
        setSubmissions(results[1].value?.data || []);
      } else {
        console.warn('Failed to fetch submissions:', results[1].reason);
      }

      if (results[2].status === 'fulfilled') {
        setReferrals(results[2].value?.data || []);
      } else {
        console.warn('Failed to fetch referrals:', results[2].reason);
      }

      if (results[3].status === 'fulfilled') {
        setConsultations(results[3].value?.data || []);
      } else {
        console.warn('Failed to fetch consultations:', results[3].reason);
      }

      if (results[4].status === 'fulfilled') {
        setDashboard(results[4].value?.data || null);
      } else {
        console.warn('Failed to fetch dashboard:', results[4].reason);
      }
    } catch (err) {
      console.warn('Failed to fetch HIE data:', err);
      message.warning('Không thể tải dữ liệu liên thông y tế');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==================== National Prescription Portal ====================
  const fetchNationalRx = useCallback(async () => {
    setNationalRxLoading(true);
    try {
      const [listRes, statsRes] = await Promise.allSettled([
        nationalRxApi.searchPrescriptions({ ...nationalRxSearch, pageSize: 20 }),
        nationalRxApi.getStats(),
      ]);
      if (listRes.status === 'fulfilled') {
        setNationalRxList(listRes.value?.items || []);
        setNationalRxTotal(listRes.value?.totalCount || 0);
      }
      if (statsRes.status === 'fulfilled') setNationalRxStats(statsRes.value || null);
    } catch { console.warn('Failed to fetch national prescription data'); }
    finally { setNationalRxLoading(false); }
  }, [nationalRxSearch]);

  useEffect(() => { fetchNationalRx(); }, [fetchNationalRx]);

  const handleSubmitNationalRx = async (id: string) => {
    try {
      await nationalRxApi.submitPrescription(id);
      message.success('Đã gửi đơn thuốc lên Cổng quốc gia');
      fetchNationalRx();
    } catch (err) { console.warn('Submit national prescription:', err); message.warning('Không thể gửi đơn thuốc'); }
  };

  const handleBatchSubmitNationalRx = async () => {
    if (selectedNationalRxIds.length === 0) { message.warning('Vui lòng chọn đơn thuốc'); return; }
    try {
      const result = await nationalRxApi.submitBatch(selectedNationalRxIds);
      message.success(`Gửi thành công ${result.successCount}/${selectedNationalRxIds.length} đơn thuốc`);
      setSelectedNationalRxIds([]);
      fetchNationalRx();
    } catch (err) { console.warn('Batch submit national prescriptions:', err); message.warning('Không thể gửi hàng loạt'); }
  };

  // ==================== Provincial Health Monitoring ====================
  const fetchProvReports = useCallback(async () => {
    setProvLoading(true);
    try {
      const [listRes, statsRes] = await Promise.allSettled([
        provincialApi.searchReports({ ...provSearch, pageSize: 20 }),
        provincialApi.getStats(),
      ]);
      if (listRes.status === 'fulfilled') {
        setProvReports(listRes.value?.items || []);
        setProvTotal(listRes.value?.totalCount || 0);
      }
      if (statsRes.status === 'fulfilled') setProvStats(statsRes.value || null);
    } catch { console.warn('Failed to fetch provincial health data'); }
    finally { setProvLoading(false); }
  }, [provSearch]);

  useEffect(() => { fetchProvReports(); }, [fetchProvReports]);

  const handleGenerateProvReport = async (reportType: number) => {
    try {
      const period = dayjs().format('YYYY-MM');
      await provincialApi.generateReport(reportType, period);
      message.success('Đã tạo báo cáo');
      fetchProvReports();
    } catch (err) { console.warn('Generate provincial report:', err); message.warning('Không thể tạo báo cáo'); }
  };

  const handleSubmitProvReport = async (id: string) => {
    try {
      await provincialApi.submitReport(id);
      message.success('Đã gửi báo cáo lên Sở Y tế');
      fetchProvReports();
    } catch (err) { console.warn('Submit provincial report:', err); message.warning('Không thể gửi báo cáo'); }
  };

  // ==================== FHIR Handlers ====================

  const handleFhirLoadMetadata = useCallback(async () => {
    try {
      const metadata = await getMetadata();
      setFhirMetadata(metadata);
    } catch {
      console.warn('Failed to fetch FHIR metadata');
    }
  }, []);

  useEffect(() => {
    handleFhirLoadMetadata();
  }, [handleFhirLoadMetadata]);

  const handleFhirSearch = async () => {
    setFhirSearchLoading(true);
    try {
      const results = await searchResource(fhirSearchType, { ...fhirSearchParams, _count: 20 });
      setFhirSearchResults(results);
    } catch (err) {
      console.warn('FHIR search failed:', err);
      message.warning('Tìm kiếm FHIR thất bại');
    } finally {
      setFhirSearchLoading(false);
    }
  };

  const handleFhirViewJson = async (resourceType: string, resourceId: string) => {
    try {
      const resource = await readResource(resourceType, resourceId);
      setFhirJsonContent(JSON.stringify(resource, null, 2));
      setFhirJsonTitle(`${resourceType}/${resourceId}`);
      setFhirJsonDrawerOpen(true);
    } catch (err) {
      console.warn('Failed to read FHIR resource:', err);
      message.warning('Không thể đọc tài nguyên FHIR');
    }
  };

  const handleFhirExportPatient = async () => {
    if (!fhirExportPatientId) {
      message.warning('Vui lòng nhập Patient ID');
      return;
    }
    try {
      setFhirSearchLoading(true);
      const bundle = await exportPatientBundle(fhirExportPatientId);
      setFhirJsonContent(JSON.stringify(bundle, null, 2));
      setFhirJsonTitle(`Patient Bundle - ${fhirExportPatientId}`);
      setFhirJsonDrawerOpen(true);
    } catch (err) {
      console.warn('Failed to export patient bundle:', err);
      message.warning('Xuất dữ liệu FHIR thất bại');
    } finally {
      setFhirSearchLoading(false);
    }
  };

  const handleFhirTestExternal = async () => {
    if (!fhirExternalUrl) {
      message.warning('Vui lòng nhập URL máy chủ FHIR');
      return;
    }
    setFhirExternalStatus('loading');
    try {
      const result = await fetchExternalMetadata(fhirExternalUrl);
      if (result) {
        setFhirExternalStatus('success');
        message.success(`Kết nối thành công: ${result.software?.name || 'FHIR Server'} v${result.fhirVersion}`);
      } else {
        setFhirExternalStatus('error');
        message.warning('Không thể kết nối đến máy chủ FHIR');
      }
    } catch {
      setFhirExternalStatus('error');
      message.warning('Kết nối FHIR thất bại');
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(fhirJsonContent).then(() => {
      message.success('Đã sao chép JSON');
    });
  };

  const handleDownloadJson = () => {
    const blob = new Blob([fhirJsonContent], { type: 'application/fhir+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fhirJsonTitle.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // FHIR resource type search parameter definitions
  const fhirResourceSearchParams: Record<string, Array<{ name: string; label: string; placeholder: string }>> = {
    Patient: [
      { name: 'name', label: 'Tên', placeholder: 'Tìm theo tên...' },
      { name: 'identifier', label: 'Mã BN/CCCD/BHYT', placeholder: 'Mã định danh...' },
      { name: 'phone', label: 'SĐT', placeholder: 'Số điện thoại...' },
    ],
    Encounter: [
      { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
      { name: 'status', label: 'Trạng thái', placeholder: 'planned|in-progress|finished' },
    ],
    Observation: [
      { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
      { name: 'category', label: 'Loại', placeholder: 'vital-signs|laboratory' },
    ],
    MedicationRequest: [
      { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
      { name: 'status', label: 'Trạng thái', placeholder: 'active|completed|cancelled' },
    ],
    DiagnosticReport: [
      { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
      { name: 'category', label: 'Loại', placeholder: 'LAB|RAD' },
    ],
    Condition: [
      { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
      { name: 'code', label: 'Mã ICD', placeholder: 'ICD-10 code...' },
    ],
    AllergyIntolerance: [
      { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
    ],
    Procedure: [
      { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
    ],
  };

  // Statistics from dashboard or fallback to local counts
  const connectedCount = dashboard?.activeConnections ?? connections.filter(c => c.status === 1).length;
  const totalConnections = dashboard?.totalConnections ?? connections.length;
  const pendingSubmissions = dashboard?.pendingSubmissions ?? submissions.filter(s => s.status === 1 || s.status === 2).length;
  const activeReferrals = dashboard?.outboundReferralsPending ?? referrals.filter(r => r.status === 2).length;
  const activeConsultations = consultations.filter(c => c.status !== 5 && c.status !== 6).length;

  const getConnectionStatusTag = (status: number, statusName?: string) => {
    switch (status) {
      case 1:
        return <Tag icon={<CheckCircleOutlined />} color="success">{statusName || 'Kết nối'}</Tag>;
      case 2:
        return <Tag icon={<ClockCircleOutlined />} color="default">{statusName || 'Ngắt kết nối'}</Tag>;
      case 3:
        return <Tag icon={<ExclamationCircleOutlined />} color="error">{statusName || 'Lỗi'}</Tag>;
      default:
        return <Tag>{statusName || String(status)}</Tag>;
    }
  };

  const getSubmissionStatusTag = (status: number, statusName?: string) => {
    switch (status) {
      case 1:
        return <Tag icon={<ClockCircleOutlined />} color="default">{statusName || 'Nhập'}</Tag>;
      case 2:
        return <Tag icon={<SyncOutlined />} color="blue">{statusName || 'Đã xác minh'}</Tag>;
      case 3:
        return <Tag icon={<SyncOutlined spin />} color="processing">{statusName || 'Đã gửi'}</Tag>;
      case 4:
        return <Tag icon={<CheckCircleOutlined />} color="success">{statusName || 'Chấp nhận'}</Tag>;
      case 5:
        return <Tag icon={<ExclamationCircleOutlined />} color="warning">{statusName || 'Từ chối 1 phần'}</Tag>;
      case 6:
        return <Tag icon={<ExclamationCircleOutlined />} color="error">{statusName || 'Từ chối'}</Tag>;
      default:
        return <Tag>{statusName || String(status)}</Tag>;
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    try {
      message.info('Đang kiểm tra kết nối...');
      const res = await testConnection(connectionId);
      const result = res.data;
      if (result?.success) {
        message.success(`Kết nối thành công! Thời gian: ${result.responseTime}ms`);
      } else {
        message.warning(result?.message || 'Kết nối thất bại');
      }
    } catch (err) {
      console.warn('Connection test failed:', err);
      message.warning('Không thể kiểm tra kết nối');
    }
  };

  const handleSyncConnection = async (connectionId: string, currentStatus: number) => {
    try {
      message.info('Đang đồng bộ...');
      if (currentStatus === 1) {
        await deactivateConnection(connectionId);
        message.success('Đã ngắt kết nối');
      } else {
        await activateConnection(connectionId);
        message.success('Đã kích hoạt kết nối');
      }
      fetchData();
    } catch (err) {
      console.warn('Sync failed:', err);
      message.warning('Đồng bộ thất bại');
    }
  };

  const connectionColumns: ColumnsType<HIEConnectionDto> = [
    {
      title: 'Tên kết nối',
      dataIndex: 'connectionName',
      key: 'connectionName',
      render: (text: string) => (
        <div className="flex items-center gap-2">
          <ApiOutlined />
          <span className="font-semibold">{text}</span>
        </div>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'connectionTypeName',
      key: 'connectionTypeName',
      render: (text: string, record: HIEConnectionDto) => (
        <Tag>{text || record.connectionType}</Tag>
      ),
    },
    {
      title: 'Giao thức',
      dataIndex: 'protocolName',
      key: 'protocolName',
      render: (text: string, record: HIEConnectionDto) => text || record.protocol,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: number, record: HIEConnectionDto) => getConnectionStatusTag(status, record.statusName),
    },
    {
      title: 'Đồng bộ cuối',
      dataIndex: 'lastSyncAt',
      key: 'lastSyncAt',
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: HIEConnectionDto) => (
        <div className="flex items-center gap-2">
          <Button
            type="link"
            icon={<SyncOutlined />}
            onClick={() => handleSyncConnection(record.id, record.status)}
          >
            Đồng bộ
          </Button>
          <Button
            type="link"
            icon={<LinkOutlined />}
            onClick={() => handleTestConnection(record.id)}
          >
            Test
          </Button>
        </div>
      ),
    },
  ];

  const submissionColumns: ColumnsType<InsuranceSubmissionDto> = [
    {
      title: 'Mã',
      dataIndex: 'submissionCode',
      key: 'submissionCode',
    },
    {
      title: 'Loại',
      dataIndex: 'submissionTypeName',
      key: 'submissionTypeName',
      render: (text: string, record: InsuranceSubmissionDto) => text || record.submissionType,
    },
    {
      title: 'Số bản ghi',
      dataIndex: 'totalRecords',
      key: 'totalRecords',
    },
    {
      title: 'Số tiền BHXH',
      dataIndex: 'totalClaimAmount',
      key: 'totalClaimAmount',
      render: (val: number) => val ? val.toLocaleString('vi-VN') + ' VND' : '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: number, record: InsuranceSubmissionDto) => getSubmissionStatusTag(status, record.statusName),
    },
    {
      title: 'Thời gian gửi',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'BHXH phản hồi',
      dataIndex: 'bhxhStatusName',
      key: 'bhxhStatusName',
      render: (val: string) => val || '-',
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: InsuranceSubmissionDto) => (
        <div className="flex items-center gap-2">
          <Button type="link" icon={<FileTextOutlined />}>
            Xem
          </Button>
          {(record.status === 6 || record.status === 5) && (
            <Button
              type="link"
              icon={<SyncOutlined />}
              onClick={async () => {
                try {
                  await submitToInsurance({ submissionId: record.id, signatureRequired: false });
                  message.success('Đã gửi lại thành công');
                  fetchData();
                } catch (err) {
                  console.warn('Resubmit failed:', err);
                  message.warning('Gửi lại thất bại');
                }
              }}
            >
              Gửi lại
            </Button>
          )}
        </div>
      ),
    },
  ];

  const referralColumns: ColumnsType<ElectronicReferralDto> = [
    {
      title: 'Mã',
      dataIndex: 'referralCode',
      key: 'referralCode',
    },
    {
      title: 'Bệnh nhân',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Từ BV',
      dataIndex: 'sourceFacilityName',
      key: 'sourceFacilityName',
    },
    {
      title: 'Đến BV',
      dataIndex: 'destinationFacilityName',
      key: 'destinationFacilityName',
    },
    {
      title: 'Chẩn đoán',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
    },
    {
      title: 'Mức độ',
      dataIndex: 'urgency',
      key: 'urgency',
      render: (urgency: number, record: ElectronicReferralDto) => {
        const colors: Record<number, string> = {
          1: 'default',
          2: 'orange',
          3: 'red',
        };
        return <Tag color={colors[urgency] || 'default'}>{record.urgencyName || String(urgency)}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: number, record: ElectronicReferralDto) => {
        const colors: Record<number, string> = {
          1: 'default',
          2: 'processing',
          3: 'blue',
          4: 'success',
          5: 'error',
          6: 'green',
        };
        return <Tag color={colors[status] || 'default'}>{record.statusName || String(status)}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: ElectronicReferralDto) => (
        <div className="flex items-center gap-2">
          <Button type="link" icon={<FileTextOutlined />}>
            Chi tiết
          </Button>
          {record.status === 1 && (
            <Button
              type="link"
              icon={<SendOutlined />}
              onClick={async () => {
                try {
                  await sendReferral(record.id);
                  message.success('Đã gửi phiếu chuyển viện');
                  fetchData();
                } catch (err) {
                  console.warn('Send referral failed:', err);
                  message.warning('Gửi phiếu thất bại');
                }
              }}
            >
              Gửi
            </Button>
          )}
          <Button
            type="link"
            icon={<PrinterOutlined />}
            onClick={async () => {
              try {
                const res = await printReferralLetter(record.id);
                const blob = new Blob([res.data], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
              } catch (err) {
                console.warn('Print referral failed:', err);
                message.warning('Không thể in phiếu chuyển viện');
              }
            }}
          >
            In
          </Button>
        </div>
      ),
    },
  ];

  const consultationColumns: ColumnsType<TeleconsultationRequestDto> = [
    {
      title: 'Mã',
      dataIndex: 'requestCode',
      key: 'requestCode',
    },
    {
      title: 'Bệnh nhân',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'BS yêu cầu',
      dataIndex: 'requestingDoctorName',
      key: 'requestingDoctorName',
    },
    {
      title: 'BV hội chẩn',
      dataIndex: 'consultingFacilityName',
      key: 'consultingFacilityName',
    },
    {
      title: 'Chuyên khoa',
      dataIndex: 'consultingSpecialty',
      key: 'consultingSpecialty',
    },
    {
      title: 'Lịch hẹn',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      render: (val: string, record: TeleconsultationRequestDto) => {
        if (val && record.scheduledTime) return `${val} ${record.scheduledTime}`;
        if (val) return val;
        return '-';
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: number, record: TeleconsultationRequestDto) => {
        const colors: Record<number, string> = {
          1: 'default',
          2: 'blue',
          3: 'processing',
          4: 'success',
          5: 'error',
        };
        return <Tag color={colors[status] || 'default'}>{record.statusName || String(status)}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: TeleconsultationRequestDto) => (
        <div className="flex items-center gap-2">
          {record.status === 2 && record.videoRoomUrl && (
            <Button
              type="primary"
              size="small"
              onClick={async () => {
                try {
                  const res = await startTeleconsult(record.id);
                  const roomUrl = res.data?.roomUrl || record.videoRoomUrl;
                  if (roomUrl) {
                    window.open(roomUrl, '_blank');
                  }
                } catch (err) {
                  console.warn('Start teleconsult failed:', err);
                  if (record.videoRoomUrl) {
                    window.open(record.videoRoomUrl, '_blank');
                  } else {
                    message.warning('Không thể vào phòng hội chẩn');
                  }
                }
              }}
            >
              Vào phòng
            </Button>
          )}
          <Button type="link" icon={<FileTextOutlined />}>
            Chi tiết
          </Button>
        </div>
      ),
    },
  ];

  const handleCreateReferral = async (values: ReferralFormValues) => {
    try {
      const dto: CreateReferralDto = {
        patientId: values.patientId,
        destinationFacilityCode: values.destinationFacilityCode,
        destinationDepartment: values.destinationDepartment,
        diagnosis: values.diagnosis,
        diagnosisIcd: values.diagnosisIcd || '',
        reasonForReferral: values.reason,
        clinicalSummary: values.clinicalSummary || '',
        treatmentHistory: values.treatmentHistory,
        currentMedications: values.currentMedications,
        allergies: values.allergies,
        specialInstructions: values.specialInstructions,
        urgency: values.urgency,
      };
      await createReferral(dto);
      setReferralModalVisible(false);
      referralForm.resetFields();
      message.success('Tạo phiếu chuyển viện thành công!');
      fetchData();
    } catch (err) {
      console.warn('Create referral failed:', err);
      message.warning('Tạo phiếu chuyển viện thất bại');
    }
  };

  const handleCreateConsultation = async (values: ConsultationFormValues) => {
    try {
      const dto: CreateTeleconsultRequestDto = {
        requestType: values.requestType || 'Consultation',
        patientId: values.patientId,
        consultingFacilityCode: values.consultingFacilityCode,
        consultingSpecialty: values.specialty,
        chiefComplaint: values.chiefComplaint || '',
        clinicalQuestion: values.clinicalQuestion || values.reason || '',
        relevantHistory: values.relevantHistory || '',
        currentFindings: values.currentFindings || '',
        urgency: values.urgency || 1,
        preferredDate: values.preferredDate?.format?.('YYYY-MM-DD'),
        preferredTime: values.preferredTime,
      };
      await createTeleconsultRequest(dto);
      setConsultationModalVisible(false);
      consultationForm.resetFields();
      message.success('Gửi yêu cầu hội chẩn thành công!');
      fetchData();
    } catch (err) {
      console.warn('Create teleconsult failed:', err);
      message.warning('Gửi yêu cầu hội chẩn thất bại');
    }
  };

  const handleSubmitXML = async (values: XMLFormValues) => {
    try {
      const dto: GenerateXMLDto = {
        xmlType: values.xmlType,
        periodFrom: values.periodFrom?.format?.('YYYY-MM-DD') || dayjs().startOf('month').format('YYYY-MM-DD'),
        periodTo: values.periodTo?.format?.('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
        departmentId: values.departmentId,
        patientIds: values.patientId ? [values.patientId] : undefined,
      };
      const result = await generateXML(dto);
      if (result.data?.success) {
        message.success(`Tạo XML thành công! ${result.data.totalRecords} bản ghi, ${result.data.validRecords} hợp lệ`);
        if (result.data.invalidRecords > 0) {
          message.warning(`${result.data.invalidRecords} bản ghi lỗi - vui lòng kiểm tra lại`);
        }
      } else {
        message.warning('Tạo XML thất bại');
      }
      setXmlModalVisible(false);
      xmlForm.resetFields();
      fetchData();
    } catch (err) {
      console.warn('Generate XML failed:', err);
      message.warning('Gửi dữ liệu XML thất bại');
    }
  };

  const handlePrintReferral = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Phiếu Chuyển viện</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #000; padding: 8px; text-align: left; }
              .header { text-align: center; margin-bottom: 20px; }
              .footer { margin-top: 30px; }
              .signature { display: flex; justify-content: space-between; margin-top: 50px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>BỆNH VIỆN QUẬN 1</h2>
              <h1>PHIẾU CHUYỂN VIỆN</h1>
            </div>
            <table>
              <tr><td><strong>Họ tên BN:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Mã bệnh nhân:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Chẩn đoán:</strong></td><td>_________________</td></tr>
              <tr><td><strong>BV tiếp nhận:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Lý do chuyển:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Tóm tắt điều trị:</strong></td><td>_________________</td></tr>
            </table>
            <div class="signature">
              <div style="text-align: center;">
                <p>Bác sĩ điều trị</p>
                <br/><br/>
                <p>_______________</p>
              </div>
              <div style="text-align: center;">
                <p>Giám đốc bệnh viện</p>
                <br/><br/>
                <p>_______________</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const tabItems = [
    {
      key: 'connections',
      label: (
        <span>
          <ApiOutlined />
          Kết nối ({connectedCount}/{totalConnections})
        </span>
      ),
      children: (
        <div>
          <Alert
            title="Trạng thái kết nối"
            description={`${connectedCount}/${totalConnections} cổng kết nối đang hoạt động`}
            type={connectedCount === totalConnections ? 'success' : 'warning'}
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Table
            columns={connectionColumns}
            dataSource={connections}
            rowKey="id"
            loading={loading}
            pagination={false}
            onRow={(record) => ({
              onDoubleClick: () => {
                Modal.info({
                  title: `Chi tiết kết nối - ${record.connectionName}`,
                  width: 600,
                  content: (
                    <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                      <Descriptions.Item label="Tên">{record.connectionName}</Descriptions.Item>
                      <Descriptions.Item label="Loại">{record.connectionTypeName || record.connectionType}</Descriptions.Item>
                      <Descriptions.Item label="Đối tác">{record.partnerName} ({record.partnerCode})</Descriptions.Item>
                      <Descriptions.Item label="Endpoint">{record.endpoint || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Giao thức">{record.protocolName || record.protocol}</Descriptions.Item>
                      <Descriptions.Item label="Xác thực">{record.authType || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Trạng thái">
                        {getConnectionStatusTag(record.status, record.statusName)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Lần đồng bộ cuối">{record.lastSyncAt ? dayjs(record.lastSyncAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                      <Descriptions.Item label="Số lỗi">{record.errorCount}</Descriptions.Item>
                      {record.lastError && (
                        <Descriptions.Item label="Lỗi cuối">{record.lastError}</Descriptions.Item>
                      )}
                      {record.certificateExpiry && (
                        <Descriptions.Item label="Chứng chỉ hết hạn">{dayjs(record.certificateExpiry).format('YYYY-MM-DD')}</Descriptions.Item>
                      )}
                      <Descriptions.Item label="Định dạng">{record.dataExchangeFormat}</Descriptions.Item>
                      {record.supportedOperations?.length > 0 && (
                        <Descriptions.Item label="Chức năng">
                          {record.supportedOperations.map((op: string) => (
                            <Tag key={op}>{op}</Tag>
                          ))}
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  ),
                });
              },
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      ),
    },
    {
      key: 'submissions',
      label: (
        <span>
          <CloudUploadOutlined />
          Gửi dữ liệu ({pendingSubmissions} chờ)
        </span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setXmlModalVisible(true)}
            >
              Gửi XML BHXH
            </Button>
            <Button icon={<SyncOutlined />} onClick={fetchData}>
              Đồng bộ tất cả
            </Button>
          </Space>
          <Table
            columns={submissionColumns}
            dataSource={submissions}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              onDoubleClick: () => {
                Modal.info({
                  title: 'Chi tiết gửi dữ liệu',
                  width: 600,
                  content: (
                    <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                      <Descriptions.Item label="Mã">{record.submissionCode}</Descriptions.Item>
                      <Descriptions.Item label="Loại">{record.submissionTypeName || record.submissionType}</Descriptions.Item>
                      <Descriptions.Item label="Kỳ từ">{record.periodFrom}</Descriptions.Item>
                      <Descriptions.Item label="Kỳ đến">{record.periodTo}</Descriptions.Item>
                      <Descriptions.Item label="Khoa">{record.departmentName || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Tổng bản ghi">{record.totalRecords}</Descriptions.Item>
                      <Descriptions.Item label="Hợp lệ">{record.validRecords}</Descriptions.Item>
                      <Descriptions.Item label="Không hợp lệ">{record.invalidRecords}</Descriptions.Item>
                      <Descriptions.Item label="Số tiền">{record.totalClaimAmount?.toLocaleString('vi-VN')} VND</Descriptions.Item>
                      <Descriptions.Item label="BHXH duyệt">{record.bhxhApprovedAmount?.toLocaleString('vi-VN') || '-'} VND</Descriptions.Item>
                      <Descriptions.Item label="BHXH từ chối">{record.bhxhRejectedAmount?.toLocaleString('vi-VN') || '-'} VND</Descriptions.Item>
                      <Descriptions.Item label="BHXH trạng thái">{record.bhxhStatusName || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Người gửi">{record.submittedByName}</Descriptions.Item>
                      <Descriptions.Item label="Trạng thái">{record.statusName || String(record.status)}</Descriptions.Item>
                    </Descriptions>
                  ),
                });
              },
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      ),
    },
    {
      key: 'referrals',
      label: (
        <span>
          <SwapOutlined />
          Chuyển viện ({activeReferrals})
        </span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setReferralModalVisible(true)}
            >
              Tạo phiếu chuyển
            </Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrintReferral}>
              In mẫu
            </Button>
          </Space>
          <Table
            columns={referralColumns}
            dataSource={referrals}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              onDoubleClick: () => {
                Modal.info({
                  title: 'Chi tiết chuyển viện',
                  width: 700,
                  content: (
                    <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                      <Descriptions.Item label="Mã phiếu">{record.referralCode}</Descriptions.Item>
                      <Descriptions.Item label="Loại">{record.referralTypeName || record.referralType}</Descriptions.Item>
                      <Descriptions.Item label="Bệnh nhân">{record.patientName} ({record.patientCode})</Descriptions.Item>
                      <Descriptions.Item label="Ngày sinh">{record.dateOfBirth}</Descriptions.Item>
                      <Descriptions.Item label="Số BHYT">{record.insuranceNumber || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Mức độ">{record.urgencyName}</Descriptions.Item>
                      <Descriptions.Item label="Nơi chuyển">{record.sourceFacilityName}</Descriptions.Item>
                      <Descriptions.Item label="Khoa chuyển">{record.sourceDepartment}</Descriptions.Item>
                      <Descriptions.Item label="Nơi nhận">{record.destinationFacilityName}</Descriptions.Item>
                      <Descriptions.Item label="Khoa nhận">{record.destinationDepartment || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Chẩn đoán" span={2}>{record.diagnosis} ({record.diagnosisIcd})</Descriptions.Item>
                      <Descriptions.Item label="Lý do" span={2}>{record.reasonForReferral}</Descriptions.Item>
                      <Descriptions.Item label="Tóm tắt lâm sàng" span={2}>{record.clinicalSummary || '-'}</Descriptions.Item>
                      {record.treatmentHistory && (
                        <Descriptions.Item label="Tiền sử điều trị" span={2}>{record.treatmentHistory}</Descriptions.Item>
                      )}
                      {record.currentMedications && (
                        <Descriptions.Item label="Thuốc hiện tại" span={2}>{record.currentMedications}</Descriptions.Item>
                      )}
                      <Descriptions.Item label="Trạng thái">{record.statusName}</Descriptions.Item>
                      <Descriptions.Item label="Ngày tạo">{dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                      {record.sentAt && (
                        <Descriptions.Item label="Ngày gửi">{dayjs(record.sentAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                      )}
                      {record.acceptedDate && (
                        <Descriptions.Item label="Ngày chấp nhận">{dayjs(record.acceptedDate).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                      )}
                      {record.rejectionReason && (
                        <Descriptions.Item label="Lý do từ chối" span={2}>{record.rejectionReason}</Descriptions.Item>
                      )}
                      {record.outcome && (
                        <Descriptions.Item label="Kết quả" span={2}>{record.outcome}</Descriptions.Item>
                      )}
                    </Descriptions>
                  ),
                });
              },
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      ),
    },
    {
      key: 'consultations',
      label: (
        <span>
          <TeamOutlined />
          Hội chẩn từ xa
        </span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setConsultationModalVisible(true)}
            >
              Yêu cầu hội chẩn
            </Button>
          </Space>
          <Table
            columns={consultationColumns}
            dataSource={consultations}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              onDoubleClick: () => {
                Modal.info({
                  title: 'Chi tiết hội chẩn từ xa',
                  width: 700,
                  content: (
                    <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                      <Descriptions.Item label="Mã">{record.requestCode}</Descriptions.Item>
                      <Descriptions.Item label="Loại">{record.requestTypeName || record.requestType}</Descriptions.Item>
                      <Descriptions.Item label="Bệnh nhân">{record.patientName} ({record.patientCode})</Descriptions.Item>
                      <Descriptions.Item label="Mức độ">{record.urgencyName}</Descriptions.Item>
                      <Descriptions.Item label="BV yêu cầu">{record.requestingFacilityName}</Descriptions.Item>
                      <Descriptions.Item label="BS yêu cầu">{record.requestingDoctorName}</Descriptions.Item>
                      <Descriptions.Item label="BV hội chẩn">{record.consultingFacilityName}</Descriptions.Item>
                      <Descriptions.Item label="Chuyên khoa">{record.consultingSpecialty}</Descriptions.Item>
                      {record.consultingDoctorName && (
                        <Descriptions.Item label="Chuyên gia" span={2}>{record.consultingDoctorName}</Descriptions.Item>
                      )}
                      <Descriptions.Item label="Lý do chính" span={2}>{record.chiefComplaint}</Descriptions.Item>
                      <Descriptions.Item label="Câu hỏi lâm sàng" span={2}>{record.clinicalQuestion}</Descriptions.Item>
                      {record.scheduledDate && (
                        <Descriptions.Item label="Lịch hẹn">{record.scheduledDate} {record.scheduledTime || ''}</Descriptions.Item>
                      )}
                      {record.duration && (
                        <Descriptions.Item label="Thời lượng">{record.duration} phút</Descriptions.Item>
                      )}
                      <Descriptions.Item label="Trạng thái">{record.statusName}</Descriptions.Item>
                      <Descriptions.Item label="Ngày tạo">{dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                      {record.consultationNotes && (
                        <Descriptions.Item label="Ghi chú hội chẩn" span={2}>{record.consultationNotes}</Descriptions.Item>
                      )}
                      {record.recommendations && (
                        <Descriptions.Item label="Khuyến nghị" span={2}>{record.recommendations}</Descriptions.Item>
                      )}
                      {record.followUpNeeded && (
                        <Descriptions.Item label="Theo dõi" span={2}>{record.followUpInstructions || 'Cần theo dõi'}</Descriptions.Item>
                      )}
                    </Descriptions>
                  ),
                });
              },
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      ),
    },
    {
      key: 'fhir',
      label: (
        <span>
          <MedicineBoxOutlined />
          FHIR R4
        </span>
      ),
      children: (
        <div>
          {/* FHIR Server Status */}
          <Alert
            title="HL7 FHIR R4 Server"
            description={
              fhirMetadata
                ? `${fhirMetadata.software?.name || 'HIS FHIR'} v${fhirMetadata.software?.version || '1.0'} - FHIR ${fhirMetadata.fhirVersion} - ${fhirMetadata.rest?.[0]?.resource?.length || 0} resource types`
                : 'Đang kết nối...'
            }
            type={fhirMetadata ? 'success' : 'info'}
            showIcon
            action={
              <Button size="small" onClick={handleFhirLoadMetadata}>
                <ReloadOutlined /> Kiểm tra
              </Button>
            }
            style={{ marginBottom: 16 }}
          />

          {/* Supported Resources */}
          {fhirMetadata?.rest?.[0]?.resource && (
            <Card size="small" title="Tài nguyên hỗ trợ" style={{ marginBottom: 16 }}>
              <Space wrap>
                {fhirMetadata.rest[0].resource.map(r => (
                  <Tag key={r.type} color="blue">{r.type} ({r.interaction?.map(i => i.code).join(', ')})</Tag>
                ))}
              </Space>
            </Card>
          )}

          {/* Search Section */}
          <Card size="small" title="Tìm kiếm FHIR Resources" style={{ marginBottom: 16 }}>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Select
                  value={fhirSearchType}
                  onChange={(val) => { setFhirSearchType(val); setFhirSearchParams({}); }}
                  style={{ width: '100%' }}
                >
                  {Object.keys(fhirResourceSearchParams).map(rt => (
                    <Select.Option key={rt} value={rt}>{rt}</Select.Option>
                  ))}
                </Select>
              </div>
              {fhirResourceSearchParams[fhirSearchType]?.map(param => (
                <div>
                  <Input
                    placeholder={param.placeholder}
                    value={fhirSearchParams[param.name] || ''}
                    onChange={e => setFhirSearchParams(prev => ({ ...prev, [param.name]: e.target.value }))}
                    onPressEnter={handleFhirSearch}
                  />
                </div>
              ))}
              <div>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleFhirSearch} loading={fhirSearchLoading}>
                  Tìm kiếm
                </Button>
              </div>
            </div>
          </Card>

          {/* Search Results */}
          {fhirSearchResults && (
            <Card size="small" title={`Kết quả: ${fhirSearchResults.total} ${fhirSearchType}`} style={{ marginBottom: 16 }}>
              <Table
                dataSource={fhirSearchResults.entry?.map((e, i) => ({
                  key: e.fullUrl || `entry-${i}`,
                  fullUrl: e.fullUrl || '',
                  resourceType: (e.resource as FhirResource)?.resourceType || '',
                  id: (e.resource as FhirResource)?.id || '',
                  lastUpdated: (e.resource as FhirResource)?.meta?.lastUpdated || '',
                  summary: extractResourceSummary(e.resource),
                })) || []}
                columns={[
                  { title: 'ID', dataIndex: 'id', key: 'id', width: 200, ellipsis: true },
                  { title: 'Type', dataIndex: 'resourceType', key: 'type', width: 150 },
                  { title: 'Tóm tắt', dataIndex: 'summary', key: 'summary', ellipsis: true },
                  { title: 'Cập nhật', dataIndex: 'lastUpdated', key: 'updated', width: 180,
                    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
                  { title: 'Thao tác', key: 'action', width: 120,
                    render: (_: unknown, record: { resourceType: string; id: string }) => (
                      <Button size="small" type="link" onClick={() => handleFhirViewJson(record.resourceType, record.id)}>
                        Xem JSON
                      </Button>
                    )
                  },
                ]}
                pagination={{ pageSize: 10, size: 'small' }}
                size="small"
              />
            </Card>
          )}

          {/* Export Patient Bundle */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Card size="small" title="Xuất dữ liệu FHIR Bundle">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Patient ID (GUID)"
                    value={fhirExportPatientId}
                    onChange={e => setFhirExportPatientId(e.target.value)}
                    style={{ width: 300 }}
                  />
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleFhirExportPatient}
                    loading={fhirSearchLoading}
                  >
                    Xuất Bundle
                  </Button>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Typography.Text type="secondary">
                    Thu thap tat ca Patient, Encounter, Observation, MedicationRequest, Condition, AllergyIntolerance, Procedure, DiagnosticReport
                  </Typography.Text>
                </div>
              </Card>
            </div>
            <div>
              <Card size="small" title="Kết nối FHIR Server ngoài">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="https://other-hospital.vn/fhir"
                    value={fhirExternalUrl}
                    onChange={e => setFhirExternalUrl(e.target.value)}
                    style={{ width: 300 }}
                  />
                  <Button
                    icon={<ApiOutlined />}
                    onClick={handleFhirTestExternal}
                    loading={fhirExternalStatus === 'loading'}
                  >
                    Test
                  </Button>
                </div>
                {fhirExternalStatus === 'success' && (
                  <Alert title="Kết nối thành công" type="success" showIcon style={{ marginTop: 8 }} />
                )}
                {fhirExternalStatus === 'error' && (
                  <Alert title="Kết nối thất bại" type="error" showIcon style={{ marginTop: 8 }} />
                )}
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'national-rx',
      label: (
        <span>
          <MedicineBoxOutlined /> Cổng đơn thuốc QG
        </span>
      ),
      children: (
        <Spin spinning={nationalRxLoading}>
          {/* Stats */}
          {nationalRxStats && (
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><Statistic title="Đã gửi" value={nationalRxStats.totalSubmitted} styles={{ content: { color: '#1890ff' } }} /></div>
              </div>
              <div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><Statistic title="Chấp nhận" value={nationalRxStats.totalAccepted} styles={{ content: { color: '#52c41a' } }} /></div>
              </div>
              <div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><Statistic title="Từ chối" value={nationalRxStats.totalRejected} styles={{ content: { color: '#ff4d4f' } }} /></div>
              </div>
              <div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><Statistic title="Chờ xử lý" value={nationalRxStats.totalPending} styles={{ content: { color: '#faad14' } }} /></div>
              </div>
            </div>
          )}
          {/* Filters */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="flex-1">
              <Space wrap>
                <Select
                  placeholder="Trạng thái"
                  allowClear
                  style={{ width: 150 }}
                  value={nationalRxSearch.status}
                  onChange={(v) => setNationalRxSearch(s => ({ ...s, status: v, pageIndex: 0 }))}
                  options={[
                    { value: 0, label: 'Nháp' },
                    { value: 1, label: 'Đã gửi' },
                    { value: 2, label: 'Chấp nhận' },
                    { value: 3, label: 'Từ chối' },
                  ]}
                />
                <Input.Search
                  placeholder="Tìm đơn thuốc..."
                  allowClear
                  style={{ width: 250 }}
                  onSearch={(v) => setNationalRxSearch(s => ({ ...s, keyword: v || undefined, pageIndex: 0 }))}
                />
              </Space>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  disabled={selectedNationalRxIds.length === 0}
                  onClick={handleBatchSubmitNationalRx}
                >
                  Gửi hàng loạt ({selectedNationalRxIds.length})
                </Button>
                <Button icon={<SyncOutlined />} onClick={() => { nationalRxApi.testConnection().then(r => { message.info(`Kết nối: ${r.connected ? 'OK' : 'Lỗi'} (${r.latencyMs}ms)`); }).catch(() => message.warning('Không thể kết nối')); }}>
                  Test kết nối
                </Button>
              </div>
            </div>
          </div>
          {/* Table */}
          <Table
            columns={[
              { title: 'Mã đơn', dataIndex: 'prescriptionCode', key: 'code', width: 130 },
              { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patient', width: 150 },
              { title: 'Bác sĩ', dataIndex: 'doctorName', key: 'doctor', width: 130 },
              { title: 'Chẩn đoán', dataIndex: 'diagnosisName', key: 'dx', ellipsis: true },
              { title: 'Ngày kê', dataIndex: 'prescriptionDate', key: 'date', width: 100, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
              { title: 'Tổng tiền', dataIndex: 'totalAmount', key: 'amount', width: 120, render: (v: number) => v?.toLocaleString('vi-VN') + ' đ' },
              {
                title: 'Trạng thái', dataIndex: 'statusName', key: 'status', width: 110,
                render: (text: string, record: NationalPrescriptionDto) => {
                  const colors: Record<number, string> = { 0: 'default', 1: 'processing', 2: 'success', 3: 'error', 4: 'warning' };
                  return <Tag color={colors[record.status] || 'default'}>{text}</Tag>;
                },
              },
              {
                title: 'Thao tác', key: 'action', width: 100,
                render: (_: unknown, record: NationalPrescriptionDto) => (
                  <div className="flex items-center gap-1">
                    {record.status === 0 && (
                      <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => handleSubmitNationalRx(record.id)}>Gửi</Button>
                    )}
                    {record.status === 3 && (
                      <Button size="small" icon={<SyncOutlined />} onClick={() => nationalRxApi.retrySubmission(record.id).then(() => { message.success('Đã gửi lại'); fetchNationalRx(); }).catch(() => message.warning('Lỗi'))}>Gửi lại</Button>
                    )}
                  </div>
                ),
              },
            ] as ColumnsType<NationalPrescriptionDto>}
            dataSource={nationalRxList}
            rowKey="id"
            size="small"
            scroll={{ x: 1100 }}
            loading={nationalRxLoading}
            rowSelection={{
              selectedRowKeys: selectedNationalRxIds,
              onChange: (keys) => setSelectedNationalRxIds(keys as string[]),
              getCheckboxProps: (record: NationalPrescriptionDto) => ({ disabled: record.status !== 0 }),
            }}
            pagination={{
              current: nationalRxSearch.pageIndex + 1,
              total: nationalRxTotal,
              pageSize: 20,
              showTotal: (total) => `Tổng: ${total} đơn thuốc`,
              onChange: (page) => setNationalRxSearch(s => ({ ...s, pageIndex: page - 1 })),
            }}
          />
        </Spin>
      ),
    },
    {
      key: 'provincial',
      label: (
        <span>
          <SafetyOutlined /> Sở Y tế
        </span>
      ),
      children: (
        <Spin spinning={provLoading}>
          {/* Stats */}
          {provStats && (
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><Statistic title="BC tháng này" value={provStats.totalReportsThisMonth} styles={{ content: { color: '#1890ff' } }} /></div>
              </div>
              <div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><Statistic title="Đã gửi" value={provStats.totalSubmitted} styles={{ content: { color: '#52c41a' } }} /></div>
              </div>
              <div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><Statistic title="Chờ xử lý" value={provStats.totalPending} styles={{ content: { color: '#faad14' } }} /></div>
              </div>
              <div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><Statistic title="Bệnh truyền nhiễm" value={provStats.infectiousDiseaseAlerts} styles={{ content: { color: provStats.infectiousDiseaseAlerts > 0 ? '#ff4d4f' : '#52c41a' } }} /></div>
              </div>
            </div>
          )}
          {/* Actions */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="flex-1">
              <Space wrap>
                <Select
                  placeholder="Loại báo cáo"
                  allowClear
                  style={{ width: 160 }}
                  value={provSearch.reportType}
                  onChange={(v) => setProvSearch(s => ({ ...s, reportType: v, pageIndex: 0 }))}
                  options={[
                    { value: 1, label: 'Hàng ngày' },
                    { value: 2, label: 'Hàng tuần' },
                    { value: 3, label: 'Hàng tháng' },
                    { value: 4, label: 'Hàng quý' },
                    { value: 5, label: 'Hàng năm' },
                  ]}
                />
                <Select
                  placeholder="Trạng thái"
                  allowClear
                  style={{ width: 130 }}
                  value={provSearch.status}
                  onChange={(v) => setProvSearch(s => ({ ...s, status: v, pageIndex: 0 }))}
                  options={[
                    { value: 0, label: 'Nháp' },
                    { value: 1, label: 'Đã gửi' },
                    { value: 2, label: 'Đã nhận' },
                    { value: 3, label: 'Từ chối' },
                  ]}
                />
              </Space>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Button type="primary" icon={<FileTextOutlined />} onClick={() => handleGenerateProvReport(3)}>Tạo BC tháng</Button>
                <Button icon={<FileTextOutlined />} onClick={() => handleGenerateProvReport(1)}>Tạo BC ngày</Button>
                <Button icon={<SyncOutlined />} onClick={() => { provincialApi.testConnection().then(r => { message.info(`Kết nối Sở Y tế: ${r.connected ? 'OK' : 'Lỗi'} (${r.latencyMs}ms)`); }).catch(() => message.warning('Không thể kết nối')); }}>
                  Test kết nối
                </Button>
              </div>
            </div>
          </div>
          {/* Reports Table */}
          <Table
            columns={[
              { title: 'Mã BC', dataIndex: 'reportCode', key: 'code', width: 120 },
              { title: 'Loại', dataIndex: 'reportTypeName', key: 'type', width: 100 },
              { title: 'Kỳ BC', dataIndex: 'reportPeriod', key: 'period', width: 100 },
              { title: 'Ngoại trú', dataIndex: 'totalOutpatients', key: 'opd', width: 80, align: 'right' as const },
              { title: 'Nội trú', dataIndex: 'totalInpatients', key: 'ipd', width: 80, align: 'right' as const },
              { title: 'Cấp cứu', dataIndex: 'totalEmergencies', key: 'er', width: 80, align: 'right' as const },
              { title: 'XN', dataIndex: 'totalLabTests', key: 'lab', width: 70, align: 'right' as const },
              { title: 'CĐHA', dataIndex: 'totalRadiologyExams', key: 'rad', width: 70, align: 'right' as const },
              { title: 'Công suất giường', dataIndex: 'bedOccupancyRate', key: 'bed', width: 120, render: (v: number) => v ? `${(v * 100).toFixed(1)}%` : '-' },
              {
                title: 'Trạng thái', dataIndex: 'statusName', key: 'status', width: 100,
                render: (text: string, record: ProvincialReportDto) => {
                  const colors: Record<number, string> = { 0: 'default', 1: 'processing', 2: 'success', 3: 'error' };
                  return <Tag color={colors[record.status] || 'default'}>{text}</Tag>;
                },
              },
              {
                title: 'Thao tác', key: 'action', width: 100,
                render: (_: unknown, record: ProvincialReportDto) => (
                  record.status === 0 ? (
                    <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => handleSubmitProvReport(record.id)}>Gửi</Button>
                  ) : null
                ),
              },
            ] as ColumnsType<ProvincialReportDto>}
            dataSource={provReports}
            rowKey="id"
            size="small"
            scroll={{ x: 1200 }}
            loading={provLoading}
            pagination={{
              current: provSearch.pageIndex + 1,
              total: provTotal,
              pageSize: 20,
              showTotal: (total) => `Tổng: ${total} báo cáo`,
              onChange: (page) => setProvSearch(s => ({ ...s, pageIndex: page - 1 })),
            }}
          />
        </Spin>
      ),
    },
  ];

  // Helper to extract a human-readable summary from a FHIR resource
  function extractResourceSummary(resource: FhirResource | undefined): string {
    if (!resource) return '';
    const r = resource as unknown as Record<string, unknown>;
    // Patient
    if (r.name && Array.isArray(r.name) && r.name.length > 0) {
      return (r.name[0] as Record<string, unknown>)?.text as string || '';
    }
    // Encounter
    if (r.subject && typeof r.subject === 'object') {
      return (r.subject as Record<string, unknown>)?.display as string || '';
    }
    // Observation
    if (r.code && typeof r.code === 'object') {
      return (r.code as Record<string, unknown>)?.text as string || '';
    }
    // MedicationRequest
    if (r.medicationCodeableConcept && typeof r.medicationCodeableConcept === 'object') {
      return (r.medicationCodeableConcept as Record<string, unknown>)?.text as string || '';
    }
    return r.id as string || '';
  }

  return (
    <Spin spinning={loading && connections.length === 0}>
      <div>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Title level={3} style={{ margin: 0 }}>Liên thông Y tế (HIE)</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Làm mới
          </Button>
        </Space>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <Statistic
                title="Kết nối hoạt động"
                value={connectedCount}
                suffix={`/ ${totalConnections}`}
                prefix={<ApiOutlined />}
                styles={{ content: { color: connectedCount === totalConnections ? '#3f8600' : '#faad14' } }}
              />
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Dữ liệu chờ xử lý</div><div className="text-2xl font-semibold" style={{ color: '#1890ff' }}><ClockCircleOutlined className="mr-1" />{pendingSubmissions}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <Statistic
                title="Chuyển viện chờ"
                value={activeReferrals}
                suffix={`/ ${referrals.length}`}
                prefix={<SwapOutlined />}
              />
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Hội chẩn từ xa</div><div className="text-2xl font-semibold"><TeamOutlined className="mr-1" />{activeConsultations}</div>
            </div>
          </div>
        </div>

        {/* Dashboard alerts */}
        {dashboard?.alerts && dashboard.alerts.length > 0 && (
          <Alert
            title={`${dashboard.alerts.length} cảnh báo`}
            description={dashboard.alerts.map((a) => a.message).join('; ')}
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <Tabs items={tabItems} />
        </div>

        {/* Referral Modal */}
        <Modal
          title="Tạo phiếu chuyển viện điện tử"
          open={referralModalVisible}
          onCancel={() => setReferralModalVisible(false)}
          onOk={() => referralForm.submit()}
          width={700}
        >
          <Form form={referralForm} layout="vertical" onFinish={handleCreateReferral}>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="patientId" label="Mã bệnh nhân" rules={[{ required: true }]}>
                  <Input placeholder="Nhập mã bệnh nhân" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="destinationFacilityCode" label="Mã BV tiếp nhận" rules={[{ required: true }]}>
                  <Input placeholder="Mã cơ sở tiếp nhận" />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="destinationDepartment" label="Khoa tiếp nhận">
                  <Input placeholder="Khoa tiếp nhận (tùy chọn)" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="urgency" label="Mức độ khẩn cấp" rules={[{ required: true }]}>
                  <Select placeholder="Chọn mức độ">
                    <Select.Option value={1}>Thường quy</Select.Option>
                    <Select.Option value={2}>Khẩn cấp</Select.Option>
                    <Select.Option value={3}>Cấp cứu</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="diagnosis" label="Chẩn đoán" rules={[{ required: true }]}>
                  <Input placeholder="Chẩn đoán chính" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="diagnosisIcd" label="Mã ICD">
                  <Input placeholder="VD: J18.9" />
                </Form.Item>
              </div>
            </div>
            <Form.Item name="reason" label="Lý do chuyển viện" rules={[{ required: true }]}>
              <TextArea rows={2} placeholder="Lý do chuyển viện" />
            </Form.Item>
            <Form.Item name="clinicalSummary" label="Tóm tắt lâm sàng">
              <TextArea rows={3} placeholder="Tóm tắt tình trạng lâm sàng, điều trị đã thực hiện" />
            </Form.Item>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="currentMedications" label="Thuốc đang dùng">
                  <TextArea rows={2} placeholder="Danh sách thuốc hiện tại" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="allergies" label="Dị ứng">
                  <TextArea rows={2} placeholder="Tiền sử dị ứng (nếu có)" />
                </Form.Item>
              </div>
            </div>
            <Form.Item name="specialInstructions" label="Chỉ dẫn đặc biệt">
              <TextArea rows={2} placeholder="Hướng dẫn đặc biệt cho cơ sở tiếp nhận" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Consultation Modal */}
        <Modal
          title="Yêu cầu hội chẩn từ xa"
          open={consultationModalVisible}
          onCancel={() => setConsultationModalVisible(false)}
          onOk={() => consultationForm.submit()}
          width={600}
        >
          <Form form={consultationForm} layout="vertical" onFinish={handleCreateConsultation}>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="patientId" label="Mã bệnh nhân" rules={[{ required: true }]}>
                  <Input placeholder="Nhập mã bệnh nhân" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="requestType" label="Loại yêu cầu" rules={[{ required: true }]}>
                  <Select placeholder="Chọn loại">
                    <Select.Option value="SecondOpinion">Ý kiến thứ hai</Select.Option>
                    <Select.Option value="Consultation">Hội chẩn</Select.Option>
                    <Select.Option value="EmergencyConsult">Hội chẩn cấp cứu</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="consultingFacilityCode" label="Mã BV hội chẩn" rules={[{ required: true }]}>
                  <Input placeholder="Mã cơ sở hội chẩn" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="specialty" label="Chuyên khoa" rules={[{ required: true }]}>
                  <Select placeholder="Chọn chuyên khoa">
                    <Select.Option value="Tim mạch">Tim mạch</Select.Option>
                    <Select.Option value="Thần kinh">Thần kinh</Select.Option>
                    <Select.Option value="Ung bướu">Ung bướu</Select.Option>
                    <Select.Option value="Nhi khoa">Nhi khoa</Select.Option>
                    <Select.Option value="Sản phụ khoa">Sản phụ khoa</Select.Option>
                    <Select.Option value="Chỉnh hình">Chỉnh hình</Select.Option>
                    <Select.Option value="Mắt">Mắt</Select.Option>
                    <Select.Option value="Tai Mũi Họng">Tai Mũi Họng</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <Form.Item name="chiefComplaint" label="Lý do chính" rules={[{ required: true }]}>
              <TextArea rows={2} placeholder="Lý do yêu cầu hội chẩn" />
            </Form.Item>
            <Form.Item name="clinicalQuestion" label="Câu hỏi lâm sàng" rules={[{ required: true }]}>
              <TextArea rows={2} placeholder="Câu hỏi cần tư vấn" />
            </Form.Item>
            <Form.Item name="relevantHistory" label="Tiền sử liên quan">
              <TextArea rows={2} placeholder="Tiền sử bệnh, điều trị" />
            </Form.Item>
            <Form.Item name="currentFindings" label="Kết quả hiện tại">
              <TextArea rows={2} placeholder="Kết quả khám, xét nghiệm hiện tại" />
            </Form.Item>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="preferredDate" label="Ngày mong muốn">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="urgency" label="Mức độ" initialValue={1}>
                  <Select>
                    <Select.Option value={1}>Thường</Select.Option>
                    <Select.Option value={2}>Khẩn cấp</Select.Option>
                    <Select.Option value={3}>Cấp cứu</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
          </Form>
        </Modal>

        {/* XML Submit Modal */}
        <Modal
          title="Gửi dữ liệu XML BHXH"
          open={xmlModalVisible}
          onCancel={() => setXmlModalVisible(false)}
          onOk={() => xmlForm.submit()}
          width={600}
        >
          <Form form={xmlForm} layout="vertical" onFinish={handleSubmitXML}>
            <Form.Item name="xmlType" label="Loại XML" rules={[{ required: true }]}>
              <Select placeholder="Chọn loại XML">
                <Select.Option value="XML130">XML 130 - Thuoc, VTYT</Select.Option>
                <Select.Option value="XML131">XML 131 - DVKT</Select.Option>
                <Select.Option value="XML4210">XML 4210 - Ho so BHYT</Select.Option>
                <Select.Option value="XML7900">XML 7900 - Bao cao</Select.Option>
              </Select>
            </Form.Item>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="periodFrom" label="Từ ngày" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="periodTo" label="Đến ngày" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </div>
            </div>
            <Form.Item name="departmentId" label="Khoa (tùy chọn)">
              <Input placeholder="Mã khoa (để trống để gửi tất cả)" />
            </Form.Item>
            <Form.Item name="patientId" label="Mã bệnh nhân (tùy chọn)">
              <Input placeholder="Mã BN (để trống để gửi tất cả BN trong kỳ)" />
            </Form.Item>
          </Form>
        </Modal>
        {/* FHIR JSON Drawer */}
        <Drawer
          title={
            <div className="flex items-center gap-2">
              <span>FHIR JSON - {fhirJsonTitle}</span>
              <Button size="small" icon={<CopyOutlined />} onClick={handleCopyJson}>Sao chép</Button>
              <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadJson}>Tải xuống</Button>
            </div>
          }
          open={fhirJsonDrawerOpen}
          onClose={() => setFhirJsonDrawerOpen(false)}
          size="large"
        >
          <pre style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 8,
            fontSize: 12,
            lineHeight: 1.5,
            maxHeight: 'calc(100vh - 200px)',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {fhirJsonContent}
          </pre>
        </Drawer>
      </div>
    </Spin>
  );
};

export default HealthExchange;
