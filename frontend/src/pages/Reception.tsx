import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  Button,
  Input,
  Tag,
  Modal,
  Form,
  Select,
  DatePicker,
  message,
  Tabs,
  Spin,
  Tooltip,
  Card,
  Row,
  Col,
  Statistic,
  Badge,
  Space,
  Typography,
  Progress,
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
  SafetyCertificateOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import * as receptionApi from '../api/reception';
import * as insuranceApi from '../api/insurance';
import BarcodeScanner from '../components/BarcodeScanner';
import WebcamCapture from '../components/WebcamCapture';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const { Search } = Input;
const { Title, Text } = Typography;

/* ------------------------------------------------------------------ */
/*  Inline helper: animated number counter                            */
/* ------------------------------------------------------------------ */
const NumberTicker = ({ value, duration = 1000 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
      else ref.current = value;
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <>{display.toLocaleString('vi-VN')}</>;
};

/* ------------------------------------------------------------------ */
/*  Glass + KPI styles                                                */
/* ------------------------------------------------------------------ */
const glassStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.8)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.5)',
};
const kpiGlassStyle: React.CSSProperties = {
  ...glassStyle,
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
};

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

type ApiLikeError = {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiLikeError;
    const message = apiError.response?.data?.message;
    if (message) return message;
  }
  return fallback;
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    return (error as ApiLikeError).response?.status;
  }
  return undefined;
}

function unwrapResponseData<T>(result: T | { data?: T }): T {
  if (typeof result === 'object' && result !== null && 'data' in result) {
    const data = (result as { data?: T }).data;
    if (data !== undefined) return data;
  }
  return result as T;
}

// Vietnamese CCCD province codes
const CCCD_PROVINCES: Record<string, string> = {
  '001': 'Ha Noi', '002': 'Ha Giang', '004': 'Cao Bang', '006': 'Bac Kan',
  '008': 'Tuyen Quang', '010': 'Lao Cai', '011': 'Dien Bien', '012': 'Lai Chau',
  '014': 'Son La', '015': 'Yen Bai', '017': 'Hoa Binh', '019': 'Thai Nguyen',
  '020': 'Lang Son', '022': 'Quang Ninh', '024': 'Bac Giang', '025': 'Phu Tho',
  '026': 'Vinh Phuc', '027': 'Bac Ninh', '030': 'Hai Duong', '031': 'Hai Phong',
  '033': 'Hung Yen', '034': 'Thai Binh', '035': 'Ha Nam', '036': 'Nam Dinh',
  '037': 'Ninh Binh', '038': 'Thanh Hoa', '040': 'Nghe An', '042': 'Ha Tinh',
  '044': 'Quang Binh', '045': 'Quang Tri', '046': 'Thua Thien Hue', '048': 'Da Nang',
  '049': 'Quang Nam', '051': 'Quang Ngai', '052': 'Binh Dinh', '054': 'Phu Yen',
  '056': 'Khanh Hoa', '058': 'Ninh Thuan', '060': 'Binh Thuan', '062': 'Kon Tum',
  '064': 'Gia Lai', '066': 'Dak Lak', '067': 'Dak Nong', '068': 'Lam Dong',
  '070': 'Binh Phuoc', '072': 'Tay Ninh', '074': 'Binh Duong', '075': 'Dong Nai',
  '077': 'Ba Ria - Vung Tau', '079': 'TP. Ho Chi Minh', '080': 'Long An',
  '082': 'Tien Giang', '083': 'Ben Tre', '084': 'Tra Vinh', '086': 'Vinh Long',
  '087': 'Dong Thap', '089': 'An Giang', '091': 'Kien Giang', '092': 'Can Tho',
  '093': 'Hau Giang', '094': 'Soc Trang', '095': 'Bac Lieu', '096': 'Ca Mau',
};

