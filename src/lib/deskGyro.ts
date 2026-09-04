/* ------------------------------------------------------------------
   THE GYROSCOPE

   Turns device tilt into the SAME -1..1 pair the pointer produces, so
   nothing downstream needs a second code path. useDeskStage swaps the
   SOURCE of `target.x/y` on mobile and every consumer - the two custom
   properties, the stars, the statement, the laptop's lean - is unchanged
   and unaware.

   That is the whole design. A gyro-specific branch in the render loop
   would have meant tuning the parallax twice and keeping two sets of
   numbers honest; normalising at the source means there is one.

   ------------------------------------------------------------------
   FOUR THINGS WILL STOP THIS WORKING, AND THREE OF THEM ARE NOT BUGS

   1. IT NEEDS HTTPS. `deviceorientation` is gated on a secure context
      in every current browser. `localhost` counts as secure, so a
      desktop browser's device emulation is fine - but testing on a real
      phone over http://192.168.x.x:3000 will deliver NO EVENTS AT ALL,
      silently. This is the single most common reason "the gyro doesn't
      work", and it is not something code can fix. Use a tunnel that
      terminates TLS, or `next dev --experimental-https`.

   2. iOS NEEDS PERMISSION, FROM A USER GESTURE. Safari 13+ exposes
      DeviceOrientationEvent.requestPermission(), which throws unless it
      is called from inside a real user-initiated event handler. It
      cannot be requested on mount, on scroll, or from a timer. So this
      module arms itself on the FIRST TOUCH anywhere on the section -
      which the visitor is going to produce anyway, because the canvas is
      already a drag target. No permission UI is added; iOS shows its own
      system dialog.

   3. DESKTOP BROWSERS HAVE NO SENSOR. `DeviceOrientationEvent` exists on
      a desktop Chrome, so feature detection alone reports a false
      positive - it simply never fires. Hence `enabled` only becomes true
      once a reading has actually ARRIVED, and the caller keeps using the
      pointer until then. Nothing has to decide in advance which input a
      device has; whichever one produces data wins.

   4. A PHONE IS NEVER HELD FLAT. Raw `beta` at rest is typically 30-60
      deg. Feeding that in unfiltered pins the parallax to full
      deflection permanently, which looks exactly like the section being
      broken. Hence calibration: the first few readings become the
      neutral, and tilt is measured as a DELTA from it.

   ------------------------------------------------------------------
   WHICH ANGLE IS WHICH

     beta   front-to-back tilt, -180..180. Toward/away from the face.
            Maps to the Y axis (what the mouse's clientY drove).
     gamma  left-to-right tilt, -90..90. Maps to the X axis.

   In landscape the device's axes rotate but the SCREEN's do not, so the
   two have to be swapped and possibly negated. `screen.orientation.angle`
   is the authority on that; the 90/270 cases below are what make the
   effect survive a rotation instead of inverting.
   ------------------------------------------------------------------ */

import { DESK_MOBILE_GYRO } from '../config/deskStageMobile';

export type DeskGyro = {
	/** True once a real reading has arrived. Until then, use the pointer. */
	isLive: () => boolean;
	/** Latest normalised tilt, -1..1 on both axes. Neutral is 0,0. */
	read: () => { x: number; y: number };
	/** Re-centre the neutral on the next few readings. */
	recalibrate: () => void;
	dispose: () => void;
};

type PermissionCapableCtor = {
	requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
};

const clampUnit = (n: number) => (n < -1 ? -1 : n > 1 ? 1 : n);

/**
 * Attach a gyroscope source.
 *
 * @param onWake Called when a reading arrives and the value changed. The
 *   desk's render loop parks itself when idle, so a passive sensor with
 *   no way to wake it would only be seen while something else was
 *   already animating.
 */
