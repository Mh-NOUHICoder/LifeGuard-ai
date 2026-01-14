# LifeGuard AI - Complete Project Roadmap

## Project Overview
LifeGuard AI is a real-time emergency response application that uses Google Gemini 3 Pro AI to analyze images and provide instant emergency guidance. The app supports English, Arabic, and French languages with automatic voice output.

---

# ENGLISH DOCUMENTATION

## 1. ROOT CONFIGURATION FILES

### `package.json`
- **Purpose**: Node.js project configuration and dependency management
- **Contains**: Project metadata, scripts (dev, build, start), all npm dependencies
- **Key Dependencies**:
  - Next.js 16.1.1: React framework for production
  - React 19.2.3: UI library
  - TypeScript: Type-safe development
  - Tailwind CSS 4: Utility-first CSS framework
  - Framer Motion: Animation library
  - Google GenAI SDK: Gemini AI integration
  - Lucide React: Icon library

### `tsconfig.json`
- **Purpose**: TypeScript compiler configuration
- **Contains**: Compiler options, path aliases, module resolution settings
- **Key Settings**: Strict mode enabled, JSX support, ES2020 target

### `next.config.ts`
- **Purpose**: Next.js application configuration
- **Contains**: Webpack configuration, optimization settings
- **Key Settings**: Turbopack compiler enabled for fast builds

### `.env.local`
- **Purpose**: Environment variables (not committed to git)
- **Contains**: `API_KEY` - Google Gemini API authentication key
- **Security**: Keep this file private, never share the API key

### `.gitignore`
- **Purpose**: Specifies files to exclude from git version control
- **Contains**: node_modules/, .next/, .env.local, etc.

### `eslint.config.mjs`
- **Purpose**: Code quality and style checking rules
- **Contains**: ESLint configuration for consistent code standards

### `postcss.config.mjs`
- **Purpose**: PostCSS configuration for CSS processing
- **Contains**: Tailwind CSS plugin integration

---

## 2. APPLICATION ENTRY POINT

### `app/layout.tsx`
- **Purpose**: Root layout wrapper for entire application
- **Key Features**:
  - Sets up HTML metadata (title, description, viewport)
  - Applies global styles from `globals.css`
  - Provides layout for all pages
  - Configures viewport settings for responsive design
  - RTL support for Arabic language

### `app/globals.css`
- **Purpose**: Global CSS styles applied to entire application
- **Contains**: Tailwind CSS directives, custom font configurations
- **Key Styles**: Dark theme colors, spacing system, animations

### `app/page.tsx` (MAIN APPLICATION FILE)
- **Purpose**: Main emergency response application
- **Key Responsibilities**:
  1. **State Management**: Tracks language, emergency mode, analysis status, results, errors
  2. **Camera Management**: Starts/stops camera, handles permissions, flips camera
  3. **Audio Recording**: Captures audio during emergency
  4. **AI Analysis**: Sends image/audio to Gemini API for analysis
  5. **Error Handling**: Comprehensive error logging and user feedback
  6. **Retry Logic**: Automatically retries failed analyses up to 3 times
  7. **Text-to-Speech**: Reads emergency instructions aloud
  8. **Language Support**: Passes language to all components
- **Main Functions**:
  - `toggleEmergency()`: Activate/deactivate emergency mode
  - `startCamera()`: Initialize media stream with permissions
  - `captureAndAnalyze()`: Capture image/audio and send to AI
  - `flipCamera()`: Switch between front and rear camera
  - `speak()`: Text-to-speech output

---

## 3. API ENDPOINTS

### `app/api/analyze/route.ts` (MAIN AI ANALYSIS)
- **Purpose**: Server-side API endpoint for Gemini AI analysis
- **Method**: POST
- **Accepts**: `{ image: base64, audio: base64, language: string }`
- **Key Features**:
  1. Receives image data from client
  2. Constructs detailed prompt in selected language
  3. Calls Google Gemini 3 Pro API with image
  4. Parses JSON response from AI
  5. Validates emergency type, danger level, and action steps
  6. Returns structured emergency data
