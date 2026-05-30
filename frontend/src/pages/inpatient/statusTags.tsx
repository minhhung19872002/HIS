/**
 * Status tag / badge helpers cho Inpatient v1 — pure presentational.
 * Extracted khỏi pages/Inpatient.tsx (K15 Batch 1).
 *
 * Logic preserve 100% — chỉ di chuyển, KHÔNG đổi color map / text.
 */
import React from 'react';
import { Badge, Tag } from 'antd';

/**
 * Admission status (0..4):
 * 0=Đang điều trị · 1=Chuyển khoa · 2=Xuất viện · 3=Tử vong · 4=Bỏ về.
 * Caller có thể override label qua `statusName`.
 */
export const getStatusTag = (status: number, statusName?: string): React.ReactElement => {
  const colorMap: Record<number, string> = {
    0: 'blue', // Đang điều trị
    1: 'orange', // Chuyển khoa
    2: 'green', // Xuất viện
    3: 'red', // Tử vong
    4: 'default', // Bỏ về
  };
  const defaultNames: Record<number, string> = {
    0: 'Đang điều trị',
    1: 'Chuyển khoa',
    2: 'Xuất viện',
    3: 'Tử vong',
    4: 'Bỏ về',
  };
  return (
    <Tag color={colorMap[status] || 'default'}>
      {statusName || defaultNames[status] || 'Không xác định'}
    </Tag>
  );
};

/**
 * Bed status (0..2):
 * 0=Trống (success) · 1=Đang sử dụng (processing) · 2=Bảo trì (warning).
 */
export const getBedStatusBadge = (status: number, statusName?: string): React.ReactElement => {
  const statusMap: Record<
    number,
    { status: 'success' | 'processing' | 'warning' | 'default'; text: string }
  > = {
    0: { status: 'success', text: statusName || 'Trống' },
    1: { status: 'processing', text: statusName || 'Đang sử dụng' },
    2: { status: 'warning', text: statusName || 'Bảo trì' },
  };
  const s = statusMap[status] || { status: 'default' as const, text: statusName || 'Không xác định' };
  return <Badge status={s.status} text={s.text} />;
};
