'use client';

/* ------------------------------------------------------------------
   THE CONTACT SECTION - markup + motion

   The last section of the page, straight after the vault. One card that
   asks a question and rewrites itself as the visitor answers, instead
   of a form that dumps eight fields on arrival.

   THE FLOW (as recorded):

     root ---> "Start a project" -> service -> budget -> brief -> sent
          ---> "Say hi"          -> sayHi  -> sent

   Only ONE card is ever mounted. A step change is a two-beat move: the
   current panel leaves (up on the way forward, down on the way back),
   the step state flips, the new panel arrives from the opposite side
   with its children staggered. `busy` gates the whole thing so a
   double click cannot start a second beat mid-flight.

   THE FOOT MOVES WITH THE PANEL. GO BACK and CONTINUE/SUBMIT sit
   outside .contact-card__panel in the markup - they must, or they
   would be caught in the panel's blur exit - but they are NOT exempt
   from the animation. Both tweens target the panel AND the foot
   together, so on every step the buttons leave with the old question
   and arrive with the new one, a beat behind it, instead of popping
   in unanimated the moment the state flips.

   THE FIELDS FLOAT. There is no placeholder attribute anywhere in this
   form: each field carries its label as a real element inside the box,
   and on focus - or once it holds text - that label shrinks and slides
   up to the field's top-left corner, exactly as in the recording.

   Colours are flat tokens, not gradients: the card is #202226, buttons
   rest on #f5f1e8 (GO BACK / CONTINUE on #d8d4c8) with #050505 type.
   All of it lives in styles/contact.css; nothing visual is set here
   except the transforms GSAP writes each frame.
   ------------------------------------------------------------------ */

import { uiSoundHandlers, uiHoverSoundHandlers } from '@/lib/uiSounds';
import { visitorCountry } from '@/lib/visitorCountry';
import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import {
	buildGreeting,
	CONTACT_FIELDS,
	CONTACT_HEADER,
	CONTACT_INTENTS,
	CONTACT_LABELS,
	CONTACT_STEPS,
	APP_STACKS,
	PROJECT_BUDGETS,
	PROJECT_SERVICES,
	SITE_TYPE_OTHER,
	SITE_TYPES,
	STACK_OPTIONS,
	type ContactOption,
	type Greeting,
} from './contactContent';

import { CONTACT_FLUID } from '@/config/contactFluid';

gsap.registerPlugin(ScrollTrigger);

type StepId =
	| 'root'
	| 'sayHi'
	| 'service'
	| 'siteType'
	| 'appStack'
	| 'budget'
	| 'stack'
	| 'brief'
	| 'sent';

/* THE PROJECT CHAIN, in order.

   The flow is no longer a fixed list of steps. A website brief and an
   app brief ask different questions, and asking both of everyone is how
   a three-tap flow turns back into a form - so steps whose service was
   not picked are left out of the chain entirely, and CONTINUE / GO BACK
   are computed from it rather than looked up in a table.

   Website and App are multi-select, so both branches can be present:
   someone wanting a site AND an Android app answers both, in order.

   The one step that is NOT in here is sayHi, which is a dead end off
   root rather than part of the project chain. */
function projectChain(services: string[]): StepId[] {
	const website = services.includes('website');
	const chain: StepId[] = ['service'];

	if (website) chain.push('siteType');
	if (services.includes('app')) chain.push('appStack');

	chain.push('budget');

	/* After the number, never before it - see STACK_OPTIONS. */
	if (website) chain.push('stack');

	chain.push('brief');
	return chain;
}

/* ---------------- the pill buttons ---------------- */

/** The plain pill: the two intents, and every option chip. Its hover
    is a whole-button spring - the pill swells and its label grows
    with it, exactly as the starting buttons do in the reference. */
const Pill: React.FC<{
	label: string;
	selected?: boolean;
	onClick: () => void;
}> = ({ label, selected, onClick }) => (
	<button
		type="button"
		className="contact-pill"
		data-selected={selected ? 'true' : undefined}
		aria-pressed={selected}
		onClick={onClick}
	>
		<span className="contact-pill__label">{label}</span>
	</button>
);

/** GO BACK / CONTINUE / SUBMIT. A DIFFERENT hover from the plain pills:
    the button body never moves. Its arrow knob slides out in the
    direction of travel, overflowing the button's rounded edge, and
    springs up a size as it goes - one arrow, riding the knob. */
