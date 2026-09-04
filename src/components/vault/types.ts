/**
 * Shape of one escaping folder's flight path.
 *
 * All distances are fractions of STAGE WIDTH (not of the viewport, and
 * not of the folder's own size) so the composition scales as one piece
 * on any display. See the field-by-field notes in vaultContent.ts.
 */
export type VaultFolderFlight = {
	/** Destination offset from the folder mouth. dy is negative = rises. */
	dx: number;
	dy: number;
	/** How far the path bows above the straight line. 0 = no arc. */
	arc: number;
	/** Final scale, as a multiplier on VAULT_STAGE.folderSize. */
	scale: number;
	/** Total rotation over the flight, in degrees. */
	spin: number;
	/** Starting rotation, in degrees. */
	tilt: number;
	/** Fraction of the emission window to wait before departing. */
	delay: number;
	/** Alpha at the end of the flight. Below 1 = dissipates instead of
	 *  arriving. */
	fade: number;
};
