# ADR-001 — AUTHZ-2: Refresh token, thu hồi phiên tức thời & nơi lưu token FE

- **Trạng thái:** Accepted (backend) · FE part deferred (xem §6)
- **Ngày:** 2026-07-11
- **Issue:** #368 [AUTHZ-2] · Epic #372 · Nghiên cứu gốc: `docs/workspace-docs/10-assessment/danh-gia-phan-quyen-rbac-redesign.md`
- **Bối cảnh guardrail:** security/auth — thay đổi có blast-radius toàn hệ (mọi request đi qua auth).

## 1. Vấn đề

Trước AUTHZ-2: `LoginResponseDto.RefreshToken = Guid.NewGuid().ToString()` **vứt đi** — không lưu DB,
không endpoint `/refresh`, không revoke. Access token **sống 480 phút (8h)** (`appsettings.json: Jwt:ExpireMinutes=480`;
`?? "60"` chỉ là fallback khi thiếu config). Hệ quả: **không đăng xuất server-side được**; khóa user / đổi mật khẩu /
đổi quyền chỉ hiệu lực khi token hết hạn (tối đa 8h). `UserSessions` tồn tại nhưng login **không ghi**.

## 2. Quyết định

### 2.1 Refresh token bền + rotation + reuse-detection
Bảng `RefreshTokens` (migration `144`): lưu **HASH SHA-256** (không lưu plaintext), `ExpiresAt` (14 ngày),
`RevokedAt`, `ReplacedByTokenHash`, `CreatedByIp`. Mỗi lần `/auth/refresh`: cấp token mới + revoke token cũ
(rotation). Dùng lại một token **đã revoke** = nghi bị đánh cắp → **revoke cả family** của user + xoay SecurityStamp
(`RefreshTokenService.RotateAsync`). Access token re-issue qua **`GenerateJwtToken` cũ** (giữ nguyên claim shape).

### 2.2 Thu hồi TỨC THỜI qua SecurityStamp — KHÔNG dùng Redis
Thêm cột `Users.SecurityStamp`; JWT mang claim `securityStamp`. `JwtBearerEvents.OnTokenValidated` so khớp
claim với stamp hiện tại của user → lệch = `context.Fail` (token bị thu hồi ngay, không đợi hết hạn).
Xoay stamp khi: **đổi mật khẩu**, **reuse-detection**. `OnTokenValidated` cũng chặn user `IsActive=false` (khóa tức thời).

> **Vì sao KHÔNG Redis:** hạ tầng HIS hiện **không có Redis** — không package `StackExchange.Redis`, không DI,
> Cloud Run prod **không provision Redis** (HealthCheckService coi Redis là optional/Skipped). Issue gốc giả định
> "cache Redis O(1)/request" nhưng hạ tầng đó không tồn tại và không provision được từ môi trường dev hiện tại.
>
> **Thay bằng:** DB là nguồn sự thật + **`IMemoryCache` TTL ngắn (mặc định 30s, config `Auth:SecurityStampCacheSeconds`)**
> đứng trước trong `OnTokenValidated`. **Staleness thu hồi ≤ TTL (30s)** thay vì 8h hiện tại — cải thiện ~960×,
> **0 hạ tầng mới**. `IMemoryCache` per-instance ⇒ trên Cloud Run nhiều instance, một stamp bị xoay ở instance A
> mất tối đa 30s để instance B thấy (do cache B hết hạn). Chấp nhận được cho ngưỡng an toàn này.
> **Nâng cấp lên Redis sau (AUTHZ-3+) không đổi contract** — chỉ thay lớp cache.
>
> **Fail-open khi DB lỗi:** `OnTokenValidated` bọc try/catch — DB trục trặc KHÔNG đánh sập toàn bộ auth
> (token đã hợp lệ chữ ký + chưa hết hạn), chỉ log cảnh báo. Đánh đổi: trong lúc DB lỗi, thu hồi tạm thời không hiệu lực.

### 2.3 UserSessions ghi thật khi login/logout
`RefreshTokenService.IssueAsync` mở `UserSession` (IP, UserAgent, Status=Active, SessionToken = hash refresh token);
logout/revoke đóng session (Status=LoggedOut, LogoutTime). Màn M17 Admin (SystemCompleteService) từ nay có dữ liệu thật.

### 2.4 Nơi lưu token FE → **giữ localStorage** (defer httpOnly cookie)
**Quyết định:** giai đoạn này **giữ access + refresh token ở `localStorage`** như hiện tại.
- **Đánh đổi (nhận diện rõ):** localStorage bị đọc được nếu có lỗ hổng **XSS** → token có thể bị đánh cắp.
  Giảm thiểu: reuse-detection (token bị cắp + dùng song song → revoke family) + (kế hoạch) rút access TTL xuống 15–30'.
