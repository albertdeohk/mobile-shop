import {useEffect,useState} from 'react'
export const idr=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n)
export const STATUS={pending:'Menunggu pembayaran',paid:'Sudah dibayar',shipped:'Dikirim',done:'Selesai',cancelled:'Dibatalkan'}
export const SIZE_ORDER=['XS','S','M','L','XL','XXL','XXXL']
export const Stars=({v,n})=><span className="s-stars">★ {(+v||0).toFixed(1)}{n!=null&&<small> ({n})</small>}</span>
export const Avatar=({url,name,size=44})=><div className="s-av" style={{width:size,height:size,fontSize:size*.42}}>{url?<img src={url} alt="" onError={e=>{e.target.style.display='none'}}/>:(name||'?')[0].toUpperCase()}</div>

// Searchable dropdown
export function Combo({options,value,onChange,placeholder='Cari…',allLabel}){
  const [open,setOpen]=useState(false),[q,setQ]=useState('')
  const list=options.filter(o=>o.name.toLowerCase().includes(q.toLowerCase()))
  const cur=options.find(o=>o.id===value)
  const pick=v=>{onChange(v);setOpen(false);setQ('')}
  return <div className="s-combo">
    <button type="button" className="s-input s-sel" onClick={()=>setOpen(!open)}><span>{cur?cur.name:(allLabel||'Pilih')}</span><span>▾</span></button>
    {open&&<div className="s-drop"><input className="s-input" autoFocus placeholder={placeholder} value={q} onChange={e=>setQ(e.target.value)}/>
      <div className="s-opts">{allLabel&&<button type="button" className={!value?'on':''} onClick={()=>pick(null)}>{allLabel}</button>}
        {list.map(o=><button type="button" key={o.id} className={o.id===value?'on':''} onClick={()=>pick(o.id)}>{o.name}</button>)}
        {!list.length&&<div className="s-none">Tidak ditemukan</div>}</div></div>}
  </div>
}

const shrink=async f=>{   // resize big phone photos before upload (max 1600px, JPEG)
  const bmp=await createImageBitmap(f),k=Math.min(1,1600/Math.max(bmp.width,bmp.height))
  const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k)
  c.getContext('2d').drawImage(bmp,0,0,c.width,c.height)
  return new Promise(r=>c.toBlob(b=>r(new File([b],'photo.jpg',{type:'image/jpeg'})),'image/jpeg',0.85))
}
const post=(base,token,path,fd)=>fetch(base.replace(/\/$/,'')+'/api'+path,{method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/json'},body:fd})
  .then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||'Gagal menyimpan');return j})

// Payment details of a store (bank transfer + static QRIS)
export function PayBox({o,base}){
  const s=o.store||{},[ok,setOk]=useState(false)
  const slug=(s.bank_name||'').toLowerCase().replace(/[^a-z0-9]/g,'')
  const copy=()=>{try{navigator.clipboard.writeText(s.bank_number);setOk(true)}catch(e){}}
  const wa=s.whatsapp?'https://wa.me/'+s.whatsapp+'?text='+encodeURIComponent('Halo, saya sudah membayar pesanan #'+o.id+' ('+idr(o.total)+').'):null
  return <>
    <div className="s-due"><small>Total pembayaran</small><b>{idr(o.total)}</b></div>
    {s.bank_number?<div className="s-box s-bank">{slug&&<img src={base.replace(/\/$/,'')+'/banks/'+slug+'.png'} alt="" onError={e=>{e.target.style.display='none'}}/>}
      <div><b>{s.bank_name}</b><div className="s-acc-no">{s.bank_number}</div><small className="s-mute">a/n {s.bank_holder}</small></div>
      <button className="s-btn sm ghost" style={{margin:0}} onClick={copy}>{ok?'Tersalin':'Salin'}</button></div>
      :<div className="s-box s-mute">Penjual belum mengisi rekening. Tanyakan lewat chat.</div>}
    {s.qris_url&&<div className="s-box s-qr"><img src={s.qris_url} alt="QRIS"/><div>Atau scan dengan aplikasi QRIS</div></div>}
    {wa&&<a className="s-btn" href={wa} target="_blank" rel="noreferrer">Kirim bukti bayar via WhatsApp</a>}
  </>
}

