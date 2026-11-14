import {useState} from "react";
import SportIcon from "./SportIcon";
/** Only plain https images are rendered; anything else falls back to the branded placeholder. */
export function safeImageUrl(value?:string|null){if(!value)return null;try{const url=new URL(value);return url.protocol==="https:"?url.toString():null;}catch{return null;}}
export default function CoverImage({src,sport,variant="card",label}:{src?:string|null;sport?:string|null;variant?:"card"|"hero";label?:string}){
 const url=safeImageUrl(src);const [failed,setFailed]=useState(false);
 if(url&&!failed)return <div className={"cover-image cover-"+variant}><img src={url} alt={label??""} loading={variant==="hero"?"eager":"lazy"} decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/></div>;
 if(variant==="hero")return null;
 const slug=(sport??"other").trim().toLowerCase().replace(/[^a-z]+/g,"-")||"other";
 return <div className={"cover-image cover-card cover-placeholder cover-sport-"+slug} aria-hidden="true"><span className="cover-watermark"><SportIcon sport={sport} size={170}/></span><span className="cover-badge"><SportIcon sport={sport} size={32}/></span></div>;
}
