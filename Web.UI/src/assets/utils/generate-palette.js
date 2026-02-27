#!/usr/bin/env node

/**
 * Color palette generator utility
 * This script generates a complete color palette from a base color
 * Usage: node generate-palette.js #0081ff
 * 
 */

// Simple lightness adjustment for generating a palette from a base color
function generatePalette(baseColor) {
  // Parse the hex color into RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Convert RGB to HSL
  const rgbToHsl = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h, s, l };
  };

  // Convert HSL to RGB
  const hslToRgb = (h, s, l) => {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  };

  // Convert RGB to hex
  const rgbToHex = (r, g, b) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  // Generate shade by adjusting lightness
  const generateShade = (hex, lightness) => {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    // Clamp lightness between 0 and 1
    hsl.l = Math.max(0, Math.min(1, lightness));
    const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    return {
      hex: rgbToHex(newRgb.r, newRgb.g, newRgb.b),
      rgb: `${newRgb.r}, ${newRgb.g}, ${newRgb.b}`
    };
  };

  // Generate the palette with 10 shades
  const rgb = hexToRgb(baseColor);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const palette = {
    50: generateShade(baseColor, 0.95),
    100: generateShade(baseColor, 0.85),
    200: generateShade(baseColor, 0.75),
    300: generateShade(baseColor, 0.65),
    400: generateShade(baseColor, 0.55),
    500: { hex: baseColor, rgb: `${rgb.r}, ${rgb.g}, ${rgb.b}` },
    600: generateShade(baseColor, 0.4),
    700: generateShade(baseColor, 0.3),
    800: generateShade(baseColor, 0.2),
    900: generateShade(baseColor, 0.1)
  };

  return palette;
}

// Process command line arguments
if (process.argv.length > 2) {
  const baseColor = process.argv[2];
  const palette = generatePalette(baseColor);
  
  console.log('\nGenerated color palette:');
  console.log('------------------------');
  for (const [key, value] of Object.entries(palette)) {
    console.log(`${key}: ${value.hex} (${value.rgb})`);
  }
  
  console.log('\nCSS Variables format:');
  console.log('--------------------');
  for (const [key, value] of Object.entries(palette)) {
    console.log(`--color-${key}: ${value.rgb};`);
  }
  
  console.log('\nSCSS Variables format:');
  console.log('--------------------');
  for (const [key, value] of Object.entries(palette)) {
    console.log(`$color-${key}: ${value.hex};`);
  }
} else {
  console.log('Please provide a base color in hex format (e.g., #0081ff)');
} 