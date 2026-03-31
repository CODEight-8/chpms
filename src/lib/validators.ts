import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  location: z.string().optional(),
  contactPerson: z.string().optional(),
  bankDetails: z.string().optional(),
});

export const supplierLotSchema = z.object({
  supplierId: z.string().uuid("Invalid supplier"),
  harvestDate: z.string().min(1, "Harvest date is required"),
  dateReceived: z.string().min(1, "Received date is required"),
  huskCount: z.number().int().positive("Husk count must be positive"),
  perHuskRate: z.number().positive("Rate must be positive"),
  qualityGrade: z.enum(["A", "B", "C", "REJECT"]).optional(),
  notes: z.string().optional(),
});

export const productionBatchSchema = z.object({
  productId: z.string().uuid("Invalid product"),
  lots: z
    .array(
      z.object({
        lotId: z.string().uuid(),
        quantityUsed: z.number().int().positive(),
      })
    )
    .min(1, "At least one lot is required"),
  notes: z.string().optional(),
});

export const completeBatchSchema = z.object({
  outputQuantity: z.number().positive("Output quantity must be positive"),
  outputUnit: z.string().min(1, "Output unit is required"),
});

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
});

export const orderSchema = z.object({
  clientId: z.string().uuid("Invalid client"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDelivery: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantityOrdered: z.number().positive(),
        unitPrice: z.number().positive(),
      })
    )
    .min(1, "At least one item is required"),
  notes: z.string().optional(),
});

export const fulfillmentSchema = z.object({
  fulfillments: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        productionBatchId: z.string().uuid(),
        quantityFulfilled: z.number().positive(),
      })
    )
    .min(1, "At least one fulfillment is required"),
});

export const paymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["CASH", "BANK", "CHEQUE"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const supplierPaymentSchema = paymentSchema.extend({
  supplierId: z.string().uuid("Invalid supplier"),
  supplierLotId: z.string().uuid().optional(),
});

export const clientPaymentSchema = paymentSchema.extend({
  clientId: z.string().uuid("Invalid client"),
  orderId: z.string().uuid().optional(),
});

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["OWNER", "MANAGER", "PRODUCTION"]),
});
