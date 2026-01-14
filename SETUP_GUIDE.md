# LifeGuard AI - Setup & Configuration Guide

## 🔧 Environment Setup

### Step 1: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Copy the key

### Step 2: Configure Local Environment

Create `.env.local` in project root:

```env
API_KEY=your_gemini_api_key_here
```

⚠️ **Important**: Never commit `.env.local` to Git

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 📱 Browser Requirements

### Required APIs
- ✅ **getUserMedia()** - Camera & microphone access
- ✅ **Canvas API** - Image capture
- ✅ **MediaRecorder** - Audio recording
- ✅ **SpeechSynthesisUtterance** - Text-to-speech

### Supported Browsers
- Chrome 90+
- Firefox 90+
- Safari 14.1+
- Edge 90+

⚠️ **Mobile**: Works best on Android Chrome; iOS Safari has limitations with permissions

## 🎯 Testing the App

### Quick Test Flow

1. **Allow Permissions**
   - Click "START"
   - Grant camera & microphone access in browser

2. **Analyze a Test Scene**
   - Point camera at something (bleeding prop, fire image, etc.)
   - Click "ANALYZE SCENE"
   - Wait for AI response

3. **Check Output**
   - Emergency type should display
   - Danger level shown
   - Instructions spoken aloud
   - Test language switching

### Test Scenarios

**Scenario 1: Bleeding**
- Show a red cloth/fake blood
- Expected: "Severe Bleeding" + pressure instructions

**Scenario 2: Fire**
- Show fire image/video
- Expected: "Fire or Smoke" + evacuation instructions

**Scenario 3: Normal**
- Show regular scene (desk, chair, etc.)
- Expected: "Not an Emergency"

## 🐛 Troubleshooting

### Camera Not Working

**Problem**: Camera feed is black
```
Solution:
1. Check browser permissions (settings > site permissions)
2. Ensure camera is not in use by another app
3. Try different browser
4. Check device camera with: chrome://media-internals/
```

### Microphone Not Recording

**Problem**: Audio button shows but no audio
```
Solution:
1. Grant microphone permission
2. Test with: recorder.getAudioTracks().length > 0
3. Check audio input in system settings
```

### Gemini API Error

**Problem**: "Failed to analyze" error
```
Solution:
1. Verify API_KEY in .env.local
2. Check API key is valid in Google AI Studio
3. Ensure internet connection
4. Check browser console for details
5. Rate limit? Wait 60 seconds
```

### Text-to-Speech Not Working

**Problem**: Instructions not spoken
```
Solution:
1. Check browser speaker volume
2. Verify language locale (ar-SA, fr-FR, en-US)
3. Test with: window.speechSynthesis.getVoices()
4. Check browser doesn't have speech disabled
```

## 🚀 Production Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variable
vercel env add API_KEY

# Deploy
vercel
```

### Environment Variables on Vercel
1. Go to Project Settings
2. Environment Variables
3. Add `API_KEY` with your Gemini API key

### Docker Deployment

```dockerfile
# Build
docker build -t lifeguard-ai .

# Run
docker run -e API_KEY=your_key -p 3000:3000 lifeguard-ai
```

## 📊 Performance Optimization

### Image Compression
- JPEG quality: 85% (good balance)
- Resolution: 1080p max
- Reduces API processing time

### Audio Format
- Format: WebM audio
- Duration: 2-5 seconds max
- Reduces upload time

### Retry Strategy
- Max retries: 3
- Retry delay: 2 seconds
- Timeout: 30 seconds

## 🔒 Security Best Practices

### API Key Protection
```javascript
// ✅ Correct - Environment variable
const key = process.env.API_KEY;

// ❌ Wrong - Hardcoded
const key = 'sk-xxxxx';

// ❌ Wrong - In client-side code
fetch('/api/analyze', {
  headers: {
    'X-API-Key': 'sk-xxxxx' // EXPOSED!
  }
});
```

### HTTPS Requirement
- Camera/mic requires HTTPS (or localhost)
- Deployment must be HTTPS

### Data Privacy
- No images stored on server
- No audio logs
- User data not shared
- Only temporary processing

## 📈 Monitoring & Logs

### Check Browser Logs
```javascript
// Open DevTools (F12)
// Console tab shows:
// ✓ Gemini API responses
// ✗ Error messages
// ⓘ Info messages
```

### API Response Example
```json
{
  "type": "Severe Bleeding",
  "dangerLevel": "CRITICAL",
  "actions": [
    "Call emergency services immediately",
    "Apply direct pressure to wound",
    "Keep victim lying down"
  ],
  "warning": "Life-threatening bleeding detected"
}
```

## 🎓 Code Examples

### Custom Analysis
```typescript
import { analyzeEmergency } from '@/lib/gemini';

const result = await analyzeEmergency(
  imageBase64,
  audioBase64,
  Language.ENGLISH
);
```

### Custom TTS
```typescript
import { speak, stopSpeech } from '@/lib/tts';

// Speak
await speak(
  "This is an emergency!",
  Language.ARABIC,
  { rate: 1.2 }
);

// Stop
stopSpeech();
```

## ✅ Pre-Launch Checklist

- [ ] API key configured in `.env.local`
- [ ] Camera permission working
- [ ] Microphone permission working
- [ ] Test scenarios run successfully
- [ ] All 3 languages working (AR/FR/EN)
- [ ] TTS working in all languages
- [ ] Mobile tested (if applicable)
- [ ] Deployed to Vercel/hosting
- [ ] Custom domain configured (if desired)
- [ ] Error handling tested

## 📞 Support

Need help?
- Check browser console for errors
- Review `.env.local` setup
- Test API key in Google AI Studio
- Verify browser supports required APIs

---

**Ready to save lives? Deploy LifeGuard AI today!** 🚨