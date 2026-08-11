import { getCloudflareContext } from "@opennextjs/cloudflare";
import PaymentStep from "@/components/apply/PaymentStep";

export const dynamic = "force-dynamic";

export default async function PaymentPage() {
  const { env } = await getCloudflareContext({ async: true });
  return <PaymentStep tokenizationKey={env.NMI_TOKENIZATION_KEY} />;
}
