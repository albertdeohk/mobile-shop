import {useEffect,useState} from 'react'
import {idr,STATUS,Avatar,PayBox,StoreForm} from './ShopAdmin'

const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
const mondayOf=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-(x.getDay()+6)%7);return x}
const keyOf=(d,m)=>m==='day'?ymd(d):m==='week'?ymd(mondayOf(d)):ymd(d).slice(0,7)
const fmt=(d,o)=>d.toLocaleDateString('id-ID',o)
const labelOf=(k,m)=>{
  if(m==='day')return fmt(new Date(k+'T00:00'),{weekday:'long',day:'numeric',month:'short',year:'numeric'})
  if(m==='week'){const a=new Date(k+'T00:00'),b=new Date(a);b.setDate(a.getDate()+6);return fmt(a,{day:'numeric',month:'short'})+' – '+fmt(b,{day:'numeric',month:'short',year:'numeric'})}
  return fmt(new Date(k+'-01T00:00'),{month:'long',year:'numeric'})
}
const PRESETS=[['today','Hari ini'],['7','7 hari'],['30','30 hari'],['month','Bulan ini'],['all','Semua']]
const rangeOf=k=>{
  const t=new Date(),e=ymd(t),back=n=>{const s=new Date(t);s.setDate(t.getDate()-n);return ymd(s)}
  return k==='today'?[e,e]:k==='7'?[back(6),e]:k==='30'?[back(29),e]:k==='month'?[ymd(new Date(t.getFullYear(),t.getMonth(),1)),e]:['','']
}
const sum=a=>a.reduce((s,o)=>s+(+o.total),0)

function MyOrders({go,base,note}){
  const [preset,setPreset]=useState('30'),[range,setRange]=useState(rangeOf('30')),[mode,setMode]=useState('day')
  const [orders,setOrders]=useState([]),[open,setOpen]=useState(null),[rv,setRv]=useState({rating:5,comment:''}),[loading,setLoading]=useState(false)
  const [from,to]=range
  const load=()=>{
    if(from&&to&&from>to){setOrders([]);return note('Tanggal awal harus sebelum tanggal akhir.')}
    note('')
    const q=[];if(from)q.push('from='+encodeURIComponent(new Date(from+'T00:00:00').toISOString()))
    if(to)q.push('to='+encodeURIComponent(new Date(to+'T23:59:59.999').toISOString()))
    setLoading(true);go('/orders'+(q.length?'?'+q.join('&'):'')).then(setOrders).catch(note).finally(()=>setLoading(false))
  }
  useEffect(()=>{load()},[from,to])
  const pick=k=>{setPreset(k);setRange(rangeOf(k))}
  const sendReview=id=>go('/orders/'+id+'/review','POST',rv).then(()=>{setOpen(null);setRv({rating:5,comment:''});load()}).catch(note)

  const counted=orders.filter(o=>o.status!=='cancelled'),cancelled=orders.length-counted.length
  const groups=[],idx={}
  orders.forEach(o=>{const k=keyOf(new Date(o.created_at),mode);if(!(k in idx)){idx[k]=groups.length;groups.push({k,list:[]})}groups[idx[k]].list.push(o)})
  const d=v=>fmt(new Date(v+'T00:00'),{day:'numeric',month:'short',year:'numeric'})

  const card=o=><div className="s-box" key={o.id}>
    <b>#{o.id} · {o.store?.name||'Toko'}</b> <span className={'s-st '+o.status}>{STATUS[o.status]}</span>
    <div className="s-mute" style={{marginBottom:6}}>{new Date(o.created_at).toLocaleString('id-ID')}</div>
    {o.items.map(i=><div key={i.id}>{i.qty} × {i.name}{i.size?' ('+i.size+')':''}</div>)}
    {o.coupon_code&&<div className="s-ok">🏷️ {o.coupon_code} −{idr(o.discount)}</div>}
    <b style={{display:'block',margin:'6px 0'}}>{idr(o.total)}</b>
    {o.status==='pending'&&<button className="s-btn ghost" style={{marginTop:4}} onClick={()=>setOpen(open==='p'+o.id?null:'p'+o.id)}>Cara bayar</button>}
    {open==='p'+o.id&&<div style={{marginTop:12}}><PayBox o={o} base={base}/></div>}
    {o.review&&<div className="s-ok">Ulasanmu: ★ {o.review.rating}{o.review.comment?' · '+o.review.comment:''}</div>}
    {o.status==='done'&&!o.review&&(open==='r'+o.id?<div style={{marginTop:10}}>
      <div className="s-stars big">{[1,2,3,4,5].map(n=><button key={n} className={n<=rv.rating?'on':''} onClick={()=>setRv({...rv,rating:n})}>★</button>)}</div>
      <textarea className="s-input" rows={3} placeholder="Ceritakan pengalamanmu (opsional)" value={rv.comment} onChange={e=>setRv({...rv,comment:e.target.value})}/>
      <button className="s-btn" style={{marginTop:8}} onClick={()=>sendReview(o.id)}>Kirim ulasan</button></div>
      :<button className="s-btn ghost" onClick={()=>setOpen('r'+o.id)}>⭐ Beri ulasan</button>)}
  </div>

  return <>
    <div className="s-sumcard"><small>Total pesanan · {from||to?(from?d(from):'awal')+' – '+(to?d(to):'sekarang'):'semua waktu'}</small>
      <b>{idr(sum(counted))}</b><div>{counted.length} pesanan{cancelled>0?' · '+cancelled+' dibatalkan (tidak dihitung)':''}</div></div>
    <div className="s-bar">{PRESETS.map(([k,l])=><button key={k} className={'s-pill'+(preset===k?' on':'')} onClick={()=>pick(k)}>{l}</button>)}</div>
    <div className="s-row"><input className="s-input" type="date" value={from} max={to||undefined} onChange={e=>{setPreset('custom');setRange([e.target.value,to])}}/>
      <span>–</span><input className="s-input" type="date" value={to} min={from||undefined} onChange={e=>{setPreset('custom');setRange([from,e.target.value])}}/></div>
    {/* <div className="s-sizes" style={{margin:'14px 0 6px'}}>{[['day','Per hari'],['week','Per minggu'],['month','Per bulan']].map(([k,l])=><button key={k} className={mode===k?'on':''} onClick={()=>setMode(k)}>{l}</button>)}</div> */}
    {loading&&<div className="s-mute">Memuat…</div>}
    {groups.map(g=>{const c=g.list.filter(o=>o.status!=='cancelled');return <div key={g.k}>
      <div className="s-grp"><span>{labelOf(g.k,mode)}</span><span><b>{idr(sum(c))}</b> · {c.length} pesanan</span></div>{g.list.map(card)}</div>})}
    {!loading&&!orders.length&&<div className="s-empty">Tidak ada pesanan pada rentang tanggal ini.</div>}
  </>
}

