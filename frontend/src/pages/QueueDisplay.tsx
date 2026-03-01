import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicClient } from '../api/publicClient';
import { HOSPITAL_NAME } from '../constants/hospital';
import type { QueueDisplayDto, QueueTicketDto } from '../api/reception';
import './QueueDisplay.css';

const POLL_INTERVAL = 4000;
const DEFAULT_QUEUE_TYPE = 2; // Exam

// --- Types for lab queue display ---
interface LabQueueItemDto {
  id: string;
  orderCode: string;
  sampleBarcode?: string;
  patientName: string;
  patientCode?: string;
  sampleType?: string;
  testCount: number;
  testSummary: string;
  isPriority: boolean;
  isEmergency: boolean;
  status: number;
  statusName: string;
  orderedAt: string;
  collectedAt?: string;
  completedAt?: string;
  waitMinutes: number;
  departmentName?: string;
}

interface LabQueueDisplayDto {
  updatedAt: string;
  totalPending: number;
  totalProcessing: number;
  totalCompletedToday: number;
  averageProcessingMinutes: number;
  processingItems: LabQueueItemDto[];
  waitingItems: LabQueueItemDto[];
  completedItems: LabQueueItemDto[];
}

// --- Shared helpers ---
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

function getLabStatusColor(status: number): string {
  switch (status) {
    case 1: return '#faad14'; // Chờ lấy mẫu - yellow
    case 2: return '#1890ff'; // Đã lấy mẫu - blue
    case 3: return '#722ed1'; // Đang xử lý - purple
    case 4: return '#eb2f96'; // Chờ duyệt - pink
    case 5: return '#52c41a'; // Hoàn thành - green
    default: return '#a0aec0';
  }
}

