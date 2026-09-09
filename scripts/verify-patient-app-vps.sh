#!/usr/bin/env bash
# Nghiệm thu tầng VPS của app người bệnh — HSMT mục I.4 (chứng chỉ số) và mục II.
#
# Vì sao có script này: những mệnh đề của mục II ("VPS không giữ dữ liệu y tế", "chỉ mở đúng
# /push và /health", "vừa ngân sách RAM/đĩa") trước đây chỉ được KHAI TRONG TÀI LIỆU. Khai thì
# không phải bằng chứng. Script này dựng đúng stack trong `deploy/patient-app-vps/` rồi ĐO từng
# mệnh đề một, và in ra kết quả để đính vào hồ sơ nghiệm thu.
#
# Chạy được trên máy dev (không cần VPS, không cần tên miền, không cần khoá Firebase) — phần
# duy nhất cần hạ tầng thật là chứng chỉ Let's Encrypt và bản kê cấu hình máy, xem mục 8 cuối file.
#
#   bash scripts/verify-patient-app-vps.sh
#
# Mặc định dùng cổng 8180/8543 để không tranh cổng 80/443 với thứ khác trên máy dev.
set -uo pipefail

HTTP_PORT="${VPS_HTTP_PORT:-8180}"
HTTPS_PORT="${VPS_HTTPS_PORT:-8543}"
DC_POSTGRES="${DC_POSTGRES_CONTAINER:-his-patientapp-postgres}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
stack_dir="$repo_root/deploy/patient-app-vps"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

pass=0
fail=0
check() {  # check "<tên>" "<điều kiện đã lượng giá: 0=đạt>" "<chi tiết>"
  if [ "$2" -eq 0 ]; then pass=$((pass + 1)); printf '  ĐẠT     %s' "$1"
  else fail=$((fail + 1)); printf '  HỎNG    %s' "$1"; fi
  [ -n "${3:-}" ] && printf ' | %s' "$3"
  printf '\n'
}

# Cổng 80/443 trên máy dev thường đã có thứ khác giữ. Trên VPS thật thì dùng thẳng
# docker-compose.yml, không cần lớp phủ này.
cat > "$work/ports.yml" <<EOF
services:
  caddy:
    ports: !override
      - "$HTTP_PORT:80"
      - "$HTTPS_PORT:443"
EOF

dc() { docker compose -f "$stack_dir/docker-compose.yml" -f "$work/ports.yml" "$@"; }

# Cấu hình tối thiểu để stack dựng được. KHÔNG có khoá Firebase — đó là chủ ý: phải chứng minh
# được stack chạy và nghiệm thu được khi bệnh viện chưa cấp khoá.
if [ ! -f "$stack_dir/.env" ]; then
  cat > "$stack_dir/.env" <<'EOF'
PATIENTAPP_DOMAIN=localhost
ACME_EMAIL=test@example.com
RELAY_API_KEY=kiem-thu-nghiem-thu-muc-II-1234567890
EOF
  echo "Đã tạo $stack_dir/.env cho lượt đo (domain localhost)."
fi
RELAY_KEY="$(grep -E '^RELAY_API_KEY=' "$stack_dir/.env" | cut -d= -f2-)"

echo "==> Dựng stack VPS"
dc build relay >/dev/null 2>&1 || { echo "Build relay hỏng."; exit 1; }
dc up -d >/dev/null 2>&1 || { echo "Không dựng được stack."; exit 1; }

# Caddy cần vài giây xin chứng chỉ nội bộ cho localhost.
for _ in $(seq 1 30); do
  curl -sk -o /dev/null "https://localhost:$HTTPS_PORT/health" && break
  sleep 1
done

base="https://localhost:$HTTPS_PORT"
echo
echo "=== 1. Relay dựng được khi CHƯA có khoá Firebase (quy tắc: có bản thật + bản giả) ==="
health="$(curl -sk "$base/health")"
echo "$health" | grep -q '"status":"ok"'; check "relay sống" $? "$health"
echo "$health" | grep -q '"mode":"fake"'; check "báo rõ đang chạy chế độ giả" $?

echo
echo "=== 2. VPS chỉ mở /push và /health, mọi đường khác 404 (HSMT II.1) ==="
for p in / /api /api/v1/patient/results /admin /patient-api/health /.env /actuator; do
  code="$(curl -sk -o /dev/null -w '%{http_code}' "$base$p")"
  [ "$code" = "404" ]; check "$p bị từ chối" $? "HTTP $code"
