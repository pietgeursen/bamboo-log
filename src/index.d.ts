import { BambooEntry, KeyPair } from '@bamboo-logs/bamboo-wasm';
export declare type Entry = Uint8Array;
export declare type Payload = Uint8Array;
export declare type PubKey = Uint8Array;
export declare type Sequence = BigInt;
export declare type LogId = BigInt;
export declare type GetLastSeq = (feedId: PubKey, logId: LogId) => Promise<Sequence | undefined>;
export declare type GetEntry = (feedId: PubKey, logId: LogId, sequence: Sequence) => Promise<[Entry, Payload] | undefined>;
export declare type AddEntry = (entry: Entry, payload: Payload) => Promise<undefined>;
export interface Store {
    getLastSequence: GetLastSeq;
    getEntry: GetEntry;
    addEntry: AddEntry;
}
export declare class LogsStore {
    private store;
    private keyPair?;
    private maxEntrySize;
    constructor(store: Store, keyPair?: KeyPair);
    appendEntry(entry: Entry, payload: Payload): Promise<undefined>;
    publish(payload: Payload, logId: LogId): Promise<BambooEntry>;
}
