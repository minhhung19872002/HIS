import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const roomIds = useMemo(
    () => (searchParams.get('rooms') || '').split(',').filter(Boolean),
    [searchParams]
  );
  const roomIdsKey = roomIds.join(',');
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
  }, [roomIds, roomIdsKey, queueType, handleNewCalls]);

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

// ===================== KIOSK VIEW =====================
type KioskScreen = 'welcome' | 'ticket' | 'ticket-result' | 'checkin' | 'price' | 'survey' | 'survey-thanks';

interface KioskRoom {
  roomId: string;
  roomName: string;
  departmentName: string;
}

interface KioskServiceResult {
  serviceName: string;
  unit: string;
  unitPrice: number;
}

function KioskView() {
  const [screen, setScreen] = useState<KioskScreen>('welcome');
  const [clock, setClock] = useState(formatTime(new Date()));

  // Ticket flow state
  const [patientInput, setPatientInput] = useState('');
  const [rooms, setRooms] = useState<KioskRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [queuePriority, setQueuePriority] = useState(1); // 1=normal, 2=priority, 3=emergency
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketResult, setTicketResult] = useState<{
    ticketCode: string;
    queueNumber: number;
    roomName: string;
    estimatedWaitMinutes: number;
  } | null>(null);

  // Price lookup state
  const [priceKeyword, setPriceKeyword] = useState('');
  const [priceResults, setPriceResults] = useState<KioskServiceResult[]>([]);
  const [priceLoading, setPriceLoading] = useState(false);

  // Survey state
  const [surveyRating, setSurveyRating] = useState<number | null>(null);
  const [surveyComment, setSurveyComment] = useState('');
  const [surveyLoading, setSurveyLoading] = useState(false);

  // Auto-reset timers
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setClock(formatTime(new Date())), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load rooms on mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await publicClient.get<KioskRoom[]>('/reception/rooms/overview');
        setRooms(Array.isArray(res.data) ? res.data : []);
      } catch {
        // Retry silently - rooms may load later
      }
    };
    fetchRooms();
  }, []);

  const clearResetTimer = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  const goToWelcome = useCallback(() => {
    clearResetTimer();
    setScreen('welcome');
    setPatientInput('');
    setSelectedRoom('');
    setQueuePriority(1);
    setTicketResult(null);
    setPriceKeyword('');
    setPriceResults([]);
    setSurveyRating(null);
    setSurveyComment('');
  }, []);

  const autoResetAfter = useCallback((seconds: number) => {
    clearResetTimer();
    resetTimerRef.current = setTimeout(goToWelcome, seconds * 1000);
  }, [goToWelcome]);

  useEffect(() => {
    return () => clearResetTimer();
  }, []);

  // --- Ticket submission ---
  const handleSubmitTicket = async () => {
    if (!selectedRoom) return;
    setTicketLoading(true);
    try {
      const dto: Record<string, unknown> = {
        roomId: selectedRoom,
        queueType: 2, // Exam
        priority: queuePriority,
      };
      // Try to find patient by code or phone
      if (patientInput.trim()) {
        dto.patientName = patientInput.trim();
      }
      const res = await publicClient.post<QueueTicketDto>('/reception/queue/issue', dto);
      const ticket = res.data;
      const room = rooms.find(r => r.roomId === selectedRoom);
      setTicketResult({
        ticketCode: ticket.ticketCode,
        queueNumber: ticket.queueNumber,
        roomName: room?.roomName || '',
        estimatedWaitMinutes: ticket.estimatedWaitMinutes || 0,
      });
      setScreen('ticket-result');
      autoResetAfter(10);
      // TTS announcement
      announce(`Số của bạn là ${ticket.ticketCode}. Vui lòng chờ tại ${room?.roomName || 'phòng khám'}`);
    } catch {
      // Show error briefly then return
      setTicketResult({ ticketCode: 'LOI', queueNumber: 0, roomName: '', estimatedWaitMinutes: 0 });
      setScreen('ticket-result');
      autoResetAfter(5);
    }
    setTicketLoading(false);
  };

  // --- Price lookup ---
  const handlePriceSearch = async () => {
    if (!priceKeyword.trim()) return;
    setPriceLoading(true);
    try {
      const res = await publicClient.get<KioskServiceResult[]>('/examination/services/search', {
        params: { keyword: priceKeyword.trim(), limit: 30 }
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setPriceResults(data.map((s) => ({
        serviceName: s.serviceName || '',
        unit: s.unit || 'Lần',
        unitPrice: s.unitPrice || 0,
      })));
    } catch {
      setPriceResults([]);
    }
    setPriceLoading(false);
  };

  // --- Survey submission ---
  const handleSubmitSurvey = async () => {
    if (surveyRating === null) return;
    setSurveyLoading(true);
    try {
      await publicClient.post('/quality/surveys', {
        rating: surveyRating,
        comment: surveyComment,
        source: 'kiosk',
        surveyDate: new Date().toISOString(),
      });
    } catch {
      // Best effort - still show thanks
    }
    setSurveyLoading(false);
    setScreen('survey-thanks');
    autoResetAfter(5);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const surveyEmojis = [
    { rating: 5, emoji: '\u{1F60D}', label: 'R\u1EA5t h\u00E0i l\u00F2ng' },
    { rating: 4, emoji: '\u{1F60A}', label: 'H\u00E0i l\u00F2ng' },
    { rating: 3, emoji: '\u{1F610}', label: 'B\u00ECnh th\u01B0\u1EDDng' },
    { rating: 2, emoji: '\u{1F61E}', label: 'Kh\u00F4ng h\u00E0i l\u00F2ng' },
    { rating: 1, emoji: '\u{1F621}', label: 'R\u1EA5t kh\u00F4ng h\u00E0i l\u00F2ng' },
  ];

  return (
    <div className="queue-display kiosk-mode">
      <button className="queue-fullscreen-btn" onClick={toggleFullscreen} title="To\u00E0n m\u00E0n h\u00ECnh">{'\u26F6'}</button>

      <div className="queue-header">
        <div className="queue-header-left">
          <h1>{HOSPITAL_NAME}</h1>
          <p>Kiosk t\u1EF1 ph\u1EE5c v\u1EE5</p>
        </div>
        <div className="queue-clock">{clock}</div>
      </div>

      <div className="kiosk-body">
        {/* WELCOME SCREEN */}
        {screen === 'welcome' && (
          <div className="kiosk-welcome">
            <h2 className="kiosk-welcome-title">Xin ch\u00E0o! Vui l\u00F2ng ch\u1ECDn d\u1ECBch v\u1EE5</h2>
            <div className="kiosk-menu-grid">
              <button className="kiosk-menu-btn kiosk-btn-ticket" onClick={() => setScreen('ticket')}>
                <span className="kiosk-btn-icon">{'\uD83C\uDFAB'}</span>
                <span className="kiosk-btn-label">L\u1EA5y s\u1ED1 kh\u00E1m b\u1EC7nh</span>
              </button>
              <button className="kiosk-menu-btn kiosk-btn-checkin" onClick={() => setScreen('checkin')}>
                <span className="kiosk-btn-icon">{'\u2705'}</span>
                <span className="kiosk-btn-label">Check-in h\u1EB9n kh\u00E1m</span>
              </button>
              <button className="kiosk-menu-btn kiosk-btn-price" onClick={() => setScreen('price')}>
                <span className="kiosk-btn-icon">{'\uD83D\uDCB0'}</span>
                <span className="kiosk-btn-label">Tra c\u1EE9u gi\u00E1 d\u1ECBch v\u1EE5</span>
              </button>
              <button className="kiosk-menu-btn kiosk-btn-survey" onClick={() => setScreen('survey')}>
                <span className="kiosk-btn-icon">{'\u2B50'}</span>
                <span className="kiosk-btn-label">Kh\u1EA3o s\u00E1t h\u00E0i l\u00F2ng</span>
              </button>
            </div>
          </div>
        )}

        {/* GET TICKET SCREEN */}
        {screen === 'ticket' && (
          <div className="kiosk-form-screen">
            <h2 className="kiosk-screen-title">L\u1EA5y s\u1ED1 kh\u00E1m b\u1EC7nh</h2>
            <div className="kiosk-form">
              <div className="kiosk-form-group">
                <label className="kiosk-label">M\u00E3 b\u1EC7nh nh\u00E2n ho\u1EB7c S\u0110T</label>
                <input
                  className="kiosk-input"
                  type="text"
                  placeholder="Nh\u1EADp m\u00E3 BN ho\u1EB7c s\u1ED1 \u0111i\u1EC7n tho\u1EA1i..."
                  value={patientInput}
                  onChange={(e) => setPatientInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="kiosk-form-group">
                <label className="kiosk-label">Ch\u1ECDn ph\u00F2ng kh\u00E1m</label>
                <select
                  className="kiosk-select"
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                >
                  <option value="">-- Ch\u1ECDn ph\u00F2ng --</option>
                  {rooms.map(r => (
                    <option key={r.roomId} value={r.roomId}>
                      {r.roomName} - {r.departmentName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="kiosk-form-group">
                <label className="kiosk-label">Lo\u1EA1i \u01B0u ti\u00EAn</label>
                <div className="kiosk-priority-group">
                  <button
                    className={`kiosk-priority-btn ${queuePriority === 1 ? 'active' : ''}`}
                    style={{ borderColor: '#52c41a' }}
                    onClick={() => setQueuePriority(1)}
                  >
                    Th\u01B0\u1EDDng
                  </button>
                  <button
                    className={`kiosk-priority-btn ${queuePriority === 2 ? 'active' : ''}`}
                    style={{ borderColor: '#faad14' }}
                    onClick={() => setQueuePriority(2)}
                  >
                    \u01AFu ti\u00EAn
                  </button>
                  <button
                    className={`kiosk-priority-btn ${queuePriority === 3 ? 'active' : ''}`}
                    style={{ borderColor: '#ff4d4f' }}
                    onClick={() => setQueuePriority(3)}
                  >
                    C\u1EA5p c\u1EE9u
                  </button>
                </div>
              </div>
              <div className="kiosk-form-actions">
                <button className="kiosk-back-btn" onClick={goToWelcome}>{'\u2190'} Quay l\u1EA1i</button>
                <button
                  className="kiosk-submit-btn"
                  onClick={handleSubmitTicket}
                  disabled={!selectedRoom || ticketLoading}
                >
                  {ticketLoading ? '\u0110ang x\u1EED l\u00FD...' : 'L\u1EA5y s\u1ED1'}
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'checkin' && (
          <div className="kiosk-result-screen">
            <h2 className="kiosk-result-title">Check-in hẹn khám</h2>
            <div className="kiosk-result-info">
              <div className="kiosk-result-row">
                <span>Trạng thái:</span>
                <strong>Chưa hỗ trợ tự check-in tại kiosk này</strong>
              </div>
            </div>
            <p className="kiosk-result-note">
              Vui lòng quét mã hẹn khám tại quầy tiếp đón hoặc liên hệ nhân viên để check-in đúng lịch hẹn, tránh phát sinh số khám mới.
            </p>
            <button className="kiosk-back-btn" onClick={goToWelcome} style={{ marginTop: 24 }}>{'\u2190'} Trang chủ</button>
          </div>
        )}

        {/* TICKET RESULT SCREEN */}
        {screen === 'ticket-result' && ticketResult && (
          <div className="kiosk-result-screen">
            {ticketResult.ticketCode !== 'LOI' ? (
              <>
                <h2 className="kiosk-result-title">S\u1ED1 c\u1EE7a b\u1EA1n</h2>
                <div className="kiosk-ticket-number">{ticketResult.ticketCode}</div>
                <div className="kiosk-result-info">
                  <div className="kiosk-result-row">
                    <span>Ph\u00F2ng kh\u00E1m:</span>
                    <strong>{ticketResult.roomName}</strong>
                  </div>
                  <div className="kiosk-result-row">
                    <span>Th\u1EDDi gian ch\u1EDD \u01B0\u1EDBc t\u00EDnh:</span>
                    <strong>{ticketResult.estimatedWaitMinutes} ph\u00FAt</strong>
                  </div>
                </div>
                <p className="kiosk-result-note">Vui l\u00F2ng \u0111\u1EE3i t\u1EA1i khu v\u1EF1c ch\u1EDD. T\u1EF1 \u0111\u1ED9ng tr\u1EDF v\u1EC1 sau 10 gi\u00E2y.</p>
              </>
            ) : (
              <>
                <h2 className="kiosk-result-title" style={{ color: '#ff4d4f' }}>Kh\u00F4ng th\u1EC3 l\u1EA5y s\u1ED1</h2>
                <p className="kiosk-result-note">Vui l\u00F2ng li\u00EAn h\u1EC7 qu\u1EA7y ti\u1EBFp \u0111\u00F3n \u0111\u1EC3 \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3.</p>
              </>
            )}
            <button className="kiosk-back-btn" onClick={goToWelcome} style={{ marginTop: 24 }}>{'\u2190'} Trang ch\u1EE7</button>
          </div>
        )}

        {/* PRICE LOOKUP SCREEN */}
        {screen === 'price' && (
          <div className="kiosk-form-screen">
            <h2 className="kiosk-screen-title">Tra c\u1EE9u gi\u00E1 d\u1ECBch v\u1EE5</h2>
            <div className="kiosk-form">
              <div className="kiosk-form-group">
                <label className="kiosk-label">T\u00EAn d\u1ECBch v\u1EE5</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    className="kiosk-input"
                    type="text"
                    placeholder="Nh\u1EADp t\u00EAn d\u1ECBch v\u1EE5 c\u1EA7n tra..."
                    value={priceKeyword}
                    onChange={(e) => setPriceKeyword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handlePriceSearch(); }}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <button className="kiosk-submit-btn" onClick={handlePriceSearch} disabled={priceLoading} style={{ minWidth: 120 }}>
                    {priceLoading ? '...' : 'T\u00ECm ki\u1EBFm'}
                  </button>
                </div>
              </div>

              {priceResults.length > 0 && (
                <div className="kiosk-price-table-wrapper">
                  <table className="kiosk-price-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>T\u00EAn d\u1ECBch v\u1EE5</th>
                        <th>\u0110\u01A1n v\u1ECB</th>
                        <th>Gi\u00E1 (VN\u0110)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceResults.map((s, i) => (
                        <tr key={`${s.serviceName}-${i}`}>
                          <td>{i + 1}</td>
                          <td>{s.serviceName}</td>
                          <td>{s.unit}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {s.unitPrice.toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {priceResults.length === 0 && priceKeyword.trim() && !priceLoading && (
                <p style={{ textAlign: 'center', color: '#718096', fontSize: 18, marginTop: 24 }}>
                  Kh\u00F4ng t\u00ECm th\u1EA5y d\u1ECBch v\u1EE5 ph\u00F9 h\u1EE3p.
                </p>
              )}

              <div className="kiosk-form-actions">
                <button className="kiosk-back-btn" onClick={goToWelcome}>{'\u2190'} Quay l\u1EA1i</button>
              </div>
            </div>
          </div>
        )}

        {/* SATISFACTION SURVEY SCREEN */}
        {screen === 'survey' && (
          <div className="kiosk-form-screen">
            <h2 className="kiosk-screen-title">Kh\u1EA3o s\u00E1t h\u00E0i l\u00F2ng</h2>
            <p style={{ textAlign: 'center', fontSize: 20, color: '#a0aec0', margin: '0 0 24px' }}>
              B\u1EA1n \u0111\u00E1nh gi\u00E1 ch\u1EA5t l\u01B0\u1EE3ng d\u1ECBch v\u1EE5 nh\u01B0 th\u1EBF n\u00E0o?
            </p>
            <div className="kiosk-survey-emojis">
              {surveyEmojis.map(item => (
                <button
                  key={item.rating}
                  className={`kiosk-emoji-btn ${surveyRating === item.rating ? 'active' : ''}`}
                  onClick={() => setSurveyRating(item.rating)}
                >
                  <span className="kiosk-emoji">{item.emoji}</span>
                  <span className="kiosk-emoji-label">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="kiosk-form" style={{ maxWidth: 600, margin: '24px auto 0' }}>
              <div className="kiosk-form-group">
                <label className="kiosk-label">G\u00F3p \u00FD th\u00EAm (kh\u00F4ng b\u1EAFt bu\u1ED9c)</label>
                <textarea
                  className="kiosk-textarea"
                  placeholder="Nh\u1EADp g\u00F3p \u00FD c\u1EE7a b\u1EA1n..."
                  value={surveyComment}
                  onChange={(e) => setSurveyComment(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="kiosk-form-actions">
                <button className="kiosk-back-btn" onClick={goToWelcome}>{'\u2190'} Quay l\u1EA1i</button>
                <button
                  className="kiosk-submit-btn"
                  onClick={handleSubmitSurvey}
                  disabled={surveyRating === null || surveyLoading}
                >
                  {surveyLoading ? '\u0110ang g\u1EEDi...' : 'G\u1EEDi \u0111\u00E1nh gi\u00E1'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SURVEY THANKS SCREEN */}
        {screen === 'survey-thanks' && (
          <div className="kiosk-result-screen">
            <div style={{ fontSize: 80, marginBottom: 16 }}>{'\u2764\uFE0F'}</div>
            <h2 className="kiosk-result-title" style={{ color: '#52c41a' }}>C\u1EA3m \u01A1n b\u1EA1n!</h2>
            <p className="kiosk-result-note">
              \u0110\u00E1nh gi\u00E1 c\u1EE7a b\u1EA1n gi\u00FAp ch\u00FAng t\u00F4i c\u1EA3i thi\u1EC7n d\u1ECBch v\u1EE5 t\u1ED1t h\u01A1n.
            </p>
            <p style={{ color: '#718096', fontSize: 16, marginTop: 8 }}>T\u1EF1 \u0111\u1ED9ng tr\u1EDF v\u1EC1 sau 5 gi\u00E2y.</p>
            <button className="kiosk-back-btn" onClick={goToWelcome} style={{ marginTop: 24 }}>{'\u2190'} Trang ch\u1EE7</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== ZONE DISPLAY =====================
function ZoneQueueView({ zone }: { zone: string }) {
  const [clock, setClock] = useState(formatTime(new Date()));
  const [zoneData, setZoneData] = useState<{ items: { id: string; code: string; name: string; status: string; waitMinutes: number; room?: string }[]; stats: { waiting: number; serving: number; completed: number } } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setClock(formatTime(new Date())), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const fetchZoneData = async () => {
      try {
        const endpoint = zone === 'lab' ? '/liscomplete/queue/display'
          : zone === 'pharmacy' ? '/warehouse/queue/display'
          : '/reception/rooms/overview';
        const res = await publicClient.get(endpoint);
        if (!active) return;

        if (zone === 'lab' && res.data) {
          const d = res.data as LabQueueDisplayDto;
          setZoneData({
            items: [...(d.processingItems || []).map(i => ({ id: i.id, code: i.orderCode, name: i.patientName, status: 'Đang XL', waitMinutes: i.waitMinutes })),
              ...(d.waitingItems || []).map(i => ({ id: i.id, code: i.orderCode, name: i.patientName, status: 'Chờ', waitMinutes: i.waitMinutes }))],
            stats: { waiting: d.totalPending, serving: d.totalProcessing, completed: d.totalCompletedToday },
          });
        } else if (zone === 'reception' && Array.isArray(res.data)) {
          const rooms = res.data as { roomId: string; roomName: string; waitingCount: number; inProgressCount: number; completedCount: number }[];
          const items = rooms.map(r => ({ id: r.roomId, code: r.roomName, name: `${r.waitingCount} chờ`, status: r.inProgressCount > 0 ? 'Đang phục vụ' : 'Sẵn sàng', waitMinutes: 0, room: r.roomName }));
          setZoneData({
            items,
            stats: { waiting: rooms.reduce((s, r) => s + r.waitingCount, 0), serving: rooms.reduce((s, r) => s + r.inProgressCount, 0), completed: rooms.reduce((s, r) => s + r.completedCount, 0) },
          });
        } else {
          // Pharmacy or unknown zone - generic display
          setZoneData({ items: [], stats: { waiting: 0, serving: 0, completed: 0 } });
        }
      } catch {
        // Will retry on next poll
      }
    };
    fetchZoneData();
    const interval = setInterval(fetchZoneData, POLL_INTERVAL);
    return () => { active = false; clearInterval(interval); };
  }, [zone]);

  const zoneTitle = zone === 'lab' ? 'Xét nghiệm' : zone === 'pharmacy' ? 'Nhà thuốc' : 'Tiếp đón';

  return (
    <div className="queue-display">
      <div className="queue-header">
        <div className="queue-header-left">
          <h1>{HOSPITAL_NAME}</h1>
          <p>Hệ thống hiển thị - Khu vực {zoneTitle}</p>
        </div>
        <div className="queue-clock">{clock}</div>
      </div>

      <div className="lab-stats-bar">
        <div className="lab-stat">
          <span className="lab-stat-label">Chờ</span>
          <span className="lab-stat-value" style={{ color: '#faad14' }}>{zoneData?.stats.waiting ?? 0}</span>
        </div>
        <div className="lab-stat">
          <span className="lab-stat-label">Đang phục vụ</span>
          <span className="lab-stat-value" style={{ color: '#1890ff' }}>{zoneData?.stats.serving ?? 0}</span>
        </div>
        <div className="lab-stat">
          <span className="lab-stat-label">Hoàn thành</span>
          <span className="lab-stat-value" style={{ color: '#52c41a' }}>{zoneData?.stats.completed ?? 0}</span>
        </div>
      </div>

      <div className="lab-panels" style={{ display: 'flex', gap: 16, padding: '0 16px', flex: 1, overflow: 'auto' }}>
        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e0e0e0', fontSize: 18 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>STT</th>
                <th style={{ textAlign: 'left' }}>Mã</th>
                <th style={{ textAlign: 'left' }}>Tên / Phòng</th>
                <th style={{ textAlign: 'center' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {(zoneData?.items ?? []).map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '8px 12px' }}>{idx + 1}</td>
                  <td>{item.code}</td>
                  <td>{item.name}{item.room ? ` - ${item.room}` : ''}</td>
                  <td style={{ textAlign: 'center', color: item.status === 'Chờ' ? '#faad14' : '#52c41a' }}>{item.status}</td>
                </tr>
              ))}
              {(zoneData?.items ?? []).length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#666' }}>Không có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="queue-footer">
        <div className="queue-footer-stat">Khu vực:<strong>{zoneTitle}</strong></div>
        <div className="queue-footer-stat">Tổng chờ:<strong>{zoneData?.stats.waiting ?? 0}</strong></div>
        <div className="queue-footer-stat">Hoàn thành:<strong>{zoneData?.stats.completed ?? 0}</strong></div>
      </div>
    </div>
  );
}

// ===================== MAIN EXPORT =====================
export default function QueueDisplay() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const zone = searchParams.get('zone');

  if (mode === 'kiosk') return <KioskView />;
  if (mode === 'lab') return <LabQueueView />;
  if (zone) return <ZoneQueueView zone={zone} />;
  return <RoomQueueView />;
}
