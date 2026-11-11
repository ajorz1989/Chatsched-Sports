import {ArrowUpRight} from "lucide-react";
import {Link} from "react-router-dom";
import OpportunityCard from "./OpportunityCard";
import {CardSkeletons} from "./Skeleton";
import type {ListingsState} from "../lib/useListings";

export default function ListingsSection({state,heading,emptyText,seeAllTo}:{state:ListingsState;heading:string;emptyText:string;seeAllTo:string}){
 return <section className="sx-listings" aria-labelledby="live-listings">
  <div className="sx-listings-head"><h2 id="live-listings">{heading}</h2>{state.status==="ready"&&state.total>0&&<span className="sx-small">{state.total} open {state.total===1?"opportunity":"opportunities"}</span>}</div>
  {state.status==="loading"&&<CardSkeletons count={3}/>}
  {state.status==="error"&&<p className="sx-note">Listings could not be loaded right now. Please try again shortly.</p>}
  {state.status==="ready"&&state.items.length===0&&<div className="sx-note"><p>{emptyText}</p><p><Link to="/opportunities">Browse all opportunities</Link> or <Link to="/join">create a profile</Link> so you can be matched when something suitable is published.</p></div>}
  {state.status==="ready"&&state.items.length>0&&<><div className="opportunity-grid">{state.items.map(item=><OpportunityCard key={item.id} opportunity={item}/>)}</div>
   <div className="sx-actions"><Link className="button button-dark" to={seeAllTo}>See all matching opportunities <ArrowUpRight size={15}/></Link></div></>}
 </section>;
}
