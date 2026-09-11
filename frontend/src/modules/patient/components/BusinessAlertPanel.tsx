import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
  Empty,
  Input,
  Modal,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { BusinessAlertDto, AlertCheckResult } from '../api/businessAlerts';
import {
  checkOpdAlerts,
  checkInpatientAlerts,
  checkRadiologyAlerts,
  checkLabAlerts,
  checkBillingAlerts,
  acknowledgeAlert,
} from '../api/businessAlerts';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

interface BusinessAlertPanelProps {
  patientId?: string;
  examinationId?: string;
  admissionId?: string;
  module: 'OPD' | 'Inpatient' | 'Radiology' | 'Lab' | 'Billing' | 'Prescription';
  compact?: boolean;
  autoCheck?: boolean;
}

const BusinessAlertPanel: React.FC<BusinessAlertPanelProps> = ({
  patientId,
  examinationId,
  admissionId,
  module,
  compact = false,
  autoCheck = true,
}) => {
  const [alerts, setAlerts] = useState<BusinessAlertDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [acknowledgeModal, setAcknowledgeModal] = useState<BusinessAlertDto | null>(null);
  const [actionText, setActionText] = useState('');
  const [criticalCount, setCriticalCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  /** `manual` = người dùng tự bấm "Kiểm tra" → phải có phản hồi. Lượt tự chạy lúc mở màn
   *  thì im lặng như cũ, không bắn toast làm phiền. */
  const fetchAlerts = useCallback(async (manual = false) => {
    if (!patientId) return;
    setLoading(true);
    try {
      const results: AlertCheckResult[] = [];

      // Check alerts based on module
      if (module === 'OPD' || module === 'Prescription') {
        const res = await checkOpdAlerts(patientId, examinationId);
        results.push(res.data);
      }
      if (module === 'Inpatient') {
        const res = await checkInpatientAlerts(patientId, admissionId);
        results.push(res.data);
      }
      if (module === 'Radiology') {
        const res = await checkRadiologyAlerts(patientId);
        results.push(res.data);
      }
      if (module === 'Lab') {
        const res = await checkLabAlerts(patientId);
        results.push(res.data);
      }
      if (module === 'Billing') {
        const res = await checkBillingAlerts(patientId);
        results.push(res.data);
      }

      const allAlerts = results.flatMap((r) => r.newAlerts ?? []);
      setAlerts(allAlerts);
      setCriticalCount(allAlerts.filter((a) => a.severity === 1).length);
      setWarningCount(allAlerts.filter((a) => a.severity === 2).length);
      setCheckedAt(new Date());
      // Bấm "Kiểm tra" mà không có cảnh báo nào thì màn hình y hệt trước đó → người dùng
      // tưởng nút hỏng. Phải nói rõ là ĐÃ kiểm tra xong và kết quả là sạch.
      if (manual) {
        if (allAlerts.length === 0) message.success('Đã kiểm tra — không có cảnh báo nào');
        else message.warning(`Đã kiểm tra — có ${allAlerts.length} cảnh báo`);
      }
    } catch {
      console.warn('BusinessAlertPanel: failed to fetch alerts');
      if (manual) message.error('Không kiểm tra được cảnh báo');
    } finally {
      setLoading(false);
    }
  }, [patientId, examinationId, admissionId, module]);

  useEffect(() => {
    if (autoCheck && patientId) {
      fetchAlerts();
    }
  }, [autoCheck, patientId, fetchAlerts]);

  const handleAcknowledge = async () => {
    if (!acknowledgeModal) return;
    try {
      await acknowledgeAlert(acknowledgeModal.id, actionText || undefined);
      setAlerts((prev) => prev.filter((a) => a.id !== acknowledgeModal.id));
      message.success('Đã xác nhận cảnh báo');
      setAcknowledgeModal(null);
      setActionText('');
    } catch {
      message.warning('Không xác nhận được cảnh báo');
    }
  };

  const getSeverityIcon = (severity: number) => {
    switch (severity) {
      case 1:
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 2:
        return <WarningOutlined style={{ color: '#faad14' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getSeverityType = (severity: number): 'error' | 'warning' | 'info' => {
    switch (severity) {
      case 1:
        return 'error';
      case 2:
        return 'warning';
      default:
        return 'info';
    }
  };

  if (!patientId) return null;

  // Compact mode: just show badge count
  if (compact) {
    const total = alerts.length;
    if (total === 0 && !loading) return null;

    return (
      <Tooltip title={`${criticalCount} nguy kịch, ${warningCount} cảnh báo`}>
        <Badge count={total} size="small" offset={[-2, 0]}>
          <Button
            size="small"
            icon={<BellOutlined />}
            danger={criticalCount > 0}
            onClick={() => fetchAlerts(true)}
            loading={loading}
          >
            {criticalCount > 0 ? `${criticalCount} nguy kịch` : total > 0 ? `${total} cảnh báo` : ''}
          </Button>
        </Badge>
      </Tooltip>
    );
  }

  // Full panel mode
  return (
    <Card
      size="small"
      /* title và extra chia nhau MỘT hàng header hẹp: trước đây "Cảnh báo nghiệp vụ" bị cắt
         cụt còn "Cảnh" rồi chồng lên "đã kiểm HH:mm". Cho title co được (minWidth:0 + ellipsis)
         và dồn giờ đã-kiểm vào tooltip của nút thay vì chiếm chỗ trên header. */
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <BellOutlined style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Cảnh báo nghiệp vụ
          </span>
          {criticalCount > 0 && <Badge count={criticalCount} style={{ backgroundColor: '#ff4d4f', flexShrink: 0 }} />}
          {warningCount > 0 && <Badge count={warningCount} style={{ backgroundColor: '#faad14', flexShrink: 0 }} />}
        </div>
      }
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={() => fetchAlerts(true)}
          loading={loading}
          title={checkedAt ? `Đã kiểm lúc ${dayjs(checkedAt).format('HH:mm')}` : 'Kiểm tra cảnh báo'}
        >
          Kiểm tra
        </Button>
      }
      style={{ marginBottom: 8 }}
    >
      {loading ? (
        <Spin size="small" />
      ) : alerts.length === 0 ? (
        <Empty description="Không có cảnh báo" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Collapse
          size="small"
          items={alerts.map((alert) => ({
            key: alert.id,
            /* KHÔNG dùng <Space>: nó xếp 1 hàng và không cho xuống dòng, nên trong panel hẹp
               (cột trái màn kê đơn chỉ 280px) mọi phần tử bị ép co xuống dưới min-content →
               giờ "13:15" vỡ dọc thành "1 3 :1 5". Đổi sang flex có wrap, và khoá nowrap +
               flexShrink:0 cho mã cảnh báo & giờ để chúng không bao giờ bị bẻ giữa chừng. */
            label: (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, minWidth: 0 }}>
                {getSeverityIcon(alert.severity)}
                <Text strong={alert.severity === 1} style={{ flex: '1 1 auto', minWidth: 0 }}>{alert.title}</Text>
                <Tag color={alert.severityColor} style={{ marginInlineEnd: 0, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {alert.alertCode}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {dayjs(alert.createdAt).format('HH:mm')}
                </Text>
              </div>
            ),
            children: (
              <div>
                <Alert
                  type={getSeverityType(alert.severity)}
                  title={alert.title}
                  description={alert.message}
                  showIcon
                  style={{ marginBottom: 8 }}
                />
                <Space>
                  <Tag>{alert.category}</Tag>
                  <Tag>{alert.module}</Tag>
                  <Button
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={() => setAcknowledgeModal(alert)}
                  >
                    Xac nhan
                  </Button>
                </Space>
              </div>
            ),
          }))}
        />
      )}

      <Modal
        open={!!acknowledgeModal}
        title="Xác nhận cảnh báo"
        onOk={handleAcknowledge}
        onCancel={() => {
          setAcknowledgeModal(null);
          setActionText('');
        }}
        okText="Xác nhận"
        cancelText="Huỷ"
      >
        {acknowledgeModal && (
          <div>
            <Alert
              type={getSeverityType(acknowledgeModal.severity)}
              title={acknowledgeModal.title}
              description={acknowledgeModal.message}
              showIcon
              style={{ marginBottom: 12 }}
            />
            <TextArea
              placeholder="Hành động đã thực hiện (tuỳ chọn)"
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              rows={3}
            />
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default BusinessAlertPanel;
