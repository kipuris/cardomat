# Cardomat Mobile App

A React Native mobile application for managing digital loyalty cards with barcode scanning, secure storage, and cloud synchronization.

## Features

### 🎴 Digital Card Management
- Store unlimited loyalty cards digitally
- Scan cards using camera or upload from gallery
- Manual card entry with validation
- Beautiful card templates with gradient designs
- Categorization and favorites system

### 📱 Barcode & QR Code Support
- Real-time barcode scanning with camera
- Support for multiple formats: QR Code, Code128, Code39, EAN13, UPC-A
- OCR text recognition for card details
- Barcode generation and display
- Gallery import with image processing

### 🔐 Security & Storage
- AES-256 encryption for sensitive data
- Secure local storage with AsyncStorage
- Encrypted card numbers and barcode data
- Biometric authentication (planned)
- Privacy-focused design

### ☁️ Cloud Sync & Offline Support
- Multi-device synchronization
- Offline-first architecture
- Automatic sync when online
- Conflict resolution
- Backup and restore functionality

### 🧭 Navigation & UI
- Tab-based navigation with 5 main screens
- Material Design components
- Dark/light theme support (planned)
- Responsive design for iOS and Android
- Intuitive user experience

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **Storage**: AsyncStorage + Encryption
- **Camera**: Expo Camera & Barcode Scanner
- **Network**: Axios + NetInfo
- **Graphics**: React Native SVG
- **State**: Context API + useReducer

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Expo CLI
- iOS Simulator (macOS) or Android Emulator

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cardomat/mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   ```bash
   npm run ios     # iOS Simulator
   npm run android # Android Emulator
   npm run web     # Web browser
   ```

## Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── CardTemplate.tsx
│   │   └── SyncStatusBar.tsx
│   ├── contexts/           # React contexts for state management
│   │   └── AppContext.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useCards.ts
│   │   ├── useSync.ts
│   │   └── useSettings.ts
│   ├── navigation/         # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── screens/           # App screens/pages
│   │   ├── DashboardScreen.tsx
│   │   ├── CardsScreen.tsx
│   │   ├── ScanScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/          # Business logic & API services
│   │   ├── ApiService.ts
│   │   ├── SyncService.ts
│   │   ├── BarcodeService.ts
│   │   ├── EncryptionService.ts
│   │   └── OCRService.ts
│   ├── types/             # TypeScript type definitions
│   │   ├── card.ts
│   │   └── navigation.ts
│   └── utils/             # Utility functions
├── assets/                # Images, fonts, etc.
├── App.tsx               # Main app component
├── app.json             # Expo configuration
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript configuration
```

## Key Features Implementation

### Card Scanning
- Camera permission handling
- Real-time barcode detection
- OCR text extraction
- Manual fallback entry
- Data validation

### Secure Storage
- Sensitive data encryption
- Secure key management
- Card number masking
- Privacy protection

### Offline Support
- Local-first architecture
- Pending changes queue
- Automatic sync on reconnect
- Conflict resolution
- Network status monitoring

### Cross-Platform
- iOS and Android support
- Platform-specific optimizations
- Native performance
- Consistent UI/UX

## API Integration

The mobile app integrates with the Cardomat backend API:

- **Authentication**: JWT-based auth
- **Cards**: CRUD operations with sync
- **Transactions**: History tracking
- **Locations**: Store finder & suggestions
- **Offers**: Personalized deals

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build:ios
npm run build:android
```

## Configuration

### Environment Variables
Create a `.env` file with:
```
API_BASE_URL=http://localhost:3000/api/v1
ENCRYPTION_KEY=your-encryption-key
```

### App Configuration
Edit `app.json` for Expo settings:
- App name and version
- Platform configurations
- Permissions
- Assets and icons

## Security Considerations

- Sensitive data is encrypted before storage
- Network requests use HTTPS
- API keys are securely managed
- Biometric authentication for app access
- No sensitive data in logs or error reporting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   npx react-native start --reset-cache
   ```

2. **iOS build fails**
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Android build fails**
   ```bash
   cd android && ./gradlew clean && cd ..
   ```

### Debug Mode
Enable debug logging in development:
```typescript
__DEV__ && console.log('Debug info');
```

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Open an issue on GitHub
- Contact: support@cardomat.com