import { test as base, expect} from "@playwright/test";
import { createBuyer } from "../api/clients/UsersApi";
import { LoginPage } from "../pageObjects/pages/LoginPage";

type Buyer = { email: string; password: string };

type ApiFixtures = {
  buyer: Buyer;
  loginPage: LoginPage;
};

export const test = base.extend<ApiFixtures> ({
    buyer: async ({ request }, use) => {
        const buyer = await createBuyer(request);
        await use(buyer);
    },
    loginPage: async ({ page }, use) => {
        await use(new LoginPage( page ));
    }
})

export {expect};



