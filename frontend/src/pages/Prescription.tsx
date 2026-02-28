import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Table,
  Space,
  Typography,
  Divider,
  Tag,
  Alert,
  Modal,
  AutoComplete,
  Popconfirm,
  Badge,
  message,
  Descriptions,
  Drawer,
  Spin,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  PrinterOutlined,
  SendOutlined,
  WarningOutlined,
  SearchOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { examinationApi, type MedicineDto, type PrescriptionTemplateDto } from '../api/examination';
import { patientApi, type Patient as ApiPatient } from '../api/patient';
import { getPrescriptionContext, type PrescriptionContextDto } from '../api/dataInheritance';
import { HOSPITAL_NAME } from '../constants/hospital';
import { SignatureStatusIcon, PinEntryModal } from '../components/digital-signature';
import { useSigningContext } from '../contexts/SigningContext';
import { getSignatures } from '../api/digitalSignature';
import type { DocumentSignatureDto } from '../api/digitalSignature';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// ==================== INTERFACES ====================

interface Patient {
  id: string;
  patientCode: string;
  fullName: string;
  dateOfBirth?: string;
  gender: number;
  phoneNumber?: string;
  address?: string;
  allergies?: string[];
  currentMedications?: string[];
  insuranceNumber?: string;
}

// Medicine interface compatible with API
interface Medicine {
  id: string;
  code: string;
  name: string;
  activeIngredient: string;
  dosageForm: string;
  strength: string;
  unit: string;
  unitPrice: number;
  stock: number;
  manufacturer?: string;
  insuranceCovered: boolean;
}

// Helper to convert MedicineDto to local Medicine interface
const convertMedicineDto = (dto: MedicineDto): Medicine => ({
  id: dto.id,
  code: dto.code,
  name: dto.name,
  activeIngredient: dto.activeIngredient || '',
  dosageForm: dto.unit || 'Viên',
  strength: '',
  unit: dto.unit || 'Viên',
  unitPrice: dto.unitPrice,
  stock: dto.availableQuantity,
  manufacturer: dto.manufacturer,
  insuranceCovered: dto.insurancePrice > 0,
});

interface DosageInstruction {
  morning: number;
  noon: number;
  evening: number;
  night: number;
  beforeMeal: boolean;
  afterMeal: boolean;
}

interface PrescriptionItem {
  id: string;
  medicine: Medicine;
  dosageForm: string;
  strength: string;
  quantity: number;
  dosage: DosageInstruction;
  duration: number;
  route: string;
  notes?: string;
  totalDose: number;
  totalCost: number;
  insuranceCoverage: number;
}

interface DrugInteraction {
  medicine1: string;
  medicine2: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation?: string;
}

interface PrescriptionTemplate {
  id: string;
  name: string;
  diagnosis: string;
  items: Omit<PrescriptionItem, 'id'>[];
}

interface Prescription {
  id?: string;
  patientId: string;
  examinationId?: string;
  prescriptionDate: string;
  diagnosis?: string;
  items: PrescriptionItem[];
  interactions: DrugInteraction[];
  totalCost: number;
  insuranceCoverage: number;
  finalCost: number;
  notes?: string;
  status: 'draft' | 'completed' | 'sent';
  overrideReason?: string;
}

// Hardcoded fallback templates used when API is unavailable
const fallbackTemplates: PrescriptionTemplate[] = [
  {
    id: '1',
    name: 'Cảm cúm thông thường',
    diagnosis: 'Nhiễm khuẩn đường hô hấp trên',
    items: [],
  },
  {
    id: '2',
    name: 'Viêm họng cấp',
    diagnosis: 'Viêm họng do vi khuẩn',
    items: [],
  },
];

// ==================== HELPER FUNCTIONS ====================

const calculateTotalDose = (dosage: DosageInstruction, duration: number): number => {
  const dailyDose = dosage.morning + dosage.noon + dosage.evening + dosage.night;
  return dailyDose * duration;
};

const calculateCost = (
  quantity: number,
  unitPrice: number,
  insuranceCovered: boolean,
  insuranceRate: number = 0.8
): { total: number; insurance: number; final: number } => {
  const total = quantity * unitPrice;
  const insurance = insuranceCovered ? total * insuranceRate : 0;
  const final = total - insurance;
  return { total, insurance, final };
};

const formatDosage = (dosage: DosageInstruction): string => {
  const parts: string[] = [];
  if (dosage.morning > 0) parts.push(`Sáng: ${dosage.morning}`);
  if (dosage.noon > 0) parts.push(`Trưa: ${dosage.noon}`);
  if (dosage.evening > 0) parts.push(`Chiều: ${dosage.evening}`);
  if (dosage.night > 0) parts.push(`Tối: ${dosage.night}`);

  let result = parts.join(', ');
  if (dosage.beforeMeal) result += ' (Trước ăn)';
  else if (dosage.afterMeal) result += ' (Sau ăn)';

  return result;
};

