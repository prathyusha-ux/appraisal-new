# Appraisal Letter Backend (Spring Boot + Supabase Postgres)

Salary-revision appraisal letters: saves appraisals to Supabase Postgres,
calculates the revised salary structure, generates the letter PDF
server-side (OpenPDF) and emails it to the employee.

## Environment variables (set these in Render)

| Variable | Example | Notes |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require` | From Supabase → Project Settings → Database → Connection string (use the **pooled** connection, port 6543, not the direct 5432 one) |
| `DB_USERNAME` | `postgres.xxxxxxxxxxxx` | Same Supabase connection page |
| `DB_PASSWORD` | *(your Supabase DB password)* | Same page |
| `SERVER_API_KEY` | `your-shared-secret` | Must match whatever the frontend sends as `x-api-key` |
| `ALLOWED_ORIGIN` | `https://your-frontend.vercel.app` | Your deployed frontend's exact URL |
| `FROM_EMAIL` | `hr@yourcompany.com` | Must match `MAIL_USERNAME`'s own address for most SMTP providers |
| `MAIL_USERNAME` | `hr@yourcompany.com` | SMTP login |
| `MAIL_PASSWORD` | *(App Password, not your real password, if using Gmail)* | |
| `MAIL_HOST` | `smtp.gmail.com` | Optional — defaults to Gmail's SMTP if unset |
| `MAIL_PORT` | `587` | Optional — defaults to 587 |

## Local development

```bash
./mvnw spring-boot:run
```

Swagger UI: `http://localhost:9090/swagger-ui/index.html`
Health check: `http://localhost:9090/api/appraisals/health`

## Deploying to Render

1. New Web Service → connect this repo.
2. Build Command: `./mvnw clean package -DskipTests`
3. Start Command: `java -jar target/appraisal-letter-backend-0.0.1-SNAPSHOT.jar`
4. Add all the environment variables listed above.
5. Deploy — Flyway runs automatically on startup and creates the `appraisals` table in your Supabase database the first time.

## Database

Flyway runs on startup. `V1` creates the `appraisals` table; `V2`
switches it to the salary-revision fields (`designation`, `current_ctc`,
`revised_ctc`, `effective_date`, `variable_pay`, `professional_tax`,
`employee_email`). Old offer-letter columns are kept but unused, so
existing rows are not lost.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/appraisals` | Save an appraisal |
| `GET` | `/api/appraisals` | List saved appraisals (newest first) |
| `GET` | `/api/appraisals/search?name=...` | Search by employee name |
| `GET` | `/api/appraisals/{id}` | Get one appraisal |
| `GET` | `/api/appraisals/{id}/pdf` | Download the letter as PDF |
| `POST` | `/api/appraisals/{id}/email` | Email the PDF to the employee |
| `GET` | `/api/appraisals/health` | Health check |

All `/api/**` routes need the `x-api-key` header when `SERVER_API_KEY` is set.
