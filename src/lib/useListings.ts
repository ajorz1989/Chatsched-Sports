import {useEffect,useState} from "react";
import {searchOpportunities} from "./opportunities";
import type {Opportunity} from "./types";

export type ListingsState={status:"loading"|"ready"|"error";items:Opportunity[];total:number};

/** Live, verified, open listings for a filter. Sample (demo) listings are never counted as real results. */
export function useListings(filter:{sport?:string;type?:string;terms?:string[]},limit=12):ListingsState{
 const [state,setState]=useState<ListingsState>({status:"loading",items:[],total:0});
 const key=JSON.stringify([filter.sport??"",filter.type??"",filter.terms??[],limit]);
 useEffect(()=>{
  let alive=true;
  setState({status:"loading",items:[],total:0});
  const terms=filter.terms&&filter.terms.length>0?filter.terms:[undefined];
  void Promise.all(terms.map(term=>searchOpportunities({sport:filter.sport,type:filter.type,search:term,pageSize:limit}))).then(results=>{
   if(!alive)return;
   const live=results.filter(result=>!result.demo);
   const seen=new Set<string>();
   const items:Opportunity[]=[];
   for(const result of live)for(const item of result.opportunities)if(!seen.has(item.id)){seen.add(item.id);items.push(item);}
   // A search term can match several places, so the merged list is the honest total for multi-term pages.
   const total=terms.length>1?items.length:(live[0]?.total??0);
   setState({status:"ready",items:items.slice(0,limit),total});
  }).catch(()=>{if(alive)setState({status:"error",items:[],total:0});});
  return()=>{alive=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key]);
 return state;
}