// Local drug interaction check as fallback when API is unavailable.
// Covers common clinically significant interaction pairs.
// TODO: Full drug interaction checking should rely on the API (examinationApi.checkDrugInteractions).
const checkDrugInteractionsLocal = (medicines: Medicine[]): DrugInteraction[] => {
  const interactions: DrugInteraction[] = [];
  const ingredients = medicines.map(m => ({
    name: m.name,
    ingredient: m.activeIngredient.toLowerCase(),
  }));

  // Helper to check if any medicine contains a given ingredient keyword
  const findMedicine = (keyword: string) =>
    ingredients.find(m => m.ingredient.includes(keyword));

  // NSAIDs group
  const nsaidKeywords = ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'meloxicam', 'piroxicam', 'celecoxib', 'indomethacin', 'ketorolac'];
  const nsaidMedicines = nsaidKeywords.map(k => findMedicine(k)).filter(Boolean);
  if (nsaidMedicines.length >= 2) {
    interactions.push({
      medicine1: nsaidMedicines[0]!.name,
      medicine2: nsaidMedicines[1]!.name,
      severity: 'high',
      description: 'Sử dụng đồng thời nhiều NSAIDs làm tăng nguy cơ xuất huyết tiêu hóa và tổn thương thận.',
      recommendation: 'Không nên phối hợp nhiều NSAIDs. Chọn một loại duy nhất.',
    });
  }

  // NSAIDs + Anticoagulants
  const anticoagulantKeywords = ['warfarin', 'heparin', 'enoxaparin', 'rivaroxaban', 'apixaban', 'dabigatran', 'clopidogrel'];
  const nsaid = nsaidKeywords.map(k => findMedicine(k)).find(Boolean);
  const anticoagulant = anticoagulantKeywords.map(k => findMedicine(k)).find(Boolean);
  if (nsaid && anticoagulant) {
    interactions.push({
      medicine1: nsaid.name,
      medicine2: anticoagulant.name,
      severity: 'high',
      description: 'NSAIDs kết hợp với thuốc chống đông máu làm tăng đáng kể nguy cơ xuất huyết.',
      recommendation: 'Tránh phối hợp hoặc theo dõi chặt INR/chức năng đông máu.',
    });
  }

  // ACE Inhibitors + Potassium-sparing diuretics / Potassium supplements
  const aceKeywords = ['enalapril', 'lisinopril', 'captopril', 'ramipril', 'perindopril', 'benazepril'];
  const potassiumKeywords = ['spironolactone', 'amiloride', 'triamterene', 'potassium', 'kali'];
  const ace = aceKeywords.map(k => findMedicine(k)).find(Boolean);
  const potassium = potassiumKeywords.map(k => findMedicine(k)).find(Boolean);
  if (ace && potassium) {
    interactions.push({
      medicine1: ace.name,
      medicine2: potassium.name,
      severity: 'high',
      description: 'ACE Inhibitor kết hợp với thuốc/chất bổ sung kali có thể gây tăng kali máu nguy hiểm.',
      recommendation: 'Theo dõi nồng độ kali máu thường xuyên. Cân nhắc thay đổi thuốc.',
    });
  }

  // Metformin + Alcohol / Contrast agents
  const metformin = findMedicine('metformin');
  const contrast = findMedicine('iodine') || findMedicine('contrast');
  if (metformin && contrast) {
    interactions.push({
      medicine1: metformin.name,
      medicine2: contrast.name,
      severity: 'high',
      description: 'Metformin kết hợp với thuốc cản quang chứa iod có thể gây nhiễm toan lactic.',
      recommendation: 'Ngừng Metformin 48 giờ trước và sau khi sử dụng thuốc cản quang.',
    });
  }

  // Statin + Fibrate
  const statinKeywords = ['atorvastatin', 'simvastatin', 'rosuvastatin', 'lovastatin', 'pravastatin'];
  const fibrateKeywords = ['gemfibrozil', 'fenofibrate', 'bezafibrate'];
  const statin = statinKeywords.map(k => findMedicine(k)).find(Boolean);
  const fibrate = fibrateKeywords.map(k => findMedicine(k)).find(Boolean);
  if (statin && fibrate) {
    interactions.push({
      medicine1: statin.name,
      medicine2: fibrate.name,
      severity: 'medium',
      description: 'Statin kết hợp với fibrate có thể làm tăng nguy cơ bệnh cơ và tiêu cơ vân.',
      recommendation: 'Nếu cần phối hợp, ưu tiên fenofibrate thay vì gemfibrozil. Theo dõi CK.',
    });
  }

  // SSRIs + MAOIs
  const ssriKeywords = ['fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram'];
  const maoiKeywords = ['phenelzine', 'tranylcypromine', 'isocarboxazid', 'selegiline'];
  const ssri = ssriKeywords.map(k => findMedicine(k)).find(Boolean);
  const maoi = maoiKeywords.map(k => findMedicine(k)).find(Boolean);
  if (ssri && maoi) {
    interactions.push({
      medicine1: ssri.name,
      medicine2: maoi.name,
      severity: 'high',
      description: 'SSRI kết hợp với MAOI có thể gây hội chứng serotonin - đe dọa tính mạng.',
      recommendation: 'CHỐNG CHỈ ĐỊNH tuyệt đối. Cần khoảng cách rửa thuốc ít nhất 2-5 tuần.',
    });
  }

  // Macrolide antibiotics + Statins
  const macrolideKeywords = ['erythromycin', 'clarithromycin', 'azithromycin'];
  const macrolide = macrolideKeywords.map(k => findMedicine(k)).find(Boolean);
  if (macrolide && statin) {
    interactions.push({
      medicine1: macrolide.name,
      medicine2: statin.name,
      severity: 'medium',
      description: 'Macrolide ức chế CYP3A4, làm tăng nồng độ statin trong máu, tăng nguy cơ bệnh cơ.',
      recommendation: 'Cân nhắc giảm liều statin hoặc tạm ngưng trong thời gian dùng kháng sinh.',
    });
  }

  return interactions;
};

// ==================== MAIN COMPONENT ====================

