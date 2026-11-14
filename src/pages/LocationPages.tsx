import {Link,useParams} from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import ListingsSection from "../components/ListingsSection";
import NotFoundPage from "./NotFoundPage";
import {findLocation,locations,sports} from "../content/taxonomy";
import {usePageMeta} from "../lib/pageMeta";
import {useListings} from "../lib/useListings";
import "../styles-support.css";

export function LocationsIndexPage(){
 usePageMeta({title:"Sports Opportunities by City",description:"Find verified sports opportunities in Cape Town, Johannesburg, Durban, Pretoria and other South African cities."});
 const provinces=Array.from(new Set(locations.map(place=>place.province)));
 return <section className="sx-page">
  <Breadcrumbs items={[{label:"Home",to:"/"},{label:"Locations"}]}/>
  <header className="sx-hero"><p className="section-kicker">LOCATIONS</p><h1>Sports opportunities near you.</h1><p className="sx-lead">Choose a city to see verified, open opportunities published there.</p></header>
  <div className="sx-body">{provinces.map(province=><section key={province}><h2>{province}</h2><ul className="sx-chips sx-chips-left">{locations.filter(place=>place.province===province).map(place=><li key={place.slug}><Link to={"/locations/"+place.slug}>{place.name}</Link></li>)}</ul></section>)}</div>
 </section>;
}

export function LocationPage(){
 const {locationSlug}=useParams();
 const place=findLocation(locationSlug);
 const listings=useListings({terms:place?.terms});
 // A city page with no real listings would be thin content, so it is kept out of search results.
 const meta=!place?{title:"Page not found",description:"This location page does not exist.",noindex:true}
  :listings.status==="loading"?null
  :{title:"Sports opportunities in "+place.name,description:"Verified, open sports opportunities in "+place.name+", "+place.province+": trials, academies, scholarships and more.",noindex:listings.total===0};
 usePageMeta(meta);
 if(!place)return <NotFoundPage/>;
 return <section className="sx-page">
  <Breadcrumbs items={[{label:"Home",to:"/"},{label:"Locations",to:"/locations"},{label:place.name}]}/>
  <header className="sx-hero"><p className="section-kicker">{place.province.toUpperCase()}</p><h1>Sports opportunities in {place.name}.</h1><p className="sx-lead">Verified, open opportunities published in {place.name}. Always confirm the venue, dates and costs with the organisation, and plan your travel safely.</p></header>
  <div className="sx-body">
   <ListingsSection state={listings} heading={"Open opportunities in "+place.name} emptyText={"There are no verified, open opportunities listed in "+place.name+" right now."} seeAllTo={"/opportunities?q="+encodeURIComponent(place.terms[0])}/>
   <h2>Browse {place.name} by sport</h2>
   <p className="sx-small">Sport pages show every open listing for that sport. Use the city search on the opportunities page to narrow them down.</p>
   <ul className="sx-chips sx-chips-left">{sports.map(sport=><li key={sport.slug}><Link to={"/sports/"+sport.slug}>{sport.name}</Link></li>)}</ul>
   <h2>Other cities</h2>
   <ul className="sx-chips sx-chips-left">{locations.filter(other=>other.slug!==place.slug).map(other=><li key={other.slug}><Link to={"/locations/"+other.slug}>{other.name}</Link></li>)}</ul>
  </div>
 </section>;
}
