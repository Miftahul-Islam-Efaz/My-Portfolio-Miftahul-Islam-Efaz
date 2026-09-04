'use client';

import React, { useRef } from 'react';

import { useReduction } from '../../hooks/useReduction';
import {
	REDUCTION_EYEBROW,
	REDUCTION_PROOF_COLUMNS,
	REDUCTION_SIGNOFF,
	REDUCTION_STATEMENT_TEXT,
	REDUCTION_STATEMENT_WORDS,
} from './reductionData';
import '../../styles/reduction.css';

/* ------------------------------------------------------------------
   THE REDUCTION - markup only

   This file renders nodes and nothing else. Every number lives in
   `src/config/reduction.ts`, every string in `./reductionData.ts`, and
   all motion in `src/hooks/useReduction.ts`, which finds its targets
   through the `data-reduction` attributes below. Add a target by adding
   an attribute, never by importing gsap here.

   ACCESSIBILITY: the statement is split into words for the stagger, so
   the heading carries the whole sentence as `aria-label` and the word
   spans are hidden from assistive tech. A screen reader gets one
   sentence instead of ten fragments.

   THE CANVAS IS DECORATION, and is marked as such. Everything it draws
   is a phrase this site chose NOT to say, so there is nothing in it a
   reader needs and nothing worth announcing.
   ------------------------------------------------------------------ */

export const ReductionSection: React.FC = () => {
	const rootRef = useRef<HTMLElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useReduction({ rootRef, stageRef, canvasRef });

	return (
		<section
			id="the-point"
			ref={rootRef}
			className="reduction"
			aria-label="What Efaz does"
		>
			<div ref={stageRef} className="reduction__stage">
				{/* The field of everything this site could have said. */}
				<canvas
					ref={canvasRef}
					className="reduction__field"
					aria-hidden="true"
				/>

				{/* Both ends fade to the void the neighbouring sections are
				    painted in, so the light section has no drawn seam at either
				    edge - the same rule the work stage follows. */}
				<div
					className="reduction__edge reduction__edge--top"
					aria-hidden="true"
				/>
				<div
					className="reduction__edge reduction__edge--bottom"
					aria-hidden="true"
				/>

				<div className="reduction__inner">
					<p className="reduction__eyebrow">{REDUCTION_EYEBROW}</p>

					<h2
						className="reduction__statement"
						aria-label={REDUCTION_STATEMENT_TEXT}
					>
						{REDUCTION_STATEMENT_WORDS.map((word, index) => (
							<span
								key={`${word.text}-${index}`}
								data-reduction="word"
								className={
									word.accent
										? 'reduction__word reduction__word--accent'
										: 'reduction__word'
								}
								aria-hidden="true"
							>
								{word.text}
								{word.accent ? (
									<span
										data-reduction="underline"
										className="reduction__underline"
									/>
								) : null}
							</span>
						))}
					</h2>

					<div className="reduction__proof">
						{REDUCTION_PROOF_COLUMNS.map((column) => (
							<div
								key={column.index}
								data-reduction="column"
								className="reduction__column"
							>
								<span
									data-reduction="rule"
									className="reduction__column-rule"
									aria-hidden="true"
								/>
								<span className="reduction__column-head">
									<span className="reduction__column-index">
										{column.index}
									</span>
									<span className="reduction__column-label">
										{column.label}
									</span>
								</span>
								<p className="reduction__column-body">{column.body}</p>
							</div>
						))}
					</div>

					<div className="reduction__signoff">
						<p data-reduction="signoff" className="reduction__place">
							{REDUCTION_SIGNOFF.place}
						</p>
						<p data-reduction="signoff" className="reduction__handoff">
							{REDUCTION_SIGNOFF.handoff}
						</p>
					</div>
				</div>
			</div>
		</section>
	);
};

export default ReductionSection;
