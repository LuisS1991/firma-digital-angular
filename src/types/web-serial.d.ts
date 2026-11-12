interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readonly writable: WritableStream<Uint8Array> | null;
}

interface Navigator {
  serial: {
    requestPort(options?: { filters?: any[] }): Promise<SerialPort>;
  };
}