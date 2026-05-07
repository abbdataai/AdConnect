import { expect, test } from "@playwright/test";

const QUERY = "?venue_id=22222222-2222-2222-2222-222222222222"
  + "&device_id=00000000-0000-0000-0000-000000000099"
  + "&mac_hash=" + "a".repeat(64);

test("AT-001 + AT-010 + AT-011 + AT-012: full 5-screen happy path", async ({ page }) => {
  await page.goto(`/${QUERY}`);

  // Connecting screen renders and auto-advances after ~3.1s.
  const connecting = page.getByTestId("screen-connecting");
  await expect(connecting).toBeVisible();

  const form = page.getByTestId("screen-form");
  await expect(form).toBeVisible({ timeout: 5000 });

  // Form: fill 4 fields + consent.
  await form.getByTestId("field-name").locator("input").fill("João Pedro Silva Souza");
  await form.getByRole("radio", { name: "25-34" }).click();
  await form.getByRole("radio", { name: "Feminino" }).click();
  await form.getByTestId("field-neighborhood").locator("select").selectOption("Centro");
  // Submit disabled before consent.
  await expect(page.getByTestId("submit")).toBeDisabled();
  await page.getByTestId("consent-checkbox").check();
  await expect(page.getByTestId("submit")).toBeEnabled();

  // Submit → ad screen.
  await page.getByTestId("submit").click();
  const ad = page.getByTestId("screen-ad");
  await expect(ad).toBeVisible({ timeout: 5000 });

  // AT-011: ad shows non-skippable copy + countdown.
  await expect(ad.getByText("Não é possível pular o anúncio")).toBeVisible();
  await expect(ad.getByText("Café Imperial")).toBeVisible();

  // Wait through the 30-second ad. Use a generous timeout.
  const connected = page.getByTestId("screen-connected");
  await expect(connected).toBeVisible({ timeout: 35_000 });

  // AT-012: headline interpolates first name only.
  await expect(connected.getByTestId("connected-headline")).toHaveText(
    "Aproveite, João!",
  );
});
