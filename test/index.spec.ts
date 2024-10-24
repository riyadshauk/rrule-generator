// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const updatedEnv = {...env, BASIC_AUTH_SECRET: "blah"} as unknown as { AI: any, BASIC_AUTH_SECRET: string };

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

/**
 * @todo make this test pass...
 */
describe('Hello World worker', () => {
	it('responds with Hello World! (unit style)', async () => {
		const request = new IncomingRequest('http://localhost:8787/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': updatedEnv.BASIC_AUTH_SECRET, // Basic Auth
			},
			body: JSON.stringify({ rruleDescription: 'Every first Monday at 6pm until december' }) // Raw JSON body
		});
		
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, updatedEnv);
		
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
	});

	it('responds with Hello World! (integration style)', async () => {
		const request = new IncomingRequest('http://localhost:8787/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Basic ' + btoa(`user:${updatedEnv.BASIC_AUTH_SECRET}`)
			},
			body: JSON.stringify({ rruleDescription: 'Every first Monday at 6pm until december' })
		});

		const response = await SELF.fetch(request);
		expect(await response.text()).toMatchInlineSnapshot(JSON.stringify({"analysis":"I will help you create a recurring event every first Monday of the month at 6:00 PM, until the end of December.","rrule":"RRULE:FREQ=MONTHLY;BYMONTH=1,12;BYDAY=MO;BYHOUR=18;UNTIL=20221231T235959","rruleDescription":"Every first Monday at 6pm until december"}));
	});
});