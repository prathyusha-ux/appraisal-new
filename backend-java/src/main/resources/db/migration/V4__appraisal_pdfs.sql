-- Stores the final letter PDF (as built/edited in the browser) per appraisal.
-- Kept in its own table so listing appraisals never loads the PDF bytes.
create table if not exists appraisal_pdfs (
    appraisal_id bigint primary key references appraisals (id) on delete cascade,
    pdf_data     bytea not null,
    updated_at   timestamptz not null default now()
);
