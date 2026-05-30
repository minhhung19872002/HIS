/**
 * Status-tag render helpers cho Radiology v1 — pure presentational.
 * Extracted khỏi pages/Radiology.tsx (K14 Batch 2).
 *
 * Logic preserve 100% — chỉ di chuyển, KHÔNG đổi color/icon/label.
 */
import React from 'react';
import { Badge, Tag } from 'antd';
import {
  CalendarOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';

/** Request status (0..5): Pending / Scheduled / InProgress / Completed / Reported / Approved. */
export const getStatusTag = (status: number): React.ReactElement => {
  switch (status) {
    case 0:
      return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ thực hiện</Tag>;
    case 1:
      return <Tag color="blue" icon={<CalendarOutlined />}>Đã hẹn lịch</Tag>;
    case 2:
      return <Tag color="purple" icon={<PlayCircleOutlined />}>Đang thực hiện</Tag>;
    case 3:
      return <Tag color="cyan" icon={<CameraOutlined />}>Hoàn thành chụp</Tag>;
    case 4:
      return <Tag color="geekblue" icon={<FileSearchOutlined />}>Đã có báo cáo</Tag>;
    case 5:
      return <Tag color="green" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
    default:
      return <Tag>Không xác định</Tag>;
  }
};

/** Exam status (0..2): Pending / InProgress / Completed. */
export const getExamStatusTag = (status: number): React.ReactElement => {
  switch (status) {
    case 0:
      return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ thực hiện</Tag>;
    case 1:
      return <Tag color="purple" icon={<PlayCircleOutlined />}>Đang thực hiện</Tag>;
    case 2:
      return <Tag color="green" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>;
    default:
      return <Tag>Không xác định</Tag>;
  }
};

/** Priority badge (1..3): Normal / Urgent / Emergency. */
export const getPriorityBadge = (priority: number): React.ReactElement => {
  switch (priority) {
    case 1:
      return <Badge status="default" text="Bình thường" />;
    case 2:
      return <Badge status="warning" text="Khẩn" />;
    case 3:
      return <Badge status="error" text="Cấp cứu" />;
    default:
      return <Badge status="default" text="Không xác định" />;
  }
};

/** Report status (0..2): Draft / Completed / Approved. */
export const getReportStatusTag = (status: number): React.ReactElement => {
  switch (status) {
    case 0:
      return <Tag color="orange">Nháp</Tag>;
    case 1:
      return <Tag color="cyan">Hoàn thành</Tag>;
    case 2:
      return <Tag color="green" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
    default:
      return <Tag>Không xác định</Tag>;
  }
};
