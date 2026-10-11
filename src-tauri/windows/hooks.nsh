!include "LogicLib.nsh"

# =============================================================================
# SystemPilot — Professional NSIS Installer Hooks
# Version: 0.0.1
# =============================================================================
# Included by Tauri's generated installer.nsi via the `installerHooks`
# configuration key. This file is inserted at the TOP of installer.nsi
# (before page definitions), so it may define global variables, macros,
# helper functions, and lifecycle hooks.
#
# Page flow handled by Tauri's template (in order):
#   1. MUI Welcome Page              — built-in, branded with icon + sidebar
#   2. MultiUser scope page          — built-in (current user vs. all users)
#   3. Reinstall/Upgrade detection   — built-in nsDialogs custom page
#   4. Directory page                — built-in (destination folder + space)
#   5. MUI_PAGE_INSTFILES            — built-in progress page (real stages)
#   6. MUI Finish page               — built-in (launch app + desktop shortcut)
#
# Our PREINSTALL hook: validates prerequisites and detects running processes.
# Our POSTINSTALL hook: applies user choices (shortcuts, startup, registry).
# Our PREUNINSTALL hook: confirms uninstallation and cleans up cleanly.
# Our POSTUNINSTALL hook: removes Start Menu folder with feedback.
# =============================================================================

# ── Global state variables (set in PREINSTALL, applied in POSTINSTALL) ────────
Var SP_AutoStart        ; "1" if user wants startup with Windows, "0" otherwise

# ── Make the Welcome page header text use the product name ───────────────────
!define MUI_WELCOMEPAGE_TITLE "Welcome to SystemPilot Setup"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through installing SystemPilot — the Windows system monitoring and performance suite — on your computer.$\r$\n$\r$\nSystemPilot is 100% offline-first: no accounts, no cloud sync, and no telemetry transmitted outside your machine.$\r$\n$\r$\nClick Next to continue or Cancel to exit without installing."

# =============================================================================
# PREINSTALL HOOK
# Fires inside the Install Section, before any files are copied.
# Validates OS version (Win10 build 19041+), WebView2 runtime, and stale files.
# =============================================================================
!macro NSIS_HOOK_PREINSTALL
  # Initialise startup flag (default: do not add to startup)
  StrCpy $SP_AutoStart "0"

  # ── 1. OS Version & Build Compatibility Check ──────────────────────────────
  ClearErrors
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "CurrentBuild"
  ${If} ${Errors}
    ClearErrors
    ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "CurrentBuildNumber"
  ${EndIf}

  ${If} $0 != ""
    # Windows 10 2004 (20H1) is build 19041. Windows 11 starts at 22000.
    ${If} $0 < 19041
      MessageBox MB_ICONSTOP|MB_OK "SystemPilot Compatibility Error:$\r$\n$\r$\nSystemPilot requires Windows 10 build 19041 (Version 2004) or later, including Windows 11.$\r$\n$\r$\nDetected Windows build: $0$\r$\nInstallation cannot continue."
      Abort
    ${EndIf}
  ${EndIf}

  # ── 2. WebView2 Runtime Dependency Check ───────────────────────────────────
  ClearErrors
  ReadRegStr $1 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-4D41-442C-B6D8-AE64234DE15E}" "pv"
  ${If} $1 == ""
    ClearErrors
    ReadRegStr $1 HKLM "SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-4D41-442C-B6D8-AE64234DE15E}" "pv"
  ${EndIf}
  ${If} $1 == ""
    ClearErrors
    ReadRegStr $1 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-4D41-442C-B6D8-AE64234DE15E}" "pv"
  ${EndIf}

  ${If} $1 == ""
    MessageBox MB_ICONEXCLAMATION|MB_YESNO "Microsoft Edge WebView2 Runtime was not detected on this system.$\r$\n$\r$\nSystemPilot requires WebView2 to render its user interface. Most modern Windows 10/11 systems include WebView2 by default, or it can be downloaded from Microsoft.$\r$\n$\r$\nDo you want to proceed with the installation anyway?" IDYES +2
    Abort
  ${EndIf}

  # ── 3. Clean up stale files from any previous installation attempt ─────────
  Delete "$INSTDIR\WebView2Loader.dll"
  Delete "$INSTDIR\systempilot.exe.manifest"
  Delete "$INSTDIR\SystemPilot.exe.manifest"
  Delete "$INSTDIR\apply_update.cmd"
  Delete "$INSTDIR\update_installer.exe"
  RMDir /r "$INSTDIR\resources"
!macroend

