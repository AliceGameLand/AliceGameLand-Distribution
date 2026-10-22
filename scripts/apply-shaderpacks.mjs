import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const instance = path.join(process.env.APPDATA, '.alicegameland', 'instances', 'AliceGameLand-26.2')
const distributionPath = path.join(root, 'distribution.json')
const distribution = JSON.parse(await fs.readFile(distributionPath, 'utf8'))
const remoteUrl = 'https://github.com/Dot0420/AliceGameLand-Distribution/releases/latest/download/distribution.json'
async function download(url) {
    const response = await fetch(url, { headers: { 'User-Agent': 'AliceGameLand-shader-defaults/1.0' } })
    if(!response.ok) throw new Error(`${response.status}: ${url}`)
    return Buffer.from(await response.arrayBuffer())
}
const remote = JSON.parse((await download(remoteUrl)).toString('utf8'))
if(JSON.stringify(remote) !== JSON.stringify(distribution)) throw new Error('Remote distribution differs; refusing overwrite.')
const backup = path.join(root, 'backups', `before-shaders-${new Date().toISOString().replaceAll(':', '-')}`)
await fs.mkdir(backup, { recursive: true })
await fs.copyFile(distributionPath, path.join(backup, 'distribution.json'))
const hash = (bytes, algorithm) => crypto.createHash(algorithm).update(bytes).digest('hex')
const shaders = []
for(const [slug, versionId] of [['bsl-shaders', 'yFTiE1Nc'], ['complementary-reimagined', 'ErCjThzb'], ['complementary-unbound', 'UhZjVKiD']]) {
    const version = JSON.parse((await download(`https://api.modrinth.com/v2/version/${versionId}`)).toString('utf8'))
    if(!version.game_versions.includes('26.2')) throw new Error(`26.2 unsupported: ${slug}`)
    const file = version.files.find(value => value.primary)
    const bytes = await download(file.url)
    if(bytes.length !== file.size || hash(bytes, 'sha512') !== file.hashes.sha512) throw new Error(`Official hash mismatch: ${slug}`)
    const destination = path.join(root, 'client-defaults', 'shaderpacks', file.filename)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.writeFile(destination, bytes)
    const entries = execFileSync('tar', ['-tf', destination], { encoding: 'utf8' })
    if(!entries.split(/\r?\n/).some(entry => entry.startsWith('shaders/'))) throw new Error(`Invalid shader ZIP: ${slug}`)
    const local = path.join(instance, 'shaderpacks', file.filename)
    await fs.mkdir(path.dirname(local), { recursive: true })
    try { await fs.copyFile(local, path.join(backup, file.filename)) } catch(error) { if(error.code !== 'ENOENT') throw error }
    await fs.writeFile(local, bytes)
    const artifact = { size: bytes.length, MD5: hash(bytes, 'md5'), url: file.url, path: `shaderpacks/${file.filename}` }
    distribution.servers[0].modules = distribution.servers[0].modules.filter(module => module.id !== `shader-${slug}`)
    distribution.servers[0].modules.push({ id: `shader-${slug}`, name: version.name, type: 'File', artifact })
    shaders.push({ slug, version: version.version_number, versionId, file: file.filename, url: file.url, size: bytes.length, md5: artifact.MD5, sha256: hash(bytes, 'sha256'), sha512: file.hashes.sha512 })
    console.log(`Verified and installed: ${file.filename}`)
}
distribution.servers[0].version = '1.0.2'
const text = `${JSON.stringify(distribution, null, 2)}\n`
await fs.writeFile(distributionPath, text)
await fs.writeFile(path.join(root, 'release-assets', 'distribution.json'), text)
await fs.writeFile(path.join(root, 'shader-manifest.json'), `${JSON.stringify({ createdAt: new Date().toISOString(), backup, shaders }, null, 2)}\n`)
console.log(`Backup: ${backup}`)
