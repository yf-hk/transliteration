export type Mode = 'transliterate' | 'slugify';
export type Converter = (input: string) => unknown;
export type Fallback = (input: string, output: string) => boolean;
export type Probe = { input: string; readings?: string[]; cjk?: boolean };
export type ProbeResult = {
  id: string;
  input: string;
  output: string;
  flags: string[];
  assessment: 'not-valid-reading' | 'probe-matched-only' | 'reading-unverified';
  cjk: boolean;
};
export type Fixture = { id: string; texts: string[]; probes: string[] };
export type Protocol = {
  rounds: number;
  targetMs: number;
  warmupMs: number;
  calibrationMs: number;
};
type AdapterBase = { id: string; name: string; modes: Mode[]; options: string };
export type NodeAdapter = AdapterBase &
  (
    | {
        kind: 'local';
        root: string;
        map: 'full' | 'latin';
        role: 'before' | 'after' | 'snapshot';
      }
    | {
        kind: 'package';
        package: string;
        style: 'default' | 'slugify' | 'slug' | 'pinyin';
      }
  );
export type NativeAdapter = AdapterBase & {
  kind: 'native';
  runtime: 'python' | 'rust' | 'icu';
};
export type Metadata = {
  id: string;
  name: string;
  package: string;
  version: string;
  displayVersion: string;
  runtime: string;
  options: string;
  entry: string;
  entrySha256: string;
  modes: Mode[];
};
export type Api = {
  methods: Partial<Record<Mode, Converter>>;
  isFallback?: Fallback;
};
export type Assessment = 'ascii-only' | ProbeResult['assessment'];
export type Audit = {
  adapter: string;
  mode: Mode;
  fixture: string;
  outputs: { input: string; output: string; flags: string[] }[];
  probes: ProbeResult[];
  flags: string[];
  assessment: Assessment;
};
export type Sample = {
  adapter: string;
  mode: Mode;
  fixture: string;
  round: number;
  sequence: number;
  iterations: number;
  completedCalls: number;
  elapsedMs: number;
  operationsPerSecond: number;
  inputMiBPerSecond: number;
  checksum: number;
  expectedChecksum: number;
  outputUnits: number;
  expectedOutputUnits: number;
  unit: 'utf16' | 'utf8' | 'codepoints';
  cpuMs: number | null;
  cpuToWallRatio: number | null;
  errors: number;
  stable: boolean;
  warmupCalls: number | null;
  warmupElapsedMs: number | null;
  calibrationIterations: number | null;
  calibrationElapsedMs: number | null;
};
export type Memory = {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
};
export type Startup = {
  adapter: string;
  importMs: number;
  firstCallMs: number;
  beforeImport: Memory;
  afterImport: Memory;
  afterFirstCall: Memory;
};
export type WarmMemory = {
  adapter: string;
  afterWarm: Memory;
  warmDelta: Memory;
};
export type Artifact = {
  file: string;
  rawBytes: number;
  gzipBytes: number;
  brotliBytes: number;
  sha256: string;
};
export type Provenance = {
  createdAt: string;
  head: string;
  trackedDirty: boolean;
  packageVersion: string;
  source: Record<string, string>;
  dist: Record<string, string>;
  harness: Record<string, string>;
  baseline: { root: string; version: string; entries: Record<string, string> };
  archive: {
    path: string;
    bytes: number;
    sha256: string;
    allDistFilesMatch: boolean;
  } | null;
  versions: Record<string, string>;
  hostProcesses: string[];
};
export type Phase = {
  startedAt: string;
  endedAt: string;
  loadStart: number[];
  loadEnd: number[];
};
export type RunResult = {
  schemaVersion: number;
  startedAt: string;
  endedAt: string;
  protocol: Protocol;
  environment: {
    node: string;
    platform: string;
    arch: string;
    cpuModel: string;
    logicalCpus: number;
    nodeOptions: string;
  };
  provenance: Provenance;
  fixtures: Fixture[];
  adapters: Metadata[];
  audits: Audit[];
  samples: Sample[];
  startup: Startup[];
  memory: WarmMemory[];
  artifacts: Artifact[];
  phases: { javascript: Phase; cross: Phase | null };
  failures: { phase: string; adapter: string; message: string }[];
};
export type WorkerJob =
  | { type: 'audit'; fixtureIds: string[] }
  | { type: 'sample'; mode: Mode; fixture: string; protocol: Protocol }
  | { type: 'memory' };
