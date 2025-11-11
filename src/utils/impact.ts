/**
 * Impact level utilities for accessibility violations.
 */

import type { ViolationWithContext, ImpactMeta } from '../types';
import { IMPACT_META } from '../constants';

/**
 * Gets metadata for a violation's impact level.
 *
 * @param impact - The impact level from the violation.
 * @returns Metadata including color and label for the impact level.
 */
export const getImpactMeta = (
	impact?: ViolationWithContext['impact']
): ImpactMeta => {
	if (impact && IMPACT_META[impact]) {
		return IMPACT_META[impact];
	}
	return { color: '#757575', label: 'Impact not available' };
};
