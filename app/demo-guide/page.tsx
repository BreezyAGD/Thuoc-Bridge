import { demoWalkthrough } from "@/lib/demo-walkthrough";
import { DemoGuide } from "./DemoGuide";

export default function DemoGuidePage() {
  return <DemoGuide steps={demoWalkthrough} />;
}
