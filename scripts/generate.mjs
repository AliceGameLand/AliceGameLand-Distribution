import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const prismMinecraft = process.env.ALICE_PRISM_MINECRAFT
    || 'C:\\Users\\gptnr\\AppData\\Roaming\\PrismLauncher\\instances\\26.2(2)\\minecraft'
const prismLibraries = process.env.ALICE_PRISM_LIBRARIES
    || 'C:\\Users\\gptnr\\AppData\\Roaming\\PrismLauncher\\libraries'
const launcherRoot = process.env.ALICE_LAUNCHER_ROOT
    || 'C:\\Users\\gptnr\\Desktop\\앨리스런쳐'

const releaseTag = 'client-v1.0.0'
const releaseBase = `https://github.com/Dot0420/AliceGameLand-Distribution/releases/download/${releaseTag}`
const neoForgeVersion = '26.2.0.59'
const minecraftVersion = '26.2'
const installer = path.join(prismLibraries, 'net', 'neoforged', 'neoforge', neoForgeVersion, `neoforge-${neoForgeVersion}-installer.jar`)
const releaseAssets = path.join(root, 'release-assets')

const licenses = {
    'camera-neoforge-1.1.9+26.2.jar': 'All Rights Reserved',
    'cloth-config-26.2.155.jar': 'LGPL-3.0',
    'cushionbackport-26.2-NeoForge-1.0.5.jar': 'MIT',
    'dynamic-fps-3.11.9+minecraft-26.2.0-neoforge.jar': 'MIT',
    'emotecraft-for-MC26.2-3.4.0-b.build.162.jar': 'GPL-3.0',
    'fast-ip-ping-v1.0.11-mc26.1.2.jar': 'LGPL-3.0',
    'ferritecore-9.0.0-neoforge.jar': 'MIT',
    'ImmediatelyFast-NeoForge-1.16.3+26.2.jar': 'LGPL-3.0-or-later',
    'iris-neoforge-1.11.2+mc26.2.jar': 'LGPL-3.0-only',
    'lithium-neoforge-0.25.3+mc26.2.jar': 'LGPL-3.0-only',
    'mcw-furniture-3.4.2-mc26.2neoforge.jar': 'All Rights Reserved',
    'moreculling-neoforge-26.2-1.8.1.jar': 'GPL-3.0-only',
    'PlayerAnimationLibMerged-1.2.6+mc.26.2.jar': 'MIT',
    'sodium-neoforge-0.9.1+mc26.2.jar': 'PolyForm-Shield-1.0.0'
}

const officialOnly = {
    'camera-neoforge-1.1.9+26.2.jar': 'https://mediafilez.forgecdn.net/files/8657/137/camera-neoforge-1.1.9%2B26.2.jar',
    'mcw-furniture-3.4.2-mc26.2neoforge.jar': 'https://mediafilez.forgecdn.net/files/8286/572/mcw-furniture-3.4.2-mc26.2neoforge.jar'
}

function digest(file, algorithm) {
    return crypto.createHash(algorithm).update(fs.readFileSync(file)).digest('hex')
}

function artifact(file, url, relativePath) {
    return {
        size: fs.statSync(file).size,
        MD5: digest(file, 'md5'),
        url,
        ...(relativePath == null ? {} : { path: relativePath.replaceAll('\\', '/') })
    }
}

async function stage(source, assetName) {
    const destination = path.join(releaseAssets, assetName)
    await fsp.copyFile(source, destination)
    return `${releaseBase}/${encodeURIComponent(assetName)}`
}

function stringPayload(value) {
    const bytes = Buffer.from(value, 'utf8')
    const length = Buffer.alloc(2)
    length.writeUInt16BE(bytes.length)
    return Buffer.concat([length, bytes])
}

function nbtString(name, value) {
    return Buffer.concat([Buffer.from([8]), stringPayload(name), stringPayload(value)])
}

function nbtByte(name, value) {
    return Buffer.concat([Buffer.from([1]), stringPayload(name), Buffer.from([value])])
}

function createServersDat() {
    const rootName = stringPayload('')
    const listName = stringPayload('servers')
    const listLength = Buffer.alloc(4)
    listLength.writeInt32BE(1)
    const server = Buffer.concat([
        nbtString('name', '앨리스의 게임랜드'),
        nbtString('ip', 'alicehiyam.dreamcraft.kr'),
        nbtByte('hidden', 0),
        nbtByte('acceptTextures', 1),
        Buffer.from([0])
    ])
    return zlib.gzipSync(Buffer.concat([
        Buffer.from([10]), rootName,
        Buffer.from([9]), listName, Buffer.from([10]), listLength,
        server,
        Buffer.from([0])
    ]))
}

function readInstallerJson(entry) {
    return JSON.parse(execFileSync('tar', ['-xOf', installer, entry], { encoding: 'utf8' }))
}

function libraryModule(library, classpath = true) {
    const info = library.downloads.artifact
    const local = path.join(prismLibraries, ...info.path.split('/'))
    if(!fs.existsSync(local)) {
        throw new Error(`Missing NeoForge runtime library: ${local}`)
    }
    return {
        id: library.name,
        name: library.name,
        type: 'Library',
        classpath,
        artifact: artifact(local, info.url)
    }
}

