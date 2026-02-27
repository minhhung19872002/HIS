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
  Modal,
  Form,
  Select,
  DatePicker,
  Typography,
  message,
  Tabs,
  Statistic,
  Badge,
  Divider,
  Alert,
  Tooltip,
  Progress,
  Descriptions,
  Spin,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  PrinterOutlined,
  SoundOutlined,
  QrcodeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  IdcardOutlined,
  ReloadOutlined,
  SwapOutlined,
  HistoryOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as receptionApi from '../api/reception';
import BarcodeScanner from '../components/BarcodeScanner';
import WebcamCapture from '../components/WebcamCapture';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const { Title, Text } = Typography;
const { Search } = Input;

interface ReceptionRecord {
  id: string;
  queueNumber: number;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  phoneNumber?: string;
  identityNumber?: string;
  patientType: number;
  insuranceNumber?: string;
  departmentName?: string;
  roomName?: string;
  roomId?: string;
  status: number;
  admissionDate: string;
  address?: string;
  priority?: number;
}

interface RoomStatistics {
  roomId: string;
  roomName: string;
  departmentName: string;
  totalWaiting: number;
  totalServing: number;
  totalCompleted: number;
  currentNumber?: number;
  doctorName?: string;
}

interface InsuranceVerification {
  insuranceNumber: string;
  isValid: boolean;
  patientName?: string;
  dateOfBirth?: string;
  facilityName?: string;
  startDate?: string;
  endDate?: string;
  isExpired: boolean;
  isRightRoute: boolean;
  paymentRate?: number;
  validationMessage?: string;
}

