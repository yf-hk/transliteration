use std::hint::black_box;
use std::io::{self, BufRead};
use std::time::Instant;

fn run(function: fn(&str) -> String, texts: &[String], count: usize) -> (u64, usize) {
    let mut checksum = 0_u64;
    let mut bytes = 0_usize;
    for i in 0..count {
        let value = black_box(function(black_box(&texts[i % texts.len()])));
        bytes += value.len();
        checksum = checksum.wrapping_add(value.len() as u64)
            .wrapping_add(value.as_bytes().first().copied().unwrap_or(0) as u64)
            .wrapping_add(value.as_bytes().last().copied().unwrap_or(0) as u64);
        black_box(&value);
    }
    (checksum, bytes)
}

fn main() {
    let id = std::env::args().nth(1).unwrap();
    let function: fn(&str) -> String = match id.as_str() {
        "rust-deunicode" => deunicode::deunicode,
        "rust-anyascii" => any_ascii::any_ascii,
        _ => panic!("unknown adapter"),
    };
    for line in io::stdin().lock().lines() {
        let request: serde_json::Value = serde_json::from_str(&line.unwrap()).unwrap();
        let texts: Vec<String> = request["texts"].as_array().unwrap().iter().map(|x| x.as_str().unwrap().to_owned()).collect();
        let expected: Vec<String> = texts.iter().map(|s| function(s)).collect();
        let start = Instant::now();
        while start.elapsed().as_secs_f64() < 0.012 { black_box(run(function, &texts, texts.len())); }
        let mut count = texts.len();
        let elapsed = loop {
            let start = Instant::now();
            black_box(run(function, &texts, count));
            let elapsed = start.elapsed().as_secs_f64();
            if elapsed >= 0.012 { break elapsed; }
            count *= 2;
        };
        count = ((count as f64 * request["targetMs"].as_f64().unwrap() / 1000.0 / elapsed / texts.len() as f64).ceil() as usize * texts.len()).max(texts.len());
        let start = Instant::now();
        let (checksum, output_bytes) = run(function, &texts, count);
        let elapsed = start.elapsed().as_secs_f64();
        let per_cycle: u64 = expected.iter().map(|v| v.len() as u64 + v.as_bytes().first().copied().unwrap_or(0) as u64 + v.as_bytes().last().copied().unwrap_or(0) as u64).sum();
        let expected_checksum = per_cycle.wrapping_mul((count / texts.len()) as u64);
        let expected_bytes = expected.iter().map(|s| s.len()).sum::<usize>() * (count / texts.len());
        assert_eq!(checksum, expected_checksum);
        assert_eq!(output_bytes, expected_bytes);
        assert!(texts.iter().zip(expected.iter()).all(|(s, expected)| function(s) == *expected));
        let probes: serde_json::Map<String, serde_json::Value> = request["probes"].as_object().unwrap().iter().map(|(k, v)| (k.clone(), function(v.as_str().unwrap()).into())).collect();
        println!("{}", serde_json::json!({"id": id, "fixture": request["fixture"], "mode": "transliterate", "iterations": count,
            "elapsedMs": elapsed * 1000.0, "operationsPerSecond": count as f64 / elapsed,
            "inputMiBPerSecond": count as f64 * texts.iter().map(|s| s.len()).sum::<usize>() as f64 / texts.len() as f64 / elapsed / 1048576.0,
            "checksum": checksum, "expectedChecksum": expected_checksum, "outputBytes": output_bytes,
            "expectedOutputBytes": expected_bytes, "completedCalls": count, "errors": 0, "stable": true, "outputs": expected,
            "probeOutputs": probes, "version": if id == "rust-deunicode" { "1.6.2" } else { "0.3.3" }, "profile": "release,opt3,LTO,codegen-units1"}));
    }
}
