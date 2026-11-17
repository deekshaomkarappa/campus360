// AI Semantic Matching Engine for Campus 360 Lost & Found

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'from',
  'by', 'about', 'as', 'into', 'like', 'through', 'after', 'over', 'between',
  'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among',
  'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
  'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who',
  'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did',
  'lost', 'found', 'please', 'help', 'someone', 'anyone', 'yesterday', 'today',
  'somewhere', 'near', 'beside', 'around', 'very', 'really', 'just'
]);

const CAMPUS_ZONES = {
  library: ['library', 'reading', 'reference', 'bookshelf', 'stack'],
  canteen: ['canteen', 'cafeteria', 'mess', 'food', 'table', 'snack', 'counter'],
  lab: ['lab', 'laboratory', 'computer', 'cs', 'ec', 'mechanical', 'civil', 'electronics'],
  seminar_hall: ['seminar', 'auditorium', 'hall', 'main block', 'stage'],
  sports_ground: ['ground', 'sports', 'cricket', 'football', 'basketball', 'gym', 'court'],
  parking: ['parking', 'bike', 'scooter', 'cycle', 'stand', 'gate'],
  classroom: ['classroom', 'room', 'class', 'desk', 'bench', 'lecture']
};

function normalizeZone(locationStr) {
  if (!locationStr) return null;
  const lower = locationStr.toLowerCase();
  for (const [zone, keywords] of Object.entries(CAMPUS_ZONES)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return zone;
    }
  }
  return null;
}

// Extract meaningful semantic keywords (colors, brands, object names)
function extractAiKeywords(title = '', description = '', category = '', location = '') {
  const combined = `${title} ${description} ${category} ${location}`.toLowerCase();
  const rawTokens = combined
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

  return Array.from(new Set(rawTokens));
}

// Calculate AI match score between a LOST item and a FOUND item (0 to 100)
function calculateMatchScore(lostItem, foundItem) {
  let score = 0;
  const matchReasons = [];

  // 1. Category Matching (up to 25 pts)
  if (lostItem.category && foundItem.category) {
    if (lostItem.category === foundItem.category) {
      score += 25;
      matchReasons.push(`Exact category match: "${lostItem.category}"`);
    }
  }

  // 2. Keyword & Attribute Semantic Overlap (up to 40 pts)
  const lostKw = new Set(lostItem.aiKeywords || extractAiKeywords(lostItem.title, lostItem.description));
  const foundKw = new Set(foundItem.aiKeywords || extractAiKeywords(foundItem.title, foundItem.description));

  const commonKeywords = [];
  lostKw.forEach((kw) => {
    if (foundKw.has(kw)) commonKeywords.push(kw);
  });

  if (commonKeywords.length > 0) {
    // Each matching keyword adds weight (up to 40 pts)
    const keywordPts = Math.min(40, commonKeywords.length * 10);
    score += keywordPts;
    matchReasons.push(`Shared descriptors: ${commonKeywords.slice(0, 4).join(', ')}`);
  }

  // 3. Location Matching (up to 20 pts)
  const zoneA = normalizeZone(lostItem.location);
  const zoneB = normalizeZone(foundItem.location);
  if (zoneA && zoneB && zoneA === zoneB) {
    score += 20;
    matchReasons.push(`Same campus zone: ${zoneA.replace('_', ' ')}`);
  } else if (
    lostItem.location &&
    foundItem.location &&
    lostItem.location.toLowerCase().includes(foundItem.location.toLowerCase())
  ) {
    score += 15;
    matchReasons.push('Matching location text');
  }

  // 4. Date Proximity (up to 15 pts)
  if (lostItem.date && foundItem.date) {
    const d1 = new Date(lostItem.date).getTime();
    const d2 = new Date(foundItem.date).getTime();
    const diffHours = Math.abs(d1 - d2) / (1000 * 60 * 60);

    if (diffHours <= 24) {
      score += 15;
      matchReasons.push('Reported within 24 hours');
    } else if (diffHours <= 72) {
      score += 10;
      matchReasons.push('Reported within 3 days');
    } else if (diffHours <= 168) {
      score += 5;
      matchReasons.push('Reported within 1 week');
    }
  }

  const confidenceScore = Math.min(100, Math.round(score));
  let matchTier = 'Low';
  if (confidenceScore >= 75) matchTier = 'High';
  else if (confidenceScore >= 50) matchTier = 'Moderate';

  return {
    score: confidenceScore,
    tier: matchTier,
    isMatch: confidenceScore >= 50,
    reasons: matchReasons,
    summary: matchReasons.join(' · ') || 'General attributes overlap',
  };
}

// Natural language query processor for AI search bar
function parseNaturalSearch(query = '') {
  const qLower = query.toLowerCase();
  const keywords = extractAiKeywords(query);

  let detectedType = null;
  if (qLower.includes('lost') || qLower.includes('forgot') || qLower.includes('missing') || qLower.includes('left')) {
    detectedType = 'lost';
  } else if (qLower.includes('found') || qLower.includes('picked up') || qLower.includes('got')) {
    detectedType = 'found';
  }

  const detectedZone = normalizeZone(query);

  const categories = [
    'Electronics', 'ID & Cards', 'Bags & Wallets', 'Keys',
    'Books & Stationery', 'Clothing & Accessories', 'Bottles & Lunchboxes', 'Other'
  ];

  let detectedCategory = null;
  for (const cat of categories) {
    if (qLower.includes(cat.toLowerCase()) || (cat === 'ID & Cards' && qLower.includes('id'))) {
      detectedCategory = cat;
      break;
    }
  }

  return { keywords, detectedType, detectedZone, detectedCategory };
}

module.exports = {
  extractAiKeywords,
  calculateMatchScore,
  parseNaturalSearch,
  normalizeZone,
};
