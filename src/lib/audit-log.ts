import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "COMPLETE"
  | "FULFILL"
  | "PAYMENT";

type AuditEntityType =
  | "Supplier"
  | "SupplierLot"
  | "ProductionBatch"
  | "Order"
  | "Client"
  | "SupplierPayment"
  | "ClientPayment"
  | "User";

interface AuditUser {
  id: string;
  email: string;
}

interface AuditEventParams {
  user: AuditUser;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  details?: Prisma.InputJsonValue;
}

export function logAuditEvent(params: AuditEventParams): void {
  prisma.auditLog
    .create({
      data: {
        userId: params.user.id,
        userEmail: params.user.email,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details,
      },
    })
    .catch((err) => {
      console.error("Audit log failed:", err);
    });
}
