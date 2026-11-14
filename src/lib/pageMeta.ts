import {useEffect} from "react";
import {useLocation} from "react-router-dom";

export type PageMeta={title:string;description:string;noindex?:boolean};

// Pages with data-dependent meta (for example "index only if there are real listings") register an override.
// SiteLayout reads it when the route changes; setMetaOverride also applies it straight away for late data.
const overrides=new Map<string,PageMeta>();

function setTag(selector:string,attribute:string,value:string){
 let element=document.head.querySelector(selector);
 if(!element){
  element=document.createElement(selector.startsWith("link")?"link":"meta");
  const match=selector.match(/\[(name|property|rel)="([^"]+)"\]/);
  if(match)element.setAttribute(match[1],match[2]);
  document.head.appendChild(element);
 }
 element.setAttribute(attribute,value);
}

export function applyMeta(pathname:string,meta:PageMeta):void{
 const full=meta.title+" | ChatSched Sport";
 document.title=full;
 setTag('meta[name="description"]',"content",meta.description);
 setTag('meta[property="og:title"]',"content",full);
 setTag('meta[property="og:description"]',"content",meta.description);
 setTag('meta[property="og:type"]',"content","website");
 setTag('meta[property="og:url"]',"content",window.location.origin+pathname);
 setTag('meta[name="twitter:card"]',"content","summary");
 setTag('meta[name="twitter:title"]',"content",full);
 setTag('meta[name="twitter:description"]',"content",meta.description);
 setTag('meta[name="robots"]',"content",meta.noindex?"noindex,nofollow":"index,follow");
 setTag('link[rel="canonical"]',"href",window.location.origin+pathname);
}

export function getMetaOverride(pathname:string):PageMeta|undefined{return overrides.get(pathname);}

export function setMetaOverride(pathname:string,meta:PageMeta|null):void{
 if(meta){overrides.set(pathname,meta);if(window.location.pathname===pathname)applyMeta(pathname,meta);}
 else overrides.delete(pathname);
}

/** Registers page-specific meta for the current route. Pass null while data is still loading. */
export function usePageMeta(meta:PageMeta|null):void{
 const {pathname}=useLocation();
 const title=meta?.title,description=meta?.description,noindex=meta?.noindex;
 useEffect(()=>{
  if(title===undefined||description===undefined)return;
  setMetaOverride(pathname,{title,description,noindex});
  return()=>setMetaOverride(pathname,null);
 },[pathname,title,description,noindex]);
}

/** Adds a JSON-LD block to the head for as long as the page is mounted. */
export function useJsonLd(id:string,data:object|null):void{
 const json=data?JSON.stringify(data).replace(/</g,"\\u003c"):"";
 useEffect(()=>{
  if(!json)return;
  const script=document.createElement("script");
  script.type="application/ld+json";
  script.id=id;
  script.text=json;
  document.head.appendChild(script);
  return()=>{script.remove();};
 },[id,json]);
}
