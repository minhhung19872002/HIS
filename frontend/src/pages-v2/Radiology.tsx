import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import * as risApi from '../api/ris';
import type { RadiologyOrderDto, RadiologyOrderItemDto, RadiologyResultDto } from '../api/ris';
import './Radiology.css';

// service-type → modality + thumb class
function modalityOf(item?: RadiologyOrderItemDto): { type: 'CR' | 'CT' | 'US' | 'MRI' | 'OTHER'; thumb: string } {
  const t = (item?.serviceType || '').toUpperCase();
  if (t.includes('CT'))   return { type: 'CT',  thumb: 'ct' };
  if (t.includes('MRI'))  return { type: 'MRI', thumb: 'mri' };
  if (t.includes('US') || t.includes('SIEU AM') || t.includes('SIÊU')) return { type: 'US', thumb: 'us' };
  if (t.includes('XQ') || t.includes('X-QUANG') || t.includes('XQUANG')) return { type: 'CR', thumb: 'xray' };
  return { type: 'OTHER', thumb: 'xray' };
}

function statusOfOrder(o: RadiologyOrderDto): 'in-progress' | 'read' | 'pending' {
  const s = (o.status || '').toLowerCase();
  if (s.includes('read') || s.includes('xong') || s.includes('approve') || s.includes('duyệt')) return 'read';
  if (s.includes('progress') || s.includes('chạy') || s.includes('đang')) return 'in-progress';
  return 'pending';
}

