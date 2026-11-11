import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distribution = JSON.parse(await fs.readFile(path.join(root, 'distribution.json'), 'utf8'))
const source = distribution.servers.find(server => server.id === 'AliceCrimeScene-26.2')
assert.ok(source, 'Crime Scene server entry is required')
assert.equal(source.minecraftVersion, '26.2')

// Explicitly select utilities so future Crime Scene content mods cannot leak into Tail Tag.
const modPrefixes = [
    // More Culling references Cloth Config's AutoConfig classes during startup.
    'cloth-config-',
    'dynamic-fps-', 'fast-ip-ping-', 'ferritecore-', 'ImmediatelyFast-',
    'iris-', 'koreanify-', 'lithium-', 'moreculling-', 'sodium-'
]
const configs = new Set([
    'dynamic_fps.json', 'ferritecore-mixin.toml', 'fml.toml',
    'immediatelyfast.json', 'iris-excluded.json', 'iris.properties',
    'lithium.properties', 'moreculling.toml', 'neoforge-client.toml',
    'neoforge-common.toml', 'sodium-mixins.properties', 'sodium-options.json'
])
const modules = source.modules.filter(module => {
    const destination = module.artifact?.path ?? ''
    if(module.type === 'NeoForge') return true
    if(destination.startsWith('mods/'))
        return modPrefixes.some(prefix => path.posix.basename(destination).startsWith(prefix))
    if(destination.startsWith('config/')) return configs.has(path.posix.basename(destination))
    return destination.startsWith('resourcepacks/') || destination.startsWith('shaderpacks/')
        || destination === 'options.txt' || destination === 'servers.dat'
})
assert.equal(modules.filter(module => module.artifact?.path?.startsWith('mods/')).length, modPrefixes.length)
assert.equal(modules.filter(module => module.type === 'NeoForge').length, 1)
for(const destination of ['options.txt', 'config/iris.properties']) {
    const module = modules.find(module => module.artifact?.path === destination)
    assert.ok(module, `Missing defaults: ${destination}`)
    assert.equal(module.artifact.MD5, undefined, `${destination} must preserve existing settings`)
}

const id = 'AliceTailTag-26.2'
const name = '혜안져스 꼬리잡기'
const icon = 'https://github.com/AliceGameLand/AliceGameLand-Distribution/releases/download/tail-tag-v1.0.0/tail-tag.png'
const existing = distribution.servers.find(server => server.id === id)
const server = {
    ...structuredClone(source), id, name, icon,
    discord: { shortId: name, largeImageText: name, largeImageKey: icon },
    version: existing?.version ?? '1.0.0', mainServer: false,
    modules: structuredClone(modules)
}
if(existing && JSON.stringify(existing.modules) !== JSON.stringify(server.modules)) {
    const version = existing.version.split('.').map(Number)
    version[2]++
    server.version = version.join('.')
}
// The shared endpoint and servers.dat intentionally follow Crime Scene.
assert.equal(server.address, source.address)
const stage = path.join(root, 'tail-tag-release-assets')
await fs.mkdir(stage, { recursive: true })
await fs.copyFile(path.join(root, 'server-icons/tail-tag.png'), path.join(stage, 'tail-tag.png'))

if(existing) distribution.servers[distribution.servers.indexOf(existing)] = server
else {
    const index = distribution.servers.findIndex(value => value.name.localeCompare(name, 'ko') > 0)
    distribution.servers.splice(index < 0 ? distribution.servers.length : index, 0, server)
}
const changed = !existing || JSON.stringify(existing) !== JSON.stringify(server)
if(changed) {
    const version = distribution.version.split('.').map(Number)
    version[2]++
    distribution.version = version.join('.')
}
const output = JSON.stringify(distribution, null, 2) + '\n'
// Stage the candidate without overwriting the checked-in multi-server manifest.
await fs.writeFile(path.join(stage, 'distribution.json'), output)
console.log(`Prepared ${name}: ${modPrefixes.length} utility mods; assets in ${stage}`)