async function fileModule(source, destination, assetName, urlOverride) {
    const url = urlOverride || await stage(source, assetName)
    return {
        id: path.basename(destination),
        name: path.basename(destination),
        type: 'File',
        artifact: artifact(source, url, destination)
    }
}

await fsp.rm(releaseAssets, { recursive: true, force: true })
await fsp.mkdir(releaseAssets, { recursive: true })

if(!fs.existsSync(installer)) {
    throw new Error(`NeoForge installer not found: ${installer}`)
}

const versionJson = readInstallerJson('version.json')
const installProfile = readInstallerJson('install_profile.json')
const versionManifestFile = path.join(releaseAssets, `neoforge-${neoForgeVersion}-version.json`)
await fsp.writeFile(versionManifestFile, `${JSON.stringify(versionJson, null, 2)}\n`)

const versionManifestModule = {
    id: versionJson.id,
    name: `NeoForge ${neoForgeVersion} Version Manifest`,
    type: 'VersionManifest',
    artifact: artifact(
        versionManifestFile,
        `${releaseBase}/${encodeURIComponent(path.basename(versionManifestFile))}`
    )
}

const runtimeLibraries = versionJson.libraries.map(library => libraryModule(library))
const universal = installProfile.libraries.find(library => library.name === `net.neoforged:neoforge:${neoForgeVersion}:universal`)
if(universal == null) {
    throw new Error('NeoForge universal runtime was not declared by the installer.')
}
runtimeLibraries.push(libraryModule(universal, false))

const neoForgeModule = {
    id: `net.neoforged:neoforge:${neoForgeVersion}:installer`,
    name: `NeoForge ${neoForgeVersion}`,
    type: 'NeoForge',
    artifact: artifact(
        installer,
        `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoForgeVersion}/neoforge-${neoForgeVersion}-installer.jar`
    ),
    subModules: [versionManifestModule, ...runtimeLibraries]
}

const modules = [neoForgeModule]
const modRecords = []
const modsDirectory = path.join(prismMinecraft, 'mods')
for(const name of (await fsp.readdir(modsDirectory)).sort((a, b) => a.localeCompare(b))) {
    if(!name.endsWith('.jar')) continue
    const source = path.join(modsDirectory, name)
    const urlOverride = officialOnly[name]
    modules.push(await fileModule(source, `mods/${name}`, `mod--${name}`, urlOverride))
    modRecords.push({
        file: name,
        license: licenses[name] || 'Unknown',
        source: urlOverride || `${releaseBase}/${encodeURIComponent(`mod--${name}`)}`,
        sha1: digest(source, 'sha1'),
        sha256: digest(source, 'sha256')
    })
}

const configDirectory = path.join(prismMinecraft, 'config')
for(const name of (await fsp.readdir(configDirectory)).sort((a, b) => a.localeCompare(b))) {
    const source = path.join(configDirectory, name)
    if(!(await fsp.stat(source)).isFile()) continue
    modules.push(await fileModule(source, `config/${name}`, `config--${name}`))
}

const pack = path.join(prismMinecraft, 'resourcepacks', 'pack.zip')
modules.push(await fileModule(pack, 'resourcepacks/pack.zip', 'resourcepacks--pack.zip'))

const optionsFile = path.join(releaseAssets, 'options.txt')
await fsp.writeFile(optionsFile, [
    'resourcePacks:["vanilla","mod_resources","file/pack.zip"]',
    'incompatibleResourcePacks:[]',
    'lang:ko_kr',
    'onboardAccessibility:false',
    ''
].join('\n'))
modules.push(await fileModule(optionsFile, 'options.txt', 'options.txt'))

const serversFile = path.join(releaseAssets, 'servers.dat')
await fsp.writeFile(serversFile, createServersDat())
modules.push(await fileModule(serversFile, 'servers.dat', 'servers.dat'))

const iconSource = path.join(launcherRoot, 'app', 'assets', 'images', 'AliceGameLand.png')
const iconUrl = await stage(iconSource, 'server-icon.png')

const distribution = {
    version: '1.0.0',
    rss: 'https://github.com/Dot0420/AliceGameLand-Launcher/releases.atom',
    servers: [{
        id: 'AliceGameLand-26.2',
        name: '앨리스의 게임랜드',
        description: 'Minecraft 26.2 · NeoForge 전용 서버',
        icon: iconUrl,
        version: '1.0.0',
        address: 'alicehiyam.dreamcraft.kr',
        minecraftVersion,
        javaOptions: {
            supported: '>=25.x <26',
            suggestedMajor: 25,
            distribution: 'TEMURIN',
            ram: {
                recommended: 4096,
                minimum: 2048
            }
        },
        mainServer: true,
        autoconnect: true,
        modules
    }]
}

const distributionText = `${JSON.stringify(distribution, null, 2)}\n`
await fsp.writeFile(path.join(root, 'distribution.json'), distributionText)
await fsp.writeFile(path.join(releaseAssets, 'distribution.json'), distributionText)
await fsp.writeFile(path.join(root, 'mod-manifest.json'), `${JSON.stringify(modRecords, null, 2)}\n`)

console.log(`Generated ${modules.length} top-level modules and ${runtimeLibraries.length} NeoForge libraries.`)
console.log(`Release assets: ${releaseAssets}`)

