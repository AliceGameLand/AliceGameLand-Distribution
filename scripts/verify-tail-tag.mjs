import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const original = JSON.parse(await fs.readFile(path.join(root, 'distribution.json'), 'utf8'))
const distribution = JSON.parse(await fs.readFile(path.join(root, 'tail-tag-release-assets/distribution.json'), 'utf8'))
const otherServers = value => value.servers.filter(server => server.id !== 'AliceTailTag-26.2')
assert.deepEqual(otherServers(distribution), otherServers(original), 'Other server entries must stay unchanged')
const server = distribution.servers.find(server => server.id === 'AliceTailTag-26.2')
const source = distribution.servers.find(server => server.id === 'AliceCrimeScene-26.2')
assert.ok(server && source)
assert.equal(server.name, '혜안져스 꼬리잡기')
assert.equal(server.address, source.address)
assert.equal(server.mainServer, false)
assert.equal(server.autoconnect, source.autoconnect)
assert.deepEqual(server.modules.find(module => module.type === 'NeoForge'),
    source.modules.find(module => module.type === 'NeoForge'))
assert.equal(new Set(distribution.servers.map(value => value.id)).size, distribution.servers.length)
const expectedMods = new Set([
    // Required at runtime even though More Culling does not declare it in its metadata.
    'cloth-config-',
    'dynamic-fps-', 'fast-ip-ping-', 'ferritecore-', 'ImmediatelyFast-',
    'iris-', 'koreanify-', 'lithium-', 'moreculling-', 'sodium-'
])
const mods = server.modules.filter(module => module.artifact?.path?.startsWith('mods/'))
assert.equal(mods.length, expectedMods.size)
for(const prefix of expectedMods)
    assert.equal(mods.filter(module => path.posix.basename(module.artifact.path).startsWith(prefix)).length, 1)
assert.equal(server.modules.filter(module => module.artifact?.path?.startsWith('shaderpacks/')).length, 3)
assert.equal(new Set(server.modules.map(module => module.id)).size, server.modules.length)
const icon = await fs.readFile(path.join(root, 'server-icons/tail-tag.png'))
assert.equal(icon.readUInt32BE(16), 256)
assert.equal(icon.readUInt32BE(20), 256)
assert.ok((await fs.readFile(path.join(root, 'tail-tag-release-assets/tail-tag.png'))).equals(icon))
for(const module of server.modules) {
    assert.deepEqual(module, source.modules.find(value => value.id === module.id))
    const destination = module.artifact?.path
    if(!destination) continue
    assert.ok(!path.posix.isAbsolute(destination) && !destination.split('/').includes('..'))
    assert.equal(new URL(module.artifact.url).protocol, 'https:')
}
for(const destination of ['options.txt', 'config/iris.properties'])
    assert.equal(server.modules.find(module => module.artifact?.path === destination).artifact.MD5, undefined)

if(process.argv.includes('--remote')) {
    const queue = server.modules.filter(module => module.artifact?.path)
    const cache = path.join(root, 'validation-runtime/tail-tag')
    await fs.mkdir(cache, { recursive: true })
    // Check actual download bytes, including defaults without MD5 enforcement.
    await Promise.all(Array.from({ length: 4 }, async () => {
        while(queue.length) {
            const { artifact } = queue.shift()
            const response = await fetch(artifact.url)
            assert.ok(response.ok, `${response.status}: ${artifact.url}`)
            const bytes = Buffer.from(await response.arrayBuffer())
            assert.equal(bytes.length, artifact.size, `Size: ${artifact.path}`)
            if(artifact.MD5)
                assert.equal(crypto.createHash('md5').update(bytes).digest('hex'), artifact.MD5, artifact.path)
            await fs.writeFile(path.join(cache, artifact.path.replaceAll('/', '--')), bytes)
        }
    }))
    const options = await fs.readFile(path.join(cache, 'options.txt'), 'utf8')
    assert.match(options, /^tutorialStep:none\r?$/m)
    assert.match(options, /^guiScale:4\r?$/m)
    assert.match(options, /file\/pack\.zip/)
    const iris = await fs.readFile(path.join(cache, 'config--iris.properties'), 'utf8')
    assert.match(iris, /^enableShaders=true\r?$/m)
    assert.match(iris, /^shaderPack=ComplementaryReimagined_r5\.9\.1\.zip\r?$/m)
    const servers = await fs.readFile(path.join(cache, 'servers.dat'))
    assert.ok(servers.includes(Buffer.from(server.address)))
    console.log('Remote downloads, hashes, server address and first-install defaults verified.')
}
console.log('Tail Tag manifest, utility-only mods, shaders and settings preservation verified.')
