import {useCallback,useEffect,useState} from "react";
import {Trash2} from "lucide-react";
import {supabase} from "../lib/supabase";
type Request={id:string;user_id:string;status:string;requested_at:string;reason:string|null};
/** Administrator-only queue for POPIA deletion requests. Deletion runs in the database and is audit-logged there. */
export default function AccountDeletionQueue(){
 const [rows,setRows]=useState<Request[]>([]);const [notice,setNotice]=useState("");const [busy,setBusy]=useState("");
 const load=useCallback(async()=>{if(!supabase)return;const {data,error}=await supabase.from("account_deletion_requests").select("id,user_id,status,requested_at,reason").in("status",["requested","approved","processing"]).order("requested_at",{ascending:true}).limit(50);if(error){setNotice(error.message);return;}setRows((data??[]) as Request[]);},[]);
 useEffect(()=>{void load();},[load]);
 async function complete(item:Request){
  if(!supabase)return;
  if(!window.confirm("Permanently delete this member's account and personal data? Owned organisations, listings and applications are deleted with it. This cannot be undone."))return;
  setBusy(item.id);setNotice("");
  const {error}=await supabase.rpc("admin_complete_account_deletion",{target_request:item.id});
  setBusy("");
  if(error){setNotice(error.message);return;}
  setNotice("Account deleted and recorded in the audit log. Remove any files the member uploaded from Storage (sport-media/"+item.user_id+").");
  await load();
 }
 return <div className="workspace-form-card"><div className="workspace-section-title"><div><p className="workspace-kicker">POPIA</p><h2>Account deletion requests.</h2><p className="workspace-subtitle">Review each request before deleting. Safety reports and audit entries are kept in anonymised form.</p></div><Trash2 size={20}/></div>
  {notice&&<div className="workspace-notice notice-info" role="status">{notice}</div>}
  {rows.length?rows.map(item=><article className="admin-card" key={item.id}><strong>Member {item.user_id.slice(0,8)}…</strong><small>Requested {new Intl.DateTimeFormat("en-ZA",{day:"numeric",month:"short",year:"numeric"}).format(new Date(item.requested_at))} · {item.status}</small>{item.reason&&<p className="admin-report-details">{item.reason}</p>}<div className="admin-actions"><button className="admin-reject" disabled={busy===item.id} onClick={()=>void complete(item)}><Trash2 size={16}/> Delete account permanently</button></div></article>):<div className="workspace-blank"><h3>No open deletion requests.</h3></div>}
 </div>;
}