done
code="$(curl -sk -o /dev/null -w '%{http_code}' "$base/push")"
[ "$code" != "404" ]; check "/push có được định tuyến" $? "HTTP $code (405 = đúng, chỉ nhận POST)"

echo
echo "=== 3. HTTP bị đẩy sang HTTPS ==="
code="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$HTTP_PORT/health")"
[ "$code" = "308" ] || [ "$code" = "301" ] || [ "$code" = "302" ]
check "http → https" $? "HTTP $code"

echo
echo "=== 4. TLS: từ chối 1.0/1.1, chấp nhận 1.2/1.3 (HSMT I.4) ==="
# Hứng ra biến rồi mới grep, KHÔNG nối ống thẳng: `set -o pipefail` lấy mã lỗi khác 0 của
# openssl (nó thoát lỗi khi bắt tay hỏng — đúng như ta mong đợi ở tls1/tls1_1) đè lên kết quả
# của grep, làm chính phép kiểm báo hỏng trong khi máy chủ hành xử đúng.
for v in tls1 tls1_1; do
  out="$(echo | openssl s_client -connect "localhost:$HTTPS_PORT" -servername localhost -$v 2>&1)"
  grep -q "no protocols available\|alert protocol version\|unsupported protocol" <<<"$out"
  check "$v bị từ chối" $?
done
for v in tls1_2 tls1_3; do
  out="$(echo | openssl s_client -connect "localhost:$HTTPS_PORT" -servername localhost -$v 2>&1)"
  grep -qE "^[[:space:]]+Protocol[[:space:]]+: TLSv1\.[23]" <<<"$out"
  check "$v bắt tay được" $?
done

echo
echo "=== 5. Header bảo vệ (HSMT I.4) ==="
headers="$(curl -skI "$base/health")"
for h in "Strict-Transport-Security" "X-Content-Type-Options" "X-Frame-Options" "Referrer-Policy"; do
  echo "$headers" | grep -qi "^$h:"; check "$h có mặt" $?
done
echo "$headers" | grep -qi "^Server:"; [ $? -ne 0 ]
check "không lộ tên máy chủ ở header Server" $?

echo
echo "=== 6. /push đòi đúng khoá, và đầu vào hỏng KHÔNG thành 500 ==="
code="$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$base/push" \
  -H 'Content-Type: application/json' -d '{"token":"abc","payload":{}}')"
[ "$code" = "401" ]; check "không có khoá → 401" $? "HTTP $code"

code="$(curl -sk -o /dev/null -w '%{http_code}' -X POST "$base/push" \
  -H 'X-Relay-Key: sai-khoa-hoan-toan-nhung-du-dai-1234' \
  -H 'Content-Type: application/json' -d '{"token":"abc","payload":{}}')"
[ "$code" = "401" ]; check "khoá sai → 401" $? "HTTP $code"

printf '{"token":"dev-token-abcdefghijkl","payload":{"title":"K\xe1\xba\xbft qu\xe1\xba\xa3 x\xc3\xa9t nghi\xe1\xbb\x87m \xc4\x91\xc3\xa3 c\xc3\xb3","body":"Phi\xe1\xba\xbfu XN-2026-0001"}}' > "$work/push.json"
body="$(curl -sk -X POST "$base/push" -H "X-Relay-Key: $RELAY_KEY" \
  -H 'Content-Type: application/json; charset=utf-8' --data-binary "@$work/push.json")"
echo "$body" | grep -q '"sent":true'; check "khoá đúng → nhận thông báo" $? "$body"

# Byte 0xE9 đơn lẻ không phải UTF-8 hợp lệ. Trước đây nó làm handler ném ngoại lệ giữa chừng và
# trả 500 kèm stack trace vào log — trên một endpoint mở ra Internet thì đó là thông tin thừa
# cho kẻ dò, mà lại che mất lỗi thật.
code="$(printf '{"token":"abc","payload":{"title":"\xe9\xe9"}}' | curl -sk -o /dev/null -w '%{http_code}' \
  -X POST "$base/push" -H "X-Relay-Key: $RELAY_KEY" -H 'Content-Type: application/json' --data-binary @-)"
[ "$code" = "400" ]; check "body không phải UTF-8 → 400 chứ không 500" $? "HTTP $code"

