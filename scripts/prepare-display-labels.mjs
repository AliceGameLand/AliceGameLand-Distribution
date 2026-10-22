import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stage = path.join(root, 'validation-runtime/display-labels')
const published = JSON.parse(await fs.readFile(path.join(stage, 'distribution.json'), 'utf8'))
const original = await fs.readFile(path.join(root, 'distribution.json'), 'utf8')
const local = JSON.parse(original)
const bump = version => {
    const parts = version.split('.')
    parts[2] = Number(parts[2]) + 1
    return parts.join('.')
}
function update(distribution) {
    const crime = distribution.servers.find(server => server.id === 'AliceCrimeScene-26.2')
    const pvp = distribution.servers.find(server => server.id === 'BurcomPvP-26.3')
    assert.ok(crime && pvp)
    crime.name = '컨텐츠'
    crime.discord.shortId = '컨텐츠'
    crime.discord.largeImageText = '컨텐츠'
    crime.version = bump(crime.version)
    pvp.description = 'Minecraft 26.3 · Fabric'
    pvp.version = bump(pvp.version)
    distribution.version = bump(distribution.version)
}
update(published)
update(local)
await fs.mkdir(path.join(root, 'backups'), { recursive: true })
await fs.writeFile(path.join(root, 'backups', `before-display-labels-${Date.now()}.json`), original)
await fs.writeFile(path.join(root, 'distribution.json'), JSON.stringify(local, null, 2) + '\n')
await fs.mkdir(path.join(stage, 'publish'), { recursive: true })
await fs.writeFile(path.join(stage, 'publish/distribution.json'), JSON.stringify(published, null, 2) + '\n')
console.log(published.version)
