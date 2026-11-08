import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router";
import { createServer } from "vite";

let server;
let CompleteJobPage;

before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null } });
  ({ default: CompleteJobPage } = await server.ssrLoadModule("/src/pages/technician/CompleteJobPage.tsx"));
});
after(async () => server?.close());

function renderCompletion({ attachments = [], payment = null, status = "job_done" } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["order", "1"], { id: 1, order_no: "ORD123456", status, quoted_price: "100.00" });
  client.setQueryData(["report", "1"], {
    id: 1, work_done: "Repair", extra_charges: "25.00", final_amount: "125.00", attachments, payment,
  });
  try {
    return renderToStaticMarkup(h(QueryClientProvider, { client },
      h(MemoryRouter, { initialEntries: ["/jobs/1/complete"] },
        h(Routes, null, h(Route, { path: "/jobs/:id/complete", element: h(CompleteJobPage) })))));
  } finally {
    client.clear();
  }
}

const photo = { id: 1, file: "/photo.jpg", file_url: "/photo.jpg", kind: "photo" };

test("fresh mount after work submission resumes uploads without the status error", () => {
  const html = renderCompletion();
  assert.match(html, /Photos \/ Documents/);
  assert.doesNotMatch(html, /name="work_done"|can no longer be completed/);
});

test("fresh mount with photos resumes payment using the saved final amount", () => {
  const html = renderCompletion({ attachments: [photo] });
  assert.match(html, /Payment \(Optional\)/);
  assert.match(html, /placeholder="125.00"/);
});

test("fresh mount with a saved payment shows completion instead of duplicate capture", () => {
  const html = renderCompletion({ attachments: [photo], payment: { id: 1, amount: "125.00" } });
  assert.match(html, /Job Completed!/);
  assert.doesNotMatch(html, /Amount Received/);
});

test("reviewed jobs cannot resume collecting missing photos or payment", () => {
  const html = renderCompletion({ status: "reviewed" });
  assert.match(html, /can no longer be completed/);
  assert.doesNotMatch(html, /Photos \/ Documents/);
});
