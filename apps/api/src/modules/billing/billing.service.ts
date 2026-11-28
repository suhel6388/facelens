import crypto from "node:crypto";
import type { BillingOverviewDto, PaymentDto, SubscriptionDto } from "@app/types";
import type { CreatePaymentCheckoutInput, UpdateSubscriptionInput } from "@app/validation";
import type { BillingRepository } from "./billing.repository.js";

const PLAN_LIMITS: Record<string, { monthlySearchLimit: number; priceCents: number }> = {
  FREE: { monthlySearchLimit: 25, priceCents: 0 },
  STARTER: { monthlySearchLimit: 250, priceCents: 2900 },
  PRO: { monthlySearchLimit: 2000, priceCents: 9900 },
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
  ): Promise<{ payment: PaymentDto; checkoutUrl: string }> {
    const plan = PLAN_LIMITS[input.planCode] ?? PLAN_LIMITS.STARTER!;
    const externalRef = `chk_${crypto.randomBytes(12).toString("hex")}`;
    const payment = await this.repo.createPendingPayment({
      workspaceId,
      amountCents: plan.priceCents,
      currency: input.currency.toUpperCase(),
      externalRef,
    });

    return {
      payment,
      checkoutUrl: `https://billing.facelens.local/checkout/${externalRef}`,
    };
  }

  async listPayments(workspaceId: string): Promise<PaymentDto[]> {
    return this.repo.listPayments(workspaceId);
  }
}