export function createDeskGyro(onWake: () => void): DeskGyro {
	const value = { x: 0, y: 0 };
	const neutral = { beta: 0, gamma: 0 };

	let live = false;
	let samples = 0;
	let betaSum = 0;
	let gammaSum = 0;
	let railedSince = 0;
	let disposed = false;

	/* Not a hard failure - it just means the sensor will never fire, and
	   the caller keeps the pointer. Logged once because the symptom
	   (nothing happens) is indistinguishable from a code bug, and this is
	   the answer 90% of the time. */
	if (typeof window !== 'undefined' && !window.isSecureContext) {
		console.info(
			'[desk] device orientation needs a secure context (HTTPS or ' +
				'localhost). Tilt parallax is off; pointer parallax still runs.',
		);
	}

	const beginCalibration = () => {
		samples = 0;
		betaSum = 0;
		gammaSum = 0;
		railedSince = 0;
	};

	const onOrientationEvent = (event: DeviceOrientationEvent) => {
		/* An event with null angles means the sensor is present but has no
		   data - a desktop browser, or a device with the permission granted
		   and the hardware disabled. Not live. */
		if (event.beta === null || event.gamma === null) return;

		const rawBeta = event.beta;
		const rawGamma = event.gamma;

		/* ---- CALIBRATE ----
		   Average, rather than take the first reading, because the first
		   reading often lands mid-gesture - the visitor is at that moment
		   lifting the phone or lifting a thumb off the screen. */
		if (samples < DESK_MOBILE_GYRO.calibrationSamples) {
			samples += 1;
			betaSum += rawBeta;
			gammaSum += rawGamma;
			neutral.beta = betaSum / samples;
			neutral.gamma = gammaSum / samples;
			/* Deliberately does NOT return. The section stays at neutral for
			   these frames, which is the composed pose, so calibration is
			   invisible rather than being a sixth of a second of stillness
			   followed by a jump. */
		}

		let dBeta = rawBeta - neutral.beta;
		let dGamma = rawGamma - neutral.gamma;

		/* ---- SCREEN ORIENTATION ----
		   The device's axes are fixed to the hardware; the visitor's sense
		   of "left" is fixed to the screen. Reconcile them, or tilting a
		   phone in landscape moves the composition the wrong way. */
		const angle =
			typeof screen !== 'undefined' && screen.orientation
				? screen.orientation.angle
				: (window.orientation as number | undefined) ?? 0;

		if (angle === 90) {
			const swap = dBeta;
			dBeta = -dGamma;
			dGamma = swap;
		} else if (angle === 270 || angle === -90) {
			const swap = dBeta;
			dBeta = dGamma;
			dGamma = -swap;
		} else if (angle === 180) {
			dBeta = -dBeta;
			dGamma = -dGamma;
		}

		/* ---- DEAD ZONE ----
		   Subtracted rather than gated, so the response is continuous. A
		   gate would make the parallax start with a visible step the moment
		   the threshold is crossed. */
		const dead = DESK_MOBILE_GYRO.deadZoneDeg;
		const deaden = (n: number) =>
			Math.abs(n) <= dead ? 0 : n - Math.sign(n) * dead;

		const span = Math.max(DESK_MOBILE_GYRO.maxTiltDeg - dead, 1);
		const nextX = clampUnit(deaden(dGamma) / span);
		const nextY = clampUnit(deaden(dBeta) / span);

		/* ---- DRIFT RECOVERY ----
		   Held at full deflection long enough and the neutral is wrong, not
		   the visitor: they have changed posture, or handed the phone over.
		   Re-centre rather than staying pinned to the rail. */
		const railed = Math.abs(nextX) >= 1 || Math.abs(nextY) >= 1;
		const now = performance.now();
		if (railed) {
			if (!railedSince) railedSince = now;
			else if (now - railedSince > DESK_MOBILE_GYRO.recalibrateAfterMs) {
				beginCalibration();
				return;
			}
		} else {
			railedSince = 0;
		}

		const moved =
			Math.abs(nextX - value.x) > 0.001 || Math.abs(nextY - value.y) > 0.001;

		value.x = nextX;
		value.y = nextY;

		if (!live) {
			live = true;
			onWake();
			return;
		}

		/* Only wake the loop when something actually changed, so a phone
		   lying on a desk does not hold a rAF open for the life of the
		   section. */
		if (moved) onWake();
	};

	const listen = () => {
		if (disposed) return;
		window.addEventListener('deviceorientation', onOrientationEvent);
	};

	/* ---- ARMING ----

	   On Android and everything else, just listen. On iOS the permission
	   has to be requested from a user gesture, so the request is deferred
	   to the first touch. `once` and `passive`: this handler must never
	   interfere with the drag gesture or the page's scrolling, and it only
	   needs to happen a single time.

	   NOTE the ordering - the listener is attached BEFORE the permission
	   resolves on non-iOS paths, because on Android events start arriving
	   immediately and there is nothing to wait for. */
	const ctor = (
		typeof DeviceOrientationEvent !== 'undefined'
			? (DeviceOrientationEvent as unknown as PermissionCapableCtor)
			: null
	) as PermissionCapableCtor | null;

	const needsPermission = typeof ctor?.requestPermission === 'function';

	const onFirstTouch = () => {
		if (disposed || !ctor?.requestPermission) return;
		ctor
			.requestPermission()
			.then((state) => {
				if (state === 'granted') listen();
				/* Denied is a legitimate answer and the section is complete
				   without it - touch-drag still rotates the laptop. Do not
				   ask again; nagging a permission dialog is worse than the
				   effect is good. */
			})
			.catch(() => {
				/* Thrown when the gesture context is lost. Same outcome. */
			});
	};

	if (needsPermission) {
		window.addEventListener('touchend', onFirstTouch, {
			once: true,
			passive: true,
		});
	} else {
		listen();
	}

	/* A rotation invalidates the neutral, because the axis mapping above
	   changes under it and the visitor's grip changes with it. */
	const onOrientationChange = () => beginCalibration();
	window.addEventListener('orientationchange', onOrientationChange);

	return {
		isLive: () => live,
		read: () => value,
		recalibrate: beginCalibration,
		dispose: () => {
			disposed = true;
			live = false;
			window.removeEventListener('deviceorientation', onOrientationEvent);
			window.removeEventListener('touchend', onFirstTouch);
			window.removeEventListener('orientationchange', onOrientationChange);
		},
	};
}

export default createDeskGyro;
