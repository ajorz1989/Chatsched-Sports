export function CardSkeletons({count=6}:{count?:number}){
 return <div className="opportunity-grid" aria-busy="true" aria-label="Loading"><span className="sr-only" role="status">Loading…</span>{Array.from({length:count}).map((_,i)=><div className="skeleton-card" key={i} aria-hidden="true"><i className="sk sk-pill"/><i className="sk sk-line sk-short"/><i className="sk sk-title"/><i className="sk sk-line"/><i className="sk sk-line"/><i className="sk sk-line sk-short"/></div>)}</div>;
}
