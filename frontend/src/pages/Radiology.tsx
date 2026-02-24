import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Modal,
  Form,
  Select,
  Typography,
  message,
  Tabs,
  Badge,
  Descriptions,
  DatePicker,
  Alert,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  CalendarOutlined,
  CameraOutlined,
  EyeOutlined,
  PictureOutlined,
  QrcodeOutlined,
  TagsOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  SettingOutlined,
  TeamOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import risApi from '../api/ris';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

// Interfaces
interface RadiologyRequest {
  id: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  serviceName: string;
  bodyPart?: string;
  contrast: boolean;
  priority: number; // 1: Normal, 2: Urgent, 3: Emergency
  requestDate: string;
  scheduledDate?: string;
  statusCode: number; // 0: Pending, 1: Scheduled, 2: InProgress, 3: Completed, 4: Reported, 5: Approved
  status: string; // Display name for status
  departmentName?: string;
  doctorName?: string;
  clinicalInfo?: string;
  modalityName?: string;
  studyInstanceUID?: string; // DICOM Study Instance UID
  hasImages?: boolean; // True if DICOM images available
  // Report and signature fields
  description?: string;
  conclusion?: string;
  reportedAt?: string;
  isSigned?: boolean;
  signedBy?: string;
  signedAt?: string;
}

interface RadiologyExam {
  id: string;
  requestId: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  serviceName: string;
  modalityCode: string;
  modalityName: string;
  accessionNumber: string;
  examDate: string;
  technicianName?: string;
  status: number; // 0: Pending, 1: InProgress, 2: Completed
  startTime?: string;
  endTime?: string;
  dose?: number;
  notes?: string;
}

interface RadiologyReport {
  id: string;
  examId: string;
  requestCode: string;
  patientName: string;
  patientCode: string;
  serviceName: string;
  description?: string;
  conclusion?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  radiologistName?: string;
  doctorName?: string;
  reportDate?: string;
  reportedAt?: string;
  status: number; // 0: Draft, 1: Completed, 2: Approved
  approvedBy?: string;
  approvedAt?: string;
  isSigned?: boolean;
  signedBy?: string;
  signedAt?: string;
}

