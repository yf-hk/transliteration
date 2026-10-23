#include <unicode/translit.h>
#include <unicode/unistr.h>
#include <unicode/uversion.h>
#include <chrono>
#include <cmath>
#include <memory>
#include <cstdint>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

using Clock = std::chrono::steady_clock;
double seconds(Clock::time_point start) {
    return std::chrono::duration<double>(Clock::now() - start).count();
}
std::string quote(const std::string& value) {
    std::string output = "\"";
    for (unsigned char c : value) {
        if (c == '"' || c == '\\') { output += '\\'; output += c; }
        else if (c == '\n') output += "\\n";
        else if (c == '\r') output += "\\r";
        else if (c == '\t') output += "\\t";
        else output += c;
    }
    return output + "\"";
}
int main() {
    UErrorCode status = U_ZERO_ERROR;
    auto converter = std::unique_ptr<icu::Transliterator>(icu::Transliterator::createInstance("Any-Latin; Latin-ASCII", UTRANS_FORWARD, status));
    if (U_FAILURE(status) || !converter) throw std::runtime_error(u_errorName(status));
    auto convert = [&](const std::string& input) {
        auto value = icu::UnicodeString::fromUTF8(input);
        converter->transliterate(value);
        std::string output;
        value.toUTF8String(output);
        return output;
    };
    std::string line;
    while (std::getline(std::cin, line)) {
        std::vector<std::string> parts;
        std::stringstream stream(line);
        std::string part;
        while (std::getline(stream, part, '\t')) parts.push_back(part);
        if (parts.size() < 4) throw std::runtime_error("invalid request");
        const double target_ms = std::stod(parts[0]);
        const std::string fixture = parts[1];
        const size_t text_count = std::stoul(parts[2]);
        const std::vector<std::string> texts(parts.begin() + 3, parts.begin() + 3 + text_count);
        std::vector<std::string> expected;
        for (const auto& text : texts) expected.push_back(convert(text));
        auto run = [&](size_t count) {
            uint64_t checksum = 0, bytes = 0;
            for (size_t i = 0; i < count; i++) {
                const auto output = convert(texts[i % texts.size()]);
                bytes += output.size();
                checksum += output.size() + (output.empty() ? 0 : static_cast<unsigned char>(output.front()) + static_cast<unsigned char>(output.back()));
            }
            return std::make_pair(checksum, bytes);
        };
        auto start = Clock::now();
        do { volatile auto consumed = run(texts.size()).first; (void) consumed; } while (seconds(start) < 0.012);
        size_t count = texts.size();
        double elapsed;
        do {
            start = Clock::now();
            volatile auto consumed = run(count).first; (void) consumed;
            elapsed = seconds(start);
            if (elapsed < 0.012) count *= 2;
        } while (elapsed < 0.012);
        count = std::max(texts.size(), static_cast<size_t>(std::ceil(count * target_ms / 1000.0 / elapsed / texts.size())) * texts.size());
        start = Clock::now();
        const auto consumed = run(count);
        elapsed = seconds(start);
        uint64_t expected_checksum = 0, expected_bytes = 0, input_bytes = 0;
        for (size_t i = 0; i < expected.size(); i++) {
            const auto& output = expected[i];
            expected_bytes += output.size();
            expected_checksum += output.size() + (output.empty() ? 0 : static_cast<unsigned char>(output.front()) + static_cast<unsigned char>(output.back()));
            input_bytes += texts[i].size();
            if (convert(texts[i]) != output) throw std::runtime_error("unstable output");
        }
        expected_checksum *= count / texts.size();
        expected_bytes *= count / texts.size();
        if (consumed.first != expected_checksum || consumed.second != expected_bytes) throw std::runtime_error("timed output changed");
        std::cout << "{\"id\":\"icu\",\"version\":" << quote(U_ICU_VERSION) << ",\"fixture\":" << quote(fixture)
                  << ",\"mode\":\"transliterate\",\"iterations\":" << count << ",\"completedCalls\":" << count
                  << ",\"elapsedMs\":" << elapsed * 1000.0 << ",\"operationsPerSecond\":" << count / elapsed
                  << ",\"inputMiBPerSecond\":" << input_bytes * static_cast<double>(count / texts.size()) / elapsed / 1048576.0
                  << ",\"checksum\":" << consumed.first << ",\"expectedChecksum\":" << expected_checksum
                  << ",\"outputBytes\":" << consumed.second << ",\"expectedOutputBytes\":" << expected_bytes
                  << ",\"errors\":0,\"stable\":true,\"outputs\":[";
        for (size_t i = 0; i < expected.size(); i++) { if (i) std::cout << ','; std::cout << quote(expected[i]); }
        std::cout << "],\"probeOutputs\":{";
        for (size_t i = 3 + text_count; i + 1 < parts.size(); i += 2) {
            if (i > 3 + text_count) std::cout << ',';
            std::cout << quote(parts[i]) << ':' << quote(convert(parts[i + 1]));
        }
        std::cout << "}}" << std::endl;
    }
}
