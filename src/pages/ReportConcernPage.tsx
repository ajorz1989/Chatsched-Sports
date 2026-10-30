import {AlertTriangle,Phone} from "lucide-react";
import {Link} from "react-router-dom";
import ContactForm from "../components/ContactForm";
import "../styles-support.css";

export default function ReportConcernPage(){
 return <section className="sx-page">
  <header className="sx-hero">
   <span className="sx-icon sx-icon-alert"><AlertTriangle size={26} aria-hidden="true"/></span>
   <p className="section-kicker">REPORT A CONCERN</p>
   <h1>Tell us about something that does not feel right.</h1>
   <p className="sx-lead">Fake listings, requests for money, impersonation, harassment, privacy problems or a safeguarding worry. Reports go privately to our moderators.</p>
  </header>
  <div className="sx-body">
   <aside className="sx-emergency" role="note" aria-labelledby="emergency-title">
    <Phone size={20} aria-hidden="true"/>
    <div>
     <h2 id="emergency-title">If someone is in immediate danger, call the police first.</h2>
     <p>This form is not an emergency service and is not watched in real time.</p>
     <ul>
      <li><strong>Police (SAPS):</strong> 10111 · Crime Stop 08600 10111</li>
      <li><strong>Childline (child abuse):</strong> 116</li>
      <li><strong>Gender-based violence command centre (24 hours):</strong> 0800 428 428</li>
     </ul>
    </div>
   </aside>

   <div className="sx-split">
    <div className="sx-card">
     <h2>Send a report</h2>
     <ContactForm
      kinds={[
       {value:"concern",label:"Fake listing, scam, impersonation or misuse"},
       {value:"safeguarding",label:"Safeguarding concern (a child or vulnerable person)"}
      ]}
      subjectPrefix="Report"
      showUrl
      urlLabel="Link to the listing, profile or page (optional)"
      messageLabel="What happened?"
      messagePlaceholder="Describe what you saw, when, and who was involved. Please do not include passwords, ID numbers or bank details."
      submitLabel="Send report"
      success="Your report has been received and marked for review. Safeguarding reports are placed at the top of the queue. Do not send money or documents to the person you reported."
     />
    </div>
    <aside className="sx-side">
     <h2>Good to know</h2>
     <ul>
      <li>Reporting from a listing or profile page (signed in) links the report to that item.</li>
      <li>We may contact you for more detail at the email address you provide.</li>
      <li>Reports are not published. Please report in good faith.</li>
      <li>Never pay anyone for guaranteed selection or a guaranteed contract.</li>
      <li>See <Link to="/safeguarding">trust and safeguarding</Link> and <Link to="/verification">how verification works</Link>.</li>
     </ul>
    </aside>
   </div>
  </div>
 </section>;
}
