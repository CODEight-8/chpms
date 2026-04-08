export interface SupplierBankDetailsFields {
  bankName: string;
  branchName: string;
  accountNumber: string;
}

type SupplierBankDetailsInput = {
  bankName?: string | null;
  branchName?: string | null;
  accountNumber?: string | null;
};

export const BANK_DETAILS_NAME_REGEX = /^[A-Za-z ]+$/;
export const BANK_DETAILS_ACCOUNT_REGEX = /^\d+$/;

function normalizeValue(value?: string | null) {
  return value?.trim() ?? "";
}

export function hasStructuredSupplierBankDetails(
  fields: SupplierBankDetailsInput
) {
  const bankName = normalizeValue(fields.bankName);
  const branchName = normalizeValue(fields.branchName);
  const accountNumber = normalizeValue(fields.accountNumber);

  return !!(bankName || branchName || accountNumber);
}

export function formatSupplierBankDetails(
  fields: SupplierBankDetailsInput
) {
  const bankName = normalizeValue(fields.bankName);
  const branchName = normalizeValue(fields.branchName);
  const accountNumber = normalizeValue(fields.accountNumber);

  if (!hasStructuredSupplierBankDetails(fields)) {
    return undefined;
  }

  return [
    `Bank Name: ${bankName}`,
    `Branch Name: ${branchName}`,
    `Account Number: ${accountNumber}`,
  ].join("\n");
}