- **Error Handling**: Tries multiple JSON extraction methods, provides detailed logs
- **Response Format**:
  ```json
  {
    "type": "Severe Bleeding | Fire or Smoke | Not an Emergency",
    "dangerLevel": "CRITICAL | HIGH | MODERATE | LOW",
    "actions": ["action 1", "action 2", "action 3"],
    "warning": "urgent message or empty"
  }
  ```

### `app/api/test-gemini/route.ts`
- **Purpose**: Testing endpoint for Gemini API connectivity
- **Method**: POST
- **Used For**: Debugging and verifying API configuration
- **Tests**: API key validity, model availability

---

## 4. UI COMPONENTS

### `components/EmergencyButton.tsx`
- **Purpose**: Large circular start button to activate emergency mode
- **Features**:
  - Circular design with press-and-hold detection (2-second hold)
  - Animated progress ring showing hold progress
  - Fingerprint icon that changes color when pressed
  - Responsive text sizing (Arabic uses larger font)
  - Glow effect for visibility
  - All text translated to selected language
- **Props**: `language`, `onStart` callback
- **Status Messages**: "Press and hold", "HOLDING...", "Keep holding to activate..."

### `components/CameraCapture.tsx`
- **Purpose**: Camera feed display and analysis controls
- **Features**:
  1. Live video stream from camera
  2. Recording indicator (REC ●)
  3. Flip camera button (front/rear)
  4. Blue "ANALYZE SCENE" button with processing state
  5. "CALL EMERGENCY" button for direct phone call
  6. Exit button to stop emergency mode
  7. Point camera instruction text
  8. Loading spinner during analysis
  9. Responsive design for mobile/tablet
- **Props**: `videoRef`, `isAnalyzing`, `language`, `onAnalyze`, `onStop`, `onFlipCamera`
- **Fixed Elements**: Bottom button stays visible while scrolling

### `components/DangerAlert.tsx`
- **Purpose**: Display emergency analysis results and instructions
- **Features**:
  1. Shows emergency type (with icon: fire/water)
  2. Displays danger level (CRITICAL/HIGH/MODERATE/LOW)
  3. Lists numbered action steps (2-3 steps)
  4. Shows warning message if critical
  5. Volume button to repeat instructions via speech
  6. Color-coded background (red for critical, dark for moderate)
  7. All text translated to selected language
- **Props**: `instruction`, `language`, `onSpeak`
- **Dynamic Styling**: Red background for CRITICAL/HIGH, neutral for LOW/MODERATE

### `components/ErrorToast.tsx`
- **Purpose**: Display error messages to user
- **Features**:
  1. Fixed position at bottom of screen
  2. Shows error message with icon
  3. Dismiss button to close
  4. Animated entrance from bottom
  5. Auto-positioned for mobile/desktop
- **Props**: `message`, `onDismiss`

### `components/LanguageSelector.tsx`
- **Purpose**: Language switcher dropdown menu
- **Features**:
  1. Displays three language buttons: English, Arabic, French
  2. Highlights currently selected language
  3. Updates entire app when clicked
  4. Fixed position in header
- **Props**: `selectedLanguage`, `onLanguageChange`
- **Action**: Clicking language immediately changes all UI text

### `components/DebugPanel.tsx`
- **Purpose**: Development debugging panel
- **Features**:
  1. Shows system capability checks (HTTPS, WebRTC, Canvas, etc.)
  2. Status indicators (green checkmark for working, red X for issues)
  3. Collapsible panel to save space
  4. Lists available system APIs
  5. Shows supported speech synthesis voices
- **Props**: None
- **Used For**: Troubleshooting permission and browser capability issues

---

## 5. BUSINESS LOGIC LIBRARIES

### `lib/gemini.ts`
- **Purpose**: Wrapper around Gemini AI API calls
- **Main Function**: `analyzeEmergency(imageBuffer, audioBuffer, language)`
- **Process**:
  1. Validates input image and audio
  2. Calls `/api/analyze` endpoint with image data
  3. Receives and parses emergency analysis response
  4. Converts response to TypeScript EmergencyInstruction type
  5. Returns structured data or throws error
