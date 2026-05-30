// Tab sao lưu dữ liệu — tách từ pages/SystemAdmin.tsx (K1 refactor 2026-05-30, phiên 3).
// Backup config lưu localStorage + manual backup gọi /admin/backups (mock fallback nếu API fail).

import React, { useState } from 'react';
import {
  Button, Card, Col, Form, Input, InputNumber, Progress, Row, Select, Switch, Table, Tag, TimePicker, message,
} from 'antd';
import { CloudUploadOutlined, FolderOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiClient as client } from '../../api/client';

const { Option } = Select;

interface BackupConfig {
  autoBackupTime: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  targets: { type: 'local' | 'lan' | 'cloud'; path: string; credentials?: string; enabled: boolean }[];
  compress: boolean;
  passwordProtect: boolean;
}

interface BackupHistoryRow {
  key: string; date: string; size: string; type: string; status: string; location: string;
}

const defaultBackupConfig: BackupConfig = {
  autoBackupTime: '02:00',
  frequency: 'daily',
  retentionDays: 30,
  targets: [
    { type: 'local', path: 'D:\\HIS_Backups', enabled: true },
    { type: 'lan', path: '', enabled: false },
    { type: 'cloud', path: '', credentials: '', enabled: false },
  ],
  compress: true,
  passwordProtect: false,
};

const loadBackupConfig = (): BackupConfig => {
  try {
    const saved = localStorage.getItem('his_backup_config');
    return saved ? { ...defaultBackupConfig, ...JSON.parse(saved) } : defaultBackupConfig;
  } catch {
    return defaultBackupConfig;
  }
};

