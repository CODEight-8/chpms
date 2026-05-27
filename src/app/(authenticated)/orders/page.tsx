import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessModule, hasPermission } from "@/lib/permissions";
import { UserRole, OrderStatus } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import { getOrdersWithDetails, getOrderStatusCounts } from "@/lib/queries/orders";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { Pagination } from "@/components/shared/pagination";
import { parsePagination } from "@/lib/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { OrderStatusTabs } from "@/components/orders/order-status-tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/shared/search-input";
import { Plus, ShoppingCart, CheckCircle, Truck, AlertTriangle } from "lucide-react";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canCreate = hasPermission(role, "orders", "create");
  const canViewClients = canAccessModule(role, "clients");

  const statusFilter = pickString(searchParams.status) as
    | OrderStatus
    | undefined;
  const search = pickString(searchParams.search);
  const pg = parsePagination(searchParams);
  const [ordersResult, counts] = await Promise.all([
    getOrdersWithDetails(
      { status: statusFilter, search },
      { skip: pg.skip, take: pg.take }
    ),
    getOrderStatusCounts(),
  ]);
  const { rows: orders, total } = ordersResult;

  return (
    <div className="pt-6">
      <PageHeader
        title="Orders"
        description="Client orders and fulfillment tracking"
        action={
          canCreate ? (
            <Link href="/orders/new">
              <Button className="bg-emerald-700 hover:bg-emerald-800 gap-2">
                <Plus className="h-4 w-4" />
                New Order
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 mb-6">
        <SummaryCard
          title="Confirmed"
          value={counts.CONFIRMED || 0}
          icon={CheckCircle}
        />
        <SummaryCard
          title="Fulfilled"
          value={counts.FULFILLED || 0}
          icon={ShoppingCart}
        />
        <SummaryCard title="Dispatched" value={counts.DISPATCHED || 0} icon={Truck} />
        <SummaryCard title="Cancelled" value={counts.CANCELLED || 0} icon={AlertTriangle} />
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <OrderStatusTabs counts={counts} />
        <SearchInput placeholder="Search by order #, client name..." />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No orders found"
          description={
            search
              ? "Try a different search term"
              : statusFilter
                ? `No ${statusFilter.toLowerCase()} orders found`
                : "Create your first order to start tracking"
          }
          action={
            canCreate ? (
              <Link href="/orders/new">
                <Button className="bg-emerald-700 hover:bg-emerald-800">
                  New Order
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border bg-white">
          <Pagination
            total={total}
            page={pg.page}
            perPage={pg.perPage}
            pageParam={pg.pageParam}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-mono font-medium text-emerald-700 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {canViewClients ? (
                      <Link
                        href={`/clients/${order.client.id}`}
                        className="text-gray-700 hover:underline"
                      >
                        {order.client.name}
                      </Link>
                    ) : (
                      <span className="text-gray-700">{order.client.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {new Date(order.orderDate).toLocaleDateString("en-LK")}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {order.expectedDelivery
                      ? new Date(order.expectedDelivery).toLocaleDateString("en-LK")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-center">{order.itemCount}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatLKR(order.totalValue)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        order.status === "CONFIRMED" &&
                        order.items.some((i) => Number(i.quantityFulfilled) > 0)
                          ? "PARTIALLY_FULFILLED"
                          : order.status
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            total={total}
            page={pg.page}
            perPage={pg.perPage}
            pageParam={pg.pageParam}
          />
        </div>
      )}
    </div>
  );
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
