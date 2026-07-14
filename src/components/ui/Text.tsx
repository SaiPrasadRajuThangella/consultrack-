import { Text as RNText, TextInput as RNTextInput, type TextProps, type TextInputProps } from "react-native";
import { cn } from "@/src/lib/utils";

/** App-wide Text — always Plus Jakarta Sans unless an explicit font-* class is passed. */
export function Text({ className, ...props }: TextProps & { className?: string }) {
  return <RNText className={cn("font-sans", className)} {...props} />;
}

/** App-wide TextInput — always Plus Jakarta Sans. */
export function TextInput({ className, ...props }: TextInputProps & { className?: string }) {
  return <RNTextInput className={cn("font-sans", className)} {...props} />;
}
