import {Link,useParams} from "react-router-dom";
import {ArrowUpRight,Clock} from "lucide-react";
import Breadcrumbs from "../components/Breadcrumbs";
import NotFoundPage from "./NotFoundPage";
import {findGuide,guides} from "../content/guides";
import {useJsonLd,usePageMeta} from "../lib/pageMeta";
import "../styles-support.css";

const dateLabel=(value:string)=>new Date(value+"T00:00:00").toLocaleDateString("en-ZA",{day:"numeric",month:"long",year:"numeric"});
const anchor=(heading:string)=>heading.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export function GuidesIndexPage(){
 usePageMeta({title:"Sports Guides for Athletes and Families",description:"Practical, plain-language guides on sports trials, building a sports CV, sponsorship, choosing an academy and staying safe."});
 return <section className="sx-page">
  <Breadcrumbs items={[{label:"Home",to:"/"},{label:"Guides"}]}/>
  <header className="sx-hero"><p className="section-kicker">GUIDES</p><h1>Practical guides for athletes and families.</h1><p className="sx-lead">Plain-language help with trials, profiles, sponsorship, academies and safety. General information only.</p></header>
  <ul className="sx-card-grid">{guides.map(guide=><li key={guide.slug}><Link className="sx-tile" to={"/guides/"+guide.slug}><span className="sx-tag">{guide.category}</span><strong>{guide.title}</strong><span>{guide.description}</span><small><Clock size={12} aria-hidden="true"/> {guide.readMinutes} min read</small></Link></li>)}</ul>
 </section>;
}

export function GuidePage(){
 const {guideSlug}=useParams();
 const guide=findGuide(guideSlug);
 usePageMeta(guide?{title:guide.title,description:guide.description}:{title:"Page not found",description:"This guide does not exist.",noindex:true});
 useJsonLd("article-jsonld",guide?{
  "@context":"https://schema.org","@type":"Article",headline:guide.title,description:guide.description,
  datePublished:guide.published,dateModified:guide.updated,
  author:{"@type":"Organization",name:"ChatSched Sport"},publisher:{"@type":"Organization",name:"ChatSched Sport"},
  mainEntityOfPage:window.location.origin+"/guides/"+guide.slug
 }:null);
 if(!guide)return <NotFoundPage/>;
 const others=guides.filter(item=>item.slug!==guide.slug).slice(0,3);
 return <article className="sx-page sx-article">
  <Breadcrumbs items={[{label:"Home",to:"/"},{label:"Guides",to:"/guides"},{label:guide.title}]}/>
  <header className="sx-hero"><p className="section-kicker">{guide.category.toUpperCase()}</p><h1>{guide.title}</h1><p className="sx-lead">{guide.intro}</p><p className="sx-small"><Clock size={12} aria-hidden="true"/> {guide.readMinutes} min read · Updated {dateLabel(guide.updated)}</p></header>
  <div className="sx-body sx-prose">
   <nav className="sx-toc" aria-label="In this guide"><strong>In this guide</strong><ol>{guide.blocks.map(block=><li key={block.heading}><a href={"#"+anchor(block.heading)}>{block.heading}</a></li>)}</ol></nav>
   {guide.blocks.map(block=><section key={block.heading} id={anchor(block.heading)}><h2>{block.heading}</h2>{block.paragraphs?.map(text=><p key={text}>{text}</p>)}{block.list&&<ul className="sx-list">{block.list.map(item=><li key={item}>{item}</li>)}</ul>}</section>)}
   <p className="sx-small">This guide is general information and is not legal, financial or medical advice.</p>
   <aside className="sx-callout"><h2>Keep going</h2><ul className="sx-list">{guide.related.map(link=><li key={link.to}><Link to={link.to}>{link.label}</Link></li>)}</ul><div className="sx-actions"><Link className="button button-dark" to="/opportunities">Browse opportunities <ArrowUpRight size={15}/></Link></div></aside>
   <h2>More guides</h2>
   <ul className="sx-list">{others.map(item=><li key={item.slug}><Link to={"/guides/"+item.slug}>{item.title}</Link></li>)}</ul>
  </div>
 </article>;
}
