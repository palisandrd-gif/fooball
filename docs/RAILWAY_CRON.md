# Daily OpenFootball sync on Railway

The Telegram bot remains a continuously running service. OpenFootball updates run in a separate Railway Cron service so a long import cannot interrupt Telegram updates.

## Schedule

Recommended cron expression:

```text
15 3 * * *
```

Railway evaluates cron schedules in UTC. This expression runs every day at 03:15 UTC.

## Create the cron service

1. In the existing Railway project, create a new service from the same GitHub repository: `palisandrd-gif/fooball`.
2. Name it `openfootball-daily-sync`.
3. In **Variables**, add a reference to the PostgreSQL service variable `DATABASE_URL`.
4. Optionally set `OPENFOOTBALL_BASE_URL`; the official GitHub raw URL is used by default.
5. Do not copy `BOT_TOKEN`, `OPENAI_API_KEY` or `ADMIN_TELEGRAM_IDS` into this service. The data worker does not need them.
6. In **Settings → Deploy**, set the custom start command:

   ```text
   npm run cron:openfootball
   ```

7. In **Settings → Cron Schedule**, set:

   ```text
   15 3 * * *
   ```

8. Deploy the service once and use **Run Now** for the first verification.

The command writes start, completion, record count and warning count to Railway logs, then disconnects from PostgreSQL and exits. A cron execution that overlaps a manual sync exits successfully after reporting that another sync already owns the database lock.

Railway cron behavior and constraints are documented at <https://docs.railway.com/cron-jobs>.

## Verification

After **Run Now**:

1. The cron deployment should finish with a successful status.
2. Logs should contain `Scheduled OpenFootball sync completed`.
3. `/admin` in Telegram should show a new last-update time.
4. Running `/sync_openfootball` at the same time should return that an update is already running rather than start duplicate work.

## Failure handling

- A network or database failure makes the process exit with code `1`, so Railway marks the run as failed.
- A concurrent sync is an expected skip and exits with code `0`.
- The database lease expires after four hours if a worker is terminated before releasing it.
