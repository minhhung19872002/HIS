/* eslint-disable @typescript-eslint/no-explicit-any */
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
  InputNumber,
  Switch,
  Popconfirm,
  Tooltip,
  Spin,
  Drawer,
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
  SafetyCertificateOutlined,
  BarChartOutlined,
  SettingOutlined,
  TeamOutlined,
  HistoryOutlined,
  MessageOutlined,
  SaveOutlined,
  DeleteOutlined,
  SendOutlined,
  DownOutlined,
  UpOutlined,
  ControlOutlined,
  BulbOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  EditOutlined,
  PlusOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import risApi from '../api/ris';
import type {
  USBTokenCertificate,
  PdfGenerateSignRequest,
  RadiologyTagDto,
  DutyScheduleDto,
  IntegrationLogDto,
  RadiologyLabelConfigDto,
  RadiologyWaitingListDto,
  RadiologyResultTemplateDto,
  RisChatMessageDto,
} from '../api/ris';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../constants/hospital';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
    };
  };
  errorFields?: unknown;
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || fallback;
  }
  return fallback;
};

const isFormValidationError = (error: unknown): error is ApiErrorLike =>
  typeof error === 'object' && error !== null && 'errorFields' in error;
void getApiErrorMessage;
void isFormValidationError;
const radiologyLabelConfigDtoMarker = null as unknown as RadiologyLabelConfigDto | null;
void radiologyLabelConfigDtoMarker;

