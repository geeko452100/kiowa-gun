// Streamlined Range Rules content for the step-by-step membership wizard
// (app/membership/apply/*). Mirrors the legacy Range Rules text seeded into
// page_sections('agreement','body') by migrations/0027_agreement_page_content.sql,
// split into 4 pages of ~5 segments each per club request. The standalone
// /membership info page still reads the DB copy directly -- this is a fixed
// duplicate for the wizard's simplified per-page format, so an admin edit to
// the DB copy won't automatically propagate here.
export const RANGE_RULES: string[] = [
  "Range flag at gate must be raised anytime you are on the property! Range flags at firing lines must be raised when shooting on the line or downrange.",
  "All shooting on rifle ranges must be done from the permanent firing line.",
  "I will not shoot when work crews are on the range.",
  "I will follow all of the safety rules and guidelines I have been taught about safe gun handling. I am responsible for my guest's actions while on the property.",
  "I will not shoot center fire rifles, including .223 pistols, toward or in pistol ranges #1 and #2.",
  "I will follow the club calendar, as scheduled events will take precedence.",
  "I will not shoot with artificial lighting.",
  "I will take all my targets and trash I brought to the range home, or deposit in trash cans provided. I WILL NOT LEAVE MY TARGETS ON THE BACKER BOARDS.",
  "I will only shoot at targets that are safe, NOT trash cans, rocks or other items that may cause ricochets.",
  "During scheduled shoots, modified rules may apply.",
  "No hunting of any kind is allowed on club property.",
  "Shotgun shooting is not allowed on club property. This includes handguns while shooting shot shells.",
  "A member must accompany guests at all times.",
  "Vehicles are allowed to be driven to the backstops to setup or check targets provided they stay on rock. No vehicles behind the backstops.",
  "No alcoholic beverages are allowed on club property at any time.",
  "Eye and Ear protection is required at all matches, we recommend using whenever you are shooting.",
  "Do not leave live rounds lying on the range. Dispose of them in the misfire container located at the end of the backstop between ranges #1 and #2.",
  "The use of binary explosives is prohibited. (Tannerite, Shockwave etc.)",
];

export const RULES_REPORTING_CLAUSE =
  "If you see someone violate these rules or act in an unsafe manner, it is suggested that you approach them in a nonthreatening manner and bring the violation to their attention. If you are not satisfied that they understand and will correct their actions, contact a club officer and a review of the incident will made by the board. As a member you have the right to ask to see their membership card.";

export const RULES_AGREEMENT_CLAUSE =
  "I have read these rules and I agree to abide by these rules. As safety is our primary concern, I understand that any violation of this rule by me or my guests could result in termination of my membership.";

export type RulesPage = { rules: string[]; clauses: string[] };

// Page 1: rules 1-6, Page 2: rules 7-12, Page 3: rules 13-18. Page 4 (the
// sign step) carries no rules of its own -- just RULES_AGREEMENT_CLAUSE
// above the agree checkbox/signature fields, handled in SignStep directly.
export const RULES_PAGES: RulesPage[] = [
  { rules: RANGE_RULES.slice(0, 6), clauses: [] },
  { rules: RANGE_RULES.slice(6, 12), clauses: [] },
  { rules: RANGE_RULES.slice(12, 18), clauses: [] },
];
