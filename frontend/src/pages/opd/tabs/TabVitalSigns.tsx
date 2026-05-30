/**
 * Tab Sinh hiệu — 9 InputNumber Form.Item + BMI auto-compute logic.
 *
 * Logic preserve:
 * - BMI tự tính khi onChange weight HOẶC height (đọc field còn lại qua
 *   `examForm.getFieldValue` + `examForm.setFieldValue`). Pattern này GIỮ
 *   nguyên — KHÔNG dùng watch để tránh re-render mỗi keystroke.
 * - NEWS2 card chỉ hiện khi `earlyWarningScore` !== null (parent fetch CDS).
 *
 * Extracted khỏi pages/OPD.tsx (K13 Batch 3).
 */
import React from 'react';
import { Card, Col, Form, InputNumber, Row, Tag, Typography } from 'antd';
import type { FormInstance } from 'antd';
import type { EarlyWarningScore } from '../../../api/clinicalDecisionSupport';

const { Text } = Typography;

interface TabVitalSignsProps {
  examForm: FormInstance;
  earlyWarningScore: EarlyWarningScore | null;
}

const TabVitalSigns: React.FC<TabVitalSignsProps> = ({ examForm, earlyWarningScore }) => (
  <>
    <Row gutter={16}>
      <Col xs={24} sm={12} md={8}>
        <Form.Item label="Cân nặng (kg)" name={['vitalSigns', 'weight']}>
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
        <Form.Item label="Chiều cao (cm)" name={['vitalSigns', 'height']}>
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
        <Form.Item label="Huyết áp tâm thu (mmHg)" name={['vitalSigns', 'bloodPressureSystolic']}>
          <InputNumber min={0} max={300} style={{ width: '100%' }} placeholder="VD: 120" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Form.Item label="Huyết áp tâm trương (mmHg)" name={['vitalSigns', 'bloodPressureDiastolic']}>
          <InputNumber min={0} max={200} style={{ width: '100%' }} placeholder="VD: 80" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Form.Item label="Nhiệt độ (°C)" name={['vitalSigns', 'temperature']}>
          <InputNumber min={30} max={45} step={0.1} style={{ width: '100%' }} placeholder="VD: 36.5" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Form.Item label="Mạch (lần/phút)" name={['vitalSigns', 'pulse']}>
          <InputNumber min={0} max={300} style={{ width: '100%' }} placeholder="VD: 72" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Form.Item label="Nhịp thở (lần/phút)" name={['vitalSigns', 'respiratoryRate']}>
          <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="VD: 18" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Form.Item label="SpO2 (%)" name={['vitalSigns', 'spo2']}>
          <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="VD: 98" />
        </Form.Item>
      </Col>
    </Row>

    {/* NEWS2 Early Warning Score */}
    {earlyWarningScore && (
      <Card
        size="small"
        style={{
          marginTop: 12,
          borderColor:
            earlyWarningScore.riskColor === 'red'
              ? '#ff4d4f'
              : earlyWarningScore.riskColor === 'orange'
                ? '#fa8c16'
                : earlyWarningScore.riskColor === 'gold'
                  ? '#faad14'
                  : '#52c41a',
        }}
      >
        <Row align="middle" gutter={16}>
          <Col>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 'bold',
                  color:
                    earlyWarningScore.riskColor === 'green'
                      ? '#52c41a'
                      : earlyWarningScore.riskColor === 'gold'
                        ? '#faad14'
                        : earlyWarningScore.riskColor === 'orange'
                          ? '#fa8c16'
                          : '#ff4d4f',
                }}
              >
                {earlyWarningScore.totalScore}
              </div>
              <Tag
                color={
                  earlyWarningScore.riskColor === 'green'
                    ? 'success'
                    : earlyWarningScore.riskColor === 'gold'
                      ? 'warning'
                      : earlyWarningScore.riskColor === 'orange'
                        ? 'orange'
                        : 'error'
                }
              >
                NEWS2: {earlyWarningScore.riskLevel}
              </Tag>
            </div>
          </Col>
          <Col flex="auto">
            <Text strong>Khuyến nghị: </Text>
            <Text>{earlyWarningScore.recommendation}</Text>
            <div style={{ marginTop: 4 }}>
              {earlyWarningScore.parameters
                .filter((p) => p.score > 0)
                .map((p, i) => (
                  <Tag key={i} color={p.score >= 3 ? 'red' : p.score >= 2 ? 'orange' : 'gold'}>
                    {p.name}: {p.value} (+{p.score})
                  </Tag>
                ))}
            </div>
          </Col>
        </Row>
      </Card>
    )}
  </>
);

export default TabVitalSigns;
