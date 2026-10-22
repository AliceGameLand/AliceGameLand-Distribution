import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const filename=path.join(root,'distribution.json')
const distribution=JSON.parse(await fs.readFile(filename,'utf8'))
const response=await fetch('https://github.com/Dot0420/AliceGameLand-Distribution/releases/download/client-v1.0.0/distribution.json?verify='+Date.now())
assert.ok(response.ok,'Remote distribution download failed')
assert.deepEqual(await response.json(),distribution,'Remote distribution differs; refusing overwrite')
const backup=path.join(root,'backups','preserve-server-list-'+Date.now())
await fs.mkdir(backup,{recursive:true})
await fs.copyFile(filename,path.join(backup,'distribution.json'))
const server=distribution.servers.find(server=>server.id==='AliceGameLand-26.2')
const module=server.modules.find(module=>module.artifact?.path==='servers.dat')
assert.ok(module,'servers.dat module missing')
delete module.artifact.MD5
server.version='1.0.12'
const text=JSON.stringify(distribution,null,2)+'\n'
await fs.writeFile(filename,text)
await fs.writeFile(path.join(root,'release-assets','distribution.json'),text)
console.log(JSON.stringify({backup,version:server.version,artifact:module.artifact},null,2))
