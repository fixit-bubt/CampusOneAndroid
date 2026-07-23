import { reduceEngineMessage, type PendingJob } from '../engineProtocol';

function pendingWith(id: number) {
  const resolve = jest.fn();
  const reject = jest.fn();
  const map = new Map<number, PendingJob>([[id, { resolve, reject }]]);
  return { map, resolve, reject };
}

describe('engine message routing', () => {
  it('resolves the job that asked, then forgets it', () => {
    const { map, resolve } = pendingWith(7);
    reduceEngineMessage(map, { id: 7, type: 'opened', pages: 3, textChars: 12 });
    expect(resolve).toHaveBeenCalledWith({ pages: 3, textChars: 12 });
    expect(map.size).toBe(0);
  });

  it('hands a rendered page back with its size in points', () => {
    const { map, resolve } = pendingWith(4);
    reduceEngineMessage(map, { id: 4, type: 'page', page: 1, base64: 'QUJD', wPt: 595, hPt: 842 });
    expect(resolve).toHaveBeenCalledWith({ base64: 'QUJD', wPt: 595, hPt: 842 });
  });

  it('rejects with the engine code', () => {
    const { map, reject } = pendingWith(2);
    reduceEngineMessage(map, { id: 2, type: 'error', code: 'encrypted' });
    expect(reject.mock.calls[0][0]).toMatchObject({ code: 'encrypted' });
    expect(map.size).toBe(0);
  });

  it('ignores a message for a job nobody is waiting on', () => {
    const { map, resolve } = pendingWith(1);
    reduceEngineMessage(map, { id: 99, type: 'thumb', page: 1, base64: 'AA' });
    expect(resolve).not.toHaveBeenCalled();
    expect(map.size).toBe(1);
  });

  it('fails every job in flight when the engine itself dies', () => {
    const a = jest.fn();
    const b = jest.fn();
    const map = new Map<number, PendingJob>([
      [1, { resolve: jest.fn(), reject: a }],
      [2, { resolve: jest.fn(), reject: b }],
    ]);
    reduceEngineMessage(map, { id: 0, type: 'fatal' });
    expect(a.mock.calls[0][0]).toMatchObject({ code: 'engine-failed' });
    expect(b.mock.calls[0][0]).toMatchObject({ code: 'engine-failed' });
    expect(map.size).toBe(0);
  });
});