// Store name, logo, WhatsApp, bank account and QRIS
export function StoreForm({base,token,store,onSaved,note}){
  const [f,setF]=useState({name:store?.name||'',description:store?.description||'',whatsapp:store?.whatsapp||'',bank_name:store?.bank_name||'',bank_number:store?.bank_number||'',bank_holder:store?.bank_holder||''})
  const [logo,setLogo]=useState(null),[qris,setQris]=useState(null),[busy,setBusy]=useState(false)
  const set=k=>e=>setF({...f,[k]:e.target.value})
  const save=async()=>{
    if(!f.name.trim())return note('Nama toko wajib diisi.')
    setBusy(true)
    try{
      const fd=new FormData();Object.entries(f).forEach(([k,v])=>fd.append(k,v||''))
      if(logo)fd.append('logo',await shrink(logo));if(qris)fd.append('qris',await shrink(qris))
      const j=await post(base,token,'/my-store',fd);setLogo(null);setQris(null);note('Tersimpan ✓');onSaved(j)
    }catch(e){note(e)}
    setBusy(false)
  }
  return <div className="s-box">
    <div className="s-row"><label className="s-logo"><Avatar url={logo?URL.createObjectURL(logo):store?.logo_url} name={f.name||'T'} size={84}/><span>Ganti foto</span>
      <input type="file" accept="image/*" hidden onChange={e=>setLogo(e.target.files[0]||null)}/></label>
      <div style={{flex:1}}><label className="s-lbl" style={{marginTop:0}}>Nama toko</label><input className="s-input" maxLength={60} value={f.name} onChange={set('name')}/></div></div>
    <label className="s-lbl">Deskripsi toko</label><textarea className="s-input" rows={3} maxLength={300} value={f.description} onChange={set('description')}/>
    <label className="s-lbl">Nomor WhatsApp (untuk notifikasi pesanan)</label><input className="s-input" type="tel" placeholder="0812xxxxxxx" value={f.whatsapp} onChange={set('whatsapp')}/>
    <label className="s-lbl">Rekening untuk pembayaran</label>
    <input className="s-input" placeholder="Nama bank, mis. BCA" value={f.bank_name} onChange={set('bank_name')}/>
    <input className="s-input" style={{marginTop:8}} placeholder="Nomor rekening" inputMode="numeric" value={f.bank_number} onChange={set('bank_number')}/>
    <input className="s-input" style={{marginTop:8}} placeholder="Atas nama" value={f.bank_holder} onChange={set('bank_holder')}/>
    <label className="s-lbl">Gambar QRIS toko (opsional)</label>
    <input type="file" accept="image/*" onChange={e=>setQris(e.target.files[0]||null)}/>{store?.qris_url&&!qris&&<div className="s-mute">QRIS sudah terpasang.</div>}
    <button className="s-btn" style={{marginTop:18}} disabled={busy} onClick={save}>{busy?'Menyimpan…':store?'Simpan pengaturan':'Buka toko'}</button>
  </div>
}

const EMPTY={name:'',description:'',price:'',discount_percent:'',category_id:null,brand:'',sizes:[],is_active:true}

