import amrPresenterUrl from "../assets/images/amr_ahmed_presenter_1793741587013.jpg";
import amrPresenterTalkOpenUrl from "../assets/images/amr_presenter_talk_open_1793743816982.jpg";
import amrPresenterTalkPointUrl from "../assets/images/amr_presenter_talk_point_1793743818799.jpg";
import amrAvatarUrl from "../assets/images/amr_ahmed_avatar_1793741589389.jpg";
import amrAvatarTalkOpenUrl from "../assets/images/amr_avatar_talk_open_1793743820400.jpg";
import amrAvatarTalkGestureUrl from "../assets/images/amr_avatar_talk_gesture_1793743820738.jpg";
import labBackdropUrl from "../assets/images/robotics_lab_backdrop_1793741591047.jpg";
import smartCarUrl from "../assets/images/showcase_smart_car_1793741592996.jpg";
import roboticsArmUrl from "../assets/images/showcase_robotics_arm_1793741593447.jpg";

export const LESSON_ASSETS = {
  amrPresenterUrl,
  amrPresenterTalkOpenUrl,
  amrPresenterTalkPointUrl,
  amrAvatarUrl,
  amrAvatarTalkOpenUrl,
  amrAvatarTalkGestureUrl,
  labBackdropUrl,
  smartCarUrl,
  roboticsArmUrl,
};

export const TOTAL_DURATION_SEC = 600; // 10:00 exact (600 seconds)

export enum VisualSceneMode {
  INTRO_CAMERA = "INTRO_CAMERA",
  CONCEPT_3D = "CONCEPT_3D",
  UNO_OVERVIEW = "UNO_OVERVIEW",
  UNO_ZOOM_MCU = "UNO_ZOOM_MCU",
  UNO_ZOOM_DIGITAL = "UNO_ZOOM_DIGITAL",
  UNO_ZOOM_ANALOG = "UNO_ZOOM_ANALOG",
  UNO_ZOOM_USB = "UNO_ZOOM_USB",
  UNO_ZOOM_POWER = "UNO_ZOOM_POWER",
  ARDUINO_IDE = "ARDUINO_IDE",
  LED_PARTS = "LED_PARTS",
  LED_RESISTOR_WHY = "LED_RESISTOR_WHY",
  LED_WIRING = "LED_WIRING",
  LED_CODE_SETUP = "LED_CODE_SETUP",
  LED_CODE_LOOP = "LED_CODE_LOOP",
  LED_LIVE_DEMO = "LED_LIVE_DEMO",
  IO_COMPARISON = "IO_COMPARISON",
  PROJECTS_SHOWCASE = "PROJECTS_SHOWCASE",
  SUMMARY_RECAP = "SUMMARY_RECAP",
  OUTRO_CAMERA = "OUTRO_CAMERA",
}

export interface LessonSegment {
  id: string;
  chapterId: number;
  startSec: number;
  endSec: number;
  sceneMode: VisualSceneMode;
  onScreenTitle: string;
  keyTermEn?: string;
  keyTermAr?: string;
  narrationAr: string;
  highlightCodeLines?: number[];
  showcaseIndex?: number;
}

export interface LessonChapter {
  id: number;
  numberLabel: string;
  title: string;
  timeRangeLabel: string;
  startSec: number;
  endSec: number;
  summary: string;
}

export const LESSON_METADATA = {
  title: "يعني إيه Arduino؟ وإزاي تبدأ عالم الروبوتكس من الصفر؟",
  instructorName: "المهندس عمرو أحمد",
  instructorRole: "مهندس إلكترونيات وروبوتكس",
  boardModel: "Arduino UNO R3 (ATmega328P)",
  durationFormatted: "10:00",
};

