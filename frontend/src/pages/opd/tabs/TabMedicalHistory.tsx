/**
 * Tab Bệnh sử & Triệu chứng — chief complaint + history + voice dictation.
 *
 * Logic preserve: VoiceDictation transcript chèn vào field hiện có (giữ
 * pattern `prev ? `${prev} ${text}` : text`).
 *
 * Extracted khỏi pages/OPD.tsx (K13 Batch 4).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Col, Form, Input, Row, Select, message } from 'antd';
import type { FormInstance } from 'antd';
import ClinicalTermSelector from '../../../components/ClinicalTermSelector';
import VoiceDictation from '../../../components/VoiceDictation';
import { getOutpatientRecordTemplates, getOutpatientRecordTemplate } from '../../../modules/patient/api/clinicalNarratives';
import type { OutpatientRecordTemplateDto } from '../../../modules/patient/api/clinicalNarratives';

const { TextArea } = Input;

interface TabMedicalHistoryProps {
  examForm: FormInstance;
}

const TabMedicalHistory: React.FC<TabMedicalHistoryProps> = ({ examForm }) => {
  const [templates, setTemplates] = useState<OutpatientRecordTemplateDto[]>([]);

  useEffect(() => {
    getOutpatientRecordTemplates().then(r => setTemplates(r.data || [])).catch(() => {});
  }, []);

  const handleApplyTemplate = useCallback(async (templateId: string) => {
    try {
      const res = await getOutpatientRecordTemplate(templateId);
      const t = res.data;
      if (!t) return;
      examForm.setFieldsValue({
        medicalHistory: {
          chiefComplaint: t.chiefComplaint || undefined,
          historyOfPresentIllness: t.medicalHistory || undefined,
          pastMedicalHistory: t.physicalExamination || undefined,
          familyHistory: undefined,
        },
        physicalExamination: {
          generalAppearance: t.generalExamBody || undefined,
          cardiovascular: t.cardiovascularExam || undefined,
          respiratory: t.respiratoryExam || undefined,
          gastrointestinal: t.giExam || undefined,
          neurological: t.neuroExam || undefined,
        },
      });
      message.success(`Đã áp dụng mẫu HSBA "${t.templateName}"`);
    } catch {
      message.warning('Không thể tải mẫu HSBA');
    }
  }, [examForm]);

  return (
  <Row gutter={16}>
    {templates.length > 0 && (
      <Col span={24} style={{ marginBottom: 12 }}>
        <Select
          placeholder="📋 Chọn mẫu HSBA ngoại trú để điền nhanh..."
          allowClear
          showSearch
          optionFilterProp="label"
          onChange={handleApplyTemplate}
          options={templates.map(t => ({
            value: t.id,
            label: `${t.templateCode} — ${t.templateName}${t.diagnosisCode ? ` (${t.diagnosisCode})` : ''}`,
          }))}
          style={{ width: '100%' }}
        />
      </Col>
    )}
    <Col span={24}>
      <Form.Item
        label="Lý do khám (triệu chứng)"
        name={['medicalHistory', 'chiefComplaint']}
        getValueFromEvent={(v: string) => v}
      >
        <ClinicalTermSelector
          category="Symptom"
          placeholder="Ghi thêm triệu chứng khác..."
          maxHeight={150}
        />
      </Form.Item>
    </Col>
    <Col span={24}>
      <Form.Item
        label={
          <span>
            Bệnh sử{' '}
            <VoiceDictation
              onTranscript={(text) => {
                const prev = examForm.getFieldValue(['medicalHistory', 'historyOfPresentIllness']) || '';
                examForm.setFieldValue(
                  ['medicalHistory', 'historyOfPresentIllness'],
                  prev ? `${prev} ${text}` : text,
                );
              }}
            />
          </span>
        }
        name={['medicalHistory', 'historyOfPresentIllness']}
      >
        <TextArea rows={4} placeholder="Nhập quá trình bệnh lý hiện tại..." />
      </Form.Item>
    </Col>
    <Col span={24}>
      <Form.Item
        label={
          <span>
            Tiền sử bệnh{' '}
            <VoiceDictation
              onTranscript={(text) => {
                const prev = examForm.getFieldValue(['medicalHistory', 'pastMedicalHistory']) || '';
                examForm.setFieldValue(
                  ['medicalHistory', 'pastMedicalHistory'],
                  prev ? `${prev} ${text}` : text,
                );
              }}
            />
          </span>
        }
        name={['medicalHistory', 'pastMedicalHistory']}
      >
        <TextArea rows={3} placeholder="Các bệnh đã mắc, phẫu thuật..." />
      </Form.Item>
    </Col>
    <Col span={24}>
      <Form.Item
        label={
          <span>
            Tiền sử gia đình{' '}
            <VoiceDictation
              onTranscript={(text) => {
                const prev = examForm.getFieldValue(['medicalHistory', 'familyHistory']) || '';
                examForm.setFieldValue(
                  ['medicalHistory', 'familyHistory'],
                  prev ? `${prev} ${text}` : text,
                );
              }}
            />
          </span>
        }
        name={['medicalHistory', 'familyHistory']}
      >
        <TextArea rows={2} placeholder="Bệnh lý gia đình..." />
      </Form.Item>
    </Col>
    <Col span={24}>
      <Form.Item
        label={
          <span>
            Dị ứng{' '}
            <VoiceDictation
              onTranscript={(text) => {
                const prev = examForm.getFieldValue(['medicalHistory', 'allergies']) || '';
                examForm.setFieldValue(
                  ['medicalHistory', 'allergies'],
                  prev ? `${prev} ${text}` : text,
                );
              }}
            />
          </span>
        }
        name={['medicalHistory', 'allergies']}
      >
        <TextArea rows={2} placeholder="Dị ứng thuốc, thực phẩm..." />
      </Form.Item>
    </Col>
    <Col span={24}>
      <Form.Item label="Thuốc đang dùng" name={['medicalHistory', 'currentMedications']}>
        <TextArea rows={2} placeholder="Các thuốc đang sử dụng..." />
      </Form.Item>
    </Col>
  </Row>
  );
};

export default TabMedicalHistory;
