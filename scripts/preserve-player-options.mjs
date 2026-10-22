import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const filename = path.join(root, 'distribution.json')
const original = await fs.readFile(filename, 'utf8')
const distribution = JSON.parse(original)
const response = await fetch(`https://github.com/AliceGameLand/AliceGameLand-Distribution/releases/download/client-v1.0.0/distribution.json?verify=${Date.now()}`)
if(!response.ok) throw new Error(`Remote fetch failed: ${response.status}`)
assert.deepEqual(await response.json(), distribution, 'Remote distribution differs; refusing overwrite.')
const backup = path.join(root, 'backups', `before-preserve-options-${new Date().toISOString().replaceAll(':', '-')}`)
await fs.mkdir(backup, { recursive: true })
await fs.copyFile(filename, path.join(backup, 'distribution.json'))
const options = distribution.servers[0].modules.find(module => module.artifact?.path === 'options.txt')
assert.ok(options, 'options.txt module missing')
delete options.artifact.MD5
distribution.servers[0].version = '1.0.3'
const text = `${JSON.stringify(distribution, null, 2)}\n`
await fs.writeFile(filename, text)
await fs.writeFile(path.join(root, 'release-assets', 'distribution.json'), text)
console.log(`options.txt is now download-if-missing only. Backup: ${backup}`)
