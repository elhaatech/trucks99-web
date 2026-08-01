import { redirect } from "next/navigation";

/** Legacy URL used in footer/register — redirect to privacy policy page. */
export default function PrivacyPolicyLegacyPage() {
  redirect("/legal/privacy");
}