function Sales({go,note}){
  const [orders,setOrders]=useState([])
  const load=()=>go('/store-orders').then(setOrders).catch(note)
  useEffect(()=>{load()},[])
  return <>{orders.map(o=><div className="s-box" key={o.id}>
    <b>#{o.id} · {idr(o.total)}</b> <span className={'s-st '+o.status}>{STATUS[o.status]}</span>
    <div className="s-mute">{o.customer_name} · {o.phone}<br/>{o.address}{o.note?<><br/>Catatan: {o.note}</>:null}</div>
    {o.items.map(i=><div key={i.id}>{i.qty} × {i.name}{i.size?' ('+i.size+')':''}</div>)}
    {o.coupon_code&&<div className="s-ok">🏷️ {o.coupon_code} −{idr(o.discount)}</div>}
    <select className="s-input" style={{marginTop:10}} value={o.status} onChange={e=>go('/store-orders/'+o.id,'PATCH',{status:e.target.value}).then(load).catch(note)}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>)}
    {!orders.length&&<div className="s-empty">Belum ada pesanan masuk.</div>}</>
}

export default function Profile({go,base,token,user,store,setStore,reload,onMoney,onLogout}){
  const [sub,setSub]=useState(null),[msg,setMsg]=useState('')
  const note=e=>setMsg(typeof e==='string'?e:e.message)
  const rows=[['orders','🧾','Pesanan saya'],...(store?[['sales','📦','Pesanan masuk']]:[]),['store','🏪','Pengaturan toko']]
  const title={orders:'Pesanan saya',sales:'Pesanan masuk',store:'Pengaturan toko'}[sub]
  if(sub)return <>
    <div className="s-top" style={{padding:'10px 0'}}><button className="s-ic" onClick={()=>{setMsg('');setSub(null)}}>‹</button><div className="s-title">{title}</div></div>
    {msg&&<div className="s-note">{msg}</div>}
    {sub==='orders'&&<MyOrders go={go} base={base} note={note}/>}
    {sub==='sales'&&<Sales go={go} note={note}/>}
    {sub==='store'&&(store?<StoreForm base={base} token={token} store={store} onSaved={s=>{setStore(s);reload()}} note={note}/>
      :<div className="s-empty">Kamu belum punya toko.<br/>Buka menu Jual untuk membuatnya.</div>)}
  </>
  return <>
    <div className="s-box s-me"><Avatar url={store?.logo_url} name={store?.name||user?.name} size={64}/>
      <div><b style={{fontSize:18}}>{user?.name}</b><div className="s-mute">{user?.email}</div>{store&&<div className="s-ok">🏪 {store.name}</div>}</div></div>
    <div className="s-box" style={{padding:'4px 16px'}}>
      {rows.map(([k,i,l])=><button className="s-menu" key={k} onClick={()=>setSub(k)}><span>{i}</span>{l}<i>›</i></button>)}
      <button className="s-menu" onClick={onMoney}><span>💰</span>Catatan keuangan pribadi<i>›</i></button>
      <button className="s-menu" onClick={onLogout}><span>🚪</span>Keluar<i>›</i></button></div>
  </>
}