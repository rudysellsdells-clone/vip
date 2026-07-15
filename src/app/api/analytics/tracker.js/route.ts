import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { untypedSupabase } from "@/lib/supabase/untyped";

export const runtime = "nodejs";

function javascriptResponse(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const key = requestUrl.searchParams.get("key")?.trim() ?? "";

  if (!key) {
    return javascriptResponse("console.warn('Marketing VIP Analytics: missing site key.');", 400);
  }

  try {
    const admin = untypedSupabase(createAdminClient());
    const { data, error } = await admin
      .from("analytics_data_sources")
      .select("id")
      .eq("collection_key", key)
      .eq("source_type", "native")
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) {
      return javascriptResponse("console.warn('Marketing VIP Analytics: invalid site key.');", 404);
    }

    const collectorUrl = `${requestUrl.origin}/api/analytics/collect?key=${encodeURIComponent(key)}`;
    const script = String.raw`(function () {
  "use strict";

  if (window.__MVIP_ANALYTICS_LOADED__) return;
  window.__MVIP_ANALYTICS_LOADED__ = true;

  var VERSION = "h1.7b";
  var COLLECTOR_URL = ${JSON.stringify(collectorUrl)};
  var VISITOR_KEY = "mvip_analytics_visitor";
  var SESSION_KEY = "mvip_analytics_session";
  var SESSION_TTL = 30 * 60 * 1000;
  var startedForms = typeof WeakSet === "function" ? new WeakSet() : null;
  var engagedSent = false;
  var lastTrackedUrl = "";

  function privacyBlocked() {
    return window.MVIP_ANALYTICS_DISABLED === true ||
      navigator.globalPrivacyControl === true ||
      navigator.doNotTrack === "1" ||
      window.doNotTrack === "1";
  }

  function randomId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return prefix + "_" + window.crypto.randomUUID();
    }
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function storageGet(storage, key) {
    try { return storage.getItem(key); } catch (_) { return null; }
  }

  function storageSet(storage, key, value) {
    try { storage.setItem(key, value); } catch (_) {}
  }

  function visitorId() {
    var existing = storageGet(window.localStorage, VISITOR_KEY);
    if (existing) return existing;
    var created = randomId("visitor");
    storageSet(window.localStorage, VISITOR_KEY, created);
    return created;
  }

  function sessionId() {
    var now = Date.now();
    var raw = storageGet(window.sessionStorage, SESSION_KEY);
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.expiresAt > now) {
          parsed.expiresAt = now + SESSION_TTL;
          storageSet(window.sessionStorage, SESSION_KEY, JSON.stringify(parsed));
          return parsed.id;
        }
      } catch (_) {}
    }

    var next = { id: randomId("session"), expiresAt: now + SESSION_TTL };
    storageSet(window.sessionStorage, SESSION_KEY, JSON.stringify(next));
    return next.id;
  }

  function safeUrl(value) {
    try { return new URL(value, window.location.href).toString(); } catch (_) { return ""; }
  }

  function referrerHost() {
    if (!document.referrer) return "";
    try { return new URL(document.referrer).hostname; } catch (_) { return ""; }
  }

  function campaignContext() {
    var params = new URLSearchParams(window.location.search);
    return {
      campaignId: params.get("vip_campaign") || null,
      assetId: params.get("vip_asset") || null,
      trafficSource: params.get("utm_source") || "",
      trafficMedium: params.get("utm_medium") || "",
      campaignName: params.get("utm_campaign") || "",
      channel: params.get("vip_channel") || ""
    };
  }

  function send(eventName, properties, options) {
    if (privacyBlocked()) return Promise.resolve(false);

    var context = campaignContext();
    var payload = {
      eventId: randomId("event"),
      eventName: eventName,
      occurredAt: new Date().toISOString(),
      visitorId: visitorId(),
      sessionId: sessionId(),
      campaignId: context.campaignId,
      assetId: context.assetId,
      trafficSource: context.trafficSource,
      trafficMedium: context.trafficMedium,
      campaignName: context.campaignName,
      channel: context.channel,
      landingUrl: window.location.href,
      referrerHost: referrerHost(),
      value: options && typeof options.value === "number" ? options.value : null,
      currencyCode: options && options.currencyCode ? String(options.currencyCode).slice(0, 3) : null,
      properties: Object.assign({
        page_title: document.title || "",
        path: window.location.pathname,
        tracker_version: VERSION
      }, properties || {})
    };

    return fetch(COLLECTOR_URL, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.ok;
    }).catch(function () {
      return false;
    });
  }

  function trackPage() {
    if (lastTrackedUrl === window.location.href) return;
    lastTrackedUrl = window.location.href;
    send("page_view");

    var context = campaignContext();
    if (context.campaignId || context.campaignName) {
      send("campaign_visit");
    }

    engagedSent = false;
    window.setTimeout(function () {
      if (!engagedSent && document.visibilityState === "visible") {
        engagedSent = true;
        send("engaged_visit", { engagement_seconds: 10 });
      }
    }, 10000);
  }

  function closestActionTarget(start) {
    if (!start || typeof start.closest !== "function") return null;
    return start.closest("[data-vip-event],[data-vip-cta],a,button");
  }

  document.addEventListener("click", function (event) {
    var target = closestActionTarget(event.target);
    if (!target) return;

    var customEvent = target.getAttribute("data-vip-event");
    var href = target.getAttribute("href") || "";
    var normalizedHref = href.toLowerCase();
    var properties = {
      element_id: target.id || "",
      element_type: target.tagName ? target.tagName.toLowerCase() : "",
      link_url: safeUrl(href),
      link_type: ""
    };

    if (customEvent) {
      send(customEvent, properties);
      return;
    }

    if (normalizedHref.indexOf("tel:") === 0) {
      properties.link_type = "telephone";
      properties.link_url = "";
      send("phone_click", properties);
      return;
    }

    if (normalizedHref.indexOf("mailto:") === 0) {
      properties.link_type = "email";
      properties.link_url = "";
      send("email_click", properties);
      return;
    }

    if (target.hasAttribute("data-vip-cta")) {
      properties.link_type = "cta";
      send("cta_click", properties);
      return;
    }

    if (
      target.hasAttribute("download") ||
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip)(\?|#|$)/i.test(href)
    ) {
      properties.link_type = "download";
      send("asset_download", properties);
    }
  }, true);

  document.addEventListener("focusin", function (event) {
    var form = event.target && event.target.closest ? event.target.closest("form") : null;
    if (!form) return;
    if (startedForms && startedForms.has(form)) return;
    if (startedForms) startedForms.add(form);
    send("form_start", {
      form_id: form.id || "",
      form_name: form.getAttribute("name") || ""
    });
  }, true);

  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!form || !form.tagName || form.tagName.toLowerCase() !== "form") return;
    send("form_submit", {
      form_id: form.id || "",
      form_name: form.getAttribute("name") || ""
    });
  }, true);

  window.addEventListener("scroll", function () {
    if (engagedSent) return;
    var doc = document.documentElement;
    var denominator = Math.max(doc.scrollHeight - window.innerHeight, 1);
    var percent = Math.round((window.scrollY / denominator) * 100);
    if (percent >= 50) {
      engagedSent = true;
      send("engaged_visit", { scroll_percent: percent });
    }
  }, { passive: true });

  function wrapHistoryMethod(name) {
    var original = window.history[name];
    if (typeof original !== "function") return;
    window.history[name] = function () {
      var result = original.apply(this, arguments);
      window.setTimeout(trackPage, 0);
      return result;
    };
  }

  wrapHistoryMethod("pushState");
  wrapHistoryMethod("replaceState");
  window.addEventListener("popstate", function () { window.setTimeout(trackPage, 0); });

  window.vipTrack = function (eventName, properties, options) {
    return send(String(eventName || ""), properties || {}, options || {});
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackPage, { once: true });
  } else {
    trackPage();
  }
})();`;

    return javascriptResponse(script);
  } catch {
    return javascriptResponse("console.warn('Marketing VIP Analytics: tracker unavailable.');", 503);
  }
}
