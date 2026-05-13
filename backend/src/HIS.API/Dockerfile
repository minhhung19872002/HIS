FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["src/HIS.API/HIS.API.csproj", "src/HIS.API/"]
COPY ["src/HIS.Application/HIS.Application.csproj", "src/HIS.Application/"]
COPY ["src/HIS.Infrastructure/HIS.Infrastructure.csproj", "src/HIS.Infrastructure/"]
COPY ["src/HIS.Core/HIS.Core.csproj", "src/HIS.Core/"]
RUN dotnet restore "src/HIS.API/HIS.API.csproj"

COPY . .
WORKDIR /src/src/HIS.API
RUN dotnet publish "HIS.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

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

ENTRYPOINT ["dotnet", "HIS.API.dll"]