type RadiologyWaitingListItem = RadiologyWaitingListDto & {
  id?: string;
  requestCode?: string;
  contrast?: boolean;
  priority?: string | number;
  requestDate?: string;
  scheduledDate?: string;
  statusCode?: number;
  doctorName?: string;
  modalityName?: string;
  studyInstanceUID?: string;
  hasImages?: boolean;
  gender?: string | number;
};

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
  const [modalityFilter, setModalityFilter] = useState<string | undefined>(undefined);
  // Statistics tab state
  const [statsDateRange, setStatsDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [statsData, setStatsData] = useState<{ totalExams: number; completedExams: number; pendingExams: number; averageTATMinutes: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  // Tags tab state
  const [tagsData, setTagsData] = useState<RadiologyTagDto[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagForm] = Form.useForm();
  // Duty Schedule tab state
  const [dutyDateRange, setDutyDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [dutyRoomId, setDutyRoomId] = useState<string | undefined>(undefined);
  const [dutySchedules, setDutySchedules] = useState<DutyScheduleDto[]>([]);
  const [dutyLoading, setDutyLoading] = useState(false);
  // Integration Logs tab state
  const [logDateRange, setLogDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [logMessageType, setLogMessageType] = useState<string | undefined>(undefined);
  const [logStatus, setLogStatus] = useState<string | undefined>(undefined);
  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLogDto[]>([]);
  const [integrationLogStats, setIntegrationLogStats] = useState<{ totalMessages: number; successCount: number; failedCount: number; averageResponseTimeMs: number } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // ===== Feature: Dark/Light Theme Toggle (NangCap15) =====
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem('ris-dark-mode') === 'true'; } catch { return false; }
  });
  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    try { localStorage.setItem('ris-dark-mode', String(next)); } catch { /* ignore */ }
  };

  // ===== Feature: Result Template Management (NangCap15) =====
  const [resultTemplates, setResultTemplates] = useState<RadiologyResultTemplateDto[]>([]);
  const [resultTemplatesLoading, setResultTemplatesLoading] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RadiologyResultTemplateDto | null>(null);
  const [templateForm] = Form.useForm();

  const loadResultTemplates = async () => {
    setResultTemplatesLoading(true);
    try {
      const response = await risApi.getAllResultTemplates();
      if (response.data) setResultTemplates(response.data);
    } catch (error) {
      console.warn('Error loading result templates:', error);
      message.warning('Khong the tai mau ket qua');
    } finally {
      setResultTemplatesLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const values = await templateForm.validateFields();
      await risApi.saveResultTemplate({
        id: editingTemplate?.id,
        code: values.code,
        name: values.name,
        serviceTypeId: values.serviceTypeId,
        serviceId: values.serviceId,
        gender: values.gender,
        descriptionTemplate: values.descriptionTemplate,
        conclusionTemplate: values.conclusionTemplate,
        noteTemplate: values.noteTemplate,
        sortOrder: values.sortOrder || 0,
        isDefault: values.isDefault || false,
        isActive: values.isActive !== false,
      });
      message.success(editingTemplate ? 'Da cap nhat mau ket qua' : 'Da tao mau ket qua moi');
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
      templateForm.resetFields();
      loadResultTemplates();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.warn('Save template error:', error);
      message.warning(error?.response?.data?.message || 'Khong the luu mau ket qua');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await risApi.deleteResultTemplate(templateId);
      message.success('Da xoa mau ket qua');
      loadResultTemplates();
    } catch (error: any) {
      console.warn('Delete template error:', error);
      message.warning(error?.response?.data?.message || 'Khong the xoa mau ket qua');
    }
  };

  // ===== Feature: DICOM Export (NangCap15) =====
  const [dicomExportLoading, setDicomExportLoading] = useState<string | null>(null);

  const handleExportDicom = async (studyInstanceUID: string, requestCode: string) => {
    if (!studyInstanceUID) {
      message.warning('Khong co Study Instance UID de xuat DICOM');
      return;
    }
    setDicomExportLoading(studyInstanceUID);
    try {
      const response = await risApi.exportDicomStudy({
        studyInstanceUID,
        includeAllSeries: true,
        anonymize: false,
      });
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DICOM-${requestCode || studyInstanceUID}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Da xuat file DICOM thanh cong');
    } catch (error: any) {
      console.warn('DICOM export error:', error);
      message.warning(error?.response?.data?.message || 'Khong the xuat file DICOM');
    } finally {
      setDicomExportLoading(null);
    }
  };

  // ===== Feature: DICOM Send to Remote PACS (NangCap15) =====
  const [dicomSendLoading, setDicomSendLoading] = useState<string | null>(null);
  const [remoteServerDrawerOpen, setRemoteServerDrawerOpen] = useState(false);
  const [remoteServers, setRemoteServers] = useState<any[]>([]);
  const [remoteServerLoading, setRemoteServerLoading] = useState(false);
  const [remoteServerModalOpen, setRemoteServerModalOpen] = useState(false);
  const [editingRemoteServer, setEditingRemoteServer] = useState<any>(null);
  const [remoteServerForm] = Form.useForm();

  const fetchRemoteServers = async () => {
    setRemoteServerLoading(true);
    try {
      const response = await risApi.getRemoteServers();
      setRemoteServers(response.data || []);
    } catch (error: any) {
      console.warn('Fetch remote servers error:', error);
      message.warning(error?.response?.data?.message || 'Khong the tai danh sach Remote PACS');
    } finally {
      setRemoteServerLoading(false);
    }
  };

  const handleSendDicomToRemote = async (studyId: string, studyInstanceUID: string) => {
    if (!studyInstanceUID) {
      message.warning('Khong co Study Instance UID de gui DICOM');
      return;
    }
    // Fetch servers if not loaded
    let servers = remoteServers;
    if (servers.length === 0) {
      try {
        const resp = await risApi.getRemoteServers();
        servers = resp.data || [];
        setRemoteServers(servers);
      } catch {
        // ignore
      }
    }
    if (servers.length === 0) {
      message.warning('Chua co Remote PACS server nao. Vui long cau hinh truoc.');
      setRemoteServerDrawerOpen(true);
      fetchRemoteServers();
      return;
    }
    const activeServers = servers.filter((s: any) => s.isActive !== false);
    if (activeServers.length === 0) {
      message.warning('Khong co Remote PACS server nao dang hoat dong.');
      return;
    }
    // If only one active server, send directly
    if (activeServers.length === 1) {
      setDicomSendLoading(studyInstanceUID);
      try {
        await risApi.sendDicomToRemote({ studyId, remoteServerId: activeServers[0].id });
        message.success(`Da gui DICOM den ${activeServers[0].name} thanh cong`);
      } catch (error: any) {
        console.warn('DICOM send error:', error);
        message.warning(error?.response?.data?.message || 'Khong the gui DICOM den Remote PACS');
      } finally {
        setDicomSendLoading(null);
      }
      return;
    }
    // Multiple servers - show selection dialog
    Modal.confirm({
      title: 'Chon Remote PACS de gui',
      width: 400,
      content: (
        <Select
          style={{ width: '100%', marginTop: 12 }}
          placeholder="Chon PACS server"
          id="remote-pacs-select"
          options={activeServers.map((s: any) => ({ label: `${s.name} (${s.aeTitle}@${s.host}:${s.port})`, value: s.id }))}
        />
      ),
      onOk: async () => {
        const selectEl = document.getElementById('remote-pacs-select') as any;
        const selectedId = selectEl?._value || activeServers[0].id;
        setDicomSendLoading(studyInstanceUID);
        try {
          await risApi.sendDicomToRemote({ studyId, remoteServerId: selectedId });
          const serverName = activeServers.find((s: any) => s.id === selectedId)?.name || 'Remote PACS';
          message.success(`Da gui DICOM den ${serverName} thanh cong`);
        } catch (error: any) {
          console.warn('DICOM send error:', error);
          message.warning(error?.response?.data?.message || 'Khong the gui DICOM den Remote PACS');
        } finally {
          setDicomSendLoading(null);
        }
      },
    });
  };

  const handleSaveRemoteServer = async () => {
    try {
      const values = await remoteServerForm.validateFields();
      const data = editingRemoteServer ? { ...values, id: editingRemoteServer.id } : values;
      await risApi.saveRemoteServer(data);
      message.success(editingRemoteServer ? 'Da cap nhat Remote PACS server' : 'Da them Remote PACS server');
      setRemoteServerModalOpen(false);
      setEditingRemoteServer(null);
      remoteServerForm.resetFields();
      fetchRemoteServers();
    } catch (error: any) {
      if (error?.errorFields) return; // form validation error
      console.warn('Save remote server error:', error);
      message.warning(error?.response?.data?.message || 'Khong the luu Remote PACS server');
    }
  };

  const handleDeleteRemoteServer = async (id: string) => {
    try {
      await risApi.deleteRemoteServer(id);
      message.success('Da xoa Remote PACS server');
      fetchRemoteServers();
    } catch (error: any) {
      console.warn('Delete remote server error:', error);
      message.warning(error?.response?.data?.message || 'Khong the xoa Remote PACS server');
    }
  };

  // ===== Feature: RIS Internal Chat - Enhanced with API (NangCap15) =====
  interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: string;
    studyRef?: string;
  }
  const [chatOpen, setChatOpen] = useState(false);
  const [chatCaseId, setChatCaseId] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStudyRef, setChatStudyRef] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Load chat messages for a case from API
  const loadChatMessages = async (caseId: string) => {
    if (!caseId) return;
    setChatLoading(true);
    try {
      const response = await risApi.getCaseMessages(caseId);
      if (response.data) {
        setChatMessages(response.data.map((m: RisChatMessageDto) => ({
          id: m.id,
          sender: m.senderName,
          text: m.message,
          timestamp: m.timestamp,
          studyRef: m.studyRef,
        })));
      }
    } catch {
      // API not available, keep local messages
    } finally {
      setChatLoading(false);
    }
  };

  // Open chat for a specific case/request
  const openChatForCase = (caseId: string) => {
    setChatCaseId(caseId);
    setChatOpen(true);
    loadChatMessages(caseId);
  };

  // Send chat message via API with local fallback
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: user.fullName || user.username || 'Unknown',
      text: chatInput.trim(),
      timestamp: new Date().toISOString(),
      studyRef: chatStudyRef || undefined,
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    // Persist via API (fire and forget)
    try {
      await risApi.sendCaseMessage({
        caseId: chatCaseId || 'general',
        message: newMsg.text,
        studyRef: newMsg.studyRef,
      });
    } catch { /* API not available, message stays local */ }
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // ===== Feature: Saved Filter Presets (1.18) =====
  interface FilterPreset {
    name: string;
    searchText: string;
    modalityFilter?: string;
    dateRange?: [string, string] | null;
    status?: string;
  }
  const FILTER_PRESETS_KEY = 'his-radiology-filter-presets';
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>(() => {
    try {
      const stored = localStorage.getItem(FILTER_PRESETS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [presetName, setPresetName] = useState('');

  const saveFilterPreset = () => {
    if (!presetName.trim()) {
      message.warning('Vui long nhap ten preset');
      return;
    }
    const newPreset: FilterPreset = {
      name: presetName.trim(),
      searchText,
      modalityFilter,
      dateRange: statsDateRange ? [statsDateRange[0].format('YYYY-MM-DD'), statsDateRange[1].format('YYYY-MM-DD')] : null,
    };
    const updated = [...filterPresets.filter((p) => p.name !== newPreset.name), newPreset];
    setFilterPresets(updated);
    try { localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    setPresetName('');
    message.success(`Da luu preset "${newPreset.name}"`);
  };

  const loadFilterPreset = (preset: FilterPreset) => {
    setSearchText(preset.searchText || '');
    setModalityFilter(preset.modalityFilter);
    if (preset.dateRange) {
      setStatsDateRange([dayjs(preset.dateRange[0]), dayjs(preset.dateRange[1])]);
    }
    message.success(`Da tai preset "${preset.name}"`);
  };

  const deleteFilterPreset = (name: string) => {
    const updated = filterPresets.filter((p) => p.name !== name);
    setFilterPresets(updated);
    try { localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    message.success(`Da xoa preset "${name}"`);
  };

  // ===== Feature: Result Configuration (1.20) =====
  const RIS_CONFIG_KEY = 'his-radiology-config';
  interface RisConfig {
    maxResultsPerRead: number;
    autoSaveInterval: number; // seconds
    printGrouping: 'single' | 'byPatient' | 'byModality';
    requireTechnician: boolean;
  }
  const [risConfig, setRisConfig] = useState<RisConfig>(() => {
    try {
      const stored = localStorage.getItem(RIS_CONFIG_KEY);
      return stored ? JSON.parse(stored) : { maxResultsPerRead: 20, autoSaveInterval: 60, printGrouping: 'single', requireTechnician: false };
    } catch { return { maxResultsPerRead: 20, autoSaveInterval: 60, printGrouping: 'single', requireTechnician: false }; }
  });

  const saveRisConfig = (updated: RisConfig) => {
    setRisConfig(updated);
    try { localStorage.setItem(RIS_CONFIG_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    message.success('Da luu cau hinh');
  };

  // Print radiology report (Phiếu kết quả CĐHA)
  const executePrintRadiologyReport = (report: RadiologyReport) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.warning('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
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
            <div><strong>${HOSPITAL_NAME}</strong></div>
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
  const [usbTokenCertificates, setUsbTokenCertificates] = useState<USBTokenCertificate[]>([]);
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
      console.warn('Error loading USB Token certificates:', error);
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
          message.warning('Vui lòng chọn chứng thư số để ký');
          setSignatureLoading(false);
          return;
        }

        // Generate and sign PDF with radiology report data
        const pdfRequest: PdfGenerateSignRequest = {
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
          hospitalName: HOSPITAL_NAME,
          hospitalAddress: HOSPITAL_ADDRESS,
          hospitalPhone: HOSPITAL_PHONE,
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
                } catch {
                  message.warning('Không thể tải file PDF');
                }
              },
            });
          }

          setIsSignatureModalOpen(false);
          setSelectedReportToSign(null);
          fetchRadiologyData();
        } else {
          message.warning(result.data?.message || 'Ký số PDF thất bại');
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
          message.warning(result.data?.message || 'Ký số thất bại');
        }
      }
    } catch (error: any) {
      console.warn('Sign result error:', error);
      message.warning(error?.response?.data?.message || 'Có lỗi xảy ra khi ký số');
    } finally {
      setSignatureLoading(false);
    }
  };

  // Fetch radiology data from API
  const fetchRadiologyData = async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const response = await risApi.getWaitingList(today);
      if (response && response.data) {
        // Map API data to local RadiologyRequest format
        // Status from API (Vietnamese): 'Cho thuc hien', 'Da hen', 'Dang thuc hien', 'Da thuc hien', 'Da tra ket qua', 'Da duyet', 'Da huy'
        // Numeric: 0=Pending, 1=Scheduled, 2=InProgress, 3=Completed, 4=Reported, 5=Approved, 6=Cancelled
        const mapStatus = (s: string | number | undefined): number => {
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
          return typeof s === 'string' ? (statusMap[s] ?? 0) : 0; // Default to 0 (Pending) if unknown
        };
        const requests: RadiologyRequest[] = (response.data || []).map((item: RadiologyWaitingListItem) => ({
          id: item.orderId || item.id || item.orderCode,
          requestCode: item.orderCode || item.requestCode || item.orderId,
          patientCode: item.patientCode,
          patientName: item.patientName,
          gender: item.gender === 'Nam' ? 1 : item.gender === 'Nu' ? 2 : typeof item.gender === 'number' ? item.gender : 1,
          serviceName: item.serviceName,
          contrast: item.contrast || false,
          priority: item.priority === 'Cap cuu' || Number(item.priority) === 3 ? 3 : item.priority === 'Khan' || Number(item.priority) === 2 ? 2 : 1,
          requestDate: item.orderTime || item.requestDate || '',
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
      console.warn('Error fetching radiology data:', error);
      message.warning('Không thể tải danh sách chẩn đoán hình ảnh');
    } finally {
      // no-op
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
          setModalities(modalitiesRes.data.map((m) => ({
            id: m.id,
            code: m.code,
            name: m.name,
            modalityType: m.modalityType,
            roomName: m.roomName,
          })));
        }
        if (roomsRes.data) {
          setRooms(roomsRes.data.map((r) => ({
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
          console.warn('Error loading tags:', error);
        } finally {
          setTagsLoading(false);
        }
      };
      loadTags();
    }
  }, [activeTab, tagsData.length]);

  // Load result templates when Config tab is opened
  useEffect(() => {
    if (activeTab === 'config' && resultTemplates.length === 0) {
      loadResultTemplates();
    }
  }, [activeTab, resultTemplates.length]);

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
  void getExamStatusTag;
  void getReportStatusTag;

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
      console.warn('Schedule submit error:', error);
      message.warning(error?.response?.data?.message || 'Không thể hẹn lịch');
    }
  };

  // Handle start exam (for in-progress/scheduled requests)
  const handleStartExam = async (record: RadiologyRequest) => {
    try {
      await risApi.startExam(record.id);
      message.success('Đã bắt đầu thực hiện');
      fetchRadiologyData();
    } catch (error: any) {
      console.warn('Start exam error:', error);
      message.warning(error?.response?.data?.message || 'Không thể bắt đầu thực hiện');
    }
  };

  // Handle create report
  const handleCreateReport = (record: RadiologyExam) => {
    setSelectedExam(record);
    reportForm.resetFields();
    setIsReportModalOpen(true);
  };
  void handleCreateReport;

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
      console.warn('Report submit error:', error);
      message.warning(error?.response?.data?.message || 'Không thể lưu báo cáo');
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
          console.warn('Approve report error:', error);
          message.warning(error?.response?.data?.message || 'Không thể duyệt báo cáo');
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
      title: 'Phương thức',
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
      title: 'Phương thức',
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
              console.warn('Complete exam error:', error);
              message.warning(error?.response?.data?.message || 'Không thể hoàn thành ca chụp');
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
          <Tooltip title="Trao doi ve ca nay">
            <Button
              size="small"
              icon={<MessageOutlined />}
              onClick={() => openChatForCase(record.id)}
            >
              Chat
            </Button>
          </Tooltip>
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
      width: 400,
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
          {record.studyInstanceUID && (
            <Tooltip title="Xuat file DICOM (ZIP)">
              <Button
                size="small"
                icon={<CloudDownloadOutlined />}
                loading={dicomExportLoading === record.studyInstanceUID}
                onClick={() => handleExportDicom(record.studyInstanceUID!, record.requestCode)}
                data-testid="dicom-export-btn"
              >
                DICOM
              </Button>
            </Tooltip>
          )}
          {record.studyInstanceUID && (
            <Tooltip title="Gui DICOM den Remote PACS">
              <Button
                size="small"
                icon={<CloudUploadOutlined />}
                loading={dicomSendLoading === record.studyInstanceUID}
                onClick={() => handleSendDicomToRemote(record.id, record.studyInstanceUID!)}
                data-testid="dicom-send-btn"
              >
                Send
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Trao doi ve ca nay">
            <Button
              size="small"
              icon={<MessageOutlined />}
              onClick={() => openChatForCase(record.id)}
              data-testid="chat-case-btn"
            >
              Chat
            </Button>
          </Tooltip>
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
                message.warning('Không thể tạo QR Code');
              }
            }}
          >
            Mã QR
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

  // Dark mode CSS styles applied inline
  const darkModeStyles: React.CSSProperties = isDarkMode ? {
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    minHeight: '100vh',
    padding: 16,
    transition: 'all 0.3s ease',
  } : {};

  return (
    <div style={darkModeStyles} className={isDarkMode ? 'ris-dark-mode' : ''} data-testid="ris-page-container">
      {/* Dark mode style injection */}
      {isDarkMode && (
        <style>{`
          .ris-dark-mode .ant-card { background: #16213e !important; border-color: #0f3460 !important; color: #e0e0e0 !important; }
          .ris-dark-mode .ant-table { background: #16213e !important; color: #e0e0e0 !important; }
          .ris-dark-mode .ant-table-thead > tr > th { background: #0f3460 !important; color: #e0e0e0 !important; border-bottom-color: #1a1a2e !important; }
          .ris-dark-mode .ant-table-tbody > tr > td { border-bottom-color: #1a1a2e !important; color: #e0e0e0 !important; }
          .ris-dark-mode .ant-table-tbody > tr:hover > td { background: #1a3a5c !important; }
          .ris-dark-mode .ant-tabs-tab { color: #8899aa !important; }
          .ris-dark-mode .ant-tabs-tab-active .ant-tabs-tab-btn { color: #58a6ff !important; }
          .ris-dark-mode .ant-tabs-ink-bar { background: #58a6ff !important; }
          .ris-dark-mode .ant-input, .ris-dark-mode .ant-select-selector, .ris-dark-mode .ant-picker { background: #0f3460 !important; color: #e0e0e0 !important; border-color: #1a3a5c !important; }
          .ris-dark-mode .ant-input::placeholder { color: #6677888 !important; }
          .ris-dark-mode .ant-modal-content { background: #16213e !important; color: #e0e0e0 !important; }
          .ris-dark-mode .ant-modal-header { background: #0f3460 !important; border-bottom-color: #1a1a2e !important; }
          .ris-dark-mode .ant-modal-title { color: #e0e0e0 !important; }
          .ris-dark-mode .ant-descriptions-item-label { background: #0f3460 !important; color: #8899aa !important; }
          .ris-dark-mode .ant-descriptions-item-content { background: #16213e !important; color: #e0e0e0 !important; }
          .ris-dark-mode .ant-alert { background: #0f3460 !important; border-color: #1a3a5c !important; }
          .ris-dark-mode .ant-alert-message, .ris-dark-mode .ant-alert-description { color: #e0e0e0 !important; }
          .ris-dark-mode h1, .ris-dark-mode h2, .ris-dark-mode h3, .ris-dark-mode h4, .ris-dark-mode h5 { color: #e0e0e0 !important; }
          .ris-dark-mode .ant-badge-count { box-shadow: 0 0 0 1px #1a1a2e !important; }
          .ris-dark-mode .ant-form-item-label > label { color: #e0e0e0 !important; }
          .ris-dark-mode .ant-pagination-item a { color: #8899aa !important; }
          .ris-dark-mode .ant-pagination-item-active a { color: #58a6ff !important; }
          .ris-dark-mode .ant-table-pagination { background: transparent !important; }
        `}</style>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý Chẩn đoán Hình ảnh (RIS/PACS)</Title>
        <Space>
          <Tooltip title={isDarkMode ? 'Chuyển sang giao dien sang' : 'Chuyển sang giao dien toi (phong doc)'}>
            <Button
              icon={<BulbOutlined />}
              onClick={toggleDarkMode}
              size="small"
              type={isDarkMode ? 'primary' : 'default'}
              data-testid="ris-dark-mode-toggle"
            >
              {isDarkMode ? 'Sang' : 'Toi'}
            </Button>
          </Tooltip>
          <Button icon={<ReloadOutlined />} onClick={() => fetchRadiologyData()} size="small">Làm mới</Button>
        </Space>
      </div>

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
                  <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
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
                  {/* Filter Presets */}
                  <Row gutter={8} style={{ marginBottom: 12 }} align="middle">
                    <Col>
                      <Input
                        placeholder="Ten preset..."
                        size="small"
                        style={{ width: 140 }}
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        onPressEnter={saveFilterPreset}
                      />
                    </Col>
                    <Col>
                      <Button size="small" icon={<SaveOutlined />} onClick={saveFilterPreset} type="primary" ghost>
                        Luu
                      </Button>
                    </Col>
                    {filterPresets.map((p) => (
                      <Col key={p.name}>
                        <Tag
                          color="blue"
                          style={{ cursor: 'pointer', marginBottom: 0 }}
                          onClick={() => loadFilterPreset(p)}
                          closable
                          onClose={(e) => { e.preventDefault(); deleteFilterPreset(p.name); }}
                        >
                          {p.name}
                        </Tag>
                      </Col>
                    ))}
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
                            console.warn('Statistics error:', error);
                            message.warning(error?.response?.data?.message || 'Không thể tải thống kê');
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
                            console.warn('Export Excel error:', error);
                            message.warning(error?.response?.data?.message || 'Không thể xuất Excel');
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
                            console.warn('Search tags error:', error);
                            message.warning(error?.response?.data?.message || 'Không thể tìm tag');
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
                    {tagsData.length > 0 ? tagsData.map((tag) => (
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
                            console.warn('Load duty schedules error:', error);
                            message.warning(error?.response?.data?.message || 'Không thể tải lịch trực');
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
                            console.warn('Search integration logs error:', error);
                            message.warning(error?.response?.data?.message || 'Không thể tìm kiếm log');
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
                            message.warning(error?.response?.data?.message || 'Không thể tải mẫu chẩn đoán');
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
                            message.warning(error?.response?.data?.message || 'Không thể tải từ viết tắt');
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
                            message.warning(error?.response?.data?.message || 'Không thể tải cấu hình nhãn in');
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
                            message.warning(error?.response?.data?.message || 'Không thể tải cấu hình ký số');
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
                            message.warning(error?.response?.data?.message || 'Không thể tải danh sách modality');
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
                            message.warning(error?.response?.data?.message || 'Không thể tải kết nối PACS');
                          }
                        }}>Quản lý</Button>}
                      >
                        <p>Cấu hình kết nối với PACS server (tùy chọn).</p>
                      </Card>
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={24}>
                      <Card
                        title={<><GlobalOutlined /> Remote PACS Servers</>}
                        size="small"
                        extra={<Button type="primary" size="small" icon={<SettingOutlined />} onClick={() => {
                          setRemoteServerDrawerOpen(true);
                          fetchRemoteServers();
                        }}>Quan ly</Button>}
                      >
                        <p>Quan ly cac PACS server tu xa de gui anh DICOM (C-STORE). Cau hinh AE Title, host, port cho tung server.</p>
                      </Card>
                    </Col>
                  </Row>
                </>
              ),
            },
            {
              key: 'config',
              label: (
                <span>
                  <ControlOutlined />
                  Cấu hình KQ
                </span>
              ),
              children: (
                <>
                  <Alert
                    title="Cấu hình đọc kết quả"
                    description="Thiết lập tham số cho quy trình đọc kết quả chẩn đoán hình ảnh va quan ly mau ket qua"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Row gutter={[24, 16]}>
                    <Col span={12}>
                      <Card title="Giới hạn & Tự động" size="small">
                        <Form layout="vertical">
                          <Form.Item label="Số kết quả tối đa mỗi lần đọc">
                            <InputNumber
                              min={1}
                              max={100}
                              value={risConfig.maxResultsPerRead}
                              onChange={(v) => v && saveRisConfig({ ...risConfig, maxResultsPerRead: v })}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                          <Form.Item label="Tự động lưu nháp (giây)">
                            <InputNumber
                              min={10}
                              max={600}
                              step={10}
                              value={risConfig.autoSaveInterval}
                              onChange={(v) => v && saveRisConfig({ ...risConfig, autoSaveInterval: v })}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Form>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card title="In ấn & Nhân sự" size="small">
                        <Form layout="vertical">
                          <Form.Item label="Nhóm in kết quả">
                            <Select
                              value={risConfig.printGrouping}
                              onChange={(v) => saveRisConfig({ ...risConfig, printGrouping: v })}
                            >
                              <Select.Option value="single">Từng phiếu riêng lẻ</Select.Option>
                              <Select.Option value="byPatient">Nhóm theo bệnh nhân</Select.Option>
                              <Select.Option value="byModality">Nhóm theo Modality</Select.Option>
                            </Select>
                          </Form.Item>
                          <Form.Item label="Yêu cầu KTV thực hiện">
                            <Switch
                              checked={risConfig.requireTechnician}
                              onChange={(v) => saveRisConfig({ ...risConfig, requireTechnician: v })}
                              checkedChildren="Bắt buộc"
                              unCheckedChildren="Không"
                            />
                            <div style={{ marginTop: 4, color: '#888', fontSize: 12 }}>
                              Khi bật, mỗi ca chụp phải gán KTV trước khi bắt đầu
                            </div>
                          </Form.Item>
                        </Form>
                      </Card>
                    </Col>
                  </Row>

                  {/* Result Template Management */}
                  <Divider>Quản lý mẫu kết quả</Divider>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          setEditingTemplate(null);
                          templateForm.resetFields();
                          templateForm.setFieldsValue({ isActive: true, isDefault: false, sortOrder: 0 });
                          setIsTemplateModalOpen(true);
                        }}
                        data-testid="add-template-btn"
                      >
                        Thêm mẫu kết quả
                      </Button>
                    </Col>
                    <Col>
                      <Button icon={<ReloadOutlined />} onClick={loadResultTemplates} loading={resultTemplatesLoading}>
                        Tải lại
                      </Button>
                    </Col>
                  </Row>
                  <Table
                    dataSource={resultTemplates}
                    rowKey="id"
                    size="small"
                    loading={resultTemplatesLoading}
                    pagination={{ pageSize: 8, showTotal: (total) => `Tổng: ${total} mẫu` }}
                    columns={[
                      { title: 'Mã', dataIndex: 'code', key: 'code', width: 100 },
                      { title: 'Tên mẫu', dataIndex: 'name', key: 'name', width: 200 },
                      { title: 'Loại DV', dataIndex: 'serviceTypeName', key: 'serviceTypeName', width: 120 },
                      { title: 'Dịch vụ', dataIndex: 'serviceName', key: 'serviceName', width: 150 },
                      { title: 'Giới tính', dataIndex: 'gender', key: 'gender', width: 80, render: (g: string) => g === 'M' ? 'Nam' : g === 'F' ? 'Nữ' : 'Tất cả' },
                      { title: 'Thứ tự', dataIndex: 'sortOrder', key: 'sortOrder', width: 80 },
                      { title: 'Mặc định', dataIndex: 'isDefault', key: 'isDefault', width: 90, render: (v: boolean) => v ? <Tag color="blue">Mặc định</Tag> : '-' },
                      { title: 'Trạng thái', dataIndex: 'isActive', key: 'isActive', width: 90, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Hoạt động' : 'Tắt'}</Tag> },
                      {
                        title: 'Thao tác',
                        key: 'action',
                        width: 150,
                        render: (_: any, tpl: RadiologyResultTemplateDto) => (
                          <Space>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                setEditingTemplate(tpl);
                                templateForm.setFieldsValue({
                                  code: tpl.code,
                                  name: tpl.name,
                                  serviceTypeId: tpl.serviceTypeId,
                                  serviceId: tpl.serviceId,
                                  gender: tpl.gender,
                                  descriptionTemplate: tpl.descriptionTemplate,
                                  conclusionTemplate: tpl.conclusionTemplate,
                                  noteTemplate: tpl.noteTemplate,
                                  sortOrder: tpl.sortOrder,
                                  isDefault: tpl.isDefault,
                                  isActive: tpl.isActive,
                                });
                                setIsTemplateModalOpen(true);
                              }}
                            >
                              Sửa
                            </Button>
                            <Popconfirm
                              title="Xóa mẫu này?"
                              onConfirm={() => handleDeleteTemplate(tpl.id)}
                              okText="Xóa"
                              cancelText="Hủy"
                            >
                              <Button size="small" icon={<DeleteOutlined />} danger>Xóa</Button>
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                    data-testid="result-templates-table"
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* RIS Internal Chat Panel (Enhanced - NangCap15) */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          right: 24,
          width: 380,
          zIndex: 100,
          borderRadius: chatOpen ? '8px 8px 0 0' : 8,
          boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
          background: isDarkMode ? '#16213e' : '#fff',
          overflow: 'hidden',
        }}
        data-testid="ris-chat-panel"
      >
        {/* Chat Header - always visible */}
        <div
          onClick={() => setChatOpen(!chatOpen)}
          style={{
            padding: '8px 12px',
            background: '#0066CC',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            <MessageOutlined />
            <span style={{ fontWeight: 500 }}>Chat CDHA</span>
            {chatCaseId && <Tag color="cyan" style={{ fontSize: 10, marginLeft: 4 }}>{chatCaseId.substring(0, 8)}...</Tag>}
            {chatMessages.length > 0 && <Badge count={chatMessages.length} size="small" />}
          </Space>
          {chatOpen ? <DownOutlined /> : <UpOutlined />}
        </div>
        {/* Chat Body */}
        {chatOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 360 }}>
            {/* Case/Study reference filter */}
            <div style={{ padding: '4px 8px', borderBottom: `1px solid ${isDarkMode ? '#0f3460' : '#f0f0f0'}` }}>
              <Row gutter={4}>
                <Col flex="auto">
                  <Input
                    size="small"
                    placeholder="Ma phieu / Study ref (tuy chon)"
                    value={chatStudyRef}
                    onChange={(e) => setChatStudyRef(e.target.value)}
                    prefix={<FileSearchOutlined style={{ color: '#999' }} />}
                    allowClear
                  />
                </Col>
                <Col>
                  <Tooltip title="Tai tin nhan tu server">
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => loadChatMessages(chatCaseId || 'general')}
                      loading={chatLoading}
                    />
                  </Tooltip>
                </Col>
              </Row>
            </div>
            {/* Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: 8, background: isDarkMode ? '#1a1a2e' : '#fafafa' }}>
              {chatLoading && (
                <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
              )}
              {!chatLoading && chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
                  Chua co tin nhan. Bat dau trao doi ve ca chup.
                </div>
              )}
              {chatMessages
                .filter((m) => !chatStudyRef || m.studyRef === chatStudyRef || !m.studyRef)
                .map((m) => (
                <div key={m.id} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: isDarkMode ? '#8899aa' : '#888' }}>
                    <strong>{m.sender}</strong> - {dayjs(m.timestamp).format('HH:mm')}
                    {m.studyRef && <Tag style={{ marginLeft: 4, fontSize: 10 }}>{m.studyRef}</Tag>}
                  </div>
                  <div style={{ background: isDarkMode ? '#0f3460' : '#f0f5ff', padding: '4px 8px', borderRadius: 4, fontSize: 13, color: isDarkMode ? '#e0e0e0' : undefined }}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            {/* Input */}
            <div style={{ padding: 8, borderTop: `1px solid ${isDarkMode ? '#0f3460' : '#f0f0f0'}`, display: 'flex', gap: 4 }}>
              <Input
                size="small"
                placeholder="Nhap tin nhan..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onPressEnter={sendChatMessage}
                data-testid="ris-chat-input"
              />
              <Button size="small" type="primary" icon={<SendOutlined />} onClick={sendChatMessage} />
            </div>
          </div>
        )}
      </div>

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

      {/* Result Template CRUD Modal (NangCap15) */}
      <Modal
        title={editingTemplate ? 'Sửa mẫu kết quả' : 'Thêm mẫu kết quả mới'}
        open={isTemplateModalOpen}
        onOk={handleSaveTemplate}
        onCancel={() => {
          setIsTemplateModalOpen(false);
          setEditingTemplate(null);
          templateForm.resetFields();
        }}
        width={800}
        okText="Lưu"
        cancelText="Hủy"
        data-testid="template-modal"
      >
        <Form form={templateForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="Mã mẫu" rules={[{ required: true, message: 'Nhập mã mẫu' }]}>
                <Input placeholder="VD: XQ-NGUC-01" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Tên mẫu" rules={[{ required: true, message: 'Nhập tên mẫu' }]}>
                <Input placeholder="VD: X-quang Ngực thẳng bình thường" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="serviceTypeId" label="Loại dịch vụ">
                <Select placeholder="Chọn loại" allowClear>
                  <Select.Option value="XR">X-quang</Select.Option>
                  <Select.Option value="CT">CT Scanner</Select.Option>
                  <Select.Option value="MR">MRI</Select.Option>
                  <Select.Option value="US">Siêu âm</Select.Option>
                  <Select.Option value="ECG">Điện tim</Select.Option>
                  <Select.Option value="EEG">Điện não</Select.Option>
                  <Select.Option value="ENDO">Nội soi</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="gender" label="Giới tính">
                <Select placeholder="Tất cả" allowClear>
                  <Select.Option value="M">Nam</Select.Option>
                  <Select.Option value="F">Nữ</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="sortOrder" label="Thứ tự">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="isDefault" label="Mặc định" valuePropName="checked">
                <Switch checkedChildren="Có" unCheckedChildren="Không" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="descriptionTemplate" label="Mẫu mô tả">
            <TextArea rows={4} placeholder="Nhập mẫu mô tả hình ảnh mặc định..." />
          </Form.Item>
          <Form.Item name="conclusionTemplate" label="Mẫu kết luận">
            <TextArea rows={3} placeholder="Nhập mẫu kết luận mặc định..." />
          </Form.Item>
          <Form.Item name="noteTemplate" label="Mẫu ghi chú">
            <TextArea rows={2} placeholder="Nhập mẫu ghi chú (không bắt buộc)..." />
          </Form.Item>
          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Tắt" />
          </Form.Item>
        </Form>
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
            console.warn('Save tag error:', error);
            message.warning(error?.response?.data?.message || 'Không thể tạo tag');
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

      {/* Remote PACS Server Management Drawer */}
      <Drawer
        title={<><GlobalOutlined /> Quan ly Remote PACS Servers</>}
        open={remoteServerDrawerOpen}
        onClose={() => setRemoteServerDrawerOpen(false)}
        size="large"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingRemoteServer(null);
            remoteServerForm.resetFields();
            remoteServerForm.setFieldsValue({ port: 4242, isActive: true });
            setRemoteServerModalOpen(true);
          }}>
            Them server
          </Button>
        }
      >
        <Table
          dataSource={remoteServers}
          rowKey="id"
          size="small"
          loading={remoteServerLoading}
          pagination={false}
          columns={[
            { title: 'Ten', dataIndex: 'name', key: 'name', width: 130 },
            { title: 'AE Title', dataIndex: 'aeTitle', key: 'aeTitle', width: 100 },
            { title: 'Host', dataIndex: 'host', key: 'host', width: 130 },
            { title: 'Port', dataIndex: 'port', key: 'port', width: 60 },
            {
              title: 'Trang thai',
              dataIndex: 'isActive',
              key: 'isActive',
              width: 90,
              render: (v: boolean) => <Tag color={v !== false ? 'green' : 'red'}>{v !== false ? 'Hoat dong' : 'Tat'}</Tag>,
            },
            {
              title: 'Thao tac',
              key: 'action',
              width: 120,
              render: (_: any, record: any) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => {
                    setEditingRemoteServer(record);
                    remoteServerForm.setFieldsValue(record);
                    setRemoteServerModalOpen(true);
                  }} />
                  <Popconfirm title="Xoa server nay?" onConfirm={() => handleDeleteRemoteServer(record.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Drawer>

      {/* Remote PACS Server Add/Edit Modal */}
      <Modal
        title={editingRemoteServer ? 'Sua Remote PACS Server' : 'Them Remote PACS Server'}
        open={remoteServerModalOpen}
        onOk={handleSaveRemoteServer}
        onCancel={() => {
          setRemoteServerModalOpen(false);
          setEditingRemoteServer(null);
          remoteServerForm.resetFields();
        }}
        okText="Luu"
        cancelText="Huy"
        width={500}
        destroyOnHidden
      >
        <Form form={remoteServerForm} layout="vertical">
          <Form.Item name="name" label="Ten server" rules={[{ required: true, message: 'Vui long nhap ten server' }]}>
            <Input placeholder="VD: PACS Benh vien tinh" />
          </Form.Item>
          <Form.Item name="aeTitle" label="AE Title" rules={[{ required: true, message: 'Vui long nhap AE Title' }]}>
            <Input placeholder="VD: REMOTE_PACS" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="host" label="Host / IP" rules={[{ required: true, message: 'Vui long nhap host' }]}>
                <Input placeholder="VD: 192.168.1.100" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="port" label="Port" rules={[{ required: true, message: 'Vui long nhap port' }]}>
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Mo ta">
            <Input.TextArea rows={2} placeholder="Ghi chu them ve server nay..." />
          </Form.Item>
          <Form.Item name="isActive" label="Trang thai" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Hoat dong" unCheckedChildren="Tat" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Radiology;
