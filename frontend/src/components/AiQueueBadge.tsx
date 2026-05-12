/**
 * Phase 4 — Compact badge showing the number of pending AI analyses.
 *
 * Polls `/api/ai-labeling/queue` every 30s. Click → popover lists the most
 * recent ~20 items with patient + request code; clicking an item navigates
 * to /radiology/viewer?study=<uid>.
 *
 * Auto-queued items (created by the BackgroundService cron) show with a
 * yellow "Tự động" tag so the BS knows the AI hasn't been run yet — just
 * pre-marked. Manual items (BS clicked "Phân tích AI" but hasn't reviewed
 * yet) show with a blue "Chờ duyệt" tag.
 */

import { useEffect, useState, useCallback } from 'react';
import { Badge, Popover, List, Tag, Empty, Spin, Tooltip } from 'antd';
import { RobotOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getAiQueue, type AiQueueItem } from '../api/aiLabeling';

const POLL_INTERVAL_MS = 30_000;

export default function AiQueueBadge() {
  const [items, setItems] = useState<AiQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAiQueue(20);
      setItems(data);
    } catch (e) {
      // Endpoint missing on pre-Phase-4 backends → silently keep empty.
      console.warn('[AiQueueBadge] fetch failed', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const t = window.setInterval(fetchQueue, POLL_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [fetchQueue]);

  const popoverContent = (
    <div style={{ width: 360, maxHeight: 480, overflowY: 'auto' }}>
      {loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 16 }}><Spin /></div>
      ) : items.length === 0 ? (
        <Empty description="Không có ca AI đang chờ" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          size="small"
          dataSource={items}
          renderItem={(it) => (
            <List.Item
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setOpen(false);
                navigate(`/radiology/viewer?study=${encodeURIComponent(it.studyInstanceUID)}`);
              }}
            >
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{it.patientName || '(không rõ BN)'}</strong>
                  {it.autoQueued ? (
                    <Tag color="gold">Tự động</Tag>
                  ) : (
                    <Tag color="blue">Chờ duyệt</Tag>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  {it.requestCode && <span>📋 {it.requestCode} · </span>}
                  {it.modality && <span style={{ marginRight: 8 }}>🖼️ {it.modality}</span>}
                  <span><ClockCircleOutlined /> {dayjs(it.queuedAt).fromNow()}</span>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  const count = items.length;
  return (
    <Tooltip title="Hàng đợi AI">
      <Popover
        content={popoverContent}
        title={<><RobotOutlined /> AI worklist ({count})</>}
        trigger="click"
        open={open}
        onOpenChange={(v) => { setOpen(v); if (v) fetchQueue(); }}
        placement="bottomRight"
      >
        <Badge count={count} size="small" overflowCount={99} data-testid="ai-queue-badge">
          <RobotOutlined
            style={{ fontSize: 18, cursor: 'pointer', color: count > 0 ? '#1890ff' : '#888' }}
          />
        </Badge>
      </Popover>
    </Tooltip>
  );
}
