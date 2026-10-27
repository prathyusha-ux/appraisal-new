-- Switches the appraisals table from the offer-letter fields to the
-- salary-revision appraisal fields. Non-destructive: old columns that no
-- longer apply are kept (made nullable) so existing rows are not lost.

alter table appraisals rename column job_title       to designation;
alter table appraisals rename column annual_ctc      to revised_ctc;
alter table appraisals rename column recipient_email to employee_email;

alter table appraisals add column if not exists current_ctc      numeric(12, 2);
alter table appraisals add column if not exists effective_date   date;
alter table appraisals add column if not exists variable_pay     numeric(12, 2) not null default 0;
alter table appraisals add column if not exists professional_tax numeric(12, 2) not null default 200;

-- Backfill existing rows so the new NOT NULL columns can be enforced.
update appraisals set current_ctc    = revised_ctc  where current_ctc is null;
update appraisals set effective_date = letter_date  where effective_date is null;
update appraisals set variable_pay   = coalesce(variable_pay_amount, 0) where variable_pay_included;

alter table appraisals alter column current_ctc    set not null;
alter table appraisals alter column effective_date set not null;

-- Offer-letter-only columns: no longer filled by the app.
alter table appraisals alter column work_location      drop not null;
alter table appraisals alter column date_of_joining    drop not null;
alter table appraisals alter column letter_date        drop not null;
alter table appraisals alter column notice_period_days drop not null;
