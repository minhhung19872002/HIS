import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Tag,
  Modal,
  Form,
  Select,
  DatePicker,
  TimePicker,
  InputNumber,
  message,
  Tabs,
  Badge,
  Descriptions,
  Alert,
  Spin
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getSurgeries, getOperatingRooms, createSurgeryRequest, scheduleSurgery, startSurgery as apiStartSurgery, completeSurgery, searchIcdCodes, searchServices, getSurgeryConsents, saveSurgeryConsent, signConsent, validateConsents, type SurgeryDto, type OperatingRoomDto, type SurgerySearchDto, type CreateSurgeryRequestDto, type ScheduleSurgeryDto, type StartSurgeryDto, type CompleteSurgeryDto, type IcdCodeDto, type ServiceDto as SurgeryServiceDto, type SurgeryConsentDto, type ConsentValidationResult } from '../api/surgery';
import { examinationApi } from '../api/examination';
import { HOSPITAL_NAME } from '../constants/hospital';

const { Search } = Input;
const { TextArea } = Input;

// Interfaces
interface SurgeryRequest {
  id: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  age?: number;
  requestDate: string;
  surgeryType: string;
  plannedProcedure?: string;
  requestingDoctorName: string;
  priority: number; // 1: Normal, 2: Urgent, 3: Emergency
  status: number; // 0: Pending, 1: Scheduled, 2: InProgress, 3: Completed, 4: Cancelled
  preOpDiagnosis?: string;
  estimatedDuration?: number;
  anesthesiaType?: number;
}

interface SurgerySchedule {
  id: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  surgeryType: string;
  plannedProcedure?: string;
  operatingRoomName: string;
  scheduledDateTime: string;
  estimatedDuration?: number;
  surgeonName: string;
  anesthesiologistName?: string;
  status: number; // 0: Scheduled, 1: Confirmed, 2: Preparing, 3: InProgress, 4: Completed, 5: Cancelled
}

interface OperatingRoom {
  id: string;
  roomCode: string;
  roomName: string;
  roomType: number; // 1: Major, 2: Minor, 3: Emergency, 4: Specialty
  status: number; // 1: Available, 2: InUse, 3: Maintenance, 4: Inactive
  location?: string;
  todaySchedules?: SurgerySchedule[];
}

interface SurgeryRecord {
  id: string;
  requestCode: string;
  patientName: string;
  patientCode: string;
  operatingRoomName: string;
  scheduledDateTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  actualDuration?: number;
  procedurePerformed?: string;
  surgeonName: string;
  result?: number; // 1: Success, 2: Complications, 3: Death
  isApproved: boolean;
}

