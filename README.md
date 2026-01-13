# LifeGuard AI 🚨

Real-time emergency response application powered by **Gemini API**. Analyzes images and audio to provide immediate, multilingual instructions for emergency situations.

## 🎯 Features

- **Real-time Analysis**: Instant emergency detection using Gemini's multimodal AI
- **Multilingual Support**: Arabic, French, and English
- **Voice Guidance**: Text-to-speech instructions in your language
- **Mobile Optimized**: Works on phones and tablets
- **Fast & Reliable**: Optimized for low-latency responses in critical moments
- **Smart Retry**: Automatic retry mechanism for robust analysis

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Gemini API Key (get from [Google AI Studio](https://aistudio.google.com))

### Installation

1. **Clone & Install**
```bash
cd lifeguard-ai
npm install
```

2. **Configure Environment**
```bash
# Create .env.local
echo "API_KEY=your_gemini_api_key_here" > .env.local
```

3. **Run Development Server**
```bash
npm run dev
```

4. **Open in Browser**
```
http://localhost:3000
```

## 📋 Emergency Types Detected

| Type | Trigger | Response |
|------|---------|----------|
| **Severe Bleeding** | Heavy bleeding, deep wounds, blood loss | Direct pressure, elevation, emergency call |
| **Fire/Smoke** | Flames, fire, smoke | Evacuation, stop drop roll, emergency call |
| **Not Emergency** | Normal scene | No action needed |

## 🏗️ Project Structure

```
lifeguard-ai/
├── app/
│   ├── page.tsx              # Main emergency interface
│   ├── emergency/page.tsx    # Legacy emergency page
│   ├── api/analyze/route.ts  # Gemini API endpoint
│   └── layout.tsx            # App layout
├── components/               # Reusable UI components
│   ├── CameraCapture.tsx     # Video feed & analysis UI
│   ├── DangerAlert.tsx       # Emergency instructions display
│   ├── EmergencyButton.tsx   # Start button
│   ├── ErrorToast.tsx        # Error notifications
│   └── LanguageSelector.tsx  # Language switcher
├── lib/
│   ├── gemini.ts            # Gemini API integration
│   ├── tts.ts               # Text-to-speech utilities
│   └── prompt.ts            # AI prompts
├── types/gemini.ts          # TypeScript types
└── package.json
```

## 🔑 API Configuration

### Gemini Model
- **Current**: `gemini-2.0-flash-001`
- **Capabilities**: Vision, Audio, Multimodal reasoning

### Environment Variables
```
API_KEY=your_gemini_api_key
```

## 📱 UX Flow

1. **Select Language** (AR/FR/EN)
2. **Press Emergency Button** (large red button)
3. **Allow Camera/Microphone** (browser permission)
4. **Tap "ANALYZE SCENE"** to capture image & audio
5. **Receive Instructions** (displayed & spoken)
6. **Call Emergency Services** (optional button)

## 🛠️ Development

### Build
```bash
npm run build
```

### Production
```bash
npm start
```

### Lint
```bash
npm run lint
```

## 📊 Component Details

### `CameraCapture`
- Manages video feed display
- Handles analysis UI state
- Shows recording indicator
- Floating analyze button

### `DangerAlert`
- Displays emergency type
- Shows danger level (CRITICAL/HIGH/MODERATE/LOW)
- Lists 1-3 immediate actions
- Provides replay audio button
- Shows critical warnings

### `LanguageSelector`
- Real-time language switching
- RTL support for Arabic
- Visual language indicator

## 🔊 Text-to-Speech

Supports natural speech in:
- **Arabic** (ar-SA) - Right-to-left
- **French** (fr-FR)
- **English** (en-US)

#### Advanced Features
```typescript
import { speak, stopSpeech } from '@/lib/tts';

// Speak with custom options
await speak("Emergency instruction", Language.ARABIC, {
  rate: 1.2,      // 1.2x speed
  pitch: 1,
  volume: 1
});

// Stop ongoing speech
stopSpeech();
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel deploy
```

### Docker
```bash
docker build -t lifeguard-ai .
docker run -p 3000:3000 lifeguard-ai
```

## 🔒 Security

- ✅ API key stored in `.env.local` (never committed)
- ✅ No data logging of emergency scenes
- ✅ Client-side audio/video processing
- ✅ HTTPS required for camera access

## 📈 Performance

- **Analysis Time**: ~2-5 seconds
- **Retry Logic**: 3 automatic retries on failure
- **Timeout**: 30 seconds max per analysis
- **Image Quality**: 85% JPEG compression

## ⚠️ Important Notes

- **Not a replacement for emergency services** - Always call 911/emergency services
- **Requires working microphone & camera**
- **Internet connection required** for Gemini API
- **Browser permissions** must be granted
- **Test thoroughly** before critical use

## 🤝 Contributing

To improve LifeGuard AI:

1. Test edge cases
2. Report bugs with screenshots
3. Suggest UX improvements
4. Add support for more languages

## 📄 License

MIT License - Safe for personal and commercial use

## 🆘 Support

- **Issues?** Check browser console for errors
- **No camera?** Grant permissions in browser settings
- **API errors?** Verify your Gemini API key is valid

---

**Save lives. Every second counts. 🚨**