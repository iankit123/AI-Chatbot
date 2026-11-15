import { QUESTION_PACK, QUESTION_PACK_PRODUCT } from "@shared/questionPack";
import type { AstroReport } from "@/lib/astroApi";
import { runRazorpayCheckout } from "@/lib/razorpay";
import { getDeviceId } from "@/lib/supabase";

/** Opens Razorpay for 10 more answers on this report. Resolves once the payment is verified. */
export async function buyQuestionPack(report: AstroReport["type"], reportId: string): Promise<void> {
  await runRazorpayCheckout({
    amountRupees: QUESTION_PACK.rupees,
    billing: {
      device_id: getDeviceId(),
      phone_number: "",
      product_type: QUESTION_PACK_PRODUCT,
      companion_id: null,
      rate_note: `${QUESTION_PACK.questions} sawal`,
      metadata: { astro_report_id: reportId, source: QUESTION_PACK_PRODUCT, report },
    },
  });
}
