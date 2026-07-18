import { useState, useCallback, useEffect } from 'react';
import {
  examinationApi,
  type RoomDto, type RoomPatientListDto,
} from '../api/examination';

export function useOpdQueue() {
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [roomId, setRoomId] = useState<string>('');
  const [type, setType] = useState<'general' | 'yhct'>('general');
  const [queue, setQueue] = useState<RoomPatientListDto[]>([]);
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    examinationApi.getActiveExaminationRooms()
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setRooms(list);
        if (list.length > 0) setRoomId(list[0].id);
      })
      .catch(() => setRooms([]));
  }, []);

  const loadQueue = useCallback(async (rid: string) => {
    if (!rid) { setQueue([]); return; }
    try {
      const r = await examinationApi.getRoomPatientList(rid);
      setQueue(Array.isArray(r.data) ? r.data : []);
    } catch { setQueue([]); }
  }, []);
  useEffect(() => { loadQueue(roomId); }, [roomId, loadQueue]);

  return { rooms, roomId, setRoomId, type, setType, queue, loadQueue, scanOpen, setScanOpen };
}
