-- Rudys VIP Commercial Foundation Seed Template
-- Replace the value below with Rudy's Supabase auth user id before running manually.
-- In-app seeding through /settings is preferred.

do $$
declare
  rudy_user_id uuid := '00000000-0000-0000-0000-000000000000';
  aio_id uuid;
  seo_id uuid;
  web_id uuid;
  content_id uuid;
  ads_id uuid;
  automation_id uuid;
  local_id uuid;
  health_id uuid;
begin
  insert into public.profiles (id, full_name, timezone)
  values (rudy_user_id, 'Rudy McCormick', 'America/Chicago')
  on conflict (id) do nothing;

  insert into public.service_lines (user_id, name, short_name, description, primary_outcome, sort_order)
  values
    (rudy_user_id, 'AIO — AI Optimization', 'AIO', 'Improve AI and answer-engine visibility.', 'Increase visibility in AI-assisted discovery.', 10),
    (rudy_user_id, 'SEO — Search Engine Optimization', 'SEO', 'Improve organic search visibility.', 'Grow qualified organic traffic.', 20),
    (rudy_user_id, 'Web Development', 'Web', 'Build or improve websites.', 'Create a clearer, stronger conversion-focused website.', 30),
    (rudy_user_id, 'Content Creation', 'Content', 'Create strategic marketing content.', 'Build authority and support lead generation.', 40),
    (rudy_user_id, 'Performance Marketing / Paid Ads', 'Paid Ads', 'Plan and improve paid campaigns.', 'Generate qualified traffic and leads.', 50),
    (rudy_user_id, 'Marketing Automation', 'Automation', 'Create follow-up and workflow systems.', 'Reduce missed follow-up opportunities.', 60),
    (rudy_user_id, 'Local Visibility / Local SEO', 'Local SEO', 'Improve local search visibility.', 'Help local prospects find and trust the business.', 70),
    (rudy_user_id, 'Website Health, Speed, and Conversion Improvements', 'Website Health', 'Improve website speed, UX, and conversion paths.', 'Turn more visitors into qualified leads.', 80);

  insert into public.buyer_segments (user_id, name, description, common_pains, desired_outcomes, objections, sort_order)
  values
    (rudy_user_id, 'Contractors', 'Residential and commercial contractors who need consistent local visibility and lead flow.', array['Inconsistent lead flow','Weak local search visibility','Too much dependence on referrals'], array['More qualified local leads','Better Google visibility','More estimate requests'], array['I already get referrals','Marketing has not worked before'], 10),
    (rudy_user_id, 'Mid-sized manufacturers', 'Manufacturers that need better digital visibility and clearer capabilities messaging.', array['Website does not explain capabilities clearly','Hard to generate qualified RFQs online'], array['More qualified RFQs','Clearer capabilities pages'], array['Our buyers already know us','Our industry is too technical'], 20),
    (rudy_user_id, 'Machine shops', 'Precision machining and fabrication businesses that need to show capabilities and credibility.', array['Low online visibility','Not enough qualified quote requests'], array['More quote requests','Better capabilities presentation'], array['We are already busy','Most work comes from relationships'], 30),
    (rudy_user_id, 'Dental practices', 'Dental offices that need stronger local search presence and patient appointment generation.', array['Competition from nearby practices','Not enough new patient appointments'], array['More new patient calls','Better local search visibility'], array['We already have a website','We tried SEO before'], 40),
    (rudy_user_id, 'Legal firms', 'Law firms that need local visibility, authority content, and qualified consultation requests.', array['Competitive local search results','Weak practice area pages'], array['More qualified consultations','Stronger practice area authority'], array['Legal marketing must be careful','We do not want generic content'], 50);

  select id into aio_id from public.service_lines where user_id = rudy_user_id and name = 'AIO — AI Optimization' limit 1;
  select id into seo_id from public.service_lines where user_id = rudy_user_id and name = 'SEO — Search Engine Optimization' limit 1;
  select id into web_id from public.service_lines where user_id = rudy_user_id and name = 'Web Development' limit 1;
  select id into content_id from public.service_lines where user_id = rudy_user_id and name = 'Content Creation' limit 1;
  select id into ads_id from public.service_lines where user_id = rudy_user_id and name = 'Performance Marketing / Paid Ads' limit 1;
  select id into automation_id from public.service_lines where user_id = rudy_user_id and name = 'Marketing Automation' limit 1;
  select id into local_id from public.service_lines where user_id = rudy_user_id and name = 'Local Visibility / Local SEO' limit 1;
  select id into health_id from public.service_lines where user_id = rudy_user_id and name = 'Website Health, Speed, and Conversion Improvements' limit 1;

  insert into public.offers (user_id, service_line_id, name, description, target_buyer_segments, offer_type, primary_cta, outcome, price_notes)
  values
    (rudy_user_id, aio_id, 'AI Visibility Audit', 'Audit AI search and visibility signals.', array['Contractors','Mid-sized manufacturers','Machine shops','Dental practices','Legal firms'], 'audit', 'Book an AI Visibility Audit', 'Show the business how visible and credible it is in AI-assisted discovery.', 'Entry-point audit that can lead to project or retainer.'),
    (rudy_user_id, local_id, 'Local Visibility Booster', 'Improve local search and Google Business Profile visibility.', array['Contractors','Dental practices','Legal firms'], 'project', 'Improve Local Visibility', 'Help local buyers find and trust the business.', 'Project with optional monthly local SEO support.'),
    (rudy_user_id, health_id, 'Website Health and Speed Pack', 'Improve speed, technical health, UX, and conversion paths.', array['Contractors','Mid-sized manufacturers','Machine shops','Dental practices','Legal firms'], 'project', 'Run a Website Health Check', 'Make the website faster, clearer, and more effective.', 'Strong diagnostic offer.'),
    (rudy_user_id, ads_id, 'Lead Gen Accelerator', 'Lead generation campaign setup with landing pages and tracking.', array['Contractors','Dental practices','Legal firms'], 'hybrid', 'Launch a Lead Gen Campaign', 'Drive qualified inquiries and sales conversations.', 'Campaign setup plus ongoing management.'),
    (rudy_user_id, content_id, 'Authority Content Engine', 'Monthly authority content for SEO, AI visibility, email, social, and video.', array['Contractors','Mid-sized manufacturers','Machine shops','Dental practices','Legal firms'], 'retainer', 'Build an Authority Content Plan', 'Create consistent educational content that builds trust.', 'Monthly content retainer.'),
    (rudy_user_id, seo_id, 'SEO Growth Retainer', 'Monthly SEO improvement program.', array['Contractors','Mid-sized manufacturers','Machine shops','Dental practices','Legal firms'], 'retainer', 'Start an SEO Growth Plan', 'Improve search visibility and organic lead generation.', 'Monthly retainer.'),
    (rudy_user_id, web_id, 'Website Conversion Sprint', 'Focused website messaging, layout, CTA, and conversion improvement sprint.', array['Contractors','Mid-sized manufacturers','Machine shops','Dental practices','Legal firms'], 'project', 'Improve Website Conversions', 'Make the website clearer and more persuasive.', 'Project before rebuild or retainer.'),
    (rudy_user_id, automation_id, 'Marketing Automation Starter', 'Starter automation package for lead follow-up and sales workflows.', array['Contractors','Mid-sized manufacturers','Machine shops','Dental practices','Legal firms'], 'project', 'Set Up Marketing Automation', 'Respond faster and reduce missed opportunities.', 'Can lead into ongoing automation support.');
end $$;
