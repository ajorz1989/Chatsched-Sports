import {useEffect,useMemo,useState} from "react";
import {ArrowUpRight,LifeBuoy,Search} from "lucide-react";
import {Link} from "react-router-dom";
import {faqItems,faqJsonLd,filterFaq} from "../lib/faq";
import "../styles-support.css";

export default function HelpPage(){
 const [query,setQuery]=useState("");
 const results=useMemo(()=>filterFaq(faqItems,query),[query]);
 const categories=useMemo(()=>Array.from(new Set(results.map(item=>item.category))),[results]);

 // Structured data lets search engines show these answers; removed again when leaving the page.
 useEffect(()=>{
  const script=document.createElement("script");
  script.type="application/ld+json";
  script.id="faq-jsonld";
  script.text=faqJsonLd(faqItems);
  document.head.appendChild(script);
  return()=>{script.remove();};
 },[]);

 return <section className="sx-page">
  <header className="sx-hero">
   <span className="sx-icon"><LifeBuoy size={26} aria-hidden="true"/></span>
   <p className="section-kicker">HELP CENTRE</p>
   <h1>How can we help?</h1>
   <p className="sx-lead">Answers to common questions about profiles, opportunities, verification and your data. Cannot find what you need? Send us a message.</p>
   <label className="sx-search"><Search size={18} aria-hidden="true"/><span className="sr-only">Search help articles</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search, for example “private profile” or “apply”" maxLength={80}/></label>
  </header>
  <div className="sx-body">
   {results.length===0?<div className="sx-empty"><h2>No matching answers.</h2><p>Try different words, or <Link to="/contact">contact us</Link> and we will help.</p></div>:
    categories.map(category=><section key={category} className="sx-faq-group" aria-labelledby={"faq-"+category.replace(/\W+/g,"-")}>
     <h2 id={"faq-"+category.replace(/\W+/g,"-")}>{category}</h2>
     {results.filter(item=>item.category===category).map(item=><details key={item.question} className="sx-faq" open={query.trim().length>0&&results.length<=3}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
    </section>)}
   <aside className="sx-callout">
    <h2>Still need help?</h2>
    <div className="sx-actions">
     <Link className="button button-dark" to="/contact">Contact us <ArrowUpRight size={15}/></Link>
     <Link className="button button-light-outline-dark" to="/report">Report a concern</Link>
     <Link className="button button-light-outline-dark" to="/data-request">Data request</Link>
     <Link className="button button-light-outline-dark" to="/verification">How verification works</Link>
    </div>
   </aside>
  </div>
 </section>;
}
