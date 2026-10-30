import {useEffect,useRef,useState} from "react";import {ArrowUpRight,Bell,Menu,Trophy,X} from "lucide-react";import {supabase,supabaseConfigured} from "../lib/supabase";import {Link,NavLink,Outlet,useLocation} from "react-router-dom";import CookieBanner from "./CookieBanner";
const nav=[{label:"The network",to:"/#network"},{label:"Opportunities",to:"/opportunities"},{label:"Talent",to:"/talent"},{label:"Organisations",to:"/organisations"},{label:"Matching",to:"/matching"}];
const routeMeta:Record<string,{title:string;description:string;noindex?:boolean}>={
 "/":{title:"The Sports Opportunity Network",description:"Discover sporting opportunities, build a professional sports CV and connect athletes with clubs, scouts, academies, coaches, brands and sponsors."},
 "/opportunities":{title:"Sports Opportunities",description:"Explore trials, academy places, scholarships, scouting, development, coaching and sponsorship opportunities."},
 "/talent":{title:"Athlete Talent Directory",description:"Discover athlete profiles that have explicitly opted into public visibility. Search by sport, position, competition level and location."},
 "/organisations":{title:"Verified Sports Organisations",description:"Explore organisations that have passed ChatSched Sport's verification process."},
 "/matching":{title:"Explainable Opportunity Matching",description:"Compare sporting opportunities against your stated sport, position, location, level and career goals with transparent fit criteria."},
 "/about":{title:"About ChatSched Sport",description:"Learn about the Sports Opportunity Network and its vision to connect sporting talent with clearer pathways."},
 "/how-it-works":{title:"How ChatSched Sport Works",description:"Discover how athletes, clubs, scouts, academies and partners move from profiles to relevant sporting opportunities."},
 "/for-athletes":{title:"For Athletes",description:"Build your sports CV, record achievements and experience, discover opportunities and make your sporting journey easier to understand."},
 "/for-organisations":{title:"For Clubs, Academies and Organisations",description:"Create an organisation profile, submit evidence for verification and publish structured sporting opportunities."},
 "/for-partners":{title:"For Brands and Sponsors",description:"Explore a more structured way to discover athletes and build sports partnerships."},
 "/safeguarding":{title:"Trust and Safeguarding",description:"Review ChatSched Sport's verification principles, user safety guidance and safeguards around sporting opportunities."},
 "/privacy":{title:"Privacy Overview",description:"Learn how public profile visibility works and how private contact details are kept out of the public directory."},
 "/help":{title:"Help Centre and FAQ",description:"Answers about profiles, privacy, opportunities, applications, verification and your data on ChatSched Sport."},
 "/contact":{title:"Contact ChatSched Sport",description:"Send a question, support request or partnership enquiry to the ChatSched Sport team."},
 "/cookies":{title:"Cookie Policy and Settings",description:"See which cookies and browser storage ChatSched Sport uses and change your analytics choice at any time."},
 "/verification":{title:"How Verification Works",description:"What Unverified, Pending, Verified, Professional and Official mean on ChatSched Sport, and what verification does not guarantee."},
 "/report":{title:"Report a Concern",description:"Report a fake listing, scam, impersonation, privacy problem or safeguarding concern to ChatSched Sport moderators."},
 "/data-request":{title:"Your Data and POPIA Requests",description:"Download, correct or delete your personal information, or send a POPIA data request to ChatSched Sport."},
 "/status":{title:"Service Status",description:"Check whether the ChatSched Sport website, sign-in and opportunity data are reachable from your device.",noindex:true},
 "/terms":{title:"Platform Principles",description:"Read the expectations, limits and trust principles for using ChatSched Sport."},
 "/join":{title:"Join the Sports Opportunity Network",description:"Create a ChatSched Sport account to start building a sports profile or organisation presence.",noindex:true},
 "/forgot-password":{title:"Recover Your Account",description:"Request a secure email link to reset your ChatSched Sport password.",noindex:true},
 "/reset-password":{title:"Set a New Password",description:"Complete your secure ChatSched Sport password reset.",noindex:true},
 "/workspace":{title:"Member Workspace",description:"Manage your sports profile, saved opportunities, applications, organisation and career-support requests.",noindex:true},
 "/messages":{title:"Private Messages",description:"Private conversations for discoverable members of the ChatSched Sport network.",noindex:true},
 "/notifications":{title:"Account Notifications",description:"Review account updates, message notifications and application activity.",noindex:true},
 "/representation":{title:"Athlete Career Support and Representation",description:"Explore ChatSched Sport career planning, opportunity support and a structured representation pathway."},
 "/recruitment":{title:"Recruiter Hub",description:"Private recruitment pipeline for verified organisations.",noindex:true},
 "/talent-discover":{title:"Verified Talent Search",description:"Member-only reverse talent search for verified organisations. Results respect each athlete's privacy settings.",noindex:true},
 "/insights":{title:"Organisation Insights",description:"Private recruitment insights for verified organisation owners.",noindex:true},
 "/admin":{title:"Platform Moderation",description:"Restricted moderation, verification and audit tools.",noindex:true}
};
function setMeta(selector:string,attribute:string,value:string){
 let element=document.head.querySelector(selector);
 if(!element){
  element=document.createElement(selector.startsWith("link")?"link":"meta");
  const match=selector.match(/\[(name|property|rel)="([^"]+)"\]/);
  if(match)element.setAttribute(match[1],match[2]);
  document.head.appendChild(element);
 }
 element.setAttribute(attribute,value);
}
export default function SiteLayout(){
 const [open,setOpen]=useState(false);const [menu,setMenu]=useState(false);const menuRef=useRef<HTMLDivElement>(null);
 const location=useLocation();
 const [userId,setUserId]=useState("");const [initial,setInitial]=useState("");const [unread,setUnread]=useState(0);
 useEffect(()=>{
  if(!supabaseConfigured||!supabase)return;const client=supabase;let alive=true;
  const apply=(user:{id:string;email?:string|null;user_metadata?:Record<string,unknown>}|null|undefined)=>{if(!alive)return;setUserId(user?.id??"");const name=String(user?.user_metadata?.display_name??user?.email??"").trim();setInitial(name.charAt(0).toUpperCase());if(!user)setUnread(0);};
  void client.auth.getSession().then(({data})=>apply(data.session?.user));
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>apply(session?.user));
  return()=>{alive=false;subscription.unsubscribe();};
 },[]);
 useEffect(()=>{
  if(!userId||!supabase)return;const client=supabase;let alive=true;
  void client.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",userId).is("read_at",null).then(({count})=>{if(alive)setUnread(count??0);});
  return()=>{alive=false;};
 },[userId,location.pathname]);
 useEffect(()=>{setMenu(false);setOpen(false);},[location.pathname]);
 useEffect(()=>{
  if(!menu)return;const onDown=(e:MouseEvent)=>{if(menuRef.current&&!menuRef.current.contains(e.target as Node))setMenu(false);};const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setMenu(false);};document.addEventListener("mousedown",onDown);document.addEventListener("keydown",onKey);return()=>{document.removeEventListener("mousedown",onDown);document.removeEventListener("keydown",onKey);};
 },[menu]);
 useEffect(()=>{
  const pathname=location.pathname;
  const meta=routeMeta[pathname]??(pathname.startsWith("/opportunities/")?{title:"Opportunity Details",description:"Review the description, eligibility and terms of this sporting opportunity."}:pathname.startsWith("/talent/")?{title:"Athlete Profile",description:"Review an opted-in athlete sports profile, achievements and portfolio."}:pathname.startsWith("/organisations/")?{title:"Sports Organisation Profile",description:"Review organisation details and published sporting opportunities."}:{title:"Page not found",description:"This page does not exist on ChatSched Sport.",noindex:true});
  document.title=meta.title+" | ChatSched Sport";
  setMeta('meta[name="description"]',"content",meta.description);
  setMeta('meta[property="og:title"]',"content",meta.title+" | ChatSched Sport");
  setMeta('meta[property="og:description"]',"content",meta.description);
  setMeta('meta[property="og:type"]',"content","website");
  setMeta('meta[property="og:url"]',"content",window.location.origin+pathname);
  setMeta('meta[name="twitter:card"]',"content","summary");
  setMeta('meta[name="twitter:title"]',"content",meta.title+" | ChatSched Sport");
  setMeta('meta[name="twitter:description"]',"content",meta.description);
  setMeta('meta[name="robots"]',"content",meta.noindex?"noindex,nofollow":"index,follow");
  setMeta('link[rel="canonical"]',"href",window.location.origin+pathname);
 },[location.pathname]);
 useEffect(()=>{
  if(location.hash){const id=decodeURIComponent(location.hash.slice(1));const timer=window.setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"}),60);return()=>window.clearTimeout(timer);}
  window.scrollTo(0,0);
 },[location.pathname,location.hash]);
 return <div className="app-shell"><a className="skip-link" href="#main">Skip to main content</a>
<div className="top-strip"><span className="status-dot"/><span>Building a better pathway from talent to opportunity</span><span className="top-strip-region">Built in South Africa · For the sporting world</span></div>
<header className="site-header"><Link to="/" className="brand-lockup" aria-label="ChatSched Sport home" onClick={()=>setOpen(false)}><span className="brand-mark"><Trophy size={20}/></span><span className="brand-wordmark">ChatSched <b>Sport</b><small>THE SPORTS OPPORTUNITY NETWORK</small></span></Link>
<nav className="desktop-nav" aria-label="Main navigation">{nav.map(item=>item.to.startsWith("/#")?<Link to={item.to} key={item.label}>{item.label}</Link>:<NavLink key={item.label} to={item.to} className={({isActive})=>isActive?"nav-active":""}>{item.label}</NavLink>)}</nav>
<div className="header-actions">{userId?<><Link className="header-icon-link" to="/notifications" aria-label={unread?"Notifications, "+unread+" unread":"Notifications"}><Bell size={20}/>{unread>0&&<span className="header-badge" aria-hidden="true">{unread>9?"9+":unread}</span>}</Link><div className="account-menu" ref={menuRef}><button type="button" className="header-avatar" aria-label="Account menu" aria-haspopup="true" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}>{initial||"M"}</button>{menu&&<div className="account-menu-panel" role="menu"><Link role="menuitem" to="/workspace">Workspace</Link><Link role="menuitem" to="/messages">Messages</Link><Link role="menuitem" to="/notifications">Notifications{unread>0?" ("+unread+")":""}</Link><button role="menuitem" type="button" onClick={()=>{setMenu(false);void supabase?.auth.signOut();}}>Sign out</button></div>}</div></>:<><Link className="header-signin" to="/join?mode=login">Sign in</Link><Link className="button button-accent button-small" to="/join">Join the network <ArrowUpRight size={16}/></Link></>}</div>
<button className="mobile-menu-toggle" type="button" aria-label={open?"Close menu":"Open menu"} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?<X size={20}/>:<Menu size={20}/>}</button></header>
{open&&<nav className="mobile-nav" aria-label="Mobile navigation">{nav.map(item=>item.to.startsWith("/#")?<Link to={item.to} key={item.label} onClick={()=>setOpen(false)}>{item.label}</Link>:<Link key={item.label} to={item.to} onClick={()=>setOpen(false)}>{item.label}</Link>)}{userId?<><Link to="/workspace" onClick={()=>setOpen(false)}>Workspace</Link><Link to="/messages" onClick={()=>setOpen(false)}>Messages</Link><Link to="/notifications" onClick={()=>setOpen(false)}>Notifications{unread>0?" ("+unread+")":""}</Link></>:<><Link to="/join?mode=login" onClick={()=>setOpen(false)}>Sign in</Link><Link className="button button-dark" to="/join" onClick={()=>setOpen(false)}>Join the network <ArrowUpRight size={16}/></Link></>}</nav>}
<main id="main" tabIndex={-1}><Outlet/></main><CookieBanner/><footer className="site-footer"><div className="footer-main"><Link to="/" className="brand-lockup footer-brand"><span className="brand-mark"><Trophy size={20}/></span><span className="brand-wordmark">ChatSched <b>Sport</b><small>THE SPORTS OPPORTUNITY NETWORK</small></span></Link><p>Talent deserves a pathway. Opportunity deserves a place to be found.</p><nav className="footer-columns" aria-label="Footer"><div><h4>Athletes</h4><Link to="/for-athletes">For athletes</Link><Link to="/opportunities">Explore opportunities</Link><Link to="/matching">Match explorer</Link><Link to="/representation">Career support</Link><Link to="/join">Create a profile</Link></div><div><h4>Organisations</h4><Link to="/for-organisations">For organisations</Link><Link to="/organisations">Verified organisations</Link><Link to="/talent">Discover talent</Link><Link to="/talent-discover">Verified talent search</Link><Link to="/insights">Organisation insights</Link><Link to="/for-partners">Brands & sponsors</Link></div><div><h4>Network</h4><Link to="/about">About ChatSched Sport</Link><Link to="/how-it-works">How it works</Link><Link to="/workspace">Member workspace</Link><Link to="/messages">Messages</Link><Link to="/notifications">Notifications</Link><Link to="/help">Help centre</Link><Link to="/contact">Contact us</Link></div><div><h4>Trust & safety</h4><Link to="/safeguarding">Trust & safeguarding</Link><Link to="/verification">How verification works</Link><Link to="/report">Report a concern</Link><Link to="/status">Service status</Link></div></nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} ChatSched Sport</span><span>Discover. Match. Develop. Connect. Grow.</span><span>Verified opportunities will be clearly identified.</span><nav className="footer-legal" aria-label="Legal"><strong>Legal</strong><Link to="/privacy">Privacy</Link><Link to="/data-request">Your data (POPIA)</Link><Link to="/cookies">Cookies</Link><Link to="/terms">Platform principles</Link><a href="https://chatsched.com" target="_blank" rel="noreferrer">ChatSched advertising<ArrowUpRight size={16} aria-hidden="true"/><span className="sr-only"> (opens in new tab)</span></a></nav></div></footer></div>;}
