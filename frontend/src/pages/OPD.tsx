import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Tabs,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Table,
  Tag,
  Descriptions,
  Modal,
  message,
  AutoComplete,
  DatePicker,
  Divider,
  Typography,
  Spin,
  Alert,
  Tooltip,
  Select,
} from 'antd';
import {
  SaveOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  AimOutlined,
  OrderedListOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { patientApi, type Patient } from '../api/patient';
import {
  examinationApi,
  type RoomPatientListDto,
  type RoomDto,
  type ExaminationDto,
  type ServiceDto,
} from '../api/examination';

// Type aliases for compatibility
type QueuePatient = RoomPatientListDto;
type Examination = ExaminationDto & {
  patientId: string;
  queueNumber: number;
  departmentId?: string;
  departmentName?: string;
};
// Local types for state management
interface Diagnosis {
  icdCode: string;
  icdName: string;
  diagnosisType: number;
}
interface TreatmentOrder {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  paymentSource: number;
  insuranceRatio: number;
  status: number;
}
type Service = ServiceDto;

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ICDOption {
  value: string;
  label: string;
  code: string;
  name: string;
}

interface ServiceOption {
  value: string;
  label: string;
  data: Service;
}

// Danh sách các loại bệnh án ngoại trú theo Bộ Y tế
const OPD_RECORD_TYPES = [
  { value: 'ngoai_tru_chung', label: 'Bệnh án ngoại trú chung', code: '15/BV-01' },
  { value: 'ngoai_tru_rhm', label: 'Bệnh án ngoại trú Răng hàm mặt', code: '16/BV-01' },
  { value: 'tuyen_xa_phuong', label: 'Bệnh án dành cho tuyến xã phường', code: '17/BV-01' },
  { value: 'ngoai_tru_yhct', label: 'Bệnh án ngoại trú YHCT', code: '19/BV-01' },
  { value: 'ngoai_tru_phcn', label: 'Bệnh án ngoại trú Phục hồi chức năng', code: '29/BV-01' },
];

const OPD: React.FC = () => {
  // State for room selection
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [loadingRooms, setLoadingRooms] = useState(false);

  // State for patient selection
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [queueList, setQueueList] = useState<QueuePatient[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  // State for examination
  const [examination, setExamination] = useState<Examination | null>(null);
  const [examForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('vital-signs');
  const [saving, setSaving] = useState(false);

  // State for ICD and services
  const [icdOptions, setIcdOptions] = useState<ICDOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [searchingICD, setSearchingICD] = useState(false);
  const [searchingService, setSearchingService] = useState(false);

  // State for selected autocomplete values
  const [selectedIcdCode, setSelectedIcdCode] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  // State for diagnoses and orders
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [orders, setOrders] = useState<TreatmentOrder[]>([]);

  // State for modals
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [patientHistory, setPatientHistory] = useState<Examination[]>([]);

  // State for print modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printForm] = Form.useForm();
  const [opdRecordType, setOpdRecordType] = useState<string>('ngoai_tru_chung');

  // Load rooms on mount
  useEffect(() => {
    loadRooms();
  }, []);

  // Load queue when room is selected
  useEffect(() => {
    if (selectedRoomId) {
      loadQueue(selectedRoomId);
    }
  }, [selectedRoomId]);

  const loadRooms = async () => {
    try {
      setLoadingRooms(true);
      const response = await examinationApi.getActiveExaminationRooms();
      const data = response.data;
      if (data) {
        setRooms(data);
        // Auto-select first room if available
        if (data.length > 0) {
          setSelectedRoomId(data[0].id);
        }
      }
    } catch (error) {
      message.error('Không thể tải danh sách phòng khám');
    } finally {
      setLoadingRooms(false);
    }
  };

  const loadQueue = async (roomId: string) => {
    if (!roomId) return;
    try {
      setLoadingQueue(true);
      const response = await examinationApi.getRoomPatientList(roomId);
      const data = response.data;
      if (data) {
        setQueueList(data);
      } else {
        setQueueList([]);
      }
    } catch (error) {
      message.error('Không thể tải danh sách chờ khám');
      setQueueList([]);
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleSelectPatientFromQueue = async (queuePatient: QueuePatient) => {
    try {
      const response = await patientApi.getById(queuePatient.patientId);
      if (response.success && response.data) {
        setSelectedPatient(response.data);
        // Map RoomPatientListDto to examination format
        const examInfo = {
          id: queuePatient.examinationId,
          patientId: queuePatient.patientId,
          patientCode: queuePatient.patientCode,
          patientName: queuePatient.patientName,
          queueNumber: queuePatient.queueNumber,
          roomId: selectedRoomId,
          roomName: rooms.find(r => r.id === selectedRoomId)?.name || '',
          departmentId: rooms.find(r => r.id === selectedRoomId)?.departmentId || '',
          departmentName: rooms.find(r => r.id === selectedRoomId)?.departmentName || '',
          status: queuePatient.status,
        };
        initializeNewExamination(response.data, examInfo);
        message.success(`Đã chọn bệnh nhân: ${queuePatient.patientName}`);
      }
    } catch (error) {
      message.error('Không thể tải thông tin bệnh nhân');
    }
  };

  const handleSearchPatient = async () => {
    if (!searchKeyword.trim()) {
      message.warning('Vui lòng nhập từ khóa tìm kiếm');
      return;
    }

    try {
      // Try different search methods
      let response;

      if (searchKeyword.startsWith('BN')) {
        response = await patientApi.getByCode(searchKeyword);
      } else if (/^\d{9,12}$/.test(searchKeyword)) {
        response = await patientApi.getByIdentityNumber(searchKeyword);
      } else if (searchKeyword.length === 15) {
        response = await patientApi.getByInsuranceNumber(searchKeyword);
      } else {
        const searchResponse = await patientApi.search({ keyword: searchKeyword, page: 1, pageSize: 1 });
        if (searchResponse.success && searchResponse.data && searchResponse.data.items.length > 0) {
          response = { success: true, data: searchResponse.data.items[0] };
        }
      }

      if (response?.success && response.data) {
        setSelectedPatient(response.data);
        initializeNewExamination(response.data);
        message.success(`Đã tìm thấy bệnh nhân: ${response.data.fullName}`);
      } else {
        message.warning('Không tìm thấy bệnh nhân');
      }
    } catch (error) {
      message.error('Lỗi khi tìm kiếm bệnh nhân');
    }
  };

  const initializeNewExamination = (patient: Patient, queue?: { id?: string; patientId?: string; patientCode?: string; patientName?: string; queueNumber?: number; departmentId?: string; departmentName?: string; roomId?: string; roomName?: string; status?: number }) => {
    const newExam: Examination = {
      id: queue?.id || `temp-${Date.now()}`,
      examinationDate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      patientId: patient.id,
      patientCode: patient.patientCode,
      patientName: patient.fullName,
      queueNumber: queue?.queueNumber || 0,
      departmentId: queue?.departmentId || '',
      departmentName: queue?.departmentName,
      roomId: queue?.roomId || selectedRoomId || '',
      roomName: queue?.roomName || rooms.find(r => r.id === selectedRoomId)?.name || '',
      doctorId: '',
      status: queue?.status ?? 0,
      statusName: 'Chờ khám',
    };

    setExamination(newExam);
    setDiagnoses([]);
    setOrders([]);
    examForm.resetFields();
  };

  const calculateAge = (dateOfBirth?: string, yearOfBirth?: number): string => {
    if (dateOfBirth) {
      const age = dayjs().diff(dayjs(dateOfBirth), 'year');
      return `${age} tuổi`;
    } else if (yearOfBirth) {
      const age = dayjs().year() - yearOfBirth;
      return `${age} tuổi`;
    }
    return 'N/A';
  };

  const handleSearchICD = async (value: string) => {
    if (!value || value.length < 2) {
      setIcdOptions([]);
      return;
    }

    try {
      setSearchingICD(true);
      const response = await examinationApi.searchIcdCodes(value);
      const data = response.data;
      if (data) {
        const options: ICDOption[] = data.map((icd: { code: string; name: string }) => ({
          value: icd.code,
          label: `${icd.code} - ${icd.name}`,
          code: icd.code,
          name: icd.name,
        }));
        setIcdOptions(options);
      }
    } catch (error) {
      console.warn('Error searching ICD codes:', error);
    } finally {
      setSearchingICD(false);
    }
  };

  const handleAddDiagnosis = (icdCode: string, diagnosisType: number) => {
    const selectedICD = icdOptions.find((opt) => opt.code === icdCode);
    if (!selectedICD) return;

    const newDiagnosis: Diagnosis = {
      icdCode: selectedICD.code,
      icdName: selectedICD.name,
      diagnosisType,
    };

    setDiagnoses([...diagnoses, newDiagnosis]);
    message.success('Đã thêm chẩn đoán');
  };

  const handleRemoveDiagnosis = (index: number) => {
    const newDiagnoses = diagnoses.filter((_, i) => i !== index);
    setDiagnoses(newDiagnoses);
  };

  const handleSearchService = async (value: string) => {
    if (!value || value.length < 2) {
      setServiceOptions([]);
      return;
    }

    try {
      setSearchingService(true);
      const response = await examinationApi.searchServices(value);
      const data = response.data;
      if (data) {
        const options: ServiceOption[] = data.map((service) => ({
          value: service.id,
          label: `${service.code} - ${service.name} (${service.unitPrice.toLocaleString()} đ)`,
          data: service,
        }));
        setServiceOptions(options);
      }
    } catch (error) {
      console.warn('Error searching services:', error);
    } finally {
      setSearchingService(false);
    }
  };

  const handleAddOrder = (serviceId: string, orderType: number) => {
    const selectedService = serviceOptions.find((opt) => opt.value === serviceId);
    if (!selectedService) return;

    const newOrder: TreatmentOrder = {
      id: `temp-${Date.now()}`,
      serviceId: selectedService.data.id,
      serviceName: selectedService.data.name,
      serviceCode: selectedService.data.code,
      quantity: 1,
      unitPrice: selectedService.data.unitPrice,
      amount: selectedService.data.unitPrice,
      paymentSource: 1,
      insuranceRatio: 0,
      status: 0,
    };

    setOrders([...orders, newOrder]);
    message.success('Đã thêm chỉ định');
  };

  const handleRemoveOrder = (index: number) => {
    const newOrders = orders.filter((_, i) => i !== index);
    setOrders(newOrders);
  };

  const handleUpdateOrderQuantity = (index: number, quantity: number) => {
    const newOrders = [...orders];
    newOrders[index].quantity = quantity;
    setOrders(newOrders);
  };

  const handleAutoSave = useCallback(async () => {
    if (!examination || !selectedPatient) return;
    // Skip auto-save for temporary examinations (not yet registered in backend)
    if (examination.id.startsWith('temp-')) return;

    try {
      const values = examForm.getFieldsValue();

      // Auto-save vital signs if any values present
      if (values.vitalSigns && Object.values(values.vitalSigns).some((v) => v !== undefined && v !== null)) {
        const vitalSignsDto = {
          weight: values.vitalSigns.weight,
          height: values.vitalSigns.height,
          bmi: values.vitalSigns.bmi,
          systolicBP: values.vitalSigns.bloodPressureSystolic,
          diastolicBP: values.vitalSigns.bloodPressureDiastolic,
          pulse: values.vitalSigns.pulse,
          temperature: values.vitalSigns.temperature,
          respiratoryRate: values.vitalSigns.respiratoryRate,
          spO2: values.vitalSigns.spo2,
          measuredAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        };
        await examinationApi.updateVitalSigns(examination.id, vitalSignsDto);
      }

      // Auto-save medical interview if any values present
      if (values.medicalHistory && Object.values(values.medicalHistory).some((v) => v !== undefined && v !== null && v !== '')) {
        const medicalInterviewDto = {
          chiefComplaint: values.medicalHistory.chiefComplaint,
          historyOfPresentIllness: values.medicalHistory.historyOfPresentIllness,
          pastMedicalHistory: values.medicalHistory.pastMedicalHistory,
          familyHistory: values.medicalHistory.familyHistory,
          allergyHistory: values.medicalHistory.allergies,
          medicationHistory: values.medicalHistory.currentMedications,
        };
        await examinationApi.updateMedicalInterview(examination.id, medicalInterviewDto);
      }

      // Auto-save physical examination if any values present
      if (values.physicalExamination && Object.values(values.physicalExamination).some((v) => v !== undefined && v !== null && v !== '')) {
        const physicalExamDto = {
          generalAppearance: values.physicalExamination.generalAppearance,
          cardiovascular: values.physicalExamination.cardiovascular,
          respiratory: values.physicalExamination.respiratory,
          gastrointestinal: values.physicalExamination.gastrointestinal,
          neurological: values.physicalExamination.neurological,
          musculoskeletal: values.physicalExamination.musculoskeletal,
          skin: values.physicalExamination.skin,
          otherFindings: values.physicalExamination.other,
        };
        await examinationApi.updatePhysicalExamination(examination.id, physicalExamDto);
      }

    } catch (error) {
      console.warn('Auto-save error:', error);
      // Silently fail for auto-save - don't show error messages to avoid disrupting the user
    }
  }, [examination, selectedPatient, examForm]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleAutoSave();
    }, 30000);

    return () => clearInterval(interval);
  }, [handleAutoSave]);

  const handleSave = async () => {
    if (!examination || !selectedPatient) {
      message.warning('Vui lòng chọn bệnh nhân');
      return;
    }

    // Skip if temporary examination (not yet registered in backend)
    if (examination.id.startsWith('temp-')) {
      message.warning('Bệnh nhân chưa được đăng ký khám. Vui lòng chọn từ danh sách chờ.');
      return;
    }

    try {
      setSaving(true);
      const values = await examForm.validateFields();

      // Save vital signs
      if (values.vitalSigns) {
        const vitalSignsDto = {
          weight: values.vitalSigns.weight,
          height: values.vitalSigns.height,
          bmi: values.vitalSigns.bmi,
          systolicBP: values.vitalSigns.bloodPressureSystolic,
          diastolicBP: values.vitalSigns.bloodPressureDiastolic,
          pulse: values.vitalSigns.pulse,
          temperature: values.vitalSigns.temperature,
          respiratoryRate: values.vitalSigns.respiratoryRate,
          spO2: values.vitalSigns.spo2,
          measuredAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        };
        await examinationApi.updateVitalSigns(examination.id, vitalSignsDto);
      }

      // Save medical history/interview
      if (values.medicalHistory) {
        const medicalInterviewDto = {
          chiefComplaint: values.medicalHistory.chiefComplaint,
          historyOfPresentIllness: values.medicalHistory.historyOfPresentIllness,
          pastMedicalHistory: values.medicalHistory.pastMedicalHistory,
          familyHistory: values.medicalHistory.familyHistory,
          allergyHistory: values.medicalHistory.allergies,
          medicationHistory: values.medicalHistory.currentMedications,
        };
        await examinationApi.updateMedicalInterview(examination.id, medicalInterviewDto);
      }

      // Save physical examination
      if (values.physicalExamination) {
        const physicalExamDto = {
          generalAppearance: values.physicalExamination.generalAppearance,
          cardiovascular: values.physicalExamination.cardiovascular,
          respiratory: values.physicalExamination.respiratory,
          gastrointestinal: values.physicalExamination.gastrointestinal,
          neurological: values.physicalExamination.neurological,
          musculoskeletal: values.physicalExamination.musculoskeletal,
          skin: values.physicalExamination.skin,
          otherFindings: values.physicalExamination.other,
        };
        await examinationApi.updatePhysicalExamination(examination.id, physicalExamDto);
      }

      // Save diagnoses if any
      if (diagnoses.length > 0) {
        const primaryDiagnosis = diagnoses.find(d => d.diagnosisType === 1);
        const secondaryDiagnoses = diagnoses.filter(d => d.diagnosisType !== 1);

        const diagnosisDto = {
          primaryIcdCode: primaryDiagnosis?.icdCode,
          primaryDiagnosis: primaryDiagnosis?.icdName,
          secondaryDiagnoses: secondaryDiagnoses.map(d => ({
            icdCode: d.icdCode,
            diagnosisName: d.icdName,
          })),
        };
        await examinationApi.updateDiagnosisList(examination.id, diagnosisDto);
      }

      message.success('Đã lưu phiếu khám');
    } catch (error: unknown) {
      console.warn('Save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi khi lưu phiếu khám';
      message.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!examination?.id) {
      message.warning('Vui lòng lưu phiếu khám trước');
      return;
    }

    if (examination.id.startsWith('temp-')) {
      message.warning('Bệnh nhân chưa được đăng ký khám. Vui lòng chọn từ danh sách chờ.');
      return;
    }

    if (diagnoses.length === 0) {
      message.warning('Vui lòng nhập chẩn đoán');
      return;
    }

    Modal.confirm({
      title: 'Hoàn thành khám bệnh',
      content: 'Bạn có chắc chắn muốn hoàn thành phiếu khám này?',
      okText: 'Hoàn thành',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          // First save all data
          await handleSave();

          // Get form values for conclusion
          const values = examForm.getFieldsValue();
          const primaryDiagnosis = diagnoses.find(d => d.diagnosisType === 1);

          // Complete the examination with conclusion
          const completeDto = {
            conclusionType: 1, // 1 = Discharge home (Ra viện về nhà)
            conclusionNotes: values.conclusion || '',
            finalDiagnosisCode: primaryDiagnosis?.icdCode,
            finalDiagnosisName: primaryDiagnosis?.icdName,
            nextAppointmentDate: values.followUpDate ? dayjs(values.followUpDate).format('YYYY-MM-DD') : undefined,
            appointmentNotes: values.recommendations || '',
          };

          await examinationApi.completeExamination(examination.id, completeDto);
          message.success('Đã hoàn thành khám bệnh');

          // Clear current examination and refresh queue
          setSelectedPatient(null);
          setExamination(null);
          setDiagnoses([]);
          setOrders([]);
          examForm.resetFields();
          loadQueue(selectedRoomId);
        } catch (error: unknown) {
          console.warn('Complete error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Lỗi khi hoàn thành khám bệnh';
          message.error(errorMessage);
        }
      },
    });
  };

  const handlePrint = () => {
    if (!examination?.id || !selectedPatient) {
      message.warning('Vui lòng chọn bệnh nhân và lưu phiếu khám');
      return;
    }

    const formValues = examForm.getFieldsValue();
    const primaryDiagnosis = diagnoses.find(d => d.diagnosisType === 1);
    const secondaryDiagnoses = diagnoses.filter(d => d.diagnosisType !== 1);

    // Pre-fill print form
    printForm.setFieldsValue({
      hospitalName: 'Bệnh viện Đa khoa ABC',
      departmentName: examination.departmentName || rooms.find(r => r.id === selectedRoomId)?.departmentName,
      patientName: selectedPatient.fullName?.toUpperCase(),
      dateOfBirth: selectedPatient.dateOfBirth ? dayjs(selectedPatient.dateOfBirth).format('DD/MM/YYYY') : '',
      gender: selectedPatient.gender === 1 ? 'Nam' : 'Nữ',
      age: calculateAge(selectedPatient.dateOfBirth, selectedPatient.yearOfBirth),
      occupation: '',
      ethnicity: '',
      nationality: 'Việt Nam',
      address: selectedPatient.address,
      workplace: '',
      insuranceNumber: selectedPatient.insuranceNumber,
      insuranceExpiry: selectedPatient.insuranceExpireDate ? dayjs(selectedPatient.insuranceExpireDate).format('DD/MM/YYYY') : '',
      contactName: '',
      contactPhone: '',
      visitTime: examination.examinationDate ? dayjs(examination.examinationDate).format('HH:mm DD/MM/YYYY') : dayjs().format('HH:mm DD/MM/YYYY'),
      visitReason: formValues.medicalHistory?.chiefComplaint,
      diseaseProgress: formValues.medicalHistory?.historyOfPresentIllness,
      personalHistory: formValues.medicalHistory?.pastMedicalHistory,
      familyHistory: formValues.medicalHistory?.familyHistory,
      generalExam: formValues.physicalExamination?.generalAppearance,
      pulse: formValues.vitalSigns?.pulse,
      temperature: formValues.vitalSigns?.temperature,
      bloodPressure: formValues.vitalSigns?.bloodPressureSystolic && formValues.vitalSigns?.bloodPressureDiastolic
        ? `${formValues.vitalSigns.bloodPressureSystolic}/${formValues.vitalSigns.bloodPressureDiastolic}`
        : '',
      respiratoryRate: formValues.vitalSigns?.respiratoryRate,
      weight: formValues.vitalSigns?.weight,
      organExam: [
        formValues.physicalExamination?.cardiovascular ? `Tim mạch: ${formValues.physicalExamination.cardiovascular}` : '',
        formValues.physicalExamination?.respiratory ? `Hô hấp: ${formValues.physicalExamination.respiratory}` : '',
        formValues.physicalExamination?.gastrointestinal ? `Tiêu hóa: ${formValues.physicalExamination.gastrointestinal}` : '',
        formValues.physicalExamination?.neurological ? `Thần kinh: ${formValues.physicalExamination.neurological}` : '',
      ].filter(Boolean).join('\n'),
      labResults: '',
      initialDiagnosis: primaryDiagnosis ? `${primaryDiagnosis.icdCode} - ${primaryDiagnosis.icdName}` : '',
      treatment: formValues.recommendations,
      finalDiagnosis: primaryDiagnosis ? `${primaryDiagnosis.icdCode} - ${primaryDiagnosis.icdName}` : '',
      secondaryDiagnosis: secondaryDiagnoses.map(d => `${d.icdCode} - ${d.icdName}`).join('; '),
    });

    setIsPrintModalOpen(true);
  };

  // Execute print for outpatient medical record
  const executePrintOutpatient = () => {
    const formValues = printForm.getFieldsValue();
    const recordType = OPD_RECORD_TYPES.find(t => t.value === opdRecordType) || OPD_RECORD_TYPES[0];

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${recordType.label} - MS: ${recordType.code}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.4; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .header-left { width: 40%; }
          .header-right { width: 30%; text-align: right; }
          .title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; }
          .subtitle { font-size: 14px; text-align: center; margin-bottom: 15px; }
          .section { margin: 10px 0; }
          .section-title { font-weight: bold; margin: 10px 0 5px 0; }
          .row { display: flex; margin: 3px 0; }
          .col { flex: 1; }
          .col-2 { flex: 2; }
          .col-3 { flex: 3; }
          .field { border-bottom: 1px dotted #000; min-width: 100px; display: inline-block; padding: 0 5px; }
          .field-long { border-bottom: 1px dotted #000; width: 100%; display: block; min-height: 20px; padding: 0 5px; }
          .checkbox { display: inline-block; width: 14px; height: 14px; border: 1px solid #000; margin-right: 3px; vertical-align: middle; text-align: center; line-height: 12px; }
          .checkbox.checked::after { content: '✓'; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          table th, table td { border: 1px solid #000; padding: 5px; text-align: left; }
          .vital-box { border: 1px solid #000; padding: 5px; margin-left: 10px; width: 150px; float: right; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
          .signature-col { width: 45%; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div>Sở Y tế: <span class="field">${formValues.healthDepartment || '...........................'}</span></div>
            <div>Bệnh viện: <span class="field">${formValues.hospitalName || '...........................'}</span></div>
          </div>
          <div style="text-align: right;">
            <div><strong>MS: ${recordType.code}</strong></div>
            <div>Số ngoại trú: <span class="field">${examination?.id?.substring(0, 8) || '...........'}</span></div>
            <div>Số lưu trữ: <span class="field">................</span></div>
          </div>
        </div>

        <div class="title">${recordType.label.toUpperCase()}</div>
        <div class="subtitle">KHOA: <span class="field">${formValues.departmentName || '..............................'}</span></div>

        <div class="section">
          <div class="section-title">I. HÀNH CHÍNH:</div>
          <div class="row">
            <div class="col-2">1. Họ và tên (In hoa): <span class="field">${formValues.patientName || ''}</span></div>
            <div class="col">2. Sinh ngày: <span class="field">${formValues.dateOfBirth || ''}</span></div>
            <div style="width: 60px;">Tuổi: <span class="field">${formValues.age || ''}</span></div>
          </div>
          <div class="row">
            <div class="col">3. Giới:
              <span class="checkbox ${formValues.gender === 'Nam' ? 'checked' : ''}"></span>Nam
              <span class="checkbox ${formValues.gender === 'Nữ' ? 'checked' : ''}"></span>Nữ
            </div>
            <div class="col">4. Nghề nghiệp: <span class="field">${formValues.occupation || ''}</span></div>
          </div>
          <div class="row">
            <div class="col">5. Dân tộc: <span class="field">${formValues.ethnicity || ''}</span></div>
            <div class="col">6. Ngoại kiều: <span class="field">${formValues.nationality || ''}</span></div>
          </div>
          <div class="row">
            <div>7. Địa chỉ: <span class="field" style="width: 90%;">${formValues.address || ''}</span></div>
          </div>
          <div class="row">
            <div class="col">8. Nơi làm việc: <span class="field">${formValues.workplace || ''}</span></div>
            <div class="col">9. Đối tượng:
              <span class="checkbox ${selectedPatient?.insuranceNumber ? 'checked' : ''}"></span>BHYT
              <span class="checkbox ${!selectedPatient?.insuranceNumber ? 'checked' : ''}"></span>Thu phí
              <span class="checkbox"></span>Miễn
              <span class="checkbox"></span>Khác
            </div>
          </div>
          <div class="row">
            <div>10. BHYT giá trị đến ngày <span class="field">${formValues.insuranceExpiry || '......./......./........'}</span> Số thẻ BHYT: <span class="field">${formValues.insuranceNumber || ''}</span></div>
          </div>
          <div class="row">
            <div>11. Họ tên, địa chỉ người nhà khi cần báo tin: <span class="field">${formValues.contactName || ''}</span> ĐT: <span class="field">${formValues.contactPhone || ''}</span></div>
          </div>
          <div class="row">
            <div>12. Đến khám bệnh lúc: <span class="field">${formValues.visitTime || ''}</span></div>
          </div>
          <div class="row">
            <div>13. Chẩn đoán của nơi giới thiệu: <span class="field">${formValues.referralDiagnosis || ''}</span>
              <span class="checkbox"></span>Y tế <span class="checkbox"></span>Tự đến
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">II. LÝ DO VÀO VIỆN:</div>
          <div class="field-long">${formValues.visitReason || ''}</div>
        </div>

        <div class="section">
          <div class="section-title">III. HỎI BỆNH:</div>
          <div>1. Quá trình bệnh lý:</div>
          <div class="field-long" style="min-height: 60px;">${formValues.diseaseProgress || ''}</div>
          <div style="margin-top: 10px;">2. Tiền sử bệnh:</div>
          <div>+ Bản thân: <span class="field-long">${formValues.personalHistory || ''}</span></div>
          <div>+ Gia đình: <span class="field-long">${formValues.familyHistory || ''}</span></div>
        </div>

        <div class="section">
          <div class="section-title" style="display: flex; justify-content: space-between;">
            <span>IV. KHÁM BỆNH:</span>
            <div class="vital-box">
              <div>Mạch: ${formValues.pulse || '......'} lần/ph</div>
              <div>Nhiệt độ: ${formValues.temperature || '......'} °C</div>
              <div>Huyết áp: ${formValues.bloodPressure || '.../..'} mmHg</div>
              <div>Nhịp thở: ${formValues.respiratoryRate || '......'} lần/ph</div>
              <div>Cân nặng: ${formValues.weight || '......'} kg</div>
            </div>
          </div>
          <div>1. Toàn thân:</div>
          <div class="field-long" style="min-height: 40px;">${formValues.generalExam || ''}</div>
          <div style="margin-top: 10px;">2. Các bộ phận:</div>
          <div class="field-long" style="min-height: 80px; white-space: pre-wrap;">${formValues.organExam || ''}</div>
          <div style="margin-top: 10px;">3. Tóm tắt kết quả cận lâm sàng:</div>
          <div class="field-long" style="min-height: 40px;">${formValues.labResults || ''}</div>
          <div style="margin-top: 10px;">4. Chẩn đoán ban đầu:</div>
          <div class="field-long">${formValues.initialDiagnosis || ''}</div>
          <div style="margin-top: 10px;">5. Đã xử lý (thuốc, chăm sóc):</div>
          <div class="field-long" style="min-height: 60px;">${formValues.treatment || ''}</div>
          <div style="margin-top: 10px;">6. Chẩn đoán khi ra viện: <span class="field" style="width: 70%;">${formValues.finalDiagnosis || ''}</span></div>
          <div style="margin-top: 5px;">7. Điều trị ngoại trú từ ngày <span class="field">${formValues.treatmentFromDate || '....../....../........'}</span> đến ngày <span class="field">${formValues.treatmentToDate || '....../....../........'}</span></div>
        </div>

        <div class="signature-row">
          <div class="signature-col">
            <div><strong>Giám đốc bệnh viện</strong></div>
            <div style="margin-top: 60px;">Họ tên: ................................</div>
          </div>
          <div class="signature-col">
            <div>Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</div>
            <div><strong>Bác sỹ khám bệnh</strong></div>
            <div style="margin-top: 40px;">Họ tên: ................................</div>
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
  };

  const handleViewHistory = async () => {
    if (!selectedPatient) {
      message.warning('Vui lòng chọn bệnh nhân');
      return;
    }

    try {
      const response = await examinationApi.getPatientMedicalHistory(selectedPatient.id, 20);
      const data = response.data;
      if (data && Array.isArray(data)) {
        const historyItems: Examination[] = data.map((item: any) => ({
          id: item.examinationId,
          examinationDate: item.examinationDate,
          patientId: selectedPatient.id,
          patientCode: selectedPatient.patientCode,
          patientName: selectedPatient.fullName,
          roomId: '',
          roomName: item.roomName || '',
          doctorName: item.doctorName || '',
          status: item.conclusionType ?? 2,
          statusName: item.conclusionTypeName || 'Hoàn thành',
          queueNumber: 0,
          diagnosisCode: item.diagnosisCode,
          diagnosisName: item.diagnosisName,
        }));
        setPatientHistory(historyItems);
      } else {
        setPatientHistory([]);
      }
      setHistoryModalVisible(true);
    } catch (error) {
      console.warn('Error fetching history:', error);
      message.error('Không thể tải lịch sử khám bệnh');
      setPatientHistory([]);
      setHistoryModalVisible(true);
    }
  };

  const diagnosisColumns: ColumnsType<Diagnosis> = [
    {
      title: 'Loại',
      dataIndex: 'diagnosisType',
      width: 100,
      render: (type) => (
        <Tag color={type === 1 ? 'red' : 'blue'}>
          {type === 1 ? 'Chính' : 'Phụ'}
        </Tag>
      ),
    },
    {
      title: 'Mã ICD',
      dataIndex: 'icdCode',
      width: 100,
    },
    {
      title: 'Tên bệnh',
      dataIndex: 'icdName',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'description',
      width: 200,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 80,
      render: (_, __, index) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveDiagnosis(index ?? 0)}
        >
          Xóa
        </Button>
      ),
    },
  ];

  const getOrderTypeName = (type: number): string => {
    switch (type) {
      case 1: return 'Xét nghiệm';
      case 2: return 'Chẩn đoán hình ảnh';
      case 3: return 'Thủ thuật';
      case 4: return 'Thuốc';
      case 5: return 'Dịch vụ';
      default: return 'Khác';
    }
  };

  const orderColumns: ColumnsType<TreatmentOrder> = [
    {
      title: 'Loại',
      dataIndex: 'orderType',
      width: 120,
      render: (type) => <Tag color="blue">{getOrderTypeName(type)}</Tag>,
    },
    {
      title: 'Mã DV',
      dataIndex: 'serviceCode',
      width: 100,
    },
    {
      title: 'Tên dịch vụ',
      dataIndex: 'serviceName',
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      width: 100,
      render: (qty, _, index) => (
        <InputNumber
          min={1}
          value={qty}
          onChange={(value) => handleUpdateOrderQuantity(index, value || 1)}
          size="small"
        />
      ),
    },
    {
      title: 'ĐVT',
      dataIndex: 'unit',
      width: 80,
    },
    {
      title: 'Hướng dẫn',
      dataIndex: 'instructions',
      width: 200,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 80,
      render: (_, __, index) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveOrder(index ?? 0)}
        >
          Xóa
        </Button>
      ),
    },
  ];

  const queueColumns: ColumnsType<QueuePatient> = [
    {
      title: 'STT',
      dataIndex: 'queueNumber',
      width: 60,
      align: 'center',
      render: (num) => <strong>{num}</strong>,
    },
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      width: 110,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      render: (name) => <strong>{name}</strong>,
    },
    {
      title: 'Tuổi',
      dataIndex: 'age',
      width: 60,
      render: (age) => age ? `${age}` : 'N/A',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'statusName',
      width: 110,
      render: (statusName, record) => {
        const colorMap: Record<number, string> = {
          0: 'orange',   // Chờ khám
          1: 'blue',     // Đang khám
          2: 'cyan',     // Chờ CLS
          3: 'purple',   // Chờ kết luận
          4: 'green',    // Hoàn thành
        };
        return <Tag color={colorMap[record.status] || 'default'}>{statusName || 'Chờ khám'}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4}>Khám bệnh ngoại trú</Title>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Left Sidebar - Patient Selection */}
        <Col xs={24} lg={6}>
          <Card
            title={
              <Space>
                <UserOutlined />
                Thông tin bệnh nhân
              </Space>
            }
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Space orientation="vertical" style={{ width: '100%' }}>
              <Input.Search
                placeholder="Mã BN, CCCD, SĐT, BHYT..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onSearch={handleSearchPatient}
                enterButton={<SearchOutlined />}
              />

              {selectedPatient && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Mã BN">
                      <strong>{selectedPatient.patientCode}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Họ tên">
                      <strong>{selectedPatient.fullName}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Tuổi">
                      {calculateAge(selectedPatient.dateOfBirth, selectedPatient.yearOfBirth)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Giới tính">
                      {selectedPatient.gender === 1 ? 'Nam' : selectedPatient.gender === 2 ? 'Nữ' : 'Khác'}
                    </Descriptions.Item>
                    <Descriptions.Item label="SĐT">
                      {selectedPatient.phoneNumber || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Số BHYT">
                      {selectedPatient.insuranceNumber ? (
                        <Text copyable>{selectedPatient.insuranceNumber}</Text>
                      ) : (
                        'N/A'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Địa chỉ">
                      {selectedPatient.address || 'N/A'}
                    </Descriptions.Item>
                  </Descriptions>

                  <Button
                    block
                    icon={<HistoryOutlined />}
                    onClick={handleViewHistory}
                  >
                    Lịch sử khám bệnh
                  </Button>
                </>
              )}
            </Space>
          </Card>

          <Card
            title="Danh sách chờ khám"
            size="small"
            extra={
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => loadQueue(selectedRoomId)}
                loading={loadingQueue}
              >
                Làm mới
              </Button>
            }
          >
            <Select
              placeholder="Chọn phòng khám"
              style={{ width: '100%', marginBottom: 12 }}
              value={selectedRoomId || undefined}
              onChange={(value) => setSelectedRoomId(value)}
              loading={loadingRooms}
              showSearch
              optionFilterProp="children"
            >
              {rooms.map((room) => (
                <Select.Option key={room.id} value={room.id}>
                  {room.name} {room.departmentName ? `(${room.departmentName})` : ''}
                </Select.Option>
              ))}
            </Select>
            <Spin spinning={loadingQueue}>
              <Table
                columns={queueColumns}
                dataSource={queueList}
                rowKey="examinationId"
                size="small"
                pagination={false}
                scroll={{ y: 400 }}
                onRow={(record) => ({
                  onClick: () => handleSelectPatientFromQueue(record),
                  onDoubleClick: () => {
                    Modal.info({
                      title: `Chi tiết bệnh nhân: ${record.patientName}`,
                      width: 600,
                      content: (
                        <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                          <Descriptions.Item label="Mã BN">{record.patientCode}</Descriptions.Item>
                          <Descriptions.Item label="Số thứ tự">{record.queueNumber}</Descriptions.Item>
                          <Descriptions.Item label="Họ tên">{record.patientName}</Descriptions.Item>
                          <Descriptions.Item label="Giới tính">{record.gender === 1 ? 'Nam' : 'Nữ'}</Descriptions.Item>
                          <Descriptions.Item label="Ngày sinh">{(record as any).dateOfBirth || '-'}</Descriptions.Item>
                          <Descriptions.Item label="Tuổi">{record.age}</Descriptions.Item>
                          <Descriptions.Item label="Lý do khám" span={2}>{(record as any).visitReason || '-'}</Descriptions.Item>
                          <Descriptions.Item label="Trạng thái" span={2}>
                            <Tag color={record.status === 0 ? 'orange' : record.status === 1 ? 'blue' : 'green'}>
                              {record.status === 0 ? 'Chờ khám' : record.status === 1 ? 'Đang khám' : 'Đã khám'}
                            </Tag>
                          </Descriptions.Item>
                        </Descriptions>
                      ),
                    });
                  },
                  style: { cursor: 'pointer' },
                })}
                locale={{ emptyText: selectedRoomId ? 'Không có bệnh nhân' : 'Vui lòng chọn phòng khám' }}
              />
            </Spin>
          </Card>
        </Col>

        {/* Main Area - Examination Form */}
        <Col xs={24} lg={18}>
          {!selectedPatient ? (
            <Card>
              <Alert
                title="Vui lòng chọn bệnh nhân"
                description="Chọn bệnh nhân từ danh sách chờ khám hoặc tìm kiếm bệnh nhân để bắt đầu khám bệnh."
                type="info"
                showIcon
              />
            </Card>
          ) : (
            <Card
              title="Phiếu khám bệnh"
              extra={
                <Space>
                  <Button
                    type="default"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={saving}
                  >
                    Lưu nháp
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleComplete}
                    disabled={!examination?.id}
                  >
                    Hoàn thành
                  </Button>
                  <Button
                    icon={<PrinterOutlined />}
                    onClick={handlePrint}
                    disabled={!examination?.id}
                  >
                    In
                  </Button>
                </Space>
              }
            >
              <Form
                form={examForm}
                layout="vertical"
                initialValues={{
                  vitalSigns: {},
                  medicalHistory: {},
                  physicalExamination: {},
                }}
              >
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  items={[
                    {
                      key: 'vital-signs',
                      label: (
                        <span>
                          <HeartOutlined /> Sinh hiệu
                        </span>
                      ),
                      children: (
                        <Row gutter={16}>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Cân nặng (kg)"
                              name={['vitalSigns', 'weight']}
                            >
                              <InputNumber
                                min={0}
                                max={300}
                                step={0.1}
                                style={{ width: '100%' }}
                                placeholder="Nhập cân nặng"
                                onChange={(value) => {
                                  const height = examForm.getFieldValue(['vitalSigns', 'height']);
                                  if (value && height && height > 0) {
                                    const heightM = height / 100;
                                    const bmi = parseFloat((Number(value) / (heightM * heightM)).toFixed(1));
                                    examForm.setFieldValue(['vitalSigns', 'bmi'], bmi);
                                  }
                                }}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Chiều cao (cm)"
                              name={['vitalSigns', 'height']}
                            >
                              <InputNumber
                                min={0}
                                max={250}
                                step={0.1}
                                style={{ width: '100%' }}
                                placeholder="Nhập chiều cao"
                                onChange={(value) => {
                                  const weight = examForm.getFieldValue(['vitalSigns', 'weight']);
                                  if (weight && value && Number(value) > 0) {
                                    const heightM = Number(value) / 100;
                                    const bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));
                                    examForm.setFieldValue(['vitalSigns', 'bmi'], bmi);
                                  }
                                }}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item label="BMI" name={['vitalSigns', 'bmi']}>
                              <InputNumber
                                min={0}
                                max={100}
                                step={0.1}
                                style={{ width: '100%' }}
                                placeholder="Tự động tính"
                                disabled
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Huyết áp tâm thu (mmHg)"
                              name={['vitalSigns', 'bloodPressureSystolic']}
                            >
                              <InputNumber
                                min={0}
                                max={300}
                                style={{ width: '100%' }}
                                placeholder="VD: 120"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Huyết áp tâm trương (mmHg)"
                              name={['vitalSigns', 'bloodPressureDiastolic']}
                            >
                              <InputNumber
                                min={0}
                                max={200}
                                style={{ width: '100%' }}
                                placeholder="VD: 80"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Nhiệt độ (°C)"
                              name={['vitalSigns', 'temperature']}
                            >
                              <InputNumber
                                min={30}
                                max={45}
                                step={0.1}
                                style={{ width: '100%' }}
                                placeholder="VD: 36.5"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Mạch (lần/phút)"
                              name={['vitalSigns', 'pulse']}
                            >
                              <InputNumber
                                min={0}
                                max={300}
                                style={{ width: '100%' }}
                                placeholder="VD: 72"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Nhịp thở (lần/phút)"
                              name={['vitalSigns', 'respiratoryRate']}
                            >
                              <InputNumber
                                min={0}
                                max={100}
                                style={{ width: '100%' }}
                                placeholder="VD: 18"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="SpO2 (%)"
                              name={['vitalSigns', 'spo2']}
                            >
                              <InputNumber
                                min={0}
                                max={100}
                                style={{ width: '100%' }}
                                placeholder="VD: 98"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      ),
                    },
                    {
                      key: 'medical-history',
                      label: (
                        <span>
                          <FileTextOutlined /> Bệnh sử & Triệu chứng
                        </span>
                      ),
                      children: (
                        <Row gutter={16}>
                          <Col span={24}>
                            <Form.Item
                              label="Lý do khám"
                              name={['medicalHistory', 'chiefComplaint']}
                            >
                              <TextArea
                                rows={3}
                                placeholder="Nhập lý do khám chính..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Bệnh sử"
                              name={['medicalHistory', 'historyOfPresentIllness']}
                            >
                              <TextArea
                                rows={4}
                                placeholder="Nhập quá trình bệnh lý hiện tại..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Tiền sử bệnh"
                              name={['medicalHistory', 'pastMedicalHistory']}
                            >
                              <TextArea
                                rows={3}
                                placeholder="Các bệnh đã mắc, phẫu thuật..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Tiền sử gia đình"
                              name={['medicalHistory', 'familyHistory']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Bệnh lý gia đình..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Dị ứng"
                              name={['medicalHistory', 'allergies']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Dị ứng thuốc, thực phẩm..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Thuốc đang dùng"
                              name={['medicalHistory', 'currentMedications']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Các thuốc đang sử dụng..."
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      ),
                    },
                    {
                      key: 'physical-exam',
                      label: (
                        <span>
                          <MedicineBoxOutlined /> Khám lâm sàng
                        </span>
                      ),
                      children: (
                        <Row gutter={16}>
                          <Col span={24}>
                            <Form.Item
                              label="Toàn thân"
                              name={['physicalExamination', 'generalAppearance']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Tình trạng chung, dinh dưỡng..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Tim mạch"
                              name={['physicalExamination', 'cardiovascular']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Khám tim mạch..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Hô hấp"
                              name={['physicalExamination', 'respiratory']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Khám hô hấp..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Tiêu hóa"
                              name={['physicalExamination', 'gastrointestinal']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Khám tiêu hóa..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Thần kinh"
                              name={['physicalExamination', 'neurological']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Khám thần kinh..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Cơ xương khớp"
                              name={['physicalExamination', 'musculoskeletal']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Khám cơ xương khớp..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Da"
                              name={['physicalExamination', 'skin']}
                            >
                              <TextArea rows={2} placeholder="Khám da..." />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Khác"
                              name={['physicalExamination', 'other']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Các khám khác..."
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      ),
                    },
                    {
                      key: 'diagnosis',
                      label: (
                        <span>
                          <AimOutlined /> Chẩn đoán
                        </span>
                      ),
                      children: (
                        <>
                          <Space style={{ marginBottom: 16 }}>
                            <AutoComplete
                              style={{ width: 400 }}
                              options={icdOptions}
                              onSearch={handleSearchICD}
                              onSelect={(value: string) => setSelectedIcdCode(value)}
                              placeholder="Tìm mã ICD-10..."
                              notFoundContent={
                                searchingICD ? <Spin size="small" /> : 'Không tìm thấy'
                              }
                            >
                              <Input.Search
                                enterButton={
                                  <Button type="primary">Thêm chẩn đoán chính</Button>
                                }
                                onSearch={(value) => {
                                  const code = selectedIcdCode || value;
                                  if (code) handleAddDiagnosis(code, 1);
                                }}
                              />
                            </AutoComplete>
                            <Button
                              onClick={() => {
                                if (selectedIcdCode) {
                                  handleAddDiagnosis(selectedIcdCode, 2);
                                } else {
                                  message.warning('Vui lòng chọn mã ICD từ danh sách trước');
                                }
                              }}
                            >
                              Thêm chẩn đoán phụ
                            </Button>
                          </Space>

                          <Table
                            columns={diagnosisColumns}
                            dataSource={diagnoses}
                            rowKey={(_, index) => (index ?? 0).toString()}
                            size="small"
                            pagination={false}
                            locale={{ emptyText: 'Chưa có chẩn đoán' }}
                          />

                          <Divider />

                          <Row gutter={16}>
                            <Col span={24}>
                              <Form.Item label="Kết luận" name="conclusion">
                                <TextArea
                                  rows={3}
                                  placeholder="Nhập kết luận..."
                                />
                              </Form.Item>
                            </Col>
                            <Col span={24}>
                              <Form.Item
                                label="Hướng điều trị"
                                name="recommendations"
                              >
                                <TextArea
                                  rows={3}
                                  placeholder="Nhập hướng điều trị..."
                                />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item label="Ngày tái khám" name="followUpDate">
                                <DatePicker
                                  style={{ width: '100%' }}
                                  format="DD/MM/YYYY"
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        </>
                      ),
                    },
                    {
                      key: 'treatment-orders',
                      label: (
                        <span>
                          <OrderedListOutlined /> Chỉ định
                        </span>
                      ),
                      children: (
                        <>
                          <Space style={{ marginBottom: 16 }} wrap>
                            <AutoComplete
                              style={{ width: 400 }}
                              options={serviceOptions}
                              onSearch={handleSearchService}
                              onSelect={(value: string) => setSelectedServiceId(value)}
                              placeholder="Tìm dịch vụ..."
                              notFoundContent={
                                searchingService ? <Spin size="small" /> : 'Không tìm thấy'
                              }
                            >
                              <Input prefix={<SearchOutlined />} />
                            </AutoComplete>
                            <Tooltip title="Xét nghiệm">
                              <Button
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  if (selectedServiceId) { handleAddOrder(selectedServiceId, 1); }
                                  else { message.warning('Vui lòng chọn dịch vụ từ danh sách trước'); }
                                }}
                              >
                                XN
                              </Button>
                            </Tooltip>
                            <Tooltip title="Chẩn đoán hình ảnh">
                              <Button
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  if (selectedServiceId) { handleAddOrder(selectedServiceId, 2); }
                                  else { message.warning('Vui lòng chọn dịch vụ từ danh sách trước'); }
                                }}
                              >
                                CĐHA
                              </Button>
                            </Tooltip>
                            <Tooltip title="Thủ thuật">
                              <Button
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  if (selectedServiceId) { handleAddOrder(selectedServiceId, 3); }
                                  else { message.warning('Vui lòng chọn dịch vụ từ danh sách trước'); }
                                }}
                              >
                                TT
                              </Button>
                            </Tooltip>
                            <Tooltip title="Thuốc">
                              <Button
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  if (selectedServiceId) { handleAddOrder(selectedServiceId, 4); }
                                  else { message.warning('Vui lòng chọn dịch vụ từ danh sách trước'); }
                                }}
                              >
                                Thuốc
                              </Button>
                            </Tooltip>
                            <Tooltip title="Dịch vụ khác">
                              <Button
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  if (selectedServiceId) { handleAddOrder(selectedServiceId, 5); }
                                  else { message.warning('Vui lòng chọn dịch vụ từ danh sách trước'); }
                                }}
                              >
                                DV
                              </Button>
                            </Tooltip>
                          </Space>

                          <Table
                            columns={orderColumns}
                            dataSource={orders}
                            rowKey={(_, index) => (index ?? 0).toString()}
                            size="small"
                            pagination={false}
                            locale={{ emptyText: 'Chưa có chỉ định' }}
                          />
                        </>
                      ),
                    },
                  ]}
                />
              </Form>
            </Card>
          )}
        </Col>
      </Row>

      {/* History Modal */}
      <Modal
        title="Lịch sử khám bệnh"
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={1000}
      >
        <Table
          columns={[
            {
              title: 'Ngày khám',
              dataIndex: 'examinationDate',
              render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
            },
            {
              title: 'Phòng khám',
              dataIndex: 'roomName',
            },
            {
              title: 'Bác sĩ',
              dataIndex: 'doctorName',
            },
            {
              title: 'Chẩn đoán',
              key: 'diagnosis',
              render: (_: unknown, record: Examination) => {
                if (record.diagnosisCode && record.diagnosisName) {
                  return `${record.diagnosisCode} - ${record.diagnosisName}`;
                }
                if (record.diagnosisName) {
                  return record.diagnosisName;
                }
                if (record.diagnosisCode) {
                  return record.diagnosisCode;
                }
                return 'N/A';
              },
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              render: (status) => {
                const statusMap = {
                  0: { text: 'Nháp', color: 'default' },
                  1: { text: 'Đang khám', color: 'blue' },
                  2: { text: 'Hoàn thành', color: 'green' },
                  3: { text: 'Đã hủy', color: 'red' },
                };
                const s = statusMap[status as keyof typeof statusMap] || statusMap[0];
                return <Tag color={s.color}>{s.text}</Tag>;
              },
            },
          ]}
          dataSource={patientHistory}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Modal>

      {/* Print Outpatient Medical Record Modal */}
      <Modal
        title={<><PrinterOutlined /> In Bệnh án Ngoại trú</>}
        open={isPrintModalOpen}
        onCancel={() => {
          setIsPrintModalOpen(false);
          printForm.resetFields();
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
            onClick={executePrintOutpatient}
          >
            In bệnh án ({OPD_RECORD_TYPES.length} loại)
          </Button>,
        ]}
      >
        <Alert
          title="Chọn loại bệnh án ngoại trú theo quy định Bộ Y tế"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form.Item label="Loại bệnh án ngoại trú" style={{ marginBottom: 16 }}>
          <Select
            value={opdRecordType}
            onChange={setOpdRecordType}
            style={{ width: '100%' }}
            showSearch
            optionFilterProp="children"
          >
            {OPD_RECORD_TYPES.map(type => (
              <Select.Option key={type.value} value={type.value}>
                {type.label} (MS: {type.code})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form form={printForm} layout="vertical" size="small">
          <Divider><strong>I. HÀNH CHÍNH</strong></Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Bệnh viện" name="hospitalName">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Khoa" name="departmentName">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Họ và tên (In hoa)" name="patientName">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Ngày sinh" name="dateOfBirth">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Tuổi" name="age">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Giới tính" name="gender">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Nghề nghiệp" name="occupation">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Dân tộc" name="ethnicity">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Quốc tịch" name="nationality">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="Địa chỉ" name="address">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Nơi làm việc" name="workplace">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Số thẻ BHYT" name="insuranceNumber">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Giá trị đến ngày" name="insuranceExpiry">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Người nhà khi cần báo tin" name="contactName">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Điện thoại" name="contactPhone">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Đến khám lúc" name="visitTime">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider><strong>II. LÝ DO VÀO VIỆN</strong></Divider>
          <Form.Item name="visitReason">
            <TextArea rows={2} placeholder="Lý do vào viện..." />
          </Form.Item>

          <Divider><strong>III. HỎI BỆNH</strong></Divider>
          <Form.Item label="1. Quá trình bệnh lý" name="diseaseProgress">
            <TextArea rows={3} placeholder="Quá trình bệnh lý..." />
          </Form.Item>
          <Form.Item label="2. Tiền sử bản thân" name="personalHistory">
            <TextArea rows={2} placeholder="Tiền sử bản thân..." />
          </Form.Item>
          <Form.Item label="Tiền sử gia đình" name="familyHistory">
            <TextArea rows={2} placeholder="Tiền sử gia đình..." />
          </Form.Item>

          <Divider><strong>IV. KHÁM BỆNH</strong></Divider>
          <Row gutter={16}>
            <Col span={4}>
              <Form.Item label="Mạch (lần/ph)" name="pulse">
                <Input />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Nhiệt độ (°C)" name="temperature">
                <Input />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Huyết áp" name="bloodPressure">
                <Input placeholder="120/80" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Nhịp thở" name="respiratoryRate">
                <Input />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Cân nặng (kg)" name="weight">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="1. Toàn thân" name="generalExam">
            <TextArea rows={2} placeholder="Khám toàn thân..." />
          </Form.Item>
          <Form.Item label="2. Các bộ phận" name="organExam">
            <TextArea rows={4} placeholder="Khám các bộ phận..." />
          </Form.Item>
          <Form.Item label="3. Tóm tắt kết quả cận lâm sàng" name="labResults">
            <TextArea rows={2} placeholder="Kết quả cận lâm sàng..." />
          </Form.Item>
          <Form.Item label="4. Chẩn đoán ban đầu" name="initialDiagnosis">
            <Input />
          </Form.Item>
          <Form.Item label="5. Đã xử lý (thuốc, chăm sóc)" name="treatment">
            <TextArea rows={3} placeholder="Thuốc và chăm sóc..." />
          </Form.Item>
          <Form.Item label="6. Chẩn đoán khi ra viện" name="finalDiagnosis">
            <Input />
          </Form.Item>
          <Form.Item label="Bệnh kèm theo" name="secondaryDiagnosis">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OPD;
