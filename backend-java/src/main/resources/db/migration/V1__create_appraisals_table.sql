-- Run automatically by Flyway on application startup.
-- Mirrors the same fields as the Offer Letter app's offer_sends table,
-- since the appraisal letter reuses that same input/letter structure.

create table if not exists appraisals (
    id                      bigint generated always as identity primary key,
    employee_name           varchar(255) not null,
    job_title               varchar(255) not null,
    department              varchar(255) not null,
    role_description        text,
    work_location           varchar(255) not null,
    date_of_joining         date not null,
    letter_date             date not null,
    annual_ctc              numeric(12, 2) not null,
    notice_period_days      integer not null default 90,
    include_bond            boolean not null default false,
    bond_years              integer,
    bond_amount             numeric(12, 2),
    pf_included             boolean not null default false,
    employee_pf             numeric(12, 2),
    employer_pf             numeric(12, 2),
    variable_pay_included   boolean not null default false,
    variable_pay_amount     numeric(12, 2),
    tds_included            boolean not null default false,
    tds_amount              numeric(12, 2),
    recipient_email         varchar(255),
    pdf_path                varchar(500),
    status                  varchar(50) not null default 'saved',
    resend_id               varchar(255),
    created_at              timestamptz not null default now()
);

create index if not exists idx_appraisals_employee_name on appraisals (lower(employee_name));
create index if not exists idx_appraisals_created_at on appraisals (created_at desc);
