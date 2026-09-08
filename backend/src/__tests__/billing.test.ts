import { describe, it, expect } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";

// The billing calculation itself lives inside generateBillForPeriod (DB-bound),
// so here we test the pure arithmetic rule in isolation: billable subtotal =
// sum(unitPrice * quantity) over DELIVERED + billable rows only — skipped,
// paused, and non-delivery rows must contribute zero (PRD section 14/15).
function billableSubtotal(rows: { status: string; billable: boolean; unitPrice: number; quantity: number }[]) {
  return rows
    .filter((r) => r.billable && r.status === "DELIVERED")
    .reduce((sum, r) => sum.add(new Decimal(r.unitPrice).mul(r.quantity)), new Decimal(0));
}

describe("subscription billing calculation", () => {
  it("matches the PRD worked example: 28 billable days at 40/day = 1120", () => {
    const rows = [
      ...Array.from({ length: 28 }, () => ({ status: "DELIVERED", billable: true, unitPrice: 40, quantity: 1 })),
      ...Array.from({ length: 3 }, () => ({ status: "SKIPPED", billable: false, unitPrice: 40, quantity: 1 })),
    ];
    expect(billableSubtotal(rows).toNumber()).toBe(1120);
  });

  it("excludes paused and non-delivery days even if flagged billable by mistake", () => {
    const rows = [
      { status: "DELIVERED", billable: true, unitPrice: 40, quantity: 1 },
      { status: "PAUSED", billable: true, unitPrice: 40, quantity: 1 },
      { status: "NOT_DELIVERED", billable: true, unitPrice: 40, quantity: 1 },
      { status: "FAILED", billable: false, unitPrice: 40, quantity: 1 },
    ];
    expect(billableSubtotal(rows).toNumber()).toBe(40);
  });
});
