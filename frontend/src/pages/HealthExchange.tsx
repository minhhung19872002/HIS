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
  Divider,
  message,
  Badge,
  Progress,
  Switch,
  Alert,
  Steps,
  Upload,
  Spin,
} from 'antd';
import {
  CloudUploadOutlined,
  CloudDownloadOutlined,
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
} from '../api/healthExchange';

const { Title, Text } = Typography;
const { TextArea } = Input;

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
      message.warning('Khong the tai du lieu lien thong y te');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics from dashboard or fallback to local counts
  const connectedCount = dashboard?.activeConnections ?? connections.filter(c => c.status === 1).length;
  const totalConnections = dashboard?.totalConnections ?? connections.length;
  const pendingSubmissions = dashboard?.pendingSubmissions ?? submissions.filter(s => s.status === 1 || s.status === 2).length;
  const activeReferrals = dashboard?.outboundReferralsPending ?? referrals.filter(r => r.status === 2).length;
  const activeConsultations = consultations.filter(c => c.status !== 5 && c.status !== 6).length;

  const getConnectionStatusTag = (status: number, statusName?: string) => {
    switch (status) {
      case 1:
        return <Tag icon={<CheckCircleOutlined />} color="success">{statusName || 'Ket noi'}</Tag>;
      case 2:
        return <Tag icon={<ClockCircleOutlined />} color="default">{statusName || 'Ngat ket noi'}</Tag>;
      case 3:
        return <Tag icon={<ExclamationCircleOutlined />} color="error">{statusName || 'Loi'}</Tag>;
      default:
        return <Tag>{statusName || String(status)}</Tag>;
    }
  };

  const getSubmissionStatusTag = (status: number, statusName?: string) => {
    switch (status) {
      case 1:
        return <Tag icon={<ClockCircleOutlined />} color="default">{statusName || 'Nhap'}</Tag>;
      case 2:
        return <Tag icon={<SyncOutlined />} color="blue">{statusName || 'Da xac minh'}</Tag>;
      case 3:
        return <Tag icon={<SyncOutlined spin />} color="processing">{statusName || 'Da gui'}</Tag>;
      case 4:
        return <Tag icon={<CheckCircleOutlined />} color="success">{statusName || 'Chap nhan'}</Tag>;
      case 5:
        return <Tag icon={<ExclamationCircleOutlined />} color="warning">{statusName || 'Tu choi 1 phan'}</Tag>;
      case 6:
        return <Tag icon={<ExclamationCircleOutlined />} color="error">{statusName || 'Tu choi'}</Tag>;
      default:
        return <Tag>{statusName || String(status)}</Tag>;
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    try {
      message.info('Dang kiem tra ket noi...');
      const res = await testConnection(connectionId);
      const result = res.data;
      if (result?.success) {
        message.success(`Ket noi thanh cong! Thoi gian: ${result.responseTime}ms`);
      } else {
        message.warning(result?.message || 'Ket noi that bai');
      }
    } catch (err) {
      console.warn('Connection test failed:', err);
      message.warning('Khong the kiem tra ket noi');
    }
  };

  const handleSyncConnection = async (connectionId: string, currentStatus: number) => {
    try {
      message.info('Dang dong bo...');
      if (currentStatus === 1) {
        await deactivateConnection(connectionId);
        message.success('Da ngat ket noi');
      } else {
        await activateConnection(connectionId);
        message.success('Da kich hoat ket noi');
      }
      fetchData();
    } catch (err) {
      console.warn('Sync failed:', err);
      message.warning('Dong bo that bai');
    }
  };

  const connectionColumns: ColumnsType<HIEConnectionDto> = [
    {
      title: 'Ten ket noi',
      dataIndex: 'connectionName',
      key: 'connectionName',
      render: (text: string) => (
        <Space>
          <ApiOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Loai',
      dataIndex: 'connectionTypeName',
      key: 'connectionTypeName',
      render: (text: string, record: HIEConnectionDto) => (
        <Tag>{text || record.connectionType}</Tag>
      ),
    },
    {
      title: 'Giao thuc',
      dataIndex: 'protocolName',
      key: 'protocolName',
      render: (text: string, record: HIEConnectionDto) => text || record.protocol,
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status: number, record: HIEConnectionDto) => getConnectionStatusTag(status, record.statusName),
    },
    {
      title: 'Dong bo cuoi',
      dataIndex: 'lastSyncAt',
      key: 'lastSyncAt',
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'Thao tac',
      key: 'action',
      render: (_: unknown, record: HIEConnectionDto) => (
        <Space>
          <Button
            type="link"
            icon={<SyncOutlined />}
            onClick={() => handleSyncConnection(record.id, record.status)}
          >
            Dong bo
          </Button>
          <Button
            type="link"
            icon={<LinkOutlined />}
            onClick={() => handleTestConnection(record.id)}
          >
            Test
          </Button>
        </Space>
      ),
    },
  ];

  const submissionColumns: ColumnsType<InsuranceSubmissionDto> = [
    {
      title: 'Ma',
      dataIndex: 'submissionCode',
      key: 'submissionCode',
    },
    {
      title: 'Loai',
      dataIndex: 'submissionTypeName',
      key: 'submissionTypeName',
      render: (text: string, record: InsuranceSubmissionDto) => text || record.submissionType,
    },
    {
      title: 'So ban ghi',
      dataIndex: 'totalRecords',
      key: 'totalRecords',
    },
    {
      title: 'So tien BHXH',
      dataIndex: 'totalClaimAmount',
      key: 'totalClaimAmount',
      render: (val: number) => val ? val.toLocaleString('vi-VN') + ' VND' : '-',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status: number, record: InsuranceSubmissionDto) => getSubmissionStatusTag(status, record.statusName),
    },
    {
      title: 'Thoi gian gui',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'BHXH phan hoi',
      dataIndex: 'bhxhStatusName',
      key: 'bhxhStatusName',
      render: (val: string) => val || '-',
    },
    {
      title: 'Thao tac',
      key: 'action',
      render: (_: unknown, record: InsuranceSubmissionDto) => (
        <Space>
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
                  message.success('Da gui lai thanh cong');
                  fetchData();
                } catch (err) {
                  console.warn('Resubmit failed:', err);
                  message.warning('Gui lai that bai');
                }
              }}
            >
              Gui lai
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const referralColumns: ColumnsType<ElectronicReferralDto> = [
    {
      title: 'Ma',
      dataIndex: 'referralCode',
      key: 'referralCode',
    },
    {
      title: 'Benh nhan',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Tu BV',
      dataIndex: 'sourceFacilityName',
      key: 'sourceFacilityName',
    },
    {
      title: 'Den BV',
      dataIndex: 'destinationFacilityName',
      key: 'destinationFacilityName',
    },
    {
      title: 'Chan doan',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
    },
    {
      title: 'Muc do',
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
      title: 'Trang thai',
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
      title: 'Thao tac',
      key: 'action',
      render: (_: unknown, record: ElectronicReferralDto) => (
        <Space>
          <Button type="link" icon={<FileTextOutlined />}>
            Chi tiet
          </Button>
          {record.status === 1 && (
            <Button
              type="link"
              icon={<SendOutlined />}
              onClick={async () => {
                try {
                  await sendReferral(record.id);
                  message.success('Da gui phieu chuyen vien');
                  fetchData();
                } catch (err) {
                  console.warn('Send referral failed:', err);
                  message.warning('Gui phieu that bai');
                }
              }}
            >
              Gui
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
                message.warning('Khong the in phieu chuyen vien');
              }
            }}
          >
            In
          </Button>
        </Space>
      ),
    },
  ];

  const consultationColumns: ColumnsType<TeleconsultationRequestDto> = [
    {
      title: 'Ma',
      dataIndex: 'requestCode',
      key: 'requestCode',
    },
    {
      title: 'Benh nhan',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'BS yeu cau',
      dataIndex: 'requestingDoctorName',
      key: 'requestingDoctorName',
    },
    {
      title: 'BV hoi chan',
      dataIndex: 'consultingFacilityName',
      key: 'consultingFacilityName',
    },
    {
      title: 'Chuyen khoa',
      dataIndex: 'consultingSpecialty',
      key: 'consultingSpecialty',
    },
    {
      title: 'Lich hen',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      render: (val: string, record: TeleconsultationRequestDto) => {
        if (val && record.scheduledTime) return `${val} ${record.scheduledTime}`;
        if (val) return val;
        return '-';
      },
    },
    {
      title: 'Trang thai',
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
      title: 'Thao tac',
      key: 'action',
      render: (_: unknown, record: TeleconsultationRequestDto) => (
        <Space>
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
                    message.warning('Khong the vao phong hoi chan');
                  }
                }
              }}
            >
              Vao phong
            </Button>
          )}
          <Button type="link" icon={<FileTextOutlined />}>
            Chi tiet
          </Button>
        </Space>
      ),
    },
  ];

  const handleCreateReferral = async (values: any) => {
    try {
      await createReferral({
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
      });
      setReferralModalVisible(false);
      referralForm.resetFields();
      message.success('Tao phieu chuyen vien thanh cong!');
      fetchData();
    } catch (err) {
      console.warn('Create referral failed:', err);
      message.warning('Tao phieu chuyen vien that bai');
    }
  };

  const handleCreateConsultation = async (values: any) => {
    try {
      await createTeleconsultRequest({
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
      });
      setConsultationModalVisible(false);
      consultationForm.resetFields();
      message.success('Gui yeu cau hoi chan thanh cong!');
      fetchData();
    } catch (err) {
      console.warn('Create teleconsult failed:', err);
      message.warning('Gui yeu cau hoi chan that bai');
    }
  };

  const handleSubmitXML = async (values: any) => {
    try {
      const result = await generateXML({
        xmlType: values.xmlType,
        periodFrom: values.periodFrom?.format?.('YYYY-MM-DD') || dayjs().startOf('month').format('YYYY-MM-DD'),
        periodTo: values.periodTo?.format?.('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
        departmentId: values.departmentId,
        patientIds: values.patientId ? [values.patientId] : undefined,
      });
      if (result.data?.success) {
        message.success(`Tao XML thanh cong! ${result.data.totalRecords} ban ghi, ${result.data.validRecords} hop le`);
        if (result.data.invalidRecords > 0) {
          message.warning(`${result.data.invalidRecords} ban ghi loi - vui long kiem tra lai`);
        }
      } else {
        message.warning('Tao XML that bai');
      }
      setXmlModalVisible(false);
      xmlForm.resetFields();
      fetchData();
    } catch (err) {
      console.warn('Generate XML failed:', err);
      message.warning('Gui du lieu XML that bai');
    }
  };

  const handlePrintReferral = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Phieu Chuyen vien</title>
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
              <h2>BENH VIEN QUAN 1</h2>
              <h1>PHIEU CHUYEN VIEN</h1>
            </div>
            <table>
              <tr><td><strong>Ho ten BN:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Ma benh nhan:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Chan doan:</strong></td><td>_________________</td></tr>
              <tr><td><strong>BV tiep nhan:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Ly do chuyen:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Tom tat dieu tri:</strong></td><td>_________________</td></tr>
            </table>
            <div class="signature">
              <div style="text-align: center;">
                <p>Bac si dieu tri</p>
                <br/><br/>
                <p>_______________</p>
              </div>
              <div style="text-align: center;">
                <p>Giam doc benh vien</p>
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
          Ket noi ({connectedCount}/{totalConnections})
        </span>
      ),
      children: (
        <div>
          <Alert
            title="Trang thai ket noi"
            description={`${connectedCount}/${totalConnections} cong ket noi dang hoat dong`}
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
                  title: `Chi tiet ket noi - ${record.connectionName}`,
                  width: 600,
                  content: (
                    <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                      <Descriptions.Item label="Ten">{record.connectionName}</Descriptions.Item>
                      <Descriptions.Item label="Loai">{record.connectionTypeName || record.connectionType}</Descriptions.Item>
                      <Descriptions.Item label="Doi tac">{record.partnerName} ({record.partnerCode})</Descriptions.Item>
                      <Descriptions.Item label="Endpoint">{record.endpoint || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Giao thuc">{record.protocolName || record.protocol}</Descriptions.Item>
                      <Descriptions.Item label="Xac thuc">{record.authType || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Trang thai">
                        {getConnectionStatusTag(record.status, record.statusName)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Lan dong bo cuoi">{record.lastSyncAt ? dayjs(record.lastSyncAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                      <Descriptions.Item label="So loi">{record.errorCount}</Descriptions.Item>
                      {record.lastError && (
                        <Descriptions.Item label="Loi cuoi">{record.lastError}</Descriptions.Item>
                      )}
                      {record.certificateExpiry && (
                        <Descriptions.Item label="Chung chi het han">{dayjs(record.certificateExpiry).format('YYYY-MM-DD')}</Descriptions.Item>
                      )}
                      <Descriptions.Item label="Dinh dang">{record.dataExchangeFormat}</Descriptions.Item>
                      {record.supportedOperations?.length > 0 && (
                        <Descriptions.Item label="Chuc nang">
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
          Gui du lieu ({pendingSubmissions} cho)
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
              Gui XML BHXH
            </Button>
            <Button icon={<SyncOutlined />} onClick={fetchData}>
              Dong bo tat ca
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
                  title: 'Chi tiet gui du lieu',
                  width: 600,
                  content: (
                    <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                      <Descriptions.Item label="Ma">{record.submissionCode}</Descriptions.Item>
                      <Descriptions.Item label="Loai">{record.submissionTypeName || record.submissionType}</Descriptions.Item>
                      <Descriptions.Item label="Ky tu">{record.periodFrom}</Descriptions.Item>
                      <Descriptions.Item label="Ky den">{record.periodTo}</Descriptions.Item>
                      <Descriptions.Item label="Khoa">{record.departmentName || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Tong ban ghi">{record.totalRecords}</Descriptions.Item>
                      <Descriptions.Item label="Hop le">{record.validRecords}</Descriptions.Item>
                      <Descriptions.Item label="Khong hop le">{record.invalidRecords}</Descriptions.Item>
                      <Descriptions.Item label="So tien">{record.totalClaimAmount?.toLocaleString('vi-VN')} VND</Descriptions.Item>
                      <Descriptions.Item label="BHXH duyet">{record.bhxhApprovedAmount?.toLocaleString('vi-VN') || '-'} VND</Descriptions.Item>
                      <Descriptions.Item label="BHXH tu choi">{record.bhxhRejectedAmount?.toLocaleString('vi-VN') || '-'} VND</Descriptions.Item>
                      <Descriptions.Item label="BHXH trang thai">{record.bhxhStatusName || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Nguoi gui">{record.submittedByName}</Descriptions.Item>
                      <Descriptions.Item label="Trang thai">{record.statusName || String(record.status)}</Descriptions.Item>
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
          Chuyen vien ({activeReferrals})
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
              Tao phieu chuyen
            </Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrintReferral}>
              In mau
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
                  title: 'Chi tiet chuyen vien',
                  width: 700,
                  content: (
                    <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                      <Descriptions.Item label="Ma phieu">{record.referralCode}</Descriptions.Item>
                      <Descriptions.Item label="Loai">{record.referralTypeName || record.referralType}</Descriptions.Item>
                      <Descriptions.Item label="Benh nhan">{record.patientName} ({record.patientCode})</Descriptions.Item>
                      <Descriptions.Item label="Ngay sinh">{record.dateOfBirth}</Descriptions.Item>
                      <Descriptions.Item label="So BHYT">{record.insuranceNumber || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Muc do">{record.urgencyName}</Descriptions.Item>
                      <Descriptions.Item label="Noi chuyen">{record.sourceFacilityName}</Descriptions.Item>
                      <Descriptions.Item label="Khoa chuyen">{record.sourceDepartment}</Descriptions.Item>
                      <Descriptions.Item label="Noi nhan">{record.destinationFacilityName}</Descriptions.Item>
                      <Descriptions.Item label="Khoa nhan">{record.destinationDepartment || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Chan doan" span={2}>{record.diagnosis} ({record.diagnosisIcd})</Descriptions.Item>
                      <Descriptions.Item label="Ly do" span={2}>{record.reasonForReferral}</Descriptions.Item>
                      <Descriptions.Item label="Tom tat lam sang" span={2}>{record.clinicalSummary || '-'}</Descriptions.Item>
                      {record.treatmentHistory && (
                        <Descriptions.Item label="Tien su dieu tri" span={2}>{record.treatmentHistory}</Descriptions.Item>
                      )}
                      {record.currentMedications && (
                        <Descriptions.Item label="Thuoc hien tai" span={2}>{record.currentMedications}</Descriptions.Item>
                      )}
                      <Descriptions.Item label="Trang thai">{record.statusName}</Descriptions.Item>
                      <Descriptions.Item label="Ngay tao">{dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                      {record.sentAt && (
                        <Descriptions.Item label="Ngay gui">{dayjs(record.sentAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                      )}
                      {record.acceptedDate && (
                        <Descriptions.Item label="Ngay chap nhan">{dayjs(record.acceptedDate).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                      )}
                      {record.rejectionReason && (
                        <Descriptions.Item label="Ly do tu choi" span={2}>{record.rejectionReason}</Descriptions.Item>
                      )}
                      {record.outcome && (
                        <Descriptions.Item label="Ket qua" span={2}>{record.outcome}</Descriptions.Item>
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
          Hoi chan tu xa
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
              Yeu cau hoi chan
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
                  title: 'Chi tiet hoi chan tu xa',
                  width: 700,
                  content: (
                    <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                      <Descriptions.Item label="Ma">{record.requestCode}</Descriptions.Item>
                      <Descriptions.Item label="Loai">{record.requestTypeName || record.requestType}</Descriptions.Item>
                      <Descriptions.Item label="Benh nhan">{record.patientName} ({record.patientCode})</Descriptions.Item>
                      <Descriptions.Item label="Muc do">{record.urgencyName}</Descriptions.Item>
                      <Descriptions.Item label="BV yeu cau">{record.requestingFacilityName}</Descriptions.Item>
                      <Descriptions.Item label="BS yeu cau">{record.requestingDoctorName}</Descriptions.Item>
                      <Descriptions.Item label="BV hoi chan">{record.consultingFacilityName}</Descriptions.Item>
                      <Descriptions.Item label="Chuyen khoa">{record.consultingSpecialty}</Descriptions.Item>
                      {record.consultingDoctorName && (
                        <Descriptions.Item label="Chuyen gia" span={2}>{record.consultingDoctorName}</Descriptions.Item>
                      )}
                      <Descriptions.Item label="Ly do chinh" span={2}>{record.chiefComplaint}</Descriptions.Item>
                      <Descriptions.Item label="Cau hoi lam sang" span={2}>{record.clinicalQuestion}</Descriptions.Item>
                      {record.scheduledDate && (
                        <Descriptions.Item label="Lich hen">{record.scheduledDate} {record.scheduledTime || ''}</Descriptions.Item>
                      )}
                      {record.duration && (
                        <Descriptions.Item label="Thoi luong">{record.duration} phut</Descriptions.Item>
                      )}
                      <Descriptions.Item label="Trang thai">{record.statusName}</Descriptions.Item>
                      <Descriptions.Item label="Ngay tao">{dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                      {record.consultationNotes && (
                        <Descriptions.Item label="Ghi chu hoi chan" span={2}>{record.consultationNotes}</Descriptions.Item>
                      )}
                      {record.recommendations && (
                        <Descriptions.Item label="Khuyen nghi" span={2}>{record.recommendations}</Descriptions.Item>
                      )}
                      {record.followUpNeeded && (
                        <Descriptions.Item label="Theo doi" span={2}>{record.followUpInstructions || 'Can theo doi'}</Descriptions.Item>
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
  ];

  return (
    <Spin spinning={loading && connections.length === 0}>
      <div>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Title level={3} style={{ margin: 0 }}>Lien thong Y te (HIE)</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Lam moi
          </Button>
        </Space>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Ket noi hoat dong"
                value={connectedCount}
                suffix={`/ ${totalConnections}`}
                prefix={<ApiOutlined />}
                styles={{ content: { color: connectedCount === totalConnections ? '#3f8600' : '#faad14' } }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Du lieu cho xu ly"
                value={pendingSubmissions}
                prefix={<ClockCircleOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Chuyen vien cho"
                value={activeReferrals}
                suffix={`/ ${referrals.length}`}
                prefix={<SwapOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Hoi chan tu xa"
                value={activeConsultations}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Dashboard alerts */}
        {dashboard?.alerts && dashboard.alerts.length > 0 && (
          <Alert
            title={`${dashboard.alerts.length} canh bao`}
            description={dashboard.alerts.map((a) => a.message).join('; ')}
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Main Content */}
        <Card>
          <Tabs items={tabItems} />
        </Card>

        {/* Referral Modal */}
        <Modal
          title="Tao phieu chuyen vien dien tu"
          open={referralModalVisible}
          onCancel={() => setReferralModalVisible(false)}
          onOk={() => referralForm.submit()}
          width={700}
        >
          <Form form={referralForm} layout="vertical" onFinish={handleCreateReferral}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="patientId" label="Ma benh nhan" rules={[{ required: true }]}>
                  <Input placeholder="Nhap ma benh nhan" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="destinationFacilityCode" label="Ma BV tiep nhan" rules={[{ required: true }]}>
                  <Input placeholder="Ma co so tiep nhan" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="destinationDepartment" label="Khoa tiep nhan">
                  <Input placeholder="Khoa tiep nhan (tuy chon)" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="urgency" label="Muc do khan cap" rules={[{ required: true }]}>
                  <Select placeholder="Chon muc do">
                    <Select.Option value={1}>Thuong quy</Select.Option>
                    <Select.Option value={2}>Khan cap</Select.Option>
                    <Select.Option value={3}>Cap cuu</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="diagnosis" label="Chan doan" rules={[{ required: true }]}>
                  <Input placeholder="Chan doan chinh" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="diagnosisIcd" label="Ma ICD">
                  <Input placeholder="VD: J18.9" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="reason" label="Ly do chuyen vien" rules={[{ required: true }]}>
              <TextArea rows={2} placeholder="Ly do chuyen vien" />
            </Form.Item>
            <Form.Item name="clinicalSummary" label="Tom tat lam sang">
              <TextArea rows={3} placeholder="Tom tat tinh trang lam sang, dieu tri da thuc hien" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="currentMedications" label="Thuoc dang dung">
                  <TextArea rows={2} placeholder="Danh sach thuoc hien tai" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="allergies" label="Di ung">
                  <TextArea rows={2} placeholder="Tien su di ung (neu co)" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="specialInstructions" label="Chi dan dac biet">
              <TextArea rows={2} placeholder="Huong dan dac biet cho co so tiep nhan" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Consultation Modal */}
        <Modal
          title="Yeu cau hoi chan tu xa"
          open={consultationModalVisible}
          onCancel={() => setConsultationModalVisible(false)}
          onOk={() => consultationForm.submit()}
          width={600}
        >
          <Form form={consultationForm} layout="vertical" onFinish={handleCreateConsultation}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="patientId" label="Ma benh nhan" rules={[{ required: true }]}>
                  <Input placeholder="Nhap ma benh nhan" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="requestType" label="Loai yeu cau" rules={[{ required: true }]}>
                  <Select placeholder="Chon loai">
                    <Select.Option value="SecondOpinion">Y kien thu hai</Select.Option>
                    <Select.Option value="Consultation">Hoi chan</Select.Option>
                    <Select.Option value="EmergencyConsult">Hoi chan cap cuu</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="consultingFacilityCode" label="Ma BV hoi chan" rules={[{ required: true }]}>
                  <Input placeholder="Ma co so hoi chan" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="specialty" label="Chuyen khoa" rules={[{ required: true }]}>
                  <Select placeholder="Chon chuyen khoa">
                    <Select.Option value="Tim mach">Tim mach</Select.Option>
                    <Select.Option value="Than kinh">Than kinh</Select.Option>
                    <Select.Option value="Ung buou">Ung buou</Select.Option>
                    <Select.Option value="Nhi khoa">Nhi khoa</Select.Option>
                    <Select.Option value="San phu khoa">San phu khoa</Select.Option>
                    <Select.Option value="Chinh hinh">Chinh hinh</Select.Option>
                    <Select.Option value="Mat">Mat</Select.Option>
                    <Select.Option value="Tai Mui Hong">Tai Mui Hong</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="chiefComplaint" label="Ly do chinh" rules={[{ required: true }]}>
              <TextArea rows={2} placeholder="Ly do yeu cau hoi chan" />
            </Form.Item>
            <Form.Item name="clinicalQuestion" label="Cau hoi lam sang" rules={[{ required: true }]}>
              <TextArea rows={2} placeholder="Cau hoi can tu van" />
            </Form.Item>
            <Form.Item name="relevantHistory" label="Tien su lien quan">
              <TextArea rows={2} placeholder="Tien su benh, dieu tri" />
            </Form.Item>
            <Form.Item name="currentFindings" label="Ket qua hien tai">
              <TextArea rows={2} placeholder="Ket qua kham, xet nghiem hien tai" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="preferredDate" label="Ngay mong muon">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="urgency" label="Muc do" initialValue={1}>
                  <Select>
                    <Select.Option value={1}>Thuong</Select.Option>
                    <Select.Option value={2}>Khan cap</Select.Option>
                    <Select.Option value={3}>Cap cuu</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>

        {/* XML Submit Modal */}
        <Modal
          title="Gui du lieu XML BHXH"
          open={xmlModalVisible}
          onCancel={() => setXmlModalVisible(false)}
          onOk={() => xmlForm.submit()}
          width={600}
        >
          <Form form={xmlForm} layout="vertical" onFinish={handleSubmitXML}>
            <Form.Item name="xmlType" label="Loai XML" rules={[{ required: true }]}>
              <Select placeholder="Chon loai XML">
                <Select.Option value="XML130">XML 130 - Thuoc, VTYT</Select.Option>
                <Select.Option value="XML131">XML 131 - DVKT</Select.Option>
                <Select.Option value="XML4210">XML 4210 - Ho so BHYT</Select.Option>
                <Select.Option value="XML7900">XML 7900 - Bao cao</Select.Option>
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="periodFrom" label="Tu ngay" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="periodTo" label="Den ngay" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="departmentId" label="Khoa (tuy chon)">
              <Input placeholder="Ma khoa (de trong de gui tat ca)" />
            </Form.Item>
            <Form.Item name="patientId" label="Ma benh nhan (tuy chon)">
              <Input placeholder="Ma BN (de trong de gui tat ca BN trong ky)" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default HealthExchange;
