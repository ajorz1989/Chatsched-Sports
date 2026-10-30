import {Mail} from "lucide-react";
import {Link} from "react-router-dom";
import ContactForm from "../components/ContactForm";
import "../styles-support.css";

export default function ContactPage(){
 return <section className="sx-page">
  <header className="sx-hero">
   <span className="sx-icon"><Mail size={26} aria-hidden="true"/></span>
   <p className="section-kicker">CONTACT</p>
   <h1>Talk to the ChatSched Sport team.</h1>
   <p className="sx-lead">Questions, partnership ideas or something that is not working. We read every message.</p>
  </header>
  <div className="sx-body sx-split">
   <div className="sx-card">
    <ContactForm kinds={[{value:"general",label:"General question"},{value:"support",label:"Help with my account or a listing"},{value:"partnership",label:"Partnership or sponsorship enquiry"}]} messagePlaceholder="Tell us how we can help." success="Thank you. We will reply to the email address you gave. Please check your spam folder in case our reply lands there."/>
   </div>
   <aside className="sx-side">
    <h2>Before you write</h2>
    <ul>
     <li>Quick answers: the <Link to="/help">Help centre</Link>.</li>
     <li>Something unsafe or suspicious: <Link to="/report">report a concern</Link>. Do not wait for a general reply.</li>
     <li>Your personal data: <Link to="/data-request">data request</Link>.</li>
    </ul>
    <p className="sx-small">Please do not include passwords or identity numbers in a message.</p>
   </aside>
  </div>
 </section>;
}
