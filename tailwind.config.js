const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["PlusJakartaSans-Regular"],
        jakarta: ["PlusJakartaSans-Regular"],
        "jakarta-extralight": ["PlusJakartaSans-ExtraLight"],
        "jakarta-light": ["PlusJakartaSans-Light"],
        "jakarta-medium": ["PlusJakartaSans-Medium"],
        "jakarta-semibold": ["PlusJakartaSans-SemiBold"],
        "jakarta-bold": ["PlusJakartaSans-Bold"],
        "jakarta-extrabold": ["PlusJakartaSans-ExtraBold"],
        "jakarta-italic": ["PlusJakartaSans-Italic"],
        "jakarta-medium-italic": ["PlusJakartaSans-MediumItalic"],
        "jakarta-semibold-italic": ["PlusJakartaSans-SemiBoldItalic"],
        "jakarta-bold-italic": ["PlusJakartaSans-BoldItalic"],
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        ".font-sans": {
          fontFamily: "PlusJakartaSans-Regular",
          fontWeight: "400",
        },
        ".font-extralight": {
          fontFamily: "PlusJakartaSans-ExtraLight",
          fontWeight: "400",
        },
        ".font-light": {
          fontFamily: "PlusJakartaSans-Light",
          fontWeight: "400",
        },
        ".font-normal": {
          fontFamily: "PlusJakartaSans-Regular",
          fontWeight: "400",
        },
        ".font-medium": {
          fontFamily: "PlusJakartaSans-Medium",
          fontWeight: "400",
        },
        ".font-semibold": {
          fontFamily: "PlusJakartaSans-SemiBold",
          fontWeight: "400",
        },
        ".font-bold": {
          fontFamily: "PlusJakartaSans-Bold",
          fontWeight: "400",
        },
        ".font-extrabold": {
          fontFamily: "PlusJakartaSans-ExtraBold",
          fontWeight: "400",
        },
        ".font-black": {
          fontFamily: "PlusJakartaSans-ExtraBold",
          fontWeight: "400",
        },
        ".italic": {
          fontFamily: "PlusJakartaSans-Italic",
          fontStyle: "normal",
        },
      });
    }),
  ],
};
