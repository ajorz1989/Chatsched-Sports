import {CheckCircle2,CircleDashed,CircleHelp,TrendingUp} from "lucide-react";
import {strengthLabels} from "../lib/matching";
import type {MatchStrength} from "../lib/types";

const icons={strong:CheckCircle2,good:TrendingUp,partial:CircleDashed,incomplete:CircleHelp} as const;

/** Match strength is always conveyed by icon + text, never colour alone. */
export default function MatchStrengthBadge({strength}:{strength:MatchStrength}){
 const Icon=icons[strength];
 return <span className={"match-strength-badge match-strength-badge-"+strength}><Icon size={16} aria-hidden="true"/>{strengthLabels[strength]}</span>;
}
