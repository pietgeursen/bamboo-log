import {BambooEntry, KeyPair, lipmaaLink, publish, decode, verify, maxEntrySize} from '@bamboo-logs/bamboo-wasm'

export type Entry = Uint8Array;
export type Payload = Uint8Array;
export type PubKey = Uint8Array;
export type Sequence = BigInt;
export type LogId = BigInt;

export type GetLastSeq = (feedId: PubKey, logId: LogId) => Promise<Sequence | undefined>;
export type GetEntry = (feedId: PubKey, logId: LogId, sequence: Sequence) => Promise<[Entry, Payload] | undefined>;
export type AddEntry = (entry: Entry, payload: Payload) => Promise<undefined>;

export interface Store {
  getLastSequence: GetLastSeq,
  getEntry: GetEntry,
  addEntry: AddEntry
}

export class LogsStore {
  private store: Store
  private keyPair?: KeyPair 
  private maxEntrySize: number

  constructor(store: Store, keyPair?: KeyPair){
    this.store = store
    this.keyPair = keyPair
    this.maxEntrySize = maxEntrySize()
  }

  async appendEntry(entry: Entry, payload: Payload): Promise<undefined>{
    const bambooEntry = decode(entry)
    const lipmaaNumber = lipmaaLink(bambooEntry.sequence);

    const lipmaaPayloadOption= await this.store.getEntry(bambooEntry.author, bambooEntry.logId, lipmaaNumber)
    const lipmaaEntry = lipmaaPayloadOption ? lipmaaPayloadOption[0] : undefined

    const previousPayloadOption= await this.store.getEntry(bambooEntry.author, bambooEntry.logId, BigInt(bambooEntry.sequence) - 1n)
    const previousEntry = previousPayloadOption ? previousPayloadOption[0] : undefined

    const isValid = verify(entry, payload, lipmaaEntry, previousEntry)

    if(!isValid)
      throw new Error("Could not append entry, it is invalid")

    return this.store.addEntry(entry, payload)
  }

  async publish(payload: Payload, logId: LogId): Promise<BambooEntry> {
    if(this.keyPair == null)
      throw new Error("Attempting to publish without a keypair")

    let lipmaaEntry = undefined
    let backlinkEntry = undefined

    const latestSeq = await this.store.getLastSequence(this.keyPair.publicKeyBytes(), logId);

    if(latestSeq){
      const lipmaaNumber = lipmaaLink(latestSeq)

      const lipmaaPayloadOption = await this.store.getEntry(this.keyPair.publicKeyBytes(), logId, lipmaaNumber)
      lipmaaEntry = lipmaaPayloadOption ? lipmaaPayloadOption[0] : undefined

      const backlinkPayloadOption= await this.store.getEntry(this.keyPair.publicKeyBytes(), logId, latestSeq)
      backlinkEntry = backlinkPayloadOption ? backlinkPayloadOption[0] : undefined
    }


    let out = new Uint8Array(this.maxEntrySize)
    const outSize = publish(out, this.keyPair.publicKeyBytes(), this.keyPair.secretKeyBytes(), logId, payload, false, latestSeq, lipmaaEntry, backlinkEntry)

    out = out.slice(0, outSize)

    await this.store.addEntry(out, payload)

    return decode(out)
  }
}
