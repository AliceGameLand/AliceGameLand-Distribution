import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseTag = 'crime-v1.0.1'
const address = '146.56.114.53:25566'
const releaseBase = `https://github.com/AliceGameLand/AliceGameLand-Distribution/releases/download/${releaseTag}`
const icons = {
    diamond: `${releaseBase}/diamond.png`,
    crime: `${releaseBase}/crime-scene.png`
}

const distributionPath = path.join(root, 'distribution.json')
const distribution = JSON.parse(await fs.readFile(distributionPath, 'utf8'))
const gameLand = distribution.servers.find(server => server.id === 'AliceGameLand-26.2')
const diamond = distribution.servers.find(server => server.id === 'AliceDiamond-26.2')
if(!gameLand || !diamond) throw new Error('GameLand and Diamond server entries are required.')

// Preserve Crime Scene's added modules when regenerating its entry.
const existingCrime = distribution.servers.find(server => server.id === 'AliceCrimeScene-26.2')
const crime = structuredClone(existingCrime ?? gameLand)
crime.id = 'AliceCrimeScene-26.2'
crime.name = '컨텐츠'
crime.description = 'Minecraft 26.2 · NeoForge'
crime.icon = icons.crime
crime.discord = {
    shortId: '컨텐츠',
    largeImageText: '컨텐츠',
    largeImageKey: icons.crime
}
crime.version = existingCrime?.version ?? '1.0.1'
crime.address = address
crime.mainServer = false

const serverListModule = crime.modules.find(module => module.artifact?.path === 'servers.dat')
assert.ok(serverListModule, 'Crime Scene server list is missing')
const originalList = await fs.readFile(path.join(root, 'release-assets', 'servers.dat'))
const oldAddress = Buffer.from('alicehiyam.dreamcraft.kr')
const newAddress = Buffer.from(address)
const offset = originalList.indexOf(oldAddress)
assert.ok(offset >= 2 && originalList.indexOf(oldAddress, offset + oldAddress.length) < 0,
    'Expected one GameLand server address')
assert.equal(originalList.readUInt16BE(offset - 2), oldAddress.length)
const replacementLength = Buffer.alloc(2)
replacementLength.writeUInt16BE(newAddress.length)
const crimeList = Buffer.concat([
    originalList.subarray(0, offset - 2), replacementLength, newAddress,
    originalList.subarray(offset + oldAddress.length)
])
const crimeListHash = crypto.createHash('sha256').update(crimeList).digest('hex')
serverListModule.artifact = {
    size: crimeList.length,
    MD5: crypto.createHash('md5').update(crimeList).digest('hex'),
    url: `${releaseBase}/crime-servers.dat?v=${crimeListHash.slice(0, 12)}`,
    path: 'servers.dat'
}

diamond.icon = icons.diamond
diamond.discord.largeImageKey = icons.diamond
distribution.version = distribution.version === '1.0.16' ? '1.0.17' : distribution.version
distribution.servers = distribution.servers.filter(server => server.id !== crime.id)
distribution.servers.push(crime)

const stagedAssets = path.join(root, 'crime-release-assets')
await fs.mkdir(stagedAssets, { recursive: true })
await fs.writeFile(path.join(stagedAssets, 'crime-servers.dat'), crimeList)
for(const name of ['diamond.png', 'crime-scene.png']) {
    await fs.copyFile(path.join(root, 'server-icons', name), path.join(stagedAssets, name))
}
const output = `${JSON.stringify(distribution, null, 2)}\n`
await fs.writeFile(distributionPath, output)
await fs.writeFile(path.join(stagedAssets, 'distribution.json'), output)
console.log(`Staged ${distribution.servers.length} servers and two icons in ${stagedAssets}`)
