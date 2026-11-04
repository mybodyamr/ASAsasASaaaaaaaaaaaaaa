import PptxGenJS from "pptxgenjs";
import {
  FIVE_PROJECTS_DATA,
  LED_PROJECT_CODE,
  LESSON_CHAPTERS,
  LESSON_METADATA,
  RAW_INO_SKETCH,
} from "../data/lessonData";

export async function exportLessonPresentationPptx(): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.rtlMode = true;
  pptx.author = LESSON_METADATA.instructorName;
  pptx.company = "معمل المهندس عمرو أحمد للإلكترونيات والروبوتكس";
  pptx.subject = LESSON_METADATA.title;
  pptx.title = LESSON_METADATA.title;

  const BG_DARK = "0B1120";
  const CARD_BG = "111827";
  const TEAL = "00979D";
  const CYAN_LIGHT = "38BDF8";
  const AMBER = "F59E0B";
  const TEXT_LIGHT = "F8FAFC";
  const TEXT_MUTED = "94A3B8";

  // Slide 1: Cover Slide
  const slide1 = pptx.addSlide();
  slide1.background = { color: BG_DARK };
  slide1.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.14,
    fill: { color: TEAL },
  });
  slide1.addText("سلسلة تعلم الإلكترونيات والروبوتكس من الصفر", {
    x: 0.7,
    y: 1.0,
    w: 8.6,
    h: 0.45,
    fontSize: 15,
    color: CYAN_LIGHT,
    align: "right",
    rtlMode: true,
    fontFace: "Arial",
  });
  slide1.addText(LESSON_METADATA.title, {
    x: 0.7,
    y: 1.6,
    w: 8.6,
    h: 1.3,
    fontSize: 30,
    bold: true,
    color: TEXT_LIGHT,
    align: "right",
    rtlMode: true,
    fontFace: "Arial",
  });
  slide1.addText(
    `تقديم: ${LESSON_METADATA.instructorName} — ${LESSON_METADATA.instructorRole}`,
    {
      x: 0.7,
      y: 3.1,
      w: 8.6,
      h: 0.5,
      fontSize: 18,
      bold: true,
      color: AMBER,
      align: "right",
      rtlMode: true,
      fontFace: "Arial",
    }
  );
  slide1.addText(
    "درس عملي متكامل مدته 10 دقائق: فهم لوحة Arduino UNO R3، تشريح المكونات الأساسية، البرمجة ببيئة Arduino IDE، وتنفيذ أول دائرة إضاءة LED بمقاومة حماية 220Ω.",
    {
      x: 0.7,
      y: 3.8,
      w: 8.6,
      h: 0.9,
      fontSize: 14,
      color: TEXT_MUTED,
      align: "right",
      rtlMode: true,
      fontFace: "Arial",
    }
  );

  // Slide 2: 10-Minute Roadmap
  const slide2 = pptx.addSlide();
  slide2.background = { color: BG_DARK };
  slide2.addText("خريطة الدرس الكاملة (10 دقائق)", {
    x: 0.6,
    y: 0.4,
    w: 8.8,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: TEXT_LIGHT,
    align: "right",
    rtlMode: true,
    fontFace: "Arial",
  });

  LESSON_CHAPTERS.forEach((ch, idx) => {
    const col = idx < 5 ? 5.1 : 0.6;
    const rowIdx = idx < 5 ? idx : idx - 5;
    const yPos = 1.2 + rowIdx * 0.82;
    slide2.addShape(pptx.ShapeType.roundRect, {
      x: col,
      y: yPos,
      w: 4.3,
      h: 0.7,
      fill: { color: CARD_BG },
      line: { color: "1E293B", pt: 1 },
    });
    slide2.addText(`${ch.timeRangeLabel}  |  ${ch.title}`, {
      x: col + 0.15,
      y: yPos + 0.08,
      w: 4.0,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: CYAN_LIGHT,
      align: "right",
      rtlMode: true,
      fontFace: "Arial",
    });
    slide2.addText(ch.summary, {
      x: col + 0.15,
      y: yPos + 0.36,
      w: 4.0,
      h: 0.28,
      fontSize: 9.5,
      color: TEXT_MUTED,
      align: "right",
      rtlMode: true,
      fontFace: "Arial",
    });
  });

  // Slide 3: What is Arduino?
  const slide3 = pptx.addSlide();
  slide3.background = { color: BG_DARK };
  slide3.addText("يعني إيه Arduino؟ وإزاي بيشتغل؟", {
    x: 0.6,
    y: 0.45,
    w: 8.8,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: TEXT_LIGHT,
    align: "right",
    rtlMode: true,
    fontFace: "Arial",
  });
  const conceptBoxes = [
    {
      title: "1. كتابة الأوامر (Code)",
      desc: "نكتب أوامر منطقية واضحة بلغة C/C++ المبسطة داخل برنامج Arduino IDE على الكمبيوتر.",
      x: 6.6,
    },
    {
      title: "2. المعالجة (Arduino Brain)",
      desc: "لوحة إلكترونية مفتوحة المصدر تستقبل الكود وتحفظه داخل المعالج الدقيق ATmega328P.",
      x: 3.5,
    },
    {
      title: "3. التنفيذ (Hardware Action)",
      desc: "تحويل الأوامر البرمجية إلى إشارات كهربائية حقيقية (5V / 0V) لتشغيل الـ LED والمحركات.",
      x: 0.4,
    },
  ];
  conceptBoxes.forEach((b) => {
    slide3.addShape(pptx.ShapeType.roundRect, {
      x: b.x,
      y: 1.5,
      w: 2.9,
      h: 2.8,
      fill: { color: CARD_BG },
      line: { color: TEAL, pt: 1.5 },
    });
    slide3.addText(b.title, {
      x: b.x + 0.2,
      y: 1.75,
      w: 2.5,
      h: 0.55,
      fontSize: 15,
      bold: true,
      color: AMBER,
      align: "right",
      rtlMode: true,
      fontFace: "Arial",
    });
    slide3.addText(b.desc, {
      x: b.x + 0.2,
      y: 2.4,
      w: 2.5,
      h: 1.6,
      fontSize: 12.5,
      color: TEXT_LIGHT,
      align: "right",
      rtlMode: true,
      fontFace: "Arial",
    });
  });

  // Slide 4: 5 Core Components of Arduino UNO
  const slide4 = pptx.addSlide();
  slide4.background = { color: BG_DARK };
  slide4.addText("المكونات الـ 5 الأساسية للوحة Arduino UNO R3", {
    x: 0.6,
    y: 0.4,
    w: 8.8,
    h: 0.6,
    fontSize: 23,
    bold: true,
    color: TEXT_LIGHT,
    align: "right",
    rtlMode: true,
    fontFace: "Arial",
  });

  const pinRows: PptxGenJS.TableRow[] = [
    [
      { text: "الوظيفة الهندسية بالبلدي", options: { bold: true, fill: { color: TEAL }, color: TEXT_LIGHT, align: "right" } },
      { text: "المكون على البوردة", options: { bold: true, fill: { color: TEAL }, color: TEXT_LIGHT, align: "right" } },
    ],
    [
      { text: "المخ المدبر والذاكرة التي يُحفظ بداخلها الكود وينفذ الأوامر ملايين المرات بالثانية.", options: { color: TEXT_LIGHT, fill: { color: CARD_BG }, align: "right" } },
      { text: "Microcontroller (ATmega328P)", options: { bold: true, color: CYAN_LIGHT, fill: { color: CARD_BG }, align: "left" } },
    ],
    [
      { text: "أرجل رقمية مرقمة من 0 إلى 13، تتعامل مع حالتين فقط: HIGH (5V) أو LOW (0V).", options: { color: TEXT_LIGHT, fill: { color: BG_DARK }, align: "right" } },
      { text: "Digital Pins (0 – 13)", options: { bold: true, color: CYAN_LIGHT, fill: { color: BG_DARK }, align: "left" } },
    ],
    [
      { text: "أرجل تماثلية تقرأ القيم المتدرجة من الحساسات كالحرارة والإضاءة بدقة من 0 إلى 1023.", options: { color: TEXT_LIGHT, fill: { color: CARD_BG }, align: "right" } },
      { text: "Analog Pins (A0 – A5)", options: { bold: true, color: CYAN_LIGHT, fill: { color: CARD_BG }, align: "left" } },
    ],
    [
      { text: "يربط اللوحة بالكمبيوتر لرفع الكود البرمجي ويمد اللوحة بتغذية 5V في نفس الوقت.", options: { color: TEXT_LIGHT, fill: { color: BG_DARK }, align: "right" } },
      { text: "USB Port (Type-B)", options: { bold: true, color: CYAN_LIGHT, fill: { color: BG_DARK }, align: "left" } },
    ],
    [
      { text: "مخارج الطاقة (5V و 3.3V) ومنافذ الأرضي السالب (GND) الضرورية لإغلاق أي دائرة.", options: { color: TEXT_LIGHT, fill: { color: CARD_BG }, align: "right" } },
      { text: "Power Pins (5V, 3.3V, GND, VIN)", options: { bold: true, color: CYAN_LIGHT, fill: { color: CARD_BG }, align: "left" } },
    ],
  ];

  slide4.addTable(pinRows, {
    x: 0.6,
    y: 1.2,
    w: 8.8,
    colW: [5.8, 3.0],
    border: { type: "solid", color: "1E293B", pt: 1 },
    fontFace: "Arial",
    fontSize: 12,
    rowH: 0.58,
  });

  // Slide 5: First Practical Project Wiring & Resistor Physics
  const slide5 = pptx.addSlide();
  slide5.background = { color: BG_DARK };
  slide5.addText("المشروع العملي الأول: توصيل LED ومقاومة حماية 220Ω", {
    x: 0.6,
    y: 0.4,
    w: 8.8,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: TEXT_LIGHT,
    align: "right",
    rtlMode: true,
    fontFace: "Arial",
  });
  slide5.addShape(pptx.ShapeType.roundRect, {
    x: 0.6,
    y: 1.2,
    w: 8.8,
    h: 3.8,
    fill: { color: CARD_BG },
    line: { color: TEAL, pt: 1.2 },
  });
  slide5.addText(
    "• المكونات المطلوبة: لوحة Arduino UNO + لوحة تجارب Breadboard + ليد أحمر 5mm + مقاومة 220Ω + أسلاك توصيل.\n\n" +
      "• قطبية الـ LED:\n" +
      "   - الطرف الطويل هو الموجب (Anode +).\n" +
      "   - الطرف القصير هو السالب (Cathode -).\n\n" +
      "• لماذا نستخدم المقاومة 220Ω؟\n" +
      "   مخرج الأردوينو يعطي 5V بينما يتحمل الـ LED الأحمر حوالي 2V فقط؛ تقوم المقاومة بتحديد التيار عند ~14mA لحماية الـ LED من الاحتراق الفوري.\n\n" +
      "• مسار التوصيل الصحيح 100%:\n" +
      "   Digital Pin 13  ←  المقاومة 220Ω  ←  الطرف الطويل الموجب (Anode +)  |  الطرف القصير السالب (Cathode -)  ←  GND",
    {
      x: 0.9,
      y: 1.4,
      w: 8.2,
      h: 3.4,
      fontSize: 13.5,
      color: TEXT_LIGHT,
      align: "right",
      rtlMode: true,
      fontFace: "Arial",
    }
  );

  // Slide 6: Code Line-by-Line Explanation
  const slide6 = pptx.addSlide();
  slide6.background = { color: BG_DARK };
  slide6.addText("شرح كود المشروع الأول سطراً بسطر (Arduino IDE)", {
    x: 0.6,
    y: 0.35,
    w: 8.8,
    h: 0.55,
    fontSize: 22,
    bold: true,
    color: TEXT_LIGHT,
    align: "right",
    rtlMode: true,
    fontFace: "Arial",
  });

  const codeRows: PptxGenJS.TableRow[] = LED_PROJECT_CODE.map((item) => [
    {
      text: item.explanationAr,
      options: { color: TEXT_LIGHT, fill: { color: CARD_BG }, align: "right", fontSize: 11 },
    },
    {
      text: item.code,
      options: { color: AMBER, fill: { color: "0F172A" }, align: "left", fontFace: "Courier New", fontSize: 11, bold: true },
    },
  ]);

  slide6.addTable(codeRows, {
    x: 0.6,
    y: 1.05,
    w: 8.8,
    colW: [5.3, 3.5],
    border: { type: "solid", color: "1E293B", pt: 0.8 },
    rowH: 0.42,
  });

  // Slide 7: Input vs Output + 5 Projects
  const slide7 = pptx.addSlide();
  slide7.background = { color: BG_DARK };
  slide7.addText("الفرق بين Input و Output + 5 مشاريع تطبيقية", {
    x: 0.6,
    y: 0.4,
    w: 8.8,
    h: 0.55,
    fontSize: 22,
    bold: true,
    color: TEXT_LIGHT,
    align: "right",
    rtlMode: true,
    fontFace: "Arial",
  });

  slide7.addShape(pptx.ShapeType.roundRect, {
    x: 5.1,
    y: 1.15,
    w: 4.3,
    h: 1.55,
    fill: { color: CARD_BG },
    line: { color: CYAN_LIGHT, pt: 1 },
  });
  slide7.addText(
    "المدخلات (Inputs — حواس الأردوينو):\nالأزرار Push Button · حساس المسافة Ultrasonic · حساس الحرارة DHT11 · حساس الضوء LDR.",
    {
      x: 5.25,
      y: 1.3,
      w: 4.0,
      h: 1.25,
      fontSize: 12,
      color: TEXT_LIGHT,
      align: "right",
      rtlMode: true,
      fontFace: "Arial",
    }
  );

  slide7.addShape(pptx.ShapeType.roundRect, {
    x: 0.6,
    y: 1.15,
    w: 4.3,
    h: 1.55,
    fill: { color: CARD_BG },
    line: { color: AMBER, pt: 1 },
  });
  slide7.addText(
    "المخرجات (Outputs — عضلات الأردوينو):\nإضاءة LED · صافرة Buzzer · محركات Servo & DC · ريلاي Relay لتشغيل أجهزة المنزل.",
    {
      x: 0.75,
      y: 1.3,
      w: 4.0,
      h: 1.25,
      fontSize: 12,
      color: TEXT_LIGHT,
      align: "right",
      rtlMode: true,
      fontFace: "Arial",
    }
  );

  const projText = FIVE_PROJECTS_DATA.map(
    (p) => `${p.index}. ${p.titleAr} (${p.componentsEn}): ${p.descriptionAr}`
  ).join("\n");

  slide7.addShape(pptx.ShapeType.roundRect, {
    x: 0.6,
    y: 2.9,
    w: 8.8,
    h: 2.25,
    fill: { color: CARD_BG },
    line: { color: "1E293B", pt: 1 },
  });
  slide7.addText(projText, {
    x: 0.8,
    y: 3.05,
    w: 8.4,
    h: 1.95,
    fontSize: 11.5,
    color: TEXT_LIGHT,
    align: "right",
    rtlMode: true,
    fontFace: "Arial",
  });

  // Slide 8: Closing Quote by Eng. Amr Ahmed
  const slide8 = pptx.addSlide();
  slide8.background = { color: BG_DARK };
  slide8.addText("رسالة المهندس عمرو أحمد لكل طالب يبدأ الرحلة", {
    x: 0.7,
    y: 0.9,
    w: 8.6,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: CYAN_LIGHT,
    align: "center",
    rtlMode: true,
    fontFace: "Arial",
  });
  slide8.addShape(pptx.ShapeType.roundRect, {
    x: 1.0,
    y: 1.7,
    w: 8.0,
    h: 2.5,
    fill: { color: CARD_BG },
    line: { color: TEAL, pt: 2 },
  });
  slide8.addText(
    '"وبكده نكون خدنا أول خطوة في عالم الأردوينو والروبوتكس. افتكر دايماً إن المهندس الشاطر مش اللي بيحفظ الأكواد، المهندس الشاطر هو اللي بيفهم إزاي الحاجة بتشتغل وليه. أشوفكم في الدرس الجاي، معاكم المهندس عمرو أحمد."',
    {
      x: 1.4,
      y: 2.05,
      w: 7.2,
      h: 1.8,
      fontSize: 18,
      bold: true,
      color: TEXT_LIGHT,
      align: "center",
      rtlMode: true,
      fontFace: "Arial",
    }
  );

  await pptx.writeFile({
    fileName: "Arduino_UNO_Masterclass_Eng_Amr_Ahmed.pptx",
  });
}

export function downloadArduinoSketchFile(): void {
  const blob = new Blob([RAW_INO_SKETCH], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "first_led_amr_ahmed.ino";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
