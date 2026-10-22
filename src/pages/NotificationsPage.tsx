import {useEffect,useState} from "react";import {ArrowUpRight,Bell,CheckCheck,Clock3,LoaderCircle,Mail,ShieldCheck} from "lucide-react";import {Link} from "react-router-dom";import {supabase,supabaseConfigured} from "../lib/supabase";import "../styles-workspace.css";
type NotificationRow={id:string;notification_type:string;title:string;body:string;target_path:string|null;read_at:string|null;created_at:string};
export default function NotificationsPage(){
 const [userId,setUserId]=useState("");const [checked,setChecked]=useState(false);const [items,setItems]=useState<NotificationRow[]>([]);const [loading,setLoading]=useState(true);const [notice,setNotice]=useState("");
 async function load(uid:string){if(!supabase)return;setLoading(true);try{const {data,error}=await supabase.from("notifications").select("id,notification_type,title,body,target_path,read_at,created_at").eq("user_id",uid).order("created_at",{ascending:false}).limit(100);if(error)throw error;setItems((data??[]) as NotificationRow[]);}catch(error){setNotice(error instanceof Error?error.message:"Notifications could not be loaded. Apply the latest Sport migration.");}finally{setLoading(false);}}
 useEffect(()=>{let alive=true;if(!supabaseConfigured||!supabase){setChecked(true);setLoading(false);return;}supabase.auth.getUser().then(({data})=>{if(!alive)return;setUserId(data.user?.id??"");setChecked(true);if(data.user)void load(data.user.id);else setLoading(false);}).catch(()=>{if(alive){setChecked(true);setLoading(false);}});return()=>{alive=false;};},[]);
 async function markRead(item:NotificationRow){if(!supabase||!userId||item.read_at)return;const timestamp=new Date().toISOString();const {error}=await supabase.from("notifications").update({read_at:timestamp}).eq("id",item.id).eq("user_id",userId);if(error){setNotice(error.message);return;}setItems(rows=>rows.map(row=>row.id===item.id?{...row,read_at:timestamp}:row));}
 async function markAllRead(){if(!supabase||!userId)return;const timestamp=new Date().toISOString();const {error}=await supabase.from("notifications").update({read_at:timestamp}).eq("user_id",userId).is("read_at",null);if(error){setNotice(error.message);return;}setItems(rows=>rows.map(row=>row.read_at?row:{...row,read_at:timestamp}));}

 useEffect(()=>{
  if(!supabase||!userId)return;
  let active=true;
  const channel=supabase.channel("sport-notifications-"+userId)
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:"user_id=eq."+userId},payload=>{
    if(!active)return;
    const fresh=payload.new as NotificationRow;
    setItems(current=>current.some(item=>item.id===fresh.id)?current:[fresh,...current].sort((a,b)=>b.created_at.localeCompare(a.created_at)));
   }).subscribe();
  return()=>{active=false;void supabase?.removeChannel(channel);};
 },[userId]);
 const unread=items.filter(item=>!item.read_at).length;
 if(!checked||loading&&!userId)return <section className="workspace-wrap"><div className="workspace-loading"><LoaderCircle size={22} className="spin"/>Loading notifications…</div></section>;
 if(!supabaseConfigured||!supabase)return <section className="workspace-wrap"><div className="workspace-empty"><Bell size={28}/><h1>Keep up with your next step.</h1><p>Connect the Sport Supabase project and apply the migrations to enable notification history.</p><Link className="button button-dark" to="/join">Join the network</Link></div></section>;
 if(!userId)return <section className="workspace-wrap"><div className="workspace-empty"><span className="workspace-icon"><Bell size={26}/></span><h1>Your updates, in one place.</h1><p>Sign in to view messages and notifications related to your sporting journey.</p><Link className="button button-dark" to={"/join?mode=login&next="+encodeURIComponent("/notifications")}>Sign in <ArrowUpRight size={16}/></Link></div></section>;
 return <section className="workspace-wrap"><div className="workspace-hero"><div><div className="workspace-kicker"><span className="status-dot"/> YOUR UPDATES</div><h1>Nothing important<br/><span>should get lost.</span></h1><p>Keep track of new messages and important account updates.</p></div>{unread>0&&<button className="button button-dark" onClick={()=>void markAllRead()}><CheckCheck size={16}/> Mark all read ({unread})</button>}</div>{notice&&<div className="workspace-notice notice-info" role="status">{notice}</div>}
 <div className="notification-list">{items.map(item=><article className={item.read_at?"notification-row":"notification-row unread"} key={item.id}><span className="notification-icon">{item.notification_type==="message"?<Mail size={18}/>:<Bell size={18}/>}</span><div className="notification-copy"><div className="notification-title-line"><strong>{item.title}</strong>{!item.read_at&&<span className="notification-unread-pill">New</span>}</div><p>{item.body}</p><small><Clock3 size={12}/>{new Intl.DateTimeFormat("en-ZA",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(item.created_at))}</small></div><div className="notification-actions">{!item.read_at&&<button onClick={()=>void markRead(item)}>Mark read</button>}{item.target_path&&item.target_path.startsWith("/")&&<Link to={item.target_path} onClick={()=>void markRead(item)}>Open <ArrowUpRight size={14}/></Link>}</div></article>)}
 {!items.length&&<div className="workspace-blank"><ShieldCheck size={25}/><h3>You're all caught up.</h3><p>When you receive new messages or account updates, they'll appear here.</p><Link className="button button-dark" to="/workspace">Go to workspace</Link></div>}</div>
 <div className="workspace-footer-note"><ShieldCheck size={15}/><span>Notification content avoids exposing private message text. Only signed-in recipients can view and update their own notifications.</span></div>
 </section>;
}