- **Error Handling**: Detailed console logging for debugging

### `lib/permissions.ts`
- **Purpose**: Handle camera and microphone permission requests
- **Main Function**: `requestMediaPermissionsWithFacing(facingMode)`
- **Features**:
  1. Requests camera and microphone access from browser
  2. Supports both front ('user') and rear ('environment') cameras
  3. Multiple fallback constraint levels for compatibility
  4. Detects secure context (HTTPS or localhost)
  5. Returns stream or detailed error message
- **Error Messages**: 
  - Permission denied errors
  - No device found errors
  - Security context errors
  - Browser compatibility errors
- **Fallback Levels**: 5 different constraint combinations for maximum device support

### `lib/tts.ts` (Text-to-Speech)
- **Purpose**: Convert text instructions to audio output
- **Main Function**: `speak(text, language)`
- **Features**:
  1. Uses Web Speech Synthesis API
  2. Selects appropriate voice based on language:
     - English: English voices (Google, Alex, etc.)
     - Arabic: Arabic voices (Sara, etc.)
     - French: French voices (Monet, etc.)
  3. Adjusts speech rate and pitch per language
  4. Falls back to default if language voice unavailable
  5. Handles browser compatibility issues
- **Function**: `stopSpeech()` - Cancels ongoing speech output
- **Voice Selection**: Automatically finds best available voice for language

### `lib/translations.ts`
- **Purpose**: Multi-language translation dictionary
- **Supported Languages**: English, Arabic (RTL), French
- **Categories**: App UI, Emergency messages, Error messages
- **Main Function**: `t(language, key)` - Returns translated text
- **Translation Keys**:
  - `app.startButton`: Start button text
  - `app.analyzeScene`: Analyze scene button
  - `app.processing`: Processing status
  - `emergency.dangerLevel`: Danger level label
  - `errors.cameraPermission`: Permission error message
  - And 20+ more keys
- **RTL Support**: Arabic automatically uses right-to-left layout

### `lib/utils.ts`
- **Purpose**: Utility helper functions
- **May contain**: Common functions, data formatting, calculations

### `lib/prompt.ts`
- **Purpose**: AI prompt templates
- **May contain**: System prompts, instruction templates for Gemini

---

## 6. TYPE DEFINITIONS

### `types/gemini.ts`
- **Purpose**: TypeScript type definitions and enums
- **Enums**:
  - `Language`: ENGLISH, ARABIC, FRENCH
  - `EmergencyType`: BLEEDING, FIRE, NONE
  - `DangerLevel`: CRITICAL, HIGH, MODERATE, LOW
- **Interfaces**:
  - `EmergencyInstruction`: Structure of AI analysis response
  - `AppState`: Main application state object
- **Use**: Ensures type safety throughout the application

---

## 7. PUBLIC ASSETS

### `public/`
- **Purpose**: Static files served directly
- **Contains**: Icons, images, fonts, favicon
- **Access**: Files at `/public/file.png` accessible as `/file.png`

---

## 8. WORKFLOW

### Emergency Analysis Flow:
1. User starts app and selects language
2. User clicks large red circular START button (2-second hold)
3. App requests camera/microphone permissions
4. Camera feed displays with live video
5. User points camera at emergency scene
6. User clicks blue "ANALYZE SCENE" button
7. App captures image frame and audio chunk
8. Image sent to `/api/analyze` endpoint with selected language
9. Endpoint sends image to Google Gemini 3 Pro API
10. Gemini analyzes image and returns emergency details
11. Analysis results displayed in DangerAlert component
12. Instructions automatically read aloud using TTS
13. User can repeat instructions by clicking volume button
14. User can call emergency services with "CALL EMERGENCY" button
15. User can exit emergency mode by clicking "EXIT" button

### Language Switch Flow:
1. User clicks language button in header (English/Arabic/French)
2. LanguageSelector passes new language to app state
3. All component props updated with new language
4. All UI text re-renders in selected language
5. Translation system uses new language for all strings
6. Next AI analysis will respond in selected language
7. Text-to-speech will use selected language voice

