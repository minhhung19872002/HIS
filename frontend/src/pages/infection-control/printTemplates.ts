/**
 * InfectionControl print template — Báo cáo NK BV.
 * Extracted khỏi pages/InfectionControl.tsx (K30 Batch 1).
 */
import dayjs from 'dayjs';
import { HOSPITAL_NAME } from '../../constants/hospital';
import type { HAISurveillanceDto, InfectionControlDashboardDto } from '../../modules/infection-control/api/infectionControl';

export const buildInfectionReportHtml = (
  haiCases: HAISurveillanceDto[],
  dashboard: InfectionControlDashboardDto | null,
): string => `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Báo cáo KSNK</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background: #f0f0f0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <strong>${HOSPITAL_NAME}</strong><br/>
          Khoa Kiểm soát nhiễm khuẩn
        </div>

        <div class="title">BÁO CÁO NHIỄM KHUẨN BỆNH VIỆN</div>
        <p style="text-align: center;">Tháng ${dayjs().format('MM/YYYY')}</p>

        <h3>1. Tổng hợp ca nhiễm khuẩn</h3>
        <table>
          <thead>
            <tr>
              <th>Loại NK</th>
              <th>Số ca</th>
              <th>Tỷ lệ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>SSI - Nhiễm khuẩn vết mổ</td>
              <td>${dashboard?.ssiRate != null ? Math.round(dashboard.ssiRate) : haiCases.filter((c) => c.infectionType === 'SSI').length}</td>
              <td>${dashboard?.ssiRate != null ? dashboard.ssiRate.toFixed(2) + '/1000' : '-'}</td>
            </tr>
            <tr>
              <td>VAP - Viêm phổi thở máy</td>
              <td>${dashboard?.vapRate != null ? Math.round(dashboard.vapRate) : haiCases.filter((c) => c.infectionType === 'VAP').length}</td>
              <td>${dashboard?.vapRate != null ? dashboard.vapRate.toFixed(2) + '/1000' : '-'}</td>
            </tr>
            <tr>
              <td>CAUTI - NK tiết niệu</td>
              <td>${dashboard?.cautiRate != null ? Math.round(dashboard.cautiRate) : haiCases.filter((c) => c.infectionType === 'CAUTI').length}</td>
              <td>${dashboard?.cautiRate != null ? dashboard.cautiRate.toFixed(2) + '/1000' : '-'}</td>
            </tr>
            <tr>
              <td>CLABSI - NK huyết</td>
              <td>${dashboard?.clabsiRate != null ? Math.round(dashboard.clabsiRate) : haiCases.filter((c) => c.infectionType === 'CLABSI').length}</td>
              <td>${dashboard?.clabsiRate != null ? dashboard.clabsiRate.toFixed(2) + '/1000' : '-'}</td>
            </tr>
          </tbody>
        </table>

        <h3>2. Chi tiết ca nhiễm khuẩn</h3>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Bệnh nhân</th>
              <th>Khoa</th>
              <th>Loại NK</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${haiCases.map((c, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${c.patientName}</td>
                <td>${c.departmentName}</td>
                <td>${c.infectionType}</td>
                <td>${c.statusName}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 50px; text-align: right;">
          <p>Ngày ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Trưởng khoa KSNK</strong></p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
`;
