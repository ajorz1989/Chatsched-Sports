import {ArrowUpRight,ShieldCheck} from "lucide-react";
import {Link} from "react-router-dom";
import VerificationBadge,{type VerificationLevel} from "../components/VerificationBadge";
import "../styles-support.css";

const levels:{level:VerificationLevel;meaning:string;status:string}[]=[
 {level:"unverified",meaning:"Nobody at ChatSched Sport has reviewed this yet. Treat claims as the member's own statement.",status:"In use"},
 {level:"pending",meaning:"Evidence has been submitted and is waiting for review.",status:"In use"},
 {level:"verified",meaning:"An administrator reviewed the submitted evidence and approved it.",status:"In use"},
 {level:"professional",meaning:"Reserved for verified professionals or registered bodies, once we can confirm registration with the relevant body.",status:"Not awarded yet"},
 {level:"official",meaning:"Reserved for confirmed official affiliation with a club, league or federation. We never imply this without confirmation.",status:"Not awarded yet"},
 {level:"example",meaning:"A sample shown to illustrate the product. It is not a real opportunity.",status:"Labelled clearly"}
];

export default function VerificationPage(){
 return <section className="sx-page">
  <header className="sx-hero">
   <span className="sx-icon"><ShieldCheck size={24} aria-hidden="true"/></span>
   <p className="section-kicker">TRUST AND VERIFICATION</p>
   <h1>What verified means, and what it does not.</h1>
   <p className="sx-lead">Verification is how we help athletes tell real opportunities from risky ones. It is a review step, not a guarantee.</p>
  </header>
  <div className="sx-body">
   <h2>The levels</h2>
   <div className="sx-table-wrap"><table className="sx-table"><thead><tr><th>Level</th><th>What it means</th><th>Today</th></tr></thead><tbody>
    {levels.map(item=><tr key={item.level}><th scope="row"><VerificationBadge level={item.level}/></th><td>{item.meaning}</td><td>{item.status}</td></tr>)}
   </tbody></table></div>

   <div className="sx-grid">
    <article className="sx-card"><h3>Organisations</h3><p>Clubs, academies, scouts, coaches, brands and events start as pending. They submit evidence from their workspace, and an administrator approves or rejects it with a recorded decision. A listing appears publicly only when both the organisation and the listing are verified.</p></article>
    <article className="sx-card"><h3>Athlete records</h3><p>Statistics and achievements start as self-reported. Members can submit supporting evidence for review. Only an administrator can mark a record verified, and editing a verified record sends it back to self-reported.</p></article>
    <article className="sx-card"><h3>References and endorsements</h3><p>A coach, club or referee writes their own statement. The athlete cannot approve their own. The athlete decides whether to show it.</p></article>
   </div>

   <h2>What verification does not mean</h2>
   <ul className="sx-list">
    <li>It is not a promise of selection, a contract, a scholarship or a sponsorship.</li>
    <li>It does not cover what happens off the platform, so check details with the organisation yourself.</li>
    <li>It does not mean official affiliation unless the badge says Official.</li>
    <li>It is not a quality ranking of athletes or clubs.</li>
   </ul>

   <h2>How to get verified</h2>
   <ol className="sx-list sx-steps">
    <li>Create your account and complete your profile or organisation details.</li>
    <li>Open your workspace and submit a verification request with evidence, such as a registration, an official website or a confirmation from a governing body.</li>
    <li>We review it and record the decision. You are notified of the outcome.</li>
   </ol>
   <div className="sx-actions"><Link className="button button-dark" to="/workspace">Open my workspace <ArrowUpRight size={16}/></Link><Link className="button button-light-outline-dark" to="/report">Report a false claim</Link></div>
  </div>
 </section>;
}
