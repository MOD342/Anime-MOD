import { Router, Request, Response, NextFunction } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const router = Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = 'gemini-2.5-flash';

const handleAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/chat', handleAsync(async (req: Request, res: Response) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, message: 'Invalid messages array.' });
  }

  try {
    const formattedHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));
    
    // We will use generateContent directly because we have full history.
    
    const contents = messages.map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    console.log("Generating chat response for:", JSON.stringify(contents));

    const response = await ai.models.generateContent({
      model: model,
      contents,
      config: {
        systemInstruction: "أنت مساعد ذكي لتطبيق أنمي MOD. يمكنك الإجابة عن أسئلة تتعلق بالأنمي، اقتراح أنميات للمستخدمين، وتوفير معلومات عن الشخصيات أو القصص بطريقة ودودة. تكلم باللغة العربية فقط."
      }
    });

    res.json({
      success: true,
      text: response.text
    });
  } catch (error: any) {
    console.error('Gemini Chat Error Details:', JSON.stringify(error, null, 2), error.message);
    res.status(500).json({ success: false, message: 'فشل في الاتصال بالذكاء الاصطناعي.', error: error.message });
  }
}));

router.get('/games/generate', handleAsync(async (req: Request, res: Response) => {
  const { type } = req.query; // 'quotes', 'lyrics', 'imposter', 'emoji', etc.
  if (!type) return res.status(400).json({ success: false, message: 'Missing type.' });

  try {
    let schemaName = "Questions";
    let schemaProperties: Record<string, any> = {};
    let prompt = "";

    const randomSeed = Math.floor(Math.random() * 10000);
    switch(type) {
      case 'quotes':
        prompt = `قم بتوليد 5 أسئلة 'من القائل' لاقتباسات مشهورة من أنميات متنوعة. اجعلها متوسطة إلى صعبة. أرقام عشوائية لإجبار التنويع: ${randomSeed}`;
        schemaProperties = {
          questions: {
             type: Type.ARRAY,
             items: {
               type: Type.OBJECT,
               properties: {
                 text: { type: Type.STRING, description: "The quote in Arabic" },
                 options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 options for characters" },
                 correct: { type: Type.INTEGER, description: "Index of the correct option (0-3)" },
                 anime: { type: Type.STRING, description: "The anime name" }
               },
               required: ["text", "options", "correct", "anime"]
             }
          }
        };
        break;
      case 'imposter':
        prompt = `قم بتوليد 5 أسئلة لعبة الجاسوس. حيث تعطي 3 شخصيات من نفس الأنمي وشخصية رابعة من أنمي مختلف. على اللاعب إيجاد الشخصية الغريبة. أرقام عشوائية لإجبار التنويع: ${randomSeed}`;
        schemaProperties = {
          questions: {
             type: Type.ARRAY,
             items: {
               type: Type.OBJECT,
               properties: {
                 anime: { type: Type.STRING, description: "The anime the other 3 belong to" },
                 options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 character names" },
                 correct: { type: Type.INTEGER, description: "Index of the imposter character (0-3)" }
               },
               required: ["anime", "options", "correct"]
             }
          }
        };
        break;
      case 'emoji':
        prompt = `قم بتوليد 5 أسئلة عن أنمي ممثل باستخدام الإيموجي فقط. أرقام عشوائية لإجبار التنويع: ${randomSeed}`;
        schemaProperties = {
          questions: {
             type: Type.ARRAY,
             items: {
               type: Type.OBJECT,
               properties: {
                 emojis: { type: Type.STRING, description: "3-5 emojis" },
                 options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 anime names" },
                 correct: { type: Type.INTEGER, description: "Index of correct anime (0-3)" }
               },
               required: ["emojis", "options", "correct"]
             }
          }
        };
        break;
      case 'lyrics':
        prompt = `قم بتوليد 5 أسئلة 'تخمين الأنمي من شارة البداية أو النهاية (أغنية الأوبينينغ)'. أكتب سطراً مشهوراً من الأغنية (بالعربية المترجمة أو بالحروف الإنجليزية)، واجعلها خيارات متعددة. أرقام عشوائية لإجبار التنويع: ${randomSeed}`;
        schemaProperties = {
          questions: {
             type: Type.ARRAY,
             items: {
               type: Type.OBJECT,
               properties: {
                 text: { type: Type.STRING, description: "A famous line from the anime opening/ending song" },
                 options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 anime names along with the song name" },
                 correct: { type: Type.INTEGER, description: "Index of the correct option (0-3)" }
               },
               required: ["text", "options", "correct"]
             }
          }
        };
        break;
      case 'trivia':
        prompt = `قم بتوليد 5 معلومات عامة (تريفيا) عن الأنميات المشهورة ليكون نصفها صحيح ونصفها خاطئ بوضوح لمن تابعه. أرقام عشوائية لإجبار التنويع: ${randomSeed}`;
        schemaProperties = {
          questions: {
             type: Type.ARRAY,
             items: {
               type: Type.OBJECT,
               properties: {
                 text: { type: Type.STRING, description: "A trivia fact about an anime" },
                 isTrue: { type: Type.BOOLEAN, description: "Whether the fact is true or false" },
                 explanation: { type: Type.STRING, description: "A short explanation of why it is true or false" }
               },
               required: ["text", "isTrue", "explanation"]
             }
          }
        };
        break;
      case 'math':
        prompt = `قم بتوليد 5 أسئلة 'رياضيات الأنمي'. مثال: (عدد ذيول الكيوبي + عدد أفراد طاقم قبعة القش). اجعلها ذكية ومتنوعة. أرقام عشوائية: ${randomSeed}`;
        schemaProperties = {
          questions: {
             type: Type.ARRAY,
             items: {
               type: Type.OBJECT,
               properties: {
                 text: { type: Type.STRING, description: "The math equation using anime elements (in Arabic)" },
                 answer: { type: Type.INTEGER, description: "The correct numerical answer" },
                 options: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "4 integer options" },
                 correct: { type: Type.INTEGER, description: "Index of the correct option (0-3)" }
               },
               required: ["text", "answer", "options", "correct"]
             }
          }
        };
        break;
      case 'timeline':
        prompt = `قم بتوليد 5 أسئلة 'أي الفعاليات حدثت أولاً في عالم الأنمي؟'. اذكر حدثين من نفس الأنمي أو أنميات مختلفة واطلب تحديد من حدث قبل الآخر حسب القصة المعترف بها. أرقام عشوائية: ${randomSeed}`;
        schemaProperties = {
          questions: {
             type: Type.ARRAY,
             items: {
               type: Type.OBJECT,
               properties: {
                 e1: { type: Type.STRING, description: "First event description" },
                 e2: { type: Type.STRING, description: "Second event description" },
                 first: { type: Type.INTEGER, description: "Which event happened first chronologically in the anime world? must be 1 or 2" }
               },
               required: ["e1", "e2", "first"]
             }
          }
        };
        break;
      default:
        return res.status(400).json({ success: false, message: 'Unknown type.' });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.9,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: schemaProperties,
          required: ["questions"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsed.questions || [] });

  } catch (error: any) {
    console.error('Gemini Games Error:', error);
    res.status(500).json({ success: false, message: 'فشل توليد أسئلة الألعاب.' });
  }
}));


