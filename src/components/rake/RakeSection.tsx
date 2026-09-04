'use client';

import React, { useRef } from 'react';

import { useRakeLight } from '../../hooks/useRakeLight';
import { RAKE_HANDOFF, RAKE_STATEMENT_TEXT } from './rakeContent';

/* ------------------------------------------------------------------
   THE RAKE - markup

   Two layers, and only ever one of them visible:

     .rake__canvas    the shader. One hard ember light sweeping a
                      corrugated wall, igniting engraved type as it
                      passes. Not 3D - all depth is per-pixel maths.
     .rake__fallback  the same sentence as real DOM text.

   THE FALLBACK IS THE DEFAULT. It is styled visible and is hidden only
   once the hook confirms a live WebGL context by setting
   `data-rake-state="live"` on the root. So no WebGL, reduced motion,
   JS disabled, or a crawler all get the statement as readable text. It
   is also what screen readers announce - the canvas is aria-hidden,
   because a lit wall has nothing to announce.

   No motion code here. All of it is in useRakeLight + gl/scene.ts, and
   every number is in config/rakeLight.ts.
   ------------------------------------------------------------------ */

export const RakeSection: React.FC = () => {
	const rootRef = useRef<HTMLElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useRakeLight({ rootRef, stageRef, canvasRef });

	return (
		<section
			id="the-point"
			ref={rootRef}
			className="rake"
			aria-label="What Efaz does"
		>
			<div ref={stageRef} className="rake__stage">
				<canvas
					ref={canvasRef}
					className="rake__canvas"
					aria-hidden="true"
				/>

				<div className="rake__fallback">
					<h2 className="rake__statement">{RAKE_STATEMENT_TEXT}</h2>
					<p className="rake__handoff">{RAKE_HANDOFF}</p>
				</div>
			</div>
		</section>
	);
};

export default RakeSection;
