import { describe, expect, it } from "vitest";
import { Payment } from "../numbers";
import { value } from "./run";

describe("@Payment near zero interest", () => {
  it("approaches the zero-interest repayment continuously", () => {
    // At this rate the additional interest is below a cent over the entire
    // loan, so the independent zero-rate limit is accurate to 1e-10.
    for (const rate of [1e-14, 1e-10, -1e-14]) {
      expect(Payment.fn({ principal: 1200, rate, periods: 12 })).toBeCloseTo(100, 8);
    }
    expect(value("@Payment(1200, 0.00000000000001, 12)")).toBeCloseTo(100, 8);
  });

  it("repays principal according to an independent period-by-period ledger", () => {
    const principal = 1000;
    const rate = 0.0000001;
    const periods = 360;
    const payment = Payment.fn({ principal, rate, periods });
    let balance = principal;
    for (let period = 0; period < periods; period += 1) balance = balance * (1 + rate / 100) - payment;
    expect(Math.abs(balance)).toBeLessThan(0.000001);
  });

  it("keeps the documented mortgage example and rejects nonpositive periods", () => {
    expect(value("@Round(@Payment(300000, 0.5, 360), 2)")).toBe(1798.65);
    expect(value("@Payment(1000, 1, 0)")).toBeNull();
  });
});
