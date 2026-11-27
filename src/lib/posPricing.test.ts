import assert from "node:assert/strict";
import test from "node:test";
import { calculateCartPricing, filterCartLines } from "./posPricing";

test("applies per-item unit discount across multiple units (50 x 3 with 10 off/unit = 120)", () => {
  const result = calculateCartPricing(
    [
      {
        productId: "p1",
        name: "BNC Connector",
        unit: "পিস",
        rate: 50,
        qty: 3,
        unitDiscount: 10,
      },
    ],
    0,
    "per_unit",
  );

  assert.equal(result.grossSubtotal, 150);
  assert.equal(result.totalDiscount, 30);
  assert.equal(result.grandTotal, 120);
  assert.equal(result.lines[0].effectiveUnitRate, 40);
  assert.equal(result.lines[0].netTotal, 120);
});

test("scales per-unit discount automatically when quantity increases", () => {
  const result = calculateCartPricing(
    [
      {
        productId: "p1",
        name: "BNC Connector",
        unit: "পিস",
        rate: 50,
        qty: 4,
        unitDiscount: 10,
      },
    ],
    0,
    "per_unit",
  );

  assert.equal(result.grossSubtotal, 200);
  assert.equal(result.totalDiscount, 40);
  assert.equal(result.grandTotal, 160);
});

test("applies global per-unit discount across all units in the cart (50 x 3 with 10 global/unit = 120)", () => {
  const result = calculateCartPricing(
    [
      {
        productId: "p1",
        name: "Connector",
        unit: "পিস",
        rate: 50,
        qty: 3,
        unitDiscount: 0,
      },
    ],
    10,
    "per_unit",
  );

  assert.equal(result.grossSubtotal, 150);
  assert.equal(result.globalDiscountTotal, 30);
  assert.equal(result.grandTotal, 120);
  assert.equal(result.lines[0].effectiveUnitRate, 40);
});

test("applies global flat discount after per-item unit discounts without going negative", () => {
  const result = calculateCartPricing(
    [
      { productId: "p1", name: "Item A", unit: "পিস", rate: 50, qty: 3, unitDiscount: 10 },
      { productId: "p2", name: "Item B", unit: "পিস", rate: 100, qty: 2, unitDiscount: 0 },
    ],
    20,
    "flat",
  );

  assert.equal(result.grossSubtotal, 350);
  assert.equal(result.itemDiscountTotal, 30);
  assert.equal(result.globalDiscountTotal, 20);
  assert.equal(result.totalDiscount, 50);
  assert.equal(result.grandTotal, 300);
});

test("clamps discount so unit price and grand total never drop below zero", () => {
  const result = calculateCartPricing(
    [{ productId: "p1", name: "Clip", unit: "পিস", rate: 50, qty: 2, unitDiscount: 80 }],
    50,
    "per_unit",
  );

  assert.equal(result.lines[0].effectiveUnitRate, 0);
  assert.equal(result.grandTotal, 0);
  assert.equal(result.totalDiscount, 100);
});

test("filters cart lines by name case-insensitively", () => {
  const lines = [
    { productId: "1", name: "Hikvision 2MP Camera", unit: "পিস" },
    { productId: "2", name: "12V 2A CCTV Power Adapter", unit: "পিস" },
  ];

  assert.equal(filterCartLines(lines, "").length, 2);
  assert.equal(filterCartLines(lines, "adapter").length, 1);
  assert.equal(filterCartLines(lines, "HIKVISION")[0].productId, "1");
  assert.equal(filterCartLines(lines, "router").length, 0);
});
