import { defineStore } from 'pinia';
import { ApiRequest, ApiResponse, HttpMethod } from '../../../shared/api-tester-types';

export const useApiTesterStore = defineStore('apiTester', {
  state: () => ({
    currentRequest: {
      url: 'https://httpbin.org/get',
      method: 'GET' as HttpMethod,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Bstudio-Agent/1.0'
      },
      body: '{\n  "hello": "world"\n}',
      timeoutMs: 10000
    } as ApiRequest,
    isLoading: false,
    lastResponse: null as ApiResponse | null,
    history: [] as Array<{ request: ApiRequest; response: ApiResponse }>,
    hitlQueue: [] as ApiRequest[]
  }),
  actions: {
    async execute() {
      if (this.isLoading || !window.electronAPI) return;
      this.isLoading = true;
      try {
        const res = await window.electronAPI.executeApiRequest(this.currentRequest);
        this.lastResponse = res;
        this.history.unshift({
          request: { ...this.currentRequest },
          response: res
        });
        if (this.history.length > 30) this.history.pop();
      } catch (err: any) {
        this.lastResponse = {
          status: 0,
          statusText: 'Failed',
          headers: {},
          data: err.message,
          timeMs: 0,
          sizeBytes: 0,
          timestamp: Date.now()
        };
      } finally {
        this.isLoading = false;
      }
    },
    queueAgentRequest(req: ApiRequest) {
      this.hitlQueue.push(req);
    },
    acceptAgentRequest(index: number) {
      const req = this.hitlQueue[index];
      if (req) {
        this.currentRequest = { ...req };
        this.hitlQueue.splice(index, 1);
        this.execute();
      }
    },
    dismissAgentRequest(index: number) {
      this.hitlQueue.splice(index, 1);
    }
  }
});
