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


## Migrate Data from Local SQL Server

If you have existing data in local SQL Server (localhost\DOTNET), you can migrate it to Docker:

### Option 1: Automatic Migration Script

powershell
# Run the migration script
cd C:\Source\HIS
.\scripts\migrate-to-docker.ps1


This script will:
1. Backup your local database
2. Start Docker containers
3. Restore the backup to Docker SQL Server

### Option 2: Manual Migration

1. **Backup local database using SSMS:**
   - Open SQL Server Management Studio
   - Connect to localhost\DOTNET
   - Right-click database HIS -> Tasks -> Back Up...
   - Save to C:\Source\HIS\backup\HIS.bak

2. **Start Docker containers:**
   powershell
   cd C:\Source\HIS
   docker-compose up -d
   # Wait 60 seconds for SQL Server to start
   

3. **Restore in Docker:**
   powershell
   docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "HIS@Docker2024!" -C -Q "RESTORE DATABASE [HIS] FROM DISK = N'/var/opt/mssql/backup/HIS.bak' WITH MOVE N'HIS' TO N'/var/opt/mssql/data/HIS.mdf', MOVE N'HIS_log' TO N'/var/opt/mssql/data/HIS_log.ldf', REPLACE"
   

### Running API with Docker Database

powershell
cd C:\Source\HIS\backend\src\HIS.API
dotnet run --environment Docker


This uses the connection string in appsettings.Docker.json.

---
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
