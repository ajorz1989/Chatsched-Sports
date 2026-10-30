import {useEffect,useState,type FormEvent} from "react";
import {ArrowUpRight,CheckCircle2,LoaderCircle} from "lucide-react";
import {supabase,supabaseConfigured} from "../lib/supabase";

export type ContactKind="general"|"support"|"data_request"|"concern"|"safeguarding"|"partnership";
type KindOption={value:ContactKind;label:string};

type Props={
 kinds:KindOption[];
 initialKind?:ContactKind;
 subjectPrefix?:string;
 messageLabel?:string;
 messagePlaceholder?:string;
 showUrl?:boolean;
 urlLabel?:string;
 submitLabel?:string;
 success:string;
};

export default function ContactForm({kinds,initialKind,subjectPrefix,messageLabel="Message",messagePlaceholder,showUrl=false,urlLabel="Link to the page concerned (optional)",submitLabel="Send message",success}:Props){
 const [kind,setKind]=useState<ContactKind>(initialKind??kinds[0].value);
 const [name,setName]=useState("");
 const [email,setEmail]=useState("");
 const [subject,setSubject]=useState("");
 const [message,setMessage]=useState("");
 const [url,setUrl]=useState("");
 const [website,setWebsite]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [sent,setSent]=useState(false);

 // Pre-fill from the signed-in account; people can still edit the fields.
 useEffect(()=>{
  if(!supabase)return;
  let alive=true;
  void supabase.auth.getUser().then(({data})=>{
   if(!alive||!data.user)return;
   setEmail(current=>current||data.user?.email||"");
   const display=String(data.user.user_metadata?.display_name??"").trim();
   if(display)setName(current=>current||display);
  }).catch(()=>undefined);
  return()=>{alive=false;};
 },[]);

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!supabase||busy)return;
  setBusy(true);setError("");
  const finalSubject=[subjectPrefix,subject.trim()].filter(Boolean).join(": ");
  const {error:rpcError}=await supabase.rpc("submit_contact_message",{
   p_kind:kind,p_name:name,p_email:email,p_subject:finalSubject,p_message:message,p_related_url:url.trim()||null,p_website:website
  });
  setBusy(false);
  if(rpcError){
   // The database raises plain-language messages for validation and rate limits; anything else is generic.
   const known=/message|email|name|recently|volume|valid|characters/i.test(rpcError.message)&&rpcError.message.length<160;
   setError(known?rpcError.message:"Your message could not be sent. Please try again in a few minutes.");
   return;
  }
  setSent(true);setMessage("");setSubject("");setUrl("");
 }

 if(!supabaseConfigured||!supabase)return <p className="sx-note">This form activates once the Sport database is connected.</p>;
 if(sent)return <div className="sx-success" role="status"><CheckCircle2 size={20} aria-hidden="true"/><div><strong>Message received.</strong><p>{success}</p><button type="button" className="sx-link" onClick={()=>setSent(false)}>Send another message</button></div></div>;

 return <form className="sx-form" onSubmit={submit} noValidate={false}>
  {kinds.length>1&&<label className="sx-field"><span>What is this about?</span><select value={kind} onChange={e=>setKind(e.target.value as ContactKind)}>{kinds.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
  <div className="sx-row">
   <label className="sx-field"><span>Your name</span><input value={name} onChange={e=>setName(e.target.value)} required maxLength={120} autoComplete="name"/></label>
   <label className="sx-field"><span>Email address</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} autoComplete="email"/></label>
  </div>
  <label className="sx-field"><span>Subject (optional)</span><input value={subject} onChange={e=>setSubject(e.target.value)} maxLength={150}/></label>
  {showUrl&&<label className="sx-field"><span>{urlLabel}</span><input type="url" value={url} onChange={e=>setUrl(e.target.value)} maxLength={500} placeholder="https://"/></label>}
  <label className="sx-field"><span>{messageLabel}</span><textarea value={message} onChange={e=>setMessage(e.target.value)} required minLength={10} maxLength={5000} rows={6} placeholder={messagePlaceholder}/></label>
  {/* Honeypot: hidden from people and assistive tech; bots tend to fill it in. */}
  <div className="sx-hp" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label></div>
  {error&&<div className="sx-error" role="alert">{error}</div>}
  <button className="button button-dark" type="submit" disabled={busy||message.trim().length<10||!name.trim()||!email.trim()}>{busy?<><LoaderCircle size={16} className="spin"/> Sending…</>:<>{submitLabel} <ArrowUpRight size={16}/></>}</button>
 </form>;
}
