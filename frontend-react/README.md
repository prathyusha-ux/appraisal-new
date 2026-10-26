# Appraisal Letter Frontend (React + Vite)

Salary-revision appraisal form: employee details, live salary structure
(Basic / HRA / Special Allowance / PF / Professional Tax / Take Home), the
appraisal letter preview, PDF download and email, plus a list of saved records.
Talks to the Spring Boot backend in `../backend-java`.

## Setup

```bash
npm install
```

Create a `.env` file (or set these in your host's environment variables):

```
VITE_API_BASE_URL=http://localhost:9090
VITE_SERVER_API_KEY=your-shared-secret
```

`VITE_SERVER_API_KEY` must match the backend's `SERVER_API_KEY` exactly.
For production, `VITE_API_BASE_URL` is your deployed backend URL.

```bash
npm run dev       # local dev (http://localhost:5173)
npm run build     # production build -> dist/
```

## Where things are

- `src/components/AppraisalForm.jsx` – form, generate/save, saved-records table
- `src/components/EmployeeDetails.jsx` – the input fields
- `src/utils/salaryCalculator.js` – salary calculation (mirrored in the backend's `SalaryCalculator.java`)
- `src/components/AppraisalLetterPreview.jsx` – the letter text
- `src/services/appraisalService.js` – API calls (sends the `x-api-key` header)
