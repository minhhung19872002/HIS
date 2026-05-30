// Tab ma trận kiểm soát truy cập — tách từ pages/SystemAdmin.tsx (K1 refactor 2026-05-30, phiên 2).

import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Col, Row, Space, Spin, Table, Tag, Typography } from 'antd';
import { LockOutlined, PrinterOutlined, ReloadOutlined, TableOutlined } from '@ant-design/icons';
import { getAccessControlMatrix, type AccessControlMatrixDto } from '../../api/security';
import { getNestedData } from './helpers';

const AccessMatrixTab: React.FC = () => {
  const [matrixData, setMatrixData] = useState<AccessControlMatrixDto[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMatrixData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAccessControlMatrix();
      const data = getNestedData<AccessControlMatrixDto[]>(res.data, []);
      setMatrixData(data);
    } catch (error) {
      console.warn('Error fetching access control matrix:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatrixData(); }, [fetchMatrixData]);

  return (
    <Spin spinning={loading}>
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col flex="auto">
          <Typography.Text strong style={{ fontSize: 16 }}>
            <LockOutlined /> Ma trận kiểm soát truy cập
          </Typography.Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Xuất báo cáo</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchMatrixData}>Làm mới</Button>
          </Space>
        </Col>
      </Row>

      <Table
        dataSource={matrixData}
        rowKey="roleCode"
        size="small"
        scroll={{ x: 1200 }}
        pagination={false}
        expandable={{
          expandedRowRender: (record: AccessControlMatrixDto) => (
            <div style={{ padding: '8px 16px' }}>
              {record.modulePermissions?.map((mp) => (
                <div key={mp.module} style={{ marginBottom: 12 }}>
                  <Typography.Text strong>{mp.module}</Typography.Text>
                  <div style={{ marginTop: 4 }}>
                    {mp.permissions?.map((p) => (
                      <Tag key={p.permissionCode} color="blue" style={{ marginBottom: 4 }}>
                        {p.permissionName}
                      </Tag>
                    ))}
                  </div>
                </div>
              ))}
              {(!record.modulePermissions || record.modulePermissions.length === 0) && (
                <Typography.Text type="secondary">Không có quyền nào</Typography.Text>
              )}
            </div>
          ),
        }}
        columns={[
          {
            title: 'Mã vai trò', dataIndex: 'roleCode', key: 'roleCode', width: 130,
            render: (code: string) => {
              const color = code === 'ADMIN' ? 'blue' :
                ['DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH'].includes(code) ? 'green' : 'default';
              return <Tag color={color}>{code}</Tag>;
            },
          },
          { title: 'Tên vai trò', dataIndex: 'roleName', key: 'roleName', width: 180 },
          {
            title: 'Số người dùng', dataIndex: 'userCount', key: 'userCount', width: 130, align: 'center' as const,
            render: (count: number) => <Badge count={count} showZero overflowCount={9999} style={{ backgroundColor: count > 0 ? '#1890ff' : '#d9d9d9' }} />,
          },
          {
            title: 'Số module', key: 'moduleCount', width: 120, align: 'center' as const,
            render: (_: unknown, record: AccessControlMatrixDto) => record.modulePermissions?.length || 0,
          },
          {
            title: 'Tổng quyền', key: 'totalPermissions', width: 120, align: 'center' as const,
            render: (_: unknown, record: AccessControlMatrixDto) =>
              record.modulePermissions?.reduce((sum, mp) => sum + (mp.permissions?.length || 0), 0) || 0,
          },
          { title: 'Mô tả', dataIndex: 'description', key: 'description', ellipsis: true },
        ]}
      />
    </Spin>
  );
};

export const AccessMatrixTabIcon = <TableOutlined />;
export const AccessMatrixTabLabel = 'Ma trận quyền';
export const AccessMatrixTabKey = 'access-matrix';

export default AccessMatrixTab;
