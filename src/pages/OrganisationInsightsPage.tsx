import {useEffect,useMemo,useState} from "react";
import {Activity,ArrowUpRight,BarChart3,ClipboardList,Eye,LoaderCircle,ShieldCheck,TrendingUp} from "lucide-react";
import {Link} from "react-router-dom";
import {supabase,supabaseConfigured} from "../lib/supabase";
import "../styles-workspace.css";

type Org={id:string;name:string;verification_status:string};
type Listing={id:string;title:string;status:string;verification_status:string;closing_date:string|null;created_at:string;opportunity_type:string};
type ViewRow={opportunity_id:string;viewed_at:string};
type Application={opportunity_id:string;status:string;created_at:string};

export default function OrganisationInsightsPage(){
 const [loading,setLoading]=useState(true);const [userId,setUserId]=useState("");const [orgs,setOrgs]=useState<Org[]>([]);const [selectedOrg,setSelectedOrg]=useState("");const [listings,setListings]=useState<Listing[]>([]);const [views,setViews]=useState<ViewRow[]>([]);const [applications,setApplications]=useState<Application[]>([]);const [notice,setNotice]=useState("");
 useEffect(()=>{let alive=true;(async()=>{if(!supabaseConfigured||!supabase){setLoading(false);return;}try{
  const {data:{user}}=await supabase.auth.getUser();if(!alive)return;if(!user){setLoading(false);return;}setUserId(user.id);
  const {data,error}=await supabase.from("organisations").select("id,name,verification_status").eq("owner_id",user.id).eq("verification_status","verified").order("name");
  if(error)throw error;const rows=(data??[]) as Org[];setOrgs(rows);if(rows.length)setSelectedOrg(rows[0].id);
 }catch(e){if(alive)setNotice(e instanceof Error?e.message:"Organisation access could not be loaded.");}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[]);
 useEffect(()=>{let alive=true;if(!selectedOrg||!supabase)return;
 (async()=>{setLoading(true);try{
  const {data:list,error:listError}=await supabase.from("opportunities").select("id,title,status,verification_status,closing_date,created_at,opportunity_type").eq("organisation_id",selectedOrg).order("created_at",{ascending:false});
  if(listError)throw listError;const rows=(list??[]) as Listing[];setListings(rows);
  if(!rows.length){setViews([]);setApplications([]);return;}
  const ids=rows.map(x=>x.id);
  const [viewRes,appRes]=await Promise.all([
   supabase.from("opportunity_member_views").select("opportunity_id,viewed_at").in("opportunity_id",ids),
   supabase.from("opportunity_applications").select("opportunity_id,status,created_at").in("opportunity_id",ids)
  ]);
  if(viewRes.error)throw viewRes.error;if(appRes.error)throw appRes.error;setViews((viewRes.data??[]) as ViewRow[]);setApplications((appRes.data??[]) as Application[]);
 }catch(e){if(alive)setNotice(e instanceof Error?e.message:"Insight data could not be loaded. Apply migration 008 and confirm your organisation is verified.");}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[selectedOrg]);

 const byListing=useMemo(()=>listings.map(listing=>{
  const listingViews=views.filter(v=>v.opportunity_id===listing.id).length;const listingApps=applications.filter(a=>a.opportunity_id===listing.id);
  const accepted=listingApps.filter(a=>a.status==="accepted").length;const conversion=listingViews?Math.round(listingApps.length/listingViews*100):0;
  return {...listing,views:listingViews,applications:listingApps.length,accepted,conversion};
 }),[listings,views,applications]);
 const totalViews=byListing.reduce((sum,x)=>sum+x.views,0);const totalApps=byListing.reduce((sum,x)=>sum+x.applications,0);const accepted=byListing.reduce((sum,x)=>sum+x.accepted,0);
 const recentViews=useMemo(()=>{const now=Date.now();return Array.from({length:14},(_,offset)=>{const day=new Date(now-(13-offset)*86400000);const key=day.toISOString().slice(0,10);return {label:new Intl.DateTimeFormat("en-ZA",{day:"numeric",month:"short"}).format(day),count:views.filter(v=>v.viewed_at.slice(0,10)===key).length};});},[views]);
 if(loading&&!orgs.length)return <section className="workspace-wrap"><div className="workspace-loading"><LoaderCircle size={22} className="spin"/>Opening organisation insights…</div></section>;
 if(!supabaseConfigured||!supabase)return <section className="workspace-wrap"><div className="workspace-empty"><BarChart3 size={28}/><h1>Organisation insights are ready.</h1><p>Connect the dedicated Sport Supabase project and apply migration 008 to activate member-view analytics.</p><Link className="button button-dark" to="/join">Join the network</Link></div></section>;
 if(!userId||!orgs.length)return <section className="workspace-wrap"><div className="workspace-empty"><span className="workspace-icon"><ShieldCheck size={26}/></span><p className="workspace-kicker">ORGANISATION INSIGHTS</p><h1>Understand what is<br/><span>working.</span></h1><p>Insights are available to authenticated owners of verified organisations. They show authenticated member views and application activity only; anonymous visits are not tracked.</p><Link className="button button-dark" to="/workspace">Open workspace</Link></div></section>;
 const current=orgs.find(x=>x.id===selectedOrg);
 return <section className="workspace-wrap insights-wrap">
  <div className="workspace-hero"><div><div className="workspace-kicker"><span className="status-dot"/> ORGANISATION INSIGHTS</div><h1>See where your<br/><span>opportunities move.</span></h1><p>Authenticated member views and application activity, presented without invasive anonymous tracking.</p></div><Link className="button button-dark" to="/workspace">Back to workspace <ArrowUpRight size={15}/></Link></div>
  {notice&&<div className="workspace-notice notice-info">{notice}</div>}
  <label className="insights-org-select">Organisation<select value={selectedOrg} onChange={e=>setSelectedOrg(e.target.value)}>{orgs.map(org=><option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
  <div className="insight-metric-grid"><article><span>Member views</span><strong>{totalViews}</strong><small>Unique authenticated member-view records within the daily dedupe window.</small></article><article><span>Applications</span><strong>{totalApps}</strong><small>Applications received across this organisation's listings.</small></article><article><span>Accepted</span><strong>{accepted}</strong><small>Applications marked accepted by your organisation.</small></article><article><span>View → application</span><strong>{totalViews?Math.round(totalApps/totalViews*100):0}%</strong><small>Directional conversion from authenticated views to applications.</small></article></div>
  <div className="insights-grid"><section className="insights-panel"><div className="workspace-section-title"><div><p className="workspace-kicker">LAST 14 DAYS</p><h2>Member view activity.</h2></div><Activity size={20}/></div><div className="insights-bars">{recentViews.map(item=><div className="insight-bar-column" key={item.label}><span style={{height:(item.count?Math.max(8,Math.min(100,item.count*16)):4)+"%"}} title={item.count+" views"}></span><small>{item.label}</small></div>)}</div><p className="insight-disclaimer">Only authenticated member views are counted. No IP addresses or anonymous fingerprints are stored.</p></section>
  <section className="insights-panel"><div className="workspace-section-title"><div><p className="workspace-kicker">LISTING PERFORMANCE</p><h2>By opportunity.</h2></div><TrendingUp size={20}/></div><div className="listing-insight-list">{byListing.map(item=><article key={item.id}><div><strong>{item.title}</strong><small>{item.opportunity_type} · {item.status} · {item.verification_status}</small></div><div className="listing-insight-stats"><span><Eye size={13}/>{item.views}</span><span><ClipboardList size={13}/>{item.applications}</span><b>{item.conversion}%</b></div></article>)}</div>{!byListing.length&&<p className="workspace-muted">Create a verified listing to start collecting member-view and application activity.</p>}</section></div>
  <div className="workspace-footer-note"><ShieldCheck size={15}/><span>Analytics are designed to inform your listing decisions, not to identify individual athletes. Treat athlete information and application records as confidential.</span></div>
 </section>;
}
