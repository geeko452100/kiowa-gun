-- Range Rules Acknowledgement on the legacy paper form has three fields:
-- printed name, signature, and NRA number. The digital form previously only
-- captured a typed signature; this adds the other two so the digital record
-- matches the paper one.
ALTER TABLE members ADD COLUMN rules_acknowledged_printed_name TEXT;
ALTER TABLE members ADD COLUMN nra_number TEXT;
