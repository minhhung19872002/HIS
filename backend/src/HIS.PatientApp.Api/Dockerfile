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

# Chay bang tai khoan khong phai root: neu co lo hong RCE thi ke tan cong khong san
# duoc quyen root trong container.
RUN adduser --system --group --uid 10001 patientapp
USER patientapp

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false
EXPOSE 8080

# TLS do Caddy tren VPS dam nhiem (HSMT I.4). Container nay chay HTTP sau proxy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "HIS.PatientApp.Api.dll"]
