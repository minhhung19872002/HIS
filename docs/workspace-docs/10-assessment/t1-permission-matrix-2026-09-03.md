# T1 #216 — Ma trận phân quyền & trạng thái tài khoản (chạy 2026-09-03)

> Task cha: **#216 [T1][TEST] Permission & account-state matrix**. Chi tiết hoá theo 20 task
> `TC-PERM-001..020` trong viewer evidence (`docs/architecture/evidence/data/30-cross.js`).
> Evidence ảnh: `docs/architecture/evidence/cross/TC-PERM-*.png` (18 ảnh, đã regen `manifest.js`).
> Dữ liệu + script tái chạy: `docs/architecture/evidence/cross/t1/` (xem §5).

## 1. Phạm vi & cách chạy

| Thành phần | Giá trị |
|---|---|
| Backend | HEAD `main` sau `84ad19e4` (đã vá collation), local `:5106`, DB `his-sqlserver` |
| Frontend | Vite dev `:3001`, `VITE_ACCESS_GATING` **không đặt** (= gating tắt, giống bản build prod hiện tại) |
| User theo vai trò (seed local) | `admin` (Quản trị hệ thống→Admin/Manager/Director) · `bsannn` (Bác sĩ→Doctor) · `ddgiang` (Điều dưỡng→Nurse) · `ktvkhanh` (KTV XN→LabTech) · `ktvlam` (KTV CĐHA→ImagingTech) · `dsoanh` (Dược sĩ→Pharmacist/PharmacyManager) · `lthung` (Tiếp đón→Receptionist) · `tnmai` (Thu ngân→Cashier/Accountant) |
| Tồn kho tĩnh | `authz_inventory.py` quét 208 file controller → **2922 action**: auth-only 1877 · role-guarded 940 · permission 20 · anonymous 69 · không attribute 16 (vẫn auth nhờ `FallbackPolicy`). 39 tên role được tham chiếu. |
| Lát cắt chạy sống | `t1_matrix.py`: mỗi controller ≤4 GET không tham số (ưu tiên endpoint có role/permission, loại `export/print/pdf/dev/seed/…`) = **394 GET** + ≤2 mutation có role/permission = **74 cổng mutation, CHỈ gọi với vai trò bị cấm** (authorize chạy trước model-binding nên 403 chứng minh cổng mà không thực thi) + 40 GET × {không token, token rác}. |

## 2. Kết quả ma trận backend (TC-PERM-017 + trục API của 001–006/010/012)

**3690 call · 0 bypass · 0 over-restrict · 0 lỗi 401 với token hợp lệ · 0 lỗi 500 · 0 timeout.**

| User | Vai trò | OK | Ghi chú |
|---|---|---|---|
| admin | Quản trị hệ thống | 394/394 | baseline: mọi probe được phép |
| bsannn | Bác sĩ | 444/447 | 3 ca `415` (xem dưới) |
| ddgiang | Điều dưỡng | 450/453 | 3 ca `415` |
| ktvkhanh | KTV XN | 464/467 | 3 ca `415` |
| ktvlam | KTV CĐHA | 465/468 | 3 ca `415` |
| dsoanh | Dược sĩ | 457/459 | 2 ca `415` |
| lthung | Tiếp đón | 462/465 | 3 ca `415` |
| tnmai | Thu ngân | 454/457 | 3 ca `415` |
| — | không token / token rác | 80/80 | tất cả `401` |

- **20 ca `415`** = 3 endpoint upload (`clinical-pharmacy/drug-interactions/import-csv`, `insurance/catalog/import-medicines`, `insurance/catalog/import-services`) gọi bằng body JSON. `415` do `ConsumesMatcherPolicy` của routing từ chối content-type **trước** middleware authorize — **gọi lại đúng multipart bằng token bác sĩ → 403 cả 3**. Không phải bypass.
- 44 mutation `[AllowAnonymous]` đã soi từng cái: `admin/populate/*` (17) có `[DevelopmentOnly]` → **prod trả 404 (đã gọi thử)**; `admin/seed-daily/patients` chốt `X-Seed-Key` → **prod 401 (đã gọi thử)**; `*/dev/*` có `[DevelopmentOnly]`; còn lại là luồng công khai theo thiết kế (portal login/register, kiosk, booking, payment IPN/callback, public-emr lookup, study-share access) — xác thực chữ ký IPN thuộc T15, ngoài phạm vi T1.

## 3. Kết quả UI (Playwright `frontend/e2e/t1-permission-matrix.spec.ts` — 10/10 pass)

| TC | Kịch bản | Kết quả | Evidence |
|---|---|---|---|
| 001–006 | Login từng vai trò → shell; gõ thẳng `/v2/admin`; gọi `GET /api/admin/users` bằng token vai trò | Shell render; trang admin hiện toast **"Bạn không có quyền truy cập chức năng này."**, bảng rỗng; API **403 (6/6)** | `TC-PERM-00N__s01__list`, `__s02__permission` |
| 010 | Admin | `/v2/admin` đầy đủ; API **200** | `TC-PERM-010__s01__list`, `__s02__list` |
| 012 | Khách: `/v2/dashboard` không phiên; API không token / token rác | redirect `/login`; **401 / 401** | `TC-PERM-012__s01__permission` |
| 013 | `IsActive=0` cho `ddgiang` → login; mở lại | Ở lại `/login`, thông báo *"Tên đăng nhập hoặc mật khẩu không đúng!"*; mở lại → vào được | `TC-PERM-013__s01__error`, `__s02__success` |
| 014 | Token hết hạn/sai chữ ký trong localStorage → vào `/v2/reception` | API **401**; FE **xoá token** và đưa về `/login` | `TC-PERM-014__s01__permission` |

