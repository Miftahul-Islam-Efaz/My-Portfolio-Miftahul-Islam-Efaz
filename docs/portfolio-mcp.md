# Portfolio content MCP v2

The existing `/api/mcp` endpoint now exposes ten authenticated tools for the nine content types shared with the admin panel. The website and admin UI do not need a redesign.

## Authentication (optional, currently open)

Authentication is optional and **currently OFF by request** - the endpoint URL is treated as private, so no credentials are required. To close it later, set `MCP_BEARER_TOKEN` (Bearer) or both `MCP_USERNAME` and `MCP_PASSWORD` (Basic) in the deployment environment; no code change or redeploy beyond the env is needed.

Warning: on a public domain, `/api/mcp` is discoverable by automated scanners, so open mode means anyone who finds the URL can edit site content. The scope stays bounded: no SQL, no schema changes, no contact inbox, no uploaded-file deletion, no fixed-slot deletion, and exact confirmation tokens for deletions. There is no automatic undo. If this risk becomes uncomfortable, adding credentials is a two-variable change.

Contact submissions, secrets, arbitrary SQL, and schema administration are outside this MCP's scope.

## Tests

Run `npm run test:mcp` and `npm run lint`.

The 31 offline tests cover authentication, JSON-RPC envelopes, tool discovery, validation, partial updates, dry runs, revision conflicts, pagination, draft duplication, publication, token tampering/expiry, exact deletion, linked/fixed-record protection, and private-inbox exclusion. They use an in-memory database and never connect to production.

The database function was separately tested using a newly created test note inside a transaction that was fully rolled back. Update, stale-write rejection, and exact deletion passed. Anonymous and ordinary authenticated database roles were verified unable to execute the function; only service_role can. Existing portfolio content was not deleted or edited.
