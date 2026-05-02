import React, { useCallback, useEffect, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, SearchBox, Filter, DataTable, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, Ico, tk, ti, tw,
  type ColumnDef,
} from './_v2kit';

const { RangePicker } = DatePicker;

interface RegisterEntry {
  id: string; consultationDate: string; consultationType: number; consultationTypeName: string;
  reason?: string; summary?: string; conclusion?: string; treatmentPlan?: string;
  presidedBy?: string; secretary?: string; participants?: string;
  patientCode: string; patientName: string; departmentName?: string;
  examinationId: string;
}
interface Detail {
  id: string; consultationDate: string; consultationType: number; consultationTypeName: string;
  reason?: string; summary?: string; conclusion?: string; treatmentPlan?: string;
  presidedBy?: string; secretary?: string; participants?: string[] | null;
  patient: { code: string; name: string; gender: number; dateOfBirth?: string; address?: string; insuranceNumber?: string };
  examination: { examinationId: string; medicalRecordCode?: string; departmentName?: string; mainDiagnosis?: string; mainIcdCode?: string };
}

const TYPE_OPTIONS = [
  { v: '1', l: 'Hội chẩn khoa' },
  { v: '2', l: 'Hội chẩn liên khoa' },
  { v: '3', l: 'Hội chẩn bệnh viện' },
];

const ConsultationRegisterV2: React.FC = () => {
  const [data, setData] = useState<RegisterEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>([dayjs().subtract(30, 'day'), dayjs()]);
  const [filterType, setFilterType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {};
      if (range?.[0]) params.fromDate = range[0].toISOString();
      if (range?.[1]) params.toDate = range[1].toISOString();
      if (filterType) params.consultationType = Number(filterType);
      if (keyword) params.keyword = keyword;
      const { data } = await apiClient.get<RegisterEntry[]>('/consultation-register', { params });
      setData(data || []);
    } catch { ti('Tải sổ thất bại'); }
    finally { setLoading(false); }
  }, [range, filterType, keyword]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (row: RegisterEntry) => {
    try { const { data } = await apiClient.get<Detail>(`/consultation-register/${row.id}`); setDetail(data); }
    catch { tw('Tải chi tiết thất bại'); }
  };

  const printMinutes = (d: Detail) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const list = Array.isArray(d.participants) ? d.participants.map((p) => `<li>${p}</li>`).join('') : '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>BBHC</title>
