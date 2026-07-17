/**
 * Tab "140 Báo cáo bệnh viện" — report-runner với tham số động (thời gian /
 * khoa phòng / kho) cho 140 báo cáo trong 8 nhóm A-H.
 *
 * Port từ v1 pages/Reports.tsx (FullReportsContent) — business logic (catalog
 * 140 báo cáo, reportApiMapping, callReportApi, export/preview/data-view)
 * giữ VERBATIM; UI chuyển sang _v2kit (Btn/SearchBox/DataTable/ModalShell/Pager).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import TermIcon from '../../../components/layout/terminal/Icon';
import {
  Btn, SearchBox, DataTable, ModalShell, Pager, EmptyState, tk, tw,
  type ColumnDef,
} from '../../../pages-v2/_v2kit';
import * as file from '../../../services/file.service';
import { openPrintWindow } from '../../../utils/printWindow';
import { financeApi, pharmacyReportApi, statisticsApi, catalogApi } from '../../system/api/system';
import type {
  FinancialReportRequest,
  PharmacyReportRequest,
  StatisticsReportRequest,
} from '../../system/api/system';
import { hospitalReportApi, type HospitalReportResult } from '../api/hospitalReport';
import { getWarehouses } from '../../pharmacy/api/warehouse';

const { RangePicker } = DatePicker;

// ============================================================================
// Types (port từ v1 pages/reports/types.ts — icon đổi ReactNode → tên TermIcon)
// ============================================================================

type ApiCategory = 'finance' | 'pharmacy' | 'statistics';

interface ReportConfig {
  /** Unique report ID - used for API mapping and state */
  id: string;
  /** Report reference code (e.g. "9.1", "9.7") */
  code: string;
  /** Vietnamese report name */
  name: string;
  /** Short description */
  description: string;
}

interface ReportCategoryConfig {
  title: string;
  icon: string;
  color: string;
  reports: ReportConfig[];
}

// ============================================================================
// 140 Reports in 8 Categories (A-H) per BV — data VERBATIM từ v1
// ============================================================================

