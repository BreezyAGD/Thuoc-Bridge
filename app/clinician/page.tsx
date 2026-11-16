import { redirect } from "next/navigation";

/** The patient and clinician views merged into one clinician workspace at "/". */
export default function Moved() {
  redirect("/");
}