---

## 9. KEY FEATURES

✅ **Real-time Emergency Detection**: AI analyzes images instantly
✅ **Multi-language Support**: English, Arabic, French with RTL for Arabic
✅ **Voice Guidance**: Text-to-speech reads emergency instructions
✅ **Camera Controls**: Flip between front and rear camera
✅ **Mobile Optimized**: Responsive design, touch-friendly buttons
✅ **Error Recovery**: Automatic retries with detailed error messages
✅ **Browser Compatibility**: Multiple fallback levels for permissions
✅ **Secure**: Server-side API calls, secure context checks
✅ **Accessibility**: Large buttons, clear visual feedback
✅ **Performance**: Optimized images, efficient state management

---

## 10. TECHNOLOGY STACK

| Layer | Technology |
|-------|-----------|
| Frontend Framework | Next.js 16.1.1 with React 19.2.3 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion |
| AI Engine | Google Gemini 3 Pro API |
| Icons | Lucide React |
| Build Tool | Turbopack |
| Runtime | Node.js |
| Deployment | Vercel |

---

---

# وثائق عربية - ARABIC DOCUMENTATION

## نظرة عامة على المشروع
LifeGuard AI هو تطبيق استجابة طوارئ فوري يستخدم ذكاء Gemini 3 Pro من Google لتحليل الصور وتقديم إرشادات طوارئ فورية. يدعم التطبيق اللغات الإنجليزية والعربية والفرنسية مع إخراج صوتي تلقائي.

---

## 1. ملفات التكوين الجذر

### `package.json`
- **الغرض**: تكوين مشروع Node.js وإدارة الاعتماديات
- **يحتوي على**: بيانات المشروع، النصوص (dev، build، start)، جميع اعتماديات npm
- **الاعتماديات الرئيسية**:
  - Next.js 16.1.1: إطار عمل React للإنتاج
  - React 19.2.3: مكتبة واجهة المستخدم
  - TypeScript: تطوير آمن من حيث النوع
  - Tailwind CSS 4: إطار عمل CSS موجه للأداة المساعدة
  - Framer Motion: مكتبة الرسوم المتحركة
  - Google GenAI SDK: تكامل Gemini AI
  - Lucide React: مكتبة الرموز

### `tsconfig.json`
- **الغرض**: تكوين مترجم TypeScript
- **يحتوي على**: خيارات المترجم، أسماء المسارات المستعارة، إعدادات دقة الوحدة النمطية
- **الإعدادات الرئيسية**: وضع صارم مفعل، دعم JSX، هدف ES2020

### `next.config.ts`
- **الغرض**: تكوين تطبيق Next.js
- **يحتوي على**: تكوين Webpack، إعدادات التحسين
- **الإعدادات الرئيسية**: مترجم Turbopack مفعل لبناء سريع

### `.env.local`
- **الغرض**: متغيرات البيئة (لم يتم تطبيقها على git)
- **يحتوي على**: `API_KEY` - مفتاح مصادقة Google Gemini API
- **الأمان**: احتفظ بهذا الملف خاصًا، لا تشارك مفتاح API أبدًا

### `.gitignore`
- **الغرض**: يحدد الملفات المستبعدة من التحكم في إصدار git
- **يحتوي على**: node_modules/، .next/، .env.local، إلخ

### `eslint.config.mjs`
- **الغرض**: قواعد فحص جودة وأسلوب الكود
- **يحتوي على**: تكوين ESLint لمعايير كود متسقة

### `postcss.config.mjs`
- **الغرض**: تكوين PostCSS لمعالجة CSS
- **يحتوي على**: تكامل ملحق Tailwind CSS

---

## 2. نقطة دخول التطبيق

### `app/layout.tsx`
- **الغرض**: غلاف التخطيط الجذر لتطبيق كامل
- **الميزات الرئيسية**:
  - إعداد بيانات HTML الفوقية (العنوان، الوصف، منفذ العرض)
  - تطبيق الأنماط العالمية من `globals.css`
  - توفير التخطيط لجميع الصفحات
  - تكوين إعدادات منفذ العرض للتصميم المتجاوب
  - دعم RTL للغة العربية

