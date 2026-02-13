# HIS Docker Setup Guide

## Prerequisites

1. **Docker Desktop** - Download and install from https://www.docker.com/products/docker-desktop/
2. Make sure Docker Desktop is **running** before proceeding

## Quick Start

### 1. Start Docker Desktop
- Open Docker Desktop application
- Wait until the Docker icon in system tray shows "Docker Desktop is running"

### 2. Start Database Containers

```powershell
# Navigate to project root
cd C:\Source\HIS

# Start all containers
docker-compose up -d

# Check containers are running
docker ps
```

Expected containers:
- `his-sqlserver` - SQL Server 2022 on port 1433
- `his-orthanc` - Orthanc PACS on ports 4242 (DICOM), 8042 (Web)
- `his-redis` - Redis cache on port 6379

### 3. Initialize Database

Wait for SQL Server to be ready (about 30 seconds), then run:

```powershell
# Initialize the HIS database
docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "HIS@Docker2024!" -C -i /docker-entrypoint-initdb.d/01-create-database.sql
```

### 4. Run EF Migrations

```powershell
cd C:\Source\HIS\backend\src\HIS.API
dotnet ef database update
```

### 5. Start the API

```powershell
cd C:\Source\HIS\backend\src\HIS.API
dotnet run --urls "http://localhost:5106"
```

### 6. Start Frontend

```powershell
cd C:\Source\HIS\frontend
npm run dev
```

## Connection Information

| Service | Host | Port | Credentials |
|---------|------|------|-------------|
| SQL Server | localhost | 1433 | sa / HIS@Docker2024! |
| Orthanc Web | localhost | 8042 | admin / orthanc |
| DICOM | localhost | 4242 | - |
| Redis | localhost | 6379 | - |

## Connection String

```
Server=localhost,1433;Database=HIS;User Id=sa;Password=HIS@Docker2024!;TrustServerCertificate=True;MultipleActiveResultSets=true
```

## Useful Commands

```powershell
# View container logs
docker logs his-sqlserver
docker logs his-orthanc
docker logs his-redis

# Stop all containers
docker-compose down

# Stop and remove volumes (CAUTION: deletes all data)
docker-compose down -v

# Restart containers
docker-compose restart

# View container status
docker-compose ps
```

## Troubleshooting

### Docker Desktop not running
Error: `The system cannot find the file specified`
Solution: Start Docker Desktop application

### SQL Server connection refused
Wait 30-60 seconds for SQL Server to initialize, then try again.

### Port already in use
Stop existing services using the same port or change port in docker-compose.yml

### Reset database
```powershell
docker-compose down -v
docker-compose up -d
# Wait 30 seconds
docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "HIS@Docker2024!" -C -i /docker-entrypoint-initdb.d/01-create-database.sql
dotnet ef database update
```
