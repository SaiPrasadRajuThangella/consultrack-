/** Font family keys registered via expo-font / useFonts */
export const FONT = {
  extralight: "PlusJakartaSans-ExtraLight",
  extralightItalic: "PlusJakartaSans-ExtraLightItalic",
  light: "PlusJakartaSans-Light",
  lightItalic: "PlusJakartaSans-LightItalic",
  regular: "PlusJakartaSans-Regular",
  italic: "PlusJakartaSans-Italic",
  medium: "PlusJakartaSans-Medium",
  mediumItalic: "PlusJakartaSans-MediumItalic",
  semibold: "PlusJakartaSans-SemiBold",
  semiboldItalic: "PlusJakartaSans-SemiBoldItalic",
  bold: "PlusJakartaSans-Bold",
  boldItalic: "PlusJakartaSans-BoldItalic",
  extrabold: "PlusJakartaSans-ExtraBold",
  extraboldItalic: "PlusJakartaSans-ExtraBoldItalic",
} as const;

export const plusJakartaSansFonts = {
  [FONT.extralight]: require("../../assets/fonts/PlusJakartaSans-ExtraLight.ttf"),
  [FONT.extralightItalic]: require("../../assets/fonts/PlusJakartaSans-ExtraLightItalic.ttf"),
  [FONT.light]: require("../../assets/fonts/PlusJakartaSans-Light.ttf"),
  [FONT.lightItalic]: require("../../assets/fonts/PlusJakartaSans-LightItalic.ttf"),
  [FONT.regular]: require("../../assets/fonts/PlusJakartaSans-Regular.ttf"),
  [FONT.italic]: require("../../assets/fonts/PlusJakartaSans-Italic.ttf"),
  [FONT.medium]: require("../../assets/fonts/PlusJakartaSans-Medium.ttf"),
  [FONT.mediumItalic]: require("../../assets/fonts/PlusJakartaSans-MediumItalic.ttf"),
  [FONT.semibold]: require("../../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
  [FONT.semiboldItalic]: require("../../assets/fonts/PlusJakartaSans-SemiBoldItalic.ttf"),
  [FONT.bold]: require("../../assets/fonts/PlusJakartaSans-Bold.ttf"),
  [FONT.boldItalic]: require("../../assets/fonts/PlusJakartaSans-BoldItalic.ttf"),
  [FONT.extrabold]: require("../../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
  [FONT.extraboldItalic]: require("../../assets/fonts/PlusJakartaSans-ExtraBoldItalic.ttf"),
};

/** Shared chart axis / label text style */
export const chartTextStyle = {
  color: "#94a3b8",
  fontSize: 10,
  fontFamily: FONT.regular,
} as const;
