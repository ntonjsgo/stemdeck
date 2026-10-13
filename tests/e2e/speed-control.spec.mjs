// Speed is a stepped fader and a box to type into.
//
// Both take any hundredth from 0.50x to 1.00x (#701). The fader is notched
// every 0.05x, and the wheel over it jumps notch to notch.

import { test, expect } from "@playwright/test";
import { openStudio } from "./helpers.mjs";

const slider = (page) => page.locator("#t-speed-slider");
const box = (page) => page.locator("#t-speed-input");
const rate = (page) => page.evaluate(async () => (await import("/js/state.js")).playbackSpeed);

test("a track opens at normal speed", async ({ page }) => {
  await openStudio(page);
  await expect(box(page)).toHaveValue("1.00");
  await expect(slider(page)).toHaveValue("1");
  await expect.poll(() => rate(page)).toBe(1);
});

test("the fader moves a hundredth at a time and the box follows", async ({ page }) => {
  await openStudio(page);
  await slider(page).focus();
  for (let i = 0; i < 17; i++) await page.keyboard.press("ArrowLeft");
  await expect(box(page)).toHaveValue("0.83");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "0.83x");
  await expect.poll(() => rate(page)).toBe(0.83);

  // The wheel over it goes to the next notch, not 0.05x past where it was.
  await slider(page).hover();
  await page.mouse.wheel(0, -100);
  await expect(box(page)).toHaveValue("0.85");
  await page.mouse.wheel(0, 100);
  await page.mouse.wheel(0, 100);
  await expect(box(page)).toHaveValue("0.75");
  await expect.poll(() => rate(page)).toBe(0.75);

  // It stops at the ends.
  for (let i = 0; i < 30; i++) await page.keyboard.press("ArrowLeft");
  await expect(box(page)).toHaveValue("0.50");
  await expect.poll(() => rate(page)).toBe(0.5);

  // A double-click is back to normal.
  await slider(page).dblclick();
  await expect(box(page)).toHaveValue("1.00");
  await expect.poll(() => rate(page)).toBe(1);
});

test("typing a speed plays at exactly that speed", async ({ page }) => {
  await openStudio(page);
  await box(page).fill("0.83");
  await box(page).press("Enter");
  await expect.poll(() => rate(page)).toBe(0.83);
  await expect(box(page)).toHaveValue("0.83");
  await expect(slider(page)).toHaveValue("0.83");

  // A comma, a trailing x, or a percentage all read the same way.
  for (const [typed, want] of [["0,6", 0.6], ["0.7x", 0.7], ["90%", 0.9]]) {
    await box(page).fill(typed);
    await box(page).press("Enter");
    await expect.poll(() => rate(page)).toBe(want);
  }
});

test("out-of-range speeds are clamped and nonsense is ignored", async ({ page }) => {
  await openStudio(page);
  await box(page).fill("0.2");
  await box(page).press("Enter");
  await expect(box(page)).toHaveValue("0.50");
  await expect.poll(() => rate(page)).toBe(0.5);

  await box(page).fill("1.8");
  await box(page).press("Enter");
  await expect(box(page)).toHaveValue("1.00");

  await box(page).fill("fast");
  await box(page).press("Enter");
  await expect(box(page)).toHaveValue("1.00");
  await expect.poll(() => rate(page)).toBe(1);
});

test("the wheel and arrow keys on the box move it a hundredth at a time", async ({ page }) => {
  await openStudio(page);
  await box(page).hover();
  await page.mouse.wheel(0, 100);
  await page.mouse.wheel(0, 100);
  await expect(box(page)).toHaveValue("0.98");
  await expect.poll(() => rate(page)).toBe(0.98);

  await box(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(box(page)).toHaveValue("0.97");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(box(page)).toHaveValue("0.92");
  await expect.poll(() => rate(page)).toBe(0.92);
});
