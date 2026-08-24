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
if(server.address !== 'alicehiyam.dreamcraft.kr:25567') throw new Error('Unexpected server address.')
if(server.minecraftVersion !== '26.2') throw new Error('Unexpected Minecraft version.')
if(!server.modules.some(module => module.type === 'NeoForge')) throw new Error('NeoForge module missing.')
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

console.log('Distribution verification passed.')
console.log(`Server: ${server.name} (${server.address})`)
console.log(`Mods: ${manifest.length}`)
