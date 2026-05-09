"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

export function PrintLayout({
  children,
  backHref,
}: {
  children: React.ReactNode;
  backHref?: string;
}) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    if (backHref) {
      router.push(backHref);
    }
  };

  return (
    <div>
      <div className="print:hidden mb-4 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={() => window.print()} variant="outline" className="gap-2">
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
