export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Send API requests to the Express backend on Render
    if (url.pathname.startsWith("/api/")) {
      const backendUrl = new URL(
        url.pathname + url.search,
        "https://vault-experiences.onrender.com"
      );

      return fetch(new Request(backendUrl, request));
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