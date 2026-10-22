import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distribution = JSON.parse(fs.readFileSync(path.join(root, 'distribution.json'), 'utf8'))
let changed = 0
function walk(modules) {
    for(const module of modules) {
        if(module.artifact?.url?.startsWith('https://github.com/Dot0420/AliceGameLand-Distribution/releases/download/')) {
            const url = new URL(module.artifact.url)
            const asset = decodeURIComponent(url.pathname.split('/').at(-1))
            const bytes = fs.readFileSync(path.join(root, 'release-assets', asset))
            url.searchParams.set('v', crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12))
            if(module.artifact.path === 'config/sodium-fingerprint.json') url.searchParams.set('revision', '1')
            module.artifact.url = url.toString()
            changed++
        }
        if(module.subModules) walk(module.subModules)
    }
}
walk(distribution.servers[0].modules)
distribution.servers[0].version = '1.0.8'
const text = JSON.stringify(distribution, null, 2) + '\n'
for(const file of ['distribution.json', 'release-assets/distribution.json'])
    fs.writeFileSync(path.join(root, file), text)
console.log(`Versioned ${changed} GitHub artifact URLs. Personal setting preservation flags unchanged.`)
