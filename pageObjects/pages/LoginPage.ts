import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "../BasePage";

export class LoginPage extends BasePage {
  readonly path = "/#log-in";
  readonly email: Locator;
  readonly password: Locator;
  readonly loginButton: Locator;
  readonly accountLoggedIn: Locator;

  constructor(page: Page) {
    super(page);
    this.email = page.getByRole('textbox', { name: 'email' });
    this.password = page.getByRole('textbox', { name: 'password' });
    this.loginButton = this.page.getByTestId('log-in-submit');
    this.accountLoggedIn = this.page.getByTestId('account-menu-open');
  }

  async loginUser(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.loginButton.click();
    await expect(this.accountLoggedIn).toBeVisible()
  }
}
