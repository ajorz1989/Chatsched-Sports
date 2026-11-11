import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, ClipboardCheck, History, LoaderCircle, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase, supabaseConfigured } from "../lib/supabase";
import AccountDeletionQueue from "../components/AccountDeletionQueue";
import ContactInbox from "../components/ContactInbox";
import "../styles-workspace.css";

type Organisation = {id:string;name:string;organisation_type:string;verification_status:string;location:string|null;country:string;created_at:string;owner_id:string};
type Opportunity = {id:string;title:string;opportunity_type:string;status:string;verification_status:string;closing_date:string|null;created_at:string;organisation_id:string;organisations:{name?:string;verification_status?:string}|{name?:string;verification_status?:string}[]|null};
type Application = {id:string;opportunity_id:string;athlete_id:string;status:string;created_at:string;message:string|null};
type SafetyReport = {id:string;reporter_id:string;target_type:string;target_id:string;reason:string;details:string;status:string;resolution:string|null;created_at:string;reviewed_by:string|null;reviewed_at:string|null};
type CareerRequest = {id:string;athlete_id:string;service_type:string;goals:string;preferred_outcome:string|null;consent_to_contact:boolean;status:string;admin_notes:string|null;created_at:string;reviewed_by:string|null;reviewed_at:string|null};
type AuditEvent = {id:string;actor_id:string;action_type:string;target_type:string;target_id:string;details:Record<string,unknown>;created_at:string};
type VerificationRequest = {id:string;organisation_id:string;submitted_by:string;evidence_type:string;evidence_url:string|null;evidence_notes:string|null;status:string;admin_notes:string|null;created_at:string;reviewed_by:string|null;reviewed_at:string|null;organisations:{name?:string;verification_status?:string}|{name?:string;verification_status?:string}[]|null};
const applicationStates=["reviewing","shortlisted","declined","accepted"] as const;

