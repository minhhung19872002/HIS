import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Tabs, Table, Input, Button, Space, Tag, Descriptions, Form,
  DatePicker, Select, Modal, message, Typography, Row, Col, Divider,
  Drawer, Timeline, Spin, Empty, Badge, Tooltip, Dropdown
} from 'antd';
import {
  FileTextOutlined, SearchOutlined, MedicineBoxOutlined, HeartOutlined,
  ExperimentOutlined, PrinterOutlined, EditOutlined, EyeOutlined,
  PlusOutlined, UserOutlined, CalendarOutlined, ReloadOutlined,
  FolderOpenOutlined, FormOutlined, TeamOutlined, SafetyOutlined,
  FilePdfOutlined, HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  searchExaminations, getMedicalRecordFull, getPatientMedicalHistory,
  getTreatmentSheets, getConsultationRecords, getNursingCareSheets,
  createTreatmentSheet, updateTreatmentSheet,
  createConsultationRecord, updateConsultationRecord,
  createNursingCareSheet, updateNursingCareSheet,
  printOutpatientMedicalRecord, printExaminationForm,
  type ExaminationDto, type ExaminationSearchDto, type PagedResult,
  type MedicalRecordFullDto, type MedicalHistoryDto,
  type TreatmentSheetDto, type ConsultationRecordDto, type NursingCareSheetDto,
} from '../api/examination';
import {
  MedicalRecordSummaryPrint, TreatmentSheetPrint, ConsultationPrint,
  DischargeCertificatePrint, NursingCarePrint,
  PreAnestheticExamPrint, SurgeryConsentPrint, TreatmentProgressNotePrint,
  CounselingFormPrint, DeathReviewPrint, MedicalRecordFinalSummaryPrint,
  NutritionExamPrint, SurgeryRecordPrint, SurgeryApprovalPrint,
  SurgerySummaryPrint, DepartmentTransferPrint, AdmissionExamPrint,
} from '../components/EMRPrintTemplates';
import { printEmrForm } from '../api/pdf';
import PatientTimeline from '../components/PatientTimeline';
import { PinEntryModal, SignatureStatusIcon, SignatureVerificationPanel, BatchSigningModal } from '../components/digital-signature';
import { useSigningContext } from '../contexts/SigningContext';
import { getSignatures } from '../api/digitalSignature';
import type { DocumentSignatureDto } from '../api/digitalSignature';
import {
  NursingCarePlanPrint, ICUNursingCarePlanPrint, NursingAssessmentPrint,
  DailyNursingCarePrint, InfusionMonitoringPrint, BloodTransfusionLabPrint,
  BloodTransfusionClinicalPrint, VitalSignsMonitoringPrint, MedicineDisclosurePrint,
  PreOpPreparationPrint, ICUTransferCriteriaPrint, NursingDeptTransferPrint,
  PreEclampsiaPrint, IPDHandoverChecklistPrint, ORHandoverChecklistPrint,
  SurgicalSafetyChecklistPrint, GlucoseMonitoringPrint, PregnancyRiskPrint,
  SwallowingAssessmentPrint, DocumentScanPrint, VAPMonitoringPrint,
} from '../components/EMRNursingPrintTemplates';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const statusColors: Record<number, string> = {
  0: 'default', 1: 'processing', 2: 'warning', 3: 'orange', 4: 'success',
};
const statusNames: Record<number, string> = {
  0: 'Chờ khám', 1: 'Đang khám', 2: 'Chờ CLS', 3: 'Chờ kết luận', 4: 'Hoàn thành',
};

