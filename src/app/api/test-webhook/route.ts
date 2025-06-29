export async function GET() {
  return new Response(JSON.stringify({ 
    status: "Webhook endpoint is accessible",
    timestamp: new Date().toISOString()
  }), {
    headers: { "Content-Type": "application/json" }
  });
} 