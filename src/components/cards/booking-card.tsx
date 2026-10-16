import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { formatCurrency, formatDate } from "@/src/lib/format";

export function BookingCard({
  title,
  destination,
  date,
  status,
  amount,
  currency = "ZAR",
}: {
  title: string;
  destination: string;
  date: Date | string;
  status: string;
  amount: number | string;
  currency?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant={status.toLowerCase() === "confirmed" ? "success" : "secondary"}>{status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2"><MapPin aria-hidden="true" size={15} />{destination}</p>
        <p className="flex items-center gap-2"><CalendarDays aria-hidden="true" size={15} />{formatDate(date)}</p>
        <p className="border-t border-border pt-3 text-foreground"><span className="font-semibold">{formatCurrency(amount, currency)}</span></p>
      </CardContent>
    </Card>
  );
}
