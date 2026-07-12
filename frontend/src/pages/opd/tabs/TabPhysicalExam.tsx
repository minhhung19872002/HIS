/**
 * Tab Khám lâm sàng — 7 section ClinicalTermSelector + VoiceDictation textarea.
 *
 * Logic preserve: VoiceDictation pattern xuyên parent state qua FormInstance.
 *
 * Extracted khỏi pages/OPD.tsx (K13 Batch 4).
 */
import React from 'react';
import { Col, Form, Input, Row } from 'antd';
import type { FormInstance } from 'antd';
import ClinicalTermSelector from '@/modules/patient/components/ClinicalTermSelector';
import { VoiceDictation } from '@/components/form';

const { TextArea } = Input;

interface TabPhysicalExamProps {
  examForm: FormInstance;
}

const TabPhysicalExam: React.FC<TabPhysicalExamProps> = ({ examForm }) => (
  <Row gutter={16}>
    <Col span={24}>
      <Form.Item
        label="Toàn thân"
        name={['physicalExamination', 'generalAppearance']}
        getValueFromEvent={(v: string) => v}
      >
        <ClinicalTermSelector
          category="Sign"
          bodySystem="General"
          placeholder="Ghi thêm triệu chứng toàn thân..."
          maxHeight={120}
        />
      </Form.Item>
    </Col>
    <Col span={24}>
      <Form.Item
        label="Tim mạch"
        name={['physicalExamination', 'cardiovascular']}
        getValueFromEvent={(v: string) => v}
      >
        <ClinicalTermSelector
          category="Sign"
          bodySystem="Cardiovascular"
          placeholder="Ghi thêm khám tim mạch..."
          maxHeight={120}
        />
      </Form.Item>
    </Col>
    <Col span={24}>
      <Form.Item
        label="Hô hấp"
        name={['physicalExamination', 'respiratory']}
        getValueFromEvent={(v: string) => v}
      >
        <ClinicalTermSelector
          category="Sign"
          bodySystem="Respiratory"
          placeholder="Ghi thêm khám hô hấp..."
          maxHeight={120}
        />
      </Form.Item>
    </Col>
    <Col span={24}>
      <Form.Item
        label="Tiêu hóa"
        name={['physicalExamination', 'gastrointestinal']}
        getValueFromEvent={(v: string) => v}
      >
        <ClinicalTermSelector
          category="Sign"
          bodySystem="GI"
          placeholder="Ghi thêm khám tiêu hóa..."
          maxHeight={120}
        />
      </Form.Item>
    </Col>
    <Col span={24}>
      <Form.Item
        label="Thần kinh"
        name={['physicalExamination', 'neurological']}
        getValueFromEvent={(v: string) => v}
      >
        <ClinicalTermSelector
          category="Sign"
          bodySystem="Neuro"
          placeholder="Ghi thêm khám thần kinh..."
          maxHeight={120}
        />
      </Form.Item>
    </Col>
    <Col span={24}>
      <Form.Item
        label={
          <span>
            Cơ xương khớp{' '}
            <VoiceDictation
              onTranscript={(text) => {
                const prev = examForm.getFieldValue(['physicalExamination', 'musculoskeletal']) || '';
                examForm.setFieldValue(
                  ['physicalExamination', 'musculoskeletal'],
                  prev ? `${prev} ${text}` : text,
                );
              }}
            />
          </span>
        }
        name={['physicalExamination', 'musculoskeletal']}
      >
        <TextArea rows={2} placeholder="Khám cơ xương khớp..." />
      </Form.Item>
    </Col>
    <Col span={24}>
      <Form.Item
        label={
          <span>
            Da{' '}
            <VoiceDictation
              onTranscript={(text) => {
                const prev = examForm.getFieldValue(['physicalExamination', 'skin']) || '';
                examForm.setFieldValue(
                  ['physicalExamination', 'skin'],
                  prev ? `${prev} ${text}` : text,
                );
              }}
            />
          </span>
        }
        name={['physicalExamination', 'skin']}
      >
        <TextArea rows={2} placeholder="Khám da..." />
      </Form.Item>
    </Col>
    <Col span={24}>
      <Form.Item
        label={
          <span>
            Khác{' '}
            <VoiceDictation
              onTranscript={(text) => {
                const prev = examForm.getFieldValue(['physicalExamination', 'other']) || '';
                examForm.setFieldValue(
                  ['physicalExamination', 'other'],
                  prev ? `${prev} ${text}` : text,
                );
              }}
            />
          </span>
        }
        name={['physicalExamination', 'other']}
      >
        <TextArea rows={2} placeholder="Các khám khác..." />
      </Form.Item>
    </Col>
  </Row>
);

export default TabPhysicalExam;
