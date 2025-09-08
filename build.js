// build.js
const fs = require('fs-extra');
const path = require('path');

const SRC_DIR = __dirname;
const DIST_DIR = path.join(SRC_DIR, 'dist');
const REQUIRED = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'sidebar.html',
  'sidebar.js',
  'options.html',
  'options.js',
  'styles.css'
];
const DIRS = ['lib', 'icons'];

(async () => {
  try {
    // Clean dist for deterministic builds
    await fs.remove(DIST_DIR);
    await fs.mkdirp(DIST_DIR);

    // Validate manifest exists and is MV3
    const manifestPath = path.join(SRC_DIR, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('manifest.json not found at project root.');
    }
    const manifest = await fs.readJson(manifestPath);
    if (manifest.manifest_version !== 3) {
      throw new Error('manifest.json must have "manifest_version": 3 for Firefox MV3.');
    }

    console.log('Copying files...');
    for (const file of REQUIRED) {
      const src = path.join(SRC_DIR, file);
      const dest = path.join(DIST_DIR, file);
      if (!fs.existsSync(src)) {
        console.warn(`⚠️ Missing file: ${file}`);
        continue;
      }
      await fs.copy(src, dest);
      console.log(`✓ ${file}`);
    }

    for (const dir of DIRS) {
      const src = path.join(SRC_DIR, dir);
      const dest = path.join(DIST_DIR, dir);
      if (fs.existsSync(src)) {
        await fs.copy(src, dest);
        console.log(`✓ ${dir}/`);
      } else {
        console.warn(`⚠️ Missing directory: ${dir}/`);
      }
    }

    // Optional: write build metadata
    const meta = {
      builtAt: new Date().toISOString(),
      version: manifest.version || '0.0.0',
      name: manifest.name || 'Callosum'
    };
    await fs.writeJson(path.join(DIST_DIR, 'build-info.json'), meta, { spaces: 2 });

    console.log('\n✨ Build complete.');
    console.log(`📦 ${DIST_DIR}`);
  } catch (err) {
    console.error('❌ Build failed:', err.message);
    process.exit(1);
  }
})();