### `app/globals.css`
- **الغرض**: أنماط CSS عالمية مطبقة على التطبيق بأكمله
- **يحتوي على**: توجيهات Tailwind CSS، تكوينات الخطوط المخصصة
- **الأنماط الرئيسية**: ألوان المظهر الداكن، نظام المسافات، الرسوم المتحركة

### `app/page.tsx` (ملف التطبيق الرئيسي)
- **الغرض**: تطبيق الاستجابة للطوارئ الرئيسي
- **المسؤوليات الرئيسية**:
  1. **إدارة الحالة**: تتبع اللغة، وضع الطوارئ، حالة التحليل، والنتائج والأخطاء
  2. **إدارة الكاميرا**: بدء / إيقاف الكاميرا، معالجة الأذونات، قلب الكاميرا
  3. **تسجيل الصوت**: التقط الصوت أثناء حالة الطوارئ
  4. **تحليل AI**: إرسال الصورة / الصوت إلى Gemini API للتحليل
  5. **معالجة الأخطاء**: تسجيل شامل للأخطاء وتعليقات المستخدم
  6. **منطق إعادة المحاولة**: إعادة محاولة التحليلات الفاشلة تلقائيًا حتى 3 مرات
  7. **تحويل النص إلى كلام**: قراءة تعليمات الطوارئ بصوت عالٍ
  8. **دعم اللغة**: يمرر اللغة إلى جميع المكونات
- **الوظائف الرئيسية**:
  - `toggleEmergency()`: تفعيل / إلغاء تفعيل وضع الطوارئ
  - `startCamera()`: تهيئة البث الإعلامي مع الأذونات
  - `captureAndAnalyze()`: التقط الصورة / الصوت وأرسله إلى AI
  - `flipCamera()`: التبديل بين كاميرا أمامية وخلفية
  - `speak()`: إخراج تحويل النص إلى كلام

---

## 3. نقاط نهاية API

### `app/api/analyze/route.ts` (تحليل AI الرئيسي)
- **الغرض**: نقطة نهاية API من جانب الخادم لتحليل Gemini AI
- **الطريقة**: POST
- **يقبل**: `{ image: base64, audio: base64, language: string }`
- **الميزات الرئيسية**:
  1. يستقبل بيانات الصور من العميل
  2. يبني موجهة مفصلة باللغة المختارة
  3. يستدعي واجهة برمجية Google Gemini 3 Pro مع الصورة
  4. يحلل استجابة JSON من AI
  5. يتحقق من نوع الطوارئ ومستوى الخطر وخطوات الإجراء
  6. يعيد البيانات الهيكلية للطوارئ
- **معالجة الأخطاء**: يحاول طرقًا متعددة لاستخراج JSON، يوفر سجلات مفصلة
- **تنسيق الاستجابة**:
  ```json
  {
    "type": "نزيف حاد | حريق أو دخان | لا توجد حالة طوارئ",
    "dangerLevel": "حرج | عالي | معتدل | منخفض",
    "actions": ["إجراء 1", "إجراء 2", "إجراء 3"],
    "warning": "رسالة عاجلة أو فارغة"
  }
  ```

### `app/api/test-gemini/route.ts`
- **الغرض**: نقطة نهاية الاختبار لاتصال Gemini API
- **الطريقة**: POST
- **مستخدم من قبل**: تصحيح وتحقق من تكوين API
- **الاختبارات**: صحة مفتاح API، توفر النموذج

---

## 4. مكونات واجهة المستخدم

### `components/EmergencyButton.tsx`
- **الغرض**: زر البداية الكبير الدائري لتفعيل وضع الطوارئ
- **الميزات**:
  - تصميم دائري مع كشف الضغط المستمر (2 ثانية)
  - حلقة تقدم متحركة تظهر تقدم الضغط
  - رمز بصمة يتغير اللون عند الضغط
  - حجم نص متجاوب (اللغة العربية تستخدم خط أكبر)
  - تأثير توهج للرؤية
  - جميع النصوص مترجمة إلى اللغة المختارة
