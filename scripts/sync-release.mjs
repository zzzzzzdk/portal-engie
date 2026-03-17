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
}
