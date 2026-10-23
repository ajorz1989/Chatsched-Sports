export default function ProgressRing({value,size=84,label}:{value:number;size?:number;label?:string}){
 const stroke=8;const r=(size-stroke)/2;const c=2*Math.PI*r;const pct=Math.max(0,Math.min(100,value));
 return <div className="progress-ring" style={{width:size,height:size}} role="img" aria-label={(label??"Progress")+": "+pct+"%"}><svg width={size} height={size} viewBox={"0 0 "+size+" "+size} aria-hidden="true"><circle className="progress-ring-bg" cx={size/2} cy={size/2} r={r} strokeWidth={stroke} fill="none"/><circle className="progress-ring-fg" cx={size/2} cy={size/2} r={r} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c-(pct/100)*c} transform={"rotate(-90 "+size/2+" "+size/2+")"}/></svg><strong>{pct}%</strong></div>;
}