echo
echo "=== 7. VPS KHÔNG giữ dữ liệu y tế (HSMT II.1) ==="
# Tệp duy nhất được phép mới hơn mã nguồn là mấy tệp Docker tự tiêm vào container.
written="$(docker exec patientapp-relay sh -c \
  'find / -xdev -newer /app/HIS.PatientApp.Relay.dll -type f 2>/dev/null | grep -vE "^/(proc|sys|tmp|run|dev)|^/etc/(hostname|hosts|resolv.conf)$|^/.dockerenv$"' | head -5)"
[ -z "$written" ]; check "relay không ghi tệp nào xuống đĩa" $? "${written:-không có tệp nào}"

vols="$(docker volume ls --filter name=patientapp_caddy --format '{{.Name}}' | tr '\n' ' ')"
echo "$vols" | grep -qv "postgres\|mssql"; check "stack không có volume CSDL" $? "chỉ có: $vols"

masked="$(docker logs patientapp-relay 2>&1 | grep -c 'dev-\*\*\*ijkl')"
[ "$masked" -ge 1 ]; check "token thiết bị bị che trong log" $? "$masked dòng"
raw="$(docker logs patientapp-relay 2>&1 | grep -c 'dev-token-abcdefghijkl')"
[ "$raw" -eq 0 ]; check "token đầy đủ KHÔNG lọt vào log" $? "$raw dòng"

echo
echo "=== 8. Ngân sách tài nguyên (HSMT II.2) ==="
docker stats --no-stream --format '  {{.Name}} dùng {{.MemUsage}}, CPU {{.CPUPerc}}' \
  patientapp-relay patientapp-caddy
mem_mb="$(docker stats --no-stream --format '{{.MemUsage}}' patientapp-relay patientapp-caddy \
  | awk '{gsub(/MiB.*/,"",$1); s+=$1} END {printf "%d", s}')"
[ "$mem_mb" -lt 1500 ]; check "tổng RAM < 1.5GB của ngân sách 2GB" $? "${mem_mb}MiB"
docker images --format '  {{.Repository}}:{{.Tag}} {{.Size}}' | grep -E 'his-patientapp-relay|caddy:2' | head -3

echo
echo "=== 9. Dừng hẳn VPS → dữ liệu trong data center vẫn nguyên (HSMT II.1) ==="
if docker ps --format '{{.Names}}' | grep -q "^$DC_POSTGRES$"; then
  before="$(docker exec "$DC_POSTGRES" psql -U patientapp -d his_patientapp -t -A \
    -c 'SELECT COUNT(*) FROM app_accounts;' 2>/dev/null | tr -d '\r')"
  dc down >/dev/null 2>&1
  after="$(docker exec "$DC_POSTGRES" psql -U patientapp -d his_patientapp -t -A \
    -c 'SELECT COUNT(*) FROM app_accounts;' 2>/dev/null | tr -d '\r')"
  [ -n "$before" ] && [ "$before" = "$after" ]
  check "số tài khoản không đổi sau khi VPS chết" $? "trước=$before sau=$after"
else
  echo "  BỎ QUA  data center chưa chạy (container $DC_POSTGRES) — dựng deploy/patient-app rồi chạy lại."
  dc down >/dev/null 2>&1
fi

echo
echo "==========================================================================="
echo "  $pass ĐẠT / $fail HỎNG"
echo
echo "  CÒN LẠI, KHÔNG ĐO ĐƯỢC TRÊN MÁY DEV (cần hạ tầng bệnh viện cấp):"
echo "   · Chứng chỉ Let's Encrypt thật (I.4.1) — cần một tên miền trỏ về VPS. Ở đây Caddy dùng"
echo "     CA nội bộ, nên đã chứng minh được TLS/header/tự-gia-hạn nhưng chưa phải chữ ký DV công khai."
echo "   · Bản kê cấu hình máy (II.2) — 'SSD ≥ 15GB, RAM ≥ 2GB, CPU ≥ 2 core' là chuyện của máy thuê;"
echo "     phần phần-mềm (stack vừa ngân sách) đã đo ở mục 8."
echo "   · Gửi thông báo tới máy thật (I.2.2.2) — cần khoá Firebase; xem external-services-setup.md §2."
echo "==========================================================================="
[ "$fail" -eq 0 ]
