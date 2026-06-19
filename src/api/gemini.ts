import { Router, Request, Response, NextFunction } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const router = Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = 'gemini-3.5-flash';

const FALLBACK_GAMES: Record<string, any[]> = {
  quotes: [
    {
      text: "أنا لست بطلاً لأنني أريد ذلك، بل لأنني يجب أن أكون كذلك!",
      options: ['سون غوكو', 'مونكي دي لوفي', 'ميدوريا إيزوكو', 'أوزوماكي ناروتو'],
      correct: 1,
      anime: 'ون بيس'
    },
    {
      text: "الخوف ليس سيئاً، بل يخبرك بما هي نقاط ضعفك الحقيقية.",
      options: ['جراي فورستار', 'جيلدارتس كليف', 'ماكاروف', 'ناتسو دراغنيل'],
      correct: 1,
      anime: 'فيفي تيل'
    },
    {
      text: "إذا كنت لا تشارك شخصًا ما ألمه، فلن تفهمه أبدًا.",
      options: ['هاتاكي كاكاشي', 'أوتشيها إيتاتشي', 'باين (ناغاتو)', 'أوزوماكي ناروتو'],
      correct: 2,
      anime: 'ناروتو شيبودن'
    },
    {
      text: "البشر لديهم الحق في البحث عن السعادة، لكن الصعوبة تكمن في العثور عليها وتثبيتها.",
      options: ['جيرايا (الناسك المنحرف)', 'سينجو توبيراما', 'أوروتشيمارو', 'أوتشيها مادارا'],
      correct: 0,
      anime: 'ناروتو'
    },
    {
      text: "الاستسلام هو ما يقتل الناس، عندما يرفض الناس الاستسلام... يكتسبون الحق في تجاوز حدودهم!",
      options: ['أوسوب', 'رورونوا زورو', 'مونكي دي لوفي', 'نامي'],
      correct: 2,
      anime: 'ون بيس'
    }
  ],
  imposter: [
    {
      anime: 'ناروتو شيبودن',
      options: ['أوزوماكي ناروتو', 'أوتشيها ساسكي', 'هارونو ساكورا', 'مونكي دي لوفي'],
      correct: 3
    },
    {
      anime: 'هجوم العمالقة',
      options: ['ليفاي أكرمان', 'ميكاسا أكرمان', 'إرين ييغر', 'سون غوكو'],
      correct: 3
    },
    {
      anime: 'قاتل الشياطين',
      options: ['كامادو تانجيرو', 'كامادو نيزوكو', 'أوتشيها إيتاتشي', 'أغنيس زينيتسو'],
      correct: 2
    },
    {
      anime: 'مذكرة الموت',
      options: ['إل (L)', 'ياغامي لايت', 'ريوك', 'كيلوا زولديك'],
      correct: 3
    },
    {
      anime: 'هنتر x هنتر',
      options: ['غون فريكس', 'كيلوا زولديك', 'كورابيكا', 'هاتاكي كاكاشي'],
      correct: 3
    }
  ],
  emoji: [
    {
      emojis: '☠️ 🍖 👒 ⚔️',
      options: ['دراغون بول', 'ون بيس', 'ناروتو', 'بليتش'],
      correct: 1
    },
    {
      emojis: '📓 🍎 🧠 🕵️‍♂️',
      options: ['مذكرة الموت', 'المحقق كونان', 'طوكيو غول', 'هجوم العمالقة'],
      correct: 0
    },
    {
      emojis: '🦊 🧡 🍥 🌀',
      options: ['قاتل الشياطين', 'ناروتو شيبودن', 'هنتر x هنتر', 'ون بيس'],
      correct: 1
    },
    {
      emojis: '🗡️ 🐗 ⚡ 👹',
      options: ['ون بيس', 'بليتش', 'قاتل الشياطين', 'جوجوتسو كايسن'],
      correct: 2
    },
    {
      emojis: '🧑‍🦲 👊 💥 🦸‍♂️',
      options: ['ون بنش مان', 'أكاديمية بطلي', 'موب سايكو 100', 'دراغون بول Z'],
      correct: 0
    }
  ],
  lyrics: [
    {
      text: "شرف الوطن، أغلى من شرف حياتي... عهد الأصدقاء مرسوم في وجداني",
      options: ['عهد الأصدقاء', 'روبن هود', 'صقور الأرض', 'دروب ريمي'],
      correct: 0
    },
    {
      text: "قد تلمع صور في مخيلتنا تلوح معلنة أن روح الأمل ما زالت حية لم تمت",
      options: ['أنا وأخي', 'أبطال الديجيتال', 'سابق ولاحق', 'سيف النار'],
      correct: 1
    },
    {
      text: "حلمنا نهار، نهارنا عمل... نملك الخيار وخيارنا الأمل",
      options: ['أبطال الديجيتال', 'القناص (Hunter x Hunter)', 'فرسان الأرض', 'صقور الأرض'],
      correct: 1
    },
    {
      text: "في جعبتي حكاية، يرويها حكيم... عن قصص قديمة، من زمن قديم",
      options: ['في جعبتي حكاية', 'سندباد', 'ماوكلي فتى الكهوف', 'أمينة الأنيقة'],
      correct: 0
    },
    {
      text: "لا تبكِ يا صغيري، لا انظر نحو السماء... يمنحنا الدفء ويزيل عنا العناء",
      options: ['أنا وأخي', 'دروب ريمي', 'عهد الأصدقاء', 'سالي القديمة'],
      correct: 1
    }
  ],
  trivia: [
    {
      text: "لوفي استغرق سنتين كاملتين للتدريب برفقة سيلفرز رايلي في جزيرة روسكاينا المهجورة لتعلم الهاكي.",
      isTrue: true,
      explanation: "صحيح، لوفي اعتزل العالم برفقة رايلي للتدريب الشاق لمدة عامين كاملين قبل العودة إلى أرخبيل شابوندي."
    },
    {
      text: "مانغا وأنمي 'مذكرة الموت' (Death Note) من تأليف الكاتب الأسطوري والرسام إيتشيرو أودا.",
      isTrue: false,
      explanation: "خاطئ تماماً، إيتشيرو أودا هو مؤلف ون بيس. بينما مؤلف مذكرة الموت هو تسوغومي أوبا والرسام هو تاكيشي أوباتا."
    },
    {
      text: "هاتاكي كاكاشي تم تعيينه كالهوكاجي الخامس لقرية كونوها بعد نهاية حرب النينجا العظمى مباشرة.",
      isTrue: false,
      explanation: "خاطئ، تسونادي هي من تولت منصب الهوكاجي الخامس، كاكاشي تم تعيينه الهوكاجي السادس، وناروتو الأوزوماكي هو السابع."
    },
    {
      text: "نجح غون فريكس في المرة المئة فقط من اجتياز اختبار الصيادين المهيب بعد مواجهات ملحمية مع هيسوكا.",
      isTrue: false,
      explanation: "خاطئ، غون نجح في المرة الأولى التي تقدم فيها للبطولة والامتحان بينما كيلوا نجح في المحاولة الثانية بعد استبعاد سابقتها."
    },
    {
      text: "في عالم جوجوتسو كايسن، ريومين سوكونا المشهور بملك اللعنات يمتلك بالكامل 20 إصبعاً تم تفريقها وختمها عبر العصور.",
      isTrue: true,
      explanation: "صحيح، كل إصبع يحتوي على جزء غامض من طاقة سوكونا، وابتلاع يوجي إيتادوري لإصبع واحد منه جعله وعاءً لملك اللعنات."
    }
  ],
  math: [
    {
      text: "عدد كرات التنين في كوكبة الأرض (7) كرات + عدد السيوف التي يحملها رورونوا زورو دائماً في قتالاته (3)",
      answer: 10,
      options: [7, 8, 10, 12],
      correct: 2
    },
    {
      text: "أقصى عدد من البوابات الثمانية التي يستطيع مايت غاي فتحها (8) - رتبة الهوكاجي لناروتو أوزوماكي كمنصب رسمي (7)",
      answer: 1,
      options: [0, 1, 2, 3],
      correct: 1
    },
    {
      text: "عدد أعضاء فريق السبعة الأسطوري الأصليين (3) أفراد + عدد الأعين التي تملكها البومة العملاقة في طاقم كاكاشي (1)",
      answer: 4,
      options: [2, 3, 4, 5],
      correct: 2
    },
    {
      text: "عدد أفراد طاقم قبعة القش حتى نهاية أرك وانو بما فيهم جينبي (10) * عدد عيون ليفاي أكرمان السليمة تماماً بالقصة (1)",
      answer: 10,
      options: [10, 20, 5, 0],
      correct: 0
    },
    {
      text: "الحلقة التي ظهر فيها الجير فايف للوفي لأول مرة (1071) - الرقم المطابق لسنة تأسيس الاستوديو توي أنيميشن بالكامل (1956)",
      answer: 885,
      options: [885, 915, 1071, 1000],
      correct: 0
    }
  ],
  timeline: [
    {
      e1: "قيام إيتاتشي أوتشيها بالقضاء على العشيرة لإنقاذ قرية كونوها وتأمين حماية ساسكي",
      e2: "مواجهة ساسكي أوتشيها لإيتاتشي بغرض الثأر والانتقام في المقر السري",
      first: 1
    },
    {
      e1: "انفجار سفينة الجوينج ميري واحتراقها بصورة مؤلمة بعد إنقاذ الطاقم من إينيس لوبي",
      e2: "بناء سفينة الثاوزند ساني (Thousand Sunny) على يد فرانكي ودخولها المياه الإقليمية",
      first: 1
    },
    {
      e1: "إعدام ملك القراصنة غول دي روجر وإعلانه عن الكنز الأسطوري ون بيس",
      e2: "انطلاق مونكي دي لوفي في رحلته بعمر 17 عاماً للحصول على طاقم قراصنة خاص به",
      first: 1
    },
    {
      e1: "انضمام غراي فولستار لنقابة فيري تيل كطفل يتيم يبحث عن معلمة",
      e2: "لقاء ناتسو دراغنيل بلوسي هارتفيليا وعرض الانضمام إلى نقابة فيري تيل الشهيرة",
      first: 1
    },
    {
      e1: "اجتياز غون فريكس لامتحان الصيادين الصعب وامتلاك رخصة صيد مرخصة",
      e2: "صعود غون وكيلوا لبرج السماء (Heavens Arena) لتعلم أسرار الطاقة والنين قتالياً",
      first: 1
    }
  ]
};

const handleAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/chat', handleAsync(async (req: Request, res: Response) => {
  const { messages, mood, status } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, message: 'Invalid messages array.' });
  }

  try {
    const userMood = mood || 'طبيعي';
    const userStatus = status || 'أتابع أنمي';

    const systemInstruction = `أنت "السينباي المخضرم" (أوتاكو قديم مخضرم لديه خبرة شاسعة ومعرفة عميقة بكل تفاصيل وأسرار الأنمي والمانغا من الثمانينيات وحتى أحدث مواسم الأنمي الحالية).
تحدث باللغة العربية بأسلوب الأوتاكو الحقيقي والودود، بحماس وحركية ممتعة، واستخدم الكلمات اليابانية الشهيرة بين الحين والآخر مثل ("يا صديقي"، "باكا"، "دونو"، "ناكاما"، "جتسو"، "موشي موشي").
مزاج المستخدم الحالي ووضعه هو: [المزاج: ${userMood} | الحالة: ${userStatus}].
عليك مراعاة مزاجه ووضعه تماماً في أسلوب الحوار:
- إذا كان حزيناً أو محبطاً: هونه عليه بكلمات تشجيعية دافئة واقترح له أنمي كوميدي أو شريحة من الحياة (Slice of Life) ليرفع معنوياته.
- إذا كان ملاناً للغاية: واجهه باقتراحات لم تخطر على باله من الأنميات الحماسية والقصص الغامضة والمقعدة لتكسر روتين يومه فوراً.
- إذا كان متحركاً ومتحمساً بالنار (خارق): زد حماسته وقارن شعوره بلحظات قتال ملحمية واقترح له شونين جبار بإنتاج مذهل.
أظهر دائماً خبرتك كأوتاكو مخضرم في اقتراح الأعمال، واذكر له أسباباً ذكية للمشاهدة ترتبط بمشاعره الحالية ليفصل معك تماماً!`;

    const contents = messages.map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    console.log("Generating Otaku Chat response with mood:", userMood, "status:", userStatus);
    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let responseText = '';
    let success = false;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.8
          }
        });
        if (response?.text) {
          responseText = response.text;
          success = true;
          break;
        }
      } catch (err: any) {
        console.warn(`Otaku Chat generation using ${modelName} encountered error, trying fallback:`, err.message || err);
      }
    }

    if (!success) {
      throw new Error("All active Gemini models experienced high demand. Please try again in a moment.");
    }

    res.json({
      success: true,
      text: responseText
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

    let response;
    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let success = false;
    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
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
        if (response?.text) {
          success = true;
          break;
        }
      } catch (err: any) {
        console.warn(`[Gemini Games] Generation failed with ${modelName}: ${err.message || err}. Trying next fallback...`);
      }
    }

    if (!success) {
      throw new Error("All active Gemini models experienced high demand.");
    }

    const parsed = JSON.parse(response?.text || '{}');
    res.json({ success: true, data: parsed.questions || [] });

  } catch (error: any) {
    console.warn(`[Gemini Games fallback] Gemini Games generation failed: ${error.message || error}. Serving high-quality offline fallback questions.`);
    const fallbackQuestions = FALLBACK_GAMES[type as string] || FALLBACK_GAMES.quotes;
    res.json({ success: true, data: fallbackQuestions });
  }
}));


router.get('/anti-cheat', handleAsync(async (req: Request, res: Response) => {
  const { title } = req.query;
  if (!title) return res.status(400).json({ success: false, message: 'Missing anime title.' });

  try {
    const prompt = `قم بتوليد سؤال واحد فقط متوسط إلى صعب عن الأنمي "${title}" ليثبت المستخدم أنه شاهده فعلاً (تجنب الأسئلة البديهية التي يمكن الإجابة عليها من غلاف الأنمي).`;
    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let response;
    let success = false;

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
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
        if (response?.text) {
          success = true;
          break;
        }
      } catch (err: any) {
        console.warn(`[Gemini Anti-Cheat] Failed with ${modelName}: ${err.message || err}. Trying next fallback...`);
      }
    }

    if (!success) {
      throw new Error("All active Gemini models experienced high-demand.");
    }

    const parsed = JSON.parse(response?.text || '{}');
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

