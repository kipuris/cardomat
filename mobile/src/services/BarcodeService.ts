import React from 'react';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';
import JsBarcode from 'jsbarcode';

import { LoyaltyCard } from '../types/card';

export interface BarcodeConfig {
  width: number;
  height: number;
  format: LoyaltyCard['barcodeType'];
  displayValue: boolean;
  textAlign?: 'left' | 'center' | 'right';
  textPosition?: 'bottom' | 'top';
  fontSize?: number;
  textMargin?: number;
  background?: string;
  lineColor?: string;
}

export class BarcodeService {
  // Generate barcode as SVG elements for React Native
  generateBarcodeSVG(
    value: string, 
    config: Partial<BarcodeConfig> = {}
  ): React.ReactElement {
    const defaultConfig: BarcodeConfig = {
      width: 200,
      height: 50,
      format: 'CODE128',
      displayValue: true,
      textAlign: 'center',
      textPosition: 'bottom',
      fontSize: 12,
      textMargin: 5,
      background: '#ffffff',
      lineColor: '#000000',
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      // Generate barcode data using jsbarcode (without canvas)
      const barcodeData = this.generateBarcodeData(value, finalConfig);
      
      return this.renderBarcodeSVG(barcodeData, finalConfig, value);
    } catch (error) {
      console.error('Barcode generation error:', error);
      return this.renderErrorBarcode(finalConfig);
    }
  }

  // Generate QR code (simplified implementation)
  generateQRCodeSVG(
    value: string, 
    config: Partial<BarcodeConfig> = {}
  ): React.ReactElement {
    const finalConfig = { 
      width: 200, 
      height: 200, 
      background: '#ffffff',
      lineColor: '#000000',
      ...config 
    };

    // This is a simplified QR code representation
    // In a real app, you would use a proper QR code library
    return (
      <Svg width={finalConfig.width} height={finalConfig.height}>
        <Rect 
          width={finalConfig.width} 
          height={finalConfig.height} 
          fill={finalConfig.background}
        />
        {/* Simplified QR pattern */}
        {this.generateQRPattern(finalConfig, value)}
        {finalConfig.displayValue && (
          <SvgText
            x={finalConfig.width / 2}
            y={finalConfig.height - 10}
            textAnchor="middle"
            fontSize={10}
            fill={finalConfig.lineColor}
          >
            QR: {value.substring(0, 20)}...
          </SvgText>
        )}
      </Svg>
    );
  }

  // Validate barcode data for different formats
  validateBarcodeData(value: string, format: LoyaltyCard['barcodeType']): boolean {
    switch (format) {
      case 'CODE128':
        return value.length > 0; // CODE128 can encode any ASCII character
      case 'CODE39':
        return /^[A-Z0-9\-. $\/+%*]+$/.test(value);
      case 'EAN13':
        return /^\d{12,13}$/.test(value);
      case 'UPC_A':
        return /^\d{11,12}$/.test(value);
      case 'QR_CODE':
        return value.length > 0; // QR codes can contain any data
      default:
        return false;
    }
  }

  // Get optimal barcode dimensions for different card sizes
  getOptimalDimensions(
    cardWidth: number, 
    format: LoyaltyCard['barcodeType']
  ): BarcodeConfig {
    const padding = 40; // Horizontal padding
    const maxWidth = cardWidth - padding;
    
    switch (format) {
      case 'QR_CODE':
        const qrSize = Math.min(maxWidth, 150);
        return {
          width: qrSize,
          height: qrSize,
          format,
          displayValue: true,
        };
      
      case 'EAN13':
      case 'UPC_A':
        return {
          width: Math.min(maxWidth, 180),
          height: 60,
          format,
          displayValue: true,
        };
      
      default: // CODE128, CODE39
        return {
          width: Math.min(maxWidth, 250),
          height: 50,
          format,
          displayValue: true,
        };
    }
  }

  // Generate barcode for loyalty card
  generateCardBarcode(card: LoyaltyCard, cardWidth: number = 300) {
    const config = this.getOptimalDimensions(cardWidth, card.barcodeType);
    
    if (card.barcodeType === 'QR_CODE') {
      return this.generateQRCodeSVG(card.barcodeData, config);
    }
    
    return this.generateBarcodeSVG(card.barcodeData, config);
  }

