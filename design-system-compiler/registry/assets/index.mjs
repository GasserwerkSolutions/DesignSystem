export function assetRegistry(snapshot){return Object.entries(snapshot.sources).filter(([,v])=>v.role==="asset").map(([source,v])=>({source,...v}));}
