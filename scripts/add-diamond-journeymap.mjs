import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const delivery = process.env.ALICE_DIAMOND_DELIVERY ? path.resolve(process.env.ALICE_DIAMOND_DELIVERY) : path.resolve(root, '../alicehiyam-server/alice-diamond/deployment')
const instance = process.env.ALICE_DIAMOND_INSTANCE
const hash = (bytes, algorithm) => crypto.createHash(algorithm).update(bytes).digest('hex')
const filename = 'journeymap-neoforge-26.2-6.0.10.jar'
const url = 'https://cdn.modrinth.com/data/lfHFW1mp/versions/S0bNIQSq/' + filename
const sha512 = 'd2a2245ff57bea0778db27b631e58c3363d3233f9dd6e1e4b60115e9c401a01ba733d6942764067a0c6c6cbfb76217f24dcf855651f5716667e3b189f42cfed8'
const source = path.join(delivery, 'client', 'mods', filename)
let bytes = await fs.readFile(source).catch(error => {
    if (error.code === 'ENOENT') return null
    throw error
})
if (!bytes) {
    const response = await fetch(url)
    assert(response.ok, `Download failed: ${response.status}`)
    bytes = Buffer.from(await response.arrayBuffer())
}
assert.equal(hash(bytes, 'sha512'), sha512, 'Official JourneyMap hash mismatch')
await fs.mkdir(path.dirname(source), { recursive: true })
await fs.writeFile(source, bytes)

const distroPath = path.join(root, 'distribution.json')
const original = await fs.readFile(distroPath, 'utf8')
const distro = JSON.parse(original)
const server = distro.servers.find(server => server.id === 'AliceDiamond-26.2')
assert.equal(server?.minecraftVersion, '26.2')
const manifestPath = path.join(delivery, 'launcher', 'diamond-manifest.json')
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const officialPath = path.join(delivery, 'launcher', 'official-mods.json')
const official = JSON.parse(await fs.readFile(officialPath, 'utf8'))
const backup = path.join(root, 'backups', `before-diamond-journeymap-${hash(Buffer.from(original), 'sha256').slice(0, 12)}.json`)
await fs.mkdir(path.dirname(backup), { recursive: true })
await fs.writeFile(backup, original, { flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error })

async function addFile(fileSource, destination, downloadUrl, asset) {
    const content = await fs.readFile(fileSource)
    const artifact = { size: content.length, url: downloadUrl, path: destination }
    artifact.MD5 = hash(content, 'md5')
    const module = { id: `diamond:${destination}`, name: path.basename(destination), type: 'File', artifact }
    server.modules = server.modules.filter(module => module.artifact?.path !== destination)
    server.modules.push(module)
    manifest.records = manifest.records.filter(record => record.destination !== destination)
    manifest.records.push({ destination, asset, source: fileSource, sha256: hash(content, 'sha256'), url: downloadUrl, size: content.length })
    if (asset) await fs.writeFile(path.join(root, 'diamond-release-assets', asset), content)
    if (instance) {
        const target = path.join(path.resolve(instance), destination)
        await fs.mkdir(path.dirname(target), { recursive: true })
        await fs.writeFile(target, content)
    }
}
await addFile(source, `mods/${filename}`, url, null)
official.splice(0, official.length, ...official.filter(record => record.project !== 'lfHFW1mp'), {
    project: 'lfHFW1mp', version: '26.2-6.0.10+neoforge', file: filename, url, sha512,
    sha1: hash(bytes, 'sha1'), md5: hash(bytes, 'md5'), size: bytes.length
})
// JourneyMap generates its own defaults; do not distribute another player's settings.
server.modules = server.modules.filter(module => !module.artifact?.path?.startsWith('journeymap/config/'))
manifest.records = manifest.records.filter(record => !record.destination.startsWith('journeymap/config/'))
manifest.published = false
const result = JSON.stringify(distro, null, 2) + '\n'
await fs.writeFile(distroPath, result)
await fs.writeFile(path.join(root, 'diamond-release-assets', 'distribution.json'), result)
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
await fs.writeFile(officialPath, JSON.stringify(official, null, 2) + '\n')
console.log(`Prepared JourneyMap 6.0.10 with mod defaults for ${server.id}${instance ? '; local instance installed' : ''}. Release remains unpublished.`)
