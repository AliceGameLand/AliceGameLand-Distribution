import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const delivery = process.env.ALICE_DIAMOND_DELIVERY ? path.resolve(process.env.ALICE_DIAMOND_DELIVERY) : path.resolve(root, '../alicehiyam-server/alice-diamond/deployment')
const assets = path.join(root, 'diamond-release-assets')
const cache = path.join(delivery, 'launcher', 'libraries')
const base = 'https://github.com/AliceGameLand/AliceGameLand-Distribution/releases/download/diamond-v1.0.15'
const diamondAddress = process.env.ALICE_DIAMOND_ADDRESS ?? 'alicehiyam.dreamcraft.kr'
const version = '26.2.0.60'
await fs.mkdir(assets, { recursive: true })
await fs.mkdir(cache, { recursive: true })
const digest = (bytes, algorithm = 'md5') => crypto.createHash(algorithm).update(bytes).digest('hex')
async function download(url, file, sha1) {
    let bytes = await fs.readFile(file).catch(() => null)
    if (!bytes || (sha1 && digest(bytes, 'sha1') !== sha1)) {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`)
        bytes = Buffer.from(await response.arrayBuffer())
        if (sha1 && digest(bytes, 'sha1') !== sha1) throw new Error(`SHA-1 mismatch: ${url}`)
        await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, bytes)
    }
    return bytes
}
const artifact = (bytes, url, destination) => ({ size: bytes.length, MD5: digest(bytes), url, ...(destination ? { path: destination } : {}) })
const installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${version}/neoforge-${version}-installer.jar`
const installer = path.join(cache, `neoforge-${version}-installer.jar`)
const installerBytes = await download(installerUrl, installer)
const json = name => JSON.parse(execFileSync('tar', ['-xOf', installer, name], { encoding: 'utf8' }))
const manifest = json('version.json'), profile = json('install_profile.json')
const manifestName = `neoforge-${version}-version.json`
const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
await fs.writeFile(path.join(assets, manifestName), manifestBytes)
const libraries = await Promise.all([...manifest.libraries, profile.libraries.find(l => l.name === `net.neoforged:neoforge:${version}:universal`)].map(async library => {
    if (!library) throw new Error('NeoForge universal missing')
    const info = library.downloads.artifact
    const bytes = await download(info.url, path.join(cache, info.path), info.sha1)
    return { id: library.name, name: library.name, type: 'Library', classpath: !library.name.endsWith(':universal'), artifact: artifact(bytes, info.url) }
}))
const modules = [{ id: `net.neoforged:neoforge:${version}:installer`, name: `NeoForge ${version}`, type: 'NeoForge', artifact: artifact(installerBytes, installerUrl), subModules: [
    { id: manifest.id, name: `NeoForge ${version} Version Manifest`, type: 'VersionManifest', artifact: artifact(manifestBytes, `${base}/${manifestName}`) }, ...libraries
] }]
const records = []
const original = await fs.readFile(path.join(root,'distribution.json'),'utf8')
const distro = JSON.parse(original)
const existing = distro.servers.find(s => s.id === 'AliceGameLand-26.2')
if(!existing)throw new Error('Existing minigame instance missing')
const oldFiles = new Map(existing.modules.filter(m => m.artifact?.path).map(m => [m.artifact.path,m]))
const selectedMods = ['cloth-config-','dynamic-fps-','fast-ip-ping-','ferritecore-','ImmediatelyFast-','iris-','koreanify-','lithium-','moreculling-','sodium-']
const selectedConfigs = ['dynamic_fps.json','ferritecore-mixin.toml','immediatelyfast.json','iris-excluded.json',
    'iris.properties','lithium.properties','moreculling.toml','neoforge-client.toml','sodium-fingerprint.json',
    'sodium-mixins.properties','sodium-options.json']
const selectedModUrls = new Map()
for (const [destination, module] of oldFiles) {
    if (!destination.startsWith('mods/') || !selectedMods.some(prefix => path.basename(destination).startsWith(prefix))) continue
    const name = path.basename(destination)
    const bytes = await fs.readFile(path.join(root,'release-assets',`mod--${name}`))
    if (digest(bytes) !== module.artifact.MD5) throw new Error(`Existing mod hash mismatch: ${name}`)
    await fs.writeFile(path.join(delivery,'client','mods',name),bytes)
    selectedModUrls.set(name,module.artifact.url)
}
async function fileModule(source, destination, assetName, officialUrl, preserve = false) {
    const bytes = await fs.readFile(source)
    let url = officialUrl
    if (!url) { await fs.writeFile(path.join(assets, assetName), bytes); url = `${base}/${encodeURIComponent(assetName)}?v=${digest(bytes,'sha256').slice(0,12)}` }
    const info = artifact(bytes,url,destination)
    if (preserve) delete info.MD5
    modules.push({ id: `diamond:${destination}`, name: path.basename(destination), type: 'File', artifact: info })
    records.push({ destination, asset: officialUrl ? null : assetName, source, sha256: digest(bytes,'sha256'), url, size: bytes.length })
}
const official = JSON.parse(await fs.readFile(path.join(delivery,'launcher','official-mods.json'),'utf8'))
for (const name of (await fs.readdir(path.join(delivery,'client','mods'))).filter(n => n.endsWith('.jar')).sort()) {
    const record = official.find(r => r.file === name)
    const source = path.join(delivery,'client','mods',name)
    if (record && digest(await fs.readFile(source),'sha512') !== record.sha512) throw new Error(`Official mod hash mismatch: ${name}`)
    await fileModule(source,`mods/${name}`,`mod--${name}`,record?.url ?? selectedModUrls.get(name))
}
await fileModule(path.join(delivery,'client','resourcepacks','alice-diamond.zip'),'resourcepacks/alice-diamond.zip','resourcepacks--alice-diamond.zip')
// Seed the multiplayer entry only when no player-managed server list exists.
await fileModule(path.join(delivery,'client','servers.dat'),'servers.dat','diamond-servers.dat',null,true)
for (const name of selectedConfigs) {
    const module = oldFiles.get(`config/${name}`)
    if (!module) throw new Error(`Existing client config missing: ${name}`)
    const source = path.join(root,'release-assets',`config--${name}`)
    const bytes = await fs.readFile(source)
    if (bytes.length !== module.artifact.size) throw new Error(`Existing config size mismatch: ${name}`)
    if (name === 'iris.properties') {
        // Only seed the shader choice when the instance has no Iris settings yet.
        const defaultSource = path.join(delivery,'client','config',name)
        await fs.mkdir(path.dirname(defaultSource),{recursive:true})
        await fs.writeFile(defaultSource,bytes)
        await fileModule(defaultSource,`config/${name}`,`config--${name}`,null,true)
    } else if (name === 'neoforge-client.toml') {
        // Metadata-only warnings stay in logs but need not interrupt every launch.
        const before = 'showLoadWarnings = true'
        const after = 'showLoadWarnings = false'
        const safe = Buffer.from(bytes.toString('utf8').replace(before,after))
        if (safe.equals(bytes)) throw new Error(`Expected client setting missing: ${before}`)
        const safeSource = path.join(delivery,'client','config',name)
        await fs.mkdir(path.dirname(safeSource),{recursive:true})
        await fs.writeFile(safeSource,safe)
        await fileModule(safeSource,`config/${name}`,`config--${name}`)
    } else await fileModule(source,`config/${name}`,`config--${name}`,module.artifact.url,true)
}
for (const [destination,module] of oldFiles) {
    if (!destination.startsWith('shaderpacks/')) continue
    const source = path.join(root,'client-defaults','shaderpacks',path.basename(destination))
    const bytes = await fs.readFile(source)
    if (digest(bytes) !== module.artifact.MD5) throw new Error(`Existing shader hash mismatch: ${destination}`)
    await fileModule(source,destination,`shader--${path.basename(destination)}`,module.artifact.url)
}
const options = path.join(assets,'options.txt')
await fs.writeFile(options,'lang:ko_kr\nresourcePacks:["vanilla","mod_resources","file/alice-diamond.zip"]\nincompatibleResourcePacks:[]\nguiScale:4\nonboardAccessibility:false\ntutorialStep:none\n')
await fileModule(options,'options.txt','options.txt',null,true)
await fs.mkdir(path.join(delivery,'backups'),{recursive:true})
const backup = path.join(delivery,'backups',`distribution-before-diamond-${digest(Buffer.from(original),'sha256').slice(0,12)}.json`)
await fs.writeFile(backup,original,{flag:'wx'}).catch(e => { if(e.code !== 'EEXIST')throw e })
const server = { id:'AliceDiamond-26.2',name:'버컴퍼니 다이아몬드 대결',description:'다이아몬드 대결 · Minecraft 26.2 · NeoForge', icon:existing.icon,discord:{shortId:'다이아몬드 대결',largeImageText:'버컴퍼니 다이아몬드 대결',largeImageKey:existing.discord?.largeImageKey ?? existing.icon},version:'1.0.15',address:diamondAddress,minecraftVersion:'26.2',javaOptions:structuredClone(existing.javaOptions),mainServer:true,autoconnect:true,modules }
distro.version = '1.0.15'
distro.servers = [server,...distro.servers.filter(s => s.id !== server.id).map(s => ({...s,mainServer:false}))]
const result = JSON.stringify(distro,null,2)+'\n'
await fs.writeFile(path.join(root,'distribution.json'),result)
await fs.writeFile(path.join(assets,'distribution.json'),result)
await fs.writeFile(path.join(delivery,'launcher','diamond-manifest.json'),JSON.stringify({instance:server.id,releaseBase:base,published:false,records},null,2)+'\n')
console.log(`Prepared ${server.id}: ${modules.length} modules. Existing instance retained. Release assets are local and unpublished.`)
