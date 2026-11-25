export async function api(base,path,method='GET',body,token){
  const r=await fetch(base.replace(/\/$/,'')+'/api'+path,{method,headers:{'Content-Type':'application/json',Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined})
  const j=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(j.message||'Request failed ('+r.status+')')
  return j
}
export const toApp=t=>({id:t.id,k:t.kind,amt:+t.amount,cat:t.category,note:t.note||'',date:t.date})
