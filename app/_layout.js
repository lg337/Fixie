import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import LanguageMenu from "../components/LanguageMenu";

const CUSTOMER_PUBLIC_ROUTES = new Set(["/", "/customer/login", "/customer/signup"]);
const COMPANY_PUBLIC_ROUTES = new Set(["/company/login", "/company/signup"]);
const EMPLOYEE_PUBLIC_ROUTES = new Set(["/employee/login", "/employee/signup"]);

function isPathInSection(pathname, sectionPath) {
  return pathname === sectionPath || pathname.startsWith(`${sectionPath}/`);
}

async function getRoleHome(pathname) {
  if (isPathInSection(pathname, "/customer")) {
    const customerID = await AsyncStorage.getItem("customerID");
    return customerID ? "/customer/home" : "/";
  }

  if (isPathInSection(pathname, "/company")) {
    const companyID = await AsyncStorage.getItem("companyID");
    return companyID ? "/company/home" : "/company/login";
  }

  if (isPathInSection(pathname, "/employee")) {
    const employeeID = await AsyncStorage.getItem("employeeID");
    return employeeID ? "/employee/(tabs)" : "/employee/login";
  }

  return "/";
}

function shouldResetInitialWebRoute(pathname) {
  if (CUSTOMER_PUBLIC_ROUTES.has(pathname)) return false;
  if (COMPANY_PUBLIC_ROUTES.has(pathname)) return false;
  if (EMPLOYEE_PUBLIC_ROUTES.has(pathname)) return false;

  return isPathInSection(pathname, "/customer") || isPathInSection(pathname, "/company") || isPathInSection(pathname, "/employee");
}

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const didHandleInitialRoute = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web" || didHandleInitialRoute.current) return;

    didHandleInitialRoute.current = true;

    if (!shouldResetInitialWebRoute(pathname)) return;

    let isMounted = true;

    getRoleHome(pathname).then((homeRoute) => {
      if (isMounted && homeRoute !== pathname) {
        router.replace(homeRoute);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <LanguageMenu />
    </>
  );
}
