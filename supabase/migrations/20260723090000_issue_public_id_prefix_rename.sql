-- Rename existing issue public ids from the KIV- prefix to HIB- (hiba),
-- so the entity-type prefix is descriptive rather than the product name,
-- consistent with the newer PRJ- (projekt) convention.

update issues
set public_id = 'HIB-' || substring(public_id from 5)
where public_id like 'KIV-%';
