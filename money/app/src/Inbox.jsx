import {useEffect,useRef,useState} from 'react'
import {Avatar} from './ShopAdmin'

const merge=(a,b)=>[...a,...b.filter(n=>!a.some(o=>o.id===n.id))]

export default function Inbox({go,user,chat,setChat}){
  const [list,setList]=useState([]),[msgs,setMsgs]=useState([]),[text,setText]=useState(''),[err,setErr]=useState('')
  const end=useRef(null),last=useRef(0)
  const loadList=()=>go('/conversations').then(setList).catch(e=>setErr(e.message))
  useEffect(()=>{loadList();if(chat)return;const i=setInterval(loadList,8000);return()=>clearInterval(i)},[chat])
  useEffect(()=>{
    if(!chat)return
    setMsgs([]);last.current=0
    const poll=()=>go('/conversations/'+chat+'/messages?after='+last.current).then(r=>{if(r.length){last.current=r[r.length-1].id;setMsgs(m=>merge(m,r))}}).catch(e=>setErr(e.message))
    poll();const i=setInterval(poll,3000);return()=>clearInterval(i)
  },[chat])
  useEffect(()=>{end.current&&end.current.scrollIntoView({behavior:'smooth'})},[msgs.length])
  const cur=list.find(c=>c.id===chat)
  const send=async()=>{
    const body=text.trim();if(!body)return;setText('')
    try{const m=await go('/conversations/'+chat+'/messages','POST',{body});last.current=Math.max(last.current,m.id);setMsgs(x=>merge(x,[m]))}
    catch(e){setErr(e.message);setText(body)}
  }
  if(chat)return <div className="s-chat"><div className="s-chat-in">
    <div className="s-chat-top"><button className="s-ic" onClick={()=>{setChat(null);setErr('')}}>‹</button><Avatar url={cur?.logo_url} name={cur?.title} size={40}/><b>{cur?.title||'Chat'}</b></div>
    <div className="s-msgs">{msgs.map(m=><div key={m.id} className={'s-b '+(m.sender_id===user.id?'me':'you')}>{m.body}</div>)}
      {!msgs.length&&<div className="s-empty">Belum ada pesan. Sapa duluan 👋</div>}<div ref={end}/></div>
    {err&&<div className="s-note" style={{padding:'0 14px'}}>{err}</div>}
    <div className="s-send"><input className="s-input" placeholder="Tulis pesan…" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}/><button className="s-btn sm" onClick={send}>Kirim</button></div>
  </div></div>
  return <>
    <div className="s-h">Inbox</div>
    {err&&<div className="s-note">{err}</div>}
    {list.length?<div className="s-box" style={{padding:'4px 16px'}}>{list.map(c=><button className="s-conv" key={c.id} onClick={()=>setChat(c.id)}>
      <Avatar url={c.logo_url} name={c.title} size={48}/>
      <div className="s-li"><b>{c.title} {c.as==='seller'&&<span className="s-st">Pembeli</span>}</b><div className="s-mute s-ell">{c.last||'—'}</div></div>
      {c.unread>0&&<span className="s-badge s-static">{c.unread}</span>}</button>)}</div>
    :<div className="s-empty">Belum ada percakapan.<br/>Buka halaman toko lalu tekan “Chat penjual”.</div>}
  </>
}