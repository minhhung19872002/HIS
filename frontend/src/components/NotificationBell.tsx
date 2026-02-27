import React from 'react';
import { Badge, Popover, Typography, Button, Space, Tag, Empty, Spin, Tooltip } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text } = Typography;

const typeColors: Record<string, string> = {
  Info: 'blue',
  Success: 'green',
  Warning: 'orange',
  Error: 'red',
};

const moduleIcons: Record<string, string> = {
  Lab: 'XN',
  Radiology: 'CĐHA',
  Pharmacy: 'Thuốc',
  Reception: 'TĐ',
  OPD: 'KB',
  Billing: 'VP',
  System: 'HT',
};

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, connected } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (notification: typeof notifications[0]) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const content = (
    <div style={{ width: 360, maxHeight: 400, overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 4px' }}>
        <Text strong>Thông báo</Text>
        <Space>
          {!connected && (
            <Tooltip title="Mất kết nối thời gian thực">
              <Tag color="red" style={{ fontSize: 10 }}>Offline</Tag>
            </Tooltip>
          )}
          {unreadCount > 0 && (
            <Button type="link" size="small" icon={<CheckOutlined />} onClick={markAllAsRead}>
              Đọc tất cả
            </Button>
          )}
        </Space>
      </div>

      {loading && notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : notifications.length === 0 ? (
        <Empty description="Không có thông báo" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => handleClick(n)}
            style={{
              padding: '8px 8px',
              borderBottom: '1px solid #f0f0f0',
              cursor: n.actionUrl ? 'pointer' : 'default',
              background: n.isRead ? 'transparent' : '#e6f7ff',
              borderRadius: 4,
              marginBottom: 2,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div>
                  {n.module && (
                    <Tag color="default" style={{ fontSize: 10, marginRight: 4, padding: '0 4px' }}>
                      {moduleIcons[n.module] || n.module}
                    </Tag>
                  )}
                  <Tag color={typeColors[n.notificationType] || 'default'} style={{ fontSize: 10, padding: '0 4px' }}>
                    {n.notificationType}
                  </Tag>
                </div>
                <Text strong={!n.isRead} style={{ fontSize: 13 }}>{n.title}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>{n.content}</Text>
              </div>
              {!n.isRead && <Badge status="processing" />}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {dayjs(n.createdAt).fromNow()}
            </Text>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight" arrow={false}>
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
      </Badge>
    </Popover>
  );
};

export default NotificationBell;