const ArrowPill: React.FC<{
	label: string;
	direction: 'back' | 'forward';
	disabled?: boolean;
	onClick: () => void;
}> = ({ label, direction, disabled, onClick }) => (
	<button data-no-sound
		type="button"
		className="contact-arrow"
		data-dir={direction}
		disabled={disabled}
		onClick={onClick}
	>
		{direction === 'back' && (
			<span className="contact-arrow__knob" aria-hidden="true">
				<span className="contact-arrow__glyph">&#8592;</span>
			</span>
		)}
		<span className="contact-arrow__label">{label}</span>
		{direction === 'forward' && (
			<span className="contact-arrow__knob" aria-hidden="true">
				<span className="contact-arrow__glyph">&#8594;</span>
			</span>
		)}
	</button>
);

/* ---------------- the floating-label field ----------------

   One component for inputs and textareas, because the animation is
   identical for both. The label is a real element, never a
   placeholder: it starts centred-left inside the box as if it were
   one, and on focus or content it shrinks and slides up to the
   top-left corner, clearing the way for the caret and typed text.

   data-filled is the only JS the move needs: focus is :focus-within
   in CSS, but a blurred field that still holds text must keep its
   label up, and CSS cannot see an input's value. One flag, set on
   change, and the label's two states are both pure CSS from there. */
const Field: React.FC<{
	name: string;
	label: string;
	type?: string;
	area?: boolean;
	rows?: number;
	/* CONTROLLED MODE, optional. Omit both and the field keeps its own
	   text, which is what the brief and Say hi forms want - they are read
	   back with FormData on submit and nothing outside cares until then.

	   Pass them when the value has to live in React state instead, as the
	   custom site type does: it gates CONTINUE, so the section above has
	   to see every keystroke. */
	value?: string;
	onValueChange?: (next: string) => void;
}> = ({
	name,
	label,
	type = 'text',
	area = false,
	rows = 4,
	value,
	onValueChange,
}) => {
	const [filled, setFilled] = useState(false);

	/* In controlled mode the passed value is the source of truth, so the
	   local flag is not consulted at all. */
	const isFilled = value !== undefined ? value.trim().length > 0 : filled;

	const change = (next: string) => {
		if (value !== undefined) onValueChange?.(next);
		else setFilled(next.length > 0);
	};

	return (
		<div
			className={'contact-field-wrap' + (area ? ' contact-field-wrap--area' : '')}
			data-filled={isFilled ? 'true' : undefined}
		>
			{area ? (
				<textarea
					id={`contact-${name}`}
					className="contact-field contact-field--area"
					name={name}
					rows={rows}
					{...(value !== undefined ? { value } : {})}
					onChange={(event) => change(event.target.value)}
				/>
			) : (
				<input
					id={`contact-${name}`}
					className="contact-field"
					name={name}
					type={type}
					{...(value !== undefined ? { value } : {})}
					onChange={(event) => change(event.target.value)}
				/>
			)}
			<label className="contact-field__label" htmlFor={`contact-${name}`}>
				{label}
			</label>
		</div>
	);
};

/* ---------------- the section ---------------- */

