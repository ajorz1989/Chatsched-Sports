import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, History, LoaderCircle, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase, supabaseConfigured } from "../lib/supabase";
import "../styles-workspace.css";

type Organisation = {id:string;name:string;organisation_type:string;verification_status:string;location:string|null;country:string;created_at:string;owner_id:string};
type Opportunity = {id:string;title:string;opportunity_type:string;status:string;verification_status:string;closing_date:string|null;created_at:string;organisation_id:string;organisations:{name?:string;verification_status?:string}|{name?:string;verification_status?:string}[]|null};
type Application = {id:string;opportunity_id:string;athlete_id:string;status:string;created_at:string;message:string|null};
type SafetyReport = {id:string;reporter_id:string;target_type:string;target_id:string;reason:string;details:string;status:string;resolution:string|null;created_at:string;reviewed_by:string|null;reviewed_at:string|null};
type CareerRequest = {id:string;athlete_id:string;service_type:string;goals:string;preferred_outcome:string|null;consent_to_contact:boolean;status:string;admin_notes:string|null;created_at:string;reviewed_by:string|null;reviewed_at:string|null};
type AuditEvent = {id:string;actor_id:string;action_type:string;target_type:string;target_id:string;details:Record<string,unknown>;created_at:string};
const applicationStates=["reviewing","shortlisted","declined","accepted"] as const;

