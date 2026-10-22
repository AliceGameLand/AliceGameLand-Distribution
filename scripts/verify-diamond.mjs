import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const delivery = process.env.ALICE_DIAMOND_DELIVERY ? path.resolve(process.env.ALICE_DIAMOND_DELIVERY) : path.resolve(root, '../alicehiyam-server/alice-diamond/deployment')
const distro = JSON.parse(await fs.readFile(path.join(root, 'distribution.json'), 'utf8'))
const manifest = JSON.parse(await fs.readFile(path.join(delivery, 'launcher/diamond-manifest.json'), 'utf8'))
const diamond = distro.servers.find(s => s.id === 'AliceDiamond-26.2')
assert(diamond)
assert.equal(diamond.minecraftVersion, '26.2')
assert.equal(diamond.version, '1.0.15')
assert.equal(distro.version, '1.0.15')
assert.equal(diamond.address, process.env.ALICE_DIAMOND_ADDRESS ?? '218.158.75.168:12345')
assert.equal(distro.servers.filter(s => s.mainServer).length, 1)
assert(diamond.mainServer)
assert(distro.servers.some(s => s.id === 'AliceGameLand-26.2'))
assert.equal(distro.discord?.clientId, '1552647446025216110')
assert(distro.servers.every(s => s.discord?.shortId && s.discord?.largeImageKey))
assert.equal(diamond.modules.filter(m => m.artifact?.path?.startsWith('shaderpacks/')).length,3)
assert(diamond.modules.some(m => m.artifact?.path?.startsWith('mods/iris-')))
assert(diamond.modules.some(m => m.artifact?.path?.startsWith('mods/sodium-')))
assert(diamond.modules.some(m => m.artifact?.path === 'config/iris.properties'))
assert.equal((await fs.readFile(path.join(delivery,'client/config/iris.properties'),'utf8')).match(/^enableShaders=(.*)$/m)?.[1], 'true')
assert(!diamond.modules.find(m => m.artifact?.path === 'config/iris.properties')?.artifact.MD5)
assert(!diamond.modules.find(m => m.artifact?.path === 'options.txt')?.artifact.MD5)
assert.match(await fs.readFile(path.join(root,'diamond-release-assets/options.txt'),'utf8'), /^guiScale:4$/m)
assert.equal((await fs.readFile(path.join(delivery,'client/config/neoforge-client.toml'),'utf8')).match(/^showLoadWarnings = (.*)$/m)?.[1], 'false')
assert(!diamond.modules.some(m => /camera|emotecraft|mcw-furniture|cushionbackport/i.test(m.artifact?.path ?? '')))
for (const record of manifest.records) {
    const bytes = await fs.readFile(record.source)
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), record.sha256, record.destination)
    assert.equal(bytes.length, record.size)
    if (record.asset) assert.deepEqual(await fs.readFile(path.join(root, 'diamond-release-assets', record.asset)), bytes)
    const module = diamond.modules.find(m => m.artifact?.path === record.destination)
    assert(module, record.destination)
    if (module.artifact.MD5) assert.equal(module.artifact.MD5, crypto.createHash('md5').update(bytes).digest('hex'))
    assert(!path.isAbsolute(record.destination) && !record.destination.split('/').includes('..'))
}
const backups = await fs.readdir(path.join(delivery, 'backups'))
let compared = false
for (const file of backups.filter(n => n.startsWith('distribution-before-diamond-'))) {
    const before = JSON.parse(await fs.readFile(path.join(delivery, 'backups', file), 'utf8'))
    if (before.servers.some(s => s.id === diamond.id)) continue
    for (const previous of before.servers) {
        const current = distro.servers.find(s => s.id === previous.id)
        const comparable = {...current, mainServer: previous.mainServer}
        if (!('discord' in previous)) delete comparable.discord
        assert.deepEqual(comparable, previous, `Existing instance changed: ${previous.id}`)
    }
    compared = true
}
assert(compared, 'Original distribution backup missing')
const result = `PASS: default diamond instance, ${manifest.records.length} local asset hashes, isolated paths, and existing instance preservation. Remote publication and launcher login are checked separately.\n`
await fs.writeFile(path.join(delivery, 'verification/distribution.txt'), result)
console.log(result.trim())
