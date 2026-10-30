import { ArrowRight, ArrowUpRight, BriefcaseBusiness, CheckCircle2, Compass, Handshake, ShieldCheck, Sparkles, Trophy, Waypoints } from "lucide-react";
import { Link } from "react-router-dom";
import "../styles-workspace.css";

const services = [
  {icon: Trophy, title: "Career planning", text: "Turn your sporting goals into a clearer next-step plan, from development priorities to opportunity readiness."},
  {icon: Compass, title: "Opportunity support", text: "Get help understanding relevant trials, academies, scouting routes, partnerships and other sporting pathways."},
  {icon: Handshake, title: "Representation pathway", text: "Request a conversation about career management or representation. A request starts a review; it never promises a contract or selection."},
  {icon: BriefcaseBusiness, title: "Commercial direction", text: "Prepare for potential sponsorship and brand conversations around a professional, context-rich athlete profile."},
];

export default function RepresentationPage(){
 return <section className="representation-page">
  <div className="representation-hero">
   <div className="representation-copy">
    <div className="eyebrow"><span className="status-dot"/> REPRESENT · GROW</div>
    <h1>Talent needs more<br/><span>than a listing.</span></h1>
    <p>ChatSched Sport is building the infrastructure around the sporting journey—from discovery to development, connection, career support and long-term growth.</p>
    <div className="hero-actions"><Link className="button button-accent" to="/workspace">Request career support <ArrowRight size={16}/></Link><Link className="button button-light-outline" to="/matching">Explore matching <ArrowUpRight size={16}/></Link></div>
    <div className="hero-proof"><span><ShieldCheck size={16}/> Clear boundaries</span><span><Waypoints size={16}/> Structured pathway</span><span><Sparkles size={16}/> Opportunity-focused</span></div>
   </div>
   <div className="representation-signal"><div className="representation-ring ring-a"/><div className="representation-ring ring-b"/><div className="representation-core"><Trophy size={24}/><strong>SPORT</strong><small>CAREER SUPPORT</small></div><span className="rep-node node-a">PLAN</span><span className="rep-node node-b">CONNECT</span><span className="rep-node node-c">GROW</span></div>
  </div>
  <div className="representation-body section-pad">
   <div className="catalogue-title-row"><div><div className="section-kicker">What support can mean</div><h2>Build the pathway<br/><span>around the athlete.</span></h2></div><p>Support is deliberately separate from verification and opportunity selection. The platform does not promise representation, contracts, sponsorship or selection.</p></div>
   <div className="representation-grid">{services.map(({icon:Icon,title,text})=><article className="representation-card" key={title}><span><Icon size={20}/></span><h3>{title}</h3><p>{text}</p><ArrowUpRight size={16}/></article>)}</div>
   <div className="representation-process"><div><div className="section-kicker">The pathway</div><h2>Request → Review → Clarify → Next step.</h2><p>Career-support requests live inside the member workspace. You choose what you are asking for, provide context and explicitly consent to contact. An authorised reviewer can then record the next step in a private workflow.</p></div><div className="representation-steps">{["Submit your goals","Review your request","Discuss the right service","Agree the next step"].map((step,index)=><div key={step}><span>0{index+1}</span><strong>{step}</strong><CheckCircle2 size={16}/></div>)}</div></div>
   <div className="representation-trust"><ShieldCheck size={20}/><div><strong>A professional boundary matters.</strong><p>Never send money to someone who promises guaranteed selection or representation. A legitimate sports opportunity should be clear about who is offering it, what is required and what happens next.</p></div><Link className="button button-dark" to="/safeguarding">Read trust principles <ArrowUpRight size={16}/></Link></div>
  </div>
 </section>;
}
