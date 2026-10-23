# Claims before measurement

Test whether production candidate A+B improves public slugify throughput versus the untouched same-tsdown baseline, and whether it exceeds slugify1.6.9 on exactly matching ASCII/Latin outputs. No win is assumed. Five rotated rounds,150ms warmup,25ms calibration,350ms target samples. Reuse maintained worker checksum/count/error/exact-output checks. Shared host is busy; report median/range and CPU/wall. Separate profile, package bytes and post-GC memory from timing. Additional candidates require recorded source/entry hashes and fresh measurements.
