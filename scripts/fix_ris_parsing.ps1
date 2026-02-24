$filePath = 'C:/Source/HIS/backend/src/HIS.Infrastructure/Services/RISCompleteService.cs'
$content = Get-Content $filePath -Raw

# Fix modalityType parsing
$oldModalityCode = @'
        if (!string.IsNullOrEmpty(modalityType))
        {
            var typeInt = int.Parse(modalityType);
            query = query.Where(m => m.ModalityType == typeInt);
        }
'@

$newModalityCode = @'
        if (!string.IsNullOrEmpty(modalityType))
        {
            int typeInt;
            if (!int.TryParse(modalityType, out typeInt))
            {
                typeInt = modalityType.ToUpper() switch
                {
                    "XRAY" or "XR" => 0,
                    "CT" => 1,
                    "MRI" => 2,
                    "US" or "ULTRASOUND" => 3,
                    "NM" or "NUCLEARMEDICINE" => 4,
                    "PET" => 5,
                    "FLUORO" => 6,
                    "MAMMO" => 7,
                    "DR" => 8,
                    "CR" => 9,
                    _ => -1
                };
            }
            if (typeInt >= 0)
            {
                query = query.Where(m => m.ModalityType == typeInt);
            }
        }
'@

$content = $content.Replace($oldModalityCode, $newModalityCode)

# Fix status parsing in GetWaitingListAsync (first occurrence after roomId check)
$oldStatusCode = @'
        if (!string.IsNullOrEmpty(status))
        {
            var statusInt = int.Parse(status);
            query = query.Where(r => r.Status == statusInt);
        }
'@

$newStatusCode = @'
        if (!string.IsNullOrEmpty(status))
        {
            int statusInt;
            if (!int.TryParse(status, out statusInt))
            {
                statusInt = status.ToLower() switch
                {
                    "pending" => 0,
                    "inprogress" => 1,
                    "completed" => 2,
                    "cancelled" => 3,
                    _ => -1
                };
            }
            if (statusInt >= 0)
            {
                query = query.Where(r => r.Status == statusInt);
            }
        }
'@

$content = $content.Replace($oldStatusCode, $newStatusCode)

Set-Content $filePath -Value $content -NoNewline
Write-Host "Fixed RIS service parsing bugs"
