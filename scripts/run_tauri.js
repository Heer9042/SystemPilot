import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Ensure WinLibs MinGW is at the front of PATH on Windows to guarantee clean GCC linking
if (process.platform === 'win32') {
  const localAppData = process.env.LOCALAPPDATA || '';
  const winLibsDir = path.join(
    localAppData,
    'Microsoft/WinGet/Packages/BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe/mingw64/bin'
  );

  const binDir = path.join(rootDir, 'scripts', 'bin');
  if (fs.existsSync(binDir)) {
    process.env.PATH = `${binDir};${process.env.PATH}`;
    process.env.TAURI_WINDOWS_SIGNTOOL_PATH = path.join(binDir, 'signtool.exe');
  }

  const nsisDir = path.join(localAppData, 'electron-builder', 'Cache', 'nsis', 'nsis-3.0.4.1');
  if (fs.existsSync(nsisDir)) {
    process.env.PATH = `${nsisDir};${process.env.PATH}`;
  }

  if (fs.existsSync(winLibsDir)) {
    process.env.PATH = `${winLibsDir};${process.env.PATH}`;

    // Ensure matching runtime DLLs are placed in target/debug to prevent STATUS_ENTRYPOINT_NOT_FOUND (0xc0000139)
    const targetDirs = [
      path.join(rootDir, 'src-tauri', 'target', 'debug'),
      path.join(rootDir, 'src-tauri', 'target', 'release')
    ];

    const dllsToCopy = ['libwinpthread-1.dll', 'libgcc_s_seh-1.dll'];
    for (const targetDir of targetDirs) {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      for (const dll of dllsToCopy) {
        const src = path.join(winLibsDir, dll);
        const dst = path.join(targetDir, dll);
        if (fs.existsSync(src) && (!fs.existsSync(dst) || fs.statSync(src).mtimeMs > fs.statSync(dst).mtimeMs)) {
          try {
            fs.copyFileSync(src, dst);
          } catch (_) {}
        }
      }

      // Ensure WebView2Loader.dll is also placed in target
      const webviewSrc = path.join(rootDir, 'src-tauri', 'resources', 'WebView2Loader.dll');
      const webviewDst = path.join(targetDir, 'WebView2Loader.dll');
      if (fs.existsSync(webviewSrc) && !fs.existsSync(webviewDst)) {
        try {
          fs.copyFileSync(webviewSrc, webviewDst);
        } catch (_) {}
      }
    }
  }
}

const args = process.argv.slice(2);
const tauriBin = process.platform === 'win32'
  ? path.join(rootDir, 'node_modules', '.bin', 'tauri.cmd')
  : path.join(rootDir, 'node_modules', '.bin', 'tauri');

// Provide clear developer guidance if running tauri dev in a non-elevated shell on Windows
if (process.platform === 'win32' && args.includes('dev')) {
  try {
    const { execSync } = await import('child_process');
    execSync('net session', { stdio: 'ignore' });
  } catch (_) {
    console.warn('\n[SystemPilot Notice] Terminal is running with standard user privileges.');
    console.warn('[SystemPilot Notice] SystemPilot enforces Windows Administrator privileges (requireAdministrator manifest).');
    console.warn('[SystemPilot Notice] If cargo execution fails with "os error 740", relaunch your terminal as Administrator.\n');
  }
}

const child = spawn(tauriBin, args, { stdio: 'inherit', shell: true, env: process.env, cwd: rootDir });

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
