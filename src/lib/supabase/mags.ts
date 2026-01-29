/**
 * MAG (Membership Access Group) helpers.
 * Re-exports from crm; use getMAGs(includeDraft) for admin (true) vs public (false).
 */

import {
  type Mag,
  type ContactInMag,
  getMags,
  getMagById,
  getContactsByMag,
  addContactToMag,
  removeContactFromMag,
  searchMags,
  getContactMags,
  createMag,
  updateMag,
  deleteMag,
} from "./crm";

export type { Mag, ContactInMag };

/** Get all MAGs. Admin: getMAGs(true) to include draft; public: getMAGs(false) for active only. */
export const getMAGs = getMags;

export {
  getMagById,
  getContactsByMag,
  addContactToMag,
  removeContactFromMag,
  searchMags,
  getContactMags,
  createMag,
  updateMag,
  deleteMag,
};