const Surgery: React.FC = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [surgeryRequests, setSurgeryRequests] = useState<SurgeryRequest[]>([]);
  const [surgerySchedules, setSurgerySchedules] = useState<SurgerySchedule[]>([]);
  const [operatingRooms, setOperatingRooms] = useState<OperatingRoom[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState<SurgeryRequest | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<SurgerySchedule | null>(null);

  // Filter states
  const [requestSearchText, setRequestSearchText] = useState('');
  const [scheduleSearchText, setScheduleSearchText] = useState('');
  const [scheduleFilterDate, setScheduleFilterDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [scheduleFilterRoom, setScheduleFilterRoom] = useState<string | undefined>(undefined);
  const [recordSearchText, setRecordSearchText] = useState('');
  const [recordDateRange, setRecordDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // State for searchable select options in request form
  const [medicalRecordOptions, setMedicalRecordOptions] = useState<{ value: string; label: string }[]>([]);
  const [surgeryServiceOptions, setSurgeryServiceOptions] = useState<{ value: string; label: string }[]>([]);
  const [icdCodeOptions, setIcdCodeOptions] = useState<{ value: string; label: string; code: string }[]>([]);
  const [searchingMedicalRecords, setSearchingMedicalRecords] = useState(false);
  const [searchingSurgeryServices, setSearchingSurgeryServices] = useState(false);
  const [searchingIcdCodes, setSearchingIcdCodes] = useState(false);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isStartSurgeryModalOpen, setIsStartSurgeryModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Consent management
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [consents, setConsents] = useState<SurgeryConsentDto[]>([]);
  const [consentValidation, setConsentValidation] = useState<ConsentValidationResult | null>(null);
  const [consentForm] = Form.useForm();
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signingConsentId, setSigningConsentId] = useState<string | null>(null);
  const [signForm] = Form.useForm();

  // Fetch data from backend API
  const fetchSurgeries = async (searchDto?: SurgerySearchDto) => {
    setLoading(true);
    try {
      const response = await getSurgeries(searchDto || { page: 1, pageSize: 20 });
      // Map API response to local SurgeryRequest format
      const requests: SurgeryRequest[] = response.data.items.map((s: SurgeryDto) => ({
        id: s.id,
        requestCode: s.surgeryCode,
        patientCode: s.patientCode,
        patientName: s.patientName,
        gender: s.gender === 'Nam' ? 1 : 2,
        dateOfBirth: s.dateOfBirth,
        requestDate: s.createdAt,
        surgeryType: s.surgeryTypeName,
        plannedProcedure: s.surgeryServiceName,
        requestingDoctorName: s.requestDoctorName || 'N/A',
        priority: s.surgeryNature,
        status: s.status,
        preOpDiagnosis: s.preOperativeDiagnosis,
        estimatedDuration: s.durationMinutes,
        anesthesiaType: s.anesthesiaType,
      }));
      setSurgeryRequests(requests);
    } catch (error) {
      console.warn('Error fetching surgeries:', error);
      message.warning('Không thể tải danh sách phẫu thuật');
    } finally {
      setLoading(false);
    }
  };

  const fetchOperatingRooms = async () => {
    try {
      const response = await getOperatingRooms();
      const rooms: OperatingRoom[] = response.data.map((r: OperatingRoomDto) => ({
        id: r.id,
        roomCode: r.code,
        roomName: r.name,
        roomType: r.roomType,
        status: r.status === 0 ? 1 : 2, // Map: 0=Trống->1=Available, 1=Đang sử dụng->2=InUse
        location: r.description || '',
      }));
      setOperatingRooms(rooms);
    } catch (error) {
      console.warn('Error fetching operating rooms:', error);
    }
  };

  useEffect(() => {
    fetchSurgeries();
    fetchOperatingRooms();
  }, []);

  const [requestForm] = Form.useForm();
  const [scheduleForm] = Form.useForm();
  const [startSurgeryForm] = Form.useForm();
  const [printForm] = Form.useForm();

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

  // Get request status tag
  const getRequestStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ lên lịch</Tag>;
      case 1:
        return <Tag color="blue" icon={<CalendarOutlined />}>Đã lên lịch</Tag>;
      case 2:
        return <Tag color="purple" icon={<MedicineBoxOutlined />}>Đang thực hiện</Tag>;
      case 3:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>;
      case 4:
        return <Tag color="red">Đã hủy</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Get schedule status tag
  const getScheduleStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="blue">Đã lên lịch</Tag>;
      case 1:
        return <Tag color="cyan">Đã xác nhận</Tag>;
      case 2:
        return <Tag color="orange">Đang chuẩn bị</Tag>;
      case 3:
        return <Tag color="purple" icon={<MedicineBoxOutlined />}>Đang mổ</Tag>;
      case 4:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>;
      case 5:
        return <Tag color="red">Đã hủy</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Get room status tag
  const getRoomStatusTag = (status: number) => {
    switch (status) {
      case 1:
        return <Tag color="green">Sẵn sàng</Tag>;
      case 2:
        return <Tag color="red">Đang sử dụng</Tag>;
      case 3:
        return <Tag color="orange">Đang bảo trì</Tag>;
      case 4:
        return <Tag color="default">Ngừng hoạt động</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Search medical records by keyword (patient code/name)
  const handleSearchMedicalRecords = async (keyword: string) => {
    if (!keyword || keyword.length < 2) {
      setMedicalRecordOptions([]);
      return;
    }
    setSearchingMedicalRecords(true);
    try {
      const response = await examinationApi.searchExaminations({
        keyword,
        pageIndex: 1,
        pageSize: 20,
      });
      if (response.data?.items) {
        const options = response.data.items.map((item: any) => ({
          value: item.id,
          label: `${item.patientCode} - ${item.patientName} (${item.id.substring(0, 8)})`,
        }));
        setMedicalRecordOptions(options);
      }
    } catch (error) {
      console.warn('Error searching medical records:', error);
    } finally {
      setSearchingMedicalRecords(false);
    }
  };

  // Search surgery services by keyword
  const handleSearchSurgeryServices = async (keyword: string) => {
    if (!keyword || keyword.length < 2) {
      setSurgeryServiceOptions([]);
      return;
    }
    setSearchingSurgeryServices(true);
    try {
      const response = await searchServices(keyword, 1); // serviceType=1 for surgery services
      if (response.data) {
        const options = response.data.map((svc: SurgeryServiceDto) => ({
          value: svc.id,
          label: `${svc.code} - ${svc.name} (${svc.unitPrice?.toLocaleString() || 0} đ)`,
        }));
        setSurgeryServiceOptions(options);
      }
    } catch (error) {
      console.warn('Error searching surgery services:', error);
    } finally {
      setSearchingSurgeryServices(false);
    }
  };

  // Search ICD codes by keyword
  const handleSearchIcdCodes = async (keyword: string) => {
    if (!keyword || keyword.length < 2) {
      setIcdCodeOptions([]);
      return;
    }
    setSearchingIcdCodes(true);
    try {
      const response = await searchIcdCodes(keyword);
      if (response.data) {
        const options = response.data.map((icd: IcdCodeDto) => ({
          value: icd.code,
          label: `${icd.code} - ${icd.name}`,
          code: icd.code,
        }));
        setIcdCodeOptions(options);
      }
    } catch (error) {
      console.warn('Error searching ICD codes:', error);
    } finally {
      setSearchingIcdCodes(false);
    }
  };

  // Handle create request
  const handleCreateRequest = () => {
    requestForm.resetFields();
    setSelectedRequest(null);
    setIsRequestModalOpen(true);
  };

  const handleRequestSubmit = async () => {
    try {
      const values = await requestForm.validateFields();

      // Build API request DTO
      const dto: CreateSurgeryRequestDto = {
        medicalRecordId: values.medicalRecordId,
        surgeryServiceId: values.surgeryServiceId,
        surgeryType: values.surgeryType || 1,
        surgeryClass: 2, // Loại 1
        surgeryNature: values.priority || 1,
        preOperativeDiagnosis: values.preOpDiagnosis,
        preOperativeIcdCode: values.preOperativeIcdCode || '',
        surgeryMethod: values.plannedProcedure,
        anesthesiaType: values.anesthesiaType || 2,
        anesthesiaMethod: '',
        scheduledDate: undefined,
        operatingRoomId: undefined,
        notes: `Bệnh nhân: ${values.patientCode} - ${values.patientName}`,
      };

      // Call API to create surgery request
      const response = await createSurgeryRequest(dto);

      // Also add to local state for immediate UI update
      const newRequest: SurgeryRequest = {
        id: response.data?.id || `${surgeryRequests.length + 1}`,
        requestCode: response.data?.surgeryCode || `PT${dayjs().format('YYMMDD')}${(surgeryRequests.length + 1).toString().padStart(4, '0')}`,
        patientCode: values.patientCode,
        patientName: values.patientName,
        gender: values.gender,
        requestDate: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
        surgeryType: values.surgeryType,
        plannedProcedure: values.plannedProcedure,
        requestingDoctorName: values.requestingDoctorName,
        priority: values.priority,
        status: 0,
        preOpDiagnosis: values.preOpDiagnosis,
        estimatedDuration: values.estimatedDuration,
        anesthesiaType: values.anesthesiaType,
      };

      setSurgeryRequests([...surgeryRequests, newRequest]);
      message.success('Tạo yêu cầu phẫu thuật thành công');
      setIsRequestModalOpen(false);
      requestForm.resetFields();
    } catch (error) {
      console.warn('Error creating surgery request:', error);
      message.warning('Có lỗi xảy ra khi tạo yêu cầu phẫu thuật');
    }
  };

  // Handle schedule surgery
  const handleScheduleSurgery = (record: SurgeryRequest) => {
    setSelectedRequest(record);
    scheduleForm.setFieldsValue({
      scheduledDate: dayjs().add(1, 'day'),
      scheduledTime: dayjs('08:00', 'HH:mm'),
      estimatedDuration: record.estimatedDuration || 60,
    });
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async () => {
    try {
      const values = await scheduleForm.validateFields();
      if (!selectedRequest) return;

      const scheduledDateTime = values.scheduledDate
        .hour(values.scheduledTime.hour())
        .minute(values.scheduledTime.minute());

      // Call API to schedule surgery
      const scheduleDto: ScheduleSurgeryDto = {
        surgeryId: selectedRequest.id,
        scheduledDate: scheduledDateTime.format('YYYY-MM-DDTHH:mm:ss'),
        operatingRoomId: values.operatingRoomId,
        estimatedDurationMinutes: values.estimatedDuration,
      };

      await scheduleSurgery(scheduleDto);

      // Find room name for local state update
      const selectedRoom = operatingRooms.find(r => r.id === values.operatingRoomId);

      const newSchedule: SurgerySchedule = {
        id: selectedRequest.id,
        requestCode: selectedRequest.requestCode,
        patientCode: selectedRequest.patientCode,
        patientName: selectedRequest.patientName,
        surgeryType: selectedRequest.surgeryType,
        plannedProcedure: selectedRequest.plannedProcedure,
        operatingRoomName: selectedRoom?.roomName || 'Phòng mổ',
        scheduledDateTime: scheduledDateTime.format('YYYY-MM-DDTHH:mm:ss'),
        estimatedDuration: values.estimatedDuration,
        surgeonName: values.surgeonName,
        anesthesiologistName: values.anesthesiologistName,
        status: 0,
      };

      setSurgerySchedules([...surgerySchedules, newSchedule]);

      // Update request status
      setSurgeryRequests(prev =>
        prev.map(req =>
          req.id === selectedRequest.id ? { ...req, status: 1 } : req
        )
      );

      message.success('Lên lịch phẫu thuật thành công');
      setIsScheduleModalOpen(false);
      scheduleForm.resetFields();
      setSelectedRequest(null);
    } catch (error) {
      console.warn('Error scheduling surgery:', error);
      message.warning('Có lỗi xảy ra khi lên lịch phẫu thuật');
    }
  };

  // Handle start surgery
  const handleStartSurgery = (record: SurgerySchedule) => {
    setSelectedSchedule(record);
    startSurgeryForm.setFieldsValue({
      actualStartTime: dayjs(),
    });
    setIsStartSurgeryModalOpen(true);
  };

  const handleStartSurgerySubmit = async () => {
    if (!selectedSchedule) return;

    try {
      const values = await startSurgeryForm.validateFields();

      // Call API to start surgery
      const startDto: StartSurgeryDto = {
        surgeryId: selectedSchedule.id,
        startTime: dayjs(values.actualStartTime).format('YYYY-MM-DDTHH:mm:ss'),
      };

      await apiStartSurgery(startDto);

      // Update schedule status locally
      setSurgerySchedules(prev =>
        prev.map(sch =>
          sch.id === selectedSchedule.id ? { ...sch, status: 3 } : sch
        )
      );

      // Update request status to InProgress
      setSurgeryRequests(prev =>
        prev.map(req =>
          req.requestCode === selectedSchedule.requestCode ? { ...req, status: 2 } : req
        )
      );

      message.success('Bắt đầu phẫu thuật thành công');
      setIsStartSurgeryModalOpen(false);
      startSurgeryForm.resetFields();
      setSelectedSchedule(null);
    } catch (error) {
      console.warn('Error starting surgery:', error);
      message.warning('Có lỗi xảy ra khi bắt đầu phẫu thuật');
    }
  };

  // Handle complete surgery
  const handleCompleteSurgery = (record: SurgerySchedule) => {
    Modal.confirm({
      title: 'Hoàn thành phẫu thuật',
      content: `Xác nhận hoàn thành ca phẫu thuật ${record.requestCode} - ${record.patientName}?`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const completeDto: CompleteSurgeryDto = {
            surgeryId: record.id,
            endTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
          };
          await completeSurgery(completeDto);

          // Update schedule status locally
          setSurgerySchedules(prev =>
            prev.map(sch =>
              sch.id === record.id ? { ...sch, status: 4 } : sch
            )
          );

          // Update request status to Completed
          setSurgeryRequests(prev =>
            prev.map(req =>
              req.requestCode === record.requestCode ? { ...req, status: 3 } : req
            )
          );

          message.success('Hoàn thành phẫu thuật thành công');
        } catch (error) {
          console.warn('Error completing surgery:', error);
          message.warning('Có lỗi xảy ra khi hoàn thành phẫu thuật');
        }
      },
    });
  };

  // Handle print surgery record (Phiếu phẫu thuật/thủ thuật - MS: 06/BV-02)
  const handlePrintSurgeryRecord = (record: SurgerySchedule) => {
    setSelectedSchedule(record);

    // Find the corresponding request for additional info
    const request = surgeryRequests.find(r => r.requestCode === record.requestCode);

    printForm.setFieldsValue({
      hospitalName: HOSPITAL_NAME,
      patientName: record.patientName,
      patientCode: record.patientCode,
      age: request?.age,
      gender: request?.gender === 1 ? 'Nam' : 'Nữ',
      departmentName: 'Khoa Ngoại',
      roomName: record.operatingRoomName,
      bedName: '',
      admissionTime: '',
      surgeryTime: record.scheduledDateTime ? dayjs(record.scheduledDateTime).format('HH:mm DD/MM/YYYY') : '',
      preOpDiagnosis: request?.preOpDiagnosis,
      postOpDiagnosis: '',
      surgeryMethod: record.plannedProcedure,
      surgeryType: record.surgeryType,
      anesthesiaMethod: request?.anesthesiaType === 1 ? 'Gây mê toàn thân' :
        request?.anesthesiaType === 2 ? 'Gây tê tủy sống' :
        request?.anesthesiaType === 3 ? 'Gây tê tại chỗ' : 'Khác',
      surgeonName: record.surgeonName,
      anesthesiologistName: record.anesthesiologistName,
      surgeryDescription: '',
      drainInfo: '',
      stitchRemovalDate: '',
      notes: '',
    });

    setIsPrintModalOpen(true);
  };

  // Execute print for surgery record
  const executePrintSurgeryRecord = () => {
    const formValues = printForm.getFieldsValue();

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.warning('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu phẫu thuật/thủ thuật - MS: 06/BV-02</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.5; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .header-left { width: 30%; }
          .header-right { width: 30%; text-align: right; }
          .title { font-size: 16px; font-weight: bold; text-align: center; margin: 15px 0 20px; text-decoration: underline; }
          .row { margin: 8px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 150px; display: inline-block; padding: 0 5px; }
          .field-long { border-bottom: 1px dotted #000; width: 100%; display: block; min-height: 20px; padding: 2px 5px; margin-top: 3px; }
          .section { margin: 15px 0; }
          .section-title { font-weight: bold; margin: 15px 0 10px 0; text-decoration: underline; }
          .two-col { display: flex; justify-content: space-between; }
          .signature { text-align: center; margin-top: 40px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div className="header">
          <div className="header-left">
            <div>Sở Y tế: <span className="field">..........................</span></div>
            <div>BV: <span className="field">${formValues.hospitalName || ''}</span></div>
          </div>
          <div style="text-align: right;">
            <div><strong>MS: 06/BV-02</strong></div>
            <div>Số vào viện: <span className="field">${selectedSchedule?.requestCode || ''}</span></div>
          </div>
        </div>

        <div className="title">Phiếu phẫu thuật/thủ thuật</div>

        <div className="row">
          - Họ tên người bệnh: <span className="field">${formValues.patientName || ''}</span>
          Tuổi: <span className="field">${formValues.age || ''}</span>
          ${formValues.gender || 'Nam/Nữ'}
        </div>
        <div className="row">
          - Khoa: <span className="field">${formValues.departmentName || ''}</span>
          Buồng: <span className="field">${formValues.roomName || ''}</span>
          Giường: <span className="field">${formValues.bedName || ''}</span>
        </div>
        <div className="row">
          - Vào viện lúc: <span className="field">${formValues.admissionTime || '......... giờ ....... phút'}</span>
          ngày <span className="field">........ tháng ........ năm ........</span>
        </div>
        <div className="row">
          - Phẫu thuật/thủ thuật lúc: <span className="field">${formValues.surgeryTime || ''}</span>
        </div>

        <div className="section">
          <div className="row">- Chẩn đoán:</div>
          <div className="row" style="margin-left: 20px;">
            . Trước phẫu thuật/thủ thuật: <span className="field-long">${formValues.preOpDiagnosis || ''}</span>
          </div>
          <div className="row" style="margin-left: 20px;">
            . Sau phẫu thuật/thủ thuật: <span className="field-long">${formValues.postOpDiagnosis || ''}</span>
          </div>
        </div>

        <div className="row">
          - Phương pháp phẫu thuật/thủ thuật: <span className="field-long">${formValues.surgeryMethod || ''}</span>
        </div>
        <div className="row">
          - Loại phẫu thuật/thủ thuật: <span className="field">${formValues.surgeryType || ''}</span>
        </div>
        <div className="row">
          - Phương pháp vô cảm: <span className="field">${formValues.anesthesiaMethod || ''}</span>
        </div>
        <div className="row">
          - Bác sĩ phẫu thuật/thủ thuật: <span className="field">${formValues.surgeonName || ''}</span>
        </div>
        <div className="row">
          - Bác sĩ gây mê hồi sức: <span className="field">${formValues.anesthesiologistName || ''}</span>
        </div>

        <div className="section-title">Lược đồ phẫu thuật/thủ thuật</div>
        <div style="border: 1px solid #ccc; min-height: 150px; padding: 10px; margin: 10px 0;">
          ${formValues.surgeryDiagram || ''}
        </div>

        <div className="row">- Dẫn lưu: <span className="field">${formValues.drainInfo || ''}</span></div>
        <div className="row">- Bấc: <span className="field">${formValues.packingInfo || ''}</span></div>
        <div className="row">- Ngày rút: <span className="field">${formValues.removalDate || ''}</span></div>
        <div className="row">- Ngày cắt chỉ: <span className="field">${formValues.stitchRemovalDate || ''}</span></div>
        <div className="row">- Khác: <span className="field">${formValues.notes || ''}</span></div>

        <div className="section-title">Trình tự phẫu thuật/thủ thuật</div>
        <div style="border: 1px solid #ccc; min-height: 200px; padding: 10px; margin: 10px 0; white-space: pre-wrap;">
          ${formValues.surgeryDescription || ''}
        </div>

        <div className="signature">
          <div>Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</div>
          <div style="margin-top: 10px;"><strong>Phẫu thuật/thủ thuật viên</strong></div>
          <div style="margin-top: 50px;">Họ tên: ${formValues.surgeonName || '..................................'}</div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  // Surgery Requests columns
  const requestColumns: ColumnsType<SurgeryRequest> = [
    {
      title: 'Mã yêu cầu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 120,
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
      title: 'Loại PT',
      dataIndex: 'surgeryType',
      key: 'surgeryType',
      width: 130,
    },
    {
      title: 'Phương pháp PT',
      dataIndex: 'plannedProcedure',
      key: 'plannedProcedure',
      width: 180,
    },
    {
      title: 'BS chỉ định',
      dataIndex: 'requestingDoctorName',
      key: 'requestingDoctorName',
      width: 130,
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
      title: 'Ngày yêu cầu',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => getRequestStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleOpenConsentModal(record)}
          >
            Cam kết
          </Button>
          {record.status === 0 && (
            <Button
              type="primary"
              size="small"
              icon={<CalendarOutlined />}
              onClick={() => handleScheduleSurgery(record)}
            >
              Lên lịch
            </Button>
          )}
          {record.status === 1 && (
            <Tag color="blue">Đã lên lịch</Tag>
          )}
        </div>
      ),
    },
  ];

  // Surgery Schedules columns
  const scheduleColumns: ColumnsType<SurgerySchedule> = [
    {
      title: 'Mã yêu cầu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 120,
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
      title: 'Phương pháp PT',
      dataIndex: 'plannedProcedure',
      key: 'plannedProcedure',
      width: 180,
    },
    {
      title: 'Phòng mổ',
      dataIndex: 'operatingRoomName',
      key: 'operatingRoomName',
      width: 130,
    },
    {
      title: 'Ngày giờ mổ',
      dataIndex: 'scheduledDateTime',
      key: 'scheduledDateTime',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Thời gian dự kiến',
      dataIndex: 'estimatedDuration',
      key: 'estimatedDuration',
      width: 130,
      render: (duration) => duration ? `${duration} phút` : '-',
    },
    {
      title: 'Phẫu thuật viên',
      dataIndex: 'surgeonName',
      key: 'surgeonName',
      width: 130,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => getScheduleStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          {(record.status === 0 || record.status === 1) && (
            <Button
              type="primary"
              size="small"
              icon={<MedicineBoxOutlined />}
              onClick={() => handleStartSurgery(record)}
            >
              Bắt đầu
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Operating Rooms columns
  const roomColumns: ColumnsType<OperatingRoom> = [
    {
      title: 'Mã phòng',
      dataIndex: 'roomCode',
      key: 'roomCode',
      width: 100,
    },
    {
      title: 'Tên phòng',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 150,
    },
    {
      title: 'Loại phòng',
      dataIndex: 'roomType',
      key: 'roomType',
      width: 150,
      render: (type) => {
        const types = { 1: 'Phòng mổ lớn', 2: 'Phòng mổ nhỏ', 3: 'Phòng mổ cấp cứu', 4: 'Phòng mổ chuyên khoa' };
        return types[type as keyof typeof types] || '-';
      },
    },
    {
      title: 'Vị trí',
      dataIndex: 'location',
      key: 'location',
      width: 200,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getRoomStatusTag(status),
    },
    {
      title: 'Lịch hôm nay',
      key: 'todaySchedules',
      width: 100,
      render: (_, record) => (
        <span className="text-sm">{record.todaySchedules?.length || 0} ca</span>
      ),
    },
  ];

  // In Progress columns
  const inProgressColumns: ColumnsType<SurgerySchedule> = [
    {
      title: 'Mã yêu cầu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 120,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Phương pháp PT',
      dataIndex: 'plannedProcedure',
      key: 'plannedProcedure',
      width: 180,
    },
    {
      title: 'Phòng mổ',
      dataIndex: 'operatingRoomName',
      key: 'operatingRoomName',
      width: 130,
    },
    {
      title: 'Phẫu thuật viên',
      dataIndex: 'surgeonName',
      key: 'surgeonName',
      width: 130,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button type="primary" size="small" onClick={() => handleCompleteSurgery(record)}>
            Hoàn thành
          </Button>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => handlePrintSurgeryRecord(record)}
          >
            In phiếu
          </Button>
        </div>
      ),
    },
  ];

  // Filtered data
  const filteredRequests = surgeryRequests.filter(r => {
    if (!requestSearchText) return true;
    const text = requestSearchText.toLowerCase();
    return (
      r.requestCode?.toLowerCase().includes(text) ||
      r.patientCode?.toLowerCase().includes(text) ||
      r.patientName?.toLowerCase().includes(text)
    );
  });

  const filteredSchedules = surgerySchedules.filter(s => {
    let match = true;
    if (scheduleSearchText) {
      const text = scheduleSearchText.toLowerCase();
      match = match && (
        s.requestCode?.toLowerCase().includes(text) ||
        s.patientName?.toLowerCase().includes(text)
      );
    }
    if (scheduleFilterDate) {
      match = match && dayjs(s.scheduledDateTime).isSame(scheduleFilterDate, 'day');
    }
    if (scheduleFilterRoom) {
      match = match && s.operatingRoomName === operatingRooms.find(r => r.id === scheduleFilterRoom)?.roomName;
    }
    return match;
  });

  const filteredRecords = surgerySchedules.filter(s => {
    if (s.status !== 4) return false; // Only completed
    let match = true;
    if (recordSearchText) {
      const text = recordSearchText.toLowerCase();
      match = match && (
        s.requestCode?.toLowerCase().includes(text) ||
        s.patientName?.toLowerCase().includes(text)
      );
    }
    if (recordDateRange && recordDateRange[0] && recordDateRange[1]) {
      const schedDate = dayjs(s.scheduledDateTime);
      match = match && schedDate.isAfter(recordDateRange[0].startOf('day')) && schedDate.isBefore(recordDateRange[1].endOf('day'));
    }
    return match;
  });

  const pendingRequests = surgeryRequests.filter(r => r.status === 0);
  const scheduledSurgeries = filteredSchedules.filter(s => s.status < 3);
  const inProgressSurgeries = surgerySchedules.filter(s => s.status === 3);

  // Consent management functions
  const loadConsents = async (surgeryId: string) => {
    try {
      const data = await getSurgeryConsents(surgeryId);
      setConsents(data);
      const validation = await validateConsents(surgeryId);
      setConsentValidation(validation);
    } catch {
      setConsents([]);
      setConsentValidation(null);
    }
  };

  const handleOpenConsentModal = (record: SurgeryRequest) => {
    setSelectedRequest(record);
    loadConsents(record.id);
    setIsConsentModalOpen(true);
  };

  const handleSaveConsent = async (values: Record<string, unknown>) => {
    if (!selectedRequest) return;
    try {
      await saveSurgeryConsent({
        surgeryId: selectedRequest.id,
        consentType: values.consentType as number,
        diagnosis: values.diagnosis as string,
        plannedProcedure: values.plannedProcedure as string,
        risks: values.risks as string,
        alternatives: values.alternatives as string,
        doctorExplanation: values.doctorExplanation as string,
      });
      message.success('Đã lưu cam kết');
      consentForm.resetFields();
      loadConsents(selectedRequest.id);
    } catch {
      message.warning('Không thể lưu cam kết');
    }
  };

  const handleSignConsent = async (values: Record<string, string>) => {
    if (!signingConsentId || !selectedRequest) return;
    try {
      await signConsent(signingConsentId, values.signerName, values.relationship);
      message.success('Đã ký cam kết');
      setIsSignModalOpen(false);
      signForm.resetFields();
      loadConsents(selectedRequest.id);
    } catch {
      message.warning('Không thể ký cam kết');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800 m-0">Quản lý Phẫu thuật / Thủ thuật</h2>
        <Button icon={<ReloadOutlined />} onClick={() => { fetchSurgeries(); fetchOperatingRooms(); }} size="small">Làm mới</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'requests',
              label: (
                <span>
                  <FileTextOutlined />
                  Yêu cầu phẫu thuật
                  {pendingRequests.length > 0 && (
                    <Badge count={pendingRequests.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex-1">
                      <Search
                        placeholder="Tìm theo mã yêu cầu, mã BN, tên bệnh nhân..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                        onSearch={(value) => setRequestSearchText(value)}
                        onChange={(e) => { if (!e.target.value) setRequestSearchText(''); }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Button icon={<ReloadOutlined />} onClick={() => { setRequestSearchText(''); fetchSurgeries(); }}>Làm mới</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateRequest}>
                          Tạo yêu cầu
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Table
                    columns={requestColumns}
                    dataSource={filteredRequests}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1600 }}
                    loading={loading}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} yêu cầu`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedRequest(record);
                        Modal.info({
                          title: `Chi tiết yêu cầu: ${record.requestCode}`,
                          width: 700,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Mã yêu cầu">{record.requestCode}</Descriptions.Item>
                              <Descriptions.Item label="Mã BN">{record.patientCode}</Descriptions.Item>
                              <Descriptions.Item label="Họ tên">{record.patientName}</Descriptions.Item>
                              <Descriptions.Item label="Giới tính">{record.gender === 1 ? 'Nam' : 'Nữ'}</Descriptions.Item>
                              <Descriptions.Item label="Loại PT">{record.surgeryType}</Descriptions.Item>
                              <Descriptions.Item label="Độ ưu tiên">{getPriorityBadge(record.priority)}</Descriptions.Item>
                              <Descriptions.Item label="Phương pháp PT" span={2}>{record.plannedProcedure}</Descriptions.Item>
                              <Descriptions.Item label="Chẩn đoán trước mổ" span={2}>{record.preOpDiagnosis}</Descriptions.Item>
                              <Descriptions.Item label="BS chỉ định">{record.requestingDoctorName}</Descriptions.Item>
                              <Descriptions.Item label="Thời gian dự kiến">{record.estimatedDuration ? `${record.estimatedDuration} phút` : '-'}</Descriptions.Item>
                              <Descriptions.Item label="Ngày yêu cầu">{dayjs(record.requestDate).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">{getRequestStatusTag(record.status)}</Descriptions.Item>
                            </Descriptions>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'schedules',
              label: (
                <span>
                  <CalendarOutlined />{' '}
                  Lịch phẫu thuật
                  {scheduledSurgeries.length > 0 && (
                    <Badge count={scheduledSurgeries.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <DatePicker
                        placeholder="Chọn ngày"
                        format="DD/MM/YYYY"
                        defaultValue={dayjs()}
                        onChange={(date) => setScheduleFilterDate(date)}
                      />
                    </div>
                    <div>
                      <Select
                        placeholder="Chọn phòng mổ"
                        style={{ width: 200 }}
                        allowClear
                        onChange={(value) => setScheduleFilterRoom(value)}
                      >
                        {operatingRooms.map(room => (
                          <Select.Option key={room.id} value={room.id}>
                            {room.roomName}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Search
                        placeholder="Tìm theo mã yêu cầu, tên bệnh nhân..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                        onSearch={(value) => setScheduleSearchText(value)}
                        onChange={(e) => { if (!e.target.value) setScheduleSearchText(''); }}
                      />
                    </div>
                  </div>

                  <Table
                    columns={scheduleColumns}
                    dataSource={filteredSchedules}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1500 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} ca phẫu thuật`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedSchedule(record);
                        Modal.info({
                          title: `Chi tiết lịch mổ: ${record.requestCode}`,
                          width: 700,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Mã yêu cầu">{record.requestCode}</Descriptions.Item>
                              <Descriptions.Item label="Mã BN">{record.patientCode}</Descriptions.Item>
                              <Descriptions.Item label="Họ tên">{record.patientName}</Descriptions.Item>
                              <Descriptions.Item label="Loại PT">{record.surgeryType}</Descriptions.Item>
                              <Descriptions.Item label="Phòng mổ">{record.operatingRoomName}</Descriptions.Item>
                              <Descriptions.Item label="Ngày giờ mổ">{dayjs(record.scheduledDateTime).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                              <Descriptions.Item label="Phương pháp PT" span={2}>{record.plannedProcedure}</Descriptions.Item>
                              <Descriptions.Item label="Thời gian dự kiến">{record.estimatedDuration ? `${record.estimatedDuration} phút` : '-'}</Descriptions.Item>
                              <Descriptions.Item label="Phẫu thuật viên">{record.surgeonName}</Descriptions.Item>
                              <Descriptions.Item label="BS gây mê">{record.anesthesiologistName || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">{getScheduleStatusTag(record.status)}</Descriptions.Item>
                            </Descriptions>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'rooms',
              label: (
                <span>
                  <TeamOutlined />
                  Phòng mổ
                </span>
              ),
              children: (
                <>
                  <Alert
                    title="Trạng thái phòng mổ"
                    description="Theo dõi trạng thái và lịch sử dụng các phòng mổ trong ngày"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Table
                    columns={roomColumns}
                    dataSource={operatingRooms}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Chi tiết phòng mổ: ${record.roomCode}`,
                          width: 500,
                          content: (
                            <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Mã phòng">{record.roomCode}</Descriptions.Item>
                              <Descriptions.Item label="Tên phòng">{record.roomName}</Descriptions.Item>
                              <Descriptions.Item label="Loại phòng">
                                {record.roomType === 1 ? 'Phòng mổ lớn' : record.roomType === 2 ? 'Phòng mổ nhỏ' : record.roomType === 3 ? 'Phòng mổ cấp cứu' : 'Phòng mổ chuyên khoa'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Vị trí">{record.location || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">{getRoomStatusTag(record.status)}</Descriptions.Item>
                              <Descriptions.Item label="Lịch hôm nay">{record.todaySchedules?.length || 0} ca</Descriptions.Item>
                            </Descriptions>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'inprogress',
              label: (
                <span>
                  <MedicineBoxOutlined />
                  Đang thực hiện
                  {inProgressSurgeries.length > 0 && (
                    <Badge count={inProgressSurgeries.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Alert
                    title="Phẫu thuật đang thực hiện"
                    description="Danh sách các ca phẫu thuật đang được tiến hành"
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Table
                    columns={inProgressColumns}
                    dataSource={inProgressSurgeries}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedSchedule(record);
                        Modal.info({
                          title: `Ca mổ đang thực hiện: ${record.requestCode}`,
                          width: 600,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Mã yêu cầu">{record.requestCode}</Descriptions.Item>
                              <Descriptions.Item label="Mã BN">{record.patientCode}</Descriptions.Item>
                              <Descriptions.Item label="Họ tên">{record.patientName}</Descriptions.Item>
                              <Descriptions.Item label="Phòng mổ">{record.operatingRoomName}</Descriptions.Item>
                              <Descriptions.Item label="Phương pháp PT" span={2}>{record.plannedProcedure}</Descriptions.Item>
                              <Descriptions.Item label="Phẫu thuật viên">{record.surgeonName}</Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">{getScheduleStatusTag(record.status)}</Descriptions.Item>
                            </Descriptions>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'records',
              label: (
                <span>
                  <FileTextOutlined />
                  Hồ sơ phẫu thuật
                </span>
              ),
              children: (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <DatePicker.RangePicker
                        format="DD/MM/YYYY"
                        placeholder={['Từ ngày', 'Đến ngày']}
                        onChange={(dates) => setRecordDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
                      />
                    </div>
                    <div className="flex-1">
                      <Search
                        placeholder="Tìm theo mã yêu cầu, tên bệnh nhân..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                        onSearch={(value) => setRecordSearchText(value)}
                        onChange={(e) => { if (!e.target.value) setRecordSearchText(''); }}
                      />
                    </div>
                  </div>

                  {filteredRecords.length === 0 ? (
                    <Alert
                      title="Chưa có dữ liệu"
                      description="Chưa có hồ sơ phẫu thuật nào được hoàn thành"
                      type="info"
                      showIcon
                    />
                  ) : (
                    <Table
                      columns={scheduleColumns}
                      dataSource={filteredRecords}
                      rowKey="id"
                      size="small"
                      scroll={{ x: 1500 }}
                      pagination={{
                        showSizeChanger: true,
                        showTotal: (total) => `Tổng: ${total} hồ sơ`,
                      }}
                    />
                  )}
                </>
              ),
            },
          ]}
        />
      </div>

      {/* Create Request Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <PlusOutlined />
            <span>Tạo yêu cầu phẫu thuật</span>
          </div>
        }
        open={isRequestModalOpen}
        onOk={handleRequestSubmit}
        onCancel={() => {
          setIsRequestModalOpen(false);
          requestForm.resetFields();
        }}
        width={800}
        okText="Tạo yêu cầu"
        cancelText="Hủy"
      >
        <Form form={requestForm} layout="vertical">
          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/2">
              <Form.Item
                name="patientCode"
                label="Mã bệnh nhân"
                rules={[{ required: true, message: 'Vui lòng nhập mã bệnh nhân' }]}
              >
                <Input placeholder="Nhập hoặc tìm mã bệnh nhân" />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/2">
              <Form.Item
                name="patientName"
                label="Tên bệnh nhân"
                rules={[{ required: true, message: 'Vui lòng nhập tên bệnh nhân' }]}
              >
                <Input placeholder="Tên bệnh nhân" />
              </Form.Item>
            </div>
          </div>

          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/2">
              <Form.Item
                name="medicalRecordId"
                label="Hồ sơ bệnh án"
                rules={[{ required: true, message: 'Vui lòng chọn hồ sơ bệnh án' }]}
              >
                <Select
                  showSearch
                  filterOption={false}
                  placeholder="Tìm theo mã BN, tên bệnh nhân..."
                  onSearch={handleSearchMedicalRecords}
                  loading={searchingMedicalRecords}
                  notFoundContent={searchingMedicalRecords ? 'Đang tìm...' : 'Nhập ít nhất 2 ký tự'}
                  options={medicalRecordOptions}
                  allowClear
                />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/2">
              <Form.Item
                name="surgeryServiceId"
                label="Dịch vụ phẫu thuật"
                rules={[{ required: true, message: 'Vui lòng chọn dịch vụ phẫu thuật' }]}
              >
                <Select
                  showSearch
                  filterOption={false}
                  placeholder="Tìm theo mã hoặc tên dịch vụ..."
                  onSearch={handleSearchSurgeryServices}
                  loading={searchingSurgeryServices}
                  notFoundContent={searchingSurgeryServices ? 'Đang tìm...' : 'Nhập ít nhất 2 ký tự'}
                  options={surgeryServiceOptions}
                  allowClear
                />
              </Form.Item>
            </div>
          </div>

          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/2">
              <Form.Item
                name="surgeryType"
                label="Loại phẫu thuật"
                rules={[{ required: true, message: 'Vui lòng chọn loại phẫu thuật' }]}
              >
                <Select placeholder="Chọn loại phẫu thuật">
                  <Select.Option value="Phẫu thuật lớn">Phẫu thuật lớn</Select.Option>
                  <Select.Option value="Phẫu thuật nhỏ">Phẫu thuật nhỏ</Select.Option>
                  <Select.Option value="Phẫu thuật cấp cứu">Phẫu thuật cấp cứu</Select.Option>
                  <Select.Option value="Thủ thuật">Thủ thuật</Select.Option>
                </Select>
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/2">
              <Form.Item
                name="priority"
                label="Độ ưu tiên"
                rules={[{ required: true, message: 'Vui lòng chọn độ ưu tiên' }]}
              >
                <Select placeholder="Chọn độ ưu tiên">
                  <Select.Option value={1}>Bình thường</Select.Option>
                  <Select.Option value={2}>Khẩn</Select.Option>
                  <Select.Option value={3}>Cấp cứu</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </div>

          <Form.Item
            name="plannedProcedure"
            label="Phương pháp phẫu thuật"
            rules={[{ required: true, message: 'Vui lòng nhập phương pháp phẫu thuật' }]}
          >
            <Input placeholder="Nhập phương pháp phẫu thuật" />
          </Form.Item>

          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-3/4">
              <Form.Item
                name="preOpDiagnosis"
                label="Chẩn đoán trước mổ"
                rules={[{ required: true, message: 'Vui lòng nhập chẩn đoán' }]}
              >
                <TextArea rows={2} placeholder="Nhập chẩn đoán trước mổ" />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/4">
              <Form.Item
                name="preOperativeIcdCode"
                label="Mã ICD"
                rules={[{ required: true, message: 'Vui lòng chọn mã ICD' }]}
              >
                <Select
                  showSearch
                  filterOption={false}
                  placeholder="Tìm mã ICD..."
                  onSearch={handleSearchIcdCodes}
                  loading={searchingIcdCodes}
                  notFoundContent={searchingIcdCodes ? 'Đang tìm...' : 'Nhập ít nhất 2 ký tự'}
                  options={icdCodeOptions}
                  allowClear
                />
              </Form.Item>
            </div>
          </div>

          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/2">
              <Form.Item
                name="estimatedDuration"
                label="Thời gian dự kiến (phút)"
              >
                <InputNumber min={15} max={480} style={{ width: '100%' }} placeholder="60" />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/2">
              <Form.Item name="anesthesiaType" label="Loại gây mê">
                <Select placeholder="Chọn loại gây mê">
                  <Select.Option value={1}>Gây mê toàn thân</Select.Option>
                  <Select.Option value={2}>Gây tê tủy sống</Select.Option>
                  <Select.Option value={3}>Gây tê موضعی</Select.Option>
                  <Select.Option value={4}>Khác</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </div>

          <Form.Item
            name="requestingDoctorName"
            label="Bác sĩ chỉ định"
            rules={[{ required: true, message: 'Vui lòng nhập tên bác sĩ' }]}
          >
            <Input placeholder="Tên bác sĩ chỉ định" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Schedule Surgery Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <CalendarOutlined />
            <span>Lên lịch phẫu thuật</span>
          </div>
        }
        open={isScheduleModalOpen}
        onOk={handleScheduleSubmit}
        onCancel={() => {
          setIsScheduleModalOpen(false);
          scheduleForm.resetFields();
          setSelectedRequest(null);
        }}
        width={800}
        okText="Lên lịch"
        cancelText="Hủy"
      >
        {selectedRequest && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã yêu cầu">{selectedRequest.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedRequest.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{selectedRequest.patientName}</Descriptions.Item>
              <Descriptions.Item label="Loại PT">{selectedRequest.surgeryType}</Descriptions.Item>
              <Descriptions.Item label="Phương pháp PT" span={2}>
                {selectedRequest.plannedProcedure}
              </Descriptions.Item>
              <Descriptions.Item label="Chẩn đoán" span={2}>
                {selectedRequest.preOpDiagnosis}
              </Descriptions.Item>
            </Descriptions>

            <hr className="border-gray-200 my-4" />

            <Form form={scheduleForm} layout="vertical">
              <div className="flex gap-4 flex-wrap">
                <div className="w-full lg:w-1/2">
                  <Form.Item
                    name="scheduledDate"
                    label="Ngày mổ"
                    rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                  >
                    <DatePicker
                      format="DD/MM/YYYY"
                      style={{ width: '100%' }}
                      placeholder="Chọn ngày"
                      disabledDate={(current) => current && current < dayjs().startOf('day')}
                    />
                  </Form.Item>
                </div>
                <div className="w-full lg:w-1/2">
                  <Form.Item
                    name="scheduledTime"
                    label="Giờ mổ"
                    rules={[{ required: true, message: 'Vui lòng chọn giờ' }]}
                  >
                    <TimePicker
                      format="HH:mm"
                      style={{ width: '100%' }}
                      placeholder="Chọn giờ"
                      minuteStep={15}
                    />
                  </Form.Item>
                </div>
              </div>

              <div className="flex gap-4 flex-wrap">
                <div className="w-full lg:w-1/2">
                  <Form.Item
                    name="operatingRoomId"
                    label="Phòng mổ"
                    rules={[{ required: true, message: 'Vui lòng chọn phòng mổ' }]}
                  >
                    <Select placeholder="Chọn phòng mổ">
                      {operatingRooms
                        .filter(room => room.status === 1)
                        .map(room => (
                          <Select.Option key={room.id} value={room.id}>
                            {room.roomName}
                          </Select.Option>
                        ))}
                    </Select>
                  </Form.Item>
                </div>
                <div className="w-full lg:w-1/2">
                  <Form.Item
                    name="estimatedDuration"
                    label="Thời gian dự kiến (phút)"
                    rules={[{ required: true, message: 'Vui lòng nhập thời gian' }]}
                  >
                    <InputNumber min={15} max={480} style={{ width: '100%' }} />
                  </Form.Item>
                </div>
              </div>

              <Form.Item
                name="surgeonName"
                label="Phẫu thuật viên chính"
                rules={[{ required: true, message: 'Vui lòng nhập tên phẫu thuật viên' }]}
              >
                <Input placeholder="Tên phẫu thuật viên chính" />
              </Form.Item>

              <Form.Item name="anesthesiologistName" label="Bác sĩ gây mê">
                <Input placeholder="Tên bác sĩ gây mê" />
              </Form.Item>

              <Alert
                title="Lưu ý"
                description="Vui lòng kiểm tra lịch phòng mổ và ekip trước khi lên lịch"
                type="info"
                showIcon
              />
            </Form>
          </>
        )}
      </Modal>

      {/* Start Surgery Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <MedicineBoxOutlined />
            <span>Bắt đầu phẫu thuật</span>
          </div>
        }
        open={isStartSurgeryModalOpen}
        onOk={handleStartSurgerySubmit}
        onCancel={() => {
          setIsStartSurgeryModalOpen(false);
          startSurgeryForm.resetFields();
          setSelectedSchedule(null);
        }}
        width={700}
        okText="Bắt đầu"
        cancelText="Hủy"
      >
        {selectedSchedule && (
          <>
            <Alert
              title="Xác nhận bắt đầu phẫu thuật"
              description="Vui lòng kiểm tra kỹ thông tin bệnh nhân và ekip trước khi bắt đầu"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Mã yêu cầu">{selectedSchedule.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedSchedule.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{selectedSchedule.patientName}</Descriptions.Item>
              <Descriptions.Item label="Phòng mổ">{selectedSchedule.operatingRoomName}</Descriptions.Item>
              <Descriptions.Item label="Phương pháp PT" span={2}>
                {selectedSchedule.plannedProcedure}
              </Descriptions.Item>
              <Descriptions.Item label="Phẫu thuật viên">
                {selectedSchedule.surgeonName}
              </Descriptions.Item>
              <Descriptions.Item label="Bác sĩ gây mê">
                {selectedSchedule.anesthesiologistName || '-'}
              </Descriptions.Item>
            </Descriptions>

            <hr className="border-gray-200 my-4" />

            <Form form={startSurgeryForm} layout="vertical">
              <Form.Item
                name="actualStartTime"
                label="Thời gian bắt đầu"
                rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Chọn thời gian"
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* Print Surgery Record Modal - MS: 06/BV-02 */}
      <Modal
        title={<><PrinterOutlined /> In Phiếu phẫu thuật/thủ thuật (MS: 06/BV-02)</>}
        open={isPrintModalOpen}
        onCancel={() => {
          setIsPrintModalOpen(false);
          printForm.resetFields();
          setSelectedSchedule(null);
        }}
        width={900}
        footer={[
          <Button key="cancel" onClick={() => setIsPrintModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={executePrintSurgeryRecord}
          >
            In phiếu
          </Button>,
        ]}
      >
        <Form form={printForm} layout="vertical" size="small">
          <div className="flex items-center gap-3 my-4"><hr className="flex-1 border-gray-200" /><span className="text-xs text-gray-500 font-medium whitespace-nowrap"><strong>Thông tin bệnh nhân</strong></span><hr className="flex-1 border-gray-200" /></div>
          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/2">
              <Form.Item label="Họ tên người bệnh" name="patientName">
                <Input />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/4">
              <Form.Item label="Tuổi" name="age">
                <Input />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/4">
              <Form.Item label="Giới tính" name="gender">
                <Input />
              </Form.Item>
            </div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/3">
              <Form.Item label="Khoa" name="departmentName">
                <Input />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/3">
              <Form.Item label="Buồng/Phòng mổ" name="roomName">
                <Input />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/3">
              <Form.Item label="Giường" name="bedName">
                <Input />
              </Form.Item>
            </div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/2">
              <Form.Item label="Vào viện lúc" name="admissionTime">
                <Input placeholder="... giờ ... phút, ngày ... tháng ... năm" />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/2">
              <Form.Item label="Phẫu thuật/thủ thuật lúc" name="surgeryTime">
                <Input />
              </Form.Item>
            </div>
          </div>

          <div className="flex items-center gap-3 my-4"><hr className="flex-1 border-gray-200" /><span className="text-xs text-gray-500 font-medium whitespace-nowrap"><strong>Chẩn đoán</strong></span><hr className="flex-1 border-gray-200" /></div>
          <Form.Item label="Trước phẫu thuật/thủ thuật" name="preOpDiagnosis">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Sau phẫu thuật/thủ thuật" name="postOpDiagnosis">
            <TextArea rows={2} />
          </Form.Item>

          <div className="flex items-center gap-3 my-4"><hr className="flex-1 border-gray-200" /><span className="text-xs text-gray-500 font-medium whitespace-nowrap"><strong>Thông tin phẫu thuật</strong></span><hr className="flex-1 border-gray-200" /></div>
          <Form.Item label="Phương pháp phẫu thuật/thủ thuật" name="surgeryMethod">
            <TextArea rows={2} />
          </Form.Item>
          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/2">
              <Form.Item label="Loại phẫu thuật/thủ thuật" name="surgeryType">
                <Input />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/2">
              <Form.Item label="Phương pháp vô cảm" name="anesthesiaMethod">
                <Input />
              </Form.Item>
            </div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/2">
              <Form.Item label="Bác sĩ phẫu thuật/thủ thuật" name="surgeonName">
                <Input />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/2">
              <Form.Item label="Bác sĩ gây mê hồi sức" name="anesthesiologistName">
                <Input />
              </Form.Item>
            </div>
          </div>

          <div className="flex items-center gap-3 my-4"><hr className="flex-1 border-gray-200" /><span className="text-xs text-gray-500 font-medium whitespace-nowrap"><strong>Trình tự phẫu thuật</strong></span><hr className="flex-1 border-gray-200" /></div>
          <Form.Item label="Mô tả trình tự phẫu thuật/thủ thuật" name="surgeryDescription">
            <TextArea rows={6} placeholder="Mô tả chi tiết các bước phẫu thuật..." />
          </Form.Item>

          <div className="flex items-center gap-3 my-4"><hr className="flex-1 border-gray-200" /><span className="text-xs text-gray-500 font-medium whitespace-nowrap"><strong>Thông tin hậu phẫu</strong></span><hr className="flex-1 border-gray-200" /></div>
          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/3">
              <Form.Item label="Dẫn lưu" name="drainInfo">
                <Input />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/3">
              <Form.Item label="Ngày rút" name="removalDate">
                <Input />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/3">
              <Form.Item label="Ngày cắt chỉ" name="stitchRemovalDate">
                <Input />
              </Form.Item>
            </div>
          </div>
          <Form.Item label="Ghi chú khác" name="notes">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Consent Management Modal */}
      <Modal
        title={`Cam kết phẫu thuật - ${selectedRequest?.patientName || ''}`}
        open={isConsentModalOpen}
        onCancel={() => setIsConsentModalOpen(false)}
        footer={null}
        width={800}
      >
        {consentValidation && (
          <Alert
            type={consentValidation.isValid ? 'success' : 'warning'}
            title={consentValidation.isValid ? 'Đã đủ cam kết' : 'Thiếu cam kết'}
            description={consentValidation.message}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Existing consents */}
        <Table
          dataSource={consents}
          rowKey="id"
          size="small"
          pagination={false}
          style={{ marginBottom: 16 }}
          columns={[
            { title: 'Loại cam kết', dataIndex: 'consentTypeName', key: 'type' },
            {
              title: 'Trạng thái', key: 'status',
              render: (_, record: SurgeryConsentDto) => record.isSigned
                ? <Tag color="green">Đã ký - {record.signerName} ({record.signerRelationship})</Tag>
                : <Tag color="orange">Chưa ký</Tag>
            },
            { title: 'Bác sĩ', dataIndex: 'doctorName', key: 'doctor' },
            {
              title: 'Hành động', key: 'action',
              render: (_, record: SurgeryConsentDto) => !record.isSigned ? (
                <Button size="small" type="primary" onClick={() => {
                  setSigningConsentId(record.id);
                  setIsSignModalOpen(true);
                }}>Ký cam kết</Button>
              ) : null
            },
          ]}
        />

        <div className="flex items-center gap-3 my-4"><hr className="flex-1 border-gray-200" /><span className="text-xs text-gray-500 font-medium whitespace-nowrap">Thêm cam kết mới</span><hr className="flex-1 border-gray-200" /></div>
        <Form form={consentForm} layout="vertical" onFinish={handleSaveConsent}>
          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/2">
              <Form.Item label="Loại cam kết" name="consentType" rules={[{ required: true, message: 'Chọn loại' }]}>
                <Select options={[
                  { value: 1, label: 'Cam kết phẫu thuật' },
                  { value: 2, label: 'Cam kết gây mê' },
                  { value: 3, label: 'Cam kết truyền máu' },
                  { value: 4, label: 'Cam kết thủ thuật' },
                ]} />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/2">
              <Form.Item label="Chẩn đoán" name="diagnosis">
                <Input />
              </Form.Item>
            </div>
          </div>
          <Form.Item label="Phương pháp dự kiến" name="plannedProcedure">
            <Input />
          </Form.Item>
          <Form.Item label="Nguy cơ, biến chứng" name="risks">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Phương pháp thay thế" name="alternatives">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="BS giải thích" name="doctorExplanation">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit">Lưu cam kết</Button>
        </Form>
      </Modal>

      {/* Sign Consent Modal */}
      <Modal
        title="Ký cam kết"
        open={isSignModalOpen}
        onCancel={() => setIsSignModalOpen(false)}
        onOk={() => signForm.submit()}
        okText="Xác nhận ký"
      >
        <Form form={signForm} layout="vertical" onFinish={handleSignConsent}>
          <Form.Item label="Họ tên người ký" name="signerName" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Quan hệ với BN" name="relationship" rules={[{ required: true, message: 'Nhập quan hệ' }]}>
            <Select options={[
              { value: 'Bản thân', label: 'Bản thân bệnh nhân' },
              { value: 'Bố/Mẹ', label: 'Bố/Mẹ' },
              { value: 'Vợ/Chồng', label: 'Vợ/Chồng' },
              { value: 'Con', label: 'Con' },
              { value: 'Anh/Chị/Em', label: 'Anh/Chị/Em' },
              { value: 'Người giám hộ', label: 'Người giám hộ' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Surgery;
