import fs from 'node:fs'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const records = JSON.parse(fs.readFileSync(path.join(root, 'emote-manifest.json'), 'utf8')).emotes
const response = await fetch('https://github.com/AliceGameLand/AliceGameLand-Distribution/releases/latest/download/distribution.json')
assert.ok(response.ok)
const remote = await response.json()
const modules = remote.servers[0].modules
const configModule = modules.find(value => value.artifact?.path === 'config/emotecraft.json')
const configResponse = await fetch(configModule.artifact.url)
assert.ok(configResponse.ok)
const configBytes = Buffer.from(await configResponse.arrayBuffer())
assert.equal(crypto.createHash('md5').update(configBytes).digest('hex'), configModule.artifact.MD5)
const config = JSON.parse(configBytes.toString('utf8'))
const server = 'C:/Users/gptnr/Desktop/alice-26-2/emotes'
const instance = 'C:/Users/gptnr/AppData/Roaming/.alicegameland/instances/AliceGameLand-26.2'
const localConfig = JSON.parse(fs.readFileSync(path.join(instance, 'config/emotecraft.json'), 'utf8'))
for (const record of records) {
    const module = modules.find(value => value.artifact?.path === `emotes/${record.file}`)
    assert.ok(module)
    const response = await fetch(module.artifact.url)
    assert.ok(response.ok)
    const bytes = Buffer.from(await response.arrayBuffer())
    assert.equal(bytes.length, record.size)
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), record.sha256)
    assert.deepEqual(Buffer.from(config.fastmenu['0'][record.slot - 1], 'base64'), bytes)
    assert.deepEqual(Buffer.from(localConfig.fastmenu['0'][record.slot - 1], 'base64'), bytes)
    assert.deepEqual(fs.readFileSync(path.join(server, record.file)), bytes)
    assert.deepEqual(fs.readFileSync(path.join(instance, 'emotes', record.file)), bytes)
    console.log(`Verified remote/server/client/slot ${record.slot}: ${record.file}`)
}
