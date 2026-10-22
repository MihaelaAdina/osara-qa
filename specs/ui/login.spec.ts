import { test } from "../../fixtures/base.fixtures";

test("buyer login", async ({ buyer, loginPage }) => {
  await loginPage.goto();
  await loginPage.loginUser(buyer.email, buyer.password);
});
