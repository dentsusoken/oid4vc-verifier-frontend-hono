import { describe, it, expect, beforeEach } from 'vitest';
import { Context } from 'hono';
import { HonoConfiguration } from './HonoConfiguration';
import { Bindings, Env } from '../env';

describe('HonoConfiguration', () => {
  process.env = {
    ...process.env,
    API_BASE_URL_VERIFIER_FRONTEND: 'https://api.example.com',
    INIT_TRANSACTION_PATH: '/init',
    GET_WALLET_RESPONSE_PATH: '/wallet-response',
    WALLET_URL: 'https://wallet.example.com',
    PUBLIC_URL_VERIFIER_FRONTEND: 'https://public.example.com',
  };

  let ctx: Context<Env>;
  let config: HonoConfiguration;

  beforeEach(() => {
    ctx = {
      env: {
        API_BASE_URL_VERIFIER_FRONTEND: 'https://api.example.com',
        INIT_TRANSACTION_PATH: '/init',
        GET_WALLET_RESPONSE_PATH: '/wallet-response',
        WALLET_URL: 'https://wallet.example.com',
        PUBLIC_URL_VERIFIER_FRONTEND: 'https://public.example.com',
      },
    } as unknown as Context<Env>;
    config = new HonoConfiguration(ctx);
  });

  it('should return the correct apiBaseUrl', () => {
    expect(config.apiBaseUrl).toBe('https://api.example.com');
  });

  it('should return the correct initTransactionPath', () => {
    expect(config.initTransactionPath).toBe('/init');
  });

  it('should return the correct getWalletResponsePath', () => {
    expect(config.getWalletResponsePath).toBe('/wallet-response');
  });

  it('should return the correct walletUrl', () => {
    expect(config.walletUrl).toBe('https://wallet.example.com');
  });

  it('should return the correct publicUrl', () => {
    expect(config.publicUrl).toBe('https://public.example.com');
  });

  describe('when environment variables are not set', () => {
    beforeEach(() => {
      process.env = {};
      ctx = {} as unknown as Context<Env>;
      config = new HonoConfiguration(ctx);
    });

    it('should return empty string for apiBaseUrl', () => {
      expect(config.apiBaseUrl).toBe('');
    });

    it('should return empty string for initTransactionPath', () => {
      expect(config.initTransactionPath).toBe('');
    });

    it('should return empty string for getWalletResponsePath', () => {
      expect(config.getWalletResponsePath).toBe('');
    });

    it('should return empty string for walletUrl', () => {
      expect(config.walletUrl).toBe('');
    });

    it('should return empty string for publicUrl', () => {
      expect(config.publicUrl).toBe('');
    });
  });
});
