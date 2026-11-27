import type { NextFunction, Request, Response } from "express";
import type { UserRole, WorkspaceRole } from "@app/types";
import { verifyAccessToken } from "../lib/auth-crypto.js";
import { ACCESS_COOKIE_NAME } from "../lib/cookies.js";
import { AppError } from "./error-handler.js";

export interface AuthContext {
  userId: string;
  sessionId: string;
  role: UserRole;
  emailVerified: boolean;
}

export type WorkspaceMembershipResolver = (
  workspaceId: string,
  userId: string,
) => Promise<WorkspaceRole | null>;

function extractAccessToken(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.length > 0) return token;
  }
  const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
  const cookieToken = cookies[ACCESS_COOKIE_NAME];
  return cookieToken && cookieToken.length > 0 ? cookieToken : null;
}

/**
 * Verifies the access token and attaches AuthContext to res.locals.auth.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractAccessToken(req);
  if (!token) {
    next(new AppError(401, "UNAUTHORIZED", "Authentication is required."));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const context: AuthContext = {
      userId: payload.sub,
      sessionId: payload.sid,
      role: payload.role,
      emailVerified: payload.emailVerified,
    };
    res.locals.auth = context;
    next();
  } catch {
    next(new AppError(401, "INVALID_TOKEN", "Session token is invalid or expired."));
  }
}

export function getAuthContext(res: Response): AuthContext {
  const auth = res.locals.auth as AuthContext | undefined;
  if (!auth) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }
  return auth;
}

/**
 * Restricts route access to specific platform-level user roles (e.g. ADMIN).
 */
export function requireRole(allowedRoles: readonly UserRole[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const auth = getAuthContext(res);
    if (!allowedRoles.includes(auth.role)) {
      next(new AppError(403, "FORBIDDEN", "Insufficient permissions for this resource."));
      return;
    }
    next();
  };
}

/**
 * Enforces workspace membership and role-based access control on workspace-scoped routes.
 */
export function requireWorkspaceRole(
  allowedRoles: readonly WorkspaceRole[],
  resolveMembership: WorkspaceMembershipResolver,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const workspaceId =
        req.params.workspaceId ??
        req.header("x-workspace-id") ??
        (typeof req.query.workspaceId === "string" ? req.query.workspaceId : undefined);

      if (!workspaceId) {
        next(new AppError(400, "WORKSPACE_REQUIRED", "Workspace identifier is required."));
        return;
      }

      const role = await resolveMembership(workspaceId, auth.userId);
      if (!role || !allowedRoles.includes(role)) {
        next(new AppError(403, "FORBIDDEN", "You do not have access to this workspace."));
        return;
      }

      res.locals.workspaceRole = role;
      res.locals.workspaceId = workspaceId;
      next();
    } catch (err) {
      next(err);
    }
  };
}
