import {useState} from "react";
import {ArrowRight,ShieldCheck,X} from "lucide-react";
import {supabase} from "../lib/supabase";

type Props={opportunityId:string;opportunityTitle:string;userId:string;isMinor?:boolean};
export default function SupportRequestButton({opportunityId,opportunityTitle,userId,isMinor=false}:Props){
 const [open,setOpen]=useState(false);const [service,setService]=useState("trial_support");const [goals,setGoals]=useState("");const [consent,setConsent]=useState(false);const [guardianConsent,setGuardianConsent]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function submit(){
  if(!supabase)return;
  if(goals.trim().length<10){setMessage("Please tell us what support you need.");return;}
  if(!consent){setMessage("Please consent to being contacted about this support request.");return;}
  if(isMinor&&!guardianConsent){setMessage("A parent or legal guardian must consent before career-support services can be discussed.");return;}
  setBusy(true);setMessage("");
  const {error}=await supabase.from("career_support_requests").insert({athlete_id:userId,service_type:service,goals:("Opportunity: "+opportunityTitle+" ("+opportunityId+")\n\n"+goals.trim()),preferred_outcome:"Support requested from the opportunity page.",consent_to_contact:true,guardian_consent:isMinor,guardian_consent_at:isMinor?new Date().toISOString():null});
  setBusy(false);
  if(error){setMessage(error.message);return;}
  setMessage("Request sent. A ChatSched Sport support reviewer can follow up; this does not guarantee selection or representation.");
  setGoals("");setConsent(false);setGuardianConsent(false);
 }
 return <><button type="button" className="button button-light-outline button-full" onClick={()=>setOpen(true)}><ShieldCheck size={16}/> Request ChatSched Sport support <ArrowRight size={15}/></button>
 {open&&<div className="workspace-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><div className="workspace-modal" role="dialog" aria-modal="true" aria-label="Request ChatSched Sport support"><div className="workspace-modal-head"><div><p className="workspace-kicker">CAREER SUPPORT</p><h2>Request support for this opportunity.</h2></div><button type="button" aria-label="Close" onClick={()=>setOpen(false)}><X size={18}/></button></div><p className="workspace-muted">This creates a support case for review. It is not an application and does not promise selection, representation, a contract or sponsorship.</p>
 <label>Support type<select value={service} onChange={e=>setService(e.target.value)}><option value="trial_support">Trial preparation / support</option><option value="career_planning">Career planning</option><option value="profile_review">Profile & sports-CV review</option><option value="representation">Representation enquiry</option><option value="sponsorship">Sponsorship support</option></select></label>
 <label>What do you need help with?<textarea rows={5} maxLength={3500} value={goals} onChange={e=>setGoals(e.target.value)} placeholder="Tell us what you want help understanding or preparing for."/></label>
 <label className="cv-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I consent to ChatSched Sport contacting me about this request.</span></label>
 {isMinor&&<label className="cv-check"><input type="checkbox" checked={guardianConsent} onChange={e=>setGuardianConsent(e.target.checked)}/><span>I confirm that a parent/legal guardian has given consent for this support request.</span></label>}
 {message&&<div className="workspace-notice notice-info">{message}</div>}
 <div className="workspace-modal-actions"><button type="button" className="button button-light-outline" onClick={()=>setOpen(false)}>Cancel</button><button type="button" className="button button-accent" disabled={busy} onClick={()=>void submit()}>{busy?"Sending…":"Send support request"}</button></div>
 </div></div>}</>;
}