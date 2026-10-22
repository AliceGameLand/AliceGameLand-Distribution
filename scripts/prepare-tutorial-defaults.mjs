import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stage = path.join(root, 'validation-runtime', 'tutorial-fix', 'publish')
const base = 'https://github.com/AliceGameLand/AliceGameLand-Distribution/releases/download/crime-tutorial-v1.2.6'
const original = await fs.readFile(path.join(root, 'validation-runtime/tutorial-fix/distribution.json'), 'utf8')
const distribution = JSON.parse(original)
assert.equal(distribution.version, '1.0.41')
await fs.mkdir(stage, { recursive: true })
for(const server of distribution.servers) {
    const module = server.modules.find(value => value.artifact?.path === 'options.txt')
    assert.ok(module)
    const response = await fetch(module.artifact.url)
    assert.ok(response.ok, `Options download failed: ${server.id}`)
    const before = await response.text()
    assert.equal(Buffer.byteLength(before), module.artifact.size)
    await fs.writeFile(path.join(stage, `${server.id}-options-before.txt`), before)
    let options = before.replace(/^tutorialStep:[^\r\n]*\r?\n?/gm, '')
    if(options && !options.endsWith('\n')) options += '\n'
    options += 'tutorialStep:none\n'
    if(!/^guiScale:/m.test(options)) options += 'guiScale:4\n'
    const filename = `${server.id}-options.txt`
    await fs.writeFile(path.join(stage, filename), options)
    module.artifact.size = Buffer.byteLength(options)
    delete module.artifact.MD5
    module.artifact.url = `${base}/${filename}`
    if(server.id === 'AliceDiamond-26.2') {
        await fs.writeFile(path.join(root, 'diamond-release-assets/options.txt'), options)
    } else {
        await fs.writeFile(path.join(root, 'release-assets/options.txt'), options)
    }
    const version = server.version.split('.')
    version[2] = Number(version[2]) + 1
    server.version = version.join('.')
}
const crime = distribution.servers.find(server => server.id === 'AliceCrimeScene-26.2')
crime.name = '크라임씬'
crime.description = '크라임씬 · Minecraft 26.2 · NeoForge'
crime.discord.shortId = '크라임씬'
crime.discord.largeImageText = '크라임씬'
crime.modules = crime.modules.filter(module => !/^Gamma-Utils-/i.test(module.name))
distribution.version = '1.0.42'
const local = await fs.readFile(path.join(root, 'distribution.json'), 'utf8')
const backup = path.join(root, 'backups', `before-tutorial-${crypto.createHash('sha256').update(local).digest('hex').slice(0, 12)}.json`)
await fs.mkdir(path.dirname(backup), { recursive: true })
await fs.writeFile(backup, local)
const updated = `${JSON.stringify(distribution, null, 2)}\n`
await fs.writeFile(path.join(root, 'distribution.json'), updated)
await fs.writeFile(path.join(stage, 'distribution.json'), updated)
console.log(`Prepared tutorial defaults, Gamma removal and Crime Scene name in ${stage}`)