export const LESSON_CHAPTERS: LessonChapter[] = [
  {
    id: 1,
    numberLabel: "01",
    title: "مقدمة الرحلة وتعريف م. عمرو أحمد",
    timeRangeLabel: "00:00 – 01:00",
    startSec: 0,
    endSec: 60,
    summary: "ترحيب المهندس عمرو أحمد، كسر رهبة البداية، وتشويق عملي لكيفية التحكم في الأجهزة الإلكترونية.",
  },
  {
    id: 2,
    numberLabel: "02",
    title: "يعني إيه Arduino وإزاي بيفكر؟",
    timeRangeLabel: "01:00 – 02:00",
    startSec: 60,
    endSec: 120,
    summary: "شرح مبسط ثلاثي الأبعاد لفكرة العقل الإلكتروني القابل للبرمجة وتحويل الأوامر لإشارات كهربائية.",
  },
  {
    id: 3,
    numberLabel: "03",
    title: "التعرف على لوحة Arduino UNO",
    timeRangeLabel: "02:00 – 03:00",
    startSec: 120,
    endSec: 180,
    summary: "لماذا نبدأ بلوحة Arduino UNO R3، واستعراض تصميمها الهندسي العام ومؤشرات التشغيل.",
  },
  {
    id: 4,
    numberLabel: "04",
    title: "المكونات الـ 5 الأساسية عن قرب",
    timeRangeLabel: "03:00 – 04:00",
    startSec: 180,
    endSec: 240,
    summary: "لقطات مقربة لشرح Microcontroller و Digital Pins و Analog Pins و USB Port و Power Pins.",
  },
  {
    id: 5,
    numberLabel: "05",
    title: "البرمجة ببرنامج Arduino IDE",
    timeRangeLabel: "04:00 – 05:00",
    startSec: 240,
    endSec: 300,
    summary: "كيف نكتب الكود داخل دالتي setup و loop، ومراحل المراجعة Verify والرفع Upload عبر كابل USB.",
  },
  {
    id: 6,
    numberLabel: "06",
    title: "أول مشروع عملي: تشغيل وإضاءة LED",
    timeRangeLabel: "05:00 – 07:00",
    startSec: 300,
    endSec: 420,
    summary: "تنفيذ كامل خطوة بخطوة: القطع، قطبية الـ LED، وظيفة المقاومة 220Ω، التوصيل على Pin 13 و GND، وشرح الكود وتشغيله فعلياً.",
  },
  {
    id: 7,
    numberLabel: "07",
    title: "الفرق العملي بين Input و Output",
    timeRangeLabel: "07:00 – 08:00",
    startSec: 420,
    endSec: 480,
    summary: "كيف يستقبل الأردوينو البيانات من الحساسات (Inputs) ويتخذ قراراً لتشغيل المخرجات (Outputs).",
  },
  {
    id: 8,
    numberLabel: "08",
    title: "5 مشاريع حقيقية تقدر تبنيها بنفسك",
    timeRangeLabel: "08:00 – 09:00",
    startSec: 480,
    endSec: 540,
    summary: "روبوت متحرك، نظام إنذار، سيارة ذكية تتجنب العوائق، إضاءة ذكية، والتحكم في الأجهزة بالموبايل.",
  },
  {
    id: 9,
    numberLabel: "09",
    title: "ملخص الدرس ونصيحة المهندس الشاطر",
    timeRangeLabel: "09:00 – 10:00",
    startSec: 540,
    endSec: 600,
    summary: "مراجعة سريعة لأهم النقاط، خطوتك العملية القادمة، ورسالة الختام من المهندس عمرو أحمد.",
  },
];

