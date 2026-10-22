import { Page } from "@playwright/test";

export abstract class BasePage {
  readonly path: string;

  constructor(readonly page: Page) {
    this.path = "";
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

}