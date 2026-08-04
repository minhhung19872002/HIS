import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import { printStyles, PrintHeader, Field, SignatureBlock } from './_shared';

/* ──────────────────────────────────────────────────────────────────────────
   NangCap26 — 2 biểu mẫu in còn thiếu so với HSMT TTYT Tịnh Biên:
   · X.2 #16  — Phiếu đếm gạc, dụng cụ (an toàn phẫu thuật)
   · Phiếu in #98 — Phiếu lĩnh hóa chất (tách khỏi phiếu lĩnh thuốc / VTYT)
   ────────────────────────────────────────────────────────────────────────── */

export interface GauzeCountItem {
  /** Tên gạc / dụng cụ */
  name: string;
  unit?: string;
  /** Số lượng đếm TRƯỚC khi mổ */
  countBefore?: number;
  /** Số lượng bổ sung trong mổ */
  countAdded?: number;
  /** Số lượng đếm SAU khi đóng vết mổ */
  countAfter?: number;
  note?: string;
}

export interface GauzeCountSheetProps {
  patientName?: string;
  patientCode?: string;
  age?: number | string;
  gender?: number;
  departmentName?: string;
  roomBed?: string;
  surgeryName?: string;
  surgeryDate?: string;
  surgeonName?: string;
  scrubNurseName?: string;
  circulatingNurseName?: string;
  items?: GauzeCountItem[];
  /** Kết luận khớp/không khớp — điều dưỡng dụng cụ xác nhận */
  isMatched?: boolean;
  discrepancyNote?: string;
}

/**
 * Phiếu đếm gạc, dụng cụ — NangCap26 X.2 #16.
 * Đếm trước mổ · bổ sung trong mổ · đếm sau khi đóng vết mổ; lệch số lượng phải ghi rõ.
 */
export const GauzeCountSheetPrint = forwardRef<HTMLDivElement, GauzeCountSheetProps>((props, ref) => {
  const rows: GauzeCountItem[] = props.items?.length
    ? props.items
    : [
        { name: 'Gạc lớn', unit: 'miếng' },
        { name: 'Gạc nhỏ', unit: 'miếng' },
        { name: 'Meche', unit: 'cái' },
        { name: 'Kim khâu', unit: 'cây' },
        { name: 'Dao mổ', unit: 'cái' },
        { name: 'Kẹp phẫu tích', unit: 'cái' },
        { name: 'Kéo', unit: 'cái' },
      ];

  const total = (r: GauzeCountItem) => (r.countBefore ?? 0) + (r.countAdded ?? 0);
  const isRowMatched = (r: GauzeCountItem) =>
    r.countAfter != null && total(r) === r.countAfter;

  return (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="NC26-01" />
      <h2>PHIẾU ĐẾM GẠC, DỤNG CỤ</h2>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ tên người bệnh" value={props.patientName} /></div>
          <div className="col"><Field label="Mã BN" value={props.patientCode} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Tuổi" value={props.age} /></div>
          <div className="col"><Field label="Giới" value={props.gender === 1 ? 'Nam' : props.gender === 2 ? 'Nữ' : ''} /></div>
          <div className="col"><Field label="Khoa" value={props.departmentName} /></div>
          <div className="col"><Field label="Phòng/Giường" value={props.roomBed} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Phẫu thuật/Thủ thuật" value={props.surgeryName} /></div>
          <div className="col"><Field label="Ngày mổ" value={props.surgeryDate ? dayjs(props.surgeryDate).format('DD/MM/YYYY HH:mm') : ''} /></div>
        </div>
      </div>

      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ width: 36 }}>TT</th>
            <th>Tên gạc / dụng cụ</th>
            <th style={{ width: 60 }}>ĐVT</th>
            <th style={{ width: 80 }}>Đếm trước mổ</th>
            <th style={{ width: 80 }}>Bổ sung</th>
            <th style={{ width: 70 }}>Tổng</th>
            <th style={{ width: 80 }}>Đếm sau mổ</th>
            <th style={{ width: 70 }}>Khớp</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ textAlign: 'center' }}>{i + 1}</td>
              <td>{r.name}</td>
              <td style={{ textAlign: 'center' }}>{r.unit || ''}</td>
              <td style={{ textAlign: 'center' }}>{r.countBefore ?? ''}</td>
              <td style={{ textAlign: 'center' }}>{r.countAdded ?? ''}</td>
              <td style={{ textAlign: 'center' }}>{r.countBefore != null ? total(r) : ''}</td>
              <td style={{ textAlign: 'center' }}>{r.countAfter ?? ''}</td>
              <td style={{ textAlign: 'center', fontWeight: 700 }}>
                {r.countAfter == null ? '' : isRowMatched(r) ? '✓' : '✗'}
              </td>
              <td>{r.note || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="section" style={{ marginTop: 12 }}>
        <p><strong>Kết luận:</strong>{' '}
          {props.isMatched === true ? 'Số lượng gạc, dụng cụ ĐẦY ĐỦ trước khi đóng vết mổ.'
            : props.isMatched === false ? 'PHÁT HIỆN CHÊNH LỆCH — xử trí theo quy trình an toàn phẫu thuật.'
            : '..............................................................................'}
        </p>
        {props.discrepancyNote && <p><strong>Ghi nhận chênh lệch:</strong> {props.discrepancyNote}</p>}
      </div>

      {/* SignatureBlock dùng chung chỉ có 2 cột → thêm dòng ký của ĐD vòng ngoài phía trên. */}
      <div className="section" style={{ marginTop: 8 }}>
        <Field label="Điều dưỡng vòng ngoài" value={props.circulatingNurseName} />
      </div>
      <SignatureBlock leftTitle="Điều dưỡng dụng cụ" rightTitle="Phẫu thuật viên" />
    </div>
  );
});
GauzeCountSheetPrint.displayName = 'GauzeCountSheetPrint';

