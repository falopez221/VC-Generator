import { NextRequest, NextResponse } from "next/server";

const AUTHENTICATED_USER_HEADER = "oai-authenticated-user-email";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/app/login" || request.headers.has(AUTHENTICATED_USER_HEADER) || isLocalDevelopmentSession()) {
    return NextResponse.next();
  }

  const signInUrl = request.nextUrl.clone();
  signInUrl.pathname = "/signin-with-chatgpt";
  signInUrl.search = "";
  signInUrl.searchParams.set("return_to", `${pathname}${search}`);
  return NextResponse.redirect(signInUrl);
}

function isLocalDevelopmentSession() {
  return process.env.NODE_ENV === "development" && process.env.VG_LOCAL_DEV_MODE === "1";
}

export const config = {
  matcher: ["/app/:path*"],
};
