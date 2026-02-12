declare module 'liteapi-node-sdk' {
  export default class LiteAPI {
    constructor(config: Record<string, unknown>);
    data: {
      cities: (params: { query: string }) => Promise<{ data?: Array<Record<string, string>> }>;
    };
  }
}
