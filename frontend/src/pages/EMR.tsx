import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Tabs, Table, Input, Button, Space, Tag, Descriptions, Form,
  DatePicker, Select, Modal, message, Typography, Row, Col, Divider,
  Drawer, Timeline, Spin, Empty, Badge, Tooltip, Dropdown, InputNumber, Alert,
  TimePicker, Statistic, Popconfirm
} from 'antd';
import {
  FileTextOutlined, SearchOutlined, MedicineBoxOutlined, HeartOutlined,
  ExperimentOutlined, PrinterOutlined, EditOutlined,
  PlusOutlined, UserOutlined, CalendarOutlined, ReloadOutlined,
  FolderOpenOutlined, FormOutlined, TeamOutlined, SafetyOutlined,
  FilePdfOutlined, HistoryOutlined, CopyOutlined, CheckCircleOutlined,
  DownloadOutlined, DeleteOutlined, AlertOutlined,
  LineChartOutlined, MedicineBoxOutlined as MedicineIcon,
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
  ObstetricsMedicalRecordPrint, NeonatalMedicalRecordPrint, PediatricMedicalRecordPrint,
} from '../components/EMRPrintTemplates';
import { printEmrForm } from '../api/pdf';
import client from '../api/client';
import {
  getCompletenessCheck, getAttachments, saveAttachment, deleteAttachment,
  getPrintLogs, stampPrintLog, finalizeRecord,
  type EmrCompletenessDto, type EmrDocumentAttachmentDto, type EmrPrintLogDto,
} from '../api/emrAdmin';
import {
  XRayReportPrint, CTScanReportPrint, MRIReportPrint, UltrasoundReportPrint,
  ECGReportPrint, EEGReportPrint, EndoscopyReportPrint, PFTReportPrint,
  GeneralLabReportPrint, HematologyReportPrint, BiochemistryReportPrint,
  MicrobiologyReportPrint, AllergyFormPrint, PostOpNotePrint, ICUInfoSheetPrint,
} from '../components/ClinicalFormPrintTemplates';
import PatientTimeline from '../components/PatientTimeline';
import VoiceDictation from '../components/VoiceDictation';
import { PinEntryModal, SignatureStatusIcon, SignatureVerificationPanel, BatchSigningModal } from '../components/digital-signature';
import { useSigningContext } from '../contexts/SigningContext';
import { getSignatures, getSignaturesBatch } from '../api/digitalSignature';
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
import {
  InternalMedicineMRPrint, InfectiousDiseaseMRPrint, GynecologyMRPrint,
  PsychiatryMRPrint, DermatologyMRPrint, HematologyMRPrint,
  SurgicalMRPrint, BurnsMRPrint, OncologyMRPrint,
  DentalMRPrint, ENTMRPrint, OutpatientGeneralMRPrint,
  OutpatientDentalMRPrint, CommuneHealthMRPrint,
  TraditionalMedInpatientMRPrint, TraditionalMedOutpatientMRPrint, PediatricTCMMRPrint,
  EyeTraumaMRPrint, EyeAnteriorMRPrint, EyePosteriorMRPrint,
  EyeGlaucomaMRPrint, EyeStrabismusMRPrint, PediatricEyeMRPrint,
  RehabilitationMRPrint, PediatricRehabMRPrint, OutpatientRehabMRPrint,
  OnDemandExamPrint, SpecialtyExamPrint, NursingCareLevel1Print, NursingCareLevel2Print,
} from '../components/SpecialtyMedicalRecordPrintTemplates';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const statusColors: Record<number, string> = {
  0: 'default', 1: 'processing', 2: 'warning', 3: 'orange', 4: 'success',
};
const statusNames: Record<number, string> = {
  0: 'Chờ khám', 1: 'Đang khám', 2: 'Chờ CLS', 3: 'Chờ kết luận', 4: 'Hoàn thành',
};

