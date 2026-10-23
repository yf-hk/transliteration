use std::hint::black_box;
use std::io::{self, Read};
use std::time::Instant;

fn run(function: fn(&str)->String, texts: &[String], count: usize, checksum: &mut u64) {
    for i in 0..count {
        let result=black_box(function(black_box(&texts[i%texts.len()])));
        *checksum=checksum.wrapping_add(result.len() as u64).wrapping_add(result.as_bytes().last().copied().unwrap_or(0) as u64);
        black_box(&result);
    }
}
fn main() {
    let mut request=String::new();io::stdin().read_to_string(&mut request).unwrap();
    let request:serde_json::Value=serde_json::from_str(&request).unwrap();
    let id=request["id"].as_str().unwrap();
    let texts:Vec<String>=request["texts"].as_array().unwrap().iter().map(|x|x.as_str().unwrap().to_owned()).collect();
    let function:fn(&str)->String=match id {"rust-deunicode"=>deunicode::deunicode,"rust-anyascii"=>any_ascii::any_ascii,_=>panic!("unknown adapter")};
    let expected:Vec<String>=texts.iter().map(|s|function(s)).collect();
    let mut checksum=0;
    run(function,&texts,256,&mut checksum);
    let mut count=32;
    let elapsed=loop {let start=Instant::now();run(function,&texts,count,&mut checksum);let elapsed=start.elapsed().as_secs_f64();if elapsed>=0.03 {break elapsed;}count*=2;};
    count=((count as f64*request["targetMs"].as_f64().unwrap()/1000.0/elapsed/32.0).ceil() as usize*32).max(32);
    let start=Instant::now();run(function,&texts,count,&mut checksum);let elapsed=start.elapsed().as_secs_f64();
    let errors=texts.iter().zip(expected.iter()).filter(|(s,expected)|function(s)!=**expected).count();
    let input_bytes=count as f64*texts.iter().map(|s|s.len()).sum::<usize>() as f64/texts.len() as f64;
    println!("{}",serde_json::json!({"id":id,"workload":request["workload"],"mode":"transliterate","iterations":count,"elapsedMs":elapsed*1000.0,"opsPerSec":count as f64/elapsed,"mibPerSec":input_bytes/elapsed/1048576.0,"checksum":checksum,"errors":errors,"outputEmpty":expected.iter().filter(|s|s.is_empty()).count(),"outputs":expected,"profile":"release,opt3,LTO,codegen-units1"}));
}
