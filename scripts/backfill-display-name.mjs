import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });

const { DATABASE_URL, CLERK_SECRET_KEY } = process.env;

if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

if (!CLERK_SECRET_KEY) {
  console.error("Missing CLERK_SECRET_KEY in .env.local");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function fetchClerkUsers() {
  const limit = 100;
  let offset = 0;
  let total = 0;
  const users = [];

  while (true) {
    const url = new URL("https://api.clerk.com/v1/users");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      },
    });

    const body = await res.json();

    if (!res.ok) {
      throw new Error(`Clerk API error: ${res.status} ${res.statusText} - ${JSON.stringify(body)}`);
    }
    const batch = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];

    total = typeof body?.total_count === "number" ? body.total_count : total;
    if (offset === 0) {
      console.log("Clerk API debug:", {
        status: res.status,
        body_keys: body && typeof body === "object" ? Object.keys(body) : null,
        data_count: Array.isArray(body?.data)
          ? body.data.length
          : Array.isArray(body)
          ? body.length
          : null,
        total_count: body?.total_count ?? null,
        first_user_id: batch[0]?.id,
        errors: Array.isArray(body?.errors) ? body.errors : null,
      });
    }
    users.push(...batch);

    offset += batch.length;
    if (batch.length === 0 || Array.isArray(body) || (total && offset >= total)) {
      break;
    }
  }

  return users;
}

function buildDisplayName(user) {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  return parts.join(" ").trim();
}

async function main() {
  const users = await fetchClerkUsers();

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const user of users) {
    const displayName = buildDisplayName(user);
    if (!displayName) {
      skipped += 1;
      continue;
    }

    const rows = await sql`
      UPDATE users
      SET display_name = ${displayName}
      WHERE clerk_id = ${user.id}
      RETURNING id;
    `;

    if (rows.length > 0) {
      updated += 1;
    } else {
      missing += 1;
    }
  }

  console.log(`Clerk users processed: ${users.length}`);
  console.log(`Updated display_name: ${updated}`);
  console.log(`Skipped (no name): ${skipped}`);
  console.log(`No matching db user: ${missing}`);
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
