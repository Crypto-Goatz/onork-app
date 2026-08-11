/**
 * The Actions glossary — every action in plain English, with an example.
 *
 * WHY THIS IS CODE AND NOT A TABLE. The list an agency reads has to be the list
 * the executor can actually run. Held in a database it drifts the moment a
 * capability is added, renamed or unwired, and drift here means promising an
 * agency something that will not happen. Held here it ships in the same commit
 * as the handler, and `missingFromCatalog()` fails loudly when the two disagree.
 *
 * WRITING RULES for entries:
 *   • `name` is what a person would call it, not the id. No dots, no jargon.
 *   • `what` says exactly what happens, including the part people get wrong.
 *   • `example` is one sentence you could actually type into the command bar.
 * Never say "GHL" — always "CRM".
 */

export interface ActionDoc {
  /** Plain-English name. Title Case. */
  name: string
  /** Exactly what it does. */
  what: string
  /** A command you could really type. */
  example: string
  /** Plain-language grouping for filters. */
  group:
    | 'Contacts'
    | 'Messaging'
    | 'Tasks & Calendar'
    | 'Sales'
    | 'Automations'
    | 'AI Agents'
    | 'Clients & Setup'
    | 'Content & Store'
    | 'Reporting'
}

export const ACTIONS: Record<string, ActionDoc> = {
  /* ── Contacts ── */
  'contact.create': {
    name: 'Add a contact',
    what: 'Creates a new person in one client’s CRM. If someone with that email already exists there, the CRM updates them rather than making a duplicate.',
    example: 'For Harbor Dental: add a contact named Dana Reed with email dana@example.com.',
    group: 'Contacts',
  },
  'contact.update': {
    name: 'Update a contact',
    what: 'Changes details on an existing person — name, phone, email, or any custom field the client has set up.',
    example: 'For Harbor Dental: set Dana Reed’s phone to 555-0134 and mark her source as Referral.',
    group: 'Contacts',
  },
  'contact.search': {
    name: 'Find contacts',
    what: 'Finds and counts people matching what you describe. Reads only — nothing is changed. Use it before a bulk action to see exactly who would be affected.',
    example: 'For Harbor Dental: how many contacts are tagged demo and have no appointment booked?',
    group: 'Contacts',
  },
  'contact.tag': {
    name: 'Tag contacts',
    what: 'Adds or removes a tag across one or many people at once. Tags can start the client’s own automations, so this can set off far more than the tag itself.',
    example: 'For Harbor Dental: tag everyone matching demo with hot-lead.',
    group: 'Contacts',
  },
  'contact.note': {
    name: 'Add a note',
    what: 'Writes a timestamped note on a person’s record. Visible to the client’s team, and never sent to the contact.',
    example: 'For Harbor Dental: add a note on Dana Reed saying she asked about weekend availability.',
    group: 'Contacts',
  },
  'customfield.create': {
    name: 'Create a custom field',
    what: 'Adds a new field to a client’s contact records so you can store something the CRM has no box for.',
    example: 'For Harbor Dental: create a contact field called Insurance Provider.',
    group: 'Contacts',
  },

  /* ── Messaging ── */
  'email.send': {
    name: 'Send an email',
    what: 'Sends an email to one person or a group from the client’s own sending address. It goes out immediately — there is no draft step.',
    example: 'For Harbor Dental: email Dana Reed about the new whitening offer.',
    group: 'Messaging',
  },
  'sms.send': {
    name: 'Send an SMS',
    what: 'Sends an SMS from the client’s number. Sends immediately, and the client is billed by the CRM for the message.',
    example: 'For Harbor Dental: text Dana Reed that her Thursday appointment is confirmed.',
    group: 'Messaging',
  },
  'conversation.read': {
    name: 'Read a conversation',
    what: 'Reads and summarises the message history with a person, across email, SMS and chat. Reads only.',
    example: 'For Harbor Dental: summarise everything Dana Reed has said to us this month.',
    group: 'Messaging',
  },

  /* ── Tasks & Calendar ── */
  'task.create': {
    name: 'Create a task',
    what: 'Adds a task with a due date, assigned to a teammate, an automation, or an AI agent.',
    example: 'For Harbor Dental: create a task “Follow up Monday” on Dana Reed, assigned to Priya.',
    group: 'Tasks & Calendar',
  },
  'appointment.book': {
    name: 'Book an appointment',
    what: 'Books, moves or cancels a slot on a client’s calendar, respecting their availability rules.',
    example: 'For Harbor Dental: book Dana Reed with Dr. Alvarez on Thursday at 2pm.',
    group: 'Tasks & Calendar',
  },

  /* ── Sales ── */
  'opportunity.move': {
    name: 'Move a deal',
    what: 'Moves a deal to a different pipeline stage, or changes its value or owner.',
    example: 'For Harbor Dental: move Dana Reed’s deal to Proposal Sent and set it to $2,400.',
    group: 'Sales',
  },
  'invoice.create': {
    name: 'Create an invoice',
    what: 'Creates an invoice for a person and optionally sends it. Sending it asks a real customer for money, so say explicitly if you want it sent.',
    example: 'For Harbor Dental: create a $450 invoice for Dana Reed for the whitening package — do not send it yet.',
    group: 'Sales',
  },

  /* ── Automations ── */
  'workflow.list': {
    name: 'List automations',
    what: 'Shows the automations a client already has, with their names. Reads only. Use it to get the exact name before starting one.',
    example: 'For Harbor Dental: what automations do they have running?',
    group: 'Automations',
  },
  'workflow.trigger': {
    name: 'Start an automation',
    what: 'Puts one or more people into an automation the client already has. Everything that automation does then happens on its own.',
    example: 'For Harbor Dental: start the New Patient Welcome automation for Dana Reed.',
    group: 'Automations',
  },
  'workflow.deploy': {
    name: 'Give a new client an automation',
    what: 'Loads one of your standard automations into a client — only while that client is being created. Existing clients cannot receive one this way.',
    example: 'Create a client called Harbor Dental and give them my Standard Nurture automation.',
    group: 'Automations',
  },
  'workflow.author': {
    name: 'Build a new automation',
    what: 'Not possible from here — the CRM has no API for writing a new automation. Deploy an existing template into a new client instead, or build it once by hand and reuse it.',
    example: 'Instead: For Harbor Dental: start the New Patient Welcome automation for Dana Reed.',
    group: 'Automations',
  },
  'funnel.clone': {
    name: 'Give a new client a funnel',
    what: 'Copies one of your funnels into a client as they are created.',
    example: 'Create a client called Harbor Dental and give them my Consult Booking funnel.',
    group: 'Automations',
  },
  'funnel.edit': {
    name: 'Edit a funnel page',
    what: 'Not possible from here — funnel content has no edit API. A replacement page can be built and published instead.',
    example: 'Instead: For Harbor Dental: build a consult booking page and publish it to their blog.',
    group: 'Automations',
  },

  /* ── AI Agents ── */
  'agent.list': {
    name: 'List AI agents',
    what: 'Shows the AI agents a client has. Reads only.',
    example: 'For Harbor Dental: what AI agents do they have?',
    group: 'AI Agents',
  },
  'agent.create': {
    name: 'Create an AI agent',
    what: 'Creates a new AI agent inside a client’s CRM and publishes it, ready to answer.',
    example: 'For Harbor Dental: create an AI agent that answers questions about opening hours and pricing.',
    group: 'AI Agents',
  },
  'agent.run': {
    name: 'Ask an AI agent',
    what: 'Sends a question or instruction to one of a client’s existing agents and returns its answer.',
    example: 'For Harbor Dental: ask their booking agent what slots are open on Friday.',
    group: 'AI Agents',
  },
  'agents.deploy': {
    name: 'Give a new client an agent team',
    what: 'Loads a whole set of your agents into a client at the moment they are created.',
    example: 'Create a client called Harbor Dental and load my Front Desk agent team.',
    group: 'AI Agents',
  },
  'agents.author': {
    name: 'Design a native agent from scratch',
    what: 'Not possible from here — native agents are built in the CRM’s own builder. An existing agent team can be deployed instead.',
    example: 'Instead: Create a client called Harbor Dental and load my Front Desk agent team.',
    group: 'AI Agents',
  },

  /* ── Clients & Setup ── */
  'location.create': {
    name: 'Create a client account',
    what: 'Creates a brand-new client sub-account under your agency. This is the one action that adds to your bill.',
    example: 'Create a client called Harbor Dental with owner dana@example.com.',
    group: 'Clients & Setup',
  },
  'location.features': {
    name: 'Switch client features on or off',
    what: 'Turns CRM features on or off for a client to match what they pay for. Additive unless you explicitly say to remove — switching something off can hide funnels or content they are using.',
    example: 'For Harbor Dental: switch on memberships and courses.',
    group: 'Clients & Setup',
  },
  'user.create': {
    name: 'Add a team member',
    what: 'Adds a user to a client account and sets what they can see and do.',
    example: 'For Harbor Dental: add Priya Shah as a user with calendar access.',
    group: 'Clients & Setup',
  },
  'menu.link': {
    name: 'Add 0nCORE to a client’s sidebar',
    what: 'Puts a link in a client’s CRM navigation so their team can open 0nCORE without leaving the CRM.',
    example: 'Add 0nCORE to the sidebar for every client.',
    group: 'Clients & Setup',
  },
  'snapshot.list': {
    name: 'List snapshots',
    what: 'Shows the snapshots your agency has available to load into new clients. Reads only.',
    example: 'What snapshots do I have?',
    group: 'Clients & Setup',
  },
  'snapshot.apply_at_create': {
    name: 'Create a client from a snapshot',
    what: 'Creates a client with one of your snapshots already loaded, so they start fully set up.',
    example: 'Create a client called Harbor Dental using my Dental Starter snapshot.',
    group: 'Clients & Setup',
  },
  'snapshot.repush': {
    name: 'Update an existing client’s snapshot',
    what: 'Not possible from here — pushing a snapshot into a client that already exists is a manual step in the CRM. Snapshots can only be applied as a client is created.',
    example: 'Instead: Create a client called Harbor Dental using my Dental Starter snapshot.',
    group: 'Clients & Setup',
  },

  /* ── Content & Store ── */
  'page.render': {
    name: 'Build a page',
    what: 'Turns a description into a finished web page. Produces the page — publishing it is a separate step.',
    example: 'For Harbor Dental: build a whitening offer page with a booking button.',
    group: 'Content & Store',
  },
  'blog.publish': {
    name: 'Publish to the blog',
    what: 'Publishes a page you have built as a post on the client’s blog, where it is publicly visible.',
    example: 'For Harbor Dental: publish the whitening offer page to their blog.',
    group: 'Content & Store',
  },
  'site.build': {
    name: 'Build a whole website',
    what: 'Not possible from here — the CRM has no create-API for native sites. Single pages can be built and published to the blog instead.',
    example: 'Instead: For Harbor Dental: build a whitening offer page and publish it to their blog.',
    group: 'Content & Store',
  },
  'product.create': {
    name: 'Add a product',
    what: 'Adds a product with a price to a client’s store.',
    example: 'For Harbor Dental: add a product called Whitening Package at $450.',
    group: 'Content & Store',
  },
  'product.collection': {
    name: 'Create a product category',
    what: 'Creates a collection so products can be grouped in the client’s store.',
    example: 'For Harbor Dental: create a collection called Cosmetic Treatments.',
    group: 'Content & Store',
  },
  'store.provision': {
    name: 'Build out a store',
    what: 'Creates a whole set of products and collections in one pass from a list you give.',
    example: 'For Harbor Dental: build a store with whitening at $450, cleaning at $120 and veneers at $1,800.',
    group: 'Content & Store',
  },
  'store.page': {
    name: 'Create the storefront page',
    what: 'Not possible from here — storefront pages live in the funnel builder, which has no create API. The products themselves can still be created.',
    example: 'Instead: For Harbor Dental: build a store with whitening at $450 and cleaning at $120.',
    group: 'Content & Store',
  },
  'social.schedule': {
    name: 'Schedule a social post',
    what: 'Writes and schedules posts to a client’s connected social accounts.',
    example: 'For Harbor Dental: schedule three posts this week about the whitening offer.',
    group: 'Content & Store',
  },

  /* ── Reporting & everything else ── */
  'report.rollup': {
    name: 'Report across all clients',
    what: 'Answers one question across every client at once and returns a single combined table.',
    example: 'How many new contacts did every client get last week?',
    group: 'Reporting',
  },
  'external.call': {
    name: 'Use another service',
    what: 'Does something outside the CRM — mail, payments, documents and the rest — through the connected 0nMCP services.',
    example: 'For Harbor Dental: create a Stripe payment link for the $450 whitening package.',
    group: 'Reporting',
  },
}

/**
 * Ids the executor knows about but nobody has written a plain-English entry for.
 *
 * Surfaced in the API response rather than thrown: a missing description should
 * never take down the page an agency uses to find out what is possible.
 */
export function missingFromCatalog(registryIds: string[]): string[] {
  return registryIds.filter((id) => !ACTIONS[id])
}