export default function AdminPage(){
 const [userId,setUserId]=useState("");const [checked,setChecked]=useState(false);const [allowed,setAllowed]=useState(false);const [loading,setLoading]=useState(true);
 const [organisations,setOrganisations]=useState<Organisation[]>([]);const [opportunities,setOpportunities]=useState<Opportunity[]>([]);const [applications,setApplications]=useState<Application[]>([]);const [reports,setReports]=useState<SafetyReport[]>([]);const [reportResolution,setReportResolution]=useState<Record<string,string>>({});const [careerRequests,setCareerRequests]=useState<CareerRequest[]>([]);const [careerNotes,setCareerNotes]=useState<Record<string,string>>({});const [auditEvents,setAuditEvents]=useState<AuditEvent[]>([]);
 const [tab,setTab]=useState<"organisations"|"opportunities"|"applications"|"reports"|"career"|"audit">("organisations");
 const [notice,setNotice]=useState<{kind:"success"|"error"|"info";text:string}|null>(null);const [busyId,setBusyId]=useState("");
 async function refresh(){
  if(!supabase)return;setLoading(true);
  try{
   const [o,p,a,r,c,l]=await Promise.all([
    supabase.from("organisations").select("id,name,organisation_type,verification_status,location,country,created_at,owner_id").order("created_at",{ascending:false}).limit(100),
    supabase.from("opportunities").select("id,title,opportunity_type,status,verification_status,closing_date,created_at,organisation_id,organisations(name,verification_status)").order("created_at",{ascending:false}).limit(100),
    supabase.from("opportunity_applications").select("id,opportunity_id,athlete_id,status,created_at,message").order("created_at",{ascending:false}).limit(100),
    supabase.from("safety_reports").select("id,reporter_id,target_type,target_id,reason,details,status,resolution,created_at,reviewed_by,reviewed_at").order("created_at",{ascending:false}).limit(200),
    supabase.from("career_support_requests").select("id,athlete_id,service_type,goals,preferred_outcome,consent_to_contact,status,admin_notes,created_at,reviewed_by,reviewed_at").order("created_at",{ascending:false}).limit(200),
    supabase.from("admin_audit_log").select("id,actor_id,action_type,target_type,target_id,details,created_at").order("created_at",{ascending:false}).limit(250),
   ]);
   if(o.error)throw o.error;if(p.error)throw p.error;if(a.error)throw a.error;if(r.error)throw r.error;if(c.error)throw c.error;if(l.error)throw l.error;
   setOrganisations((o.data??[]) as Organisation[]);setOpportunities((p.data??[]) as unknown as Opportunity[]);setApplications((a.data??[]) as Application[]);setReports((r.data??[]) as SafetyReport[]);setCareerRequests((c.data??[]) as CareerRequest[]);setAuditEvents((l.data??[]) as AuditEvent[]);
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Moderation data could not be loaded. Check the Sport database policies."});}
  finally{setLoading(false);}
 }
 useEffect(()=>{
  let alive=true;
  (async()=>{
   if(!supabaseConfigured||!supabase){setChecked(true);setLoading(false);return;}
   try{
    const {data:{user}}=await supabase.auth.getUser();
    if(!alive)return;
    if(!user){setChecked(true);setLoading(false);return;}
    setUserId(user.id);
    const {data,error}=await supabase.rpc("is_sport_admin");
    if(!alive)return;
    if(error){setNotice({kind:"info",text:"Apply the workspace/admin migration first and explicitly add your user ID to private.sport_admins before using moderation."});setChecked(true);setLoading(false);return;}
    setAllowed(data===true);setChecked(true);
    if(data===true)await refresh();else setLoading(false);
   }catch{if(alive){setChecked(true);setLoading(false);}}
  })();
  return()=>{alive=false;};
 },[]);

 async function audit(action:string,type:string,id:string,details:Record<string,string>){
  if(!supabase||!userId)return false;
  const {error}=await supabase.from("admin_audit_log").insert({actor_id:userId,action_type:action,target_type:type,target_id:id,details});
  return !error;
 }
 async function moderateOrganisation(item:Organisation,status:"verified"|"rejected"){
  if(!supabase)return;setBusyId(item.id);setNotice(null);
  try{
   const {error}=await supabase.from("organisations").update({verification_status:status}).eq("id",item.id);
   if(error)throw error;
   const recorded=await audit("organisation_"+status,"organisation",item.id,{name:item.name,previous_status:item.verification_status,new_status:status});
   await refresh();
   setNotice(recorded?{kind:"success",text:item.name+" marked "+status+". The decision is recorded in the admin audit log."}:{kind:"info",text:item.name+" updated, but the audit event could not be recorded. Check table permissions."});
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Organisation decision could not be saved."});}
  finally{setBusyId("");}
 }
 async function moderateOpportunity(item:Opportunity,status:"verified"|"rejected"){
  if(!supabase)return;setBusyId(item.id);setNotice(null);
  try{
   const org=Array.isArray(item.organisations)?item.organisations[0]:item.organisations;
   const update:{verification_status:string;status?:string}={verification_status:status};
   if(status==="verified"&&org?.verification_status==="verified")update.status="published";
   const {error}=await supabase.from("opportunities").update(update).eq("id",item.id);
   if(error)throw error;
   const recorded=await audit("opportunity_"+status,"opportunity",item.id,{title:item.title,previous_status:item.verification_status,new_status:status});
   await refresh();
   setNotice(recorded?{kind:"success",text:item.title+" marked "+status+(status==="verified"&&org?.verification_status!=="verified"?"; it will not appear publicly until the organisation is verified.":".")}:{kind:"info",text:item.title+" updated, but its audit event could not be recorded."});
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Opportunity decision could not be saved."});}
  finally{setBusyId("");}
 }
 async function updateReport(item:SafetyReport,status:string){
  if(!supabase)return;setBusyId(item.id);setNotice(null);
  const resolution=(reportResolution[item.id]??item.resolution??"").trim();
  try{
   const {error}=await supabase.from("safety_reports").update({status,resolution:resolution||null,reviewed_by:userId,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",item.id);
   if(error)throw error;
   const recorded=await audit("safety_report_"+status,"safety_report",item.id,{target_type:item.target_type,target_id:item.target_id,reason:item.reason,new_status:status});
   await refresh();
   setNotice(recorded?{kind:"success",text:"Safety report updated and moderator activity recorded."}:{kind:"info",text:"Report updated, but its audit event could not be recorded."});
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Safety report could not be updated."});}
  finally{setBusyId("");}
 }
 async function updateCareerRequest(item:CareerRequest,status:string){
  if(!supabase)return;setBusyId(item.id);setNotice(null);
  const notes=(careerNotes[item.id]??item.admin_notes??"").trim();
  try{
   const {error}=await supabase.from("career_support_requests").update({status,admin_notes:notes||null,reviewed_by:userId,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",item.id);
   if(error)throw error;
   const recorded=await audit("career_support_"+status,"career_support_request",item.id,{service_type:item.service_type,new_status:status});
   await refresh();
   setNotice(recorded?{kind:"success",text:"Career-support request updated and audit event recorded."}:{kind:"info",text:"Request updated, but its audit event could not be recorded."});
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Career-support request could not be updated."});}
  finally{setBusyId("");}
 }
 async function updateApplication(item:Application,status:string){
  if(!supabase)return;setBusyId(item.id);setNotice(null);
  try{
   const {error}=await supabase.from("opportunity_applications").update({status,updated_at:new Date().toISOString()}).eq("id",item.id);
   if(error)throw error;
   const recorded=await audit("application_status_changed","application",item.id,{previous_status:item.status,new_status:status});
   await refresh();
   setNotice(recorded?{kind:"success",text:"Application status changed to "+status+". The decision is recorded."}:{kind:"info",text:"Application status updated but audit logging failed."});
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Application status could not be changed."});}
  finally{setBusyId("");}
 }
 const pendingOrgs=organisations.filter(x=>x.verification_status==="pending").length;
 const pendingOps=opportunities.filter(x=>x.verification_status==="pending").length;
 const reviewApps=applications.filter(x=>x.status==="submitted"||x.status==="reviewing").length;
 const pendingReports=reports.filter(x=>x.status==="pending"||x.status==="in_review").length;
 const pendingCareerRequests=careerRequests.filter(x=>x.status==="submitted"||x.status==="in_review").length;
 if(!checked||(allowed&&loading))return <section className="workspace-wrap"><div className="workspace-loading"><LoaderCircle size={22} className="spin"/>Checking platform permissions…</div></section>;
 if(!supabaseConfigured||!supabase)return <section className="workspace-wrap"><div className="workspace-empty"><ShieldCheck size={28}/><h1>Admin setup is required.</h1><p>Connect the dedicated Sport Supabase project before opening moderation tools.</p></div></section>;
 if(!allowed)return <section className="workspace-wrap"><div className="workspace-empty"><span className="workspace-icon"><ShieldCheck size={26}/></span><p className="workspace-kicker">RESTRICTED AREA</p><h1>Administrator access<br/><span>is required.</span></h1><p>This screen does not grant access based on a member's selected account type. An existing administrator must add your Supabase user ID to the private allow-list.</p><div className="admin-user-id"><small>Your authenticated user ID</small><code>{userId||"Sign in to see your user ID"}</code></div><p className="admin-setup-help">In the Sport Supabase SQL editor, run:<br/><code>insert into private.sport_admins (user_id) values ('YOUR-AUTH-USER-UUID');</code></p><Link className="button button-dark" to="/workspace">Back to workspace</Link></div></section>;
 return <section className="workspace-wrap admin-wrap">
  <div className="workspace-hero"><div><div className="workspace-kicker"><span className="status-dot"/> PLATFORM CONTROL</div><h1>Trust is built<br/><span>into the process.</span></h1><p>Review organisations, opportunity listings and application status changes.</p></div><button className="button button-dark" onClick={()=>void refresh()} disabled={!!busyId}><RefreshCw size={16}/> Refresh queue</button></div>
  {notice&&<div className={"workspace-notice notice-"+notice.kind} role="status"><span>{notice.text}</span></div>}
  <div className="admin-stats"><article><span>Pending organisations</span><strong>{pendingOrgs}</strong></article><article><span>Pending opportunities</span><strong>{pendingOps}</strong></article><article><span>Applications to review</span><strong>{reviewApps}</strong></article><article><span>Safety reports open</span><strong>{pendingReports}</strong></article><article><span>Career support requests</span><strong>{pendingCareerRequests}</strong></article></div>
  <div className="admin-console"><div className="admin-tabs" role="tablist" aria-label="Moderation queues"><button className={tab==="organisations"?"is-active":""} onClick={()=>setTab("organisations")}><ShieldCheck size={16}/> Organisations <em>{pendingOrgs}</em></button><button className={tab==="opportunities"?"is-active":""} onClick={()=>setTab("opportunities")}><ClipboardCheck size={16}/> Opportunities <em>{pendingOps}</em></button><button className={tab==="applications"?"is-active":""} onClick={()=>setTab("applications")}><AlertTriangle size={16}/> Applications <em>{reviewApps}</em></button><button className={tab==="reports"?"is-active":""} onClick={()=>setTab("reports")}><AlertTriangle size={16}/> Safety reports <em>{pendingReports}</em></button><button className={tab==="career"?"is-active":""} onClick={()=>setTab("career")}><ShieldCheck size={16}/> Career support <em>{pendingCareerRequests}</em></button><button className={tab==="audit"?"is-active":""} onClick={()=>setTab("audit")}><History size={16}/> Audit log <em>{auditEvents.length}</em></button></div>
  {tab==="organisations"&&<div className="admin-queue">{organisations.map(item=><article className="admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.verification_status}>{item.verification_status}</span><h3>{item.name}</h3><p>{item.organisation_type} · {item.location||"Location not supplied"} · {item.country}</p><small>Owner ID: {item.owner_id}</small></div><span className="admin-item-date">{new Date(item.created_at).toLocaleDateString("en-ZA")}</span></div>{item.verification_status==="pending"?<div className="admin-actions"><button className="admin-approve" disabled={busyId===item.id} onClick={()=>void moderateOrganisation(item,"verified")}><CheckCircle2 size={15}/> Verify organisation</button><button className="admin-reject" disabled={busyId===item.id} onClick={()=>void moderateOrganisation(item,"rejected")}><XCircle size={15}/> Reject</button></div>:<p className="admin-reviewed-note">Current status: {item.verification_status}</p>}</article>)}{!organisations.length&&<div className="workspace-blank"><ShieldCheck size={24}/><h3>No organisations found.</h3></div>}</div>}
  {tab==="opportunities"&&<div className="admin-queue">{opportunities.map(item=>{const org=Array.isArray(item.organisations)?item.organisations[0]:item.organisations;return <article className="admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.verification_status}>{item.verification_status}</span><h3>{item.title}</h3><p>{org?.name??"Organisation"} · {item.opportunity_type} · listing {item.status}</p><small>Organisation verification: {org?.verification_status??"unknown"} · ID {item.id}</small></div><span className="admin-item-date">{new Date(item.created_at).toLocaleDateString("en-ZA")}</span></div>{item.verification_status==="pending"?<div className="admin-actions"><button className="admin-approve" disabled={busyId===item.id} onClick={()=>void moderateOpportunity(item,"verified")}><CheckCircle2 size={15}/> Verify listing</button><button className="admin-reject" disabled={busyId===item.id} onClick={()=>void moderateOpportunity(item,"rejected")}><XCircle size={15}/> Reject</button></div>:<p className="admin-reviewed-note">Current status: {item.verification_status}. Public visibility also requires a verified organisation.</p>}</article>;})}{!opportunities.length&&<div className="workspace-blank"><ClipboardCheck size={24}/><h3>No opportunities found.</h3></div>}</div>}
  {tab==="applications"&&<div className="admin-queue">{applications.map(item=><article className="admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.status}>{item.status}</span><h3>Application review</h3><p>Opportunity ID: {item.opportunity_id}</p><small>Athlete ID: {item.athlete_id} · Received {new Date(item.created_at).toLocaleDateString("en-ZA")}</small>{item.message&&<p className="admin-app-message">{item.message}</p>}</div></div><div className="admin-actions"><label className="admin-status-select">Update status<select value={item.status} onChange={e=>void updateApplication(item,e.target.value)} disabled={busyId===item.id}>{["submitted",...applicationStates,"withdrawn"].map(status=><option key={status} value={status}>{status}</option>)}</select></label></div></article>)}{!applications.length&&<div className="workspace-blank"><ClipboardCheck size={24}/><h3>No applications yet.</h3></div>}</div>}
  {tab==="career"&&<div className="admin-queue">{careerRequests.map(item=><article className="admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.status}>{item.status.replaceAll("_"," ")}</span><h3>{item.service_type.replaceAll("_"," ")}</h3><p>Athlete ID: {item.athlete_id}</p><small>Request ID: {item.id} · Submitted {new Date(item.created_at).toLocaleDateString("en-ZA")} · Contact consent: {item.consent_to_contact?"Yes":"No"}</small></div><span className="admin-item-date">{new Date(item.created_at).toLocaleDateString("en-ZA")}</span></div><p className="admin-report-details">{item.goals}</p>{item.preferred_outcome&&<p className="admin-reviewed-note">Preferred outcome: {item.preferred_outcome}</p>}<label className="admin-resolution-label">Notes for the athlete<textarea rows={3} maxLength={4000} value={careerNotes[item.id]??item.admin_notes??""} onChange={event=>setCareerNotes(current=>({...current,[item.id]:event.target.value}))} placeholder="Record review outcome and next steps."/></label><div className="admin-actions"><label className="admin-status-select">Request status<select value={item.status} disabled={busyId===item.id} onChange={event=>void updateCareerRequest(item,event.target.value)}>{["submitted","in_review","accepted","declined","closed"].map(status=><option key={status} value={status}>{status.replace("_"," ")}</option>)}</select></label><button className="admin-approve" disabled={busyId===item.id} onClick={()=>void updateCareerRequest(item,"accepted")}><CheckCircle2 size={15}/> Accept</button><button className="admin-reject" disabled={busyId===item.id} onClick={()=>void updateCareerRequest(item,"declined")}><XCircle size={15}/> Decline</button></div></article>)}{!careerRequests.length&&<div className="workspace-blank"><ShieldCheck size={24}/><h3>No career-support requests yet.</h3><p>Private requests from athlete accounts will appear here for review.</p></div>}</div>}
  {tab==="reports"&&<div className="admin-queue">{reports.map(item=><article className="admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.status}>{item.status.replace("_"," ")}</span><h3>{item.reason.replaceAll("_"," ")}</h3><p>Reported {item.target_type} · target ID {item.target_id}</p><small>Report ID: {item.id} · Reporter ID: {item.reporter_id} · {new Date(item.created_at).toLocaleDateString("en-ZA")}</small></div><span className="admin-item-date">{new Date(item.created_at).toLocaleDateString("en-ZA")}</span></div><p className="admin-report-details">{item.details}</p><label className="admin-resolution-label">Moderator notes / outcome<textarea rows={3} maxLength={4000} value={reportResolution[item.id]??item.resolution??""} onChange={event=>setReportResolution(current=>({...current,[item.id]:event.target.value}))} placeholder="Record action taken, evidence checked or reason for dismissal."/></label><div className="admin-actions"><label className="admin-status-select">Set report status<select value={item.status} disabled={busyId===item.id} onChange={event=>void updateReport(item,event.target.value)}>{["pending","in_review","resolved","dismissed"].map(status=><option key={status} value={status}>{status.replace("_"," ")}</option>)}</select></label><button className="admin-approve" disabled={busyId===item.id} onClick={()=>void updateReport(item,"resolved")}><CheckCircle2 size={15}/> Resolve report</button><button className="admin-reject" disabled={busyId===item.id} onClick={()=>void updateReport(item,"dismissed")}><XCircle size={15}/> Dismiss</button></div></article>)}{!reports.length&&<div className="workspace-blank"><ShieldCheck size={24}/><h3>No safety reports.</h3><p>Reports submitted by members will appear here for private moderator review.</p></div>}</div>}
  {tab==="audit"&&<div className="admin-queue">{auditEvents.map(item=><article className="admin-item audit-item" key={item.id}><div className="admin-item-heading"><div><span className="status-tag status-verified">{item.action_type.replaceAll("_"," ")}</span><h3>{item.target_type.replaceAll("_"," ")} · {item.target_id}</h3><p>Actor: {item.actor_id}</p><small>{new Intl.DateTimeFormat("en-ZA",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(item.created_at))}</small></div></div><pre className="audit-details">{JSON.stringify(item.details,null,2)}</pre></article>)}{!auditEvents.length&&<div className="workspace-blank"><History size={24}/><h3>No audit events recorded yet.</h3><p>Successful moderation actions will be listed here when logged.</p></div>}</div>}
  </div>
  <div className="workspace-footer-note"><ShieldCheck size={15}/><span>Use the least-privilege administrator allow-list. Verify evidence before approving a listing; never infer legitimacy from a logo or self-declared account type alone.</span></div>
 </section>;
}
