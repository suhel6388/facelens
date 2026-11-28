import { Router } from "express";
import { z } from "zod";
import {
  createPaymentCheckoutSchema,
  updateSubscriptionSchema,
  verifyRazorpayPaymentSchema,
} from "@app/validation";
import {
  requireAuth,
  requireWorkspaceRole,
  type WorkspaceMembershipResolver,
} from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import type { BillingController } from "./billing.controller.js";

const workspaceParams = z.object({ workspaceId: z.string().uuid() });

export function createBillingRouter(
  controller: BillingController,
  resolveMembership: WorkspaceMembershipResolver,
): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

  router.get(
    "/",
    validate({ params: workspaceParams }),
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveMembership),
    controller.getOverview,
  );
  router.put(
    "/subscription",
    validate({ params: workspaceParams, body: updateSubscriptionSchema }),
    requireWorkspaceRole(["OWNER"], resolveMembership),
    controller.updateSubscription,
  );
  router.post(
    "/checkout",
    validate({ params: workspaceParams, body: createPaymentCheckoutSchema }),
    requireWorkspaceRole(["OWNER"], resolveMembership),
    controller.createCheckout,
  );
  router.post(
    "/verify",
    validate({ params: workspaceParams, body: verifyRazorpayPaymentSchema }),
    requireWorkspaceRole(["OWNER"], resolveMembership),
    controller.verifyPayment,
  );
  router.get(
    "/payments",
    validate({ params: workspaceParams }),
    requireWorkspaceRole(["OWNER"], resolveMembership),
    controller.listPayments,
  );
  router.get(
    "/invoices",
    validate({ params: workspaceParams }),
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveMembership),
    controller.listInvoices,
  );

  return router;
}