export const LESSON_SEGMENTS: LessonSegment[] = [
  // ==================== MINUTE 0 - 1 ====================
  {
    id: "seg-01",
    chapterId: 1,
    startSec: 0,
    endSec: 20,
    sceneMode: VisualSceneMode.INTRO_CAMERA,
    onScreenTitle: "أهلاً بيك في معمل الإلكترونيات والروبوتكس",
    keyTermEn: "Eng. Amr Ahmed",
    keyTermAr: "المهندس عمرو أحمد — إلكترونيات وروبوتكس",
    narrationAr:
      "السلام عليكم يا شباب، معاكم المهندس عمرو أحمد، مهندس إلكترونيات وروبوتكس، والنهارده هنبدأ مع بعض رحلة ممتعة في عالم الأردوينو. متقلقش لو أول مرة تسمع عن الموضوع ده، أنا هشرحلك كل حاجة من الصفر وبالبلدي.",
  },
  {
    id: "seg-02",
    chapterId: 1,
    startSec: 20,
    endSec: 40,
    sceneMode: VisualSceneMode.INTRO_CAMERA,
    onScreenTitle: "إزاي الأجهزة الذكية والروبوتات بتفكر وتتحرك؟",
    keyTermEn: "Smart Hardware Control",
    keyTermAr: "سر التحكم في الأجهزة حولنا",
    narrationAr:
      "عمرك سألت نفسك وأنت داخل مول إزاي الباب الزجاج بيحس بيك ويفتح لوحده؟ أو إزاي عربية روبوت صغيرة بتشوف الحيطة قدامها وتلف بعيد عنها من غير ما حد يلمسها؟ السر كله يا بطل في عقل إلكتروني صغير تقدر تبرمجه بإيدك.",
  },
  {
    id: "seg-03",
    chapterId: 1,
    startSec: 40,
    endSec: 60,
    sceneMode: VisualSceneMode.INTRO_CAMERA,
    onScreenTitle: "خريطة رحلتنا في الـ 10 دقائق القادمة",
    keyTermEn: "Zero to First Circuit",
    keyTermAr: "من الفكرة لتنفيذ أول مشروع عملي",
    narrationAr:
      "في العشر دقايق الجايين هنتعامل كأننا واقفين سوا في المعمل: هنفهم يعني إيه أردوينو، هنفصص كل حتة في البوردة، هنتعلم إزاي نكتب الكود، ومش هنخرج غير وإحنا موصلين ومنورين أول مشروع عملي بإيدينا خطوة بخطوة.",
  },

  // ==================== MINUTE 1 - 2 ====================
  {
    id: "seg-04",
    chapterId: 2,
    startSec: 60,
    endSec: 80,
    sceneMode: VisualSceneMode.CONCEPT_3D,
    onScreenTitle: "يعني إيه Arduino بالبلدي؟",
    keyTermEn: "Open-Source Electronic Brain",
    keyTermAr: "عقل إلكتروني صغير قابل للبرمجة",
    narrationAr:
      "خلينا نسأل السؤال الأهم: يعني إيه أردوينو؟ بالبلدي كده، الأردوينو هو عقل إلكتروني صغير قابل للبرمجة. لوحة إلكترونية مفتوحة المصدر بتاخد منك أوامر مكتوبة على الكمبيوتر، وتنفذها في العالم الحقيقي على شكل كهرباء وحركة.",
  },
  {
    id: "seg-05",
    chapterId: 2,
    startSec: 80,
    endSec: 100,
    sceneMode: VisualSceneMode.CONCEPT_3D,
    onScreenTitle: "رحلة الأمر البرمجي داخل الأردوينو (3D)",
    keyTermEn: "Code → Brain → Action",
    keyTermAr: "أمر برمجي ← معالجة ← تشغيل أجهزة",
    narrationAr:
      "بص على الرسم ثلاثي الأبعاد اللي قدامك ده عشان تتخيلها صح: أول مرحلة أنت بتكتب أمر منطقي بسيط، تاني مرحلة عقل الأردوينو بيفهم الأمر ده، وتالت مرحلة بيحوله لإشارات كهربائية دقيقة تنور لمبة، أو تشغل موتور، أو تضرب إنذار.",
  },
  {
    id: "seg-06",
    chapterId: 2,
    startSec: 100,
    endSec: 120,
    sceneMode: VisualSceneMode.CONCEPT_3D,
    onScreenTitle: "ليه العالم كله بيبدأ بالأردوينو؟",
    keyTermEn: "Accessible Robotics Platform",
    keyTermAr: "سهل، عملي، ومفتوح المصدر",
    narrationAr:
      "زمان عشان تعمل دايرة ذكية كنت محتاج هندسة معقدة ولحامات كتير. الأردوينو غير اللعبة دي تماماً؛ خلاك بأسلاك توصيل بسيطة وكام سطر كود واضح تبني نموذج حقيقي لأي فكرة تخطر في بالك سواء كنت طالب أو مبتدئ تماماً.",
  },

  // ==================== MINUTE 2 - 3 ====================
  {
    id: "seg-07",
    chapterId: 3,
    startSec: 120,
    endSec: 140,
    sceneMode: VisualSceneMode.UNO_OVERVIEW,
    onScreenTitle: "التعريف بلوحة Arduino UNO R3 القياسية",
    keyTermEn: "Arduino UNO R3",
    keyTermAr: "اللوحة الأشهر والأفضل للمبتدئين",
    narrationAr:
      "عيلة الأردوينو فيها بوردات كتير زي نانو وميجا، لكن البطل اللي دايماً بنبدأ بيه في أي معمل هو لوحة Arduino UNO اللي قدامك دي. كلمة أونو بالإيطالي يعني رقم واحد، لأنها أقوى وأسهل بوردة تتعلم وتغلط وتجرب عليها بأمان.",
  },
  {
    id: "seg-08",
    chapterId: 3,
    startSec: 140,
    endSec: 160,
    sceneMode: VisualSceneMode.UNO_OVERVIEW,
    onScreenTitle: "توزيع العناصر على سطح لوحة Arduino UNO",
    keyTermEn: "Solderless Pin Headers",
    keyTermAr: "تصميم منظم للتوصيل بدون لحام",
    narrationAr:
      "لو دققت في تصميم اللوحة الزرقا دي هتلاقي كل حاجة في مكانها المظبوط: مداخل التغذية والكمبيوتر على الشمال، الشريحة الرئيسية في القلب، وصفين من الفتحات السودا فوق وتحت بنسميها Pins عشان نركب فيها الأسلاك مباشرة بدون لحام.",
  },
  {
    id: "seg-09",
    chapterId: 3,
    startSec: 160,
    endSec: 180,
    sceneMode: VisualSceneMode.UNO_OVERVIEW,
    onScreenTitle: "زرار Reset ولمبات البيان (ON / TX / RX / L)",
    keyTermEn: "Status LEDs & Reset Button",
    keyTermAr: "مؤشرات الكهرباء ونقل البيانات",
    narrationAr:
      "كمان هتلاحظ فوق على الشمال زرار اسمه Reset بيعيد تشغيل البرنامج من أول سطر لو احتجت، وجنب الأرجل في أربع لمبات صغيرة: لمبة ON بتأكد إن الكهرباء واصلة، ولمبتين TX و RX بينوروا وقت نقل البيانات، ولمبة L مربوطة بالرجل رقم 13.",
  },

  // ==================== MINUTE 3 - 4 (5 MACRO ZOOMS) ====================
  {
    id: "seg-10",
    chapterId: 4,
    startSec: 180,
    endSec: 192,
    sceneMode: VisualSceneMode.UNO_ZOOM_MCU,
    onScreenTitle: "1. المعالج الدقيق (Microcontroller - ATmega328P)",
    keyTermEn: "Microcontroller (ATmega328P)",
    keyTermAr: "المخ المدبر والذاكرة اللي بيتحفظ فيها الكود",
    narrationAr:
      "نقرب الكاميرا بقى على الخمس مكونات الأساسية: أول وأهم قطعة هي الشريحة السودا الطويلة دي، الـ Microcontroller واسمها ATmega328P. ده المخ الفعلي للبوردة اللي بيتخزن جواه الكود وينفذ أوامرك ملايين المرات في الثانية.",
  },
  {
    id: "seg-11",
    chapterId: 4,
    startSec: 192,
    endSec: 204,
    sceneMode: VisualSceneMode.UNO_ZOOM_DIGITAL,
    onScreenTitle: "2. الأرجل الرقمية (Digital Pins 0 – 13)",
    keyTermEn: "Digital Pins (HIGH 5V / LOW 0V)",
    keyTermAr: "14 رجل رقمية لحالتي التشغيل والإيقاف",
    narrationAr:
      "تاني مكون فوق هو الـ Digital Pins المترقمة من صفر لحد 13. كلمة ديجيتال يعني رقمي، يعني الرجل دي بتفهم وتخرج حالتين اتنين بس مفيش تالت ليهم: يا إما HIGH يعني شغالة بـ 5 فولت، يا إما LOW يعني مطفية بصفر فولت.",
  },
  {
    id: "seg-12",
    chapterId: 4,
    startSec: 204,
    endSec: 216,
    sceneMode: VisualSceneMode.UNO_ZOOM_ANALOG,
    onScreenTitle: "3. الأرجل التماثلية (Analog Pins A0 – A5)",
    keyTermEn: "Analog Input Pins (0 – 1023)",
    keyTermAr: "قراءة القيم المتدرجة من الحساسات",
    narrationAr:
      "تالت مكون تحت على اليمين هو الـ Analog Pins من A0 لحد A5. دي أرجل بتفهم التدرج مش بس شغال ومطفي؛ يعني تقدر تقيس درجة حرارة الأوضة أو شدة الإضاءة وتحول الفولت لرقم دقيق متدرج من صفر لحد 1023.",
  },
  {
    id: "seg-13",
    chapterId: 4,
    startSec: 216,
    endSec: 228,
    sceneMode: VisualSceneMode.UNO_ZOOM_USB,
    onScreenTitle: "4. منفذ الـ USB (USB Type-B Port)",
    keyTermEn: "USB Port (Code + 5V Power)",
    keyTermAr: "نقل الكود البرمجي وتغذية البوردة بالكهرباء",
    narrationAr:
      "رابع مكون على الشمال هو مدخل الـ USB الفضي. المدخل ده بيعمل وظيفتين في وقت واحد: بنوصل بيه البوردة بالكمبيوتر عشان نبعت الكود البرمجي، وفي نفس اللحظة بيدي البوردة الـ 5 فولت اللي محتاجاها عشان تشتغل.",
  },
  {
    id: "seg-14",
    chapterId: 4,
    startSec: 228,
    endSec: 240,
    sceneMode: VisualSceneMode.UNO_ZOOM_POWER,
    onScreenTitle: "5. أرجل الطاقة والأرضي (Power Pins: 5V, 3.3V, GND)",
    keyTermEn: "Power Pins (5V · 3.3V · GND · VIN)",
    keyTermAr: "تغذية الحساسات وإغلاق الدائرة بالأرضي GND",
    narrationAr:
      "خامس مكون تحت على الشمال هو الـ Power Pins: عندنا مخرج 5V ومخرج 3.3V عشان نغذي الحساسات، وعندنا أهم رجل في الإلكترونيات كلها وهي الـ GND أو الأرضي السالب، لأن من غير مسار راجع للـ GND مفيش أي دايرة بتشتغل!",
  },

  // ==================== MINUTE 4 - 5 ====================
  {
    id: "seg-15",
    chapterId: 5,
    startSec: 240,
    endSec: 260,
    sceneMode: VisualSceneMode.ARDUINO_IDE,
    onScreenTitle: "بيئة البرمجة الرسمية Arduino IDE",
    keyTermEn: "Arduino IDE & Sketch",
    keyTermAr: "كتابة الأوامر بلغة C/C++ مبسطة",
    narrationAr:
      "طيب إزاي بنكتب الأوامر ونفهمها للأردوينو؟ بننزل برنامج مجاني على الكمبيوتر اسمه Arduino IDE. جوه البرنامج ده بنكتب ملف الكود اللي بنسميه Sketch بلغة قريبة جداً من الإنجليزي البسيط ومبنية على لغة C بلس بلس.",
  },
  {
    id: "seg-16",
    chapterId: 5,
    startSec: 260,
    endSec: 280,
    sceneMode: VisualSceneMode.ARDUINO_IDE,
    onScreenTitle: "العمود الفقري للكود: setup() و loop()",
    keyTermEn: "void setup() vs void loop()",
    keyTermAr: "تهيئة لمرة واحدة مقابل تكرار مستمر",
    narrationAr:
      "أي كود أردوينو بيتكون من جزئين أساسيين: الجزء الأول void setup وده بيتنفذ مرة واحدة بس أول ما البوردة تشتغل عشان نعرف الأرجل. والجزء التاني void loop ومن اسمه بيفضل يعيد ويكرر الأوامر اللي جواه بلا توقف.",
    highlightCodeLines: [1, 4],
  },
  {
    id: "seg-17",
    chapterId: 5,
    startSec: 280,
    endSec: 300,
    sceneMode: VisualSceneMode.ARDUINO_IDE,
    onScreenTitle: "مراجعة الكود (Verify) ثم رفعه للوحة (Upload)",
    keyTermEn: "Verify (Compile) → Upload via USB",
    keyTermAr: "ترجمة الكود للغة الآلة وحفظه في المعالج",
    narrationAr:
      "لما بنخلص كتابة الكود بندوس أول زرار علامة الصح Verify عشان البرنامج يتأكد إن مفيش ولا غلطة ويترجم كلامنا لأصفار ووحايد، وبعدين ندوس زرار السهم Upload فالكود يتنقل في ثانية عبر كابل الـ USB لقلب البوردة!",
  },

  // ==================== MINUTE 5 - 7 (2 FULL MINUTES PRACTICAL LED PROJECT) ====================
  {
    id: "seg-18",
    chapterId: 6,
    startSec: 300,
    endSec: 320,
    sceneMode: VisualSceneMode.LED_PARTS,
    onScreenTitle: "المشروع العملي الأول: المكونات المطلوبة",
    keyTermEn: "UNO + Breadboard + LED + 220Ω",
    keyTermAr: "لوحة أونو · بردبورد · ليد أحمر · مقاومة 220 أوم",
    narrationAr:
      "دلوقتي جه وقت الشغل العملي! هنبني سوا أول مشروع حقيقي وهو التحكم في إضاءة لمبة LED. هنحتاج أربع حاجات قدامنا: لوحة Arduino UNO، لوحة تجارب Breadboard، لمبة LED، ومقاومة كهربائية قيمتها 220 أوم مع سلكين توصيل.",
  },
  {
    id: "seg-19",
    chapterId: 6,
    startSec: 320,
    endSec: 340,
    sceneMode: VisualSceneMode.LED_RESISTOR_WHY,
    onScreenTitle: "قطبية الـ LED ووظيفة المقاومة 220Ω لحمايته",
    keyTermEn: "Anode (+) · Cathode (-) · 220Ω Current Limiter",
    keyTermAr: "لماذا تحمي المقاومة الـ LED من الاحتراق؟",
    narrationAr:
      "ركز معايا أوي في المعلومة الهندسية دي: الـ LED ليه رجل طويلة اسمها Anode ودي الموجب، ورجل قصيرة اسمها Cathode ودي السالب. ولازم نوصل معاه مقاومة 220 أوم لأن الأردوينو بيخرج 5 فولت والـ LED بيستحمل حوالي 2 فولت بس، فالمقاومة بتحد التيار وتحميه ميتحرقش!",
  },
  {
    id: "seg-20",
    chapterId: 6,
    startSec: 340,
    endSec: 360,
    sceneMode: VisualSceneMode.LED_WIRING,
    onScreenTitle: "خطوات التوصيل الصحيحة على Pin 13 و GND",
    keyTermEn: "Pin 13 → 220Ω → Anode (+) | Cathode (-) → GND",
    keyTermAr: "مسار الدائرة الكهربائية المغلقة خطوة بخطوة",
    narrationAr:
      "نوصل الدايرة سوا بدقة: هناخد سلك من رجل Digital Pin 13 في الأردوينو لأول طرف في المقاومة الـ 220 أوم على البردبورد، والطرف التاني للمقاومة رايح للرجل الطويلة الموجب للـ LED. ومن الرجل القصيرة السالب نرجع بسلك أسود على رجل GND في الأردوينو!",
  },
  {
    id: "seg-21",
    chapterId: 6,
    startSec: 360,
    endSec: 380,
    sceneMode: VisualSceneMode.LED_CODE_SETUP,
    onScreenTitle: "شرح الكود سطراً بسطر: تهيئة المخرج في setup()",
    keyTermEn: "pinMode(13, OUTPUT);",
    keyTermAr: "تعريف الرجل رقم 13 كمخرج طاقة كهربائية",
    narrationAr:
      "تعال نفتح الكود ونفهم كل حرف فيه مفيش حفظ: جوه دالة void setup بنكتب pinMode بين قوسين 13 فاصلة OUTPUT ونقفل بفاصلة منقوطة. السطر ده بيعرف الأردوينو إن الرجل رقم 13 وظيفتها تخرج كهرباء للـ LED.",
    highlightCodeLines: [1, 2, 3],
  },
  {
    id: "seg-22",
    chapterId: 6,
    startSec: 380,
    endSec: 400,
    sceneMode: VisualSceneMode.LED_CODE_LOOP,
    onScreenTitle: "شرح الكود سطراً بسطر: الإضاءة والانتظار في loop()",
    keyTermEn: "digitalWrite(13, HIGH/LOW) + delay(1000)",
    keyTermAr: "إخراج 5 فولت لثانية ثم فصلها 0 فولت لثانية",
    narrationAr:
      "ننزل لدالة void loop: أول سطر digitalWrite(13, HIGH) يعني خرج 5 فولت على الرجل 13 فينور الـ LED. بعده delay(1000) يعني استنى ألف مللي ثانية اللي هي ثانية كاملة. بعدها digitalWrite(13, LOW) يفصل الفولت للصفر فيطفي، ثم delay(1000) ويعيد من الأول!",
    highlightCodeLines: [5, 6, 7, 8],
  },
  {
    id: "seg-23",
    chapterId: 6,
    startSec: 400,
    endSec: 420,
    sceneMode: VisualSceneMode.LED_LIVE_DEMO,
    onScreenTitle: "التشغيل العملي الحي: الـ LED ينبض فعلياً!",
    keyTermEn: "Live Hardware Execution (1 Hz Blink)",
    keyTermAr: "نجاح الدائرة وتدفق التيار عبر المقاومة للـ LED",
    narrationAr:
      "ارفع الكود واتفرج على الجمال ده! شايف الـ LED الأحمر بينور قدامك ثانية كاملة أول ما الكود ينفذ أمر HIGH، ويطفي ثانية كاملة مع أمر LOW؟ البساطة دي هي نفس الأساس اللي بنشغل بيه أكبر روبوت أو خط إنتاج في مصنع!",
    highlightCodeLines: [5, 6, 7, 8],
  },

  // ==================== MINUTE 7 - 8 ====================
  {
    id: "seg-24",
    chapterId: 7,
    startSec: 420,
    endSec: 440,
    sceneMode: VisualSceneMode.IO_COMPARISON,
    onScreenTitle: "القاعدة الذهبية في الروبوتكس: Input مقابل Output",
    keyTermEn: "Sensors (Inputs) vs Actuators (Outputs)",
    keyTermAr: "حواس الروبوت مقابل عضلاته ورد فعله",
    narrationAr:
      "عشان تكبر من مجرد تشغيل لمبة لبناء روبوت ذكي، لازم تفهم الفرق بين Input و Output. تخيل الأردوينو زي الإنسان بالظبط: الـ Input هو الحواس اللي بيجمع بيها معلومات من الجو حواليه، والـ Output هو رد الفعل والحركة.",
  },
  {
    id: "seg-25",
    chapterId: 7,
    startSec: 440,
    endSec: 460,
    sceneMode: VisualSceneMode.IO_COMPARISON,
    onScreenTitle: "أمثلة المدخلات (Inputs): كيف يشعر الأردوينو بالعالم؟",
    keyTermEn: "Ultrasonic · PIR · DHT11 · LDR · Push Button",
    keyTermAr: "حساس المسافة · الحركة · الحرارة · الإضاءة · الأزرار",
    narrationAr:
      "من أشهر أمثلة الـ Input عندنا الزرار Push Button، وحساس المسافة Ultrasonic اللي بيقيس بعد الأجسام، وحساس الحرارة والرطوبة، وحساس الضوء LDR. كل القطع دي بتبعت قراءات وإشارات تدخل لعقل الأردوينو.",
  },
  {
    id: "seg-26",
    chapterId: 7,
    startSec: 460,
    endSec: 480,
    sceneMode: VisualSceneMode.IO_COMPARISON,
    onScreenTitle: "أمثلة المخرجات (Outputs): كيف ينفذ الأردوينو القرار؟",
    keyTermEn: "LED · Buzzer · Servo Motor · DC Motor · Relay",
    keyTermAr: "تشغيل الإضاءة · الإنذار · المحركات · أجهزة المنزل",
    narrationAr:
      "الأردوينو يقرأ معلومة الحساس وياخد قرار بالكود، فيشغل الـ Output: زي إنه ينور LED، أو يشغل سرينة إنذار Buzzer، أو يحرك ذراع روبوت بموتور Servo، أو يشغل مروحة وتكييف عن طريق قطعة اسمها Relay!",
  },

  // ==================== MINUTE 8 - 9 ====================
  {
    id: "seg-27",
    chapterId: 8,
    startSec: 480,
    endSec: 500,
    sceneMode: VisualSceneMode.PROJECTS_SHOWCASE,
    onScreenTitle: "مشاريع تقدر تنفذها: روبوت متحرك ونظام إنذار",
    keyTermEn: "Project 1 & 2: Robotics & Security Alarm",
    keyTermAr: "1. روبوت متحرك وذراع آلي · 2. نظام إنذار بالحركة",
    narrationAr:
      "طب إيه المشاريع الحقيقية اللي تقدر تبنيها بنفسك؟ أول مشروع: روبوت بيتحرك أو ذراع آلي بيمسك الأشياء بمواتير الـ Servo. وتاني مشروع: نظام إنذار ذكي للبيت أول ما حساس الحركة يلقط أي شخص يشغل السرينة والإضاءة فوراً.",
    showcaseIndex: 0,
  },
  {
    id: "seg-28",
    chapterId: 8,
    startSec: 500,
    endSec: 520,
    sceneMode: VisualSceneMode.PROJECTS_SHOWCASE,
    onScreenTitle: "مشروع السيارة الذكية ذاتية تفادي العوائق",
    keyTermEn: "Project 3: Obstacle-Avoiding Smart Car",
    keyTermAr: "3. سيارة ذكية تقيس المسافة وتتفادى الحوائط تلقائياً",
    narrationAr:
      "تالت مشروع وده من أمتع المشاريع اللي طلابي بيعشقوها: سيارة ذكية بتتجنب العوائق لوحدها! بنركبلها حساس مسافة قدام وأربع مواتير، طول ما الطريق فاضي بتمشي، وأول ما تلاقي عائق بتفرمل وتختار طريق مفتوح وتكمل.",
    showcaseIndex: 2,
  },
  {
    id: "seg-29",
    chapterId: 8,
    startSec: 520,
    endSec: 540,
    sceneMode: VisualSceneMode.PROJECTS_SHOWCASE,
    onScreenTitle: "نظام الإضاءة الذكي والتحكم في الأجهزة بالموبايل",
    keyTermEn: "Project 4 & 5: Smart Lighting & Mobile IoT",
    keyTermAr: "4. إضاءة تلقائية ليلاً · 5. تحكم كامل من الموبايل",
    narrationAr:
      "رابع مشروع: نظام إضاءة ذكي ينور لوحده أول ما الليل يدخل ويوفر الكهرباء بالنهار. وخامس مشروع: ربط الأردوينو بالبلوتوث أو الواي فاي عشان تتحكم في أجهزة أوضتك كلها بلمسة زرار من شاشة موبايلك!",
    showcaseIndex: 4,
  },

  // ==================== MINUTE 9 - 10 ====================
  {
    id: "seg-30",
    chapterId: 9,
    startSec: 540,
    endSec: 560,
    sceneMode: VisualSceneMode.SUMMARY_RECAP,
    onScreenTitle: "ملخص سريع لرحلتنا النهارده",
    keyTermEn: "UNO Hardware + IDE Code + Safe Wiring",
    keyTermAr: "مراجعة الأساسيات الخمسة وأول دائرة عملية",
    narrationAr:
      "نراجع بسرعة اللي أنجزناه النهارده: عرفنا يعني إيه أردوينو، فصصنا لوحة Arduino UNO ومكوناتها الخمسة، فهمنا إزاي نكتب الكود في setup و loop، ووصلنا أول دايرة LED سليمة بمقاومة حماية 220 أوم وفهمنا الفرق بين Input و Output.",
  },
  {
    id: "seg-31",
    chapterId: 9,
    startSec: 560,
    endSec: 580,
    sceneMode: VisualSceneMode.SUMMARY_RECAP,
    onScreenTitle: "خطوتك العملية النهارده: جرب وعدّل بإيدك!",
    keyTermEn: "Hands-On Practice",
    keyTermAr: "غيّر قيمة delay() وجرب توصيل أكثر من LED",
    narrationAr:
      "عشان الكلام ده يثبت في دماغك، متكتفيش بالفرجة! افتح المعمل التفاعلي تحت الفيديو أو هات بوردة أونو وجرب تغير رقم الـ delay من ألف لـ ميتين وشوف سرعة النبض بتتغير إزاي، وجرب توصل ليد تاني على رجل رقم 12.",
  },
  {
    id: "seg-32",
    chapterId: 9,
    startSec: 580,
    endSec: 600,
    sceneMode: VisualSceneMode.OUTRO_CAMERA,
    onScreenTitle: "قاعدة المهندس الشاطر — إلى اللقاء في الدرس القادم",
    keyTermEn: "Understand How & Why",
    keyTermAr: "الفهم العميق قبل حفظ الأكواد",
    narrationAr:
      "وبكده نكون خدنا أول خطوة في عالم الأردوينو والروبوتكس. افتكر دايماً إن المهندس الشاطر مش اللي بيحفظ الأكواد، المهندس الشاطر هو اللي بيفهم إزاي الحاجة بتشتغل وليه. أشوفكم في الدرس الجاي، معاكم المهندس عمرو أحمد.",
  },
];

