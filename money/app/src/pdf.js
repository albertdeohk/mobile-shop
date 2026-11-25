import {jsPDF} from 'jspdf'
import {Capacitor} from '@capacitor/core'
import {Filesystem,Directory} from '@capacitor/filesystem'
import {Share} from '@capacitor/share'
export async function exportPDF(R,budgets,fmt,month){
  const P=n=>fmt(n).replace(/\u00a0/g,' ').replace(/\u2212/g,'-')
  const doc=new jsPDF({unit:'pt',format:'a4'});let y=56
  const ln=(l,r,b,c)=>{if(y>780){doc.addPage();y=56}doc.setFont('helvetica',b?'bold':'normal');doc.setTextColor(...(c||[26,27,58]));doc.text(String(l),48,y);if(r!==undefined)doc.text(String(r),547,y,{align:'right'});y+=18}
  doc.setFontSize(22);ln('Monthly money report',undefined,true);doc.setFontSize(11);ln(R.mname+'  -  '+R.tx.length+' transactions');y+=8
  doc.setFontSize(12);ln('Money in',P(R.inn),true,[11,138,96]);ln('Money out',P(R.out),true,[214,45,77]);ln('Left over',P(R.net),true);y+=10
  doc.setFontSize(14);ln('Money in by category',undefined,true);doc.setFontSize(11);R.gi.forEach(([c,v])=>ln(c,P(v)));y+=8
  doc.setFontSize(14);ln('Money out by category',undefined,true);doc.setFontSize(11)
  R.go.forEach(([c,v])=>{const b=budgets[c];ln(c+' ('+Math.round(v/R.out*100)+'%)'+(b?'  budget '+P(b)+(v>b?'  OVER':''):''),P(v),false,b&&v>b?[214,45,77]:null)});y+=8
  doc.setFontSize(14);ln('All transactions',undefined,true);doc.setFontSize(10)
  R.tx.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>ln(t.date+'   '+t.cat+(t.note?'   '+t.note.slice(0,40):''),(t.k==='in'?'+':'-')+P(t.amt),false,t.k==='in'?[11,138,96]:null))
  const name='money-report-'+month+'.pdf'
  if(!Capacitor.isNativePlatform()){doc.save(name);return}
  const data=doc.output('datauristring').split(',')[1]
  const f=await Filesystem.writeFile({path:name,data,directory:Directory.Cache})
  await Share.share({title:name,url:f.uri})   // iOS share sheet: Save to Files, AirDrop, WhatsApp...
}
