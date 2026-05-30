/**
 * Tab Dị ứng — render bên trong `<Form>` parent (Form context provides
 * Form.Item nested name binding). KHÔNG cần props vì purely presentational.
 *
 * Extracted khỏi pages/OPD.tsx (K13 Batch 2).
 */
import React from 'react';
import { Alert, Col, Form, Input, Row } from 'antd';

const { TextArea } = Input;

const TabAllergies: React.FC = () => (
  <>
    <Alert
      title="Dị ứng thuốc / thực phẩm"
      description="Ghi nhận các loại dị ứng để hệ thống kiểm tra tương kỵ khi kê đơn. Click 'Thêm dị ứng' để thêm từng mục."
      type="warning"
      showIcon
      style={{ marginBottom: 12 }}
    />
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Dị ứng thuốc" name={['medicalHistory', 'drugAllergies']}>
          <TextArea
            rows={3}
            placeholder="VD: Penicillin (nổi mày đay), Sulfamide (shock phản vệ)"
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Dị ứng thức ăn" name={['medicalHistory', 'foodAllergies']}>
          <TextArea rows={3} placeholder="VD: Hải sản, đậu phộng" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item label="Mức độ + Phản ứng" name={['medicalHistory', 'allergyReaction']}>
          <TextArea
            rows={2}
            placeholder="VD: Độ 1-4, biểu hiện: mày đay, khó thở, shock..."
          />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item label="Ghi chú dị ứng khác" name={['medicalHistory', 'allergies']}>
          <TextArea rows={2} placeholder="Dị ứng khác..." />
        </Form.Item>
      </Col>
    </Row>
  </>
);

export default TabAllergies;
