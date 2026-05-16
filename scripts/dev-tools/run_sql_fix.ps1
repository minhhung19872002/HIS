Import-Module SQLPS -DisableNameChecking
Invoke-Sqlcmd -ServerInstance 'localhost,1433' -Username 'sa' -Password 'HisDocker2024Pass#' -Database 'HIS' -InputFile 'C:\Source\HIS\scripts\fix_receivedby_shadow_fk.sql'
Write-Output 'SQL_OK'
