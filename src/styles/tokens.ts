// Tokens visuales de Turnito, alineados al prototipo (gym-data + amarillo).
// El color de acento real de cada centro viene de `centros.color_acento`
// en la base; este valor es solo el default de desarrollo.
export const tokens: {
  color: {
    ink: string;
    surface: string;
    bg: string;
    border: string;
    borderStrong: string;
    textMuted: string;
    textSoft: string;
    accentDefault: string;
  };
  font: { display: string; body: string; mono: string };
  radius: { sm: string; md: string; lg: string; pill: string };
} = {
  color: {
    ink: "#0D0D0F",
    surface: "#FFFFFF",
    bg: "#F5F5F3",
    border: "#E4E5E7",
    borderStrong: "#D9DBDC",
    textMuted: "#5F646B",
    textSoft: "#3A3D42",
    accentDefault: "#FFD400"
  },
  font: {
    display: "'Sora', system-ui, sans-serif",
    body: "'Manrope', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace"
  },
  radius: { sm: "10px", md: "14px", lg: "20px", pill: "999px" }
};
