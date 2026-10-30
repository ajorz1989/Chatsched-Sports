import {useState,type FormEvent} from "react";
import {ArrowLeft,Compass,Search} from "lucide-react";
import {Link,useLocation,useNavigate} from "react-router-dom";
import "../styles-support.css";

const popular=[
 {to:"/opportunities",label:"Browse opportunities"},
 {to:"/talent",label:"Talent directory"},
 {to:"/organisations",label:"Verified organisations"},
 {to:"/matching",label:"Match explorer"},
 {to:"/help",label:"Help centre"},
 {to:"/contact",label:"Contact us"}
];

export default function NotFoundPage(){
 const navigate=useNavigate();
 const location=useLocation();
 const [query,setQuery]=useState("");
 function search(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const term=query.trim();
  if(term)navigate("/opportunities?q="+encodeURIComponent(term));
 }
 return <section className="not-found-page sx-notfound">
  <span className="not-found-icon"><Compass size={28} aria-hidden="true"/></span>
  <p className="section-kicker">404 / OFF THE MAP</p>
  <h1>This page does not exist.<br/><span>Let us get you back.</span></h1>
  <p>The link may be old or mistyped. You asked for <code className="sx-path">{location.pathname}</code>.</p>
  <form className="sx-search sx-search-inline" onSubmit={search} role="search">
   <Search size={18} aria-hidden="true"/><span className="sr-only">Search opportunities</span>
   <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search opportunities, for example football trials" maxLength={80}/>
   <button className="button button-dark button-small" type="submit">Search</button>
  </form>
  <ul className="sx-chips">{popular.map(item=><li key={item.to}><Link to={item.to}>{item.label}</Link></li>)}</ul>
  <div className="sx-actions"><Link to="/" className="button button-dark"><ArrowLeft size={16}/> Back to home</Link><Link to={"/contact"} className="sx-link">Tell us about a broken link</Link></div>
 </section>;
}