const reportCategories: Record<string, ReportCategoryConfig> = {
  // ----------------------------------------------------------------
  // A. Bao cao Kham benh (Clinical / OPD) - 16 reports
  // ----------------------------------------------------------------
  clinical: {
    title: 'A. Khám bệnh',
    icon: 'chart',
    color: '#1890ff',
    reports: [
      { id: 'r9_1',   code: '9.1',  name: 'Chi phí KCB thu phí nội ngoại trú', description: 'Tổng hợp chi phí KCB thu phí nội trú và ngoại trú' },
      { id: 'r9_7',   code: '9.7',  name: 'Hoạt động khám bệnh', description: 'Báo cáo hoạt động khám bệnh tổng hợp' },
      { id: 'r9_31',  code: '9.31', name: 'Thống kê số lượt BN khám trong ngày', description: 'Số lượt bệnh nhân khám theo ngày' },
      { id: 'r9_53',  code: '9.53', name: 'Sổ khám bệnh', description: 'Sổ theo dõi khám bệnh' },
      { id: 'r9_62',  code: '9.62', name: 'Thời gian thực hiện DV và thời gian chờ', description: 'Thống kê thời gian thực hiện dịch vụ và thời gian chờ đợi' },
      { id: 'r9_63_a', code: '9.63', name: 'Chi tiết doanh thu từng DV KCB', description: 'Chi tiết doanh thu từng dịch vụ khám chữa bệnh' },
      { id: 'r9_83',  code: '9.83', name: 'Thống kê hoạt động khám bệnh', description: 'Báo cáo thống kê hoạt động khám bệnh chi tiết' },
      { id: 'r9_89',  code: '9.89', name: 'Tổng hợp BN tiếp đón theo phòng', description: 'Tổng hợp bệnh nhân tiếp đón theo từng phòng khám' },
      { id: 'r9_90',  code: '9.90', name: 'Hoạt động khám bệnh', description: 'Báo cáo hoạt động khám bệnh (mẫu 2)' },
      { id: 'r9_103', code: '9.103', name: 'Lượt khám, lượt nhập viện', description: 'Thống kê lượt khám và lượt nhập viện' },
      { id: 'r9_105', code: '9.105', name: 'Thời gian khám bệnh trung bình', description: 'Thống kê thời gian khám bệnh trung bình theo phòng' },
      { id: 'r9_114', code: '9.114', name: 'Sổ nhật ký khám bệnh', description: 'Sổ nhật ký khám bệnh hàng ngày' },
      { id: 'r9_115', code: '9.115', name: 'Sổ khám bệnh', description: 'Sổ khám bệnh (mẫu 2)' },
      { id: 'r9_125', code: '9.125', name: 'Thống kê số liệu phòng khám', description: 'Thống kê số liệu chi tiết từng phòng khám' },
      { id: 'r9_126', code: '9.126', name: 'Sổ khám bệnh', description: 'Sổ khám bệnh (mẫu 3)' },
      { id: 'r9_130', code: '9.130', name: 'Chi tiết thời gian BN chờ đợi', description: 'Chi tiết thời gian bệnh nhân chờ đợi từng bước' },
    ],
  },

  // ----------------------------------------------------------------
  // B. Bao cao Noi tru (Inpatient) - 24 reports
  // ----------------------------------------------------------------
  inpatient: {
    title: 'B. Nội trú',
    icon: 'bed',
    color: '#722ed1',
    reports: [
      { id: 'r9_6',   code: '9.6',  name: 'Giao ban - Công suất giường', description: 'Báo cáo giao ban và công suất sử dụng giường bệnh' },
      { id: 'r9_13',  code: '9.13', name: 'Phân cấp chăm sóc', description: 'Thống kê phân cấp chăm sóc bệnh nhân nội trú' },
      { id: 'r9_16',  code: '9.16', name: 'DS BN chưa ra viện', description: 'Danh sách bệnh nhân chưa ra viện' },
      { id: 'r9_21',  code: '9.21', name: 'Sổ ra viện theo khoa (Diện ĐT)', description: 'Sổ ra viện theo khoa phân theo diện điều trị' },
      { id: 'r9_23',  code: '9.23', name: 'DS BN tại các buồng', description: 'Danh sách bệnh nhân tại các buồng bệnh' },
      { id: 'r9_34',  code: '9.34', name: 'Sổ vào viện, chuyển viện, ra viện', description: 'Sổ theo dõi vào viện, chuyển viện và ra viện' },
      { id: 'r9_44',  code: '9.44', name: 'DS BN đang điều trị', description: 'Danh sách bệnh nhân đang điều trị nội trú' },
      { id: 'r9_48',  code: '9.48', name: 'DS BN tại buồng bệnh', description: 'Danh sách bệnh nhân tại từng buồng bệnh' },
      { id: 'r9_65',  code: '9.65', name: 'DS BN đang điều trị tại khoa', description: 'Danh sách bệnh nhân đang điều trị tại từng khoa' },
      { id: 'r9_70',  code: '9.70', name: 'Sổ ra viện theo khoa', description: 'Sổ ra viện theo từng khoa điều trị' },
      { id: 'r9_72',  code: '9.72', name: 'Hoạt động điều trị nội trú', description: 'Báo cáo hoạt động điều trị nội trú tổng hợp' },
      { id: 'r9_77',  code: '9.77', name: 'Chi tiết BN vào ĐT tại các khoa', description: 'Chi tiết bệnh nhân vào điều trị tại các khoa' },
      { id: 'r9_86',  code: '9.86', name: 'Sổ ra viện', description: 'Sổ ra viện tổng hợp toàn viện' },
      { id: 'r9_91',  code: '9.91', name: 'Sổ vào viện', description: 'Sổ vào viện tổng hợp toàn viện' },
      { id: 'r9_96',  code: '9.96', name: 'Hoạt động điều trị mẫu 03 QĐ 2360', description: 'Báo cáo hoạt động điều trị theo mẫu 03 QĐ 2360/QĐ-BYT' },
      { id: 'r9_102', code: '9.102', name: 'Hoạt động điều trị', description: 'Báo cáo hoạt động điều trị tổng hợp' },
      { id: 'r9_107', code: '9.107', name: 'DS BN chuyển đi khoa khác', description: 'Danh sách bệnh nhân chuyển đi khoa khác' },
      { id: 'r9_108', code: '9.108', name: 'DS BN hiện diện tại khoa', description: 'Danh sách bệnh nhân hiện diện tại khoa' },
      { id: 'r9_109', code: '9.109', name: 'Sổ vào viện theo khoa', description: 'Sổ vào viện theo từng khoa tiếp nhận' },
      { id: 'r9_118', code: '9.118', name: 'DS BN chưa kết thúc ĐT', description: 'Danh sách bệnh nhân chưa kết thúc điều trị' },
      { id: 'r9_122', code: '9.122', name: 'Hoạt động điều trị', description: 'Báo cáo hoạt động điều trị (mẫu 2)' },
      { id: 'r9_127', code: '9.127', name: 'Thống kê DV giường các khoa', description: 'Thống kê dịch vụ giường bệnh các khoa' },
      { id: 'r9_128', code: '9.128', name: 'Tổng hợp SL kết thúc ĐT các khoa', description: 'Tổng hợp số lượng kết thúc điều trị các khoa' },
      { id: 'r9_129', code: '9.129', name: 'Số vào viện theo khoa', description: 'Thống kê số vào viện theo từng khoa' },
    ],
  },

  // ----------------------------------------------------------------
  // C. Bao cao Tai chinh (Finance) - 25 reports
  // ----------------------------------------------------------------
  finance: {
    title: 'C. Tài chính',
    icon: 'dollar',
    color: '#faad14',
    reports: [
      { id: 'r9_2',   code: '9.2',  name: 'Tổng hợp thu chi theo thu ngân', description: 'Tổng hợp thu chi theo từng thu ngân viên' },
      { id: 'r9_14',  code: '9.14', name: 'Sổ thanh toán VP (chi tiết từng DV)', description: 'Sổ thanh toán viện phí chi tiết từng dịch vụ' },
      { id: 'r9_24',  code: '9.24', name: 'Doanh thu khoa chi tiết theo DV', description: 'Doanh thu khoa phòng chi tiết theo dịch vụ' },
      { id: 'r9_37',  code: '9.37', name: 'Chi tiết sử dụng sổ thu chi', description: 'Chi tiết sử dụng sổ thu chi theo phiếu' },
      { id: 'r9_42',  code: '9.42', name: 'Tổng hợp viện phí', description: 'Tổng hợp viện phí toàn viện' },
      { id: 'r9_46',  code: '9.46', name: 'Doanh thu theo loại DV', description: 'Doanh thu theo từng loại dịch vụ' },
      { id: 'r9_50',  code: '9.50', name: 'DS BN nguồn khác chi trả', description: 'Danh sách bệnh nhân có nguồn khác chi trả' },
      { id: 'r9_57',  code: '9.57', name: 'Tổng hợp doanh thu theo khoa chỉ định', description: 'Tổng hợp doanh thu theo khoa chỉ định dịch vụ' },
      { id: 'r9_63_c', code: '9.63', name: 'Chi tiết doanh thu DV KCB', description: 'Chi tiết doanh thu dịch vụ KCB (mẫu tài chính)' },
      { id: 'r9_68',  code: '9.68', name: 'Tổng hợp giao dịch bị hủy', description: 'Tổng hợp các giao dịch thanh toán bị hủy' },
      { id: 'r9_71',  code: '9.71', name: 'Doanh thu khoa phòng', description: 'Doanh thu theo khoa phòng tổng hợp' },
      { id: 'r9_78',  code: '9.78', name: 'DS BN đã duyệt khóa VP thừa/thiếu', description: 'Danh sách BN đã duyệt khóa viện phí có thừa hoặc thiếu' },
      { id: 'r9_85',  code: '9.85', name: 'Chi tiết doanh thu BN theo khoa', description: 'Chi tiết doanh thu bệnh nhân theo từng khoa' },
      { id: 'r9_92',  code: '9.92', name: 'DS BN kết thúc ĐT chưa duyệt khóa TC', description: 'DS BN kết thúc điều trị chưa duyệt khóa tài chính' },
      { id: 'r9_98',  code: '9.98', name: 'Chi tiết doanh thu toàn viện', description: 'Chi tiết doanh thu toàn viện theo dịch vụ' },
      { id: 'r9_100', code: '9.100', name: 'Bồi dưỡng PTTT tự động', description: 'Tính bồi dưỡng phẫu thuật thủ thuật tự động' },
      { id: 'r9_111', code: '9.111', name: 'Hạch toán lỗ lãi PTTT', description: 'Hạch toán lỗ lãi phẫu thuật thủ thuật' },
      { id: 'r9_112', code: '9.112', name: 'Tổng hợp DT đối tượng ngoại trú', description: 'Tổng hợp doanh thu đối tượng ngoại trú' },
      { id: 'r9_116', code: '9.116', name: 'Doanh thu khoa chi tiết', description: 'Doanh thu khoa phòng chi tiết theo dịch vụ' },
      { id: 'r9_117', code: '9.117', name: 'Chi tiết giao dịch thanh toán bị hủy', description: 'Chi tiết từng giao dịch thanh toán bị hủy' },
      { id: 'r9_123', code: '9.123', name: 'Tổng hợp sử dụng quỹ', description: 'Tổng hợp tình hình sử dụng quỹ' },
      { id: 'r9_132', code: '9.132', name: 'Thu tiền chi tiết', description: 'Chi tiết thu tiền theo phiếu thu' },
      { id: 'r9_135', code: '9.135', name: 'Thu chi theo khoa chỉ định', description: 'Thu chi theo khoa chỉ định dịch vụ' },
      { id: 'r9_136', code: '9.136', name: 'Doanh thu theo dịch vụ', description: 'Doanh thu theo từng dịch vụ cụ thể' },
      { id: 'r9_138', code: '9.138', name: 'Thanh toán VP BN ra viện', description: 'Thanh toán viện phí bệnh nhân ra viện' },
    ],
  },

  // ----------------------------------------------------------------
  // D. Bao cao Duoc/Kho (Pharmacy / Warehouse) - 24 reports
  // ----------------------------------------------------------------
  pharmacy: {
    title: 'D. Dược / Kho',
    icon: 'pill',
    color: '#52c41a',
    reports: [
      { id: 'r9_4',   code: '9.4',  name: 'Chi tiết NXT theo kho', description: 'Chi tiết nhập xuất tồn theo từng kho' },
      { id: 'r9_8',   code: '9.8',  name: 'Lợi nhuận nhà thuốc', description: 'Báo cáo lợi nhuận nhà thuốc bệnh viện' },
      { id: 'r9_9',   code: '9.9',  name: 'NXT tủ trực', description: 'Nhập xuất tồn tủ trực các khoa' },
      { id: 'r9_15',  code: '9.15', name: 'Chi tiết xuất cho khoa theo kho', description: 'Chi tiết xuất thuốc/VT cho khoa theo từng kho' },
      { id: 'r9_28',  code: '9.28', name: 'NXT kho', description: 'Nhập xuất tồn kho tổng hợp' },
      { id: 'r9_45',  code: '9.45', name: 'Bảng kê cấp phát thuốc VT HC khoa', description: 'Bảng kê cấp phát thuốc, vật tư, hóa chất theo khoa' },
      { id: 'r9_47',  code: '9.47', name: 'Chi tiết xuất bán, doanh thu nhà thuốc', description: 'Chi tiết xuất bán và doanh thu nhà thuốc' },
      { id: 'r9_54',  code: '9.54', name: 'Nhập thuốc từ gói thầu', description: 'Nhập thuốc từ gói thầu theo hợp đồng' },
      { id: 'r9_67',  code: '9.67', name: 'So sánh thuốc thầu và tồn kho', description: 'So sánh thuốc trúng thầu với tồn kho thực tế' },
      { id: 'r9_69',  code: '9.69', name: 'Xuất thuốc Khoa Phòng', description: 'Xuất thuốc theo khoa phòng' },
      { id: 'r9_76',  code: '9.76', name: 'Thuốc kê chi tiết theo BS', description: 'Thuốc kê chi tiết theo bác sĩ kê đơn' },
      { id: 'r9_79',  code: '9.79', name: 'DS thuốc VT xuất hao phí khoa phòng', description: 'Danh sách thuốc, VT xuất hao phí theo khoa phòng' },
      { id: 'r9_80',  code: '9.80', name: 'NXT theo các kho', description: 'Nhập xuất tồn theo tất cả các kho' },
      { id: 'r9_84',  code: '9.84', name: 'Thẻ kho thuốc chi tiết', description: 'Thẻ kho thuốc chi tiết theo từng mặt hàng' },
      { id: 'r9_87',  code: '9.87', name: 'Xuất thuốc theo đối tượng', description: 'Xuất thuốc theo đối tượng bệnh nhân' },
      { id: 'r9_93',  code: '9.93', name: 'NXT chi tiết', description: 'Nhập xuất tồn chi tiết từng lô/hạn' },
      { id: 'r9_99',  code: '9.99', name: 'Bảng kê hóa đơn nhập', description: 'Bảng kê hóa đơn nhập kho theo nhà cung cấp' },
      { id: 'r9_101', code: '9.101', name: 'Chi tiết xuất kho theo khoa phòng', description: 'Chi tiết xuất kho thuốc/VT theo khoa phòng' },
      { id: 'r9_106', code: '9.106', name: 'SL thuốc/VT xuất cho khoa', description: 'Số lượng thuốc, vật tư xuất cho từng khoa' },
      { id: 'r9_119', code: '9.119', name: 'Xuất thuốc khoa phòng', description: 'Xuất thuốc theo khoa phòng (mẫu 2)' },
      { id: 'r9_120', code: '9.120', name: 'Nhập từ NCC nhóm theo NCC', description: 'Nhập từ nhà cung cấp nhóm theo NCC' },
      { id: 'r9_137', code: '9.137', name: 'Tổng hợp xuất đơn thuốc theo loại', description: 'Tổng hợp xuất đơn thuốc theo loại thuốc' },
      { id: 'r9_139', code: '9.139', name: 'Chi tiết xuất bán', description: 'Chi tiết xuất bán nhà thuốc' },
      { id: 'r9_140', code: '9.140', name: 'Tổng hợp xuất đơn thuốc theo BN', description: 'Tổng hợp xuất đơn thuốc theo bệnh nhân' },
    ],
  },

  // ----------------------------------------------------------------
  // E. Bao cao CLS (Lab / Imaging) - 19 reports
  // ----------------------------------------------------------------
  paraclinical: {
    title: 'E. Cận lâm sàng',
    icon: 'flask',
    color: '#eb2f96',
    reports: [
      { id: 'r9_3',   code: '9.3',  name: 'Giao ban khoa CLS', description: 'Báo cáo giao ban khoa cận lâm sàng' },
      { id: 'r9_5',   code: '9.5',  name: 'Tổng hợp hoạt động CLS', description: 'Tổng hợp hoạt động cận lâm sàng toàn viện' },
      { id: 'r9_19',  code: '9.19', name: 'Sổ XN vi sinh', description: 'Sổ xét nghiệm vi sinh theo mẫu' },
      { id: 'r9_20',  code: '9.20', name: 'Sổ XN', description: 'Sổ xét nghiệm tổng hợp' },
      { id: 'r9_22',  code: '9.22', name: 'Sổ siêu âm', description: 'Sổ siêu âm theo phòng' },
      { id: 'r9_25',  code: '9.25', name: 'Sổ nội soi', description: 'Sổ nội soi theo loại thủ thuật' },
      { id: 'r9_30',  code: '9.30', name: 'Sổ XN có chỉ số', description: 'Sổ xét nghiệm có chỉ số kết quả' },
      { id: 'r9_38',  code: '9.38', name: 'Sổ CLS', description: 'Sổ cận lâm sàng tổng hợp' },
      { id: 'r9_39',  code: '9.39', name: 'Sổ CĐHA', description: 'Sổ chẩn đoán hình ảnh' },
      { id: 'r9_51',  code: '9.51', name: 'Sổ XN', description: 'Sổ xét nghiệm (mẫu 2)' },
      { id: 'r9_55',  code: '9.55', name: 'Sổ TDCN', description: 'Sổ thăm dò chức năng' },
      { id: 'r9_64',  code: '9.64', name: 'Tổng hợp khoa CLS', description: 'Tổng hợp hoạt động theo khoa CLS' },
      { id: 'r9_94',  code: '9.94', name: 'Thống kê SL Phim CĐHA', description: 'Thống kê số lượng phim CĐHA theo loại' },
      { id: 'r9_95',  code: '9.95', name: 'Thống kê doanh thu CĐHA', description: 'Thống kê doanh thu chẩn đoán hình ảnh' },
      { id: 'r9_97',  code: '9.97', name: 'Sổ siêu âm theo phòng', description: 'Sổ siêu âm chi tiết theo phòng thực hiện' },
      { id: 'r9_110', code: '9.110', name: 'BS thực hiện CLS theo máy', description: 'Bác sĩ thực hiện CLS theo máy/thiết bị' },
      { id: 'r9_113', code: '9.113', name: 'Thống kê CLS chỉ định, thực làm', description: 'Thống kê CLS chỉ định so với thực hiện' },
      { id: 'r9_121', code: '9.121', name: 'Chỉ định XN vi sinh', description: 'Chỉ định xét nghiệm vi sinh chi tiết' },
      { id: 'r9_134', code: '9.134', name: 'Sổ theo dõi CLS', description: 'Sổ theo dõi cận lâm sàng tổng hợp' },
    ],
  },

  // ----------------------------------------------------------------
  // F. Bao cao PTTT (Surgery / Procedures) - 11 reports
  // ----------------------------------------------------------------
  surgery: {
    title: 'F. Phẫu thuật thủ thuật',
    icon: 'scalpel',
    color: '#fa541c',
    reports: [
      { id: 'r9_10',  code: '9.10', name: 'Sổ thủ thuật', description: 'Sổ theo dõi thủ thuật' },
      { id: 'r9_18',  code: '9.18', name: 'Sổ phẫu thuật', description: 'Sổ theo dõi phẫu thuật' },
      { id: 'r9_35',  code: '9.35', name: 'Sổ thủ thuật BAĐT', description: 'Sổ thủ thuật bệnh án điều trị nội trú' },
      { id: 'r9_40',  code: '9.40', name: 'Chi phí trên bàn mổ', description: 'Chi phí phát sinh trên bàn mổ' },
      { id: 'r9_56',  code: '9.56', name: 'Sổ thủ thuật các khoa', description: 'Sổ thủ thuật các khoa tổng hợp' },
      { id: 'r9_66',  code: '9.66', name: 'DS BN phẫu thuật', description: 'Danh sách bệnh nhân phẫu thuật' },
      { id: 'r9_73',  code: '9.73', name: 'PTTT', description: 'Báo cáo phẫu thuật thủ thuật tổng hợp' },
      { id: 'r9_75',  code: '9.75', name: 'Sổ thủ thuật', description: 'Sổ thủ thuật (mẫu 2)' },
      { id: 'r9_81',  code: '9.81', name: 'DS phẫu thuật', description: 'Danh sách phẫu thuật theo kỳ' },
      { id: 'r9_82',  code: '9.82', name: 'Hoạt động PTTT', description: 'Báo cáo hoạt động phẫu thuật thủ thuật' },
      { id: 'r9_88',  code: '9.88', name: 'Chi phí bồi dưỡng PTTT GPB', description: 'Chi phí bồi dưỡng PTTT giải phẫu bệnh' },
    ],
  },

  // ----------------------------------------------------------------
  // G. Bao cao BHYT (Insurance) - 20 reports
  // ----------------------------------------------------------------
  insurance: {
    title: 'G. Bảo hiểm y tế',
    icon: 'shield',
    color: '#13c2c2',
    reports: [
      { id: 'r9_11',  code: '9.11', name: 'C80a Mới', description: 'Mẫu C80a theo QĐ mới nhất' },
      { id: 'r9_17',  code: '9.17', name: 'DS BN hẹn khám', description: 'Danh sách bệnh nhân hẹn khám BHYT' },
      { id: 'r9_26',  code: '9.26', name: 'DS BN ra viện kết toán chưa duyệt', description: 'DS BN ra viện có kết toán BHYT chưa duyệt' },
      { id: 'r9_29',  code: '9.29', name: 'Mẫu 79 QĐ 3360', description: 'Biểu mẫu 79 theo QĐ 3360' },
      { id: 'r9_32',  code: '9.32', name: 'Thống kê DVKT BHYT mẫu 21', description: 'Thống kê dịch vụ kỹ thuật BHYT theo mẫu 21' },
      { id: 'r9_33',  code: '9.33', name: 'Thống kê VTYT BHYT mẫu 19', description: 'Thống kê vật tư y tế BHYT theo mẫu 19' },
      { id: 'r9_36',  code: '9.36', name: 'Thống kê BN chuyển viện', description: 'Thống kê bệnh nhân chuyển viện' },
      { id: 'r9_41',  code: '9.41', name: 'Sổ máu ngoại viện', description: 'Sổ theo dõi sử dụng máu ngoại viện' },
      { id: 'r9_43',  code: '9.43', name: 'C79a Mới', description: 'Mẫu C79a theo QĐ mới nhất' },
      { id: 'r9_49',  code: '9.49', name: 'Mẫu 80 QĐ 3360', description: 'Biểu mẫu 80 theo QĐ 3360' },
      { id: 'r9_52',  code: '9.52', name: 'DS BN chuyển tuyến đến', description: 'Danh sách BN chuyển tuyến đến bệnh viện' },
      { id: 'r9_58',  code: '9.58', name: 'Giảm định dữ liệu nội bộ', description: 'Giảm định dữ liệu BHYT nội bộ' },
      { id: 'r9_59',  code: '9.59', name: 'Tình hình bệnh tật tử vong ICD10', description: 'Tình hình bệnh tật và tử vong theo ICD-10' },
      { id: 'r9_60',  code: '9.60', name: 'Thuốc BHYT mẫu 20 QĐ 3360', description: 'Thuốc BHYT theo mẫu 20 QĐ 3360' },
      { id: 'r9_61',  code: '9.61', name: 'DS BN BHYT đề nghị thanh toán', description: 'DS BN BHYT đề nghị thanh toán với cơ quan BHXH' },
      { id: 'r9_74',  code: '9.74', name: 'Suất ăn dinh dưỡng', description: 'Thống kê suất ăn dinh dưỡng bệnh nhân' },
      { id: 'r9_104', code: '9.104', name: 'BHYT chi tiết', description: 'Báo cáo BHYT chi tiết theo bệnh nhân' },
      { id: 'r9_124', code: '9.124', name: 'BN quốc tịch nước ngoài', description: 'Thống kê bệnh nhân quốc tịch nước ngoài' },
      { id: 'r9_131', code: '9.131', name: 'Sổ lưu trữ HSBA', description: 'Sổ lưu trữ hồ sơ bệnh án' },
      { id: 'r9_133', code: '9.133', name: 'Thống kê ICD CV 2360', description: 'Thống kê ICD theo CV 2360' },
    ],
  },

  // ----------------------------------------------------------------
  // H. Nhan su / Chuyen tuyen (HR / Referral) - 2 reports
  // ----------------------------------------------------------------
  hr_referral: {
    title: 'H. Nhân sự / Chuyển tuyến',
    icon: 'users',
    color: '#597ef7',
    reports: [
      { id: 'r9_12',  code: '9.12', name: 'Tổng hợp thông tin BN chuyển tuyến đi', description: 'Tổng hợp thông tin bệnh nhân chuyển tuyến đi' },
      { id: 'r9_27',  code: '9.27', name: 'Sử dụng máy thận nhân tạo', description: 'Báo cáo sử dụng máy thận nhân tạo' },
    ],
  },
};

