import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  phone: z.string().max(50).optional(),
  location: z.string().max(500).optional(),
  contactPerson: z.string().max(200).optional(),
  bankDetails: z.string().max(1000).optional(),
});

export const supplierLotSchema = z.object({
  supplierId: z.string().uuid("Invalid supplier"),
  harvestDate: z.string().min(1, "Harvest date is required"),
  dateReceived: z.string().min(1, "Received date is required"),
  huskCount: z.number().int().positive("Husk count must be positive").max(1000000),
  perHuskRate: z.number().positive("Rate must be positive").max(100000),
  qualityGrade: z.enum(["A", "B", "C", "REJECT"]).optional(),
  notes: z.string().max(2000).optional(),
});

export const supplierLotUpdateSchema = z.object({
  qualityGrade: z.enum(["A", "B", "C", "REJECT"]).optional(),
  notes: z.string().max(2000).optional(),
});

export const productionBatchSchema = z.object({
  productId: z.string().uuid("Invalid product"),
  chipSize: z.string().min(1, "Chip size is required").max(50),
  lots: z
    .array(
      z.object({
        lotId: z.string().uuid(),
        quantityUsed: z.number().int().positive().max(1000000),
      })
    )
    .min(1, "At least one lot is required")
    .max(100),
  notes: z.string().max(2000).optional(),
  remarks: z.string().max(2000).optional(),
});

export const completeBatchSchema = z.object({
  outputQuantity: z.number().positive("Output quantity must be positive").max(1000000),
  outputUnit: z.string().min(1, "Output unit is required").max(50),
  qualityScore: z.number().min(0, "Quality score must be 0-100").max(100, "Quality score must be 0-100"),
});

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  companyName: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(200).optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  paymentTerms: z.string().max(500).optional(),
});

export const orderSchema = z.object({
  clientId: z.string().uuid("Invalid client"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDelivery: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        chipSize: z.string().min(1, "Chip size is required").max(50),
        quantityOrdered: z.number().positive(),
        unitPrice: z.number().positive(),
      })
    )
    .min(1, "At least one item is required"),
  notes: z.string().max(2000).optional(),
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
  amount: z.number().positive("Amount must be positive").max(100000000),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["CASH", "BANK", "CHEQUE"]),
  reference: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
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
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").max(200),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  role: z.enum(["OWNER", "MANAGER", "PRODUCTION"]),
});