const Reception: React.FC = () => {
  const [data, setData] = useState<ReceptionRecord[]>([]);
  const [roomStats, setRoomStats] = useState<RoomStatistics[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintRequestModalOpen, setIsPrintRequestModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ReceptionRecord | null>(null);
  const [insuranceVerification, setInsuranceVerification] = useState<InsuranceVerification | null>(null);
  const [verifyingInsurance, setVerifyingInsurance] = useState(false);
  const [rooms, setRooms] = useState<receptionApi.RoomOverviewDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [visitHistory, setVisitHistory] = useState<receptionApi.PatientVisitHistoryDto[]>([]);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDate, setFilterDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [allData, setAllData] = useState<ReceptionRecord[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'F2', handler: () => setIsModalOpen(true), description: 'Đăng ký mới' },
    { key: 'F5', handler: () => { fetchRooms(); fetchAdmissions(); }, description: 'Làm mới' },
    { key: 'F7', handler: () => setIsScannerOpen(true), description: 'Quét mã vạch' },
    { key: 'f', ctrl: true, handler: () => document.querySelector<HTMLInputElement>('.ant-input-search input')?.focus(), description: 'Tìm kiếm' },
  ]);

  const [form] = Form.useForm();
  const [verifyForm] = Form.useForm();
  const [printRequestForm] = Form.useForm();

  // Fetch data on mount
  useEffect(() => {
    fetchRooms();
    fetchAdmissions();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      const response = await receptionApi.getRoomOverview();
      if (response.data) {
        setRooms(response.data);
        // Convert to room stats format
        const stats: RoomStatistics[] = response.data.map(r => ({
          roomId: r.roomId,
          roomName: r.roomName,
          departmentName: r.departmentName,
          totalWaiting: r.waitingCount,
          totalServing: r.inProgressCount,
          totalCompleted: r.completedCount,
          currentNumber: undefined,
          doctorName: r.currentDoctorName,
        }));
        setRoomStats(stats);
      }
    } catch (error: any) {
      console.warn('Failed to fetch rooms:', error);
      // If unauthorized, redirect to login
      if (error?.response?.status === 401) {
        message.warning('Phiên làm việc hết hạn. Vui lòng đăng nhập lại.');
      } else {
        message.error('Không thể tải danh sách phòng khám');
      }
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchAdmissions = async (date?: string) => {
    try {
      setLoading(true);
      const response = await receptionApi.getTodayAdmissions(undefined, date);
      if (response.data) {
        // Convert AdmissionDto to ReceptionRecord
        const records: ReceptionRecord[] = response.data.map(a => ({
          id: a.id,
          queueNumber: a.queueNumber,
          patientCode: a.patientCode,
          patientName: a.patientName,
          gender: typeof a.gender === 'number' ? a.gender : (a.gender === 'Nam' ? 1 : 2),
          dateOfBirth: a.dateOfBirth,
          phoneNumber: a.phoneNumber,
          identityNumber: a.identityNumber,
          patientType: a.insuranceNumber ? 1 : 2, // 1=BHYT, 2=Viện phí
          insuranceNumber: a.insuranceNumber,
          departmentName: a.departmentName,
          roomName: a.roomName,
          roomId: a.roomId,
          status: typeof a.status === 'number' ? a.status : 0,
          admissionDate: a.admissionDate,
          address: a.address,
          priority: a.priority,
        }));
        setAllData(records);
        setData(records);
      }
    } catch (error) {
      console.warn('Failed to fetch admissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange">Chờ khám</Tag>;
      case 1:
        return <Tag color="blue">Đang khám</Tag>;
      case 2:
        return <Tag color="cyan">Chờ kết luận</Tag>;
      case 3:
        return <Tag color="green">Hoàn thành</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  const getPatientTypeTag = (type: number) => {
    switch (type) {
      case 1:
        return <Tag color="green">BHYT</Tag>;
      case 2:
        return <Tag color="blue">Viện phí</Tag>;
      case 3:
        return <Tag color="purple">Dịch vụ</Tag>;
      default:
        return <Tag>Khác</Tag>;
    }
  };

  const columns: ColumnsType<ReceptionRecord> = [
    {
      title: 'STT',
      dataIndex: 'queueNumber',
      key: 'queueNumber',
      width: 60,
      align: 'center',
      render: (num) => <strong>{num}</strong>,
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
      width: 180,
    },
    {
      title: 'Giới tính',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (gender) => (gender === 1 ? 'Nam' : gender === 2 ? 'Nữ' : 'Khác'),
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'dateOfBirth',
      key: 'dateOfBirth',
      width: 100,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '',
    },
    {
      title: 'Đối tượng',
      dataIndex: 'patientType',
      key: 'patientType',
      width: 100,
      render: (type) => getPatientTypeTag(type),
    },
    {
      title: 'Số thẻ BHYT',
      dataIndex: 'insuranceNumber',
      key: 'insuranceNumber',
      width: 140,
    },
    {
      title: 'Phòng khám',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 150,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority) => getPriorityTag(priority),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="Gọi số">
            <Button size="small" type="primary" icon={<SoundOutlined />} onClick={() => handleCallNumber(record)}>
              Gọi
            </Button>
          </Tooltip>
          <Tooltip title="Gọi lại">
            <Button size="small" icon={<ReloadOutlined />} onClick={() => handleRecall(record)} />
          </Tooltip>
          <Tooltip title="Bỏ qua">
            <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleSkip(record)} />
          </Tooltip>
          <Tooltip title="Chuyển phòng">
            <Button size="small" icon={<SwapOutlined />} onClick={() => handleTransferRoom(record)} />
          </Tooltip>
          <Tooltip title="Lịch sử khám">
            <Button size="small" icon={<HistoryOutlined />} onClick={() => handleViewHistory(record)} />
          </Tooltip>
          <Tooltip title="In phiếu">
            <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintTicket(record)} />
          </Tooltip>
          <Tooltip title="In giấy yêu cầu">
            <Button size="small" icon={<FileTextOutlined />} onClick={() => handlePrintRequestForm(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // Prepare registration DTO based on patient type
      const patientType = values.patientType;

      if (patientType === 1 && values.insuranceNumber) {
        // BHYT registration
        const dto: receptionApi.InsuranceRegistrationDto = {
          insuranceNumber: values.insuranceNumber,
          roomId: values.roomId,
          identityNumber: values.identityNumber,
        };
        await receptionApi.registerInsurancePatient(dto);
      } else {
        // Fee/Service registration
        const dto: receptionApi.FeeRegistrationDto = {
          newPatient: {
            fullName: values.fullName,
            gender: values.gender,
            dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : undefined,
            phoneNumber: values.phoneNumber,
            address: values.address,
            identityNumber: values.identityNumber,
          },
          serviceType: patientType === 2 ? 2 : 3, // 2: Viện phí, 3: Dịch vụ
          roomId: values.roomId,
        };
        await receptionApi.registerFeePatient(dto);
      }

      message.success('Đăng ký khám thành công!');
      setIsModalOpen(false);
      form.resetFields();
      // Refresh data
      fetchRooms();
      fetchAdmissions();
    } catch (error: any) {
      console.warn('Registration error:', error);
      message.error(error?.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  // Apply filters to data
  const applyFilters = (records: ReceptionRecord[], search: string, status: string) => {
    let filtered = records;
    if (search) {
      const text = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.patientCode?.toLowerCase().includes(text) ||
        r.patientName?.toLowerCase().includes(text) ||
        r.phoneNumber?.toLowerCase().includes(text) ||
        r.identityNumber?.toLowerCase().includes(text)
      );
    }
    if (status !== '') {
      const statusNum = parseInt(status);
      filtered = filtered.filter(r => r.status === statusNum);
    }
    setData(filtered);
  };

  const handleBarcodeScan = useCallback((decodedText: string, format: string) => {
    message.success(`Đã quét: ${decodedText} (${format})`);
    setSearchText(decodedText);
    applyFilters(allData, decodedText, filterStatus);

    // If no match in current list, search by patient code via API
    const found = allData.find(r =>
      r.patientCode === decodedText ||
      r.identityNumber === decodedText ||
      r.insuranceNumber === decodedText
    );
    if (!found) {
      // Try to search patient by scanned code
      receptionApi.searchPatient(decodedText).then((res) => {
        if (res.data && res.data.length > 0) {
          const patient = res.data[0];
          message.info(`Tìm thấy BN: ${patient.fullName || patient.patientName} - ${patient.patientCode}`);
          // Pre-fill registration form
          form.setFieldsValue({
            patientCode: patient.patientCode,
            patientName: patient.fullName || patient.patientName,
            gender: patient.gender,
            dateOfBirth: patient.dateOfBirth ? dayjs(patient.dateOfBirth) : undefined,
            phoneNumber: patient.phoneNumber,
            identityNumber: patient.identityNumber,
            address: patient.address,
            insuranceNumber: patient.insuranceNumber,
          });
          setIsModalOpen(true);
        }
      }).catch(() => {
        // Patient not found - just keep search text
      });
    }
  }, [allData, filterStatus, form]);

  const handleCallNumber = async (record: ReceptionRecord) => {
    try {
      if (record.roomId) {
        await receptionApi.callSpecificQueue(record.id);
        message.success(`Đang gọi số ${record.queueNumber} - ${record.patientName}`);
        fetchAdmissions();
      } else {
        message.warning('Bệnh nhân chưa được phân phòng');
      }
    } catch (error) {
      console.warn('Call queue error:', error);
      message.info(`Gọi số ${record.queueNumber} - ${record.patientName}`);
    }
  };

  const handleRecall = async (record: ReceptionRecord) => {
    try {
      await receptionApi.recallQueue(record.id);
      message.success(`Đã gọi lại số ${record.queueNumber} - ${record.patientName}`);
    } catch (error) {
      console.warn('Recall queue error:', error);
      message.info(`Gọi lại số ${record.queueNumber}`);
    }
  };

  const handleSkip = (record: ReceptionRecord) => {
    Modal.confirm({
      title: 'Bỏ qua số',
      content: `Xác nhận bỏ qua số ${record.queueNumber} - ${record.patientName}?`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await receptionApi.skipQueue(record.id, 'Bỏ qua');
          message.success('Đã bỏ qua số');
          fetchAdmissions();
        } catch (error) {
          console.warn('Skip queue error:', error);
          message.success('Đã bỏ qua số');
        }
      },
    });
  };

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm] = Form.useForm();

  const handleTransferRoom = (record: ReceptionRecord) => {
    setSelectedRecord(record);
    transferForm.setFieldsValue({ currentRoom: record.roomName });
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = async () => {
    try {
      const values = await transferForm.validateFields();
      if (!selectedRecord) return;

      await receptionApi.changeRoom(
        selectedRecord.id,
        values.newRoomId,
        undefined,
        values.reason
      );

      message.success('Chuyển phòng thành công!');
      setIsTransferModalOpen(false);
      transferForm.resetFields();
      fetchAdmissions();
      fetchRooms();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Chuyển phòng thất bại');
    }
  };

  const handlePrintTicket = async (record: ReceptionRecord) => {
    try {
      message.loading('Đang in phiếu khám...', 1);

      // Fetch estimated wait time and CLS locations
      let estimatedWait = 0;
      let clsSteps: { roomName: string; building?: string; floor?: string; services: string[]; estimatedWaitMinutes: number }[] = [];
      try {
        const pathRes = await receptionApi.calculateOptimalPath(record.id);
        if (pathRes.data) {
          estimatedWait = pathRes.data.totalEstimatedMinutes || 0;
          clsSteps = pathRes.data.steps || [];
        }
      } catch {
        // Fallback: no CLS data available
      }

      const priorityLabel = record.priority === 2 ? '<div class="priority emergency">CẤP CỨU</div>' :
        record.priority === 1 ? '<div class="priority urgent">ƯU TIÊN</div>' : '';

      const clsSection = clsSteps.length > 0 ? `
        <div class="cls-section">
          <h3>HƯỚNG DẪN ĐI KHÁM</h3>
          <table class="cls-table">
            <tr><th>STT</th><th>Phòng</th><th>Vị trí</th><th>Chờ ~</th></tr>
            ${clsSteps.map((step, i) => {
              const loc = [step.building ? `Tòa ${step.building}` : '', step.floor ? `Tầng ${step.floor}` : ''].filter(Boolean).join(', ');
              return `<tr><td>${i + 1}</td><td>${step.roomName}</td><td>${loc || '-'}</td><td>${step.estimatedWaitMinutes} phút</td></tr>`;
            }).join('')}
          </table>
        </div>` : '';

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Phiếu khám bệnh - ${record.patientCode}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 15px; }
                .info { margin: 6px 0; font-size: 13px; }
                .queue-number { font-size: 56px; font-weight: bold; text-align: center; margin: 10px 0; }
                .room { font-size: 22px; text-align: center; color: #1890ff; margin-bottom: 8px; }
                .wait-time { text-align: center; font-size: 16px; color: #52c41a; font-weight: bold; margin: 8px 0; padding: 6px; border: 1px dashed #52c41a; border-radius: 4px; }
                .priority { text-align: center; font-size: 18px; font-weight: bold; padding: 4px; margin: 6px 0; border-radius: 4px; }
                .priority.emergency { background: #ff4d4f; color: white; }
                .priority.urgent { background: #fa8c16; color: white; }
                .cls-section { margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px; }
                .cls-section h3 { text-align: center; font-size: 14px; margin-bottom: 8px; }
                .cls-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                .cls-table th, .cls-table td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
                .cls-table th { background: #f5f5f5; font-weight: bold; }
                .footer { text-align: center; font-size: 10px; color: #999; margin-top: 15px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>PHIẾU KHÁM BỆNH</h2>
                <p>Ngày: ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
              </div>
              ${priorityLabel}
              <div class="queue-number">${record.queueNumber}</div>
              <div class="room">${record.roomName || 'Chưa phân phòng'}</div>
              <div class="wait-time">Thời gian chờ ước tính: ~${estimatedWait > 0 ? estimatedWait + ' phút' : 'Không chờ'}</div>
              <div class="info"><strong>Mã BN:</strong> ${record.patientCode}</div>
              <div class="info"><strong>Họ tên:</strong> ${record.patientName}</div>
              <div class="info"><strong>Giới tính:</strong> ${record.gender === 1 ? 'Nam' : 'Nữ'}</div>
              <div class="info"><strong>Ngày sinh:</strong> ${record.dateOfBirth ? dayjs(record.dateOfBirth).format('DD/MM/YYYY') : '-'}</div>
              <div class="info"><strong>Loại khám:</strong> ${record.patientType === 1 ? 'BHYT' : record.patientType === 2 ? 'Viện phí' : 'Dịch vụ'}</div>
              ${record.insuranceNumber ? `<div class="info"><strong>Số BHYT:</strong> ${record.insuranceNumber}</div>` : ''}
              ${clsSection}
              <div class="footer">Vui lòng chờ gọi số tại phòng khám. Xin cảm ơn!</div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (error) {
      message.error('Không thể in phiếu khám');
    }
  };

  const handleViewHistory = async (record: ReceptionRecord) => {
    setSelectedRecord(record);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      // Use the patient's id to fetch visit history
      const response = await receptionApi.getPatientVisitHistory(record.id, 10);
      if (response.data) {
        setVisitHistory(response.data);
      }
    } catch (error) {
      console.warn('Failed to fetch visit history:', error);
      setVisitHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle print request-based examination form (Giấy khám chữa bệnh theo yêu cầu MS: 03/BV-02)
  const handlePrintRequestForm = (record: ReceptionRecord) => {
    setSelectedRecord(record);
    printRequestForm.setFieldsValue({
      patientName: record.patientName,
      age: record.dateOfBirth ? dayjs().diff(dayjs(record.dateOfBirth), 'year') : '',
      gender: record.gender === 1 ? 'Nam' : 'Nữ',
      identityNumber: record.identityNumber,
      address: record.address,
      roomName: record.roomName,
    });
    setIsPrintRequestModalOpen(true);
  };

  const executePrintRequestForm = () => {
    const formValues = printRequestForm.getFieldsValue();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Giấy khám chữa bệnh theo yêu cầu</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; padding: 30px 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .header-left { width: 30%; }
          .header-center { width: 40%; text-align: center; }
          .header-right { width: 30%; text-align: right; font-size: 12px; }
          .title { font-size: 16px; font-weight: bold; text-align: center; margin: 20px 0 30px 0; }
          .subtitle { font-style: italic; text-align: center; margin-bottom: 20px; }
          .field { border-bottom: 1px dotted #000; min-width: 150px; display: inline-block; padding: 0 5px; }
          .field-long { border-bottom: 1px dotted #000; width: 100%; display: block; min-height: 20px; }
          .row { margin: 10px 0; }
          .indent { margin-left: 20px; }
          .section { margin: 15px 0; }
          .checkbox { width: 14px; height: 14px; border: 1px solid #000; display: inline-block; margin-right: 5px; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 40px; }
          .signature-box { text-align: center; width: 40%; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            Sở Y tế: <span class="field">${formValues.healthDepartment || '.....................'}</span><br/>
            BV: <span class="field">${formValues.hospitalName || '.....................'}</span>
          </div>
          <div class="header-center">
            <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
            <strong>Độc lập - Tự do - Hạnh phúc</strong><br/>
            <span>-----------------------------------------</span>
          </div>
          <div class="header-right">
            MS: 03/BV-02<br/>
            Số: <span class="field">${formValues.formNumber || '............'}</span>
          </div>
        </div>

        <div class="title">Giấy khám chữa bệnh theo yêu cầu</div>

        <div class="subtitle">Kính gửi: <span class="field">${formValues.recipient || '......................................................'}</span></div>

        <div class="section">
          <div class="row">- Tên tôi là: <span class="field">${formValues.patientName || ''}</span> Tuổi: <span class="field">${formValues.age || ''}</span> Nam/Nữ: <span class="field">${formValues.gender || ''}</span></div>
          <div class="row">- CMND/Hộ chiếu/Hộ khẩu số: <span class="field">${formValues.identityNumber || ''}</span> Cơ quan cấp: <span class="field">${formValues.issuingAuthority || ''}</span></div>
          <div class="row">- Dân tộc: <span class="field">${formValues.ethnicity || ''}</span> Ngoại kiều: <span class="field">${formValues.nationality || ''}</span></div>
          <div class="row">- Nghề nghiệp: <span class="field">${formValues.occupation || ''}</span> Nơi làm việc: <span class="field">${formValues.workplace || ''}</span></div>
          <div class="row">- Địa chỉ: <span class="field" style="width: 80%">${formValues.address || ''}</span></div>
          <div class="row">- Khi cần báo tin: <span class="field" style="width: 70%">${formValues.emergencyContact || ''}</span></div>
          <div class="row">- Là người bệnh/đại diện gia đình người bệnh họ tên là: <span class="field">${formValues.representativeName || ''}</span></div>
          <div class="row">Hiện đang khám/chữa bệnh tại Khoa: <span class="field">${formValues.roomName || ''}</span> Bệnh viện: <span class="field">${formValues.hospitalName || ''}</span></div>
        </div>

        <div class="section">
          <p><strong>1. Sau khi nghe bác sĩ phổ biến quy định khám/chữa bệnh theo yêu cầu của bệnh viện, tôi viết giấy này thỏa thuận xin khám/chữa bệnh theo yêu cầu và chọn dịch vụ chăm sóc như sau:</strong></p>
          <div class="indent">
            <div class="row">a. Bác sĩ khám/chữa bệnh/phẫu thuật/đỡ đẻ/chăm sóc: <span class="field">${formValues.requestedDoctor || ''}</span></div>
            <div class="row">b. <span class="checkbox"></span> Y tá (điều dưỡng) chăm sóc theo chế độ bệnh lý tại giường.</div>
            <div class="row">c. <span class="checkbox"></span> Được dùng thuốc theo chỉ định của bác sĩ điều trị</div>
            <div class="row">d. Được nằm chữa bệnh tại buồng loại: <span class="field">${formValues.roomType || ''}</span>, có tiện nghi: điều hòa nhiệt độ, tủ lạnh, nước nóng lạnh, buồng vệ sinh riêng.</div>
          </div>
        </div>

        <div class="section">
          <p><strong>2. Tôi xin ứng trước một khoản tiền theo quy định của bệnh viện là:</strong> <span class="field">${formValues.depositAmount || ''}</span> đồng,</p>
          <p>(bằng chữ): <span class="field" style="width: 80%">${formValues.depositAmountInWords || ''}</span></p>
          <p>để khám/chữa bệnh theo yêu cầu; khi ra viện tôi xin thanh toán đầy đủ.</p>
        </div>

        <div class="section">
          <p><strong>3.</strong> Trong khi thực hiện khám/chữa bệnh theo yêu cầu, nếu có vấn đề phát sinh đề nghị bác sĩ thông báo cho tôi/gia đình tôi biết để tiện thanh toán kịp thời.</p>
        </div>

        <div class="section">
          <p><strong>4.</strong> Tôi xin chấp hành đầy đủ nội quy khám/chữa bệnh của bệnh viện, yên tâm chữa bệnh và chịu trách nhiệm về những yêu cầu khám/chữa bệnh của tôi.</p>
        </div>

        <div class="signature-row">
          <div class="signature-box">
            <p>Duyệt của</p>
            <p><strong>Giám đốc bệnh viện</strong></p>
            <br/><br/><br/>
            <p>Họ tên: ................................</p>
          </div>
          <div class="signature-box">
            <p>Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</p>
            <p><strong>Người bệnh/đại diện gia đình</strong></p>
            <br/><br/><br/>
            <p>Họ tên: ................................</p>
          </div>
        </div>

      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
    setIsPrintRequestModalOpen(false);
  };

  const handleVerifyInsurance = async () => {
    try {
      const values = await verifyForm.validateFields();
      setVerifyingInsurance(true);

      const response = await receptionApi.verifyInsurance({
        insuranceNumber: values.insuranceNumber,
      });

      if (response.data) {
        const result = response.data;
        const verification: InsuranceVerification = {
          insuranceNumber: result.insuranceNumber,
          isValid: result.isValid,
          patientName: result.patientName,
          dateOfBirth: result.dateOfBirth,
          facilityName: result.facilityName,
          startDate: result.startDate,
          endDate: result.endDate,
          isExpired: result.isExpired,
          isRightRoute: result.rightRoute === 1,
          paymentRate: result.paymentRate,
          validationMessage: result.isValid ? 'Thẻ BHYT hợp lệ' : result.errorMessage,
        };
        setInsuranceVerification(verification);
        if (result.isValid) {
          message.success('Xác minh thẻ BHYT thành công!');
        } else {
          message.warning(result.errorMessage || 'Thẻ BHYT không hợp lệ');
        }
      }
    } catch (error: any) {
      console.warn('Insurance verification error:', error);
      message.error(error?.response?.data?.message || 'Không thể xác minh thẻ BHYT');
    } finally {
      setVerifyingInsurance(false);
    }
  };

  const getPriorityTag = (priority?: number) => {
    switch (priority) {
      case 1:
        return <Tag color="gold">Ưu tiên</Tag>;
      case 2:
        return <Tag color="red">Cấp cứu</Tag>;
      default:
        return null;
    }
  };

  return (
    <div>
      <Title level={4}>Tiếp đón bệnh nhân</Title>

      {/* Thống kê tổng quan */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng BN hôm nay"
              value={data.length}
              prefix={<UserOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đang chờ khám"
              value={data.filter(d => d.status === 0).length}
              prefix={<Badge status="warning" />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đang khám"
              value={data.filter(d => d.status === 1).length}
              prefix={<Badge status="processing" />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Hoàn thành"
              value={data.filter(d => d.status === 3).length}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          items={[
            {
              key: 'list',
              label: 'Danh sách tiếp đón',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Space>
                        <Search
                          placeholder="Tìm theo mã BN, tên, SĐT, CCCD..."
                          allowClear
                          enterButton={<SearchOutlined />}
                          style={{ width: 350 }}
                          value={searchText}
                          onSearch={(value) => {
                            setSearchText(value);
                            applyFilters(allData, value, filterStatus);
                          }}
                          onChange={(e) => {
                            setSearchText(e.target.value);
                            if (!e.target.value) {
                              applyFilters(allData, '', filterStatus);
                            }
                          }}
                        />
                        <Tooltip title="Quét mã vạch / QR Code">
                          <Button icon={<ScanOutlined />} onClick={() => setIsScannerOpen(true)} />
                        </Tooltip>
                        <Select
                          defaultValue=""
                          style={{ width: 180 }}
                          placeholder="Phòng khám"
                          loading={loadingRooms}
                          notFoundContent={loadingRooms ? <Spin size="small" /> : (rooms.length === 0 ? 'Không có dữ liệu' : undefined)}
                          onChange={(roomId) => {
                            if (roomId) {
                              const filtered = allData.filter(p => p.roomId === roomId);
                              setData(filtered);
                            } else {
                              applyFilters(allData, searchText, filterStatus);
                            }
                          }}
                        >
                          <Select.Option value="">Tất cả phòng</Select.Option>
                          {rooms.map(room => (
                            <Select.Option key={room.roomId} value={room.roomId}>
                              {room.roomName}
                            </Select.Option>
                          ))}
                        </Select>
                        <Select
                          defaultValue=""
                          style={{ width: 120 }}
                          placeholder="Trạng thái"
                          onChange={(value) => {
                            setFilterStatus(value);
                            applyFilters(allData, searchText, value);
                          }}
                        >
                          <Select.Option value="">Tất cả</Select.Option>
                          <Select.Option value="0">Chờ khám</Select.Option>
                          <Select.Option value="1">Đang khám</Select.Option>
                          <Select.Option value="2">Chờ kết luận</Select.Option>
                          <Select.Option value="3">Hoàn thành</Select.Option>
                        </Select>
                        <DatePicker
                          defaultValue={dayjs()}
                          format="DD/MM/YYYY"
                          onChange={(date) => {
                            setFilterDate(date);
                            if (date) {
                              fetchAdmissions(date.format('YYYY-MM-DD'));
                            } else {
                              fetchAdmissions();
                            }
                          }}
                        />
                      </Space>
                    </Col>
                    <Col>
                      <Space>
                        <Button icon={<QrcodeOutlined />} onClick={() => setIsVerifyModalOpen(true)}>
                          Tra cứu BHYT
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                          Đăng ký khám
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    size="small"
                    loading={loading}
                    scroll={{ x: 1500 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} bệnh nhân`,
                    }}
                    rowClassName={(record) =>
                      record.priority === 2 ? 'emergency-row' : record.priority === 1 ? 'priority-row' : ''
                    }
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedRecord(record);
                        setIsDetailModalOpen(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'stats',
              label: 'Thống kê phòng khám',
              children: (
                <Row gutter={[16, 16]}>
                  {roomStats.map((room) => (
                    <Col span={8} key={room.roomId}>
                      <Card
                        title={
                          <Space>
                            <Badge status={room.totalServing > 0 ? 'processing' : 'default'} />
                            {room.roomName}
                          </Space>
                        }
                        extra={<Tag color="blue">{room.departmentName}</Tag>}
                      >
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="Bác sĩ">{room.doctorName}</Descriptions.Item>
                          <Descriptions.Item label="Số hiện tại">
                            <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                              {room.currentNumber}
                            </Text>
                          </Descriptions.Item>
                        </Descriptions>
                        <Divider style={{ margin: '12px 0' }} />
                        <Row gutter={8}>
                          <Col span={8}>
                            <Statistic title="Chờ" value={room.totalWaiting} styles={{ content: { color: '#faad14' } }} />
                          </Col>
                          <Col span={8}>
                            <Statistic title="Đang khám" value={room.totalServing} styles={{ content: { color: '#1890ff' } }} />
                          </Col>
                          <Col span={8}>
                            <Statistic title="Hoàn thành" value={room.totalCompleted} styles={{ content: { color: '#52c41a' } }} />
                          </Col>
                        </Row>
                        <Progress
                          percent={Math.round((room.totalCompleted / (room.totalWaiting + room.totalServing + room.totalCompleted)) * 100)}
                          size="small"
                          style={{ marginTop: 12 }}
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal Tra cứu BHYT */}
      <Modal
        title={
          <Space>
            <IdcardOutlined />
            Tra cứu thẻ BHYT
          </Space>
        }
        open={isVerifyModalOpen}
        onCancel={() => {
          setIsVerifyModalOpen(false);
          setInsuranceVerification(null);
          verifyForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={verifyForm} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="insuranceNumber"
                label="Số thẻ BHYT"
                rules={[{ required: true, message: 'Vui lòng nhập số thẻ BHYT' }]}
              >
                <Input placeholder="Nhập số thẻ BHYT (15 ký tự)" maxLength={15} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label=" ">
                <Button type="primary" onClick={handleVerifyInsurance} loading={verifyingInsurance} block>
                  Tra cứu
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {insuranceVerification && (
          <>
            <Divider />
            <Alert
              title={insuranceVerification.isValid ? 'Thẻ BHYT hợp lệ' : 'Thẻ BHYT không hợp lệ'}
              type={insuranceVerification.isValid ? 'success' : 'error'}
              showIcon
              icon={insuranceVerification.isValid ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              style={{ marginBottom: 16 }}
            />
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Số thẻ" span={2}>
                <Text strong>{insuranceVerification.insuranceNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Họ tên">{insuranceVerification.patientName}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">
                {insuranceVerification.dateOfBirth ? dayjs(insuranceVerification.dateOfBirth).format('DD/MM/YYYY') : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Nơi ĐKKCB BĐ" span={2}>
                {insuranceVerification.facilityName}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày bắt đầu">
                {insuranceVerification.startDate ? dayjs(insuranceVerification.startDate).format('DD/MM/YYYY') : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày kết thúc">
                {insuranceVerification.endDate ? dayjs(insuranceVerification.endDate).format('DD/MM/YYYY') : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Đúng tuyến">
                {insuranceVerification.isRightRoute ? (
                  <Tag color="green">Đúng tuyến</Tag>
                ) : (
                  <Tag color="orange">Trái tuyến</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Tỷ lệ thanh toán">
                <Text strong style={{ color: '#1890ff' }}>{insuranceVerification.paymentRate}%</Text>
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Button
                type="primary"
                onClick={() => {
                  form.setFieldsValue({
                    insuranceNumber: insuranceVerification.insuranceNumber,
                    patientType: 1,
                  });
                  setIsVerifyModalOpen(false);
                  setIsModalOpen(true);
                }}
              >
                Sử dụng thông tin này
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Modal Lịch sử khám */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            Lịch sử khám bệnh - {selectedRecord?.patientName}
          </Space>
        }
        open={isHistoryModalOpen}
        onCancel={() => {
          setIsHistoryModalOpen(false);
          setVisitHistory([]);
        }}
        footer={null}
        width={800}
      >
        <Spin spinning={loadingHistory}>
          <Table
            size="small"
            columns={[
              {
                title: 'Ngày khám',
                dataIndex: 'visitDate',
                key: 'visitDate',
                render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
              },
              { title: 'Phòng khám', dataIndex: 'roomName', key: 'roomName' },
              { title: 'Bác sĩ', dataIndex: 'doctorName', key: 'doctorName' },
              { title: 'Chẩn đoán', dataIndex: 'diagnosisName', key: 'diagnosisName' },
              {
                title: 'Kết quả',
                dataIndex: 'treatmentResult',
                key: 'treatmentResult',
                render: (result: string) => result ? <Tag color="green">{result}</Tag> : <Tag color="blue">Hoàn thành</Tag>,
              },
            ]}
            dataSource={visitHistory.map((v, idx) => ({ ...v, key: v.medicalRecordId || idx }))}
            locale={{ emptyText: <Empty description="Không có lịch sử khám bệnh" /> }}
            pagination={false}
          />
        </Spin>
      </Modal>

      {/* Modal Chi tiết bệnh nhân */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            Chi tiết bệnh nhân - {selectedRecord?.patientName}
          </Space>
        }
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="history" icon={<HistoryOutlined />} onClick={() => {
            setIsDetailModalOpen(false);
            setIsHistoryModalOpen(true);
          }}>
            Lịch sử khám
          </Button>,
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={700}
      >
        {selectedRecord && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Số thứ tự" span={1}>
              <Text strong style={{ fontSize: 18 }}>{selectedRecord.queueNumber}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Mã BN" span={1}>
              <Text strong>{selectedRecord.patientCode}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Họ tên" span={2}>
              {selectedRecord.patientName}
            </Descriptions.Item>
            <Descriptions.Item label="Giới tính" span={1}>
              {selectedRecord.gender === 1 ? 'Nam' : selectedRecord.gender === 2 ? 'Nữ' : 'Khác'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày sinh" span={1}>
              {selectedRecord.dateOfBirth ? dayjs(selectedRecord.dateOfBirth).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="SĐT" span={1}>
              {selectedRecord.phoneNumber || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="CMND/CCCD" span={1}>
              {selectedRecord.identityNumber || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ" span={2}>
              {selectedRecord.address || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Loại khám" span={1}>
              {selectedRecord.patientType === 1 ? (
                <Tag color="green">BHYT</Tag>
              ) : selectedRecord.patientType === 2 ? (
                <Tag color="blue">Viện phí</Tag>
              ) : (
                <Tag color="purple">Dịch vụ</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Số BHYT" span={1}>
              {selectedRecord.insuranceNumber || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Phòng khám" span={1}>
              {selectedRecord.roomName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Khoa" span={1}>
              {selectedRecord.departmentName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái" span={1}>
              {selectedRecord.status === 0 ? (
                <Tag color="orange">Chờ khám</Tag>
              ) : selectedRecord.status === 1 ? (
                <Tag color="blue">Đang khám</Tag>
              ) : selectedRecord.status === 2 ? (
                <Tag color="cyan">Chờ kết quả</Tag>
              ) : (
                <Tag color="green">Hoàn thành</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày đăng ký" span={1}>
              {dayjs(selectedRecord.admissionDate).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Modal Đăng ký khám */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            Đăng ký khám bệnh
          </Space>
        }
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => setIsModalOpen(false)}
        width={900}
        okText="Đăng ký"
        cancelText="Hủy"
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={18}>
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    name="fullName"
                    label="Họ tên"
                    rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                  >
                    <Input placeholder="Nhập họ tên bệnh nhân" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="gender"
                    label="Giới tính"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Chọn">
                      <Select.Option value={1}>Nam</Select.Option>
                      <Select.Option value={2}>Nữ</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="dateOfBirth" label="Ngày sinh">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phoneNumber" label="Số điện thoại">
                    <Input placeholder="Nhập SĐT" />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
            <Col span={6}>
              <Form.Item name="photo" label="Ảnh bệnh nhân">
                <WebcamCapture width={140} height={170} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="identityNumber" label="CCCD/CMND">
                <Input placeholder="Nhập số CCCD" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="patientType"
                label="Đối tượng"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn đối tượng">
                  <Select.Option value={1}>BHYT</Select.Option>
                  <Select.Option value={2}>Viện phí</Select.Option>
                  <Select.Option value={3}>Dịch vụ</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="email" label="Email">
                <Input placeholder="Nhập email" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="insuranceNumber" label="Số thẻ BHYT">
                <Input placeholder="Nhập số thẻ BHYT" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="roomId"
                label="Phòng khám"
                rules={[{ required: true, message: 'Vui lòng chọn phòng khám' }]}
              >
                <Select
                  placeholder="Chọn phòng khám"
                  loading={loadingRooms}
                  notFoundContent={loadingRooms ? <Spin size="small" /> : 'Không có dữ liệu'}
                >
                  {rooms.map(room => (
                    <Select.Option key={room.roomId} value={room.roomId}>
                      {room.roomName} - {room.departmentName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={2} placeholder="Nhập địa chỉ" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Chuyển phòng */}
      <Modal
        title={
          <Space>
            <SwapOutlined />
            Chuyển phòng khám - {selectedRecord?.patientName}
          </Space>
        }
        open={isTransferModalOpen}
        onOk={handleTransferSubmit}
        onCancel={() => {
          setIsTransferModalOpen(false);
          transferForm.resetFields();
        }}
        okText="Chuyển phòng"
        cancelText="Hủy"
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item name="currentRoom" label="Phòng hiện tại">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="newRoomId"
            label="Phòng mới"
            rules={[{ required: true, message: 'Vui lòng chọn phòng mới' }]}
          >
            <Select
              placeholder="Chọn phòng khám mới"
              loading={loadingRooms}
              notFoundContent={loadingRooms ? <Spin size="small" /> : 'Không có dữ liệu'}
            >
              {rooms
                .filter(room => room.roomId !== selectedRecord?.roomId)
                .map(room => (
                  <Select.Option key={room.roomId} value={room.roomId}>
                    {room.roomName} - {room.departmentName} (Chờ: {room.waitingCount})
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="Lý do chuyển">
            <Input.TextArea rows={2} placeholder="Nhập lý do chuyển phòng (không bắt buộc)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Print Request-based Examination Form Modal (MS: 03/BV-02) */}
      <Modal
        title="In Giấy khám chữa bệnh theo yêu cầu (MS: 03/BV-02)"
        open={isPrintRequestModalOpen}
        onCancel={() => {
          setIsPrintRequestModalOpen(false);
          printRequestForm.resetFields();
        }}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setIsPrintRequestModalOpen(false)}>
            Hủy
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={executePrintRequestForm}>
            In giấy yêu cầu
          </Button>,
        ]}
      >
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
          <Form form={printRequestForm} layout="vertical">
            <Alert
              title="Giấy khám chữa bệnh theo yêu cầu dành cho bệnh nhân dịch vụ, yêu cầu bác sĩ/buồng bệnh cụ thể"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="hospitalName" label="Bệnh viện">
                  <Input placeholder="Tên bệnh viện" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="healthDepartment" label="Sở Y tế">
                  <Input placeholder="Tên Sở Y tế" />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Thông tin người bệnh</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="patientName" label="Họ tên">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="age" label="Tuổi">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="gender" label="Giới tính">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="identityNumber" label="CMND/CCCD">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="issuingAuthority" label="Cơ quan cấp">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="ethnicity" label="Dân tộc">
                  <Input placeholder="Kinh" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="nationality" label="Ngoại kiều">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="occupation" label="Nghề nghiệp">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="workplace" label="Nơi làm việc">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="address" label="Địa chỉ">
              <Input />
            </Form.Item>
            <Form.Item name="emergencyContact" label="Khi cần báo tin">
              <Input placeholder="Họ tên, số điện thoại người thân" />
            </Form.Item>

            <Divider>Yêu cầu dịch vụ</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="roomName" label="Khám tại Khoa/Phòng">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="requestedDoctor" label="Bác sĩ yêu cầu">
                  <Input placeholder="Tên bác sĩ muốn khám" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="roomType" label="Loại buồng bệnh (nếu nằm viện)">
              <Select placeholder="Chọn loại buồng">
                <Select.Option value="VIP">VIP - Phòng riêng</Select.Option>
                <Select.Option value="A">Loại A - 2 giường</Select.Option>
                <Select.Option value="B">Loại B - 4 giường</Select.Option>
                <Select.Option value="">Không yêu cầu</Select.Option>
              </Select>
            </Form.Item>

            <Divider>Thanh toán</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="depositAmount" label="Số tiền tạm ứng (đồng)">
                  <Input type="number" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="depositAmountInWords" label="Bằng chữ">
                  <Input placeholder="Ví dụ: Một triệu đồng" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>

      {/* Barcode/QR Scanner */}
      <BarcodeScanner
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
        title="Quét mã vạch / QR Code bệnh nhân"
      />
    </div>
  );
};

export default Reception;
