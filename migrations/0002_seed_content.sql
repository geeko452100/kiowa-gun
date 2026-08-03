-- Seed data ported from the previous static site so the CMS-backed site launches at parity.

INSERT INTO page_sections (page_slug, section_key, heading, body_html) VALUES
('home', 'welcome', 'Welcome!', '<p>The Kiowa Gun Club, one of the oldest established clubs in the central Kansas Region, is a membership driven club. The club is proud to be a National Rifle Association affiliated club. Current active membership in the NRA is a requirement of club membership. Membership dues are $150 annually, membership period is from August 1st to July 31st.</p>'),
('home', 'matches_teaser', 'Scheduled Pistol Shoots 2026', '<p>Defensive pistol shoots are held on the second Saturday each month, beginning March at 1pm.</p><p>Schedule will be updated soon (subject to change).</p><p>First time shooters shoot free, following shoots are $15, which now includes everyone in immediate family.</p><p>Everyone (members/non-members) are welcome.</p><p>Also, club members are invited to join the 4th Tuesday of each month for a fun evening of shooting, starting at 6pm.</p>'),
('home', 'notice', 'Notice! New Member Requirement', '<p>The club has instituted a background check for all prospective new members. Read the details at the link below.</p><p>Note: The link below has been updated with new information.</p>'),
('about', 'officers', 'Current Kiowa Gun Club Officers', '<ul><li>Lane Moore, President</li><li>Mike Ille, Vice President</li><li>Sheldon Peacock, Treasurer</li><li>Joe Felke, Secretary</li><li>Dennis Kephart, Range Officer</li></ul><p><b>Kiowa Gun Club Inc. is a private shooting club for members and guests only.</b></p>'),
('rules', 'intro', 'Range Rules', '<p>The club establishes the following regulations for safe and responsible range use:</p>'),
('rules', 'body', NULL, '<ul class="rules-list"><li>Range flag at gate must be raised anytime you are on the property. Range flag at firing line must be raised when shooting on the line or downrange.</li><li>All shooting on rifle ranges MUST be done from the permanent firing line.</li><li>I will not shoot when work crews are on the range.</li><li>I will follow all of the safety rules and guidelines I have been taught about safe gunhandling. I am responsible for my guest''s actions while on property.</li><li>I will NOT shoot center fire rifles, including .223 pistols, toward or in pistol ranges #1 and #2.</li><li>I will follow the club calendar, as scheduled events will take precedence.</li><li>I will not shoot with artificial lighting.</li><li>I will take all my targets and trash I brought to the range home, or deposit in trash cans provided. I WILL NOT LEAVE MY TARGETS ON THE BACKER BOARDS.</li><li>I will only at shoot at targets that are safe, NOT trash cans, rocks, or other items that may cause ricochets.</li><li>During scheduled shoots, modified rules may apply.</li><li>No hunting of any kind is allowed on club property.</li><li>Shotgun shooting is NOT ALLOWED on club property. This includes handguns while shooting shotshells.</li><li>A member must accompany guests at all times.</li><li>Vehicles are allowed to be driven to the backstops to set up or check targets, provided they stay on the rock. No vehicles are allowed behind the backstops.</li><li>No alcoholic beverages are allowed on club property at any time.</li><li>Eye and ear protection is required at all matches. We recommend using them whenever you are shooting.</li><li>Do not leave live rounds lying on the range. Dispose of them in the misfire container located at the end of the backstop between ranges #1 and #2.</li><li>The use of binary explosives is prohibited. (Tannerite, Shockwave, etc.)</li></ul><p>If you see someone violate these rules or act in an unsafe manner it is suggested that you approach them in a non-threatening manner and bring the violation to their attention. If you are not satisfied that they understand and will correct their actions, contact a club officer, and a review of the incident will be made by the board. As a member, you have the right to ask to see their membership card.</p><p>Membership dues are due August 1st of each year. FAILURE TO PAY DUES BY SEPTEMBER 10th WILL RESULT IN TERMINATION OF YOUR MEMBERSHIP. At this time dues are $150 annually.</p><p>All new members will have to complete a range orientation before they are issued their membership card.</p>'),
('membership', 'terms', 'Membership Info', '<p>Membership dues are $150 annually, due August 1st of each year.</p><p>Failure to pay dues by September 10th will result in the termination of your membership.</p><p>Members must be current members of NRA and show proof of unexpired NRA membership.</p><p>All new members will be required to have a range orientation before membership is approved.</p><ul><li>Sheldon Peacock — <a href="tel:+16202828554">(620) 282-8554</a></li><li>Dennis Kephart — <a href="tel:+16206173053">(620) 617-3053</a></li></ul><p>Due to a limited number of memberships, Kiowa Gun Club is currently not accepting new memberships.</p><p>If you wish to be placed on a waiting list please email your request to <a href="mailto:kiowa369@outlook.com">kiowa369@outlook.com</a>.</p>'),
('matches', 'intro', '2026 Defensive Pistol match times', '<p>Defensive pistol shoots are held on the second Saturday each month, beginning March 14th at 1pm.</p><p>Schedule as follows (subject to change).</p><p>Everyone (members/non-members) are welcome.</p>'),
('contact', 'details', 'Kiowa Gun Club', '<p>Mailing Address:</p><p>PO Box 562<br>Great Bend, KS 67530</p><p>Physical Location:</p><p>369 SW 50 Ave</p><p>Email: <a href="mailto:kiowa369@outlook.com">kiowa369@outlook.com</a></p>');

