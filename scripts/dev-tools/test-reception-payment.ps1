$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjllNTMwOWRjLWVjZjktNGQ0OC05YTA5LTIyNGNkMTUzNDdiMSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJhZG1pbiIsImZ1bGxOYW1lIjoiQWRtaW5pc3RyYXRvciIsImVtcGxveWVlQ29kZSI6IiIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IlF1w6HCusKjbiB0csOhwrvigLkgaMOhwrvigKEgdGjDocK74oCYbmciLCJwZXJtaXNzaW9uIjpbIkFETUlOX1JFUE9SVCIsIlJFQ0VQVElPTl9FRElUIiwiT1BEX09SREVSIiwiQklMTElOR19SRUZVTkQiLCJMQUJfVklFVyIsIk9QRF9QUkVTQ1JJQkUiLCJSRUNFUFRJT05fQ1JFQVRFIiwiT1BEX0VYQU1JTkUiLCJCSUxMSU5HX1ZJRVciLCJMQUJfUkVTVUxUIiwiQURNSU5fVVNFUiIsIkFETUlOX0NBVEFMT0ciLCJPUERfVklFVyIsIklQRF9BRE1JVCIsIlBIQVJNQUNZX0lNUE9SVCIsIklQRF9ESVNDSEFSR0UiLCJCSUxMSU5HX0NPTExFQ1QiLCJJUERfVklFVyIsIlJFQ0VQVElPTl9ERUxFVEUiLCJSRUNFUFRJT05fVklFVyIsIlBIQVJNQUNZX0RJU1BFTlNFIiwiUEhBUk1BQ1lfVklFVyJdLCJleHAiOjE3NzAzNTMwODUsImlzcyI6IkhJUy5BUEkiLCJhdWQiOiJISVMuQ2xpZW50In0.PLjZGiCYaqhrABT2taNgQC2WSIy9pgDGohlhA2tYcRI"
$headers = @{Authorization = "Bearer $token"; "Content-Type" = "application/json"}
$medicalRecordId = "704b09aa-cf75-4102-8bc0-2f8ed5023583"

Write-Host "=== Step 7: Create Payment (Reception Endpoint) ===" -ForegroundColor Cyan
$paymentBody = @{
    medicalRecordId = $medicalRecordId
    serviceIds = @()
    totalAmount = 7500
    insuranceAmount = 0
    patientAmount = 7500
    discountAmount = 0
    paidAmount = 7500
    paymentMethod = 1
    transactionReference = $null
} | ConvertTo-Json

Write-Host "Request body:"
$paymentBody

try {
    $payment = Invoke-RestMethod -Uri "http://localhost:5106/api/reception/billing/payment" -Method POST -Headers $headers -Body $paymentBody
    Write-Host "`nPayment created successfully!" -ForegroundColor Green
    $payment | ConvertTo-Json -Depth 5
} catch {
    Write-Host "`nError: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.ReadToEnd()
    }
}
