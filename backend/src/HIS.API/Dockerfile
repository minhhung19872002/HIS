# Build context = REPOSITORY ROOT (not backend/): the SPA is built into this same
# image and served from the same origin as the API, so the build needs frontend/ too.
#   docker build -f backend/src/HIS.API/Dockerfile -t <tag> .

# ---------- Stage 1: frontend (Vite SPA) ----------
FROM node:22-alpine AS frontend
WORKDIR /fe

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# Same-origin deploy: the SPA must call the API it was served from, which overrides
# the absolute Vercel-era URLs in .env.production. Variables already present in the
# environment win over Vite's .env files.
# VITE_REALTIME_URL="/" normalises to an empty origin, so SignalR builds a relative
# hub URL and resolves it against the page origin.
ENV VITE_API_URL=/api
ENV VITE_REALTIME_URL=/

# Orthanc URL that the BROWSER opens directly (Orthanc Explorer, OHIF, archive ZIP).
# Left empty on purpose: an unset value used to fall back to http://localhost:8042,
# which on an HTTPS deploy points at the user's own machine and is blocked as mixed
# content. Empty means "not configured" and the viewer disables those buttons instead
# of rendering dead links. Pass a real HTTPS Orthanc to enable them:
#   docker build --build-arg VITE_ORTHANC_URL=https://pacs.example.org ...
# DICOM images themselves do NOT need this — they stream through the API proxy.
ARG VITE_ORTHANC_URL=""
ENV VITE_ORTHANC_URL=$VITE_ORTHANC_URL
RUN npm run build

# ---------- Stage 2: backend ----------
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["backend/src/HIS.API/HIS.API.csproj", "src/HIS.API/"]
COPY ["backend/src/HIS.Application/HIS.Application.csproj", "src/HIS.Application/"]
COPY ["backend/src/HIS.Infrastructure/HIS.Infrastructure.csproj", "src/HIS.Infrastructure/"]
COPY ["backend/src/HIS.Core/HIS.Core.csproj", "src/HIS.Core/"]
RUN dotnet restore "src/HIS.API/HIS.API.csproj"

COPY backend/ .
WORKDIR /src/src/HIS.API
RUN dotnet publish "HIS.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ---------- Stage 3: runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Vietnamese-capable fonts for iText PDF generation (signed AI reports).
# DejaVu = Unicode-complete, Liberation Serif ≈ Times New Roman.
RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-dejavu fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 8080

COPY --from=build /app/publish .
# Deliberately NOT wwwroot: that folder holds AI models, BHXH XSDs and patient
# photos, none of which may be served publicly. Program.cs serves only clientapp/.
COPY --from=frontend /fe/dist ./clientapp

ENTRYPOINT ["dotnet", "HIS.API.dll"]