INSERT INTO matches (event_date, event_time, notes, results_url, sort_order) VALUES
('March 14th', '1:00pm', NULL, 'https://practiscore.com/results/new/325886', 1),
('April 11th', '1:00pm', NULL, 'https://practiscore.com/results/new/329673', 2),
('May 9th', '9:00am', NULL, 'https://practiscore.com/results/new/333967', 3),
('June 13th', '8:00am', 'Great Plains Speed Shooting Championship', NULL, 4),
('July 11th', '9:00am', NULL, NULL, 5),
('August 8th', '9:00am', NULL, NULL, 6),
('Sept 12th', '9:00am', NULL, NULL, 7),
('Oct 10th', '9:00am', NULL, NULL, 8),
('Nov 14th', '1:00pm', NULL, NULL, 9);

INSERT INTO news_posts (title, body_html, is_published) VALUES
('Attention Prospective Members:', '<p>Due to the uncertain times we are all living in, the directors of the Kiowa Gun Club have deemed it necessary to take some additional steps moving forward with new club memberships.</p><p>From this time forward it will be required of prospective members wishing to join the Kiowa Gun Club to be subjected to criminal background checks.</p><p>These checks will be at the prospective member''s expense.</p><p>The prospective member will be required to have a background check done on them by the firm, Criminal Watch Dog.</p><p>The nationwide background check is the only background check that will be accepted by the Kiowa Gun Club.</p><p>The applicant will have 10 calendar days from the time they are contacted by the gun club to provide the completed background check to the club via USPS.</p><p>It shall be mailed to the Kiowa Gun Club, Inc. P.O. Box 562 Great Bend, Ks 67530.</p><p>If the completed background check is not received in the 10 days, the applicants name will be removed from the waiting list.</p><p>Once the background check is received the board of directors will review it to determine if the applicant will be accepted for membership.</p><p>If the applicant is accepted they will be required to complete a safety orientation at the range and the dues of $150 will be collected.</p><p>If the applicant has a current concealed carry permit that will be accepted the same as a background check.</p><p>A reminder that membership in the NRA is required to be a member.</p><p>The Kiowa Gun Club regret that it has come to this, but this is what we feel is necessary to protect the club and all current and future members.</p><p>The contact information for the company providing the background checks is: <a href="https://www.criminalwatchdog.com" target="_blank" rel="noopener">criminalwatchdog.com</a></p>', 1);

INSERT INTO documents (title, description, category, r2_key, file_name) VALUES
('2026 Range Rules and Membership Application Agreement', 'Print, sign, and mail or bring to the range office.', 'membership', 'seed/rules-agreement.pdf', 'rules-agreement.pdf');

INSERT INTO calendar_events (title, start, color) VALUES
('Defensive Pistol Shoot', '2026-08-08T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2026-08-25T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2026-09-12T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2026-09-22T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2026-10-10T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2026-10-27T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2026-11-14T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2026-11-24T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2026-12-12T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2026-12-22T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2027-01-09T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2027-01-26T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2027-02-13T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2027-02-23T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2027-03-13T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2027-03-23T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2027-04-10T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2027-04-27T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2027-05-08T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2027-05-25T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2027-06-12T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2027-06-22T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2027-07-10T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2027-07-27T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2027-08-14T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2027-08-24T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2027-09-11T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2027-09-28T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2027-10-09T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2027-10-26T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2027-11-13T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2027-11-23T18:00:00', '#2c3e1f'),
('Defensive Pistol Shoot', '2027-12-11T13:00:00', '#8a1f11'),
('Club Member Shooting Session', '2027-12-28T18:00:00', '#2c3e1f');
