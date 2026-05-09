import { LotStatus, BatchStatus, OrderStatus } from "@prisma/client";

const LOT_TRANSITIONS: Record<LotStatus, LotStatus[]> = {
  AUDIT: [LotStatus.APPROVED, LotStatus.REJECTED],
  APPROVED: [LotStatus.GOOD_TO_GO, LotStatus.REJECTED],
  GOOD_TO_GO: [LotStatus.ALLOCATED],
  ALLOCATED: [LotStatus.CONSUMED, LotStatus.GOOD_TO_GO],
  CONSUMED: [],
  REJECTED: [],
};

const BATCH_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  IN_PROGRESS: [BatchStatus.COMPLETED],
  COMPLETED: [BatchStatus.DISPATCHED],
  DISPATCHED: [],
};

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CONFIRMED: [OrderStatus.FULFILLED, OrderStatus.CANCELLED],
  FULFILLED: [OrderStatus.DISPATCHED, OrderStatus.CANCELLED],
  DISPATCHED: [],
  CANCELLED: [],
};

export function canTransitionLot(
  from: LotStatus,
  to: LotStatus
): boolean {
  return LOT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionBatch(
  from: BatchStatus,
  to: BatchStatus
): boolean {
  return BATCH_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidLotTransitions(status: LotStatus): LotStatus[] {
  return LOT_TRANSITIONS[status] ?? [];
}

export function getValidBatchTransitions(status: BatchStatus): BatchStatus[] {
  return BATCH_TRANSITIONS[status] ?? [];
}

export function getValidOrderTransitions(status: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS[status] ?? [];
}
