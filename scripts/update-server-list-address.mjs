import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const backup=path.join(root,'backups',`server-list-address-${Date.now()}`)
await fs.mkdir(backup,{recursive:true})
function field(value) {
    const bytes=Buffer.from(value,'utf8'),length=Buffer.alloc(2)
    length.writeUInt16BE(bytes.length)
    return Buffer.concat([Buffer.from([8,0,2,105,112]),length,bytes])
}
const old=field('alicehiyam.dreamcraft.kr:25567'),replacement=field('alicehiyam.dreamcraft.kr')
const asset=path.join(root,'release-assets','servers.dat')
const original=await fs.readFile(asset)
await fs.copyFile(asset,path.join(backup,'servers.dat'))
const offset=original.indexOf(old)
assert.ok(offset>=0,'Expected old IP field not found')
assert.equal(original.indexOf(old,offset+old.length),-1,'Ambiguous repeated IP field')
const updated=Buffer.concat([original.subarray(0,offset),replacement,original.subarray(offset+old.length)])
await fs.writeFile(asset,updated)
const filename=path.join(root,'distribution.json')
await fs.copyFile(filename,path.join(backup,'distribution.json'))
const distro=JSON.parse(await fs.readFile(filename,'utf8'))
const server=distro.servers.find(server=>server.id==='AliceGameLand-26.2')
const module=server.modules.find(module=>module.artifact?.path==='servers.dat')
assert.ok(module,'servers.dat module missing')
server.address='alicehiyam.dreamcraft.kr'; server.version='1.0.11'
module.artifact.size=updated.length
module.artifact.MD5=crypto.createHash('md5').update(updated).digest('hex')
const url=new URL(module.artifact.url)
url.searchParams.set('v',crypto.createHash('sha256').update(updated).digest('hex').slice(0,12))
module.artifact.url=url.toString()
const text=JSON.stringify(distro,null,2)+'\n'
await fs.writeFile(filename,text)
await fs.writeFile(path.join(root,'release-assets','distribution.json'),text)
console.log(JSON.stringify({backup,version:server.version,address:server.address,artifact:module.artifact},null,2))