const EMR: React.FC = () => {
  // Search state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(30, 'day'), dayjs()
  ]);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [examinations, setExaminations] = useState<ExaminationDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  // Selected record
  const [selectedExam, setSelectedExam] = useState<ExaminationDto | null>(null);
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecordFullDto | null>(null);
  const [patientHistory, setPatientHistory] = useState<MedicalHistoryDto[]>([]);
  const [treatmentSheets, setTreatmentSheets] = useState<TreatmentSheetDto[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRecordDto[]>([]);
  const [nursingSheets, setNursingCareSheets] = useState<NursingCareSheetDto[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('record');

  // Form modals
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [nursingModalOpen, setNursingModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<TreatmentSheetDto | null>(null);
  const [editingConsultation, setEditingConsultation] = useState<ConsultationRecordDto | null>(null);
  const [editingNursing, setEditingNursing] = useState<NursingCareSheetDto | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [treatmentForm] = Form.useForm();
  const [consultationForm] = Form.useForm();
  const [nursingForm] = Form.useForm();

  const searchInputRef = useRef<ReturnType<typeof Input.Search> | null>(null);

  // Digital signature
  const { sessionActive, openSession, signDocument } = useSigningContext();
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [verificationPanelOpen, setVerificationPanelOpen] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<DocumentSignatureDto | null>(null);
  const [signatureMap, setSignatureMap] = useState<Map<string, DocumentSignatureDto>>(new Map());
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');

  // Print preview
  const [printDrawerOpen, setPrintDrawerOpen] = useState(false);
  const [printType, setPrintType] = useState<string>('summary');
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationRecordDto | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrintPreview = (type: string, consultation?: ConsultationRecordDto) => {
    setPrintType(type);
    if (consultation) setSelectedConsultation(consultation);
    setPrintDrawerOpen(true);
  };

  const handleDoPrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { message.warning('Không thể mở cửa sổ in. Vui lòng tắt popup blocker.'); return; }
    printWindow.document.write('<html><head><title>In biểu mẫu</title></head><body>');
    printWindow.document.write(printRef.current.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  // Digital signature handlers
  const loadSignatureForExam = useCallback(async (examId: string) => {
    try {
      const res = await getSignatures(examId);
      if (res.data.length > 0) {
        setSignatureMap(prev => new Map(prev).set(examId, res.data[0]));
      }
    } catch { /* ignore */ }
  }, []);

  const handlePinSubmit = async (pin: string) => {
    setPinLoading(true);
    setPinError('');
    try {
      const res = await openSession(pin);
      if (res.success) {
        setPinModalOpen(false);
        message.success('Phiên ký số đã mở');
        // If we have a selected exam, sign it
        if (selectedExam) {
          const signRes = await signDocument(selectedExam.id, 'EMR', 'Ký xác nhận hồ sơ bệnh án');
          if (signRes.success) {
            message.success('Ký số thành công');
            loadSignatureForExam(selectedExam.id);
          } else {
            message.warning(signRes.message || 'Ký số thất bại');
          }
        }
      } else {
        setPinError(res.message || 'PIN không đúng');
      }
    } catch {
      setPinError('Không thể kết nối USB Token');
    } finally {
      setPinLoading(false);
    }
  };

  const handleSignExam = async () => {
    if (!selectedExam) return;
    if (!sessionActive) {
      setPinModalOpen(true);
      return;
    }
    try {
      const res = await signDocument(selectedExam.id, 'EMR', 'Ký xác nhận hồ sơ bệnh án');
      if (res.success) {
        message.success('Ký số thành công');
        loadSignatureForExam(selectedExam.id);
      } else {
        message.warning(res.message || 'Ký số thất bại');
      }
    } catch {
      message.warning('Lỗi ký số');
    }
  };

  // Search examinations
  const handleSearch = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const dto: ExaminationSearchDto = {
        keyword: searchKeyword || '',
        status: statusFilter !== undefined ? String(statusFilter) : '',
        fromDate: dateRange[0]?.format('YYYY-MM-DD'),
        toDate: dateRange[1]?.format('YYYY-MM-DD'),
        pageIndex: page,
        pageSize,
      };
      const resp = await searchExaminations(dto);
      const data = (resp.data as unknown as PagedResult<ExaminationDto>) ?? resp.data;
      setExaminations(data.items ?? []);
      setTotalCount(data.totalCount ?? 0);
      setCurrentPage(page);
    } catch {
      message.warning('Không thể tải danh sách hồ sơ');
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, statusFilter, dateRange, pageSize]);

  useEffect(() => {
    handleSearch(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load detail when selecting an examination
  const loadDetail = useCallback(async (exam: ExaminationDto) => {
    setSelectedExam(exam);
    setDetailLoading(true);
    try {
      const [recordRes, historyRes, treatmentRes, consultRes, nursingRes] = await Promise.allSettled([
        getMedicalRecordFull(exam.id),
        getPatientMedicalHistory(exam.patientId),
        getTreatmentSheets(exam.id),
        getConsultationRecords(exam.id),
        getNursingCareSheets(exam.id),
      ]);
      setMedicalRecord(recordRes.status === 'fulfilled' ? recordRes.value.data as unknown as MedicalRecordFullDto : null);
      setPatientHistory(historyRes.status === 'fulfilled' ? (historyRes.value.data as unknown as MedicalHistoryDto[]) ?? [] : []);
      setTreatmentSheets(treatmentRes.status === 'fulfilled' ? (treatmentRes.value.data as unknown as TreatmentSheetDto[]) ?? [] : []);
      setConsultations(consultRes.status === 'fulfilled' ? (consultRes.value.data as unknown as ConsultationRecordDto[]) ?? [] : []);
      setNursingCareSheets(nursingRes.status === 'fulfilled' ? (nursingRes.value.data as unknown as NursingCareSheetDto[]) ?? [] : []);
    } catch {
      message.warning('Không thể tải chi tiết hồ sơ');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Treatment sheet CRUD
  const handleSaveTreatment = async () => {
    if (!selectedExam) return;
    setFormLoading(true);
    try {
      const values = await treatmentForm.validateFields();
      const dto: TreatmentSheetDto = {
        ...values,
        id: editingTreatment?.id ?? '',
        examinationId: selectedExam.id,
        treatmentDate: values.treatmentDate?.format('YYYY-MM-DD') ?? dayjs().format('YYYY-MM-DD'),
        medications: editingTreatment?.medications ?? [],
        doctorId: editingTreatment?.doctorId ?? '',
      };
      if (editingTreatment?.id) {
        await updateTreatmentSheet(editingTreatment.id, dto);
        message.success('Cập nhật phiếu điều trị thành công');
      } else {
        await createTreatmentSheet(dto);
        message.success('Tạo phiếu điều trị thành công');
      }
      setTreatmentModalOpen(false);
      treatmentForm.resetFields();
      // Reload
      const resp = await getTreatmentSheets(selectedExam.id);
      setTreatmentSheets((resp.data as unknown as TreatmentSheetDto[]) ?? []);
    } catch {
      message.warning('Không thể lưu phiếu điều trị');
    } finally {
      setFormLoading(false);
    }
  };

  // Consultation record CRUD
  const handleSaveConsultation = async () => {
    if (!selectedExam) return;
    setFormLoading(true);
    try {
      const values = await consultationForm.validateFields();
      const dto: ConsultationRecordDto = {
        ...values,
        id: editingConsultation?.id ?? '',
        examinationId: selectedExam.id,
        consultationDate: values.consultationDate?.format('YYYY-MM-DD') ?? dayjs().format('YYYY-MM-DD'),
        consultants: editingConsultation?.consultants ?? [],
      };
      if (editingConsultation?.id) {
        await updateConsultationRecord(editingConsultation.id, dto);
        message.success('Cập nhật biên bản hội chẩn thành công');
      } else {
        await createConsultationRecord(dto);
        message.success('Tạo biên bản hội chẩn thành công');
      }
      setConsultationModalOpen(false);
      consultationForm.resetFields();
      const resp = await getConsultationRecords(selectedExam.id);
      setConsultations((resp.data as unknown as ConsultationRecordDto[]) ?? []);
    } catch {
      message.warning('Không thể lưu biên bản hội chẩn');
    } finally {
      setFormLoading(false);
    }
  };

  // Nursing care sheet CRUD
  const handleSaveNursing = async () => {
    if (!selectedExam) return;
    setFormLoading(true);
    try {
      const values = await nursingForm.validateFields();
      const dto: NursingCareSheetDto = {
        ...values,
        id: editingNursing?.id ?? '',
        examinationId: selectedExam.id,
        careDate: values.careDate?.format('YYYY-MM-DD') ?? dayjs().format('YYYY-MM-DD'),
        nurseId: editingNursing?.nurseId ?? '',
      };
      if (editingNursing?.id) {
        await updateNursingCareSheet(editingNursing.id, dto);
        message.success('Cập nhật phiếu chăm sóc thành công');
      } else {
        await createNursingCareSheet(dto);
        message.success('Tạo phiếu chăm sóc thành công');
      }
      setNursingModalOpen(false);
      nursingForm.resetFields();
      const resp = await getNursingCareSheets(selectedExam.id);
      setNursingCareSheets((resp.data as unknown as NursingCareSheetDto[]) ?? []);
    } catch {
      message.warning('Không thể lưu phiếu chăm sóc');
    } finally {
      setFormLoading(false);
    }
  };

  // Print via backend API
  const handlePrint = async (type: 'record' | 'form') => {
    if (!selectedExam) return;
    try {
      if (type === 'record') {
        await printOutpatientMedicalRecord(selectedExam.id);
      } else {
        await printExaminationForm(selectedExam.id);
      }
      message.success('Đã gửi lệnh in');
    } catch {
      message.warning('Không thể in');
    }
  };

  // Columns for examination list
  const examColumns = [
    {
      title: 'Ngày', dataIndex: 'examinationDate', key: 'date', width: 100,
      render: (v: string) => dayjs(v).format('DD/MM/YY'),
    },
    {
      title: 'Mã BN', dataIndex: 'patientCode', key: 'code', width: 90,
    },
    {
      title: 'Họ tên', dataIndex: 'patientName', key: 'name', ellipsis: true,
    },
    {
      title: 'Phòng', dataIndex: 'roomName', key: 'room', width: 120, ellipsis: true,
    },
    {
      title: 'Chẩn đoán', dataIndex: 'diagnosisName', key: 'diag', ellipsis: true,
      render: (v: string, r: ExaminationDto) => v ? `${r.diagnosisCode ?? ''} - ${v}` : '-',
    },
    {
      title: 'TT', dataIndex: 'status', key: 'status', width: 100,
      render: (v: number) => <Tag color={statusColors[v] ?? 'default'}>{statusNames[v] ?? `${v}`}</Tag>,
    },
  ];

  // Treatment sheet columns
  const treatmentColumns = [
    {
      title: 'Ngày', dataIndex: 'treatmentDate', key: 'date', width: 100,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    { title: 'Ngày thứ', dataIndex: 'dayNumber', key: 'day', width: 80 },
    { title: 'Y lệnh', dataIndex: 'treatmentOrders', key: 'orders', ellipsis: true },
    { title: 'Diễn biến', dataIndex: 'dailyProgress', key: 'progress', ellipsis: true },
    { title: 'BS', dataIndex: 'doctorName', key: 'doctor', width: 120, ellipsis: true },
    {
      title: '', key: 'actions', width: 80,
      render: (_: unknown, r: TreatmentSheetDto) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => { setEditingTreatment(r); treatmentForm.setFieldsValue({ ...r, treatmentDate: dayjs(r.treatmentDate) }); setTreatmentModalOpen(true); }} />
          <Button type="link" size="small" icon={<EyeOutlined />} />
        </Space>
      ),
    },
  ];

  // Consultation columns
  const consultationColumns = [
    {
      title: 'Ngày', dataIndex: 'consultationDate', key: 'date', width: 100,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    { title: 'Lý do', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: 'Kết luận', dataIndex: 'conclusion', key: 'conclusion', ellipsis: true },
    { title: 'Chủ tọa', dataIndex: 'chairman', key: 'chairman', width: 120, ellipsis: true },
    {
      title: '', key: 'actions', width: 80,
      render: (_: unknown, r: ConsultationRecordDto) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => { setEditingConsultation(r); consultationForm.setFieldsValue({ ...r, consultationDate: dayjs(r.consultationDate) }); setConsultationModalOpen(true); }} />
          <Button type="link" size="small" icon={<PrinterOutlined />}
            onClick={() => handlePrintPreview('consultation', r)} />
        </Space>
      ),
    },
  ];

  // Nursing columns
  const nursingColumns = [
    {
      title: 'Ngày', dataIndex: 'careDate', key: 'date', width: 100,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    { title: 'Ca', dataIndex: 'shift', key: 'shift', width: 60, render: (v: number) => v === 1 ? 'Sáng' : v === 2 ? 'Chiều' : 'Đêm' },
    { title: 'Tình trạng BN', dataIndex: 'patientCondition', key: 'condition', ellipsis: true },
    { title: 'Can thiệp', dataIndex: 'nursingInterventions', key: 'interventions', ellipsis: true },
    { title: 'ĐD', dataIndex: 'nurseName', key: 'nurse', width: 120, ellipsis: true },
    {
      title: '', key: 'actions', width: 80,
      render: (_: unknown, r: NursingCareSheetDto) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => { setEditingNursing(r); nursingForm.setFieldsValue({ ...r, careDate: dayjs(r.careDate) }); setNursingModalOpen(true); }} />
          <Button type="link" size="small" icon={<EyeOutlined />} />
        </Space>
      ),
    },
  ];

  // Detail panel - Medical Record view
  const renderMedicalRecord = () => {
    if (!medicalRecord) return <Empty description="Chưa có dữ liệu hồ sơ bệnh án" />;
    const { patient, vitalSigns, interview, physicalExam, diagnoses, allergies } = medicalRecord;

    return (
      <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
        {/* Patient Info */}
        <Card size="small" title={<><UserOutlined /> Thông tin bệnh nhân</>} style={{ marginBottom: 12 }}>
          <Descriptions size="small" column={3}>
            <Descriptions.Item label="Mã BN">{patient?.patientCode}</Descriptions.Item>
            <Descriptions.Item label="Họ tên"><Text strong>{patient?.fullName}</Text></Descriptions.Item>
            <Descriptions.Item label="Giới">{patient?.gender === 1 ? 'Nam' : 'Nữ'}</Descriptions.Item>
            <Descriptions.Item label="Tuổi">{patient?.age}</Descriptions.Item>
            <Descriptions.Item label="SĐT">{patient?.phoneNumber ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">{patient?.address ?? '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Vital Signs */}
        {vitalSigns && (
          <Card size="small" title={<><HeartOutlined /> Sinh hiệu</>} style={{ marginBottom: 12 }}>
            <Descriptions size="small" column={4}>
              <Descriptions.Item label="Mạch">{vitalSigns.pulse ?? '-'} l/ph</Descriptions.Item>
              <Descriptions.Item label="Nhiệt độ">{vitalSigns.temperature ?? '-'} °C</Descriptions.Item>
              <Descriptions.Item label="HA">{vitalSigns.systolicBP ?? '-'}/{vitalSigns.diastolicBP ?? '-'} mmHg</Descriptions.Item>
              <Descriptions.Item label="Nhịp thở">{vitalSigns.respiratoryRate ?? '-'} l/ph</Descriptions.Item>
              <Descriptions.Item label="Cân nặng">{vitalSigns.weight ?? '-'} kg</Descriptions.Item>
              <Descriptions.Item label="Chiều cao">{vitalSigns.height ?? '-'} cm</Descriptions.Item>
              <Descriptions.Item label="BMI">{vitalSigns.bmi ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="SpO2">{vitalSigns.spO2 ?? '-'} %</Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* Interview */}
        {interview && (
          <Card size="small" title={<><FormOutlined /> Bệnh sử</>} style={{ marginBottom: 12 }}>
            <Descriptions size="small" column={1} layout="vertical">
              {interview.chiefComplaint && <Descriptions.Item label="Lý do khám">{interview.chiefComplaint}</Descriptions.Item>}
              {interview.historyOfPresentIllness && <Descriptions.Item label="Quá trình bệnh lý">{interview.historyOfPresentIllness}</Descriptions.Item>}
              {interview.pastMedicalHistory && <Descriptions.Item label="Tiền sử bệnh">{interview.pastMedicalHistory}</Descriptions.Item>}
              {interview.familyHistory && <Descriptions.Item label="Tiền sử gia đình">{interview.familyHistory}</Descriptions.Item>}
              {interview.socialHistory && <Descriptions.Item label="Tiền sử xã hội">{interview.socialHistory}</Descriptions.Item>}
            </Descriptions>
          </Card>
        )}

        {/* Physical Exam */}
        {physicalExam && (
          <Card size="small" title={<><ExperimentOutlined /> Khám lâm sàng</>} style={{ marginBottom: 12 }}>
            <Descriptions size="small" column={1} layout="vertical">
              {physicalExam.generalAppearance && <Descriptions.Item label="Toàn thân">{physicalExam.generalAppearance}</Descriptions.Item>}
              {physicalExam.cardiovascular && <Descriptions.Item label="Tim mạch">{physicalExam.cardiovascular}</Descriptions.Item>}
              {physicalExam.respiratory && <Descriptions.Item label="Hô hấp">{physicalExam.respiratory}</Descriptions.Item>}
              {physicalExam.gastrointestinal && <Descriptions.Item label="Tiêu hóa">{physicalExam.gastrointestinal}</Descriptions.Item>}
              {physicalExam.neurological && <Descriptions.Item label="Thần kinh">{physicalExam.neurological}</Descriptions.Item>}
              {physicalExam.musculoskeletal && <Descriptions.Item label="Cơ xương khớp">{physicalExam.musculoskeletal}</Descriptions.Item>}
            </Descriptions>
          </Card>
        )}

        {/* Diagnoses */}
        {diagnoses?.length > 0 && (
          <Card size="small" title={<><SafetyOutlined /> Chẩn đoán</>} style={{ marginBottom: 12 }}>
            <Table size="small" dataSource={diagnoses} pagination={false} rowKey="id"
              columns={[
                { title: 'Mã ICD', dataIndex: 'icdCode', width: 90 },
                { title: 'Tên', dataIndex: 'icdName', ellipsis: true },
                { title: 'Loại', dataIndex: 'diagnosisType', width: 100,
                  render: (v: number) => v === 1 ? <Tag color="blue">Chính</Tag> : <Tag>Phụ</Tag> },
              ]} />
          </Card>
        )}

        {/* Allergies */}
        {allergies?.length > 0 && (
          <Card size="small" title="Dị ứng" style={{ marginBottom: 12 }}>
            {allergies.map(a => (
              <Tag key={a.id} color={a.severity === 3 ? 'red' : a.severity === 2 ? 'orange' : 'default'}>
                {a.allergenName}
              </Tag>
            ))}
          </Card>
        )}

        {/* Conclusion */}
        {medicalRecord.conclusion && (
          <Card size="small" title="Kết luận" style={{ marginBottom: 12 }}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Kết luận">{medicalRecord.conclusion.conclusionType === 1 ? 'Về nhà' : medicalRecord.conclusion.conclusionType === 2 ? 'Nhập viện' : medicalRecord.conclusion.conclusionType === 3 ? 'Chuyển viện' : 'Khác'}</Descriptions.Item>
              {medicalRecord.conclusion.conclusionNotes && <Descriptions.Item label="Ghi chú">{medicalRecord.conclusion.conclusionNotes}</Descriptions.Item>}
            </Descriptions>
          </Card>
        )}
      </div>
    );
  };

  // History timeline
  const renderHistory = () => {
    if (!patientHistory.length) return <Empty description="Chưa có lịch sử khám" />;
    return (
      <Timeline
        items={patientHistory.map(h => ({
          key: h.examinationId,
          color: h.conclusionType === 2 ? 'red' : 'blue',
          content: (
            <div style={{ cursor: 'pointer' }} onClick={() => {
              const exam: ExaminationDto = {
                id: h.examinationId, patientId: selectedExam?.patientId ?? '',
                patientCode: selectedExam?.patientCode ?? '', patientName: selectedExam?.patientName ?? '',
                roomId: '', roomName: h.roomName, status: 4, statusName: 'Hoàn thành',
                queueNumber: 0, examinationDate: h.examinationDate,
                diagnosisCode: h.diagnosisCode, diagnosisName: h.diagnosisName,
              };
              loadDetail(exam);
            }}>
              <Text strong>{dayjs(h.examinationDate).format('DD/MM/YYYY')}</Text>
              <br />
              <Text type="secondary">{h.roomName}</Text>
              {h.doctorName && <Text type="secondary"> - BS. {h.doctorName}</Text>}
              <br />
              {h.diagnosisCode && <Tag color="blue">{h.diagnosisCode}</Tag>}
              {h.diagnosisName && <Text>{h.diagnosisName}</Text>}
            </div>
          ),
        }))}
      />
    );
  };

  // Detail tabs
  const detailTabs = [
    {
      key: 'record', label: <><FolderOpenOutlined /> Hồ sơ BA</>,
      children: renderMedicalRecord(),
    },
    {
      key: 'history', label: <><CalendarOutlined /> Lịch sử khám</>,
      children: renderHistory(),
    },
    {
      key: 'timeline', label: <><HistoryOutlined /> Timeline tổng hợp</>,
      children: selectedExam?.patientId ? (
        <PatientTimeline
          patientId={selectedExam.patientId}
          onExaminationClick={(examId) => {
            const exam: ExaminationDto = {
              id: examId, patientId: selectedExam.patientId,
              patientCode: selectedExam.patientCode, patientName: selectedExam.patientName,
              roomId: '', roomName: '', status: 4, statusName: 'Hoàn thành',
              queueNumber: 0, examinationDate: '',
            };
            loadDetail(exam);
            setDetailTab('record');
          }}
        />
      ) : <Empty description="Chọn bệnh nhân để xem timeline" />,
    },
    {
      key: 'treatment', label: <Badge count={treatmentSheets.length} size="small" offset={[8, 0]}><FileTextOutlined /> Phiếu điều trị</Badge>,
      children: (
        <>
          <div style={{ marginBottom: 8, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} size="small"
              onClick={() => { setEditingTreatment(null); treatmentForm.resetFields(); treatmentForm.setFieldsValue({ treatmentDate: dayjs(), dayNumber: treatmentSheets.length + 1 }); setTreatmentModalOpen(true); }}>
              Thêm phiếu
            </Button>
          </div>
          <Table size="small" dataSource={treatmentSheets} columns={treatmentColumns} rowKey="id"
            pagination={false} scroll={{ y: 400 }} />
        </>
      ),
    },
    {
      key: 'consultation', label: <Badge count={consultations.length} size="small" offset={[8, 0]}><TeamOutlined /> Hội chẩn</Badge>,
      children: (
        <>
          <div style={{ marginBottom: 8, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} size="small"
              onClick={() => { setEditingConsultation(null); consultationForm.resetFields(); consultationForm.setFieldsValue({ consultationDate: dayjs() }); setConsultationModalOpen(true); }}>
              Thêm biên bản
            </Button>
          </div>
          <Table size="small" dataSource={consultations} columns={consultationColumns} rowKey="id"
            pagination={false} scroll={{ y: 400 }} />
        </>
      ),
    },
    {
      key: 'nursing', label: <Badge count={nursingSheets.length} size="small" offset={[8, 0]}><MedicineBoxOutlined /> Chăm sóc</Badge>,
      children: (
        <>
          <div style={{ marginBottom: 8, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} size="small"
              onClick={() => { setEditingNursing(null); nursingForm.resetFields(); nursingForm.setFieldsValue({ careDate: dayjs(), shift: 1 }); setNursingModalOpen(true); }}>
              Thêm phiếu
            </Button>
          </div>
          <Table size="small" dataSource={nursingSheets} columns={nursingColumns} rowKey="id"
            pagination={false} scroll={{ y: 400 }} />
        </>
      ),
    },
  ];

  return (
    <div style={{ height: '100%' }}>
      <Row gutter={12} style={{ height: '100%' }}>
        {/* Left panel: Search + List */}
        <Col span={10}>
          <Card size="small" title={<><FileTextOutlined /> Hồ sơ bệnh án điện tử (EMR)</>}
            style={{ height: '100%' }}
            styles={{ body: { padding: '8px 12px' } }}>
            {/* Search bar */}
            <Space orientation="vertical" style={{ width: '100%', marginBottom: 8 }}>
              <Input.Search
                placeholder="Tìm theo mã BN, họ tên, SĐT..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                onSearch={() => handleSearch(1)}
                enterButton={<SearchOutlined />}
                allowClear
              />
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <RangePicker size="small" value={dateRange}
                  onChange={v => setDateRange(v ? [v[0], v[1]] : [null, null])}
                  format="DD/MM/YYYY" style={{ width: 220 }} />
                <Select size="small" placeholder="Trạng thái" allowClear
                  style={{ width: 120 }} value={statusFilter}
                  onChange={v => setStatusFilter(v)}
                  options={Object.entries(statusNames).map(([k, v]) => ({ value: Number(k), label: v }))} />
                <Button size="small" icon={<ReloadOutlined />} onClick={() => handleSearch(1)} />
              </Space>
            </Space>

            {/* Examination table */}
            <Table size="small" dataSource={examinations} columns={examColumns}
              rowKey="id" loading={loading}
              onRow={r => ({ onClick: () => loadDetail(r), style: { cursor: 'pointer', background: selectedExam?.id === r.id ? '#e6f7ff' : undefined } })}
              pagination={{
                current: currentPage, pageSize, total: totalCount, size: 'small',
                showSizeChanger: false, showTotal: t => `${t} hồ sơ`,
                onChange: p => handleSearch(p),
              }}
              scroll={{ y: 'calc(100vh - 340px)' }}
            />
          </Card>
        </Col>

        {/* Right panel: Detail */}
        <Col span={14}>
          <Card size="small"
            title={selectedExam
              ? <><UserOutlined /> {selectedExam.patientName} - {selectedExam.patientCode}</>
              : <><FileTextOutlined /> Chi tiết hồ sơ</>
            }
            extra={selectedExam && (
              <Space>
                <Tooltip title="Tóm tắt BA">
                  <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintPreview('summary')} />
                </Tooltip>
                <Tooltip title="Tờ điều trị">
                  <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintPreview('treatment')} />
                </Tooltip>
                <Tooltip title="Phiếu chăm sóc">
                  <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintPreview('nursing')} />
                </Tooltip>
                <Dropdown menu={{ items: [
                  { type: 'group', label: 'Bác sĩ (MS. 04-17)', children: [
                    { key: 'discharge', label: 'MS.04 - Giấy ra viện' },
                    { key: 'preanesthetic', label: 'MS.06 - Khám tiền mê' },
                    { key: 'consent', label: 'MS.07 - Cam kết PT' },
                    { key: 'progress', label: 'MS.08 - Sơ kết 15 ngày' },
                    { key: 'counseling', label: 'MS.09 - Phiếu tư vấn' },
                    { key: 'deathreview', label: 'MS.10 - Kiểm điểm tử vong' },
                    { key: 'finalsummary', label: 'MS.11 - Tổng kết HSBA' },
                    { key: 'nutrition', label: 'MS.12 - Khám dinh dưỡng' },
                    { key: 'surgeryrecord', label: 'MS.13 - Phiếu phẫu thuật' },
                    { key: 'surgeryapproval', label: 'MS.14 - Duyệt phẫu thuật' },
                    { key: 'surgerysummary', label: 'MS.15 - Sơ kết phẫu thuật' },
                    { key: 'depttransfer', label: 'MS.16 - Bàn giao chuyển khoa' },
                    { key: 'admission', label: 'MS.17 - Khám vào viện' },
                  ]},
                  { type: 'group', label: 'Điều dưỡng (DD. 01-21)', children: [
                    { key: 'dd01-careplan', label: 'DD.01 - KH chăm sóc' },
                    { key: 'dd02-icucare', label: 'DD.02 - KH chăm sóc HSCC' },
                    { key: 'dd03-assessment', label: 'DD.03 - Nhận định ĐD' },
                    { key: 'dd04-dailycare', label: 'DD.04 - Theo dõi CS' },
                    { key: 'dd05-infusion', label: 'DD.05 - Truyền dịch' },
                    { key: 'dd06-bloodlab', label: 'DD.06 - Truyền máu (XN)' },
                    { key: 'dd07-bloodclinical', label: 'DD.07 - Truyền máu (LS)' },
                    { key: 'dd08-vitalsigns', label: 'DD.08 - Chức năng sống' },
                    { key: 'dd09-meddisclosure', label: 'DD.09 - Công khai thuốc' },
                    { key: 'dd10-preop', label: 'DD.10 - Chuẩn bị trước mổ' },
                    { key: 'dd11-icutransfer', label: 'DD.11 - Chuyển khỏi HS' },
                    { key: 'dd12-nursetransfer', label: 'DD.12 - BG BN (ĐD)' },
                    { key: 'dd13-preeclampsia', label: 'DD.13 - Tiền sản giật' },
                    { key: 'dd14-ipdhandover', label: 'DD.14 - BG nội trú' },
                    { key: 'dd15-orhandover', label: 'DD.15 - BG chuyển mổ' },
                    { key: 'dd16-safetychecklist', label: 'DD.16 - An toàn PT' },
                    { key: 'dd17-glucose', label: 'DD.17 - Đường huyết' },
                    { key: 'dd18-pregnancyrisk', label: 'DD.18 - Thai kỳ nguy cơ' },
                    { key: 'dd19-swallowing', label: 'DD.19 - Test nuốt' },
                    { key: 'dd20-docscan', label: 'DD.20 - Scan tài liệu' },
                    { key: 'dd21-vap', label: 'DD.21 - VP thở máy' },
                  ]},
                ], onClick: ({ key }) => handlePrintPreview(key) }}>
                  <Button size="small" icon={<PrinterOutlined />}>Biểu mẫu khác</Button>
                </Dropdown>
                <Dropdown menu={{ items: [
                  { key: 'summary', label: 'MS.01 - Tóm tắt BA' },
                  { key: 'treatment', label: 'MS.02 - Tờ điều trị' },
                  { key: 'consultation', label: 'MS.03 - Biên bản hội chẩn' },
                  { key: 'discharge', label: 'MS.04 - Giấy ra viện' },
                  { key: 'nursing', label: 'MS.05 - Phiếu chăm sóc ĐD' },
                  { key: 'preanesthetic', label: 'MS.06 - Khám tiền mê' },
                  { key: 'consent', label: 'MS.07 - Cam kết PT' },
                  { key: 'progress', label: 'MS.08 - Sơ kết 15 ngày' },
                  { key: 'finalsummary', label: 'MS.11 - Tổng kết HSBA' },
                  { key: 'admission', label: 'MS.17 - Khám vào viện' },
                ], onClick: ({ key }) => { if (selectedExam) printEmrForm(selectedExam.id, key); } }}>
                  <Button size="small" icon={<FilePdfOutlined />} type="primary" ghost>In PDF</Button>
                </Dropdown>
                <Tooltip title="Ký số hồ sơ">
                  <Button size="small" type="primary" icon={<SafetyOutlined />} onClick={handleSignExam}>Ký số</Button>
                </Tooltip>
                <Tooltip title="Ký hàng loạt">
                  <Button size="small" icon={<SafetyOutlined />} onClick={() => setBatchModalOpen(true)}>Ký hàng loạt</Button>
                </Tooltip>
                {selectedExam && signatureMap.has(selectedExam.id) && (
                  <SignatureStatusIcon
                    signed={true}
                    signatureInfo={signatureMap.get(selectedExam.id)}
                    onVerifyClick={() => {
                      setSelectedSignature(signatureMap.get(selectedExam.id) || null);
                      setVerificationPanelOpen(true);
                    }}
                  />
                )}
              </Space>
            )}
            style={{ height: '100%' }}
            styles={{ body: { padding: '8px 12px' } }}>
            {!selectedExam ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <FolderOpenOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                <p style={{ color: '#999', marginTop: 16 }}>Chọn một hồ sơ bệnh án từ danh sách bên trái</p>
              </div>
            ) : detailLoading ? (
              <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
            ) : (
              <Tabs activeKey={detailTab} onChange={setDetailTab} items={detailTabs} size="small" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Treatment Sheet Modal */}
      <Modal
        title={editingTreatment ? 'Sửa phiếu điều trị' : 'Thêm phiếu điều trị'}
        open={treatmentModalOpen}
        onOk={handleSaveTreatment}
        onCancel={() => setTreatmentModalOpen(false)}
        confirmLoading={formLoading}
        width={700}
      >
        <Form form={treatmentForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="treatmentDate" label="Ngày điều trị" rules={[{ required: true }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dayNumber" label="Ngày thứ" rules={[{ required: true }]}>
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="dailyProgress" label="Diễn biến bệnh">
            <TextArea rows={3} placeholder="Ghi nhận diễn biến bệnh trong ngày..." />
          </Form.Item>
          <Form.Item name="treatmentOrders" label="Y lệnh điều trị">
            <TextArea rows={3} placeholder="Các y lệnh điều trị..." />
          </Form.Item>
          <Form.Item name="doctorNotes" label="Ghi chú bác sĩ">
            <TextArea rows={2} placeholder="Ghi chú thêm..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Consultation Modal */}
      <Modal
        title={editingConsultation ? 'Sửa biên bản hội chẩn' : 'Thêm biên bản hội chẩn'}
        open={consultationModalOpen}
        onOk={handleSaveConsultation}
        onCancel={() => setConsultationModalOpen(false)}
        confirmLoading={formLoading}
        width={700}
      >
        <Form form={consultationForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="consultationDate" label="Ngày hội chẩn" rules={[{ required: true }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="chairman" label="Chủ tọa">
                <Input placeholder="Tên chủ tọa" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reason" label="Lý do hội chẩn" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="Lý do yêu cầu hội chẩn..." />
          </Form.Item>
          <Form.Item name="summary" label="Tóm tắt bệnh án" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Tóm tắt quá trình bệnh, diễn biến, kết quả CLS..." />
          </Form.Item>
          <Form.Item name="conclusion" label="Kết luận" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="Kết luận của hội đồng..." />
          </Form.Item>
          <Form.Item name="recommendations" label="Hướng xử trí" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="Hướng xử trí, phương pháp điều trị..." />
          </Form.Item>
          <Form.Item name="secretary" label="Thư ký">
            <Input placeholder="Tên thư ký" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Nursing Care Sheet Modal */}
      <Modal
        title={editingNursing ? 'Sửa phiếu chăm sóc' : 'Thêm phiếu chăm sóc'}
        open={nursingModalOpen}
        onOk={handleSaveNursing}
        onCancel={() => setNursingModalOpen(false)}
        confirmLoading={formLoading}
        width={700}
      >
        <Form form={nursingForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="careDate" label="Ngày chăm sóc" rules={[{ required: true }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="shift" label="Ca trực" rules={[{ required: true }]}>
                <Select options={[
                  { value: 1, label: 'Sáng' },
                  { value: 2, label: 'Chiều' },
                  { value: 3, label: 'Đêm' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="patientCondition" label="Tình trạng bệnh nhân">
            <TextArea rows={2} placeholder="Mô tả tình trạng bệnh nhân..." />
          </Form.Item>
          <Form.Item name="nursingAssessment" label="Nhận định điều dưỡng">
            <TextArea rows={2} placeholder="Nhận định tình trạng..." />
          </Form.Item>
          <Form.Item name="nursingInterventions" label="Can thiệp điều dưỡng">
            <TextArea rows={3} placeholder="Các can thiệp thực hiện..." />
          </Form.Item>
          <Form.Item name="patientResponse" label="Đáp ứng bệnh nhân">
            <TextArea rows={2} placeholder="Đáp ứng của bệnh nhân sau can thiệp..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Print Preview Drawer */}
      <Drawer
        title={{
          summary: 'Tóm tắt bệnh án (MS.01)', treatment: 'Tờ điều trị (MS.02)', consultation: 'Biên bản hội chẩn (MS.03)',
          nursing: 'Phiếu chăm sóc (MS.05)', discharge: 'Giấy ra viện (MS.04)',
          preanesthetic: 'Khám tiền mê (MS.06)', consent: 'Cam kết PT (MS.07)',
          progress: 'Sơ kết 15 ngày ĐT (MS.08)', counseling: 'Phiếu tư vấn (MS.09)',
          deathreview: 'Kiểm điểm tử vong (MS.10)', finalsummary: 'Tổng kết HSBA (MS.11)',
          nutrition: 'Khám dinh dưỡng (MS.12)', surgeryrecord: 'Phiếu phẫu thuật (MS.13)',
          surgeryapproval: 'Duyệt phẫu thuật (MS.14)', surgerysummary: 'Sơ kết phẫu thuật (MS.15)',
          depttransfer: 'Bàn giao chuyển khoa (MS.16)', admission: 'Khám vào viện (MS.17)',
          'dd01-careplan': 'KH chăm sóc (DD.01)', 'dd02-icucare': 'KH chăm sóc HSCC (DD.02)',
          'dd03-assessment': 'Nhận định ĐD (DD.03)', 'dd04-dailycare': 'Theo dõi CS (DD.04)',
          'dd05-infusion': 'Truyền dịch (DD.05)', 'dd06-bloodlab': 'Truyền máu XN (DD.06)',
          'dd07-bloodclinical': 'Truyền máu LS (DD.07)', 'dd08-vitalsigns': 'Chức năng sống (DD.08)',
          'dd09-meddisclosure': 'Công khai thuốc (DD.09)', 'dd10-preop': 'Chuẩn bị trước mổ (DD.10)',
          'dd11-icutransfer': 'Chuyển khỏi HS (DD.11)', 'dd12-nursetransfer': 'BG BN ĐD (DD.12)',
          'dd13-preeclampsia': 'Tiền sản giật (DD.13)', 'dd14-ipdhandover': 'BG nội trú (DD.14)',
          'dd15-orhandover': 'BG chuyển mổ (DD.15)', 'dd16-safetychecklist': 'An toàn PT (DD.16)',
          'dd17-glucose': 'Đường huyết (DD.17)', 'dd18-pregnancyrisk': 'Thai kỳ nguy cơ (DD.18)',
          'dd19-swallowing': 'Test nuốt (DD.19)', 'dd20-docscan': 'Scan tài liệu (DD.20)',
          'dd21-vap': 'VP thở máy (DD.21)',
        }[printType] ?? 'Biểu mẫu'}
        open={printDrawerOpen}
        onClose={() => setPrintDrawerOpen(false)}
        size="large"
        extra={<Button type="primary" icon={<PrinterOutlined />} onClick={handleDoPrint}>In</Button>}
      >
        <div ref={printRef}>
          {printType === 'summary' && medicalRecord && (
            <MedicalRecordSummaryPrint record={medicalRecord} />
          )}
          {printType === 'treatment' && medicalRecord && (
            <TreatmentSheetPrint record={medicalRecord} sheets={treatmentSheets} />
          )}
          {printType === 'consultation' && medicalRecord && selectedConsultation && (
            <ConsultationPrint record={medicalRecord} consultation={selectedConsultation} />
          )}
          {printType === 'nursing' && medicalRecord && (
            <NursingCarePrint record={medicalRecord} sheets={nursingSheets} />
          )}
          {printType === 'discharge' && medicalRecord && (
            <DischargeCertificatePrint
              patientName={medicalRecord.patient?.fullName ?? ''}
              patientCode={medicalRecord.patient?.patientCode ?? ''}
              gender={medicalRecord.patient?.gender ?? 1}
              age={medicalRecord.patient?.age ?? 0}
              address={medicalRecord.patient?.address}
              admissionDate={dayjs().subtract(7, 'day').format('YYYY-MM-DD')}
              dischargeDate={dayjs().format('YYYY-MM-DD')}
              departmentName="Khoa Nội"
              doctorName="BS. Nguyễn Văn A"
              dischargeCondition="Đỡ, giảm"
              daysOfStay={7}
            />
          )}
          {printType === 'preanesthetic' && medicalRecord && (
            <PreAnestheticExamPrint record={medicalRecord} />
          )}
          {printType === 'consent' && medicalRecord && (
            <SurgeryConsentPrint
              patientName={medicalRecord.patient?.fullName ?? ''}
              patientCode={medicalRecord.patient?.patientCode ?? ''}
              gender={medicalRecord.patient?.gender ?? 1}
              age={medicalRecord.patient?.age ?? 0}
              address={medicalRecord.patient?.address}
            />
          )}
          {printType === 'progress' && medicalRecord && (
            <TreatmentProgressNotePrint record={medicalRecord} />
          )}
          {printType === 'counseling' && medicalRecord && (
            <CounselingFormPrint record={medicalRecord} />
          )}
          {printType === 'deathreview' && medicalRecord && (
            <DeathReviewPrint record={medicalRecord} />
          )}
          {printType === 'finalsummary' && medicalRecord && (
            <MedicalRecordFinalSummaryPrint record={medicalRecord} />
          )}
          {/* MS. 12-17 Doctor forms */}
          {printType === 'nutrition' && <NutritionExamPrint ref={printRef} record={medicalRecord} />}
          {printType === 'surgeryrecord' && <SurgeryRecordPrint ref={printRef} record={medicalRecord} />}
          {printType === 'surgeryapproval' && <SurgeryApprovalPrint ref={printRef} record={medicalRecord} />}
          {printType === 'surgerysummary' && <SurgerySummaryPrint ref={printRef} record={medicalRecord} />}
          {printType === 'depttransfer' && <DepartmentTransferPrint ref={printRef} record={medicalRecord} />}
          {printType === 'admission' && <AdmissionExamPrint ref={printRef} record={medicalRecord} />}
          {/* DD. 01-21 Nursing forms */}
          {printType === 'dd01-careplan' && <NursingCarePlanPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd02-icucare' && <ICUNursingCarePlanPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd03-assessment' && <NursingAssessmentPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd04-dailycare' && <DailyNursingCarePrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd05-infusion' && <InfusionMonitoringPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd06-bloodlab' && <BloodTransfusionLabPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd07-bloodclinical' && <BloodTransfusionClinicalPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd08-vitalsigns' && <VitalSignsMonitoringPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd09-meddisclosure' && <MedicineDisclosurePrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd10-preop' && <PreOpPreparationPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd11-icutransfer' && <ICUTransferCriteriaPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd12-nursetransfer' && <NursingDeptTransferPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd13-preeclampsia' && <PreEclampsiaPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd14-ipdhandover' && <IPDHandoverChecklistPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd15-orhandover' && <ORHandoverChecklistPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd16-safetychecklist' && <SurgicalSafetyChecklistPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd17-glucose' && <GlucoseMonitoringPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd18-pregnancyrisk' && <PregnancyRiskPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd19-swallowing' && <SwallowingAssessmentPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd20-docscan' && <DocumentScanPrint ref={printRef} record={medicalRecord} />}
          {printType === 'dd21-vap' && <VAPMonitoringPrint ref={printRef} record={medicalRecord} />}
        </div>
      </Drawer>

      {/* Digital Signature Modals */}
      <PinEntryModal
        open={pinModalOpen}
        onSubmit={handlePinSubmit}
        onCancel={() => { setPinModalOpen(false); setPinError(''); }}
        loading={pinLoading}
        error={pinError}
      />
      <BatchSigningModal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        documents={examinations.filter(e => !signatureMap.has(e.id)).map(e => ({ id: e.id, code: e.patientCode, name: e.patientName }))}
        documentType="EMR"
        onComplete={() => { examinations.forEach(e => loadSignatureForExam(e.id)); }}
      />
      <SignatureVerificationPanel
        open={verificationPanelOpen}
        onClose={() => setVerificationPanelOpen(false)}
        signatureInfo={selectedSignature}
        onRevoked={() => {
          if (selectedExam) {
            setSignatureMap(prev => { const m = new Map(prev); m.delete(selectedExam.id); return m; });
          }
        }}
      />
    </div>
  );
};

export default EMR;
