import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicClient } from '../api/publicClient';
import { HOSPITAL_NAME } from '../constants/hospital';
import type { QueueDisplayDto, QueueTicketDto } from '../api/reception';
import './QueueDisplay.css';

const POLL_INTERVAL = 4000;
const DEFAULT_QUEUE_TYPE = 2; // Exam

function getPriorityClass(priority: number): string {
  if (priority >= 3) return 'priority-emergency';
  if (priority === 2) return 'priority-high';
  return 'priority-normal';
}

function getPriorityBadgeClass(priority: number): string {
  if (priority >= 3) return 'emergency';
  if (priority === 2) return 'high';
  return 'normal';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function announce(text: string) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // AudioContext not available
  }
}

export default function QueueDisplay() {
  const [searchParams] = useSearchParams();
  const roomIds = (searchParams.get('rooms') || '').split(',').filter(Boolean);
  const queueType = Number(searchParams.get('queueType')) || DEFAULT_QUEUE_TYPE;

  const [displayData, setDisplayData] = useState<QueueDisplayDto[]>([]);
  const [clock, setClock] = useState(formatTime(new Date()));
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [blinkingIds, setBlinkingIds] = useState<Set<string>>(new Set());

  const previousCallingIdsRef = useRef<Set<string> | null>(null);
  const isFirstPollRef = useRef(true);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setClock(formatTime(new Date())), 1000);
    return () => clearInterval(timer);
  }, []);

  // Announce new calls
  const handleNewCalls = useCallback((allData: QueueDisplayDto[]) => {
    const currentIds = new Set<string>();
    const currentCallingMap = new Map<string, { code: string; room: string }>();

    for (const room of allData) {
      for (const ticket of room.callingList) {
        currentIds.add(ticket.id);
        currentCallingMap.set(ticket.id, { code: ticket.ticketCode, room: room.roomName });
      }
      if (room.currentServing) {
        currentIds.add(room.currentServing.id);
        currentCallingMap.set(room.currentServing.id, { code: room.currentServing.ticketCode, room: room.roomName });
      }
    }

    if (isFirstPollRef.current) {
      previousCallingIdsRef.current = currentIds;
      isFirstPollRef.current = false;
      return;
    }

    const prevIds = previousCallingIdsRef.current || new Set<string>();
    const newIds: string[] = [];
    for (const id of currentIds) {
      if (!prevIds.has(id)) {
        newIds.push(id);
      }
    }

    if (newIds.length > 0) {
      setBlinkingIds(new Set(newIds));
      setTimeout(() => setBlinkingIds(new Set()), 5000);

      if (audioEnabled) {
        for (const id of newIds) {
          const info = currentCallingMap.get(id);
          if (info) {
            if (window.speechSynthesis) {
              announce(`Mời số ${info.code} vào ${info.room}`);
            } else {
              beep();
            }
          }
        }
      }
    }

    previousCallingIdsRef.current = currentIds;
  }, [audioEnabled]);

  // Polling
  useEffect(() => {
    if (roomIds.length === 0) return;

    let active = true;

    const fetchData = async () => {
      try {
        const results = await Promise.all(
          roomIds.map(roomId =>
            publicClient.get<QueueDisplayDto>(`/reception/queue/display/${roomId}`, {
              params: { queueType }
            }).then(res => res.data)
              .catch(() => null)
          )
        );
        if (!active) return;
        const validResults = results.filter((r): r is QueueDisplayDto => r !== null);
        setDisplayData(validResults);
        handleNewCalls(validResults);
      } catch {
        // Network error - will retry on next poll
      }
    };

    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => { active = false; clearInterval(interval); };
  }, [roomIds.join(','), queueType, handleNewCalls]);

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Audio unlock
  const enableAudio = () => {
    setAudioEnabled(true);
    setShowOverlay(false);
    // Warm up speech synthesis
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  };

  const dismissOverlay = () => {
    setShowOverlay(false);
  };

  // Aggregate waiting list across all rooms
  const allWaiting: (QueueTicketDto & { _roomName: string })[] = [];
  for (const room of displayData) {
    for (const ticket of room.waitingList) {
      allWaiting.push({ ...ticket, _roomName: room.roomName });
    }
  }
  allWaiting.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.queueNumber - b.queueNumber;
  });

  const totalWaiting = displayData.reduce((sum, r) => sum + r.totalWaiting, 0);
  const avgWait = displayData.length > 0
    ? Math.round(displayData.reduce((sum, r) => sum + r.averageWaitMinutes, 0) / displayData.length)
    : 0;

  if (roomIds.length === 0) {
    return (
      <div className="queue-display" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <h1 style={{ fontSize: 36 }}>Hệ thống gọi bệnh nhân</h1>
        <p style={{ color: '#a0aec0', fontSize: 18, marginTop: 16 }}>
          Vui lòng thêm tham số <code style={{ color: '#e94560' }}>?rooms=roomId1,roomId2</code> vào URL
        </p>
      </div>
    );
  }

  return (
    <div className="queue-display">
      {showOverlay && (
        <div className="audio-overlay">
          <button onClick={enableAudio}>Bật âm thanh</button>
          <p>Nhấn để bật thông báo giọng nói khi gọi bệnh nhân</p>
          <button onClick={dismissOverlay} style={{ background: 'transparent', border: '1px solid #a0aec0', fontSize: 16, padding: '8px 24px' }}>
            Bỏ qua
          </button>
        </div>
      )}

      <button className="queue-fullscreen-btn" onClick={toggleFullscreen} title="Toàn màn hình">
        ⛶
      </button>

      <div className="queue-header">
        <div className="queue-header-left">
          <h1>{HOSPITAL_NAME}</h1>
          <p>Hệ thống gọi bệnh nhân phòng khám</p>
        </div>
        <div className="queue-clock">{clock}</div>
      </div>

      <div className="queue-body">
        <div className="queue-calling-panel">
          <h2>Đang gọi</h2>
          {displayData.map(room => {
            const callingTicket = room.currentServing || room.callingList[0];
            return (
              <div key={room.roomId} className="queue-room-block">
                <div className="queue-room-name">{room.roomName}</div>
                {room.doctorName && <div className="queue-room-doctor">BS. {room.doctorName}</div>}
                {callingTicket ? (
                  <div className={`queue-ticket-number ${getPriorityClass(callingTicket.priority)} ${blinkingIds.has(callingTicket.id) ? 'blinking' : ''}`}>
                    {callingTicket.ticketCode}
                  </div>
                ) : (
                  <div className="queue-no-calling">—</div>
                )}
              </div>
            );
          })}
          {displayData.length === 0 && (
            <div className="queue-no-calling">Đang tải dữ liệu...</div>
          )}
        </div>

        <div className="queue-waiting-panel">
          <h2>Danh sách chờ</h2>
          <div className="queue-waiting-table">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Số</th>
                  <th>Phòng</th>
                  <th>Ưu tiên</th>
                  <th>Chờ (phút)</th>
                </tr>
              </thead>
              <tbody>
                {allWaiting.map((ticket, index) => (
                  <tr key={ticket.id}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: 700, fontSize: 20 }}>{ticket.ticketCode}</td>
                    <td>{ticket._roomName}</td>
                    <td>
                      <span className={`priority-badge ${getPriorityBadgeClass(ticket.priority)}`}>
                        {ticket.priorityName}
                      </span>
                    </td>
                    <td>{ticket.estimatedWaitMinutes}</td>
                  </tr>
                ))}
                {allWaiting.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#718096', padding: 32 }}>
                      Không có bệnh nhân chờ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="queue-footer">
        <div className="queue-footer-stat">
          Tổng chờ:<strong>{totalWaiting}</strong>
        </div>
        <div className="queue-footer-stat">
          Thời gian chờ TB:<strong>{avgWait} phút</strong>
        </div>
      </div>
    </div>
  );
}
