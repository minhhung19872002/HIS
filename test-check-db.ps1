$connectionString = "Server=localhost\DOTNET;Database=HIS;Trusted_Connection=True;TrustServerCertificate=True"

Write-Host "=== Check Medical Records (Inpatient type) ===" -ForegroundColor Cyan
$query1 = "SELECT TOP 5 Id, MedicalRecordCode, TreatmentType, Status, AdmissionDate FROM MedicalRecords WHERE TreatmentType = 2 ORDER BY CreatedAt DESC"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $query1 | Format-Table

Write-Host "`n=== Check Admissions ===" -ForegroundColor Cyan
$query2 = "SELECT TOP 5 a.Id, a.PatientId, p.FullName, a.AdmissionDate, a.Status, a.DepartmentId, a.RoomId, a.BedId FROM Admissions a JOIN Patients p ON a.PatientId = p.Id ORDER BY a.CreatedAt DESC"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $query2 | Format-Table

Write-Host "`n=== Check BedAssignments ===" -ForegroundColor Cyan
$query3 = "SELECT * FROM BedAssignments"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $query3 | Format-Table

Write-Host "`n=== Check Test Medical Record Status ===" -ForegroundColor Cyan
$query4 = "SELECT Id, MedicalRecordCode, TreatmentType, Status, DepartmentId, RoomId, BedId FROM MedicalRecords WHERE Id = '206EB65C-677B-4CAD-B1C1-DAE503B1D51C'"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $query4 | Format-Table
