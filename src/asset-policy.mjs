// These are user declarations, not an independent license verification.
export const backgroundRights=Object.freeze(['editable','flattened']);
export function backgroundPermission(asset){if(!asset)return null;return asset.rights==='editable'?'editable':'flattened'}
export function exportPolicy(doc){const restricted=doc?.backgroundRights==='flattened';return {editable:!restricted,reason:restricted?'Este fundo foi autorizado apenas para arte final rasterizada. Usa PDF RGB, JPG ou PNG.':''}}
export function assertEditable(doc){const p=exportPolicy(doc);if(!p.editable)throw Error(p.reason)}
export function assertPortable(snapshot){if(snapshot.assets?.backgroundImage&&backgroundPermission(snapshot.assets.backgroundImage)!=='editable')throw Error('Este projecto contém um fundo autorizado apenas para arte final. Podes guardá-lo neste dispositivo, mas não exportar o projecto editável.')}
