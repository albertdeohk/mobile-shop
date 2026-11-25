import {useState} from 'react'
import {StoreForm,Items,Cats,Coupons} from './ShopAdmin'

export default function Sell({go,base,token,user,store,setStore,cats,brands,reload}){
  const [tab,setTab]=useState('items'),[msg,setMsg]=useState('')
  const note=e=>setMsg(typeof e==='string'?e:e.message)
  if(store===undefined)return <div className="s-empty">Memuat…</div>
  if(!store)return <><div className="s-h">Buka tokomu</div>
    <div className="s-mute" style={{marginBottom:14}}>Isi data singkat dulu, lalu mulai jual. Rekening dan QRIS bisa dilengkapi kapan saja.</div>
    {msg&&<div className="s-note">{msg}</div>}<StoreForm base={base} token={token} store={null} onSaved={s=>{setStore(s);reload()}} note={note}/></>
  const tabs=[['items','Produk'],['coupons','Kupon'],...(user?.role==='admin'?[['cats','Kategori']]:[])]
  return <>
    <div className="s-h">Jual · {store.name}</div>
    <div className="s-bar">{tabs.map(([k,l])=><button key={k} className={'s-pill'+(tab===k?' on':'')} onClick={()=>{setMsg('');setTab(k)}}>{l}</button>)}</div>
    {msg&&<div className="s-note">{msg}</div>}
    {tab==='items'&&<Items go={go} base={base} token={token} cats={cats} brands={brands} reload={reload} note={note}/>}
    {tab==='coupons'&&<Coupons go={go} note={note}/>}
    {tab==='cats'&&<Cats go={go} cats={cats} reload={reload} note={note}/>}
  </>
}