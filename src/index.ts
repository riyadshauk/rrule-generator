/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// If you set another name in wrangler.toml as the value for 'binding',
	// replace "AI" with the variable name you defined.
	AI: Ai;
  BASIC_AUTH_SECRET: string; // this must be properly defined. See https://developers.cloudflare.com/workers/configuration/secrets/
}

// const inputText = 'Every first Monday at 6pm until december';
  
export default {
  async fetch(request, env): Promise<Response> {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== env.BASIC_AUTH_SECRET) {
      return new Response(new Blob(), { status: 401, statusText: "Not Authorized!" });
    }
    if (request.method !== "POST") {
      return new Response(new Blob(), { status: 405 });
    }
    try {
      const payload: { rruleDescription: string } = await request.json(); // todo, maybe wrap in GraphQL, with auth layer (overkill for this task)
      const { rruleDescription } = payload;
      if (rruleDescription.length > 250) {
        return new Response(new Blob(), { status: 400, statusText: "RRule description exceeds 250 symbols... Failsafe to prevent overusing gen-ai resources!" })
      }
      const response = await env.AI.run("@cf/mistral/mistral-7b-instruct-v0.2-lora", {
      prompt: `Convert this to rrule: ${rruleDescription} . Ensure compatibility with the nuances at github.com/jkbrzt/rrule. Please respond with a JSON with two string fields ("analysis", and "rrule"), where analysis may be a natural language response that you would normally give, and rrule is a machine readable rrule string. I want it in this way so that I can easily parse your response from a computer program. For example, your JSON response would look something like { "analysis": "[whatever human-directed analysis you would normally give]", "rrule": "RRULE:FREQ=WEEKLY;BYSETPOS=1ST;BYDAY=MO;UNTIL=20221231T235959" }. Please do not include any newlines, and the JSON object should be the only body of your HTTP POST response.`,
      }) as unknown as { response: string };
  
      const desiredAnswer: { analysis: string, rrule: string } = JSON.parse(response.response);
  
      return new Response(JSON.stringify({ ...desiredAnswer, rruleDescription }));
    } catch (err: any) {
      return new Response(String(err));
    }
  },
} satisfies ExportedHandler<Env>;