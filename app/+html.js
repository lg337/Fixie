import { ScrollViewStyleReset } from "expo-router/html";

const fixieWebChromeStyles = `
html,
body,
#root,
#__expo {
  min-height: 100%;
  min-height: 100dvh;
  margin: 0;
  background: #000000;
}

html {
  background-color: #000000;
  color-scheme: dark;
}

body {
  background-color: #000000;
  overscroll-behavior-y: none;
}

body > div,
#root > div,
#__expo > div {
  min-height: 100vh;
  min-height: 100dvh;
  background: #000000;
}

@supports (-webkit-touch-callout: none) {
  html,
  body,
  #root,
  #__expo,
  body > div,
  #root > div,
  #__expo > div {
    min-height: -webkit-fill-available;
  }
}
`;

const initialRouteResetScript = `
(function () {
  var pathname = window.location.pathname.replace(/\\/$/, "") || "/";
  var publicRoutes = {
    "/": true,
    "/customer/login": true,
    "/customer/signup": true,
    "/company/login": true,
    "/company/signup": true,
    "/employee/login": true,
    "/employee/signup": true
  };

  if (publicRoutes[pathname]) return;

  function isPathInSection(sectionPath) {
    return pathname === sectionPath || pathname.indexOf(sectionPath + "/") === 0;
  }

  var target = null;
  if (isPathInSection("/customer")) target = "/customer/home";
  if (isPathInSection("/company")) target = "/company/home";
  if (isPathInSection("/employee")) target = "/employee";

  if (target && target !== pathname) {
    window.location.replace(target);
  }
})();
`;

export default function Root({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no" />
        <meta name="theme-color" content="#000000" />
        <meta name="color-scheme" content="dark" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Fixie" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: fixieWebChromeStyles }} />
        <script dangerouslySetInnerHTML={{ __html: initialRouteResetScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
