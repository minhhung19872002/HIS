/* =====================================================================
 * EmrEditor v2 — full-screen hồ sơ bệnh án (native v2, ab-* design)
 * Ported from design-system bundle mod-emr-editor-v2.jsx.
 * 2-col: HSBA list (trái) · detail w/ 7 tabs (phải).
 * Mostly a viewer wired to real read APIs (examinationApi): getEmrRecords,
 * getPatientMedicalHistory, getMedicalRecordFull, getTreatmentSheets,
 * getConsultationRecords, getNursingCareSheets, getPatientAllergies.
 * No backend change. Replaces the v1 navigate('/emr') jump.
 * ===================================================================== */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { unwrapList, type MaybePaged } from '../../../utils/apiNormalize';
import {
  KpiStrip, StatusBadge, Btn, ActBtn, DataTable, TopTabs, DrawerShell, ModalShell,
  fmtDMYg, fmtDTg, tk, ti, te, tw, type ColumnDef, type TopTab,
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import apiClient from '../../../services/apiClient';
import { generateCdaDocument } from '../api/cda';
import {
  getAttachments, uploadAttachment, downloadAttachment, deleteAttachment,
  getCompletenessCheck, getAmendments,
  getPrintLogs, stampPrintLog, // #352: nhật ký in + đóng dấu (parity v1)
  type EmrDocumentAttachmentDto, type EmrCompletenessDto, type EmrAmendmentDto,
  type EmrPrintLogDto,
} from '../api/emrAdmin';
import {
  getPartographRecords, savePartographRecord, deletePartographRecord,
  getAnesthesiaRecords, saveAnesthesiaRecord, deleteAnesthesiaRecord,
  type PartographRecordDto, type PartographSaveDto,
  type AnesthesiaRecordDto, type AnesthesiaSaveDto,
} from '../api/clinicalRecord';
import EmrSigningChainDrawer from './EmrSigningChainDrawer';
import PatientFlagBanner from '../../patient/components/PatientFlagBanner';
// #352: parity v1 — Quản lý BA (6 tab con: chia sẻ/trích lục/gáy/hình ảnh/mã tắt/kiểm tra)
import EmrManagementTabs from '@/modules/patient/components/EmrManagementTabs';
import {
  getEmrRecords, type EmrRecordDto,
  getPatientMedicalHistory, type MedicalHistoryDto,
  getMedicalRecordFull, type MedicalRecordFullDto,
  getTreatmentSheets, createTreatmentSheet, type TreatmentSheetDto,
  getConsultationRecords, createConsultationRecord, type ConsultationRecordDto,
  getNursingCareSheets, createNursingCareSheet, type NursingCareSheetDto,
  type CreateMaternityLeaveDto,
} from '../../opd/api/examination';
import { printTreatmentSheet as printInpatientTreatmentSheet } from '../../inpatient/api/inpatient';
import PrintTemplateRenderer from '../../patient/components/PrintTemplateRenderer';
import ClinicalTemplatePicker from '../../patient/components/ClinicalTemplatePicker';
import { TEMPLATE_TYPES } from '../../patient/api/clinicalTemplate';
import '../../../components/layout/terminal/ed-responsive.css';
import { MAX_UPLOAD_MB, MAX_UPLOAD_BYTES } from '../../../config/app.config';

type TabKey = 'record' | 'history' | 'treatment' | 'consult' | 'nursing' | 'reaction' | 'partograph' | 'anesthesia' | 'amendment' | 'attach' | 'printlog' | 'management';
const TABS: TopTab<TabKey>[] = [
  { v: 'record', l: 'Hồ sơ BA', ic: 'folder' },
  { v: 'history', l: 'Lịch sử khám', ic: 'clock' },
  { v: 'treatment', l: 'Phiếu điều trị', ic: 'pill' },
  { v: 'consult', l: 'Hội chẩn', ic: 'user' },
  { v: 'nursing', l: 'Chăm sóc ĐD', ic: 'heart' },
  { v: 'reaction', l: 'Phản ứng thuốc', ic: 'alert' },
  { v: 'partograph', l: 'Biểu đồ chuyển dạ', ic: 'activity' },
  { v: 'anesthesia', l: 'Phiếu gây mê', ic: 'zap' },
  { v: 'amendment', l: 'Nhật ký sửa BA', ic: 'edit-3' },
  { v: 'attach', l: 'Đính kèm', ic: 'file-text' },
  { v: 'printlog', l: 'Nhật ký in', ic: 'print' },      // #352: parity v1
  { v: 'management', l: 'Quản lý BA', ic: 'settings' }, // #352: parity v1
];

// Doc file -> base64 (bo phan prefix "data:...;base64,")
const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const res = reader.result as string;
    const comma = res.indexOf(',');
    resolve(comma >= 0 ? res.slice(comma + 1) : res);
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const fmtSize = (n: number) =>
  n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B';

const ATTACH_CATS = [
  { v: 'XN', l: 'Xét nghiệm' }, { v: 'CDHA', l: 'Chẩn đoán hình ảnh' },
  { v: 'BenhAn', l: 'Bệnh án' }, { v: 'GiayTo', l: 'Giấy tờ' }, { v: 'Khac', l: 'Khác' },
];

// #352: parity v1 — phiếu thử phản ứng thuốc (lưu local, chưa có backend endpoint)
type DrugTestRow = {
  id: string; date: string; drugName: string; dose: string; route: string;
  testTime: string; result: string; reactionDescription: string; tester: string; notes: string;
};
const DRUG_TEST_RESULTS = [
  { v: 'Negative', l: 'Âm tính' }, { v: 'Positive', l: 'Dương tính' }, { v: 'Unknown', l: 'Không xác định' },
];

// TT32/2023/TT-BYT + biểu mẫu lâm sàng bổ sung
type PrintFormEntry = { label: string; printType: string; group?: string };
const PRINT_FORMS: PrintFormEntry[] = [
  // ── Biểu mẫu hành chính / tổng kết ────────────────────────────────
  { group: 'Hành chính & tổng kết',    label: 'Tóm tắt bệnh án ra viện',         printType: 'summary' },
  { group: 'Hành chính & tổng kết',    label: 'Bệnh án tổng quát',               printType: 'finalsummary' },
  { group: 'Hành chính & tổng kết',    label: 'Phiếu khám bệnh (nhập viện)',      printType: 'admission' },
  { group: 'Hành chính & tổng kết',    label: 'Giấy ra viện',                     printType: 'discharge' },
  { group: 'Hành chính & tổng kết',    label: 'Giấy chuyển viện / chuyển tuyến', printType: 'referral' },
  { group: 'Hành chính & tổng kết',    label: 'Giấy xác nhận đang điều trị',      printType: 'treatment-confirm' },
  { group: 'Hành chính & tổng kết',    label: 'Giấy chứng nhận thương tích',      printType: 'injury-cert' },
  { group: 'Hành chính & tổng kết',    label: 'Giấy nghỉ dưỡng thai',             printType: 'maternity-leave' },

  // ── Phiếu điều trị & theo dõi (TT32 §36) ─────────────────────────
  { group: 'Điều trị & theo dõi',      label: 'Phiếu điều trị hàng ngày',        printType: 'treatment' },
  { group: 'Điều trị & theo dõi',      label: 'Phiếu tư vấn / hướng dẫn',        printType: 'counseling' },
  { group: 'Điều trị & theo dõi',      label: 'Phiếu diễn biến (ghi chú tiến triển)', printType: 'progress' },
  { group: 'Điều trị & theo dõi',      label: 'Phiếu chăm sóc điều dưỡng',       printType: 'nursing' },
  { group: 'Điều trị & theo dõi',      label: 'Phiếu đánh giá dinh dưỡng',        printType: 'nutrition' },
  { group: 'Điều trị & theo dõi',      label: 'Phiếu phân loại cấp cứu (Triage)', printType: 'ls-triage-assess' },
  { group: 'Điều trị & theo dõi',      label: 'Phiếu bàn giao chuyển khoa (BS)',  printType: 'ls-dept-transfer-doc' },
  { group: 'Điều trị & theo dõi',      label: 'Phiếu bàn giao chuyển khoa (ĐD)', printType: 'ls-dept-transfer-nurse' },
  { group: 'Điều trị & theo dõi',      label: 'Phiếu chuyển khoa / chuyển viện', printType: 'depttransfer' },

  // ── Phẫu thuật & gây mê (TT32 §6-7) ──────────────────────────────
  { group: 'Phẫu thuật & gây mê',      label: 'Phiếu phẫu thuật / thủ thuật',    printType: 'surgeryrecord' },
  { group: 'Phẫu thuật & gây mê',      label: 'Phiếu duyệt PT',                  printType: 'surgeryapproval' },
  { group: 'Phẫu thuật & gây mê',      label: 'Tổng kết PT',                      printType: 'surgerysummary' },
  { group: 'Phẫu thuật & gây mê',      label: 'Giấy chứng nhận PT/TT (MS.18)',    printType: 'ls-surgery-cert' },
  { group: 'Phẫu thuật & gây mê',      label: 'Phiếu khám tiền mê',              printType: 'preanesthetic' },
  { group: 'Phẫu thuật & gây mê',      label: 'Cam kết đồng ý PT/TT',            printType: 'consent' },
  { group: 'Phẫu thuật & gây mê',      label: 'Biên bản gây mê',                  printType: 'gayme-record' },
  { group: 'Phẫu thuật & gây mê',      label: 'Phiếu theo dõi gây mê',            printType: 'gayme-monitor' },
  { group: 'Phẫu thuật & gây mê',      label: 'Phiếu hồi tỉnh sau mê',            printType: 'gayme-recovery' },
  { group: 'Phẫu thuật & gây mê',      label: 'Phiếu đếm gạc / dụng cụ',          printType: 'gauze-count' },

  // ── Cận lâm sàng: port nhóm phiếu CĐHA/TDCN/XN từ v1 sang v2 (quyết định #204 — v1
  //    ngừng phát triển, tính năng còn thiếu thì PORT). Kèm 3 phiếu XN mới của NangCap27
  //    (HSMT 13.1.27 huyết-tủy đồ · 13.1.29 sinh thiết tủy xương · 13.1.30 nước dịch).
  { group: 'Cận lâm sàng',             label: 'CĐHA · X-quang',                   printType: 'cdha-xray' },
  { group: 'Cận lâm sàng',             label: 'CĐHA · CT Scanner',                printType: 'cdha-ct' },
  { group: 'Cận lâm sàng',             label: 'CĐHA · MRI',                       printType: 'cdha-mri' },
  { group: 'Cận lâm sàng',             label: 'CĐHA · Siêu âm',                   printType: 'cdha-ultrasound' },
  { group: 'Cận lâm sàng',             label: 'CĐHA · Điện tâm đồ',               printType: 'cdha-ecg' },
  { group: 'Cận lâm sàng',             label: 'TDCN · Điện não đồ',               printType: 'tdcn-eeg' },
  { group: 'Cận lâm sàng',             label: 'TDCN · Nội soi',                   printType: 'tdcn-endoscopy' },
  { group: 'Cận lâm sàng',             label: 'TDCN · Chức năng hô hấp',          printType: 'tdcn-pft' },
  { group: 'Cận lâm sàng',             label: 'XN · Tổng quát',                   printType: 'xn-general' },
  { group: 'Cận lâm sàng',             label: 'XN · Huyết học',                   printType: 'xn-hematology' },
  { group: 'Cận lâm sàng',             label: 'XN · Sinh hóa',                    printType: 'xn-biochemistry' },
  { group: 'Cận lâm sàng',             label: 'XN · Vi sinh',                     printType: 'xn-microbiology' },
  { group: 'Cận lâm sàng',             label: 'XN · Đông cầm máu',                printType: 'xn-coagulation' },
  { group: 'Cận lâm sàng',             label: 'XN · Nước tiểu / phân / dịch',     printType: 'xn-urinalysis' },
  { group: 'Cận lâm sàng',             label: 'XN · Huyết - tủy đồ',              printType: 'xn-myelogram' },
  { group: 'Cận lâm sàng',             label: 'XN · Sinh thiết tủy xương',        printType: 'xn-bonemarrow' },
  { group: 'Cận lâm sàng',             label: 'XN · Nước dịch',                   printType: 'xn-bodyfluid' },

  // ── Vật tư & hóa chất (NangCap26 phiếu in #98 · NangCap27 HSMT 13.1.95-96) ──
  { group: 'Vật tư & hóa chất',        label: 'Phiếu lĩnh hóa chất',              printType: 'chemical-issue' },
  { group: 'Vật tư & hóa chất',        label: 'BB thanh lý thuốc/HC/VTYT',        printType: 'pharmacy-disposal' },
  { group: 'Vật tư & hóa chất',        label: 'BB xác nhận mất/hỏng/vỡ',          printType: 'pharmacy-damage' },

  // ── Bệnh án nội trú chuyên khoa (TT32 mẫu 1-20) ───────────────────
  { group: 'BA chuyên khoa nội trú',   label: 'BA Nội khoa',                      printType: 'sp-noikhoa' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Nhi khoa',                      printType: 'pediatric' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Truyền nhiễm',                  printType: 'sp-truyennhiem' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Phụ khoa',                      printType: 'sp-phukhoa' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Sản khoa',                      printType: 'obstetrics' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Sơ sinh',                       printType: 'neonatal' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Tâm thần',                      printType: 'sp-tamthan' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Da liễu',                       printType: 'sp-dalieu' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Huyết học - Truyền máu',        printType: 'sp-huyethoc' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Ngoại khoa',                    printType: 'sp-ngoaikhoa' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Bỏng',                          printType: 'sp-bong' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Ung bướu',                      printType: 'sp-ungbuou' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Răng hàm mặt (nội trú)',        printType: 'sp-rhm' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Tai mũi họng',                  printType: 'sp-tmh' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA YHCT nội trú',                  printType: 'sp-yhctnoidru' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Nhi YHCT',                      printType: 'sp-nhiyhct' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Mắt chấn thương / tổng quát',   printType: 'sp-matchung' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Mắt bán phần trước',            printType: 'sp-matvmcb' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Mắt đáy mắt / đục TTT',        printType: 'sp-matducttt' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Mắt Glaucoma',                  printType: 'sp-matglocom' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Mắt sụp mi / lác',             printType: 'sp-matleo' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Mắt trẻ em',                    printType: 'sp-matkxt' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Phục hồi chức năng',            printType: 'sp-phcn' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA PHCN nhi',                      printType: 'sp-phcnnhi' },
  // NangCap27 — HSMT 13.1.58-59
  { group: 'BA chuyên khoa nội trú',   label: 'BA Phá thai',                      printType: 'sp-phathai' },
  { group: 'BA chuyên khoa nội trú',   label: 'BA Bệnh tay chân miệng',           printType: 'sp-taychanmieng' },

  // ── Bệnh án ngoại trú chuyên khoa (TT32 mẫu 15-17, 19, 29) ────────
  { group: 'BA chuyên khoa ngoại trú', label: 'BA Ngoại trú chung',               printType: 'sp-ngoaitru' },
  { group: 'BA chuyên khoa ngoại trú', label: 'BA Ngoại trú RHM',                 printType: 'sp-ngoaitrurhm' },
  { group: 'BA chuyên khoa ngoại trú', label: 'BA Tuyến xã / phường',             printType: 'sp-tuyenxa' },
  { group: 'BA chuyên khoa ngoại trú', label: 'BA YHCT ngoại trú',                printType: 'sp-yhctngoaitru' },
  { group: 'BA chuyên khoa ngoại trú', label: 'BA PHCN ngoại trú',                printType: 'sp-phcnngoaitru' },
  { group: 'BA chuyên khoa ngoại trú', label: 'Phiếu khám CK / chuyên khoa',     printType: 'sp-phieuchuyenkhoa' },
  { group: 'BA chuyên khoa ngoại trú', label: 'Giấy KCB theo yêu cầu',           printType: 'sp-giaykhamsuckhoe' },

  // ── Kiểm thảo & sự cố y khoa ──────────────────────────────────────
  { group: 'Kiểm thảo & sự cố',        label: 'Biên bản kiểm thảo tử vong (MS.19)', printType: 'ls-death-review' },
  { group: 'Kiểm thảo & sự cố',        label: 'Phiếu đánh giá tử vong',              printType: 'deathreview' },

  // ── Điều dưỡng chuyên biệt (DD-01…DD-21) ──────────────────────────
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-01 · Kế hoạch chăm sóc',          printType: 'dd01-careplan' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-02 · Chăm sóc ICU',               printType: 'dd02-icucare' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-03 · Lượng giá điều dưỡng',       printType: 'dd03-assessment' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-04 · Chăm sóc hằng ngày',         printType: 'dd04-dailycare' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-05 · Theo dõi truyền dịch',       printType: 'dd05-infusion' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-06 · Truyền máu (XN)',             printType: 'dd06-bloodlab' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-07 · Truyền máu (lâm sàng)',      printType: 'dd07-bloodclinical' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-08 · Theo dõi sinh hiệu',         printType: 'dd08-vitalsigns' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-09 · Công khai DV-Thuốc',         printType: 'dd09-meddisclosure' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-10 · Chuẩn bị trước mổ',         printType: 'dd10-preop' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-11 · Tiêu chí nhận ICU',          printType: 'dd11-icutransfer' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-12 · Bàn giao chuyển khoa (ĐD)',  printType: 'dd12-nursetransfer' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-13 · Tiền sản giật',              printType: 'dd13-preeclampsia' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-14 · Bàn giao nội trú',          printType: 'dd14-ipdhandover' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-15 · Bàn giao phòng mổ',         printType: 'dd15-orhandover' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-16 · An toàn phẫu thuật',         printType: 'dd16-safetychecklist' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-17 · Theo dõi đường huyết',       printType: 'dd17-glucose' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-18 · Nguy cơ thai kỳ',           printType: 'dd18-pregnancyrisk' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-19 · Đánh giá nuốt',              printType: 'dd19-swallowing' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-20 · Lưu tài liệu',              printType: 'dd20-docscan' },
  { group: 'Điều dưỡng chuyên biệt',   label: 'DD-21 · Theo dõi VAP',              printType: 'dd21-vap' },
  // NangCap27 — HSMT 18.3.21 (khoa/phòng cấp cứu)
  { group: 'Điều dưỡng chuyên biệt',   label: 'Theo dõi ôxy liệu pháp',            printType: 'oxygen-monitor' },

  // ── BHYT & thanh toán ─────────────────────────────────────────────
  { group: 'BHYT & thanh toán',         label: 'Tổng hợp thanh toán',               printType: 'finalsummary' },
];

const EmrEditorV2: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectDone = useRef(false); // chỉ auto-chọn 1 lần theo ?patientId=
  const [leftOpen, setLeftOpen] = useState(false);

  const [records, setRecords] = useState<EmrRecordDto[]>([]);
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<EmrRecordDto | null>(null);
  const [tab, setTab] = useState<TabKey>('record');

  const [examId, setExamId] = useState<string | null>(null);
  const [full, setFull] = useState<MedicalRecordFullDto | null>(null);
  const [timeline, setTimeline] = useState<MedicalHistoryDto[]>([]);
  const [treatments, setTreatments] = useState<TreatmentSheetDto[]>([]);
  const [consults, setConsults] = useState<ConsultationRecordDto[]>([]);
  const [nursing, setNursing] = useState<NursingCareSheetDto[]>([]);
  const [attachments, setAttachments] = useState<EmrDocumentAttachmentDto[]>([]);
  const [attachCat, setAttachCat] = useState('');
  const [attachBusy, setAttachBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [printOpen, setPrintOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printPreviewType, setPrintPreviewType] = useState('summary');
  const printPreviewRef = useRef<HTMLDivElement>(null);
  // Maternity leave form input state
  const [maternityLeaveDto, setMaternityLeaveDto] = useState<CreateMaternityLeaveDto | undefined>(undefined);
  const [maternityLeaveModalOpen, setMaternityLeaveModalOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  // Trình ký nhiều cấp + trạng thái khóa TT46 (plan-emr-signing-chain)
  const [chainOpen, setChainOpen] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [completeness, setCompleteness] = useState<EmrCompletenessDto | null>(null);
  const [modal, setModal] = useState<null | 'treatment' | 'consult' | 'nursing'>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [tplPickerOpen, setTplPickerOpen] = useState(false);
  const [printingTreatId, setPrintingTreatId] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  // Multi-select in tờ điều trị
  const [selectedTreatIds, setSelectedTreatIds] = useState<Set<string>>(new Set());
  const [printingAllTreat, setPrintingAllTreat] = useState(false);

  // ── Partograph state ─────────────────────────────────────────────
  const [partographs, setPartographs] = useState<PartographRecordDto[]>([]);
  const [ptgOpen, setPtgOpen] = useState(false);
  const [ptgForm, setPtgForm] = useState<Partial<PartographSaveDto>>({});
  const [ptgSaving, setPtgSaving] = useState(false);

  // ── Anesthesia state ─────────────────────────────────────────────
  const [anesRecords, setAnesRecords] = useState<AnesthesiaRecordDto[]>([]);
  const [anesOpen, setAnesOpen] = useState(false);
  const [anesForm, setAnesForm] = useState<Partial<AnesthesiaSaveDto>>({});
  const [anesSaving, setAnesSaving] = useState(false);

  // ── Amendment audit-log ──────────────────────────────────────────
  const [amendments, setAmendments] = useState<EmrAmendmentDto[]>([]);

  // ── #352: Nhật ký in ấn (parity v1) ──────────────────────────────
  const [printLogs, setPrintLogs] = useState<EmrPrintLogDto[]>([]);

  // ── #352: Phiếu thử phản ứng thuốc (parity v1 — local state) ─────
  const [drugTests, setDrugTests] = useState<DrugTestRow[]>([]);
  const [drugTestOpen, setDrugTestOpen] = useState(false);
  const [drugTestForm, setDrugTestForm] = useState<Record<string, string>>({});
  const drugTestSeq = useRef(0);

  const openCreate = (kind: 'treatment' | 'consult' | 'nursing') => {
    if (!examId) { tw('Chưa có lần khám để thêm phiếu'); return; }
    setForm({ date: new Date().toISOString().slice(0, 10) });
    setModal(kind);
  };
  const fld = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  // #352: field setter cho form phiếu thử phản ứng thuốc
  const dtf = (k: string, v: string) => setDrugTestForm((p) => ({ ...p, [k]: v }));

  /** Mở preview biểu mẫu in trong DrawerShell */
  const openPrintForm = (printType: string) => {
    if (!full) { tw('Chọn bệnh nhân và tải đủ dữ liệu HSBA trước khi in'); return; }
    if (printType === 'maternity-leave') {
      // Cần nhập thêm thông tin dưỡng thai trước khi xem trước
      setMaternityLeaveDto({
        days: 0,
        fromDate: new Date().toISOString().slice(0, 10),
        toDate: new Date().toISOString().slice(0, 10),
        gestationalWeeks: undefined,
        reason: '',
      });
      setMaternityLeaveModalOpen(true);
      return;
    }
    setPrintPreviewType(printType);
    setPrintPreviewOpen(true);
  };

  /** Kích window.print() — chỉ in vùng có class emr-print-container */
  const handleDoPrint = () => {
    window.print();
  };

  // ── Load EMR list ────────────────────────────────────────────────
  const loadList = useCallback(async (kw?: string) => {
    try {
      const r = await getEmrRecords(kw || undefined, 1, 300);
      // `/examination/emr-records` trả PAGED `{items,totalCount}`; interceptor đã bóc
      // envelope nên `r.data` là object đó, KHÔNG phải mảng → check Array.isArray
      // luôn false và danh sách rỗng dù API có dữ liệu. Dùng helper tolerant 2 shape.
      setRecords(unwrapList<EmrRecordDto>(r.data as MaybePaged<EmrRecordDto>));
    } catch { setRecords([]); }
  }, []);
  useEffect(() => { loadList(); }, [loadList]);

  // ── Select patient → derive latest exam + load detail ───────────
  const selectRecord = useCallback(async (rec: EmrRecordDto) => {
    setSel(rec);
    setLeftOpen(false);
    setTab('record');
    setFull(null); setExamId(null); setTreatments([]); setConsults([]); setNursing([]);
    setAttachments([]);
    setPrintLogs([]); setDrugTests([]); // #352: tránh lẫn dữ liệu BN cũ (an toàn BN)
    let hist: MedicalHistoryDto[] = [];
    try {
      const h = await getPatientMedicalHistory(rec.patientId, 30);
      hist = Array.isArray(h.data) ? h.data : [];
    } catch { /* no history */ }
    setTimeline(hist);
    const id = hist[0]?.examinationId ?? null;
    setExamId(id);
    if (!id) return;
    const [f, t, c, n] = await Promise.allSettled([
      getMedicalRecordFull(id),
      getTreatmentSheets(id),
      getConsultationRecords(id),
      getNursingCareSheets(id),
    ]);
    if (f.status === 'fulfilled' && f.value.data) setFull(f.value.data);
    if (t.status === 'fulfilled' && Array.isArray(t.value.data)) setTreatments(t.value.data);
    if (c.status === 'fulfilled' && Array.isArray(c.value.data)) setConsults(c.value.data);
    if (n.status === 'fulfilled' && Array.isArray(n.value.data)) setNursing(n.value.data);
  }, []);

  // Trạng thái khóa TT46 của HSBA đang chọn (badge 🔒 + drawer trình ký)
  const refreshFinalized = useCallback(async () => {
    if (!full?.id) { setFinalized(false); setCompleteness(null); return; }
    const c = await getCompletenessCheck(full.id);
    setFinalized(!!c?.isFinalized);
    setCompleteness(c);
  }, [full?.id]);
  useEffect(() => { void refreshFinalized(); }, [refreshFinalized]);

  // Deep-link từ màn khác (vd LIS): /v2/emr/edit?patientId=… → auto mở hồ sơ BN đó
  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (!pid || preselectDone.current || records.length === 0) return;
    const rec = records.find((r) => r.patientId === pid);
    if (rec) { preselectDone.current = true; selectRecord(rec); }
  }, [records, searchParams, selectRecord]);

  const downloadBlob = (data: BlobPart, filename: string, mime: string) => {
    const url = window.URL.createObjectURL(new Blob([data], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    a.remove(); window.URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!examId) { tw('Chưa chọn HSBA có lần khám'); return; }
    try {
      const resp = await apiClient.get(`/pdf/emr/${examId}?format=pdf`, { responseType: 'blob' });
      downloadBlob(resp.data as BlobPart, `EMR_${sel?.patientCode || examId}.pdf`, 'application/pdf');
      tk('Đã xuất PDF');
    } catch { te('Không thể xuất PDF — dùng In biểu mẫu để lưu'); }
  };

  const exportXml = async () => {
    if (!sel) return;
    try {
      const r = await generateCdaDocument({ documentType: 1, patientId: sel.patientId, medicalRecordId: full?.id });
      const xml = r?.cdaXml;
      if (!xml) { ti('Đã tạo tài liệu CDA (chưa có nội dung XML để tải)'); return; }
      downloadBlob(xml, `CDA_${sel.patientCode}.xml`, 'application/xml');
      tk('Đã xuất CDA XML');
    } catch { te('Không thể xuất XML CDA'); }
  };

  const today = () => new Date().toISOString().slice(0, 10);
  const saveSheet = async () => {
    if (!examId) return;
    setSavingForm(true);
    try {
      if (modal === 'treatment') {
        await createTreatmentSheet({
          id: '', examinationId: examId, treatmentDate: form.date || today(),
          dayNumber: Number(form.dayNumber) || 1, dailyProgress: form.dailyProgress,
          treatmentOrders: form.treatmentOrders, doctorNotes: form.doctorNotes,
          medications: [], doctorId: '',
        });
        const r = await getTreatmentSheets(examId); setTreatments(Array.isArray(r.data) ? r.data : []);
      } else if (modal === 'consult') {
        await createConsultationRecord({
          id: '', examinationId: examId, consultationDate: form.date || today(),
          reason: form.reason || '', summary: form.summary || '', conclusion: form.conclusion || '',
          recommendations: form.recommendations || '', consultants: [],
          chairman: form.chairman, secretary: form.secretary,
        });
        const r = await getConsultationRecords(examId); setConsults(Array.isArray(r.data) ? r.data : []);
      } else if (modal === 'nursing') {
        await createNursingCareSheet({
          id: '', examinationId: examId, careDate: form.date || today(),
          shift: Number(form.shift) || 1, patientCondition: form.patientCondition,
          nursingAssessment: form.nursingAssessment, nursingInterventions: form.nursingInterventions,
          patientResponse: form.patientResponse, nurseId: '',
          careLevel: form.careLevel ? Number(form.careLevel) : undefined,
        });
        const r = await getNursingCareSheets(examId); setNursing(Array.isArray(r.data) ? r.data : []);
      }
      tk('Đã tạo phiếu'); setModal(null);
    } catch { te('Tạo phiếu thất bại'); }
    finally { setSavingForm(false); }
  };

  // ── Partograph / Anesthesia / Amendments — load when record selected ──────
  useEffect(() => {
    if (!sel?.patientId) { setPartographs([]); setAnesRecords([]); setAmendments([]); return; }
    const admId = sel.medicalRecordId || '';
    if (admId) getPartographRecords(admId).then((r) => setPartographs(Array.isArray(r.data) ? r.data : [])).catch(() => setPartographs([]));
    else setPartographs([]);
    getAnesthesiaRecords(sel.patientId).then((r) => setAnesRecords(Array.isArray(r.data) ? r.data : [])).catch(() => setAnesRecords([]));
    if (sel.medicalRecordId) getAmendments(sel.medicalRecordId).then(setAmendments).catch(() => setAmendments([]));
  }, [sel?.patientId, sel?.medicalRecordId]);

  // #352: parity v1 — nạp nhật ký in khi MỞ tab (id = medicalRecordId, fallback examId như v1)
  const printLogRecId = sel?.medicalRecordId || full?.id || examId;
  useEffect(() => {
    if (tab !== 'printlog') return;
    if (!printLogRecId) { setPrintLogs([]); return; }
    getPrintLogs(printLogRecId).then(setPrintLogs); // hàm đã unwrap sẵn → trả EmrPrintLogDto[]
  }, [tab, printLogRecId]);

  const savePartograph = async () => {
    const admId = sel?.medicalRecordId || '';
    if (!sel || !admId) { tw('HSBA này không có phiếu nội trú để ghi biểu đồ'); return; }
    if (!ptgForm.recordTime) { tw('Chọn thời điểm ghi'); return; }
    setPtgSaving(true);
    try {
      await savePartographRecord({ ...ptgForm, admissionId: admId, patientId: sel.patientId, patientName: sel.patientName } as PartographSaveDto);
      tk('Đã lưu điểm biểu đồ chuyển dạ');
      setPtgOpen(false); setPtgForm({});
      const r = await getPartographRecords(admId); setPartographs(Array.isArray(r.data) ? r.data : []);
    } catch { te('Lưu thất bại'); }
    finally { setPtgSaving(false); }
  };

  const saveAnesthesia = async () => {
    if (!sel || !anesForm.anesthesiaType) { tw('Nhập loại gây mê'); return; }
    setAnesSaving(true);
    try {
      await saveAnesthesiaRecord({ ...anesForm, surgeryId: anesForm.surgeryId || sel.medicalRecordId || '', patientId: sel.patientId, patientName: sel.patientName, asaClass: anesForm.asaClass || 1, mallampatiScore: anesForm.mallampatiScore || 1, anesthesiaType: anesForm.anesthesiaType || '', status: anesForm.status || 0, monitors: [], drugs: [], fluids: [] } as AnesthesiaSaveDto);
      tk('Đã lưu phiếu gây mê');
      setAnesOpen(false); setAnesForm({});
      const r = await getAnesthesiaRecords(sel.patientId); setAnesRecords(Array.isArray(r.data) ? r.data : []);
    } catch { te('Lưu thất bại'); }
    finally { setAnesSaving(false); }
  };

  // #352: đóng dấu 1 dòng nhật ký in → cập nhật state local (parity v1)
  const stampLog = async (r: EmrPrintLogDto) => {
    const ok = await stampPrintLog(r.id);
    if (ok) {
      setPrintLogs((prev) => prev.map((p) => (p.id === r.id ? { ...p, isStamped: true, stampedAt: new Date().toISOString() } : p)));
      tk('Đã đóng dấu');
    } else te('Đóng dấu thất bại');
  };

  // #352: parity v1 — phiếu thử lưu local, chưa có backend endpoint
  const saveDrugTest = () => {
    if (!drugTestForm.drugName?.trim()) { tw('Nhập tên thuốc'); return; }
    drugTestSeq.current += 1;
    setDrugTests((p) => [...p, {
      id: `drt-${drugTestSeq.current}`,
      date: drugTestForm.date || today(),
      drugName: drugTestForm.drugName.trim(),
      dose: drugTestForm.dose || '', route: drugTestForm.route || '',
      testTime: drugTestForm.testTime || '', result: drugTestForm.result || 'Negative',
      reactionDescription: drugTestForm.reactionDescription || '',
      tester: drugTestForm.tester || '', notes: drugTestForm.notes || '',
    }]);
    tk('Đã thêm phiếu thử phản ứng thuốc');
    setDrugTestOpen(false);
  };

  // ── Attachments (B3.4 so hoa HSBA — upload bytes vao DB blob) ─────
  const loadAttachments = useCallback(async (recordId: string) => {
    setAttachments(await getAttachments(recordId));
  }, []);
  useEffect(() => {
    if (full?.id) loadAttachments(full.id); else setAttachments([]);
  }, [full?.id, loadAttachments]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phep chon lai cung file
    if (!file) return;
    if (!full?.id) { tw('Chưa chọn HSBA có hồ sơ bệnh án'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { tw(`File vượt quá giới hạn ${MAX_UPLOAD_MB}MB`); return; }
    setAttachBusy(true);
    try {
      const contentBase64 = await fileToBase64(file);
      await uploadAttachment({
        medicalRecordId: full.id,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        contentBase64,
        documentCategory: attachCat || undefined,
      });
      tk('Đã đính kèm ' + file.name);
      await loadAttachments(full.id);
    } catch (err) {
      const msg = (err as { response?: { data?: unknown } })?.response?.data;
      te(typeof msg === 'string' && msg.trim() ? msg : 'Đính kèm thất bại');
    } finally { setAttachBusy(false); }
  };

  const onDownloadAttach = async (a: EmrDocumentAttachmentDto) => {
    const blob = await downloadAttachment(a.id);
    if (!blob) { te('Không tải được tệp (bản ghi cũ không có nội dung)'); return; }
    downloadBlob(blob, a.fileName, a.fileType || 'application/octet-stream');
  };

  // Xem inline (anh/PDF) trong tab moi qua object URL; loai khac thi tai ve.
  const onViewAttach = async (a: EmrDocumentAttachmentDto) => {
    const blob = await downloadAttachment(a.id);
    if (!blob) { te('Không xem được tệp (bản ghi cũ không có nội dung)'); return; }
    const typed = blob.type ? blob : new Blob([blob], { type: a.fileType || 'application/octet-stream' });
    const url = URL.createObjectURL(typed);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const isViewable = (t?: string) => !!t && (t.startsWith('image/') || t === 'application/pdf');

  const onDeleteAttach = async (a: EmrDocumentAttachmentDto) => {
    if (!window.confirm(`Xóa đính kèm "${a.fileName}"?`)) return;
    if (await deleteAttachment(a.id)) { tk('Đã xóa đính kèm'); if (full?.id) loadAttachments(full.id); }
    else te('Xóa đính kèm thất bại');
  };

  const attachCols: ColumnDef<EmrDocumentAttachmentDto>[] = [
    { key: 'name', label: 'Tên tệp', render: (r) => (
      <div className="cell-2l"><b>{r.fileName}</b><i>{r.fileType}{r.hasContent === false ? ' · bản ghi cũ (không có tệp)' : ''}</i></div>
    ) },
    { key: 'cat', label: 'Phân loại', width: 130, render: (r) => ATTACH_CATS.find((c) => c.v === r.documentCategory)?.l || r.documentCategory || '—' },
    { key: 'size', label: 'Dung lượng', mono: true, width: 100, render: (r) => fmtSize(r.fileSize) },
    { key: 'by', label: 'Người tải', width: 140, render: (r) => r.uploadedByName || '—' },
    { key: 'at', label: 'Thời gian', mono: true, width: 150, render: (r) => fmtDTg(r.uploadedAt) },
  ];

  // #352: cột nhật ký in ấn (parity v1 tab printlogs)
  const printLogCols: ColumnDef<EmrPrintLogDto>[] = [
    { key: 'type', label: 'Loại tài liệu', width: 130, render: (r) => r.documentType },
    { key: 'title', label: 'Tiêu đề', render: (r) => r.documentTitle },
    { key: 'by', label: 'Người in', width: 130, render: (r) => r.printedByName || '—' },
    { key: 'count', label: 'Lần in', width: 70, render: (r) => (
      // badge số lần in: cam nếu in lại (>1), xanh nếu in lần đầu
      <span style={{ display: 'inline-block', minWidth: 20, padding: '0 7px', borderRadius: 99, textAlign: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff', background: r.printCount > 1 ? '#fa8c16' : '#52c41a' }}>{r.printCount}</span>
    ) },
    { key: 'at', label: 'Ngày in', mono: true, width: 150, render: (r) => (r.printedAt ? fmtDTg(r.printedAt) : '—') },
    { key: 'stamp', label: 'Đóng dấu', width: 120, render: (r) => (r.isStamped
      ? <StatusBadge tone="ok">Đã đóng dấu</StatusBadge>
      : <Btn size="sm" variant="ghost" onClick={() => { void stampLog(r); }}>Đóng dấu</Btn>) },
  ];

  // #352: cột phiếu thử phản ứng thuốc (parity v1 tab drug-reaction)
  const drugTestCols: ColumnDef<DrugTestRow>[] = [
    { key: 'date', label: 'Ngày', mono: true, width: 100, render: (r) => fmtDMYg(r.date) },
    { key: 'drug', label: 'Thuốc', width: 150, render: (r) => <b>{r.drugName}</b> },
    { key: 'dose', label: 'Liều', width: 80, render: (r) => r.dose || '—' },
    { key: 'route', label: 'Đường dùng', width: 100, render: (r) => r.route || '—' },
    { key: 'time', label: 'Giờ thử', mono: true, width: 70, render: (r) => r.testTime || '—' },
    { key: 'result', label: 'Kết quả', width: 110, render: (r) => (
      <StatusBadge tone={r.result === 'Positive' ? 'crit' : r.result === 'Negative' ? 'ok' : 'warn'}>
        {DRUG_TEST_RESULTS.find((x) => x.v === r.result)?.l || r.result}
      </StatusBadge>
    ) },
    { key: 'reaction', label: 'Mô tả PƯ', render: (r) => r.reactionDescription || '—' },
    { key: 'tester', label: 'Người thử', width: 110, render: (r) => r.tester || '—' },
  ];

  const filtered = records.filter((r) =>
    !search || `${r.patientCode} ${r.patientName} ${r.lastDiagnosisName || ''}`.toLowerCase().includes(search.toLowerCase()));

  const activeCount = records.filter((r) => (r.allergies?.length ?? 0) > 0).length;

  // ── Tab renderers ────────────────────────────────────────────────

  const printTreatSheet = async (id: string) => {
    if (printingTreatId) return;
    setPrintingTreatId(id);
    try {
      const r = await printInpatientTreatmentSheet(id);
      const url = URL.createObjectURL(r.data as Blob);
      const w = window.open(url, '_blank');
      if (w) w.onload = () => URL.revokeObjectURL(url);
      else URL.revokeObjectURL(url);
    } catch {
      te('Không in được tờ điều trị');
    } finally {
      setPrintingTreatId(null);
    }
  };

  // In tuần tự tất cả phiếu đã chọn (mỗi phiếu mở 1 tab mới)
  const printAllSelected = async () => {
    if (selectedTreatIds.size === 0) { tw('Chưa chọn phiếu nào để in'); return; }
    if (printingAllTreat) return;
    setPrintingAllTreat(true);
    const ids = Array.from(selectedTreatIds);
    let failed = 0;
    for (const id of ids) {
      try {
        const r = await printInpatientTreatmentSheet(id);
        const url = URL.createObjectURL(r.data as Blob);
        const w = window.open(url, '_blank');
        if (w) w.onload = () => URL.revokeObjectURL(url);
        else URL.revokeObjectURL(url);
      } catch {
        failed++;
      }
    }
    setPrintingAllTreat(false);
    if (failed > 0) te(`Không in được ${failed}/${ids.length} phiếu`);
    else tk(`Đã mở ${ids.length} phiếu điều trị`);
  };

  const treatCols: ColumnDef<TreatmentSheetDto>[] = [
    { key: 'date', label: 'Ngày', mono: true, width: 110, render: (r) => fmtDMYg(r.treatmentDate) },
    { key: 'day', label: 'Ngày thứ', mono: true, width: 80, render: (r) => r.dayNumber },
    { key: 'orders', label: 'Y lệnh / diễn biến', render: (r) => <span style={{ fontSize: 'var(--fs-sm)' }}>{r.treatmentOrders || r.dailyProgress || '—'}</span> },
    { key: 'doctor', label: 'BS điều trị', width: 140, render: (r) => r.doctorName || '—' },
  ];
  const consultCols: ColumnDef<ConsultationRecordDto>[] = [
    { key: 'date', label: 'Thời gian', mono: true, width: 150, render: (r) => fmtDTg(r.consultationDate) },
    { key: 'reason', label: 'Lý do', render: (r) => r.reason },
    { key: 'conclusion', label: 'Kết luận', render: (r) => r.conclusion },
    { key: 'chairman', label: 'Chủ tọa', width: 140, render: (r) => r.chairman || '—' },
  ];
  const nursingCols: ColumnDef<NursingCareSheetDto>[] = [
    { key: 'date', label: 'Ngày', mono: true, width: 150, render: (r) => fmtDTg(r.careDate) },
    { key: 'shift', label: 'Ca', width: 70, render: (r) => (r.shift === 1 ? 'Sáng' : r.shift === 2 ? 'Chiều' : r.shift === 3 ? 'Tối' : `${r.shift}`) },
    { key: 'careLevel', label: 'Cấp CS', width: 90, render: (r) => (r.careLevel === 1 ? 'Cấp 1' : r.careLevel === 2 ? 'Cấp 2' : '—') },
    { key: 'interv', label: 'Can thiệp chăm sóc', render: (r) => r.nursingInterventions || r.patientCondition || '—' },
    { key: 'nurse', label: 'ĐD phụ trách', width: 140, render: (r) => r.nurseName || '—' },
  ];

  const v = full?.vitalSigns;

  return (
    <div className="ab ed-root" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <KpiStrip items={[
          { lbl: 'HSBA đang chọn', val: sel?.patientName || '—', sub: sel?.patientCode || '' },
          { lbl: 'Khoa/Phòng', val: sel?.lastRoomName || '—' },
          { lbl: 'Số lần khám', val: sel?.visitCount ?? '—', tone: 'info' },
          { lbl: 'Tổng HSBA', val: records.length, sub: `${activeCount} có dị ứng` },
          { lbl: 'Phiếu điều trị', val: treatments.length, tone: 'ok' },
        ]} />
      </div>

      {/* List */}
      <aside className={'ed-left-panel ' + (leftOpen ? 'is-open' : '')} style={{ borderRight: '1px solid var(--line)', background: 'var(--d-1)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: 'var(--space-10)', borderBottom: '1px solid var(--line)' }}>
          <div className="ab-search ab-u-wfull">
            <TermIcon name="search" size={13} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã BN / tên / chẩn đoán…" />
          </div>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          {filtered.length === 0 && <div style={{ padding: 'var(--space-16)', color: 'var(--t-3)', fontSize: 11.5, textAlign: 'center' }}>Không có hồ sơ</div>}
          {filtered.map((r) => {
            const isSel = r.patientId === sel?.patientId;
            return (
              <div key={r.patientId} onClick={() => selectRecord(r)} style={{ padding: '10px 12px', borderBottom: '1px solid var(--line-soft)', background: isSel ? 'var(--c-pri-bg, rgba(37,99,235,.12))' : 'transparent', borderLeft: isSel ? '3px solid var(--c-pri, var(--a-cy))' : '3px solid transparent', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: 'var(--fs-xs)', fontWeight: 700 }}>{r.patientCode}</span>
                  {r.visitCount > 0 && <StatusBadge tone="info">{r.visitCount} lần</StatusBadge>}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 'var(--space-4)' }}>{r.patientName}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-2)' }}>{r.lastRoomName || '—'} · {r.lastVisit ? fmtDMYg(r.lastVisit) : '—'}</div>
                {r.lastDiagnosisName && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-1)', marginTop: 'var(--space-3)', fontFamily: 'var(--font-mono)' }}>{r.lastDiagnosisCode ? `${r.lastDiagnosisCode} · ` : ''}{r.lastDiagnosisName}</div>}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Detail */}
      <main style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {!sel ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--t-3)' }}>
            <div style={{ textAlign: 'center' }}>
              <TermIcon name="folder" size={32} />
              <div style={{ marginTop: 'var(--space-12)', fontWeight: 600, color: 'var(--t-2)' }}>Chọn HSBA ở bảng trái để xem</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-8)' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                  {sel.patientName}
                  {finalized && <StatusBadge tone="crit">🔒 ĐÃ KHÓA (TT46)</StatusBadge>}
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{sel.patientCode} · {sel.lastRoomName || '—'} · {sel.lastVisit ? fmtDMYg(sel.lastVisit) : '—'}{full?.medicalRecordCode ? ` · ${full.medicalRecordCode}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                <Btn variant="ghost" onClick={exportXml}><TermIcon name="download" size={12} /> XML</Btn>
                <Btn variant="ghost" onClick={exportPdf}><TermIcon name="download" size={12} /> PDF</Btn>
                <Btn variant="ghost" onClick={() => setPrintOpen(true)}><TermIcon name="print" size={12} /> In biểu mẫu</Btn>
                <Btn variant="ghost" onClick={() => setChainOpen(true)}><TermIcon name="send" size={12} /> Trình ký</Btn>
                <Btn variant="primary" onClick={() => setSignOpen(true)}><TermIcon name="check" size={12} /> Ký số</Btn>
              </div>
            </div>

            {/* #357 patient-safety: khôi phục cờ cảnh báo BN (parity v1 EMR) */}
            <PatientFlagBanner patientId={sel.patientId} patientName={sel.patientName} />

            <TopTabs tab={tab} setTab={setTab} tabs={TABS} />

            <div style={{ overflow: 'auto', flex: 1, padding: 'var(--space-16)' }}>
              {tab === 'record' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-14)' }}>
                  <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-14)' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Thông tin BN</h4>
                    <Field lbl="Họ tên">{full?.patient?.fullName || sel.patientName}</Field>
                    <Field lbl="Mã BN"><span className="mono">{sel.patientCode}</span></Field>
                    <Field lbl="Giới · Tuổi">{sel.gender === 1 ? 'Nam' : 'Nữ'}{sel.age != null ? ` · ${sel.age}T` : ''}</Field>
                    <Field lbl="Khoa/Phòng">{sel.lastRoomName || '—'}</Field>
                    <Field lbl="BHYT"><span className="mono">{sel.insuranceNumber || '—'}</span></Field>
                    {(sel.chronicDiseases?.length ?? 0) > 0 && <Field lbl="Bệnh mạn">{sel.chronicDiseases.join(', ')}</Field>}
                  </section>
                  <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-14)' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Sinh hiệu</h4>
                    {v ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-8)', fontSize: 'var(--fs-sm)' }}>
                        {[['Mạch', v.pulse, 'l/p'], ['Nhiệt', v.temperature, '°C'], ['HA', v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : undefined, ''], ['Nhịp thở', v.respiratoryRate, 'l/p'], ['SpO₂', v.spO2, '%'], ['Cân', v.weight, 'kg'], ['Cao', v.height, 'cm'], ['BMI', v.bmi, '']].map((x, i) => (
                          <div key={i} style={{ padding: 'var(--space-8)', background: 'var(--d-1)', borderRadius: 4 }}>
                            <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>{x[0] as string}</div>
                            <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{x[1] ?? '—'} <span style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-3)' }}>{x[2] as string}</span></div>
                          </div>
                        ))}
                      </div>
                    ) : <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Chưa có dữ liệu sinh hiệu</div>}
                  </section>
                  <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-14)', gridColumn: '1 / -1' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Bệnh sử · Khám lâm sàng · Chẩn đoán</h4>
                    <div style={{ fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {full?.interview?.historyOfPresentIllness && <p><b>Bệnh sử:</b> {full.interview.historyOfPresentIllness}</p>}
                      {full?.physicalExam?.generalAppearance && <p><b>Khám:</b> {full.physicalExam.generalAppearance}</p>}
                      {(full?.diagnoses?.length ?? 0) > 0 && <p><b>Chẩn đoán:</b> {full!.diagnoses.map((d) => `${d.icdCode} · ${d.icdName}${d.isPrimary ? ' (chính)' : ''}`).join('; ')}</p>}
                      {!full?.interview?.historyOfPresentIllness && !full?.physicalExam?.generalAppearance && (full?.diagnoses?.length ?? 0) === 0 && <span className="ab-u-faint">Chưa có nội dung bệnh án</span>}
                    </div>
                  </section>

                  {/* ── Completeness check (parity v1 #407) ── */}
                  {completeness && (
                    <section style={{ gridColumn: '1 / -1', background: 'var(--d-0)', border: `1px solid ${completeness.isComplete ? 'var(--s-ok-bd)' : 'var(--s-warn-bd)'}`, borderRadius: 'var(--r-3)', padding: 'var(--space-14)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: completeness.missingDocumentNames.length > 0 ? 'var(--space-10)' : 0 }}>
                        <h4 style={{ margin: 0, fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Kiểm tra hoàn thiện HSBA</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)' }}>
                          <div style={{ height: 6, width: 120, background: 'var(--d-2)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${completeness.completenessPercent}%`, background: completeness.isComplete ? 'var(--s-ok)' : 'var(--s-warn)', borderRadius: 99, transition: 'width .3s' }} />
                          </div>
                          <StatusBadge tone={completeness.isComplete ? 'ok' : 'warn'}>
                            {completeness.completenessPercent}% ({completeness.signedDocuments}/{completeness.totalDocuments})
                          </StatusBadge>
                          {finalized && <StatusBadge tone="crit">🔒 Đã khóa TT46</StatusBadge>}
                        </div>
                      </div>
                      {completeness.missingDocumentNames.length > 0 && (
                        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--s-warn-text, #92400e)', background: 'var(--s-warn-bg)', border: '1px solid var(--s-warn-bd)', borderRadius: 'var(--r-2)', padding: 'var(--space-8) var(--space-12)' }}>
                          <b>Thiếu {completeness.missingRequiredDocuments} biểu mẫu bắt buộc:</b>{' '}
                          {completeness.missingDocumentNames.join(' · ')}
                        </div>
                      )}
                    </section>
                  )}
                </div>
              )}

              {tab === 'history' && (
                <div style={{ position: 'relative', paddingLeft: 30, maxWidth: 900 }}>
                  <div style={{ position: 'absolute', left: 9, top: 6, bottom: 6, width: 2, background: 'var(--line)' }} />
                  {timeline.length === 0 && <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Chưa có lịch sử khám</div>}
                  {timeline.map((e, i) => (
                    <div key={i} style={{ position: 'relative', paddingBottom: 'var(--space-18)' }}>
                      <div style={{ position: 'absolute', left: -25, top: 6, width: 12, height: 12, borderRadius: 'var(--r-2)', background: 'var(--s-info)', border: '2px solid var(--d-0)', boxShadow: '0 0 0 3px #0284c733' }} />
                      <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 'var(--space-12)', borderLeft: '3px solid var(--s-info)', cursor: 'pointer' }}
                        onClick={() => navigate(`/v2/opd/edit`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                          <span style={{ fontWeight: 700, fontSize: 12.5 }}>{e.diagnosisName || e.conclusionTypeName || 'Lần khám'}</span>
                          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{fmtDTg(e.examinationDate)}</span>
                        </div>
                        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{e.roomName || ''}{e.doctorName ? ` · ${e.doctorName}` : ''}{e.diagnosisCode ? ` · ${e.diagnosisCode}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'treatment' && (
                <div>
                  <div style={{ marginBottom: 'var(--space-12)', display: 'flex', gap: 'var(--space-8)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Btn variant="primary" onClick={() => openCreate('treatment')}><TermIcon name="plus" size={12} /> Tạo phiếu điều trị</Btn>
                    {treatments.length > 0 && (
                      <>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: 'var(--fs-sm)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedTreatIds.size === treatments.length && treatments.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedTreatIds(new Set(treatments.map((t) => t.id)));
                              else setSelectedTreatIds(new Set());
                            }}
                          />
                          Chọn tất cả ({treatments.length})
                        </label>
                        {selectedTreatIds.size > 0 && (
                          <Btn
                            variant="ghost"
                            disabled={printingAllTreat}
                            onClick={() => { void printAllSelected(); }}
                          >
                            <TermIcon name="printer" size={12} />
                            {printingAllTreat ? 'Đang in…' : `In ${selectedTreatIds.size} phiếu`}
                          </Btn>
                        )}
                      </>
                    )}
                  </div>
                  <DataTable<TreatmentSheetDto>
                    columns={treatCols}
                    data={treatments}
                    rowKey={(r) => r.id}
                    empty="Chưa có phiếu điều trị"
                    actions={(r) => (
                      <div className="ab-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
                        <input
                          type="checkbox"
                          checked={selectedTreatIds.has(r.id)}
                          onChange={(e) => {
                            const next = new Set(selectedTreatIds);
                            if (e.target.checked) next.add(r.id);
                            else next.delete(r.id);
                            setSelectedTreatIds(next);
                          }}
                        />
                        <ActBtn
                          ic="printer"
                          title="In tờ điều trị"
                          onClick={() => { void printTreatSheet(r.id); }}
                        />
                      </div>
                    )}
                  />
                </div>
              )}

              {tab === 'consult' && (
                <div>
                  <div style={{ marginBottom: 'var(--space-12)' }}><Btn variant="primary" onClick={() => openCreate('consult')}><TermIcon name="plus" size={12} /> Đề xuất hội chẩn</Btn></div>
                  <DataTable<ConsultationRecordDto> columns={consultCols} data={consults} rowKey={(r) => r.id} empty="Chưa có biên bản hội chẩn" />
                </div>
              )}

              {tab === 'nursing' && (
                <div>
                  <div style={{ marginBottom: 'var(--space-12)' }}><Btn variant="primary" onClick={() => openCreate('nursing')}><TermIcon name="plus" size={12} /> Phiếu chăm sóc</Btn></div>
                  <DataTable<NursingCareSheetDto> columns={nursingCols} data={nursing} rowKey={(r) => r.id} empty="Chưa có phiếu chăm sóc" />
                  {nursing.length > 0 && (
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-6)' }}>
                      In phiếu chăm sóc: chọn <b>In biểu mẫu</b> → Phiếu chăm sóc Cấp 1 hoặc Cấp 2 tương ứng.
                    </div>
                  )}
                </div>
              )}

              {tab === 'reaction' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-14)' }}>
                  <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-14)' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 'var(--fs-sm)' }}>Phản ứng thuốc / Dị ứng đã ghi nhận</h4>
                    {(full?.allergies?.length ?? 0) === 0
                      ? <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Không có dị ứng ghi nhận</div>
                      : (
                        <div style={{ padding: 'var(--space-10)', background: 'var(--s-crit-bg)', border: '1px solid var(--s-crit-bd)', borderRadius: 'var(--r-2)', color: '#7f1d1d', fontSize: 'var(--fs-sm)', lineHeight: 1.8 }}>
                          {full!.allergies.map((a) => (
                            <div key={a.id}><b>{a.allergenName}</b>{a.reaction ? ` — ${a.reaction}` : ''} · Mức độ: {a.severity === 3 ? 'Nặng' : a.severity === 2 ? 'Vừa' : 'Nhẹ'}</div>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* #352: parity v1 — phiếu thử phản ứng thuốc, lưu local, chưa có backend endpoint */}
                  <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-14)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-10)' }}>
                      <h4 style={{ margin: 0, fontSize: 'var(--fs-sm)', flex: 1 }}>Phiếu thử phản ứng thuốc</h4>
                      <Btn variant="primary" onClick={() => { setDrugTestForm({ date: today(), result: 'Negative' }); setDrugTestOpen(true); }}>
                        <TermIcon name="plus" size={12} /> Thêm phiếu thử
                      </Btn>
                    </div>
                    <DataTable<DrugTestRow>
                      columns={drugTestCols}
                      data={drugTests}
                      rowKey={(r) => r.id}
                      empty="Chưa có phiếu thử phản ứng thuốc"
                      actions={(r) => (
                        <div className="ab-actions">
                          <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => setDrugTests((p) => p.filter((x) => x.id !== r.id))} />
                        </div>
                      )}
                    />
                  </div>
                </div>
              )}

              {tab === 'partograph' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-10)' }}>
                    <h4 style={{ margin: 0, fontSize: 'var(--fs-sm)', flex: 1 }}>Biểu đồ chuyển dạ</h4>
                    <Btn variant="primary" disabled={!sel?.medicalRecordId} onClick={() => { setPtgForm({ recordTime: new Date().toISOString().slice(0, 16) }); setPtgOpen(true); }}>
                      <TermIcon name="plus" size={12} /> Thêm điểm
                    </Btn>
                  </div>
                  {!sel?.medicalRecordId && <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-10)' }}>Chỉ áp dụng cho HSBA có phiếu nội trú sản khoa.</div>}
                  <DataTable<PartographRecordDto>
                    columns={[
                      { key: 'recordTime', label: 'Thời điểm', render: (r) => fmtDTg(r.recordTime) },
                      { key: 'cervicalDilation', label: 'Mở CTC (cm)', render: (r) => r.cervicalDilation ?? '—' },
                      { key: 'fetalHeartRate', label: 'Tim thai (ck/p)', render: (r) => r.fetalHeartRate ?? '—' },
                      { key: 'contractionFrequency', label: 'Cơn co (ck/10p)', render: (r) => r.contractionFrequency ?? '—' },
                      { key: 'maternalPulse', label: 'Mạch mẹ', render: (r) => r.maternalPulse ?? '—' },
                      { key: 'systolicBP', label: 'HA (mmHg)', render: (r) => r.systolicBP ? `${r.systolicBP}/${r.diastolicBP ?? '?'}` : '—' },
                      { key: 'alertLine', label: 'Cảnh báo', render: (r) => r.alertLine ? <StatusBadge tone={r.alertLine === 'Action' ? 'crit' : r.alertLine === 'Alert' ? 'warn' : 'ok'}>{r.alertLineLabel || r.alertLine}</StatusBadge> : '—' },
                      { key: 'notes', label: 'Ghi chú', render: (r) => r.notes || '—' },
                    ] as ColumnDef<PartographRecordDto>[]}
                    data={partographs}
                    rowKey={(r) => r.id}
                    empty="Chưa có dữ liệu biểu đồ chuyển dạ"
                    actions={(r) => (
                      <div className="ab-actions">
                        <ActBtn ic="trash" title="Xóa" tone="crit" onClick={async () => {
                          await deletePartographRecord(r.id);
                          setPartographs((p) => p.filter((x) => x.id !== r.id));
                          tk('Đã xóa');
                        }} />
                      </div>
                    )}
                  />
                </div>
              )}

              {tab === 'anesthesia' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-10)' }}>
                    <h4 style={{ margin: 0, fontSize: 'var(--fs-sm)', flex: 1 }}>Phiếu gây mê · gây tê</h4>
                    <Btn variant="primary" onClick={() => { setAnesForm({ asaClass: 1, mallampatiScore: 1, status: 0, anesthesiaType: 'GeneralAnesthesia' }); setAnesOpen(true); }}>
                      <TermIcon name="plus" size={12} /> Tạo phiếu
                    </Btn>
                  </div>
                  <DataTable<AnesthesiaRecordDto>
                    columns={[
                      { key: 'createdAt', label: 'Ngày', render: (r) => r.createdAt ? fmtDTg(r.createdAt) : '—' },
                      { key: 'anesthesiaType', label: 'Loại gây mê' },
                      { key: 'asaClass', label: 'ASA', render: (r) => `ASA ${r.asaClass}` },
                      { key: 'mallampatiScore', label: 'Mallampati', render: (r) => `M${r.mallampatiScore}` },
                      { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge tone={r.status === 2 ? 'ok' : r.status === 1 ? 'warn' : 'info'}>{r.statusLabel || String(r.status)}</StatusBadge> },
                      { key: 'createdBy', label: 'BS gây mê', render: (r) => r.createdBy || '—' },
                    ] as ColumnDef<AnesthesiaRecordDto>[]}
                    data={anesRecords}
                    rowKey={(r) => r.id}
                    empty="Chưa có phiếu gây mê"
                    actions={(r) => (
                      <div className="ab-actions">
                        <ActBtn ic="trash" title="Xóa" tone="crit" onClick={async () => {
                          await deleteAnesthesiaRecord(r.id);
                          setAnesRecords((p) => p.filter((x) => x.id !== r.id));
                          tk('Đã xóa phiếu gây mê');
                        }} />
                      </div>
                    )}
                  />
                </div>
              )}

              {tab === 'amendment' && (
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: 'var(--fs-sm)' }}>Nhật ký sửa đổi bệnh án</h4>
                  {amendments.length === 0
                    ? <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Chưa có lần chỉnh sửa nào được ghi nhận</div>
                    : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--line)', textAlign: 'left' }}>
                            <th style={{ padding: '6px 8px', color: 'var(--t-2)', fontWeight: 600 }}>Thời gian</th>
                            <th style={{ padding: '6px 8px', color: 'var(--t-2)', fontWeight: 600 }}>Thao tác</th>
                            <th style={{ padding: '6px 8px', color: 'var(--t-2)', fontWeight: 600 }}>Lý do</th>
                            <th style={{ padding: '6px 8px', color: 'var(--t-2)', fontWeight: 600 }}>Người thực hiện</th>
                            <th style={{ padding: '6px 8px', color: 'var(--t-2)', fontWeight: 600 }}>Phiên bản</th>
                          </tr>
                        </thead>
                        <tbody>
                          {amendments.map((a) => (
                            <tr key={a.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                              <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmtDTg(a.performedAt)}</td>
                              <td style={{ padding: '6px 8px' }}>
                                <StatusBadge tone={a.action === 1 ? 'ok' : a.action === 2 ? 'warn' : 'info'}>{a.actionName}</StatusBadge>
                              </td>
                              <td style={{ padding: '6px 8px', color: 'var(--t-1)', maxWidth: 240 }}>{a.reason || '—'}</td>
                              <td style={{ padding: '6px 8px' }}>{a.performedByName || a.performedBy}</td>
                              <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>v{a.versionNo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                </div>
              )}

              {tab === 'attach' && (
                <div>
                  <div style={{ marginBottom: 'var(--space-12)', display: 'flex', gap: 'var(--space-8)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select className="ed-fld" style={{ width: 220 }} value={attachCat} onChange={(e) => setAttachCat(e.target.value)}>
                      <option value="">— Phân loại (tùy chọn) —</option>
                      {ATTACH_CATS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                    </select>
                    <input
                      ref={fileInputRef}
                      type="file"
                      style={{ display: 'none' }}
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                      onChange={onPickFile}
                    />
                    <Btn variant="primary" disabled={!full?.id || attachBusy} onClick={() => fileInputRef.current?.click()}>
                      <TermIcon name="upload" size={12} /> {attachBusy ? 'Đang tải lên…' : 'Quét / Chọn tệp đính kèm'}
                    </Btn>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Tối đa 10MB · ảnh / PDF / Office</span>
                  </div>
                  {!full?.id && <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-10)' }}>Chọn HSBA có hồ sơ bệnh án để đính kèm tài liệu.</div>}
                  <DataTable<EmrDocumentAttachmentDto>
                    columns={attachCols}
                    data={attachments}
                    rowKey={(r) => r.id}
                    empty="Chưa có tài liệu đính kèm"
                    actions={(r) => (
                      <div className="ab-actions">
                        {r.hasContent !== false && isViewable(r.fileType) && <ActBtn ic="eye" title="Xem" onClick={() => onViewAttach(r)} />}
                        {r.hasContent !== false && <ActBtn ic="download" title="Tải về" onClick={() => onDownloadAttach(r)} />}
                        <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => onDeleteAttach(r)} />
                      </div>
                    )}
                  />
                </div>
              )}

              {/* #352: parity v1 — Nhật ký in ấn HSBA (đóng dấu bản in) */}
              {tab === 'printlog' && (
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: 'var(--fs-sm)' }}>Nhật ký in ấn HSBA</h4>
                  <DataTable<EmrPrintLogDto> columns={printLogCols} data={printLogs} rowKey={(r) => r.id} empty="Chưa có nhật ký in ấn" />
                </div>
              )}

              {/* #352: parity v1 — Quản lý BA (chia sẻ · trích lục · gáy · hình ảnh · mã tắt · kiểm tra) */}
              {tab === 'management' && (
                <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-14)' }}>
                  <EmrManagementTabs />
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Responsive toggle (list only — 2-col) */}
      {leftOpen && <div className="ed-panel-backdrop" onClick={() => setLeftOpen(false)} />}
      <div className="ed-panel-toggles">
        <button className="ed-panel-toggle" onClick={() => setLeftOpen((o) => !o)} title="Danh sách HSBA">
          <TermIcon name="list" size={18} />
        </button>
      </div>

      {/* Print drawer — danh sách biểu mẫu TT32/2023 */}
      <DrawerShell open={printOpen} onClose={() => setPrintOpen(false)} title="In biểu mẫu HSBA (TT32/2023)" size="md">
        <div style={{ padding: 'var(--space-14)' }}>
          {!full && (
            <div style={{ marginBottom: 'var(--space-10)', padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--r-2)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
              Chọn một bệnh nhân để xem trước và in biểu mẫu.
            </div>
          )}
          {(() => {
            const groups = PRINT_FORMS.reduce<Record<string, PrintFormEntry[]>>((acc, m) => {
              const g = m.group ?? 'Khác';
              (acc[g] ??= []).push(m);
              return acc;
            }, {});
            return Object.entries(groups).map(([g, items]) => (
              <div key={g} style={{ marginBottom: 'var(--space-14)' }}>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--t-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--line-soft)' }}>
                  {g}
                </div>
                {items.map((m) => (
                  <div key={m.printType + m.label} style={{ padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12.5 }}>{m.label}</span>
                    <Btn variant="ghost" size="sm" disabled={!full} onClick={() => { setPrintOpen(false); openPrintForm(m.printType); }}>
                      <TermIcon name="print" size={11} /> In
                    </Btn>
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>
      </DrawerShell>

      {/* Print preview drawer — hiển thị biểu mẫu thật + nút In */}
      <DrawerShell
        open={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        title="Xem trước biểu mẫu"
        size="lg"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setPrintPreviewOpen(false)}>Đóng</Btn>
            <span className="ab-u-flex1" />
            <Btn variant="primary" onClick={handleDoPrint}>
              <TermIcon name="print" size={12} /> In
            </Btn>
          </>
        }
      >
        <div ref={printPreviewRef} style={{ padding: 'var(--space-8)' }}>
          <PrintTemplateRenderer
            printType={printPreviewType}
            record={full}
            examinationId={examId || undefined}
            printRef={printPreviewRef}
            treatmentSheets={treatments}
            nursingSheets={nursing}
            maternityLeaveDto={maternityLeaveDto}
          />
        </div>
      </DrawerShell>

      {/* F1.5 — Modal nhập thông tin nghỉ dưỡng thai */}
      <ModalShell
        open={maternityLeaveModalOpen}
        onClose={() => setMaternityLeaveModalOpen(false)}
        title="Giấy nghỉ dưỡng thai"
        sub="Điền thông tin để xem trước và in giấy"
        size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setMaternityLeaveModalOpen(false)}>Hủy</Btn>
            <span className="ab-u-flex1" />
            <Btn
              variant="primary"
              onClick={() => {
                if (!maternityLeaveDto || maternityLeaveDto.days <= 0) {
                  tw('Vui lòng nhập số ngày nghỉ hợp lệ');
                  return;
                }
                setMaternityLeaveModalOpen(false);
                setPrintPreviewType('maternity-leave');
                setPrintPreviewOpen(true);
              }}
            >
              Xem trước & In
            </Btn>
          </>
        }
      >
        {maternityLeaveDto && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-4)', fontWeight: 500 }}>Số ngày nghỉ <span style={{ color: 'red' }}>*</span></label>
              <input
                type="number"
                min={1}
                className="ed-fld"
                value={maternityLeaveDto.days || ''}
                onChange={(e) => setMaternityLeaveDto({ ...maternityLeaveDto, days: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <div className="ab-u-flex1">
                <label style={{ display: 'block', marginBottom: 'var(--space-4)', fontWeight: 500 }}>Từ ngày</label>
                <input
                  type="date"
                  className="ed-fld"
                  value={maternityLeaveDto.fromDate}
                  onChange={(e) => setMaternityLeaveDto({ ...maternityLeaveDto, fromDate: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="ab-u-flex1">
                <label style={{ display: 'block', marginBottom: 'var(--space-4)', fontWeight: 500 }}>Đến ngày</label>
                <input
                  type="date"
                  className="ed-fld"
                  value={maternityLeaveDto.toDate}
                  onChange={(e) => setMaternityLeaveDto({ ...maternityLeaveDto, toDate: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-4)', fontWeight: 500 }}>Tuần thai (tuần)</label>
              <input
                type="number"
                min={1}
                max={42}
                className="ed-fld"
                value={maternityLeaveDto.gestationalWeeks ?? ''}
                onChange={(e) => setMaternityLeaveDto({ ...maternityLeaveDto, gestationalWeeks: e.target.value ? Number(e.target.value) : undefined })}
                style={{ width: '100%' }}
                placeholder="VD: 28"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-4)', fontWeight: 500 }}>Lý do nghỉ dưỡng thai</label>
              <textarea
                className="ed-fld"
                rows={3}
                value={maternityLeaveDto.reason ?? ''}
                onChange={(e) => setMaternityLeaveDto({ ...maternityLeaveDto, reason: e.target.value })}
                style={{ width: '100%', resize: 'vertical' }}
                placeholder="VD: Doạ sảy thai, tiền sản giật..."
              />
            </div>
          </div>
        )}
      </ModalShell>

      {/* Trình ký nhiều cấp (chuỗi Trưởng khoa → Lãnh đạo) + gộp TT46 finalize */}
      <EmrSigningChainDrawer
        open={chainOpen}
        onClose={() => setChainOpen(false)}
        record={full}
        patientId={sel?.patientId}
        patientName={sel?.patientName}
        patientCode={sel?.patientCode}
        departmentName={sel?.lastRoomName || undefined}
        treatments={treatments}
        consultations={consults}
        nursingSheets={nursing}
        isFinalized={finalized}
        onFinalized={() => { void refreshFinalized(); }}
      />

      {/* Sign modal → real PKI signing via signing-workflow */}
      <ModalShell open={signOpen} onClose={() => setSignOpen(false)} title="Ký số hồ sơ bệnh án" sub="USB Token · VNPT-CA" size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setSignOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={() => { setSignOpen(false); navigate('/v2/signing-workflow'); }}><TermIcon name="check" size={12} /> Tới luồng ký số</Btn>
        </>}>
        <div style={{ padding: 'var(--space-18)', fontSize: 12.5, color: 'var(--t-1)' }}>
          Ký số HSBA <b>{sel?.patientName}</b> ({sel?.patientCode}) — {treatments.length} phiếu điều trị, {consults.length} hội chẩn.
          <div style={{ marginTop: 'var(--space-10)', fontSize: 11.5, color: 'var(--t-2)' }}>Ký PKI đầy đủ (USB Token / HSM) thực hiện ở Luồng ký số tập trung.</div>
        </div>
      </ModalShell>

      {/* Create sheet modal (treatment / consult / nursing) */}
      <ModalShell open={modal !== null} onClose={() => setModal(null)}
        title={modal === 'treatment' ? 'Tạo phiếu điều trị' : modal === 'consult' ? 'Đề xuất hội chẩn' : 'Tạo phiếu chăm sóc'}
        sub={sel?.patientName} size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => setModal(null)}>Hủy</Btn>
          <Btn variant="primary" disabled={savingForm} onClick={saveSheet}><TermIcon name="check" size={12} /> Lưu</Btn>
        </>}>
        <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
            <FormField lbl="Ngày"><input type="date" className="ed-fld" value={form.date || ''} onChange={(e) => fld('date', e.target.value)} /></FormField>
            {modal === 'treatment' && <FormField lbl="Ngày thứ"><input type="number" className="ed-fld" value={form.dayNumber || ''} onChange={(e) => fld('dayNumber', e.target.value)} /></FormField>}
            {modal === 'nursing' && (
              <FormField lbl="Ca"><select className="ed-fld" value={form.shift || '1'} onChange={(e) => fld('shift', e.target.value)}><option value="1">Sáng</option><option value="2">Chiều</option><option value="3">Tối</option></select></FormField>
            )}
            {modal === 'nursing' && (
              <FormField lbl="Cấp chăm sóc">
                <select className="ed-fld" value={form.careLevel || ''} onChange={(e) => fld('careLevel', e.target.value)}>
                  <option value="">— Chưa phân cấp —</option>
                  <option value="1">Cấp 1 — BN nặng (theo dõi liên tục)</option>
                  <option value="2">Cấp 2 — BN vừa (theo dõi định kỳ)</option>
                </select>
              </FormField>
            )}
          </div>
          {modal === 'treatment' && <>
            <FormField lbl="Diễn biến">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
                <Btn size="sm" variant="ghost" icon="file-text" onClick={() => setTplPickerOpen(true)}>Chọn mẫu</Btn>
              </div>
              <textarea className="ed-fld" rows={3} value={form.dailyProgress || ''} onChange={(e) => fld('dailyProgress', e.target.value)} />
            </FormField>
            <FormField lbl="Y lệnh"><textarea className="ed-fld" rows={3} value={form.treatmentOrders || ''} onChange={(e) => fld('treatmentOrders', e.target.value)} /></FormField>
            <FormField lbl="Ghi chú BS"><textarea className="ed-fld" rows={2} value={form.doctorNotes || ''} onChange={(e) => fld('doctorNotes', e.target.value)} /></FormField>
          </>}
          {modal === 'consult' && <>
            <FormField lbl="Lý do"><input className="ed-fld" value={form.reason || ''} onChange={(e) => fld('reason', e.target.value)} /></FormField>
            <FormField lbl="Tóm tắt"><textarea className="ed-fld" rows={2} value={form.summary || ''} onChange={(e) => fld('summary', e.target.value)} /></FormField>
            <FormField lbl="Kết luận"><textarea className="ed-fld" rows={2} value={form.conclusion || ''} onChange={(e) => fld('conclusion', e.target.value)} /></FormField>
            <FormField lbl="Khuyến nghị"><textarea className="ed-fld" rows={2} value={form.recommendations || ''} onChange={(e) => fld('recommendations', e.target.value)} /></FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
              <FormField lbl="Chủ tọa"><input className="ed-fld" value={form.chairman || ''} onChange={(e) => fld('chairman', e.target.value)} /></FormField>
              <FormField lbl="Thư ký"><input className="ed-fld" value={form.secretary || ''} onChange={(e) => fld('secretary', e.target.value)} /></FormField>
            </div>
          </>}
          {modal === 'nursing' && <>
            <FormField lbl="Tình trạng BN"><textarea className="ed-fld" rows={2} value={form.patientCondition || ''} onChange={(e) => fld('patientCondition', e.target.value)} /></FormField>
            <FormField lbl="Nhận định ĐD"><textarea className="ed-fld" rows={2} value={form.nursingAssessment || ''} onChange={(e) => fld('nursingAssessment', e.target.value)} /></FormField>
            <FormField lbl="Can thiệp"><textarea className="ed-fld" rows={2} value={form.nursingInterventions || ''} onChange={(e) => fld('nursingInterventions', e.target.value)} /></FormField>
            <FormField lbl="Đáp ứng"><textarea className="ed-fld" rows={2} value={form.patientResponse || ''} onChange={(e) => fld('patientResponse', e.target.value)} /></FormField>
          </>}
        </div>
      </ModalShell>

      {/* Partograph add-point modal */}
      <ModalShell
        open={ptgOpen}
        onClose={() => setPtgOpen(false)}
        title="Ghi điểm biểu đồ chuyển dạ"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setPtgOpen(false)}>Hủy</Btn>
            <Btn variant="primary" disabled={ptgSaving} onClick={savePartograph}>
              {ptgSaving ? 'Đang lưu…' : 'Lưu'}
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
          <FormField lbl="Thời điểm *">
            <input type="datetime-local" className="ed-fld" value={ptgForm.recordTime || ''} onChange={(e) => setPtgForm((p) => ({ ...p, recordTime: e.target.value }))} />
          </FormField>
          <FormField lbl="Mở CTC (cm)">
            <input type="number" className="ed-fld" min={0} max={10} step={0.5} value={ptgForm.cervicalDilation ?? ''} onChange={(e) => setPtgForm((p) => ({ ...p, cervicalDilation: e.target.value ? +e.target.value : undefined }))} />
          </FormField>
          <FormField lbl="Tim thai (ck/phút)">
            <input type="number" className="ed-fld" min={60} max={200} value={ptgForm.fetalHeartRate ?? ''} onChange={(e) => setPtgForm((p) => ({ ...p, fetalHeartRate: e.target.value ? +e.target.value : undefined }))} />
          </FormField>
          <FormField lbl="Cơn co (ck/10p)">
            <input type="number" className="ed-fld" min={0} max={10} value={ptgForm.contractionFrequency ?? ''} onChange={(e) => setPtgForm((p) => ({ ...p, contractionFrequency: e.target.value ? +e.target.value : undefined }))} />
          </FormField>
          <FormField lbl="Thời gian cơn co (s)">
            <input type="number" className="ed-fld" min={0} max={90} value={ptgForm.contractionDuration ?? ''} onChange={(e) => setPtgForm((p) => ({ ...p, contractionDuration: e.target.value ? +e.target.value : undefined }))} />
          </FormField>
          <FormField lbl="HA tâm thu (mmHg)">
            <input type="number" className="ed-fld" value={ptgForm.systolicBP ?? ''} onChange={(e) => setPtgForm((p) => ({ ...p, systolicBP: e.target.value ? +e.target.value : undefined }))} />
          </FormField>
          <FormField lbl="HA tâm trương (mmHg)">
            <input type="number" className="ed-fld" value={ptgForm.diastolicBP ?? ''} onChange={(e) => setPtgForm((p) => ({ ...p, diastolicBP: e.target.value ? +e.target.value : undefined }))} />
          </FormField>
          <FormField lbl="Mạch mẹ (ck/phút)">
            <input type="number" className="ed-fld" value={ptgForm.maternalPulse ?? ''} onChange={(e) => setPtgForm((p) => ({ ...p, maternalPulse: e.target.value ? +e.target.value : undefined }))} />
          </FormField>
          <FormField lbl="Cảnh báo">
            <select className="ed-fld" value={ptgForm.alertLine || ''} onChange={(e) => setPtgForm((p) => ({ ...p, alertLine: e.target.value || undefined }))}>
              <option value="">Bình thường</option>
              <option value="Alert">Cảnh báo</option>
              <option value="Action">Cần xử trí</option>
            </select>
          </FormField>
          <FormField lbl="Nước ối">
            <input className="ed-fld" value={ptgForm.amnioticFluid || ''} onChange={(e) => setPtgForm((p) => ({ ...p, amnioticFluid: e.target.value || undefined }))} placeholder="I/M/A..." />
          </FormField>
          <FormField lbl="Ghi chú">
            <input className="ed-fld" value={ptgForm.notes || ''} onChange={(e) => setPtgForm((p) => ({ ...p, notes: e.target.value || undefined }))} />
          </FormField>
        </div>
      </ModalShell>

      {/* Anesthesia create modal */}
      <ModalShell
        open={anesOpen}
        onClose={() => setAnesOpen(false)}
        title="Tạo phiếu gây mê · gây tê"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setAnesOpen(false)}>Hủy</Btn>
            <Btn variant="primary" disabled={anesSaving} onClick={saveAnesthesia}>
              {anesSaving ? 'Đang lưu…' : 'Lưu phiếu'}
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
          <FormField lbl="Loại gây mê *">
            <select className="ed-fld" value={anesForm.anesthesiaType || ''} onChange={(e) => setAnesForm((p) => ({ ...p, anesthesiaType: e.target.value }))}>
              <option value="GeneralAnesthesia">Gây mê toàn thân</option>
              <option value="SpinalAnesthesia">Tê tủy sống</option>
              <option value="EpiduralAnesthesia">Gây tê ngoài màng cứng</option>
              <option value="LocalAnesthesia">Gây tê tại chỗ</option>
              <option value="RegionalAnesthesia">Gây tê vùng</option>
            </select>
          </FormField>
          <FormField lbl="Phân loại ASA">
            <select className="ed-fld" value={anesForm.asaClass || 1} onChange={(e) => setAnesForm((p) => ({ ...p, asaClass: +e.target.value }))}>
              {[1,2,3,4,5].map((i) => <option key={i} value={i}>ASA {i}</option>)}
            </select>
          </FormField>
          <FormField lbl="Mallampati">
            <select className="ed-fld" value={anesForm.mallampatiScore || 1} onChange={(e) => setAnesForm((p) => ({ ...p, mallampatiScore: +e.target.value }))}>
              {[1,2,3,4].map((i) => <option key={i} value={i}>Mallampati {i}</option>)}
            </select>
          </FormField>
          <FormField lbl="Trạng thái NPO">
            <input className="ed-fld" value={anesForm.npoStatus || ''} onChange={(e) => setAnesForm((p) => ({ ...p, npoStatus: e.target.value || undefined }))} placeholder="Nhịn ăn từ..." />
          </FormField>
          <FormField lbl="Dị ứng">
            <input className="ed-fld" value={anesForm.allergies || ''} onChange={(e) => setAnesForm((p) => ({ ...p, allergies: e.target.value || undefined }))} />
          </FormField>
          <FormField lbl="Kế hoạch đường thở">
            <input className="ed-fld" value={anesForm.airwayPlan || ''} onChange={(e) => setAnesForm((p) => ({ ...p, airwayPlan: e.target.value || undefined }))} />
          </FormField>
          <FormField lbl="Đánh giá tiền mê" >
            <textarea className="ed-fld" rows={2} value={anesForm.preOpAssessment || ''} onChange={(e) => setAnesForm((p) => ({ ...p, preOpAssessment: e.target.value || undefined }))} />
          </FormField>
          <FormField lbl="Đánh giá tâm lý">
            <textarea className="ed-fld" rows={2} value={anesForm.psychologicalAssessment || ''} onChange={(e) => setAnesForm((p) => ({ ...p, psychologicalAssessment: e.target.value || undefined }))} />
          </FormField>
        </div>
      </ModalShell>

      {/* #352: parity v1 — modal thêm phiếu thử phản ứng thuốc (lưu local) */}
      <ModalShell open={drugTestOpen} onClose={() => setDrugTestOpen(false)}
        title="Thêm phiếu thử phản ứng thuốc" sub={sel?.patientName} size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => setDrugTestOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={saveDrugTest}><TermIcon name="check" size={12} /> Lưu</Btn>
        </>}>
        <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
            <FormField lbl="Ngày thử"><input type="date" className="ed-fld" value={drugTestForm.date || ''} onChange={(e) => dtf('date', e.target.value)} /></FormField>
            <FormField lbl="Tên thuốc *"><input className="ed-fld" value={drugTestForm.drugName || ''} onChange={(e) => dtf('drugName', e.target.value)} /></FormField>
            <FormField lbl="Liều"><input className="ed-fld" value={drugTestForm.dose || ''} onChange={(e) => dtf('dose', e.target.value)} /></FormField>
            <FormField lbl="Đường dùng"><input className="ed-fld" value={drugTestForm.route || ''} onChange={(e) => dtf('route', e.target.value)} placeholder="Tiêm trong da / uống…" /></FormField>
            <FormField lbl="Giờ thử"><input type="time" className="ed-fld" value={drugTestForm.testTime || ''} onChange={(e) => dtf('testTime', e.target.value)} /></FormField>
            <FormField lbl="Kết quả">
              <select className="ed-fld" value={drugTestForm.result || 'Negative'} onChange={(e) => dtf('result', e.target.value)}>
                {DRUG_TEST_RESULTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </FormField>
          </div>
          <FormField lbl="Mô tả phản ứng"><textarea className="ed-fld" rows={2} value={drugTestForm.reactionDescription || ''} onChange={(e) => dtf('reactionDescription', e.target.value)} /></FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
            <FormField lbl="Người thử"><input className="ed-fld" value={drugTestForm.tester || ''} onChange={(e) => dtf('tester', e.target.value)} /></FormField>
            <FormField lbl="Ghi chú"><input className="ed-fld" value={drugTestForm.notes || ''} onChange={(e) => dtf('notes', e.target.value)} /></FormField>
          </div>
        </div>
      </ModalShell>

      <ClinicalTemplatePicker
        open={tplPickerOpen}
        onClose={() => setTplPickerOpen(false)}
        templateType={TEMPLATE_TYPES.DIEN_BIEN_BENH}
        gender={sel?.gender}
        ageYears={sel?.age ?? undefined}
        onPick={(t) => fld('dailyProgress', form.dailyProgress ? `${form.dailyProgress}\n${t.content}` : t.content)}
      />
    </div>
  );
};

const Field: React.FC<{ lbl: string; children: React.ReactNode }> = ({ lbl, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 'var(--space-10)', padding: '4px 0', fontSize: 12.5 }}>
    <div className="ab-u-muted">{lbl}</div>
    <div className="ab-u-fg">{children}</div>
  </div>
);

const FormField: React.FC<{ lbl: string; children: React.ReactNode }> = ({ lbl, children }) => (
  <label style={{ display: 'block', fontSize: 11.5 }}>
    <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>{lbl}</span>
    {children}
  </label>
);

export default EmrEditorV2;
