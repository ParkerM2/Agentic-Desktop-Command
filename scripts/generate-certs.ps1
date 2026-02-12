# Generate self-signed TLS certificates for Claude-UI Hub (Windows)
# Usage: powershell ./scripts/generate-certs.ps1 [output-dir]

$CertDir = if ($args[0]) { $args[0] } else { ".\certs" }
New-Item -ItemType Directory -Force -Path $CertDir | Out-Null

# Create self-signed certificate with SAN entries for LAN usage
$cert = New-SelfSignedCertificate `
  -DnsName "claude-ui.local", "localhost" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -NotAfter (Get-Date).AddYears(10) `
  -KeyAlgorithm RSA `
  -KeyLength 2048 `
  -FriendlyName "Claude-UI Hub"

# Export certificate
Export-Certificate -Cert $cert -FilePath "$CertDir\server.crt" -Type CERT

# Export private key as PFX
$password = ConvertTo-SecureString -String "temp" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "$CertDir\server.pfx" -Password $password

Write-Host "Certificates generated in $CertDir/"
Write-Host "  - server.crt (certificate)"
Write-Host "  - server.pfx (private key bundle)"
