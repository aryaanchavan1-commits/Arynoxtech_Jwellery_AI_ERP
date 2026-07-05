/**
 * One-command release & publish script for Arynoxtech Jwellery ERP
 * 
 * How to use:
 *   1. Make sure package.json "publish.url" points to your server
 *   2. Run: npm run release
 *   3. Script builds, bumps version, copies files to your server
 * 
 * Your update server just needs to be any static file host.
 * Upload methods supported:
 *   - FTP (set FTP_HOST, FTP_USER, FTP_PASS env vars)
 *   - Local folder (set PUBLISH_DIR env var)
 *   - Manual (files copied to release/ folder, you upload manually)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const bumpType = args.includes('--major') ? 'major' : args.includes('--minor') ? 'minor' : 'patch';
const uploadMethod = args.includes('--ftp') ? 'ftp' : args.includes('--dir') ? 'dir' : 'manual';

// =====================================================
// CONFIGURATION — Edit these or use environment variables
// =====================================================
const PUBLISH_DIR = process.env.PUBLISH_DIR || 'C:\\my-update-server\\updates';
const FTP_HOST = process.env.FTP_HOST || 'your-ftp-server.com';
const FTP_USER = process.env.FTP_USER || 'username';
const FTP_PASS = process.env.FTP_PASS || 'password';
const FTP_PATH = process.env.FTP_PATH || '/public_html/updates/';

function run(cmd) {
  console.log(`\n> ${cmd}`);
  return execSync(cmd, { stdio: 'inherit' });
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const [major, minor, patch] = pkg.version.split('.').map(Number);
  const newVersion = bumpType === 'major' ? `${major+1}.0.0` : bumpType === 'minor' ? `${major}.${minor+1}.0` : `${major}.${minor}.${patch+1}`;

  console.log('========================================');
  console.log(`  Publishing v${pkg.version} → v${newVersion}`);
  console.log(`  Upload: ${uploadMethod}`);
  console.log('========================================\n');

  // Update version
  pkg.version = newVersion;
  fs.writeFileSync(path.join(__dirname, '..', 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  console.log('✓ Version bumped');

  // Build
  console.log('\n[1/3] Building webpack...');
  run('npx webpack --config webpack.config.js --mode production');

  console.log('\n[2/3] Building installer...');
  run('npx electron-builder --win --publish never');

  // Collect output files
  const releaseDir = path.join(__dirname, '..', 'release');
  const files = fs.readdirSync(releaseDir).filter(f => 
    f.endsWith('.exe') || f.endsWith('.yml') || f.endsWith('.blockmap')
  );

  if (files.length === 0) {
    console.error('No build files found in release/');
    process.exit(1);
  }

  console.log('\n  Built files:');
  files.forEach(f => {
    const size = fs.statSync(path.join(releaseDir, f)).size;
    console.log(`    ${f} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  });

  // Upload
  console.log('\n[3/3] Publishing...');
  if (uploadMethod === 'ftp') {
    for (const f of files) {
      const localPath = path.join(releaseDir, f);
      run(`curl -T "${localPath}" ftp://${FTP_HOST}${FTP_PATH}${f} --user ${FTP_USER}:${FTP_PASS}`);
    }
  } else if (uploadMethod === 'dir') {
    if (!fs.existsSync(PUBLISH_DIR)) fs.mkdirSync(PUBLISH_DIR, { recursive: true });
    for (const f of files) {
      fs.copyFileSync(path.join(releaseDir, f), path.join(PUBLISH_DIR, f));
      console.log(`  Copied ${f} → ${PUBLISH_DIR}`);
    }
  } else {
    console.log('\n  📁 Files are ready in the release/ folder');
    console.log('  Upload these files to your update server:');
    console.log(`    ${path.join(releaseDir)}`);
    console.log('\n  Required on server:');
    files.forEach(f => console.log(`    ${f}`));
    console.log('\n  Then update package.json "publish.url" to point to your server.');
  }

  console.log('\n========================================');
  console.log(`  ✅ v${newVersion} ready for distribution`);
  console.log('  Clients will auto-update on next launch');
  console.log('========================================');
}

main().catch(err => {
  console.error('Release failed:', err.message);
  process.exit(1);
});
