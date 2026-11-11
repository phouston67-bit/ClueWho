/**
 * Serves ads.txt dynamically from NEXT_PUBLIC_ADSENSE_CLIENT_ID, so the file
 * at https://yourdomain.com/ads.txt always reflects whatever publisher ID is
 * configured in the environment - no need to hand-edit a static file in
 * public/. Required by Google AdSense to verify you're an authorized seller
 * of ad inventory on this domain; see
 * https://support.google.com/adsense/answer/7532444
 */
export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  if (!clientId) {
    return new Response("", { status: 404 });
  }

  // clientId looks like "ca-pub-1234567890123456"; ads.txt wants the bare
  // "pub-1234567890123456" publisher account ID.
  const pubId = clientId.replace(/^ca-/, "");
  const body = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
}