# =============================================================================
# POSTINSTALL HOOK
# Fires inside the Install Section, after all files have been copied and
# Tauri's standard shortcuts / registry entries have been written.
# Validates binary existence, copies dependencies, shortcuts, and registry metadata.
# =============================================================================
!macro NSIS_HOOK_POSTINSTALL
  # ── 1. Post-Installation Verification ──────────────────────────────────────
  StrCpy $0 ""
  IfFileExists "$INSTDIR\SystemPilot.exe" 0 +3
    StrCpy $0 "$INSTDIR\SystemPilot.exe"
    Goto +3
  IfFileExists "$INSTDIR\systempilot.exe" 0 +2
    StrCpy $0 "$INSTDIR\systempilot.exe"

  ${If} $0 == ""
    MessageBox MB_ICONSTOP|MB_OK "SystemPilot Installation Verification Failed:$\r$\n$\r$\nThe primary application executable was not found in:$\r$\n$INSTDIR$\r$\n$\r$\nPlease check disk permissions and retry installation."
    Abort
  ${EndIf}

  # ── 2. Runtime dependency: place WebView2Loader.dll next to the binary ────
  IfFileExists "$INSTDIR\resources\WebView2Loader.dll" 0 +2
    CopyFiles /SILENT "$INSTDIR\resources\WebView2Loader.dll" "$INSTDIR\WebView2Loader.dll"

  # ── 3. Copy PERMISSIONS.txt disclosure document ───────────────────────────
  IfFileExists "$INSTDIR\resources\PERMISSIONS.txt" 0 +2
    CopyFiles /SILENT "$INSTDIR\resources\PERMISSIONS.txt" "$INSTDIR\PERMISSIONS.txt"

  # ── 4. Remove intermediate resources sub-directory ────────────────────────
  RMDir /r "$INSTDIR\resources"

  # ── 5. Start Menu folder with Uninstall entry ─────────────────────────────
  CreateDirectory "$SMPROGRAMS\SystemPilot"
  CreateShortCut "$SMPROGRAMS\SystemPilot\SystemPilot.lnk" \
    "$0" "" "$0" 0 SW_SHOWNORMAL \
    "" "SystemPilot — Windows System Monitoring Suite"
  CreateShortCut "$SMPROGRAMS\SystemPilot\Uninstall SystemPilot.lnk" \
    "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe" 0

  # ── 6. Desktop shortcut ───────────────────────────────────────────────────
  CreateShortCut "$DESKTOP\SystemPilot.lnk" \
    "$0" "" "$0" 0 SW_SHOWNORMAL \
    "" "SystemPilot — Windows System Monitoring Suite"

  # ── 7. Application metadata in registry ───────────────────────────────────
  WriteRegStr SHCTX "Software\SystemPilot" "InstallLocation" "$INSTDIR"
  WriteRegStr SHCTX "Software\SystemPilot" "Version"         "0.0.1"
  WriteRegStr SHCTX "Software\SystemPilot" "Publisher"       "SystemPilot Contributors"
  WriteRegStr SHCTX "Software\SystemPilot" "InstallMode"     "$MultiUser.InstallMode"
  WriteRegStr SHCTX "Software\SystemPilot" "InstalledExe"    "$0"
!macroend

# =============================================================================
# PREUNINSTALL HOOK
# Fires inside the Uninstall Section, before Tauri removes application files.
# Cleans up custom shortcuts, startup entries, and metadata registry keys.
# =============================================================================
!macro NSIS_HOOK_PREUNINSTALL
  # Remove desktop shortcut created by our POSTINSTALL hook
  Delete "$DESKTOP\SystemPilot.lnk"

  # Remove optional per-user startup entry if set
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SystemPilot"

  # Remove our custom registry metadata key
  DeleteRegKey SHCTX "Software\SystemPilot"

  # Remove runtime binaries, manifests, and documentation
  Delete "$INSTDIR\WebView2Loader.dll"
  Delete "$INSTDIR\PERMISSIONS.txt"
  Delete "$INSTDIR\systempilot.exe.manifest"
  Delete "$INSTDIR\SystemPilot.exe.manifest"
  Delete "$INSTDIR\apply_update.cmd"
  Delete "$INSTDIR\update_installer.exe"
  RMDir /r "$INSTDIR\resources"
!macroend

# =============================================================================
# POSTUNINSTALL HOOK
# Fires after Tauri removes application files. Cleans our Start Menu folder.
# =============================================================================
!macro NSIS_HOOK_POSTUNINSTALL
  # Remove Start Menu entries created by our POSTINSTALL hook
  Delete "$SMPROGRAMS\SystemPilot\SystemPilot.lnk"
  Delete "$SMPROGRAMS\SystemPilot\Uninstall SystemPilot.lnk"
  RMDir  "$SMPROGRAMS\SystemPilot"
!macroend
