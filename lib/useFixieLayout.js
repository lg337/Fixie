import { useWindowDimensions } from "react-native";

export default function useFixieLayout() {
  const { width, height } = useWindowDimensions();
  const isPhone = width < 768;
  const isDesktop = width >= 1024;

  return {
    width,
    height,
    isIOS: false,
    isAndroid: false,
    isWeb: false,
    isNative: true,
    isPhone,
    isMobileWeb: false,
    isDesktop,
    contentMaxWidth: isDesktop ? 1180 : "100%",
    pagePadding: isDesktop ? 28 : 18,
    cardColumns: isDesktop ? 4 : 2,
  };
}
