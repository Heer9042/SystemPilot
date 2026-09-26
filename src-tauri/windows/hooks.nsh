# NSIS installer hooks for SystemPilot
# PREINSTALL: Remove stale files from any previous installation before placing
#             new files. This prevents the "Entry Point Not Found" error that
#             occurred when an old MinGW-built EXE coexisted with new DLLs.
!macro NSIS_HOOK_PREINSTALL
  # Remove stale WebView2Loader.dll and manifests from previous install
  Delete "$INSTDIR\WebView2Loader.dll"
  Delete "$INSTDIR\systempilot.exe.manifest"
  Delete "$INSTDIR\SystemPilot.exe.manifest"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  IfFileExists "$INSTDIR\resources\WebView2Loader.dll" 0 +3
    CopyFiles /SILENT "$INSTDIR\resources\WebView2Loader.dll" "$INSTDIR\WebView2Loader.dll"
  IfFileExists "$INSTDIR\resources\systempilot.exe.manifest" 0 +4
    CopyFiles /SILENT "$INSTDIR\resources\systempilot.exe.manifest" "$INSTDIR\systempilot.exe.manifest"
    CopyFiles /SILENT "$INSTDIR\resources\systempilot.exe.manifest" "$INSTDIR\SystemPilot.exe.manifest"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  Delete "$INSTDIR\WebView2Loader.dll"
  Delete "$INSTDIR\systempilot.exe.manifest"
  Delete "$INSTDIR\SystemPilot.exe.manifest"
!macroend

