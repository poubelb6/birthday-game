type ContactRecord = {
  name?: string[];
  tel?: string[];
};

type ContactsApi = {
  select?: (properties: string[], options?: { multiple?: boolean }) => Promise<ContactRecord[]>;
};

type NavigatorWithContacts = Navigator & {
  contacts?: ContactsApi;
};

export function getContactsApi(target: Navigator): ContactsApi | null {
  const contacts = (target as NavigatorWithContacts).contacts;
  return typeof contacts?.select === 'function' ? contacts : null;
}

export function supportsContactImport(target: Navigator): boolean {
  return getContactsApi(target) !== null;
}
