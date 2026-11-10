import type { ContestFormConfig } from './types';

// A published CSV link can override the shared Sheet link at build time.
export const CONTEST_SHEET_URL = import.meta.env.VITE_RIBBON_CONTEST_SHEET_URL
  || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSoxuT8O2WHRXSAltQeDe7jAyZ_PB1G_goP1gkOqacFLHlijVerNNEVPuElm1kr7xdWHfSzcyx8zQM/pub?gid=0&single=true&output=csv';

// Public entry IDs read from the organizer's responder Form. They are not secrets.
export const CONTEST_FORM: ContestFormConfig = {
  url: 'https://docs.google.com/forms/d/e/1FAIpQLSd48XHoBlgvryIggkjkjPwi2YVhyrDU6wFIGhg7mHVXSV_wlg/viewform',
  fields: { roundId: '350136213', pokemon: '911552280', ribbonIds: '2097695600' },
};