export interface ChemicalIssueItem {
  code?: string;
  name: string;
  unit?: string;
  quantityRequested?: number;
  quantityIssued?: number;
  batchNumber?: string;
  expiryDate?: string;
  note?: string;
}

export interface ChemicalIssueSlipProps {
  slipCode?: string;
  slipDate?: string;
  departmentName?: string;
  warehouseName?: string;
  requesterName?: string;
  storekeeperName?: string;
  pharmacyHeadName?: string;
  directorName?: string;
  items?: ChemicalIssueItem[];
  note?: string;
}

/**
 * Phiếu lĩnh hóa chất — NangCap26 danh sách phiếu in #98.
 * Tách riêng khỏi phiếu lĩnh thuốc và phiếu lĩnh VTYT tiêu hao (đã có).
 */
export const ChemicalIssueSlipPrint = forwardRef<HTMLDivElement, ChemicalIssueSlipProps>((props, ref) => {
  const rows = props.items ?? [];
  return (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="NC26-02" />
      <h2>PHIẾU LĨNH HÓA CHẤT</h2>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Số phiếu" value={props.slipCode} /></div>
          <div className="col"><Field label="Ngày lĩnh" value={props.slipDate ? dayjs(props.slipDate).format('DD/MM/YYYY') : ''} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Khoa/Phòng lĩnh" value={props.departmentName} /></div>
          <div className="col"><Field label="Kho xuất" value={props.warehouseName} /></div>
        </div>
      </div>

      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ width: 36 }}>TT</th>
            <th style={{ width: 90 }}>Mã</th>
            <th>Tên hóa chất</th>
            <th style={{ width: 60 }}>ĐVT</th>
            <th style={{ width: 80 }}>SL yêu cầu</th>
            <th style={{ width: 80 }}>SL thực lĩnh</th>
            <th style={{ width: 90 }}>Số lô</th>
            <th style={{ width: 90 }}>Hạn dùng</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 16 }}>(Chưa có dòng hóa chất)</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ textAlign: 'center' }}>{i + 1}</td>
              <td>{r.code || ''}</td>
              <td>{r.name}</td>
              <td style={{ textAlign: 'center' }}>{r.unit || ''}</td>
              <td style={{ textAlign: 'center' }}>{r.quantityRequested ?? ''}</td>
              <td style={{ textAlign: 'center' }}>{r.quantityIssued ?? ''}</td>
              <td style={{ textAlign: 'center' }}>{r.batchNumber || ''}</td>
              <td style={{ textAlign: 'center' }}>{r.expiryDate ? dayjs(r.expiryDate).format('DD/MM/YYYY') : ''}</td>
              <td>{r.note || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {props.note && <div className="section" style={{ marginTop: 8 }}><Field label="Ghi chú" value={props.note} /></div>}

      <div className="section" style={{ marginTop: 8 }}>
        <div className="row">
          <div className="col"><Field label="Trưởng khoa Dược" value={props.pharmacyHeadName} /></div>
          <div className="col"><Field label="Giám đốc" value={props.directorName} /></div>
        </div>
      </div>
      <SignatureBlock leftTitle="Người lĩnh" rightTitle="Thủ kho" />
    </div>
  );
});
ChemicalIssueSlipPrint.displayName = 'ChemicalIssueSlipPrint';
