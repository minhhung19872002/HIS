# Relay day thong bao — chay tren VPS Cloud (HSMT muc II: SSD >= 15GB, RAM >= 2GB, CPU >= 2 core).
#
# Build tu thu muc goc repo:
#   docker build -f backend/src/HIS.PatientApp.Relay/Dockerfile -t his-patientapp-relay .

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY backend/src/HIS.PatientApp.Relay/HIS.PatientApp.Relay.csproj backend/src/HIS.PatientApp.Relay/
RUN dotnet restore backend/src/HIS.PatientApp.Relay/HIS.PatientApp.Relay.csproj

COPY backend/src/HIS.PatientApp.Relay/ backend/src/HIS.PatientApp.Relay/
RUN dotnet publish backend/src/HIS.PatientApp.Relay/HIS.PatientApp.Relay.csproj \
    -c Release -o /app/publish /p:UseAppHost=false

# Anh alpine cho nhe: VPS chi co 2GB RAM va 15GB dia.
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app

RUN addgroup -S relay && adduser -S -G relay -u 10001 relay
USER relay

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_gcServer=0
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "HIS.PatientApp.Relay.dll"]