- **Props**: `language`، `onStart` callback
- **رسائل الحالة**: "اضغط واستمر"، "جاري الضغط..."، "استمر في الضغط للتفعيل..."

### `components/CameraCapture.tsx`
- **الغرض**: عرض البث المباشر للكاميرا وعناصر التحكم في التحليل
- **الميزات**:
  1. بث فيديو حي من الكاميرا
  2. مؤشر التسجيل (REC ●)
  3. زر قلب الكاميرا (أمامي / خلفي)
  4. زر "تحليل المشهد" الأزرق مع حالة المعالجة
  5. زر "اتصل بالطوارئ" للاتصال المباشر بالهاتف
  6. زر الخروج لإيقاف وضع الطوارئ
  7. نص تعليمات توجيه الكاميرا
  8. برعة التحميل أثناء التحليل
  9. تصميم متجاوب للهاتف المحمول / الجهاز اللوحي
- **Props**: `videoRef`, `isAnalyzing`, `language`, `onAnalyze`, `onStop`, `onFlipCamera`
- **العناصر الثابتة**: يبقى الزر السفلي مرئيًا أثناء التمرير

### `components/DangerAlert.tsx`
- **الغرض**: عرض نتائج تحليل الطوارئ والتعليمات
- **الميزات**:
  1. يعرض نوع الطوارئ (مع الرمز: حريق / ماء)
  2. يعرض مستوى الخطر (حرج / عالي / معتدل / منخفض)
  3. يسرد خطوات الإجراء المرقمة (2-3 خطوات)
  4. يعرض رسالة تحذير إذا كانت حرجة
  5. زر مكبر الصوت لتكرار التعليمات عبر الكلام
  6. خلفية بألوان مشفرة (أحمر للحرج، داكن للمعتدل)
  7. جميع النصوص مترجمة إلى اللغة المختارة
- **Props**: `instruction`, `language`, `onSpeak`
- **التنسيق الديناميكي**: خلفية حمراء للحرج / العالي، محايدة للمنخفض / المعتدل

### `components/ErrorToast.tsx`
- **الغرض**: عرض رسائل الخطأ للمستخدم
- **الميزات**:
  1. موضع ثابت في أسفل الشاشة
  2. يعرض رسالة الخطأ مع الرمز
  3. زر إغلاق
  4. دخول متحرك من الأسفل
  5. موضع تلقائي للهاتف المحمول / سطح المكتب
- **Props**: `message`, `onDismiss`

### `components/LanguageSelector.tsx`
- **الغرض**: مفتاح تبديل اللغة
- **الميزات**:
  1. يعرض ثلاثة أزرار لغة: الإنجليزية، العربية، الفرنسية
  2. يسلط الضوء على اللغة المختارة حاليًا
  3. يحدث التطبيق بأكمله عند النقر
  4. موضع ثابت في الرأس
- **Props**: `selectedLanguage`, `onLanguageChange`
- **الإجراء**: يؤدي النقر على اللغة إلى تغيير جميع نصوص واجهة المستخدم على الفور

### `components/DebugPanel.tsx`
- **الغرض**: لوحة تصحيح التطوير
- **الميزات**:
  1. يعرض فحوصات القدرة على النظام (HTTPS، WebRTC، Canvas، إلخ)
  2. مؤشرات الحالة (علامة اختيار خضراء للعمل، X أحمر للمشاكل)
  3. لوحة قابلة للطي لتوفير المساحة
  4. يسرد واجهات برمجية النظام المدعومة
  5. يعرض أصوات تركيب الكلام المدعومة
- **Props**: لا أحد
- **مستخدم من قبل**: استكشاف أخطاء وإصلاح أخطاء الأذونات والقدرة على المتصفح

---

## 5. مكتبات منطق الأعمال

