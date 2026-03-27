const CRM_BASE = 'https://services.leadconnectorhq.com';
const CRM_PIT = process.env.CRM_AGENCY_API_KEY || 'pit-e789d87e-bc97-429e-abc3-ff46aa47a316';
const CRM_LOCATION = process.env.CRM_LOCATION_ID || 'nphConTwfHcVE1oA0uep';

export async function POST(req: Request) {
  const { name, email, company, role } = await req.json();

  if (!email || !name) {
    return Response.json({ error: 'Name and email required' }, { status: 400 });
  }

  const firstName = name.split(' ')[0] || name;
  const lastName = name.split(' ').slice(1).join(' ') || '';

  try {
    // Step 1: Create contact in CRM with tags
    const contactRes = await fetch(`${CRM_BASE}/contacts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRM_PIT}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId: CRM_LOCATION,
        firstName,
        lastName,
        email,
        companyName: company || '',
        tags: ['0nai-waitlist', 'needs-onboarding', '0nmcp-customer'],
        customFields: [
          { id: '4GfQOTKQOhJpGOJXr718', field_value: role || '' },      // Business Type
          { id: 'trfsbVNFxlhLso3YEb3z', field_value: company || '' },   // Company Website
          { id: '25p3RSJERrVpQmJiqsJ9', field_value: 'waitlist' },      // Onboarding Status
          { id: '5oO90DsIG8IYQ8DzaH0S', field_value: 'waitlist' },      // Plan Tier
        ],
      }),
    });

    const contactData = await contactRes.json();
    const contactId = contactData?.contact?.id;

    console.log(`[request-access] Contact created: ${contactId} (${email})`);

    // Step 2: Send immediate thank you email via CRM
    if (contactId) {
      await fetch(`${CRM_BASE}/conversations/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CRM_PIT}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'Email',
          contactId,
          message: `Hi ${firstName},

Thank you for requesting access to 0nAI — the command center powered by 819+ AI tools across 54 services.

Here's what's waiting for you:

• Personal AI Agent (Jaxx) — trained on YOUR business, learns your preferences, gets better over time
• Multi-AI Council — GPT-4o, Gemini, Grok, Claude, and Llama working together on every question
• 54 Service Integrations — CRM, Stripe, SendGrid, Slack, GitHub, Shopify, and 48 more
• Real-Time Team Chat — collaborate with AI mentions (@jaxx for AI, @0n for actions)
• Self-Improving Knowledge Base — the more you use it, the smarter it gets
• Visual Workflow Builder — describe outcomes, not steps

We're sending logins in batches as capacity opens up to ensure every user gets the best experience from day one. You'll receive your credentials soon.

In the meantime, learn more at https://0nmcp.com

— The 0nAI Team
RocketOpp LLC`,
          subject: 'Your 0nAI Access Request — Received',
        }),
      }).catch(() => {});
    }

    // Step 3: Schedule the "at capacity" follow-up (5 minutes later)
    // We use a simple timeout here — in production this would be a CRM workflow trigger
    if (contactId) {
      setTimeout(async () => {
        try {
          await fetch(`${CRM_BASE}/conversations/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CRM_PIT}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'Email',
              contactId,
              message: `Hi ${firstName},

Thank you for your interest in 0nAI.

We appear to be at capacity at the moment — our team is working to provision new AI instances to ensure every user gets a dedicated, personalized experience.

We will reach out as soon as we have a user AI available to assign to you. You're in the queue and we haven't forgotten about you.

Your position is secured. No action needed on your end.

— The 0nAI Team
RocketOpp LLC
https://0nmcp.com`,
              subject: '0nAI — We\'re at Capacity, You\'re in the Queue',
            }),
          });
          console.log(`[request-access] Follow-up email sent to ${email}`);
        } catch (err) {
          console.error(`[request-access] Follow-up email failed:`, err);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }

    return Response.json({ success: true, contactId });
  } catch (err: any) {
    console.error('[request-access] Error:', err.message);
    return Response.json({ success: true }); // Don't expose errors to user
  }
}
