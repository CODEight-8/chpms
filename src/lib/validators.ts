import { z } from "zod";
import {
  BANK_DETAILS_ACCOUNT_REGEX,
  BANK_DETAILS_NAME_REGEX,
} from "@/lib/bank-details";
import { CLIENT_PAYMENT_TERMS } from "@/lib/client-payment-terms";

export const PHONE_ALLOWED_REGEX = /^\+?[\d\s()-]+$/;

//REUSABLE MOBILE NUMBER VALIDATOR
export const validateMobileNumber = (phone: string): boolean => {
  const trimmed = phone.trim();
  if (!trimmed || !PHONE_ALLOWED_REGEX.test(trimmed)) {
    return false;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
};

export const phoneSchema = z
  .string()
  .max(50, "Phone number too long")
  .refine(
    (phone) => !phone || validateMobileNumber(phone),
    {
      message: "Invalid phone format. Use formats like: +94771234567, 0771234567, or (077) 123-4567",
    }
  )
  .optional();

const noDigitsTextSchema = (fieldName: string) =>
  z
    .string()
    .max(200)
    .refine((value) => !/\d/.test(value), {
      message: `${fieldName} cannot contain numbers`,
    });

const lettersOnlyTextSchema = (fieldName: string) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required`)
    .max(200)
    .refine((value) => /^[A-Za-z ]+$/.test(value), {
      message: `${fieldName} must contain letters only`,
    });

const requiredPhoneSchema = z
  .string()
  .trim()
  .min(1, "Phone is required")
  .max(50, "Phone number too long")
  .refine((phone) => validateMobileNumber(phone), {
    message:
      "Invalid phone format. Use formats like: +94771234567, 0771234567, or (077) 123-4567",
  });

const bankTextFieldSchema = z
  .string()
  .trim()
  .max(200)
  .refine((value) => !value || BANK_DETAILS_NAME_REGEX.test(value), {
    message: "Must contain letters only",
  })
  .optional();

const accountNumberSchema = z
  .string()
  .trim()
  .max(50)
  .refine((value) => !value || BANK_DETAILS_ACCOUNT_REGEX.test(value), {
    message: "Account number must contain numbers only",
  })
  .optional();

export const supplierSchema = z.object({
  name: noDigitsTextSchema("Supplier name").min(1, "Name is required"),
  phone: phoneSchema,
  location: z.string().max(500).optional(),
  contactPerson: noDigitsTextSchema("Contact person").optional(),
  bankName: bankTextFieldSchema,
  branchName: bankTextFieldSchema,
  accountNumber: accountNumberSchema,
}).superRefine((data, ctx) => {
  const bankName = data.bankName?.trim() || "";
  const branchName = data.branchName?.trim() || "";
  const accountNumber = data.accountNumber?.trim() || "";
  const hasAnyStructuredField = !!(bankName || branchName || accountNumber);

  if (!hasAnyStructuredField) {
    return;
  }

  if (!bankName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bank name is required when adding bank details",
      path: ["bankName"],
    });
  }

  if (!branchName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Branch name is required when adding bank details",
      path: ["branchName"],
    });
  }

  if (!accountNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Account number is required when adding bank details",
      path: ["accountNumber"],
    });
  }
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
  qualityScore: z.number().min(0, "Quality score must be 0-100").max(100, "Quality score must be 0-100"),
});

export const clientSchema = z.object({
  name: lettersOnlyTextSchema("Client name"),
  companyName: z.string().trim().min(1, "Company name is required").max(200),
  phone: requiredPhoneSchema,
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Email must be a valid email address")
    .max(200),
  address: z.string().max(500).optional(),
  paymentTerms: z
    .string()
    .min(1, "Payment terms is required")
    .refine(
      (value) =>
        CLIENT_PAYMENT_TERMS.includes(
          value as (typeof CLIENT_PAYMENT_TERMS)[number]
        ),
      { message: "Payment terms is required" }
    ),
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