### `lib/gemini.ts`
- **الغرض**: جسر حول استدعاءات Gemini AI API
- **الدالة الرئيسية**: `analyzeEmergency(imageBuffer, audioBuffer, language)`
- **العملية**:
  1. التحقق من صحة الصورة والصوت المدخول
  2. استدعاء نقطة نهاية `/api/analyze` ببيانات الصورة
  3. تلقي واستجابة تحليل الطوارئ من التحليل
  4. تحويل الاستجابة إلى نوع EmergencyInstruction في TypeScript
  5. إرجاع البيانات المنظمة أو رفع خطأ
- **معالجة الأخطاء**: تسجيل تفصيلي للكونسول لتصحيح الأخطاء

### `lib/permissions.ts`
- **الغرض**: التعامل مع طلبات إذن الكاميرا والميكروفون
- **الدالة الرئيسية**: `requestMediaPermissionsWithFacing(facingMode)`
- **الميزات**:
  1. طلب إذن الوصول إلى الكاميرا والميكروفون من المتصفح
  2. دعم كاميرات أمامية ('user') وخلفية ('environment')
  3. مستويات قيد احتياطية متعددة للتوافق
  4. يكتشف السياق الآمن (HTTPS أو localhost)
  5. إرجاع البث أو رسالة خطأ مفصلة
- **رسائل الخطأ**: 
  - أخطاء الإذن المرفوضة
  - لم يتم العثور على أخطاء الجهاز
  - أخطاء السياق الأمني
  - أخطاء توافق المتصفح
- **مستويات الاحتياط**: 5 مستويات مختلفة من القيود للحصول على الحد الأقصى من دعم الجهاز

### `lib/tts.ts` (تحويل النص إلى كلام)
- **الغرض**: تحويل تعليمات النص إلى إخراج صوتي
- **الدالة الرئيسية**: `speak(text, language)`
- **الميزات**:
  1. يستخدم Web Speech Synthesis API
  2. يختار الصوت المناسب بناءً على اللغة:
     - الإنجليزية: أصوات إنجليزية (Google، Alex، إلخ)
     - العربية: أصوات عربية (سارة، إلخ)
     - الفرنسية: أصوات فرنسية (Monet، إلخ)
  3. تعديل معدل الكلام والطبقة لكل لغة
  4. الرجوع إلى الافتراضي إذا لم تتوفر صوت اللغة
  5. معالجة مشاكل توافق المتصفح
- **الدالة**: `stopSpeech()` - إلغاء إخراج الكلام الجاري
- **اختيار الصوت**: يجد تلقائيًا أفضل صوت متاح للغة

### `lib/translations.ts`
- **الغرض**: قاموس الترجمة متعدد اللغات
- **اللغات المدعومة**: الإنجليزية، العربية (RTL)، الفرنسية
- **الفئات**: واجهة مستخدم التطبيق، رسائل الطوارئ، رسائل الخطأ
- **الدالة الرئيسية**: `t(language, key)` - إرجاع النص المترجم
- **مفاتيح الترجمة**:
  - `app.startButton`: نص زر البداية
  - `app.analyzeScene`: زر تحليل المشهد
  - `app.processing`: حالة المعالجة
  - `emergency.dangerLevel`: تسمية مستوى الخطر
  - `errors.cameraPermission`: رسالة خطأ الإذن
  - و 20+ مفتاح آخر
- **دعم RTL**: اللغة العربية تستخدم تلقائيًا تخطيطًا من اليمين إلى اليسار

### `lib/utils.ts`
- **الغرض**: وظائف مساعدة مفيدة
- **قد يحتوي على**: وظائف شائعة، تنسيق البيانات، الحسابات

### `lib/prompt.ts`
- **الغرض**: قوالب موجهة AI
- **قد يحتوي على**: موجهات النظام، قوالب التعليمات لـ Gemini

---

## 6. تعريفات الأنواع

### `types/gemini.ts`
- **الغرض**: تعريفات نوع TypeScript والتعدادات
- **التعدادات**:
  - `Language`: ENGLISH، ARABIC، FRENCH
  - `EmergencyType`: BLEEDING، FIRE، NONE
  - `DangerLevel`: CRITICAL، HIGH، MODERATE، LOW
- **الواجهات**:
  - `EmergencyInstruction`: هيكل استجابة تحليل AI
  - `AppState`: كائن حالة التطبيق الرئيسي
