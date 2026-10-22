import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const filename = 'plasmovoice-neoforge-26.2-2.1.17.jar'
const jar = path.resolve(root, '../alicehiyam-server/alice-crime-scene/deployment/plasmo-voice', filename)
const url = `https://cdn.modrinth.com/data/1bZhdhsH/versions/QqZ4grre/${filename}`
const expectedSha512 = '6db001b584bad981985673e9596c3de25326147d751d2d9b401c755e4ea024af03db562a495ba5c8b6a1c20087b491b6e7ebd9a43500175df97f82317eaf9d5d'
const bytes = await fs.readFile(jar)
assert.equal(bytes.length, 12220926, 'Unexpected Plasmo Voice file size')
assert.equal(crypto.createHash('sha512').update(bytes).digest('hex'), expectedSha512,
    'Plasmo Voice differs from the official NeoForge 26.2 file')

const distributionPath = path.join(root, 'distribution.json')
const original = await fs.readFile(distributionPath, 'utf8')
const distribution = JSON.parse(original)
assert.equal(distribution.version, '1.0.26')
const crime = distribution.servers.find(server => server.id === 'AliceCrimeScene-26.2')
assert.ok(crime, 'Crime Scene server entry is missing')
assert.equal(crime.version, '1.0.3')
assert.equal(crime.minecraftVersion, '26.2')
assert.ok(crime.modules.some(module => module.type === 'NeoForge'))
assert.ok(!crime.modules.some(module => /plasmovoice/i.test(module.id)
    || module.artifact?.path === `mods/${filename}`), 'Plasmo Voice is already configured')

const lastMod = crime.modules.findLastIndex(module => module.artifact?.path?.startsWith('mods/'))
assert.ok(lastMod >= 0)
crime.modules.splice(lastMod + 1, 0, {
    id: filename,
    name: filename,
    type: 'File',
    artifact: {
        size: bytes.length,
        MD5: crypto.createHash('md5').update(bytes).digest('hex'),
        url,
        path: `mods/${filename}`
    }
})
crime.version = '1.0.5'
distribution.version = '1.0.27'

const backup = path.join(root, 'backups',
    `distribution-before-crime-plasmo-${crypto.createHash('sha256').update(original).digest('hex').slice(0, 12)}.json`)
await fs.mkdir(path.dirname(backup), { recursive: true })
await fs.writeFile(backup, original, { flag: 'wx' })
await fs.writeFile(distributionPath, `${JSON.stringify(distribution, null, 2)}\n`)
console.log(`Added ${filename} to ${crime.id}; previous distribution: ${backup}`)
