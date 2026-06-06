/**
 * Trang công khai: Tra cứu hồ sơ bệnh án đã ký số bằng CCCD + ngày sinh.
 * KHÔNG yêu cầu đăng nhập. Privacy: bắt buộc 2 yếu tố (CCCD + ngày sinh),
 * token ngắn hạn cấp ở bước tra cứu mới cho phép tải PDF.
 */

import { useState } from 'react';
import {
  Card, Form, Input, DatePicker, Button, Typography, Tag, Space, Alert, Empty, message,
} from 'antd';
import {
  SafetyCertificateOutlined, IdcardOutlined, FileProtectOutlined, SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { lookupPublicEmr, buildPublicEmrPdfUrl, type PublicEmrDocument } from '../api/publicEmr';
import { HOSPITAL_NAME } from '../constants/hospital';

const { Title, Text, Paragraph } = Typography;

interface LookupFormValues {
  identityNumber: string;
  dateOfBirth: dayjs.Dayjs;
}

export default function PublicEmrLookup() {
  const [form] = Form.useForm<LookupFormValues>();
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [token, setToken] = useState<string | undefined>();
  const [patientName, setPatientName] = useState<string | undefined>();
  const [documents, setDocuments] = useState<PublicEmrDocument[]>([]);
  const [resultMessage, setResultMessage] = useState<string | undefined>();

  const handleSearch = async (values: LookupFormValues) => {
    setLoading(true);
    setSearched(false);
    try {
      const res = await lookupPublicEmr({
        identityNumber: values.identityNumber.trim(),
        dateOfBirth: values.dateOfBirth.format('YYYY-MM-DD'),
      });
      setSearched(true);
      setToken(res.token);
      setPatientName(res.patientNameMasked);
      setDocuments(res.documents ?? []);
      setResultMessage(res.message);
      if (!res.success && res.message) message.warning(res.message);
    } catch {
      message.error('Không thể kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const openPdf = (doc: PublicEmrDocument) => {
    if (!token) {
      message.warning('Phiên tra cứu đã hết hạn. Vui lòng tra cứu lại.');
      return;
    }
    window.open(buildPublicEmrPdfUrl(doc.documentId, token), '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <SafetyCertificateOutlined style={{ fontSize: 40, color: '#1677ff' }} />
          <Title level={3} style={{ marginTop: 12, marginBottom: 4 }}>
            Tra cứu hồ sơ bệnh án điện tử
          </Title>
          <Text type="secondary">{HOSPITAL_NAME}</Text>
        </div>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          title="Nhập đúng số CCCD/CMND và ngày sinh đã đăng ký để tra cứu các tài liệu hồ sơ bệnh án đã được ký số."
        />

        <Form form={form} layout="vertical" onFinish={handleSearch} requiredMark={false}>
          <Form.Item
            name="identityNumber"
            label="Số CCCD/CMND"
            rules={[
              { required: true, message: 'Vui lòng nhập số CCCD/CMND' },
              { pattern: /^\d{9,12}$/, message: 'CCCD/CMND gồm 9–12 chữ số' },
            ]}
          >
            <Input
              prefix={<IdcardOutlined />}
              placeholder="Nhập số CCCD/CMND"
              size="large"
              maxLength={12}
              inputMode="numeric"
            />
          </Form.Item>

          <Form.Item
            name="dateOfBirth"
            label="Ngày sinh"
            rules={[{ required: true, message: 'Vui lòng chọn ngày sinh' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              size="large"
              format="DD/MM/YYYY"
              placeholder="DD/MM/YYYY"
              disabledDate={(d) => d && d.isAfter(dayjs(), 'day')}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              icon={<SearchOutlined />}
            >
              Tra cứu
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {searched && (
        <Card style={{ marginTop: 16 }} title="Kết quả tra cứu">
          {documents.length === 0 ? (
            <Empty description={resultMessage || 'Không tìm thấy tài liệu phù hợp.'} />
          ) : (
            <>
              {patientName && (
                <Paragraph>
                  Bệnh nhân: <Text strong>{patientName}</Text>{' '}
                  <Tag color="green">{documents.length} tài liệu đã ký số</Tag>
                </Paragraph>
              )}
              <Space orientation="vertical" style={{ width: '100%' }} size={12}>
                {documents.map((doc) => (
                  <Card key={doc.documentId} size="small" styles={{ body: { padding: 12 } }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <div>
                        <Space>
                          <FileProtectOutlined style={{ color: '#1677ff' }} />
                          <Text strong>{doc.documentTypeName}</Text>
                          {doc.caProvider && <Tag color="blue">{doc.caProvider}</Tag>}
                        </Space>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Mã: {doc.documentCode} · Ký lúc: {doc.signedAt}
                            {doc.signerName ? ` · Người ký: ${doc.signerName}` : ''}
                          </Text>
                        </div>
                      </div>
                      <Button type="primary" ghost onClick={() => openPdf(doc)}>
                        Xem / Tải PDF
                      </Button>
                    </div>
                  </Card>
                ))}
              </Space>

              <Alert
                style={{ marginTop: 16 }}
                type="warning"
                showIcon
                title="Tài liệu được bảo vệ theo phiên tra cứu hiện tại. Đường dẫn tải sẽ hết hạn sau ít phút — nếu không mở được, vui lòng tra cứu lại."
              />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
