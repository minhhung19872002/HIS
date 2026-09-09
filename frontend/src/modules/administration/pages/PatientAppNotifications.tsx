/**
 * Thông báo của bệnh viện gửi tới app bệnh nhân — HSMT I.3 #1.4.
 *
 * Soạn · chọn đối tượng · hẹn giờ · xem lịch sử và tỉ lệ đã đọc. Một đợt gửi cho "tất cả người dùng"
 * là hành động không thu hồi được, nên form hỏi lại rất rõ trước khi gửi.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, DatePicker, Form, Input, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import {
  getCampaigns,
  createCampaign,
  cancelCampaign,
  type PatientAppCampaign,
} from '@/api/patientApp';
import {
  ActBtn, Btn, DataTable, DrawerShell, DrSec, DrField, ErrorState, KpiStrip,
  LoadingState, ModalShell, Pager, StatusBadge, fmtDTg, tk, te,
  type ColumnDef, type KpiItem,
} from '@/_v2kit';

const AUDIENCES = [
  { value: 'all', label: 'Tất cả người dùng app' },
  { value: 'linked', label: 'Người đã liên kết hồ sơ bệnh án' },
  { value: 'upcoming_appointment', label: 'Người có lịch hẹn trong 7 ngày tới' },
];

const CATEGORIES = [
  { value: 'hospital', label: 'Thông báo bệnh viện' },
  { value: 'system', label: 'Hệ thống' },
];

const statusTone = (status: string): 'ok' | 'warn' | 'crit' | 'info' =>
  status === 'Sent' ? 'ok'
    : status === 'Scheduled' ? 'warn'
      : status === 'Failed' ? 'crit' : 'info';

const statusLabel = (status: string): string => ({
  Draft: 'Nháp',
  Scheduled: 'Đã hẹn giờ',
  Sent: 'Đã gửi',
  Failed: 'Gửi lỗi',
  Cancelled: 'Đã huỷ',
}[status] ?? status);

const PAGE_SIZE = 20;

interface ComposeValues {
  title: string;
  body: string;
  category: string;
  audience: string;
  deepLink?: string;
  scheduledAt?: dayjs.Dayjs | null;
}

const ComposeModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}> = ({ open, onClose, onSent }) => {
  const [form] = Form.useForm<ComposeValues>();
  const [sending, setSending] = useState(false);
  const audience = Form.useWatch('audience', form);
  const scheduledAt = Form.useWatch('scheduledAt', form);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        title: '', body: '', category: 'hospital', audience: 'all',
        deepLink: '', scheduledAt: null,
      });
    }
  }, [open, form]);

  const submit = async () => {
    let values: ComposeValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const isBroadcast = values.audience === 'all';
    const send = async () => {
      setSending(true);
      try {
        await createCampaign({
          title: values.title,
          body: values.body,
          category: values.category,
          deepLink: values.deepLink || undefined,
          audience: values.audience,
          scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : null,
        });
        tk(values.scheduledAt ? 'Đã hẹn giờ gửi' : 'Đã gửi thông báo');
        onSent();
        onClose();
      } catch {
        te('Không gửi được thông báo');
      } finally {
        setSending(false);
      }
    };

    // Gửi cho toàn bộ người dùng thì hỏi lại một lần nữa: đã gửi là không rút lại được, thông báo
    // nằm luôn trong hộp thư của mọi người.
    if (isBroadcast && !values.scheduledAt) {
      Modal.confirm({
        title: 'Gửi ngay cho TẤT CẢ người dùng app?',
        content: 'Thông báo đã gửi không thu hồi được. Vui lòng kiểm tra lại nội dung.',
        okText: 'Gửi ngay',
        cancelText: 'Xem lại',
        onOk: send,
      });
      return;
    }

    await send();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Soạn thông báo gửi app"
      size="md"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" loading={sending} onClick={submit}>
            {scheduledAt ? 'Hẹn giờ gửi' : 'Gửi ngay'}
          </Btn>
        </>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="Tiêu đề"
          rules={[{ required: true, message: 'Nhập tiêu đề' }, { max: 200 }]}
        >
          <Input placeholder="Ví dụ: Lịch nghỉ Tết Nguyên đán 2027" />
        </Form.Item>

        <Form.Item
          name="body"
          label="Nội dung"
          rules={[{ required: true, message: 'Nhập nội dung' }, { max: 2000 }]}
          extra="Không đưa thông tin bệnh án vào đây — nội dung này đi qua hạ tầng thông báo bên ngoài."
        >
          <Input.TextArea rows={4} placeholder="Nội dung thông báo gửi tới người bệnh" />
        </Form.Item>

        <Form.Item name="category" label="Nhóm">
          <Select options={CATEGORIES} />
        </Form.Item>

        <Form.Item name="audience" label="Gửi tới">
          <Select options={AUDIENCES} />
        </Form.Item>

        {audience === 'all' && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="Thông báo sẽ tới mọi người dùng app đang hoạt động và không thu hồi được."
          />
        )}

        <Form.Item
          name="scheduledAt"
          label="Hẹn giờ gửi"
          extra="Bỏ trống để gửi ngay."
        >
          <DatePicker
            showTime
            style={{ width: '100%' }}
            format="HH:mm DD/MM/YYYY"
            disabledDate={(d) => d && d < dayjs().startOf('day')}
          />
        </Form.Item>

        <Form.Item
          name="deepLink"
          label="Mở màn hình trong app (không bắt buộc)"
          extra="Ví dụ: /results hoặc /appointments"
        >
          <Input placeholder="/results" />
        </Form.Item>
      </Form>
    </ModalShell>
  );
};

const PatientAppNotifications: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<PatientAppCampaign[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<PatientAppCampaign | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    getCampaigns({ page: page + 1, pageSize: PAGE_SIZE })
      .then((r) => { setRows(r.items); setTotal(r.total); })
      .catch(() => { setRows([]); setError(true); })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { reload(); }, [reload]);

  const cancel = (campaign: PatientAppCampaign) => {
    Modal.confirm({
      title: `Huỷ chiến dịch "${campaign.title}"?`,
      content: 'Thông báo sẽ không được gửi vào giờ đã hẹn.',
      okText: 'Huỷ chiến dịch',
      cancelText: 'Không',
      onOk: () => cancelCampaign(campaign.id)
        .then(() => { tk('Đã huỷ chiến dịch'); reload(); })
        .catch(() => te('Không huỷ được')),
    });
  };

  const readRate = (c: PatientAppCampaign): string =>
    c.recipientCount === 0 ? '—' : `${Math.round((c.readCount / c.recipientCount) * 100)}%`;

  const columns: ColumnDef<PatientAppCampaign>[] = [
    { key: 'title', label: 'Tiêu đề', render: (c) => c.title },
    { key: 'audience', label: 'Gửi tới', render: (c) => c.audienceName },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (c) => <StatusBadge tone={statusTone(c.status)}>{statusLabel(c.status)}</StatusBadge>,
    },
    { key: 'recipients', label: 'Đã gửi', render: (c) => c.recipientCount },
    { key: 'read', label: 'Đã đọc', render: (c) => `${c.readCount} (${readRate(c)})` },
    {
      key: 'when',
      label: 'Thời điểm',
      render: (c) => c.sentAt ? fmtDTg(c.sentAt)
        : c.scheduledAt ? `hẹn ${fmtDTg(c.scheduledAt)}` : fmtDTg(c.createdAt),
    },
    { key: 'by', label: 'Người soạn', render: (c) => c.createdByName || '—' },
  ];

  const kpis: KpiItem[] = [
    { lbl: 'Tổng chiến dịch', val: total, tone: 'info' },
    { lbl: 'Đang chờ gửi', val: rows.filter((c) => c.status === 'Scheduled').length, tone: 'warn' },
    {
      lbl: 'Gửi lỗi',
      val: rows.filter((c) => c.status === 'Failed').length,
      tone: rows.some((c) => c.status === 'Failed') ? 'crit' : 'info',
    },
  ];

  return (
    <div className="ab" data-testid="patient-app-notifications-page">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <span style={{ flex: 1 }} />
        <Btn variant="primary" icon="plus" onClick={() => setComposeOpen(true)}>
          Soạn thông báo
        </Btn>
      </div>

      {loading ? <LoadingState />
        : error ? <ErrorState onRetry={reload} />
          : (
            <>
              <DataTable
                sortScope="page"
                data={rows}
                columns={columns}
                rowKey={(c) => c.id}
                onRowClick={setDetail}
                empty="Chưa có chiến dịch thông báo nào."
                actions={(c) => (
                  c.status === 'Scheduled'
                    ? <ActBtn ic="x" tone="crit" title="Huỷ chiến dịch" onClick={() => cancel(c)} />
                    : null
                )}
              />
              <Pager
                page={page}
                totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
                setPage={setPage}
                total={total}
                perPage={PAGE_SIZE}
              />
            </>
          )}

      <DrawerShell
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.title ?? ''}
        sub={detail ? statusLabel(detail.status) : ''}
      >
        {detail && (
          <>
            <DrSec title="Nội dung">
              <DrField lbl="Tiêu đề">{detail.title}</DrField>
              <DrField lbl="Nội dung">{detail.body}</DrField>
              <DrField lbl="Nhóm">{detail.category}</DrField>
              {detail.deepLink && <DrField lbl="Mở màn hình">{detail.deepLink}</DrField>}
            </DrSec>
            <DrSec title="Gửi">
              <DrField lbl="Đối tượng">{detail.audienceName}</DrField>
              <DrField lbl="Trạng thái">
                <StatusBadge tone={statusTone(detail.status)}>
                  {statusLabel(detail.status)}
                </StatusBadge>
              </DrField>
              {detail.scheduledAt && <DrField lbl="Hẹn giờ">{fmtDTg(detail.scheduledAt)}</DrField>}
              {detail.sentAt && <DrField lbl="Đã gửi lúc">{fmtDTg(detail.sentAt)}</DrField>}
              <DrField lbl="Số người nhận">{detail.recipientCount}</DrField>
              <DrField lbl="Đã đọc">{detail.readCount} ({readRate(detail)})</DrField>
              {detail.failureReason && (
                <DrField lbl="Lý do lỗi">{detail.failureReason}</DrField>
              )}
            </DrSec>
            <DrSec title="Người soạn">
              <DrField lbl="Nhân viên">{detail.createdByName || '—'}</DrField>
              <DrField lbl="Lúc">{fmtDTg(detail.createdAt)}</DrField>
            </DrSec>
          </>
        )}
      </DrawerShell>

      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={reload}
      />
    </div>
  );
};

export default PatientAppNotifications;