<style>body{font-family:"Times New Roman",serif;padding:32px;font-size:13.5pt}h1{text-align:center;font-size:18pt;margin:20px 0 6px}.subtitle{text-align:center;font-style:italic;margin-bottom:24px}.row{margin:4px 0}.section{margin:16px 0}.section-title{font-weight:bold;margin-top:12px}.sig{display:flex;justify-content:space-around;margin-top:40px}.sig>div{text-align:center;width:30%}ul{margin:4px 0 4px 16px;padding:0}</style></head>
<body><div style="text-align:center"><div>BỘ Y TẾ</div><div style="font-weight:bold">BỆNH VIỆN</div><div style="margin-top:6px">Mẫu số: MS. 03/BV</div></div>
<h1>BIÊN BẢN HỘI CHẨN</h1>
<div class="subtitle">(${d.consultationTypeName})</div>
<div class="row"><b>Thời gian:</b> ${dayjs(d.consultationDate).format('HH:mm DD/MM/YYYY')}</div>
<div class="row"><b>Địa điểm:</b> ${d.examination.departmentName ?? '-'}</div>
<div class="row"><b>Họ tên BN:</b> ${d.patient.name} — <b>Mã BN:</b> ${d.patient.code}</div>
<div class="row"><b>Giới tính:</b> ${d.patient.gender === 1 ? 'Nam' : d.patient.gender === 2 ? 'Nữ' : '-'} — <b>Ngày sinh:</b> ${d.patient.dateOfBirth ? dayjs(d.patient.dateOfBirth).format('DD/MM/YYYY') : '-'}</div>
<div class="row"><b>Địa chỉ:</b> ${d.patient.address ?? ''}</div>
<div class="row"><b>BHYT:</b> ${d.patient.insuranceNumber ?? ''}</div>
<div class="row"><b>HSBA:</b> ${d.examination.medicalRecordCode ?? ''} — <b>CĐ:</b> ${d.examination.mainDiagnosis ?? ''} ${d.examination.mainIcdCode ? `(${d.examination.mainIcdCode})` : ''}</div>
<div class="section"><div class="section-title">Thành phần tham dự:</div><div>Chủ trì: ${d.presidedBy ?? '________'}</div><div>Thư ký: ${d.secretary ?? '________'}</div>${list ? `<div>Thành viên:</div><ul>${list}</ul>` : ''}</div>
<div class="section"><div class="section-title">I. LÝ DO HỘI CHẨN</div><div>${(d.reason ?? '').replace(/\n/g, '<br/>') || '...'}</div></div>
<div class="section"><div class="section-title">II. TÓM TẮT BỆNH ÁN</div><div>${(d.summary ?? '').replace(/\n/g, '<br/>') || '...'}</div></div>
<div class="section"><div class="section-title">III. KẾT LUẬN</div><div>${(d.conclusion ?? '').replace(/\n/g, '<br/>') || '...'}</div></div>
<div class="section"><div class="section-title">IV. HƯỚNG ĐIỀU TRỊ</div><div>${(d.treatmentPlan ?? '').replace(/\n/g, '<br/>') || '...'}</div></div>
<div class="sig"><div><b>THƯ KÝ</b><br/><br/><br/>${d.secretary ?? ''}</div><div><b>CHỦ TRÌ</b><br/><br/><br/>${d.presidedBy ?? ''}</div></div>
</body></html>`;
    w.document.write(html); w.document.close(); w.focus(); w.print();
  };

  const cols: ColumnDef<RegisterEntry>[] = [
    { key: 'date', label: 'Ngày', mono: true, render: (r) => dayjs(r.consultationDate).format('DD/MM HH:mm') },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone={r.consultationType === 3 ? 'crit' : r.consultationType === 2 ? 'warn' : 'info'}>
        {r.consultationTypeName}
      </StatusBadge>
    ) },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'reason', label: 'Lý do', render: (r) => <span style={{ fontSize: 12 }}>{r.reason || '—'}</span> },
    { key: 'pres', label: 'Chủ trì', render: (r) => r.presidedBy || '—' },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng hội chẩn', val: data.length, sub: 'kỳ này' },
        { lbl: 'Hội chẩn khoa', val: data.filter((d) => d.consultationType === 1).length, sub: 'nội khoa', tone: 'info' },
        { lbl: 'Liên khoa', val: data.filter((d) => d.consultationType === 2).length, sub: 'phối hợp', tone: 'warn' },
        { lbl: 'Toàn viện', val: data.filter((d) => d.consultationType === 3).length, sub: 'cấp BV', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <RangePicker format="DD/MM/YYYY" value={range} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
        <Filter value={filterType} onChange={setFilterType} options={TYPE_OPTIONS} placeholder="▾ Loại" />
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tên BN / mã BN / lý do…" />
        <button className="ab-btn ghost" type="button" onClick={() => { setKeyword(''); setFilterType(''); setRange([dayjs().subtract(30, 'day'), dayjs()]); }}>
          <Ico name="x" size={12} /> Reset
        </button>
        <span className="spacer" />
        <button className="ab-btn primary" type="button" onClick={load}>
          <Ico name="search" size={12} /> Tra cứu
        </button>
      </div>

      <DataTable<RegisterEntry>
        columns={cols} data={data} rowKey={(r) => r.id}
        onRowClick={openDetail}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="eye" title="Xem" onClick={() => openDetail(r)} />
            <ActBtn ic="print" title="In BBHC" onClick={async () => {
              const { data: d } = await apiClient.get<Detail>(`/consultation-register/${r.id}`);
              if (d) printMinutes(d);
            }} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Không có hội chẩn'}
      />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        size="xl"
        title={detail ? `Biên bản hội chẩn ${dayjs(detail.consultationDate).format('DD/MM HH:mm')}` : ''}
        sub={detail ? `${detail.consultationTypeName} · ${detail.patient.name}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
          <button type="button" className="ab-btn primary" onClick={() => detail && printMinutes(detail)}>
            <Ico name="print" size={12} /> In BBHC
          </button>
        </>}
      >
        {detail && <>
          <DrSec title="Bệnh nhân">
            <DrField lbl="Họ tên">{detail.patient.name}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{detail.patient.code}</span></DrField>
            <DrField lbl="Giới tính">{detail.patient.gender === 1 ? 'Nam' : detail.patient.gender === 2 ? 'Nữ' : '—'}</DrField>
            <DrField lbl="Ngày sinh">{detail.patient.dateOfBirth ? dayjs(detail.patient.dateOfBirth).format('DD/MM/YYYY') : '—'}</DrField>
            <DrField lbl="BHYT"><span style={{ fontFamily: 'var(--font-mono)' }}>{detail.patient.insuranceNumber || '—'}</span></DrField>
            <DrField lbl="Địa chỉ">{detail.patient.address || '—'}</DrField>
          </DrSec>
          <DrSec title="Hồ sơ bệnh án">
            <DrField lbl="Mã HSBA"><span style={{ fontFamily: 'var(--font-mono)' }}>{detail.examination.medicalRecordCode || '—'}</span></DrField>
            <DrField lbl="Khoa">{detail.examination.departmentName || '—'}</DrField>
            <DrField lbl="Chẩn đoán">{detail.examination.mainDiagnosis || '—'} {detail.examination.mainIcdCode && `(${detail.examination.mainIcdCode})`}</DrField>
          </DrSec>
          <DrSec title="Thành phần">
            <DrField lbl="Chủ trì">{detail.presidedBy || '—'}</DrField>
            <DrField lbl="Thư ký">{detail.secretary || '—'}</DrField>
            {detail.participants && Array.isArray(detail.participants) && (
              <DrField lbl="Tham dự">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {detail.participants.map((p, i) => <StatusBadge key={i} tone="info">{p}</StatusBadge>)}
                </div>
              </DrField>
            )}
          </DrSec>
          <DrSec title="I. Lý do hội chẩn">
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--t-1)' }}>{detail.reason || '—'}</div>
          </DrSec>
          <DrSec title="II. Tóm tắt bệnh án">
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--t-1)' }}>{detail.summary || '—'}</div>
          </DrSec>
          <DrSec title="III. Kết luận">
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--t-0)', fontWeight: 500 }}>{detail.conclusion || '—'}</div>
          </DrSec>
          <DrSec title="IV. Hướng điều trị">
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--t-1)' }}>{detail.treatmentPlan || '—'}</div>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default ConsultationRegisterV2;