router.get('/anti-cheat', handleAsync(async (req: Request, res: Response) => {
  const { title } = req.query;
  if (!title) return res.status(400).json({ success: false, message: 'Missing anime title.' });

  try {
    const prompt = `قم بتوليد سؤال واحد فقط متوسط إلى صعب عن الأنمي "${title}" ليثبت المستخدم أنه شاهده فعلاً (تجنب الأسئلة البديهية التي يمكن الإجابة عليها من غلاف الأنمي).`;
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: "The quiz question about the specific anime" },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 options" },
            correct: { type: Type.INTEGER, description: "Index of the correct option (0-3)" }
          },
          required: ["question", "options", "correct"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.warn('Gemini Anti-cheat failed (serving high-quality fallback):', error.message || error);
    
    // Serve beautiful fallback data matching common anime series or general industry knowledge
    const cleanTitle = String(title).toLowerCase().trim();
    let fallbackData = null;

    if (cleanTitle.includes('one piece') || cleanTitle.includes('ون بيس')) {
      fallbackData = {
        question: 'ما هو اسم أول سفينة طاقم قبعة القش بالكامل قبل استخدام ساني؟',
        options: ['جوينج ميري (Going Merry)', 'ثاوزند ساني (Thousand Sunny)', 'ريد فورس', 'أوروجين لاينر'],
        correct: 0
      };
    } else if (cleanTitle.includes('attack') || cleanTitle.includes('titan') || cleanTitle.includes('هجوم العمالقة')) {
      fallbackData = {
        question: 'ما هو الجدار الذي تم اختراقه في بداية الحلقة الأولى من الأنمي؟',
        options: ['جدار ماريا (Wall Maria)', 'جدار روز (Wall Rose)', 'جدار سينا (Wall Sina)', 'جدار أورفود'],
        correct: 0
      };
    } else if (cleanTitle.includes('naruto') || cleanTitle.includes('ناروتو')) {
      fallbackData = {
        question: 'من هو المعلم الأول لناروتو في الأكاديمية والذي أنقذه في أول حلقة؟',
        options: ['إيروكا أومينو', 'كاكاشي هاتاكي', 'جيرايا', 'ساروتوبي'],
        correct: 0
      };
    } else if (cleanTitle.includes('death note') || cleanTitle.includes('مذكرة الموت')) {
      fallbackData = {
        question: 'ما هو الطعام المفضل للشينيغامي ريوك في أنمي مذكرة الموت؟',
        options: ['الشوكولاتة', 'التفاح الأحمر', 'السوشي', 'الكعك'],
        correct: 1
      };
    } else if (cleanTitle.includes('hunter') || cleanTitle.includes('هنتر')) {
      fallbackData = {
        question: 'ما هي الفئة التي ينتمي إليها غون (Gon Freecss) من أنواع النين (Nen)؟',
        options: ['التعزيز (Enhancement)', 'التحويل', 'التجسيد', 'التلاعب'],
        correct: 0
      };
    } else if (cleanTitle.includes('demon slayer') || cleanTitle.includes('قاتل الشياطين')) {
      fallbackData = {
        question: 'ما هو نوع التنفس الذي يستخدمه كامادو تانجيرو في البداية الذي تعلمه من أوروكوداكي؟',
        options: ['تنفس الماء (Water Breathing)', 'تنفس الرعد', 'تنفس النار', 'تنفس الصخر'],
        correct: 0
      };
    } else {
      // General anime trivia question related to the anime industry or general knowledge
      const generalPool = [
        {
          question: `سؤال للتحقق من مشاهدتك وتفاعلك: ما هي القوة الروحية الشهيرة المستخدمة في أنمي "ناروتو"؟`,
          options: ['التشاكرا (Chakra)', 'الكي (Ki)', 'المانا (Mana)', 'النيشيرين'],
          correct: 0
        },
        {
          question: `سؤال للتحقق من مشاهدتك وتفاعلك: في عالم الأنمي، من هي الشخصية الشهيرة التي تهدف لتصبح السايان الأقوى وتدافع عن الأرض؟`,
          options: ['سون غوكو', 'لوفي', 'إيتشيغو', 'ناروتو'],
          correct: 0
        },
        {
          question: `سؤال للتحقق من مشاهدتك وتفاعلك: في أنمي هجوم العمالقة، ما هو هدف "فيلق الاستطلاع"؟`,
          options: ['استكشاف مناطق خارج الأسوار ومحاربة العمالقة', 'حماية الملك داخل السور الأعمق', 'الشرطة العسكرية وحفظ الأمن الداخلي', 'البحث عن الكنز المفقود'],
          correct: 0
        }
      ];
      fallbackData = generalPool[Math.floor(Math.random() * generalPool.length)];
    }

    res.json({ success: true, data: fallbackData });
  }
}));

export default router;

