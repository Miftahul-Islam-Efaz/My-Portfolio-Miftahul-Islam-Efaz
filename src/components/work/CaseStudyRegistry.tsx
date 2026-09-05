'use client';

import React from 'react';

import { setCaseStudyRegistry } from './caseStudyData';
import type { WorkCaseStudy } from './types';

/* ------------------------------------------------------------------
   THE CLIENT BOUNDARY FOR CASE STUDY CONTENT.

   The gallery, the carousel, the overlay hook and CaseStudyBody all
   read case studies through getCaseStudy() from caseStudyData - a
   plain module function, called deep inside client components that
   cannot be handed server data as props without threading it through
   four layers. So the server hands the rows to THIS component, which
   loads them into the registry that function reads.

   The assignment happens in the render body, not in an effect. An
   effect would run AFTER the children have already rendered once, and
   that first paint is exactly the one the visitor sees - it would
   flash the hardcoded content and then swap. Setting it during render
   is safe here because it is idempotent: the same payload written on
   every pass, no subscription, no state.

   Absent or empty rows leave the fallback in place. That is the whole
   degradation contract - a portfolio that serves last-known-good
   content beats one that serves an empty window.
   ------------------------------------------------------------------ */

export const CaseStudyRegistry: React.FC<{
  studies: Record<string, WorkCaseStudy> | null;
  children: React.ReactNode;
}> = ({ studies, children }) => {
  setCaseStudyRegistry(studies);
  return <>{children}</>;
};

export default CaseStudyRegistry;