export const ContactSection: React.FC = () => {
	const rootRef = useRef<HTMLElement>(null);
	const headRef = useRef<HTMLDivElement>(null);
	const cardRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const fluidRef = useRef<HTMLDivElement>(null);
	/* The level currently on screen, kept in a ref because the next rise
	   has to start from wherever the last one actually stopped. */
	const levelRef = useRef<number>(CONTACT_FLUID.restingLevel);

	const [step, setStep] = useState<StepId>('root');
	/* MULTI-SELECT. Website and App are not either/or - the visitor can
	   pick one, the other, or both, so services is a list and budget
	   stays a single pick. */
	const [services, setServices] = useState<string[]>([]);
	const [budget, setBudget] = useState<string | null>(null);
	/* The website branch: which kind of site, plus the free-typed answer
	   that "Something else" reveals. ONE pick, like the two framework
	   questions - a brief claiming to be four kinds of site at once has
	   not been thought about yet, and one answer is what makes the
	   questions after it answerable. */
	const [siteType, setSiteType] = useState<string | null>(null);
	const [siteTypeOther, setSiteTypeOther] = useState('');
	/* The app branch, and the site's build. Single picks: these are
	   "which one" questions, not "which of these". */
	const [appStack, setAppStack] = useState<string | null>(null);
	const [stack, setStack] = useState<string | null>(null);
	const [greeting, setGreeting] = useState<Greeting | null>(null);

	/* Direction of the last move, read by the entry animation so the new
	   panel always arrives from the side the old one left towards. */
	const dir = useRef(1);
	const busy = useRef(false);


	/* The foot lives outside the panel (see the file header), so both
	   step tweens have to find it themselves. null when the current
	   step has no foot - root and sent have none. */
	const getFoot = useCallback(
		() =>
			cardRef.current?.querySelector<HTMLElement>(
				'.contact-card__foot',
			) ?? null,
		[],
	);

	/* The greeting names the visitor's clock and place, so it can only be
	   built on the client - rendering it on the server would ship the
	   build machine's afternoon to everyone. */
	useEffect(() => {
		setGreeting(buildGreeting());
	}, []);

	/* ENTRANCE. The heading is the section's first read, so it gets the
	   full treatment: every word rises out of its own overflow mask with
	   a touch of rotation and a blur that resolves as it lands - the
	   blur is what sells the speed, sharp type arriving never looks this
	   fast. The eyebrow blooms in ahead of it and the card lifts in under
	   the last words, so the three beats read as one gesture.

	   IT REPLAYS. toggleActions restart/reset instead of `once`: the
	   timeline restarts every time the section crosses the trigger line
	   on the way down, and resets to its hidden from-state once the
	   section has left the viewport above it, so the next visit always
	   plays the full reveal again rather than arriving to a settled
	   frame. */
	useEffect(() => {
		const root = rootRef.current;
		const head = headRef.current;
		const card = cardRef.current;
		if (!root || !head || !card) return;

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}

		const words = head.querySelectorAll<HTMLElement>('.contact-head__ink');
		const eyebrow = head.querySelector<HTMLElement>('.contact-head__eyebrow');

		const ctx = gsap.context(() => {
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: root,
					start: 'top 88%',
					toggleActions: 'restart none none reset',
				},
			});

			if (eyebrow) {
				tl.fromTo(
					eyebrow,
					{ opacity: 0, y: 14, filter: 'blur(6px)' },
					{ opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.42, ease: 'power3.out' },
				);
			}

			tl.fromTo(
				words,
				{
					yPercent: 120,
					rotate: 4,
					scale: 0.97,
					opacity: 0.4,
					filter: 'blur(8px)',
					transformOrigin: '0% 100%',
				},
				{
					yPercent: 0,
					rotate: 0,
					scale: 1,
					opacity: 1,
					filter: 'blur(0px)',
					duration: 0.72,
					ease: 'expo.out',
					stagger: { each: 0.028, from: 'start' },
				},
				'-=0.3',
			).fromTo(
				card,
				{ opacity: 0, y: 64, scale: 0.96, filter: 'blur(10px)' },
				{
					opacity: 1,
					y: 0,
					scale: 1,
					filter: 'blur(0px)',
					duration: 0.68,
					ease: 'expo.out',
				},
				'-=0.52',
			);
		}, root);

		return () => ctx.revert();
	}, []);

	/* ARRIVAL OF EACH STEP. Runs after every step commit, including the
	   first paint. The panel's rows stagger in; the foot arrives a beat
	   later with the same rise, so the buttons read as part of the step
	   rather than popping in unanimated. */
	useLayoutEffect(() => {
		const panel = panelRef.current;
		if (!panel) return;

		const rows = panel.querySelectorAll<HTMLElement>('[data-beat]');
		const foot = getFoot();

		const tl = gsap.timeline();
		tl.fromTo(
			panel,
			{ opacity: 0 },
			{ opacity: 1, duration: 0.2, ease: 'power2.out' },
		).fromTo(
			rows,
			{ y: 26 * dir.current, opacity: 0, filter: 'blur(7px)' },
			{
				y: 0,
				opacity: 1,
				filter: 'blur(0px)',
				duration: 0.42,
				ease: 'expo.out',
				stagger: 0.038,
				clearProps: 'filter,transform',
			},
			0,
		);

		/* The foot, a beat behind the question. No blur - it sits at the
		   card's edge, where a blur would smear against the rounded
		   corner; a short rise and fade is enough to join the arrival. */
		if (foot) {
			tl.fromTo(
				foot,
				{ y: 18 * dir.current, opacity: 0 },
				{
					y: 0,
					opacity: 1,
					duration: 0.36,
					ease: 'expo.out',
					clearProps: 'transform',
				},
				0.07,
			);
		}

		return () => {
			tl.kill();
		};
	}, [getFoot, step]);

	/* THE MOVE. Leave, commit, arrive. `forward` decides which way both
	   halves travel, so back always feels like retracing. Panel and
	   foot leave together - the buttons belong to the departing step,
	   so they must depart with it rather than blinking out mid-blur. */
	const go = useCallback(
		(next: StepId, forward = true) => {
			if (busy.current || next === step) return;
			const panel = panelRef.current;
			dir.current = forward ? 1 : -1;

			if (!panel) {
				setStep(next);
				return;
			}

			const foot = getFoot();
			const targets: HTMLElement[] = foot ? [panel, foot] : [panel];

			busy.current = true;
			gsap.to(targets, {
				opacity: 0,
				y: -22 * dir.current,
				filter: 'blur(8px)',
				duration: 0.2,
				ease: 'power2.in',
				onComplete: () => {
					gsap.set(targets, { y: 0, filter: 'blur(0px)' });
					busy.current = false;
					setStep(next);
				},
			});
		},
		[getFoot, step],
	);

	/* Recomputed each render because it depends on the picked services,
	   which the visitor can change by going back. */
	const chain = projectChain(services);

	const nextStep = useCallback(() => {
		const index = chain.indexOf(step);
		const next = index >= 0 ? chain[index + 1] : undefined;
		if (next) go(next);
	}, [chain, go, step]);

	const back = useCallback(() => {
		/* Both doors off root lead straight back to it. */
		if (step === 'sayHi' || step === 'service') {
			go('root', false);
			return;
		}

		const index = chain.indexOf(step);
		const previous = index > 0 ? chain[index - 1] : undefined;
		if (previous) go(previous, false);
	}, [chain, go, step]);

	/* ONE GATE for every option step: nothing moves forward until the
	   step's own question has been answered. "Something else" counts as
	   answered only once it has been typed into, or CONTINUE would send a
	   brief that says nothing. */
	const canContinue = (() => {
		switch (step) {
			case 'service':
				return services.length > 0;
			case 'siteType':
				return (
					siteType !== null &&
					(siteType !== SITE_TYPE_OTHER || siteTypeOther.trim().length > 0)
				);
			case 'appStack':
				return appStack !== null;
			case 'budget':
				return budget !== null;
			case 'stack':
				return stack !== null;
			default:
				return true;
		}
	})();

	/* ---- HOW FULL THE CARD IS ----

	   One number drives the liquid: what fraction of THIS visitor's own
	   questions have answers. The chain is already service-aware, so a
	   website-only brief is not punished with an unanswered Android
	   question sitting in its denominator - everyone's card fills at the
	   same rate regardless of which branch they took. */
	const answers = chain
		.filter((id) => id !== 'brief')
		.map((id) => {
			switch (id) {
				case 'service':
					return services.length > 0;
				case 'siteType':
					return (
						siteType !== null &&
						(siteType !== SITE_TYPE_OTHER || siteTypeOther.trim().length > 0)
					);
				case 'appStack':
					return appStack !== null;
				case 'budget':
					return budget !== null;
				case 'stack':
					return stack !== null;
				default:
					return false;
			}
		});

	/* The brief sits in the denominator but can never be answered before
	   SUBMIT, and that is the entire psychological point: arriving at the
	   form finds the card almost full, with one pour left. */
	const progress = (() => {
		if (step === 'root') return 0;
		if (step === 'sent') return 1;
		/* Say hi is a two-beat detour, not part of the project chain. */
		if (step === 'sayHi') return 0.5;
		return answers.filter(Boolean).length / (answers.length + 1);
	})();

	/* THE POUR. Rising overshoots and settles back, because real liquid
	   carries its momentum past the line and returns - that slosh is what
	   separates this from a progress bar with rounded corners. Draining is
	   plain and quick; losing ground is not worth savouring. */
	useEffect(() => {
		const fluid = fluidRef.current;
		if (!fluid) return;

		/* THE CURVE IS THE TRICK. The honest fraction is bent through
		   CONTACT_FLUID.curve, so the first answer moves the surface much
		   further than the last one does. The card therefore always looks
		   nearly finished, while every click still moves it visibly. */
		const felt = Math.pow(progress, CONTACT_FLUID.curve);
		const target =
			CONTACT_FLUID.restingLevel +
			(CONTACT_FLUID.fullLevel - CONTACT_FLUID.restingLevel) * felt;
		const from = levelRef.current;
		if (Math.abs(target - from) < 0.01) return;

		const write = (value: number) => {
			levelRef.current = value;
			fluid.style.setProperty('--cf-level', value.toFixed(2) + '%');
		};

		/* Reduced motion still gets the LEVEL - it is information, not
		   decoration - it just arrives without the journey. */
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			write(target);
			return;
		}

		const rising = target > from;

		/* Tweened through a proxy rather than as a CSS property directly, so
		   the number stays readable for the next rise and the easing is
		   GSAP's rather than the browser's. */
		const proxy = { level: from };
		const onUpdate = () => write(proxy.level);

		const tl = gsap.timeline();
		if (rising) {
			tl.to(proxy, {
				level: Math.min(
					100,
					target + (target - from) * CONTACT_FLUID.overshoot,
				),
				duration: CONTACT_FLUID.riseDuration,
				ease: CONTACT_FLUID.riseEase,
				onUpdate,
			}).to(proxy, {
				level: target,
				duration: CONTACT_FLUID.settleDuration,
				ease: CONTACT_FLUID.settleEase,
				onUpdate,
			});
		} else {
			tl.to(proxy, {
				level: target,
				duration: CONTACT_FLUID.drainDuration,
				ease: CONTACT_FLUID.drainEase,
				onUpdate,
			});
		}

		return () => {
			tl.kill();
		};
	}, [progress]);

	const close = useCallback(() => {
		setServices([]);
		setBudget(null);
		setSiteType(null);
		setSiteTypeOther('');
		setAppStack(null);
		setStack(null);
		go('root', false);
	}, [go]);

	/* Toggles one service chip. Both can be on at once; clicking a lit
	   chip turns it back off. */
	const toggleService = useCallback((id: string) => {
		setServices((current) =>
			current.includes(id)
				? current.filter((entry) => entry !== id)
				: [...current, id],
		);
	}, []);

	/* THE SEND.

	   Optimistic on purpose: the card advances to 'sent' immediately and the
	   POST is left to finish on its own. Somebody who has just answered five
	   questions should not be made to watch a spinner to find out whether a
	   database accepted them, and there is nothing useful they could do about
	   a failure anyway. A failure is logged, not turned into a dead end.

	   keepalive lets the request outlive the page, so closing the tab on the
	   'sent' screen does not lose the submission. */
	const submit = useCallback(
		(kind: 'sayHi' | 'brief') => {
			const form = panelRef.current?.querySelector('form');
			const data = form
				? (Object.fromEntries(new FormData(form).entries()) as Record<
						string,
						string
				  >)
				: {};

			const payload = {
				/* The table calls the project branch 'project'; the flow calls its
				   last step 'brief'. Translated here so the column keeps a name
				   that describes the visitor's intent rather than our step id. */
				kind: kind === 'brief' ? 'project' : 'sayHi',
				services,
				siteType,
				/* Only meaningful when siteType is 'other'. */
				siteTypeOther: siteTypeOther.trim() || undefined,
				appStack,
				budget,
				stack,
				/* The same signal the greeting used, so the inbox agrees with
				   what this visitor was actually shown. */
				country: visitorCountry() ?? undefined,
				...data,
			};

			void fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
				keepalive: true,
			})
				.then(async (response) => {
					if (!response.ok) {
						const body = (await response.json().catch(() => ({}))) as {
							error?: string;
						};
						console.error(
							'[contact] send failed',
							body.error ?? response.status,
						);
					}
				})
				.catch((err) => console.error('[contact] send failed', err));

			go('sent');
		},
		[appStack, budget, go, services, siteType, siteTypeOther, stack],
	);

	/* ---------------- panels ---------------- */

	const options = (
		items: ContactOption[],
		isSelected: (id: string) => boolean,
		toggle: (id: string) => void,
	) => (
		<div className="contact-options" data-beat>
			{items.map((option) => (
				<Pill
					key={option.id}
					label={option.label}
					selected={isSelected(option.id)}
					onClick={() => toggle(option.id)}
				/>
			))}
		</div>
	);

	const renderPanel = () => {
		switch (step) {
			case 'root':
				return (
					<>
						<h3 className="contact-card__question" data-beat>
							{greeting ? (
								<>
									{greeting.lead}
									<span className="contact-card__muted">
										{greeting.location}
									</span>
									{greeting.tail}
								</>
							) : (
								'Hey there! How can we assist you today?'
							)}
						</h3>

						<div className="contact-options contact-options--intents" data-beat>
							{CONTACT_INTENTS.map((intent) => (
								<Pill
									key={intent.id}
									label={intent.label}
									onClick={() =>
										go(
											intent.id === 'project'
												? 'service'
												: (intent.id as StepId),
										)
									}
								/>
							))}
						</div>
					</>
				);

			case 'service':
				return (
					<>
						<h3 className="contact-card__question" data-beat>
							{CONTACT_STEPS.service.heading}
						</h3>
						{options(
							PROJECT_SERVICES,
							(id) => services.includes(id),
							toggleService,
						)}
					</>
				);

			case 'siteType':
				return (
					<>
						<h3 className="contact-card__question" data-beat>
							{CONTACT_STEPS.siteType.heading}
						</h3>
						{options(SITE_TYPES, (id) => siteType === id, setSiteType)}
						{/* Revealed by "Something else", and controlled rather
						    than read on submit because it gates CONTINUE. */}
						{siteType === SITE_TYPE_OTHER && (
							<div className="contact-form" data-beat>
								<Field
									name="siteTypeOther"
									label={CONTACT_FIELDS.siteTypeOther}
									value={siteTypeOther}
									onValueChange={setSiteTypeOther}
								/>
							</div>
						)}
					</>
				);

			case 'appStack':
				return (
					<>
						<h3 className="contact-card__question" data-beat>
							{CONTACT_STEPS.appStack.heading}
						</h3>
						{options(APP_STACKS, (id) => appStack === id, setAppStack)}
					</>
				);

			case 'budget':
				return (
					<>
						<h3 className="contact-card__question" data-beat>
							{CONTACT_STEPS.budget.heading}
						</h3>
						{options(
							PROJECT_BUDGETS,
							(id) => budget === id,
							setBudget,
						)}
					</>
				);

			case 'stack':
				return (
					<>
						<h3 className="contact-card__question" data-beat>
							{CONTACT_STEPS.stack.heading}
						</h3>
						{options(STACK_OPTIONS, (id) => stack === id, setStack)}
					</>
				);

			case 'brief':
				return (
					<>
						<h3 className="contact-card__question" data-beat>
							{CONTACT_STEPS.brief.heading}
						</h3>
						<form
							className="contact-form contact-form--grid"
							data-beat
							onSubmit={(event) => {
								event.preventDefault();
								submit('brief');
							}}
						>
							<Field name="fullName" label={CONTACT_FIELDS.fullName} />
							<Field name="email" label={CONTACT_FIELDS.email} type="email" />
							<Field name="company" label={CONTACT_FIELDS.company} />
							<Field name="phone" label={CONTACT_FIELDS.phone} />
							<Field
								name="description"
								label={CONTACT_FIELDS.description}
								area
								rows={4}
							/>
						</form>
					</>
				);

			case 'sayHi':
				return (
					<>
						<h3 className="contact-card__question" data-beat>
							{CONTACT_STEPS[step].heading}
						</h3>
						<form
							className="contact-form"
							data-beat
							onSubmit={(event) => {
								event.preventDefault();
								submit(step);
							}}
						>
							<Field name="fullName" label={CONTACT_FIELDS.fullName} />
							<div className="contact-form__pair">
								<Field name="email" label={CONTACT_FIELDS.email} type="email" />
								<Field name="phone" label={CONTACT_FIELDS.phone} />
							</div>
							<Field
								name="message"
								label={CONTACT_FIELDS.message}
								area
								rows={4}
							/>
						</form>
					</>
				);

			case 'sent':
				return (
					<>
						<h3 className="contact-card__question" data-beat>
							{CONTACT_STEPS.sent.heading}
						</h3>
						<div className="contact-options" data-beat>
							<Pill label="Back to start" onClick={close} />
						</div>
					</>
				);
		}
	};

	/* THE FOOT. Rendered OUTSIDE the panel so it is never caught in the
	   panel's blur, but animated WITH the panel on every step - see the
	   file header. Which right-hand button exists depends on the step. */
	const renderFoot = () => {
		switch (step) {
			/* Every option step wears the same foot - only the gate and the
			   destination differ, and both are computed above. */
			case 'service':
			case 'siteType':
			case 'appStack':
			case 'budget':
			case 'stack':
				return (
					<div className="contact-card__foot">
						<ArrowPill
							label={CONTACT_LABELS.back}
							direction="back"
							onClick={back}
						/>
						<ArrowPill
							label={CONTACT_LABELS.continue}
							direction="forward"
							disabled={!canContinue}
							onClick={nextStep}
						/>
					</div>
				);
			case 'brief':
				return (
					<div className="contact-card__foot">
						<ArrowPill
							label={CONTACT_LABELS.back}
							direction="back"
							onClick={back}
						/>
						<ArrowPill
							label={CONTACT_LABELS.submit}
							direction="forward"
							onClick={() => submit('brief')}
						/>
					</div>
				);
			case 'sayHi':
				return (
					<div className="contact-card__foot">
						<ArrowPill
							label={CONTACT_LABELS.back}
							direction="back"
							onClick={back}
						/>
						<ArrowPill
							label={CONTACT_LABELS.submit}
							direction="forward"
							onClick={() => submit('sayHi')}
						/>
					</div>
				);
			default:
				return null;
		}
	};

	/* The header sentence, word by word, each in its own overflow box so
	   the rise has something to be masked by. "touch" carries the muted
	   tone, exactly as in the design. */
	const headingWords = CONTACT_HEADER.heading.split(' ');

	const eyebrow =
		step === 'root' ? '' : CONTACT_STEPS[step].eyebrow;

	return (
		<section
			id="contact"
			ref={rootRef}
			className="contact"
			{...uiSoundHandlers}
			{...uiHoverSoundHandlers}
			aria-label="Contact"
		>
			<div className="contact__inner">
				<div ref={headRef} className="contact-head">
					<p className="contact-head__eyebrow">{CONTACT_HEADER.eyebrow}</p>
					<h2 className="contact-head__title">
						{headingWords.map((word, index) => {
							const muted = word
								.replace(/[^a-zA-Z]/g, '')
								.toLowerCase() === CONTACT_HEADER.mutedWord;
							return (
								<span className="contact-head__word" key={`${word}-${index}`}>
									<span
										className="contact-head__ink"
										data-muted={muted ? 'true' : undefined}
									>
										{word}
									</span>
								</span>
							);
						})}
					</h2>
				</div>

				<div ref={cardRef} className="contact-card">
					{/* THE LIQUID. Purely decorative: the progress it reports is
					    already legible from the step itself, so it is hidden from
					    assistive tech rather than announced as a second, noisier
					    copy of the same fact. Two counter-drifting crests in
					    opposite PHASE - one starts at a trough where the other
					    starts at a crest - because one wave is a pattern and two
					    crossing waves are a fluid. */}
					<div ref={fluidRef} className="contact-fluid" aria-hidden="true">
						<div className="contact-fluid__body">
							<svg
								className="contact-fluid__crest"
								viewBox="0 0 1200 140"
								preserveAspectRatio="none"
							>
								<path
									className="contact-fluid__wave contact-fluid__wave--back"
									d="M0,22 C50,22 100,96 150,96 C200,96 250,22 300,22 C350,22 400,96 450,96 C500,96 550,22 600,22 C650,22 700,96 750,96 C800,96 850,22 900,22 C950,22 1000,96 1050,96 C1100,96 1150,22 1200,22 L1200,140 L0,140 Z"
								/>
								<path
									className="contact-fluid__wave contact-fluid__wave--front"
									d="M0,96 C50,96 100,22 150,22 C200,22 250,96 300,96 C350,96 400,22 450,22 C500,22 550,96 600,96 C650,96 700,22 750,22 C800,22 850,96 900,96 C950,96 1000,22 1050,22 C1100,22 1150,96 1200,96 L1200,140 L0,140 Z"
								/>
							</svg>
						</div>
					</div>

					<p className="contact-card__eyebrow" aria-hidden={!eyebrow}>
						{eyebrow}
					</p>

					<div ref={panelRef} className="contact-card__panel">
						{renderPanel()}
					</div>

					{renderFoot()}
				</div>
			</div>
		</section>
	);
};

export default ContactSection;
