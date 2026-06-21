import { Body, Controller, Get, Headers, Patch, Post } from "@nestjs/common";

import { AuthService } from "./auth.service.js";

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("auth/wallet/nonce")
  nonce(@Body() body: { address: string }) {
    return this.authService.createNonce(body.address);
  }

  @Post("auth/wallet/verify")
  verify(@Body() body: { address: string; signature: `0x${string}` }) {
    return this.authService.verify(body.address, body.signature);
  }

  @Get("me")
  async me(@Headers("authorization") authorization?: string) {
    return this.authService.me(authorization);
  }

  @Patch("me")
  async updateProfile(
    @Body() body: { alias?: string | null },
    @Headers("authorization") authorization?: string,
  ) {
    return this.authService.updateProfile(authorization, body.alias ?? null);
  }
}