- **الاستخدام**: يضمن سلامة النوع عبر التطبيق

---

## 7. الأصول العامة

### `public/`
- **الغرض**: الملفات الثابتة المقدمة مباشرة
- **يحتوي على**: الرموز والصور والخطوط وfavicon
- **الوصول**: الملفات في `/public/file.png` يمكن الوصول إليها باسم `/file.png`

---

## 8. سير العمل

### تدفق تحليل الطوارئ:
1. يبدأ المستخدم التطبيق ويختار اللغة
2. المستخدم ينقر على زر البداية الأحمر الدائري الكبير (2 ثانية)
3. يطلب التطبيق أذونات الكاميرا / الميكروفون
4. عرض البث الحي للكاميرا مع الفيديو المباشر
5. يشير المستخدم بالكاميرا إلى حالة الطوارئ
6. المستخدم ينقر على الزر الأزرق "تحليل المشهد"
7. يلتقط التطبيق إطار صورة وجزء صوتي
8. يتم إرسال الصورة إلى نقطة نهاية `/api/analyze` باللغة المختارة
9. تُرسل نقطة النهاية الصورة إلى واجهة برمجية Google Gemini 3 Pro
10. يحلل Gemini الصورة ويعيد تفاصيل الطوارئ
11. يتم عرض نتائج التحليل في مكون DangerAlert
12. يتم قراءة التعليمات بصوت عالٍ تلقائيًا باستخدام TTS
13. يمكن للمستخدم تكرار التعليمات بالنقر على زر مكبر الصوت
14. يمكن للمستخدم الاتصال بخدمات الطوارئ بزر "اتصل بالطوارئ"
15. يمكن للمستخدم الخروج من وضع الطوارئ بالنقر على زر "الخروج"

### تدفق تبديل اللغة:
1. ينقر المستخدم على زر اللغة في الرأس (إنجليزي / عربي / فرنسي)
2. يمرر LanguageSelector اللغة الجديدة إلى حالة التطبيق
3. يتم تحديث جميع Props المكون باللغة الجديدة
4. يتم إعادة عرض جميع نصوص واجهة المستخدم باللغة المختارة
5. يستخدم نظام الترجمة اللغة الجديدة لجميع السلاسل
6. سيرد تحليل AI التالي باللغة المختارة
7. سيستخدم تحويل النص إلى كلام صوت اللغة المختارة

---

## 9. الميزات الرئيسية

✅ **كشف الطوارئ في الوقت الفعلي**: AI يحلل الصور على الفور
✅ **دعم متعدد اللغات**: اللغات الإنجليزية والعربية والفرنسية مع RTL للعربية
✅ **التوجيه الصوتي**: يقرأ تحويل النص إلى كلام تعليمات الطوارئ
✅ **عناصر التحكم في الكاميرا**: قلب بين كاميرا أمامية وخلفية
✅ **محسّنة للهاتف المحمول**: تصميم متجاوب وأزرار سهلة الاستخدام
✅ **استرجاع الأخطاء**: إعادة محاولات تلقائية مع رسائل خطأ مفصلة
✅ **توافق المتصفح**: مستويات احتياطية متعددة للأذونات
✅ **آمن**: استدعاءات API من جانب الخادم وفحوصات السياق الآمن
✅ **إمكانية الوصول**: أزرار كبيرة ومعلومات بصرية واضحة
✅ **الأداء**: الصور المحسنة، إدارة الحالة الفعالة

---

## 10. مجموعة التكنولوجيا

| الطبقة | التكنولوجيا |
|--------|-----------|
| إطار عمل الواجهة الأمامية | Next.js 16.1.1 مع React 19.2.3 |
| اللغة | TypeScript |
| التنسيق | Tailwind CSS 4 |
| الرسوم المتحركة | Framer Motion |
| محرك AI | واجهة برمجية Google Gemini 3 Pro |
| الرموز | Lucide React |
| أداة البناء | Turbopack |
| وقت التشغيل | Node.js |
| النشر | Vercel |

---

