import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stage = path.join(root, 'validation-runtime/company-brand/publish')
const tag = 'burcompany-branding-v1'
const iconUrl = `https://github.com/AliceGameLand/AliceGameLand-Distribution/releases/download/${tag}/burcompany-pvp.png`
const baseline = JSON.parse(await fs.readFile(path.join(root, 'validation-runtime/company-brand/distribution.json'), 'utf8'))
const localPath = path.join(root, 'distribution.json')
const original = await fs.readFile(localPath, 'utf8')
const local = JSON.parse(original)
const increment = version => {
    const parts = version.split('.')
    parts[2] = Number(parts[2]) + 1
    return parts.join('.')
}
function update(distribution) {
    let renamed = 0
    for(const server of distribution.servers) {
        if(!server.name.startsWith('버컴 ')) continue
        server.name = server.name.replace(/^버컴 /, '버컴퍼니 ')
        for(const key of ['shortId', 'largeImageText']) {
            if(server.discord?.[key]) server.discord[key] = server.discord[key].replace(/^버컴 /, '버컴퍼니 ')
        }
        server.version = increment(server.version)
        renamed++
    }
    assert.equal(renamed, 3)
    const pvp = distribution.servers.find(server => server.id === 'BurcomPvP-26.3')
    assert.ok(pvp)
    pvp.description = 'Minecraft 26.3 · Fabric'
    pvp.icon = iconUrl
    pvp.discord.largeImageKey = iconUrl
    distribution.version = increment(distribution.version)
}
update(baseline)
update(local)
await fs.mkdir(stage, { recursive: true })
const backup = path.join(root, 'backups', `before-burcompany-branding-${Date.now()}`)
await fs.mkdir(backup, { recursive: true })
await fs.writeFile(path.join(backup, 'distribution.json'), original)
await fs.writeFile(localPath, JSON.stringify(local, null, 2) + '\n')
await fs.writeFile(path.join(stage, 'distribution.json'), JSON.stringify(baseline, null, 2) + '\n')
await fs.copyFile(path.join(root, 'server-icons/burcompany-pvp.png'), path.join(stage, 'burcompany-pvp.png'))

// Keep future server-package generation consistent with the launcher labels.
for(const relative of ['alice-vr-pvp-practice', 'alice-vr-minigames']) {
    const project = path.resolve(root, '../alicehiyam-server', relative)
    const file = path.join(project, 'tools/prepare-launcher.mjs')
    const before = await fs.readFile(file, 'utf8')
    await fs.writeFile(path.join(backup, `${relative}-prepare-launcher.mjs`), before)
    const after = before.replaceAll('버컴 PvP 연습', '버컴퍼니 PvP 연습')
        .replaceAll('버컴 미니게임', '버컴퍼니 미니게임')
        .replaceAll('Minecraft 26.3 · PvP 연습 · 팀 체력 HUD', 'Minecraft 26.3 · Fabric')
    await fs.writeFile(file, after)
    if(relative === 'alice-vr-pvp-practice') {
        const icon = path.join(project, 'deployment/burcom-pvp-icon.png')
        await fs.copyFile(icon, path.join(backup, 'burcom-pvp-icon.png'))
        await fs.copyFile(path.join(root, 'server-icons/burcompany-pvp.png'), icon)
    }
}
console.log(`Prepared ${tag}, distribution ${baseline.version}, preserved local pending module changes`)
