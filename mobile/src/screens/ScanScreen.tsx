import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';

import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export const ScanScreen: React.FC = () => {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const { processScannedData, scanFromGallery, captureAndScan } = useBarcodeScanner();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (isScanning) return;
    
    setIsScanning(true);
    setScannedData(data);

    try {
      await processScannedData(data, type);
      Alert.alert(
        'Card Scanned',
        'Loyalty card information has been captured successfully!',
        [
          {
            text: 'Scan Another',
            onPress: () => {
              setIsScanning(false);
              setScannedData(null);
            },
          },
          {
            text: 'Done',
            style: 'default',
            onPress: () => {
              setIsScanning(false);
              setScannedData(null);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process scanned data. Please try again.');
      setIsScanning(false);
      setScannedData(null);
    }
  };

  const resetScan = () => {
    setIsScanning(false);
    setScannedData(null);
  };

  const handleGalleryScan = async () => {
    try {
      setIsScanning(true);
      const result = await scanFromGallery();
      if (result) {
        Alert.alert(
          'Card Added',
          'Card has been successfully added from the photo!',
          [{ text: 'OK', onPress: resetScan }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to scan card from photo. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualEntry = () => {
    navigation.navigate('ManualEntry' as never);
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#ccc" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionSubtitle}>
            Please enable camera access to scan loyalty cards
          </Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        <Camera
          style={styles.camera}
          type={Camera.Constants.Type.back}
          flashMode={flashEnabled ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off}
          barCodeScannerSettings={{
            barCodeTypes: [
              BarCodeScanner.Constants.BarCodeType.qr,
              BarCodeScanner.Constants.BarCodeType.ean13,
              BarCodeScanner.Constants.BarCodeType.ean8,
              BarCodeScanner.Constants.BarCodeType.code39,
              BarCodeScanner.Constants.BarCodeType.code128,
              BarCodeScanner.Constants.BarCodeType.upc_a,
              BarCodeScanner.Constants.BarCodeType.upc_e,
            ],
          }}
          onBarCodeScanned={isScanning ? undefined : handleBarCodeScanned}
        />
        
        <View style={styles.overlay}>
          <View style={styles.unfocusedContainer}>
            <View style={styles.focusedContainer}>
              <View style={styles.topLeftCorner} />
              <View style={styles.topRightCorner} />
              <View style={styles.bottomLeftCorner} />
              <View style={styles.bottomRightCorner} />
            </View>
          </View>
        </View>

        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            Position the barcode or QR code within the frame
          </Text>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={[styles.controlButton, flashEnabled && styles.activeControlButton]}
            onPress={toggleFlash}
          >
            <Ionicons 
              name={flashEnabled ? "flash" : "flash-off"} 
              size={24} 
              color={flashEnabled ? "#007AFF" : "#fff"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.manualButton}
            onPress={handleManualEntry}
          >
            <Text style={styles.manualButtonText}>Manual Entry</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handleGalleryScan}
          >
            <Ionicons name="images" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {scannedData && (
        <View style={styles.scannedDataContainer}>
          <Text style={styles.scannedDataText}>
            Scanned: {scannedData}
          </Text>
          <TouchableOpacity onPress={resetScan} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unfocusedContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  focusedContainer: {
    width: width * 0.8,
    height: width * 0.8 * 0.6,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  topLeftCorner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#007AFF',
  },
  topRightCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#007AFF',
  },
  bottomLeftCorner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#007AFF',
  },
  bottomRightCorner: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#007AFF',
  },
  instructionContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 10,
    borderRadius: 10,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    padding: 15,
  },
  activeControlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  manualButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  settingsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scannedDataContainer: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannedDataText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  resetButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginLeft: 10,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});