import { Fetcher } from 'oid4vc-verifier-frontend-core/ports.out.http';
import { z } from 'zod';

export class WorkerToWorkerFetcher implements Fetcher {
  #backend: Service;

  constructor(backend: Service) {
    this.#backend = backend;
  }

  async get<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
    const response = await this.#backend.fetch(url, {
      method: 'GET',
    });

    this.checkStatus(response);
    const data = await response.json();
    return schema.parse(data);
  }

  async post<T>(url: string, body: string, schema: z.ZodSchema<T>): Promise<T> {
    const response = await this.#backend.fetch(url, {
      method: 'POST',
      body,
    });

    this.checkStatus(response);

    const data = await response.json();
    return schema.parse(data);
  }

  private checkStatus(response: Response) {
    if (response.status >= 200 && response.status < 300) {
      return response;
    }
    const message = `Status: ${response.status}, Message: ${response.statusText}`;
    console.error(message);
    throw new Error(message);
  }
}
