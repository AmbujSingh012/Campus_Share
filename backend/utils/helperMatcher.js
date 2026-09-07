function extractKeywords(request) {
  const stopWords = new Set([
    "i",
    "need",
    "want",
    "a",
    "an",
    "the",
    "for",
    "to",
    "me",
    "my",
    "someone",
    "something",
    "please",
    "can",
    "you",
    "help",
    "with",
    "tomorrow",
    "tomorrows",
    "today",
    "class",
    "two",
    "days",
  ]);

  return request
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word));
}

module.exports = {
  extractKeywords,
};