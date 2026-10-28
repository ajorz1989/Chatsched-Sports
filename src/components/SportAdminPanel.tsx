import {useEffect,useState} from "react";
import {CheckSquare,FileSearch,ShieldAlert,Users} from "lucide-react";
import {supabase} from "../lib/supabase";
type Props={userId:string;isAdmin:boolean};
type User={id:string;display_name:string;account_type:string;created_at:string};
type Review={id:string;athlete_id:string;evidence_type:string;evidence_url:string|null;status:string;created_at:string};
type Safety={id:string;category:string;priority:string;status:string;description:string;created_at:string};
type Endorsement={id:string;relationship_title:string;endorsement_text:string;created_at:string};
export default function SportAdminPanel({userId}:Props){
 const [users,setUsers]=useState<User[]>([]);const [checked,setChecked]=useState(false);const [reviews,setReviews]=useState<Review[]>([]);const [safety,setSafety]=useState<Safety[]>([]);const [endorsements,setEndorsements]=useState<Endorsement[]>([]);const [status,setStatus]=useState("");
 async function load(){if(!supabase||!checked)return;
  const [u,r,s,e]=await Promise.all([
   supabase.from("profiles").select("id,display_name,account_type,created_at").order("created_at",{ascending:false}).limit(100),
   supabase.from("athlete_evidence_reviews").select("id,athlete_id,evidence_type,evidence_url,status,created_at").eq("status","pending").order("created_at"),
   supabase.from("sport_safety_reports").select("id,category,priority,status,description,created_at").in("status",["open","reviewing"]).order("created_at"),
   supabase.from("athlete_endorsements").select("id,relationship_title,endorsement_text,created_at").eq("status","pending").order("created_at")
  ]);
  if(u.data)setUsers(u.data as User[]);if(r.data)setReviews(r.data as Review[]);if(s.data)setSafety(s.data as Safety[]);if(e.data)setEndorsements(e.data as Endorsement[]);
 }
 useEffect(()=>{if(!supabase)return;void supabase.rpc("current_user_is_sport_admin").then(({data})=>{if(data===true)setChecked(true);});},[]);
 useEffect(()=>{if(checked)void load();},[checked]);
 async function update(table:string,id:string,patch:Record<string,unknown>){if(!supabase)return;const {error}=await supabase.from(table).update(patch).eq("id",id);setStatus(error?error.message:"Admin review updated.");void load();}
 if(!checked)return null;
 return <div className="workspace-form-card"><div className="workspace-section-title"><div><p className="workspace-kicker">SPORT ADMIN / PHASE 2</p><h2>Trust & safety operations.</h2><p className="workspace-subtitle">Review evidence, safety reports and pending trust signals. Decisions should be factual, documented and proportionate.</p></div><ShieldAlert size={22}/></div>
 <div className="workspace-card-grid"><div className="workspace-mini-card"><Users size={18}/><strong>{users.length} recent users</strong></div><div className="workspace-mini-card"><FileSearch size={18}/><strong>{reviews.length} evidence reviews</strong></div><div className="workspace-mini-card"><ShieldAlert size={18}/><strong>{safety.length} open safety reports</strong></div><div className="workspace-mini-card"><CheckSquare size={18}/><strong>{endorsements.length} pending endorsements</strong></div></div>
 <div className="workspace-card-stack">
 {reviews.map(r=><div className="workspace-mini-card" key={r.id}><span>Evidence · {r.evidence_type} · athlete {r.athlete_id.slice(0,8)}</span>{r.evidence_url&&<a href={r.evidence_url} target="_blank" rel="noreferrer">Open evidence</a>}<div><button className="button button-accent" onClick={()=>void update("athlete_evidence_reviews",r.id,{status:"approved",reviewed_by:userId,reviewed_at:new Date().toISOString()})}><CheckSquare size={14}/> Verify</button><button className="button button-light-outline" onClick={()=>void update("athlete_evidence_reviews",r.id,{status:"needs_more_info",reviewed_by:userId,reviewed_at:new Date().toISOString()})}>Needs info</button></div></div>)}
 {endorsements.map(e=><div className="workspace-mini-card" key={e.id}><strong>Endorsement · {e.relationship_title}</strong><span>{e.endorsement_text}</span><div><button className="button button-accent" onClick={()=>void update("athlete_endorsements",e.id,{status:"approved",verified_by:userId,verified_at:new Date().toISOString()})}><CheckSquare size={14}/> Approve</button><button className="button button-light-outline" onClick={()=>void update("athlete_endorsements",e.id,{status:"rejected",verified_by:userId,verified_at:new Date().toISOString()})}>Reject</button></div></div>)}
 {safety.map(s=><div className="workspace-mini-card" key={s.id}><strong>{s.priority.toUpperCase()} · {s.category.replaceAll("_"," ")}</strong><span>{s.description}</span><div><button className="button button-dark" onClick={()=>void update("sport_safety_reports",s.id,{status:"reviewing",reviewed_by:userId,reviewed_at:new Date().toISOString()})}>Start review</button><button className="button button-light-outline" onClick={()=>void update("sport_safety_reports",s.id,{status:"resolved",reviewed_by:userId,reviewed_at:new Date().toISOString()})}>Resolve</button></div></div>)}
 {users.slice(0,20).map(u=><div className="workspace-mini-card" key={u.id}><strong>{u.display_name||"Unnamed user"}</strong><span>{u.account_type} · {u.id}</span></div>)}
 </div>{status&&<div className="workspace-notice notice-info">{status}</div>}</div>;
}