function buildPrintDocument(printMarkup: string): string {
  const styleMarkup = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]')
  )
    .map((node) => node.outerHTML)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${document.documentElement.lang || 'vi'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>In biểu mẫu</title>
  <base href="${window.location.origin}" />
  ${styleMarkup}
  <style>
    html, body {
      background: #fff;
      margin: 0;
      padding: 0;
    }
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print {
      display: none !important;
    }
    @page {
      size: auto;
      margin: 12mm;
    }
  </style>
</head>
<body>
  ${printMarkup}
</body>
</html>`;
}

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
  const [pageSize] = useState(20);
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

  // NangCap11: Completeness, attachments, print logs
  const [completeness, setCompleteness] = useState<EmrCompletenessDto | null>(null);
  const [attachments, setAttachments] = useState<EmrDocumentAttachmentDto[]>([]);
  const [printLogs, setPrintLogs] = useState<EmrPrintLogDto[]>([]);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [attachmentForm] = Form.useForm();

  // Digital signature
  const { sessionActive, openSession, tryAutoOpenSession, signDocument } = useSigningContext();
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

  // Drug Reaction Test state
  const [drugReactionTests, setDrugReactionTests] = useState<{ id: string; date: string; drugName: string; dose: string; route: string; testTime: string; result: string; reactionDescription: string; tester: string; notes: string }[]>([]);
  const [drugReactionModalOpen, setDrugReactionModalOpen] = useState(false);
  const [drugReactionForm] = Form.useForm();
  const [drugReactionCopyRange, setDrugReactionCopyRange] = useState(false);
  const emrClientIdRef = useRef(0);

  const nextClientId = (prefix: string) => {
    emrClientIdRef.current += 1;
    return `${prefix}-${emrClientIdRef.current}`;
  };

  const handleSaveDrugReaction = async () => {
    try {
      const values = await drugReactionForm.validateFields();
      if (drugReactionCopyRange && values.copyDateRange && values.copyDateRange.length === 2) {
        const start = values.copyDateRange[0];
        const end = values.copyDateRange[1];
        const days = end.diff(start, 'day') + 1;
        const newTests: typeof drugReactionTests = [];
        for (let i = 0; i < days; i++) {
          newTests.push({
            id: nextClientId('drt'),
            date: start.add(i, 'day').format('YYYY-MM-DD'),
            drugName: values.drugName,
            dose: values.dose || '',
            route: values.route || '',
            testTime: values.testTime?.format('HH:mm') || '',
            result: values.result,
            reactionDescription: values.reactionDescription || '',
            tester: values.tester || '',
            notes: values.notes || '',
          });
        }
        setDrugReactionTests(prev => [...prev, ...newTests]);
        message.success(`Da them ${days} phieu thu phan ung thuoc`);
      } else {
        setDrugReactionTests(prev => [...prev, {
          id: nextClientId('drt'),
          date: values.testDate?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
          drugName: values.drugName,
          dose: values.dose || '',
          route: values.route || '',
          testTime: values.testTime?.format('HH:mm') || '',
          result: values.result,
          reactionDescription: values.reactionDescription || '',
          tester: values.tester || '',
          notes: values.notes || '',
        }]);
        message.success('Da them phieu thu phan ung thuoc');
      }
      setDrugReactionModalOpen(false);
      drugReactionForm.resetFields();
      setDrugReactionCopyRange(false);
    } catch { /* validation error */ }
  };

  // Partograph state
  const [partographEntries, setPartographEntries] = useState<{ id: string; time: string; cervicalDilation: number; descent: string; contractionFreq: number; contractionDuration: number; fhr: number; maternalBP: string; maternalPulse: number; maternalTemp: number; notes: string }[]>([]);
  const [partographModalOpen, setPartographModalOpen] = useState(false);
  const [partographForm] = Form.useForm();

  const handleSavePartograph = async () => {
    try {
      const values = await partographForm.validateFields();
      setPartographEntries(prev => [...prev, {
        id: nextClientId('pg'),
        time: values.entryTime?.format('YYYY-MM-DD HH:mm') || dayjs().format('YYYY-MM-DD HH:mm'),
        cervicalDilation: values.cervicalDilation ?? 0,
        descent: values.descent || '',
        contractionFreq: values.contractionFreq ?? 0,
        contractionDuration: values.contractionDuration ?? 0,
        fhr: values.fhr ?? 0,
        maternalBP: `${values.systolicBP ?? ''}/${values.diastolicBP ?? ''}`,
        maternalPulse: values.maternalPulse ?? 0,
        maternalTemp: values.maternalTemp ?? 0,
        notes: values.notes || '',
      }]);
      message.success('Da them du lieu bieu do chuyen da');
      setPartographModalOpen(false);
      partographForm.resetFields();
    } catch { /* validation error */ }
  };

  const partographAlertLine = 4; // cm - alert line threshold
  const partographActionLine = partographAlertLine + 4; // action line = alert + 4h

  // Anesthesia state
  const [anesthesiaEntries, setAnesthesiaEntries] = useState<{ id: string; time: string; bp: string; hr: number; spo2: number; etco2: number; temp: number; notes: string }[]>([]);
  const [anesthesiaDrugs, setAnesthesiaDrugs] = useState<{ id: string; time: string; drugName: string; dose: string; route: string; category: string }[]>([]);
  const [anesthesiaFluids, setAnesthesiaFluids] = useState<{ id: string; type: string; volume: string; startTime: string }[]>([]);
  const [anesthesiaModalOpen, setAnesthesiaModalOpen] = useState(false);
  const [anesthesiaDrugModalOpen, setAnesthesiaDrugModalOpen] = useState(false);
  const [anesthesiaFluidModalOpen, setAnesthesiaFluidModalOpen] = useState(false);
  const [anesthesiaMonitorForm] = Form.useForm();
  const [anesthesiaDrugForm] = Form.useForm();
  const [anesthesiaFluidForm] = Form.useForm();
  const [anesthesiaPreOp, setAnesthesiaPreOp] = useState({ asaClass: '', mallampati: '', allergies: '', npoTime: '', anesthesiaType: '', airway: '' });
  const [anesthesiaRecovery, setAnesthesiaRecovery] = useState('');

  const handlePrintPreview = (type: string, consultation?: ConsultationRecordDto) => {
    setPrintType(type);
    if (consultation) setSelectedConsultation(consultation);
    setPrintDrawerOpen(true);
  };

  const handleDoPrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { message.warning('Không thể mở cửa sổ in. Vui lòng tắt popup blocker.'); return; }
    printWindow.document.open();
    printWindow.document.write(buildPrintDocument(printRef.current.innerHTML));
    printWindow.document.close();
    
    const triggerPrint = () => {
      printWindow.focus();
      window.setTimeout(() => {
        printWindow.print();
      }, 300);
    };

    printWindow.addEventListener('load', triggerPrint, { once: true });
    printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true });

    if (printWindow.document.readyState === 'complete') {
      triggerPrint();
    }
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
    if (!selectedExam) {
      message.warning('Vui lòng chọn hồ sơ bệnh án');
      return;
    }
    if (!sessionActive) {
      // Try auto-open with Windows Certificate Store first (no PIN needed)
      try {
        const autoRes = await tryAutoOpenSession();
        if (autoRes.success) {
          message.success(`Đã kết nối chứng thư số: ${autoRes.certificateSubject || autoRes.caProvider || 'Windows'}`);
          // Proceed to sign directly - Windows will handle PIN dialog if needed
          const signRes = await signDocument(selectedExam.id, 'EMR', 'Ký xác nhận hồ sơ bệnh án');
          if (signRes.success) {
            message.success('Ký số thành công');
            loadSignatureForExam(selectedExam.id);
          } else {
            message.warning(signRes.message || 'Ký số thất bại');
          }
          return;
        }
      } catch { /* Auto-open failed, fall back to PIN entry */ }
      // Fallback: show PIN modal for PKCS#11 mode
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

  // Copy multi-day for treatment sheets
  const handleCopyTreatmentMultiDay = async (sheet: TreatmentSheetDto, days: number) => {
    if (!selectedExam) return;
    setFormLoading(true);
    try {
      const baseDate = dayjs(sheet.treatmentDate);
      for (let i = 1; i <= days; i++) {
        const dto: TreatmentSheetDto = {
          ...sheet,
          id: '',
          treatmentDate: baseDate.add(i, 'day').format('YYYY-MM-DD'),
          dayNumber: (sheet.dayNumber ?? 0) + i,
        };
        await createTreatmentSheet(dto);
      }
      message.success(`Đã sao chép phiếu điều trị cho ${days} ngày tiếp theo`);
      const resp = await getTreatmentSheets(selectedExam.id);
      setTreatmentSheets((resp.data as unknown as TreatmentSheetDto[]) ?? []);
    } catch {
      message.warning('Không thể sao chép phiếu điều trị');
    } finally {
      setFormLoading(false);
    }
  };

  // Copy multi-day for nursing care sheets
  const handleCopyNursingMultiDay = async (sheet: NursingCareSheetDto, days: number) => {
    if (!selectedExam) return;
    setFormLoading(true);
    try {
      const baseDate = dayjs(sheet.careDate);
      for (let i = 1; i <= days; i++) {
        const dto: NursingCareSheetDto = {
          ...sheet,
          id: '',
          careDate: baseDate.add(i, 'day').format('YYYY-MM-DD'),
        };
        await createNursingCareSheet(dto);
      }
      message.success(`Đã sao chép phiếu chăm sóc cho ${days} ngày tiếp theo`);
      const resp = await getNursingCareSheets(selectedExam.id);
      setNursingCareSheets((resp.data as unknown as NursingCareSheetDto[]) ?? []);
    } catch {
      message.warning('Không thể sao chép phiếu chăm sóc');
    } finally {
      setFormLoading(false);
    }
  };

  // Export medical record as standalone HTML file (viewable in any browser)
  const handleExportXml = async () => {
    if (!selectedExam) return;
    if (!medicalRecord) {
      message.warning('Không có dữ liệu bệnh án để xuất');
      return;
    }
    const html = generateExportHtml(medicalRecord, selectedExam);
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, html], { type: 'text/html; charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HSBA_${selectedExam.patientCode}_${dayjs().format('YYYYMMDD')}.html`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    message.success('Xuất file thành công. Mở bằng trình duyệt web (Chrome, Edge, Firefox).');
  };

  // Export as PDF
  const handleExportPdf = async () => {
    if (!selectedExam) return;
    try {
      const resp = await client.get(`/pdf/emr/${selectedExam.id}?format=pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `EMR_${selectedExam.patientCode}_${dayjs().format('YYYYMMDD')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('Xuất file PDF thành công');
    } catch {
      message.warning('Không thể xuất PDF. Sử dụng chức năng In để lưu PDF.');
    }
  };

  // Escape HTML special characters
  const esc = (s: string | number | null | undefined): string => {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  // Generate standalone HTML medical record file
  const generateExportHtml = (record: MedicalRecordFullDto, exam: ExaminationDto): string => {
    const p = record.patient;
    const vs = record.vitalSigns;
    const interview = record.interview;
    const physExam = record.physicalExam;
    const diagnoses = record.diagnoses ?? [];
    const allergies = record.allergies ?? [];
    const conclusion = record.conclusion;
    const genderText = p?.gender === 1 ? 'Nam' : p?.gender === 2 ? 'Nữ' : '';
    const dob = p?.dateOfBirth ? dayjs(p.dateOfBirth).format('DD/MM/YYYY') : '';
    const examDate = dayjs(exam.examinationDate).format('DD/MM/YYYY HH:mm');

    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>HSBA - ${esc(p?.fullName)} - ${esc(exam.patientCode)}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none; } }
  body { font-family: 'Times New Roman', serif; font-size: 14px; max-width: 800px; margin: 20px auto; padding: 0 20px; color: #333; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
  .header h2 { margin: 5px 0; font-size: 18px; }
  .header h1 { margin: 10px 0; font-size: 22px; color: #003366; }
  .meta { font-size: 12px; color: #666; }
  .section { margin: 15px 0; }
  .section h3 { font-size: 16px; color: #003366; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  table th, table td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  table th { background: #f0f5ff; font-weight: bold; width: 180px; }
  .row { display: flex; gap: 20px; flex-wrap: wrap; }
  .row .col { flex: 1; min-width: 200px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
  .badge-info { background: #e6f7ff; color: #0050b3; }
  .badge-warn { background: #fff7e6; color: #ad6800; }
  .badge-err { background: #fff1f0; color: #cf1322; }
  .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 12px; color: #999; text-align: center; }
  .btn-print { position: fixed; top: 10px; right: 10px; padding: 8px 16px; background: #1890ff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
  .btn-print:hover { background: #096dd9; }
</style>
</head>
<body>
<button class="btn-print no-print" onclick="window.print()">In</button>
<div class="header">
  <h2>BỘ Y TẾ</h2>
  <h1>HỒ SƠ BỆNH ÁN ĐIỆN TỬ</h1>
  <div class="meta">Mã hồ sơ: ${esc(exam.id)} | Ngày xuất: ${dayjs().format('DD/MM/YYYY HH:mm')}</div>
</div>

<div class="section">
  <h3>I. THÔNG TIN BỆNH NHÂN</h3>
  <table>
    <tr><th>Họ và tên</th><td><b>${esc(p?.fullName)}</b></td></tr>
    <tr><th>Mã bệnh nhân</th><td>${esc(p?.patientCode)}</td></tr>
    <tr><th>Giới tính</th><td>${esc(genderText)}</td></tr>
    <tr><th>Ngày sinh</th><td>${esc(dob)}${p?.age ? ` (${p.age} tuổi)` : ''}</td></tr>
    <tr><th>Địa chỉ</th><td>${esc(p?.address)}</td></tr>
    <tr><th>Số điện thoại</th><td>${esc(p?.phoneNumber)}</td></tr>
    <tr><th>Nghề nghiệp</th><td>${esc(p?.occupation)}</td></tr>
  </table>
</div>

<div class="section">
  <h3>II. THÔNG TIN KHÁM BỆNH</h3>
  <table>
    <tr><th>Ngày khám</th><td>${esc(examDate)}</td></tr>
    <tr><th>Phòng khám</th><td>${esc(exam.roomName)}</td></tr>
    <tr><th>Bác sĩ</th><td>${esc(exam.doctorName)}</td></tr>
    <tr><th>Trạng thái</th><td>${esc(exam.statusName)}</td></tr>
  </table>
</div>

${vs ? `<div class="section">
  <h3>III. SINH HIỆU</h3>
  <table>
    <tr><th>Cân nặng</th><td>${esc(vs.weight)} kg</td><th>Chiều cao</th><td>${esc(vs.height)} cm</td></tr>
    <tr><th>Huyết áp</th><td>${esc(vs.systolicBP)}/${esc(vs.diastolicBP)} mmHg</td><th>Mạch</th><td>${esc(vs.pulse)} lần/phút</td></tr>
    <tr><th>Nhiệt độ</th><td>${esc(vs.temperature)} °C</td><th>SpO2</th><td>${esc(vs.spO2)} %</td></tr>
    <tr><th>Nhịp thở</th><td>${esc(vs.respiratoryRate)} lần/phút</td><th></th><td></td></tr>
  </table>
</div>` : ''}

${interview ? `<div class="section">
  <h3>IV. BỆNH SỬ</h3>
  <table>
    <tr><th>Lý do khám</th><td>${esc(interview.chiefComplaint)}</td></tr>
    <tr><th>Bệnh sử hiện tại</th><td>${esc(interview.historyOfPresentIllness)}</td></tr>
    <tr><th>Tiền sử bản thân</th><td>${esc(interview.pastMedicalHistory)}</td></tr>
    <tr><th>Tiền sử gia đình</th><td>${esc(interview.familyHistory)}</td></tr>
    <tr><th>Tiền sử dị ứng</th><td>${esc(interview.allergyHistory)}</td></tr>
  </table>
</div>` : ''}

${physExam ? `<div class="section">
  <h3>V. KHÁM LÂM SÀNG</h3>
  <table>
    <tr><th>Toàn thân</th><td>${esc(physExam.generalAppearance)}</td></tr>
    <tr><th>Tim mạch</th><td>${esc(physExam.cardiovascular)}</td></tr>
    <tr><th>Hô hấp</th><td>${esc(physExam.respiratory)}</td></tr>
    <tr><th>Tiêu hóa</th><td>${esc(physExam.gastrointestinal)}</td></tr>
    <tr><th>Thần kinh</th><td>${esc(physExam.neurological)}</td></tr>
    <tr><th>Cơ xương khớp</th><td>${esc(physExam.musculoskeletal)}</td></tr>
    <tr><th>Da</th><td>${esc(physExam.skin)}</td></tr>
    <tr><th>Khác</th><td>${esc(physExam.otherFindings)}</td></tr>
  </table>
</div>` : ''}

${diagnoses.length > 0 ? `<div class="section">
  <h3>VI. CHẨN ĐOÁN</h3>
  <table>
    <tr><th>Mã ICD</th><th>Tên bệnh</th></tr>
${diagnoses.map(d => `    <tr><td>${esc(d.icdCode)}</td><td>${esc(d.icdName)}</td></tr>`).join('\n')}
  </table>
</div>` : ''}

${allergies.length > 0 ? `<div class="section">
  <h3>VII. DỊ ỨNG</h3>
  <table>
    <tr><th>Chất gây dị ứng</th><th>Phản ứng</th><th>Mức độ</th></tr>
${allergies.map(a => `    <tr><td>${esc(a.allergenName)}</td><td>${esc(a.reaction)}</td><td>${a.severity === 1 ? 'Nhẹ' : a.severity === 2 ? 'Trung bình' : a.severity === 3 ? 'Nặng' : ''}</td></tr>`).join('\n')}
  </table>
</div>` : ''}

${conclusion ? `<div class="section">
  <h3>VIII. KẾT LUẬN</h3>
  <table>
    <tr><th>Kết luận</th><td>${esc(conclusion.conclusionNotes)}</td></tr>
  </table>
</div>` : ''}

<div class="footer">
  <p>Tài liệu được xuất từ Hệ thống Thông tin Bệnh viện (HIS) ngày ${dayjs().format('DD/MM/YYYY HH:mm:ss')}</p>
  <p>File này mở bằng trình duyệt web (Chrome, Edge, Firefox) hoặc bấm nút "In" để in ra giấy/PDF.</p>
</div>
</body>
</html>`;
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

  // Load signatures for all visible exams (batch)
  useEffect(() => {
    if (examinations.length === 0) return;
    const ids = examinations.map(e => e.id);
    getSignaturesBatch(ids).then(res => {
      const map = new Map<string, DocumentSignatureDto>();
      Object.entries(res.data).forEach(([docId, sig]) => map.set(docId, sig));
      setSignatureMap(prev => {
        const merged = new Map(prev);
        map.forEach((v, k) => merged.set(k, v));
        return merged;
      });
    }).catch(() => { /* ignore */ });
  }, [examinations]);

  // Load detail when selecting an examination
  const loadDetail = useCallback(async (exam: ExaminationDto) => {
    setSelectedExam(exam);
    setDetailLoading(true);
    try {
      const [recordRes, historyRes, treatmentRes, consultRes, nursingRes, completenessRes, attachRes, printLogRes] = await Promise.allSettled([
        getMedicalRecordFull(exam.id),
        getPatientMedicalHistory(exam.patientId),
        getTreatmentSheets(exam.id),
        getConsultationRecords(exam.id),
        getNursingCareSheets(exam.id),
        getCompletenessCheck(exam.medicalRecordId || exam.id),
        getAttachments(exam.medicalRecordId || exam.id),
        getPrintLogs(exam.medicalRecordId || exam.id),
      ]);
      setMedicalRecord(recordRes.status === 'fulfilled' ? recordRes.value.data as unknown as MedicalRecordFullDto : null);
      setPatientHistory(historyRes.status === 'fulfilled' ? (historyRes.value.data as unknown as MedicalHistoryDto[]) ?? [] : []);
      setTreatmentSheets(treatmentRes.status === 'fulfilled' ? (treatmentRes.value.data as unknown as TreatmentSheetDto[]) ?? [] : []);
      setConsultations(consultRes.status === 'fulfilled' ? (consultRes.value.data as unknown as ConsultationRecordDto[]) ?? [] : []);
      setNursingCareSheets(nursingRes.status === 'fulfilled' ? (nursingRes.value.data as unknown as NursingCareSheetDto[]) ?? [] : []);
      setCompleteness(completenessRes.status === 'fulfilled' ? completenessRes.value as EmrCompletenessDto : null);
      setAttachments(attachRes.status === 'fulfilled' ? (attachRes.value as EmrDocumentAttachmentDto[]) ?? [] : []);
      setPrintLogs(printLogRes.status === 'fulfilled' ? (printLogRes.value as EmrPrintLogDto[]) ?? [] : []);
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
  void handlePrint;

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
    {
      title: 'Ký số', key: 'signed', width: 60, align: 'center' as const,
      render: (_: unknown, r: ExaminationDto) => {
        const sig = signatureMap.get(r.id);
        return sig ? (
          <SignatureStatusIcon
            signed={true}
            signatureInfo={sig}
            onVerifyClick={() => {
              setSelectedSignature(sig);
              setVerificationPanelOpen(true);
            }}
          />
        ) : null;
      },
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
      title: 'Người tạo', dataIndex: 'createdByName', key: 'creator', width: 100, ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '', key: 'actions', width: 120,
      render: (_: unknown, r: TreatmentSheetDto) => (
        <Space>
          <Tooltip title="Sửa"><Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => { setEditingTreatment(r); treatmentForm.setFieldsValue({ ...r, treatmentDate: dayjs(r.treatmentDate) }); setTreatmentModalOpen(true); }} /></Tooltip>
          <Dropdown menu={{ items: [
            { key: '1', label: 'Sao chép 1 ngày' },
            { key: '3', label: 'Sao chép 3 ngày' },
            { key: '7', label: 'Sao chép 7 ngày' },
          ], onClick: ({ key }) => handleCopyTreatmentMultiDay(r, Number(key)) }}>
            <Tooltip title="Sao chép nhiều ngày"><Button type="link" size="small" icon={<CopyOutlined />} /></Tooltip>
          </Dropdown>
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
      title: 'Người tạo', dataIndex: 'createdByName', key: 'creator', width: 100, ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '', key: 'actions', width: 120,
      render: (_: unknown, r: NursingCareSheetDto) => (
        <Space>
          <Tooltip title="Sửa"><Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => { setEditingNursing(r); nursingForm.setFieldsValue({ ...r, careDate: dayjs(r.careDate) }); setNursingModalOpen(true); }} /></Tooltip>
          <Dropdown menu={{ items: [
            { key: '1', label: 'Sao chép 1 ngày' },
            { key: '3', label: 'Sao chép 3 ngày' },
            { key: '7', label: 'Sao chép 7 ngày' },
          ], onClick: ({ key }) => handleCopyNursingMultiDay(r, Number(key)) }}>
            <Tooltip title="Sao chép nhiều ngày"><Button type="link" size="small" icon={<CopyOutlined />} /></Tooltip>
          </Dropdown>
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
      key: 'treatment', label: <Badge count={treatmentSheets.length} showZero={false} size="small" offset={[8, 0]}><FileTextOutlined /> Phiếu điều trị</Badge>,
      children: (
        <>
          <div style={{ marginBottom: 8, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} size="small"
              onClick={() => { setEditingTreatment(null); treatmentForm.resetFields(); treatmentForm.setFieldsValue({ treatmentDate: dayjs(), dayNumber: treatmentSheets.length + 1 }); setTreatmentModalOpen(true); }}>
              Thêm phiếu
            </Button>
          </div>
          <Table size="small" dataSource={treatmentSheets} columns={treatmentColumns} rowKey="id"
            pagination={false} />
        </>
      ),
    },
    {
      key: 'consultation', label: <Badge count={consultations.length} showZero={false} size="small" offset={[8, 0]}><TeamOutlined /> Hội chẩn</Badge>,
      children: (
        <>
          <div style={{ marginBottom: 8, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} size="small"
              onClick={() => { setEditingConsultation(null); consultationForm.resetFields(); consultationForm.setFieldsValue({ consultationDate: dayjs() }); setConsultationModalOpen(true); }}>
              Thêm biên bản
            </Button>
          </div>
          <Table size="small" dataSource={consultations} columns={consultationColumns} rowKey="id"
            pagination={false} />
        </>
      ),
    },
    {
      key: 'nursing', label: <Badge count={nursingSheets.length} showZero={false} size="small" offset={[8, 0]}><MedicineBoxOutlined /> Chăm sóc</Badge>,
      children: (
        <>
          <div style={{ marginBottom: 8, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} size="small"
              onClick={() => { setEditingNursing(null); nursingForm.resetFields(); nursingForm.setFieldsValue({ careDate: dayjs(), shift: 1 }); setNursingModalOpen(true); }}>
              Thêm phiếu
            </Button>
          </div>
          <Table size="small" dataSource={nursingSheets} columns={nursingColumns} rowKey="id"
            pagination={false} />
        </>
      ),
    },
    {
      key: 'drug-reaction', label: <><AlertOutlined /> Thử phản ứng thuốc</>,
      children: (
        <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <Button type="primary" icon={<PlusOutlined />} size="small"
              onClick={() => { drugReactionForm.resetFields(); drugReactionForm.setFieldsValue({ testDate: dayjs(), result: 'Negative' }); setDrugReactionCopyRange(false); setDrugReactionModalOpen(true); }}>
              Thêm phiếu thử
            </Button>
            <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintPreview('drug-reaction')}>In</Button>
          </div>
          {drugReactionTests.length === 0 ? (
            <Empty description="Chưa có phiếu thử phản ứng thuốc" />
          ) : (
            <Table size="small" dataSource={drugReactionTests} rowKey="id" pagination={false}
              columns={[
                { title: 'Ngày', dataIndex: 'date', key: 'date', width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                { title: 'Thuốc', dataIndex: 'drugName', key: 'drug', width: 150 },
                { title: 'Liều', dataIndex: 'dose', key: 'dose', width: 80 },
                { title: 'Đường dùng', dataIndex: 'route', key: 'route', width: 100 },
                { title: 'Giờ thử', dataIndex: 'testTime', key: 'time', width: 70 },
                { title: 'Kết quả', dataIndex: 'result', key: 'result', width: 110,
                  render: (v: string) => <Tag color={v === 'Positive' ? 'red' : v === 'Negative' ? 'green' : 'orange'}>{v === 'Positive' ? 'Dương tính' : v === 'Negative' ? 'Âm tính' : 'Không xác định'}</Tag>
                },
                { title: 'Mô tả PƯ', dataIndex: 'reactionDescription', key: 'reaction', ellipsis: true },
                { title: 'Người thử', dataIndex: 'tester', key: 'tester', width: 100 },
                { title: '', key: 'actions', width: 50,
                  render: (_: unknown, r: typeof drugReactionTests[0]) => (
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}
                      onClick={() => setDrugReactionTests(prev => prev.filter(t => t.id !== r.id))} />
                  ),
                },
              ]}
            />
          )}
        </div>
      ),
    },
    {
      key: 'partograph', label: <><LineChartOutlined /> Biểu đồ chuyển dạ</>,
      children: (
        <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <Button type="primary" icon={<PlusOutlined />} size="small"
              onClick={() => { partographForm.resetFields(); partographForm.setFieldsValue({ entryTime: dayjs() }); setPartographModalOpen(true); }}>
              Thêm dữ liệu
            </Button>
            <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintPreview('partograph')}>In</Button>
          </div>
          {partographEntries.some(e => e.cervicalDilation >= partographActionLine) && (
            <Alert title="CẢNH BÁO: Độ mở CTC đã vượt qua đường hành động (Action Line)! Cần can thiệp ngay." type="error" showIcon style={{ marginBottom: 8 }} />
          )}
          {partographEntries.some(e => e.cervicalDilation >= partographAlertLine && e.cervicalDilation < partographActionLine) && !partographEntries.some(e => e.cervicalDilation >= partographActionLine) && (
            <Alert title="CHÚ Ý: Độ mở CTC đã đạt đường báo động (Alert Line). Theo dõi sát." type="warning" showIcon style={{ marginBottom: 8 }} />
          )}
          {partographEntries.length === 0 ? (
            <Empty description="Chưa có dữ liệu biểu đồ chuyển dạ" />
          ) : (
            <Table size="small" dataSource={partographEntries} rowKey="id" pagination={false}
              columns={[
                { title: 'Thời gian', dataIndex: 'time', key: 'time', width: 140, render: (v: string) => dayjs(v).format('DD/MM HH:mm') },
                { title: 'CTC (cm)', dataIndex: 'cervicalDilation', key: 'ctc', width: 80,
                  render: (v: number) => (
                    <Tag color={v >= partographActionLine ? 'red' : v >= partographAlertLine ? 'orange' : 'blue'}>{v}</Tag>
                  ),
                },
                { title: 'Ngôi (station)', dataIndex: 'descent', key: 'descent', width: 100 },
                { title: 'Cơn co (l/10p)', dataIndex: 'contractionFreq', key: 'freq', width: 100 },
                { title: 'TG co (s)', dataIndex: 'contractionDuration', key: 'dur', width: 80 },
                { title: 'Tim thai', dataIndex: 'fhr', key: 'fhr', width: 80,
                  render: (v: number) => <span style={{ color: v < 110 || v > 160 ? '#ff4d4f' : '#52c41a' }}>{v}</span>
                },
                { title: 'HA mẹ', dataIndex: 'maternalBP', key: 'bp', width: 90 },
                { title: 'Mạch mẹ', dataIndex: 'maternalPulse', key: 'pulse', width: 80 },
                { title: 'Nhiệt độ', dataIndex: 'maternalTemp', key: 'temp', width: 70, render: (v: number) => v ? `${v}\u00B0C` : '-' },
                { title: 'Ghi chú', dataIndex: 'notes', key: 'notes', ellipsis: true },
                { title: '', key: 'del', width: 40,
                  render: (_: unknown, r: typeof partographEntries[0]) => (
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}
                      onClick={() => setPartographEntries(prev => prev.filter(e => e.id !== r.id))} />
                  ),
                },
              ]}
            />
          )}
        </div>
      ),
    },
    {
      key: 'anesthesia', label: <><MedicineIcon /> Gây mê hồi sức</>,
      children: (
        <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
          <Card size="small" title="Đánh giá trước mổ" style={{ marginBottom: 8 }}>
            <Row gutter={8}>
              <Col span={4}>
                <div style={{ fontSize: 11, color: '#888' }}>ASA</div>
                <Select size="small" style={{ width: '100%' }} value={anesthesiaPreOp.asaClass}
                  onChange={v => setAnesthesiaPreOp(p => ({ ...p, asaClass: v }))}>
                  {['I', 'II', 'III', 'IV', 'V', 'VI'].map(c => <Select.Option key={c} value={c}>ASA {c}</Select.Option>)}
                </Select>
              </Col>
              <Col span={4}>
                <div style={{ fontSize: 11, color: '#888' }}>Mallampati</div>
                <Select size="small" style={{ width: '100%' }} value={anesthesiaPreOp.mallampati}
                  onChange={v => setAnesthesiaPreOp(p => ({ ...p, mallampati: v }))}>
                  {['I', 'II', 'III', 'IV'].map(c => <Select.Option key={c} value={c}>Class {c}</Select.Option>)}
                </Select>
              </Col>
              <Col span={5}>
                <div style={{ fontSize: 11, color: '#888' }}>Dị ứng</div>
                <Input size="small" value={anesthesiaPreOp.allergies}
                  onChange={e => setAnesthesiaPreOp(p => ({ ...p, allergies: e.target.value }))} placeholder="Dị ứng thuốc..." />
              </Col>
              <Col span={4}>
                <div style={{ fontSize: 11, color: '#888' }}>NPO (giờ)</div>
                <Input size="small" value={anesthesiaPreOp.npoTime}
                  onChange={e => setAnesthesiaPreOp(p => ({ ...p, npoTime: e.target.value }))} placeholder="8h" />
              </Col>
              <Col span={4}>
                <div style={{ fontSize: 11, color: '#888' }}>Loại gây mê</div>
                <Select size="small" style={{ width: '100%' }} value={anesthesiaPreOp.anesthesiaType}
                  onChange={v => setAnesthesiaPreOp(p => ({ ...p, anesthesiaType: v }))}>
                  <Select.Option value="general">Toàn thân</Select.Option>
                  <Select.Option value="regional">Vùng</Select.Option>
                  <Select.Option value="local">Tại chỗ</Select.Option>
                  <Select.Option value="sedation">An thần</Select.Option>
                </Select>
              </Col>
              <Col span={3}>
                <div style={{ fontSize: 11, color: '#888' }}>Đường thở</div>
                <Input size="small" value={anesthesiaPreOp.airway}
                  onChange={e => setAnesthesiaPreOp(p => ({ ...p, airway: e.target.value }))} placeholder="NKQ, LMA..." />
              </Col>
            </Row>
          </Card>
          <Card size="small" title="Theo dõi sinh hiệu" style={{ marginBottom: 8 }}
            extra={<Button size="small" type="primary" icon={<PlusOutlined />}
              onClick={() => { anesthesiaMonitorForm.resetFields(); anesthesiaMonitorForm.setFieldsValue({ time: dayjs() }); setAnesthesiaModalOpen(true); }}>Thêm</Button>}>
            {anesthesiaEntries.length === 0 ? (
              <Empty description="Chưa có dữ liệu theo dõi" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Table size="small" dataSource={anesthesiaEntries} rowKey="id" pagination={false}
                columns={[
                  { title: 'Thời gian', dataIndex: 'time', key: 'time', width: 120, render: (v: string) => dayjs(v).format('HH:mm') },
                  { title: 'HA', dataIndex: 'bp', key: 'bp', width: 90 },
                  { title: 'Mạch', dataIndex: 'hr', key: 'hr', width: 60 },
                  { title: 'SpO2', dataIndex: 'spo2', key: 'spo2', width: 60 },
                  { title: 'EtCO2', dataIndex: 'etco2', key: 'etco2', width: 60 },
                  { title: 'Nhiệt độ', dataIndex: 'temp', key: 'temp', width: 70, render: (v: number) => v ? `${v}\u00B0C` : '-' },
                  { title: 'Ghi chú', dataIndex: 'notes', key: 'notes', ellipsis: true },
                ]}
              />
            )}
          </Card>
          <Row gutter={8}>
            <Col span={12}>
              <Card size="small" title="Thuốc sử dụng" style={{ marginBottom: 8 }}
                extra={<Button size="small" icon={<PlusOutlined />}
                  onClick={() => { anesthesiaDrugForm.resetFields(); anesthesiaDrugForm.setFieldsValue({ time: dayjs() }); setAnesthesiaDrugModalOpen(true); }}>Thêm</Button>}>
                {anesthesiaDrugs.length === 0 ? (
                  <Empty description="Chưa có" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Table size="small" dataSource={anesthesiaDrugs} rowKey="id" pagination={false}
                    columns={[
                      { title: 'Giờ', dataIndex: 'time', key: 'time', width: 70, render: (v: string) => dayjs(v).format('HH:mm') },
                      { title: 'Thuốc', dataIndex: 'drugName', key: 'drug' },
                      { title: 'Liều', dataIndex: 'dose', key: 'dose', width: 80 },
                      { title: 'Loại', dataIndex: 'category', key: 'cat', width: 90, render: (v: string) => <Tag>{v}</Tag> },
                    ]}
                  />
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="Dịch truyền" style={{ marginBottom: 8 }}
                extra={<Button size="small" icon={<PlusOutlined />}
                  onClick={() => { anesthesiaFluidForm.resetFields(); anesthesiaFluidForm.setFieldsValue({ startTime: dayjs() }); setAnesthesiaFluidModalOpen(true); }}>Thêm</Button>}>
                {anesthesiaFluids.length === 0 ? (
                  <Empty description="Chưa có" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Table size="small" dataSource={anesthesiaFluids} rowKey="id" pagination={false}
                    columns={[
                      { title: 'Loại', dataIndex: 'type', key: 'type' },
                      { title: 'Thể tích', dataIndex: 'volume', key: 'volume', width: 80 },
                      { title: 'Bắt đầu', dataIndex: 'startTime', key: 'time', width: 70, render: (v: string) => dayjs(v).format('HH:mm') },
                    ]}
                  />
                )}
              </Card>
            </Col>
          </Row>
          <Card size="small" title="Ghi chú hồi tỉnh">
            <Input.TextArea rows={2} value={anesthesiaRecovery}
              onChange={e => setAnesthesiaRecovery(e.target.value)}
              placeholder="Tình trạng bệnh nhân sau mổ, thời gian tỉnh, đau, buồn nôn, sinh hiệu ổn định..." />
          </Card>
        </div>
      ),
    },
    {
      key: 'completeness', label: <Badge count={completeness?.missingRequiredDocuments ?? 0} size="small" offset={[8, 0]}><SafetyOutlined /> Kiểm tra BA</Badge>,
      children: (
        <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
          {completeness ? (
            <>
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col span={6}><Card size="small"><Statistic title="Tổng tài liệu" value={completeness.totalDocuments} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="Đã ký" value={completeness.signedDocuments} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="Chưa ký" value={completeness.unsignedDocuments} styles={{ content: { color: '#fa8c16' } }} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="Thiếu" value={completeness.missingRequiredDocuments} styles={{ content: { color: '#ff4d4f' } }} /></Card></Col>
              </Row>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontWeight: 'bold', marginRight: 8 }}>Hoàn thiện:</span>
                <Tag color={completeness.isComplete ? 'green' : 'orange'}>{completeness.completenessPercent}%</Tag>
                {completeness.isFinalized && <Tag color="blue">Đã kết thúc BA</Tag>}
              </div>
              {completeness.missingDocumentNames.length > 0 && (
                <Alert type="warning" showIcon title={`Thiếu ${completeness.missingDocumentNames.length} tài liệu bắt buộc: ${completeness.missingDocumentNames.join(', ')}`} style={{ marginBottom: 12 }} />
              )}
              <Table size="small" dataSource={completeness.items} rowKey="documentType" pagination={false}
                columns={[
                  { title: 'Loại tài liệu', dataIndex: 'documentName', key: 'name' },
                  { title: 'Bắt buộc', dataIndex: 'isRequired', key: 'req', width: 80, render: (v: boolean) => v ? <Tag color="red">Có</Tag> : <Tag>Không</Tag> },
                  { title: 'Tồn tại', dataIndex: 'exists', key: 'exists', width: 80, render: (v: boolean) => v ? <Tag color="green">Có</Tag> : <Tag color="red">Không</Tag> },
                  { title: 'Đã ký', dataIndex: 'isSigned', key: 'signed', width: 80, render: (v: boolean) => v ? <Tag color="green">Đã ký</Tag> : <Tag>Chưa</Tag> },
                  { title: 'Người ký', dataIndex: 'signedByName', key: 'signer', width: 120 },
                ]}
              />
              {!completeness.isFinalized && (
                <div style={{ marginTop: 12 }}>
                  <Popconfirm title="Kết thúc hồ sơ bệnh án?" description="Sau khi kết thúc, hồ sơ sẽ bị khóa không cho chỉnh sửa."
                    onConfirm={async () => {
                      if (!selectedExam?.medicalRecordId) return;
                      const res = await finalizeRecord(selectedExam.medicalRecordId);
                      if (res?.success) { message.success(res.message || 'Đã kết thúc BA'); } else { message.warning(res?.message || 'Không thể kết thúc'); }
                    }}>
                    <Button type="primary" danger icon={<SafetyOutlined />}>Kết thúc bệnh án</Button>
                  </Popconfirm>
                </div>
              )}
            </>
          ) : (
            <Empty description="Chọn hồ sơ để kiểm tra tính hoàn thiện" />
          )}
        </div>
      ),
    },
    {
      key: 'attachments', label: <Badge count={attachments.length} showZero={false} size="small" offset={[8, 0]}><FolderOpenOutlined /> Đính kèm</Badge>,
      children: (
        <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
          <div style={{ marginBottom: 8 }}>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { attachmentForm.resetFields(); setAttachmentModalOpen(true); }}>
              Thêm đính kèm
            </Button>
          </div>
          {attachments.length === 0 ? (
            <Empty description="Chưa có tài liệu đính kèm" />
          ) : (
            <Table size="small" dataSource={attachments} rowKey="id" pagination={false}
              columns={[
                { title: 'Tên file', dataIndex: 'fileName', key: 'name', ellipsis: true },
                { title: 'Loại', dataIndex: 'documentCategory', key: 'cat', width: 100, render: (v: string) => <Tag>{v || 'Khác'}</Tag> },
                { title: 'Kích thước', dataIndex: 'fileSize', key: 'size', width: 100, render: (v: number) => v > 1048576 ? `${(v / 1048576).toFixed(1)} MB` : `${(v / 1024).toFixed(0)} KB` },
                { title: 'Người tải', dataIndex: 'uploadedByName', key: 'uploader', width: 120 },
                { title: 'Ngày', dataIndex: 'uploadedAt', key: 'date', width: 140, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-' },
                { title: '', key: 'del', width: 40,
                  render: (_: unknown, r: EmrDocumentAttachmentDto) => (
                    <Popconfirm title="Xóa đính kèm?" onConfirm={async () => {
                      const ok = await deleteAttachment(r.id);
                      if (ok) { setAttachments(prev => prev.filter(a => a.id !== r.id)); message.success('Đã xóa'); }
                    }}>
                      <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          )}
        </div>
      ),
    },
    {
      key: 'printlogs', label: <><PrinterOutlined /> Nhật ký in</>,
      children: (
        <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
          {printLogs.length === 0 ? (
            <Empty description="Chưa có nhật ký in ấn" />
          ) : (
            <Table size="small" dataSource={printLogs} rowKey="id" pagination={false}
              columns={[
                { title: 'Loại tài liệu', dataIndex: 'documentType', key: 'type', width: 120 },
                { title: 'Tiêu đề', dataIndex: 'documentTitle', key: 'title', ellipsis: true },
                { title: 'Người in', dataIndex: 'printedByName', key: 'printer', width: 120 },
                { title: 'Lần in', dataIndex: 'printCount', key: 'count', width: 60, render: (v: number) => <Badge count={v} showZero style={{ backgroundColor: v > 1 ? '#fa8c16' : '#52c41a' }} /> },
                { title: 'Ngày in', dataIndex: 'printedAt', key: 'date', width: 140, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-' },
                { title: 'Đóng dấu', dataIndex: 'isStamped', key: 'stamp', width: 100,
                  render: (v: boolean, r: EmrPrintLogDto) => v
                    ? <Tag color="green">Đã đóng dấu</Tag>
                    : <Button size="small" onClick={async () => {
                        const ok = await stampPrintLog(r.id);
                        if (ok) { setPrintLogs(prev => prev.map(p => p.id === r.id ? { ...p, isStamped: true, stampedAt: new Date().toISOString() } : p)); message.success('Đã đóng dấu'); }
                      }}>Đóng dấu</Button>
                },
              ]}
            />
          )}
        </div>
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
              <Space wrap size={4}>
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
                    { key: 'obstetrics', label: 'MS.18 - BA Sản khoa' },
                    { key: 'neonatal', label: 'MS.19 - BA Sơ sinh' },
                    { key: 'pediatric', label: 'MS.20 - BA Nhi khoa' },
                  ]},
                  { type: 'group', label: 'CĐHA (CDHA. 01-05)', children: [
                    { key: 'cdha-xray', label: 'CDHA.01 - X-Quang' },
                    { key: 'cdha-ct', label: 'CDHA.02 - CT Scanner' },
                    { key: 'cdha-mri', label: 'CDHA.03 - MRI' },
                    { key: 'cdha-ultrasound', label: 'CDHA.04 - Siêu âm' },
                    { key: 'cdha-ecg', label: 'CDHA.05 - Điện tâm đồ' },
                  ]},
                  { type: 'group', label: 'TDCN/XN/LS', children: [
                    { key: 'tdcn-eeg', label: 'TDCN.01 - Điện não đồ' },
                    { key: 'tdcn-endoscopy', label: 'TDCN.02 - Nội soi' },
                    { key: 'tdcn-pft', label: 'TDCN.03 - Chức năng hô hấp' },
                    { key: 'xn-general', label: 'XN.01 - Phiếu XN tổng quát' },
                    { key: 'xn-hematology', label: 'XN.02 - Huyết học' },
                    { key: 'xn-biochemistry', label: 'XN.03 - Sinh hóa' },
                    { key: 'xn-microbiology', label: 'XN.04 - Vi sinh' },
                    { key: 'ls-allergy', label: 'LS.01 - Ghi nhận dị ứng' },
                    { key: 'ls-postop', label: 'LS.02 - Theo dõi sau PT' },
                    { key: 'ls-icuinfo', label: 'LS.03 - Thông tin ICU' },
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
                  { type: 'divider' as const },
                  { key: 'specialty-grp', label: 'BA Chuyên khoa (TT32)', type: 'group' as const, children: [
                    { key: 'sp-noikhoa', label: 'MS.01 - Nội khoa' },
                    { key: 'sp-truyennhiem', label: 'MS.03 - Truyền nhiễm' },
                    { key: 'sp-phukhoa', label: 'MS.04 - Phụ khoa' },
                    { key: 'sp-tamthan', label: 'MS.07 - Tâm thần' },
                    { key: 'sp-dalieu', label: 'MS.08 - Da liễu' },
                    { key: 'sp-huyethoc', label: 'MS.09 - Huyết học' },
                    { key: 'sp-ngoaikhoa', label: 'MS.10 - Ngoại khoa' },
                    { key: 'sp-bong', label: 'MS.11 - Bỏng' },
                    { key: 'sp-ungbuou', label: 'MS.12 - Ung bướu' },
                    { key: 'sp-rhm', label: 'MS.13 - Răng Hàm Mặt' },
                    { key: 'sp-tmh', label: 'MS.14 - Tai Mũi Họng' },
                    { key: 'sp-ngoaitru', label: 'MS.15 - Ngoại trú chung' },
                    { key: 'sp-ngoaitrurhm', label: 'MS.16 - Ngoại trú RHM' },
                    { key: 'sp-tuyenxa', label: 'MS.17 - Tuyến xã/phường' },
                    { key: 'sp-yhctnoidru', label: 'MS.18 - YHCT nội trú' },
                    { key: 'sp-yhctngoaitru', label: 'MS.19 - YHCT ngoại trú' },
                    { key: 'sp-nhiyhct', label: 'MS.20 - Nhi YHCT' },
                  ]},
                  { key: 'eye-grp', label: 'BA Mắt', type: 'group' as const, children: [
                    { key: 'sp-matchanthuong', label: 'MS.21 - Mắt chấn thương' },
                    { key: 'sp-matbantruoc', label: 'MS.22 - Mắt bán phần trước' },
                    { key: 'sp-matdaymat', label: 'MS.23 - Mắt đáy mắt' },
                    { key: 'sp-matglocom', label: 'MS.24 - Mắt Glocom' },
                    { key: 'sp-matlac', label: 'MS.25 - Mắt Lác' },
                    { key: 'sp-mattreem', label: 'MS.26 - Mắt trẻ em' },
                  ]},
                  { key: 'rehab-grp', label: 'BA PHCN', type: 'group' as const, children: [
                    { key: 'sp-phcn', label: 'MS.27 - PHCN' },
                    { key: 'sp-phcnnhi', label: 'MS.28 - PHCN Nhi' },
                    { key: 'sp-phcnngoaitru', label: 'MS.29 - PHCN ngoại trú' },
                  ]},
                  { key: 'cert-grp', label: 'Giấy CN / Phiếu', type: 'group' as const, children: [
                    { key: 'sp-giaykhamsuckhoe', label: 'MS.03 - Khám theo yêu cầu' },
                    { key: 'sp-phieuchuyenkhoa', label: 'MS.04 - Khám chuyên khoa' },
                    { key: 'sp-chamsoccap1', label: 'MS.37 - Chăm sóc cấp 1' },
                    { key: 'sp-chamsoccap2', label: 'MS.38 - Chăm sóc cấp 2' },
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
                  { key: 'obstetrics', label: 'MS.18 - BA Sản khoa' },
                  { key: 'neonatal', label: 'MS.19 - BA Sơ sinh' },
                  { key: 'pediatric', label: 'MS.20 - BA Nhi khoa' },
                ], onClick: ({ key }) => { if (selectedExam) printEmrForm(selectedExam.id, key); } }}>
                  <Button size="small" icon={<FilePdfOutlined />} type="primary" ghost>In PDF</Button>
                </Dropdown>
                <Tooltip title="Xuất XML (CDA R2)">
                  <Button size="small" icon={<FileTextOutlined />} onClick={handleExportXml}>Xuất HSBA</Button>
                </Tooltip>
                <Tooltip title="Xuất PDF">
                  <Button size="small" icon={<DownloadOutlined />} onClick={handleExportPdf}>PDF</Button>
                </Tooltip>
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
              <>
                {/* Digital signature stamp - hiển thị khi hồ sơ đã ký */}
                {selectedExam && signatureMap.has(selectedExam.id) && (() => {
                  const sig = signatureMap.get(selectedExam.id);
                  if (!sig) return null;
                  const orgName = sig.organizationName || sig.signerName;
                  return (
                    <div
                      onClick={() => { setSelectedSignature(sig); setVerificationPanelOpen(true); }}
                      style={{
                        border: '2px solid #4caf50',
                        borderRadius: 6,
                        padding: '10px 16px',
                        marginBottom: 12,
                        background: '#f6ffed',
                        fontFamily: "'Times New Roman', serif",
                        position: 'relative',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: -10, right: -6,
                      }}>
                        <CheckCircleOutlined style={{ fontSize: 28, color: '#4caf50', background: '#fff', borderRadius: '50%' }} />
                      </div>
                      <div style={{ fontWeight: 'bold', fontStyle: 'italic', color: '#333', marginBottom: 4, fontSize: 13 }}>Signature Valid</div>
                      {orgName && (
                        <div style={{ paddingLeft: 12, fontSize: 13, color: '#cf1322' }}>
                          Ký bởi: {orgName}
                        </div>
                      )}
                      <div style={{ paddingLeft: 12, fontSize: 13, color: '#cf1322' }}>Ký ngày: {sig.signedAt}</div>
                    </div>
                  );
                })()}
                <Tabs activeKey={detailTab} onChange={setDetailTab} items={detailTabs} size="small" />
              </>
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
          <Form.Item name="dailyProgress" label={<span>Diễn biến bệnh <VoiceDictation onTranscript={(text) => {
            const prev = treatmentForm.getFieldValue('dailyProgress') || '';
            treatmentForm.setFieldValue('dailyProgress', prev ? `${prev} ${text}` : text);
          }} /></span>}>
            <TextArea rows={3} placeholder="Ghi nhận diễn biến bệnh trong ngày..." />
          </Form.Item>
          <Form.Item name="treatmentOrders" label={<span>Y lệnh điều trị <VoiceDictation onTranscript={(text) => {
            const prev = treatmentForm.getFieldValue('treatmentOrders') || '';
            treatmentForm.setFieldValue('treatmentOrders', prev ? `${prev} ${text}` : text);
          }} /></span>}>
            <TextArea rows={3} placeholder="Các y lệnh điều trị..." />
          </Form.Item>
          <Form.Item name="doctorNotes" label={<span>Ghi chú bác sĩ <VoiceDictation onTranscript={(text) => {
            const prev = treatmentForm.getFieldValue('doctorNotes') || '';
            treatmentForm.setFieldValue('doctorNotes', prev ? `${prev} ${text}` : text);
          }} /></span>}>
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
          obstetrics: 'Bệnh án Sản khoa (MS.18)', neonatal: 'Bệnh án Sơ sinh (MS.19)', pediatric: 'Bệnh án Nhi khoa (MS.20)',
          'cdha-xray': 'Kết quả X-Quang (CDHA.01)', 'cdha-ct': 'Kết quả CT Scanner (CDHA.02)',
          'cdha-mri': 'Kết quả MRI (CDHA.03)', 'cdha-ultrasound': 'Kết quả Siêu âm (CDHA.04)',
          'cdha-ecg': 'Điện tâm đồ (CDHA.05)',
          'tdcn-eeg': 'Điện não đồ (TDCN.01)', 'tdcn-endoscopy': 'Nội soi (TDCN.02)',
          'tdcn-pft': 'Chức năng hô hấp (TDCN.03)',
          'xn-general': 'Phiếu XN tổng quát (XN.01)', 'xn-hematology': 'Huyết học (XN.02)',
          'xn-biochemistry': 'Sinh hóa (XN.03)', 'xn-microbiology': 'Vi sinh (XN.04)',
          'ls-allergy': 'Ghi nhận dị ứng (LS.01)', 'ls-postop': 'Theo dõi sau PT (LS.02)',
          'ls-icuinfo': 'Thông tin ICU (LS.03)',
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
          'sp-noikhoa': 'BA Nội khoa (MS.01)', 'sp-truyennhiem': 'BA Truyền nhiễm (MS.03)',
          'sp-phukhoa': 'BA Phụ khoa (MS.04)', 'sp-tamthan': 'BA Tâm thần (MS.07)',
          'sp-dalieu': 'BA Da liễu (MS.08)', 'sp-huyethoc': 'BA Huyết học (MS.09)',
          'sp-ngoaikhoa': 'BA Ngoại khoa (MS.10)', 'sp-bong': 'BA Bỏng (MS.11)',
          'sp-ungbuou': 'BA Ung bướu (MS.12)', 'sp-rhm': 'BA RHM (MS.13)',
          'sp-tmh': 'BA TMH (MS.14)', 'sp-ngoaitru': 'BA Ngoại trú (MS.15)',
          'sp-ngoaitrurhm': 'BA Ngoại trú RHM (MS.16)', 'sp-tuyenxa': 'BA Tuyến xã (MS.17)',
          'sp-yhctnoidru': 'BA YHCT nội trú (MS.18)', 'sp-yhctngoaitru': 'BA YHCT ngoại trú (MS.19)',
          'sp-nhiyhct': 'BA Nhi YHCT (MS.20)',
          'sp-matchanthuong': 'BA Mắt chấn thương (MS.21)', 'sp-matbantruoc': 'BA Mắt bán phần trước (MS.22)',
          'sp-matdaymat': 'BA Mắt đáy mắt (MS.23)', 'sp-matglocom': 'BA Mắt Glocom (MS.24)',
          'sp-matlac': 'BA Mắt Lác (MS.25)', 'sp-mattreem': 'BA Mắt trẻ em (MS.26)',
          'sp-phcn': 'BA PHCN (MS.27)', 'sp-phcnnhi': 'BA PHCN Nhi (MS.28)',
          'sp-phcnngoaitru': 'BA PHCN ngoại trú (MS.29)',
          'sp-giaykhamsuckhoe': 'Khám theo yêu cầu (MS.03)', 'sp-phieuchuyenkhoa': 'Khám chuyên khoa (MS.04)',
          'sp-chamsoccap1': 'Chăm sóc cấp 1 (MS.37)', 'sp-chamsoccap2': 'Chăm sóc cấp 2 (MS.38)',
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
          {printType === 'obstetrics' && <ObstetricsMedicalRecordPrint ref={printRef} record={medicalRecord} />}
          {printType === 'neonatal' && <NeonatalMedicalRecordPrint ref={printRef} record={medicalRecord} />}
          {printType === 'pediatric' && <PediatricMedicalRecordPrint ref={printRef} record={medicalRecord} />}
          {/* CDHA. 01-05 Radiology forms */}
          {printType === 'cdha-xray' && <XRayReportPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {printType === 'cdha-ct' && <CTScanReportPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {printType === 'cdha-mri' && <MRIReportPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {printType === 'cdha-ultrasound' && <UltrasoundReportPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {printType === 'cdha-ecg' && <ECGReportPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {/* TDCN/XN/LS forms */}
          {printType === 'tdcn-eeg' && <EEGReportPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {printType === 'tdcn-endoscopy' && <EndoscopyReportPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {printType === 'tdcn-pft' && <PFTReportPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {printType === 'xn-general' && <GeneralLabReportPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {printType === 'xn-hematology' && <HematologyReportPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {printType === 'xn-biochemistry' && <BiochemistryReportPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {printType === 'xn-microbiology' && <MicrobiologyReportPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {printType === 'ls-allergy' && <AllergyFormPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {printType === 'ls-postop' && <PostOpNotePrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
          {printType === 'ls-icuinfo' && <ICUInfoSheetPrint record={medicalRecord as unknown as Record<string, unknown> | undefined} />}
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
          {/* Specialty Medical Record forms (TT32/2023) */}
          {printType === 'sp-noikhoa' && <InternalMedicineMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-truyennhiem' && <InfectiousDiseaseMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-phukhoa' && <GynecologyMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-tamthan' && <PsychiatryMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-dalieu' && <DermatologyMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-huyethoc' && <HematologyMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-ngoaikhoa' && <SurgicalMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-bong' && <BurnsMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-ungbuou' && <OncologyMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-rhm' && <DentalMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-tmh' && <ENTMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-ngoaitru' && <OutpatientGeneralMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-ngoaitrurhm' && <OutpatientDentalMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-tuyenxa' && <CommuneHealthMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-yhctnoidru' && <TraditionalMedInpatientMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-yhctngoaitru' && <TraditionalMedOutpatientMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-nhiyhct' && <PediatricTCMMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-matchanthuong' && <EyeTraumaMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-matbantruoc' && <EyeAnteriorMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-matdaymat' && <EyePosteriorMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-matglocom' && <EyeGlaucomaMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-matlac' && <EyeStrabismusMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-mattreem' && <PediatricEyeMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-phcn' && <RehabilitationMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-phcnnhi' && <PediatricRehabMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-phcnngoaitru' && <OutpatientRehabMRPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-giaykhamsuckhoe' && <OnDemandExamPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-phieuchuyenkhoa' && <SpecialtyExamPrint ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-chamsoccap1' && <NursingCareLevel1Print ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
          {printType === 'sp-chamsoccap2' && <NursingCareLevel2Print ref={printRef} data={medicalRecord as unknown as Record<string, any>} />}
        </div>
      </Drawer>

      {/* Attachment Modal */}
      <Modal
        title="Thêm đính kèm"
        open={attachmentModalOpen}
        onOk={async () => {
          try {
            const values = await attachmentForm.validateFields();
            if (!selectedExam?.medicalRecordId) { message.warning('Chưa có hồ sơ bệnh án'); return; }
            const res = await saveAttachment({
              medicalRecordId: selectedExam.medicalRecordId,
              fileName: values.fileName, fileType: values.fileType || 'application/octet-stream',
              fileSize: values.fileSize || 0, filePath: values.filePath || `/uploads/${values.fileName}`,
              documentCategory: values.documentCategory, description: values.description,
            });
            if (res) { setAttachments(prev => [res, ...prev]); setAttachmentModalOpen(false); message.success('Đã lưu đính kèm'); }
          } catch { /* validation */ }
        }}
        onCancel={() => setAttachmentModalOpen(false)}
        width={500}
      >
        <Form form={attachmentForm} layout="vertical">
          <Form.Item name="fileName" label="Tên file" rules={[{ required: true, message: 'Nhập tên file' }]}>
            <Input placeholder="vd: ket-qua-xn-01.pdf" />
          </Form.Item>
          <Form.Item name="documentCategory" label="Phân loại">
            <Select placeholder="Chọn loại" allowClear>
              <Select.Option value="XN">Xét nghiệm</Select.Option>
              <Select.Option value="CDHA">Chẩn đoán hình ảnh</Select.Option>
              <Select.Option value="BenhAn">Bệnh án</Select.Option>
              <Select.Option value="GiayTo">Giấy tờ</Select.Option>
              <Select.Option value="Khac">Khác</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả tài liệu đính kèm..." />
          </Form.Item>
          <Form.Item name="filePath" label="Đường dẫn file">
            <Input placeholder="/uploads/..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Drug Reaction Test Modal */}
      <Modal
        title="Thêm phiếu thử phản ứng thuốc"
        open={drugReactionModalOpen}
        onOk={handleSaveDrugReaction}
        onCancel={() => setDrugReactionModalOpen(false)}
        width={700}
        destroyOnHidden
      >
        <Form form={drugReactionForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="drugName" label="Tên thuốc" rules={[{ required: true, message: 'Vui lòng nhập tên thuốc' }]}>
                <Input placeholder="Tên thuốc thử" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="dose" label="Liều">
                <Input placeholder="0.1ml" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="route" label="Đường dùng">
                <Select placeholder="Chọn">
                  <Select.Option value="Tiêm trong da">Tiêm trong da</Select.Option>
                  <Select.Option value="Tiêm dưới da">Tiêm dưới da</Select.Option>
                  <Select.Option value="Nhỏ mắt">Nhỏ mắt</Select.Option>
                  <Select.Option value="Uống">Uống</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="testDate" label="Ngày thử">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="testTime" label="Giờ thử">
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="result" label="Kết quả" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="Negative">Âm tính</Select.Option>
                  <Select.Option value="Positive">Dương tính</Select.Option>
                  <Select.Option value="Inconclusive">Không xác định</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reactionDescription" label="Mô tả phản ứng">
            <Input.TextArea rows={2} placeholder="Mô tả phản ứng nếu có (mẩn đỏ, sưng, ngứa...)" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tester" label="Người thử">
                <Input placeholder="Tên ĐD/BS thực hiện" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="notes" label="Ghi chú">
                <Input placeholder="Ghi chú thêm" />
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ margin: '8px 0' }} />
          <Form.Item>
            <Space>
              <input type="checkbox" checked={drugReactionCopyRange} onChange={e => setDrugReactionCopyRange(e.target.checked)} />
              <span>Sao chép nhiều ngày</span>
            </Space>
          </Form.Item>
          {drugReactionCopyRange && (
            <Form.Item name="copyDateRange" label="Khoảng ngày sao chép">
              <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Partograph Modal */}
      <Modal
        title="Thêm dữ liệu biểu đồ chuyển dạ"
        open={partographModalOpen}
        onOk={handleSavePartograph}
        onCancel={() => setPartographModalOpen(false)}
        width={700}
        destroyOnHidden
      >
        <Form form={partographForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="entryTime" label="Thời gian" rules={[{ required: true }]}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="cervicalDilation" label="Độ mở CTC (cm)" rules={[{ required: true }]}>
                <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="descent" label="Ngôi (station)">
                <Select placeholder="Chọn">
                  {['-3', '-2', '-1', '0', '+1', '+2', '+3'].map(s => (
                    <Select.Option key={s} value={s}>{s}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="contractionFreq" label="Cơn co (lần/10p)">
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="contractionDuration" label="TG co (giây)">
                <InputNumber min={0} max={120} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fhr" label="Tim thai (lần/p)" rules={[{ required: true }]}>
                <InputNumber min={60} max={220} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="maternalTemp" label="Nhiệt độ mẹ">
                <InputNumber min={35} max={42} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="systolicBP" label="HA tâm thu">
                <InputNumber min={60} max={250} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="diastolicBP" label="HA tâm trương">
                <InputNumber min={30} max={150} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maternalPulse" label="Mạch mẹ">
                <InputNumber min={40} max={200} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Anesthesia Monitor Modal */}
      <Modal
        title="Thêm sinh hiệu gây mê"
        open={anesthesiaModalOpen}
        onOk={async () => {
          try {
            const v = await anesthesiaMonitorForm.validateFields();
            setAnesthesiaEntries(prev => [...prev, {
              id: nextClientId('am'),
              time: v.time?.format('YYYY-MM-DD HH:mm') || dayjs().format('YYYY-MM-DD HH:mm'),
              bp: `${v.systolicBP ?? ''}/${v.diastolicBP ?? ''}`,
              hr: v.hr ?? 0,
              spo2: v.spo2 ?? 0,
              etco2: v.etco2 ?? 0,
              temp: v.temp ?? 0,
              notes: v.notes || '',
            }]);
            setAnesthesiaModalOpen(false);
          } catch { /* validation */ }
        }}
        onCancel={() => setAnesthesiaModalOpen(false)}
        destroyOnHidden
      >
        <Form form={anesthesiaMonitorForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}><Form.Item name="time" label="Thời gian" rules={[{ required: true }]}><DatePicker showTime format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="systolicBP" label="HA tâm thu"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="diastolicBP" label="HA tâm trương"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="hr" label="Mạch"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="spo2" label="SpO2"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="etco2" label="EtCO2"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="temp" label="Nhiệt độ"><InputNumber step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Ghi chú"><Input placeholder="Ghi chú..." /></Form.Item>
        </Form>
      </Modal>

      {/* Anesthesia Drug Modal */}
      <Modal
        title="Thêm thuốc gây mê"
        open={anesthesiaDrugModalOpen}
        onOk={async () => {
          try {
            const v = await anesthesiaDrugForm.validateFields();
            setAnesthesiaDrugs(prev => [...prev, {
              id: nextClientId('ad'),
              time: v.time?.format('YYYY-MM-DD HH:mm') || dayjs().format('YYYY-MM-DD HH:mm'),
              drugName: v.drugName,
              dose: v.dose || '',
              route: v.route || '',
              category: v.category || '',
            }]);
            setAnesthesiaDrugModalOpen(false);
          } catch { /* validation */ }
        }}
        onCancel={() => setAnesthesiaDrugModalOpen(false)}
        destroyOnHidden
      >
        <Form form={anesthesiaDrugForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}><Form.Item name="time" label="Giờ"><DatePicker showTime format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={16}><Form.Item name="drugName" label="Tên thuốc" rules={[{ required: true }]}><Input placeholder="Propofol, Fentanyl..." /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="dose" label="Liều"><Input placeholder="200mg" /></Form.Item></Col>
            <Col span={8}><Form.Item name="route" label="Đường dùng"><Input placeholder="IV, IM..." /></Form.Item></Col>
            <Col span={8}>
              <Form.Item name="category" label="Phân loại">
                <Select placeholder="Chọn">
                  <Select.Option value="Khởi mê">Khởi mê</Select.Option>
                  <Select.Option value="Duy trì">Duy trì</Select.Option>
                  <Select.Option value="Hỗ trợ">Hỗ trợ</Select.Option>
                  <Select.Option value="Giảm đau">Giảm đau</Select.Option>
                  <Select.Option value="Giãn cơ">Giãn cơ</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Anesthesia Fluid Modal */}
      <Modal
        title="Thêm dịch truyền"
        open={anesthesiaFluidModalOpen}
        onOk={async () => {
          try {
            const v = await anesthesiaFluidForm.validateFields();
            setAnesthesiaFluids(prev => [...prev, {
              id: nextClientId('af'),
              type: v.fluidType,
              volume: v.volume || '',
              startTime: v.startTime?.format('YYYY-MM-DD HH:mm') || dayjs().format('YYYY-MM-DD HH:mm'),
            }]);
            setAnesthesiaFluidModalOpen(false);
          } catch { /* validation */ }
        }}
        onCancel={() => setAnesthesiaFluidModalOpen(false)}
        destroyOnHidden
      >
        <Form form={anesthesiaFluidForm} layout="vertical">
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="fluidType" label="Loại dịch" rules={[{ required: true }]}>
                <Select placeholder="Chọn">
                  <Select.Option value="NaCl 0.9%">NaCl 0.9%</Select.Option>
                  <Select.Option value="Ringer Lactate">Ringer Lactate</Select.Option>
                  <Select.Option value="Glucose 5%">Glucose 5%</Select.Option>
                  <Select.Option value="Gelofusine">Gelofusine</Select.Option>
                  <Select.Option value="Albumin">Albumin</Select.Option>
                  <Select.Option value="HCL">Hồng cầu lắng</Select.Option>
                  <Select.Option value="FFP">Huyết tương tươi</Select.Option>
                  <Select.Option value="Tiểu cầu">Tiểu cầu</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={7}><Form.Item name="volume" label="Thể tích (ml)"><Input placeholder="500ml" /></Form.Item></Col>
            <Col span={7}><Form.Item name="startTime" label="Bắt đầu"><DatePicker showTime format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

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
