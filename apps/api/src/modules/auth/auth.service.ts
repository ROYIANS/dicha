import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as client from 'openid-client';

@Injectable()
export class AuthService {
  private oidcConfig: client.Configuration | null = null;

  constructor(private readonly configService: ConfigService) {}

  async getConfig(): Promise<client.Configuration> {
    if (!this.oidcConfig) {
      const endpoint = this.configService.get<string>('CASDOOR_ENDPOINT')!;
      const clientId = this.configService.get<string>('CASDOOR_CLIENT_ID')!;
      const clientSecret = this.configService.get<string>('CASDOOR_CLIENT_SECRET')!;

      this.oidcConfig = await client.discovery(
        new URL(endpoint),
        clientId,
        clientSecret,
      );
    }
    return this.oidcConfig;
  }

  async buildLoginUrl(session: {
    pkceVerifier?: string;
    nonce?: string;
  }): Promise<string> {
    const config = await this.getConfig();
    const code_verifier = client.randomPKCECodeVerifier();
    const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);
    const nonce = client.randomNonce();

    session.pkceVerifier = code_verifier;
    session.nonce = nonce;

    const redirectUri = this.configService.get<string>('CASDOOR_CALLBACK_URL')!;

    return client.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri,
      scope: 'openid email profile',
      code_challenge,
      code_challenge_method: 'S256',
      nonce,
    }).href;
  }

  async handleCallback(
    session: { pkceVerifier?: string; nonce?: string },
    currentUrl: URL,
  ): Promise<{
    id: string;
    name: string;
    avatar: string | null;
    email: string | null;
    phone: string | null;
  }> {
    const config = await this.getConfig();

    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: session.pkceVerifier,
      expectedNonce: session.nonce,
      idTokenExpected: true,
    });

    const claims = tokens.claims()!;
    const userInfo = await client.fetchUserInfo(
      config,
      tokens.access_token,
      claims.sub,
    );

    return {
      id: userInfo.sub!,
      name: (userInfo.name as string) || (userInfo.preferred_username as string) || 'User',
      avatar: (userInfo.picture as string) || null,
      email: (userInfo.email as string) || null,
      phone: (userInfo.phone_number as string) || null,
    };
  }
}
