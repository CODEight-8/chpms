import Link from "next/link";
import { formatLKR } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface OutstandingEntity {
  id: string;
  name: string;
  outstanding: number;
}

interface OutstandingAlertsProps {
  suppliers: OutstandingEntity[];
  clients: OutstandingEntity[];
}

export function OutstandingAlerts({
  suppliers,
  clients,
}: OutstandingAlertsProps) {
  if (suppliers.length === 0 && clients.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {suppliers.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Outstanding to Suppliers ({suppliers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {suppliers.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-sm"
                >
                  <Link
                    href={`/suppliers/${s.id}`}
                    className="text-orange-700 hover:underline truncate mr-2"
                  >
                    {s.name}
                  </Link>
                  <span className="font-medium text-orange-800 whitespace-nowrap">
                    {formatLKR(s.outstanding)}
                  </span>
                </div>
              ))}
              {suppliers.length > 5 && (
                <p className="text-xs text-orange-600 pt-1">
                  +{suppliers.length - 5} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {clients.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Outstanding from Clients ({clients.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {clients.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-sm"
                >
                  <Link
                    href={`/clients/${c.id}`}
                    className="text-blue-700 hover:underline truncate mr-2"
                  >
                    {c.name}
                  </Link>
                  <span className="font-medium text-blue-800 whitespace-nowrap">
                    {formatLKR(c.outstanding)}
                  </span>
                </div>
              ))}
              {clients.length > 5 && (
                <p className="text-xs text-blue-600 pt-1">
                  +{clients.length - 5} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
