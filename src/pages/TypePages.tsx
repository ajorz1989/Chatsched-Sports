import {Link,useParams} from "react-router-dom";
import {ArrowUpRight} from "lucide-react";
import Breadcrumbs from "../components/Breadcrumbs";
import ListingsSection from "../components/ListingsSection";
import NotFoundPage from "./NotFoundPage";
import {findType,opportunityTypes,sports} from "../content/taxonomy";
import {guides} from "../content/guides";
import {usePageMeta} from "../lib/pageMeta";
import {useListings} from "../lib/useListings";
import "../styles-support.css";

export function TypesIndexPage(){
 usePageMeta({title:"Types of Sports Opportunity",description:"Understand trials, academies, scholarships, scouting, sponsorship, coaching, events and development programmes, and what to check before you apply."});
 return <section className="sx-page">
  <Breadcrumbs items={[{label:"Home",to:"/"},{label:"Opportunity types"}]}/>
  <header className="sx-hero"><p className="section-kicker">OPPORTUNITY TYPES</p><h1>What kind of opportunity are you looking for?</h1><p className="sx-lead">Different opportunities work differently. Learn what each involves, who it suits and what to check before you commit.</p></header>
  <ul className="sx-card-grid">{opportunityTypes.map(type=><li key={type.slug}><Link className="sx-tile" to={"/opportunity-types/"+type.slug}><strong>{type.plural}</strong><span>{type.summary}</span></Link></li>)}</ul>
 </section>;
}

export function TypePage(){
 const {typeSlug}=useParams();
 const type=findType(typeSlug);
 const listings=useListings({type:type?.value});
 // The explanatory content stands on its own, so type pages are always indexable.
 usePageMeta(type?{title:type.plural+" in sport",description:type.summary+" Learn who it suits, what to check and see verified listings."}:{title:"Page not found",description:"This page does not exist.",noindex:true});
 if(!type)return <NotFoundPage/>;
 return <section className="sx-page">
  <Breadcrumbs items={[{label:"Home",to:"/"},{label:"Opportunity types",to:"/opportunity-types"},{label:type.plural}]}/>
  <header className="sx-hero"><p className="section-kicker">{type.label.toUpperCase()}</p><h1>{type.plural}.</h1><p className="sx-lead">{type.summary}</p></header>
  <div className="sx-body">
   <p><strong>Who it is for:</strong> {type.whoFor}</p>
   <div className="sx-grid">
    <article className="sx-card"><h3>What to look for</h3><ul className="sx-list">{type.lookFor.map(item=><li key={item}>{item}</li>)}</ul></article>
    <article className="sx-card"><h3>Be careful if you see</h3><ul className="sx-list">{type.watchOut.map(item=><li key={item}>{item}</li>)}</ul><p className="sx-small">See <Link to="/guides/how-to-spot-a-fake-sports-opportunity">how to spot a fake sports opportunity</Link> or <Link to="/report">report a concern</Link>.</p></article>
   </div>
   <ListingsSection state={listings} heading={"Open "+type.plural.toLowerCase()} emptyText={"There are no verified, open "+type.plural.toLowerCase()+" listed right now."} seeAllTo={"/opportunities?type="+type.value}/>
   <h2>Browse by sport</h2>
   <ul className="sx-chips sx-chips-left">{sports.map(sport=><li key={sport.slug}><Link to={"/sports/"+sport.slug}>{sport.name}</Link></li>)}</ul>
   <h2>Related guides</h2>
   <ul className="sx-list">{guides.filter(guide=>guide.related.some(link=>link.to==="/opportunity-types/"+type.slug)).concat(guides.slice(0,2)).filter((guide,index,all)=>all.findIndex(other=>other.slug===guide.slug)===index).slice(0,4).map(guide=><li key={guide.slug}><Link to={"/guides/"+guide.slug}>{guide.title}</Link></li>)}</ul>
   <div className="sx-actions"><Link className="button button-dark" to="/join">Create a profile <ArrowUpRight size={15}/></Link></div>
  </div>
 </section>;
}
