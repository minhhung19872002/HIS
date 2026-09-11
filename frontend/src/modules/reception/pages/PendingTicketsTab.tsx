import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import * as receptionApi from '../api/reception';
import type { PendingCheckinTicketDto } from '../api/reception';
import { DataTable, StatusBadge, Btn, type ColumnDef } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { RefreshButton } from '../../../components/actions';

/**
 * Vé chờ tiếp đón — người bệnh đã bốc số (tại quầy hoặc trên app) mà chưa đăng ký khám.
 *
 * <p>Bảng gọi số đọc bảng QueueTickets, còn danh sách khám đọc bảng MedicalRecords. Một vé chưa
 * tiếp đón thì KHÔNG nằm trong danh sách nào của phòng khám: phòng bấm gọi "B001", người bệnh đi
 * vào, mà trên màn hình bác sĩ không có ai. Tab này đưa những vé đó trở lại tầm mắt của quầy để
 * đăng ký cho họ — và đăng ký từ đây thì người bệnh GIỮ NGUYÊN con số đang cầm.</p>
 */
export const PendingTicketsTab: React.FC<{
  onCheckin: (ticket: PendingCheckinTicketDto) => void;
  reloadKey?: number;
}> = ({ onCheckin, reloadKey }) => {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<PendingCheckinTicketDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receptionApi.getPendingCheckinTickets(dayjs().format('YYYY-MM-DD'));
      setRows(res.data || []);
    } catch {
      message.error('Không tải được danh sách vé chờ tiếp đón');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { void load(); }, [load, reloadKey]);

  const columns: ColumnDef<PendingCheckinTicketDto>[] = [
    {
      key: 'code', label: 'Số', mono: true, width: 90,
      render: (r) => <span className="chip cy">{r.ticketCode}</span>,
    },
    { key: 'type', label: 'Hàng đợi', width: 110, render: (r) => r.queueTypeName },
    { key: 'room', label: 'Phòng', render: (r) => r.roomName || '—' },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          {/* Vé vô danh: người bốc số chưa liên kết hồ sơ bệnh án, HIS không biết họ là ai.
              Nói thẳng để nhân viên hỏi tên tại quầy thay vì đi tìm một hồ sơ không tồn tại. */}
          <b>{r.patientName || 'Chưa rõ (vé vô danh)'}</b>
          <i className="mono">{r.phoneNumber || r.patientCode || '—'}</i>
        </div>
      ),
    },
    {
      key: 'appt', label: 'Lịch hẹn', width: 150, mono: true,
      render: (r) => r.appointmentCode || '—',
    },
    {
      key: 'wait', label: 'Chờ', mono: true, width: 90,
      sortValue: (r) => r.waitingMinutes,
      render: (r) => `${r.waitingMinutes} phút`,
    },
    {
      key: 'status', label: 'Trạng thái', width: 120,
      render: (r) => (
        <StatusBadge tone={r.status === 0 ? 'info' : 'warn'} dot={r.status > 0}>
          {r.statusName}
        </StatusBadge>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', margin: '0 0 var(--space-10)' }}>
        <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
          Vé đã bốc hôm nay nhưng chưa đăng ký khám — đăng ký từ đây thì người bệnh giữ nguyên số.
        </span>
        <span style={{ flex: 1 }} />
        <RefreshButton onRefresh={load} />
      </div>

      <DataTable<PendingCheckinTicketDto>
        columns={columns}
        data={rows}
        rowKey={(r) => r.ticketId}
        loading={loading}
        empty="Không có vé nào đang chờ tiếp đón"
        actions={(r) => (
          <div className="ab-actions">
            <Btn variant="primary" onClick={() => onCheckin(r)}>
              <TermIcon name="arrow-right" size={12} /> Tiếp đón
            </Btn>
          </div>
        )}
      />
    </>
  );
};
