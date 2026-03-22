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

  const fetchAlerts = useCallback(async () => {
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

      const allAlerts = results.flatMap((r) => r.newAlerts);
      setAlerts(allAlerts);
      setCriticalCount(allAlerts.filter((a) => a.severity === 1).length);
      setWarningCount(allAlerts.filter((a) => a.severity === 2).length);
    } catch {
      // Silent fail - alerts are supplementary
      console.warn('BusinessAlertPanel: failed to fetch alerts');
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
      message.success('Da xac nhan canh bao');
      setAcknowledgeModal(null);
      setActionText('');
    } catch {
      message.warning('Khong the xac nhan canh bao');
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
      <Tooltip title={`${criticalCount} nguy kich, ${warningCount} canh bao`}>
        <Badge count={total} size="small" offset={[-2, 0]}>
          <Button
            size="small"
            icon={<BellOutlined />}
            danger={criticalCount > 0}
            onClick={fetchAlerts}
            loading={loading}
          >
            {criticalCount > 0 ? `${criticalCount} nguy kich` : total > 0 ? `${total} canh bao` : ''}
          </Button>
        </Badge>
      </Tooltip>
    );
  }

  // Full panel mode
  return (
    <Card
      size="small"
      title={
        <Space>
          <BellOutlined />
          <span>Canh bao nghiep vu</span>
          {criticalCount > 0 && <Badge count={criticalCount} style={{ backgroundColor: '#ff4d4f' }} />}
          {warningCount > 0 && <Badge count={warningCount} style={{ backgroundColor: '#faad14' }} />}
        </Space>
      }
      extra={
        <Button size="small" icon={<ReloadOutlined />} onClick={fetchAlerts} loading={loading}>
          Kiem tra
        </Button>
      }
      style={{ marginBottom: 8 }}
    >
      {loading ? (
        <Spin size="small" />
      ) : alerts.length === 0 ? (
        <Empty description="Khong co canh bao" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Collapse
          size="small"
          items={alerts.map((alert) => ({
            key: alert.id,
            label: (
              <Space>
                {getSeverityIcon(alert.severity)}
                <Text strong={alert.severity === 1}>{alert.title}</Text>
                <Tag color={alert.severityColor}>{alert.alertCode}</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(alert.createdAt).format('HH:mm')}
                </Text>
              </Space>
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
        title="Xac nhan canh bao"
        onOk={handleAcknowledge}
        onCancel={() => {
          setAcknowledgeModal(null);
          setActionText('');
        }}
        okText="Xac nhan"
        cancelText="Huy"
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
              placeholder="Hanh dong da thuc hien (tuy chon)"
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