// ============================================================================
// API Mapping — VERBATIM từ v1 pages/reports/constants.ts
// ============================================================================

const reportApiMapping: Record<string, { apiCategory: ApiCategory; reportType: string }> = {
  // ==================== A. Kham benh (Clinical / OPD) ====================
  r9_1:   { apiCategory: 'finance',    reportType: 'OpdIpdCostByFee' },
  r9_7:   { apiCategory: 'statistics', reportType: 'ExaminationActivity' },
  r9_31:  { apiCategory: 'statistics', reportType: 'DailyPatientCount' },
  r9_53:  { apiCategory: 'statistics', reportType: 'ExaminationRegister' },
  r9_62:  { apiCategory: 'statistics', reportType: 'ServiceTimeAndWait' },
  r9_63_a: { apiCategory: 'finance',   reportType: 'ServiceRevenueDetail' },
  r9_83:  { apiCategory: 'statistics', reportType: 'ExaminationActivitySummary' },
  r9_89:  { apiCategory: 'statistics', reportType: 'ReceptionByRoom' },
  r9_90:  { apiCategory: 'statistics', reportType: 'ExaminationActivity2' },
  r9_103: { apiCategory: 'statistics', reportType: 'VisitAndAdmissionCount' },
  r9_105: { apiCategory: 'statistics', reportType: 'AvgExaminationTime' },
  r9_114: { apiCategory: 'statistics', reportType: 'ExaminationDiary' },
  r9_115: { apiCategory: 'statistics', reportType: 'ExaminationRegister2' },
  r9_125: { apiCategory: 'statistics', reportType: 'ClinicRoomStatistics' },
  r9_126: { apiCategory: 'statistics', reportType: 'ExaminationRegister3' },
  r9_130: { apiCategory: 'statistics', reportType: 'PatientWaitTimeDetail' },

  // ==================== B. Noi tru (Inpatient) ====================
  r9_6:   { apiCategory: 'statistics', reportType: 'DailyBriefingBedCapacity' },
  r9_13:  { apiCategory: 'statistics', reportType: 'CareLevelClassification' },
  r9_16:  { apiCategory: 'statistics', reportType: 'UndischargedPatients' },
  r9_21:  { apiCategory: 'statistics', reportType: 'DischargeByDeptTreatType' },
  r9_23:  { apiCategory: 'statistics', reportType: 'PatientsByRoom' },
  r9_34:  { apiCategory: 'statistics', reportType: 'AdmitTransferDischarge' },
  r9_44:  { apiCategory: 'statistics', reportType: 'ActiveInpatients' },
  r9_48:  { apiCategory: 'statistics', reportType: 'PatientsByWard' },
  r9_65:  { apiCategory: 'statistics', reportType: 'ActivePatientsByDept' },
  r9_70:  { apiCategory: 'statistics', reportType: 'DischargeByDept' },
  r9_72:  { apiCategory: 'statistics', reportType: 'InpatientTreatmentActivity' },
  r9_77:  { apiCategory: 'statistics', reportType: 'AdmissionDetailByDept' },
  r9_86:  { apiCategory: 'statistics', reportType: 'DischargeRegister' },
  r9_91:  { apiCategory: 'statistics', reportType: 'AdmissionRegister' },
  r9_96:  { apiCategory: 'statistics', reportType: 'TreatmentActivity2360' },
  r9_102: { apiCategory: 'statistics', reportType: 'TreatmentActivity' },
  r9_107: { apiCategory: 'statistics', reportType: 'TransferOutPatients' },
  r9_108: { apiCategory: 'statistics', reportType: 'PresentPatientsByDept' },
  r9_109: { apiCategory: 'statistics', reportType: 'AdmissionByDept' },
  r9_118: { apiCategory: 'statistics', reportType: 'UnfinishedTreatment' },
  r9_122: { apiCategory: 'statistics', reportType: 'TreatmentActivity2' },
  r9_127: { apiCategory: 'statistics', reportType: 'BedServiceByDept' },
  r9_128: { apiCategory: 'statistics', reportType: 'TreatmentCompletionByDept' },
  r9_129: { apiCategory: 'statistics', reportType: 'AdmissionByDept2' },

  // ==================== C. Tai chinh (Finance) ====================
  r9_2:   { apiCategory: 'finance', reportType: 'CashierSummary' },
  r9_14:  { apiCategory: 'finance', reportType: 'HospitalFeeServiceDetail' },
  r9_24:  { apiCategory: 'finance', reportType: 'DeptRevenueServiceDetail' },
  r9_37:  { apiCategory: 'finance', reportType: 'CashBookUsageDetail' },
  r9_42:  { apiCategory: 'finance', reportType: 'HospitalFeeSummary' },
  r9_46:  { apiCategory: 'finance', reportType: 'RevenueByServiceType' },
  r9_50:  { apiCategory: 'finance', reportType: 'OtherPayerPatients' },
  r9_57:  { apiCategory: 'finance', reportType: 'RevenueByOrderingDept' },
  r9_63_c: { apiCategory: 'finance', reportType: 'ServiceRevenueDetailKCB' },
  r9_68:  { apiCategory: 'finance', reportType: 'CancelledTransactionsSummary' },
  r9_71:  { apiCategory: 'finance', reportType: 'DeptRoomRevenue' },
  r9_78:  { apiCategory: 'finance', reportType: 'ApprovedExcessDeficit' },
  r9_85:  { apiCategory: 'finance', reportType: 'PatientRevenueByDept' },
  r9_92:  { apiCategory: 'finance', reportType: 'UnapprovedFinanceClose' },
  r9_98:  { apiCategory: 'finance', reportType: 'HospitalRevenueDetail' },
  r9_100: { apiCategory: 'finance', reportType: 'AutoSurgeryBonus' },
  r9_111: { apiCategory: 'finance', reportType: 'SurgeryProfitLoss' },
  r9_112: { apiCategory: 'finance', reportType: 'OutpatientRevenueSummary' },
  r9_116: { apiCategory: 'finance', reportType: 'DeptRevenueDetail' },
  r9_117: { apiCategory: 'finance', reportType: 'CancelledTransactionDetail' },
  r9_123: { apiCategory: 'finance', reportType: 'FundUsageSummary' },
  r9_132: { apiCategory: 'finance', reportType: 'CashCollectionDetail' },
  r9_135: { apiCategory: 'finance', reportType: 'RevenueByOrderingDept2' },
  r9_136: { apiCategory: 'finance', reportType: 'RevenueByService' },
  r9_138: { apiCategory: 'finance', reportType: 'DischargePayment' },

  // ==================== D. Duoc / Kho (Pharmacy / Warehouse) ====================
  r9_4:   { apiCategory: 'pharmacy', reportType: 'StockMovementByWarehouse' },
  r9_8:   { apiCategory: 'pharmacy', reportType: 'PharmacyProfit' },
  r9_9:   { apiCategory: 'pharmacy', reportType: 'EmergencyCabinetNXT' },
  r9_15:  { apiCategory: 'pharmacy', reportType: 'IssueToDepByWarehouse' },
  r9_28:  { apiCategory: 'pharmacy', reportType: 'StockMovement' },
  r9_45:  { apiCategory: 'pharmacy', reportType: 'DeptDispensingSheet' },
  r9_47:  { apiCategory: 'pharmacy', reportType: 'RetailSaleRevenue' },
  r9_54:  { apiCategory: 'pharmacy', reportType: 'ProcurementImport' },
  r9_67:  { apiCategory: 'pharmacy', reportType: 'ProcurementVsStock' },
  r9_69:  { apiCategory: 'pharmacy', reportType: 'IssueToDept' },
  r9_76:  { apiCategory: 'pharmacy', reportType: 'PrescriptionByDoctor' },
  r9_79:  { apiCategory: 'pharmacy', reportType: 'DeptConsumableIssue' },
  r9_80:  { apiCategory: 'pharmacy', reportType: 'StockMovementAllWH' },
  r9_84:  { apiCategory: 'pharmacy', reportType: 'StockCardDetail' },
  r9_87:  { apiCategory: 'pharmacy', reportType: 'IssueByPatientType' },
  r9_93:  { apiCategory: 'pharmacy', reportType: 'StockMovementDetail' },
  r9_99:  { apiCategory: 'pharmacy', reportType: 'ImportInvoiceSheet' },
  r9_101: { apiCategory: 'pharmacy', reportType: 'IssueByDeptDetail' },
  r9_106: { apiCategory: 'pharmacy', reportType: 'IssuedQtyByDept' },
  r9_119: { apiCategory: 'pharmacy', reportType: 'IssueToDept2' },
  r9_120: { apiCategory: 'pharmacy', reportType: 'ImportBySupplier' },
  r9_137: { apiCategory: 'pharmacy', reportType: 'PrescriptionIssueByType' },
  r9_139: { apiCategory: 'pharmacy', reportType: 'RetailSaleDetail' },
  r9_140: { apiCategory: 'pharmacy', reportType: 'PrescriptionIssueByPatient' },

  // ==================== E. CLS (Lab / Imaging) ====================
  r9_3:   { apiCategory: 'statistics', reportType: 'ParaclinicalBriefing' },
  r9_5:   { apiCategory: 'statistics', reportType: 'ParaclinicalActivitySummary' },
  r9_19:  { apiCategory: 'statistics', reportType: 'MicrobiologyRegister' },
  r9_20:  { apiCategory: 'statistics', reportType: 'LabRegister' },
  r9_22:  { apiCategory: 'statistics', reportType: 'UltrasoundRegister' },
  r9_25:  { apiCategory: 'statistics', reportType: 'EndoscopyRegister' },
  r9_30:  { apiCategory: 'statistics', reportType: 'LabWithIndexRegister' },
  r9_38:  { apiCategory: 'statistics', reportType: 'ParaclinicalRegister' },
  r9_39:  { apiCategory: 'statistics', reportType: 'ImagingRegister' },
  r9_51:  { apiCategory: 'statistics', reportType: 'LabRegister2' },
  r9_55:  { apiCategory: 'statistics', reportType: 'FunctionalTestRegister' },
  r9_64:  { apiCategory: 'statistics', reportType: 'ParaclinicalDeptSummary' },
  r9_94:  { apiCategory: 'statistics', reportType: 'ImagingFilmStatistics' },
  r9_95:  { apiCategory: 'finance',    reportType: 'ImagingRevenue' },
  r9_97:  { apiCategory: 'statistics', reportType: 'UltrasoundByRoom' },
  r9_110: { apiCategory: 'statistics', reportType: 'DoctorByMachine' },
  r9_113: { apiCategory: 'statistics', reportType: 'OrderedVsPerformedCLS' },
  r9_121: { apiCategory: 'statistics', reportType: 'MicrobiologyOrder' },
  r9_134: { apiCategory: 'statistics', reportType: 'ParaclinicalTracking' },

  // ==================== F. PTTT (Surgery) ====================
  r9_10:  { apiCategory: 'statistics', reportType: 'ProcedureRegister' },
  r9_18:  { apiCategory: 'statistics', reportType: 'SurgeryRegister' },
  r9_35:  { apiCategory: 'statistics', reportType: 'InpatientProcedureRegister' },
  r9_40:  { apiCategory: 'finance',    reportType: 'ORCost' },
  r9_56:  { apiCategory: 'statistics', reportType: 'ProcedureByDept' },
  r9_66:  { apiCategory: 'statistics', reportType: 'SurgeryPatientList' },
  r9_73:  { apiCategory: 'statistics', reportType: 'SurgeryProcedure' },
  r9_75:  { apiCategory: 'statistics', reportType: 'ProcedureRegister2' },
  r9_81:  { apiCategory: 'statistics', reportType: 'SurgeryList' },
  r9_82:  { apiCategory: 'statistics', reportType: 'SurgeryProcedureActivity' },
  r9_88:  { apiCategory: 'finance',    reportType: 'SurgeryPathologyBonus' },

  // ==================== G. BHYT (Insurance) ====================
  r9_11:  { apiCategory: 'finance',    reportType: 'C80aNew' },
  r9_17:  { apiCategory: 'statistics', reportType: 'ScheduledPatients' },
  r9_26:  { apiCategory: 'finance',    reportType: 'UnapprovedDischargeSettlement' },
  r9_29:  { apiCategory: 'finance',    reportType: 'Form79QD3360' },
  r9_32:  { apiCategory: 'finance',    reportType: 'InsuranceServiceForm21' },
  r9_33:  { apiCategory: 'finance',    reportType: 'InsuranceSupplyForm19' },
  r9_36:  { apiCategory: 'statistics', reportType: 'ReferralPatients' },
  r9_41:  { apiCategory: 'statistics', reportType: 'ExternalBloodRegister' },
  r9_43:  { apiCategory: 'finance',    reportType: 'C79aNew' },
  r9_49:  { apiCategory: 'finance',    reportType: 'Form80QD3360' },
  r9_52:  { apiCategory: 'statistics', reportType: 'InboundReferralPatients' },
  r9_58:  { apiCategory: 'finance',    reportType: 'InternalDataAudit' },
  r9_59:  { apiCategory: 'statistics', reportType: 'DiseaseAndDeathICD10' },
  r9_60:  { apiCategory: 'finance',    reportType: 'InsuranceMedicineForm20' },
  r9_61:  { apiCategory: 'finance',    reportType: 'InsurancePaymentRequest' },
  r9_74:  { apiCategory: 'statistics', reportType: 'NutritionMealPortion' },
  r9_104: { apiCategory: 'finance',    reportType: 'InsuranceDetail' },
  r9_124: { apiCategory: 'statistics', reportType: 'ForeignNationalPatients' },
  r9_131: { apiCategory: 'statistics', reportType: 'MedicalRecordArchive' },
  r9_133: { apiCategory: 'statistics', reportType: 'ICDCV2360Statistics' },

  // ==================== H. Nhan su / Chuyen tuyen (HR / Referral) ====================
  r9_12:  { apiCategory: 'statistics', reportType: 'OutboundReferralSummary' },
  r9_27:  { apiCategory: 'statistics', reportType: 'DialysisMachineUsage' },
};

