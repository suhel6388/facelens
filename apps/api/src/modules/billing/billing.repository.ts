import { prisma } from "@app/database";
import type {
  BillingOverviewDto,
  InvoiceDto,
  PaymentDto,
  PaymentStatus,
  SubscriptionDto,
  SubscriptionStatus,
} from "@app/types";

export interface BillingRepository {
  getOverview(workspaceId: string): Promise<BillingOverviewDto>;
  upsertSubscription(params: {
    workspaceId: string;
    planCode: string;
    monthlySearchLimit: number;
    actorId: string;
  }): Promise<SubscriptionDto>;
  createPendingPayment(params: {
    workspaceId: string;
    amountCents: number;
    currency: string;
    externalRef: string;
  }): Promise<PaymentDto>;
  markPaymentSucceeded(externalRef: string): Promise<PaymentDto | null>;
  listPayments(workspaceId: string): Promise<PaymentDto[]>;
  listInvoices(workspaceId: string): Promise<InvoiceDto[]>;
}

function toSubscriptionDto(row: {
  id: string;
  workspaceId: string;
  planCode: string;
  status: SubscriptionStatus;
  monthlySearchLimit: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
}): SubscriptionDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    planCode: row.planCode,
    status: row.status,
    monthlySearchLimit: row.monthlySearchLimit,
    currentPeriodStart: row.currentPeriodStart.toISOString(),
    currentPeriodEnd: row.currentPeriodEnd.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function toPaymentDto(row: {
  id: string;
  workspaceId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  externalRef: string | null;
  createdAt: Date;
}): PaymentDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    amountCents: row.amountCents,
    currency: row.currency,
    status: row.status,
    externalRef: row.externalRef,
    createdAt: row.createdAt.toISOString(),
  };
}

export class PrismaBillingRepository implements BillingRepository {
  async getOverview(workspaceId: string): Promise<BillingOverviewDto> {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [sub, searchesUsed, payments] = await Promise.all([
      prisma.subscription.findFirst({
        where: { workspaceId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.search.count({
        where: { workspaceId, createdAt: { gte: startOfMonth }, deletedAt: null },
      }),
      prisma.payment.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return {
      subscription: sub ? toSubscriptionDto(sub) : null,
      monthlySearchesUsed: searchesUsed,
      recentPayments: payments.map(toPaymentDto),
    };
  }

  async upsertSubscription(params: {
    workspaceId: string;
    planCode: string;
    monthlySearchLimit: number;
    actorId: string;
  }): Promise<SubscriptionDto> {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const sub = await prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { workspaceId: params.workspaceId, status: "ACTIVE" },
        data: { status: "CANCELLED" },
      });
      const created = await tx.subscription.create({
        data: {
          workspaceId: params.workspaceId,
          planCode: params.planCode,
          status: "ACTIVE",
          monthlySearchLimit: params.monthlySearchLimit,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          actorId: params.actorId,
          action: "SUBSCRIPTION_UPDATED",
          resourceType: "Subscription",
          resourceId: created.id,
          metadataJson: { planCode: params.planCode },
        },
      });
      return created;
    });

    return toSubscriptionDto(sub);
  }

  async createPendingPayment(params: {
    workspaceId: string;
    amountCents: number;
    currency: string;
    externalRef: string;
  }): Promise<PaymentDto> {
    const row = await prisma.payment.create({
      data: {
        workspaceId: params.workspaceId,
        amountCents: params.amountCents,
        currency: params.currency,
        status: "PENDING",
        externalRef: params.externalRef,
      },
    });
    return toPaymentDto(row);
  }

  async markPaymentSucceeded(externalRef: string): Promise<PaymentDto | null> {
    const existing = await prisma.payment.findUnique({ where: { externalRef } });
    if (!existing) return null;
    const updated = await prisma.payment.update({
      where: { id: existing.id },
      data: { status: "SUCCEEDED" },
    });
    return toPaymentDto(updated);
  }

  async listPayments(workspaceId: string): Promise<PaymentDto[]> {
    const rows = await prisma.payment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map(toPaymentDto);
  }

  async listInvoices(workspaceId: string): Promise<InvoiceDto[]> {
    const payments = await this.listPayments(workspaceId);
    return payments.map((p, idx) => ({
      id: p.id,
      workspaceId: p.workspaceId,
      invoiceNumber: `INV-${p.createdAt.slice(0, 10).replace(/-/g, "")}-${String(idx + 1).padStart(3, "0")}`,
      amountCents: p.amountCents,
      currency: p.currency,
      status: p.status,
      externalRef: p.externalRef,
      issuedAt: p.createdAt,
    }));
  }
}
