"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="print:hidden mb-4 flex justify-end">
        <Button
          onClick={() => window.print()}
          variant="outline"
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </Button>
      </div>
      <div className="bg-white rounded-lg shadow-sm print:shadow-none print:rounded-none">
        {children}
      </div>
    </div>
  );
}