## 4. Phát hiện (fix-task ghi ở đây + STATUS — KHÔNG tạo GitHub Issue theo quyết định user 2026-08-04)

| # | Mức | Phát hiện | Việc cần làm |
|---|---|---|---|
| F1 | Thiết kế / quyết định | **FE gating TẮT** (`VITE_ACCESS_GATING` không đặt) ⇒ mọi vai trò thấy đủ menu, gõ thẳng URL admin vẫn render shell; chỉ BE 403 chặn. TC-PERM-001..006 kỳ vọng *ẩn menu* ⇒ chưa đạt ở mức UX (BE đạt). | User quyết: bật `VITE_ACCESS_GATING=true` ở build prod (thêm `ARG` Dockerfile + repo variable như `VITE_ORTHANC_URL`). **Trước khi bật** phải rà catalog permission: user seed chỉ có 3–7 permission (ktvkhanh 3, ddgiang 5) ⇒ bật là màn hình trống. |
| F2 | Bảo mật cấu trúc (TC-017 "endpoint chỉ `[Authorize]` trần") | **875/1467 mutation (60%) chỉ cần đăng nhập**, không role/permission: RISComplete 93 · ExaminationComplete 80 · InpatientComplete 66 · ReceptionComplete 44 · MasterCatalog 38 · PublicHealth 22 · LISComplete 20 … (đầy đủ trong `t1/authz_inventory.json`, lọc `guard in (auth,none) && method != GET`). Ví dụ: KTV XN gọi được API ghi bệnh án/kê đơn nếu biết route. | Fix-task lớn: gắn `[RequirePermission]` theo catalog #367 cho từng controller, ưu tiên Examination/Inpatient/Reception/Pharmacy (patient-safety + tiền). Làm theo đợt, mỗi đợt chạy lại `t1_matrix.py` để chứng minh không over-restrict. |
| F3 | UX/an ninh (chấp nhận được) | Tài khoản bị khoá/vô hiệu nhận **cùng thông báo** với sai mật khẩu. TC-013 kỳ vọng thông báo riêng; nhưng gộp là chống dò tài khoản (anti-enumeration). | Giữ nguyên trừ khi user muốn phân biệt; nếu phân biệt thì chỉ hiện sau khi mật khẩu đúng. |
| F4 | Bảo mật nhỏ | Màn login in **gợi ý tài khoản mặc định `admin / Admin@123`** (`pages/Login.tsx`), có trong bundle prod. | Ẩn ở production (`import.meta.env.PROD`) hoặc bỏ hẳn. 1 dòng. |
| F5 | Dữ liệu (T12) | `IcdCodes.ChapterName` bị mojibake double-UTF-8 (`Bá»‡nh nhiá»…m trÃ¹ng…`) ở **cả local lẫn prod** ⇒ lỗi ở nguồn seed ICD. | Sửa script seed + UPDATE lại cột (41 dòng local; prod tương tự). |
| F6 | Thông tin | Vai trò không admin đọc được số chi nhánh/KPI phụ ở trang admin (các GET auth-only) — hệ quả của F2. | Đi cùng F2. |

## 5. Chưa chạy (còn lại của #216) — lý do + cách chạy tiếp

`TC-PERM-007` (BhxhInspector, `/inspector-portal`) · `008` (Quản lý khoa/DepartmentHead) · `009` (BGĐ/Director) · `011` (PortalPatient) · `015` (buộc đổi mật khẩu) · `016` (2FA/OTP + đếm sai mật khẩu — `FailedLoginCount`/`LockoutEndAt` đã có trong code) · `018` (đối soát audit) · `019` (thu hồi quyền có hiệu lực) · `020` (theme/i18n màn login).
**Lý do:** DB local không có user cho các vai trò đó và 2FA cần email. **Chạy tiếp:** seed user cho từng vai trò → thêm vào `USERS` của `t1_matrix.py` + `ROLES` của spec → chạy lại; scripts tái dùng nguyên.

Artefact tái chạy (`docs/architecture/evidence/cross/t1/`): `authz_inventory.py` (tồn kho tĩnh) · `authz_inventory.json` · `t1_matrix.py` (ma trận sống) · `t1_results.csv` (3690 dòng) · `t1_matrix.log`.

## 6. Thay đổi DB local để chạy test (không đụng prod)
- 6 user seed (`bsannn ddgiang ktvkhanh ktvlam dsoanh tnmai`) được đặt mật khẩu `123456` (copy hash của `lthung`), reset `FailedLoginCount/LockoutEndAt`.
- `ddgiang` bị `IsActive=0` tạm trong TC-013 và đã mở lại.
- Dòng ICD test `ZZ95O/ZZ96O/ZZ96N` (A/B #195) đã xoá; bảng về 41 dòng.
