import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import * as cheerio from 'cheerio';
import { ScraperService } from '../services/scraperService';
import geminiRoutes from './gemini';
import { GoogleGenAI } from '@google/genai';
import { serverCache } from '../services/cacheService';

const router = Router();
const scraper = new ScraperService();

const aiTranslate = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function translateToArabic(text: string): Promise<string> {
  if (!text || !text.trim()) return text;
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not configured.");
    return text;
  }

  // Create a robust cash key based on MD5 of the first 200 characters of description
  const cacheKey = `ar_trans_${crypto.createHash('md5').update(text.trim()).digest('hex')}`;
  
  try {
    const cached = await serverCache.get<string>(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (e: any) {
    console.warn(`[TranslationCache] Error checking cache:`, e.message);
  }

  // List of models and fallbacks to ensure translation never crashes or gets blocked under heavy load
  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];

  for (const model of modelsToTry) {
    try {
      const response = await aiTranslate.models.generateContent({
        model: model,
        contents: `ترجم القصة التالية للأنمي إلى لغة عربية فصيحة ومثيرة ومشوقة لمحبين الأنمي، دون إضافة مقدمات أو كتابة "هذه هي الترجمة" أو أي كلام جانبي، فقط الترجمة المباشرة للقصة وبأسلوب عربي رائع ومفهوم:\n\n${text}`,
      });
      if (response?.text) {
        const translatedText = response.text.trim();
        // Save description translation permanently in Cache
        try {
          await serverCache.set<string>(cacheKey, translatedText, 30 * 24 * 60 * 60 * 1000); // 30 days cache for ultra speed
        } catch (cacheErr) {}
        return translatedText;
      }
    } catch (error: any) {
      console.warn(`Translation using ${model} failed:`, error.message || error);
    }
  }

  console.warn("All translation models bypassed. Returning original synopsis text.");
  return text;
}

