import { useWindowDimensions } from "react-native";

const MOBILE_WEB_WIDTH = 768;
const DESKTOP_WIDTH = 1024;

export default function useFixieLayout() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb = width < MOBILE_WEB_WIDTH;
  const isDesktop = width >= DESKTOP_WIDTH;

  return {
    width,
    height,
    isIOS: false,
    isAndroid: false,
    isWeb: true,
    isNative: false,
    isPhone: isMobileWeb,
    isMobileWeb,
    isDesktop,
    contentMaxWidth: isDesktop ? 1180 : "100%",
    pagePadding: isDesktop ? 28 : 18,
    cardColumns: isDesktop ? 4 : 2,
  };
}