const isGuid = (s?: string) =>
  !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// ============================================================================
// Helper Functions — logic VERBATIM từ v1
// ============================================================================

/**
 * Call the correct export/print API based on report category and output format.
 * Returns a Blob from the server.
 */
const callReportApi = async (
  reportId: string,
  outputFormat: string,
  dateRange: [dayjs.Dayjs, dayjs.Dayjs],
  department: string,
  warehouseId?: string,
): Promise<Blob> => {
  const mapping = reportApiMapping[reportId];
  if (!mapping) {
    throw new Error(`Không tìm thấy cấu hình API cho báo cáo: ${reportId}`);
  }

  const fromDate = dateRange[0].format('YYYY-MM-DD');
  const toDate = dateRange[1].format('YYYY-MM-DD');
  const departmentId = isGuid(department) ? department : undefined;
  const resolvedWarehouseId = isGuid(warehouseId) ? warehouseId : undefined;

  const { apiCategory, reportType } = mapping;

  // Different export endpoints (finance/pharmacy/statistics) return different
  // wrapper shapes — some return AxiosResponse<Blob>, some return Blob directly.
  // Normalize bằng cách đọc .data?? (xem block dưới).
  let response: { data?: Blob | unknown } | Blob | undefined;

  switch (apiCategory) {
    case 'finance': {
      const request: FinancialReportRequest = {
        reportType,
        fromDate,
        toDate,
        departmentId: departmentId,
        outputFormat,
      };
      if (outputFormat === 'print') {
        response = await financeApi.printFinancialReport(request);
      } else {
        response = await financeApi.exportFinancialReport(request);
      }
      break;
    }
    case 'pharmacy': {
      const request: PharmacyReportRequest = {
        reportType,
        fromDate,
        toDate,
        departmentId: departmentId,
        warehouseId: resolvedWarehouseId,
        outputFormat,
      };
      if (outputFormat === 'print') {
        response = await pharmacyReportApi.printPharmacyReport(request);
      } else {
        response = await pharmacyReportApi.exportPharmacyReport(request);
      }
      break;
    }
    case 'statistics': {
      const request: StatisticsReportRequest = {
        reportType,
        fromDate,
        toDate,
        departmentId: departmentId,
        outputFormat,
      };
      if (outputFormat === 'print') {
        response = await statisticsApi.printStatisticsReport(request);
      } else {
        response = await statisticsApi.exportStatisticsReport(request);
      }
      break;
    }
  }

  // response may be AxiosResponse with .data as Blob, or already a Blob
  const blob =
    response instanceof Blob
      ? response
      : (response && typeof response === 'object' && 'data' in response
          ? (response as { data?: unknown }).data
          : undefined);
  if (!(blob instanceof Blob)) {
    throw new Error('Server không trả về dữ liệu báo cáo hợp lệ.');
  }
  return blob;
};