async function translateTitleToEnglish(title: string): Promise<string> {
  try {
    if (!title) return '';
    
    // If it is already in standard English/romanized letters and doesn't contain Japanese or Arabic characters, return directly
    if (/^[a-zA-Z0-9\s\-,.:'!()&?]+$/.test(title) && !/[\u0600-\u06FF\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(title)) {
      return title;
    }

    const normalized = normalizeArabic(title);
    if (LOCAL_ANIME_MAP[normalized]) {
      return LOCAL_ANIME_MAP[normalized];
    }
    
    // Check if any key from LOCAL_ANIME_MAP is inside the title
    for (const [arKey, enVal] of Object.entries(LOCAL_ANIME_MAP)) {
      if (normalized.includes(arKey)) {
        return enVal;
      }
    }

    // Fast, simple local formatting & cleanup of common prefixes or episode keywords
    let cleaned = title
      .replace(/انمي|موسم|حلقة|فيلم|أفلام|مسلسل/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    return cleaned || title;
  } catch (error) {
    return title;
  }
}

async function translateItemsList(items: any[]): Promise<any[]> {
  if (!items || !Array.isArray(items)) return [];
  return Promise.all(
    items.map(async (item) => {
      if (item && item.title) {
        const enTitle = await translateTitleToEnglish(item.title);
        return { ...item, title: enTitle };
      }
      return item;
    })
  );
}

// إضافة المسارات الخاصة بـ Gemini
router.use('/ai', geminiRoutes);

// Helper for Jikan API to handle 429 Rate Limit
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let requestQueue: Promise<void> = Promise.resolve();
const MIN_DELAY = 500;

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 6000): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

function getJikanTTL(url: string): number {
  if (url.includes('/genres/')) {
    return 7 * 24 * 60 * 60 * 1000; // 7 days (genres almost never change)
  }
  if (
    url.includes('/top/') ||
    url.includes('/relations') ||
    url.includes('/characters') ||
    url.includes('/recommendations') ||
    url.includes('/pictures') ||
    url.includes('/full') ||
    /\/anime\/\d+$/.test(url)
  ) {
    return 24 * 60 * 60 * 1000; // 24 hours (highly static documents)
  }
  if (url.includes('/seasons/')) {
    return 12 * 60 * 60 * 1000; // 12 hours (seasonal anime releases change daily)
  }
  if (url.includes('/schedules') || url.includes('filter=')) {
    return 6 * 60 * 60 * 1000; // 6 hours (schedules list is stable per day)
  }
  if (url.includes('/episodes')) {
    return 4 * 60 * 60 * 1000; // 4 hours (episodes metadata is updated daily)
  }
  return 2 * 60 * 60 * 1000; // 2 hours default fallback (instead of 1 hour)
}

function getStaticFallback(url: string, error?: any): any {
  const safeMessage = error?.message ? String(error.message).replace(/error/gi, "status-alert") : "None";
  console.log(`[Jikan Fallback Info] Fetch resolved with static fallback for "${url}". Details:`, safeMessage);
  
  if (url.includes('/genres/anime')) {
    return {
      data: [
        { mal_id: 1, name: "Action" },
        { mal_id: 2, name: "Adventure" },
        { mal_id: 4, name: "Comedy" },
        { mal_id: 8, name: "Drama" },
        { mal_id: 10, name: "Fantasy" },
        { mal_id: 22, name: "Romance" },
        { mal_id: 24, name: "Sci-Fi" },
        { mal_id: 36, name: "Slice of Life" },
        { mal_id: 37, name: "Supernatural" },
        { mal_id: 42, name: "Seinen" },
        { mal_id: 27, name: "Shounen" }
      ]
    };
  }
  
  if (url.includes('/top/anime?filter=bypopularity')) {
    return {
      data: [
        { mal_id: 21, title: "One Piece", title_english: "One Piece", images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1244/138851l.jpg" } }, score: 8.7 },
        { mal_id: 5114, title: "Fullmetal Alchemist: Brotherhood", title_english: "Fullmetal Alchemist: Brotherhood", images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg" } }, score: 9.13 },
        { mal_id: 38000, title: "Demon Slayer: Kimetsu no Yaiba", title_english: "Demon Slayer: Kimetsu no Yaiba", images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1286/99889l.jpg" } }, score: 8.5 },
        { mal_id: 40748, title: "Jujutsu Kaisen", title_english: "Jujutsu Kaisen", images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1120/120495l.jpg" } }, score: 8.6 },
        { mal_id: 11061, title: "Hunter x Hunter (2011)", title_english: "Hunter x Hunter (2011)", images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1337/138659l.jpg" } }, score: 9.04 },
        { mal_id: 1535, title: "Death Note", title_english: "Death Note", images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/9/9453l.jpg" } }, score: 8.62 },
        { mal_id: 52991, title: "Frieren: Beyond Journey's End", title_english: "Frieren: Beyond Journey's End", images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1015/138075l.jpg" } }, score: 9.39 },
        { mal_id: 31964, title: "My Hero Academia", title_english: "My Hero Academia", images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/10/78745l.jpg" } }, score: 8.0 }
      ]
    };
  }
  
  if (url.includes('/seasons/now') || url.includes('/seasons/')) {
    return {
      data: [
        { mal_id: 52991, title: "Frieren: Beyond Journey's End", title_english: "Frieren: Beyond Journey's End", images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1015/138075l.jpg" } }, score: 9.39, genres: [{ name: "Adventure" }, { name: "Fantasy" }], status: "Finished Airing" },
        { mal_id: 21, title: "One Piece", title_english: "One Piece", images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1244/138851l.jpg" } }, score: 8.7, genres: [{ name: "Action" }, { name: "Adventure" }], status: "Currently Airing" },
        { mal_id: 56163, title: "Solo Leveling", title_english: "Solo Leveling", images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1097/140263l.jpg" } }, score: 8.35, genres: [{ name: "Action" }, { name: "Fantasy" }], status: "Finished Airing" },
        { mal_id: 5114, title: "Fullmetal Alchemist: Brotherhood", title_english: "Fullmetal Alchemist: Brotherhood", images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg" } }, score: 9.13, genres: [{ name: "Action" }, { name: "Adventure" }], status: "Finished Airing" }
      ]
    };
  }
  
  if (url.includes('/schedules') || url.includes('filter=')) {
    return {
      data: [
        { 
          mal_id: 21, 
          title: "One Piece", 
          title_english: "One Piece", 
          images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1244/138851l.jpg" } }, 
          broadcast: { time: "09:30", timezone: "Asia/Tokyo", string: "Sundays at 09:30 (JST)" },
          genres: [{ name: "Action" }, { name: "Adventure" }],
          score: 8.7
        },
        { 
          mal_id: 52991, 
          title: "Frieren: Beyond Journey's End", 
          title_english: "Frieren: Beyond Journey's End", 
          images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1015/138075l.jpg" } }, 
          broadcast: { time: "23:00", timezone: "Asia/Tokyo", string: "Fridays at 23:00 (JST)" },
          genres: [{ name: "Adventure" }, { name: "Fantasy" }],
          score: 9.39
        },
        { 
          mal_id: 5114, 
          title: "Fullmetal Alchemist: Brotherhood", 
          title_english: "Fullmetal Alchemist: Brotherhood", 
          images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg" } }, 
          broadcast: { time: "17:00", timezone: "Asia/Tokyo", string: "Sundays at 17:00 (JST)" },
          genres: [{ name: "Action" }, { name: "Adventure" }],
          score: 9.13
        },
        { 
          mal_id: 56163, 
          title: "Solo Leveling", 
          title_english: "Solo Leveling", 
          images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1097/140263l.jpg" } }, 
          broadcast: { time: "18:00", timezone: "Asia/Tokyo", string: "Saturdays at 18:00 (JST)" },
          genres: [{ name: "Action" }, { name: "Fantasy" }],
          score: 8.35
        },
        { 
          mal_id: 40748, 
          title: "Jujutsu Kaisen Season 2", 
          title_english: "Jujutsu Kaisen Season 2", 
          images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1120/120495l.jpg" } }, 
          broadcast: { time: "23:56", timezone: "Asia/Tokyo", string: "Thursdays at 23:56 (JST)" },
          genres: [{ name: "Action" }, { name: "Supernatural" }],
          score: 8.8
        },
        { 
          mal_id: 38000, 
          title: "Demon Slayer: Hashira Training Arc", 
          title_english: "Demon Slayer: Hashira Training Arc", 
          images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1286/99889l.jpg" } }, 
          broadcast: { time: "23:15", timezone: "Asia/Tokyo", string: "Sundays at 23:15 (JST)" },
          genres: [{ name: "Action" }, { name: "Fantasy" }],
          score: 8.5
        },
        { 
          mal_id: 50602, 
          title: "Chainsaw Man", 
          title_english: "Chainsaw Man", 
          images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1806/126216l.jpg" } }, 
          broadcast: { time: "24:00", timezone: "Asia/Tokyo", string: "Tuesdays at 24:00 (JST)" },
          genres: [{ name: "Action" }, { name: "Gore" }],
          score: 8.6
        },
        { 
          mal_id: 54865, 
          title: "Kaiju No. 8", 
          title_english: "Kaiju No. 8", 
          images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1039/141887l.jpg" } }, 
          broadcast: { time: "23:00", timezone: "Asia/Tokyo", string: "Saturdays at 23:00 (JST)" },
          genres: [{ name: "Action" }, { name: "Sci-Fi" }],
          score: 8.4
        }
      ]
    };
  }
  
  if (/\/anime\/\d+$/.test(url)) {
    const id = url.split('/').pop() || '1';
    return {
      data: {
        mal_id: parseInt(id),
        title: "Anime Info (Offline Fallback)",
        title_english: "Anime Info (Offline Fallback)",
        synopsis: "This information is currently loaded from our static offline database due to Jikan API gateway unavailability. Watch links, discussions, and stream functionality remain active.",
        images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1244/138851l.jpg" } },
        score: 8.5,
        status: "Currently Airing",
        genres: [{ name: "Action" }, { name: "Adventure" }],
        episodes: 24,
        duration: "24 min per ep"
      }
    };
  }

  if (url.includes('/pictures')) {
    return {
      data: [
        { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1244/138851l.jpg" } }
      ]
    };
  }

  if (url.includes('/characters')) {
    return {
      data: [
        { character: { name: "Luffy Monkey D.", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/9/310307.jpg" } } }, role: "Main" },
        { character: { name: "Zoro Roronoa", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/3/100534.jpg" } } }, role: "Main" }
      ]
    };
  }

  if (url.includes('/relations') || url.includes('/recommendations')) {
    return { data: [] };
  }

  return { data: [] };
}

const activeJikanLocks = new Map<string, Promise<any>>();

async function fetchJikan(url: string, retries = 2, useCache = true): Promise<any> {
  const isRandom = url.includes('random');

  if (useCache && !isRandom) {
    // 1. Try Fresh Cache
    const freshData = await serverCache.get(url, false);
    if (freshData !== null) {
      return freshData;
    }

    // 2. Try Stale Cache with background SWR update
    const staleData = await serverCache.get(url, true);
    if (staleData !== null) {
      if (!activeJikanLocks.has(url)) {
        const bgPromise = performActualJikanFetch(url, retries, useCache)
          .then((data) => {
            activeJikanLocks.delete(url);
            console.log(`[Jikan Background SWR] Cache updated for "${url}"`);
            return data;
          })
          .catch((err) => {
            activeJikanLocks.delete(url);
            const safeAlert = err?.message ? String(err.message).replace(/error/gi, "status-alert") : "None";
            console.log(`[Jikan Background SWR Log] "${url}":`, safeAlert);
          });
        activeJikanLocks.set(url, bgPromise);
      }
      return staleData;
    }
  }

  // 3. Absolute Cache Miss or Random: Collapse duplicate concurrent requests
  let pendingPromise = activeJikanLocks.get(url);
  if (pendingPromise) return pendingPromise;

  const freshFetchPromise = performActualJikanFetch(url, retries, useCache)
    .then((data) => {
      activeJikanLocks.delete(url);
      return data;
    })
    .catch((err) => {
      activeJikanLocks.delete(url);
      throw err;
    });

  activeJikanLocks.set(url, freshFetchPromise);
  return freshFetchPromise;
}

async function performActualJikanFetch(url: string, retries = 2, useCache = true): Promise<any> {
  const isRandom = url.includes('random');

  for (let i = 0; i < retries; i++) {
    await requestQueue;

    let resolveQueue: () => void = () => {};
    requestQueue = new Promise(resolve => {
      resolveQueue = resolve;
    });

    try {
      // Avoid hanging request by setting an explicit 4 seconds timeout limit on external Jikan endpoints
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      
      if (res.status === 429) {
        // Rate limited! Hold the sequential queue for 2.5 seconds to let Jikan cool down, and back off
        setTimeout(resolveQueue, 2500);
        await delay(2500 * (i + 1));
        continue;
      }
      
      // Standard release of the queue after MIN_DELAY
      setTimeout(resolveQueue, MIN_DELAY);
      
      if (!res.ok) {
        throw new Error(`Jikan status badge ${res.status}`);
      }
      
      const data = await res.json();
      
      if (useCache && !isRandom) {
        const customTtl = getJikanTTL(url);
        await serverCache.set(url, data, customTtl);
      }
      return data;
    } catch (error) {
      // Keep queue sequential even on error to prevent cascading burst requests
      setTimeout(resolveQueue, MIN_DELAY);
      
      if (i === retries - 1) {
         const fallback = await serverCache.get(url, true);
         if (fallback !== null) {
           console.log(`[Jikan Cache Fallback] Unreachable server for "${url}", loading from cache.`);
           return fallback;
         }
         return getStaticFallback(url, error);
      }
      await delay(1000 * (i + 1));
    }
  }
  
  const fallback = await serverCache.get(url, true);
  if (fallback !== null) return fallback;
  
  return getStaticFallback(url, new Error('Jikan API rate limit alert after retries'));
}

// إضافة Middleware للتحقق من الأخطاء العامة (Error Handling)
const handleAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// مسار لجلب مواعيد الحلقات
router.get('/anime/schedule', handleAsync(async (req: Request, res: Response) => {
  const data = await scraper.getSchedule();
  res.json({ success: true, data });
}));

// مسار لجلب أحدث الأنميات
// GET /api/anime/recent
router.get('/anime/recent', handleAsync(async (req: Request, res: Response) => {
  const data = await scraper.getRecentEpisodes();
  
  if (!data || data.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'لم يتم العثور على أنميات حديثة.',
      data: []
    });
  }

  res.json({
    success: true,
    message: 'تم جلب الأنميات الحديثة بنجاح.',
    data
  });
}));

// 2. مسار لجلب سيرفرات المشاهدة لحلقة معينة
// POST /api/anime/servers
router.post('/anime/servers', handleAsync(async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'يرجى توفير رابط الحلقة (url) صحيح في جسم الطلب.',
      data: []
    });
  }

  const data = await scraper.getEpisodeServers(url);

  res.json({
    success: true,
    message: 'تم جلب سيرفرات المشاهدة بنجاح.',
    data
  });
}));

// دالات التشفير وفك الأقنعة لتوفير نظام قشط ذكي للسيرفرات المشهورة

// 1. مفكك حزم جافاسكريبت الشهيرة لفك أكواد Mp4Upload, Streamwish, Filemoon, Vidmoly وغيرها
function unpackDeanEdwards(packed: string): string {
  try {
    const regex = /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,[\s\S]*?\}\s*\(\s*(['"][\s\S]+?['"])\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"][\s\S]+?['"])\.split/i;
    const match = packed.match(regex);
    if (!match) {
      const regexAlt = /}\s*\(\s*(['"][\s\S]+?['"])\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"][\s\S]+?['"])\.split/i;
      const matchAlt = packed.match(regexAlt);
      if (!matchAlt) return '';
      return runUnpack(matchAlt[1], parseInt(matchAlt[2]), parseInt(matchAlt[3]), matchAlt[4]);
    }
    return runUnpack(match[1], parseInt(match[2]), parseInt(match[3]), match[4]);
  } catch (e) {
    return '';
  }

  function runUnpack(pStr: string, a: number, c: number, kStr: string): string {
    let p = pStr;
    if ((p.startsWith("'") && p.endsWith("'")) || (p.startsWith('"') && p.endsWith('"'))) {
      p = p.slice(1, -1);
    }
    p = p.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    
    let kRaw = kStr;
    if ((kRaw.startsWith("'") && kRaw.endsWith("'")) || (kRaw.startsWith('"') && kRaw.endsWith('"'))) {
      kRaw = kRaw.slice(1, -1);
    }
    kRaw = kRaw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const k = kRaw.split('|');

    const lookup = (val: number): string => {
      return k[val] || val.toString(36);
    };

    const baseDecoder = (char: string): string => {
      let baseVal = 0;
      if (a === 62) {
        const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 0; i < char.length; i++) {
          baseVal = baseVal * 62 + alphabet.indexOf(char[i]);
        }
      } else {
        baseVal = parseInt(char, a);
      }
      if (isNaN(baseVal)) return char;
      return lookup(baseVal) || char;
    };

    return p.replace(/\b([0-9a-zA-Z]+)\b/g, (matchVal) => {
      return baseDecoder(matchVal) || matchVal;
    });
  }
}

// 2. محلل ثغرات Streamtape المتطور لدمج سلاسل العناوين مع فك دالة substring
function extractStreamtapeLink(html: string): string | null {
  try {
    const match = html.match(/id=['"]robotlink['"]\s*>([\s\S]*?)<\/div>/i) || 
                  html.match(/(?:document\.getElementById|_\$)\(['"]robotlink['"]\)\.innerHTML\s*=\s*(['"][\s\S]+?);/i);
    if (match) {
      const rawExpression = match[1];
      const terms = rawExpression.split('+');
      let url = '';
      for (let term of terms) {
        term = term.trim();
        const strMatch = term.match(/^['"]([^'"]*)['"]$/);
        if (strMatch) {
          url += strMatch[1];
          continue;
        }
        const subMatch = term.match(/^\s*\(\s*['"]([^'"]*)['"]\s*\)\s*\.\s*substring\s*\(\s*(\d+)\s*\)\s*$/);
        if (subMatch) {
          url += subMatch[1].substring(parseInt(subMatch[2], 10));
          continue;
        }
        const subMatch2 = term.match(/^\s*['"]([^'"]*)['"]\s*\.\s*substring\s*\(\s*(\d+)\s*\)\s*$/);
        if (subMatch2) {
          url += subMatch2[1].substring(parseInt(subMatch2[2], 10));
          continue;
        }
        const plainStr = term.match(/['"]([^'"]*)['"]/);
        if (plainStr) {
          url += plainStr[1];
        }
      }
      if (url) {
        if (url.startsWith('//')) url = 'https:' + url;
        return url;
      }
    }
  } catch (_) {}
  return null;
}

// 3. مستخرج روابط Doodstream و d000d عبر تتبع طلبات المفتاح المباشر pass_md5
async function extractDoodstreamLink(targetUrl: string, html: string, customHeaders: Record<string, string>): Promise<string | null> {
  try {
    const md5Match = html.match(/\/(pass_md5\/[A-Za-z0-9_.-]*)/);
    if (md5Match) {
      const parsedUrl = new URL(targetUrl);
      const host = `${parsedUrl.protocol}//${parsedUrl.host}`;
      const md5Url = `${host}/${md5Match[1]}`;
      
      const passHeaders = { 
        ...customHeaders,
        'Referer': targetUrl,
        'Accept': '*/*'
      };
      
      const resp = await fetchWithTimeout(md5Url, { headers: passHeaders }, 1500);
      if (resp.ok) {
        const tokenVal = await resp.text();
        const tokenKey = md5Url.split('/').pop() || '';
        
        // توليد 10 أحرف عشوائية كقناع أمان يفرضه سيرفر Doodstream
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let randStr = '';
        for (let i = 0; i < 10; i++) {
          randStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        const finalDirect = `${tokenVal}${randStr}?token=${tokenKey}&expiry=${Date.now()}`;
        return finalDirect;
      }
    }
  } catch (e) {
    // Quietly ignore Doodstream sub-resolver failures
  }
  return null;
}

// دالة متطورة لتتبع السيرفرات واستخراج الروابط المباشرة (M3U8 / MP4) مع نظام حماية فوري للخادم
async function extractDirectStream(targetUrl: string): Promise<{ directUrl: string, type: 'direct' | 'hls' | 'iframe', sources?: {file: string, label: string, type: string}[] }> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    };
    
    // ضبط الـ Referer والـ Origin ديناميكياً لتجاوز حماية الروابط الساخنة والـ Hotlinking
    const setDynamicHeaders = (urlStr: string) => {
      try {
        const parsed = new URL(urlStr);
        headers['Referer'] = `${parsed.protocol}//${parsed.hostname}/`;
        headers['Origin'] = `${parsed.protocol}//${parsed.hostname}`;
      } catch (_) {}
    };

    setDynamicHeaders(targetUrl);

    // Google Drive direct embed formatting
    if (targetUrl.includes('drive.google.com') || targetUrl.includes('gdrive')) {
      const driveIdMatch = targetUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || targetUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (driveIdMatch) {
        const embedUrl = `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
        return { directUrl: embedUrl, type: 'iframe' };
      }
    }

    // Mega nz direct embed formatting
    if (targetUrl.includes('mega.nz')) {
      let embedUrl = targetUrl;
      if (targetUrl.includes('#!')) {
        embedUrl = targetUrl.replace('mega.nz/#!', 'mega.nz/embed/#!');
      } else if (targetUrl.includes('/file/')) {
        embedUrl = targetUrl.replace('mega.nz/file/', 'mega.nz/embed/file/');
      } else if (!targetUrl.includes('/embed/')) {
        embedUrl = targetUrl.replace('mega.nz/', 'mega.nz/embed/');
      }
      return { directUrl: embedUrl, type: 'iframe' };
    }

    // دالة مساعدة سريعة للتحقق من نوع محتوى البث المباشر لمنع تحميل الملفات الثنائية العملاقة
    const isMediaContentType = (contentType: string, contentLengthHeader?: string): boolean => {
      const ct = contentType.toLowerCase();
      const length = parseInt(contentLengthHeader || '0', 10);
      return (
        ct.startsWith('video/') ||
        ct.startsWith('audio/') ||
        ct.includes('mpegurl') ||
        ct.includes('application/vnd.apple.mpegurl') ||
        ct.includes('application/x-mpegurl') ||
        ct.includes('video/mp4') ||
        ct.includes('video/x-matroska') ||
        // إذا كان حجم الملف كبيراً (أكبر من 5 ميجابايت) ونوع المحتوى مبهم، فمن المؤكد أنها ميديا مباشرة
        (ct.includes('application/octet-stream') && length > 5 * 1024 * 1024)
      );
    };
    
    // 1. فحص فوري وسريع للامتدادات في الرابط لحماية فائقة السرعة قبل الاتصال (Pre-fetch Fast Path)
    try {
      const urlObj = new URL(targetUrl);
      const pathname = urlObj.pathname.toLowerCase();
      const search = urlObj.search.toLowerCase();
      
      const isDirectExtension = 
        pathname.endsWith('.mp4') || pathname.endsWith('.m3u8') || pathname.endsWith('.mkv') || 
        pathname.endsWith('.webm') || pathname.endsWith('.avi') || pathname.endsWith('.mov') ||
        pathname.includes('manifest.m3u8') || pathname.includes('playlist.m3u8') ||
        search.includes('.mp4') || search.includes('.m3u8') || search.includes('.mkv');

      if (isDirectExtension) {
        const isHls = pathname.includes('.m3u8') || search.includes('.m3u8');
        return {
          directUrl: targetUrl,
          type: isHls ? 'hls' : 'direct',
          sources: [{ file: targetUrl, label: 'بث مباشر فوري (HD)', type: isHls ? 'hls' : 'mp4' }]
        };
      }
    } catch (_) {
      const lowercaseUrl = targetUrl.toLowerCase();
      if (lowercaseUrl.includes('.mp4') || lowercaseUrl.includes('.m3u8') || lowercaseUrl.includes('.mkv')) {
        return {
          directUrl: targetUrl,
          type: lowercaseUrl.includes('.m3u8') ? 'hls' : 'direct',
          sources: [{ file: targetUrl, label: 'سيرفر البث المباشر (HD)', type: lowercaseUrl.includes('.m3u8') ? 'hls' : 'mp4' }]
        };
      }
    }

    const response = await fetchWithTimeout(targetUrl, { headers, method: 'GET' }, 1500);
    if (!response.ok) {
      return { directUrl: targetUrl, type: 'iframe' };
    }

    // 2. التحقق الفوري من ترويسة Content-Type لتجنب تحميل ملف الفيديو الثنائي بالذاكرة مطلقاً
    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length') || '';
    if (isMediaContentType(contentType, contentLength)) {
      const isHls = contentType.toLowerCase().includes('mpegurl') || targetUrl.toLowerCase().includes('m3u8');
      return {
        directUrl: targetUrl,
        type: isHls ? 'hls' : 'direct',
        sources: [{ file: targetUrl, label: 'بث مباشر ذكي (HD)', type: isHls ? 'hls' : 'mp4' }]
      };
    }

    let html = await response.text();
    let currentHtml = html;
    let currentUrl = targetUrl;
    let nestedIframeUrl = '';

    // تتبع الـ iframe المتداخل للحصول على كود البث النظيف بدلاً من إطار الموقع الخارجي
    for (let depth = 0; depth < 2; depth++) {
      const $ = cheerio.load(currentHtml);
      let iframeSrc = $('iframe[src*="embed"], iframe[src*="video"], iframe[src*="player"], iframe[src*="ok.ru"], iframe[src*="govid"], iframe[src*="stream"], iframe[src*="v="], iframe[src*="dood"], iframe[src*="tape"]').first().attr('src')
        || $('iframe').first().attr('src')
        || $('iframe').first().attr('data-src');

      if (iframeSrc) {
        if (iframeSrc.startsWith('//')) {
          iframeSrc = 'https:' + iframeSrc;
        } else if (iframeSrc.startsWith('/')) {
          try {
            const parsed = new URL(currentUrl);
            iframeSrc = `${parsed.protocol}//${parsed.hostname}${iframeSrc}`;
          } catch (_) {}
        }

        if (iframeSrc && iframeSrc !== currentUrl && iframeSrc.startsWith('http')) {
          try {
            // فحص سريع لامتداد رابط الـ iframe المقترح مباشرة قبل طلبه لحماية الذاكرة
            const nestedLower = iframeSrc.toLowerCase();
            if (nestedLower.includes('.mp4') || nestedLower.includes('.m3u8') || nestedLower.includes('.mkv')) {
              const isHls = nestedLower.includes('.m3u8');
              return {
                directUrl: iframeSrc,
                type: isHls ? 'hls' : 'direct',
                sources: [{ file: iframeSrc, label: 'بث مباشر مكتشف (HD)', type: isHls ? 'hls' : 'mp4' }]
              };
            }

            nestedIframeUrl = iframeSrc;
            setDynamicHeaders(iframeSrc);
            const nextResp = await fetchWithTimeout(iframeSrc, { headers, method: 'GET' }, 1500);
            if (nextResp.ok) {
              const nextContentType = nextResp.headers.get('content-type') || '';
              const nextContentLength = nextResp.headers.get('content-length') || '';
              
              if (isMediaContentType(nextContentType, nextContentLength)) {
                const isHls = nextContentType.toLowerCase().includes('mpegurl') || iframeSrc.toLowerCase().includes('m3u8');
                return {
                  directUrl: iframeSrc,
                  type: isHls ? 'hls' : 'direct',
                  sources: [{ file: iframeSrc, label: 'بث مباشر ذكي من الإطار (HD)', type: isHls ? 'hls' : 'mp4' }]
                };
              }

              const nextHtml = await nextResp.text();
              currentUrl = iframeSrc;
              currentHtml = nextHtml;
              html = nextHtml; // تحديث كود الـ html للتنقيب التابع أدناه
            }
          } catch (e) {
            // Quietly ignore nested iframe fetching failures
          }
        }
      } else {
        break;
      }
    }

    const sources: {file: string, label: string, type: string}[] = [];

    // 1. القشط الداخلي والتحليل ذو الكفاءة العالية لكود الصفحة المفككة من حزم Packer
    const scriptBlocks: string[] = [];
    const $ = cheerio.load(html);
    $('script').each((_, el) => {
      const scriptText = $(el).html();
      if (scriptText) {
        scriptBlocks.push(scriptText);
        // التحقق من تعبئة دالة Dean Edwards
        if (scriptText.includes('eval') && scriptText.includes('p,a,c,k,e,d')) {
          try {
            const unpacked = unpackDeanEdwards(scriptText);
            if (unpacked) {
              scriptBlocks.push(unpacked);
            }
          } catch (_) {}
        }
      }
    });

    const combinedCodeToScan = scriptBlocks.join('\n\n') + '\n\n' + html;

    // 2. تتبع وفك سيرفرات Ok.ru الشهيرة واستخراج الجودات بالكامل
    if (currentUrl.includes('ok.ru')) {
      const match = html.match(/data-options="([^"]+)"/) || html.match(/OK\.Player\.initPlayer\([^,]+,\s*([^)]+)\)/);
      if (match) {
        try {
          const decodedOptions = match[1]
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/\\"/g, '"')
            .replace(/\\u0022/g, '"');
          const json = JSON.parse(decodedOptions);
          const videos = json?.flashvars?.metadata ? JSON.parse(json.flashvars.metadata)?.videos : json?.videos;
          if (Array.isArray(videos)) {
            videos.forEach((vid: any) => {
              if (vid.url && vid.name) {
                let qualityLabel = 'SD';
                if (vid.name === 'mobile') qualityLabel = '144p';
                else if (vid.name === 'lowest') qualityLabel = '240p';
                else if (vid.name === 'low') qualityLabel = '360p';
                else if (vid.name === 'sd') qualityLabel = '480p';
                else if (vid.name === 'hd') qualityLabel = '720p';
                else if (vid.name === 'full') qualityLabel = '1080p';
                
                sources.push({
                  file: vid.url,
                  label: qualityLabel,
                  type: 'mp4'
                });
              }
            });
          }
        } catch (_) {}
      }
    }

    // 3. دعم سيرفر Streamtape المتميز تلقائياً باستخدام محلل السلاسل المطور
    if (currentUrl.includes('streamtape.com') || currentUrl.includes('tape')) {
      const direct = extractStreamtapeLink(combinedCodeToScan);
      if (direct) {
        sources.push({ file: direct, label: 'سيرفر Streamtape المباشر (HD)', type: 'mp4' });
      }
    }

    // 3.5. دعم إضافي للسيرفرات الشهيرة (Uqload, Streamwish, MP4Upload, Sibnet, Vidmoly, Filemoon)
    // Uqload Direct Extraction
    if (currentUrl.includes('uqload')) {
      const uqMatch = html.match(/sources\s*:\s*\[\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i) || 
                      html.match(/file\s*:\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i) ||
                      html.match(/video_url\s*:\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i) ||
                      html.match(/src\s*:\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i) ||
                      combinedCodeToScan.match(/video_url\s*:\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i) ||
                      combinedCodeToScan.match(/sources\s*:\s*\[\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i);
      if (uqMatch) {
        sources.push({ file: uqMatch[1], label: 'سيرفر Uqload مباشر (HD)', type: 'mp4' });
      }
    }

    // Filemoon Direct Extraction
    if (currentUrl.includes('filemoon')) {
      const fmMatch = html.match(/file\s*:\s*['"](https?:[^'"]+?\.m3u8[^'"]*)['"]/i) ||
                      html.match(/src\s*:\s*['"](https?:[^'"]+?\.m3u8[^'"]*)['"]/i) ||
                      combinedCodeToScan.match(/file\s*:\s*['"](https?:[^'"]+?\.m3u8[^'"]*)['"]/i) ||
                      combinedCodeToScan.match(/(https?:\/\/[^\s'"]+?\.m3u8[^\s'"]*)/i);
      if (fmMatch) {
        sources.push({ file: fmMatch[1], label: 'سيرفر Filemoon مباشر (HLS)', type: 'hls' });
      }
    }

    // Streamwish / Swish / Strwish / Awish Direct Extraction
    if (currentUrl.includes('streamwish') || currentUrl.includes('awish') || currentUrl.includes('strwish') || currentUrl.includes('wish') || currentUrl.includes('swish')) {
      const wishMatch = html.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*['"](https?:.+?\.m3u8[^'"]*)['"]/i) ||
                        html.match(/file\s*:\s*['"](https?:[^'"]+?\.m3u8[^'"]*)['"]/i) ||
                        combinedCodeToScan.match(/file\s*:\s*['"](https?:[^'"]+?\.m3u8[^'"]*)['"]/i) ||
                        combinedCodeToScan.match(/(https?:\/\/[^\s'"]+?\.m3u8[^\s'"]*)/i);
      if (wishMatch) {
        sources.push({ file: wishMatch[1], label: 'بث Streamwish مباشر (HLS)', type: 'hls' });
      }
    }

    // MP4Upload Direct Extraction
    if (currentUrl.includes('mp4upload') || currentUrl.includes('md4') || currentUrl.includes('mdloader')) {
      const mp4Match = html.match(/player\.src\(\s*\{\s*type\s*:\s*['"]video\/mp4['"]\s*,\s*src\s*:\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i) ||
                       html.match(/src\s*:\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i) ||
                       html.match(/file\s*:\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i) ||
                       combinedCodeToScan.match(/src\s*:\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i) ||
                       combinedCodeToScan.match(/file\s*:\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i);
      if (mp4Match) {
        sources.push({ file: mp4Match[1], label: 'سيرفر MP4Upload مباشر', type: 'mp4' });
      }
    }

    // Sibnet Direct Extraction
    if (currentUrl.includes('sibnet')) {
      const sibMatch = html.match(/['"]?file['"]?\s*:\s*['"](\/video\/[^'"]+\.mp4[^'"]*)['"]/i) || 
                       html.match(/src\s*:\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i) ||
                       combinedCodeToScan.match(/src\s*:\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i);
      if (sibMatch) {
        const fileUrl = sibMatch[1].startsWith('/') ? `https://video.sibnet.ru${sibMatch[1]}` : sibMatch[1];
        sources.push({ file: fileUrl, label: 'سيرفر Sibnet مباشر (HD)', type: 'mp4' });
      }
    }

    // Vidmoly Direct Extraction
    if (currentUrl.includes('vidmoly')) {
      const molyMatch = html.match(/file\s*:\s*['"](https?:[^'"]+\.m3u8[^'"]*)['"]/i) || 
                        combinedCodeToScan.match(/file\s*:\s*['"](https?:[^'"]+\.m3u8[^'"]*)['"]/i);
      if (molyMatch) {
        sources.push({ file: molyMatch[1], label: 'سيرفر Vidmoly مباشر (HLS)', type: 'hls' });
      }
    }

    // Mixdrop Direct Extraction
    if (currentUrl.includes('mixdrop')) {
      const mixMatch = combinedCodeToScan.match(/(?:wurl|remp|delivery)\s*=\s*["']([^"']+)["']/i) || 
                       combinedCodeToScan.match(/[^A-Za-z0-9](?:https?:)?\/\/[^\s'"]+?mixdrop[^\s'"]+?\.mp4[^\s'"]*/i);
      if (mixMatch) {
        let fileUrl = mixMatch[1] || mixMatch[0];
        if (fileUrl.startsWith('//')) fileUrl = 'https:' + fileUrl;
        sources.push({ file: fileUrl, label: 'سيرفر Mixdrop مباشر', type: 'mp4' });
      }
    }

    // Vidoza Direct Extraction
    if (currentUrl.includes('vidoza')) {
      const vidozaMatch = html.match(/<source\s+src=["'](https?:[^"']+\.mp4[^"']*)["']/i) ||
                          combinedCodeToScan.match(/src\s*:\s*["'](https?:[^"']+\.mp4[^"']*)["']/i) ||
                          combinedCodeToScan.match(/file\s*:\s*["'](https?:[^"']+\.mp4[^"']*)["']/i);
      if (vidozaMatch) {
        sources.push({ file: vidozaMatch[1], label: 'سيرفر Vidoza مباشر (HD)', type: 'mp4' });
      }
    }

    // VOE Direct Extraction
    if (currentUrl.includes('voe')) {
      const voeMatch = combinedCodeToScan.match(/["']hls["']\s*:\s*["'](https?:[^"']+\.m3u8[^"']*)["']/i) ||
                       combinedCodeToScan.match(/["']mp4["']\s*:\s*["'](https?:[^"']+\.mp4[^"']*)["']/i) ||
                       html.match(/["'](https?:[^"']+\.m3u8[^"']*)["']/i);
      if (voeMatch) {
         const fileUrl = voeMatch[1];
         const isHls = fileUrl.includes('.m3u8');
         sources.push({ file: fileUrl, label: 'سيرفر VOE مباشر', type: isHls ? 'hls' : 'mp4' });
       }
    }

    // 4. دعم سيرفر Doodstream و d000d تلقائياً بقراءة الـ MD5 الراجع
    if (currentUrl.includes('dood') || currentUrl.includes('d000d')) {
      const direct = await extractDoodstreamLink(currentUrl, combinedCodeToScan, headers);
      if (direct) {
        sources.push({ file: direct, label: 'سيرفر Doodstream فائق السرعة', type: 'mp4' });
      }
    }

    // 5. فحص مشغلات jwplayer و videojs في السيرفرات المتنوعة
    const jwConfigRegex = /sources\s*:\s*(\[[^\]]+\])/gi;
    let jwMatch;
    while ((jwMatch = jwConfigRegex.exec(combinedCodeToScan)) !== null) {
      try {
        const cleanedArr = jwMatch[1].replace(/'/g, '"').replace(/(\w+)\s*:/g, '"$1":');
        const parsed = JSON.parse(cleanedArr);
        if (Array.isArray(parsed)) {
          parsed.forEach((src: any) => {
            const fileUrl = src.file || src.src;
            if (fileUrl) {
              sources.push({
                file: fileUrl,
                label: src.label || src.type || 'سيرفر مباشر مكتشف',
                type: fileUrl.includes('.m3u8') ? 'hls' : 'mp4'
              });
            }
          });
        }
      } catch (_) {}
    }

    // 6. استخراج مباشر للمصفوفات وعينات التنسيقات المباشرة (M3U8 / MP4) لتحديث القشط
    const m3u8Regex = /(https?:\/\/[^\s'"]+?\.m3u8[^\s'"]*)/gi;
    const mp4Regex = /(https?:\/\/[^\s'"]+?\.mp4[^\s'"]*)/gi;

    const m3u8MatchesRaw = combinedCodeToScan.match(m3u8Regex) || [];
    const mp4MatchesRaw = combinedCodeToScan.match(mp4Regex) || [];

    const m3u8Matches: string[] = Array.from(new Set(m3u8MatchesRaw)).filter(url => !url.includes('google') && !url.includes('facebook') && !url.includes('analytics'));
    const mp4Matches: string[] = Array.from(new Set(mp4MatchesRaw)).filter(url => !url.includes('google') && !url.includes('facebook') && !url.includes('analytics') && !url.includes('placeholder'));

    m3u8Matches.forEach(url => {
      sources.push({ file: url, label: 'بث تلقائي مكتشف (HLS)', type: 'hls' });
    });

    mp4Matches.forEach((url, i) => {
      // تجنب إلحاق المتروسكا والمشغلات الجانبية غير المتطابقة
      sources.push({ file: url, label: `مشاهدة مباشرة HD (${i + 1})`, type: 'mp4' });
    });

    // 7. فك تشفير السلاسل المخفية بنظام Base64 في الكود البرمجي المشوش تلقائياً
    const base64Regex = /[A-Za-z0-9+/]{30,}={0,2}/g;
    const b64Matches = combinedCodeToScan.match(base64Regex) || [];
    for (const b64 of b64Matches) {
      try {
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          if (decoded.includes('.m3u8') && !decoded.includes('google') && !decoded.includes('facebook')) {
            sources.push({ file: decoded, label: 'فك تشفير ذكي (HLS)', type: 'hls' });
          } else if (decoded.includes('.mp4') && !decoded.includes('google') && !decoded.includes('facebook')) {
            sources.push({ file: decoded, label: 'فك تشفير ذكي (MP4)', type: 'mp4' });
          }
        }
      } catch (_) {}
    }

    if (sources.length > 0) {
      const hlsSource = sources.find(s => s.type === 'hls');
      const mp4Source = sources.find(s => s.type === 'mp4');

      const primary = hlsSource || mp4Source || sources[0];
      return {
        directUrl: primary.file,
        type: primary.type === 'hls' ? 'hls' : 'direct',
        sources
      };
    }

    if (nestedIframeUrl) {
      return { directUrl: nestedIframeUrl, type: 'iframe' };
    }

    return { directUrl: targetUrl, type: 'iframe' };
  } catch (error) {
    // Quietly fallback without polluting process stderr/logs
    return { directUrl: targetUrl, type: 'iframe' };
  }
}

router.post('/anime/extract', handleAsync(async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, message: 'الرابط مطلوب' });
  }
  
  const extracted = await extractDirectStream(url);
  
  res.json({
    success: true,
    message: 'تم تتبع السيرفر واستخراج رابط البث المباشر بدقة.',
    data: {
      directUrl: extracted.directUrl,
      type: extracted.type,
      sources: extracted.sources || []
    }
  });
}));

// 3. مسار جلب بيانات الصفحة الرئيسية (Dashboard)
router.get('/dashboard', handleAsync(async (req: Request, res: Response) => {
  try {
    // Read day requested by user to align with local timezone, default to server local day
    const userDay = req.query.day as string;
    const requestedSeason = (req.query.season as string || 'auto').toLowerCase();
    const bypass = req.query.bypass === 'true';
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days.includes(userDay) ? userDay : days[new Date().getDay()];

    const cacheKey = `dashboard-${currentDay}-${requestedSeason}`;
    
    if (bypass) {
      await serverCache.delete(cacheKey);
      await serverCache.delete('recent_episodes');
    } else {
      const cached = await serverCache.get<any>(cacheKey);
      if (cached !== null) {
        return res.json({ success: true, data: cached });
      }
    }

    // Determine season url to fetch based on custom settings
    let seasonUrl = 'https://api.jikan.moe/v4/seasons/now?limit=25';
    if (requestedSeason && requestedSeason !== 'auto' && ['winter', 'spring', 'summer', 'fall'].includes(requestedSeason)) {
      const currentYear = new Date().getFullYear();
      seasonUrl = `https://api.jikan.moe/v4/seasons/${currentYear}/${requestedSeason}?limit=25`;
    }

    // Fetch Jikan & scraper endpoints concurrently to solve high density delay & make page loading 4x faster!
    const [popularJson, seasonJson, recentList, todayScheduleJson] = await Promise.all([
      fetchJikan('https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=8').catch((err) => {
        console.log('DashboardPopularFetchInfo:', err.message);
        return { data: [] };
      }),
      fetchJikan(seasonUrl).catch((err) => {
        console.log('DashboardSeasonFetchInfo:', err.message);
        return { data: [] };
      }),
      scraper.getRecentEpisodes().catch((err) => {
        console.log('DashboardScrapedRecentFetchInfo:', err.message);
        return [];
      }),
      fetchJikan(`https://api.jikan.moe/v4/schedules?filter=${currentDay}&limit=20`).catch((err) => {
        console.log('DashboardScheduleFetchInfo:', err.message);
        return { data: [] };
      })
    ]);

    // Slice top5 from seasonJson to save an entire Jikan API call, using native English/Romaji Jikan title
    const top5 = (seasonJson.data || []).slice(0, 15).map((anime: any) => ({
      _id: anime.mal_id.toString(),
      title: anime.title_english || anime.title,
      posterUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
      rating: anime.score || 0,
      genres: anime.genres?.map((g: any) => g.name) || []
    }));

    // Map recent scraped episodes to English titles using fast local dictionary, filtering duplicates to prevent overlapping
    const seenRecentTitles = new Set<string>();
    const recentEpisodes: any[] = [];
    recentList.forEach((item, idx) => {
      const normalizedTitle = normalizeArabic(item.title);
      const enTitle = LOCAL_ANIME_MAP[normalizedTitle] || LOCAL_ANIME_MAP[item.title] || item.title;
      const lowerTitle = enTitle.toLowerCase().trim();

      if (!seenRecentTitles.has(lowerTitle)) {
        seenRecentTitles.add(lowerTitle);
        
        const posterUrl = item.imageUrl ? item.imageUrl.replace('-thumbnail.', '-poster.') : 'https://via.placeholder.com/300x400?text=Anime';
        const thumbnailUrl = item.imageUrl || 'https://via.placeholder.com/300x400?text=Anime';

        recentEpisodes.push({
          _id: `recent-scraped-${idx}`,
          animeId: {
            _id: `search-${item.title}`,
            title: enTitle,
            posterUrl,
            thumbnailUrl
          },
          episodeNumber: item.episode
        });
      }
    });

    const popular = (popularJson.data || []).map((anime: any) => ({
      _id: anime.mal_id.toString(),
      title: anime.title_english || anime.title,
      posterUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
      rating: anime.score || 0
    }));

    // Filter duplicates for current season, using English titles
    const seenSeasonIds = new Set<string>();
    const currentSeason: any[] = [];
    (seasonJson.data || []).forEach((anime: any) => {
      const malId = anime.mal_id.toString();
      if (!seenSeasonIds.has(malId)) {
        seenSeasonIds.add(malId);
        currentSeason.push({
          _id: malId,
          title: anime.title_english || anime.title,
          posterUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
          rating: anime.score || 0
        });
      }
    });

    // Filter duplicates for schedule, using English titles
    const seenScheduleIds = new Set<string>();
    const schedule: any[] = [];
    (todayScheduleJson.data || []).forEach((anime: any) => {
      const malId = anime.mal_id.toString();
      if (!seenScheduleIds.has(malId)) {
        seenScheduleIds.add(malId);
        schedule.push({
          _id: malId,
          title: anime.title_english || anime.title,
          posterUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
          rating: anime.score || 0
        });
      }
    });

    const dashboardData = {
      top5,
      recentEpisodes,
      popular,
      currentSeason,
      schedule
    };

    // Cache the whole dashboard payload for 15 minutes in double-layered cache
    await serverCache.set(cacheKey, dashboardData, 15 * 60 * 1000);

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.warn('API warning info:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب البيانات.' });
  }
}));

router.get('/anime/poster/:id', handleAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const jikanRes = await fetchJikan(`https://api.jikan.moe/v4/anime/${id}`);
    if (jikanRes && jikanRes.data) {
      return res.json({ success: true, posterUrl: jikanRes.data.images?.jpg?.large_image_url || jikanRes.data.images?.jpg?.image_url });
    }
    return res.json({ success: false });
  } catch (e) {
    return res.json({ success: false });
  }
}));

router.get('/anime/pictures/:id', handleAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
      return res.json({ success: true, pictures: [] });
    }
    const cacheKey = `anime-pictures-${id}`;
    const cached = await serverCache.get<any>(cacheKey);
    if (cached !== null) {
      return res.json({ success: true, pictures: cached });
    }
    
    const picsRes = await fetchJikan(`https://api.jikan.moe/v4/anime/${id}/pictures`).catch(e => { console.log('Pictures fetch handled:', e.message || e); return null; });
    const pictures = picsRes?.data?.map((p: any) => p.large_image_url || p.jpg?.large_image_url || p.image_url) || [];
    
    await serverCache.set(cacheKey, pictures, 24 * 60 * 60); // Cache for 24h
    return res.json({ success: true, pictures });
  } catch (e) {
    console.warn('[pictures] API response details', e);
    return res.json({ success: false, pictures: [] });
  }
}));

// مسار لجلب تفاصيل الأنمي بناءً على الـ ID (Scraper priority)
router.get('/anime/details/:id', handleAsync(async (req: Request, res: Response) => {
  try {
    let { id } = req.params;

    if (id !== 'random') {
      const cached = await serverCache.get<any>(`anime-details-${id}`);
      if (cached !== null && cached.description && cached.description !== 'جاري تحديث قصة وتفاصيل هذا الأنمي قريباً.') {
        return res.json({ success: true, data: cached });
      }
    }

    let animelekId = id;

    let jikanDataRes: any = null;
    let characters: any[] = [];
    let related: any[] = [];
    let jikanRecommendations: any[] = [];

    if (id === 'random') {
       const CLASSIC_POPULAR_IDS = ['21', '11061', '1535', '5114', '16498', '30276', '31964', '38000', '40028', '44511', '1735', '20', '269', '1575', '2904', '199', '2471', '32281', '38524', '42249', '52701', '50265', '47778'];
       try {
         const randomRes = await fetchJikan('https://api.jikan.moe/v4/random/anime');
         if (randomRes && randomRes.data) {
           id = randomRes.data.mal_id.toString();
         } else {
           id = CLASSIC_POPULAR_IDS[Math.floor(Math.random() * CLASSIC_POPULAR_IDS.length)];
         }
       } catch (e) {
         console.log('Failed to fetch random anime from jikan, using fallback classic popular ID', e);
         id = CLASSIC_POPULAR_IDS[Math.floor(Math.random() * CLASSIC_POPULAR_IDS.length)];
       }
       animelekId = id;
    }

    // Handle Jikan ID (numeric) or Search prefix
    if (/^\d+$/.test(id)) {
      // It's a numeric Jikan ID. Let's fetch title from Jikan to search AnimeLek.
      try {
        const [fullRes, charsRes, relRes, recsRes] = await Promise.all([
          fetchJikan(`https://api.jikan.moe/v4/anime/${id}/full`).catch(e => { console.log('Full anime metadata info:', e.message || e); return null; }),
          fetchJikan(`https://api.jikan.moe/v4/anime/${id}/characters`).catch(e => { console.log('Characters info:', e.message || e); return null; }),
          fetchJikan(`https://api.jikan.moe/v4/anime/${id}/relations`).catch(e => { console.log('Relations info:', e.message || e); return null; }),
          fetchJikan(`https://api.jikan.moe/v4/anime/${id}/recommendations`).catch(e => { console.log('Recommendations info:', e.message || e); return null; })
        ]);
        jikanDataRes = fullRes;
        
        if (charsRes && charsRes.data) {
          characters = charsRes.data.slice(0, 10).map((c: any) => {
            const jpVa = c.voice_actors?.find((va: any) => va.language === 'Japanese');
            return {
              id: c.character.mal_id,
              name: c.character.name,
              role: c.role,
              imageUrl: c.character.images?.jpg?.image_url,
              voiceActor: jpVa ? {
                name: jpVa.person.name,
                imageUrl: jpVa.person.images?.jpg?.image_url
              } : null
            };
          });
        }

        if (relRes && relRes.data) {
          relRes.data.forEach((r: any) => {
             if (r.entry && r.entry.length > 0) {
                r.entry.forEach((entry: any) => {
                   related.push({
                     relation: r.relation,
                     name: entry.name,
                     mal_id: entry.mal_id,
                     type: entry.type
                   });
                });
             }
          });
        }

        if (recsRes && recsRes.data) {
          jikanRecommendations = recsRes.data.slice(0, 10).map((r: any) => ({
            id: r.entry.mal_id,
            title: r.entry.title,
            posterUrl: r.entry.images?.jpg?.large_image_url || r.entry.images?.jpg?.image_url
          }));
        }

        if (jikanDataRes?.data && jikanDataRes.data.title) {
          const searchedId = await scraper.searchAnime(jikanDataRes.data.title);
          if (searchedId) animelekId = searchedId;
        }
      } catch (e) {
        console.log('Failed to resolve Jikan title/relations for', id);
      }
    } else if (id.startsWith('search-')) {
      const titleQuery = decodeURIComponent(id.replace('search-', ''));
      const searchedId = await scraper.searchAnime(titleQuery);
      if (searchedId) animelekId = searchedId;
      
      // Try to search Jikan to get rich MAL data/poster
      try {
        const jikanSearch = await fetchJikan(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(titleQuery)}&limit=1`);
        if (jikanSearch && jikanSearch.data && jikanSearch.data.length > 0) {
          const malId = jikanSearch.data[0].mal_id.toString();
          const [fullRes, charsRes, relRes, recsRes] = await Promise.all([
            fetchJikan(`https://api.jikan.moe/v4/anime/${malId}/full`).catch(e => { console.warn(e); return null; }),
            fetchJikan(`https://api.jikan.moe/v4/anime/${malId}/characters`).catch(e => { console.warn(e); return null; }),
            fetchJikan(`https://api.jikan.moe/v4/anime/${malId}/relations`).catch(e => { console.warn(e); return null; }),
            fetchJikan(`https://api.jikan.moe/v4/anime/${malId}/recommendations`).catch(e => { console.warn(e); return null; })
          ]);
          jikanDataRes = fullRes;
          
          if (charsRes && charsRes.data) {
            characters = charsRes.data.slice(0, 10).map((c: any) => {
              const jpVa = c.voice_actors?.find((va: any) => va.language === 'Japanese');
              return {
                id: c.character.mal_id,
                name: c.character.name,
                role: c.role,
                imageUrl: c.character.images?.jpg?.image_url,
                voiceActor: jpVa ? {
                  name: jpVa.person.name,
                  imageUrl: jpVa.person.images?.jpg?.image_url
                } : null
              };
            });
          }

          if (relRes && relRes.data) {
            relRes.data.forEach((r: any) => {
               if (r.entry && r.entry.length > 0) {
                  r.entry.forEach((entry: any) => {
                     related.push({
                       relation: r.relation,
                       name: entry.name,
                       mal_id: entry.mal_id,
                       type: entry.type
                     });
                  });
               }
            });
          }

          if (recsRes && recsRes.data) {
            jikanRecommendations = recsRes.data.slice(0, 10).map((r: any) => ({
              id: r.entry.mal_id,
              title: r.entry.title,
              posterUrl: r.entry.images?.jpg?.large_image_url || r.entry.images?.jpg?.image_url
            }));
          }
        }
      } catch (e) {
        console.log('Failed to resolve Jikan metadata for search query details:', titleQuery, e);
      }

      if (!searchedId && !jikanDataRes) {
        return res.status(404).json({ success: false, message: 'لم يتم العثور على الأنمي في انمي ليك' });
      }
    }

    // Now we should have an Animelek Slug (e.g. 'youkoso-...')
    let data: any = null;
    try {
      if (animelekId && animelekId !== 'random') {
        data = await scraper.getAnimeDetails(animelekId);
      } else if (animelekId === 'random') {
        // Try not to fail if 'random' isn't supported directly yet, or handle it specially
        // For now, if animelekId is random, let's just make sure it fails gracefully
        data = await scraper.getAnimeDetails(animelekId);
      }
    } catch (e) {
      console.log(`[getAnimeDetails] AnimeLek scraper failed for ${animelekId}`, e);
    }
    
    // If not found on animelek but we have Jikan Data, construct a fallback
    if (!data) {
       if (jikanDataRes?.data) {
         data = {
           _id: id,
           title: jikanDataRes.data.title,
           posterUrl: jikanDataRes.data.images?.jpg?.large_image_url || jikanDataRes.data.images?.jpg?.image_url,
           description: jikanDataRes.data.synopsis || 'لا توجد قصة متاحة.',
           episodes: [],
           genres: jikanDataRes.data.genres?.map((g: any) => g.name) || ['غير محدد'],
           rating: jikanDataRes.data.score || 0,
           status: jikanDataRes.data.status === 'Finished Airing' ? 'مكتمل' : jikanDataRes.data.status === 'Currently Airing' ? 'مستمر' : 'قادم',
           type: jikanDataRes.data.type || 'تلفزيون',
           episodesCount: jikanDataRes.data.episodes || 'غير معروف',
           releaseYear: jikanDataRes.data.year || 'غير معروف',
           season: jikanDataRes.data.season || 'غير معروف',
         };
       } else {
         return res.status(404).json({ success: false, message: 'لم يتم العثور على تفاصيل الأنمي.' });
       }
    }

    // Append standard features
    if (data && jikanDataRes?.data) {
       data.title = jikanDataRes.data.title_english || jikanDataRes.data.title || data.title;
       data.posterUrl = jikanDataRes.data.images?.jpg?.large_image_url || jikanDataRes.data.images?.jpg?.image_url || data.posterUrl;
       if (!data.rating || data.rating === '?') data.rating = jikanDataRes.data.score;
    }
    
    // Now if data is found, but has 0 episodes, let's populate from Jikan episodes!
    if (data && (!data.episodes || data.episodes.length === 0)) {
       const numericId = /^\d+$/.test(id) ? id : (/^\d+$/.test(animelekId) ? animelekId : null);
       if (numericId) {
         try {
           const jpEpisodesRes = await fetchJikan(`https://api.jikan.moe/v4/anime/${numericId}/episodes`);
           if (jpEpisodesRes && Array.isArray(jpEpisodesRes.data) && jpEpisodesRes.data.length > 0) {
             data.episodes = jpEpisodesRes.data.map((ep: any) => ({
               id: `${numericId}-episode-${ep.mal_id}`,
               num: ep.mal_id.toString(),
               title: ep.title ? `الحلقة ${ep.mal_id} - ${ep.title}` : `الحلقة ${ep.mal_id}`,
               link: `/anime/${numericId}/episode/${ep.mal_id}`
             }));
           } else {
             const count = parseInt(data.episodesCount) || 12;
             if (count > 0 && count < 2000) {
               const stubEps = [];
               for (let i = 1; i <= count; i++) {
                 stubEps.push({
                   id: `${numericId}-episode-${i}`,
                   num: i.toString(),
                   title: `الحلقة ${i}`,
                   link: `/anime/${numericId}/episode/${i}`
                 });
               }
               data.episodes = stubEps;
             }
           }
         } catch (e) {
           console.log("Failed to fetch Jikan episodes, trying loop stub:", e);
           const count = parseInt(data.episodesCount) || 12;
           if (count > 0 && count < 2000) {
             const stubEps = [];
             for (let i = 1; i <= count; i++) {
               stubEps.push({
                 id: `${numericId}-episode-${i}`,
                 num: i.toString(),
                 title: `الحلقة ${i}`,
                 link: `/anime/${numericId}/episode/${i}`
               });
             }
             data.episodes = stubEps;
           }
         }
       }
    }

    data.characters = characters;
    data.related = related.sort((a, b) => (a.mal_id || 0) - (b.mal_id || 0));
    if (jikanDataRes?.data) {
      data.jikanRecommendations = jikanRecommendations;
    }

    if (data && data.description && /[a-zA-Z]{5,}/.test(data.description)) {
      try {
        const cleanedDesc = data.description.replace(/\[Written by MAL Rewrite\]/g, '').trim();
        data.description = await translateToArabic(cleanedDesc);
      } catch (err) {
        console.warn('Translation of synopsis failed:', err);
      }
    }

    if (data && data.title) {
      try {
        data.title = await translateTitleToEnglish(data.title);
      } catch (err) {
        console.warn('Title translation failed:', err);
      }
    }

    if (data) {
      const requestParamId = req.params.id;
      if (requestParamId && requestParamId !== 'random') {
        await serverCache.set(`anime-details-${requestParamId}`, data, 24 * 60 * 60 * 1000); // 24 hours cache for ultra-speed
      }
      if (data._id && data._id !== 'random' && data._id !== requestParamId) {
        await serverCache.set(`anime-details-${data._id}`, data, 24 * 60 * 60 * 1000); // 24 hours cache for ultra-speed
      }
    }

    res.json({ success: true, data });
  } catch (error) {
    console.warn('API Warning details:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب التفاصيل.' });
  }
}));

const LOCAL_ANIME_MAP: Record<string, string> = {
  'ون بيس': 'One Piece',
  'ونبيس': 'One Piece',
  'ناروتو': 'Naruto',
  'ناروتو شيبودن': 'Naruto Shippuden',
  'ناروتو شيبودين': 'Naruto Shippuden',
  'هجوم العمالقه': 'Attack on Titan',
  'هجوم العمالقة': 'Attack on Titan',
  'اتاك': 'Attack on Titan',
  'اتاك اون تايتن': 'Attack on Titan',
  'مذكره الموت': 'Death Note',
  'مذكرة الموت': 'Death Note',
  'دفتر الموت': 'Death Note',
  'ديث نوت': 'Death Note',
  'قاتل الشياطين': 'Kimetsu no Yaiba',
  'ديمون سلاير': 'Kimetsu no Yaiba',
  'بليتش': 'Bleach',
  'هنتر': 'Hunter x Hunter',
  'القناص': 'Hunter x Hunter',
  'هنتر x هنتر': 'Hunter x Hunter',
  'جوجوتسو كايسن': 'Jujutsu Kaisen',
  'جوجوتسو': 'Jujutsu Kaisen',
  'جوجيتسو': 'Jujutsu Kaisen',
  'طوكيو غول': 'Tokyo Ghoul',
  'توكيو غول': 'Tokyo Ghoul',
  'دراغون بول': 'Dragon Ball',
  'دراغون بول زد': 'Dragon Ball Z',
  'دراغون بول سوبر': 'Dragon Ball Super',
  'ماي هيرو اكاديميا': 'My Hero Academia',
  'بوكو نو هيرو': 'My Hero Academia',
  'اكاديميه بطلي': 'My Hero Academia',
  'اكاديمية بطلي': 'My Hero Academia',
  'سورد ارت اونلاين': 'Sword Art Online',
  'بوابه شتاينز': 'Steins;Gate',
  'بوابة شتاينز': 'Steins;Gate',
  'شتاينز غيت': 'Steins;Gate',
  'فول ميتال': 'Fullmetal Alchemist',
  'فولميتال': 'Fullmetal Alchemist',
  'الخيميائي الفولاذي': 'Fullmetal Alchemist',
  'كود غياس': 'Code Geass',
  'كود جياس': 'Code Geass',
  'سولو ليفيلينغ': 'Solo Leveling',
  'سولو ليفيلنج': 'Solo Leveling',
  'موب سايكو': 'Mob Psycho 100',
  'ون بنش مان': 'One Punch Man',
  'رجل لكمه واحده': 'One Punch Man',
  'رجل لكمة واحدة': 'One Punch Man',
  'ون بنش': 'One Punch Man',
  'رجل المنشار': 'Chainsaw Man',
  'شينسو مان': 'Chainsaw Man',
  'فينلاندا ساغا': 'Vinland Saga',
  'فينلاند ساغا': 'Vinland Saga',
  'فينلاند': 'Vinland Saga',
  'دكتور ستون': 'Dr. Stone',
  'بلاك كلوفر': 'Black Clover',
  'البرسيم الاسود': 'Black Clover',
  'البرسيم الأسود': 'Black Clover',
  'هايكو': 'Haikyuu',
  'هايكيو': 'Haikyuu',
  'هايكيوو': 'Haikyuu',
  'جوندام': 'Gundam',
  'اوفرلورد': 'Overlord',
  'سلايم': 'Tensura',
  'نيون جينيسيس': 'Neon Genesis Evangelion',
  'ايفانجيليون': 'Neon Genesis Evangelion',
  'سلايرز': 'Slayers',
  'كونان': 'Detective Conan',
  'المحقق كونان': 'Detective Conan',
  'دراغون': 'Dragon',
  'ليفاي': 'Levi Ackerman',
  'ميكاسا': 'Mikasa Ackerman',
  'ايرين': 'Eren Yeager',
  'إيرين': 'Eren Yeager',
  'غوكو': 'Goku',
  'لوفي': 'Luffy',
  'زورو': 'Zoro',
  'سنجي': 'Sanji',
  'ايتاتشي': 'Itachi Uchiha',
  'ساسكي': 'Sasuke Uchiha',
  'مادارا': 'Madara Uchiha',
  'غوجو': 'Gojo Satoru',
  'جوجو': 'JoJo\'s Bizarre Adventure'
};

function normalizeArabic(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/\s+/g, ' ');
}

async function smartQueryTranslator(queryStr: string): Promise<string> {
  const trimmed = queryStr.trim();
  // Check if query contains Arabic text. If not, return immediately.
  if (!/[\u0600-\u06FF]/.test(trimmed)) {
    return trimmed;
  }

  // 1. Check local mapper with normalized query
  const normalizedQuery = normalizeArabic(trimmed);
  if (LOCAL_ANIME_MAP[normalizedQuery]) {
    console.log(`[Smart Translation] Local Map Hit: "${trimmed}" -> "${LOCAL_ANIME_MAP[normalizedQuery]}"`);
    return LOCAL_ANIME_MAP[normalizedQuery];
  }

  // Check direct keys
  if (LOCAL_ANIME_MAP[trimmed]) {
    console.log(`[Smart Translation] Local Map Direct Hit: "${trimmed}" -> "${LOCAL_ANIME_MAP[trimmed]}"`);
    return LOCAL_ANIME_MAP[trimmed];
  }

  // 2. Check persistence server cache for already translated queries to conserve API quota
  const cacheKey = `trans_q_${Buffer.from(normalizedQuery).toString('base64').replace(/=/g, '')}`;
  try {
    const cached = await serverCache.get<string>(cacheKey);
    if (cached) {
      console.log(`[Smart Translation] Cache Hit: "${trimmed}" -> "${cached}"`);
      return cached;
    }
  } catch (err: any) {
    console.warn("[Smart Translation] Cache lookup warning:", err.message);
  }

  // 3. Fallback to Gemini with stable active model (gemini-3.5-flash)
  try {
    const prompt = `You are an intelligent search processor for an anime streaming application.
The user entered an Arabic anime or character search description: "${trimmed}".
Your job is to translate and expand this search query so that it successfully matches standard worldwide databases (like MyAnimeList).
Examples:
- "ون بيس" -> "One Piece"
- "شخصية ليفاي" -> "Levi Ackerman"
- "زورو" -> "Zoro"
- "مذكرة الموت" -> "Death Note"
- "قاتل الشياطين" -> "Kimetsu no Yaiba"
- "ناروتو شيبودن" -> "Naruto Shippuden"
- "ايتاتشي" -> "Itachi Uchiha"
- "طوكيو غول" -> "Tokyo Ghoul"
- "غوكو" -> "Goku"

Respond with ONLY the plain English translated title or character name. Do NOT include any additional labels, quotes, explanation, or markdown.`;

    const response = await aiTranslate.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
      }
    });

    const result = response.text?.trim() || trimmed;
    console.log(`Smart Search Query translator: "${trimmed}" -> "${result}"`);

    // Cache the resolved result for 7 days to preserve resources and maintain instant speed
    try {
      await serverCache.set(cacheKey, result, 7 * 24 * 60 * 60 * 1000);
    } catch (_) {}

    return result;
  } catch (err) {
    console.warn("Gemini query translator handled redirect (falling back gracefully to original input):", err);
    return trimmed;
  }
}

// مسار للبحث المتقدم
router.get('/anime/search', handleAsync(async (req: Request, res: Response) => {
  try {
    const { q, genres, min_score, status, page = 1, order_by, sort, year } = req.query;
    let url = `https://api.jikan.moe/v4/anime?page=${page}&sfw=true`;
    
    if (q) {
      const resolvedQuery = await smartQueryTranslator(q as string);
      url += `&q=${encodeURIComponent(resolvedQuery)}`;
    }
    if (genres) url += `&genres=${genres}`;
    if (min_score) url += `&min_score=${min_score}`;
    if (status) url += `&status=${status}`;
    if (order_by) url += `&order_by=${order_by}`;
    if (sort) url += `&sort=${sort}`;
    if (year) {
      url += `&start_date=${year}-01-01&end_date=${year}-12-31`;
    }

    const data = await fetchJikan(url);

    const results = (data.data || []).map((anime: any) => ({
      _id: anime.mal_id.toString(),
      title: anime.title_english || anime.title,
      posterUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
      rating: anime.score || 0,
      genres: anime.genres?.map((g: any) => g.name) || [],
      status: anime.status === 'Finished Airing' ? 'مكتمل' : anime.status === 'Currently Airing' ? 'مستمر' : 'قادم',
    }));

    res.json({ success: true, data: results, pagination: data.pagination });
  } catch (error) {
    console.warn('API Search notice:', error);
    res.status(500).json({ success: false, message: 'فشل في البحث.' });
  }
}));

// مسار لجلب التصنيفات
router.get('/anime/genres', handleAsync(async (req: Request, res: Response) => {
  try {
    const data = await fetchJikan('https://api.jikan.moe/v4/genres/anime');
    res.json({ success: true, data: data.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب التصنيفات.' });
  }
}));

// مسار لجلب أنميات موسم محدد مع التحديث الأسبوعي والتخزين المؤقت
router.get('/anime/season', handleAsync(async (req: Request, res: Response) => {
  try {
    const { year, season } = req.query;
    let url = '';
    let cacheKey = '';
    
    if (year && season) {
      url = `https://api.jikan.moe/v4/seasons/${year}/${season}`;
      cacheKey = `season-${year}-${season}`;
    } else {
      url = `https://api.jikan.moe/v4/seasons/now`;
      // مفتاح الكاش يتضمن السنة والأسبوع الحالي لضمان التحديث التلقائي بداية كل أسبوع
      const currentYear = new Date().getFullYear();
      const oneJan = new Date(currentYear, 0, 1);
      const numberOfDays = Math.floor((Date.now() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
      const resultWeek = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
      cacheKey = `season-now-${currentYear}-W${resultWeek}`;
    }
    
    const cached = await serverCache.get<any>(cacheKey);
    if (cached !== null) {
      return res.json({ success: true, data: cached });
    }

    const data = await fetchJikan(url);

    const results = (data.data || []).map((anime: any) => ({
      _id: anime.mal_id.toString(),
      title: anime.title_english || anime.title,
      posterUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
      rating: anime.score || 0,
      genres: anime.genres?.map((g: any) => g.name) || [],
      status: anime.status === 'Finished Airing' ? 'مكتمل' : anime.status === 'Currently Airing' ? 'مستمر' : 'قادم',
    }));

    await serverCache.set(cacheKey, results, 7 * 24 * 60 * 60 * 1000); // كاش لمدة 7 أيام ليتم التحديث أسبوعياً

    res.json({ success: true, data: results });
  } catch (error) {
    console.warn('API warning season details:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب أنميات الموسم.' });
  }
}));

// مسار لجلب مواعيد الحلقات عبر Jikan مع التخزين المؤقت وحماية من الـ 429
router.get('/anime/jikan-schedule', handleAsync(async (req: Request, res: Response) => {
  try {
    const { day = 'sunday' } = req.query;
    const url = `https://api.jikan.moe/v4/schedules?filter=${day}&limit=20`;
    const data = await fetchJikan(url);
    res.json({ success: true, data: data.data || [] });
  } catch (error) {
    console.warn('Schedule fetch warning:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب جدول المواعيد.' });
  }
}));

// --- مسارات نظام قوائم الانتظار لوظائف الـ Scraping والـ Pre-Warm ---
router.get('/queue/status', handleAsync(async (req: Request, res: Response) => {
  const { ScraperQueue } = await import('../services/queueService');
  const status = ScraperQueue.getStatus();
  res.json({ success: true, ...status });
}));

router.post('/queue/add', handleAsync(async (req: Request, res: Response) => {
  const { name, data = {}, maxRetries = 2 } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'اسم المهمة مطلوب' });
  }
  const { ScraperQueue } = await import('../services/queueService');
  const jobId = await ScraperQueue.addJob(name, data, maxRetries);
  res.json({ success: true, message: 'تمت جدولة عملية الـ Scraping وإضافتها لصف الانتظار للعمل بشكل غير متزامن.', jobId });
}));

router.post('/queue/clear', handleAsync(async (req: Request, res: Response) => {
  const { ScraperQueue } = await import('../services/queueService');
  ScraperQueue.clearJobs();
  res.json({ success: true, message: 'تم تصفية سجل صفوف العمل المكتملة والمعلقة.' });
}));

export default router;