- **Vì sao chưa chuyển httpOnly cookie:** FE (Vercel `his-psi.vercel.app`) ↔ BE (Cloud Run) là **cross-site** →
  cookie cần `SameSite=None; Secure` + CORS `AllowCredentials` + antiforgery (CSRF) — đụng FE nhiều, và
  đang có cửa `components-restructure` sửa `frontend/src/api/*`. → **Dời sang issue riêng** (đã đề xuất tách #368-cookie).

### 2.5 Access token TTL → **giữ 480' ở increment này**
Rút TTL xuống 15–30' (như issue muốn) mà **chưa có FE auto-refresh** = user bị đá ra login mỗi 30' (regression UX,
FE hiện hard-redirect `/login` trên mọi 401). → Rút TTL **đi kèm** FE auto-refresh, làm ở FE follow-up (§6).
Backend increment này **backward-compatible 100%**: token cũ (không có claim `securityStamp`) được **grace-accept**
đến khi hết hạn tự nhiên → deploy KHÔNG buộc toàn bộ user đăng nhập lại.

## 3. Phương án đã cân nhắc & loại

| Phương án | Loại vì |
|---|---|
| Provision Redis cho stamp-cache | Hạ tầng mới + chi phí + không provision được từ dev; biến Redis thành hard-dep auth hot-path |
| DB lookup mỗi request (không cache) | 1 query/req trên FallbackPolicy (gần mọi request) → tải DB + latency auth hot-path |
| httpOnly cookie ngay | Cross-site Vercel↔Cloud Run phức tạp (SameSite/CSRF) + đụng cửa restructure đang chạy |
| Rút TTL 30' ngay | Regression UX (đá login mỗi 30') khi chưa có FE auto-refresh |
| Bump stamp mọi logout | Đá tất cả thiết bị của user khi logout 1 máy — sai cho máy trạm dùng chung |

## 4. Ngữ nghĩa logout (lưu ý)
Logout thường **chỉ revoke refresh token + đóng session của ĐÚNG thiết bị**, **KHÔNG** xoay SecurityStamp
(không đá thiết bị khác cùng user — phù hợp máy trạm bệnh viện dùng chung). "Đá mọi thiết bị" = đổi mật khẩu /
reuse-detection / (hook admin) `RevokeAllForUserAsync`.

## 4b. Hardening từ review đối kháng (3-lens, trước push)
- **Chống double-spend TOCTOU**: `RotateAsync` revoke token cũ bằng `ExecuteUpdateAsync` có điều kiện
  `WHERE RevokedAt IS NULL` — 2 request song song chỉ 1 lật được (affected=1) → cấp token mới; kẻ thua
  (affected=0) coi như benign race, không cấp. Ngăn 2 token-family cùng sống + reuse-detection không kích hoạt.
- **Chống false-positive reuse**: token vừa rotate (reason=`rotated`) dùng lại trong `RefreshReuseLeewaySeconds`
  (60s) → fail mềm `rotated_race`, KHÔNG revoke family (đa tab / retry mạng chập chờn không đá user).
- **Fresh-recheck khi stamp mismatch**: `OnTokenValidated` khi cache lệch → đọc lại DB tươi trước khi fail →
  token MỚI sau khi xoay stamp không bị từ chối oan (hết login-loop ≤30s), đúng đa-instance.
- **Rate-limit `/refresh` partition theo IP** (120/phút/IP) thay vì 1 bucket global (global = attacker ẩn danh
  chặn refresh toàn viện). **Logout ownership check**: chỉ revoke token thuộc về userId đang đăng nhập.
- **M17 admin Terminate-session giờ revoke THẬT**: `TerminateSession` revoke refresh token của phiên + xoay
  SecurityStamp (mọi access chết ≤30s, thiết bị đó không rotate lại); `TerminateAll` revoke toàn bộ + xoay stamp.
- **Index `UserSessions.SessionToken`** (migration 144) — rotation/logout/terminate không table-scan.

## 5. Hệ quả
- ✅ Đăng xuất server-side thật; đổi mật khẩu → mọi phiên chết (≤30s); token bị cắp + dùng lại → revoke family.
- ✅ Không hạ tầng mới; không buộc re-login khi deploy (grace).
- ⚠️ Staleness thu hồi ≤30s (không tức-thời tuyệt đối như Redis pub/sub). Fail-open khi DB lỗi.
- ⚠️ localStorage vẫn có rủi ro XSS (chấp nhận tạm, có kế hoạch cookie).

## 6. Việc còn lại (FE follow-up — deferred, KHÔNG trong increment backend này)
1. `apiClient` interceptor: auto-refresh khi 401 (single-flight + hàng đợi replay), gọi `POST /auth/refresh`
   bằng axios trần (tránh đệ quy interceptor); fallback clear+redirect khi refresh fail. **Giữ** envelope auto-unwrap
   + exception `/inspector-portal`.
2. `AuthContext` lưu `refreshToken`; `logout` gọi `POST /auth/logout`; `storage.service` thêm key `refreshToken`.
3. Rút `Jwt:ExpireMinutes` xuống 15–30' **sau khi** (1)(2) xong.
4. (Issue riêng) chuyển refresh token sang httpOnly cookie + antiforgery.

> FE part bị chặn bởi cửa `components-restructure` đang xóa/dời `frontend/src/api/*` → làm sau khi cửa đó xong
> để tránh xung đột. Handoff chi tiết ghi ở comment #368.
