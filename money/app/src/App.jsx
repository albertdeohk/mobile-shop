import {useEffect,useState} from 'react'
import {Preferences} from '@capacitor/preferences'
import {exportPDF} from './pdf'
import {api,toApp} from './api'
import Shop from './Shop'
import './styles.css'
const CATS={out:[['🍜','Food'],['🚌','Transport'],['🧾','Bills'],['🛍️','Shopping'],['💊','Health'],['🎬','Fun'],['📦','Other']],in:[['💼','Salary'],['🎁','Gift'],['💰','Other income']]}
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const icon=(k,c)=>(CATS[k].find(x=>x[1]===c)||['•'])[0]
const sum=(a,k)=>a.filter(t=>t.k===k).reduce((s,t)=>s+t.amt,0)
const group=(a,k)=>{const o={};a.filter(t=>t.k===k).forEach(t=>o[t.cat]=(o[t.cat]||0)+t.amt);return Object.entries(o).sort((x,y)=>y[1]-x[1])}

export default function App(){
  const [S,setS]=useState(null),[month,setMonth]=useState(today().slice(0,7)),[tab,setTab]=useState(1)
  const [sheet,setSheet]=useState(null),[msg,setMsg]=useState(''),[pop,setPop]=useState(false)
  const [f,setF]=useState({k:'out',cat:'Food',amt:'',note:'',date:today()}),[a,setA]=useState({email:'',password:''})
  const [tx0,setTx0]=useState([]),[budgets,setBudgets]=useState({}),[users,setUsers]=useState([]),[mode,setMode]=useState('shop')
  useEffect(()=>{Preferences.get({key:'money2'}).then(r=>setS({cur:'IDR',api:'http://localhost:8000',token:'',user:null,...(r.value?JSON.parse(r.value):{})}))},[])
  const tok=S&&S.token
  const go=(path,method,body)=>api(S.api,path,method,body,S.token)
  const loadTx=()=>go('/transactions?month='+month).then(r=>setTx0(r.map(toApp))).catch(e=>setMsg(e.message))
  useEffect(()=>{if(tok)loadTx()},[tok,month])
  useEffect(()=>{if(tok)go('/budgets').then(setBudgets).catch(e=>setMsg(e.message))},[tok])
  if(!S)return null
  const upd=fn=>setS(p=>{const n=fn(p);Preferences.set({key:'money2',value:JSON.stringify(n)});return n})
  const fmt=n=>new Intl.NumberFormat(undefined,{style:'currency',currency:S.cur,maximumFractionDigits:S.cur==='IDR'?0:2}).format(n)
  const shift=n=>{let[y,m]=month.split('-').map(Number);m+=n;if(m>12){m=1;y++}if(m<1){m=12;y--}setMonth(y+'-'+String(m).padStart(2,'0'))}
  const [y,m]=month.split('-').map(Number),mname=new Date(y,m-1,1).toLocaleDateString(undefined,{month:'long',year:'numeric'})
  const tx=tx0
  const inn=sum(tx,'in'),out=sum(tx,'out'),net=inn-out,sp=Object.fromEntries(group(tx,'out'))
  const over=[],near=[]
  Object.entries(budgets).forEach(([c,b])=>{const v=sp[c]||0;if(b>0){if(v>b)over.push([c,v-b]);else if(v>=b*.8)near.push([c,Math.round(v/b*100)])}})
  const coin=over.length?'😱':near.length?'😟':!tx.length?'😴':net>0?'😄':net===0?'😐':'😬'
  const say=over.length?(over.length>1?'Over budget on '+over.map(x=>x[0]).join(', ')+'.':over[0][0]+' is '+fmt(over[0][1])+' over budget. Time to stop!'):near.length?near[0][0]+' has used '+near[0][1]+'% of its budget. Careful!':!tx.length?'Fresh month. Log your first one!':net>0?'You’re '+fmt(net)+' ahead this month.':net===0?'Perfectly even so far.':'Spending is '+fmt(-net)+' ahead of income.'
  const R={mname,tx,inn,out,net,gi:group(tx,'in'),go:group(tx,'out')}
  const days=new Set(tx.filter(t=>t.k==='out').map(t=>t.date)).size

  const add=async()=>{const amt=parseFloat(f.amt);if(!(amt>0))return setMsg('Enter an amount greater than 0.')
    try{await go('/transactions','POST',{kind:f.k,amount:amt,category:f.cat,note:f.note.trim(),date:f.date||today()})
      const mo=(f.date||today()).slice(0,7);setSheet(null);setMsg('');mo===month?loadTx():setMonth(mo)}catch(e){setMsg(e.message)}}
  const del=id=>go('/transactions/'+id,'DELETE').then(loadTx).catch(e=>setMsg(e.message))
  const setBudget=(c,v)=>go('/budgets','PUT',{category:c,amount:v>0?v:0}).then(setBudgets).catch(e=>setMsg(e.message))
  const auth=async path=>{try{const j=await api(S.api,path,'POST',a);upd(p=>({...p,token:j.token,user:j.user}));setMsg('')}catch(e){setMsg(e.message)}}
  const logout=()=>{go('/logout','POST').catch(()=>{});upd(p=>({...p,token:'',user:null}));setTx0([]);setBudgets({});setSheet(null)}
  const loadUsers=()=>go('/admin/users').then(setUsers).catch(e=>setMsg(e.message))
  const openUsers=()=>{setMsg('');setSheet('users');loadUsers()}
  const patchUser=(id,b)=>go('/admin/users/'+id,'PATCH',b).then(loadUsers).catch(e=>setMsg(e.message))
  const delUser=id=>go('/admin/users/'+id,'DELETE').then(loadUsers).catch(e=>setMsg(e.message))
  if(!S.token)return <div className="hero" style={{minHeight:'100vh',borderRadius:0}}><div className="wrap">
    <div className="mas"><div className="coin">🪙</div><div><div className="big" style={{fontSize:30}}>Money</div><div className="say">Sign in to keep your money safe in the cloud.</div></div></div>
    <div className="pane" style={{marginTop:24,borderRadius:24}}>
      <div className="f"><input placeholder="Server URL" value={S.api} onChange={e=>upd(p=>({...p,api:e.target.value}))}/></div>
      <div className="f"><input placeholder="Name (sign up only)" value={a.name||''} onChange={e=>setA({...a,name:e.target.value})}/></div>
      <div className="f"><input placeholder="Email" type="email" value={a.email} onChange={e=>setA({...a,email:e.target.value})}/></div>
      <div className="f"><input placeholder="Password (8+ characters)" type="password" value={a.password} onChange={e=>setA({...a,password:e.target.value})}/></div>
      <div className="err">{msg}</div>
      <button className="save" onClick={()=>auth('/login')}>Log in</button><button className="ghost" onClick={()=>auth('/register')}>Create account</button>
    </div></div></div>

  if(mode==='shop')return <Shop base={S.api} token={S.token} user={S.user} onMoney={()=>setMode('money')} onLogout={logout}/>
  return <>
    <div className="hero"><div className="wrap">
      <div className="top"><div className="mo"><button className="ic" onClick={()=>shift(-1)}>‹</button><span>{mname}</span><button className="ic" onClick={()=>shift(1)}>›</button></div>
        <div><select value={S.cur} onChange={e=>upd(p=>({...p,cur:e.target.value}))}>{['IDR','USD','EUR','GBP','SGD'].map(c=><option key={c}>{c}</option>)}</select><button className="gear" onClick={()=>setMode('shop')}>🛍️</button><button className="gear" onClick={()=>{setMsg('');setSheet('account')}}>👤</button></div></div>
      <div className="mas"><div className={'coin'+(pop?' pop':'')} onClick={()=>{setPop(true);setTimeout(()=>setPop(false),250)}}>{coin}</div><div><div className="big">{fmt(net)}</div><div className="say">{say}</div></div></div>
    </div></div>
    <div className="wrap pull"><div className="io"><div><small>Money in</small><b className="in">{fmt(inn)}</b></div><div><small>Money out</small><b className="out">{fmt(out)}</b></div></div></div>
    <main>
      <div className="seg">{[[1,'Transactions'],[2,'Report'],[3,'Budgets']].map(([n,l])=><button key={n} className={tab===n?'on':''} onClick={()=>setTab(n)}>{l}</button>)}</div>
      {tab===3?<><div className="day"><span>Monthly limit for each category</span></div><div className="list">
        {CATS.out.map(([e,c])=>{const b=budgets[c]||0,v=sp[c]||0,p=b?Math.min(100,Math.round(v/b*100)):0
          return <div className="row" style={{flexWrap:'wrap'}} key={c}><div className="em">{e}</div><div className="t">{c}<span>{fmt(v)}{b?' of '+fmt(b)+' · '+Math.round(v/b*100)+'%':' spent · no limit'}</span></div>
            <input className="bi" type="number" inputMode="decimal" placeholder="Limit" defaultValue={b||''} key={c+b} onBlur={ev=>setBudget(c,parseFloat(ev.target.value))}/>
            {b>0&&<div className="pb"><u style={{width:p+'%',background:v>b?'var(--out)':v>=b*.8?'var(--sun)':'var(--in)'}}/></div>}</div>})}</div></>
      :!tx.length?<div className="empty">Nothing recorded this month.<br/>Tap Add to log your first transaction.</div>
      :tab===1?Object.entries(tx.reduce((o,t)=>((o[t.date]=o[t.date]||[]).push(t),o),{})).map(([d,l])=><div key={d}>
          <div className="day"><span>{new Date(d+'T00:00').toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'})}</span><span>{fmt(sum(l,'in')-sum(l,'out'))}</span></div>
          <div className="list">{l.map(t=><div className="row" key={t.id}><div className="em">{icon(t.k,t.cat)}</div><div className="t">{t.cat}{t.note&&<span>{t.note}</span>}</div><b className={t.k}>{t.k==='in'?'+':'−'}{fmt(t.amt)}</b><button className="del" onClick={()=>del(t.id)}>×</button></div>)}</div></div>)
      :<div className="rc"><h3>Monthly report</h3><div className="sub">{mname} · {tx.length} transactions</div><hr/>
        <div className="ln sec"><span>Money in</span></div>
        {R.gi.map(([c,v])=><div className="ln" key={c}><span>{icon('in',c)} {c}</span><span className="in">+{fmt(v)}</span></div>)}
        <div className="ln tot"><span>Total in</span><span className="in">{fmt(inn)}</span></div><hr/>
        <div className="ln sec"><span>Money out</span></div>
        {R.go.map(([c,v])=>{const p=Math.round(v/out*100);return <div key={c}><div className="ln"><span>{icon('out',c)} {c} {p}%</span><span className="out">−{fmt(v)}</span></div><div className="mini"><u style={{width:p+'%'}}/></div></div>})}
        <div className="ln tot"><span>Total out</span><span className="out">{fmt(out)}</span></div><hr/>
        <div className="ln tot" style={{border:0,fontSize:16}}><span>Left over</span><span className={net>=0?'in':'out'}>{fmt(net)}</span></div>
        <div className="stat"><div>Biggest spend<b>{R.go[0]?R.go[0][0]:'–'}</b></div><div>Daily average<b>{fmt(days?out/days:0)}</b></div><div>Saved<b>{inn?Math.round(net/inn*100):0}%</b></div></div>
        <button className="save" style={{marginTop:16}} onClick={()=>exportPDF(R,budgets,fmt,month).catch(e=>setMsg(e.message))}>Download PDF report</button></div>}
    </main>
    <button className="fab" onClick={()=>{setF({k:'out',cat:'Food',amt:'',note:'',date:today()});setMsg('');setSheet('add')}}>+ Add</button>

    {sheet&&<div className="sheet open" onClick={e=>e.target===e.currentTarget&&setSheet(null)}><div className="pane">
      {sheet==='add'?<>
        <h2>New transaction</h2>
        <div className="tg"><button id="kout" className={f.k==='out'?'on':''} onClick={()=>setF({...f,k:'out',cat:'Food'})}>Money out</button><button id="kin" className={f.k==='in'?'on':''} onClick={()=>setF({...f,k:'in',cat:'Salary'})}>Money in</button></div>
        <input className="amt" type="number" inputMode="decimal" placeholder="0" autoFocus value={f.amt} onChange={e=>setF({...f,amt:e.target.value})}/>
        <div className="cats">{CATS[f.k].map(([e,c])=><button key={c} className={f.cat===c?'on':''} onClick={()=>setF({...f,cat:c})}>{e} {c}</button>)}</div>
        <div className="f"><input placeholder="Note (optional)" maxLength={60} value={f.note} onChange={e=>setF({...f,note:e.target.value})}/><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></div>
        <div className="err">{msg}</div><button className="save" onClick={add}>Save transaction</button>
      </>:sheet==='account'?<>
        <h2>{S.user?.name}</h2><div className="msg">{S.user?.email} · {S.user?.role}</div><div className="msg">Server: {S.api}</div>
        {S.user?.role==='admin'&&<button className="ghost" onClick={openUsers}>Manage users</button>}
        <button className="ghost" onClick={logout}>Log out</button>
      </>:<>
        <h2>Users</h2><div className="err">{msg}</div>
        <div className="list" style={{maxHeight:'50vh',overflow:'auto'}}>{users.map(u=><div className="row" key={u.id}><div className="t">{u.name}<span>{u.email} · {u.role}{u.is_active?'':' · disabled'}</span></div>
          <button className="del" onClick={()=>patchUser(u.id,{is_active:!u.is_active})}>{u.is_active?'Disable':'Enable'}</button><button className="del" onClick={()=>delUser(u.id)}>×</button></div>)}</div>
      </>}
    </div></div>}
  </>
}