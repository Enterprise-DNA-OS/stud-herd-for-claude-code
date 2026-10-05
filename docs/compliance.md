# Cattle record checks

Checked 2026-10-05. Run `node scripts/herd.mjs compliance --json`. Each finding includes its source. This is a record review, not certification or advice on treatment, welfare, export eligibility or breeding. Official registrations, declarations and submissions happen in the relevant official system. A receipt here records the operator's evidence of that action.

## New Zealand cattle identification

MPI's [tagging and registration guidance](https://www.groundrules.mpi.govt.nz/rule/3448-nait-tagging-and-registering-animals) says to tag within 180 days of birth or before first off-farm movement, whichever comes first. Register within seven days of tagging or before movement, whichever comes first.

The checks flag an active NZ animal aged 180 days or more with no tag date or electronic ID. They flag a tagged animal at seven days with no registration date. Any recorded movement with missing identification is flagged regardless of age, including a calf moved before 180 days. Recorded NZ tag and registration dates after the movement are also flagged. The boundary reminder includes the due day to prompt action. The free base does not determine an exemption, inspect tag type or verify the official database.

## Movements and receipts

[MPI's NAIT programme](https://www.mpi.govt.nz/animals/national-animal-identification-tracing-nait-programme) and [NAIT regulations](https://www.legislation.govt.nz/regulation/public/2012/0116/latest/whole.html) govern NZ declarations. The regulations include timing qualifications and exemptions. This build uses a conservative operational reminder 48 hours after the recorded movement timestamp, not a legal deadline calculator.

For Australia, [Integrity Systems movement guidance](https://www.integritysystems.com.au/identification--traceability/buying-selling-moving/) identifies the receiver's transfer responsibility and a 48-hour period. [Its regional guidance](https://www.integritysystems.com.au/about/red-meat-integrity-systems/customer-corner-September-2024/) says to check state and territory requirements. Both incoming and outgoing local records are included in reconciliation so the farm can check the receiving party's evidence. An outgoing reminder does not assert that the sender carries the receiver's legal duty.

A movement with no receipt or no recorded timestamp stays pending, then overdue after the reminder. A receipt recorded later stays labelled as recorded after the reminder. Timestamps require a timezone. The code does not validate a PIC or NAIT number against a registry, account for exemptions or submit anything. Movement records do not automatically update an animal's property or sale status; the operator confirms these separately.

## Treatments and sale preparation

[Integrity Systems treatment guidance](https://www.integritysystems.com.au/on-farm-assurance/safe-and-responsible-animal-treatments/) and its [record checklist](https://www.integritysystems.com.au/globalassets/isc/pdf-files/lpa-documents/lpa-factsheets/safe-and-responsible-animal-treatments-factsheet-and-checklist.pdf) describe product, batch, expiry, dose and withholding records. Meat withholding periods and export slaughter intervals are distinct. [APVMA explains that distinction](https://www.apvma.gov.au/registrations-and-permits/data-guidelines/veterinary-data-guidelines/overseas-trade-part-5b/vet-drug-residues).

The check flags missing batch, product expiry or dose, product expiry before treatment, and missing meat or export clearance dates or instruction reference. Enter clearance dates from the applicable label or veterinarian instruction. For markets where an export interval does not apply, record the reviewed date and the reason in instruction_ref. No treatment date, dose or withdrawal interval is inferred. NZ records receive the same completeness reminders as an operational practice, not a claim that Australian LPA rules govern NZ farms.

Sale preparation counts treatments whose instruction reference or dates are missing, or whose later clearance date is after the sale date. Equal dates are not flagged by that calculation; operators still verify exact treatment times and destination requirements. It separately shows missing movement receipts, electronic ID and society ID. None of these results is a fitness-for-sale or slaughter clearance. Missing unrecorded treatments cannot be detected.

## Breeding and performance

A joining requires a female dam, male sire and dates after parent birth. A calving requires an existing calf with the matching birth date and dam. Recording a calving marks its linked joining calved. Other parent tags can refer to off-farm animals absent from this database; unresolved pedigree links are visible. No inbreeding calculation, genetic evaluation or biological prediction is provided. Expected calving dates are entered by the operator. Daily weight gain uses the last two weights and is not a comparable adjusted performance trait. Only compare EBVs from the same trait, analysis and run.
