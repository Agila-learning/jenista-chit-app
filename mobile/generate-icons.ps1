Add-Type -AssemblyName System.Drawing

$srcPath = "d:\Chits\frontend\public\assets\Chit logo.jpg.jpeg"
$destIcon = "d:\Chits\mobile\assets\icon.png"
$destForeground = "d:\Chits\mobile\assets\android-icon-foreground.png"
$destBackground = "d:\Chits\mobile\assets\android-icon-background.png"
$destSplash = "d:\Chits\mobile\assets\splash-icon.png"

$src = [System.Drawing.Image]::FromFile($srcPath)
Write-Output "Source Image Size: $($src.Width) x $($src.Height)"

# 1. Generate icon.png (1024x1024)
# In app icons, standard design places the logo comfortably centered with ~15% safe padding
$iconSize = 1024
$iconBmp = New-Object System.Drawing.Bitmap($iconSize, $iconSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$iconG = [System.Drawing.Graphics]::FromImage($iconBmp)
$iconG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$iconG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$iconG.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Background fill with white/dark branding
$bgColor = [System.Drawing.Color]::FromArgb(255, 13, 21, 39) # #0d1527 brand navy
$iconG.Clear($bgColor)

# Calculate aspect fit with 75% scale so it doesn't get clipped on rounded Android / iOS app icon masks
$targetContentSize = 750
$scale = [Math]::Min($targetContentSize / $src.Width, $targetContentSize / $src.Height)
$w = [int]($src.Width * $scale)
$h = [int]($src.Height * $scale)
$x = [int](($iconSize - $w) / 2)
$y = [int](($iconSize - $h) / 2)

$iconG.DrawImage($src, $x, $y, $w, $h)
$iconBmp.Save($destIcon, [System.Drawing.Imaging.ImageFormat]::Png)
$iconG.Dispose()
$iconBmp.Dispose()
Write-Output "Generated icon.png"

# 2. Generate android-icon-foreground.png (432x432 for Android Adaptive Icons)
# Safe zone for Android adaptive icon foreground is the central 66% (285px diameter circle)
$fgSize = 432
$fgBmp = New-Object System.Drawing.Bitmap($fgSize, $fgSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$fgG = [System.Drawing.Graphics]::FromImage($fgBmp)
$fgG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$fgG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$fgG.Clear([System.Drawing.Color]::Transparent)

$targetFgContent = 280
$fgScale = [Math]::Min($targetFgContent / $src.Width, $targetFgContent / $src.Height)
$fgW = [int]($src.Width * $fgScale)
$fgH = [int]($src.Height * $fgScale)
$fgX = [int](($fgSize - $fgW) / 2)
$fgY = [int](($fgSize - $fgH) / 2)

$fgG.DrawImage($src, $fgX, $fgY, $fgW, $fgH)
$fgBmp.Save($destForeground, [System.Drawing.Imaging.ImageFormat]::Png)
$fgG.Dispose()
$fgBmp.Dispose()
Write-Output "Generated android-icon-foreground.png"

# 3. Generate android-icon-background.png (432x432 solid brand navy)
$bgBmp = New-Object System.Drawing.Bitmap($fgSize, $fgSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bgG = [System.Drawing.Graphics]::FromImage($bgBmp)
$bgG.Clear($bgColor)
$bgBmp.Save($destBackground, [System.Drawing.Imaging.ImageFormat]::Png)
$bgG.Dispose()
$bgBmp.Dispose()
Write-Output "Generated android-icon-background.png"

# 4. Generate splash-icon.png (Centered brand logo)
$splashSize = 512
$splashBmp = New-Object System.Drawing.Bitmap($splashSize, $splashSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$splashG = [System.Drawing.Graphics]::FromImage($splashBmp)
$splashG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$splashG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$splashG.Clear([System.Drawing.Color]::Transparent)

$targetSplash = 400
$spScale = [Math]::Min($targetSplash / $src.Width, $targetSplash / $src.Height)
$spW = [int]($src.Width * $spScale)
$spH = [int]($src.Height * $spScale)
$spX = [int](($splashSize - $spW) / 2)
$spY = [int](($splashSize - $spH) / 2)

$splashG.DrawImage($src, $spX, $spY, $spW, $spH)
$splashBmp.Save($destSplash, [System.Drawing.Imaging.ImageFormat]::Png)
$splashG.Dispose()
$splashBmp.Dispose()
Write-Output "Generated splash-icon.png"

$src.Dispose()
Write-Output "All icons successfully generated."
