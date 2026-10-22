import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distribution = JSON.parse(fs.readFileSync(path.join(root, 'distribution.json'), 'utf8'))
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'mod-manifest.json'), 'utf8'))
const assets = path.join(root, 'release-assets')

if(distribution.servers.length !== 1) throw new Error('Expected exactly one server.')
const server = distribution.servers[0]
const packModule = server.modules.find(module => module.artifact?.path === 'resourcepacks/pack.zip')
const packBytes = fs.readFileSync(path.join(assets, 'resourcepacks--pack.zip'))
if(!packModule || packModule.artifact.size !== packBytes.length
    || packModule.artifact.MD5 !== crypto.createHash('md5').update(packBytes).digest('hex'))
    throw new Error('Resource pack size/hash mismatch.')
if(server.address !== 'alicehiyam.dreamcraft.kr:25567') throw new Error('Unexpected server address.')
if(server.minecraftVersion !== '26.2') throw new Error('Unexpected Minecraft version.')
if(!server.modules.some(module => module.type === 'NeoForge')) throw new Error('NeoForge module missing.')
const optionsModule = server.modules.find(module => module.artifact?.path === 'options.txt')
const irisModule = server.modules.find(module => module.artifact?.path === 'config/iris.properties')
if(!irisModule || irisModule.artifact.MD5 != null)
    throw new Error('Iris defaults must be download-if-missing to preserve shader settings.')
const irisDefaults = fs.readFileSync(path.join(assets, 'config--iris.properties'), 'utf8')
if(!irisDefaults.split(/\r?\n/).includes('shaderPack=ComplementaryReimagined_r5.9.1.zip')
    || !irisDefaults.split(/\r?\n/).includes('enableShaders=true'))
    throw new Error('First-install default shader must be enabled Complementary Reimagined r5.9.1.')
if(!optionsModule || optionsModule.artifact.MD5 != null)
    throw new Error('options.txt must be download-if-missing to preserve personal settings.')
if(manifest.length !== 15) throw new Error(`Expected 15 mods, found ${manifest.length}.`)

for(const record of manifest) {
    const local = record.source.includes('mediafilez.forgecdn.net')
        ? null
        : path.join(assets, `mod--${record.file}`)
    if(local != null) {
        const sha256 = crypto.createHash('sha256').update(fs.readFileSync(local)).digest('hex')
        if(sha256 !== record.sha256) throw new Error(`Hash mismatch: ${record.file}`)
    }
}

const requiredAssets = ['distribution.json', 'options.txt', 'servers.dat', 'resourcepacks--pack.zip', 'server-icon.png']
for(const name of requiredAssets) {
    if(!fs.existsSync(path.join(assets, name))) throw new Error(`Release asset missing: ${name}`)
}

const serversData = fs.readFileSync(path.join(assets, 'servers.dat'))
if(serversData[0] !== 10) throw new Error('servers.dat must use uncompressed NBT.')
if(!serversData.includes(Buffer.from('앨리스의 게임랜드'))) throw new Error('Server list name missing.')
if(!serversData.includes(Buffer.from('alicehiyam.dreamcraft.kr:25567'))) throw new Error('Server list address missing.')

console.log('Distribution verification passed.')
console.log(`Server: ${server.name} (${server.address})`)
console.log(`Mods: ${manifest.length}`)

const emoteManifestPath = path.join(root, 'emote-manifest.json')
if(fs.existsSync(emoteManifestPath)) {
    const emotes = JSON.parse(fs.readFileSync(emoteManifestPath, 'utf8')).emotes
    const config = JSON.parse(fs.readFileSync(path.join(assets, 'config--emotecraft.json'), 'utf8'))
    if(emotes.length !== 8) throw new Error('Expected 8 emotes.')
    for(const emote of emotes) {
        const bytes = fs.readFileSync(path.join(assets, emote.asset))
        const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
        if(sha256 !== emote.sha256) throw new Error(`Emote hash mismatch: ${emote.file}`)
        if(!Buffer.from(config.fastmenu['0'][String(emote.slot - 1)], 'base64').equals(bytes))
            throw new Error(`Wheel slot mismatch: ${emote.slot}`)
        const module = server.modules.find(value => value.artifact?.path === `emotes/${emote.file}`)
        if(!module || module.artifact.MD5 !== crypto.createHash('md5').update(bytes).digest('hex'))
            throw new Error(`Emote module mismatch: ${emote.file}`)
    }
    console.log('8 emotes and first-page wheel slots verified.')
}

const shaderManifestPath = path.join(root, 'shader-manifest.json')
if(fs.existsSync(shaderManifestPath)) {
    const shaders = JSON.parse(fs.readFileSync(shaderManifestPath, 'utf8')).shaders
    if(shaders.length !== 3) throw new Error('Expected 3 default shaderpacks.')
    for(const shader of shaders) {
        const bytes = fs.readFileSync(path.join(root, 'client-defaults', 'shaderpacks', shader.file))
        const module = server.modules.find(value => value.id === `shader-${shader.slug}`)
        if(crypto.createHash('sha512').update(bytes).digest('hex') !== shader.sha512)
            throw new Error(`Shader official hash mismatch: ${shader.file}`)
        if(!module || module.artifact.path !== `shaderpacks/${shader.file}`
            || module.artifact.url !== shader.url || module.artifact.size !== bytes.length
            || module.artifact.MD5 !== crypto.createHash('md5').update(bytes).digest('hex'))
            throw new Error(`Shader module mismatch: ${shader.file}`)
    }
    console.log('3 official shaderpacks verified.')
}
