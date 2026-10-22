import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, LoaderCircle, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase, supabaseConfigured } from "../lib/supabase";
import "../styles-workspace.css";

type Organisation = {id:string;name:string;organisation_type:string;verification_status:string;location:string|null;country:string;created_at:string;owner_id:string};
type Opportunity = {id:string;title:string;opportunity_type:string;status:string;verification_status:string;closing_date:string|null;created_at:string;organisation_id:string;organisations:{name?:string;verification_status?:string}|{name?:string;verification_status?:string}[]|null};
type Application = {id:string;opportunity_id:string;athlete_id:string;status:string;created_at:string;message:string|null};
const applicationStates=["reviewing","shortlisted","declined","accepted"] as const;

export default function AdminPage(){
 const [userId,setUserId]=useState("");const [checked,setChecked]=useState(false);const [allowed,setAllowed]=useState(false);const [loading,setLoading]=useState(true);
 const [organisations,setOrganisations]=useState<Organisation[]>([]);const [opportunities,setOpportunities]=useState<Opportunity[]>([]);const [applications,setApplications]=useState<Application[]>([]);
 const [tab,setTab]=useState<"organisations"|"opportunities"|"applications">("organisations");
 const [notice,setNotice]=useState<{kind:"success"|"error"|"info";text:string}|null>(null);const [busyId,setBusyId]=useState("");
 async function refresh(){
  if(!supabase)return;setLoading(true);
  try{
   const [o,p,a]=await Promise.all([
    supabase.from("organisations").select("id,name,organisation_type,verification_status,location,country,created_at,owner_id").order("created_at",{ascending:false}).limit(100),
    supabase.from("opportunities").select("id,title,opportunity_type,status,verification_status,closing_date,created_at,organisation_id,organisations(name,verification_status)").order("created_at",{ascending:false}).limit(100),
    supabase.from("opportunity_applications").select("id,opportunity_id,athlete_id,status,created_at,message").order("created_at",{ascending:false}).limit(100),
   ]);
   if(o.error)throw o.error;if(p.error)throw p.error;if(a.error)throw a.error;
   setOrganisations((o.data??[]) as Organisation[]);setOpportunities((p.data??[]) as unknown as Opportunity[]);setApplications((a.data??[]) as Application[]);
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
   setNotice(recorded?{kind:"success",text:item.title+" marked "+status+(status==="verified"&&org?.verification_status!=="verified"?"; it will not appear publicly until the organisation is verified.":"."):"}:{kind:"info",text:item.title+" updated, but its audit event could not be recorded."});
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Opportunity decision could not be saved."});}
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
 if(!checked||loading&&!allowed)return <section className="workspace-wrap"><div className="workspace-loading"><LoaderCircle size={22} className="spin"/>Checking platform permissions…</div></section>;
 if(!supabaseConfigured||!supabase)return <section className="workspace-wrap"><div className="workspace-empty"><ShieldCheck size={28}/><h1>Admin setup is required.</h1><p>Connect the dedicated Sport Supabase project before opening moderation tools.</p></div></section>;
 if(!allowed)return <section className="workspace-wrap"><div className="workspace-empty"><span className="workspace-icon"><ShieldCheck size={26}/></span><p className="workspace-kicker">RESTRICTED AREA</p><h1>Administrator access<br/><span>is required.</span></h1><p>This screen does not grant access based on a member's selected account type. An existing administrator must add your Supabase user ID to the private allow-list.</p><div className="admin-user-id"><small>Your authenticated user ID</small><code>{userId||"Sign in to see your user ID"}</code></div><p className="admin-setup-help">In the Sport Supabase SQL editor, run:<br/><code>insert into private.sport_admins (user_id) values ('YOUR-AUTH-USER-UUID');</code></p><Link className="button button-dark" to="/workspace">Back to workspace</Link></div></section>;
 return <section className="workspace-wrap admin-wrap">
  <div className="workspace-hero"><div><div className="workspace-kicker"><span className="status-dot"/> PLATFORM CONTROL</div><h1>Trust is built<br/><span>into the process.</span></h1><p>Review organisations, opportunity listings and application status changes.</p></div><button className="button button-dark" onClick={()=>void refresh()} disabled={!!busyId}><RefreshCw size={16}/> Refresh queue</button></div>
  {notice&&<div className={"workspace-notice notice-"+notice.kind} role="status"><span>{notice.text}</span></div>}
  <div className="admin-stats"><article><span>Pending organisations</span><strong>{pendingOrgs}</strong></article><article><span>Pending opportunities</span><strong>{pendingOps}</strong></article><article><span>Applications to review</span><strong>{reviewApps}</strong></article></div>
  <div className="admin-console"><div className="admin-tabs" role="tablist" aria-label="Moderation queues"><button className={tab==="organisations"?"is-active":""} onClick={()=>setTab("organisations")}><ShieldCheck size={16}/> Organisations <em>{pendingOrgs}</em></button><button className={tab==="opportunities"?"is-active":""} onClick={()=>setTab("opportunities")}><ClipboardCheck size={16}/> Opportunities <em>{pendingOps}</em></button><button className={tab==="applications"?"is-active":""} onClick={()=>setTab("applications")}><AlertTriangle size={16}/> Applications <em>{reviewApps}</em></button></div>
  {tab==="organisations"&&<div className="admin-queue">{organisations.map(item=><article className="admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.verification_status}>{item.verification_status}</span><h3>{item.name}</h3><p>{item.organisation_type} · {item.location||"Location not supplied"} · {item.country}</p><small>Owner ID: {item.owner_id}</small></div><span className="admin-item-date">{new Date(item.created_at).toLocaleDateString("en-ZA")}</span></div>{item.verification_status==="pending"?<div className="admin-actions"><button className="admin-approve" disabled={busyId===item.id} onClick={()=>void moderateOrganisation(item,"verified")}><CheckCircle2 size={15}/> Verify organisation</button><button className="admin-reject" disabled={busyId===item.id} onClick={()=>void moderateOrganisation(item,"rejected")}><XCircle size={15}/> Reject</button></div>:<p className="admin-reviewed-note">Current status: {item.verification_status}</p>}</article>)}{!organisations.length&&<div className="workspace-blank"><ShieldCheck size={24}/><h3>No organisations found.</h3></div>}</div>}
  {tab==="opportunities"&&<div className="admin-queue">{opportunities.map(item=>{const org=Array.isArray(item.organisations)?item.organisations[0]:item.organisations;return <article className="admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.verification_status}>{item.verification_status}</span><h3>{item.title}</h3><p>{org?.name??"Organisation"} · {item.opportunity_type} · listing {item.status}</p><small>Organisation verification: {org?.verification_status??"unknown"} · ID {item.id}</small></div><span className="admin-item-date">{new Date(item.created_at).toLocaleDateString("en-ZA")}</span></div>{item.verification_status==="pending"?<div className="admin-actions"><button className="admin-approve" disabled={busyId===item.id} onClick={()=>void moderateOpportunity(item,"verified")}><CheckCircle2 size={15}/> Verify listing</button><button className="admin-reject" disabled={busyId===item.id} onClick={()=>void moderateOpportunity(item,"rejected")}><XCircle size={15}/> Reject</button></div>:<p className="admin-reviewed-note">Current status: {item.verification_status}. Public visibility also requires a verified organisation.</p>}</article>;})}{!opportunities.length&&<div className="workspace-blank"><ClipboardCheck size={24}/><h3>No opportunities found.</h3></div>}</div>}
  {tab==="applications"&&<div className="admin-queue">{applications.map(item=><article className="admin-item" key={item.id}><div className="admin-item-heading"><div><span className={"status-tag status-"+item.status}>{item.status}</span><h3>Application review</h3><p>Opportunity ID: {item.opportunity_id}</p><small>Athlete ID: {item.athlete_id} · Received {new Date(item.created_at).toLocaleDateString("en-ZA")}</small>{item.message&&<p className="admin-app-message">{item.message}</p>}</div></div><div className="admin-actions"><label className="admin-status-select">Update status<select value={item.status} onChange={e=>void updateApplication(item,e.target.value)} disabled={busyId===item.id}>{["submitted",...applicationStates,"withdrawn"].map(status=><option key={status} value={status}>{status}</option>)}</select></label></div></article>)}{!applications.length&&<div className="workspace-blank"><ClipboardCheck size={24}/><h3>No applications yet.</h3></div>}</div>}
  </div>
  <div className="workspace-footer-note"><ShieldCheck size={15}/><span>Use the least-privilege administrator allow-list. Verify evidence before approving a listing; never infer legitimacy from a logo or self-declared account type alone.</span></div>
 </section>;
}
