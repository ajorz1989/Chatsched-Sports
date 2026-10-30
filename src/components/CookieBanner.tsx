import {Cookie} from "lucide-react";
import {Link} from "react-router-dom";
import {setConsent,useConsent} from "../lib/consent";

export default function CookieBanner(){
 const consent=useConsent();
 if(consent)return null;
 return <div className="sx-cookie" role="region" aria-label="Cookie and storage choices">
  <Cookie size={20} aria-hidden="true"/>
  <p><strong>Your choice on optional analytics.</strong> We use essential storage to keep you signed in. Optional analytics only run if you allow them. <Link to="/cookies">Cookie settings</Link></p>
  <div className="sx-cookie-actions">
   <button type="button" className="button button-light-outline-dark button-small" onClick={()=>setConsent(false)}>Essential only</button>
   <button type="button" className="button button-dark button-small" onClick={()=>setConsent(true)}>Allow analytics</button>
  </div>
 </div>;
}
