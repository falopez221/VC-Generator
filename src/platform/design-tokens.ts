export interface VGDesignTokens {
  backgroundPrimary: string;
  backgroundSecondary: string;
  panelPrimary: string;
  panelElevated: string;
  borderSubtle: string;
  borderActive: string;
  textPrimary: string;
  textSecondary: string;
  accentPrimary: string;
  warning: string;
  critical: string;
  verified: string;
}

export const VG_DESIGN_TOKENS: Readonly<VGDesignTokens> = Object.freeze({
  backgroundPrimary: "#04111f",
  backgroundSecondary: "#051524",
  panelPrimary: "#071b2e",
  panelElevated: "#0a243c",
  borderSubtle: "rgb(153 194 218 / 14%)",
  borderActive: "rgb(85 197 236 / 44%)",
  textPrimary: "#e8f0f5",
  textSecondary: "#83a0b3",
  accentPrimary: "#55c5ec",
  warning: "#e6ae5e",
  critical: "#e46f72",
  verified: "#63d3a1",
});
