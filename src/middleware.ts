export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/suppliers/:path*",
    "/supplier-lots/:path*",
    "/production/:path*",
    "/clients/:path*",
    "/orders/:path*",
    "/accounts/:path*",
    "/users/:path*",
  ],
};
