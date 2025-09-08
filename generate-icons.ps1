# PowerShell script to generate icons for Callosum extension

# Create a simple 16x16 icon
$bitmap = New-Object System.Drawing.Bitmap(16, 16)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::FromArgb(74, 111, 165)) # #4A6FA5
$bitmap.Save("$PSScriptRoot\icons\16.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Create a simple 32x32 icon
$bitmap = New-Object System.Drawing.Bitmap(32, 32)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::FromArgb(74, 111, 165))
$bitmap.Save("$PSScriptRoot\icons\32.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Create a simple 48x48 icon
$bitmap = New-Object System.Drawing.Bitmap(48, 48)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::FromArgb(74, 111, 165))
$bitmap.Save("$PSScriptRoot\icons\48.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Create a simple 96x96 icon
$bitmap = New-Object System.Drawing.Bitmap(96, 96)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::FromArgb(74, 111, 165))
$bitmap.Save("$PSScriptRoot\icons\96.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Create a simple 128x128 icon
$bitmap = New-Object System.Drawing.Bitmap(128, 128)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::FromArgb(74, 111, 165))
$bitmap.Save("$PSScriptRoot\icons\128.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Copy 16.png to favicon.ico
Copy-Item -Path "$PSScriptRoot\icons\16.png" -Destination "$PSScriptRoot\icons\favicon.ico" -Force

Write-Host "Icons generated successfully!" -ForegroundColor Green