export function Items({go,base,token,cats,brands,reload,note}){
  const [mine,setMine]=useState([]),[f,setF]=useState(EMPTY),[pics,setPics]=useState([]),[edit,setEdit]=useState(null),[custom,setCustom]=useState(''),[busy,setBusy]=useState(false)
  const loadMine=()=>go('/my-products').then(r=>setMine(r.map(p=>({...p,price:+p.price,final_price:+p.final_price})))).catch(note)
  useEffect(()=>{loadMine()},[])
  const sizeOpts=[...new Set([...SIZE_ORDER,...f.sizes])]
  const toggle=s=>setF({...f,sizes:f.sizes.includes(s)?f.sizes.filter(x=>x!==s):[...f.sizes,s]})
  const addFiles=e=>{const fl=[...e.target.files];e.target.value='';setPics(p=>[...p,...fl.map(file=>({file,url:URL.createObjectURL(file)}))])}
  const makeCover=i=>setPics(p=>[p[i],...p.filter((_,j)=>j!==i)])
  const drop=i=>setPics(p=>p.filter((_,j)=>j!==i))
  const reset=()=>{setF(EMPTY);setPics([]);setEdit(null);setCustom('')}
  const startEdit=p=>{
    setEdit(p.id);setF({name:p.name,description:p.description||'',price:p.price,discount_percent:p.discount_percent||'',category_id:p.category_id||null,brand:p.brand||'',sizes:p.sizes||[],is_active:!!p.is_active})
    const paths=(p.images&&p.images.length)?p.images:(p.photo?[p.photo]:[]);setPics(paths.map((path,i)=>({path,url:p.image_urls[i]})));window.scrollTo(0,0)
  }
  const save=async()=>{
    if(!f.name||!f.price)return note('Nama dan harga wajib diisi.')
    setBusy(true)
    try{
      const fd=new FormData()
      fd.append('name',f.name);fd.append('description',f.description||'');fd.append('price',f.price);fd.append('brand',f.brand||'');fd.append('discount_percent',f.discount_percent||0);fd.append('is_active',f.is_active?'1':'0')
      if(f.category_id)fd.append('category_id',f.category_id)
      f.sizes.forEach(s=>fd.append('sizes[]',s))
      let k=0
      for(const p of pics){if(p.file){fd.append('images[]',await shrink(p.file));fd.append('order[]','new:'+(k++))}else fd.append('order[]',p.path)}
      await post(base,token,'/my-products'+(edit?'/'+edit:''),fd)
      reset();note('Tersimpan ✓');loadMine();reload()
    }catch(e){note(e)}
    setBusy(false)
  }
  const del=p=>{if(window.confirm('Hapus '+p.name+'?'))go('/my-products/'+p.id,'DELETE').then(()=>{loadMine();reload()}).catch(note)}
  return <>
    <div className="s-box"><h3>{edit?'Ubah produk':'Tambah produk'}</h3>
      <label className="s-lbl">Foto (foto pertama jadi sampul, maks. 8)</label>
      <div className="s-pics">{pics.map((p,i)=><div className="s-pic" key={p.url}><img src={p.url} alt=""/>{i===0&&<em>Sampul</em>}
        <button className="x" onClick={()=>drop(i)}>×</button>{i>0&&<button className="mk" onClick={()=>makeCover(i)}>Jadikan sampul</button>}</div>)}
        {pics.length<8&&<label className="s-add">+<input type="file" accept="image/*" multiple onChange={addFiles}/></label>}</div>
      <label className="s-lbl">Nama produk</label><input className="s-input" value={f.name} maxLength={80} onChange={e=>setF({...f,name:e.target.value})}/>
      <label className="s-lbl">Kategori (jenis barang, mis. Jaket)</label><Combo options={cats} value={f.category_id} onChange={v=>setF({...f,category_id:v})} allLabel="Tanpa kategori" placeholder="Cari kategori…"/>
      <label className="s-lbl">Brand (mis. Uniqlo, Nike)</label><input className="s-input" list="brandlist" maxLength={40} value={f.brand} onChange={e=>setF({...f,brand:e.target.value})}/>
      <datalist id="brandlist">{brands.map(b=><option key={b} value={b}/>)}</datalist>
      <label className="s-lbl">Harga (Rp)</label><input className="s-input" type="number" inputMode="numeric" value={f.price} onChange={e=>setF({...f,price:e.target.value})}/>
      <label className="s-lbl">Diskon (%) · kosongkan jika tidak ada</label><input className="s-input" type="number" inputMode="numeric" min="0" max="90" placeholder="mis. 20" value={f.discount_percent} onChange={e=>setF({...f,discount_percent:e.target.value})}/>
      {+f.discount_percent>0&&+f.price>0&&<div className="s-ok" style={{marginTop:8}}>Harga yang tampil: <s className="s-mute">{idr(+f.price)}</s> → <b>{idr(Math.round(+f.price*(100-Math.min(90,+f.discount_percent))/100))}</b></div>}
      <label className="s-lbl">Ukuran tersedia</label>
      <div className="s-sizes">{sizeOpts.map(s=><button key={s} type="button" className={f.sizes.includes(s)?'on':''} onClick={()=>toggle(s)}>{s}</button>)}</div>
      <div className="s-row" style={{marginTop:8}}><input className="s-input" placeholder="Ukuran lain, mis. 38 atau 30" maxLength={10} value={custom} onChange={e=>setCustom(e.target.value)}/>
        <button type="button" className="s-btn sm ghost" style={{margin:0}} onClick={()=>{const v=custom.trim().toUpperCase();if(v&&!f.sizes.includes(v))setF({...f,sizes:[...f.sizes,v]});setCustom('')}}>Tambah</button></div>
      <label className="s-lbl">Deskripsi</label><textarea className="s-input" rows={4} placeholder="Bahan, potongan, cara perawatan…" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/>
      <label className="s-row" style={{margin:'14px 0'}}><input type="checkbox" checked={f.is_active} onChange={e=>setF({...f,is_active:e.target.checked})}/> Tampilkan di toko</label>
      <button className="s-btn" disabled={busy} onClick={save}>{busy?'Menyimpan…':edit?'Simpan perubahan':'Tambah produk'}</button>
      {edit&&<button className="s-btn ghost" onClick={reset}>Batal ubah</button>}
    </div>
    <div className="s-lbl">Produkmu ({mine.length})</div>
    <div className="s-box">{mine.map(p=><div className="s-item" key={p.id}>
      <div className="s-th">{p.image_urls?.[0]?<img src={p.image_urls[0]} alt=""/>:'📦'}</div>
      <div><b>{p.name}</b><div className="s-mute">{p.discount_percent>0?idr(p.final_price)+' (−'+p.discount_percent+'%)':idr(p.price)}{p.brand?' · '+p.brand:''} · {p.category?.name||'Tanpa kategori'}{p.is_active?'':' · tersembunyi'}</div></div>
      <button className="s-link" onClick={()=>startEdit(p)}>Ubah</button><button className="s-link" onClick={()=>del(p)}>Hapus</button></div>)}
      {!mine.length&&<div className="s-empty">Belum ada produk.</div>}</div>
  </>
}

