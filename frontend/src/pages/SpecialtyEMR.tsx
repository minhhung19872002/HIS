import React, { useState, useCallback } from 'react';
import {
  Card, Table, Input, Button, Space, Tag, Form, DatePicker, Select,
  Modal, message, Typography, Row, Col, Divider, Spin, Empty, Tooltip,
  InputNumber, Checkbox, Alert, Descriptions,
} from 'antd';
import {
  SearchOutlined, PrinterOutlined, EditOutlined, PlusOutlined,
  ReloadOutlined, FilePdfOutlined, FileExcelOutlined, DeleteOutlined,
  SaveOutlined, MedicineBoxOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import client from '../api/client';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// ===================== Types =====================

interface SpecialtyType { key: string; label: string; code: string }

const SPECIALTY_TYPES: SpecialtyType[] = [
  { key: 'surgical', label: 'Ngoai khoa', code: 'NK' },
  { key: 'internal', label: 'Noi khoa', code: 'NoiK' },
  { key: 'obstetrics', label: 'San khoa', code: 'SK' },
  { key: 'pediatrics', label: 'Nhi khoa', code: 'NhiK' },
  { key: 'dental', label: 'Rang-Ham-Mat', code: 'RHM' },
  { key: 'ent', label: 'Tai-Mui-Hong', code: 'TMH' },
  { key: 'traditional', label: 'YHCT & PHCN', code: 'YHCT' },
  { key: 'traditional_outpatient', label: 'YHCT ngoai tru', code: 'YHCTNT' },
  { key: 'hematology', label: 'Huyet hoc-Truyen mau', code: 'HH' },
  { key: 'oncology', label: 'Ung buou', code: 'UB' },
  { key: 'burns', label: 'Bong', code: 'B' },
  { key: 'psychiatry', label: 'Tam than', code: 'TT' },
  { key: 'dermatology', label: 'Da lieu', code: 'DL' },
  { key: 'ophthalmology', label: 'Mat', code: 'M' },
  { key: 'infectious', label: 'Truyen nhiem', code: 'TN' },
];

interface SpecialtyRecordDto {
  id: string; patientId: string; patientCode: string; patientName: string;
  gender: string; dateOfBirth: string; specialtyType: string; createdAt: string;
  doctorName: string; departmentName: string; diagnosisIcd: string;
  diagnosisText: string; status: number; specialtyData: Record<string, unknown>;
}

interface SearchParams {
  keyword: string; specialtyType?: string; fromDate?: string; toDate?: string;
  pageIndex: number; pageSize: number;
}

// ===================== API =====================

const specialtyEMRApi = {
  search: (params: SearchParams) =>
    client.get('/specialty-emr/search', { params }).then(r => r.data?.data || []).catch(() => []),
  getById: (id: string) =>
    client.get(`/specialty-emr/${id}`).then(r => r.data?.data).catch(() => null),
  save: (data: Record<string, unknown>) =>
    client.post('/specialty-emr', data).then(r => r.data).catch(() => null),
  delete: (id: string) =>
    client.delete(`/specialty-emr/${id}`).then(r => r.data).catch(() => null),
  exportPdf: (id: string) =>
    client.get(`/specialty-emr/${id}/pdf`, { responseType: 'blob' }).catch(() => null),
  exportXml: (id: string) =>
    client.get(`/specialty-emr/${id}/xml`, { responseType: 'blob' }).catch(() => null),
};

// ===================== Field config for specialties =====================

type FieldType = 'text' | 'textarea' | 'select' | 'number' | 'multiselect' | 'checkbox' | 'tags';
interface FieldDef {
  name: string; label: string; type: FieldType; span?: number;
  placeholder?: string; options?: { value: string; label: string }[];
  min?: number; max?: number; step?: number; rows?: number; addonAfter?: string;
}

const opts = (items: string[]) => items.map(v => ({ value: v, label: v }));

const SPECIALTY_FIELDS: Record<string, { title: string; fields: FieldDef[] }> = {
  surgical: { title: 'Ngoai khoa', fields: [
    { name: 'surgicalHistory', label: 'Tien su phau thuat', type: 'textarea', span: 12, rows: 2, placeholder: 'Mo ta tien su phau thuat' },
    { name: 'procedureType', label: 'Loai phau thuat', type: 'select', span: 12, options: [
      { value: 'emergency', label: 'Cap cuu' }, { value: 'elective', label: 'Phien' },
      { value: 'minor', label: 'Tieu phau' }, { value: 'major', label: 'Dai phau' }] },
    { name: 'woundDescription', label: 'Mo ta vet thuong', type: 'textarea', span: 12, rows: 2, placeholder: 'Vi tri, kich thuoc, tinh chat' },
    { name: 'anesthesiaType', label: 'Phuong phap vo cam', type: 'select', span: 12, options: [
      { value: 'general', label: 'Gay me toan than' }, { value: 'spinal', label: 'Te tuy song' },
      { value: 'epidural', label: 'Te ngoai mang cung' }, { value: 'local', label: 'Te tai cho' }] },
    { name: 'operativeFindings', label: 'Nhan xet trong mo', type: 'textarea', span: 24, rows: 2, placeholder: 'Ton thuong phat hien, xu tri' },
  ]},
  internal: { title: 'Noi khoa', fields: [
    { name: 'systemReview', label: 'Kham he thong', type: 'textarea', span: 24, rows: 3, placeholder: 'Tim mach, ho hap, tieu hoa, than-tiet nieu, co-xuong-khop, than kinh' },
    { name: 'chronicConditions', label: 'Benh man tinh', type: 'tags', span: 24, options: [
      { value: 'diabetes', label: 'Dai thao duong' }, { value: 'hypertension', label: 'Tang huyet ap' },
      { value: 'copd', label: 'COPD' }, { value: 'ckd', label: 'Suy than man' },
      { value: 'chf', label: 'Suy tim' }, { value: 'cirrhosis', label: 'Xo gan' }] },
    { name: 'currentMedications', label: 'Thuoc dang dung', type: 'textarea', span: 12, rows: 2, placeholder: 'Ten thuoc, lieu, thoi gian' },
    { name: 'allergies', label: 'Di ung', type: 'textarea', span: 12, rows: 2, placeholder: 'Thuoc, thuc pham, khac' },
  ]},
  obstetrics: { title: 'San khoa', fields: [
    { name: 'gravida', label: 'So lan mang thai (G)', type: 'number', span: 6, min: 0, max: 20 },
    { name: 'para', label: 'So lan sinh (P)', type: 'number', span: 6, min: 0, max: 20 },
    { name: 'abortions', label: 'Say/pha (A)', type: 'number', span: 6, min: 0, max: 20 },
    { name: 'gestationalWeeks', label: 'Tuoi thai (tuan)', type: 'number', span: 6, min: 0, max: 45 },
    { name: 'fetalStatus', label: 'Tinh trang thai nhi', type: 'select', span: 12, options: [
      { value: 'normal', label: 'Binh thuong' }, { value: 'distress', label: 'Suy thai' },
      { value: 'iugr', label: 'Thai cham tang truong' }, { value: 'macrosomia', label: 'Thai to' }] },
    { name: 'laborMonitoring', label: 'Theo doi chuyen da', type: 'textarea', span: 12, rows: 2, placeholder: 'Co tu cung, tim thai, do mo CTC' },
    { name: 'prenatalComplications', label: 'Bien chung thai ky', type: 'textarea', span: 24, rows: 2, placeholder: 'Tien san giat, nhau tien dao, da oi' },
  ]},
  pediatrics: { title: 'Nhi khoa', fields: [
    { name: 'birthWeight', label: 'Can nang sinh (g)', type: 'number', span: 6, min: 200, max: 6000 },
    { name: 'currentWeight', label: 'Can nang (kg)', type: 'number', span: 6, min: 0, max: 200, step: 0.1 },
    { name: 'height', label: 'Chieu cao (cm)', type: 'number', span: 6, min: 0, max: 200, step: 0.1 },
    { name: 'headCircumference', label: 'Vong dau (cm)', type: 'number', span: 6, min: 0, max: 60, step: 0.1 },
    { name: 'growthAssessment', label: 'Danh gia tang truong', type: 'select', span: 12, options: [
      { value: 'normal', label: 'Binh thuong' }, { value: 'underweight', label: 'Nhe can' },
      { value: 'stunting', label: 'Thap con' }, { value: 'wasting', label: 'Gay com' }, { value: 'overweight', label: 'Thua can' }] },
    { name: 'vaccinationStatus', label: 'Tiem chung', type: 'textarea', span: 12, rows: 2, placeholder: 'Vaccine da tiem, lieu tiep theo' },
    { name: 'developmentMilestones', label: 'Moc phat trien', type: 'textarea', span: 24, rows: 2, placeholder: 'Van dong, ngon ngu, nhan thuc' },
  ]},
  dental: { title: 'Rang-Ham-Mat', fields: [
    { name: 'dentalChart', label: 'So do rang', type: 'textarea', span: 12, rows: 3, placeholder: 'Tinh trang tung rang (VD: R18 sau, R36 mat)' },
    { name: 'lesionDiagram', label: 'So do ton thuong', type: 'textarea', span: 12, rows: 3, placeholder: 'Vi tri, kich thuoc ton thuong ham mat' },
    { name: 'occlusion', label: 'Khop can', type: 'select', span: 12, options: opts(['Class I', 'Class II', 'Class III']) },
    { name: 'periodontalStatus', label: 'Tinh trang nha chu', type: 'select', span: 12, options: [
      { value: 'healthy', label: 'Khoe manh' }, { value: 'gingivitis', label: 'Viem loi' },
      { value: 'mild', label: 'Viem nha chu nhe' }, { value: 'moderate', label: 'Viem nha chu TB' }, { value: 'severe', label: 'Viem nha chu nang' }] },
  ]},
  ent: { title: 'Tai-Mui-Hong', fields: [
    { name: 'hearingTestLeft', label: 'Nghe tai trai (dB)', type: 'number', span: 12, min: 0, max: 120 },
    { name: 'hearingTestRight', label: 'Nghe tai phai (dB)', type: 'number', span: 12, min: 0, max: 120 },
    { name: 'endoscopyFindings', label: 'Ket qua noi soi', type: 'textarea', span: 24, rows: 3, placeholder: 'Noi soi tai, mui, hong, thanh quan' },
    { name: 'tympanometry', label: 'Do nhi luong', type: 'select', span: 12, options: [
      { value: 'typeA', label: 'Type A (Binh thuong)' }, { value: 'typeB', label: 'Type B (Tran dich)' }, { value: 'typeC', label: 'Type C (Roi loan Eustachian)' }] },
    { name: 'nasalObstruction', label: 'Tac mui', type: 'select', span: 12, options: [
      { value: 'none', label: 'Khong' }, { value: 'left', label: 'Trai' }, { value: 'right', label: 'Phai' }, { value: 'bilateral', label: 'Hai ben' }] },
  ]},
  traditional: { title: 'YHCT & PHCN', fields: [
    { name: 'vong', label: 'Vong chan (Nhin)', type: 'textarea', span: 12, rows: 2, placeholder: 'Sac mat, luoi, hinh the, than thai' },
    { name: 'van', label: 'Van chan (Nghe/Ngui)', type: 'textarea', span: 12, rows: 2, placeholder: 'Giong noi, hoi tho, mui' },
    { name: 'van2', label: 'Van chan (Hoi)', type: 'textarea', span: 12, rows: 2, placeholder: 'Benh su, trieu chung, an ngu, dai tien' },
    { name: 'thiet', label: 'Thiet chan (So bat mach)', type: 'textarea', span: 12, rows: 2, placeholder: 'Mach tay trai/phai, phu tram tri sac' },
    { name: 'acupuncturePoints', label: 'Huyet vi cham cuu', type: 'textarea', span: 24, rows: 2, placeholder: 'Hop Coc (LI4), Tuc Tam Ly (ST36), Bai Hoi (GV20)' },
    { name: 'herbalPrescription', label: 'Phuong thuoc YHCT', type: 'textarea', span: 12, rows: 2, placeholder: 'Bai thuoc, vi thuoc, lieu luong' },
    { name: 'rehabPlan', label: 'Ke hoach PHCN', type: 'textarea', span: 12, rows: 2, placeholder: 'Bai tap, vat ly tri lieu, dien xung' },
  ]},
  traditional_outpatient: { title: 'YHCT ngoai tru', fields: [
    { name: 'vong', label: 'Vong chan (Nhin)', type: 'textarea', span: 12, rows: 2, placeholder: 'Sac mat, luoi, hinh the' },
    { name: 'van', label: 'Van chan (Nghe/Ngui)', type: 'textarea', span: 12, rows: 2, placeholder: 'Giong noi, hoi tho, mui' },
    { name: 'van2', label: 'Van chan (Hoi)', type: 'textarea', span: 12, rows: 2, placeholder: 'Benh su, trieu chung' },
    { name: 'thiet', label: 'Thiet chan (So bat mach)', type: 'textarea', span: 12, rows: 2, placeholder: 'Mach tay, phu tram tri sac' },
    { name: 'acupuncturePoints', label: 'Huyet vi cham cuu', type: 'textarea', span: 24, rows: 2, placeholder: 'Huyet vi su dung' },
    { name: 'herbalPrescription', label: 'Phuong thuoc YHCT', type: 'textarea', span: 24, rows: 2, placeholder: 'Bai thuoc, vi thuoc, lieu luong' },
  ]},
  hematology: { title: 'Huyet hoc - Truyen mau', fields: [
    { name: 'bloodDisorder', label: 'Benh ly huyet hoc', type: 'tags', span: 24, options: [
      { value: 'anemia', label: 'Thieu mau' }, { value: 'leukemia', label: 'Bach cau cap' },
      { value: 'lymphoma', label: 'U lympho' }, { value: 'thalassemia', label: 'Thalassemia' },
      { value: 'hemophilia', label: 'Hemophilia' }, { value: 'itp', label: 'Giam tieu cau' }] },
    { name: 'bloodGroup', label: 'Nhom mau', type: 'select', span: 8, options: opts(['A', 'B', 'AB', 'O']) },
    { name: 'rhFactor', label: 'Rh', type: 'select', span: 8, options: [{ value: '+', label: 'Rh+' }, { value: '-', label: 'Rh-' }] },
    { name: 'transfusionCount', label: 'So lan truyen mau', type: 'number', span: 8, min: 0 },
    { name: 'transfusionHistory', label: 'Tien su truyen mau', type: 'textarea', span: 24, rows: 2, placeholder: 'Ngay, loai che pham, the tich, phan ung' },
  ]},
  oncology: { title: 'Ung buou', fields: [
    { name: 'tnmT', label: 'TNM - T', type: 'select', span: 8, options: opts(['Tx','T0','Tis','T1','T2','T3','T4']) },
    { name: 'tnmN', label: 'TNM - N', type: 'select', span: 8, options: opts(['Nx','N0','N1','N2','N3']) },
    { name: 'tnmM', label: 'TNM - M', type: 'select', span: 8, options: opts(['Mx','M0','M1']) },
    { name: 'cancerStage', label: 'Giai doan', type: 'select', span: 12, options: opts(['0','IA','IB','IIA','IIB','IIIA','IIIB','IIIC','IV']) },
    { name: 'histopathology', label: 'Mo benh hoc', type: 'text', span: 12, placeholder: 'Loai mo hoc, do mo hoa' },
    { name: 'treatmentProtocol', label: 'Phac do dieu tri', type: 'textarea', span: 24, rows: 2, placeholder: 'Phau thuat, hoa tri, xa tri, mien dich' },
    { name: 'chemoCurrentCycle', label: 'Chu ky hoa tri hien tai', type: 'number', span: 8, min: 0, max: 50 },
    { name: 'chemoTotalCycles', label: 'Tong so chu ky', type: 'number', span: 8, min: 0, max: 50 },
    { name: 'ecogScore', label: 'ECOG Performance', type: 'select', span: 8, options: [0,1,2,3,4].map(v => ({ value: String(v), label: `ECOG ${v}` })) },
  ]},
  burns: { title: 'Bong', fields: [
    { name: 'burnPercentage', label: 'Dien tich bong (% TBSA)', type: 'number', span: 8, min: 0, max: 100, addonAfter: '%' },
    { name: 'burnDegree', label: 'Do bong', type: 'select', span: 8, options: [
      { value: 'I', label: 'Do I (Nong)' }, { value: 'II_shallow', label: 'Do II nong' },
      { value: 'II_deep', label: 'Do II sau' }, { value: 'III', label: 'Do III' }, { value: 'IV', label: 'Do IV' }] },
    { name: 'burnAgent', label: 'Tac nhan', type: 'select', span: 8, options: [
      { value: 'thermal', label: 'Nhiet' }, { value: 'chemical', label: 'Hoa chat' },
      { value: 'electrical', label: 'Dien' }, { value: 'radiation', label: 'Buc xa' }] },
    { name: 'affectedRegions', label: 'Vung bi bong (Rule of 9s)', type: 'checkbox', span: 24, options: [
      { value: 'head', label: 'Dau-mat-co 9%' }, { value: 'chest', label: 'Nguc truoc 18%' },
      { value: 'back', label: 'Lung 18%' }, { value: 'left_arm', label: 'Tay trai 9%' },
      { value: 'right_arm', label: 'Tay phai 9%' }, { value: 'left_leg', label: 'Chan trai 18%' },
      { value: 'right_leg', label: 'Chan phai 18%' }, { value: 'perineum', label: 'Tang sinh mon 1%' }] },
    { name: 'fluidResuscitation', label: 'Bu dich (Parkland)', type: 'textarea', span: 24, rows: 2, placeholder: 'The tich, toc do, loai dich' },
  ]},
  psychiatry: { title: 'Tam than', fields: [
    { name: 'psychiatricAssessment', label: 'Danh gia tam than', type: 'textarea', span: 24, rows: 3, placeholder: 'Benh su, yeu to khoi phat, gia dinh' },
    { name: 'mentalStatusExam', label: 'Kham trang thai tam than (MSE)', type: 'textarea', span: 12, rows: 3, placeholder: 'Ngoai hinh, hanh vi, cam xuc, tu duy, tri giac' },
    { name: 'riskAssessment', label: 'Danh gia nguy co', type: 'textarea', span: 12, rows: 3, placeholder: 'Tu tu, tu hai, bao luc, bo tron' },
    { name: 'suicideRisk', label: 'Nguy co tu tu', type: 'select', span: 8, options: [
      { value: 'none', label: 'Khong' }, { value: 'low', label: 'Thap' }, { value: 'moderate', label: 'Trung binh' }, { value: 'high', label: 'Cao' }] },
    { name: 'insight', label: 'Nhan thuc benh', type: 'select', span: 8, options: [
      { value: 'full', label: 'Day du' }, { value: 'partial', label: 'Mot phan' }, { value: 'none', label: 'Khong' }] },
    { name: 'complianceLevel', label: 'Tuan thu dieu tri', type: 'select', span: 8, options: [
      { value: 'good', label: 'Tot' }, { value: 'partial', label: 'Mot phan' }, { value: 'poor', label: 'Kem' }] },
  ]},
  dermatology: { title: 'Da lieu', fields: [
    { name: 'lesionDescription', label: 'Mo ta ton thuong', type: 'textarea', span: 12, rows: 3, placeholder: 'Hinh dang, mau sac, kich thuoc, bo, be mat' },
    { name: 'lesionLocation', label: 'Vi tri ton thuong', type: 'textarea', span: 12, rows: 3, placeholder: 'Vung da bi anh huong, phan bo' },
    { name: 'morphology', label: 'Hinh thai', type: 'multiselect', span: 12, options: [
      { value: 'macule', label: 'Dam' }, { value: 'papule', label: 'San' }, { value: 'vesicle', label: 'Mun nuoc' },
      { value: 'bulla', label: 'Bong nuoc' }, { value: 'pustule', label: 'Mun mu' }, { value: 'nodule', label: 'Cuc' },
      { value: 'plaque', label: 'Mang' }, { value: 'ulcer', label: 'Loet' }] },
    { name: 'skinBiopsy', label: 'Sinh thiet da', type: 'textarea', span: 12, rows: 2, placeholder: 'Ket qua (neu co)' },
  ]},
  ophthalmology: { title: 'Mat', fields: [
    { name: 'vaRight', label: 'Thi luc mat phai', type: 'text', span: 6, placeholder: '10/10' },
    { name: 'vaLeft', label: 'Thi luc mat trai', type: 'text', span: 6, placeholder: '8/10' },
    { name: 'iopRight', label: 'Nhan ap phai (mmHg)', type: 'number', span: 6, min: 0, max: 80 },
    { name: 'iopLeft', label: 'Nhan ap trai (mmHg)', type: 'number', span: 6, min: 0, max: 80 },
    { name: 'fundoscopy', label: 'Soi day mat', type: 'textarea', span: 12, rows: 2, placeholder: 'Dia thi, vong mac, mach mau, hoang diem' },
    { name: 'slitLamp', label: 'Kham sinh hien vi', type: 'textarea', span: 12, rows: 2, placeholder: 'Giac mac, tien phong, mong mat, the thuy tinh' },
    { name: 'refractionRight', label: 'Khuc xa mat phai', type: 'text', span: 12, placeholder: '-2.50DS / -0.75DC x 180' },
    { name: 'refractionLeft', label: 'Khuc xa mat trai', type: 'text', span: 12, placeholder: '-3.00DS / -1.00DC x 175' },
  ]},
  infectious: { title: 'Truyen nhiem', fields: [
    { name: 'pathogen', label: 'Tac nhan gay benh', type: 'text', span: 12, placeholder: 'Vi khuan, virus, ky sinh trung, nam' },
    { name: 'isolationStatus', label: 'Cach ly', type: 'select', span: 12, options: [
      { value: 'none', label: 'Khong' }, { value: 'contact', label: 'Tiep xuc' },
      { value: 'droplet', label: 'Giot ban' }, { value: 'airborne', label: 'Duong khi' }, { value: 'strict', label: 'Nghiem ngat' }] },
    { name: 'contactTracing', label: 'Truy vet tiep xuc', type: 'textarea', span: 24, rows: 2, placeholder: 'So nguoi tiep xuc, tinh trang, bien phap' },
    { name: 'transmissionRoute', label: 'Duong lay truyen', type: 'multiselect', span: 12, options: [
      { value: 'respiratory', label: 'Ho hap' }, { value: 'fecal_oral', label: 'Phan-mieng' },
      { value: 'blood', label: 'Duong mau' }, { value: 'sexual', label: 'Tinh duc' }, { value: 'vector', label: 'Trung gian' }] },
    { name: 'notifiableDisease', label: 'Nhom benh bao cao', type: 'select', span: 12, options: [
      { value: 'none', label: 'Khong' }, { value: 'groupA', label: 'Nhom A (Dac biet nguy hiem)' },
      { value: 'groupB', label: 'Nhom B (Nguy hiem)' }, { value: 'groupC', label: 'Nhom C (It nguy hiem)' }] },
    { name: 'antibioticRegimen', label: 'Phac do khang sinh', type: 'textarea', span: 24, rows: 2, placeholder: 'Ten thuoc, lieu, duong dung, thoi gian' },
  ]},
};

// ===================== Render field helper =====================

const renderField = (field: FieldDef): React.ReactNode => {
  const name = ['specialtyData', field.name];
  const common = { placeholder: field.placeholder };
  switch (field.type) {
    case 'text': return <Form.Item name={name} label={field.label}><Input {...common} /></Form.Item>;
    case 'textarea': return <Form.Item name={name} label={field.label}><TextArea rows={field.rows || 2} {...common} /></Form.Item>;
    case 'number': return (
      <Form.Item name={name} label={field.label}>
        <InputNumber min={field.min} max={field.max} step={field.step} style={{ width: '100%' }} addonAfter={field.addonAfter} />
      </Form.Item>
    );
    case 'select': return (
      <Form.Item name={name} label={field.label}>
        <Select placeholder={field.placeholder || 'Chon'} options={field.options} allowClear />
      </Form.Item>
    );
    case 'multiselect': return (
      <Form.Item name={name} label={field.label}>
        <Select mode="multiple" placeholder={field.placeholder || 'Chon'} options={field.options} />
      </Form.Item>
    );
    case 'tags': return (
      <Form.Item name={name} label={field.label}>
        <Select mode="tags" placeholder={field.placeholder || 'Nhap'} options={field.options} />
      </Form.Item>
    );
    case 'checkbox': return (
      <Form.Item name={name} label={field.label}>
        <Checkbox.Group options={field.options} />
      </Form.Item>
    );
    default: return <Form.Item name={name} label={field.label}><Input /></Form.Item>;
  }
};

const renderSpecialtySection = (specialtyKey: string): React.ReactNode => {
  const config = SPECIALTY_FIELDS[specialtyKey];
  if (!config) return <Alert title="Vui long chon chuyen khoa" type="info" showIcon />;
  return (
    <>
      <Divider orientation="left">{config.title}</Divider>
      <Row gutter={16}>
        {config.fields.map(field => (
          <Col span={field.span || 24} key={field.name}>{renderField(field)}</Col>
        ))}
      </Row>
    </>
  );
};

// ===================== Status maps =====================

const statusColors: Record<number, string> = { 0: 'default', 1: 'processing', 2: 'warning', 3: 'success' };
const statusNames: Record<number, string> = { 0: 'Nhap', 1: 'Dang dieu tri', 2: 'Cho duyet', 3: 'Hoan thanh' };

// ===================== Component =====================

const SpecialtyEMR: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([dayjs().subtract(30, 'day'), dayjs()]);
  const [specialtyFilter, setSpecialtyFilter] = useState<string | undefined>(undefined);
  const [records, setRecords] = useState<SpecialtyRecordDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SpecialtyRecordDto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSpecialty, setModalSpecialty] = useState<string>('surgical');
  const [formLoading, setFormLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSearch = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: SearchParams = {
        keyword: searchKeyword, specialtyType: specialtyFilter,
        fromDate: dateRange[0]?.format('YYYY-MM-DD'), toDate: dateRange[1]?.format('YYYY-MM-DD'),
        pageIndex: page - 1, pageSize,
      };
      const result = await specialtyEMRApi.search(params);
      if (Array.isArray(result)) { setRecords(result); setTotalCount(result.length); }
      else if (result?.items) { setRecords(result.items); setTotalCount(result.totalCount || 0); }
      setCurrentPage(page);
    } catch { message.warning('Khong the tai du lieu'); }
    finally { setLoading(false); }
  }, [searchKeyword, specialtyFilter, dateRange, pageSize]);

  const handleCreate = () => { form.resetFields(); setSelectedRecord(null); setModalSpecialty('surgical'); setModalOpen(true); };

  const handleEdit = async (record: SpecialtyRecordDto) => {
    setSelectedRecord(record); setModalSpecialty(record.specialtyType);
    const detail = await specialtyEMRApi.getById(record.id);
    form.setFieldsValue({ ...(detail || record), createdAt: dayjs((detail || record).createdAt || undefined) });
    setModalOpen(true);
  };

  const handleDelete = (record: SpecialtyRecordDto) => {
    Modal.confirm({
      title: 'Xac nhan xoa', content: `Xoa ho so cua ${record.patientName}?`,
      okText: 'Xoa', cancelText: 'Huy', okButtonProps: { danger: true },
      onOk: async () => {
        const r = await specialtyEMRApi.delete(record.id);
        if (r) { message.success('Da xoa'); handleSearch(currentPage); }
        else message.warning('Khong the xoa');
      },
    });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setFormLoading(true);
      const payload = { ...values, specialtyType: modalSpecialty, id: selectedRecord?.id,
        createdAt: values.createdAt?.format?.('YYYY-MM-DDTHH:mm:ss') || dayjs().format('YYYY-MM-DDTHH:mm:ss') };
      const result = await specialtyEMRApi.save(payload);
      if (result) { message.success(selectedRecord ? 'Da cap nhat' : 'Da tao moi'); }
      else { message.warning('API chua san sang'); }
      setModalOpen(false); handleSearch(currentPage);
    } catch { /* validation */ }
    finally { setFormLoading(false); }
  };

  const handleExport = async (id: string, type: 'pdf' | 'xml') => {
    const fn = type === 'pdf' ? specialtyEMRApi.exportPdf : specialtyEMRApi.exportXml;
    const result = await fn(id);
    if (result?.data) {
      const url = window.URL.createObjectURL(new Blob([result.data]));
      const a = document.createElement('a'); a.href = url; a.download = `specialty-emr-${id}.${type}`;
      a.click(); window.URL.revokeObjectURL(url);
    } else { message.warning(`Xuat ${type.toUpperCase()} chua san sang`); }
  };

  const columns = [
    { title: 'STT', key: 'idx', width: 55, render: (_: unknown, __: unknown, i: number) => (currentPage - 1) * pageSize + i + 1 },
    { title: 'Ma BN', dataIndex: 'patientCode', width: 100 },
    { title: 'Ho ten', dataIndex: 'patientName', width: 150 },
    { title: 'Chuyen khoa', dataIndex: 'specialtyType', width: 130,
      render: (v: string) => { const s = SPECIALTY_TYPES.find(t => t.key === v); return s ? <Tag color="blue">{s.label}</Tag> : v; } },
    { title: 'Ngay tao', dataIndex: 'createdAt', width: 105, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
    { title: 'BS dieu tri', dataIndex: 'doctorName', width: 130 },
    { title: 'Trang thai', dataIndex: 'status', width: 100,
      render: (v: number) => <Tag color={statusColors[v] || 'default'}>{statusNames[v] || 'N/A'}</Tag> },
    { title: 'Thao tac', key: 'actions', width: 180, fixed: 'right' as const,
      render: (_: unknown, rec: SpecialtyRecordDto) => (
        <Space>
          <Tooltip title="Sua"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(rec)} /></Tooltip>
          <Tooltip title="PDF"><Button type="link" size="small" icon={<FilePdfOutlined />} onClick={() => handleExport(rec.id, 'pdf')} /></Tooltip>
          <Tooltip title="XML"><Button type="link" size="small" icon={<FileExcelOutlined />} onClick={() => handleExport(rec.id, 'xml')} /></Tooltip>
          <Tooltip title="Xoa"><Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(rec)} /></Tooltip>
        </Space>
      ) },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Title level={4}><MedicineBoxOutlined /> Ho so benh an chuyen khoa</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]} align="bottom">
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Tu khoa</Text>
            <Input placeholder="Ma BN, ho ten, CCCD..." prefix={<SearchOutlined />}
              value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
              onPressEnter={() => handleSearch(1)} allowClear />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Chuyen khoa</Text>
            <Select placeholder="Tat ca chuyen khoa" value={specialtyFilter}
              onChange={v => setSpecialtyFilter(v)} allowClear style={{ width: '100%' }}
              options={SPECIALTY_TYPES.map(s => ({ value: s.key, label: s.label }))} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Khoang thoi gian</Text>
            <RangePicker value={dateRange} onChange={v => setDateRange(v as [Dayjs | null, Dayjs | null])}
              format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => handleSearch(1)}>Tim kiem</Button>
              <Button icon={<ReloadOutlined />} onClick={() => handleSearch(currentPage)}>Lam moi</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Tao moi</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card size="small">
        <Spin spinning={loading}>
          {records.length === 0 && !loading
            ? <Empty description="Khong co du lieu. Nhan Tim kiem hoac Tao moi de bat dau." />
            : <Table dataSource={records} columns={columns} rowKey="id" size="small" scroll={{ x: 1000 }}
                pagination={{ current: currentPage, pageSize, total: totalCount,
                  showTotal: t => `Tong: ${t} ban ghi`, onChange: p => handleSearch(p) }}
                onRow={r => ({ onDoubleClick: () => handleEdit(r), style: { cursor: 'pointer' } })} />}
        </Spin>
      </Card>

      <Modal title={selectedRecord ? 'Chinh sua ho so chuyen khoa' : 'Tao ho so chuyen khoa moi'}
        open={modalOpen} onCancel={() => setModalOpen(false)} width={900} destroyOnHidden
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>Huy</Button>,
          <Button key="print" icon={<PrinterOutlined />} onClick={() => selectedRecord ? handleExport(selectedRecord.id, 'pdf') : message.info('Luu truoc khi in')}>In</Button>,
          <Button key="save" type="primary" icon={<SaveOutlined />} loading={formLoading} onClick={handleSave}>Luu</Button>,
        ]}>
        <Form form={form} layout="vertical" size="small">
          <Divider orientation="left">Thong tin chung</Divider>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="patientCode" label="Ma benh nhan" rules={[{ required: true, message: 'Bat buoc' }]}><Input placeholder="Ma BN" /></Form.Item></Col>
            <Col span={8}><Form.Item name="patientName" label="Ho ten" rules={[{ required: true, message: 'Bat buoc' }]}><Input placeholder="Ho ten BN" /></Form.Item></Col>
            <Col span={8}><Form.Item name="createdAt" label="Ngay tao"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="doctorName" label="BS dieu tri"><Input placeholder="Ten bac si" /></Form.Item></Col>
            <Col span={8}><Form.Item name="departmentName" label="Khoa/Phong"><Input placeholder="Khoa" /></Form.Item></Col>
            <Col span={8}><Form.Item name="diagnosisIcd" label="ICD-10"><Input placeholder="VD: J18.9" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={16}><Form.Item name="diagnosisText" label="Chan doan"><Input placeholder="Mo ta chan doan" /></Form.Item></Col>
            <Col span={8}>
              <Form.Item label="Chuyen khoa">
                <Select value={modalSpecialty} onChange={v => setModalSpecialty(v)}
                  options={SPECIALTY_TYPES.map(s => ({ value: s.key, label: s.label }))} />
              </Form.Item>
            </Col>
          </Row>
          {renderSpecialtySection(modalSpecialty)}
        </Form>
      </Modal>

      {selectedRecord && !modalOpen && (
        <Card size="small" style={{ marginTop: 16 }} title="Thong tin benh nhan">
          <Descriptions size="small" column={4}>
            <Descriptions.Item label="Ma BN">{selectedRecord.patientCode}</Descriptions.Item>
            <Descriptions.Item label="Ho ten">{selectedRecord.patientName}</Descriptions.Item>
            <Descriptions.Item label="Gioi tinh">{selectedRecord.gender}</Descriptions.Item>
            <Descriptions.Item label="Ngay sinh">{selectedRecord.dateOfBirth ? dayjs(selectedRecord.dateOfBirth).format('DD/MM/YYYY') : ''}</Descriptions.Item>
            <Descriptions.Item label="Chuyen khoa">{SPECIALTY_TYPES.find(s => s.key === selectedRecord.specialtyType)?.label}</Descriptions.Item>
            <Descriptions.Item label="BS dieu tri">{selectedRecord.doctorName}</Descriptions.Item>
            <Descriptions.Item label="Chan doan">{selectedRecord.diagnosisText}</Descriptions.Item>
            <Descriptions.Item label="Trang thai"><Tag color={statusColors[selectedRecord.status]}>{statusNames[selectedRecord.status]}</Tag></Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  );
};

export default SpecialtyEMR;
