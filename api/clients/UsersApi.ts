import { APIRequestContext, expect } from "@playwright/test";
import { fakerEN } from "@faker-js/faker";

export const createBuyer = async (request: APIRequestContext) => {
  const password = fakerEN.internet.password();
  const buyerResponse = await request.post("/api/account", {
    data: {
      email: fakerEN.internet.email(),
      password: password,
      role: "BUYER",
    },
  });

  await expect(buyerResponse).toBeOK();

  const body = await buyerResponse.json();
  const email = body.email;
  return { email, password };
};
