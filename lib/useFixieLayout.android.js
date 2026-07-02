import { useWindowDimensions } from "react-native";

export default function useFixieLayout() {
  const { width, height } = useWindowDimensions();

  return {
    width,
    height,
    isIOS: false,
    isAndroid: true,
    isWeb: false,
    isNative: true,
    isPhone: true,
    isMobileWeb: false,
    isDesktop: false,
    contentMaxWidth: "100%",
    pagePadding: 18,
    cardColumns: 2,
  };
}
