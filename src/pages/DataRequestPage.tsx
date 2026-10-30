import {useEffect,useState} from "react";
import {Download,ExternalLink,FileLock2,Trash2} from "lucide-react";
import {Link} from "react-router-dom";
import ContactForm from "../components/ContactForm";
import {supabase} from "../lib/supabase";
import "../styles-support.css";

export default function DataRequestPage(){
 const [userId,setUserId]=useState("");
 const [busy,setBusy]=useState(false);
 const [confirmDelete,setConfirmDelete]=useState(false);
 const [message,setMessage]=useState<{kind:"ok"|"error";text:string}|null>(null);

 useEffect(()=>{
  if(!supabase)return;
  let alive=true;
  void supabase.auth.getUser().then(({data})=>{if(alive)setUserId(data.user?.id??"");}).catch(()=>undefined);
  return()=>{alive=false;};
 },[]);

 async function download(){
  if(!supabase)return;
  setBusy(true);setMessage(null);
  const {data,error}=await supabase.rpc("export_my_data");
  setBusy(false);
  if(error||!data){setMessage({kind:"error",text:"We could not prepare your export. Please try again, or send a request using the form below."});return;}
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  const link=document.createElement("a");
  link.href=url;link.download="chatsched-sport-my-data.json";
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  setMessage({kind:"ok",text:"Your data was downloaded. Keep the file private because it contains personal information."});
 }

 async function requestDeletion(){
  if(!supabase)return;
  setBusy(true);setMessage(null);
  const {error}=await supabase.rpc("request_account_deletion",{reason_text:"Requested by account holder from the data request page"});
  setBusy(false);setConfirmDelete(false);
  setMessage(error?{kind:"error",text:"We could not record your request. Please try again, or use the form below."}:{kind:"ok",text:"Your deletion request has been recorded. An administrator reviews each request before deleting. Safety reports and audit entries are kept in anonymised form."});
 }

 return <section className="sx-page">
  <header className="sx-hero">
   <span className="sx-icon"><FileLock2 size={26} aria-hidden="true"/></span>
   <p className="section-kicker">YOUR DATA</p>
   <h1>See, correct, export or delete your information.</h1>
   <p className="sx-lead">Under South Africa's Protection of Personal Information Act (POPIA) you can ask what we hold about you, ask us to correct it, object to how it is used, or ask us to delete it.</p>
  </header>
  <div className="sx-body">
   {userId&&<div className="sx-grid">
    <article className="sx-card"><h3>Download my data</h3><p>Get a copy of the personal information linked to your account as a file.</p><button className="button button-dark" type="button" onClick={()=>void download()} disabled={busy}><Download size={15}/> Download my data</button></article>
    <article className="sx-card"><h3>Correct my information</h3><p>You can edit your profile, achievements and organisation details yourself.</p><Link className="button button-light-outline-dark" to="/workspace">Open my workspace</Link></article>
    <article className="sx-card"><h3>Delete my account</h3><p>Ask us to delete your account and personal data. An administrator reviews each request first.</p>
     {!confirmDelete?<button className="button button-light-outline-dark" type="button" onClick={()=>setConfirmDelete(true)} disabled={busy}><Trash2 size={15}/> Request deletion</button>:
      <div className="sx-confirm" role="alertdialog" aria-label="Confirm deletion request"><p><strong>This cannot be undone once processed.</strong> Your profile, applications and messages will be removed.</p><div className="sx-actions"><button className="button button-dark" type="button" onClick={()=>void requestDeletion()} disabled={busy}>Yes, request deletion</button><button className="button button-light-outline-dark" type="button" onClick={()=>setConfirmDelete(false)}>Cancel</button></div></div>}
    </article>
   </div>}
   {message&&<div className={message.kind==="ok"?"sx-success":"sx-error"} role="status">{message.text}</div>}
   {!userId&&<p className="sx-note">Sign in to download or delete your data in one step. <Link to="/join?mode=login&next=%2Fdata-request">Sign in</Link>. If you cannot sign in, or you are not a member, use the form below.</p>}

   <div className="sx-split">
    <div className="sx-card">
     <h2>Send a data request</h2>
     <ContactForm
      kinds={[{value:"data_request",label:"Data request"}]}
      subjectPrefix="Data request"
      messageLabel="What would you like us to do?"
      messagePlaceholder="For example: tell me what information you hold about me; correct my date of birth; stop using my information for…"
      submitLabel="Send request"
      success="Your request has been received and marked as high priority. We may ask you to confirm your identity before we share or change any information. We will reply to your email address."
     />
    </div>
    <aside className="sx-side">
     <h2>How this works</h2>
     <ul>
      <li>We may ask you to confirm who you are before acting on a request.</li>
      <li>We respond within a reasonable time and tell you if we need more information.</li>
      <li>Some records, such as safety reports and audit entries, are kept in anonymised form.</li>
      <li>See the <Link to="/privacy">privacy overview</Link> and <Link to="/cookies">cookie settings</Link>.</li>
     </ul>
     <h3>Not happy with our response?</h3>
     <p className="sx-small">You can complain to South Africa's Information Regulator through its <a href="https://inforegulator.org.za/complaints/" target="_blank" rel="noreferrer">complaints page<ExternalLink size={12} aria-hidden="true"/><span className="sr-only"> (opens in new tab)</span></a>.</p>
    </aside>
   </div>
  </div>
 </section>;
}
