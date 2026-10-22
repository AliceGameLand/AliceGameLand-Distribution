import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const content = path.resolve(root, '../alicehiyam-server/alice-crime-scene/mod-porting/release')
const manifest = JSON.parse(await fs.readFile(path.join(content, 'mod-manifest.json'), 'utf8'))
const compatibleMods = manifest.mods.filter(record => record.compatible === true)
assert.ok(compatibleMods.length > 0, 'No tested compatible mods: do not publish an empty or incompatible launcher update.')
const localPath = path.join(root, 'distribution.json')
const original = await fs.readFile(localPath, 'utf8')
const distro = JSON.parse(original)
const response = await fetch(`https://github.com/Dot0420/AliceGameLand-Distribution/releases/latest/download/distribution.json?check=${Date.now()}`)
assert.ok(response.ok, `Published distribution returned ${response.status}`)
assert.deepEqual(distro, await response.json(), 'Local and published distributions differ; inspect before updating.')
const previousServers = structuredClone(distro.servers)
const crime = distro.servers.find(server => server.id === 'AliceCrimeScene-26.2')
assert.ok(crime)
assert.equal(crime.minecraftVersion, '26.2')
assert.equal(crime.address, '146.56.114.53:25566')
for (const record of compatibleMods) {
    const bytes = await fs.readFile(path.join(content, 'mods', record.file))
    assert.equal(bytes.length, record.size)
    assert.equal(crypto.createHash('md5').update(bytes).digest('hex'), record.MD5)
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), record.SHA256)
    const destination = `mods/${record.file}`
    assert.ok(!crime.modules.some(module => module.artifact?.path === destination), `${destination} already installed`)
    // Official files use the author's CDN; Alice compatibility files use the server host.
    crime.modules.push({ id: record.file, name: record.file, type: 'File',
        artifact: { size: record.size, MD5: record.MD5, url: record.url, path: destination } })
}
crime.version = '1.0.2'
distro.version = '1.0.18'
for (const previous of previousServers.filter(server => server.id !== crime.id))
    assert.deepEqual(distro.servers.find(server => server.id === previous.id), previous)
assert.equal(new Set(crime.modules.map(module => module.id)).size, crime.modules.length)
const backup = path.join(root, 'backups', `crime-content-${Date.now()}`)
await fs.mkdir(backup, { recursive: true })
await fs.writeFile(path.join(backup, 'distribution.json'), original)
const staged = path.join(root, 'crime-content-release-assets')
await fs.mkdir(staged, { recursive: true })
const updated = JSON.stringify(distro, null, 2) + '\n'
await fs.writeFile(localPath, updated)
await fs.writeFile(path.join(staged, 'distribution.json'), updated)
console.log(JSON.stringify({ backup, staged, version: distro.version, crimeVersion: crime.version,
    addedMods: compatibleMods.length, moduleCount: crime.modules.length }, null, 2))
