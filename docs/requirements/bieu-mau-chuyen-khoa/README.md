# Biểu mẫu bệnh án chuyên khoa (TT 32/2023/TT-BYT)

> **Mục đích:** Nguồn tham chiếu (source-of-truth) PDF biểu mẫu chuẩn Bộ Y Tế dùng để thiết kế EMR forms trong code.
> **Số lượng:** 32 file PDF chuyên khoa
> **Liên quan code:**
> - `frontend/src/components/EMRPrintTemplates.tsx` (17 form BS chính)
> - `frontend/src/components/EMRNursingPrintTemplates.tsx` (21 form điều dưỡng)
> - `frontend/src/components/SpecialtyEMRForms1.tsx` (15 form chuyên khoa nội)
> - `frontend/src/components/SpecialtyEMRForms2.tsx` (15 form chuyên khoa ngoại/mắt/PHCN)
> **Last updated:** 2026-05-16

## Cách dùng

Mỗi PDF là **mẫu chính thức** Bộ Y Tế đã ban hành theo TT 32/2023/TT-BYT. Khi
implement EMR print template trong code:

1. Mở PDF tương ứng để xem layout
2. Copy header (Bộ Y Tế + tên BV) + các field cần thiết
3. Implement React component trong `frontend/src/components/EMRPrintTemplates.tsx`
4. Wire vào EMR.tsx dropdown menu

## Danh mục

| # | File | Phân loại | Code reference |
|---|---|---|---|
| 1 | `1benh_an_noi_khoa_*.pdf` | Bệnh án Nội khoa | EMRPrintTemplates |
| 2 | `2benh_an_nhi_khoa_*.pdf` | Bệnh án Nhi khoa | EMRPrintTemplates |
| 3 | `3_giay_khamchua_benh_theo_yeu_cau_*.pdf` | Khám theo yêu cầu | SpecialtyEMRForms2 |
| 3 | `3benh_an_truyen_nhiem_*.pdf` | Bệnh án Truyền nhiễm | SpecialtyEMRForms1 |
| 4 | `4_benh_an_phu_khoa_*.pdf` | Bệnh án Phụ khoa | SpecialtyEMRForms1 |
| 5 | `5_benh_an_san_khoa_*.pdf` | Bệnh án Sản khoa | EMRPrintTemplates |
| 6 | `6_benh_an_so_sinh_*.pdf` | Bệnh án Sơ sinh | EMRPrintTemplates |
| 6 | `6_phieu_phau_thuat_thu_thuat_*.pdf` | Phiếu PTTT | EMRPrintTemplates (Surgery) |
| 7 | `7_benh_an_tam_than_*.pdf` | Bệnh án Tâm thần | SpecialtyEMRForms1 |
| 8 | `8_benh_an_da_lieu_*.pdf` | Bệnh án Da liễu | SpecialtyEMRForms1 |
| 9 | `9_benh_an_huyet_hoc_truyen_mau_*.pdf` | Bệnh án Huyết học | SpecialtyEMRForms1 |
| 10 | `10_benh_an_ngoai_khoa_*.pdf` | Bệnh án Ngoại khoa | SpecialtyEMRForms1 |
| 11 | `11_benh_an_bong_*.pdf` | Bệnh án Bỏng | SpecialtyEMRForms1 |
| 12 | `12_benh_an_ung_buou_*.pdf` | Bệnh án Ung bướu | SpecialtyEMRForms1 |
| 13 | `13_benh_an_rang_ham_mat_*.pdf` | Bệnh án Răng Hàm Mặt | SpecialtyEMRForms1 |
| 14 | `14_benh_an_tai_mui_hong_*.pdf` | Bệnh án Tai Mũi Họng | SpecialtyEMRForms1 |
| 15 | `15_benh_an_ngoai_tru_chung_*.pdf` | BA Ngoại trú chung | SpecialtyEMRForms1 |
| 16 | `16_benh_an_ngoai_tru_rang_ham_mat_*.pdf` | BA Ngoại trú RHM | SpecialtyEMRForms1 |
| 17 | `17_benh_an_danh_cho_tuyen_xa_phuong_*.pdf` | BA tuyến xã phường | SpecialtyEMRForms1 |
| 18 | `18_benh_an_noi_tru_yhct_*.pdf` | BA Nội trú YHCT | SpecialtyEMRForms1 |
| 19 | `19_benh_an_ngoai_tru_yhct_*.pdf` | BA Ngoại trú YHCT | SpecialtyEMRForms2 |
| 20 | `20_benh_an_noi_tru_nhi_yhct_*.pdf` | BA Nội trú Nhi YHCT | SpecialtyEMRForms2 |
| 21 | `21_benh_an_mat_chan_thuong_*.pdf` | BA Mắt chấn thương | SpecialtyEMRForms2 |
| 22 | `22_benh_an_mat_ban_phan_truoc_*.pdf` | BA Mắt bán phần trước | SpecialtyEMRForms2 |
| 23 | `23_benh_an_mat_day_mat_*.pdf` | BA Mắt đáy mắt | SpecialtyEMRForms2 |
| 24 | `24_benh_an_mat_glocom_*.pdf` | BA Mắt Glocom | SpecialtyEMRForms2 |
| 25 | `25_benh_an_mat_sup_mi_lac_*.pdf` | BA Mắt sụp mi/lác | SpecialtyEMRForms2 |
| 26 | `26_benh_an_mat_tre_em_*.pdf` | BA Mắt trẻ em | SpecialtyEMRForms2 |
| 27 | `27_benh_an_phuc_hoi_chuc_nang_*.pdf` | BA Phục hồi chức năng | SpecialtyEMRForms2 |
| 28 | `28_benh_an_phuc_hoi_chuc_nang_nhi_*.pdf` | BA PHCN Nhi | SpecialtyEMRForms2 |
| 29 | `29_benh_an_ngoai_tru_phuc_hoi_chuc_nang_*.pdf` | BA Ngoại trú PHCN | SpecialtyEMRForms2 |
| 36 | `36_phieu_theo_doi_dieu_tri_*.pdf` | Phiếu theo dõi điều trị | EMRPrintTemplates |