  private generateBarcodeData(value: string, config: BarcodeConfig) {
    // This is a simplified barcode data generation
    // In a real app, you would use a proper barcode library that works with React Native
    
    const patterns = {
      'CODE128': this.generateCode128Pattern(value),
      'CODE39': this.generateCode39Pattern(value),
      'EAN13': this.generateEAN13Pattern(value),
      'UPC_A': this.generateUPCAPattern(value),
    };

    return patterns[config.format] || patterns['CODE128'];
  }

  private generateCode128Pattern(value: string) {
    // Simplified CODE128 pattern - in reality this would be much more complex
    const bars = [];
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i) % 10;
      // Generate alternating bar widths
      for (let j = 0; j < 4; j++) {
        bars.push(((char + j) % 3) + 1);
      }
    }
    return bars;
  }

  private generateCode39Pattern(value: string) {
    // Simplified CODE39 pattern
    const bars = [];
    for (const char of value) {
      if (/[A-Z0-9\-. $\/+%*]/.test(char)) {
        // Generate pattern based on character
        const code = char.charCodeAt(0) % 10;
        for (let j = 0; j < 3; j++) {
          bars.push(((code + j) % 2) + 1);
          bars.push(1); // space
        }
      }
    }
    return bars;
  }

  private generateEAN13Pattern(value: string) {
    // Simplified EAN13 pattern
    const bars = [];
    const digits = value.padStart(13, '0').substring(0, 13);
    
    for (const digit of digits) {
      const d = parseInt(digit);
      for (let i = 0; i < 2; i++) {
        bars.push((d % 3) + 1);
        bars.push(1);
      }
    }
    return bars;
  }

  private generateUPCAPattern(value: string) {
    // UPC-A is similar to EAN13 but 12 digits
    const digits = value.padStart(12, '0').substring(0, 12);
    return this.generateEAN13Pattern('0' + digits); // Add leading zero for EAN13 format
  }

  private renderBarcodeSVG(
    barcodeData: number[], 
    config: BarcodeConfig, 
    value: string
  ): React.ReactElement {
    const barWidth = config.width / barcodeData.length;
    const bars = [];
    
    let x = 0;
    for (let i = 0; i < barcodeData.length; i++) {
      const barHeight = barcodeData[i];
      const isBar = i % 2 === 0; // Alternate between bars and spaces
      
      if (isBar) {
        bars.push(
          <Rect
            key={i}
            x={x}
            y={0}
            width={barWidth}
            height={config.height - (config.displayValue ? 20 : 0)}
            fill={config.lineColor}
          />
        );
      }
      x += barWidth;
    }

    return (
      <Svg width={config.width} height={config.height}>
        <Rect 
          width={config.width} 
          height={config.height} 
          fill={config.background}
        />
        <G>
          {bars}
        </G>
        {config.displayValue && (
          <SvgText
            x={config.width / 2}
            y={config.height - 5}
            textAnchor="middle"
            fontSize={config.fontSize}
            fill={config.lineColor}
          >
            {value}
          </SvgText>
        )}
      </Svg>
    );
  }

  private generateQRPattern(config: BarcodeConfig, value: string) {
    // Simplified QR code pattern - just some squares for demonstration
    const elements = [];
    const cellSize = Math.floor(config.width / 25);
    
    // Generate a simple pattern based on the value
    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        const hash = (value.charCodeAt(row % value.length) + row + col) % 3;
        if (hash === 0) {
          elements.push(
            <Rect
              key={`${row}-${col}`}
              x={col * cellSize}
              y={row * cellSize}
              width={cellSize}
              height={cellSize}
              fill={config.lineColor}
            />
          );
        }
      }
    }
    
    return elements;
  }

  private renderErrorBarcode(config: BarcodeConfig): React.ReactElement {
    return (
      <Svg width={config.width} height={config.height}>
        <Rect 
          width={config.width} 
          height={config.height} 
          fill="#f0f0f0"
          stroke="#ccc"
          strokeWidth={1}
        />
        <SvgText
          x={config.width / 2}
          y={config.height / 2}
          textAnchor="middle"
          fontSize={12}
          fill="#666"
        >
          Invalid Barcode
        </SvgText>
      </Svg>
    );
  }
}

export const barcodeService = new BarcodeService();