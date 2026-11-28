import type { NextFunction, Request, Response } from "express";
import type {
  CreatePaymentCheckoutInput,
  UpdateSubscriptionInput,
  VerifyRazorpayPaymentInput,
} from "@app/validation";
import { sendSuccess } from "../../lib/http.js";
import { getAuthContext } from "../../middleware/auth.js";
import type { BillingService } from "./billing.service.js";

export class BillingController {
  constructor(private readonly service: BillingService) {}

  getOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const overview = await this.service.getOverview(req.params.workspaceId!);
      sendSuccess(res, 200, overview);
    } catch (err) {
      next(err);
    }
  };

  updateSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const sub = await this.service.updateSubscription(
        req.params.workspaceId!,
        auth.userId,
        req.body as UpdateSubscriptionInput,
      );
      sendSuccess(res, 200, sub);
    } catch (err) {
      next(err);
    }
  };

  createCheckout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const checkout = await this.service.createCheckout(
        req.params.workspaceId!,
        req.body as CreatePaymentCheckoutInput,
      );
      sendSuccess(res, 201, checkout);
    } catch (err) {
      next(err);
    }
  };

  verifyPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const result = await this.service.verifyRazorpayPayment(
        req.params.workspaceId!,
        auth.userId,
        req.body as VerifyRazorpayPaymentInput,
      );
      sendSuccess(res, 200, result);
    } catch (err) {
      next(err);
    }
  };

  handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const signature = req.header("x-razorpay-signature") ?? "";
      const body = (req.body ?? {}) as {
        event?: string;
        payload?: { payment?: { entity?: { order_id?: string } } };
      };
      const result = await this.service.handleRazorpayWebhook({
        rawPayload: JSON.stringify(body),
        signature,
        event: body.event ?? "",
        orderId: body.payload?.payment?.entity?.order_id,
      });
      sendSuccess(res, 200, result);
    } catch (err) {
      next(err);
    }
  };

  listPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payments = await this.service.listPayments(req.params.workspaceId!);
      sendSuccess(res, 200, payments);
    } catch (err) {
      next(err);
    }
  };

  listInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoices = await this.service.listInvoices(req.params.workspaceId!);
      sendSuccess(res, 200, invoices);
    } catch (err) {
      next(err);
    }
  };
}