export interface CodeLineItem {
  lineNumber: number;
  code: string;
  explanationAr: string;
}

export const LED_PROJECT_CODE: CodeLineItem[] = [
  {
    lineNumber: 1,
    code: "void setup() {",
    explanationAr: "بداية دالة التهيئة — تعمل مرة واحدة فقط عند تشغيل اللوحة.",
  },
  {
    lineNumber: 2,
    code: "  pinMode(13, OUTPUT);",
    explanationAr: "ضبط الرجل الرقمية رقم 13 لتكون مخرج كهرباء (OUTPUT).",
  },
  {
    lineNumber: 3,
    code: "}",
    explanationAr: "نهاية دالة setup().",
  },
  {
    lineNumber: 4,
    code: "void loop() {",
    explanationAr: "بداية دالة التكرار المستمر طوال فترة توصيل الطاقة.",
  },
  {
    lineNumber: 5,
    code: "  digitalWrite(13, HIGH);",
    explanationAr: "إخراج جهد 5V على الرجل 13 ← يمر التيار عبر المقاومة 220Ω فينير الـ LED.",
  },
  {
    lineNumber: 6,
    code: "  delay(1000);",
    explanationAr: "الانتظار لمدة 1000 مللي ثانية (ثانية واحدة كاملة) والـ LED مضيء.",
  },
  {
    lineNumber: 7,
    code: "  digitalWrite(13, LOW);",
    explanationAr: "خفض الجهد إلى 0V على الرجل 13 ← ينطفئ الـ LED تماماً.",
  },
  {
    lineNumber: 8,
    code: "  delay(1000);",
    explanationAr: "الانتظار ثانية واحدة والـ LED منطفئ قبل تكرار الحلقة من جديد.",
  },
  {
    lineNumber: 9,
    code: "}",
    explanationAr: "نهاية دالة loop() والعودة تلقائياً للسطر رقم 5.",
  },
];

