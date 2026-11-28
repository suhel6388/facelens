import crypto from "node:crypto";
import type { BillingOverviewDto, InvoiceDto, PaymentDto, SubscriptionDto } from "@app/types";
import type {
  CreatePaymentCheckoutInput,
  UpdateSubscriptionInput,
  VerifyRazorpayPaymentInput,
} from "@app/validation";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error-handler.js";
import type { BillingRepository } from "./billing.repository.js";

const PLAN_LIMITS: Record<string, { monthlySearchLimit: number; priceCents: number }> = {
  FREE: { monthlySearchLimit: 25, priceCents: 0 },
  STARTER: { monthlySearchLimit: 250, priceCents: 2900 },
  PRO: { monthlySearchLimit: 2000, priceCents: 9900 },
  BUSINESS: { monthlySearchLimit: 15000, priceCents: 29900 },
  ENTERPRISE: { monthlySearchLimit: 25000, priceCents: 49900 },
};

export class BillingService {
  constructor(private readonly repo: BillingRepository) {}

  async getOverview(workspaceId: string): Promise<BillingOverviewDto> {
    return this.repo.getOverview(workspaceId);
  }

  async updateSubscription(
    workspaceId: string,
    actorId: string,
    input: UpdateSubscriptionInput,
  ): Promise<SubscriptionDto> {
    const plan = PLAN_LIMITS[input.planCode] ?? PLAN_LIMITS.FREE!;
    return this.repo.upsertSubscription({
      workspaceId,
      planCode: input.planCode,
      monthlySearchLimit: plan.monthlySearchLimit,
      actorId,
    });
  }

  async createCheckout(
    workspaceId: string,
    input: CreatePaymentCheckoutInput,
  ): Promise<{ payment: PaymentDto; checkoutUrl: string; orderId: string }> {
    const plan = PLAN_LIMITS[input.planCode] ?? PLAN_LIMITS.PRO!;
    const externalRef = `order_${crypto.randomBytes(10).toString("hex")}`;
    const payment = await this.repo.createPendingPayment({
      workspaceId,
      amountCents: plan.priceCents,
      currency: input.currency.toUpperCase(),
      externalRef,
    });

    return {
      payment,
      orderId: externalRef,
      checkoutUrl: `https://checkout.razorpay.com/v1/checkout?order_id=${externalRef}`,
    };
  }

  async verifyRazorpayPayment(
    workspaceId: string,
    actorId: string,
    input: VerifyRazorpayPaymentInput,
  ): Promise<{ verified: boolean; subscription: SubscriptionDto }> {
    const expected = crypto
      .createHmac("sha256", env.razorpayKeySecret)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest("hex");

    const sigBuf = Buffer.from(input.razorpay_signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new AppError(
        400,
        "INVALID_PAYMENT_SIGNATURE",
        "Payment signature verification failed.",
      );
    }

    await this.repo.markPaymentSucceeded(input.razorpay_order_id);
    const plan = PLAN_LIMITS[input.planCode] ?? PLAN_LIMITS.PRO!;
    const subscription = await this.repo.upsertSubscription({
      workspaceId,
      planCode: input.planCode,
      monthlySearchLimit: plan.monthlySearchLimit,
      actorId,
    });

    return { verified: true, subscription };
  }

  async handleRazorpayWebhook(params: {
    rawPayload: string;
    signature: string;
    event: string;
    orderId?: string;
  }): Promise<{ processed: boolean }> {
    const expected = crypto
      .createHmac("sha256", env.razorpayWebhookSecret)
      .update(params.rawPayload)
      .digest("hex");

    const sigBuf = Buffer.from(params.signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new AppError(401, "INVALID_WEBHOOK_SIGNATURE", "Invalid Razorpay webhook signature.");
    }

    if (params.event === "payment.captured" && params.orderId) {
      await this.repo.markPaymentSucceeded(params.orderId);
      return { processed: true };
    }

    return { processed: false };
  }

  async listPayments(workspaceId: string): Promise<PaymentDto[]> {
    return this.repo.listPayments(workspaceId);
  }

  async listInvoices(workspaceId: string): Promise<InvoiceDto[]> {
    return this.repo.listInvoices(workspaceId);
  }
}
