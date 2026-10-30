import {useState} from "react";
import {Cookie} from "lucide-react";
import {Link} from "react-router-dom";
import {CONSENT_VERSION,resetConsent,setConsent,useConsent} from "../lib/consent";
import {supabase} from "../lib/supabase";
import "../styles-support.css";

const items=[
 {name:"Sign-in session",purpose:"Keeps you signed in and protects your account.",type:"Essential",duration:"Until you sign out or the session expires",holder:"ChatSched Sport (browser storage)"},
 {name:"Your cookie choice",purpose:"Remembers whether you allowed optional analytics.",type:"Essential",duration:"Until you clear it or the policy version changes",holder:"ChatSched Sport (browser storage)"},
 {name:"Usage analytics",purpose:"Would help us understand which pages are useful. Not active yet. If we turn it on, it will run only if you allow it.",type:"Optional",duration:"Set by the analytics provider when enabled",holder:"To be named before use"}
];

export default function CookiesPage(){
 const consent=useConsent();
 const [notice,setNotice]=useState("");

 async function choose(analytics:boolean){
  setConsent(analytics);
  setNotice(analytics?"Optional analytics allowed.":"Optional analytics switched off.");
  // Signed-in members also get the choice recorded against their account (best effort).
  if(!supabase)return;
  try{
   const {data}=await supabase.auth.getUser();
   if(!data.user)return;
   const now=new Date().toISOString();
   await supabase.from("compliance_consents").insert({user_id:data.user.id,consent_type:"analytics",version:CONSENT_VERSION,granted:analytics,granted_at:analytics?now:null,withdrawn_at:analytics?null:now,source:"web"});
  }catch{/* the local choice already applies */}
 }

 return <section className="sx-page">
  <header className="sx-hero">
   <span className="sx-icon"><Cookie size={24} aria-hidden="true"/></span>
   <p className="section-kicker">COOKIES AND STORAGE</p>
   <h1>Cookie policy and settings.</h1>
   <p className="sx-lead">Cookies and similar browser storage are small pieces of data kept on your device. We keep this simple: essential storage only, and optional analytics only with your permission.</p>
  </header>
  <div className="sx-body">
   <div className="sx-card" aria-live="polite">
    <h2>Your choice</h2>
    <p>{consent?<>Optional analytics are <strong>{consent.analytics?"allowed":"off"}</strong>. Saved {new Date(consent.decidedAt).toLocaleDateString("en-ZA",{day:"numeric",month:"long",year:"numeric"})}.</>:<>You have not chosen yet. Until you do, optional analytics stay off.</>}</p>
    <div className="sx-actions">
     <button type="button" className={"button "+(consent?.analytics===false?"button-dark":"button-light-outline-dark")} onClick={()=>void choose(false)}>Essential only</button>
     <button type="button" className={"button "+(consent?.analytics?"button-dark":"button-light-outline-dark")} onClick={()=>void choose(true)}>Allow analytics</button>
     {consent&&<button type="button" className="sx-link" onClick={()=>{resetConsent();setNotice("Your choice was cleared. We will ask again.");}}>Clear my choice</button>}
    </div>
    {notice&&<p className="sx-note" role="status">{notice}</p>}
   </div>

   <h2>What we store</h2>
   <div className="sx-table-wrap"><table className="sx-table"><thead><tr><th>Item</th><th>Purpose</th><th>Type</th><th>How long</th><th>Held by</th></tr></thead><tbody>
    {items.map(item=><tr key={item.name}><th scope="row">{item.name}</th><td>{item.purpose}</td><td>{item.type}</td><td>{item.duration}</td><td>{item.holder}</td></tr>)}
   </tbody></table></div>

   <h2>Good to know</h2>
   <ul className="sx-list">
    <li>We do not use advertising or tracking cookies, and we do not sell personal information.</li>
    <li>Blocking essential storage in your browser will stop sign-in from working.</li>
    <li>You can change your choice at any time on this page. Clearing your browser data also resets it.</li>
    <li>Questions about your information? See the <Link to="/privacy">privacy overview</Link> or make a <Link to="/data-request">data request</Link>.</li>
   </ul>
   <p className="sx-small">Policy version {CONSENT_VERSION}. This summary describes how the product works today. A full legal review of the privacy and cookie notices is still required before public launch.</p>
  </div>
 </section>;
}
