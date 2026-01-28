import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const type = process.argv[2] || 'patch';
const validTypes = ['patch', 'minor', 'major'];

if (!validTypes.includes(type)) {
  console.error(`Invalid version bump type: "${type}". Use one of: ${validTypes.join(', ')}`);
  process.exit(1);
}

const pkgPath = join(process.cwd(), 'package.json');
const lockPath = join(process.cwd(), 'package-lock.json');

if (!existsSync(pkgPath)) {
  console.error('package.json not found');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;

const parts = currentVersion.split('.').map(Number);
if (parts.length !== 3 || parts.some(isNaN)) {
  console.error(`Invalid current version in package.json: ${currentVersion}`);
  process.exit(1);
}

let [major, minor, patch] = parts;

if (type === 'major') {
  major++;
  minor = 0;
  patch = 0;
} else if (type === 'minor') {
  minor++;
  patch = 0;
} else {
  patch++;
}

const nextVersion = `${major}.${minor}.${patch}`;
console.log(`Bumping version: ${currentVersion} -> ${nextVersion}`);

// Update package.json
pkg.version = nextVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// Update package-lock.json if it exists
if (existsSync(lockPath)) {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  lock.version = nextVersion;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = nextVersion;
  }
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
}

try {
  console.log('Committing and tagging...');
  execSync(`git add package.json ${existsSync(lockPath) ? 'package-lock.json' : ''}`);
  execSync(`git commit -m "v${nextVersion}"`);
  execSync(`git tag v${nextVersion}`);
  console.log(`Successfully released v${nextVersion}`);
} catch (error) {
  console.error('Git operation failed. Make sure your working directory is clean or check git errors.');
  process.exit(1);
}