// ===================== LAB QUEUE DISPLAY =====================
function LabQueueView() {
  const [labData, setLabData] = useState<LabQueueDisplayDto | null>(null);
  const [clock, setClock] = useState(formatTime(new Date()));
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [newCompletedIds, setNewCompletedIds] = useState<Set<string>>(new Set());
  const prevCompletedIdsRef = useRef<Set<string>>(new Set());
  const isFirstPollRef = useRef(true);

  useEffect(() => {
    const timer = setInterval(() => setClock(formatTime(new Date())), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNewCompleted = useCallback((data: LabQueueDisplayDto) => {
    const currentIds = new Set(data.completedItems.map(c => c.id));
    if (isFirstPollRef.current) {
      prevCompletedIdsRef.current = currentIds;
      isFirstPollRef.current = false;
      return;
    }
    const newIds: string[] = [];
    for (const id of currentIds) {
      if (!prevCompletedIdsRef.current.has(id)) newIds.push(id);
    }
    if (newIds.length > 0) {
      setNewCompletedIds(new Set(newIds));
      setTimeout(() => setNewCompletedIds(new Set()), 5000);
      if (audioEnabled) {
        const item = data.completedItems.find(c => c.id === newIds[0]);
        if (item) {
          announce(`Kết quả xét nghiệm mã ${item.orderCode} đã hoàn thành`);
        } else {
          beep();
        }
      }
    }
    prevCompletedIdsRef.current = currentIds;
  }, [audioEnabled]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const res = await publicClient.get<LabQueueDisplayDto>('/liscomplete/queue/display');
        if (!active) return;
        setLabData(res.data);
        handleNewCompleted(res.data);
      } catch {
        // Will retry on next poll
      }
    };
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => { active = false; clearInterval(interval); };
  }, [handleNewCompleted]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const enableAudio = () => {
    setAudioEnabled(true);
    setShowOverlay(false);
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="queue-display lab-mode">
      {showOverlay && (
        <div className="audio-overlay">
          <button onClick={enableAudio}>Bật âm thanh</button>
          <p>Nhấn để bật thông báo khi có kết quả xét nghiệm</p>
          <button onClick={() => setShowOverlay(false)} style={{ background: 'transparent', border: '1px solid #a0aec0', fontSize: 16, padding: '8px 24px' }}>
            Bỏ qua
          </button>
        </div>
      )}

      <button className="queue-fullscreen-btn" onClick={toggleFullscreen} title="Toàn màn hình">⛶</button>

      <div className="queue-header">
        <div className="queue-header-left">
          <h1>{HOSPITAL_NAME}</h1>
          <p>Hệ thống hiển thị hàng đợi Xét nghiệm</p>
        </div>
        <div className="queue-clock">{clock}</div>
      </div>

      {/* Stats bar */}
      <div className="lab-stats-bar">
        <div className="lab-stat">
          <span className="lab-stat-label">Chờ xử lý</span>
          <span className="lab-stat-value" style={{ color: '#faad14' }}>{labData?.totalPending ?? 0}</span>
        </div>
        <div className="lab-stat">
          <span className="lab-stat-label">Đang xử lý</span>
          <span className="lab-stat-value" style={{ color: '#722ed1' }}>{labData?.totalProcessing ?? 0}</span>
        </div>
        <div className="lab-stat">
          <span className="lab-stat-label">Hoàn thành</span>
          <span className="lab-stat-value" style={{ color: '#52c41a' }}>{labData?.totalCompletedToday ?? 0}</span>
        </div>
        <div className="lab-stat">
          <span className="lab-stat-label">TB xử lý</span>
          <span className="lab-stat-value" style={{ color: '#4fc3f7' }}>{labData?.averageProcessingMinutes ?? 0} phút</span>
        </div>
      </div>

      <div className="queue-body lab-body">
        {/* Left: Processing */}
        <div className="lab-panel lab-processing">
          <h2 style={{ color: '#722ed1' }}>Đang xử lý</h2>
          <div className="lab-cards">
            {(labData?.processingItems ?? []).map(item => (
              <div key={item.id} className={`lab-card ${item.isEmergency ? 'emergency' : item.isPriority ? 'priority' : ''}`}>
                <div className="lab-card-header">
                  <span className="lab-card-code">{item.orderCode}</span>
                  {item.sampleBarcode && <span className="lab-card-barcode">{item.sampleBarcode}</span>}
                  <span className="lab-card-status" style={{ color: getLabStatusColor(item.status) }}>{item.statusName}</span>
                </div>
                <div className="lab-card-patient">{item.patientName}</div>
                <div className="lab-card-tests">{item.testSummary || `${item.testCount} xét nghiệm`}</div>
                {item.departmentName && <div className="lab-card-dept">{item.departmentName}</div>}
                <div className="lab-card-time">{item.waitMinutes} phút</div>
              </div>
            ))}
            {(labData?.processingItems ?? []).length === 0 && (
              <div className="queue-no-calling">Không có mẫu đang xử lý</div>
            )}
          </div>
        </div>

        {/* Center: Waiting */}
        <div className="lab-panel lab-waiting">
          <h2 style={{ color: '#faad14' }}>Chờ xử lý</h2>
          <div className="queue-waiting-table">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã phiếu</th>
                  <th>Bệnh nhân</th>
                  <th>Loại mẫu</th>
                  <th>Xét nghiệm</th>
                  <th>Trạng thái</th>
                  <th>Chờ</th>
                </tr>
              </thead>
              <tbody>
                {(labData?.waitingItems ?? []).map((item, i) => (
                  <tr key={item.id} className={item.isEmergency ? 'row-emergency' : item.isPriority ? 'row-priority' : ''}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{item.orderCode}</td>
                    <td>{item.patientName}</td>
                    <td>{item.sampleType || '—'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.testSummary || `${item.testCount} XN`}
                    </td>
                    <td><span style={{ color: getLabStatusColor(item.status) }}>{item.statusName}</span></td>
                    <td>{item.waitMinutes}p</td>
                  </tr>
                ))}
                {(labData?.waitingItems ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#718096', padding: 32 }}>
                      Không có mẫu chờ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Completed */}
        <div className="lab-panel lab-completed">
          <h2 style={{ color: '#52c41a' }}>Vừa hoàn thành</h2>
          <div className="lab-cards">
            {(labData?.completedItems ?? []).map(item => (
              <div key={item.id} className={`lab-card completed ${newCompletedIds.has(item.id) ? 'blinking' : ''}`}>
                <div className="lab-card-header">
                  <span className="lab-card-code">{item.orderCode}</span>
                  <span className="lab-card-status" style={{ color: '#52c41a' }}>✓ Hoàn thành</span>
                </div>
                <div className="lab-card-patient">{item.patientName}</div>
                <div className="lab-card-tests">{item.testSummary || `${item.testCount} xét nghiệm`}</div>
                {item.completedAt && (
                  <div className="lab-card-time" style={{ color: '#52c41a' }}>
                    {new Date(item.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
            {(labData?.completedItems ?? []).length === 0 && (
              <div className="queue-no-calling">Chưa có kết quả hôm nay</div>
            )}
          </div>
        </div>
      </div>

      <div className="queue-footer">
        <div className="queue-footer-stat">
          Tổng chờ:<strong>{labData?.totalPending ?? 0}</strong>
        </div>
        <div className="queue-footer-stat">
          Đang XL:<strong>{labData?.totalProcessing ?? 0}</strong>
        </div>
        <div className="queue-footer-stat">
          Hoàn thành:<strong>{labData?.totalCompletedToday ?? 0}</strong>
        </div>
        <div className="queue-footer-stat">
          TB xử lý:<strong>{labData?.averageProcessingMinutes ?? 0} phút</strong>
        </div>
      </div>
    </div>
  );
}

// ===================== ROOM QUEUE DISPLAY (original) =====================
function RoomQueueView() {
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

// ===================== MAIN EXPORT =====================
export default function QueueDisplay() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');

  if (mode === 'lab') return <LabQueueView />;
  return <RoomQueueView />;
}
