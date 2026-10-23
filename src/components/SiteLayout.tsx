import {useEffect,useState} from "react";import {ArrowUpRight,Menu,Trophy,X} from "lucide-react";import {Link,NavLink,Outlet,useLocation} from "react-router-dom";
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
 "/terms":{title:"Platform Principles",description:"Read the expectations, limits and trust principles for using ChatSched Sport."},
 "/join":{title:"Join the Sports Opportunity Network",description:"Create a ChatSched Sport account to start building a sports profile or organisation presence.",noindex:true},
 "/forgot-password":{title:"Recover Your Account",description:"Request a secure email link to reset your ChatSched Sport password.",noindex:true},
 "/reset-password":{title:"Set a New Password",description:"Complete your secure ChatSched Sport password reset.",noindex:true},
 "/workspace":{title:"Member Workspace",description:"Manage your sports profile, saved opportunities, applications, organisation and career-support requests.",noindex:true},
 "/messages":{title:"Private Messages",description:"Private conversations for discoverable members of the ChatSched Sport network.",noindex:true},
 "/notifications":{title:"Account Notifications",description:"Review account updates, message notifications and application activity.",noindex:true},
 "/representation":{title:"Athlete Career Support and Representation",description:"Explore ChatSched Sport career planning, opportunity support and a structured representation pathway."},
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
 const [open,setOpen]=useState(false);
 const location=useLocation();
 useEffect(()=>{
  const pathname=location.pathname;
  const meta=routeMeta[pathname]??(pathname.startsWith("/opportunities/")?{title:"Opportunity Details",description:"Review the description, eligibility and terms of this sporting opportunity."}:pathname.startsWith("/talent/")?{title:"Athlete Profile",description:"Review an opted-in athlete sports profile, achievements and portfolio."}:pathname.startsWith("/organisations/")?{title:"Sports Organisation Profile",description:"Review organisation details and published sporting opportunities."}:{title:"ChatSched Sport",description:"The Sports Opportunity Network connecting sporting talent to opportunity."});
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
 return <div className="app-shell">
<div className="top-strip"><span className="status-dot"/><span>Building a better pathway from talent to opportunity</span><span className="top-strip-region">Built in South Africa · For the sporting world</span></div>
<header className="site-header"><Link to="/" className="brand-lockup" aria-label="ChatSched Sport home" onClick={()=>setOpen(false)}><span className="brand-mark"><Trophy size={19}/></span><span className="brand-wordmark">ChatSched <b>Sport</b><small>THE SPORTS OPPORTUNITY NETWORK</small></span></Link>
<nav className="desktop-nav" aria-label="Main navigation">{nav.map(item=>item.to.startsWith("/#")?<a href={item.to.slice(1)} key={item.label}>{item.label}</a>:<NavLink key={item.label} to={item.to} className={({isActive})=>isActive?"nav-active":""}>{item.label}</NavLink>)}</nav>
<div className="header-actions"><Link className="header-signin" to="/workspace">Workspace</Link><Link className="header-signin" to="/join?mode=login">Sign in</Link><Link className="button button-dark button-small" to="/join">Join the network <ArrowUpRight size={15}/></Link></div>
<button className="mobile-menu-toggle" type="button" aria-label={open?"Close menu":"Open menu"} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?<X size={22}/>:<Menu size={22}/>}</button></header>
{open&&<nav className="mobile-nav" aria-label="Mobile navigation">{nav.map(item=>item.to.startsWith("/#")?<a href={item.to.slice(1)} key={item.label} onClick={()=>setOpen(false)}>{item.label}</a>:<Link key={item.label} to={item.to} onClick={()=>setOpen(false)}>{item.label}</Link>)}<Link className="button button-dark" to="/join" onClick={()=>setOpen(false)}>Join the network <ArrowUpRight size={15}/></Link></nav>}
<main><Outlet/></main><footer className="site-footer"><div className="footer-main"><Link to="/" className="brand-lockup footer-brand"><span className="brand-mark"><Trophy size={18}/></span><span className="brand-wordmark">ChatSched <b>Sport</b><small>THE SPORTS OPPORTUNITY NETWORK</small></span></Link><p>Talent deserves a pathway. Opportunity deserves a place to be found.</p><div className="footer-links"><Link to="/about">About ChatSched Sport</Link><Link to="/how-it-works">How it works</Link><Link to="/for-athletes">For athletes</Link><Link to="/for-organisations">For organisations</Link><Link to="/organisations">Verified organisations</Link><Link to="/for-partners">For brands & sponsors</Link><Link to="/representation">Career support & representation</Link><Link to="/opportunities">Explore opportunities</Link><Link to="/talent">Discover talent</Link><Link to="/talent-discover">Verified talent search</Link><Link to="/insights">Organisation insights</Link><Link to="/matching">Match explorer</Link><Link to="/messages">Messages</Link><Link to="/notifications">Notifications</Link><Link to="/workspace">Member workspace</Link><Link to="/join">Create a profile</Link><Link to="/safeguarding">Trust & safeguarding</Link><Link to="/privacy">Privacy overview</Link><Link to="/terms">Platform principles</Link><Link to="/admin">Admin</Link><a href="https://chatsched.com" target="_blank" rel="noreferrer">ChatSched advertising ↗</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} ChatSched Sport</span><span>Discover. Match. Develop. Connect. Grow.</span><span>Verified opportunities will be clearly identified.</span></div></footer></div>;}