const RadiologyV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [orders, setOrders] = useState<RadiologyOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string>('');
  const [tab, setTab] = useState<'report' | 'prior' | 'order'>('report');
  const [result, setResult] = useState<RadiologyResultDto | null>(null);
  const [date, setDate] = useState(() => dayjs());

  const reload = () => {
    setLoading(true);
    risApi.getRadiologyOrders(
      date.subtract(7, 'day').format('YYYY-MM-DD'),
      date.format('YYYY-MM-DD'),
    )
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        setOrders(data);
        if (data.length > 0 && !sel) setSel(data[0].id);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };
  useEffect(reload, [date]);

  // Load full result when selection changes
  useEffect(() => {
    setResult(null);
    if (!sel) return;
    const order = orders.find((o) => o.id === sel);
    const firstItem = order?.items?.[0];
    if (!firstItem?.hasResult) return;
    risApi.getRadiologyResult(firstItem.id)
      .then((r) => setResult(r.data || null))
      .catch(() => setResult(null));
  }, [sel, orders]);

  const order = useMemo(() => orders.find((o) => o.id === sel) || orders[0], [orders, sel]);
  const firstItem = order?.items?.[0];
  const mod = modalityOf(firstItem);

  // KPIs
  const todayOrders = orders.filter((o) => dayjs(o.orderDate).isSame(date, 'day'));
  const reading     = orders.filter((o) => statusOfOrder(o) === 'in-progress').length;
  const read        = orders.filter((o) => statusOfOrder(o) === 'read').length;
  const pending     = orders.filter((o) => statusOfOrder(o) === 'pending').length;

  return (
    <div className="ris-wrap">
      {/* ===== TOP BAR ===== */}
      <div className="ris-top">
        <div className="ris-pinfo">
          <b>{order?.patientName || 'Chọn study'}</b> · {firstItem?.serviceName || '—'}
          <div className="meta">
            {order && (
              <>
                <span>BN <span className="dark-val">{order.patientCode}</span></span>
                {order.age && <span>{order.age}t · {order.gender || '?'}</span>}
                <span>Order <span className="dark-val">{order.orderCode}</span></span>
                <span>Modality <span className="dark-val">{mod.type}</span></span>
                <span>Items <span className="dark-val">{order.items?.length || 0}</span></span>
                {order.orderDoctorName && <span>Chỉ định: {order.orderDoctorName}</span>}
                {order.departmentName && <span>{order.departmentName}</span>}
              </>
            )}
          </div>
        </div>
        <div className="ris-top-act">
          <button onClick={() => message.info('⬇ Đang đóng gói DICOM')} disabled={!order}>⬇ Tải DICOM</button>
          <button onClick={() => message.info('⎙ Đã gửi lệnh in phim')} disabled={!order}>⎙ In phim</button>
          <button onClick={() => message.success('📧 Đã gửi link PACS tới BS')} disabled={!order}>📧 Gửi BS</button>
        </div>
        <div className="ris-top-act">
          <button className="p" onClick={reload}>⟳ Làm mới</button>
        </div>
      </div>

      <div className="ris-body">
        {/* ===== WORKLIST ===== */}
        <div className="ris-studies">
          <div className="ris-studies-h">
            <span>Worklist · {date.isSame(dayjs(), 'day') ? 'hôm nay' : date.format('DD/MM')}</span>
            <span className="n">
              {todayOrders.length} hôm nay · {orders.length} 7 ngày
            </span>
          </div>
          <div className="ris-studies-list">
            {loading ? (
              <div style={{ padding: 16, fontSize: 12, color: '#9aa4ad', textAlign: 'center' }}>
                Đang tải...
              </div>
            ) : orders.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: '#9aa4ad', textAlign: 'center' }}>
                Chưa có chỉ định CĐHA
              </div>
            ) : orders.map((x) => {
              const st = statusOfOrder(x);
              const item = x.items?.[0];
              const m = modalityOf(item);
              return (
                <div
                  key={x.id}
                  className={'ris-study ' + (sel === x.id ? 'sel' : '')}
                  onClick={() => setSel(x.id)}
                >
                  <div className={'ris-study-thumb ' + m.thumb}>{m.type}</div>
                  <div>
                    <div className="ris-study-title">{x.patientName}</div>
                    <div className="ris-study-meta">
                      {item?.serviceName || '—'}<br />
                      {dayjs(x.orderDate).format('DD/MM HH:mm')} · {x.items?.length || 0} dịch vụ
                    </div>
                    <span className={'ris-study-stat ' + st}>
                      {st === 'read' ? '✓ ĐÃ ĐỌC' : st === 'in-progress' ? '● ĐANG ĐỌC' : '○ CHỜ'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== VIEWER (placeholder canvas) ===== */}
        <div className="ris-viewer">
          <div className="ris-viewer-tools">
            <div className="ris-tool-lbl">Dựng</div>
            <div className="ris-tool on" title="Pan">✥</div>
            <div className="ris-tool" title="Zoom">⌕</div>
            <div className="ris-tool" title="W/L">◐</div>
            <div className="ris-tool" title="Xoay">↻</div>
            <div className="ris-tool-sep" />
            <div className="ris-tool-lbl">Đo</div>
            <div className="ris-tool" title="Đo dài">│─│</div>
            <div className="ris-tool" title="Góc">∠</div>
            <div className="ris-tool" title="ROI">◯</div>
            <div className="ris-tool" title="Ghi chú">A</div>
            <div className="ris-tool-sep" />
            <div className="ris-tool-lbl">Layout</div>
            <div className="ris-tool on" title="1x1">▫</div>
            <div className="ris-tool" title="2x1">▫▫</div>
            <div className="ris-tool" title="2x2">⊞</div>
            <div style={{ flex: 1 }} />
            <div className="ris-tool-lbl">Items</div>
            <div style={{ color: '#e8ecef', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '0 8px' }}>
              {order?.items?.length || 0}
            </div>
          </div>

          <div className="ris-canvas-wrap">
            <div className="ris-canvas">
              {!order ? (
                <div style={{ color: '#9aa4ad', fontSize: 13 }}>
                  Chọn study trong worklist
                </div>
              ) : !firstItem?.hasImages ? (
                <div style={{ color: '#9aa4ad', fontSize: 13 }}>
                  Chưa có ảnh DICOM gắn cho study này
                </div>
              ) : (
                <>
                  <div className="ris-hud tl">
                    <b>BV</b><br />
                    {order.patientName}<br />
                    {order.patientCode} · {order.gender || '?'} · {order.age || '?'}Y
                  </div>
                  <div className="ris-hud tr">
                    {firstItem.serviceName}<br />
                    {dayjs(order.orderDate).format('DD/MM HH:mm')}<br />
                    Acc# {order.orderCode}
                  </div>
                  <div className="ris-hud bl">
                    {firstItem.startTime ? `Bắt đầu ${dayjs(firstItem.startTime).format('HH:mm')}` : ''}<br />
                    {firstItem.endTime ? `Kết thúc ${dayjs(firstItem.endTime).format('HH:mm')}` : ''}
                  </div>
                  <div className="ris-hud br">
                    Item 1 / {order.items.length}
                  </div>
                  <div className="ris-orient t">R</div>
                  <div className="ris-orient b">L</div>
                  <div className={mod.type === 'CR' ? 'xray-img' : 'xray-img'} />
                </>
              )}
            </div>
          </div>

          <div className="ris-viewer-foot">
            <span><span className="dot" /> <b>PACS</b></span>
            <span>{result?.dicomStudyUID || 'No DICOM UID'}</span>
            <span style={{ marginLeft: 'auto' }}>RIS · {orders.length} pending</span>
          </div>
        </div>

        {/* ===== REPORT ===== */}
        <div className="ris-report">
          <div className="ris-report-tabs">
            <div className={'ris-report-tab ' + (tab === 'report' ? 'on' : '')} onClick={() => setTab('report')}>Báo cáo</div>
            <div className={'ris-report-tab ' + (tab === 'prior' ? 'on' : '')} onClick={() => setTab('prior')}>So sánh</div>
            <div className={'ris-report-tab ' + (tab === 'order' ? 'on' : '')} onClick={() => setTab('order')}>Chỉ định</div>
          </div>

          {tab === 'report' && (
            <div className="ris-report-body">
              {!order ? (
                <div style={{ color: '#9aa4ad', fontSize: 12, textAlign: 'center', padding: 20 }}>
                  Chọn một study
                </div>
              ) : !result ? (
                <div style={{ color: '#9aa4ad', fontSize: 12, textAlign: 'center', padding: 20 }}>
                  Chưa có báo cáo cho study này
                </div>
              ) : (
                <>
                  {result.description && (
                    <div className="ris-report-sect">
                      <div className="h">Mô tả</div>
                      <div className="b" style={{ whiteSpace: 'pre-wrap' }}>{result.description}</div>
                    </div>
                  )}
                  {result.conclusion && (
                    <div className="ris-report-sect">
                      <div className="h">Kết luận</div>
                      <div className="b" style={{ whiteSpace: 'pre-wrap' }}>{result.conclusion}</div>
                    </div>
                  )}
                  {result.note && (
                    <div className="ris-report-sect">
                      <div className="h">Ghi chú</div>
                      <div className="b" style={{ whiteSpace: 'pre-wrap' }}>{result.note}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'prior' && (
            <div className="ris-report-body">
              <div style={{
                color: '#9aa4ad', fontFamily: 'var(--font-mono)',
                fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: 10,
              }}>Study trước của BN</div>
              <div style={{ color: '#9aa4ad', fontSize: 12, textAlign: 'center', padding: 12 }}>
                Cần thêm API patient-history để hiển thị
              </div>
            </div>
          )}

          {tab === 'order' && order && (
            <div className="ris-report-body">
              <Sect h="Bác sĩ chỉ định" b={<><b>{order.orderDoctorName}</b> · {order.departmentName}</>} />
              <Sect h="Thời gian" b={`Chỉ định ${dayjs(order.orderDate).format('DD/MM HH:mm')}`} />
              {order.diagnosis && <Sect h="Chẩn đoán" b={order.diagnosis} />}
              {order.clinicalInfo && <Sect h="Thông tin lâm sàng" b={order.clinicalInfo} />}
              <Sect h="Dịch vụ" b={
                <>
                  {(order.items || []).map((it) => (
                    <div key={it.id} style={{ marginBottom: 4 }}>
                      <b>{it.serviceCode}</b> · {it.serviceName} · {it.price.toLocaleString('vi-VN')}₫
                    </div>
                  ))}
                </>
              } />
            </div>
          )}

          <div className="ris-report-foot">
            <div className="ris-sign-row">
              <div className="ris-sign-ava">{result?.doctorName?.split(' ').slice(-1)[0]?.[0] || '?'}</div>
              <div className="ris-sign-dr">
                <b>{result?.doctorName || result?.technicianName || 'Chưa ký'}</b>
                <span>{result?.approvedTime ? dayjs(result.approvedTime).format('DD/MM HH:mm') : '—'} · {result?.approvalStatus || 'Chưa duyệt'}</span>
              </div>
            </div>
            <div className="ris-btn-row">
              <button onClick={() => message.info('✓ Đã lưu nháp')} disabled={!order}>Lưu nháp</button>
              <button onClick={() => message.success('📧 Đã gửi BS')} disabled={!order}>Gửi BS</button>
              <button
                className="p"
                onClick={() => message.success(`✓ Báo cáo ${order?.orderCode || ''} đã ký`)}
                disabled={!order}
              >✓ Ký</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Sect: React.FC<{ h: string; b: React.ReactNode }> = ({ h, b }) => (
  <div className="ris-report-sect">
    <div className="h">{h}</div>
    <div className="b">{b}</div>
  </div>
);

export default RadiologyV2;
