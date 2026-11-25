import {useEffect,useMemo,useRef,useState} from 'react'
import {Preferences} from '@capacitor/preferences'
import {api} from './api'
import {idr,Combo,SIZE_ORDER,Stars,Avatar,PayBox} from './ShopAdmin'
import Sell from './Sell'
import Inbox from './Inbox'
import Profile from './Profile'
import './shop.css'

const cover=p=>p.image_urls&&p.image_urls[0]
const Img=({src})=>src?<img src={src} alt="" loading="lazy" onError={e=>{e.target.style.display='none'}}/>:null
const Price=({p,big})=>p.discount_percent>0
  ?<div className={'s-pw'+(big?' big':'')}><span className="s-old">{idr(p.price)}</span><span className="s-price s-new">{idr(p.final_price)}</span></div>
  :<div className={'s-price'+(big?' s-big':'')}>{idr(p.price)}</div>
const PER_PAGE=4   // items per page: change this number any time

export default function Shop({base,token,user,onMoney,onBack,onLogout}){
  const go=(p,m,b)=>api(base,p,m,b,token)
  const logoutFallback=async()=>{   // used only if the old App.jsx does not pass onLogout
    try{await go('/logout','POST')}catch(e){}
    const r=await Preferences.get({key:'money2'});const st=JSON.parse(r.value||'{}')
    await Preferences.set({key:'money2',value:JSON.stringify({...st,token:'',user:null})});window.location.reload()
  }
  const [tab,setTab]=useState('home'),[view,setView]=useState('catalog'),[chat,setChat]=useState(null),[unread,setUnread]=useState(0)
  const [products,setP]=useState([]),[cats,setCats]=useState([]),[brands,setBrands]=useState([]),[stores,setStores]=useState([]),[myStore,setMyStore]=useState(undefined)
  const [recent,setRecent]=useState([]),[storeId,setStoreId]=useState(null),[sd,setSd]=useState(null)
  const [cart,setCart]=useState({store:null,items:{}}),[sel,setSel]=useState(null),[size,setSize]=useState(null),[qty,setQty]=useState(1),[idx,setIdx]=useState(0),galRef=useRef(null)
  const [page,setPage]=useState(0),[dir,setDir]=useState(1),touch=useRef(null)
  const [flt,setFlt]=useState({q:'',cat:null,brand:null,sizes:[],min:'',max:'',sort:'new'}),[showF,setShowF]=useState(false)
  const [done,setDone]=useState(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false)
  const [form,setForm]=useState({customer_name:user?.name||'',phone:'',address:'',note:''}),[cp,setCp]=useState({code:'',applied:null,err:''})

  const load=()=>{
    go('/products').then(r=>setP(r.map(p=>({...p,price:+p.price,final_price:+p.final_price})))).catch(e=>setMsg(e.message))
    go('/categories').then(setCats).catch(()=>{});go('/brands').then(setBrands).catch(()=>{});go('/stores').then(setStores).catch(()=>{})
    go('/my-store').then(setMyStore).catch(()=>setMyStore(null))
  }
  useEffect(()=>{load();Preferences.get({key:'recent'}).then(r=>{try{setRecent(JSON.parse(r.value||'[]'))}catch(e){}})},[])
  useEffect(()=>{   // unread badge on Inbox
    const t=()=>go('/conversations').then(r=>setUnread(r.reduce((s,c)=>s+c.unread,0))).catch(()=>{})
    t();const i=setInterval(t,15000);return()=>clearInterval(i)
  },[])

  const catalog=products
  const allSizes=[...new Set(catalog.flatMap(p=>p.sizes||[]))].sort((a,b)=>{const x=SIZE_ORDER.indexOf(a),y=SIZE_ORDER.indexOf(b);return (x<0?99:x)-(y<0?99:y)||a.localeCompare(b,undefined,{numeric:true})})
  const shown=useMemo(()=>{
    const q=flt.q.toLowerCase()
    let l=catalog.filter(p=>(!q||(p.name+' '+(p.brand||'')+' '+(p.store?.name||'')).toLowerCase().includes(q))&&(!flt.cat||p.category_id===flt.cat)&&(!flt.brand||p.brand===flt.brand)
      &&(!flt.sizes.length||flt.sizes.some(s=>(p.sizes||[]).includes(s)))&&(!flt.min||p.final_price>=+flt.min)&&(!flt.max||p.final_price<=+flt.max))
    if(flt.sort==='lo')l=[...l].sort((a,b)=>a.final_price-b.final_price)
    if(flt.sort==='hi')l=[...l].sort((a,b)=>b.final_price-a.final_price)
    return l
  },[products,flt])
  const active=(flt.cat?1:0)+(flt.brand?1:0)+(flt.sizes.length?1:0)+(flt.min||flt.max?1:0)
  const pages=Math.max(1,Math.ceil(shown.length/PER_PAGE)),pg=Math.min(page,pages-1),visible=shown.slice(pg*PER_PAGE,pg*PER_PAGE+PER_PAGE)
  const goPage=n=>{if(n<0||n>=pages)return;setDir(n>pg?1:-1);setPage(n);window.scrollTo({top:0,behavior:'smooth'})}
  useEffect(()=>{setPage(0)},[flt,products])
  const onTS=e=>{const t=e.touches[0];touch.current=[t.clientX,t.clientY]}
  const onTE=e=>{if(!touch.current)return;const t=e.changedTouches[0],dx=t.clientX-touch.current[0],dy=t.clientY-touch.current[1];touch.current=null
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)goPage(pg+(dx<0?1:-1))}

  const byId=Object.fromEntries(catalog.map(p=>[p.id,p]))
  const lines=Object.entries(cart.items).map(([k,n])=>{const [id,sz]=k.split('|');const p=byId[id];return p&&{k,p,sz,n}}).filter(Boolean)
  const count=lines.reduce((s,l)=>s+l.n,0),subtotal=lines.reduce((s,l)=>s+l.n*l.p.final_price,0)
  const cartStore=lines[0]?.p.store
  const discount=cp.applied?cp.applied.discount:0,total=subtotal-discount
  const bump=(k,n)=>setCart(c=>{const it={...c.items};n>0?it[k]=Math.min(n,99):delete it[k];return {store:Object.keys(it).length?c.store:null,items:it}})
  const applyCode=async code=>{try{const r=await go('/coupons/check','POST',{code,subtotal,store_id:cart.store});setCp({code,applied:r,err:''})}catch(e){setCp({code,applied:null,err:e.message})}}
  useEffect(()=>{if(cp.applied)applyCode(cp.applied.code)},[subtotal])

  const open=p=>{
    setSel(p);setSize(null);setQty(1);setIdx(0);setMsg('')
    const r=[{id:p.id,name:p.name,price:p.price,img:cover(p)},...recent.filter(x=>x.id!==p.id)].slice(0,12)
    setRecent(r);Preferences.set({key:'recent',value:JSON.stringify(r)})
  }
  const addToCart=()=>{
    if((sel.sizes||[]).length&&!size)return setMsg('Pilih ukuran dulu.')
    const k=sel.id+'|'+(size||'')
    if(cart.store&&cart.store!==sel.store_id&&Object.keys(cart.items).length){
      if(!window.confirm('Keranjangmu berisi barang dari toko lain. Kosongkan keranjang dan tambahkan barang ini?'))return
      setCart({store:sel.store_id,items:{[k]:qty}})
    }else setCart(c=>({store:sel.store_id,items:{...c.items,[k]:Math.min(99,(c.items[k]||0)+qty)}}))
    setSel(null);setMsg('')
  }
  const place=async()=>{
    if(!form.customer_name||!form.phone||!form.address)return setMsg('Isi nama, nomor telepon, dan alamat dulu.')
    setBusy(true)
    try{
      const o=await go('/orders','POST',{...form,coupon:cp.applied?cp.applied.code:null,items:lines.map(l=>({product_id:l.p.id,qty:l.n,size:l.sz||null}))})
      setDone(o);setCart({store:null,items:{}});setCp({code:'',applied:null,err:''});setMsg('');setView('paid')
    }catch(e){setMsg(e.message)}
    setBusy(false)
  }
  const openStore=id=>{setSel(null);setStoreId(id);setSd(null);setTab('home');setView('store');go('/stores/'+id).then(setSd).catch(e=>setMsg(e.message))}
  const chatWith=async sid=>{try{const c=await go('/conversations','POST',{store_id:sid});setSel(null);setChat(c.id);setTab('inbox')}catch(e){setMsg(e.message)}}
  const toggleSize=s=>setFlt({...flt,sizes:flt.sizes.includes(s)?flt.sizes.filter(x=>x!==s):[...flt.sizes,s]})
  const clearF=()=>setFlt({...flt,cat:null,brand:null,sizes:[],min:'',max:''})
  const title={cart:'Keranjang',paid:'Pembayaran'}[view]
  const browsing=!flt.q&&!active
  const recentShown=recent.map(r=>byId[r.id]).filter(Boolean)

  const Card=p=><button className="s-card" key={p.id} onClick={()=>open(p)}>
    <div className="s-img">{cover(p)?<Img src={cover(p)}/>:'👕'}{p.category&&<span className="s-tag">{p.category.name}</span>}{p.discount_percent>0&&<span className="s-off">-{p.discount_percent}%</span>}{p.image_urls.length>1&&<span className="s-more">+{p.image_urls.length-1}</span>}</div>
    {p.brand&&<div className="s-sz" style={{marginTop:8}}>{p.brand}</div>}
    <div className="s-name" style={p.brand?{marginTop:0}:null}>{p.name}</div><Price p={p}/>
    {p.store&&<div className="s-sz">🏪 {p.store.name}</div>}</button>

  const home=<>
    <div className="s-top">
      {view==='catalog'?<>
        <label className="s-search"><span>🔍</span><input placeholder="Cari nama, brand, atau toko" value={flt.q} onChange={e=>setFlt({...flt,q:e.target.value})}/>{flt.q&&<button onClick={()=>setFlt({...flt,q:''})}>✕</button>}</label>
        <button className="s-ic" onClick={()=>{setMsg('');setView('cart')}} aria-label="Keranjang">🛒{count>0&&<span className="s-badge">{count}</span>}</button>
      </>:<><button className="s-ic" onClick={()=>{setMsg('');setView('catalog')}} aria-label="Kembali">‹</button><div className="s-title">{view==='store'?(sd?.name||'Toko'):title}</div></>}
    </div>
    {msg&&!sel&&<div className="s-note">{msg}</div>}

    {view==='catalog'&&<>
      {browsing&&pg===0&&recentShown.length>0&&<><div className="s-h2">Baru dilihat</div>
        <div className="s-hs">{recentShown.map(r=><button className="s-mini" key={r.id} onClick={()=>open(r)}><div className="s-img">{cover(r)?<Img src={cover(r)}/>:'👕'}{r.discount_percent>0&&<span className="s-off">-{r.discount_percent}%</span>}</div><div className="s-name">{r.name}</div><Price p={r}/></button>)}</div></>}
      {browsing&&pg===0&&stores.length>0&&<><div className="s-h2">Seller rekomendasi <small>rating terbaik</small></div>
        <div className="s-hs">{stores.map(s=><button className="s-seller" key={s.id} onClick={()=>openStore(s.id)}><Avatar url={s.logo_url} name={s.name} size={56}/><b>{s.name}</b>{s.reviews>0?<Stars v={s.rating} n={s.reviews}/>:<small className="s-mute">Belum ada ulasan</small>}</button>)}</div></>}
      <div className="s-bar">
        <button className={'s-pill'+(active?' on':'')} onClick={()=>setShowF(true)}>⚙︎ Filter{active?' · '+active:''}</button>
        {active>0&&<button className="s-pill" onClick={clearF}>Hapus</button>}
      </div>
      <div className="s-h2">{flt.q?'Hasil pencarian':flt.cat?cats.find(c=>c.id===flt.cat)?.name:'Semua produk'} <small>{shown.length} produk</small></div>
      {shown.length?<><div className={'s-grid s-slide '+(dir>0?'fwd':'back')} key={pg} onTouchStart={onTS} onTouchEnd={onTE}>{visible.map(Card)}</div>
        {pages>1&&<div className="s-pager"><button className="s-ic" disabled={pg===0} onClick={()=>goPage(pg-1)} aria-label="Halaman sebelumnya">‹</button>
          <div className="s-pdots">{pages<=6&&Array.from({length:pages},(_,i)=><button key={i} className={i===pg?'on':''} onClick={()=>goPage(i)} aria-label={'Halaman '+(i+1)}/>)}<span>{pg+1} / {pages}</span></div>
          <button className="s-ic" disabled={pg===pages-1} onClick={()=>goPage(pg+1)} aria-label="Halaman berikutnya">›</button></div>}</>
        :<div className="s-empty">{catalog.length?'Tidak ada produk yang cocok.':'Belum ada produk. Jadilah penjual pertama lewat menu Jual!'}</div>}
    </>}

    {view==='store'&&(sd?<>
      <div className="s-box s-me"><Avatar url={sd.logo_url} name={sd.name} size={72}/><div><b style={{fontSize:19}}>{sd.name}</b><div>{sd.reviews>0?<Stars v={sd.rating} n={sd.reviews}/>:<span className="s-mute">Belum ada ulasan</span>}</div>
        {sd.description&&<div className="s-mute" style={{marginTop:4}}>{sd.description}</div>}</div></div>
      <button className="s-btn" onClick={()=>chatWith(sd.id)}>💬 Chat penjual</button>
      <div className="s-h2" style={{marginTop:20}}>Produk toko</div>
      <div className="s-grid">{catalog.filter(p=>p.store_id===storeId).map(Card)}</div>
      <div className="s-h2" style={{marginTop:20}}>Ulasan pembeli</div>
      {sd.review_list.length?sd.review_list.map((r,i)=><div className="s-box" key={i}><b>{r.name}</b> <Stars v={r.rating}/>{r.comment&&<div className="s-mute">{r.comment}</div>}</div>):<div className="s-empty">Belum ada ulasan.</div>}
    </>:<div className="s-empty">Memuat…</div>)}

    {view==='cart'&&(count?<>
      <div className="s-box"><div className="s-mute" style={{marginBottom:4}}>🏪 {cartStore?.name}</div>{lines.map(l=><div className="s-line" key={l.k}><div className="s-th">{cover(l.p)?<Img src={cover(l.p)}/>:'👕'}</div>
        <div className="s-li"><b>{l.p.name}</b><div className="s-mute">{l.sz?'Ukuran '+l.sz+' · ':''}{idr(l.p.final_price)}{l.p.discount_percent>0&&<s style={{marginLeft:6}}>{idr(l.p.price)}</s>}</div>
          <div className="s-row" style={{marginTop:8,justifyContent:'space-between'}}><div className="s-qty"><button onClick={()=>bump(l.k,l.n-1)}>−</button><b>{l.n}</b><button onClick={()=>bump(l.k,l.n+1)}>+</button></div><b>{idr(l.n*l.p.final_price)}</b></div></div></div>)}</div>
      <div className="s-box"><h3>Kupon diskon</h3>
        {cp.applied?<div className="s-row" style={{justifyContent:'space-between',marginTop:8}}><span className="s-ok">🏷️ {cp.applied.code} · {cp.applied.label}</span><button className="s-link" onClick={()=>setCp({code:'',applied:null,err:''})}>Hapus</button></div>
        :<div className="s-row" style={{marginTop:8}}><input className="s-input" placeholder="Masukkan kode" value={cp.code} onChange={e=>setCp({...cp,code:e.target.value.toUpperCase(),err:''})}/><button className="s-btn sm" onClick={()=>cp.code&&applyCode(cp.code)}>Pakai</button></div>}
        {cp.err&&<div className="s-note">{cp.err}</div>}</div>
      <div className="s-box"><h3>Data pengiriman</h3>
        <input className="s-input" style={{marginTop:10}} placeholder="Nama lengkap" value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})}/>
        <input className="s-input" style={{marginTop:10}} placeholder="Nomor WhatsApp / telepon" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
        <textarea className="s-input" style={{marginTop:10}} rows={3} placeholder="Alamat lengkap" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
        <input className="s-input" style={{marginTop:10}} placeholder="Catatan untuk penjual (opsional)" maxLength={200} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></div>
      <div className="s-box s-sum"><div><span className="s-mute">Subtotal</span><span>{idr(subtotal)}</span></div>
        {discount>0&&<div><span className="s-ok">Diskon</span><span className="s-ok">−{idr(discount)}</span></div>}
        <div className="tot"><span>Total</span><span>{idr(total)}</span></div></div>
      <button className="s-btn" disabled={busy} onClick={place}>{busy?'Memproses…':'Pesan sekarang · '+idr(total)}</button>
    </>:<div className="s-empty">Keranjangmu kosong.<button className="s-btn ghost" onClick={()=>setView('catalog')}>Mulai belanja</button></div>)}

    {view==='paid'&&done&&<><div className="s-h">Pesanan #{done.id} diterima 🎉</div>
      <div className="s-mute">Penjual sudah diberi tahu lewat WhatsApp. Silakan bayar agar pesananmu diproses.</div><PayBox o={done} base={base}/>
      <button className="s-btn ghost" onClick={()=>chatWith(done.store_id)}>💬 Chat penjual</button></>}
  </>

  const hideNav=tab==='inbox'&&chat
  return <div className="s"><div className="s-in">
    {tab==='home'&&home}
    {tab==='sell'&&<Sell go={go} base={base} token={token} user={user} store={myStore} setStore={setMyStore} cats={cats} brands={brands} reload={load}/>}
    {tab==='me'&&<Profile go={go} base={base} token={token} user={user} store={myStore} setStore={setMyStore} reload={load} onMoney={onMoney||onBack} onLogout={onLogout||logoutFallback}/>}
    {tab==='inbox'&&<Inbox go={go} user={user} chat={chat} setChat={setChat}/>}
  </div>

  {!hideNav&&<nav className="s-nav">{[['home','🏠','Home'],['sell','🏷️','Jual'],['inbox','💬','Inbox'],['me','👤','Profil']].map(([k,i,l])=>
    <button key={k} className={tab===k?'on':''} onClick={()=>{setTab(k);if(k==='home')setView('catalog');if(k==='inbox')setChat(null)}}>
      <span>{i}{k==='inbox'&&unread>0&&<b className="s-badge">{unread}</b>}</span>{l}</button>)}</nav>}

  {showF&&<div className="s-sheet" onClick={e=>e.target===e.currentTarget&&setShowF(false)}><div className="s-pane"><div className="s-grab"/>
    <div className="s-row" style={{justifyContent:'space-between'}}><b style={{fontSize:20}}>Filter</b><button className="s-link" onClick={()=>setFlt({...flt,cat:null,brand:null,sizes:[],min:'',max:'',sort:'new'})}>Reset</button></div>
    <label className="s-lbl">Kategori</label><Combo options={cats} value={flt.cat} onChange={v=>setFlt({...flt,cat:v})} allLabel="Semua kategori" placeholder="Cari kategori…"/>
    <label className="s-lbl">Brand</label><Combo options={brands.map(b=>({id:b,name:b}))} value={flt.brand} onChange={v=>setFlt({...flt,brand:v})} allLabel="Semua brand" placeholder="Cari brand…"/>
    <label className="s-lbl">Ukuran</label>{allSizes.length?<div className="s-sizes">{allSizes.map(s=><button key={s} className={flt.sizes.includes(s)?'on':''} onClick={()=>toggleSize(s)}>{s}</button>)}</div>:<div className="s-mute">Belum ada ukuran.</div>}
    <label className="s-lbl">Rentang harga (Rp)</label>
    <div className="s-row"><input className="s-input" type="number" inputMode="numeric" placeholder="Min" value={flt.min} onChange={e=>setFlt({...flt,min:e.target.value})}/><span>–</span><input className="s-input" type="number" inputMode="numeric" placeholder="Maks" value={flt.max} onChange={e=>setFlt({...flt,max:e.target.value})}/></div>
    <label className="s-lbl">Urutkan</label>
    <div className="s-sizes">{[['new','Terbaru'],['lo','Harga termurah'],['hi','Harga termahal']].map(([k,l])=><button key={k} className={flt.sort===k?'on':''} onClick={()=>setFlt({...flt,sort:k})}>{l}</button>)}</div>
    <button className="s-btn" style={{marginTop:20}} onClick={()=>setShowF(false)}>Tampilkan {shown.length} produk</button>
  </div></div>}

  {sel&&<div className="s-detail"><div className="s-dpane">
    <button className="s-ic s-close" onClick={()=>setSel(null)} aria-label="Tutup">‹</button>
    <div className="s-gal" ref={galRef} onScroll={e=>setIdx(Math.round(e.target.scrollLeft/e.target.clientWidth))}>
      {(sel.image_urls.length?sel.image_urls:[null]).map((u,i)=><div key={i}>{u?<Img src={u}/>:'👕'}</div>)}</div>
    {sel.image_urls.length>1&&<><div className="s-dots">{sel.image_urls.map((_,i)=><i key={i} className={i===idx?'on':''}/>)}</div>
      <div className="s-thumbs">{sel.image_urls.map((u,i)=><button key={i} className={i===idx?'on':''} onClick={()=>galRef.current.scrollTo({left:i*galRef.current.clientWidth,behavior:'smooth'})}><Img src={u}/></button>)}</div></>}
    <div className="s-dbody">
      <div className="s-mute">{[sel.brand,sel.category?.name].filter(Boolean).join(' · ')}</div>
      <h2>{sel.name}</h2><Price p={sel} big/>
      {sel.store&&<div className="s-storerow"><button className="s-row s-linkrow" onClick={()=>openStore(sel.store_id)}><Avatar url={sel.store.logo_url} name={sel.store.name} size={40}/><b>{sel.store.name}</b><span className="s-mute">Lihat toko ›</span></button>
        <button className="s-pill" onClick={()=>chatWith(sel.store_id)}>💬 Chat</button></div>}
      {sel.sizes?.length>0&&<><label className="s-lbl">Ukuran</label><div className="s-sizes">{sel.sizes.map(s=><button key={s} className={size===s?'on':''} onClick={()=>{setSize(s);setMsg('')}}>{s}</button>)}</div></>}
      {msg&&<div className="s-note">{msg}</div>}
      {sel.description&&<div className="s-desc">{sel.description}</div>}
    </div>
    <div className="s-act"><div className="s-row"><div className="s-qty"><button onClick={()=>setQty(Math.max(1,qty-1))}>−</button><b>{qty}</b><button onClick={()=>setQty(Math.min(99,qty+1))}>+</button></div>
      <button className="s-btn" onClick={addToCart}>Tambah · {idr(sel.final_price*qty)}</button></div></div>
  </div></div>}
  </div>
}