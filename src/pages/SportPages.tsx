import {Link,useParams} from "react-router-dom";
import {ArrowUpRight} from "lucide-react";
import Breadcrumbs from "../components/Breadcrumbs";
import ListingsSection from "../components/ListingsSection";
import SportIcon from "../components/SportIcon";
import NotFoundPage from "./NotFoundPage";
import {findSport,locations,opportunityTypes,sports} from "../content/taxonomy";
import {guides} from "../content/guides";
import {useJsonLd,usePageMeta} from "../lib/pageMeta";
import {useListings} from "../lib/useListings";
import "../styles-support.css";

export function SportsIndexPage(){
 usePageMeta({title:"Sports on ChatSched Sport",description:"Explore football, rugby, cricket, netball, athletics, swimming and more. See typical pathways, positions and verified opportunities for each sport."});
 return <section className="sx-page">
  <Breadcrumbs items={[{label:"Home",to:"/"},{label:"Sports"}]}/>
  <header className="sx-hero"><p className="section-kicker">SPORTS</p><h1>Find opportunities in your sport.</h1><p className="sx-lead">Each sport page explains the usual positions and pathways and lists verified, open opportunities when there are any.</p></header>
  <ul className="sx-card-grid">{sports.map(sport=><li key={sport.slug}><Link className="sx-tile" to={"/sports/"+sport.slug}><SportIcon sport={sport.name}/><strong>{sport.name}</strong><span>{sport.tagline}</span></Link></li>)}</ul>
 </section>;
}

export function SportPage(){
 const {sportSlug}=useParams();
 const sport=findSport(sportSlug);
 const listings=useListings({sport:sport?.name});
 // Thin pages are kept out of search results: only sports with real, open listings are indexable.
 const meta=!sport?{title:"Page not found",description:"This sport page does not exist.",noindex:true}
  :listings.status==="loading"?null
  :{title:sport.name+" opportunities in South Africa",description:sport.intro.slice(0,155),noindex:listings.total===0};
 usePageMeta(meta);
 useJsonLd("listings-jsonld",sport&&listings.status==="ready"&&listings.items.length>0?{"@context":"https://schema.org","@type":"ItemList",name:sport.name+" opportunities",itemListElement:listings.items.map((item,index)=>({"@type":"ListItem",position:index+1,url:window.location.origin+"/opportunities/"+item.id,name:item.title}))}:null);
 if(!sport)return <NotFoundPage/>;
 return <section className="sx-page">
  <Breadcrumbs items={[{label:"Home",to:"/"},{label:"Sports",to:"/sports"},{label:sport.name}]}/>
  <header className="sx-hero"><span className="sx-icon"><SportIcon sport={sport.name}/></span><p className="section-kicker">{sport.name.toUpperCase()}</p><h1>{sport.name} opportunities.</h1><p className="sx-lead">{sport.intro}</p></header>
  <div className="sx-body">
   <div className="sx-split">
    <div><h2>The pathway</h2><p>{sport.pathway}</p></div>
    <aside className="sx-side"><h2>{sport.rolesLabel}</h2><ul>{sport.roles.map(role=><li key={role}>{role}</li>)}</ul></aside>
   </div>
   <ListingsSection state={listings} heading={"Open "+sport.name+" opportunities"} emptyText={"There are no verified, open "+sport.name+" opportunities right now."} seeAllTo={"/opportunities?sport="+encodeURIComponent(sport.name)}/>
   <h2>Browse {sport.name} by type</h2>
   <ul className="sx-chips sx-chips-left">{opportunityTypes.map(type=><li key={type.slug}><Link to={"/opportunity-types/"+type.slug}>{type.plural}</Link></li>)}</ul>
   <h2>Browse by city</h2>
   <ul className="sx-chips sx-chips-left">{locations.map(place=><li key={place.slug}><Link to={"/locations/"+place.slug}>{place.name}</Link></li>)}</ul>
   <h2>Helpful guides</h2>
   <ul className="sx-list">{guides.slice(0,4).map(guide=><li key={guide.slug}><Link to={"/guides/"+guide.slug}>{guide.title}</Link></li>)}</ul>
   <aside className="sx-callout"><h2>Build your {sport.name} profile.</h2><p>Add your {sport.rolesLabel.toLowerCase()}, level and goals so you can be matched with the right opportunities.</p><div className="sx-actions"><Link className="button button-dark" to="/join">Create a profile <ArrowUpRight size={15}/></Link><Link className="button button-light-outline-dark" to="/matching">See how matching works</Link></div></aside>
  </div>
 </section>;
}
