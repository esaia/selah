'use client';

export const MODAL_SELECTOR = '[aria-modal="true"]';

export const modalOpen = () =>
  typeof document !== 'undefined' && document.querySelector(MODAL_SELECTOR) !== null;
