import {ChevronRight} from "lucide-react";
import {Link} from "react-router-dom";
import {useJsonLd} from "../lib/pageMeta";

export type Crumb={label:string;to?:string};

export default function Breadcrumbs({items}:{items:Crumb[]}){
 useJsonLd("breadcrumb-jsonld",{
  "@context":"https://schema.org",
  "@type":"BreadcrumbList",
  itemListElement:items.map((item,index)=>({"@type":"ListItem",position:index+1,name:item.label,...(item.to?{item:window.location.origin+item.to}:{})}))
 });
 return <nav className="sx-crumbs" aria-label="Breadcrumb"><ol>{items.map((item,index)=><li key={item.label}>{item.to&&index<items.length-1?<Link to={item.to}>{item.label}</Link>:<span aria-current={index===items.length-1?"page":undefined}>{item.label}</span>}{index<items.length-1&&<ChevronRight size={14} aria-hidden="true"/>}</li>)}</ol></nav>;
}
