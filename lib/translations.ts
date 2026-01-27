import { Language } from '@/types/gemini';

export const translations = {
  [Language.ENGLISH]: {
    app: {
      title: 'LifeGuard AI',
      subtitle: 'Real-time Emergency Response',
      startButton: 'START',
      callEmergency: ' CALL EMERGENCY',
      exit: 'EXIT',
      analyzeScene: 'ANALYZE SCENE',
      processing: 'PROCESSING...',
      pointCamera: 'Point camera at emergency scene and tap to analyze',
      flipCamera: 'Flip camera',
      repeatInstructions: 'Repeat instructions',
      analyzing: 'ANALYZING SCENE...',
      recording: 'REC',
      debug: 'Debug',
      checkConsole: 'Check browser console for detailed logs',
      https: 'HTTPS',
      mediaDevices: 'Media Devices',
      getUserMedia: 'Get User Media',
      speechSynthesis: 'Speech Synthesis',
      canvas: 'Canvas',
      startButtonDescription: 'Tap to begin real-time emergency analysis and AI guidance',
      holding: 'HOLDING...',
      pressAndHold: 'Press and hold for 2 seconds',
      keepHolding: 'Keep holding to activate...',
    },
    emergency: {
      dangerLevel: 'Danger Level',
      warning: 'Warning',
      noEmergency: 'No emergency detected',
      ensureSafe: 'Ensure you are in a safe environment',
    },
    errors: {
      cameraPermission: '❌ Permission Denied: Please click "Allow" when prompted for camera/microphone access.',
      noCameraFound: '❌ No Camera/Microphone Found: Please check your device hardware.',
      securityError: '⚠️ Security Error: Try refreshing the page or use HTTPS.',
      failedAccess: '❌ Failed to access camera/microphone. Please retry.',
      analysisFailed: 'Analysis failed',
      networkError: 'Network error - check your internet connection',
      apiAuthFailed: 'API authentication failed - check configuration',
      timeout: 'Request timeout - server not responding',
      retrying: 'Retrying...',
    },
  },
  [Language.ARABIC]: {
    app: {
      title: 'حارس الحياة AI',
      subtitle: 'الاستجابة للطوارئ في الوقت الفعلي',
      startButton: 'ابدأ',
      callEmergency: ' اتصل بالطوارئ',
      exit: 'خروج',
      analyzeScene: 'تحليل المشهد',
      processing: 'جاري المعالجة...',
      pointCamera: 'وجه الكاميرا نحو حالة الطوارئ واضغط للتحليل',
      flipCamera: 'قلب الكاميرا',
      repeatInstructions: 'كرر التعليمات',
      analyzing: 'جاري تحليل المشهد...',
      recording: 'تسجيل',
      debug: 'تصحيح',
      checkConsole: 'تحقق من وحدة تحكم المتصفح للحصول على سجلات مفصلة',
      https: 'HTTPS',
      mediaDevices: 'أجهزة الوسائط',
      getUserMedia: 'الحصول على وسائط المستخدم',
      speechSynthesis: 'تركيب الكلام',
      canvas: 'لوحة الرسم',
      startButtonDescription: 'انقر للبدء في تحليل الطوارئ في الوقت الفعلي والحصول على إرشادات الذكاء الاصطناعي',
      holding: 'جاري الضغط...',
      pressAndHold: 'اضغط واستمر لمدة ثانيتين',
      keepHolding: 'استمر في الضغط للتفعيل...',
    },
    emergency: {
      dangerLevel: 'مستوى الخطر',
      warning: 'تحذير',
      noEmergency: 'لا توجد حالة طوارئ',
      ensureSafe: 'تأكد من أنك في مكان آمن',
    },
    errors: {
      cameraPermission: '❌ تم رفض الإذن: يرجى النقر على "السماح" عند المطالبة بالوصول إلى الكاميرا والميكروفون.',
      noCameraFound: '❌ لم يتم العثور على كاميرا أو ميكروفون: يرجى التحقق من أجهزة جهازك.',
      securityError: '⚠️ خطأ أمني: جرب تحديث الصفحة أو استخدم HTTPS.',
      failedAccess: '❌ فشل الوصول إلى الكاميرا والميكروفون. يرجى المحاولة مرة أخرى.',
      analysisFailed: 'فشل التحليل',
      networkError: 'خطأ في الشبكة - تحقق من اتصال الإنترنت لديك',
      apiAuthFailed: 'فشل المصادقة - تحقق من التكوين',
      timeout: 'انتهت مهلة الانتظار - الخادم لا يستجيب',
      retrying: 'إعادة المحاولة...',
    },
  },
  [Language.FRENCH]: {
    app: {
      title: 'LifeGuard AI',
      subtitle: 'Réponse aux urgences en temps réel',
      startButton: 'COMMENCER',
      callEmergency: ' APPELER LES URGENCES',
      exit: 'QUITTER',
      analyzeScene: 'ANALYSER LA SCÈNE',
      processing: 'TRAITEMENT...',
      pointCamera: 'Pointez la caméra vers la situation d\'urgence et appuyez pour analyser',
      flipCamera: 'Retourner la caméra',
      repeatInstructions: 'Répéter les instructions',
      analyzing: 'ANALYSE DE LA SCÈNE EN COURS...',
      recording: 'ENREG',
      debug: 'Débogage',
      checkConsole: 'Vérifiez la console du navigateur pour les journaux détaillés',
      https: 'HTTPS',
      mediaDevices: 'Appareils médias',
      getUserMedia: 'Obtenir les médias de l\'utilisateur',
      speechSynthesis: 'Synthèse vocale',
      canvas: 'Canevas',
      startButtonDescription: 'Appuyez pour commencer l\'analyse d\'urgence en temps réel et les conseils d\'IA',
      holding: 'APPUI EN COURS...',
      pressAndHold: 'Appuyez et maintenez pendant 2 secondes',
      keepHolding: 'Continuez à maintenir pour activer...',
    },
    emergency: {
      dangerLevel: 'Niveau de danger',
      warning: 'Avertissement',
      noEmergency: 'Aucune urgence détectée',
      ensureSafe: 'Assurez-vous que vous êtes dans un environnement sûr',
    },
    errors: {
      cameraPermission: '❌ Permission refusée : veuillez cliquer sur "Autoriser" lorsque vous êtes invité à accéder à la caméra et au microphone.',
      noCameraFound: '❌ Aucune caméra ou microphone trouvé : veuillez vérifier le matériel de votre appareil.',
      securityError: '⚠️ Erreur de sécurité : essayez d\'actualiser la page ou utilisez HTTPS.',
      failedAccess: '❌ Impossible d\'accéder à la caméra et au microphone. Veuillez réessayer.',
      analysisFailed: 'Échec de l\'analyse',
      networkError: 'Erreur réseau - vérifiez votre connexion Internet',
      apiAuthFailed: 'Erreur d\'authentification de l\'API - vérifiez la configuration',
      timeout: 'Délai d\'expiration - le serveur ne répond pas',
      retrying: 'Nouvelle tentative...',
    },
  },
};

export const getTranslation = (language: Language, key: string): string => {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || key;
};

export const t = (language: Language, key: string): string => {
  return getTranslation(language, key);
};
