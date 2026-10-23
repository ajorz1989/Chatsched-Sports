import {useEffect,useMemo,useState,type FormEvent} from "react";import {AlertTriangle,ArrowUpRight,LoaderCircle,MessageCircle,Send,ShieldCheck,Users} from "lucide-react";import {Link,useSearchParams} from "react-router-dom";import {supabase,supabaseConfigured} from "../lib/supabase";import "../styles-workspace.css";
type Conversation={id:string;participant_a:string;participant_b:string;updated_at:string;otherId:string;otherName:string;otherRole:string;otherLocation:string|null};
type Message={id:string;conversation_id:string;sender_id:string;body:string;created_at:string;read_at:string|null};
type DirectoryMember={id:string;display_name:string;account_type:string;location:string|null;country:string|null;avatar_url:string|null};
function orderPair(a:string,b:string){return a<b?{participant_a:a,participant_b:b}:{participant_a:b,participant_b:a};}
export default function MessagesPage(){
 const [params]=useSearchParams();const requestedPartner=params.get("with");const requestedConversation=params.get("conversation");
 const [userId,setUserId]=useState("");const [authChecked,setAuthChecked]=useState(false);const [loading,setLoading]=useState(true);const [conversations,setConversations]=useState<Conversation[]>([]);const [activeId,setActiveId]=useState("");const [messages,setMessages]=useState<Message[]>([]);const [draft,setDraft]=useState("");const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");const [reportTarget,setReportTarget]=useState("");const [reportReason,setReportReason]=useState("harassment_or_abuse");const [reportDetails,setReportDetails]=useState("");const [reportBusy,setReportBusy]=useState(false);
 const active=useMemo(()=>conversations.find(item=>item.id===activeId)??null,[conversations,activeId]);
 useEffect(()=>{let alive=true;if(!supabaseConfigured||!supabase){setAuthChecked(true);setLoading(false);return;}
 supabase.auth.getUser().then(({data})=>{if(!alive)return;setUserId(data.user?.id??"");setAuthChecked(true);}).catch(()=>{if(alive)setAuthChecked(true);});
 const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(alive)setUserId(session?.user?.id??"");});
 return()=>{alive=false;subscription.unsubscribe();};},[]);
 async function loadInbox(id:string){
  const client=supabase;if(!client)return;setLoading(true);
  try{
   const [a,b]=await Promise.all([
    client.from("conversations").select("id,participant_a,participant_b,updated_at").eq("participant_a",id).order("updated_at",{ascending:false}).limit(100),
    client.from("conversations").select("id,participant_a,participant_b,updated_at").eq("participant_b",id).order("updated_at",{ascending:false}).limit(100)
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   const rows=[...(a.data??[]),...(b.data??[])].sort((x,y)=>y.updated_at.localeCompare(x.updated_at));
   const unique=Array.from(new Map(rows.map(row=>[row.id,row])).values());
   const enriched=await Promise.all(unique.map(async row=>{
    const otherId=row.participant_a===id?row.participant_b:row.participant_a;
    const result=await client.from("member_directory").select("id,display_name,account_type,location,country,avatar_url").eq("id",otherId).maybeSingle();
    const member=result.data as DirectoryMember|null;
    return {...row,otherId,otherName:member?.display_name||"Sport network member",otherRole:member?.account_type||"member",otherLocation:member?.location||member?.country||null};
   }));
   setConversations(enriched as Conversation[]);
   if(requestedConversation&&unique.some(row=>row.id===requestedConversation))setActiveId(requestedConversation);
   else if(requestedPartner){const partnerConversation=enriched.find(item=>item.otherId===requestedPartner);if(partnerConversation)setActiveId(partnerConversation.id);else if(!activeId&&enriched.length)setActiveId(enriched[0].id);}
   else if(!activeId&&enriched.length)setActiveId(enriched[0].id);
  }catch(error){setNotice(error instanceof Error?error.message:"Inbox could not be loaded. Check the Sport messaging migration and RLS policies.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{
  if(!userId||!supabase)return;
  let alive=true;
  (async()=>{
   if(requestedPartner){
    if(requestedPartner===userId){setNotice("You cannot start a conversation with yourself.");await loadInbox(userId);return;}
    const partnerResult=await supabase.from("member_directory").select("id,display_name,account_type,location,country,avatar_url").eq("id",requestedPartner).maybeSingle();
    if(!alive)return;
    if(partnerResult.error||!partnerResult.data){setNotice("This person does not have a discoverable public profile or verified organisation. Only discoverable members can be contacted from the directory.");await loadInbox(userId);return;}
    const pair=orderPair(userId,requestedPartner);
    let result=await supabase.from("conversations").select("id,participant_a,participant_b,updated_at").eq("participant_a",pair.participant_a).eq("participant_b",pair.participant_b).maybeSingle();
    if(result.error){setNotice(result.error.message);await loadInbox(userId);return;}
    if(!result.data){result=await supabase.from("conversations").insert(pair).select("id,participant_a,participant_b,updated_at").single();}
    if(result.error||!result.data){setNotice(result.error?.message??"Conversation was not created.");await loadInbox(userId);return;}
    if(alive)setActiveId(result.data.id);
   }
   await loadInbox(userId);
  })();
  return()=>{alive=false;};
 },[userId,requestedPartner,requestedConversation]);
 useEffect(()=>{
  const client=supabase;
  if(!activeId||!userId||!client)return;
  let alive=true;
  const channel=client.channel("sport-messages-"+activeId)
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"conversation_id=eq."+activeId},payload=>{
    if(!alive)return;
    const incoming=payload.new as Message;
    setMessages(rows=>Array.from(new Map([...rows,incoming].map(item=>[item.id,item])).values()).sort((a,b)=>a.created_at.localeCompare(b.created_at)));
    if(incoming.sender_id!==userId&&!incoming.read_at){
      const timestamp=new Date().toISOString();
      void client.from("messages").update({read_at:timestamp}).eq("id",incoming.id).then(({error})=>{
        if(error&&alive)setNotice("A new message arrived but could not be marked read.");
      });
    }
   })
   .on("postgres_changes",{event:"UPDATE",schema:"public",table:"messages",filter:"conversation_id=eq."+activeId},payload=>{
    if(!alive)return;
    const updated=payload.new as Message;
    setMessages(rows=>rows.map(item=>item.id===updated.id?{...item,...updated}:item));
   })
   .subscribe();
  (async()=>{
   const {data,error}=await client.from("messages").select("id,conversation_id,sender_id,body,created_at,read_at").eq("conversation_id",activeId).order("created_at",{ascending:true}).limit(250);
   if(!alive)return;
   if(error){setNotice(error.message);return;}
   const rows=(data??[]) as Message[];
   setMessages(current=>Array.from(new Map([...rows,...current].map(item=>[item.id,item])).values()).sort((a,b)=>a.created_at.localeCompare(b.created_at)));
   const unread=rows.filter(item=>item.sender_id!==userId&&!item.read_at).map(item=>item.id);
   if(unread.length)await client.from("messages").update({read_at:new Date().toISOString()}).in("id",unread);
  })().catch(error=>{if(alive)setNotice(error instanceof Error?error.message:"Conversation could not be loaded.");});
  return()=>{alive=false;void client.removeChannel(channel);};
 },[activeId,userId]);
 async function submitMessageReport(event:FormEvent<HTMLFormElement>,item:Message){
  event.preventDefault();if(!supabase||!userId||item.sender_id===userId)return;
  const details=reportDetails.trim();
  if(details.length<10){setNotice("Please add at least 10 characters of context for the report.");return;}
  setReportBusy(true);setNotice("");
  try{
   const {error}=await supabase.from("safety_reports").insert({reporter_id:userId,target_type:"message",target_id:item.id,reason:reportReason,details});
   if(error)throw error;
   setReportTarget("");setReportDetails("");
   setNotice("Your report was sent privately to the moderation team.");
  }catch(error){setNotice(error instanceof Error?error.message:"The message report could not be submitted.");}
  finally{setReportBusy(false);}
 }
 async function send(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!supabase||!userId||!activeId||!draft.trim())return;
  setBusy(true);setNotice("");
  try{
   const {data,error}=await supabase.from("messages").insert({conversation_id:activeId,sender_id:userId,body:draft.trim()}).select("id,conversation_id,sender_id,body,created_at,read_at").single();
   if(error)throw error;
   setMessages(rows=>[...rows,data as Message]);setDraft("");
   await supabase.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",activeId);
   await loadInbox(userId);
  }catch(error){setNotice(error instanceof Error?error.message:"Message could not be sent.");}
  finally{setBusy(false);}
 }
 if(!authChecked||loading&&!userId)return <section className="workspace-wrap"><div className="workspace-loading"><LoaderCircle size={22} className="spin"/>Opening your inbox…</div></section>;
 if(!supabaseConfigured||!supabase)return <section className="workspace-wrap"><div className="workspace-empty"><MessageCircle size={28}/><h1>Your inbox is ready for connection.</h1><p>Connect the Sport Supabase project and apply the messaging migration to activate private conversations.</p><Link to="/join" className="button button-dark">Join the network</Link></div></section>;
 if(!userId)return <section className="workspace-wrap"><div className="workspace-empty"><MessageCircle size={28}/><h1>Make the right connection.</h1><p>Sign in to message discoverable public athlete profiles and verified organisations. Your conversations are private to the participants.</p><Link to={"/join?mode=login&next="+encodeURIComponent("/messages"+(requestedPartner?"?with="+requestedPartner:""))} className="button button-dark">Sign in to continue <ArrowUpRight size={16}/></Link></div></section>;
 return <section className="workspace-wrap messages-wrap"><div className="workspace-hero"><div><div className="workspace-kicker"><span className="status-dot"/> PRIVATE COMMUNICATIONS</div><h1>Good connections<br/><span>move things forward.</span></h1><p>Keep professional, relevant conversations in one place.</p></div><Link to="/talent" className="button button-dark">Discover talent <ArrowUpRight size={16}/></Link></div>
 {notice&&<div className="workspace-notice notice-info" role="status">{notice}</div>}
 <div className="messages-shell"><aside className="messages-sidebar"><div className="messages-sidebar-head"><strong>Inbox</strong><span>{conversations.length}</span></div>{loading?<div className="messages-empty-small">Loading conversations…</div>:conversations.map(item=><button key={item.id} className={activeId===item.id?"conversation-item active":"conversation-item"} onClick={()=>setActiveId(item.id)}><span className="conversation-avatar">{(item.otherName.trim()[0]||"M").toUpperCase()}</span><span className="conversation-summary"><strong>{item.otherName}</strong><small>{item.otherRole}{item.otherLocation?" · "+item.otherLocation:""}</small><em>Open conversation</em></span></button>)}{!loading&&!conversations.length&&<div className="messages-empty-small">No conversations yet. Explore public athlete profiles to start a relevant conversation.</div>}<Link to="/talent" className="messages-discover"><Users size={16}/> Find people to contact <ArrowUpRight size={14}/></Link></aside>
 <section className="message-panel">{active?<><header className="message-panel-header"><span className="conversation-avatar">{(active.otherName.trim()[0]||"M").toUpperCase()}</span><div><strong>{active.otherName}</strong><small>{active.otherRole}{active.otherLocation?" · "+active.otherLocation:""}</small></div><span className="message-private-label"><ShieldCheck size={14}/> Private</span></header><div className="message-list">{messages.map(item=><div className={item.sender_id===userId?"message-line own":"message-line"} key={item.id}><div className="message-bubble"><p>{item.body}</p><small>{new Intl.DateTimeFormat("en-ZA",{hour:"2-digit",minute:"2-digit",day:"numeric",month:"short"}).format(new Date(item.created_at))}{item.sender_id===userId&&item.read_at?" · read":""}</small></div>{item.sender_id!==userId&&<div className="message-report-tools"><button type="button" onClick={()=>{setReportTarget(target=>target===item.id?"":item.id);setReportDetails("");setNotice("");}}><AlertTriangle size={12}/>{reportTarget===item.id?"Cancel":"Report message"}</button>{reportTarget===item.id&&<form className="message-report-form" onSubmit={event=>void submitMessageReport(event,item)}><label>Reason<select value={reportReason} onChange={e=>setReportReason(e.target.value)}>{[{value:"fraud_or_scam",label:"Fraud or scam"},{value:"impersonation",label:"Impersonation"},{value:"harassment_or_abuse",label:"Harassment or abuse"},{value:"unsafe_request",label:"Unsafe request"},{value:"privacy_concern",label:"Privacy concern"},{value:"spam",label:"Spam"},{value:"other",label:"Other"}].map(reason=><option key={reason.value} value={reason.value}>{reason.label}</option>)}</select></label><label>Context<textarea minLength={10} maxLength={4000} rows={3} required value={reportDetails} onChange={e=>setReportDetails(e.target.value)} placeholder="Explain the concern. Avoid unnecessary sensitive information."/></label><button className="button button-dark" type="submit" disabled={reportBusy||reportDetails.trim().length<10}>{reportBusy?"Submitting…":"Send private report"}</button></form>}</div>}</div>)}</div><form className="message-composer" onSubmit={send}><textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={2} maxLength={5000} placeholder="Write a clear, professional message…" required/><button className="button button-dark" type="submit" disabled={busy||!draft.trim()}><Send size={16}/>{busy?"Sending…":"Send"}</button><span>Messages are private to this conversation. Avoid sharing sensitive documents or paying anyone who promises selection.</span></form></>:<div className="message-no-selection"><MessageCircle size={28}/><h2>Your next connection starts here.</h2><p>Select a conversation or find public athlete profiles to contact. Only message people for relevant, respectful sporting purposes.</p><Link to="/talent" className="button button-dark">Explore talent <ArrowUpRight size={15}/></Link></div>}</section></div>
 <div className="workspace-footer-note"><ShieldCheck size={15}/><span>ChatSched Sport is for professional networking. Do not harass users, send unsolicited sensitive information, or treat messages as proof of selection or representation.</span></div>
 </section>;
}