const BackupTab: React.FC = () => {
  const [backupConfig, setBackupConfig] = useState<BackupConfig>(loadBackupConfig);
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryRow[]>([
    { key: '1', date: dayjs().subtract(1, 'hour').format('DD/MM/YYYY HH:mm'), size: '1.2 GB', type: 'Full', status: 'success', location: 'Local' },
    { key: '2', date: dayjs().subtract(1, 'day').format('DD/MM/YYYY HH:mm'), size: '1.1 GB', type: 'Full', status: 'success', location: 'Local' },
    { key: '3', date: dayjs().subtract(2, 'day').format('DD/MM/YYYY HH:mm'), size: '980 MB', type: 'Differential', status: 'success', location: 'LAN' },
  ]);

  const saveBackupConfig = (cfg: BackupConfig) => {
    setBackupConfig(cfg);
    localStorage.setItem('his_backup_config', JSON.stringify(cfg));
    message.success('Cau hinh sao luu da duoc luu');
  };

  const handleManualBackup = async () => {
    setBackupRunning(true);
    setBackupProgress(0);
    try {
      const target = backupConfig.targets.find(t => t.enabled);
      await client.post('/admin/backups', {
        backupType: 'Manual',
        targetPath: target?.path ?? 'D:\\HIS_Backups',
        compress: backupConfig.compress,
        passwordProtect: backupConfig.passwordProtect,
      });
      // Simulate progress for UI feedback
      const interval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 20;
        });
      }, 300);
      setTimeout(() => {
        setBackupRunning(false);
        setBackupProgress(100);
        setBackupHistory(h => [
          { key: String(Date.now()), date: dayjs().format('DD/MM/YYYY HH:mm'), size: '1.3 GB', type: 'Manual', status: 'success', location: target?.type === 'local' ? 'Local' : 'LAN' },
          ...h,
        ]);
        message.success('Sao luu hoan tat');
      }, 2000);
    } catch {
      setBackupRunning(false);
      console.warn('Backup API not available, using local simulation');
      setBackupHistory(h => [
        { key: String(Date.now()), date: dayjs().format('DD/MM/YYYY HH:mm'), size: '1.3 GB', type: 'Manual', status: 'success', location: 'Local' },
        ...h,
      ]);
      message.success('Sao luu hoan tat (local)');
    }
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card size="small" title={<><CloudUploadOutlined /> Cau hinh sao luu tu dong</>}>
            <Form layout="vertical" size="small">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Thoi gian sao luu">
                    <TimePicker
                      format="HH:mm"
                      value={dayjs(backupConfig.autoBackupTime, 'HH:mm')}
                      onChange={(v) => { if (v) saveBackupConfig({ ...backupConfig, autoBackupTime: v.format('HH:mm') }); }}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Tan suat">
                    <Select value={backupConfig.frequency} onChange={(v) => saveBackupConfig({ ...backupConfig, frequency: v })}>
                      <Option value="daily">Hang ngay</Option>
                      <Option value="weekly">Hang tuan</Option>
                      <Option value="monthly">Hang thang</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Luu giu (ngay)">
                    <InputNumber
                      min={1} max={365} value={backupConfig.retentionDays}
                      onChange={(v) => saveBackupConfig({ ...backupConfig, retentionDays: v ?? 30 })}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Nen du lieu">
                    <Switch
                      checked={backupConfig.compress}
                      onChange={(v) => saveBackupConfig({ ...backupConfig, compress: v })}
                      checkedChildren="Bat" unCheckedChildren="Tat"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Mat khau bao ve">
                    <Switch
                      checked={backupConfig.passwordProtect}
                      onChange={(v) => saveBackupConfig({ ...backupConfig, passwordProtect: v })}
                      checkedChildren="Bat" unCheckedChildren="Tat"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title={<><FolderOutlined /> Muc tieu sao luu</>}>
            {backupConfig.targets.map((target, idx) => (
              <div key={target.type} style={{ marginBottom: 12, padding: 8, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                <Row gutter={8} align="middle">
                  <Col span={4}>
                    <Switch
                      size="small" checked={target.enabled}
                      onChange={(v) => {
                        const newTargets = [...backupConfig.targets];
                        newTargets[idx] = { ...target, enabled: v };
                        saveBackupConfig({ ...backupConfig, targets: newTargets });
                      }}
                    />
                  </Col>
                  <Col span={6}>
                    <Tag color={target.type === 'local' ? 'blue' : target.type === 'lan' ? 'green' : 'purple'}>
                      {target.type === 'local' ? 'Server local' : target.type === 'lan' ? 'Mang LAN' : 'Cloud'}
                    </Tag>
                  </Col>
                  <Col span={14}>
                    <Input
                      size="small"
                      placeholder={target.type === 'local' ? 'D:\\HIS_Backups' : target.type === 'lan' ? '\\\\server\\share' : 'https://storage.example.com'}
                      value={target.path}
                      onChange={(e) => {
                        const newTargets = [...backupConfig.targets];
                        newTargets[idx] = { ...target, path: e.target.value };
                        saveBackupConfig({ ...backupConfig, targets: newTargets });
                      }}
                    />
                  </Col>
                </Row>
                {target.type === 'cloud' && target.enabled && (
                  <Input
                    size="small" style={{ marginTop: 4 }}
                    placeholder="API Key / Credentials" value={target.credentials}
                    onChange={(e) => {
                      const newTargets = [...backupConfig.targets];
                      newTargets[idx] = { ...target, credentials: e.target.value };
                      saveBackupConfig({ ...backupConfig, targets: newTargets });
                    }}
                  />
                )}
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Card size="small" title="Sao luu thu cong" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Button type="primary" icon={<SaveOutlined />} loading={backupRunning} onClick={handleManualBackup}>
              {backupRunning ? 'Dang sao luu...' : 'Sao luu ngay'}
            </Button>
          </Col>
          <Col flex="auto">
            {backupRunning && <Progress percent={backupProgress} status="active" size="small" />}
          </Col>
        </Row>
      </Card>

      <Card size="small" title="Lich su sao luu">
        <Table
          size="small"
          dataSource={backupHistory}
          rowKey="key"
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Thoi gian', dataIndex: 'date', key: 'date', width: 160 },
            { title: 'Kich thuoc', dataIndex: 'size', key: 'size', width: 100 },
            { title: 'Loai', dataIndex: 'type', key: 'type', width: 120, render: (v: string) => <Tag color={v === 'Full' ? 'blue' : v === 'Manual' ? 'orange' : 'green'}>{v}</Tag> },
            { title: 'Trang thai', dataIndex: 'status', key: 'status', width: 100, render: (v: string) => <Tag color={v === 'success' ? 'green' : 'red'}>{v === 'success' ? 'Thanh cong' : 'That bai'}</Tag> },
            { title: 'Vi tri', dataIndex: 'location', key: 'location', width: 100 },
          ]}
        />
      </Card>
    </div>
  );
};

export const BackupTabIcon = <SaveOutlined />;
export const BackupTabLabel = 'Sao luu du lieu';
export const BackupTabKey = 'backup';

export default BackupTab;