const Prescription: React.FC = () => {
  const [form] = Form.useForm();
  const [medicineForm] = Form.useForm();
  const [patientSearchForm] = Form.useForm();

  // State
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [patientSearchResults, setPatientSearchResults] = useState<ApiPatient[]>([]);
  const [isPatientSearchModalOpen, setIsPatientSearchModalOpen] = useState(false);

  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<PrescriptionItem | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [medicineSearchResults, setMedicineSearchResults] = useState<Medicine[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [isInteractionDrawerOpen, setIsInteractionDrawerOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateDiagnosis, setTemplateDiagnosis] = useState('');
  const [prescriptionTemplates, setPrescriptionTemplates] = useState<PrescriptionTemplate[]>(fallbackTemplates);

  // Data inheritance state (OPD → Prescription context)
  const [rxContext, setRxContext] = useState<PrescriptionContextDto | null>(null);

  // Digital signature
  const { sessionActive, openSession, signDocument } = useSigningContext();
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [signatureMap, setSignatureMap] = useState<Map<string, DocumentSignatureDto>>(new Map());

  const loadPrescriptionSignature = async (prescriptionId: string) => {
    try {
      const res = await getSignatures(prescriptionId);
      if (res.data.length > 0) {
        setSignatureMap(prev => new Map(prev).set(prescriptionId, res.data[0]));
      }
    } catch { /* ignore */ }
  };

  const handlePinSubmit = async (pin: string) => {
    setPinLoading(true);
    setPinError('');
    try {
      const res = await openSession(pin);
      if (res.success) {
        setPinModalOpen(false);
        message.success('Phiên ký số đã mở');
      } else {
        setPinError(res.message || 'PIN không đúng');
      }
    } catch {
      setPinError('Không thể kết nối USB Token');
    } finally {
      setPinLoading(false);
    }
  };

  const handleSignPrescription = async (prescriptionId: string) => {
    if (!sessionActive) {
      setPinModalOpen(true);
      return;
    }
    try {
      const res = await signDocument(prescriptionId, 'Prescription', 'Ký xác nhận đơn thuốc');
      if (res.success) {
        message.success('Ký đơn thuốc thành công');
        loadPrescriptionSignature(prescriptionId);
      } else {
        message.warning(res.message || 'Ký số thất bại');
      }
    } catch {
      message.warning('Lỗi ký số');
    }
  };

  // Calculate totals
  const totalCost = prescriptionItems.reduce((sum, item) => sum + item.totalCost, 0);
  const totalInsurance = prescriptionItems.reduce((sum, item) => sum + item.insuranceCoverage, 0);
  const finalCost = totalCost - totalInsurance;

  // Check interactions when items change - use API with local fallback
  useEffect(() => {
    if (prescriptionItems.length <= 1) {
      setInteractions([]);
      return;
    }

    const medicines = prescriptionItems.map(item => item.medicine);
    const medicineIds = medicines.map(m => m.id);

    // Try API first, fall back to local check
    const checkInteractions = async () => {
      try {
        const response = await examinationApi.checkDrugInteractions(medicineIds);
        const apiData = response.data;
        if (apiData && Array.isArray(apiData) && apiData.length > 0) {
          const mapped: DrugInteraction[] = apiData.map((dto: any) => ({
            medicine1: dto.drug1Name,
            medicine2: dto.drug2Name,
            severity: dto.severity === 3 || dto.severityName === 'high' ? 'high'
              : dto.severity === 2 || dto.severityName === 'medium' ? 'medium'
              : 'low',
            description: dto.description || '',
            recommendation: dto.recommendation,
          }));
          setInteractions(mapped);
          return;
        }
      } catch {
        // API not available, fall back to local check
      }

      // Local fallback
      const foundInteractions = checkDrugInteractionsLocal(medicines);
      setInteractions(foundInteractions);
    };

    checkInteractions();
  }, [prescriptionItems]);

  // Load prescription templates from API on mount, fallback to hardcoded
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await examinationApi.getPrescriptionTemplates();
        const apiTemplates = response.data;
        if (apiTemplates && Array.isArray(apiTemplates) && apiTemplates.length > 0) {
          const mapped: PrescriptionTemplate[] = apiTemplates.map((t: PrescriptionTemplateDto) => ({
            id: t.id,
            name: t.templateName,
            diagnosis: t.description || '',
            items: [], // Template items would need medicine lookup to fully populate
          }));
          setPrescriptionTemplates(mapped);
        }
        // If API returns empty, keep fallback templates
      } catch {
        // API unavailable, keep fallback templates
        console.warn('Could not load prescription templates from API, using fallback templates');
      }
    };
    loadTemplates();
  }, []);

  // ==================== HANDLERS ====================

  // Patient search
  const handleSearchPatient = async (keyword: string) => {
    if (!keyword || keyword.length < 2) {
      setPatientSearchResults([]);
      return;
    }
    try {
      setLoadingPatient(true);
      const response = await patientApi.search({ keyword, pageSize: 10 });
      if (response.success && response.data?.items) {
        setPatientSearchResults(response.data.items);
      } else {
        setPatientSearchResults([]);
      }
    } catch (error) {
      message.error('Không thể tìm kiếm bệnh nhân');
      setPatientSearchResults([]);
    } finally {
      setLoadingPatient(false);
    }
  };

  const handleSelectPatient = async (apiPatient: ApiPatient) => {
    const p: Patient = {
      id: apiPatient.id,
      patientCode: apiPatient.patientCode,
      fullName: apiPatient.fullName,
      dateOfBirth: apiPatient.dateOfBirth,
      gender: apiPatient.gender,
      phoneNumber: apiPatient.phoneNumber,
      address: apiPatient.address,
      allergies: [],
      currentMedications: [],
      insuranceNumber: apiPatient.insuranceNumber,
    };
    setPatient(p);
    setIsPatientSearchModalOpen(false);
    setPatientSearchResults([]);
    message.success(`Đã chọn bệnh nhân: ${p.fullName}`);

    // Fetch inherited data from OPD examination (diagnosis, allergies, vitals)
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const examResponse = await examinationApi.searchExaminations({
        patientCode: apiPatient.patientCode,
        fromDate: today,
        toDate: today,
        pageIndex: 0,
        pageSize: 1,
      });
      const examData = examResponse.data;
      const examItems = examData?.items || examData;
      if (Array.isArray(examItems) && examItems.length > 0) {
        const examId = examItems[0].id;
        const ctxResponse = await getPrescriptionContext(examId);
        if (ctxResponse.data) {
          setRxContext(ctxResponse.data);
          // Auto-fill diagnosis from OPD if available
          if (ctxResponse.data.mainDiagnosis) {
            form.setFieldsValue({
              diagnosis: `${ctxResponse.data.mainIcdCode || ''} - ${ctxResponse.data.mainDiagnosis}`.trim(),
            });
          }
          // Populate allergy data from context
          if (ctxResponse.data.allergies && ctxResponse.data.allergies.length > 0) {
            p.allergies = ctxResponse.data.allergies.map(a => a.allergenName);
            setPatient({ ...p });
          }
        }
      }
    } catch {
      // Non-critical: context data is optional enhancement
      setRxContext(null);
    }
  };

  // Medicine search - using real API
  const handleSearchMedicine = async (value: string) => {
    if (!value || value.length < 2) {
      setMedicineSearchResults([]);
      return;
    }
    try {
      setLoadingMedicines(true);
      const response = await examinationApi.searchMedicines(value, undefined, 20);
      const data = response.data;
      if (data) {
        const medicines = data.map(convertMedicineDto);
        setMedicineSearchResults(medicines);
      } else {
        setMedicineSearchResults([]);
      }
    } catch (error) {
      // Fallback: show empty results
      setMedicineSearchResults([]);
    } finally {
      setLoadingMedicines(false);
    }
  };

  const handleSelectMedicine = (medicineId: string) => {
    const medicine = medicineSearchResults.find(m => m.id === medicineId);
    if (medicine) {
      setSelectedMedicine(medicine);
      medicineForm.setFieldsValue({
        medicine: medicine.name,
        dosageForm: medicine.dosageForm,
        strength: medicine.strength,
        route: 'Uống',
      });
    }
  };

  const handleAddMedicine = () => {
    medicineForm.validateFields().then((values) => {
      if (!selectedMedicine) {
        message.error('Vui lòng chọn thuốc');
        return;
      }

      const dosage: DosageInstruction = {
        morning: values.morning || 0,
        noon: values.noon || 0,
        evening: values.evening || 0,
        night: values.night || 0,
        beforeMeal: values.mealTiming === 'before',
        afterMeal: values.mealTiming === 'after',
      };

      const totalDose = calculateTotalDose(dosage, values.duration);
      const costs = calculateCost(
        values.quantity,
        selectedMedicine.unitPrice,
        selectedMedicine.insuranceCovered && !!patient?.insuranceNumber
      );

      const newItem: PrescriptionItem = {
        id: Date.now().toString(),
        medicine: selectedMedicine,
        dosageForm: values.dosageForm,
        strength: values.strength,
        quantity: values.quantity,
        dosage,
        duration: values.duration,
        route: values.route,
        notes: values.notes,
        totalDose,
        totalCost: costs.total,
        insuranceCoverage: costs.insurance,
      };

      if (isEditMode && editingItem) {
        setPrescriptionItems(prev =>
          prev.map(item => (item.id === editingItem.id ? newItem : item))
        );
        message.success('Cập nhật thuốc thành công');
      } else {
        setPrescriptionItems(prev => [...prev, newItem]);
        message.success('Thêm thuốc thành công');
      }

      handleCloseAddMedicineModal();
    });
  };

  const handleEditItem = (item: PrescriptionItem) => {
    setEditingItem(item);
    setIsEditMode(true);
    setSelectedMedicine(item.medicine);
    medicineForm.setFieldsValue({
      medicine: item.medicine.name,
      dosageForm: item.dosageForm,
      strength: item.strength,
      quantity: item.quantity,
      morning: item.dosage.morning,
      noon: item.dosage.noon,
      evening: item.dosage.evening,
      night: item.dosage.night,
      mealTiming: item.dosage.beforeMeal ? 'before' : item.dosage.afterMeal ? 'after' : undefined,
      duration: item.duration,
      route: item.route,
      notes: item.notes,
    });
    setIsAddMedicineModalOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    setPrescriptionItems(prev => prev.filter(item => item.id !== id));
    message.success('Xóa thuốc thành công');
  };

  const handleCloseAddMedicineModal = () => {
    setIsAddMedicineModalOpen(false);
    setIsEditMode(false);
    setEditingItem(null);
    setSelectedMedicine(null);
    medicineForm.resetFields();
    setMedicineSearchResults([]);
  };

  const handleLoadTemplate = (template: PrescriptionTemplate) => {
    form.setFieldsValue({ diagnosis: template.diagnosis });
    // Load template items into prescription
    if (template.items && template.items.length > 0) {
      const templateItems: PrescriptionItem[] = template.items.map((item) => ({
        id: Date.now().toString() + Math.random().toString(36).substring(2),
        medicine: item.medicine,
        dosageForm: item.dosageForm,
        strength: item.strength,
        quantity: item.quantity,
        dosage: item.dosage,
        duration: item.duration,
        route: item.route,
        notes: item.notes,
        totalDose: item.totalDose,
        totalCost: item.totalCost,
        insuranceCoverage: item.insuranceCoverage,
      }));
      setPrescriptionItems(templateItems);
    }
    setIsTemplateModalOpen(false);
    message.success(`Đã tải mẫu đơn: ${template.name}`);
  };

  const handleSaveTemplate = () => {
    if (prescriptionItems.length === 0) {
      message.error('Đơn thuốc chưa có thuốc nào');
      return;
    }
    setIsSaveTemplateModalOpen(true);
  };

  const handleSaveDraft = async () => {
    if (!patient) {
      message.warning('Vui lòng chọn bệnh nhân trước');
      return;
    }
    if (prescriptionItems.length === 0) {
      message.warning('Đơn thuốc chưa có thuốc nào');
      return;
    }
    try {
      const diagnosis = form.getFieldValue('diagnosis');
      const dto = {
        examinationId: '',
        prescriptionType: 1,
        diagnosisName: diagnosis,
        totalDays: Math.max(...prescriptionItems.map(i => i.duration), 0),
        items: prescriptionItems.map(item => ({
          medicineId: item.medicine.id,
          quantity: item.quantity,
          days: item.duration,
          dosage: formatDosage(item.dosage),
          route: item.route,
          frequency: '',
          usageInstructions: item.notes || '',
          paymentType: item.medicine.insuranceCovered ? 1 : 2,
        })),
        instructions: '',
      };
      await examinationApi.createPrescription(dto);
      message.success('Đã lưu đơn thuốc nháp');
    } catch (error) {
      console.warn('Error saving draft:', error);
      message.error('Lỗi khi lưu đơn thuốc nháp');
    }
  };

  const handleCompletePrescription = async () => {
    if (prescriptionItems.length === 0) {
      message.error('Đơn thuốc chưa có thuốc nào');
      return;
    }

    if (interactions.some(i => i.severity === 'high') && !overrideReason) {
      Modal.confirm({
        title: 'Cảnh báo tương tác thuốc nghiêm trọng',
        content: 'Có tương tác thuốc nghiêm trọng. Vui lòng nhập lý do ghi đè.',
        okText: 'Nhập lý do',
        cancelText: 'Hủy',
        onOk: () => {
          setIsInteractionDrawerOpen(true);
        },
      });
      return;
    }

    try {
      const diagnosis = form.getFieldValue('diagnosis');
      const generalNotes = form.getFieldValue('notes') || '';
      // Build instructions: include override reason if present
      const instructionParts: string[] = [];
      if (generalNotes) instructionParts.push(generalNotes);
      if (overrideReason) instructionParts.push(`[Lý do ghi đè tương tác thuốc]: ${overrideReason}`);
      const instructions = instructionParts.join('\n');

      const dto = {
        examinationId: '',
        prescriptionType: 1,
        diagnosisName: diagnosis,
        totalDays: Math.max(...prescriptionItems.map(i => i.duration), 0),
        items: prescriptionItems.map(item => ({
          medicineId: item.medicine.id,
          quantity: item.quantity,
          days: item.duration,
          dosage: formatDosage(item.dosage),
          route: item.route,
          frequency: '',
          usageInstructions: item.notes || '',
          paymentType: item.medicine.insuranceCovered ? 1 : 2,
        })),
        instructions,
      };
      await examinationApi.createPrescription(dto);
      message.success('Hoàn thành đơn thuốc thành công');
    } catch (error) {
      console.warn('Error completing prescription:', error);
      message.error('Lỗi khi hoàn thành đơn thuốc');
    }
  };

  const handlePrintPrescription = () => {
    if (prescriptionItems.length === 0) {
      message.error('Đơn thuốc chưa có thuốc nào');
      return;
    }
    const diagnosis = form.getFieldValue('diagnosis') || '';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Đơn thuốc</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 13px; padding: 20px; }
        .title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; }
        .info { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #000; padding: 5px; text-align: left; }
        th { background: #f0f0f0; }
        .text-right { text-align: right; }
        .signature-row { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
        .signature-col { width: 45%; }
        @media print { body { padding: 10px; } }
      </style></head><body>
        <div style="text-align: center;"><strong>${HOSPITAL_NAME}</strong></div>
        <div class="title">ĐƠN THUỐC</div>
        ${patient ? `
          <div class="info">Họ tên: <strong>${patient.fullName}</strong> - Mã BN: ${patient.patientCode}</div>
          <div class="info">Ngày sinh: ${patient.dateOfBirth ? dayjs(patient.dateOfBirth).format('DD/MM/YYYY') : ''} - Giới: ${patient.gender === 1 ? 'Nam' : 'Nữ'}</div>
          <div class="info">Địa chỉ: ${patient.address || ''}</div>
          ${patient.insuranceNumber ? `<div class="info">Số thẻ BHYT: ${patient.insuranceNumber}</div>` : ''}
        ` : ''}
        <div class="info">Chẩn đoán: <strong>${diagnosis}</strong></div>
        <table>
          <thead><tr>
            <th>STT</th><th>Tên thuốc</th><th>Liều dùng</th><th>Số ngày</th><th>SL</th><th>Đường dùng</th><th>Ghi chú</th>
          </tr></thead>
          <tbody>
            ${prescriptionItems.map((item, i) => `<tr>
              <td>${i + 1}</td>
              <td><strong>${item.medicine.name}</strong><br/><small>${item.medicine.activeIngredient}</small></td>
              <td>${formatDosage(item.dosage)}</td>
              <td>${item.duration} ngày</td>
              <td>${item.quantity} ${item.medicine.unit}</td>
              <td>${item.route}</td>
              <td>${item.notes || ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="info"><strong>Tổng tiền:</strong> ${totalCost.toLocaleString('vi-VN')} đ</div>
        ${totalInsurance > 0 ? `<div class="info">BHYT chi trả: ${totalInsurance.toLocaleString('vi-VN')} đ</div>` : ''}
        <div class="info"><strong>Bệnh nhân trả:</strong> ${finalCost.toLocaleString('vi-VN')} đ</div>
        <div class="signature-row">
          <div class="signature-col"><div>Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</div><div><strong>Bác sĩ kê đơn</strong></div><div style="margin-top: 50px;"></div></div>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const handleSendToPharmacy = () => {
    if (prescriptionItems.length === 0) {
      message.error('Đơn thuốc chưa có thuốc nào');
      return;
    }
    Modal.confirm({
      title: 'Gửi đơn thuốc đến nhà thuốc',
      content: 'Bạn có chắc chắn muốn gửi đơn thuốc này đến nhà thuốc?',
      okText: 'Gửi',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const diagnosis = form.getFieldValue('diagnosis');
          const dto = {
            examinationId: '',
            prescriptionType: 1,
            diagnosisName: diagnosis,
            totalDays: Math.max(...prescriptionItems.map(i => i.duration), 0),
            items: prescriptionItems.map(item => ({
              medicineId: item.medicine.id,
              quantity: item.quantity,
              days: item.duration,
              dosage: formatDosage(item.dosage),
              route: item.route,
              frequency: '',
              usageInstructions: item.notes || '',
              paymentType: item.medicine.insuranceCovered ? 1 : 2,
            })),
            instructions: '',
          };
          await examinationApi.createPrescription(dto);
          message.success('Đã gửi đơn thuốc đến nhà thuốc');
        } catch (error) {
          console.warn('Error sending to pharmacy:', error);
          message.error('Lỗi khi gửi đơn thuốc đến nhà thuốc');
        }
      },
    });
  };

  // ==================== TABLE COLUMNS ====================

  const columns: ColumnsType<PrescriptionItem> = [
    {
      title: 'STT',
      width: 50,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Tên thuốc',
      dataIndex: ['medicine', 'name'],
      key: 'name',
      width: 200,
      render: (name, record) => (
        <div>
          <div><strong>{name}</strong></div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.medicine.activeIngredient}
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Mã: {record.medicine.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Dạng bào chế / Hàm lượng',
      key: 'form',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.dosageForm}</div>
          <Text type="secondary">{record.strength}</Text>
        </div>
      ),
    },
    {
      title: 'Liều dùng',
      dataIndex: 'dosage',
      key: 'dosage',
      width: 200,
      render: (dosage: DosageInstruction) => (
        <div style={{ fontSize: 12 }}>
          {formatDosage(dosage)}
        </div>
      ),
    },
    {
      title: 'Số ngày',
      dataIndex: 'duration',
      key: 'duration',
      width: 70,
      align: 'center',
      render: (duration) => `${duration} ngày`,
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
      render: (quantity, record) => `${quantity} ${record.medicine.unit}`,
    },
    {
      title: 'Đường dùng',
      dataIndex: 'route',
      key: 'route',
      width: 80,
    },
    {
      title: 'Thành tiền',
      key: 'cost',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <div>
          <div>{record.totalCost.toLocaleString('vi-VN')} đ</div>
          {record.insuranceCoverage > 0 && (
            <Text type="success" style={{ fontSize: 12 }}>
              BHYT: -{record.insuranceCoverage.toLocaleString('vi-VN')} đ
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditItem(record)}
          />
          <Popconfirm
            title="Xóa thuốc này?"
            onConfirm={() => handleDeleteItem(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ==================== RENDER ====================

  return (
    <div>
      <Title level={4}>Kê đơn thuốc</Title>

      <Row gutter={16}>
        {/* LEFT PANEL - Patient Info */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <InfoCircleOutlined />
                <span>Thông tin bệnh nhân</span>
              </Space>
            }
            size="small"
            style={{ marginBottom: 16 }}
          >
            {patient ? (
              <>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Mã BN">
                    <strong>{patient.patientCode}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="Họ tên">
                    <strong>{patient.fullName}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày sinh">
                    {patient.dateOfBirth && dayjs(patient.dateOfBirth).format('DD/MM/YYYY')}
                    {' - '}
                    {patient.gender === 1 ? 'Nam' : 'Nữ'}
                  </Descriptions.Item>
                  <Descriptions.Item label="SĐT">{patient.phoneNumber}</Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ">{patient.address}</Descriptions.Item>
                  {patient.insuranceNumber && (
                    <Descriptions.Item label="Số thẻ BHYT">
                      <Tag color="green">{patient.insuranceNumber}</Tag>
                    </Descriptions.Item>
                  )}
                </Descriptions>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setIsPatientSearchModalOpen(true)}
                  style={{ marginTop: 8, padding: 0 }}
                >
                  Đổi bệnh nhân
                </Button>
              </>
            ) : (
              <Button
                block
                icon={<SearchOutlined />}
                onClick={() => setIsPatientSearchModalOpen(true)}
              >
                Tìm bệnh nhân
              </Button>
            )}
          </Card>

          {patient && (
            <>
              {/* Data Inheritance: OPD examination context (diagnosis, vitals) */}
              {rxContext && (
                <Card size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: '8px 12px' } }}>
                  <Typography.Text strong style={{ fontSize: 12, color: '#1677ff' }}>
                    Thong tin kham benh (OPD)
                  </Typography.Text>
                  <Descriptions column={1} size="small" style={{ marginTop: 4 }}>
                    {rxContext.mainDiagnosis && (
                      <Descriptions.Item label="Chan doan">
                        <Text strong style={{ fontSize: 12 }}>
                          {rxContext.mainIcdCode && `${rxContext.mainIcdCode} - `}{rxContext.mainDiagnosis}
                        </Text>
                      </Descriptions.Item>
                    )}
                    {rxContext.chiefComplaint && (
                      <Descriptions.Item label="Ly do kham">
                        <Text style={{ fontSize: 12 }}>{rxContext.chiefComplaint}</Text>
                      </Descriptions.Item>
                    )}
                    {(rxContext.weight || rxContext.bloodPressureSystolic) && (
                      <Descriptions.Item label="Sinh hieu">
                        <Space orientation="horizontal" size={4}>
                          {rxContext.weight && <Tag>{rxContext.weight}kg</Tag>}
                          {rxContext.bloodPressureSystolic && (
                            <Tag>HA: {rxContext.bloodPressureSystolic}/{rxContext.bloodPressureDiastolic}</Tag>
                          )}
                          {rxContext.pulse && <Tag>M: {rxContext.pulse}</Tag>}
                          {rxContext.temperature && <Tag>T: {rxContext.temperature}</Tag>}
                        </Space>
                      </Descriptions.Item>
                    )}
                    {rxContext.doctorName && (
                      <Descriptions.Item label="BS kham">
                        <Text style={{ fontSize: 12 }}>{rxContext.doctorName}</Text>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                  {rxContext.allergies && rxContext.allergies.length > 0 && (
                    <Alert
                      title="Di ung"
                      type="error"
                      showIcon
                      style={{ marginTop: 4 }}
                      description={
                        <Space wrap>
                          {rxContext.allergies.map((a, i) => (
                            <Tag color={a.severity === 3 ? 'red' : a.severity === 2 ? 'orange' : 'gold'} key={i}>
                              {a.allergenName} ({a.severityName})
                            </Tag>
                          ))}
                        </Space>
                      }
                    />
                  )}
                  {rxContext.allergyHistory && !rxContext.allergies?.length && (
                    <Alert
                      title={`Di ung: ${rxContext.allergyHistory}`}
                      type="warning"
                      showIcon
                      style={{ marginTop: 4 }}
                    />
                  )}
                </Card>
              )}

              {/* Allergies */}
              {patient.allergies && patient.allergies.length > 0 && (
                <Card
                  title={<span style={{ color: '#ff4d4f' }}>⚠ Dị ứng</span>}
                  size="small"
                  style={{ marginBottom: 16 }}
                >
                  <Space wrap>
                    {patient.allergies.map((allergy) => (
                      <Tag color="red" key={allergy}>
                        {allergy}
                      </Tag>
                    ))}
                  </Space>
                </Card>
              )}

              {/* Current Medications */}
              {patient.currentMedications && patient.currentMedications.length > 0 && (
                <Card
                  title={<span style={{ color: '#1890ff' }}>Thuốc đang dùng</span>}
                  size="small"
                  style={{ marginBottom: 16 }}
                >
                  <div>
                    {patient.currentMedications.map((item) => (
                      <div key={item} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>{item}</div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}

          {/* Summary */}
          <Card
            title="Tổng kết đơn thuốc"
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Tổng số thuốc">
                <strong>{prescriptionItems.length}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền">
                <strong>{totalCost.toLocaleString('vi-VN')} đ</strong>
              </Descriptions.Item>
              {patient?.insuranceNumber && (
                <Descriptions.Item label="BHYT chi trả">
                  <Text type="success">
                    <strong>{totalInsurance.toLocaleString('vi-VN')} đ</strong>
                  </Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Bệnh nhân trả">
                <Text strong style={{ color: '#1890ff', fontSize: 16 }}>
                  {finalCost.toLocaleString('vi-VN')} đ
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Drug Interactions Warning */}
          {interactions.length > 0 && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Alert
                title={
                  <Space>
                    <span>Cảnh báo tương tác thuốc</span>
                    <Badge count={interactions.length} />
                  </Space>
                }
                description={
                  <div>
                    {interactions.map((interaction) => (
                      <div key={`${interaction.medicine1}-${interaction.medicine2}`} style={{ marginTop: 8 }}>
                        <Tag
                          color={
                            interaction.severity === 'high'
                              ? 'red'
                              : interaction.severity === 'medium'
                              ? 'orange'
                              : 'blue'
                          }
                        >
                          {interaction.severity === 'high'
                            ? 'Nghiêm trọng'
                            : interaction.severity === 'medium'
                            ? 'Trung bình'
                            : 'Nhẹ'}
                        </Tag>
                        <Text strong>
                          {interaction.medicine1} ↔ {interaction.medicine2}
                        </Text>
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          {interaction.description}
                        </div>
                      </div>
                    ))}
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setIsInteractionDrawerOpen(true)}
                      style={{ marginTop: 8, padding: 0 }}
                    >
                      Xem chi tiết
                    </Button>
                  </div>
                }
                type="warning"
                showIcon
                icon={<WarningOutlined />}
              />
            </Card>
          )}
        </Col>

        {/* RIGHT PANEL - Prescription Form */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <MedicineBoxOutlined />
                <span>Đơn thuốc</span>
              </Space>
            }
            extra={
              <Space>
                <Button
                  icon={<FileTextOutlined />}
                  onClick={() => setIsTemplateModalOpen(true)}
                >
                  Mẫu đơn
                </Button>
                <Button icon={<SaveOutlined />} onClick={handleSaveTemplate}>
                  Lưu mẫu
                </Button>
              </Space>
            }
          >
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item label="Chẩn đoán" name="diagnosis">
                    <Input placeholder="Nhập chẩn đoán" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>

            <Divider>Danh sách thuốc</Divider>

            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => setIsAddMedicineModalOpen(true)}
              style={{ marginBottom: 16 }}
            >
              Thêm thuốc
            </Button>

            <Table
              columns={columns}
              dataSource={prescriptionItems}
              rowKey="id"
              size="small"
              scroll={{ x: 1200 }}
              pagination={false}
              locale={{ emptyText: 'Chưa có thuốc nào trong đơn' }}
              onRow={(record) => ({
                onDoubleClick: () => {
                  Modal.info({
                    title: `Chi tiết thuốc: ${record.medicine.name}`,
                    width: 600,
                    content: (
                      <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                        <Descriptions.Item label="Tên thuốc" span={2}>{record.medicine.name}</Descriptions.Item>
                        <Descriptions.Item label="Hoạt chất" span={2}>{record.medicine.activeIngredient}</Descriptions.Item>
                        <Descriptions.Item label="Dạng bào chế">{record.dosageForm}</Descriptions.Item>
                        <Descriptions.Item label="Hàm lượng">{record.strength}</Descriptions.Item>
                        <Descriptions.Item label="Số lượng">{record.quantity} {record.medicine.unit}</Descriptions.Item>
                        <Descriptions.Item label="Đường dùng">{record.route}</Descriptions.Item>
                        <Descriptions.Item label="Liều dùng">{record.dosage.morning}-{record.dosage.noon}-{(record.dosage as any).afternoon || 0}-{record.dosage.evening}</Descriptions.Item>
                        <Descriptions.Item label="Số ngày">{record.duration} ngày</Descriptions.Item>
                        <Descriptions.Item label="Đơn giá">{(record.medicine as any).price?.toLocaleString('vi-VN') || '0'}đ</Descriptions.Item>
                        <Descriptions.Item label="Thành tiền">{record.totalCost?.toLocaleString('vi-VN')}đ</Descriptions.Item>
                        <Descriptions.Item label="Ghi chú" span={2}>{record.notes || '-'}</Descriptions.Item>
                      </Descriptions>
                    ),
                  });
                },
                style: { cursor: 'pointer' },
              })}
            />

            <Divider />

            <Form.Item label="Ghi chú thêm">
              <TextArea
                rows={3}
                placeholder="Lời dặn cho bệnh nhân..."
                maxLength={500}
              />
            </Form.Item>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button icon={<SaveOutlined />} onClick={handleSaveDraft}>
                Lưu nháp
              </Button>
              <Button icon={<PrinterOutlined />} onClick={handlePrintPrescription}>
                In đơn
              </Button>
              {patient && form.getFieldValue('id') && (
                <Tooltip title={signatureMap.has(form.getFieldValue('id')) ? 'Đã ký số' : 'Ký số đơn thuốc'}>
                  <Button
                    icon={<SafetyCertificateOutlined />}
                    onClick={() => handleSignPrescription(form.getFieldValue('id'))}
                    style={signatureMap.has(form.getFieldValue('id'))
                      ? { color: '#52c41a', borderColor: '#52c41a' }
                      : undefined}
                  >
                    {signatureMap.has(form.getFieldValue('id')) ? 'Đã ký' : 'Ký đơn'}
                  </Button>
                </Tooltip>
              )}
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleCompletePrescription}
              >
                Hoàn thành
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendToPharmacy}
                style={{ background: '#52c41a' }}
              >
                Gửi nhà thuốc
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Medicine Modal */}
      <Modal
        title={isEditMode ? 'Sửa thuốc' : 'Thêm thuốc'}
        open={isAddMedicineModalOpen}
        onOk={handleAddMedicine}
        onCancel={handleCloseAddMedicineModal}
        width={800}
        okText={isEditMode ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
      >
        <Form form={medicineForm} layout="vertical">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Tìm thuốc"
                name="medicine"
                rules={[{ required: true, message: 'Vui lòng chọn thuốc' }]}
              >
                <AutoComplete
                  options={medicineSearchResults.map(m => ({
                    value: m.id,
                    label: (
                      <div>
                        <div>
                          <strong>{m.name}</strong> - {m.strength}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {m.activeIngredient} | Mã: {m.code} | Tồn: {m.stock} {m.unit}
                        </Text>
                      </div>
                    ),
                  }))}
                  onSearch={handleSearchMedicine}
                  onSelect={handleSelectMedicine}
                  placeholder="Tìm theo tên thuốc, mã thuốc, hoạt chất..."
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          {selectedMedicine && (
            <>
              <Alert
                title={
                  <div>
                    <div>
                      <strong>{selectedMedicine.name}</strong> - {selectedMedicine.strength}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      Đơn giá: {selectedMedicine.unitPrice.toLocaleString('vi-VN')} đ/{selectedMedicine.unit}
                      {' | '}
                      Tồn kho: {selectedMedicine.stock} {selectedMedicine.unit}
                      {' | '}
                      {selectedMedicine.insuranceCovered ? (
                        <Tag color="green">BHYT</Tag>
                      ) : (
                        <Tag>Tự túc</Tag>
                      )}
                    </div>
                  </div>
                }
                type="info"
                style={{ marginBottom: 16 }}
              />

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Dạng bào chế"
                    name="dosageForm"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Chọn dạng bào chế">
                      <Option value="Viên nén">Viên nén</Option>
                      <Option value="Viên nang">Viên nang</Option>
                      <Option value="Viên sủi">Viên sủi</Option>
                      <Option value="Siro">Siro</Option>
                      <Option value="Ống tiêm">Ống tiêm</Option>
                      <Option value="Chai">Chai</Option>
                      <Option value="Ống">Ống</Option>
                      <Option value="Gói">Gói</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Hàm lượng" name="strength" rules={[{ required: true }]}>
                    <Input placeholder="VD: 500mg" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>Liều dùng (số viên mỗi lần)</Divider>

              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item label="Sáng" name="morning" initialValue={0}>
                    <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Trưa" name="noon" initialValue={0}>
                    <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Chiều" name="evening" initialValue={0}>
                    <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Tối" name="night" initialValue={0}>
                    <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Thời điểm dùng" name="mealTiming">
                    <Select placeholder="Chọn" allowClear>
                      <Option value="before">Trước ăn</Option>
                      <Option value="after">Sau ăn</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Số ngày uống"
                    name="duration"
                    rules={[{ required: true }]}
                    initialValue={7}
                  >
                    <InputNumber min={1} max={90} style={{ width: '100%' }} addonAfter="ngày" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Số lượng"
                    name="quantity"
                    rules={[{ required: true }]}
                  >
                    <InputNumber
                      min={1}
                      max={selectedMedicine.stock}
                      style={{ width: '100%' }}
                      addonAfter={selectedMedicine.unit}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Đường dùng"
                    name="route"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Chọn đường dùng">
                      <Option value="Uống">Uống</Option>
                      <Option value="Tiêm tĩnh mạch">Tiêm tĩnh mạch</Option>
                      <Option value="Tiêm bắp">Tiêm bắp</Option>
                      <Option value="Bôi">Bôi ngoài da</Option>
                      <Option value="Nhỏ mắt">Nhỏ mắt</Option>
                      <Option value="Nhỏ tai">Nhỏ tai</Option>
                      <Option value="Xịt mũi">Xịt mũi</Option>
                      <Option value="Đặt">Đặt</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Ghi chú / Hướng dẫn" name="notes">
                <TextArea
                  rows={2}
                  placeholder="VD: Uống khi đói, Uống nhiều nước, Không dùng cho phụ nữ có thai..."
                  maxLength={200}
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Patient Search Modal */}
      <Modal
        title="Tìm kiếm bệnh nhân"
        open={isPatientSearchModalOpen}
        onCancel={() => {
          setIsPatientSearchModalOpen(false);
          setPatientSearchResults([]);
        }}
        footer={null}
        width={700}
      >
        <Input.Search
          placeholder="Tìm theo mã BN, họ tên, SĐT..."
          enterButton
          allowClear
          onSearch={handleSearchPatient}
          loading={loadingPatient}
          style={{ marginBottom: 16 }}
        />
        <Spin spinning={loadingPatient}>
          {patientSearchResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 16, color: '#999' }}>Nhập từ khóa để tìm kiếm bệnh nhân</div>
          ) : (
            <div>
              {patientSearchResults.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.patientCode} - {p.fullName}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {p.gender === 1 ? 'Nam' : 'Nữ'}
                      {p.dateOfBirth && ` - ${dayjs(p.dateOfBirth).format('DD/MM/YYYY')}`}
                    </div>
                    {p.phoneNumber && <div style={{ fontSize: 12, color: '#666' }}>SĐT: {p.phoneNumber}</div>}
                  </div>
                  <Button type="primary" size="small" onClick={() => handleSelectPatient(p)}>Chọn</Button>
                </div>
              ))}
            </div>
          )}
        </Spin>
      </Modal>

      {/* Template Modal */}
      <Modal
        title="Chọn mẫu đơn thuốc"
        open={isTemplateModalOpen}
        onCancel={() => setIsTemplateModalOpen(false)}
        footer={null}
        width={600}
      >
        <div>
          {prescriptionTemplates.map((template) => (
            <div key={template.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{template.name}</div>
                <div style={{ fontSize: 12, color: '#666' }}>Chẩn đoán: {template.diagnosis}</div>
              </div>
              <Button type="link" onClick={() => handleLoadTemplate(template)}>Tải mẫu</Button>
            </div>
          ))}
        </div>
      </Modal>

      {/* Save Template Modal */}
      <Modal
        title="Lưu mẫu đơn thuốc"
        open={isSaveTemplateModalOpen}
        onCancel={() => setIsSaveTemplateModalOpen(false)}
        onOk={async () => {
          if (!templateName.trim()) {
            message.error('Vui lòng nhập tên mẫu');
            return;
          }
          try {
            const dto: PrescriptionTemplateDto = {
              id: '',
              templateName: templateName,
              description: templateDiagnosis,
              templateType: 1,
              items: prescriptionItems.map(item => ({
                medicineId: item.medicine.id,
                quantity: item.quantity,
                days: item.duration,
                dosage: formatDosage(item.dosage),
                route: item.route,
                frequency: '',
                usageInstructions: item.notes || '',
                paymentType: item.medicine.insuranceCovered ? 1 : 2,
              })),
              isShared: false,
            };
            await examinationApi.createPrescriptionTemplate(dto);
            message.success('Đã lưu mẫu đơn thuốc');
            setIsSaveTemplateModalOpen(false);
            setTemplateName('');
            setTemplateDiagnosis('');
          } catch (error) {
            console.warn('Error saving template:', error);
            message.error('Lỗi khi lưu mẫu đơn thuốc');
          }
        }}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form layout="vertical">
          <Form.Item label="Tên mẫu" required>
            <Input placeholder="VD: Cảm cúm thông thường" value={templateName} onChange={e => setTemplateName(e.target.value)} />
          </Form.Item>
          <Form.Item label="Chẩn đoán" required>
            <Input placeholder="VD: Nhiễm khuẩn đường hô hấp trên" value={templateDiagnosis} onChange={e => setTemplateDiagnosis(e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Interaction Detail Drawer */}
      <Drawer
        title="Chi tiết tương tác thuốc"
        placement="right"
        onClose={() => setIsInteractionDrawerOpen(false)}
        open={isInteractionDrawerOpen}
        size={500}
      >
        {interactions.map((interaction) => (
          <Card key={`${interaction.medicine1}-${interaction.medicine2}`} style={{ marginBottom: 16 }} size="small">
            <Space orientation="vertical" style={{ width: '100%' }}>
              <div>
                <Tag
                  color={
                    interaction.severity === 'high'
                      ? 'red'
                      : interaction.severity === 'medium'
                      ? 'orange'
                      : 'blue'
                  }
                >
                  {interaction.severity === 'high'
                    ? 'Nghiêm trọng'
                    : interaction.severity === 'medium'
                    ? 'Trung bình'
                    : 'Nhẹ'}
                </Tag>
              </div>
              <Text strong>
                {interaction.medicine1} ↔ {interaction.medicine2}
              </Text>
              <div>
                <Text strong>Mô tả:</Text>
                <div>{interaction.description}</div>
              </div>
              {interaction.recommendation && (
                <div>
                  <Text strong>Khuyến nghị:</Text>
                  <div style={{ color: '#1890ff' }}>{interaction.recommendation}</div>
                </div>
              )}
            </Space>
          </Card>
        ))}

        {interactions.some(i => i.severity === 'high') && (
          <Card size="small" style={{ marginTop: 16 }}>
            <Text strong>Lý do ghi đè:</Text>
            <TextArea
              rows={3}
              placeholder="Nhập lý do cho việc tiếp tục kê đơn mặc dù có tương tác nghiêm trọng..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              style={{ marginTop: 8 }}
            />
            <Button
              type="primary"
              block
              style={{ marginTop: 8 }}
              disabled={!overrideReason}
              onClick={() => {
                message.success('Đã ghi nhận lý do ghi đè');
                setIsInteractionDrawerOpen(false);
                // Now trigger complete with override reason set
                handleCompletePrescription();
              }}
            >
              Xác nhận ghi đè
            </Button>
          </Card>
        )}
      </Drawer>

      {/* Digital Signature - PIN Entry Modal */}
      <PinEntryModal
        open={pinModalOpen}
        onSubmit={handlePinSubmit}
        onCancel={() => { setPinModalOpen(false); setPinError(''); }}
        loading={pinLoading}
        error={pinError}
      />
    </div>
  );
};

export default Prescription;