const Radiology: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [radiologyRequests, setRadiologyRequests] = useState<RadiologyRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RadiologyRequest | null>(null);
  const [selectedExam, setSelectedExam] = useState<RadiologyExam | null>(null);
  const [modalities, setModalities] = useState<{ id: string; code: string; name: string; modalityType: string; roomName: string }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; code: string; name: string }[]>([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [selectedReportToSign, setSelectedReportToSign] = useState<RadiologyReport | null>(null);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [scheduleForm] = Form.useForm();
  const [reportForm] = Form.useForm();
  const [signatureForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalityFilter, setModalityFilter] = useState<string | undefined>(undefined);
  // Statistics tab state
  const [statsDateRange, setStatsDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [statsData, setStatsData] = useState<{ totalExams: number; completedExams: number; pendingExams: number; averageTATMinutes: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  // Tags tab state
  const [tagsData, setTagsData] = useState<any[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagForm] = Form.useForm();
  // Duty Schedule tab state
  const [dutyDateRange, setDutyDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [dutyRoomId, setDutyRoomId] = useState<string | undefined>(undefined);
  const [dutySchedules, setDutySchedules] = useState<any[]>([]);
  const [dutyLoading, setDutyLoading] = useState(false);
  // Integration Logs tab state
  const [logDateRange, setLogDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [logMessageType, setLogMessageType] = useState<string | undefined>(undefined);
  const [logStatus, setLogStatus] = useState<string | undefined>(undefined);
  const [integrationLogs, setIntegrationLogs] = useState<any[]>([]);
  const [integrationLogStats, setIntegrationLogStats] = useState<{ totalMessages: number; successCount: number; failedCount: number; averageResponseTimeMs: number } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Print radiology report (Phiếu kết quả CĐHA)
  const executePrintRadiologyReport = (report: RadiologyReport) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kết quả Chẩn đoán Hình ảnh - ${report.requestCode}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.5; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .header-left { width: 50%; }
          .header-right { width: 30%; text-align: right; }
          .title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; text-transform: uppercase; }
          .subtitle { text-align: center; margin-bottom: 15px; font-size: 14px; }
          .patient-info { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
          .info-row { margin: 5px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 100px; display: inline-block; padding: 0 5px; }
          .section { margin: 15px 0; }
          .section-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; text-decoration: underline; }
          .section-content { border: 1px solid #ddd; padding: 10px; min-height: 80px; background-color: #fafafa; }
          .conclusion { border: 2px solid #000; padding: 15px; margin: 15px 0; background-color: #f0f5ff; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
          .signature-col { width: 45%; }
          .footer { margin-top: 20px; font-size: 11px; text-align: center; color: #666; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div><strong>SỞ Y TẾ TP.HCM</strong></div>
            <div><strong>BỆNH VIỆN ĐA KHOA ABC</strong></div>
            <div>Khoa: Chẩn đoán Hình ảnh</div>
          </div>
          <div class="header-right">
            <div><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></div>
            <div><em>Độc lập - Tự do - Hạnh phúc</em></div>
          </div>
        </div>

        <div class="title">PHIẾU KẾT QUẢ CHẨN ĐOÁN HÌNH ẢNH</div>
        <div class="subtitle">Số phiếu: ${report.requestCode}</div>

        <div class="patient-info">
          <div class="info-row">Họ và tên: <span class="field" style="width: 250px;"><strong>${report.patientName}</strong></span> Mã BN: <span class="field">${report.patientCode}</span></div>
          <div class="info-row">Loại chụp: <span class="field" style="width: 400px;">${report.serviceName}</span></div>
          <div class="info-row">Ngày thực hiện: <span class="field">${report.reportDate ? dayjs(report.reportDate).format('DD/MM/YYYY HH:mm') : ''}</span></div>
        </div>

        <div class="section">
          <div class="section-title">1. MÔ TẢ HÌNH ẢNH:</div>
          <div class="section-content">${report.findings || 'Không có mô tả.'}</div>
        </div>

        <div class="conclusion">
          <div class="section-title">2. KẾT LUẬN:</div>
          <div style="font-size: 14px; margin-top: 10px;">${report.impression || 'Không có kết luận.'}</div>
        </div>

        ${report.recommendations ? `
        <div class="section">
          <div class="section-title">3. ĐỀ NGHỊ:</div>
          <div class="section-content">${report.recommendations}</div>
        </div>
        ` : ''}

        <div class="signature-row">
          <div class="signature-col">
            <div>Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</div>
            <div><strong>BÁC SĨ ĐỌC KẾT QUẢ</strong></div>
            <div style="margin-top: 50px;">${report.radiologistName || ''}</div>
          </div>
          <div class="signature-col">
            ${report.approvedBy ? `
            <div>Ngày ${report.approvedAt ? dayjs(report.approvedAt).format('DD') : dayjs().format('DD')} tháng ${report.approvedAt ? dayjs(report.approvedAt).format('MM') : dayjs().format('MM')} năm ${report.approvedAt ? dayjs(report.approvedAt).format('YYYY') : dayjs().format('YYYY')}</div>
            <div><strong>TRƯỞNG KHOA</strong></div>
            <div style="margin-top: 50px;">${report.approvedBy}</div>
            ` : ''}
          </div>
        </div>

        <div class="footer">
          <em>Phiếu này chỉ có giá trị khi có chữ ký và dấu của Bệnh viện</em>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
  };

  // USB Token state
  const [usbTokenCertificates, setUsbTokenCertificates] = useState<risApi.USBTokenCertificate[]>([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);

  // Handle digital signature
  const handleOpenSignatureModal = async (report: RadiologyReport) => {
    setSelectedReportToSign(report);
    signatureForm.resetFields();
    signatureForm.setFieldsValue({ signatureType: 'USBToken' });
    setIsSignatureModalOpen(true);

    // Load USB Token certificates
    setLoadingCertificates(true);
    try {
      const response = await risApi.getUSBTokenStatus();
      if (response.data?.certificates) {
        setUsbTokenCertificates(response.data.certificates);
        // Auto select first valid certificate
        const validCert = response.data.certificates.find(c => c.isValid);
        if (validCert) {
          signatureForm.setFieldsValue({ certificateThumbprint: validCert.thumbprint });
        }
      }
      if (!response.data?.available) {
        message.warning('Không tìm thấy USB Token. Vui lòng kiểm tra đã cắm USB Token.');
      }
    } catch (error) {
      console.error('Error loading USB Token certificates:', error);
      message.warning('Không thể đọc chứng thư số từ USB Token');
    } finally {
      setLoadingCertificates(false);
    }
  };

  const handleSignResult = async (values: { signatureType: string; certificateThumbprint?: string; pin?: string; note?: string }) => {
    if (!selectedReportToSign) return;

    setSignatureLoading(true);
    try {
      if (values.signatureType === 'USBToken') {
        // Use PDF Generation & Signing API - creates a signed PDF document (PAdES compliant)
        if (!values.certificateThumbprint) {
          message.error('Vui lòng chọn chứng thư số để ký');
          setSignatureLoading(false);
          return;
        }

        // Generate and sign PDF with radiology report data
        const pdfRequest: risApi.PdfGenerateSignRequest = {
          patientCode: selectedReportToSign.patientCode,
          patientName: selectedReportToSign.patientName,
          requestCode: selectedReportToSign.requestCode,
          requestDate: selectedReportToSign.reportedAt || dayjs().format('YYYY-MM-DD'),
          serviceName: selectedReportToSign.serviceName,
          findings: selectedReportToSign.findings || selectedReportToSign.description || '',
          conclusion: selectedReportToSign.impression || selectedReportToSign.conclusion || '',
          recommendations: selectedReportToSign.recommendations || '',
          reportedBy: selectedReportToSign.radiologistName || selectedReportToSign.doctorName || '',
          reportedDate: selectedReportToSign.reportDate || dayjs().format('YYYY-MM-DD HH:mm'),
          hospitalName: 'BỆNH VIỆN ĐA KHOA ABC',
          hospitalAddress: '123 Đường ABC, Quận 1, TP.HCM',
          hospitalPhone: '028-12345678',
          certificateThumbprint: values.certificateThumbprint,
        };

        const result = await risApi.generateAndSignPdf(pdfRequest);

        if (result.data?.success) {
          message.success(`Ký số PDF thành công! Người ký: ${result.data.signerName}`);

          // Offer to download the signed PDF
          if (result.data.pdfFileName) {
            Modal.confirm({
              title: 'Tải PDF đã ký',
              content: `File PDF đã được ký số: ${result.data.pdfFileName}. Bạn có muốn tải về không?`,
              okText: 'Tải về',
              cancelText: 'Đóng',
              onOk: async () => {
                try {
                  const downloadResponse = await risApi.downloadSignedPdf(result.data.pdfFileName!);
                  const blob = new Blob([downloadResponse.data], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = result.data.pdfFileName!;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                } catch (downloadError) {
                  message.error('Không thể tải file PDF');
                }
              },
            });
          }

          setIsSignatureModalOpen(false);
          setSelectedReportToSign(null);
          fetchRadiologyData();
        } else {
          message.error(result.data?.message || 'Ký số PDF thất bại');
        }
      } else {
        // Other signature types (Cloud, etc.)
        const result = await risApi.signResult({
          reportId: selectedReportToSign.id,
          signatureType: values.signatureType,
          pin: values.pin,
          note: values.note,
        });

        if (result.data?.success) {
          message.success('Ký số kết quả thành công!');
          setIsSignatureModalOpen(false);
          setSelectedReportToSign(null);
          fetchRadiologyData();
        } else {
          message.error(result.data?.message || 'Ký số thất bại');
        }
      }
    } catch (error: any) {
      console.error('Sign result error:', error);
      message.error(error?.response?.data?.message || 'Có lỗi xảy ra khi ký số');
    } finally {
      setSignatureLoading(false);
    }
  };

  // Fetch radiology data from API
  const fetchRadiologyData = async () => {
    setLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const response = await risApi.getWaitingList(today);
      if (response && response.data) {
        // Map API data to local RadiologyRequest format
        // Status from API (Vietnamese): 'Cho thuc hien', 'Da hen', 'Dang thuc hien', 'Da thuc hien', 'Da tra ket qua', 'Da duyet', 'Da huy'
        // Numeric: 0=Pending, 1=Scheduled, 2=InProgress, 3=Completed, 4=Reported, 5=Approved, 6=Cancelled
        const mapStatus = (s: any): number => {
          if (typeof s === 'number') return s;
          const statusMap: Record<string, number> = {
            'Pending': 0, 'Cho thuc hien': 0,
            'Scheduled': 1, 'Da hen': 1,
            'InProgress': 2, 'Dang thuc hien': 2,
            'Completed': 3, 'Da thuc hien': 3,
            'Reported': 4, 'Da tra ket qua': 4,
            'Approved': 5, 'Da duyet': 5,
            'Cancelled': 6, 'Da huy': 6,
          };
          return statusMap[s] ?? 0; // Default to 0 (Pending) if unknown
        };
        const requests: RadiologyRequest[] = ((response as any).data || []).map((item: any) => ({
          id: item.orderId || item.id,
          requestCode: item.orderCode || item.requestCode,
          patientCode: item.patientCode,
          patientName: item.patientName,
          gender: item.gender === 'Nam' ? 1 : item.gender === 'Nu' ? 2 : (item.gender || 1),
          serviceName: item.serviceName,
          contrast: item.contrast || false,
          priority: item.priority === 'Cap cuu' || item.priority === 3 ? 3 : item.priority === 'Khan' || item.priority === 2 ? 2 : 1,
          requestDate: item.orderTime || item.requestDate,
          scheduledDate: item.calledTime || item.scheduledDate,
          statusCode: item.statusCode ?? mapStatus(item.status), // Use statusCode from API, fallback to mapped status
          status: item.status || '', // Display name
          departmentName: item.departmentName,
          doctorName: item.orderDoctorName || item.doctorName,
          modalityName: item.serviceTypeName || item.modalityName,
          studyInstanceUID: item.studyInstanceUID || '',
          hasImages: item.hasImages || false,
        }));
        setRadiologyRequests(requests);
      }
    } catch (error) {
      console.error('Error fetching radiology data:', error);
      message.error('Không thể tải danh sách chẩn đoán hình ảnh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadiologyData();

    // Load modality and room options from API
    const loadOptions = async () => {
      try {
        const [modalitiesRes, roomsRes] = await Promise.all([
          risApi.getModalities(),
          risApi.getRooms(),
        ]);
        if (modalitiesRes.data) {
          setModalities(modalitiesRes.data.map((m: any) => ({
            id: m.id,
            code: m.code,
            name: m.name,
            modalityType: m.modalityType,
            roomName: m.roomName,
          })));
        }
        if (roomsRes.data) {
          setRooms(roomsRes.data.map((r: any) => ({
            id: r.id,
            code: r.code,
            name: r.name,
          })));
        }
      } catch {
        // Silently fail - hardcoded fallbacks will be used if API fails
      }
    };
    loadOptions();
  }, []);

  // Load tags when Tags tab is opened
  useEffect(() => {
    if (activeTab === 'tags' && tagsData.length === 0) {
      const loadTags = async () => {
        setTagsLoading(true);
        try {
          const response = await risApi.getTags();
          if (response.data) {
            setTagsData(response.data);
          }
        } catch (error) {
          console.error('Error loading tags:', error);
        } finally {
          setTagsLoading(false);
        }
      };
      loadTags();
    }
  }, [activeTab]);

  // Get priority badge
  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1:
        return <Badge status="default" text="Bình thường" />;
      case 2:
        return <Badge status="warning" text="Khẩn" />;
      case 3:
        return <Badge status="error" text="Cấp cứu" />;
      default:
        return <Badge status="default" text="Không xác định" />;
    }
  };

  // Get status tag
  const getStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ thực hiện</Tag>;
      case 1:
        return <Tag color="blue" icon={<CalendarOutlined />}>Đã hẹn lịch</Tag>;
      case 2:
        return <Tag color="purple" icon={<PlayCircleOutlined />}>Đang thực hiện</Tag>;
      case 3:
        return <Tag color="cyan" icon={<CameraOutlined />}>Hoàn thành chụp</Tag>;
      case 4:
        return <Tag color="geekblue" icon={<FileSearchOutlined />}>Đã có báo cáo</Tag>;
      case 5:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Get exam status tag
  const getExamStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ thực hiện</Tag>;
      case 1:
        return <Tag color="purple" icon={<PlayCircleOutlined />}>Đang thực hiện</Tag>;
      case 2:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Get report status tag
  const getReportStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange">Nháp</Tag>;
      case 1:
        return <Tag color="cyan">Hoàn thành</Tag>;
      case 2:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Handle schedule exam
  const handleScheduleExam = (record: RadiologyRequest) => {
    setSelectedRequest(record);
    scheduleForm.setFieldsValue({
      scheduledDate: dayjs().add(1, 'hour'),
      modalityId: null,
    });
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async () => {
    try {
      const values = await scheduleForm.validateFields();
      if (!selectedRequest) return;
      await risApi.callPatient({
        orderId: selectedRequest.id,
        roomId: values.modalityId,
        message: values.notes || '',
        useSpeaker: false,
      });
      message.success('Đã hẹn lịch thành công');
      setIsScheduleModalOpen(false);
      scheduleForm.resetFields();
      setSelectedRequest(null);
      fetchRadiologyData();
    } catch (error: any) {
      console.error('Schedule submit error:', error);
      message.error(error?.response?.data?.message || 'Không thể hẹn lịch');
    }
  };

  // Handle start exam (for in-progress/scheduled requests)
  const handleStartExam = async (record: RadiologyRequest) => {
    try {
      await risApi.startExam(record.id);
      message.success('Đã bắt đầu thực hiện');
      fetchRadiologyData();
    } catch (error: any) {
      console.error('Start exam error:', error);
      message.error(error?.response?.data?.message || 'Không thể bắt đầu thực hiện');
    }
  };

  // Handle create report
  const handleCreateReport = (record: RadiologyExam) => {
    setSelectedExam(record);
    reportForm.resetFields();
    setIsReportModalOpen(true);
  };

  const handleReportSubmit = async () => {
    try {
      const values = await reportForm.validateFields();
      // Use selectedExam if available, else selectedRequest (from reporting tab)
      const orderItemId = selectedExam?.id || selectedRequest?.id;
      if (!orderItemId) return;

      await risApi.enterRadiologyResult({
        orderItemId,
        description: values.findings,
        conclusion: values.impression,
        note: values.recommendations,
      });

      message.success('Đã tạo báo cáo thành công');
      setIsReportModalOpen(false);
      reportForm.resetFields();
      setSelectedExam(null);
      setSelectedRequest(null);
      fetchRadiologyData();
    } catch (error: any) {
      console.error('Report submit error:', error);
      message.error(error?.response?.data?.message || 'Không thể lưu báo cáo');
    }
  };

  // Handle approve report (for completed/reported requests)
  const handleApproveReport = (record: RadiologyRequest) => {
    Modal.confirm({
      title: 'Xác nhận duyệt báo cáo',
      content: `Bạn có chắc chắn muốn duyệt báo cáo ${record.requestCode}?`,
      onOk: async () => {
        try {
          await risApi.finalApproveResult(record.id, {
            resultId: record.id,
            isFinalApproval: true,
          });
          message.success('Đã duyệt báo cáo thành công');
          fetchRadiologyData();
        } catch (error: any) {
          console.error('Approve report error:', error);
          message.error(error?.response?.data?.message || 'Không thể duyệt báo cáo');
        }
      },
    });
  };

  // Pending Requests columns
  const pendingColumns: ColumnsType<RadiologyRequest> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 130,
      fixed: 'left',
    },
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 120,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 200,
    },
    {
      title: 'Vùng chụp',
      dataIndex: 'bodyPart',
      key: 'bodyPart',
      width: 120,
    },
    {
      title: 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 130,
      render: (priority) => getPriorityBadge(priority),
      sorter: (a, b) => b.priority - a.priority,
    },
    {
      title: 'Ngày chỉ định',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'doctorName',
      key: 'doctorName',
      width: 130,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 140,
      render: (statusCode) => getStatusTag(statusCode),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<CalendarOutlined />}
          onClick={() => handleScheduleExam(record)}
        >
          Hẹn lịch
        </Button>
      ),
    },
  ];

  // Worklist columns
  const worklistColumns: ColumnsType<RadiologyRequest> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 130,
      fixed: 'left',
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 200,
    },
    {
      title: 'Modality',
      dataIndex: 'modalityName',
      key: 'modalityName',
      width: 120,
    },
    {
      title: 'Giờ hẹn',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      width: 150,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 130,
      render: (priority) => getPriorityBadge(priority),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 140,
      render: (statusCode) => getStatusTag(statusCode),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => handleStartExam(record)}
        >
          Bắt đầu
        </Button>
      ),
    },
  ];

  // In Progress columns - for exams being performed
  const inProgressColumns: ColumnsType<RadiologyRequest> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 130,
      fixed: 'left',
    },
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 120,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 200,
    },
    {
      title: 'Modality',
      dataIndex: 'modalityName',
      key: 'modalityName',
      width: 120,
    },
    {
      title: 'Bác sĩ CĐ',
      dataIndex: 'doctorName',
      key: 'doctorName',
      width: 130,
    },
    {
      title: 'Thời gian bắt đầu',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 150,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 140,
      render: (statusCode) => getStatusTag(statusCode),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<CheckCircleOutlined />}
          onClick={async () => {
            try {
              await risApi.completeExam(record.id);
              message.success(`Đã hoàn thành chụp phiếu ${record.requestCode}`);
              fetchRadiologyData();
            } catch (error: any) {
              console.error('Complete exam error:', error);
              message.error(error?.response?.data?.message || 'Không thể hoàn thành ca chụp');
            }
          }}
        >
          Hoàn thành
        </Button>
      ),
    },
  ];

  // Reporting columns - for reading results and viewing images
  const reportingColumns: ColumnsType<RadiologyRequest> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 130,
      fixed: 'left',
    },
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 120,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 200,
    },
    {
      title: 'Ngày yêu cầu',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 150,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 140,
      render: (statusCode) => getStatusTag(statusCode),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.hasImages && record.studyInstanceUID && (
            <Button
              size="small"
              icon={<PictureOutlined />}
              onClick={() => window.open(
                `/radiology/viewer?study=${record.studyInstanceUID}`,
                '_blank'
              )}
            >
              Xem hình
            </Button>
          )}
          <Button
            type="primary"
            size="small"
            icon={<FileSearchOutlined />}
            onClick={() => {
              setSelectedRequest(record);
              setIsReportModalOpen(true);
            }}
          >
            Nhập KQ
          </Button>
        </Space>
      ),
    },
  ];

  // Completed columns - for viewing completed reports
  const completedColumns: ColumnsType<RadiologyRequest> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 130,
      fixed: 'left',
    },
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 120,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 200,
    },
    {
      title: 'Bác sĩ CĐ',
      dataIndex: 'doctorName',
      key: 'doctorName',
      width: 130,
    },
    {
      title: 'Ngày yêu cầu',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 150,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 130,
      render: (statusCode) => getStatusTag(statusCode),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 320,
      fixed: 'right',
      render: (_, record) => (
        <Space wrap>
          {record.hasImages && record.studyInstanceUID && (
            <Button
              size="small"
              icon={<PictureOutlined />}
              onClick={() => window.open(
                `/radiology/viewer?study=${record.studyInstanceUID}`,
                '_blank'
              )}
            >
              Xem hình
            </Button>
          )}
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={async () => {
              try {
                // Try to get the result from API and print via backend
                const resultResponse = await risApi.getRadiologyResult(record.id);
                if (resultResponse.data) {
                  const blob = await risApi.printRadiologyResult(resultResponse.data.id);
                  const url = window.URL.createObjectURL(new Blob([blob.data], { type: 'application/pdf' }));
                  const printWindow = window.open(url, '_blank');
                  if (printWindow) {
                    setTimeout(() => {
                      printWindow.focus();
                      printWindow.print();
                    }, 1000); // Longer delay for PDF loading
                  }
                  return;
                }
              } catch {
                // No API result found; create a temporary report from record data and print
              }
              const tempReport: RadiologyReport = {
                id: record.id,
                examId: record.id,
                requestCode: record.requestCode,
                patientName: record.patientName,
                patientCode: record.patientCode,
                serviceName: record.serviceName,
                findings: record.description || '',
                impression: record.conclusion || '',
                recommendations: '',
                radiologistName: record.doctorName || '',
                reportDate: record.requestDate,
                reportedAt: record.reportedAt,
                status: record.statusCode,
              };
              executePrintRadiologyReport(tempReport);
            }}
          >
            In KQ
          </Button>
          <Button
            size="small"
            icon={<QrcodeOutlined />}
            onClick={async () => {
              try {
                const result = await risApi.generateQRCode({
                  dataType: 'ResultLink',
                  referenceId: record.id,
                });
                Modal.info({
                  title: 'QR Code chia sẻ kết quả',
                  content: (
                    <div style={{ textAlign: 'center' }}>
                      <img src={result.data.qrCodeImage} alt="QR Code" style={{ maxWidth: 200 }} />
                      <p>Quét mã để xem kết quả</p>
                    </div>
                  ),
                });
              } catch {
                message.error('Không thể tạo QR Code');
              }
            }}
          >
            QR
          </Button>
          <Button
            size="small"
            icon={<SafetyCertificateOutlined />}
            onClick={() => handleOpenSignatureModal({
              id: record.id,
              examId: record.id, // Use record id as examId for now
              requestCode: record.requestCode,
              patientName: record.patientName,
              patientCode: record.patientCode,
              serviceName: record.serviceName,
              description: record.description || '',
              conclusion: record.conclusion || '',
              doctorName: record.doctorName || '',
              reportedAt: record.reportedAt || dayjs().format('YYYY-MM-DD HH:mm'),
              status: record.statusCode,
              isSigned: record.isSigned || false,
              signedBy: record.signedBy,
              signedAt: record.signedAt,
            })}
            type="primary"
            ghost
          >
            Ký số
          </Button>
          {record.statusCode === 4 && (
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApproveReport(record)}
              type="primary"
            >
              Duyệt
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Helper to filter requests by search text (matches requestCode, patientCode, patientName)
  const filterBySearch = (requests: RadiologyRequest[], search: string) => {
    if (!search.trim()) return requests;
    const lower = search.toLowerCase();
    return requests.filter(r =>
      r.requestCode?.toLowerCase().includes(lower) ||
      r.patientCode?.toLowerCase().includes(lower) ||
      r.patientName?.toLowerCase().includes(lower)
    );
  };

  // Filter data by status
  // Status: 0=Pending, 1=Scheduled, 2=InProgress, 3=Completed, 4=Reported, 5=Approved, 6=Cancelled
  const pendingRequests = filterBySearch(radiologyRequests.filter(r => r.statusCode === 0), searchText);
  const scheduledRequests = radiologyRequests.filter(r => r.statusCode === 1);
  const inProgressRequests = radiologyRequests.filter(r => r.statusCode === 2);
  const reportingRequests = radiologyRequests.filter(r => r.statusCode === 3);
  const completedRequests = filterBySearch(radiologyRequests.filter(r => r.statusCode >= 4 && r.statusCode <= 5), searchText);

  return (
    <div>
      <Title level={4}>Quản lý Chẩn đoán Hình ảnh (RIS/PACS)</Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'pending',
              label: (
                <span>
                  <ClockCircleOutlined />
                  Chờ thực hiện
                  {pendingRequests.length > 0 && (
                    <Badge count={pendingRequests.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã phiếu, mã BN, tên bệnh nhân..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                    </Col>
                    <Col>
                      <Button icon={<ReloadOutlined />} onClick={() => fetchRadiologyData()}>
                        Làm mới
                      </Button>
                    </Col>
                  </Row>

                  <Table
                    columns={pendingColumns}
                    dataSource={pendingRequests}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1500 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} phiếu`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedRequest(record);
                        setIsDetailModalOpen(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'worklist',
              label: (
                <span>
                  <CalendarOutlined />
                  Worklist
                  {scheduledRequests.length > 0 && (
                    <Badge count={scheduledRequests.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col>
                      <Select
                        placeholder="Chọn Modality"
                        style={{ width: 200 }}
                        allowClear
                        value={modalityFilter}
                        onChange={(value) => setModalityFilter(value)}
                        options={modalities.length > 0
                          ? modalities.map(m => ({ value: m.modalityType || m.code, label: `${m.name}` }))
                          : [
                              { value: 'XR', label: 'X-quang' },
                              { value: 'CT', label: 'CT Scanner' },
                              { value: 'MR', label: 'MRI' },
                              { value: 'US', label: 'Siêu âm' },
                            ]
                        }
                      />
                    </Col>
                  </Row>

                  <Table
                    columns={worklistColumns}
                    dataSource={modalityFilter ? scheduledRequests.filter(r => r.modalityName?.toUpperCase().includes(modalityFilter!.toUpperCase())) : scheduledRequests}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1200 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} phiếu`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedRequest(record);
                        setIsDetailModalOpen(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'inProgress',
              label: (
                <span>
                  <PlayCircleOutlined />
                  Đang thực hiện
                  {inProgressRequests.length > 0 && (
                    <Badge count={inProgressRequests.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Alert
                    title="Lưu ý"
                    description="Theo dõi và quản lý các lượt chụp đang thực hiện"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Table
                    columns={inProgressColumns}
                    dataSource={inProgressRequests}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1300 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} lượt`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedRequest(record);
                        setIsDetailModalOpen(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'reporting',
              label: (
                <span>
                  <FileSearchOutlined />
                  Đọc kết quả
                  {reportingRequests.length > 0 && (
                    <Badge count={reportingRequests.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Alert
                    title="Đọc và nhập kết quả"
                    description="Nhập kết quả chẩn đoán hình ảnh cho các lượt chụp đã hoàn thành"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Table
                    columns={reportingColumns}
                    dataSource={reportingRequests}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1200 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} lượt`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedRequest(record);
                        setIsDetailModalOpen(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'completed',
              label: (
                <span>
                  <CheckCircleOutlined />
                  Đã hoàn thành
                  {completedRequests.length > 0 && (
                    <Badge count={completedRequests.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã phiếu, mã BN..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                    </Col>
                  </Row>

                  <Table
                    columns={completedColumns}
                    dataSource={completedRequests}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1300 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} báo cáo`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedRequest(record);
                        setIsDetailModalOpen(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'statistics',
              label: (
                <span>
                  <BarChartOutlined />
                  Thống kê
                </span>
              ),
              children: (
                <>
                  <Alert
                    title="Thống kê chẩn đoán hình ảnh"
                    description="Xem thống kê số lượng, doanh thu theo loại dịch vụ, theo thời gian"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col>
                      <DatePicker.RangePicker
                        format="DD/MM/YYYY"
                        placeholder={['Từ ngày', 'Đến ngày']}
                        value={statsDateRange}
                        onChange={(dates) => setStatsDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                      />
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        loading={statsLoading}
                        onClick={async () => {
                          const fromDate = statsDateRange?.[0]?.format('YYYY-MM-DD') || dayjs().startOf('month').format('YYYY-MM-DD');
                          const toDate = statsDateRange?.[1]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD');
                          setStatsLoading(true);
                          try {
                            const response = await risApi.getStatistics(fromDate, toDate);
                            if (response.data) {
                              setStatsData({
                                totalExams: response.data.totalExams,
                                completedExams: response.data.completedExams,
                                pendingExams: response.data.pendingExams,
                                averageTATMinutes: response.data.averageTATMinutes,
                              });
                            }
                          } catch (error: any) {
                            console.error('Statistics error:', error);
                            message.error(error?.response?.data?.message || 'Không thể tải thống kê');
                          } finally {
                            setStatsLoading(false);
                          }
                        }}
                      >
                        Xem thống kê
                      </Button>
                    </Col>
                    <Col>
                      <Button
                        icon={<PrinterOutlined />}
                        onClick={async () => {
                          const fromDate = statsDateRange?.[0]?.format('YYYY-MM-DD') || dayjs().startOf('month').format('YYYY-MM-DD');
                          const toDate = statsDateRange?.[1]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD');
                          try {
                            const response = await risApi.exportReportToExcel('statistics', fromDate, toDate);
                            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `thong-ke-cdha-${fromDate}-${toDate}.xlsx`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                            message.success('Đã xuất Excel thành công');
                          } catch (error: any) {
                            console.error('Export Excel error:', error);
                            message.error(error?.response?.data?.message || 'Không thể xuất Excel');
                          }
                        }}
                      >
                        Xuất Excel
                      </Button>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Card size="small">
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{statsData?.totalExams ?? 0}</div>
                          <div>Tổng số ca</div>
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{statsData?.completedExams ?? 0}</div>
                          <div>Đã hoàn thành</div>
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>{statsData?.pendingExams ?? 0}</div>
                          <div>Đang chờ</div>
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>{statsData?.averageTATMinutes ?? 0} phút</div>
                          <div>TB TAT</div>
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </>
              ),
            },
            {
              key: 'tags',
              label: (
                <span>
                  <TagsOutlined />
                  Quản lý Tag
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm tag..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 300 }}
                        loading={tagsLoading}
                        onSearch={async (value) => {
                          setTagsLoading(true);
                          try {
                            const response = await risApi.getTags(value || undefined);
                            if (response.data) {
                              setTagsData(response.data);
                            }
                          } catch (error: any) {
                            console.error('Search tags error:', error);
                            message.error(error?.response?.data?.message || 'Không thể tìm tag');
                          } finally {
                            setTagsLoading(false);
                          }
                        }}
                      />
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<TagsOutlined />}
                        onClick={() => {
                          tagForm.resetFields();
                          setIsTagModalOpen(true);
                        }}
                      >
                        Thêm Tag mới
                      </Button>
                    </Col>
                  </Row>
                  <Alert
                    title="Quản lý Tag ca chụp"
                    description="Tạo và quản lý các tag để phân loại, đánh dấu ca chụp. Hỗ trợ gắn nhiều tag cho một ca."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Space wrap style={{ marginBottom: 16 }}>
                    {tagsData.length > 0 ? tagsData.map((tag: any) => (
                      <Tag key={tag.id} color={tag.color || 'blue'}>{tag.name}</Tag>
                    )) : (
                      <>
                        <Tag color="red">Khẩn cấp</Tag>
                        <Tag color="orange">Cần hội chẩn</Tag>
                        <Tag color="blue">Theo dõi</Tag>
                        <Tag color="green">VIP</Tag>
                        <Tag color="purple">Bảo hiểm</Tag>
                      </>
                    )}
                  </Space>
                </>
              ),
            },
            {
              key: 'dutySchedule',
              label: (
                <span>
                  <TeamOutlined />
                  Lịch trực
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col>
                      <DatePicker.RangePicker
                        format="DD/MM/YYYY"
                        placeholder={['Từ ngày', 'Đến ngày']}
                        value={dutyDateRange}
                        onChange={(dates) => setDutyDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                      />
                    </Col>
                    <Col>
                      <Select
                        placeholder="Chọn phòng"
                        style={{ width: 200 }}
                        allowClear
                        value={dutyRoomId}
                        onChange={(value) => setDutyRoomId(value)}
                      >
                        {rooms.length > 0
                          ? rooms.map(r => (
                              <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
                            ))
                          : (
                            <>
                              <Select.Option value="room1">Phòng X-quang 1</Select.Option>
                              <Select.Option value="room2">Phòng CT</Select.Option>
                              <Select.Option value="room3">Phòng MRI</Select.Option>
                              <Select.Option value="room4">Phòng Siêu âm</Select.Option>
                            </>
                          )
                        }
                      </Select>
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<CalendarOutlined />}
                        loading={dutyLoading}
                        onClick={async () => {
                          const fromDate = dutyDateRange?.[0]?.format('YYYY-MM-DD') || dayjs().startOf('week').format('YYYY-MM-DD');
                          const toDate = dutyDateRange?.[1]?.format('YYYY-MM-DD') || dayjs().endOf('week').format('YYYY-MM-DD');
                          setDutyLoading(true);
                          try {
                            const response = await risApi.getDutySchedules(fromDate, toDate, dutyRoomId);
                            if (response.data) {
                              setDutySchedules(response.data);
                              message.success(`Đã tải ${response.data.length} lịch trực`);
                            }
                          } catch (error: any) {
                            console.error('Load duty schedules error:', error);
                            message.error(error?.response?.data?.message || 'Không thể tải lịch trực');
                          } finally {
                            setDutyLoading(false);
                          }
                        }}
                      >
                        Tạo lịch trực
                      </Button>
                    </Col>
                  </Row>
                  <Alert
                    title="Quản lý lịch phân công trực"
                    description="Phân công bác sĩ, kỹ thuật viên trực theo ca, theo phòng. Hỗ trợ tạo lịch hàng loạt."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  {dutySchedules.length > 0 && (
                    <Table
                      dataSource={dutySchedules}
                      rowKey="id"
                      size="small"
                      pagination={{ pageSize: 10 }}
                      columns={[
                        { title: 'Ngày', dataIndex: 'date', key: 'date', width: 120, render: (d: string) => dayjs(d).format('DD/MM/YYYY') },
                        { title: 'Ca trực', dataIndex: 'shiftType', key: 'shiftType', width: 100 },
                        { title: 'Giờ bắt đầu', dataIndex: 'startTime', key: 'startTime', width: 100 },
                        { title: 'Giờ kết thúc', dataIndex: 'endTime', key: 'endTime', width: 100 },
                        { title: 'Phòng', dataIndex: 'roomName', key: 'roomName', width: 150 },
                        { title: 'Nhân viên', dataIndex: 'userName', key: 'userName', width: 150 },
                        { title: 'Vai trò', dataIndex: 'role', key: 'role', width: 120 },
                        { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 100 },
                      ]}
                    />
                  )}
                </>
              ),
            },
            {
              key: 'integrationLogs',
              label: (
                <span>
                  <HistoryOutlined />
                  Log tích hợp
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col>
                      <DatePicker.RangePicker
                        format="DD/MM/YYYY"
                        placeholder={['Từ ngày', 'Đến ngày']}
                        value={logDateRange}
                        onChange={(dates) => setLogDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                      />
                    </Col>
                    <Col>
                      <Select
                        placeholder="Loại message"
                        style={{ width: 150 }}
                        allowClear
                        value={logMessageType}
                        onChange={(value) => setLogMessageType(value)}
                      >
                        <Select.Option value="ORM">ORM (Order)</Select.Option>
                        <Select.Option value="ORU">ORU (Result)</Select.Option>
                        <Select.Option value="ADT">ADT (Patient)</Select.Option>
                      </Select>
                    </Col>
                    <Col>
                      <Select
                        placeholder="Trạng thái"
                        style={{ width: 120 }}
                        allowClear
                        value={logStatus}
                        onChange={(value) => setLogStatus(value)}
                      >
                        <Select.Option value="Success">Thành công</Select.Option>
                        <Select.Option value="Failed">Lỗi</Select.Option>
                      </Select>
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        loading={logsLoading}
                        onClick={async () => {
                          const fromDate = logDateRange?.[0]?.format('YYYY-MM-DD') || dayjs().startOf('month').format('YYYY-MM-DD');
                          const toDate = logDateRange?.[1]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD');
                          setLogsLoading(true);
                          try {
                            const [logsResponse, statsResponse] = await Promise.all([
                              risApi.searchIntegrationLogs({
                                fromDate,
                                toDate,
                                messageType: logMessageType,
                                status: logStatus,
                                pageIndex: 1,
                                pageSize: 50,
                              }),
                              risApi.getIntegrationLogStatistics(fromDate, toDate),
                            ]);
                            if (logsResponse.data?.items) {
                              setIntegrationLogs(logsResponse.data.items);
                            }
                            if (statsResponse.data) {
                              setIntegrationLogStats({
                                totalMessages: statsResponse.data.totalMessages,
                                successCount: statsResponse.data.successCount,
                                failedCount: statsResponse.data.failedCount,
                                averageResponseTimeMs: statsResponse.data.averageResponseTimeMs,
                              });
                            }
                          } catch (error: any) {
                            console.error('Search integration logs error:', error);
                            message.error(error?.response?.data?.message || 'Không thể tìm kiếm log');
                          } finally {
                            setLogsLoading(false);
                          }
                        }}
                      >
                        Tìm kiếm
                      </Button>
                    </Col>
                  </Row>
                  <Alert
                    title="Log tích hợp HIS-RIS"
                    description="Theo dõi các message trao đổi giữa HIS và RIS. Hỗ trợ retry message lỗi."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Card size="small">
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 'bold' }}>{integrationLogStats?.totalMessages ?? 0}</div>
                          <div>Tổng message</div>
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a' }}>{integrationLogStats?.successCount ?? 0}</div>
                          <div>Thành công</div>
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 'bold', color: '#f5222d' }}>{integrationLogStats?.failedCount ?? 0}</div>
                          <div>Lỗi</div>
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 'bold' }}>{integrationLogStats?.averageResponseTimeMs ?? 0} ms</div>
                          <div>TB Response</div>
                        </div>
                      </Card>
                    </Col>
                  </Row>
                  {integrationLogs.length > 0 && (
                    <Table
                      dataSource={integrationLogs}
                      rowKey="id"
                      size="small"
                      pagination={{ pageSize: 10 }}
                      columns={[
                        { title: 'Thời gian', dataIndex: 'logTime', key: 'logTime', width: 150, render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm:ss') },
                        { title: 'Hướng', dataIndex: 'direction', key: 'direction', width: 80 },
                        { title: 'Loại', dataIndex: 'messageType', key: 'messageType', width: 80 },
                        { title: 'Nguồn', dataIndex: 'sourceSystem', key: 'sourceSystem', width: 100 },
                        { title: 'Đích', dataIndex: 'targetSystem', key: 'targetSystem', width: 100 },
                        { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 150 },
                        { title: 'Mã phiếu', dataIndex: 'orderCode', key: 'orderCode', width: 120 },
                        { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 100, render: (s: string) => <Tag color={s === 'Success' ? 'green' : 'red'}>{s}</Tag> },
                        { title: 'Response (ms)', dataIndex: 'responseTime', key: 'responseTime', width: 100 },
                      ]}
                    />
                  )}
                </>
              ),
            },
            {
              key: 'settings',
              label: (
                <span>
                  <SettingOutlined />
                  Cài đặt
                </span>
              ),
              children: (
                <>
                  <Alert
                    title="Cài đặt RIS/PACS"
                    description="Quản lý mẫu chẩn đoán, từ viết tắt, cấu hình nhãn in, ký số"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Card
                        title="Mẫu chẩn đoán"
                        size="small"
                        extra={<Button type="link" size="small" onClick={async () => {
                          try {
                            const response = await risApi.getDiagnosisTemplates();
                            Modal.info({
                              title: 'Mẫu chẩn đoán',
                              width: 700,
                              content: (
                                <Table
                                  dataSource={response.data || []}
                                  rowKey="id"
                                  size="small"
                                  pagination={{ pageSize: 5 }}
                                  columns={[
                                    { title: 'Mã', dataIndex: 'code', key: 'code', width: 80 },
                                    { title: 'Tên', dataIndex: 'name', key: 'name', width: 200 },
                                    { title: 'Loại', dataIndex: 'modalityType', key: 'modalityType', width: 80 },
                                    { title: 'Vùng', dataIndex: 'bodyPart', key: 'bodyPart', width: 100 },
                                    { title: 'Trạng thái', dataIndex: 'isActive', key: 'isActive', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Hoạt động' : 'Tắt'}</Tag> },
                                  ]}
                                />
                              ),
                            });
                          } catch (error: any) {
                            message.error(error?.response?.data?.message || 'Không thể tải mẫu chẩn đoán');
                          }
                        }}>Quản lý</Button>}
                      >
                        <p>Quản lý các mẫu mô tả, kết luận thường dùng cho từng loại dịch vụ CĐHA.</p>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card
                        title="Từ viết tắt"
                        size="small"
                        extra={<Button type="link" size="small" onClick={async () => {
                          try {
                            const response = await risApi.getAbbreviations();
                            Modal.info({
                              title: 'Từ viết tắt',
                              width: 600,
                              content: (
                                <Table
                                  dataSource={response.data || []}
                                  rowKey="id"
                                  size="small"
                                  pagination={{ pageSize: 5 }}
                                  columns={[
                                    { title: 'Viết tắt', dataIndex: 'abbreviation', key: 'abbreviation', width: 100 },
                                    { title: 'Mở rộng', dataIndex: 'expansion', key: 'expansion', width: 300 },
                                    { title: 'Danh mục', dataIndex: 'category', key: 'category', width: 100 },
                                  ]}
                                />
                              ),
                            });
                          } catch (error: any) {
                            message.error(error?.response?.data?.message || 'Không thể tải từ viết tắt');
                          }
                        }}>Quản lý</Button>}
                      >
                        <p>Quản lý bộ từ viết tắt để tự động mở rộng khi nhập kết quả.</p>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card
                        title="Cấu hình nhãn in"
                        size="small"
                        extra={<Button type="link" size="small" onClick={async () => {
                          try {
                            const response = await risApi.getLabelConfigs();
                            Modal.info({
                              title: 'Cấu hình nhãn in',
                              width: 600,
                              content: (
                                <Table
                                  dataSource={response.data || []}
                                  rowKey="id"
                                  size="small"
                                  pagination={{ pageSize: 5 }}
                                  columns={[
                                    { title: 'Mã', dataIndex: 'code', key: 'code', width: 80 },
                                    { title: 'Tên', dataIndex: 'name', key: 'name', width: 200 },
                                    { title: 'Kích thước', key: 'size', width: 100, render: (_: any, r: any) => `${r.width}x${r.height}` },
                                    { title: 'Mặc định', dataIndex: 'isDefault', key: 'isDefault', width: 80, render: (v: boolean) => v ? <Tag color="blue">Mặc định</Tag> : '-' },
                                  ]}
                                />
                              ),
                            });
                          } catch (error: any) {
                            message.error(error?.response?.data?.message || 'Không thể tải cấu hình nhãn in');
                          }
                        }}>Quản lý</Button>}
                      >
                        <p>Cấu hình mẫu nhãn dán cho ca chụp, bao gồm barcode/QR code.</p>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card
                        title="Cấu hình ký số"
                        size="small"
                        extra={<Button type="link" size="small" onClick={async () => {
                          try {
                            const response = await risApi.getSignatureConfigs();
                            Modal.info({
                              title: 'Cấu hình ký số',
                              width: 600,
                              content: (
                                <Table
                                  dataSource={response.data || []}
                                  rowKey="id"
                                  size="small"
                                  pagination={{ pageSize: 5 }}
                                  columns={[
                                    { title: 'Tên', dataIndex: 'name', key: 'name', width: 200 },
                                    { title: 'Loại', dataIndex: 'signatureType', key: 'signatureType', width: 100 },
                                    { title: 'Mặc định', dataIndex: 'isDefault', key: 'isDefault', width: 80, render: (v: boolean) => v ? <Tag color="blue">Mặc định</Tag> : '-' },
                                    { title: 'Trạng thái', dataIndex: 'isActive', key: 'isActive', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Bật' : 'Tắt'}</Tag> },
                                  ]}
                                />
                              ),
                            });
                          } catch (error: any) {
                            message.error(error?.response?.data?.message || 'Không thể tải cấu hình ký số');
                          }
                        }}>Quản lý</Button>}
                      >
                        <p>Cấu hình các phương thức ký số: USB Token, eKYC, SignServer, SmartCA.</p>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card
                        title="Quản lý Modality"
                        size="small"
                        extra={<Button type="link" size="small" onClick={async () => {
                          try {
                            const response = await risApi.getModalities();
                            Modal.info({
                              title: 'Quản lý Modality',
                              width: 700,
                              content: (
                                <Table
                                  dataSource={response.data || []}
                                  rowKey="id"
                                  size="small"
                                  pagination={{ pageSize: 5 }}
                                  columns={[
                                    { title: 'Mã', dataIndex: 'code', key: 'code', width: 80 },
                                    { title: 'Tên', dataIndex: 'name', key: 'name', width: 150 },
                                    { title: 'Loại', dataIndex: 'modalityType', key: 'modalityType', width: 80 },
                                    { title: 'AE Title', dataIndex: 'aeTitle', key: 'aeTitle', width: 100 },
                                    { title: 'Phòng', dataIndex: 'roomName', key: 'roomName', width: 120 },
                                    { title: 'Kết nối', dataIndex: 'connectionStatus', key: 'connectionStatus', width: 80, render: (v: string) => <Tag color={v === 'Connected' ? 'green' : 'red'}>{v}</Tag> },
                                  ]}
                                />
                              ),
                            });
                          } catch (error: any) {
                            message.error(error?.response?.data?.message || 'Không thể tải danh sách modality');
                          }
                        }}>Quản lý</Button>}
                      >
                        <p>Cấu hình kết nối các thiết bị chẩn đoán hình ảnh (CT, MRI, X-quang...).</p>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card
                        title="Kết nối PACS"
                        size="small"
                        extra={<Button type="link" size="small" onClick={async () => {
                          try {
                            const response = await risApi.getPACSConnections();
                            Modal.info({
                              title: 'Kết nối PACS',
                              width: 700,
                              content: (
                                <Table
                                  dataSource={response.data || []}
                                  rowKey="id"
                                  size="small"
                                  pagination={{ pageSize: 5 }}
                                  columns={[
                                    { title: 'Tên', dataIndex: 'name', key: 'name', width: 150 },
                                    { title: 'Loại', dataIndex: 'serverType', key: 'serverType', width: 100 },
                                    { title: 'AE Title', dataIndex: 'aeTitle', key: 'aeTitle', width: 100 },
                                    { title: 'IP', dataIndex: 'ipAddress', key: 'ipAddress', width: 120 },
                                    { title: 'Port', dataIndex: 'port', key: 'port', width: 60 },
                                    { title: 'Kết nối', dataIndex: 'isConnected', key: 'isConnected', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'OK' : 'Lỗi'}</Tag> },
                                  ]}
                                />
                              ),
                            });
                          } catch (error: any) {
                            message.error(error?.response?.data?.message || 'Không thể tải kết nối PACS');
                          }
                        }}>Quản lý</Button>}
                      >
                        <p>Cấu hình kết nối với PACS server (tùy chọn).</p>
                      </Card>
                    </Col>
                  </Row>
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Schedule Exam Modal */}
      <Modal
        title={
          <Space>
            <CalendarOutlined />
            <span>Hẹn lịch thực hiện</span>
          </Space>
        }
        open={isScheduleModalOpen}
        onOk={handleScheduleSubmit}
        onCancel={() => {
          setIsScheduleModalOpen(false);
          scheduleForm.resetFields();
          setSelectedRequest(null);
        }}
        width={700}
        okText="Lưu"
        cancelText="Hủy"
      >
        {selectedRequest && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã phiếu">{selectedRequest.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedRequest.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{selectedRequest.patientName}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">
                {selectedRequest.dateOfBirth ? dayjs(selectedRequest.dateOfBirth).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Dịch vụ" span={2}>
                <Tag color="blue">{selectedRequest.serviceName}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Vùng chụp" span={2}>
                {selectedRequest.bodyPart || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Form form={scheduleForm} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="modalityId"
                    label="Chọn Modality"
                    rules={[{ required: true, message: 'Vui lòng chọn modality' }]}
                  >
                    <Select placeholder="Chọn modality">
                      {modalities.length > 0
                        ? modalities.map(m => (
                            <Select.Option key={m.id} value={m.id}>
                              {m.name} - {m.roomName}
                            </Select.Option>
                          ))
                        : (
                          <>
                            <Select.Option value="1">X-quang - Phòng 1</Select.Option>
                            <Select.Option value="2">CT Scanner - Phòng 2</Select.Option>
                            <Select.Option value="3">MRI - Phòng 3</Select.Option>
                            <Select.Option value="4">Siêu âm - Phòng 4</Select.Option>
                          </>
                        )
                      }
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="scheduledDate"
                    label="Thời gian hẹn"
                    rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
                  >
                    <DatePicker
                      showTime
                      format="DD/MM/YYYY HH:mm"
                      style={{ width: '100%' }}
                      placeholder="Chọn thời gian"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="notes" label="Ghi chú">
                <TextArea rows={3} placeholder="Nhập ghi chú (nếu có)" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* Report Modal */}
      <Modal
        title={
          <Space>
            <FileSearchOutlined />
            <span>Nhập kết quả chẩn đoán hình ảnh</span>
          </Space>
        }
        open={isReportModalOpen}
        onOk={handleReportSubmit}
        onCancel={() => {
          setIsReportModalOpen(false);
          reportForm.resetFields();
          setSelectedExam(null);
          setSelectedRequest(null);
        }}
        width={900}
        okText="Lưu báo cáo"
        cancelText="Hủy"
      >
        {(selectedExam || selectedRequest) && (() => {
          const current = selectedExam || selectedRequest;
          return (
            <>
              <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Mã phiếu">{current!.requestCode}</Descriptions.Item>
                <Descriptions.Item label="Mã BN">{current!.patientCode}</Descriptions.Item>
                <Descriptions.Item label="Họ tên">{current!.patientName}</Descriptions.Item>
                <Descriptions.Item label="Dịch vụ">
                  <Tag color="blue">{current!.serviceName}</Tag>
                </Descriptions.Item>
                {selectedExam && (
                  <>
                    <Descriptions.Item label="Accession No.">{selectedExam.accessionNumber}</Descriptions.Item>
                    <Descriptions.Item label="Modality">{selectedExam.modalityName}</Descriptions.Item>
                  </>
                )}
                {!selectedExam && selectedRequest && (
                  <>
                    <Descriptions.Item label="Bác sĩ CĐ">{selectedRequest.doctorName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Modality">{selectedRequest.modalityName || '-'}</Descriptions.Item>
                  </>
                )}
              </Descriptions>

              <Divider>Kết quả chẩn đoán</Divider>

              <Form form={reportForm} layout="vertical">
                <Form.Item
                  name="findings"
                  label="Mô tả hình ảnh"
                  rules={[{ required: true, message: 'Vui lòng nhập mô tả hình ảnh' }]}
                >
                  <TextArea rows={6} placeholder="Nhập mô tả chi tiết hình ảnh..." />
                </Form.Item>

                <Form.Item
                  name="impression"
                  label="Kết luận"
                  rules={[{ required: true, message: 'Vui lòng nhập kết luận' }]}
                >
                  <TextArea rows={4} placeholder="Nhập kết luận..." />
                </Form.Item>

                <Form.Item name="recommendations" label="Đề nghị">
                  <TextArea rows={3} placeholder="Nhập đề nghị (nếu có)..." />
                </Form.Item>
              </Form>
            </>
          );
        })()}
      </Modal>

      {/* Report View Modal - reserved for future use */}

      {/* Digital Signature Modal */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
            <span>Ký số kết quả Chẩn đoán Hình ảnh</span>
          </Space>
        }
        open={isSignatureModalOpen}
        onCancel={() => {
          setIsSignatureModalOpen(false);
          setSelectedReportToSign(null);
          signatureForm.resetFields();
        }}
        onOk={() => signatureForm.submit()}
        confirmLoading={signatureLoading}
        okText="Ký số"
        cancelText="Hủy"
        width={600}
      >
        {selectedReportToSign && (
          <>
            <Alert
              title="Xác nhận ký số"
              description="Bạn đang thực hiện ký số điện tử cho kết quả chẩn đoán hình ảnh. Vui lòng kiểm tra thông tin trước khi ký."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã phiếu">{selectedReportToSign.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Bệnh nhân">
                {selectedReportToSign.patientName} ({selectedReportToSign.patientCode})
              </Descriptions.Item>
              <Descriptions.Item label="Dịch vụ">
                <Tag color="blue">{selectedReportToSign.serviceName}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Kết luận">
                {selectedReportToSign.conclusion || 'Chưa có kết luận'}
              </Descriptions.Item>
              {selectedReportToSign.isSigned && (
                <Descriptions.Item label="Trạng thái ký">
                  <Tag color="green">Đã ký bởi {selectedReportToSign.signedBy}</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Form
              form={signatureForm}
              layout="vertical"
              onFinish={handleSignResult}
              initialValues={{ signatureType: 'USBToken' }}
            >
              <Form.Item
                name="signatureType"
                label="Phương thức ký số"
                rules={[{ required: true, message: 'Vui lòng chọn phương thức ký số' }]}
              >
                <Select placeholder="Chọn phương thức ký">
                  <Select.Option value="USBToken">
                    <Space>
                      <SafetyCertificateOutlined />
                      USB Token (VNPT-CA, Viettel-CA, FPT-CA, WINCA)
                    </Space>
                  </Select.Option>
                  <Select.Option value="SmartCA">
                    <Space>
                      <SafetyCertificateOutlined />
                      SmartCA (Ký điện tử trên điện thoại)
                    </Space>
                  </Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.signatureType !== currentValues.signatureType
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue('signatureType') === 'USBToken' ? (
                    <Form.Item
                      name="certificateThumbprint"
                      label={
                        <Space>
                          Chứng thư số từ USB Token
                          {loadingCertificates && <span style={{ color: '#1890ff' }}>(Đang tải...)</span>}
                        </Space>
                      }
                      rules={[{ required: true, message: 'Vui lòng chọn chứng thư số' }]}
                    >
                      <Select
                        placeholder="Chọn chứng thư số"
                        loading={loadingCertificates}
                        notFoundContent={
                          usbTokenCertificates.length === 0
                            ? 'Không tìm thấy chứng thư số. Vui lòng kiểm tra USB Token.'
                            : null
                        }
                      >
                        {usbTokenCertificates.map((cert) => (
                          <Select.Option key={cert.thumbprint} value={cert.thumbprint}>
                            <Space orientation="vertical" size={0} style={{ width: '100%' }}>
                              <span style={{ fontWeight: 500 }}>{cert.subjectName}</span>
                              <span style={{ fontSize: 11, color: '#666' }}>
                                Cấp bởi: {cert.issuerName} | HSD: {cert.validTo}
                                {!cert.isValid && <Tag color="red" style={{ marginLeft: 8 }}>Hết hạn</Tag>}
                              </span>
                            </Space>
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  ) : null
                }
              </Form.Item>

              <Alert
                type="info"
                title="Khi nhấn 'Ký số', Windows sẽ tự động bật hộp thoại nhập mã PIN của USB Token"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form.Item
                name="note"
                label="Ghi chú"
              >
                <TextArea rows={2} placeholder="Ghi chú thêm (không bắt buộc)" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* Tag Creation Modal */}
      <Modal
        title="Thêm Tag mới"
        open={isTagModalOpen}
        onCancel={() => {
          setIsTagModalOpen(false);
          tagForm.resetFields();
        }}
        onOk={async () => {
          try {
            const values = await tagForm.validateFields();
            await risApi.saveTag({
              code: values.code,
              name: values.name,
              color: values.color || 'blue',
              description: values.description,
            });
            message.success('Đã tạo tag mới thành công');
            setIsTagModalOpen(false);
            tagForm.resetFields();
            // Refresh tags list
            try {
              const response = await risApi.getTags();
              if (response.data) {
                setTagsData(response.data);
              }
            } catch { /* ignore refresh error */ }
          } catch (error: any) {
            if (error?.errorFields) return; // validation error
            console.error('Save tag error:', error);
            message.error(error?.response?.data?.message || 'Không thể tạo tag');
          }
        }}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={tagForm} layout="vertical">
          <Form.Item name="code" label="Mã tag" rules={[{ required: true, message: 'Vui lòng nhập mã tag' }]}>
            <Input placeholder="Nhập mã tag" />
          </Form.Item>
          <Form.Item name="name" label="Tên tag" rules={[{ required: true, message: 'Vui lòng nhập tên tag' }]}>
            <Input placeholder="Nhập tên tag" />
          </Form.Item>
          <Form.Item name="color" label="Màu sắc">
            <Select placeholder="Chọn màu">
              <Select.Option value="red">Đỏ</Select.Option>
              <Select.Option value="orange">Cam</Select.Option>
              <Select.Option value="blue">Xanh dương</Select.Option>
              <Select.Option value="green">Xanh lá</Select.Option>
              <Select.Option value="purple">Tím</Select.Option>
              <Select.Option value="cyan">Cyan</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <TextArea rows={2} placeholder="Nhập mô tả (không bắt buộc)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>Chi tiết phiếu CĐHA - {selectedRequest?.requestCode}</span>
          </Space>
        }
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={800}
      >
        {selectedRequest && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Mã phiếu">{selectedRequest.requestCode}</Descriptions.Item>
            <Descriptions.Item label="Mã BN">{selectedRequest.patientCode}</Descriptions.Item>
            <Descriptions.Item label="Họ tên BN">{selectedRequest.patientName}</Descriptions.Item>
            <Descriptions.Item label="Giới tính">{selectedRequest.gender === 1 ? 'Nam' : 'Nữ'}</Descriptions.Item>
            <Descriptions.Item label="Ngày sinh">
              {selectedRequest.dateOfBirth ? dayjs(selectedRequest.dateOfBirth).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày chỉ định">
              {dayjs(selectedRequest.requestDate).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Dịch vụ" span={2}>
              <Tag color="blue">{selectedRequest.serviceName}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Vùng chụp">{selectedRequest.bodyPart || '-'}</Descriptions.Item>
            <Descriptions.Item label="Thuốc cản quang">{selectedRequest.contrast ? 'Có' : 'Không'}</Descriptions.Item>
            <Descriptions.Item label="Ưu tiên">
              {selectedRequest.priority === 3 ? <Tag color="red">Cấp cứu</Tag> : selectedRequest.priority === 2 ? <Tag color="orange">Khẩn</Tag> : <Tag color="blue">Bình thường</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {selectedRequest.status}
            </Descriptions.Item>
            <Descriptions.Item label="Khoa chỉ định">{selectedRequest.departmentName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Bác sĩ chỉ định">{selectedRequest.doctorName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Modality">{selectedRequest.modalityName || '-'}</Descriptions.Item>
            <Descriptions.Item label="DICOM UID">{selectedRequest.studyInstanceUID || '-'}</Descriptions.Item>
            <Descriptions.Item label="Thông tin lâm sàng" span={2}>{selectedRequest.clinicalInfo || '-'}</Descriptions.Item>
            {selectedRequest.description && (
              <Descriptions.Item label="Mô tả" span={2}>{selectedRequest.description}</Descriptions.Item>
            )}
            {selectedRequest.conclusion && (
              <Descriptions.Item label="Kết luận" span={2}>{selectedRequest.conclusion}</Descriptions.Item>
            )}
            {selectedRequest.isSigned && (
              <>
                <Descriptions.Item label="Người ký">{selectedRequest.signedBy || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày ký">
                  {selectedRequest.signedAt ? dayjs(selectedRequest.signedAt).format('DD/MM/YYYY HH:mm') : '-'}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Radiology;
