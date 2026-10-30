import {useCallback,useEffect,useState} from "react";
import {Inbox} from "lucide-react";
import {supabase} from "../lib/supabase";

type Message={id:string;kind:string;name:string;email:string;subject:string|null;message:string;related_url:string|null;priority:"low"|"normal"|"high"|"urgent";status:"new"|"in_progress"|"resolved"|"spam";admin_notes:string|null;created_at:string};
const rank={urgent:0,high:1,normal:2,low:3} as const;
const kindLabel:Record<string,string>={general:"General",support:"Support",data_request:"Data request",concern:"Concern",safeguarding:"Safeguarding",partnership:"Partnership"};

function safeHttp(value:string|null):string|null{
 if(!value)return null;
 try{const url=new URL(value);return url.protocol==="https:"||url.protocol==="http:"?url.toString():null;}catch{return null;}
}

export default function ContactInbox(){
 const [rows,setRows]=useState<Message[]>([]);
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [notice,setNotice]=useState("");
 const [showClosed,setShowClosed]=useState(false);

 const load=useCallback(async()=>{
  if(!supabase)return;
  let query=supabase.from("contact_messages").select("id,kind,name,email,subject,message,related_url,priority,status,admin_notes,created_at").order("created_at",{ascending:false}).limit(100);
  if(!showClosed)query=query.in("status",["new","in_progress"]);
  const {data,error}=await query;
  if(error){setNotice("The inbox could not be loaded: "+error.message);return;}
  const list=(data??[]) as Message[];
  list.sort((a,b)=>rank[a.priority]-rank[b.priority]||b.created_at.localeCompare(a.created_at));
  setRows(list);
 },[showClosed]);

 useEffect(()=>{void load();},[load]);

 async function setStatus(row:Message,status:Message["status"]){
  if(!supabase)return;
  const {error}=await supabase.from("contact_messages").update({status,admin_notes:(notes[row.id]??row.admin_notes??"").trim()||null}).eq("id",row.id);
  setNotice(error?error.message:"Message updated.");
  if(!error)await load();
 }

 return <div className="admin-queue">
  <div className="admin-item-heading"><h3><Inbox size={16}/> Contact and concern inbox</h3><label className="sx-small"><input type="checkbox" checked={showClosed} onChange={e=>setShowClosed(e.target.checked)}/> Show resolved and spam</label></div>
  {notice&&<p className="sx-small" role="status">{notice}</p>}
  {rows.length===0&&<p className="sx-small">Nothing waiting. Safeguarding and data requests appear first when they arrive.</p>}
  {rows.map(row=>{const link=safeHttp(row.related_url);return <article className="admin-item" key={row.id}>
   <div className="admin-item-heading"><h3>{row.priority.toUpperCase()} · {kindLabel[row.kind]??row.kind}{row.subject?" · "+row.subject:""}</h3><span className={"status-tag status-"+row.status}>{row.status.replace("_"," ")}</span></div>
   <p><strong>{row.name}</strong> · <a href={"mailto:"+encodeURIComponent(row.email).replace("%40","@")}>{row.email}</a> · {new Date(row.created_at).toLocaleString("en-ZA")}</p>
   <p style={{whiteSpace:"pre-wrap"}}>{row.message}</p>
   {row.related_url&&<p className="sx-small">Link given: {link?<a href={link} target="_blank" rel="noreferrer noopener">{row.related_url}</a>:row.related_url}</p>}
   <label className="sx-field"><span>Internal notes</span><textarea rows={2} maxLength={4000} value={notes[row.id]??row.admin_notes??""} onChange={e=>setNotes(current=>({...current,[row.id]:e.target.value}))}/></label>
   <div className="sx-actions">
    {row.status==="new"&&<button className="button button-dark button-small" onClick={()=>void setStatus(row,"in_progress")}>Start</button>}
    {row.status!=="resolved"&&<button className="button button-dark button-small" onClick={()=>void setStatus(row,"resolved")}>Resolve</button>}
    {row.status!=="spam"&&<button className="button button-light-outline-dark button-small" onClick={()=>void setStatus(row,"spam")}>Spam</button>}
   </div>
  </article>;})}
 </div>;
}
