@echo off
setlocal enabledelayedexpansion

REM Set the quality level for the AVIF conversion.
REM Lower values mean better quality and larger file sizes.
REM The range is 0-63, with 0 being lossless.
REM A value around 30 is a good starting point for significant size reduction.
set QUALITY=40

echo Starting PNG to AVIF conversion...

REM Loop through all .png files in the current directory and all subdirectories.
for /r %%f in (*.png) do (
    echo Converting "%%f"
    
    REM Construct the output filename by replacing .png with .avif.
    set "output_file=%%~dpnf.avif"
    
    REM Run the ffmpeg command to convert the image.
    REM -still-picture 1 is important for single image files.
    REM -c:v libaom-av1 specifies the AV1 video encoder.
    REM -crf %QUALITY% sets the constant rate factor for quality.
    ffmpeg -i "%%f" -c:v libaom-av1 -still-picture 1 -crf %QUALITY% "!output_file!"
)

echo.
echo Conversion complete.
pause