const validateCccd = (value: string): { valid: boolean; error?: string; province?: string } => {
  if (!value) return { valid: true }; // optional field
  const cleaned = value.replace(/\s/g, '');
  if (!/^\d{12}$/.test(cleaned)) return { valid: false, error: 'CCCD phai co dung 12 chu so' };
  const provinceCode = cleaned.substring(0, 3);
  const province = CCCD_PROVINCES[provinceCode];
  if (!province) return { valid: false, error: `Ma tinh/thanh '${provinceCode}' khong hop le` };
  return { valid: true, province };
};

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

  // Inline insurance verification in registration form
  const [inlineCardVerification, setInlineCardVerification] = useState<insuranceApi.InsuranceCardVerificationDto | null>(null);
  const [inlineVerifyLoading, setInlineVerifyLoading] = useState(false);
  const [inlineVerifyStatus, setInlineVerifyStatus] = useState<'none' | 'valid' | 'invalid' | 'error'>('none');
  const [isInsuranceHistoryModalOpen, setIsInsuranceHistoryModalOpen] = useState(false);
  const [bhxhHistory, setBhxhHistory] = useState<insuranceApi.InsuranceHistoryDto | null>(null);
  const [bhxhHistoryLoading, setBhxhHistoryLoading] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'F2', handler: () => setIsModalOpen(true), description: 'Dang ky moi' },
    { key: 'F5', handler: () => { fetchRooms(); fetchAdmissions(); }, description: 'Lam moi' },
    { key: 'F7', handler: () => setIsScannerOpen(true), description: 'Quet ma vach' },
    { key: 'f', ctrl: true, handler: () => document.querySelector<HTMLInputElement>('.ant-input-search input')?.focus(), description: 'Tim kiem' },
  ]);

  const [form] = Form.useForm();
  const [verifyForm] = Form.useForm();
  const [printRequestForm] = Form.useForm();
  const watchedIdentityNumber = Form.useWatch('identityNumber', form);

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
    } catch (error) {
      console.warn('Failed to fetch rooms:', error);
      // If unauthorized, redirect to login
      if (getErrorStatus(error) === 401) {
        message.warning('Phien lam viec het han. Vui long dang nhap lai.');
      } else {
        message.warning('Khong the tai danh sach phong kham');
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
          patientType: a.insuranceNumber ? 1 : 2, // 1=BHYT, 2=Vien phi
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
    const styles: Record<number, string> = {
      0: 'bg-amber-50 text-amber-700 border border-amber-200',
      1: 'bg-blue-50 text-blue-700 border border-blue-200',
      2: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
      3: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
    const labels: Record<number, string> = { 0: 'Cho kham', 1: 'Dang kham', 2: 'Cho ket luan', 3: 'Hoan thanh' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
        {labels[status] || 'Khong xac dinh'}
      </span>
    );
  };

  const getPatientTypeTag = (type: number) => {
    const styles: Record<number, string> = {
      1: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      2: 'bg-blue-50 text-blue-700 border border-blue-200',
      3: 'bg-purple-50 text-purple-700 border border-purple-200',
    };
    const labels: Record<number, string> = { 1: 'BHYT', 2: 'Vien phi', 3: 'Dich vu' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
        {labels[type] || 'Khac'}
      </span>
    );
  };

  const getPriorityTag = (priority?: number) => {
    if (priority === 1) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Uu tien</span>;
    if (priority === 2) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">Cap cuu</span>;
    return null;
  };

  const columns: ColumnsType<ReceptionRecord> = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_: unknown, _record: ReceptionRecord, index: number) => <strong>{index + 1}</strong>,
    },
    {
      title: 'Ma BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 120,
    },
    {
      title: 'Ho ten',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 180,
    },
    {
      title: 'Gioi tinh',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (gender) => (gender === 1 ? 'Nam' : gender === 2 ? 'Nu' : 'Khac'),
    },
    {
      title: 'Ngay sinh',
      dataIndex: 'dateOfBirth',
      key: 'dateOfBirth',
      width: 100,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '',
    },
    {
      title: 'Doi tuong',
      dataIndex: 'patientType',
      key: 'patientType',
      width: 100,
      render: (type) => getPatientTypeTag(type),
    },
    {
      title: 'So the BHYT',
      dataIndex: 'insuranceNumber',
      key: 'insuranceNumber',
      width: 140,
    },
    {
      title: 'Phong kham',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 150,
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Uu tien',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority) => getPriorityTag(priority),
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      render: (_, record) => (
        <div className="flex items-center gap-1 flex-wrap">
          <Tooltip title="Goi so">
            <Button size="small" type="primary" icon={<SoundOutlined />} onClick={() => handleCallNumber(record)}>
              Goi
            </Button>
          </Tooltip>
          <Tooltip title="Goi lai">
            <Button size="small" icon={<ReloadOutlined />} onClick={() => handleRecall(record)} />
          </Tooltip>
          <Tooltip title="Bo qua">
            <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleSkip(record)} />
          </Tooltip>
          <Tooltip title="Chuyen phong">
            <Button size="small" icon={<SwapOutlined />} onClick={() => handleTransferRoom(record)} />
          </Tooltip>
          <Tooltip title="Lich su kham">
            <Button size="small" icon={<HistoryOutlined />} onClick={() => handleViewHistory(record)} />
          </Tooltip>
          <Tooltip title="In phieu">
            <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintTicket(record)} />
          </Tooltip>
          <Tooltip title="In giay yeu cau">
            <Button size="small" icon={<FileTextOutlined />} onClick={() => handlePrintRequestForm(record)} />
          </Tooltip>
        </div>
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
          serviceType: patientType === 2 ? 2 : 3, // 2: Vien phi, 3: Dich vu
          roomId: values.roomId,
        };
        await receptionApi.registerFeePatient(dto);
      }

      message.success('Dang ky kham thanh cong!');
      setIsModalOpen(false);
      form.resetFields();
      // Refresh data
      fetchRooms();
      fetchAdmissions();
    } catch (error) {
      console.warn('Registration error:', error);
      message.warning(getErrorMessage(error, 'Dang ky that bai. Vui long thu lai!'));
    } finally {
      setSubmitting(false);
    }
  };

  // Inline insurance verification in registration modal
  const handleInlineInsuranceVerify = async () => {
    const insuranceNumber = form.getFieldValue('insuranceNumber');
    if (!insuranceNumber || insuranceNumber.length < 10) {
      message.warning('Vui long nhap so the BHYT hop le');
      return;
    }
    setInlineVerifyLoading(true);
    setInlineCardVerification(null);
    setInlineVerifyStatus('none');
    try {
      const patientName = form.getFieldValue('fullName') || '';
      const dob = form.getFieldValue('dateOfBirth');
      const result = await insuranceApi.verifyInsuranceCard({
        insuranceNumber,
        patientName,
        dateOfBirth: dob ? dob.format('YYYY-MM-DD') : '',
      });
      const data = unwrapResponseData(result);
      setInlineCardVerification(data);
      if (data.duDkKcb) {
        setInlineVerifyStatus('valid');
        message.success('The BHYT hop le - Du dieu kien KCB');
      } else {
        setInlineVerifyStatus('invalid');
        message.warning(data.lyDoKhongDuDk || 'The BHYT khong du dieu kien');
      }
    } catch (error) {
      console.warn('Inline insurance verification error:', error);
      setInlineVerifyStatus('error');
      message.warning('Khong ket noi duoc cong BHXH. Co the nhap thu cong.');
    } finally {
      setInlineVerifyLoading(false);
    }
  };

  // Insurance history from verified card
  const handleViewBhxhHistory = async () => {
    const insuranceNumber = inlineCardVerification?.maThe || form.getFieldValue('insuranceNumber');
    if (!insuranceNumber) return;
    setBhxhHistoryLoading(true);
    setIsInsuranceHistoryModalOpen(true);
    try {
      const result = await insuranceApi.getInsuranceHistory(insuranceNumber);
      const data = unwrapResponseData(result);
      setBhxhHistory(data);
    } catch (error) {
      console.warn('Error fetching BHXH history:', error);
      message.warning('Khong the tai lich su KCB');
    } finally {
      setBhxhHistoryLoading(false);
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
    message.success(`Da quet: ${decodedText} (${format})`);
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
          message.info(`Tim thay BN: ${patient.fullName || patient.patientName} - ${patient.patientCode}`);
          // Open modal first, then set fields after mount
          setIsModalOpen(true);
          setTimeout(() => {
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
          }, 0);
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
        message.success(`Dang goi so ${record.queueNumber} - ${record.patientName}`);
        fetchAdmissions();
      } else {
        message.warning('Benh nhan chua duoc phan phong');
      }
    } catch (error) {
      console.warn('Call queue error:', error);
      message.info(`Goi so ${record.queueNumber} - ${record.patientName}`);
    }
  };

  const handleRecall = async (record: ReceptionRecord) => {
    try {
      await receptionApi.recallQueue(record.id);
      message.success(`Da goi lai so ${record.queueNumber} - ${record.patientName}`);
    } catch (error) {
      console.warn('Recall queue error:', error);
      message.info(`Goi lai so ${record.queueNumber}`);
    }
  };

  const handleSkip = (record: ReceptionRecord) => {
    Modal.confirm({
      title: 'Bo qua so',
      content: `Xac nhan bo qua so ${record.queueNumber} - ${record.patientName}?`,
      okText: 'Xac nhan',
      cancelText: 'Huy',
      onOk: async () => {
        try {
          await receptionApi.skipQueue(record.id, 'Bo qua');
          message.success('Da bo qua so');
          fetchAdmissions();
        } catch (error) {
          console.warn('Skip queue error:', error);
          message.success('Da bo qua so');
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

      message.success('Chuyen phong thanh cong!');
      setIsTransferModalOpen(false);
      transferForm.resetFields();
      fetchAdmissions();
      fetchRooms();
    } catch (error) {
      message.warning(getErrorMessage(error, 'Chuyen phong that bai'));
    }
  };

  const handlePrintTicket = async (record: ReceptionRecord) => {
    try {
      message.loading('Dang in phieu kham...', 1);

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

      const priorityLabel = record.priority === 2 ? '<div class="priority emergency">CAP CUU</div>' :
        record.priority === 1 ? '<div class="priority urgent">UU TIEN</div>' : '';

      const clsSection = clsSteps.length > 0 ? `
        <div class="cls-section">
          <h3>HUONG DAN DI KHAM</h3>
          <table class="cls-table">
            <tr><th>STT</th><th>Phong</th><th>Vi tri</th><th>Cho ~</th></tr>
            ${clsSteps.map((step, i) => {
              const loc = [step.building ? `Toa ${step.building}` : '', step.floor ? `Tang ${step.floor}` : ''].filter(Boolean).join(', ');
              return `<tr><td>${i + 1}</td><td>${step.roomName}</td><td>${loc || '-'}</td><td>${step.estimatedWaitMinutes} phut</td></tr>`;
            }).join('')}
          </table>
        </div>` : '';

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Phieu kham benh - ${record.patientCode}</title>
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
                <h2>PHIEU KHAM BENH</h2>
                <p>Ngay: ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
              </div>
              ${priorityLabel}
              <div class="queue-number">${record.queueNumber}</div>
              <div class="room">${record.roomName || 'Chua phan phong'}</div>
              <div class="wait-time">Thoi gian cho uoc tinh: ~${estimatedWait > 0 ? estimatedWait + ' phut' : 'Khong cho'}</div>
              <div class="info"><strong>Ma BN:</strong> ${record.patientCode}</div>
              <div class="info"><strong>Ho ten:</strong> ${record.patientName}</div>
              <div class="info"><strong>Gioi tinh:</strong> ${record.gender === 1 ? 'Nam' : 'Nu'}</div>
              <div class="info"><strong>Ngay sinh:</strong> ${record.dateOfBirth ? dayjs(record.dateOfBirth).format('DD/MM/YYYY') : '-'}</div>
              <div class="info"><strong>Loai kham:</strong> ${record.patientType === 1 ? 'BHYT' : record.patientType === 2 ? 'Vien phi' : 'Dich vu'}</div>
              ${record.insuranceNumber ? `<div class="info"><strong>So BHYT:</strong> ${record.insuranceNumber}</div>` : ''}
              ${clsSection}
              <div class="footer">Vui long cho goi so tai phong kham. Xin cam on!</div>
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
      void error;
      message.warning('Khong the in phieu kham');
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

  // Handle print request-based examination form (Giay kham chua benh theo yeu cau MS: 03/BV-02)
  const handlePrintRequestForm = (record: ReceptionRecord) => {
    setSelectedRecord(record);
    printRequestForm.setFieldsValue({
      patientName: record.patientName,
      age: record.dateOfBirth ? dayjs().diff(dayjs(record.dateOfBirth), 'year') : '',
      gender: record.gender === 1 ? 'Nam' : 'Nu',
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
      message.warning('Khong the mo cua so in. Vui long cho phep popup.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Giay kham chua benh theo yeu cau</title>
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
            So Y te: <span class="field">${formValues.healthDepartment || '.....................'}</span><br/>
            BV: <span class="field">${formValues.hospitalName || '.....................'}</span>
          </div>
          <div class="header-center">
            <strong>CONG HOA XA HOI CHU NGHIA VIET NAM</strong><br/>
            <strong>Doc lap - Tu do - Hanh phuc</strong><br/>
            <span>-----------------------------------------</span>
          </div>
          <div class="header-right">
            MS: 03/BV-02<br/>
            So: <span class="field">${formValues.formNumber || '............'}</span>
          </div>
        </div>

        <div class="title">Giay kham chua benh theo yeu cau</div>

        <div class="subtitle">Kinh gui: <span class="field">${formValues.recipient || '......................................................'}</span></div>

        <div class="section">
          <div class="row">- Ten toi la: <span class="field">${formValues.patientName || ''}</span> Tuoi: <span class="field">${formValues.age || ''}</span> Nam/Nu: <span class="field">${formValues.gender || ''}</span></div>
          <div class="row">- CMND/Ho chieu/Ho khau so: <span class="field">${formValues.identityNumber || ''}</span> Co quan cap: <span class="field">${formValues.issuingAuthority || ''}</span></div>
          <div class="row">- Dan toc: <span class="field">${formValues.ethnicity || ''}</span> Ngoai kieu: <span class="field">${formValues.nationality || ''}</span></div>
          <div class="row">- Nghe nghiep: <span class="field">${formValues.occupation || ''}</span> Noi lam viec: <span class="field">${formValues.workplace || ''}</span></div>
          <div class="row">- Dia chi: <span class="field" style="width: 80%">${formValues.address || ''}</span></div>
          <div class="row">- Khi can bao tin: <span class="field" style="width: 70%">${formValues.emergencyContact || ''}</span></div>
          <div class="row">- La nguoi benh/dai dien gia dinh nguoi benh ho ten la: <span class="field">${formValues.representativeName || ''}</span></div>
          <div class="row">Hien dang kham/chua benh tai Khoa: <span class="field">${formValues.roomName || ''}</span> Benh vien: <span class="field">${formValues.hospitalName || ''}</span></div>
        </div>

        <div class="section">
          <p><strong>1. Sau khi nghe bac si pho bien quy dinh kham/chua benh theo yeu cau cua benh vien, toi viet giay nay thoa thuan xin kham/chua benh theo yeu cau va chon dich vu cham soc nhu sau:</strong></p>
          <div class="indent">
            <div class="row">a. Bac si kham/chua benh/phau thuat/do de/cham soc: <span class="field">${formValues.requestedDoctor || ''}</span></div>
            <div class="row">b. <span class="checkbox"></span> Y ta (dieu duong) cham soc theo che do benh ly tai giuong.</div>
            <div class="row">c. <span class="checkbox"></span> Duoc dung thuoc theo chi dinh cua bac si dieu tri</div>
            <div class="row">d. Duoc nam chua benh tai buong loai: <span class="field">${formValues.roomType || ''}</span>, co tien nghi: dieu hoa nhiet do, tu lanh, nuoc nong lanh, buong ve sinh rieng.</div>
          </div>
        </div>

        <div class="section">
          <p><strong>2. Toi xin ung truoc mot khoan tien theo quy dinh cua benh vien la:</strong> <span class="field">${formValues.depositAmount || ''}</span> dong,</p>
          <p>(bang chu): <span class="field" style="width: 80%">${formValues.depositAmountInWords || ''}</span></p>
          <p>de kham/chua benh theo yeu cau; khi ra vien toi xin thanh toan day du.</p>
        </div>

        <div class="section">
          <p><strong>3.</strong> Trong khi thuc hien kham/chua benh theo yeu cau, neu co van de phat sinh de nghi bac si thong bao cho toi/gia dinh toi biet de tien thanh toan kip thoi.</p>
        </div>

        <div class="section">
          <p><strong>4.</strong> Toi xin chap hanh day du noi quy kham/chua benh cua benh vien, yen tam chua benh va chiu trach nhiem ve nhung yeu cau kham/chua benh cua toi.</p>
        </div>

        <div class="signature-row">
          <div class="signature-box">
            <p>Duyet cua</p>
            <p><strong>Giam doc benh vien</strong></p>
            <br/><br/><br/>
            <p>Ho ten: ................................</p>
          </div>
          <div class="signature-box">
            <p>Ngay ${dayjs().format('DD')} thang ${dayjs().format('MM')} nam ${dayjs().format('YYYY')}</p>
            <p><strong>Nguoi benh/dai dien gia dinh</strong></p>
            <br/><br/><br/>
            <p>Ho ten: ................................</p>
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
          validationMessage: result.isValid ? 'The BHYT hop le' : result.errorMessage,
        };
        setInsuranceVerification(verification);
        if (result.isValid) {
          message.success('Xac minh the BHYT thanh cong!');
        } else {
          message.warning(result.errorMessage || 'The BHYT khong hop le');
        }
      }
    } catch (error) {
      console.warn('Insurance verification error:', error);
      message.warning(getErrorMessage(error, 'Khong the xac minh the BHYT'));
    } finally {
      setVerifyingInsurance(false);
    }
  };

  // Computed stats
  const totalPatients = data.length;
  const waitingCount = data.filter(d => d.status === 0).length;
  const examiningCount = data.filter(d => d.status === 1).length;
  const completedCount = data.filter(d => d.status === 3).length;

  const kpiCards = [
    { label: 'Tong BN hom nay', value: totalPatients, icon: <UserOutlined style={{ fontSize: 20, color: '#6366f1' }} />, gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', glowBg: 'rgba(99,102,241,0.12)' },
    { label: 'Dang cho kham', value: waitingCount, icon: <ClockCircleOutlined style={{ fontSize: 20, color: '#f59e0b' }} />, gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', glowBg: 'rgba(245,158,11,0.12)' },
    { label: 'Dang kham', value: examiningCount, icon: <MedicineBoxOutlined style={{ fontSize: 20, color: '#3b82f6' }} />, gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)', glowBg: 'rgba(59,130,246,0.12)' },
    { label: 'Hoan thanh', value: completedCount, icon: <CheckCircleOutlined style={{ fontSize: 20, color: '#10b981' }} />, gradient: 'linear-gradient(135deg, #10b981, #14b8a6)', glowBg: 'rgba(16,185,129,0.12)' },
  ];

  return (
    <Spin spinning={loading}>
      {/* CSS Keyframes */}
      <style>{`
        @keyframes borderGlow { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes float { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-20px)} }
        .reception-kpi-glow {
          position: relative;
        }
        .reception-kpi-glow::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          opacity: 0.2;
          background-size: 200% 200%;
          animation: borderGlow 6s linear infinite;
          z-index: 0;
          transition: opacity 0.5s;
          pointer-events: none;
        }
        .reception-kpi-glow:hover::before {
          opacity: 0.4;
          filter: blur(4px);
        }
        .reception-kpi-glow .ant-card {
          position: relative;
          z-index: 1;
        }
        .room-stat-card .ant-card {
          transition: all 0.3s ease;
        }
        .room-stat-card:hover .ant-card {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
          transform: translateY(-2px);
        }
      `}</style>

      <div style={{ position: 'relative', minHeight: '100vh' }}>
        {/* Gradient Mesh Background */}
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, left: '25%', width: 384, height: 384, background: '#dbeafe', borderRadius: '50%', mixBlendMode: 'multiply', filter: 'blur(48px)', opacity: 0.3, animation: 'float 8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '33%', right: '25%', width: 384, height: 384, background: '#e9d5ff', borderRadius: '50%', mixBlendMode: 'multiply', filter: 'blur(48px)', opacity: 0.3, animation: 'float 8s ease-in-out infinite 2s' }} />
          <div style={{ position: 'absolute', bottom: '25%', left: '33%', width: 384, height: 384, background: '#cffafe', borderRadius: '50%', mixBlendMode: 'multiply', filter: 'blur(48px)', opacity: 0.3, animation: 'float 8s ease-in-out infinite 4s' }} />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
            <Col>
              <Title level={4} style={{ margin: 0 }}>Tiep don benh nhan</Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {dayjs().format('dddd, DD/MM/YYYY')} &middot; {data.length} benh nhan
              </Text>
            </Col>
            <Col>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={() => { fetchRooms(); fetchAdmissions(); }}>Lam moi</Button>
                <Button icon={<QrcodeOutlined />} onClick={() => setIsVerifyModalOpen(true)}>Tra cuu BHYT</Button>
                <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setIsModalOpen(true)}
                  style={{ borderRadius: 8, fontWeight: 600, height: 40, paddingInline: 24 }}>
                  Dang ky kham
                </Button>
              </Space>
            </Col>
          </Row>
        </motion.div>

        {/* KPI Cards with Animated Glow Borders */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {kpiCards.map((kpi, i) => (
            <Col xs={12} sm={12} lg={6} key={kpi.label}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
                className="reception-kpi-glow"
              >
                <style>{`
                  .reception-kpi-glow:nth-child(${i + 1})::before {
                    background: ${kpi.gradient};
                  }
                `}</style>
                <Card style={kpiGlassStyle} styles={{ body: { padding: 20 } }}>
                  <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>{kpi.label}</Text>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: kpi.glowBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {kpi.icon}
                    </div>
                  </Row>
                  <Statistic
                    value={kpi.value}
                    formatter={() => (
                      <span style={{ fontSize: 30, fontWeight: 700, color: '#1f2937' }}>
                        <NumberTicker value={kpi.value} duration={1200} />
                      </span>
                    )}
                  />
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card style={{ ...glassStyle, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }} styles={{ body: { padding: 0 } }}>
            <Tabs
              style={{ padding: '0 16px' }}
              items={[
                {
                  key: 'list',
                  label: <span style={{ fontWeight: 500 }}>Danh sach tiep don</span>,
                  children: (
                    <div style={{ padding: '0 8px 16px' }}>
                      {/* Filters Row */}
                      <Card
                        style={{ marginBottom: 16, borderRadius: 12, background: '#f9fafb' }}
                        styles={{ body: { padding: 12 } }}
                      >
                        <Space wrap size={10}>
                          <Search
                            placeholder="Tim theo ma BN, ten, SDT, CCCD..."
                            allowClear
                            enterButton={<SearchOutlined />}
                            style={{ width: 320 }}
                            value={searchText}
                            onSearch={(value) => { setSearchText(value); applyFilters(allData, value, filterStatus); }}
                            onChange={(e) => { setSearchText(e.target.value); if (!e.target.value) applyFilters(allData, '', filterStatus); }}
                          />
                          <Tooltip title="Quet ma vach / QR Code">
                            <Button icon={<ScanOutlined />} onClick={() => setIsScannerOpen(true)} style={{ borderRadius: 8 }} />
                          </Tooltip>
                          <Select
                            defaultValue=""
                            style={{ width: 170 }}
                            placeholder="Phong kham"
                            loading={loadingRooms}
                            notFoundContent={loadingRooms ? <Spin size="small" /> : (rooms.length === 0 ? 'Khong co du lieu' : undefined)}
                            onChange={(roomId) => {
                              if (roomId) { setData(allData.filter(p => p.roomId === roomId)); }
                              else { applyFilters(allData, searchText, filterStatus); }
                            }}
                            options={[{ value: '', label: 'Tat ca phong' }, ...rooms.map(room => ({ value: room.roomId, label: room.roomName }))]}
                          />
                          <Select
                            defaultValue=""
                            style={{ width: 130 }}
                            placeholder="Trang thai"
                            onChange={(value) => { setFilterStatus(value); applyFilters(allData, searchText, value); }}
                            options={[
                              { value: '', label: 'Tat ca' },
                              { value: '0', label: 'Cho kham' },
                              { value: '1', label: 'Dang kham' },
                              { value: '2', label: 'Cho ket luan' },
                              { value: '3', label: 'Hoan thanh' },
                            ]}
                          />
                          <DatePicker
                            value={filterDate}
                            format="DD/MM/YYYY"
                            style={{ borderRadius: 8 }}
                            onChange={(date) => {
                              setFilterDate(date);
                              if (date) fetchAdmissions(date.format('YYYY-MM-DD'));
                              else fetchAdmissions();
                            }}
                          />
                        </Space>
                      </Card>

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
                          showTotal: (total) => <Text type="secondary">Tong: <strong>{total}</strong> benh nhan</Text>,
                        }}
                        rowClassName={(record) =>
                          record.priority === 2 ? 'emergency-row' : record.priority === 1 ? 'priority-row' : ''
                        }
                        onRow={(record) => ({
                          onDoubleClick: () => { setSelectedRecord(record); setIsDetailModalOpen(true); },
                          style: { cursor: 'pointer' },
                        })}
                      />
                    </div>
                  ),
                },
                {
                  key: 'stats',
                  label: <span style={{ fontWeight: 500 }}>Thong ke phong kham</span>,
                  children: (
                    <div style={{ padding: '8px 8px 16px' }}>
                      <Row gutter={[16, 16]}>
                        {roomStats.map((room, idx) => {
                          const total = room.totalWaiting + room.totalServing + room.totalCompleted;
                          const pct = total > 0 ? Math.round((room.totalCompleted / total) * 100) : 0;
                          return (
                            <Col xs={24} sm={12} lg={8} key={room.roomId}>
                              <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05, duration: 0.4 }}
                                className="room-stat-card"
                              >
                                <Card
                                  style={{
                                    ...glassStyle,
                                    borderColor: room.totalServing > 0 ? '#93c5fd' : 'rgba(255,255,255,0.5)',
                                    boxShadow: room.totalServing > 0 ? '0 4px 16px rgba(59,130,246,0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
                                  }}
                                  styles={{ body: { padding: 20 } }}
                                >
                                  <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                                    <Space size={8}>
                                      <Badge status={room.totalServing > 0 ? 'processing' : 'default'} />
                                      <Text strong style={{ fontSize: 15 }}>{room.roomName}</Text>
                                    </Space>
                                    <Tag color="blue" style={{ margin: 0 }}>{room.departmentName}</Tag>
                                  </Row>

                                  <Row gutter={8} style={{ marginBottom: 12 }}>
                                    <Col span={8}>
                                      <Card size="small" style={{ textAlign: 'center', background: '#fffbeb', border: 'none', borderRadius: 8 }} styles={{ body: { padding: '8px 4px' } }}>
                                        <Statistic value={room.totalWaiting} valueStyle={{ fontSize: 22, fontWeight: 700, color: '#d97706' }} />
                                        <Text style={{ fontSize: 11, color: '#d97706' }}>Cho</Text>
                                      </Card>
                                    </Col>
                                    <Col span={8}>
                                      <Card size="small" style={{ textAlign: 'center', background: '#eff6ff', border: 'none', borderRadius: 8 }} styles={{ body: { padding: '8px 4px' } }}>
                                        <Statistic value={room.totalServing} valueStyle={{ fontSize: 22, fontWeight: 700, color: '#2563eb' }} />
                                        <Text style={{ fontSize: 11, color: '#2563eb' }}>Dang kham</Text>
                                      </Card>
                                    </Col>
                                    <Col span={8}>
                                      <Card size="small" style={{ textAlign: 'center', background: '#ecfdf5', border: 'none', borderRadius: 8 }} styles={{ body: { padding: '8px 4px' } }}>
                                        <Statistic value={room.totalCompleted} valueStyle={{ fontSize: 22, fontWeight: 700, color: '#059669' }} />
                                        <Text style={{ fontSize: 11, color: '#059669' }}>Xong</Text>
                                      </Card>
                                    </Col>
                                  </Row>

                                  <Row justify="space-between" align="middle" style={{ marginBottom: 4 }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>BS: {room.doctorName || '\u2014'}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{pct}%</Text>
                                  </Row>
                                  <Progress
                                    percent={pct}
                                    showInfo={false}
                                    strokeColor={{ from: '#60a5fa', to: '#34d399' }}
                                    size="small"
                                  />
                                </Card>
                              </motion.div>
                            </Col>
                          );
                        })}
                        {roomStats.length === 0 && (
                          <Col span={24}>
                            <Empty description="Khong co du lieu phong kham" style={{ padding: '48px 0' }} />
                          </Col>
                        )}
                      </Row>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </motion.div>
      </div>

      {/* Modal Tra cuu BHYT */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <IdcardOutlined />
            <span>Tra cuu the BHYT</span>
          </div>
        }
        open={isVerifyModalOpen}
        onCancel={() => {
          setIsVerifyModalOpen(false);
          setInsuranceVerification(null);
          verifyForm.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnHidden={false}
      >
        <Form form={verifyForm} layout="vertical">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Form.Item
                name="insuranceNumber"
                label="So the BHYT"
                rules={[{ required: true, message: 'Vui long nhap so the BHYT' }]}
              >
                <Input placeholder="Nhap so the BHYT (15 ky tu)" maxLength={15} />
              </Form.Item>
            </div>
            <div>
              <Form.Item label=" ">
                <Button type="primary" onClick={handleVerifyInsurance} loading={verifyingInsurance} block>
                  Tra cuu
                </Button>
              </Form.Item>
            </div>
          </div>
        </Form>

        {insuranceVerification && (() => {
          const vEndDate = insuranceVerification.endDate ? dayjs(insuranceVerification.endDate) : null;
          const vDaysLeft = vEndDate ? vEndDate.diff(dayjs(), 'day') : null;
          const vIsExpired = vDaysLeft !== null && vDaysLeft < 0;
          const vIsExpiringSoon = vDaysLeft !== null && vDaysLeft >= 0 && vDaysLeft <= 30;

          return (
          <>
            <hr className="border-gray-200 my-4" />
            {/* Expiry warning for standalone verification */}
            {vIsExpired && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-3 flex items-start gap-2">
                <CloseCircleOutlined className="text-red-500 mt-0.5" />
                <div>
                  <div className="font-medium text-red-700">The BHYT da het han tu ngay {vEndDate?.format('DD/MM/YYYY')} ({Math.abs(vDaysLeft!)} ngay truoc)</div>
                  <div className="text-red-600 text-sm mt-0.5">Benh nhan can gia han the BHYT. Neu tiep tuc, benh nhan se phai thanh toan toan bo chi phi.</div>
                </div>
              </div>
            )}
            {vIsExpiringSoon && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3 flex items-start gap-2">
                <WarningOutlined className="text-amber-500 mt-0.5" />
                <div>
                  <div className="font-medium text-amber-700">The BHYT sap het han: con {vDaysLeft} ngay (het han ngay {vEndDate?.format('DD/MM/YYYY')})</div>
                  <div className="text-amber-600 text-sm mt-0.5">Vui long nhac benh nhan gia han the BHYT truoc khi het han.</div>
                </div>
              </div>
            )}
            <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 ${insuranceVerification.isValid ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              {insuranceVerification.isValid ? <CheckCircleOutlined className="text-emerald-500 text-lg" /> : <CloseCircleOutlined className="text-red-500 text-lg" />}
              <span className={`font-medium ${insuranceVerification.isValid ? 'text-emerald-700' : 'text-red-700'}`}>
                {insuranceVerification.isValid ? 'The BHYT hop le' : 'The BHYT khong hop le'}
              </span>
            </div>
            {/* Insurance details grid */}
            <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
              <div className="grid grid-cols-2 border-b border-gray-200">
                <div className="col-span-2 flex">
                  <div className="w-36 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">So the</div>
                  <div className="px-3 py-2 font-semibold">{insuranceVerification.insuranceNumber}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 border-b border-gray-200">
                <div className="flex border-r border-gray-200">
                  <div className="w-36 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Ho ten</div>
                  <div className="px-3 py-2">{insuranceVerification.patientName}</div>
                </div>
                <div className="flex">
                  <div className="w-36 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Ngay sinh</div>
                  <div className="px-3 py-2">{insuranceVerification.dateOfBirth ? dayjs(insuranceVerification.dateOfBirth).format('DD/MM/YYYY') : ''}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 border-b border-gray-200">
                <div className="col-span-2 flex">
                  <div className="w-36 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Noi DKKCB BD</div>
                  <div className="px-3 py-2">{insuranceVerification.facilityName}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 border-b border-gray-200">
                <div className="flex border-r border-gray-200">
                  <div className="w-36 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Ngay bat dau</div>
                  <div className="px-3 py-2">{insuranceVerification.startDate ? dayjs(insuranceVerification.startDate).format('DD/MM/YYYY') : ''}</div>
                </div>
                <div className="flex">
                  <div className="w-36 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Ngay ket thuc</div>
                  <div className="px-3 py-2">{insuranceVerification.endDate ? dayjs(insuranceVerification.endDate).format('DD/MM/YYYY') : ''}</div>
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="flex border-r border-gray-200">
                  <div className="w-36 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Dung tuyen</div>
                  <div className="px-3 py-2">
                    {insuranceVerification.isRightRoute ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Dung tuyen</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Trai tuyen</span>
                    )}
                  </div>
                </div>
                <div className="flex">
                  <div className="w-36 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Ty le thanh toan</div>
                  <div className="px-3 py-2 font-semibold text-blue-600">{insuranceVerification.paymentRate}%</div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-right">
              <Button
                type="primary"
                onClick={() => {
                  setIsVerifyModalOpen(false);
                  setIsModalOpen(true);
                  setTimeout(() => {
                    form.setFieldsValue({
                      insuranceNumber: insuranceVerification.insuranceNumber,
                      patientType: 1,
                    });
                  }, 0);
                }}
              >
                Su dung thong tin nay
              </Button>
            </div>
          </>
          );
        })()}
      </Modal>

      {/* Modal Lich su kham */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <HistoryOutlined />
            <span>Lich su kham benh - {selectedRecord?.patientName}</span>
          </div>
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
                title: 'Ngay kham',
                dataIndex: 'visitDate',
                key: 'visitDate',
                render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
              },
              { title: 'Phong kham', dataIndex: 'roomName', key: 'roomName' },
              { title: 'Bac si', dataIndex: 'doctorName', key: 'doctorName' },
              { title: 'Chan doan', dataIndex: 'diagnosisName', key: 'diagnosisName' },
              {
                title: 'Ket qua',
                dataIndex: 'treatmentResult',
                key: 'treatmentResult',
                render: (result: string) => result ? <Tag color="green">{result}</Tag> : <Tag color="blue">Hoan thanh</Tag>,
              },
            ]}
            dataSource={visitHistory.map((v, idx) => ({ ...v, key: v.medicalRecordId || idx }))}
            locale={{ emptyText: (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <svg className="w-10 h-10 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span>Khong co lich su kham benh</span>
              </div>
            ) }}
            pagination={false}
          />
        </Spin>
      </Modal>

      {/* Modal Chi tiet benh nhan */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <UserOutlined />
            <span>Chi tiet benh nhan - {selectedRecord?.patientName}</span>
          </div>
        }
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="history" icon={<HistoryOutlined />} onClick={() => {
            setIsDetailModalOpen(false);
            setIsHistoryModalOpen(true);
          }}>
            Lich su kham
          </Button>,
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Dong
          </Button>,
        ]}
        width={700}
      >
        {selectedRecord && (
          <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
            <div className="grid grid-cols-2 border-b border-gray-200">
              <div className="flex border-r border-gray-200">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">So thu tu</div>
                <div className="px-3 py-2 font-bold text-lg">{selectedRecord.queueNumber}</div>
              </div>
              <div className="flex">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Ma BN</div>
                <div className="px-3 py-2 font-semibold">{selectedRecord.patientCode}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-gray-200">
              <div className="col-span-2 flex">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Ho ten</div>
                <div className="px-3 py-2">{selectedRecord.patientName}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-gray-200">
              <div className="flex border-r border-gray-200">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Gioi tinh</div>
                <div className="px-3 py-2">{selectedRecord.gender === 1 ? 'Nam' : selectedRecord.gender === 2 ? 'Nu' : 'Khac'}</div>
              </div>
              <div className="flex">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Ngay sinh</div>
                <div className="px-3 py-2">{selectedRecord.dateOfBirth ? dayjs(selectedRecord.dateOfBirth).format('DD/MM/YYYY') : '-'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-gray-200">
              <div className="flex border-r border-gray-200">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">SDT</div>
                <div className="px-3 py-2">{selectedRecord.phoneNumber || '-'}</div>
              </div>
              <div className="flex">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">CMND/CCCD</div>
                <div className="px-3 py-2">{selectedRecord.identityNumber || '-'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-gray-200">
              <div className="col-span-2 flex">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Dia chi</div>
                <div className="px-3 py-2">{selectedRecord.address || '-'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-gray-200">
              <div className="flex border-r border-gray-200">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Loai kham</div>
                <div className="px-3 py-2">
                  {selectedRecord.patientType === 1 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">BHYT</span>
                  ) : selectedRecord.patientType === 2 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Vien phi</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">Dich vu</span>
                  )}
                </div>
              </div>
              <div className="flex">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">So BHYT</div>
                <div className="px-3 py-2">{selectedRecord.insuranceNumber || '-'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-gray-200">
              <div className="flex border-r border-gray-200">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Phong kham</div>
                <div className="px-3 py-2">{selectedRecord.roomName || '-'}</div>
              </div>
              <div className="flex">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Khoa</div>
                <div className="px-3 py-2">{selectedRecord.departmentName || '-'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2">
              <div className="flex border-r border-gray-200">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Trang thai</div>
                <div className="px-3 py-2">
                  {getStatusTag(selectedRecord.status)}
                </div>
              </div>
              <div className="flex">
                <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Ngay DK</div>
                <div className="px-3 py-2">{dayjs(selectedRecord.admissionDate).format('DD/MM/YYYY HH:mm')}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Dang ky kham */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <FileTextOutlined />
            <span>Dang ky kham benh</span>
          </div>
        }
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setIsModalOpen(false);
          setInlineCardVerification(null);
          setInlineVerifyStatus('none');
        }}
        width={900}
        okText="Dang ky"
        cancelText="Huy"
        confirmLoading={submitting}
        destroyOnHidden={false}
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Form.Item
                    name="fullName"
                    label="Ho ten"
                    rules={[{ required: true, message: 'Vui long nhap ho ten' }]}
                  >
                    <Input placeholder="Nhap ho ten benh nhan" />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    name="gender"
                    label="Gioi tinh"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Chon" options={[
                      { value: 1, label: 'Nam' },
                      { value: 2, label: 'Nu' },
                    ]} />
                  </Form.Item>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="dateOfBirth" label="Ngay sinh">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
                <Form.Item name="phoneNumber" label="So dien thoai">
                  <Input placeholder="Nhap SDT" />
                </Form.Item>
              </div>
            </div>
            <div>
              <Form.Item name="photo" label="Anh benh nhan">
                <WebcamCapture width={140} height={170} />
              </Form.Item>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="identityNumber" label="CCCD/CMND" rules={[{
              validator: (_: unknown, value: string) => {
                if (!value) return Promise.resolve();
                const result = validateCccd(value);
                if (!result.valid) return Promise.reject(new Error(result.error));
                return Promise.resolve();
              }
            }]} help={(() => {
              if (watchedIdentityNumber && watchedIdentityNumber.length === 12) {
                const r = validateCccd(watchedIdentityNumber);
                if (r.valid && r.province) return `Noi cap: ${r.province}`;
              }
              return undefined;
            })()}>
              <Input placeholder="Nhap so CCCD (12 chu so)" maxLength={12} />
            </Form.Item>
            <Form.Item
              name="patientType"
              label="Doi tuong"
              rules={[{ required: true }]}
            >
              <Select placeholder="Chon doi tuong" options={[
                { value: 1, label: 'BHYT' },
                { value: 2, label: 'Vien phi' },
                { value: 3, label: 'Dich vu' },
              ]} />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input placeholder="Nhap email" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5">
              <Form.Item name="insuranceNumber" label="So the BHYT">
                <Input
                  placeholder="Nhap so the BHYT"
                  maxLength={15}
                  onBlur={handleInlineInsuranceVerify}
                />
              </Form.Item>
            </div>
            <div className="col-span-2 flex items-end pb-6">
              <Tooltip title="Xac minh the BHYT qua cong BHXH">
                <Button
                  icon={<SafetyCertificateOutlined />}
                  onClick={handleInlineInsuranceVerify}
                  loading={inlineVerifyLoading}
                >
                  Xac minh
                </Button>
              </Tooltip>
            </div>
            <div className="col-span-5">
              <Form.Item
                name="roomId"
                label="Phong kham"
                rules={[{ required: true, message: 'Vui long chon phong kham' }]}
              >
                <Select
                  placeholder="Chon phong kham"
                  loading={loadingRooms}
                  notFoundContent={loadingRooms ? <Spin size="small" /> : 'Khong co du lieu'}
                  options={rooms.map(room => ({ value: room.roomId, label: `${room.roomName} - ${room.departmentName}` }))}
                />
              </Form.Item>
            </div>
          </div>

          {/* Inline insurance verification result */}
          {inlineVerifyStatus === 'valid' && inlineCardVerification && (() => {
            const endDate = inlineCardVerification.gtTheDen ? dayjs(inlineCardVerification.gtTheDen) : null;
            const daysUntilExpiry = endDate ? endDate.diff(dayjs(), 'day') : null;
            const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
            const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

            return (
              <div className="mb-4">
                {/* Expiry warning - shown prominently at top */}
                {isExpired && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-2 flex items-start gap-2">
                    <WarningOutlined className="text-red-500 mt-0.5" />
                    <div>
                      <div className="font-semibold text-red-700">The BHYT da het han tu ngay {endDate?.format('DD/MM/YYYY')} ({Math.abs(daysUntilExpiry!)} ngay truoc)</div>
                      <div className="text-red-600 text-sm mt-0.5">Benh nhan can gia han the BHYT. Neu tiep tuc dang ky, benh nhan se phai thanh toan toan bo chi phi.</div>
                    </div>
                  </div>
                )}
                {isExpiringSoon && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-2 flex items-start gap-2">
                    <WarningOutlined className="text-amber-500 mt-0.5" />
                    <div>
                      <div className="font-semibold text-amber-700">The BHYT sap het han: con {daysUntilExpiry} ngay (het han ngay {endDate?.format('DD/MM/YYYY')})</div>
                      <div className="text-amber-600 text-sm mt-0.5">Vui long nhac benh nhan gia han the BHYT truoc khi het han de dam bao quyen loi.</div>
                    </div>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 flex-wrap">
                  <CheckCircleOutlined className="text-emerald-500" />
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Du dieu kien KCB</span>
                  <span className="text-sm">Muc huong: {inlineCardVerification.mucHuong}%</span>
                  <span className="text-gray-400 text-sm">
                    Hieu luc: {inlineCardVerification.gtTheTu ? dayjs(inlineCardVerification.gtTheTu).format('DD/MM/YYYY') : ''} - {inlineCardVerification.gtTheDen ? dayjs(inlineCardVerification.gtTheDen).format('DD/MM/YYYY') : ''}
                  </span>
                  <Button size="small" type="link" icon={<HistoryOutlined />} onClick={handleViewBhxhHistory}>
                    Xem lich su KCB
                  </Button>
                </div>
              </div>
            );
          })()}
          {inlineVerifyStatus === 'invalid' && inlineCardVerification && (
            <div className="mb-4">
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                <CloseCircleOutlined className="text-red-500" />
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Khong du dieu kien</span>
                <span className="text-red-600 text-sm">{inlineCardVerification.lyDoKhongDuDk || 'Khong co thong tin'}</span>
              </div>
            </div>
          )}
          {inlineVerifyStatus === 'error' && (
            <div className="mb-4">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
                <WarningOutlined className="text-amber-500" />
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Khong ket noi duoc cong BHXH</span>
                <span className="text-amber-600 text-sm">Co the nhap thu cong va tiep tuc dang ky</span>
              </div>
            </div>
          )}

          <Form.Item name="address" label="Dia chi">
            <Input.TextArea rows={2} placeholder="Nhap dia chi" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Chuyen phong */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <SwapOutlined />
            <span>Chuyen phong kham - {selectedRecord?.patientName}</span>
          </div>
        }
        open={isTransferModalOpen}
        destroyOnHidden={false}
        onOk={handleTransferSubmit}
        onCancel={() => {
          setIsTransferModalOpen(false);
          transferForm.resetFields();
        }}
        okText="Chuyen phong"
        cancelText="Huy"
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item name="currentRoom" label="Phong hien tai">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="newRoomId"
            label="Phong moi"
            rules={[{ required: true, message: 'Vui long chon phong moi' }]}
          >
            <Select
              placeholder="Chon phong kham moi"
              loading={loadingRooms}
              notFoundContent={loadingRooms ? <Spin size="small" /> : 'Khong co du lieu'}
              options={rooms
                .filter(room => room.roomId !== selectedRecord?.roomId)
                .map(room => ({ value: room.roomId, label: `${room.roomName} - ${room.departmentName} (Cho: ${room.waitingCount})` }))}
            />
          </Form.Item>
          <Form.Item name="reason" label="Ly do chuyen">
            <Input.TextArea rows={2} placeholder="Nhap ly do chuyen phong (khong bat buoc)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Print Request-based Examination Form Modal (MS: 03/BV-02) */}
      <Modal
        title="In Giay kham chua benh theo yeu cau (MS: 03/BV-02)"
        open={isPrintRequestModalOpen}
        onCancel={() => {
          setIsPrintRequestModalOpen(false);
          printRequestForm.resetFields();
        }}
        width={800}
        destroyOnHidden={false}
        footer={[
          <Button key="cancel" onClick={() => setIsPrintRequestModalOpen(false)}>
            Huy
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={executePrintRequestForm}>
            In giay yeu cau
          </Button>,
        ]}
      >
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
          <Form form={printRequestForm} layout="vertical">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-4 flex items-start gap-2">
              <FileTextOutlined className="text-blue-500 mt-0.5" />
              <span className="text-blue-700 text-sm">Giay kham chua benh theo yeu cau danh cho benh nhan dich vu, yeu cau bac si/buong benh cu the</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="hospitalName" label="Benh vien">
                <Input placeholder="Ten benh vien" />
              </Form.Item>
              <Form.Item name="healthDepartment" label="So Y te">
                <Input placeholder="Ten So Y te" />
              </Form.Item>
            </div>

            <div className="relative my-5">
              <hr className="border-gray-200" />
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-3 text-gray-500 text-sm font-medium">Thong tin nguoi benh</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="patientName" label="Ho ten">
                <Input />
              </Form.Item>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="age" label="Tuoi">
                  <Input />
                </Form.Item>
                <Form.Item name="gender" label="Gioi tinh">
                  <Input />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="identityNumber" label="CMND/CCCD" rules={[{
                validator: (_: unknown, value: string) => {
                  if (!value) return Promise.resolve();
                  const result = validateCccd(value);
                  if (!result.valid) return Promise.reject(new Error(result.error));
                  return Promise.resolve();
                }
              }]}>
                <Input placeholder="12 chu so" maxLength={12} />
              </Form.Item>
              <Form.Item name="issuingAuthority" label="Co quan cap">
                <Input />
              </Form.Item>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="ethnicity" label="Dan toc">
                <Input placeholder="Kinh" />
              </Form.Item>
              <Form.Item name="nationality" label="Ngoai kieu">
                <Input />
              </Form.Item>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="occupation" label="Nghe nghiep">
                <Input />
              </Form.Item>
              <Form.Item name="workplace" label="Noi lam viec">
                <Input />
              </Form.Item>
            </div>
            <Form.Item name="address" label="Dia chi">
              <Input />
            </Form.Item>
            <Form.Item name="emergencyContact" label="Khi can bao tin">
              <Input placeholder="Ho ten, so dien thoai nguoi than" />
            </Form.Item>

            <div className="relative my-5">
              <hr className="border-gray-200" />
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-3 text-gray-500 text-sm font-medium">Yeu cau dich vu</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="roomName" label="Kham tai Khoa/Phong">
                <Input />
              </Form.Item>
              <Form.Item name="requestedDoctor" label="Bac si yeu cau">
                <Input placeholder="Ten bac si muon kham" />
              </Form.Item>
            </div>
            <Form.Item name="roomType" label="Loai buong benh (neu nam vien)">
              <Select placeholder="Chon loai buong" options={[
                { value: 'VIP', label: 'VIP - Phong rieng' },
                { value: 'A', label: 'Loai A - 2 giuong' },
                { value: 'B', label: 'Loai B - 4 giuong' },
                { value: '', label: 'Khong yeu cau' },
              ]} />
            </Form.Item>

            <div className="relative my-5">
              <hr className="border-gray-200" />
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-3 text-gray-500 text-sm font-medium">Thanh toan</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="depositAmount" label="So tien tam ung (dong)">
                <Input type="number" />
              </Form.Item>
              <Form.Item name="depositAmountInWords" label="Bang chu">
                <Input placeholder="Vi du: Mot trieu dong" />
              </Form.Item>
            </div>
          </Form>
        </div>
      </Modal>

      {/* Barcode/QR Scanner */}
      <BarcodeScanner
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
        title="Quet ma vach / QR Code benh nhan"
      />

      {/* BHXH Insurance History Modal */}
      <Modal
        title="Lich su kham chua benh BHYT"
        open={isInsuranceHistoryModalOpen}
        onCancel={() => {
          setIsInsuranceHistoryModalOpen(false);
          setBhxhHistory(null);
        }}
        footer={null}
        width={800}
      >
        <Spin spinning={bhxhHistoryLoading}>
          {bhxhHistory ? (
            <>
              <div className="border border-gray-200 rounded-lg mb-4 text-sm">
                <div className="flex">
                  <div className="w-32 bg-gray-50 px-3 py-2 font-medium text-gray-600 border-r border-gray-200 shrink-0">Ma the BHYT</div>
                  <div className="px-3 py-2"><code className="bg-gray-100 px-2 py-0.5 rounded text-sm">{bhxhHistory.maThe}</code></div>
                </div>
              </div>
              <Table
                size="small"
                columns={[
                  {
                    title: 'Ngay KCB',
                    dataIndex: 'ngayKcb',
                    key: 'ngayKcb',
                    width: 110,
                    render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
                  },
                  {
                    title: 'Ten CSKCB',
                    dataIndex: 'tenCsKcb',
                    key: 'tenCsKcb',
                  },
                  {
                    title: 'Ma benh chinh',
                    dataIndex: 'maBenhChinh',
                    key: 'maBenhChinh',
                    width: 120,
                  },
                  {
                    title: 'Tien BHYT',
                    dataIndex: 'tienBhyt',
                    key: 'tienBhyt',
                    width: 130,
                    align: 'right' as const,
                    render: (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + ' VND',
                  },
                ]}
                dataSource={(bhxhHistory.visits || []).map((v, idx) => ({ ...v, key: idx }))}
                pagination={false}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span>Khong co lich su KCB</span>
            </div>
          )}
        </Spin>
      </Modal>
    </Spin>
  );
};

export default Reception;
