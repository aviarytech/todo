declare module "chrono-node" {
  interface ParsedResult {
    start: {
      date(): Date;
    };
    end?: {
      date(): Date;
    };
    index: number;
    text: string;
    ref: Date;
  }

  function parse(text: string, ref?: Date, option?: unknown): ParsedResult[];
  function parseDate(text: string, ref?: Date, option?: unknown): Date | null;
}
