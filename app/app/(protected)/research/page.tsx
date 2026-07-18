import { DemoNotice } from "@/src/platform/components/DemoNotice";
import { PrivateResearchConsole } from "@/src/platform/components/PrivateResearchConsole";

export default function ResearchPage() {
  return <><DemoNotice /><header className="platform-page-heading"><div><p>RESEARCH LAB · PRIVATE SERVICE</p><h1>Retrieve traceable context through an authorized server-side boundary.</h1></div><p>Only authenticated workspace users can request research. Results preserve source provenance and remain subject to human verification.</p></header><PrivateResearchConsole /></>;
}