export function Cats({go,cats,reload,note}){   // platform admin only
  const [name,setName]=useState('')
  return <div className="s-box"><h3>Kategori</h3>
    <div className="s-row" style={{margin:'10px 0'}}><input className="s-input" placeholder="Kategori baru, mis. Jaket" maxLength={40} value={name} onChange={e=>setName(e.target.value)}/>
      <button className="s-btn sm" onClick={()=>go('/admin/categories','POST',{name}).then(()=>{setName('');reload()}).catch(note)}>Tambah</button></div>
    {cats.map(c=><div className="s-item" key={c.id}><div style={{flex:1}}><b>{c.name}</b></div>
      <button className="s-link" onClick={()=>go('/admin/categories/'+c.id,'DELETE').then(reload).catch(note)}>Hapus</button></div>)}</div>
}

export function Coupons({go,note}){
  const E={code:'',type:'percent',value:'',min_spend:'',max_uses:'',expires_at:''}
  const [f,setF]=useState(E),[list,setList]=useState([])
  const load=()=>go('/my-coupons').then(setList).catch(note)
  useEffect(()=>{load()},[])
  const add=()=>go('/my-coupons','POST',{...f,min_spend:f.min_spend||0,max_uses:f.max_uses||null,expires_at:f.expires_at||null}).then(()=>{setF(E);load()}).catch(note)
  return <>
    <div className="s-box"><h3>Kupon baru</h3>
      <label className="s-lbl">Kode</label><input className="s-input" placeholder="HEMAT10" value={f.code} onChange={e=>setF({...f,code:e.target.value.toUpperCase()})}/>
      <label className="s-lbl">Diskon</label><div className="s-row"><select className="s-input" value={f.type} onChange={e=>setF({...f,type:e.target.value})}><option value="percent">Persen %</option><option value="fixed">Nominal (Rp)</option></select>
        <input className="s-input" type="number" inputMode="numeric" placeholder={f.type==='percent'?'10':'25000'} value={f.value} onChange={e=>setF({...f,value:e.target.value})}/></div>
      <label className="s-lbl">Minimal belanja (opsional)</label><input className="s-input" type="number" inputMode="numeric" value={f.min_spend} onChange={e=>setF({...f,min_spend:e.target.value})}/>
      <label className="s-lbl">Batas pemakaian (opsional)</label><input className="s-input" type="number" inputMode="numeric" value={f.max_uses} onChange={e=>setF({...f,max_uses:e.target.value})}/>
      <label className="s-lbl">Berlaku sampai (opsional)</label><input className="s-input" type="date" value={f.expires_at} onChange={e=>setF({...f,expires_at:e.target.value})}/>
      <button className="s-btn" style={{marginTop:16}} onClick={add}>Buat kupon</button></div>
    {list.map(c=><div className="s-box" key={c.id}><b>{c.code}</b> <span className="s-st">{c.is_active?'Aktif':'Mati'}</span>
      <div className="s-mute">{c.type==='percent'?+c.value+'% off':idr(c.value)+' off'}{+c.min_spend>0?' · min '+idr(c.min_spend):''}<br/>Dipakai {c.used}{c.max_uses?' / '+c.max_uses:''}{c.expires_at?' · sampai '+String(c.expires_at).slice(0,10):''}</div>
      <div className="s-row" style={{marginTop:8}}><button className="s-link" onClick={()=>go('/my-coupons/'+c.id,'PATCH',{is_active:!c.is_active}).then(load).catch(note)}>{c.is_active?'Matikan':'Aktifkan'}</button>
        <button className="s-link" onClick={()=>go('/my-coupons/'+c.id,'DELETE').then(load).catch(note)}>Hapus</button></div></div>)}
  </>
}