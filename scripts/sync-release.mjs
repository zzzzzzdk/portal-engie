import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const packageJsonPath = path.join(projectRoot, 'package.json')
const releaseFile = path.join(projectRoot, 'release')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
const releaseContent = `v${packageJson.version || '0.0.0'}\n`

fs.writeFileSync(releaseFile, releaseContent, 'utf-8')

const outputDir = process.argv[2]
if (outputDir) {
  const targetDir = path.resolve(projectRoot, outputDir)
  fs.mkdirSync(targetDir, { recursive: true })
  fs.writeFileSync(path.join(targetDir, 'release'), releaseContent, 'utf-8')

  // Copy manifest directory to root dist/ only
  if (outputDir === 'dist') {
    const manifestSrc = path.join(projectRoot, 'manifest')
    if (fs.existsSync(manifestSrc)) {
      const manifestDest = path.join(targetDir, 'manifest')
      copyDir(manifestSrc, manifestDest)
    }
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
