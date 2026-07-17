import { DEMO_METADATA } from "../data";

export function DemoNotice() {
  return <aside className="platform-demo-notice"><span>DEMO WORKSPACE</span><p>{DEMO_METADATA.datasetName}. No private data is connected and no real-world action is authorized.</p><details><summary>Read limitations</summary><ul>{DEMO_METADATA.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details></aside>;
}
