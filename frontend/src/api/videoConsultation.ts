import apiClient from './client';

export const ROOM_TYPES: Record<number, string> = {
  1: 'Hội chẩn CĐHA (DICOM)',
  2: 'Hội chẩn nội trú (ca bệnh)',
  3: 'Hội chẩn tử vong',
  4: 'Tele-consult tuyến trên',
  5: 'Giảng dạy / đào tạo',
};

export const STATUS_LABELS: Record<number, string> = {
  0: 'Đã lên lịch',
  1: 'Đang diễn ra',
  2: 'Đã kết thúc',
  3: 'Đã hủy',
};

export interface RoomDto {
  id: string;
  roomName: string;
  title: string;
  roomType: number;
  studyInstanceUID?: string;
  patientId?: string;
  patientName?: string;
  hostUserId: string;
  hostName?: string;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  status: number;
  statusText: string;
  isRecorded: boolean;
  recordingUrl?: string;
  hasPassword: boolean;
  jitsiUrl: string;
  conclusionNote?: string;
  createdAt: string;
}

export interface CreateRoomRequest {
  title: string;
  roomType: number;
  description?: string;
  studyInstanceUID?: string;
  patientId?: string;
  medicalRecordId?: string;
  scheduledAt?: string;
  isRecorded: boolean;
  password?: string;
  inviteEmails?: string[];
}

export async function createRoom(req: CreateRoomRequest) {
  const { data } = await apiClient.post<RoomDto>('/video-consultation', req);
  return data;
}

export async function searchRooms(params: {
  status?: number;
  roomType?: number;
  fromDate?: string;
  toDate?: string;
  keyword?: string;
}) {
  const { data } = await apiClient.get<RoomDto[]>('/video-consultation', { params });
  return data;
}

export async function getRoom(id: string) {
  const { data } = await apiClient.get<RoomDto>(`/video-consultation/${id}`);
  return data;
}

export async function startRoom(id: string) {
  const { data } = await apiClient.post<RoomDto>(`/video-consultation/${id}/start`);
  return data;
}

export async function endRoom(id: string, conclusionNote?: string) {
  const { data } = await apiClient.post<RoomDto>(`/video-consultation/${id}/end`, { conclusionNote });
  return data;
}

export async function cancelRoom(id: string, reason?: string) {
  const { data } = await apiClient.post(`/video-consultation/${id}/cancel`, { reason });
  return data;
}

export async function joinRoom(id: string, displayName: string, email?: string, role?: string) {
  const { data } = await apiClient.post<{ jitsiUrl: string; password?: string }>(`/video-consultation/${id}/join`, {
    displayName, email, role,
  });
  return data;
}

export async function getParticipants(id: string) {
  const { data } = await apiClient.get(`/video-consultation/${id}/participants`);
  return data;
}