/**
 * Find a report name by its ID across all categories.
 */
const findReportName = (reportId: string): string => {
  for (const cat of Object.values(reportCategories)) {
    const found = cat.reports.find((r) => r.id === reportId);
    if (found) return found.name;
  }
  return reportId;
};

const DATA_VIEW_PAGE_SIZE = 20;

// ============================================================================
// Component
// ============================================================================

const ReportsHospitalTab: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('clinical');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const [department, setDepartment] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [deptOptions, setDeptOptions] = useState<Array<{value: string; label: string}>>([
    { value: '', label: 'Tất cả khoa/phòng' },
  ]);
  const [warehouseOptions, setWarehouseOptions] = useState<Array<{value: string; label: string}>>([]);
  const [searchText, setSearchText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [dataViewVisible, setDataViewVisible] = useState(false);
  const [dataViewResult, setDataViewResult] = useState<HospitalReportResult | null>(null);
  const [dataViewPage, setDataViewPage] = useState(0);

  // Load departments and warehouses from catalog API on mount
  useEffect(() => {
    catalogApi.getDepartments(undefined, undefined, true).then((r) => {
      const items = Array.isArray(r.data) ? r.data : [];
      setDeptOptions([
        { value: '', label: 'Tất cả khoa/phòng' },
        ...items
          .filter((d) => d.id)
          .map((d) => ({ value: d.id as string, label: d.name })),
      ]);
    }).catch(() => {});
    getWarehouses().then((r) => {
      const items = Array.isArray(r.data) ? r.data : [];
      setWarehouseOptions(items.map((w) => ({ value: w.id, label: w.warehouseName })));
    }).catch(() => {});
  }, []);

  // Flatten all reports for search
  const allReports = useMemo(() => {
    return Object.entries(reportCategories).flatMap(([catKey, cat]) =>
      cat.reports.map((r) => ({ ...r, categoryKey: catKey, categoryTitle: cat.title, categoryColor: cat.color })),
    );
  }, []);

  // Total report count
  const totalReportCount = allReports.length;

  // Handle export to Excel, PDF, or Print — logic VERBATIM từ v1
  const handleExport = useCallback(async (format: 'excel' | 'pdf' | 'print') => {
    if (!selectedReport) {
      tw('Vui lòng chọn báo cáo');
      return;
    }

    const formatName = format === 'excel' ? 'Excel' : format === 'pdf' ? 'PDF' : 'may in';
    const reportName = findReportName(selectedReport);

    setExporting(true);
    try {
      const outputFormat = format === 'print' ? 'html' : format;
      const blob = await callReportApi(selectedReport, outputFormat, dateRange, department, warehouseId || undefined);

      if (format === 'print') {
        const htmlContent = await blob.text();
        openPrintWindow(htmlContent, {
          features: 'width=900,height=700',
          focus: true,
          print: { delayMs: 500 },
          onBlocked: () => tw('Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép pop-up để in báo cáo.'),
        });
      } else {
        const extension = format === 'excel' ? 'xlsx' : 'pdf';
        const filename = `${reportName}_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.${extension}`;
        file.downloadBlob(blob, filename);
        tk(`Đã xuất báo cáo ra ${formatName} thành công`);
      }
    } catch (error: unknown) {
      console.warn('Error exporting report:', error);
      tw(`Xuất báo cáo ra ${formatName} thất bại. Vui lòng thử lại.`);
    } finally {
      setExporting(false);
    }
  }, [selectedReport, dateRange, department, warehouseId]);

  // Handle preview: loads HTML and shows in a modal — logic VERBATIM từ v1
  const handlePreview = useCallback(async (reportId: string, reportName: string) => {
    setExporting(true);
    try {
      const blob = await callReportApi(reportId, 'html', dateRange, department, warehouseId || undefined);
      const htmlContent = await blob.text();
      setPreviewTitle(reportName);
      setPreviewContent(htmlContent);
      setPreviewVisible(true);
    } catch (error: unknown) {
      console.warn('Error previewing report:', error);
      tw('Xem trước báo cáo thất bại. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  }, [dateRange, department, warehouseId]);

  // Handle download: downloads as Excel by default — logic VERBATIM từ v1
  const handleDownload = useCallback(async (reportId: string, reportName: string) => {
    setExporting(true);
    try {
      const blob = await callReportApi(reportId, 'excel', dateRange, department, warehouseId || undefined);
      const filename = `${reportName}_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.xlsx`;
      file.downloadBlob(blob, filename);
      tk(`Đã tải xuống: ${reportName}`);
    } catch (error: unknown) {
      console.warn('Error downloading report:', error);
      tw('Tải xuống báo cáo thất bại. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  }, [dateRange, department, warehouseId]);

  // View data via unified HospitalReportController — logic VERBATIM từ v1
  const handleViewData = useCallback(async (reportId: string) => {
    const mapping = reportApiMapping[reportId];
    if (!mapping) return;
    setExporting(true);
    try {
      const fromDate = dateRange[0].format('YYYY-MM-DD');
      const toDate = dateRange[1].format('YYYY-MM-DD');
      const deptId = isGuid(department) ? department : undefined;
      const whId = warehouseId || undefined;
      const res = await hospitalReportApi.getReport(mapping.reportType, fromDate, toDate, deptId, whId);
      const data = res.data as unknown as HospitalReportResult;
      setDataViewResult(data);
      setDataViewPage(0);
      setDataViewVisible(true);
    } catch {
      console.warn('Error viewing report data');
      tw('Không thể tải dữ liệu báo cáo');
    } finally {
      setExporting(false);
    }
  }, [dateRange, department, warehouseId]);

  // Filter reports by search — logic VERBATIM từ v1
  const filteredReports = useMemo(() => {
    if (!searchText) return null;
    const lower = searchText.toLowerCase();
    return allReports.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        r.description.toLowerCase().includes(lower) ||
        r.code.toLowerCase().includes(lower) ||
        r.id.toLowerCase().includes(lower),
    );
  }, [searchText, allReports]);

  const currentCategory = reportCategories[activeCategory];

  // Determine if the current category is pharmacy (to show warehouse filter)
  const isPharmacyCategory = activeCategory === 'pharmacy';

  // Data-view modal: dynamic columns + local pagination
  type DataRow = Record<string, unknown> & { _key: string };
  const dataViewRows: DataRow[] = useMemo(
    () => (dataViewResult ? dataViewResult.data.map((row, i) => ({ ...row, _key: String(i) })) : []),
    [dataViewResult],
  );
  const dataViewColumns: ColumnDef<DataRow>[] = useMemo(
    () =>
      (dataViewResult ? dataViewResult.columns.filter((c) => c !== '_key') : []).map((col) => ({
        key: col,
        label: col,
        width: 150,
        render: (row: DataRow) => {
          const v = row[col];
          return typeof v === 'number' ? v.toLocaleString('vi-VN') : String(v ?? '');
        },
      })),
    [dataViewResult],
  );
  const dataViewTotalPages = Math.max(1, Math.ceil(dataViewRows.length / DATA_VIEW_PAGE_SIZE));
  const dataViewPageRows = dataViewRows.slice(
    dataViewPage * DATA_VIEW_PAGE_SIZE,
    (dataViewPage + 1) * DATA_VIEW_PAGE_SIZE,
  );

  const panelStyle: React.CSSProperties = {
    background: 'var(--d-0)',
    border: '1px solid var(--line)',
    borderRadius: 8,
    padding: 14,
  };

  const quickAccess: Array<{ label: string; icon: string; category: string; reportId: string }> = [
    { label: 'HĐ khám bệnh', icon: 'chart', category: 'clinical', reportId: 'r9_7' },
    { label: 'Giao ban giường', icon: 'bed', category: 'inpatient', reportId: 'r9_6' },
    { label: 'TH viện phí', icon: 'dollar', category: 'finance', reportId: 'r9_42' },
    { label: 'NXT kho', icon: 'pill', category: 'pharmacy', reportId: 'r9_28' },
    { label: 'TH hoạt động CLS', icon: 'flask', category: 'paraclinical', reportId: 'r9_5' },
    { label: 'C80a BHYT', icon: 'shield', category: 'insurance', reportId: 'r9_11' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, alignItems: 'start' }}>
      {/* Left panel - categories + search */}
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontWeight: 600, fontSize: 13 }}>
          <TermIcon name="folder" size={14} />
          <span>Danh mục ({totalReportCount} báo cáo)</span>
        </div>
        <div style={{ marginBottom: 10 }}>
          <SearchBox value={searchText} onChange={setSearchText} placeholder="Tìm báo cáo (tên, mã 9.xx)..." minWidth="100%" />
        </div>

        {filteredReports ? (
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 8 }}>
              Tìm thấy {filteredReports.length} báo cáo
            </div>
            {filteredReports.map((item) => (
              <div
                key={item.id}
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedReport === item.id ? 'var(--s-info-soft)' : 'transparent',
                  padding: '6px 8px',
                  borderRadius: 4,
                  borderBottom: '1px solid var(--line-soft)',
                }}
                onClick={() => {
                  setActiveCategory(item.categoryKey);
                  setSelectedReport(item.id);
                  setSearchText('');
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      lineHeight: '16px',
                      padding: '0 4px',
                      borderRadius: 3,
                      color: '#fff',
                      backgroundColor: item.categoryColor,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {item.code}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: selectedReport === item.id ? 600 : 400 }}>
                    {item.name}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--t-2)', paddingLeft: 4 }}>{item.categoryTitle}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {Object.entries(reportCategories).map(([key, cat]) => (
              <div
                key={key}
                style={{
                  cursor: 'pointer',
                  padding: '8px 10px',
                  borderRadius: 6,
                  backgroundColor: activeCategory === key ? 'var(--s-info-soft)' : 'transparent',
                  borderLeft: activeCategory === key ? `3px solid ${cat.color}` : '3px solid transparent',
                  marginBottom: 2,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onClick={() => {
                  setActiveCategory(key);
                  setSelectedReport(null);
                }}
              >
                <span style={{ color: cat.color, display: 'inline-flex' }}>
                  <TermIcon name={cat.icon} size={14} />
                </span>
                <span style={{ fontSize: 13, fontWeight: activeCategory === key ? 600 : 400, flex: 1 }}>
                  {cat.title}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 7px',
                    borderRadius: 9,
                    color: '#fff',
                    backgroundColor: activeCategory === key ? cat.color : 'var(--d-3)',
                  }}
                >
                  {cat.reports.length}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel - filters + report grid + quick access */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600, fontSize: 13 }}>
            <span style={{ color: currentCategory?.color, display: 'inline-flex' }}>
              <TermIcon name={currentCategory?.icon ?? 'chart'} size={14} />
            </span>
            <span>{currentCategory?.title}</span>
            <span
              style={{
                fontSize: 10,
                padding: '1px 7px',
                borderRadius: 9,
                color: '#fff',
                backgroundColor: currentCategory?.color,
              }}
            >
              {currentCategory?.reports.length}
            </span>
          </div>

          {/* Filters row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12, alignItems: 'end' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 4 }}>Thời gian</div>
              <RangePicker
                format="DD/MM/YYYY"
                value={dateRange}
                onChange={(dates) => {
                  if (dates) {
                    setDateRange([dates[0]!, dates[1]!]);
                  }
                }}
              />
            </div>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 4 }}>Khoa/Phòng</div>
              <Select
                style={{ width: '100%' }}
                value={department}
                onChange={(value) => setDepartment(value)}
                options={deptOptions}
              />
            </div>
            {isPharmacyCategory && (
              <div style={{ minWidth: 160 }}>
                <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 4 }}>Kho</div>
                <Select
                  style={{ width: '100%' }}
                  value={warehouseId || undefined}
                  onChange={(value) => setWarehouseId(value || '')}
                  allowClear
                  placeholder="Tất cả kho"
                  options={warehouseOptions}
                />
              </div>
            )}
            <div>
              <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 4 }}>Xuất báo cáo</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="ok" icon="download" loading={exporting} onClick={() => void handleExport('excel')} title="Xuất Excel">
                  Excel
                </Btn>
                <Btn variant="crit" icon="file" loading={exporting} onClick={() => void handleExport('pdf')} title="Xuất PDF">
                  PDF
                </Btn>
                <Btn icon="printer" loading={exporting} onClick={() => void handleExport('print')} title="In báo cáo">
                  In
                </Btn>
              </div>
            </div>
          </div>

          {/* Report list grid */}
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              {(currentCategory?.reports || []).map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: `1px solid ${selectedReport === item.id ? currentCategory?.color : 'var(--line)'}`,
                    backgroundColor: selectedReport === item.id ? 'var(--s-info-soft)' : 'var(--d-0)',
                    borderRadius: 6,
                    padding: 10,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedReport(item.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '0 5px',
                        borderRadius: 3,
                        color: '#fff',
                        backgroundColor: currentCategory?.color,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {item.code}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t-2)', marginTop: 4 }}>{item.description}</div>
                  {selectedReport === item.id && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <Btn
                        variant="primary"
                        size="sm"
                        icon="eye"
                        loading={exporting}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handlePreview(item.id, `[${item.code}] ${item.name}`);
                        }}
                      >
                        Xem trước
                      </Btn>
                      <Btn
                        size="sm"
                        icon="chart"
                        loading={exporting}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleViewData(item.id);
                        }}
                      >
                        Dữ liệu
                      </Btn>
                      <Btn
                        size="sm"
                        icon="download"
                        loading={exporting}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownload(item.id, item.name);
                        }}
                      >
                        Tải xuống
                      </Btn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick access to common reports */}
        <div style={panelStyle}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Báo cáo thường dùng</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {quickAccess.map((q) => (
              <Btn
                key={q.reportId}
                size="sm"
                icon={q.icon}
                onClick={() => {
                  setActiveCategory(q.category);
                  setSelectedReport(q.reportId);
                }}
              >
                {q.label}
              </Btn>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <ModalShell
        open={previewVisible}
        onClose={() => setPreviewVisible(false)}
        title={previewTitle}
        size="xl"
        footer={
          <>
            <Btn onClick={() => setPreviewVisible(false)}>Đóng</Btn>
            <Btn
              icon="printer"
              onClick={() => {
                const iframe = document.getElementById('report-preview-iframe') as HTMLIFrameElement;
                if (iframe?.contentWindow) {
                  iframe.contentWindow.focus();
                  iframe.contentWindow.print();
                }
              }}
            >
              In
            </Btn>
            <Btn
              variant="primary"
              icon="download"
              onClick={() => {
                if (selectedReport) {
                  void handleDownload(selectedReport, previewTitle);
                }
              }}
            >
              Tải xuống Excel
            </Btn>
          </>
        }
      >
        <iframe
          id="report-preview-iframe"
          srcDoc={previewContent}
          style={{ width: '100%', height: 600, border: 'none', background: '#fff' }}
          title={previewTitle}
        />
      </ModalShell>

      {/* Data View Modal - unified HospitalReportController */}
      <ModalShell
        open={dataViewVisible}
        onClose={() => setDataViewVisible(false)}
        title={dataViewResult ? `${dataViewResult.reportName} [${dataViewResult.reportCode}]` : 'Dữ liệu báo cáo'}
        size="xl"
        footer={<Btn onClick={() => setDataViewVisible(false)}>Đóng</Btn>}
      >
        {dataViewResult && (
          <div style={{ maxHeight: 500, overflow: 'auto' }}>
            {Object.keys(dataViewResult.summary).length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                {Object.entries(dataViewResult.summary).map(([key, val]) => (
                  <div key={key} style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{key}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {typeof val === 'number' ? val.toLocaleString('vi-VN') : String(val ?? '')}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <DataTable<DataRow>
              columns={dataViewColumns}
              data={dataViewPageRows}
              rowKey={(row) => row._key}
              empty={<EmptyState message="Không có dữ liệu" />}
            />
            <Pager
              page={dataViewPage}
              totalPages={dataViewTotalPages}
              setPage={(next) => setDataViewPage((p) => (typeof next === 'function' ? next(p) : next))}
              total={dataViewRows.length}
              perPage={DATA_VIEW_PAGE_SIZE}
            />
            <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 6 }}>
              Tạo lúc: {dayjs(dataViewResult.generatedAt).format('DD/MM/YYYY HH:mm:ss')} | {dataViewResult.data.length} dòng
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
};

export default ReportsHospitalTab;
