import { ScrollViewStyleReset } from "expo-router/html";

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

  var target = null;
  if (pathname.indexOf("/customer") === 0) target = "/customer/home";
  if (pathname.indexOf("/company") === 0) target = "/company/home";
  if (pathname.indexOf("/employee") === 0) target = "/employee";

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
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: initialRouteResetScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