export default function AdminPage(){
 const [userId,setUserId]=useState("");const [checked,setChecked]=useState(false);const [allowed,setAllowed]=useState(false);const [loading,setLoading]=useState(true);
 const [organisations,setOrganisations]=useState<Organisation[]>([]);const [opportunities,setOpportunities]=useState<Opportunity[]>([]);const [applications,setApplications]=useState<Application[]>([]);const [reports,setReports]=useState<SafetyReport[]>([]);const [reportResolution,setReportResolution]=useState<Record<string,string>>({});const [careerRequests,setCareerRequests]=useState<CareerRequest[]>([]);const [careerNotes,setCareerNotes]=useState<Record<string,string>>({});const [auditEvents,setAuditEvents]=useState<AuditEvent[]>([]);const [verificationRequests,setVerificationRequests]=useState<VerificationRequest[]>([]);const [verificationNotes,setVerificationNotes]=useState<Record<string,string>>({});
 const [tab,setTab]=useState<"organisations"|"opportunities"|"applications"|"reports"|"inbox"|"career"|"audit"|"verification">("organisations");
 const [notice,setNotice]=useState<{kind:"success"|"error"|"info";text:string}|null>(null);const [busyId,setBusyId]=useState("");
 async function refresh(){
  if(!supabase)return;setLoading(true);
  try{
   const [o,p,a,r,c,l,v]=await Promise.all([
    supabase.from("organisations").select("id,name,organisation_type,verification_status,location,country,created_at,owner_id").order("created_at",{ascending:false}).limit(100),
    supabase.from("opportunities").select("id,title,opportunity_type,status,verification_status,closing_date,created_at,organisation_id,organisations(name,verification_status)").order("created_at",{ascending:false}).limit(100),
    supabase.from("opportunity_applications").select("id,opportunity_id,athlete_id,status,created_at,message").order("created_at",{ascending:false}).limit(100),
    supabase.from("safety_reports").select("id,reporter_id,target_type,target_id,reason,details,status,resolution,created_at,reviewed_by,reviewed_at").order("created_at",{ascending:false}).limit(200),
    supabase.from("career_support_requests").select("id,athlete_id,service_type,goals,preferred_outcome,consent_to_contact,status,admin_notes,created_at,reviewed_by,reviewed_at").order("created_at",{ascending:false}).limit(200),
    supabase.from("admin_audit_log").select("id,actor_id,action_type,target_type,target_id,details,created_at").order("created_at",{ascending:false}).limit(250),
    supabase.from("organisation_verification_requests").select("id,organisation_id,submitted_by,evidence_type,evidence_url,evidence_notes,status,admin_notes,created_at,reviewed_by,reviewed_at,organisations(name,verification_status)").order("created_at",{ascending:false}).limit(200),
   ]);
   if(o.error)throw o.error;if(p.error)throw p.error;if(a.error)throw a.error;if(r.error)throw r.error;if(c.error)throw c.error;if(l.error)throw l.error;if(v.error)throw v.error;
   setOrganisations((o.data??[]) as Organisation[]);setOpportunities((p.data??[]) as unknown as Opportunity[]);setApplications((a.data??[]) as Application[]);setReports((r.data??[]) as SafetyReport[]);setCareerRequests((c.data??[]) as CareerRequest[]);setAuditEvents((l.data??[]) as AuditEvent[]);setVerificationRequests((v.data??[]) as unknown as VerificationRequest[]);
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

 async function moderateOrganisation(item:Organisation){
  if(!supabase)return;setBusyId(item.id);setNotice(null);
  try{
   const {error}=await supabase.from("organisations").update({verification_status:"rejected"}).eq("id",item.id);
   if(error)throw error;
   // The audit event is written atomically by a database trigger in the same transaction as the decision.
   const recorded=true;
   await refresh();
   setNotice(recorded?{kind:"success",text:item.name+" rejected and recorded in the audit log."}:{kind:"info",text:item.name+" updated, but the audit event could not be recorded."});
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
   // The audit event is written atomically by a database trigger in the same transaction as the decision.
   const recorded=true;
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
   // The audit event is written atomically by a database trigger in the same transaction as the decision.
   const recorded=true;
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
   // The audit event is written atomically by a database trigger in the same transaction as the decision.
   const recorded=true;
   await refresh();
   setNotice(recorded?{kind:"success",text:"Career-support request updated and audit event recorded."}:{kind:"info",text:"Request updated, but its audit event could not be recorded."});
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Career-support request could not be updated."});}
  finally{setBusyId("");}
 }
 async function updateVerificationRequest(item:VerificationRequest,status:string){
  if(!supabase)return;setBusyId(item.id);setNotice(null);
  const notes=(verificationNotes[item.id]??item.admin_notes??"").trim();
  try{
   const reviewPatch=status==="pending"?{reviewed_by:null,reviewed_at:null}:{reviewed_by:userId,reviewed_at:new Date().toISOString()};
   const {error}=await supabase.from("organisation_verification_requests").update({status,admin_notes:notes||null,updated_at:new Date().toISOString(),...reviewPatch}).eq("id",item.id);
   if(error)throw error;
   // The audit event is written atomically by a database trigger in the same transaction as the decision.
   const recorded=true;
   await refresh();
   setNotice(recorded?{kind:"success",text:"Verification request marked "+status+". Organisation status and owner notification were updated by the database workflow."}:{kind:"info",text:"Verification request updated, but the audit event could not be recorded."});
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Verification request could not be updated."});}
  finally{setBusyId("");}
 }
 async function updateApplication(item:Application,status:string){
  if(!supabase)return;setBusyId(item.id);setNotice(null);
  try{
   const {error}=await supabase.from("opportunity_applications").update({status,updated_at:new Date().toISOString()}).eq("id",item.id);
   if(error)throw error;
   // The audit event is written atomically by a database trigger in the same transaction as the decision.
   const recorded=true;
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
 const pendingVerification=verificationRequests.filter(x=>x.status==="pending"||x.status==="in_review").length;
 if(!checked||(allowed&&loading))return <section className="workspace-wrap"><div className="workspace-loading"><LoaderCircle size={20} className="spin"/>Checking platform permissions…</div></section>;
 if(!supabaseConfigured||!supabase)return <section className="workspace-wrap"><div className="workspace-empty"><ShieldCheck size={24}/><h1>Admin setup is required.</h1><p>Connect the dedicated Sport Supabase project before opening moderation tools.</p></div></section>;
 if(!allowed)return <section className="workspace-wrap"><div className="workspace-empty"><span className="workspace-icon"><ShieldCheck size={24}/></span><p className="workspace-kicker">RESTRICTED AREA</p><h1>Administrator access<br/><span>is required.</span></h1><p>This screen does not grant access based on a member's selected account type. An existing administrator must add your Supabase user ID to the private allow-list.</p><div className="admin-user-id"><small>Your authenticated user ID</small><code>{userId||"Sign in to see your user ID"}</code></div><p className="admin-setup-help">In the Sport Supabase SQL editor, run:<br/><code>insert into private.sport_admins (user_id) values ('YOUR-AUTH-USER-UUID');</code></p><Link className="button button-dark" to="/workspace">Back to workspace</Link></div></section>;
 return <section className="workspace-wrap admin-wrap">
  <div className="workspace-hero"><div><div className="workspace-kicker"><span className="status-dot"/> PLATFORM CONTROL</div><h1>Trust is built<br/><span>into the process.</span></h1><p>Review organisations, opportunity listings and application status changes.</p></div><button className="button button-dark" onClick={()=>void refresh()} disabled={!!busyId}><RefreshCw size={16}/> Refresh queue</button></div>
  {notice&&<div className={"workspace-notice notice-"+notice.kind} role="status"><span>{notice.text}</span></div>}
  <div className="admin-stats"><article><span>Pending organisations</span><strong>{pendingOrgs}</strong></article><article><span>Pending opportunities</span><strong>{pendingOps}</strong></article><article><span>Applications to review</span><strong>{reviewApps}</strong></article><article><span>Safety reports open</span><strong>{pendingReports}</strong></article><article><span>Career support requests</span><strong>{pendingCareerRequests}</strong></article></div>
  <div className="admin-console"><div className="admin-tabs" role="tablist" aria-label="Moderation queues"><button className={tab==="organisations"?"is-active":""} onClick={()=>setTab("organisations")}><ShieldCheck size={16}/> Organisations <em>{pendingOrgs}</em></button><button className={tab==="opportunities"?"is-active":""} onClick={()=>setTab("opportunities")}><ClipboardCheck size={16}/> Opportunities <em>{pendingOps}</em></button><button className={tab==="applications"?"is-active":""} onClick={()=>setTab("applications")}><AlertTriangle size={16}/> Applications <em>{reviewApps}</em></button><button className={tab==="reports"?"is-active":""} onClick={()=>setTab("reports")}><AlertTriangle size={16}/> Safety reports <em>{pendingReports}</em></button><button className={tab==="inbox"?"is-active":""} onClick={()=>setTab("inbox")}><AlertTriangle size={16}/> Inbox</button><button className={tab==="career"?"is-active":""} onClick={()=>setTab("career")}><ShieldCheck size={16}/> Career support <em>{pendingCareerRequests}</em></button><button className={tab==="audit"?"is-active":""} onClick={()=>setTab("audit")}><History size={16}/> Audit log <em>{auditEvents.length}</em></button><button className={tab==="verification"?"is-active":""} onClick={()=>setTab("verification")}><ShieldCheck size={16}/> Evidence review <em>{pendingVerification}</em></button></div>
  {tab==="organisations"&&<div className="admin-queue">{organisations.map(item=><article className="admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.verification_status}>{item.verification_status}</span><h3>{item.name}</h3><p>{item.organisation_type} · {item.location||"Location not supplied"} · {item.country}</p><small>Owner ID: {item.owner_id}</small></div><span className="admin-item-date">{new Date(item.created_at).toLocaleDateString("en-ZA")}</span></div>{item.verification_status==="pending"?<div><div className="admin-actions"><button className="admin-approve" onClick={()=>setTab("verification")}><ShieldCheck size={16}/> Review evidence</button><button className="admin-reject" disabled={busyId===item.id} onClick={()=>void moderateOrganisation(item)}><XCircle size={16}/> Reject organisation</button></div><p className="admin-reviewed-note">Approval must come through a submitted evidence request.</p></div>:<p className="admin-reviewed-note">Current status: {item.verification_status}</p>}</article>)}{!organisations.length&&<div className="workspace-blank"><ShieldCheck size={24}/><h3>No organisations found.</h3></div>}</div>}
  {tab==="opportunities"&&<div className="admin-queue">{opportunities.map(item=>{const org=Array.isArray(item.organisations)?item.organisations[0]:item.organisations;return <article className="admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.verification_status}>{item.verification_status}</span><h3>{item.title}</h3><p>{org?.name??"Organisation"} · {item.opportunity_type} · listing {item.status}</p><small>Organisation verification: {org?.verification_status??"unknown"} · ID {item.id}</small></div><span className="admin-item-date">{new Date(item.created_at).toLocaleDateString("en-ZA")}</span></div>{item.verification_status==="pending"?<div className="admin-actions"><button className="admin-approve" disabled={busyId===item.id} onClick={()=>void moderateOpportunity(item,"verified")}><CheckCircle2 size={16}/> Verify listing</button><button className="admin-reject" disabled={busyId===item.id} onClick={()=>void moderateOpportunity(item,"rejected")}><XCircle size={16}/> Reject</button></div>:<p className="admin-reviewed-note">Current status: {item.verification_status}. Public visibility also requires a verified organisation.</p>}</article>;})}{!opportunities.length&&<div className="workspace-blank"><ClipboardCheck size={24}/><h3>No opportunities found.</h3></div>}</div>}
  {tab==="applications"&&<div className="admin-queue">{applications.map(item=><article className="admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.status}>{item.status}</span><h3>Application review</h3><p>Opportunity ID: {item.opportunity_id}</p><small>Athlete ID: {item.athlete_id} · Received {new Date(item.created_at).toLocaleDateString("en-ZA")}</small>{item.message&&<p className="admin-app-message">{item.message}</p>}</div></div><div className="admin-actions"><label className="admin-status-select">Update status<select value={item.status} onChange={e=>void updateApplication(item,e.target.value)} disabled={busyId===item.id}>{["submitted",...applicationStates,"withdrawn"].map(status=><option key={status} value={status}>{status}</option>)}</select></label></div></article>)}{!applications.length&&<div className="workspace-blank"><ClipboardCheck size={24}/><h3>No applications yet.</h3></div>}</div>}
  {tab==="career"&&<div className="admin-queue">{careerRequests.map(item=><article className="admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.status}>{item.status.replaceAll("_"," ")}</span><h3>{item.service_type.replaceAll("_"," ")}</h3><p>Athlete ID: {item.athlete_id}</p><small>Request ID: {item.id} · Submitted {new Date(item.created_at).toLocaleDateString("en-ZA")} · Contact consent: {item.consent_to_contact?"Yes":"No"}</small></div><span className="admin-item-date">{new Date(item.created_at).toLocaleDateString("en-ZA")}</span></div><p className="admin-report-details">{item.goals}</p>{item.preferred_outcome&&<p className="admin-reviewed-note">Preferred outcome: {item.preferred_outcome}</p>}<label className="admin-resolution-label">Notes for the athlete<textarea rows={3} maxLength={4000} value={careerNotes[item.id]??item.admin_notes??""} onChange={event=>setCareerNotes(current=>({...current,[item.id]:event.target.value}))} placeholder="Record review outcome and next steps."/></label><div className="admin-actions"><label className="admin-status-select">Request status<select value={item.status} disabled={busyId===item.id} onChange={event=>void updateCareerRequest(item,event.target.value)}>{["submitted","in_review","accepted","declined","closed"].map(status=><option key={status} value={status}>{status.replace("_"," ")}</option>)}</select></label><button className="admin-approve" disabled={busyId===item.id} onClick={()=>void updateCareerRequest(item,"accepted")}><CheckCircle2 size={16}/> Accept</button><button className="admin-reject" disabled={busyId===item.id} onClick={()=>void updateCareerRequest(item,"declined")}><XCircle size={16}/> Decline</button></div></article>)}{!careerRequests.length&&<div className="workspace-blank"><ShieldCheck size={24}/><h3>No career-support requests yet.</h3><p>Private requests from athlete accounts will appear here for review.</p></div>}</div>}
  {tab==="reports"&&<div className="admin-queue">{reports.map(item=><article className="admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.status}>{item.status.replace("_"," ")}</span><h3>{item.reason.replaceAll("_"," ")}</h3><p>Reported {item.target_type} · target ID {item.target_id}</p><small>Report ID: {item.id} · Reporter ID: {item.reporter_id} · {new Date(item.created_at).toLocaleDateString("en-ZA")}</small></div><span className="admin-item-date">{new Date(item.created_at).toLocaleDateString("en-ZA")}</span></div><p className="admin-report-details">{item.details}</p><label className="admin-resolution-label">Moderator notes / outcome<textarea rows={3} maxLength={4000} value={reportResolution[item.id]??item.resolution??""} onChange={event=>setReportResolution(current=>({...current,[item.id]:event.target.value}))} placeholder="Record action taken, evidence checked or reason for dismissal."/></label><div className="admin-actions"><label className="admin-status-select">Set report status<select value={item.status} disabled={busyId===item.id} onChange={event=>void updateReport(item,event.target.value)}>{["pending","in_review","resolved","dismissed"].map(status=><option key={status} value={status}>{status.replace("_"," ")}</option>)}</select></label><button className="admin-approve" disabled={busyId===item.id} onClick={()=>void updateReport(item,"resolved")}><CheckCircle2 size={16}/> Resolve report</button><button className="admin-reject" disabled={busyId===item.id} onClick={()=>void updateReport(item,"dismissed")}><XCircle size={16}/> Dismiss</button></div></article>)}{!reports.length&&<div className="workspace-blank"><ShieldCheck size={24}/><h3>No safety reports.</h3><p>Reports submitted by members will appear here for private moderator review.</p></div>}</div>}
  {tab==="audit"&&<div className="admin-queue">{auditEvents.map(item=><article className="admin-item audit-item" key={item.id}><div className="admin-item-heading"><div><span className="status-tag status-verified">{item.action_type.replaceAll("_"," ")}</span><h3>{item.target_type.replaceAll("_"," ")} · {item.target_id}</h3><p>Actor: {item.actor_id}</p><small>{new Intl.DateTimeFormat("en-ZA",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(item.created_at))}</small></div></div><pre className="audit-details">{JSON.stringify(item.details,null,2)}</pre></article>)}{!auditEvents.length&&<div className="workspace-blank"><History size={24}/><h3>No audit events recorded yet.</h3><p>Successful moderation actions will be listed here when logged.</p></div>}</div>}
  {tab==="verification"&&<div className="admin-queue">{verificationRequests.map(item=>{const organisation=Array.isArray(item.organisations)?item.organisations[0]:item.organisations;return <article className="admin-item verification-admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.status}>{item.status.replaceAll("_"," ")}</span><h3>{organisation?.name??"Organisation"} verification</h3><p>{item.evidence_type.replaceAll("_"," ")} · Organisation ID: {item.organisation_id}</p><small>Submitted by: {item.submitted_by} · {new Date(item.created_at).toLocaleDateString("en-ZA")}</small></div><span className="admin-item-date">{new Date(item.created_at).toLocaleDateString("en-ZA")}</span></div>{item.evidence_url&&<a className="verification-evidence-url" href={item.evidence_url} target="_blank" rel="noreferrer">Open evidence link <ArrowUpRight size={16}/></a>}{item.evidence_notes&&<p className="admin-report-details">{item.evidence_notes}</p>}<label className="admin-resolution-label">Administrator feedback<textarea rows={3} maxLength={4000} value={verificationNotes[item.id]??item.admin_notes??""} onChange={event=>setVerificationNotes(current=>({...current,[item.id]:event.target.value}))} placeholder="Record what was checked, what is missing, or why evidence was rejected."/></label><div className="admin-actions"><label className="admin-status-select">Decision<select value={item.status} disabled={busyId===item.id} onChange={event=>void updateVerificationRequest(item,event.target.value)}>{["pending","in_review","approved","rejected"].map(status=><option key={status} value={status}>{status.replaceAll("_"," ")}</option>)}</select></label><button className="admin-approve" disabled={busyId===item.id} onClick={()=>void updateVerificationRequest(item,"approved")}><CheckCircle2 size={16}/> Approve evidence</button><button className="admin-reject" disabled={busyId===item.id} onClick={()=>void updateVerificationRequest(item,"rejected")}><XCircle size={16}/> Reject evidence</button></div></article>;})}{!verificationRequests.length&&<div className="workspace-blank"><ShieldCheck size={24}/><h3>No verification evidence submitted.</h3><p>Organisation owners can submit an official website or supporting evidence from their workspace. Approval here updates their verification state.</p></div>}</div>}
{tab==="inbox"&&<ContactInbox/>}
  </div>
  <AccountDeletionQueue/>
  <div className="workspace-footer-note"><ShieldCheck size={16}/><span>Use the least-privilege administrator allow-list. Verify evidence before approving a listing; never infer legitimacy from a logo or self-declared account type alone.</span></div>
 </section>;
}
