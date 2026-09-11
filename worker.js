export default {
  async fetch(request, env) {
    const url = new URL(request.url);

if (url.pathname.startsWith("/api/")) {
  const backendUrl = new URL(
    url.pathname + url.search,
    "https://vault-experiences.onrender.com"
  );

  const response = await fetch(new Request(backendUrl, request));

  const headers = new Headers(response.headers);
  const setCookie = headers.get("Set-Cookie");

  if (setCookie) {
    headers.set(
      "Set-Cookie",
      setCookie.replace(/;\s*Domain=[^;]*/i, "")
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

    // Admin shortcut
    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      url.pathname = "/admin/admin.html";
      return env.ASSETS.fetch(new Request(url, request));
    }

    // Everything else = frontend
    return env.ASSETS.fetch(request);
  }
};