/* ------------------------------------------------------------------
   THE CONTACT SECTION - copy + options

   Every string the visitor reads lives here, so the component stays
   pure markup + motion. Same split as rakeContent.ts / vaultContent.ts.

   The greeting line is assembled at runtime because it names the part
   of the day and the country the visitor is sitting in - a sentence
   that is written by the browser, not by us.
   ------------------------------------------------------------------ */

import { visitorCountry } from '@/lib/visitorCountry';

export type ContactOption = {
	id: string;
	label: string;
};

/* The section header, above the card. `mutedWord` is the one word set
   in the quieter tone - "touch" - exactly as in the design. */
export const CONTACT_HEADER = {
	eyebrow: 'Contact',
	heading:
		'Have an inquiry, suggestion, a collaboration offer or even trouble sleeping? Get in touch with us now.',
	mutedWord: 'touch',
} as const;

/* Step copy. Keys match the StepId union in ContactSection.tsx. */
export const CONTACT_STEPS = {
	root: {
		eyebrow: '',
		/* heading is built by buildGreeting() */
	},
	sayHi: {
		eyebrow: 'Say hi',
		heading: 'Give us more deets, please!',
	},
	service: {
		eyebrow: 'Start a project',
		heading:
			'Ready to team up? Our passion for crushing goals sets us apart. How can we help you?',
	},
	siteType: {
		eyebrow: 'Start a project',
		heading: 'What kind of site are we building?',
	},
	appStack: {
		eyebrow: 'Start a project',
		heading: 'Any preference on how the Android app gets built?',
	},
	budget: {
		eyebrow: 'Start a project',
		heading:
			"Things in life may not always be free, right? What's your budget for this project?",
	},
	stack: {
		eyebrow: 'Start a project',
		heading: 'Last one — how should the site itself be built?',
	},
	brief: {
		eyebrow: 'Start a project',
		heading:
			"Let's spice it up! Fill out our project form \u2014 and let our adventure begin!",
	},
	sent: {
		eyebrow: 'Sent',
		heading: 'Message received! We will get back to you shortly.',
	},
} as const;

/* The two doors on the resting card. */
export const CONTACT_INTENTS: ContactOption[] = [
	{ id: 'project', label: 'Start a project' },
	{ id: 'sayHi', label: 'Say hi' },
];

/* Website and App only, as requested. */
export const PROJECT_SERVICES: ContactOption[] = [
	{ id: 'website', label: 'Website' },
	{ id: 'app', label: 'App' },
];

/* Dollars, opening at $500 - the floor for a portfolio or a single
   landing page, which is the smallest job worth quoting.

   The bands narrow at the bottom and widen at the top because that is
   where the decisions are: the gap between $500 and $2.5k is a
   different project, the gap between $10k and $12k is a conversation. */
export const PROJECT_BUDGETS: ContactOption[] = [
	{ id: '500-1k', label: '$500 – $1k' },
	{ id: '1k-2.5k', label: '$1k – $2.5k' },
	{ id: '2.5k-5k', label: '$2.5k – $5k' },
	{ id: '5k-10k', label: '$5k – $10k' },
	{ id: '10k+', label: '$10k+' },
];

/* ---------------- the website branch ----------------

   What KIND of site, not what it is built in. This is the question that
   actually moves the quote - an e-commerce build and a landing page are
   different jobs - and it is one a non-technical visitor can answer
   without feeling tested. The build question comes later, after budget.

   'other' is the escape hatch: picking it reveals a text field, so a
   project that is none of these can describe itself instead of being
   forced into the nearest wrong box. */
export const SITE_TYPES: ContactOption[] = [
	{ id: 'marketing', label: 'Marketing / brand site' },
	{ id: 'ecommerce', label: 'E-commerce' },
	{ id: 'webapp', label: 'Web app / dashboard' },
	{ id: 'portfolio', label: 'Portfolio' },
	{ id: 'landing', label: 'Landing page' },
	{ id: 'other', label: 'Something else' },
];

/** The one id that reveals the free-text field, named here so the
    component never hardcodes the string. */
export const SITE_TYPE_OTHER = 'other';

/* ---------------- the app branch ----------------

   Android only, and deliberately limited to stacks that are quick to
   build and iterate on with AI assistance: JS/TS and Dart carry far
   more public training material than native Android, so generated code
   needs less correction.

   Native Kotlin is off the list on purpose. It is the right answer for
   some briefs, and those land on 'No preference'. */
export const APP_STACKS: ContactOption[] = [
	{ id: 'expo', label: 'React Native (Expo)' },
	{ id: 'flutter', label: 'Flutter' },
	{ id: 'pwa', label: 'PWA / hybrid (Capacitor)' },
	{ id: 'any', label: 'No preference — recommend for me' },
];

/* ---------------- the build, asked after budget ----------------

   Late on purpose: by this point the visitor has committed to a scope
   and a number, so a technical question can no longer scare them out of
   the flow. Only asked when Website is among the picked services -
   offering WordPress to an app-only brief would be nonsense. */
export const STACK_OPTIONS: ContactOption[] = [
	{ id: 'custom', label: 'Custom build (Next.js / React)' },
	{ id: 'wordpress', label: 'WordPress (CMS)' },
	{ id: 'any', label: 'No preference — recommend for me' },
];

export const CONTACT_LABELS = {
	back: 'Go back',
	continue: 'Continue',
	submit: 'Submit',
	close: 'Close',
} as const;

export const CONTACT_FIELDS = {
	fullName: 'Full Name',
	email: 'Email',
	phone: 'Phone',
	company: 'Company',
	message: 'Message',
	description: 'Description',
	siteTypeOther: 'Tell us what kind of site',
} as const;

/* ---------------- the greeting ----------------

   "Hey there! How can we assist you on this afternoon in
   Bangladesh?" - the daypart comes from the visitor's clock and the
   country from their IANA time zone, so the line is true for whoever
   is reading it.

   ONE PLACE NAME, not a city and a country. The city was the time
   zone's name and the country came from navigator.language, which are
   unrelated signals - an en-US browser in Dhaka read "in Dhaka, United
   States". See lib/visitorCountry.ts.

   Rendered in three parts because the location is set in the muted
   tone: [lead] + [location] + [tail]. */
export type Greeting = {
	lead: string;
	location: string;
	tail: string;
};

function daypart(hour: number): string {
	if (hour < 5) return 'late night';
	if (hour < 12) return 'morning';
	if (hour < 17) return 'afternoon';
	if (hour < 21) return 'evening';
	return 'night';
}

export function buildGreeting(now: Date = new Date()): Greeting {
	const part = daypart(now.getHours());

	const place = visitorCountry();

	return {
		lead: `Hey there! How can we assist you on this ${part}`,
		location: place ? ` in ${place}` : '',
		tail: '?',
	};
}