export const RAW_INO_SKETCH = `// الدرس الأول: تشغيل وإضاءة LED باستخدام Arduino UNO
// تقديم: المهندس عمرو أحمد — مهندس إلكترونيات وروبوتكس
// التوصيل السليم:
// - Pin 13  ---> طرف المقاومة 220Ω الأول
// - طرف المقاومة 220Ω الثاني ---> الطرف الطويل الموجب للـ LED (Anode +)
// - الطرف القصير السالب للـ LED (Cathode -) ---> منفذ الأرضي GND

void setup() {
  // تهيئة الرجل الرقمية 13 كمخرج للطاقة الكهربائية
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH); // إخراج 5 فولت لإضاءة الـ LED
  delay(1000);            // انتظار 1000 مللي ثانية (1 ثانية)
  digitalWrite(13, LOW);  // فصل الكهرباء (0 فولت) لإطفاء الـ LED
  delay(1000);            // انتظار 1000 مللي ثانية (1 ثانية)
}
`;

export const FIVE_PROJECTS_DATA = [
  {
    index: 1,
    titleAr: "روبوت متحرك وذراع آلي",
    componentsEn: "Arduino UNO + Servo Motors",
    descriptionAr: "تحريك المفاصل والعجلات بزوايا دقيقة لالتقاط الأجسام وتنفيذ المهام الميكانيكية.",
  },
  {
    index: 2,
    titleAr: "نظام إنذار أمني ذكي",
    componentsEn: "PIR Motion Sensor + Buzzer + LED",
    descriptionAr: "رصد أي حركة داخل الغرفة بالأشعة تحت الحمراء وتشغيل صافرة إنذار فورية.",
  },
  {
    index: 3,
    titleAr: "سيارة ذكية تتجنب العوائق",
    componentsEn: "HC-SR04 Ultrasonic + L298N Driver",
    descriptionAr: "قياس المسافة بالموجات فوق الصوتية وتغيير اتجاه المحركات تلقائياً قبل الاصطدام.",
  },
  {
    index: 4,
    titleAr: "نظام إضاءة ذكي موفر للطاقة",
    componentsEn: "LDR Light Sensor + Relay Module",
    descriptionAr: "قياس شدة إضاءة النهار وتشغيل الإنارة تلقائياً عند حلول الظلام.",
  },
  {
    index: 5,
    titleAr: "التحكم في الأجهزة بالموبايل",
    componentsEn: "Bluetooth HC-05 / WiFi + Relay",
    descriptionAr: "إرسال أوامر لاسلكية من تطبيق الهاتف لتشغيل وإيقاف الإضاءة والأجهزة المنزلية.",
  },
];

export function formatSecondsMMSS(seconds: number): string {
  const clamped = Math.max(0, Math.min(TOTAL_DURATION_SEC, Math.floor(seconds)));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function getSegmentAtTime(sec: number): LessonSegment {
  const clamped = Math.max(0, Math.min(TOTAL_DURATION_SEC - 0.001, sec));
  const found = LESSON_SEGMENTS.find(
    (seg) => clamped >= seg.startSec && clamped < seg.endSec
  );
  return found ?? LESSON_SEGMENTS[LESSON_SEGMENTS.length - 1];
}

export function getChapterAtTime(sec: number): LessonChapter {
  const clamped = Math.max(0, Math.min(TOTAL_DURATION_SEC - 0.001, sec));
  const found = LESSON_CHAPTERS.find(
    (ch) => clamped >= ch.startSec && clamped < ch.endSec
  );
  return found ?? LESSON_CHAPTERS[LESSON_CHAPTERS.length - 1];
}
