import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const server = 'C:/Users/gptnr/Desktop/alice-26-2'
const instance = 'C:/Users/gptnr/AppData/Roaming/.alicegameland/instances/AliceGameLand-26.2'
const defaults = path.join(root, 'client-defaults')
const assets = path.join(root, 'release-assets')
const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-')
const backup = path.join(root, 'backups', `before-emotes-${stamp}`)
const files = [
    'Zero Two Wiggle.emotecraft',
    'Naruto Run (Movement) (Multiverse) (Naruto).emotecraft',
    'Twerk (Dance).emotecraft',
    'Brakedance.emotecraft',
    'Macarena (Dance).emotecraft',
    'Dance Moves.emotecraft',
    'Skibidi dob dob (Dance).emotecraft',
    'Jiggle your ass (Dance).emotecraft'
]
const bytes = files.map(name => fs.readFileSync(path.join('C:/Users/gptnr/Downloads', name)))
const hash = (buffer, algorithm = 'sha256') => crypto.createHash(algorithm).update(buffer).digest('hex')
const configPath = path.join(assets, 'config--emotecraft.json')
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
assert.equal(config.config_version, 5)

fs.mkdirSync(backup, { recursive: true })
for (const [label, source] of [
    ['distribution.json', path.join(root, 'distribution.json')],
    ['default-emotecraft.json', configPath],
    ['local-emotecraft.json', path.join(instance, 'config/emotecraft.json')],
    ['server-emotecraft.json', path.join(server, 'config/emotecraft.json')]
]) {
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(backup, label))
}
for (const [label, source] of [['server-emotes', path.join(server, 'emotes')], ['local-emotes', path.join(instance, 'emotes')]]) {
    if (fs.existsSync(source)) fs.cpSync(source, path.join(backup, label), { recursive: true })
}

config.fastmenu ??= {}
config.fastmenu['0'] = Object.fromEntries(bytes.map((buffer, index) => [String(index), buffer.toString('base64')]))
const configBytes = Buffer.from(`${JSON.stringify(config, null, 2)}\n`)
for (const target of [configPath, path.join(defaults, 'config/emotecraft.json')]) {
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, configBytes)
}
// Preserve local client options and other wheel pages; replace the requested first page only.
const localConfigPath = path.join(instance, 'config/emotecraft.json')
const localConfig = fs.existsSync(localConfigPath) ? JSON.parse(fs.readFileSync(localConfigPath, 'utf8')) : structuredClone(config)
localConfig.config_version = 5
localConfig.fastmenu ??= {}
localConfig.fastmenu['0'] = config.fastmenu['0']
fs.mkdirSync(path.dirname(localConfigPath), { recursive: true })
fs.writeFileSync(localConfigPath, `${JSON.stringify(localConfig, null, 2)}\n`)

const distro = JSON.parse(fs.readFileSync(path.join(root, 'distribution.json'), 'utf8'))
const modules = distro.servers[0].modules
const baseUrl = 'https://github.com/AliceGameLand/AliceGameLand-Distribution/releases/download/client-v1.0.0'
const configModule = modules.find(module => module.artifact?.path === 'config/emotecraft.json')
assert.ok(configModule, 'Emotecraft config module missing')
configModule.artifact.size = configBytes.length
configModule.artifact.MD5 = hash(configBytes, 'md5')
const records = []
for (let index = 0; index < files.length; index++) {
    const name = files[index]
    const buffer = bytes[index]
    const assetName = `emote--${String(index + 1).padStart(2, '0')}.emotecraft`
    for (const directory of [path.join(defaults, 'emotes'), path.join(server, 'emotes'), path.join(instance, 'emotes')]) {
        fs.mkdirSync(directory, { recursive: true })
        fs.writeFileSync(path.join(directory, name), buffer)
    }
    fs.writeFileSync(path.join(assets, assetName), buffer)
    const destination = `emotes/${name}`
    const module = {
        id: `alice-emote-${index + 1}`, name, type: 'File',
        artifact: { size: buffer.length, MD5: hash(buffer, 'md5'), url: `${baseUrl}/${assetName}`, path: destination }
    }
    const existing = modules.findIndex(value => value.artifact?.path === destination)
    if (existing >= 0) modules[existing] = module
    else modules.push(module)
    records.push({ slot: index + 1, file: name, asset: assetName, sha256: hash(buffer), size: buffer.length })
    assert.deepEqual(Buffer.from(config.fastmenu['0'][String(index)], 'base64'), buffer)
}
distro.servers[0].version = '1.0.1'
const distroText = `${JSON.stringify(distro, null, 2)}\n`
for (const target of [path.join(root, 'distribution.json'), path.join(assets, 'distribution.json')]) fs.writeFileSync(target, distroText)
const manifest = { createdAt: new Date().toISOString(), backup, emotes: records }
fs.writeFileSync(path.join(root, 'emote-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Applied ${files.length} emotes and first-page slots. Backup: ${backup}`)
console.log(records.map(record => `${record.slot}: ${record.file}`).join('\n'))
