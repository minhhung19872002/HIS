# Dockerfile cho BFF app ho tro nguoi benh (HSMT muc I.1/I.2/I.3).
#
# Build tu THU MUC GOC repo de con duong ProjectReference con hop le neu sau nay can:
#   docker build -f backend/src/HIS.PatientApp.Api/Dockerfile -t his-patientapp-api .
#
# Anh nay CHI chua BFF. No khong phuc vu SPA va khong dung chung anh voi HIS Core —
# do la mot dich vu khac, vong doi khac, va mo ra Internet nen be mat phai nho nhat co the.

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy rieng csproj truoc de tang restore duoc cache lai khi chi doi ma nguon.
COPY backend/src/HIS.PatientApp.Api/HIS.PatientApp.Api.csproj backend/src/HIS.PatientApp.Api/
RUN dotnet restore backend/src/HIS.PatientApp.Api/HIS.PatientApp.Api.csproj

COPY backend/src/HIS.PatientApp.Api/ backend/src/HIS.PatientApp.Api/
RUN dotnet publish backend/src/HIS.PatientApp.Api/HIS.PatientApp.Api.csproj \
    -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# curl chi de phuc vu HEALTHCHECK ben duoi. Anh `dotnet/aspnet` KHONG co san wget lan curl —
# HEALTHCHECK goi wget thi container bao "unhealthy" vinh vien voi "wget: not found", trong khi
# app van chay tot. Luc do ai nhin `docker ps` cung tuong dich vu hong, con `depends_on:
# condition: service_healthy` thi treo mai khong khoi dong duoc thu khac.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Chay bang tai khoan khong phai root: neu co lo hong RCE thi ke tan cong khong san
# duoc quyen root trong container.
RUN adduser --system --group --uid 10001 patientapp

# Tao san thu muc vi giay to VA giao quyen cho user chay app — TRUOC khi doi sang USER.
#
# Thieu hai dong nay thi Docker tao volume `/app/vault` thuoc root, con app chay bang user
# `patientapp` nen khong ghi noi: moi lan nguoi benh tai giay to len deu tra 500
# "Access to the path '/app/vault/xx' is denied". Loi nay KHONG bao gio lo ra o may dev, vi o do
# app chay bang chinh tai khoan cua lap trinh vien va ghi vao mot thu muc thuong.
#
# Docker gan volume rong vao mot thu muc DA CO trong anh thi no chep ca quyen so huu sang volume —
# nen thu muc phai ton tai san o day, khong the tao luc chay.
RUN mkdir -p /app/vault && chown -R patientapp:patientapp /app/vault
VOLUME ["/app/vault"]

USER patientapp

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false
EXPOSE 8080

# TLS do Caddy tren VPS dam nhiem (HSMT I.4). Container nay chay HTTP sau proxy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl --fail --silent --show-error http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "HIS.PatientApp.Api.dll"]
